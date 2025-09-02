import { PrismaClient } from '@prisma/client';

// Singleton Prisma client to prevent resource leaks
class PrismaClientSingleton {
  private static instance: PrismaClient | null = null;
  private static isInitialized = false;

  /**
   * Get the singleton Prisma client instance
   * Implements proper connection management and resource cleanup
   */
  static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      // Initialize connection and event handlers only once
      if (!PrismaClientSingleton.isInitialized) {
        PrismaClientSingleton.setupEventHandlers();
        PrismaClientSingleton.isInitialized = true;
      }
    }

    return PrismaClientSingleton.instance;
  }

  /**
   * Setup event handlers for proper connection management
   */
  private static setupEventHandlers(): void {
    if (!PrismaClientSingleton.instance) return;

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Closing Prisma client...`);
      if (PrismaClientSingleton.instance) {
        await PrismaClientSingleton.instance.$disconnect();
        PrismaClientSingleton.instance = null;
        PrismaClientSingleton.isInitialized = false;
      }
      process.exit(0);
    };

    // Register shutdown handlers
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('beforeExit', async () => {
      if (PrismaClientSingleton.instance) {
        await PrismaClientSingleton.instance.$disconnect();
      }
    });

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception:', error);
      if (PrismaClientSingleton.instance) {
        await PrismaClientSingleton.instance.$disconnect();
        PrismaClientSingleton.instance = null;
        PrismaClientSingleton.isInitialized = false;
      }
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      if (PrismaClientSingleton.instance) {
        await PrismaClientSingleton.instance.$disconnect();
        PrismaClientSingleton.instance = null;
        PrismaClientSingleton.isInitialized = false;
      }
      process.exit(1);
    });
  }

  /**
   * Test database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const client = PrismaClientSingleton.getInstance();
      await client.$connect();
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  /**
   * Manually disconnect (for testing purposes only)
   */
  static async disconnect(): Promise<void> {
    if (PrismaClientSingleton.instance) {
      await PrismaClientSingleton.instance.$disconnect();
      PrismaClientSingleton.instance = null;
      PrismaClientSingleton.isInitialized = false;
    }
  }

  /**
   * Check if instance is initialized
   */
  static isConnected(): boolean {
    return PrismaClientSingleton.instance !== null && PrismaClientSingleton.isInitialized;
  }
}

// Export the singleton instance getter
export const prisma = PrismaClientSingleton.getInstance();

// Export utility functions
export const testDatabaseConnection = PrismaClientSingleton.testConnection;
export const disconnectDatabase = PrismaClientSingleton.disconnect;
export const isDatabaseConnected = PrismaClientSingleton.isConnected;

// Export the singleton class for testing
export { PrismaClientSingleton };