/**
 * Database Configuration with Performance Optimizations
 * 
 * Configures Prisma client with optimized connection pooling,
 * query optimization, and monitoring settings.
 * 
 * @module DatabaseConfig
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface DatabaseConfig {
  // Connection settings
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  
  // Performance settings
  enableQueryLogging: boolean;
  slowQueryThreshold: number;
  enableMetrics: boolean;
  
  // Connection pool settings
  poolTimeout: number;
  idleTimeout: number;
  maxLifetime: number;
  
  // SQLite specific optimizations
  sqliteOptimizations: {
    enableWAL: boolean;
    cacheSize: number;
    tempStore: 'memory' | 'file';
    synchronous: 'OFF' | 'NORMAL' | 'FULL';
    journalMode: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF';
    mmapSize: number;
    pageSize: number;
  };
}

export const defaultDatabaseConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL || 'file:./parking_garage.db',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
  queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  
  enableQueryLogging: process.env.NODE_ENV === 'development',
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
  enableMetrics: true,
  
  poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '10000'),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'), // 5 minutes
  maxLifetime: parseInt(process.env.DB_MAX_LIFETIME || '3600000'), // 1 hour
  
  sqliteOptimizations: {
    enableWAL: process.env.SQLITE_WAL !== 'false',
    cacheSize: parseInt(process.env.SQLITE_CACHE_SIZE || '2000'), // 2MB cache
    tempStore: (process.env.SQLITE_TEMP_STORE as any) || 'memory',
    synchronous: (process.env.SQLITE_SYNCHRONOUS as any) || 'NORMAL',
    journalMode: (process.env.SQLITE_JOURNAL_MODE as any) || 'WAL',
    mmapSize: parseInt(process.env.SQLITE_MMAP_SIZE || '268435456'), // 256MB
    pageSize: parseInt(process.env.SQLITE_PAGE_SIZE || '4096')
  }
};

/**
 * Performance monitoring middleware for Prisma
 */
export class PrismaPerformanceMonitor {
  private slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: Date;
    params?: any;
  }> = [];
  
  private queryMetrics = {
    totalQueries: 0,
    averageDuration: 0,
    slowQueryCount: 0,
    errorCount: 0
  };

  constructor(private config: DatabaseConfig) {}

  createMiddleware() {
    return async (params: any, next: any) => {
      const start = Date.now();
      
      try {
        const result = await next(params);
        const duration = Date.now() - start;
        
        this.recordQueryMetrics(params, duration, null);
        
        // Log slow queries
        if (duration > this.config.slowQueryThreshold) {
          this.recordSlowQuery(params, duration);
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        this.recordQueryMetrics(params, duration, error);
        throw error;
      }
    };
  }

  private recordQueryMetrics(params: any, duration: number, error: any): void {
    this.queryMetrics.totalQueries++;
    
    if (error) {
      this.queryMetrics.errorCount++;
      logger.error(
        'Database query error',
        error instanceof Error ? error : new Error(String(error)),
        {
          model: params.model,
          action: params.action,
          duration
        }
      );
    }
    
    // Update running average duration
    this.queryMetrics.averageDuration = 
      (this.queryMetrics.averageDuration * (this.queryMetrics.totalQueries - 1) + duration) / 
      this.queryMetrics.totalQueries;
    
    if (duration > this.config.slowQueryThreshold) {
      this.queryMetrics.slowQueryCount++;
    }
  }

  private recordSlowQuery(params: any, duration: number): void {
    const slowQuery = {
      query: `${params.model}.${params.action}`,
      duration,
      timestamp: new Date(),
      params: this.sanitizeParams(params.args)
    };
    
    this.slowQueries.push(slowQuery);
    
    // Keep only last 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries = this.slowQueries.slice(-100);
    }
    
    logger.warn('Slow query detected', slowQuery);
  }

  private sanitizeParams(params: any): any {
    // Remove potentially sensitive data
    if (!params) return params;
    
    const sanitized = { ...params };
    
    // Remove password fields, tokens, etc.
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  getMetrics() {
    return {
      ...this.queryMetrics,
      slowQueries: this.slowQueries.slice(-10), // Last 10 slow queries
      performanceScore: this.calculatePerformanceScore()
    };
  }

  private calculatePerformanceScore(): number {
    if (this.queryMetrics.totalQueries === 0) return 100;
    
    const slowQueryRate = this.queryMetrics.slowQueryCount / this.queryMetrics.totalQueries;
    const errorRate = this.queryMetrics.errorCount / this.queryMetrics.totalQueries;
    
    // Calculate score (0-100)
    let score = 100;
    score -= slowQueryRate * 50; // Slow queries penalty
    score -= errorRate * 30; // Error penalty
    score -= Math.min(this.queryMetrics.averageDuration / 100, 20); // Average duration penalty
    
    return Math.max(0, Math.round(score));
  }

  clearMetrics(): void {
    this.slowQueries = [];
    this.queryMetrics = {
      totalQueries: 0,
      averageDuration: 0,
      slowQueryCount: 0,
      errorCount: 0
    };
  }
}

/**
 * Create optimized Prisma client instance
 */
