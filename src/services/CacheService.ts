/**
 * Cache Service for high-performance data caching
 * 
 * Implements cache-aside pattern with Redis backend for optimal performance.
 * Supports cache warming, invalidation strategies, and performance monitoring.
 * 
 * @module CacheService
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  connectionTime: number;
  avgResponseTime: number;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export class CacheService {
  private client: RedisClientType;
  private config: CacheConfig;
  private isConnected: boolean = false;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    connectionTime: 0,
    avgResponseTime: 0
  };
  private responseTimes: number[] = [];
  private readonly METRICS_WINDOW_SIZE = 1000;

  constructor(config: CacheConfig) {
    this.config = {
      keyPrefix: 'parking:',
      defaultTTL: 3600, // 1 hour
      maxRetries: 3,
      retryDelayMs: 1000,
      ...config
    };

    // Create Redis client with optimized configuration
    this.client = createClient({
      socket: {
        host: this.config.host,
        port: this.config.port,
        reconnectStrategy: (retries) => {
          if (retries > this.config.maxRetries) {
            return new Error('Max retries exceeded');
          }
          return Math.min(retries * this.config.retryDelayMs, 3000);
        }
      },
      password: this.config.password,
      database: this.config.db || 0,
    });

    this.setupEventHandlers();
  }

  /**
   * Initialize cache connection
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    const startTime = Date.now();
    try {
      await this.client.connect();
      this.isConnected = true;
      this.metrics.connectionTime = Date.now() - startTime;
      logger.info('Cache service connected successfully', {
        connectionTime: this.metrics.connectionTime
      });
    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to connect to cache service', error);
      throw error;
    }
  }

  /**
   * Disconnect from cache
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Cache service disconnected');
    } catch (error) {
      logger.error('Error disconnecting from cache service', error);
    }
  }

  /**
   * Get item from cache with performance tracking
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    const fullKey = this.getFullKey(key);

    try {
      const result = await this.client.get(fullKey);
      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result === null) {
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      const parsed = JSON.parse(result) as CacheItem<T>;
      
      // Update hit counter for the item
      parsed.hits++;
      await this.client.set(fullKey, JSON.stringify(parsed), {
        PX: parsed.ttl * 1000
      });

      return parsed.data;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set item in cache with TTL
   */
  async set<T>(key: string, data: T, ttlSeconds?: number): Promise<boolean> {
    const startTime = Date.now();
    const fullKey = this.getFullKey(key);
    const ttl = ttlSeconds || this.config.defaultTTL;

    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        hits: 0
      };

      await this.client.set(fullKey, JSON.stringify(cacheItem), {
        PX: ttl * 1000
      });

      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);
      this.metrics.sets++;

      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache set error', { key, error });
      return false;
    }
  }

  /**
   * Delete item from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);

    try {
      const result = await this.client.del(fullKey);
      this.metrics.deletes++;
      return result > 0;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache delete error', { key, error });
      return false;
    }
  }

  /**
   * Get multiple items from cache efficiently
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    if (keys.length === 0) return new Map();

    const startTime = Date.now();
    const fullKeys = keys.map(key => this.getFullKey(key));
    const results = new Map<string, T>();

    try {
      const values = await this.client.mGet(fullKeys);
      
      values.forEach((value, index) => {
        if (value !== null) {
          try {
            const parsed = JSON.parse(value) as CacheItem<T>;
            results.set(keys[index], parsed.data);
            this.metrics.hits++;
          } catch (parseError) {
            this.metrics.errors++;
            logger.error('Cache parse error', { key: keys[index], parseError });
          }
        } else {
          this.metrics.misses++;
        }
      });

      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);

      return results;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache getMany error', { keys, error });
      return new Map();
    }
  }

  /**
   * Set multiple items efficiently
   */
  async setMany<T>(items: Map<string, T>, ttlSeconds?: number): Promise<number> {
    if (items.size === 0) return 0;

    const startTime = Date.now();
    const ttl = ttlSeconds || this.config.defaultTTL;
    let successCount = 0;

    try {
      const pipeline = this.client.multi();
      
      items.forEach((data, key) => {
        const fullKey = this.getFullKey(key);
        const cacheItem: CacheItem<T> = {
          data,
          timestamp: Date.now(),
          ttl,
          hits: 0
        };
        
        pipeline.set(fullKey, JSON.stringify(cacheItem), {
          PX: ttl * 1000
        });
      });

      await pipeline.exec();
      successCount = items.size;
      this.metrics.sets += successCount;

      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);

      return successCount;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache setMany error', { itemCount: items.size, error });
      return successCount;
    }
  }

  /**
   * Cache warming for critical data
   */
  async warmCache(warmingTasks: Array<{
    key: string;
    dataLoader: () => Promise<any>;
    ttl?: number;
  }>): Promise<number> {
    let warmedCount = 0;
    
    logger.info('Starting cache warming', { taskCount: warmingTasks.length });

    for (const task of warmingTasks) {
      try {
        // Check if already cached
        const existing = await this.get(task.key);
        if (existing !== null) {
          logger.debug('Cache key already warm', { key: task.key });
          continue;
        }

        // Load and cache data
        const data = await task.dataLoader();
        const success = await this.set(task.key, data, task.ttl);
        
        if (success) {
          warmedCount++;
          logger.debug('Cache key warmed successfully', { key: task.key });
        }
      } catch (error) {
        logger.error('Cache warming error', { key: task.key, error });
      }
    }

    logger.info('Cache warming completed', { 
      warmedCount, 
      totalTasks: warmingTasks.length 
    });

    return warmedCount;
  }

  /**
   * Invalidate cache patterns
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const fullPattern = this.getFullKey(pattern);
      const keys = await this.client.keys(fullPattern);
      
      if (keys.length === 0) return 0;

      const deletedCount = await this.client.del(keys);
      this.metrics.deletes += deletedCount;
      
      logger.info('Cache pattern invalidated', { 
        pattern, 
        deletedCount 
      });

      return deletedCount;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache pattern invalidation error', { pattern, error });
      return 0;
    }
  }

  /**
   * Get cache metrics and health status
   */
  getMetrics(): CacheMetrics & { 
    hitRate: number; 
    isConnected: boolean;
    keyPrefix: string;
  } {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      isConnected: this.isConnected,
      keyPrefix: this.config.keyPrefix || 'parking:'
    };
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.client.ping();
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      connectionTime: this.metrics.connectionTime,
      avgResponseTime: 0
    };
    this.responseTimes = [];
  }

  private setupEventHandlers(): void {
    this.client.on('error', (error) => {
      this.metrics.errors++;
      logger.error('Redis client error', error);
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Redis client connection ended');
    });
  }

  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private updateResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only recent response times for rolling average
    if (this.responseTimes.length > this.METRICS_WINDOW_SIZE) {
      this.responseTimes = this.responseTimes.slice(-this.METRICS_WINDOW_SIZE);
    }
    
    // Update average response time
    this.metrics.avgResponseTime = Math.round(
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
    );
  }
}

