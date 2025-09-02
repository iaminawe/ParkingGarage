/**
 * Database Service - Central database connection and lifecycle management
 * 
 * This service manages the Prisma client lifecycle, connection pooling,
 * health checks, and graceful shutdown for the application.
 * 
 * @module DatabaseService
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';
import type { IAdapterLogger, IConnectionManager } from '../adapters/interfaces/BaseAdapter';

/**
 * Database service configuration options
 */
export interface DatabaseConfig {
  connectionTimeout?: number;
  queryTimeout?: number;
  maxConnections?: number;
  enableLogging?: boolean;
  logLevel?: 'query' | 'info' | 'warn' | 'error';
}

/**
 * Database connection pool statistics
 */
export interface ConnectionStats {
  isConnected: boolean;
  connectionCount: number;
  maxConnections: number;
  uptime: number;
  lastHealthCheck: Date | null;
  queryCount: number;
}

/**
 * Central database service for managing Prisma client and connections
 */
export class DatabaseService implements IConnectionManager {
  private static instance: DatabaseService;
  private prisma: PrismaClient | null = null;
  private logger: IAdapterLogger;
  private config: Required<DatabaseConfig>;
  private isConnectedFlag: boolean = false;
  private startTime: Date | null = null;
  private lastHealthCheck: Date | null = null;
  private queryCount: number = 0;
  private shutdownHandlers: (() => Promise<void>)[] = [];

  constructor(config: DatabaseConfig = {}) {
    this.logger = createLogger('DatabaseService');
    this.config = {
      connectionTimeout: config.connectionTimeout || 5000,
      queryTimeout: config.queryTimeout || 30000,
      maxConnections: config.maxConnections || 10,
      enableLogging: config.enableLogging || false,
      logLevel: config.logLevel || 'error'
    };
    
    this.setupGracefulShutdown();
  }

  /**
   * Get singleton instance of DatabaseService
   */
  static getInstance(config?: DatabaseConfig): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(config);
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize Prisma client and establish connection
   */
  async initialize(): Promise<void> {
    if (this.prisma) {
      this.logger.warn('Database service already initialized');
      return;
    }

    try {
      this.logger.info('Initializing database service...');
      
      this.prisma = new PrismaClient({
        log: this.config.enableLogging 
          ? [{ level: this.config.logLevel, emit: 'event' }]
          : [],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });

      // Set up logging if enabled
      if (this.config.enableLogging) {
        this.prisma.$on(this.config.logLevel as any, (e: any) => {
          this.queryCount++;
          this.logger.debug('Database query', {
            query: e.query,
            duration: e.duration,
            params: e.params
          });
        });
      }

      await this.connect();
      this.startTime = new Date();
      
      this.logger.info('Database service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database service', error as Error);
      throw error;
    }
  }

  /**
   * Establish database connection
   */
  async connect(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }

    try {
      this.logger.info('Connecting to database...');
      
      // Test connection with a simple query
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;
      
      this.isConnectedFlag = true;
      this.logger.info('Database connection established');
      
      // Perform initial health check
      await this.healthCheck();
    } catch (error) {
      this.isConnectedFlag = false;
      this.logger.error('Failed to connect to database', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (!this.prisma) {
      return;
    }

    try {
      this.logger.info('Disconnecting from database...');
      
      await this.prisma.$disconnect();
      this.isConnectedFlag = false;
      this.prisma = null;
      
      this.logger.info('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error during database disconnection', error as Error);
      throw error;
    }
  }

  /**
   * Check if connected to database
   */
  isConnected(): boolean {
    return this.isConnectedFlag && this.prisma !== null;
  }

  /**
   * Perform database health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.prisma || !this.isConnectedFlag) {
      return false;
    }

    try {
      // Simple connectivity test
      await this.prisma.$queryRaw`SELECT 1 as health`;
      this.lastHealthCheck = new Date();
      
      this.logger.debug('Database health check passed');
      return true;
    } catch (error) {
      this.logger.warn('Database health check failed', {
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Get Prisma client instance
   */
  getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    
    if (!this.isConnectedFlag) {
      throw new Error('Database not connected. Call connect() first.');
    }

    return this.prisma;
  }

  /**
   * Execute database operation with error handling and retry logic
   */
  async executeWithRetry<T>(
    operation: (client: PrismaClient) => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    const client = this.getClient();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await operation(client);
        return result;
      } catch (error) {
        this.logger.warn(`Database operation failed (attempt ${attempt}/${retries})`, {
          error: (error as Error).message
        });
        
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw new Error('All retry attempts exhausted');
  }

  /**
   * Execute transaction with proper error handling
   */
  async executeTransaction<T>(
    callback: (client: PrismaClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
    }
  ): Promise<T> {
    const client = this.getClient();
    
    try {
      const result = await client.$transaction(async (tx) => {
        return callback(tx as PrismaClient);
      }, {
        maxWait: options?.maxWait || 5000,
        timeout: options?.timeout || 10000
      });
      
      this.logger.debug('Transaction completed successfully');
      return result;
    } catch (error) {
      this.logger.error('Transaction failed', error as Error);
      throw error;
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return {
      isConnected: this.isConnected(),
      connectionCount: 1, // Prisma manages its own pool
      maxConnections: this.config.maxConnections,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      lastHealthCheck: this.lastHealthCheck,
      queryCount: this.queryCount
    };
  }

  /**
   * Add shutdown handler
   */
  addShutdownHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Remove shutdown handler
   */
  removeShutdownHandler(handler: () => Promise<void>): void {
    const index = this.shutdownHandlers.indexOf(handler);
    if (index > -1) {
      this.shutdownHandlers.splice(index, 1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Initiating database service shutdown...');
    
    try {
      // Execute shutdown handlers
      for (const handler of this.shutdownHandlers) {
        try {
          await handler();
        } catch (error) {
          this.logger.error('Shutdown handler error', error as Error);
        }
      }
      
      // Disconnect from database
      await this.disconnect();
      
      this.logger.info('Database service shutdown completed');
    } catch (error) {
      this.logger.error('Error during database service shutdown', error as Error);
      throw error;
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
      
      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during graceful shutdown', error as Error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', new Error(String(reason)), {
        promise: promise
      });
      gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * Reset singleton instance (for testing)
   */
  static reset(): void {
    DatabaseService.instance = null as any;
  }
}

export default DatabaseService;