/**
 * Advanced Cache Service for high-performance data caching
 *
 * Implements multiple caching patterns (cache-aside, write-through, write-behind)
 * with Redis backend for optimal performance. Includes circuit breaker pattern,
 * cache warming, intelligent invalidation, and comprehensive performance monitoring.
 *
 * @module EnhancedCacheService
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL: number;
  maxRetries: number;
  retryDelayMs: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  enableWriteThrough?: boolean;
  enableWriteBehind?: boolean;
  writeBehindBatchSize?: number;
  writeBehindFlushInterval?: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  connectionTime: number;
  avgResponseTime: number;
  circuitBreakerTrips: number;
  writeThroughOperations: number;
  writeBehindQueueSize: number;
  cacheWarmedItems: number;
  invalidationCascades: number;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface CacheStrategy {
  ttl: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  enableWriteThrough?: boolean;
  refreshAhead?: boolean;
  tags?: string[];
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

export interface WriteBehindOperation {
  key: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export class EnhancedCacheService extends EventEmitter {
  private client: RedisClientType;
  private config: CacheConfig;
  private isConnected = false;
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failures: 0,
    lastFailureTime: 0,
    nextRetryTime: 0,
  };
  private writeBehindQueue: WriteBehindOperation[] = [];
  private writeBehindTimer?: NodeJS.Timeout;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    connectionTime: 0,
    avgResponseTime: 0,
    circuitBreakerTrips: 0,
    writeThroughOperations: 0,
    writeBehindQueueSize: 0,
    cacheWarmedItems: 0,
    invalidationCascades: 0,
  };
  private responseTimes: number[] = [];
  private readonly METRICS_WINDOW_SIZE = 1000;
  private readonly strategies: Map<string, CacheStrategy> = new Map();

  constructor(config: CacheConfig) {
    super();
    
    this.config = {
      keyPrefix: 'parking:',
      defaultTTL: 3600, // 1 hour
      maxRetries: 3,
      retryDelayMs: 1000,
      circuitBreakerThreshold: 10,
      circuitBreakerTimeout: 60000, // 1 minute
      enableWriteThrough: true,
      enableWriteBehind: false,
      writeBehindBatchSize: 100,
      writeBehindFlushInterval: 5000, // 5 seconds
      ...config,
    };

    // Create Redis client with optimized configuration
    this.client = createClient({
      socket: {
        host: this.config.host,
        port: this.config.port,
        reconnectStrategy: retries => {
          if (retries > this.config.maxRetries) {
            return new Error('Max retries exceeded');
          }
          return Math.min(retries * this.config.retryDelayMs, 3000);
        },
      },
      password: this.config.password,
      database: this.config.db || 0,
    });

    this.setupEventHandlers();
    this.initializeDefaultStrategies();
    
    if (this.config.enableWriteBehind) {
      this.startWriteBehindProcessor();
    }
  }

  /**
   * Initialize cache connection
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    const startTime = Date.now();
    try {
      await this.client.connect();
      this.isConnected = true;
      this.metrics.connectionTime = Date.now() - startTime;
      logger.info('Enhanced cache service connected successfully', {
        connectionTime: this.metrics.connectionTime,
      });
    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to connect to enhanced cache service', error);
      throw error;
    }
  }

  /**
   * Disconnect from cache
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Enhanced cache service disconnected');
    } catch (error) {
      logger.error('Error disconnecting from enhanced cache service', error);
    }
  }

  /**
   * Get item from cache with circuit breaker and performance tracking
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.isCircuitBreakerOpen()) {
      this.metrics.misses++;
      return null;
    }

    const startTime = Date.now();
    const fullKey = this.getFullKey(key);

    try {
      const result = await this.client.get(fullKey);
      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);
      this.recordSuccess();

      if (result === null) {
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      const parsed = JSON.parse(result) as CacheItem<T>;

      // Check for refresh-ahead
      const strategy = this.strategies.get(this.extractKeyType(key));
      if (strategy?.refreshAhead && this.shouldRefreshAhead(parsed)) {
        this.emit('refreshAhead', key, parsed.data);
      }

      // Update hit counter for the item
      parsed.hits++;
      await this.client.set(fullKey, JSON.stringify(parsed), {
        PX: parsed.ttl * 1000,
      });

      return parsed.data;
    } catch (error) {
      this.recordFailure();
      this.metrics.errors++;
      logger.error('Enhanced cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set item in cache with strategy-based TTL and tags
   */
  async set<T>(key: string, data: T, ttlSeconds?: number, strategy?: CacheStrategy): Promise<boolean> {
    if (this.isCircuitBreakerOpen()) {
      return false;
    }

    const startTime = Date.now();
    const fullKey = this.getFullKey(key);
    const keyType = this.extractKeyType(key);
    const effectiveStrategy = strategy || this.strategies.get(keyType) || { ttl: this.config.defaultTTL, priority: 'medium' };
    const ttl = ttlSeconds || effectiveStrategy.ttl;

    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        hits: 0,
        tags: effectiveStrategy.tags,
        priority: effectiveStrategy.priority,
      };

      await this.client.set(fullKey, JSON.stringify(cacheItem), {
        PX: ttl * 1000,
      });

      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);
      this.recordSuccess();
      this.metrics.sets++;

      // Handle write-through if enabled
      if (effectiveStrategy.enableWriteThrough && this.config.enableWriteThrough) {
        this.emit('writeThrough', key, data);
        this.metrics.writeThroughOperations++;
      }

      return true;
    } catch (error) {
      this.recordFailure();
      this.metrics.errors++;
      logger.error('Enhanced cache set error', { key, error });
      return false;
    }
  }

  /**
   * Delete item from cache
   */
  async delete(key: string): Promise<boolean> {
    if (this.isCircuitBreakerOpen()) {
      return false;
    }

    const fullKey = this.getFullKey(key);

    try {
      const result = await this.client.del(fullKey);
      this.metrics.deletes++;
      this.recordSuccess();
      return result > 0;
    } catch (error) {
      this.recordFailure();
      this.metrics.errors++;
      logger.error('Enhanced cache delete error', { key, error });
      return false;
    }
  }

  /**
   * Get multiple items from cache efficiently
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    if (keys.length === 0) {
      return new Map();
    }

    if (this.isCircuitBreakerOpen()) {
      keys.forEach(() => this.metrics.misses++);
      return new Map();
    }

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
            logger.error('Enhanced cache parse error', { key: keys[index], parseError });
          }
        } else {
          this.metrics.misses++;
        }
      });

      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);
      this.recordSuccess();

      return results;
    } catch (error) {
      this.recordFailure();
      this.metrics.errors++;
      logger.error('Enhanced cache getMany error', { keys, error });
      return new Map();
    }
  }

  /**
   * Set multiple items efficiently
   */
  async setMany<T>(items: Map<string, T>, ttlSeconds?: number): Promise<number> {
    if (items.size === 0) {
      return 0;
    }

    if (this.isCircuitBreakerOpen()) {
      return 0;
    }

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
          hits: 0,
        };

        pipeline.set(fullKey, JSON.stringify(cacheItem), {
          PX: ttl * 1000,
        });
      });

      await pipeline.exec();
      successCount = items.size;
      this.metrics.sets += successCount;

      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);
      this.recordSuccess();

      return successCount;
    } catch (error) {
      this.recordFailure();
      this.metrics.errors++;
      logger.error('Enhanced cache setMany error', { itemCount: items.size, error });
      return successCount;
    }
  }

  /**
   * Cache warming for critical data
   */
  async warmCache(
    warmingTasks: Array<{
      key: string;
      dataLoader: () => Promise<any>;
      ttl?: number;
    }>
  ): Promise<number> {
    let warmedCount = 0;

    logger.info('Starting enhanced cache warming', { taskCount: warmingTasks.length });

    for (const task of warmingTasks) {
      try {
        // Check if already cached
        const existing = await this.get(task.key);
        if (existing !== null) {
          logger.debug('Enhanced cache key already warm', { key: task.key });
          continue;
        }

        // Load and cache data
        const data = await task.dataLoader();
        const success = await this.set(task.key, data, task.ttl);

        if (success) {
          warmedCount++;
          this.metrics.cacheWarmedItems++;
          logger.debug('Enhanced cache key warmed successfully', { key: task.key });
        }
      } catch (error) {
        logger.error('Enhanced cache warming error', { key: task.key, error });
      }
    }

    logger.info('Enhanced cache warming completed', {
      warmedCount,
      totalTasks: warmingTasks.length,
    });

    return warmedCount;
  }

  /**
   * Intelligent cache invalidation with cascade support
   */
  async invalidatePattern(pattern: string, cascadeRules?: string[]): Promise<number> {
    if (this.isCircuitBreakerOpen()) {
      return 0;
    }

    try {
      const fullPattern = this.getFullKey(pattern);
      const keys = await this.client.keys(fullPattern);

      if (keys.length === 0) {
        return 0;
      }

      let totalDeleted = 0;

      // Primary deletion
      const deletedCount = await this.client.del(keys);
      this.metrics.deletes += deletedCount;
      totalDeleted += deletedCount;

      // Cascade invalidation
      if (cascadeRules && cascadeRules.length > 0) {
        for (const cascadePattern of cascadeRules) {
          const cascadeDeleted = await this.invalidatePattern(cascadePattern);
          totalDeleted += cascadeDeleted;
        }
        this.metrics.invalidationCascades++;
      }

      logger.info('Enhanced cache pattern invalidated with cascades', {
        pattern,
        deletedCount: totalDeleted,
        cascadeRules,
      });

      this.emit('invalidation', pattern, totalDeleted);
      this.recordSuccess();
      return totalDeleted;
    } catch (error) {
      this.recordFailure();
      this.metrics.errors++;
      logger.error('Enhanced cache pattern invalidation error', { pattern, error });
      return 0;
    }
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    if (this.isCircuitBreakerOpen()) {
      return 0;
    }

    try {
      let totalDeleted = 0;
      const scanPattern = this.getFullKey('*');
      const iterator = this.client.scanIterator({ MATCH: scanPattern, COUNT: 100 });

      for await (const key of iterator) {
        try {
          const result = await this.client.get(key);
          if (result) {
            const item = JSON.parse(result) as CacheItem<any>;
            if (item.tags && item.tags.some(tag => tags.includes(tag))) {
              const deleted = await this.client.del(key);
              if (deleted > 0) {
                totalDeleted++;
                this.metrics.deletes++;
              }
            }
          }
        } catch (parseError) {
          // Skip malformed entries
          continue;
        }
      }

      logger.info('Enhanced cache invalidated by tags', { tags, deletedCount: totalDeleted });
      this.recordSuccess();
      return totalDeleted;
    } catch (error) {
      this.recordFailure();
      this.metrics.errors++;
      logger.error('Enhanced cache tag invalidation error', { tags, error });
      return 0;
    }
  }

  /**
   * Advanced cache warming with background refresh
   */
  async startBackgroundRefresh(intervalMs: number = 300000): Promise<void> {
    setInterval(async () => {
      try {
        const scanPattern = this.getFullKey('*');
        const iterator = this.client.scanIterator({ MATCH: scanPattern, COUNT: 50 });

        for await (const key of iterator) {
          try {
            const result = await this.client.get(key);
            if (result) {
              const item = JSON.parse(result) as CacheItem<any>;
              if (this.shouldRefreshAhead(item)) {
                const originalKey = key.replace(this.config.keyPrefix || 'parking:', '');
                this.emit('backgroundRefresh', originalKey, item.data);
              }
            }
          } catch (error) {
            continue; // Skip malformed entries
          }
        }
      } catch (error) {
        logger.error('Enhanced cache background refresh error', error);
      }
    }, intervalMs);
  }

  /**
   * Register caching strategy for specific key patterns
   */
  registerStrategy(keyPattern: string, strategy: CacheStrategy): void {
    this.strategies.set(keyPattern, strategy);
    logger.debug('Enhanced cache strategy registered', { keyPattern, strategy });
  }

  /**
   * Get cache statistics by key pattern
   */
  async getCacheStatistics(pattern?: string): Promise<{
    totalKeys: number;
    totalMemory: number;
    hitRateByPattern: Map<string, number>;
    expirationTimes: Map<string, number>;
  }> {
    try {
      const stats = {
        totalKeys: 0,
        totalMemory: 0,
        hitRateByPattern: new Map<string, number>(),
        expirationTimes: new Map<string, number>(),
      };

      const scanPattern = pattern ? this.getFullKey(pattern) : this.getFullKey('*');
      const iterator = this.client.scanIterator({ MATCH: scanPattern, COUNT: 100 });

      for await (const key of iterator) {
        stats.totalKeys++;
        
        try {
          const result = await this.client.get(key);
          const ttl = await this.client.ttl(key);
          
          if (result) {
            stats.totalMemory += result.length;
            const item = JSON.parse(result) as CacheItem<any>;
            const keyType = this.extractKeyType(key.replace(this.config.keyPrefix || 'parking:', ''));
            
            if (!stats.hitRateByPattern.has(keyType)) {
              stats.hitRateByPattern.set(keyType, 0);
            }
            
            stats.expirationTimes.set(key, ttl);
          }
        } catch (error) {
          continue;
        }
      }

      return stats;
    } catch (error) {
      logger.error('Enhanced cache statistics error', error);
      return {
        totalKeys: 0,
        totalMemory: 0,
        hitRateByPattern: new Map(),
        expirationTimes: new Map(),
      };
    }
  }

  /**
   * Flush expired keys manually
   */
  async flushExpiredKeys(): Promise<number> {
    try {
      let flushedCount = 0;
      const scanPattern = this.getFullKey('*');
      const iterator = this.client.scanIterator({ MATCH: scanPattern, COUNT: 100 });

      for await (const key of iterator) {
        const ttl = await this.client.ttl(key);
        if (ttl === -2) { // Key has expired but not yet removed
          const deleted = await this.client.del(key);
          if (deleted > 0) {
            flushedCount++;
          }
        }
      }

      logger.info('Enhanced cache expired keys flushed', { flushedCount });
      return flushedCount;
    } catch (error) {
      logger.error('Enhanced cache flush expired keys error', error);
      return 0;
    }
  }

  /**
   * Get comprehensive cache metrics and health status
   */
  getMetrics(): CacheMetrics & {
    hitRate: number;
    isConnected: boolean;
    keyPrefix: string;
    circuitBreakerState: CircuitBreakerState;
    writeBehindQueueSize: number;
  } {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;
    this.metrics.writeBehindQueueSize = this.writeBehindQueue.length;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      isConnected: this.isConnected,
      keyPrefix: this.config.keyPrefix || 'parking:',
      circuitBreakerState: { ...this.circuitBreaker },
      writeBehindQueueSize: this.writeBehindQueue.length,
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
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
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
      avgResponseTime: 0,
      circuitBreakerTrips: 0,
      writeThroughOperations: 0,
      writeBehindQueueSize: 0,
      cacheWarmedItems: 0,
      invalidationCascades: 0,
    };
    this.responseTimes = [];
  }

  // Circuit breaker methods
  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreaker.isOpen) {
      return false;
    }

    if (Date.now() > this.circuitBreaker.nextRetryTime) {
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failures = 0;
      logger.info('Enhanced cache circuit breaker reset - attempting to reconnect');
    }

    return this.circuitBreaker.isOpen;
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= (this.config.circuitBreakerThreshold || 10)) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextRetryTime = Date.now() + (this.config.circuitBreakerTimeout || 60000);
      this.metrics.circuitBreakerTrips++;
      
      logger.warn('Enhanced cache circuit breaker opened due to repeated failures', {
        failures: this.circuitBreaker.failures,
        nextRetryTime: new Date(this.circuitBreaker.nextRetryTime),
      });
      
      this.emit('circuitBreakerOpen', this.circuitBreaker);
    }
  }

  private recordSuccess(): void {
    if (this.circuitBreaker.failures > 0) {
      this.circuitBreaker.failures = Math.max(0, this.circuitBreaker.failures - 1);
    }
  }

  // Write-behind pattern methods
  private startWriteBehindProcessor(): void {
    this.writeBehindTimer = setInterval(() => {
      this.processWriteBehindQueue();
    }, this.config.writeBehindFlushInterval || 5000);
  }

  private async processWriteBehindQueue(): Promise<void> {
    if (this.writeBehindQueue.length === 0) return;

    const batchSize = this.config.writeBehindBatchSize || 100;
    const batch = this.writeBehindQueue.splice(0, batchSize);

    for (const operation of batch) {
      try {
        this.emit('writeBehind', operation.key, operation.data);
      } catch (error) {
        operation.retryCount++;
        if (operation.retryCount < 3) {
          this.writeBehindQueue.push(operation); // Retry
        } else {
          logger.error('Enhanced cache write-behind operation failed permanently', {
            key: operation.key,
            retryCount: operation.retryCount,
            error,
          });
        }
      }
    }
  }

  // Helper methods
  private shouldRefreshAhead(item: CacheItem<any>): boolean {
    const now = Date.now();
    const expirationTime = item.timestamp + (item.ttl * 1000);
    const refreshThreshold = expirationTime - (item.ttl * 1000 * 0.1); // 10% of TTL before expiration
    
    return now >= refreshThreshold;
  }

  private extractKeyType(key: string): string {
    const parts = key.split(':');
    return parts[0] || 'default';
  }

  private initializeDefaultStrategies(): void {
    // Spot availability - high frequency, short TTL
    this.registerStrategy('spots', {
      ttl: 30, // 30 seconds
      priority: 'high',
      enableWriteThrough: true,
      refreshAhead: true,
      tags: ['spots', 'availability'],
    });

    // Pricing calculations - medium frequency, medium TTL
    this.registerStrategy('pricing', {
      ttl: 300, // 5 minutes
      priority: 'medium',
      enableWriteThrough: false,
      refreshAhead: true,
      tags: ['pricing', 'calculations'],
    });

    // Analytics data - expensive, long TTL
    this.registerStrategy('analytics', {
      ttl: 1800, // 30 minutes
      priority: 'low',
      enableWriteThrough: false,
      refreshAhead: false,
      tags: ['analytics', 'reports'],
    });

    // Configuration - rarely changes, long TTL
    this.registerStrategy('config', {
      ttl: 3600, // 1 hour
      priority: 'critical',
      enableWriteThrough: true,
      refreshAhead: false,
      tags: ['config'],
    });

    // User sessions - session-based TTL
    this.registerStrategy('session', {
      ttl: 7200, // 2 hours
      priority: 'high',
      enableWriteThrough: true,
      refreshAhead: true,
      tags: ['sessions', 'auth'],
    });
  }

  private setupEventHandlers(): void {
    this.client.on('error', error => {
      this.metrics.errors++;
      logger.error('Enhanced cache Redis client error', error);
    });

    this.client.on('connect', () => {
      logger.info('Enhanced cache Redis client connected');
    });

    this.client.on('reconnecting', () => {
      logger.info('Enhanced cache Redis client reconnecting');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Enhanced cache Redis client connection ended');
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

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Initiating enhanced cache service shutdown');
    
    if (this.writeBehindTimer) {
      clearInterval(this.writeBehindTimer);
      await this.processWriteBehindQueue(); // Process remaining items
    }
    
    await this.disconnect();
    this.removeAllListeners();
    
    logger.info('Enhanced cache service shutdown completed');
  }
}

// Enhanced cache keys with invalidation cascade rules
export const CacheKeys = {
  // Vehicle related (30s-5min TTL)
  VEHICLE: (licensePlate: string) => `vehicle:${licensePlate.toUpperCase()}`,
  VEHICLES_BY_OWNER: (ownerId: string) => `vehicles:owner:${ownerId}`,
  VEHICLES_BY_STATUS: (status: string) => `vehicles:status:${status}`,
  VEHICLES_PARKED: 'vehicles:parked',
  VEHICLES_STATS: 'vehicles:stats',

  // Parking spot related (30s TTL - high frequency)
  SPOT: (spotId: string) => `spots:${spotId}`,
  SPOTS_AVAILABLE: 'spots:available',
  SPOTS_BY_TYPE: (type: string) => `spots:type:${type}`,
  SPOTS_BY_LEVEL: (level: number) => `spots:level:${level}`,
  SPOTS_OCCUPANCY: 'spots:occupancy',
  SPOTS_REAL_TIME: 'spots:realtime',

  // Session related (2 hours TTL)
  SESSION: (sessionId: string) => `session:${sessionId}`,
  ACTIVE_SESSIONS: 'sessions:active',
  SESSION_STATS: 'sessions:stats',
  SESSION_BY_USER: (userId: string) => `session:user:${userId}`,

  // Analytics and reports (30min-1hour TTL)
  REVENUE_STATS: 'analytics:revenue',
  USAGE_STATS: 'analytics:usage',
  HOURLY_STATS: (date: string) => `analytics:hourly:${date}`,
  DAILY_STATS: (date: string) => `analytics:daily:${date}`,
  MONTHLY_STATS: (date: string) => `analytics:monthly:${date}`,
  PEAK_HOURS: 'analytics:peak_hours',
  OCCUPANCY_TRENDS: 'analytics:occupancy_trends',

  // Pricing calculations (5min TTL)
  PRICING_RATE: (type: string, duration: number) => `pricing:rate:${type}:${duration}`,
  PRICING_DISCOUNT: (userId: string) => `pricing:discount:${userId}`,
  PRICING_PEAK: 'pricing:peak_rates',
  PRICING_RULES: 'pricing:rules',

  // Configuration (1 hour TTL)
  GARAGE_CONFIG: 'config:garage',
  RATES_CONFIG: 'config:rates',
  SYSTEM_CONFIG: 'config:system',
  FEATURE_FLAGS: 'config:features',

  // Performance monitoring
  SLOW_QUERIES: 'performance:slow_queries',
  QUERY_STATS: 'performance:query_stats',
  API_METRICS: 'performance:api_metrics',
  CACHE_STATS: 'performance:cache_stats',

  // User-specific caches
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_PREFERENCES: (userId: string) => `user:preferences:${userId}`,
  USER_HISTORY: (userId: string) => `user:history:${userId}`,
};

// Cache invalidation cascade rules
export const CacheInvalidationRules = {
  // When a spot status changes, invalidate related caches
  SPOT_STATUS_CHANGE: [
    'spots:available',
    'spots:occupancy',
    'spots:realtime',
    'analytics:usage',
  ],
  
  // When user profile updates, clear user-related caches
  USER_PROFILE_UPDATE: (userId: string) => [
    CacheKeys.USER_PROFILE(userId),
    CacheKeys.USER_PREFERENCES(userId),
    CacheKeys.SESSION_BY_USER(userId),
    'sessions:active', // May affect active sessions list
  ],
  
  // When pricing rules change, clear all pricing caches
  PRICING_RULES_CHANGE: [
    'pricing:*',
    'config:rates',
    'analytics:revenue',
  ],
  
  // When garage configuration changes
  GARAGE_CONFIG_CHANGE: [
    'config:*',
    'spots:*',
    'analytics:*',
  ],
};

// Specialized cache service instances
export class SpotAvailabilityCache {
  constructor(private cacheService: EnhancedCacheService) {
    // Register specific strategy for spot availability
    this.cacheService.registerStrategy('spots', {
      ttl: 30, // 30 seconds - very dynamic data
      priority: 'critical',
      enableWriteThrough: true,
      refreshAhead: true,
      tags: ['spots', 'availability', 'real-time'],
    });
  }

  async getAvailableSpots(): Promise<any[] | null> {
    return this.cacheService.get(CacheKeys.SPOTS_AVAILABLE);
  }

  async setAvailableSpots(spots: any[]): Promise<boolean> {
    return this.cacheService.set(CacheKeys.SPOTS_AVAILABLE, spots, 30);
  }

  async invalidateSpotData(spotId?: string): Promise<number> {
    const patterns = spotId 
      ? [CacheKeys.SPOT(spotId)]
      : CacheInvalidationRules.SPOT_STATUS_CHANGE;
    
    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.cacheService.invalidatePattern(pattern);
    }
    return totalDeleted;
  }
}

