import { Server } from 'http';
import app from './app';
import { DatabaseService } from './services/DatabaseService';
const seedData = require('./utils/seedData');

const PORT: number = parseInt(process.env.PORT || '3000', 10);
const HOST: string = process.env.HOST || '0.0.0.0';

// Initialize database and seed data before starting server
async function startServer(): Promise<Server> {
  try {
    // Initialize database service
    console.log('🔌 Initializing database connection...');
    const databaseService = DatabaseService.getInstance({
      connectionTimeout: 10000,
      queryTimeout: 30000,
      enableLogging: process.env.NODE_ENV !== 'production',
      logLevel: 'error'
    });
    
    await databaseService.initialize();
    console.log('✅ Database connection established');

    // Initialize seed data in development/test environments
    if (process.env.NODE_ENV !== 'production') {
      console.log('🌱 Loading seed data...');
      await seedData.initialize();
      console.log('✅ Seed data loaded');
    }

    // Start server
    const server: Server = app.listen(PORT, HOST, () => {
      console.log(`\n🚀 Parking Garage API Server running on http://${HOST}:${PORT}`);
      console.log(`📊 Health check available at http://${HOST}:${PORT}/health`);
      console.log(`📝 API info available at http://${HOST}:${PORT}/api`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n💡 Tip: Seed data has been loaded. Try these endpoints:');
        console.log('   curl http://localhost:3000/api/garage/status');
        console.log('   curl http://localhost:3000/api/spots?status=available');
        console.log('   curl http://localhost:3000/api/spots?floor=1');
      }
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server and store reference
let server: Server | undefined;
startServer().then((s: Server) => {
  server = s;
  
  // Handle server errors
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    } else {
      console.error('❌ Server error:', error);
    }
    process.exit(1);
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  try {
    // Shutdown database service first
    const databaseService = DatabaseService.getInstance();
    if (databaseService.isConnected()) {
      console.log('🔌 Closing database connections...');
      await databaseService.shutdown();
      console.log('✅ Database connections closed');
    }

    // Then close HTTP server
    if (server) {
      server.close(() => {
        console.log('✅ HTTP server closed');
        console.log('👋 Graceful shutdown complete');
        process.exit(0);
      });
    } else {
      console.log('👋 Graceful shutdown complete');
      process.exit(0);
    }

    // Force shutdown after 15 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 15000);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default server;