export function createOptimizedPrismaClient(config: DatabaseConfig = defaultDatabaseConfig): PrismaClient {
  const performanceMonitor = new PrismaPerformanceMonitor(config);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: config.url
      }
    },
    log: config.enableQueryLogging ? [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
      { level: 'info', emit: 'stdout' }
    ] : ['error'],
    errorFormat: 'pretty',
  });

  // Add performance monitoring middleware
  if (config.enableMetrics) {
    prisma.$use(performanceMonitor.createMiddleware());
  }

  // Setup query logging
  if (config.enableQueryLogging) {
    prisma.$on('query', (e) => {
      logger.debug('Database query', {
        query: e.query,
        duration: e.duration,
        params: e.params
      });
    });

    prisma.$on('error', (e) => {
      logger.error(
        'Database error',
        undefined,
        {
          target: e.target,
          timestamp: e.timestamp.toISOString()
        }
      );
    });

    prisma.$on('warn', (e) => {
      logger.warn('Database warning', {
        target: e.target,
        timestamp: e.timestamp
      });
    });
  }

  // SQLite-specific optimizations
  if (config.url.includes('sqlite') || config.url.includes('file:')) {
    applySQLiteOptimizations(prisma, config.sqliteOptimizations);
  }

  // Add performance monitor to client for external access
  (prisma as any).performanceMonitor = performanceMonitor;

  return prisma;
}

/**
 * Apply SQLite-specific performance optimizations
 */
async function applySQLiteOptimizations(
  prisma: PrismaClient,
  optimizations: DatabaseConfig['sqliteOptimizations']
): Promise<void> {
  try {
    const pragmas = [];
    
    // WAL mode for better concurrent access
    if (optimizations.enableWAL) {
      pragmas.push(`PRAGMA journal_mode = ${optimizations.journalMode}`);
    }
    
    // Cache size optimization
    pragmas.push(`PRAGMA cache_size = ${optimizations.cacheSize}`);
    
    // Memory-mapped I/O
    pragmas.push(`PRAGMA mmap_size = ${optimizations.mmapSize}`);
    
    // Page size optimization
    pragmas.push(`PRAGMA page_size = ${optimizations.pageSize}`);
    
    // Synchronous mode
    pragmas.push(`PRAGMA synchronous = ${optimizations.synchronous}`);
    
    // Temporary storage in memory
    if (optimizations.tempStore === 'memory') {
      pragmas.push(`PRAGMA temp_store = memory`);
    }
    
    // Additional performance pragmas
    pragmas.push(`PRAGMA optimize`); // Auto-analyze for better query plans
    pragmas.push(`PRAGMA automatic_index = ON`); // Enable automatic indexes
    pragmas.push(`PRAGMA query_only = OFF`); // Allow write operations
    
    // Execute all pragmas
    for (const pragma of pragmas) {
      await prisma.$executeRawUnsafe(pragma);
    }
    
    logger.info('SQLite performance optimizations applied', {
      pragmas: pragmas.length,
      journalMode: optimizations.journalMode,
      cacheSize: optimizations.cacheSize,
      mmapSize: optimizations.mmapSize
    });
    
  } catch (error) {
    logger.error('Failed to apply SQLite optimizations', error);
  }
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(prisma: PrismaClient): Promise<{
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  error?: string;
  metrics?: any;
}> {
  const start = Date.now();
  
  try {
    // Simple query to check connectivity
    await prisma.$queryRaw`SELECT 1 as test`;
    
    const responseTime = Date.now() - start;
    const performanceMonitor = (prisma as any).performanceMonitor;
    
    return {
      status: 'healthy',
      responseTime,
      metrics: performanceMonitor ? performanceMonitor.getMetrics() : undefined
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Connection pool monitoring
 */
export class ConnectionPoolMonitor {
  private metrics = {
    activeConnections: 0,
    idleConnections: 0,
    totalConnectionsCreated: 0,
    connectionErrors: 0,
    averageConnectionTime: 0,
    peakConnections: 0
  };

  private connectionTimes: number[] = [];

  recordConnection(connectionTime: number): void {
    this.metrics.totalConnectionsCreated++;
    this.metrics.activeConnections++;
    
    this.connectionTimes.push(connectionTime);
    if (this.connectionTimes.length > 100) {
      this.connectionTimes = this.connectionTimes.slice(-100);
    }
    
    this.metrics.averageConnectionTime = 
      this.connectionTimes.reduce((sum, time) => sum + time, 0) / this.connectionTimes.length;
    
    this.metrics.peakConnections = Math.max(
      this.metrics.peakConnections, 
      this.metrics.activeConnections
    );
  }

  recordDisconnection(): void {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    this.metrics.idleConnections++;
  }

  recordError(): void {
    this.metrics.connectionErrors++;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      activeConnections: this.metrics.activeConnections,
      idleConnections: 0,
      totalConnectionsCreated: 0,
      connectionErrors: 0,
      averageConnectionTime: 0,
      peakConnections: 0
    };
    this.connectionTimes = [];
  }
}

export default {
  defaultConfig: defaultDatabaseConfig,
  createOptimizedPrismaClient,
  checkDatabaseHealth,
  PrismaPerformanceMonitor,
  ConnectionPoolMonitor
};