export class PricingCache {
  constructor(private cacheService: EnhancedCacheService) {
    this.cacheService.registerStrategy('pricing', {
      ttl: 300, // 5 minutes - moderate change frequency
      priority: 'high',
      enableWriteThrough: false,
      refreshAhead: true,
      tags: ['pricing', 'calculations'],
    });
  }

  async getPricingRate(type: string, duration: number): Promise<number | null> {
    return this.cacheService.get(CacheKeys.PRICING_RATE(type, duration));
  }

  async setPricingRate(type: string, duration: number, rate: number): Promise<boolean> {
    return this.cacheService.set(CacheKeys.PRICING_RATE(type, duration), rate, 300);
  }

  async invalidatePricing(): Promise<number> {
    return this.cacheService.invalidatePattern('pricing:*', CacheInvalidationRules.PRICING_RULES_CHANGE);
  }
}

export class AnalyticsCache {
  constructor(private cacheService: EnhancedCacheService) {
    this.cacheService.registerStrategy('analytics', {
      ttl: 1800, // 30 minutes - expensive computations
      priority: 'low',
      enableWriteThrough: false,
      refreshAhead: false,
      tags: ['analytics', 'reports', 'aggregations'],
    });
  }

  async getRevenueStats(): Promise<any | null> {
    return this.cacheService.get(CacheKeys.REVENUE_STATS);
  }

