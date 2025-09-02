import { Server as HTTPServer } from 'http';
import { serverConfig, logServerConfig, getServerUrl, features } from './config';
import { DatabaseService } from './services/DatabaseService';
import { SocketService } from './services/SocketService';
import { socketIORegistry } from './services/SocketIORegistry';
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
    console.log('✅ Database service initialized');
    
    // Now we can safely import app after database is ready
    const app = (await import('./app')).default;
    
    // Initialize seed data in development/test environments
    if (features.enableSeedData) {
      await seedDataInitializer.initialize();
    }

    // Start server
    const server: HTTPServer = app.listen(serverConfig.port, serverConfig.host, () => {
      console.log(`\n🚀 Parking Garage API Server running on ${getServerUrl()}`);
      console.log(`📊 Health check available at ${getServerUrl()}/health`);
      console.log(`📝 API info available at ${getServerUrl()}/api`);
      
      // Log configuration details
      logServerConfig();

      if (features.enableDevEndpoints) {
        console.log('\n💡 Tip: Seed data has been loaded. Try these endpoints:');
        console.log(`   curl ${getServerUrl()}/api/garage/status`);
        console.log(`   curl ${getServerUrl()}/api/spots?status=available`);
        console.log(`   curl ${getServerUrl()}/api/spots?floor=1`);
      }
    });

    // Initialize Socket.IO service
    await socketService.initialize(server);
    console.log('🌐 Socket.IO service initialized');

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
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
      console.log('⚠️ Shutdown already in progress, ignoring duplicate signal');
      return;
    }

    ResourceManager.shutdownInProgress = true;
    console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
    
    const shutdownStart = Date.now();
    let shutdownTimer: NodeJS.Timeout | undefined;
    let forceShutdownTimer: NodeJS.Timeout | undefined;

    try {
      // Set up force shutdown timer
      forceShutdownTimer = setTimeout(() => {
        console.error('⏰ Could not complete graceful shutdown in time, forcing exit');
        process.exit(1);
      }, ResourceManager.FORCE_SHUTDOWN_TIMEOUT);

      // Set up graceful shutdown timeout
      shutdownTimer = setTimeout(() => {
        console.warn('⚠️ Graceful shutdown taking too long, accelerating process');
      }, ResourceManager.GRACEFUL_SHUTDOWN_TIMEOUT);

      // Phase 1: Stop accepting new connections
      console.log('🔐 Phase 1: Stopping new connections...');
      if (server) {
        // Stop accepting new HTTP connections
        server.close();
      }

      // Phase 2: Close Socket.IO connections gracefully
      console.log('🔌 Phase 2: Closing Socket.IO connections...');
      await socketService.shutdown();

      // Phase 3: Database cleanup
      console.log('💾 Phase 3: Closing database connections...');
      await ResourceManager.closeDatabaseConnections();

      // Phase 4: Wait for HTTP server to finish existing requests
      console.log('🌐 Phase 4: Waiting for HTTP server to close...');
      if (server) {
        await ResourceManager.closeHTTPServer(server);
      }

      // Clear timers
      if (shutdownTimer) clearTimeout(shutdownTimer);
      if (forceShutdownTimer) clearTimeout(forceShutdownTimer);

      const shutdownDuration = Date.now() - shutdownStart;
      console.log(`✅ Graceful shutdown completed successfully in ${shutdownDuration}ms`);
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      
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
      console.log('✅ Database connections closed successfully');
    } catch (error) {
      console.error('❌ Error closing database connections:', error);
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
          console.error('❌ Error closing HTTP server:', error);
          reject(error);
        } else {
          console.log('✅ HTTP server closed successfully');
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
    console.error(`⚡ Force shutdown triggered: ${reason}`);
    
    try {
      // Force close Socket.IO service (fire and forget for force shutdown)
      socketService.shutdown().catch(() => {
        console.error('❌ Error in Socket service force shutdown');
      });
      
      // Force close HTTP server
      if (server) {
        server.closeAllConnections?.(); // Node.js 18.02+
        server.close();
      }
    } catch (error) {
      console.error('❌ Error in force shutdown:', error);
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
      console.error(`❌ Port ${serverConfig.port} is already in use`);
    } else {
      console.error('❌ Server error:', error);
    }
    ResourceManager.forceShutdown('Server error');
  });

  // Handle server close events
  server.on('close', () => {
    console.log('📡 HTTP server closed');
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
  console.error('❌ Uncaught Exception:', error);
  ResourceManager.forceShutdown(`Uncaught Exception: ${error.message}`);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  ResourceManager.forceShutdown(`Unhandled Rejection: ${String(reason)}`);
});

// Handle specific error conditions
process.on('SIGPIPE', () => {
  console.warn('⚠️ SIGPIPE received - broken pipe detected');
  // Don't exit on SIGPIPE, just log it
});

process.on('SIGHUP', () => {
  console.log('📡 SIGHUP received - configuration reload signal');
  // Could be used for config reload in the future
});

export default server;
export { ResourceManager }; // Export for testing
