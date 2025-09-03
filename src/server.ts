import { Server as HTTPServer } from 'http';
import { serverConfig, logServerConfig, getServerUrl, features } from './config';
import { DatabaseService } from './services/DatabaseService';
import { SocketService } from './services/SocketService';
import { socketIORegistry } from './services/SocketIORegistry';
import { logger } from './utils/logger';
import type {
  ProcessSignal,
  NodeError,
  ShutdownHandler
} from './types/server';

// Initialize services before any imports that might use them
const dbService = DatabaseService.getInstance();
const socketService = SocketService.getInstance({
  cors: serverConfig.cors,
  transports: serverConfig.transports,
  enableLogging: features.verboseLogging,
});

import seedDataInitializer from './utils/seedData';

/**
 * Initialize seed data and start server
 * @returns Promise<HTTPServer> The HTTP server instance
 */
async function startServer(): Promise<HTTPServer> {
  try {
    // Initialize database service first with simplified configuration
    await dbService.initialize();
    logger.info('Database service initialized', { component: 'server', phase: 'initialization' });
    
    // Now we can safely import app after database is ready
    const app = (await import('./app')).default;
    
    // Initialize seed data in development/test environments
    if (features.enableSeedData) {
      await seedDataInitializer.initialize();
    }

    // Start server
    const server: HTTPServer = app.listen(serverConfig.port, serverConfig.host, () => {
      logger.info('Parking Garage API Server started', {
        component: 'server',
        serverUrl: getServerUrl(),
        healthEndpoint: `${getServerUrl()}/health`,
        apiEndpoint: `${getServerUrl()}/api`
      });
      
      // Log configuration details
      logServerConfig();

      if (features.enableDevEndpoints) {
        logger.debug('Development endpoints available', {
          component: 'server',
          endpoints: [
            `${getServerUrl()}/api/garage/status`,
            `${getServerUrl()}/api/spots?status=available`,
            `${getServerUrl()}/api/spots?floor=1`
          ]
        });
      }
    });

    // Initialize Socket.IO service
    await socketService.initialize(server);
    logger.info('Socket.IO service initialized', { component: 'server', service: 'socketio' });

    return server;
  } catch (error) {
    logger.error('Failed to start server', error as Error, { component: 'server', phase: 'startup' });
    process.exit(1);
  }
}

// Global references for shutdown handling
let server: HTTPServer | undefined;

/**
 * Resource cleanup utilities for graceful server shutdown
 * 
 * Handles the complete shutdown sequence including:
 * - Socket.IO server and client connections
 * - Database connections via DatabaseService
 * - HTTP server and existing requests
 * - Proper timeout handling and resource leak prevention
 * 
 * @class ResourceManager
 */
class ResourceManager {
  private static shutdownInProgress = false;
  private static readonly GRACEFUL_SHUTDOWN_TIMEOUT = serverConfig.shutdownTimeout;
  private static readonly FORCE_SHUTDOWN_TIMEOUT = serverConfig.shutdownTimeout + 5000;

