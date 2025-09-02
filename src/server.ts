import app from './app';
import { Server } from 'http';

// Use require for seedData as it may not be fully TypeScript migrated yet
const seedData = require('./utils/seedData');

const PORT: number = parseInt(process.env.PORT || '3000', 10);
const HOST: string = process.env.HOST || '0.0.0.0';

/**
 * Initialize seed data and start server
 * @returns Promise<Server> The HTTP server instance
 */
async function startServer(): Promise<Server> {
  try {
    // Initialize seed data in development/test environments
    if (process.env.NODE_ENV !== 'production') {
      await seedData.initialize();
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

/**
 * Graceful shutdown handler
 * @param signal The signal that triggered the shutdown
 */
const gracefulShutdown = (signal: string): void => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default server;