// Common cache keys for the parking garage system
export const CacheKeys = {
  // Vehicle related
  VEHICLE: (licensePlate: string) => `vehicle:${licensePlate.toUpperCase()}`,
  VEHICLES_BY_OWNER: (ownerId: string) => `vehicles:owner:${ownerId}`,
  VEHICLES_BY_STATUS: (status: string) => `vehicles:status:${status}`,
  VEHICLES_PARKED: 'vehicles:parked',
  VEHICLES_STATS: 'vehicles:stats',
  
  // Parking spot related  
  SPOT: (spotId: string) => `spot:${spotId}`,
  SPOTS_AVAILABLE: 'spots:available',
  SPOTS_BY_TYPE: (type: string) => `spots:type:${type}`,
  SPOTS_BY_LEVEL: (level: number) => `spots:level:${level}`,
  
  // Session related
  SESSION: (sessionId: string) => `session:${sessionId}`,
  ACTIVE_SESSIONS: 'sessions:active',
  SESSION_STATS: 'sessions:stats',
  
  // Analytics and reports
  REVENUE_STATS: 'analytics:revenue',
  USAGE_STATS: 'analytics:usage',
  HOURLY_STATS: (date: string) => `analytics:hourly:${date}`,
  DAILY_STATS: (date: string) => `analytics:daily:${date}`,
  
  // Configuration
  GARAGE_CONFIG: 'config:garage',
  RATES_CONFIG: 'config:rates',
  
  // Performance
  SLOW_QUERIES: 'performance:slow_queries',
  QUERY_STATS: 'performance:query_stats'
};

export default CacheService;