  /**
   * Enhanced graceful shutdown with proper resource cleanup sequence
   * 
   * Executes a four-phase shutdown process:
   * 1. Stop accepting new connections
   * 2. Close Socket.IO connections gracefully  
   * 3. Close database connections
   * 4. Wait for HTTP server to finish existing requests
   * 
   * @param signal - The signal that triggered the shutdown (SIGTERM, SIGINT, etc.)
   * @returns Promise that resolves when shutdown is complete
   */
  static async gracefulShutdown(signal: ProcessSignal): Promise<void> {
    if (ResourceManager.shutdownInProgress) {
      logger.warn('Shutdown already in progress, ignoring duplicate signal', {
        component: 'server',
        signal,
        phase: 'shutdown'
      });
      return;
    }

    ResourceManager.shutdownInProgress = true;
    logger.info('Initiating graceful shutdown', {
      component: 'server',
      signal,
      phase: 'shutdown-start'
    });
    
    const shutdownStart = Date.now();
    let shutdownTimer: NodeJS.Timeout | undefined;
    let forceShutdownTimer: NodeJS.Timeout | undefined;

    try {
      // Set up force shutdown timer
      forceShutdownTimer = setTimeout(() => {
        logger.error('Could not complete graceful shutdown in time, forcing exit', undefined, {
          component: 'server',
          phase: 'force-shutdown',
          timeout: ResourceManager.FORCE_SHUTDOWN_TIMEOUT
        });
        process.exit(1);
      }, ResourceManager.FORCE_SHUTDOWN_TIMEOUT);

      // Set up graceful shutdown timeout
      shutdownTimer = setTimeout(() => {
        logger.warn('Graceful shutdown taking too long, accelerating process', {
          component: 'server',
          phase: 'graceful-shutdown-timeout',
          timeout: ResourceManager.GRACEFUL_SHUTDOWN_TIMEOUT
        });
      }, ResourceManager.GRACEFUL_SHUTDOWN_TIMEOUT);

      // Phase 1: Stop accepting new connections
      logger.info('Phase 1: Stopping new connections', { component: 'server', phase: 'shutdown-phase-1' });
      if (server) {
        // Stop accepting new HTTP connections
        server.close();
      }

      // Phase 2: Close Socket.IO connections gracefully
      logger.info('Phase 2: Closing Socket.IO connections', { component: 'server', phase: 'shutdown-phase-2' });
      await socketService.shutdown();

      // Phase 3: Database cleanup
      logger.info('Phase 3: Closing database connections', { component: 'server', phase: 'shutdown-phase-3' });
      await ResourceManager.closeDatabaseConnections();

      // Phase 4: Wait for HTTP server to finish existing requests
      logger.info('Phase 4: Waiting for HTTP server to close', { component: 'server', phase: 'shutdown-phase-4' });
      if (server) {
        await ResourceManager.closeHTTPServer(server);
      }

      // Clear timers
      if (shutdownTimer) clearTimeout(shutdownTimer);
      if (forceShutdownTimer) clearTimeout(forceShutdownTimer);

      const shutdownDuration = Date.now() - shutdownStart;
      logger.info('Graceful shutdown completed successfully', {
        component: 'server',
        phase: 'shutdown-complete',
        duration: shutdownDuration
      });
      
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error as Error, {
        component: 'server',
        phase: 'shutdown-error'
      });
      
      // Clear timers
      if (shutdownTimer) clearTimeout(shutdownTimer);
      if (forceShutdownTimer) clearTimeout(forceShutdownTimer);
      
      // Force exit on error
      process.exit(1);
    }
  }


  /**
   * Close database connections using DatabaseService
   * 
   * Delegates to the DatabaseService.shutdown() method which handles
   * proper disconnection from the database and cleanup of all connections.
   * 
   * @returns Promise that resolves when database connections are closed
   * @throws Error if database shutdown fails
   */
  private static async closeDatabaseConnections(): Promise<void> {
    try {
      const dbService = DatabaseService.getInstance();
      await dbService.shutdown();
      logger.info('Database connections closed successfully', {
        component: 'server',
        service: 'database'
      });
    } catch (error) {
      logger.error('Error closing database connections', error as Error, {
        component: 'server',
        service: 'database'
      });
      throw error;
    }
  }

  /**
   * Close HTTP server and wait for existing connections to finish
   * 
   * Gracefully shuts down the HTTP server by:
   * 1. Stopping acceptance of new connections
   * 2. Waiting for existing connections to complete
   * 3. Timing out after 8 seconds if connections don't close
   * 
   * @param httpServer - The HTTP server instance to close
   * @returns Promise that resolves when server is closed
   * @throws Error if server fails to close within timeout
   */
  private static async closeHTTPServer(httpServer: HTTPServer): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('HTTP server close timeout'));
      }, 8000);

      httpServer.close((error) => {
        clearTimeout(timeout);
        if (error) {
          logger.error('Error closing HTTP server', error, { component: 'server', service: 'http' });
          reject(error);
        } else {
          logger.info('HTTP server closed successfully', { component: 'server', service: 'http' });
          resolve();
        }
      });
    });
  }

  /**
   * Force close all resources immediately
   * 
   * Used when graceful shutdown fails or takes too long.
   * Immediately closes all resources without waiting:
   * 1. Close Socket.IO server
   * 2. Force close all HTTP connections (Node.js 18.02+)
   * 3. Close HTTP server
   * 4. Exit process with error code
   * 
   * @param reason - Description of why force shutdown was triggered
   */
  static forceShutdown(reason: string): void {
    logger.error('Force shutdown triggered', undefined, {
      component: 'server',
      phase: 'force-shutdown',
      reason
    });
    
    try {
      // Force close Socket.IO service (fire and forget for force shutdown)
      socketService.shutdown().catch((error) => {
        logger.error('Error in Socket service force shutdown', error, {
          component: 'server',
          service: 'socket'
        });
      });
      
      // Force close HTTP server
      if (server) {
        server.closeAllConnections?.(); // Node.js 18.02+
        server.close();
      }
    } catch (error) {
      logger.error('Error in force shutdown', error as Error, {
        component: 'server',
        phase: 'force-shutdown'
      });
    }
    
    process.exit(1);
  }
}

// Start the server and store references
startServer().then((s: HTTPServer) => {
  server = s;

  // Handle server errors
  server.on('error', (error: NodeError) => {
    if (error.code === 'EADDRINUSE') {
      logger.error('Port is already in use', error, {
        component: 'server',
        port: serverConfig.port
      });
    } else {
      logger.error('Server error', error, { component: 'server' });
    }
    ResourceManager.forceShutdown('Server error');
  });

  // Handle server close events
  server.on('close', () => {
    logger.info('HTTP server closed', { component: 'server', event: 'close' });
  });
});

// Handle process termination with enhanced cleanup
const handleShutdown = (signal: ProcessSignal): (() => void) => {
  return () => ResourceManager.gracefulShutdown(signal);
};

process.on('SIGTERM', handleShutdown('SIGTERM'));
process.on('SIGINT', handleShutdown('SIGINT'));
process.on('SIGUSR2', handleShutdown('SIGUSR2')); // Nodemon restart

// Handle uncaught exceptions with resource cleanup
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error, { component: 'server', event: 'uncaughtException' });
  ResourceManager.forceShutdown(`Uncaught Exception: ${error.message}`);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
    component: 'server',
    event: 'unhandledRejection',
    promise: promise.toString()
  });
  ResourceManager.forceShutdown(`Unhandled Rejection: ${String(reason)}`);
});

// Handle specific error conditions
process.on('SIGPIPE', () => {
  logger.warn('SIGPIPE received - broken pipe detected', {
    component: 'server',
    signal: 'SIGPIPE'
  });
  // Don't exit on SIGPIPE, just log it
});

process.on('SIGHUP', () => {
  logger.info('SIGHUP received - configuration reload signal', {
    component: 'server',
    signal: 'SIGHUP'
  });
  // Could be used for config reload in the future
});

export default server;
export { ResourceManager }; // Export for testing
