/**
 * Database utilities for connection pooling, retry logic, and health checks
 * 
 * This module provides utility functions for managing database connections,
 * implementing retry logic, query logging, and health monitoring.
 * 
 * @module DatabaseUtils
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { createLogger } from './logger';

const logger = createLogger('DatabaseUtils');

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  max?: number;                    // Maximum connections
  min?: number;                    // Minimum connections
  acquireTimeoutMillis?: number;   // Max time to get connection
  createTimeoutMillis?: number;    // Max time to create connection
  destroyTimeoutMillis?: number;   // Max time to destroy connection
  idleTimeoutMillis?: number;      // Max time connection can be idle
  reapIntervalMillis?: number;     // Frequency to check for idle connections
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  timeoutMs?: number;              // Health check timeout
  intervalMs?: number;             // Health check interval
  retries?: number;                // Number of retries before marking unhealthy
  enabled?: boolean;               // Enable/disable health checks
}

/**
 * Query logging configuration
 */
export interface QueryLoggingConfig {
  enabled?: boolean;               // Enable query logging
  logLevel?: 'info' | 'debug';     // Log level for queries
  slowQueryThresholdMs?: number;   // Log slow queries above this threshold
  includeParams?: boolean;         // Include query parameters in logs
  maxQueryLength?: number;         // Maximum query length to log
}

/**
 * Default configurations
 */
export const DEFAULT_POOL_CONFIG: Required<ConnectionPoolConfig> = {
  max: 20,
  min: 2,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 300000,       // 5 minutes
  reapIntervalMillis: 10000        // 10 seconds
};

export const DEFAULT_HEALTH_CONFIG: Required<HealthCheckConfig> = {
  timeoutMs: 5000,
  intervalMs: 30000,               // 30 seconds
  retries: 3,
  enabled: true
};

export const DEFAULT_LOGGING_CONFIG: Required<QueryLoggingConfig> = {
  enabled: true,
  logLevel: 'debug',
  slowQueryThresholdMs: 1000,      // 1 second
  includeParams: false,
  maxQueryLength: 500
};

/**
 * Database connection manager with pooling and health checks
 */
export class DatabaseConnectionManager {
  private client: PrismaClient;
  private healthCheckInterval?: NodeJS.Timeout;
  private isHealthy: boolean = true;
  private consecutiveFailures: number = 0;
  private readonly healthConfig: Required<HealthCheckConfig>;
  private readonly loggingConfig: Required<QueryLoggingConfig>;

  constructor(
    client?: PrismaClient,
    healthConfig?: HealthCheckConfig,
    loggingConfig?: QueryLoggingConfig
  ) {
    this.healthConfig = { ...DEFAULT_HEALTH_CONFIG, ...healthConfig };
    this.loggingConfig = { ...DEFAULT_LOGGING_CONFIG, ...loggingConfig };
    
    this.client = client || this.createClient();
    this.setupQueryLogging();
    
    if (this.healthConfig.enabled) {
      this.startHealthChecks();
    }
  }

  /**
   * Create Prisma client with optimized configuration
   */
  private createClient(): PrismaClient {
    const client = new PrismaClient({
      log: this.loggingConfig.enabled ? [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' }
      ] : [],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    return client;
  }

  /**
   * Setup query logging with performance monitoring
   */
  private setupQueryLogging(): void {
    if (!this.loggingConfig.enabled) return;

    this.client.$on('query', (e: Prisma.QueryEvent) => {
      const duration = e.duration;
      const query = this.truncateQuery(e.query);
      const params = this.loggingConfig.includeParams ? e.params : '[hidden]';

      const logData = {
        query,
        params,
        duration: `${duration}ms`,
        timestamp: e.timestamp
      };

      // Log slow queries at warning level
      if (duration >= this.loggingConfig.slowQueryThresholdMs) {
        logger.warn('Slow query detected', logData);
      } else if (this.loggingConfig.logLevel === 'debug') {
        logger.debug('Query executed', logData);
      } else if (this.loggingConfig.logLevel === 'info') {
        logger.info('Query executed', { duration: `${duration}ms` });
      }
    });

    this.client.$on('error', (e: Prisma.LogEvent) => {
      logger.error('Database error', new Error(e.message), {
        timestamp: e.timestamp,
        target: e.target
      });
    });

    this.client.$on('warn', (e: Prisma.LogEvent) => {
      logger.warn('Database warning', {
        message: e.message,
        timestamp: e.timestamp,
        target: e.target
      });
    });

    this.client.$on('info', (e: Prisma.LogEvent) => {
      logger.info('Database info', {
        message: e.message,
        timestamp: e.timestamp,
        target: e.target
      });
    });
  }

  /**
   * Truncate query string for logging
   */
  private truncateQuery(query: string): string {
    if (query.length <= this.loggingConfig.maxQueryLength) {
      return query;
    }
    return query.substring(0, this.loggingConfig.maxQueryLength) + '...';
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check interval error', error as Error);
      }
    }, this.healthConfig.intervalMs);