  async setRevenueStats(stats: any): Promise<boolean> {
    return this.cacheService.set(CacheKeys.REVENUE_STATS, stats, 1800);
  }

  async getDailyStats(date: string): Promise<any | null> {
    return this.cacheService.get(CacheKeys.DAILY_STATS(date));
  }

  async setDailyStats(date: string, stats: any): Promise<boolean> {
    return this.cacheService.set(CacheKeys.DAILY_STATS(date), stats, 3600); // 1 hour for daily stats
  }
}

export class ConfigurationCache {
  constructor(private cacheService: EnhancedCacheService) {
    this.cacheService.registerStrategy('config', {
      ttl: 3600, // 1 hour - rarely changes
      priority: 'critical',
      enableWriteThrough: true,
      refreshAhead: false,
      tags: ['config', 'settings'],
    });
  }

  async getGarageConfig(): Promise<any | null> {
    return this.cacheService.get(CacheKeys.GARAGE_CONFIG);
  }

  async setGarageConfig(config: any): Promise<boolean> {
    return this.cacheService.set(CacheKeys.GARAGE_CONFIG, config, 3600);
  }

  async invalidateConfig(): Promise<number> {
    return this.cacheService.invalidatePattern('config:*', CacheInvalidationRules.GARAGE_CONFIG_CHANGE);
  }
}

export default EnhancedCacheService;