    // Cleanup on process exit
    process.on('SIGTERM', () => this.stopHealthChecks());
    process.on('SIGINT', () => this.stopHealthChecks());
  }

  /**
   * Stop health check monitoring
   */
  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Perform database health check
   */
  async performHealthCheck(): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // Simple query to check database connectivity
      await Promise.race([
        this.client.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), this.healthConfig.timeoutMs)
        )
      ]);

      const duration = Date.now() - startTime;
      
      // Reset failure count on successful health check
      this.consecutiveFailures = 0;
      
      if (!this.isHealthy) {
        this.isHealthy = true;
        logger.info('Database connection restored', { duration: `${duration}ms` });
      } else {
        logger.debug('Database health check passed', { duration: `${duration}ms` });
      }

      return true;
    } catch (error) {
      this.consecutiveFailures++;
      
      logger.error('Database health check failed', error as Error, {
        consecutiveFailures: this.consecutiveFailures,
        maxRetries: this.healthConfig.retries
      });

      // Mark as unhealthy if we've exceeded retry count
      if (this.consecutiveFailures >= this.healthConfig.retries && this.isHealthy) {
        this.isHealthy = false;
        logger.error('Database marked as unhealthy', new Error('Max health check failures exceeded'), {
          consecutiveFailures: this.consecutiveFailures,
          maxRetries: this.healthConfig.retries
        });
      }

      return false;
    }
  }

  /**
   * Get database health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    consecutiveFailures: number;
    lastCheck: Date;
  } {
    return {
      isHealthy: this.isHealthy,
      consecutiveFailures: this.consecutiveFailures,
      lastCheck: new Date()
    };
  }

  /**
   * Get client instance
   */
  getClient(): PrismaClient {
    return this.client;
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    try {
      await this.client.$connect();
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      this.stopHealthChecks();
      await this.client.$disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Failed to disconnect from database', error as Error);
      throw error;
    }
  }
}

/**
 * Retry configuration for database operations
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  exponentialBackoff: true,
  retryableErrors: [
    'P2034', // Transaction failed due to a write conflict or a deadlock
    'P1001', // Can't reach database server
    'P1008', // Operations timed out
    'P1017', // Server has closed the connection
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT'
  ]
};

/**
 * Execute operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'database operation'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      const isRetryable = config.retryableErrors.some(errorCode =>
        lastError.message.includes(errorCode) || 
        lastError.name.includes(errorCode)
      );

      // Don't retry if not retryable or if this was the last attempt
      if (!isRetryable || attempt === config.maxRetries) {
        logger.error(`${operationName} failed after ${attempt + 1} attempts`, lastError, {
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          isRetryable
        });
        throw lastError;
      }

      // Calculate delay
      let delay = config.baseDelayMs;
      if (config.exponentialBackoff) {
        delay = Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs);
      }

      logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
        error: lastError.message,
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        delay
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Create optimized Prisma client with connection pooling
 */
export function createOptimizedClient(
  poolConfig?: ConnectionPoolConfig,
  healthConfig?: HealthCheckConfig,
  loggingConfig?: QueryLoggingConfig
): { client: PrismaClient; manager: DatabaseConnectionManager } {
  const manager = new DatabaseConnectionManager(undefined, healthConfig, loggingConfig);
  const client = manager.getClient();

  return { client, manager };
}

/**
 * Batch operation utility for efficient bulk operations
 */
export async function executeBatch<T, R>(
  items: T[],
  operation: (batch: T[]) => Promise<R[]>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    logger.debug('Executing batch operation', {
      batchNumber: Math.floor(i / batchSize) + 1,
      batchSize: batch.length,
      totalItems: items.length
    });
    
    const batchResults = await operation(batch);
    results.push(...batchResults);
  }
  
  logger.info('Batch operation completed', {
    totalItems: items.length,
    totalResults: results.length,
    batchSize
  });
  
  return results;
}

/**
 * Transaction wrapper with retry logic
 */
export async function executeTransaction<T>(
  client: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  retryConfig?: RetryConfig
): Promise<T> {
  return withRetry(
    () => client.$transaction(operation, {
      maxWait: 10000,  // 10 seconds
      timeout: 20000   // 20 seconds
    }),
    retryConfig,
    'transaction'
  );
}

/**
 * Database migration utilities
 */
export class MigrationHelper {
  private client: PrismaClient;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  /**
   * Check if database is accessible
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database connection check failed', error as Error);
      return false;
    }
  }

  /**
   * Get database version info
   */
  async getDatabaseInfo(): Promise<{
    version: string;
    name: string;
    size?: number;
  }> {
    try {
      const versionResult = await this.client.$queryRaw<[{ version: string }]>`
        SELECT sqlite_version() as version
      `;
      
      return {
        version: versionResult[0]?.version || 'unknown',
        name: 'SQLite'
      };
    } catch (error) {
      logger.error('Failed to get database info', error as Error);
      throw error;
    }
  }

  /**
   * Vacuum database (SQLite specific)
   */
  async vacuumDatabase(): Promise<void> {
    try {
      logger.info('Starting database vacuum');
      await this.client.$executeRawUnsafe('VACUUM');
      logger.info('Database vacuum completed');
    } catch (error) {
      logger.error('Database vacuum failed', error as Error);
      throw error;
    }
  }

  /**
   * Analyze database statistics (SQLite specific)
   */
  async analyzeDatabase(): Promise<void> {
    try {
      logger.info('Starting database analysis');
      await this.client.$executeRawUnsafe('ANALYZE');
      logger.info('Database analysis completed');
    } catch (error) {
      logger.error('Database analysis failed', error as Error);
      throw error;
    }
  }
}

export default {
  DatabaseConnectionManager,
  withRetry,
  createOptimizedClient,
  executeBatch,
  executeTransaction,
  MigrationHelper,
  DEFAULT_POOL_CONFIG,
  DEFAULT_HEALTH_CONFIG,
  DEFAULT_LOGGING_CONFIG,
  DEFAULT_RETRY_CONFIG
};