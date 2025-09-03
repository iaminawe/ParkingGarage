/**
 * Comprehensive tests for Enhanced Cache Service
 * 
 * Tests all caching patterns, circuit breaker functionality,
 * performance monitoring, and edge cases.
 */

import { EnhancedCacheService, CacheConfig, CacheKeys } from '../services/EnhancedCacheService';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Mock Redis client for testing
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    mGet: jest.fn(),
    multi: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    })),
    keys: jest.fn(),
    ping: jest.fn(),
    ttl: jest.fn(),
    scanIterator: jest.fn(),
    on: jest.fn(),
  })),
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EnhancedCacheService', () => {
  let cacheService: EnhancedCacheService;
  let mockRedisClient: any;
  let config: CacheConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    config = {
      host: 'localhost',
      port: 6379,
      password: 'test',
      db: 0,
      keyPrefix: 'test:',
      defaultTTL: 3600,
      maxRetries: 3,
      retryDelayMs: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000,
      enableWriteThrough: true,
      enableWriteBehind: false,
    };

    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn(),
      mGet: jest.fn(),
      multi: jest.fn(() => ({
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(['OK']),
      })),
      keys: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
      ttl: jest.fn(),
      scanIterator: jest.fn(),
      on: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockRedisClient);
    
    cacheService = new EnhancedCacheService(config);
  });

  afterEach(async () => {
    await cacheService.shutdown();
  });

  describe('Connection Management', () => {
    it('should connect to Redis successfully', async () => {
      await cacheService.connect();
      
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Enhanced cache service connected successfully',
        expect.any(Object)
      );
    });

    it('should handle connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      mockRedisClient.connect.mockRejectedValue(error);
      
      await expect(cacheService.connect()).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to connect to enhanced cache service',
        error
      );
    });

    it('should disconnect from Redis gracefully', async () => {
      await cacheService.connect();
      await cacheService.disconnect();
      
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Enhanced cache service disconnected');
    });

    it('should not connect if already connected', async () => {
      await cacheService.connect();
      await cacheService.connect(); // Second call
      
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Basic Cache Operations', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should set and get cache items successfully', async () => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      const ttl = 300;

      // Mock successful set and get
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl,
        hits: 0,
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cacheItem));

      // Test set
      const setResult = await cacheService.set(key, data, ttl);
      expect(setResult).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:test-key',
        expect.stringContaining('"data":{"id":1,"name":"Test"}'),
        { PX: ttl * 1000 }
      );

      // Test get
      const result = await cacheService.get(key);
      expect(result).toEqual(data);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test:test-key');
    });

    it('should handle cache misses correctly', async () => {
      const key = 'nonexistent-key';
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get(key);
      expect(result).toBeNull();

      const metrics = cacheService.getMetrics();
      expect(metrics.misses).toBe(1);
      expect(metrics.hits).toBe(0);
    });

    it('should delete cache items successfully', async () => {
      const key = 'test-key';
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cacheService.delete(key);
      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test:test-key');

      const metrics = cacheService.getMetrics();
      expect(metrics.deletes).toBe(1);
    });

    it('should handle deletion of non-existent keys', async () => {
      const key = 'nonexistent-key';
      mockRedisClient.del.mockResolvedValue(0);

      const result = await cacheService.delete(key);
      expect(result).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should get multiple items efficiently', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const data1 = { id: 1, name: 'Item 1' };
      const data2 = { id: 2, name: 'Item 2' };
      
      const cacheItem1 = JSON.stringify({
        data: data1,
        timestamp: Date.now(),
        ttl: 300,
        hits: 0,
      });
      const cacheItem2 = JSON.stringify({
        data: data2,
        timestamp: Date.now(),
        ttl: 300,
        hits: 0,
      });

      mockRedisClient.mGet.mockResolvedValue([cacheItem1, cacheItem2, null]);

      const results = await cacheService.getMany(keys);
      
      expect(results.size).toBe(2);
      expect(results.get('key1')).toEqual(data1);
      expect(results.get('key2')).toEqual(data2);
      expect(results.has('key3')).toBe(false);

      const metrics = cacheService.getMetrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
    });

    it('should set multiple items efficiently', async () => {
      const items = new Map([
        ['key1', { id: 1, name: 'Item 1' }],
        ['key2', { id: 2, name: 'Item 2' }],
      ]);

      const result = await cacheService.setMany(items, 300);
      expect(result).toBe(2);

      const metrics = cacheService.getMetrics();
      expect(metrics.sets).toBe(2);
    });

    it('should handle empty batch operations gracefully', async () => {
      const emptyKeys: string[] = [];
      const emptyItems = new Map<string, any>();

      const getResult = await cacheService.getMany(emptyKeys);
      const setResult = await cacheService.setMany(emptyItems);

      expect(getResult.size).toBe(0);
      expect(setResult).toBe(0);
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should invalidate patterns successfully', async () => {
      const pattern = 'spots:*';
      const keys = ['test:spots:1', 'test:spots:2', 'test:spots:3'];
      
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.del.mockResolvedValue(3);

      const deletedCount = await cacheService.invalidatePattern(pattern);
      
      expect(deletedCount).toBe(3);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:spots:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(keys);
    });

    it('should handle pattern invalidation with cascades', async () => {
      const pattern = 'spots:1';
      const cascadeRules = ['spots:available', 'analytics:usage'];
      
      // Mock pattern invalidation
      mockRedisClient.keys
        .mockResolvedValueOnce(['test:spots:1']) // Initial pattern
        .mockResolvedValueOnce(['test:spots:available']) // First cascade
        .mockResolvedValueOnce(['test:analytics:usage']); // Second cascade
      
      mockRedisClient.del
        .mockResolvedValueOnce(1) // Initial pattern
        .mockResolvedValueOnce(1) // First cascade
        .mockResolvedValueOnce(1); // Second cascade

      const deletedCount = await cacheService.invalidatePattern(pattern, cascadeRules);
      
      expect(deletedCount).toBe(3);
      expect(mockRedisClient.keys).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(3);
    });

    it('should invalidate by tags', async () => {
      const tags = ['spots', 'availability'];
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield 'test:spots:1';
          yield 'test:pricing:rate:1';
          yield 'test:spots:available';
        },
      };

      mockRedisClient.scanIterator.mockReturnValue(mockIterator);
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify({
          data: {},
          tags: ['spots', 'real-time'],
          timestamp: Date.now(),
          ttl: 30,
          hits: 0,
        }))
        .mockResolvedValueOnce(JSON.stringify({
          data: {},
          tags: ['pricing'],
          timestamp: Date.now(),
          ttl: 300,
          hits: 0,
        }))
        .mockResolvedValueOnce(JSON.stringify({
          data: {},
          tags: ['spots', 'availability'],
          timestamp: Date.now(),
          ttl: 30,
          hits: 0,
        }));

      mockRedisClient.del.mockResolvedValue(1);

      const deletedCount = await cacheService.invalidateByTags(tags);
      
      expect(deletedCount).toBe(2); // Two items match the tags
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should open circuit breaker after repeated failures', async () => {
      const error = new Error('Redis connection lost');
      mockRedisClient.get.mockRejectedValue(error);

      // Simulate failures beyond threshold
      for (let i = 0; i < 6; i++) {
        await cacheService.get('test-key');
      }

      const metrics = cacheService.getMetrics();
      expect(metrics.circuitBreakerState.isOpen).toBe(true);
      expect(metrics.circuitBreakerTrips).toBe(1);
      expect(metrics.errors).toBe(6);
    });

    it('should return null immediately when circuit breaker is open', async () => {
      const error = new Error('Redis connection lost');
      mockRedisClient.get.mockRejectedValue(error);

      // Trip the circuit breaker
      for (let i = 0; i < 6; i++) {
        await cacheService.get('test-key');
      }

      // Next call should return null immediately
      const result = await cacheService.get('another-key');
      expect(result).toBeNull();

      const metrics = cacheService.getMetrics();
      expect(metrics.circuitBreakerState.isOpen).toBe(true);
    });

    it('should attempt reset after timeout period', async () => {
      // Create service with short circuit breaker timeout for testing
      const shortTimeoutConfig = {
        ...config,
        circuitBreakerTimeout: 100, // 100ms for testing
      };
      
      const shortTimeoutService = new EnhancedCacheService(shortTimeoutConfig);
      await shortTimeoutService.connect();

      const error = new Error('Redis connection lost');
      mockRedisClient.get.mockRejectedValue(error);

      // Trip the circuit breaker
      for (let i = 0; i < 6; i++) {
        await shortTimeoutService.get('test-key');
      }

      let metrics = shortTimeoutService.getMetrics();
      expect(metrics.circuitBreakerState.isOpen).toBe(true);

      // Wait for timeout to pass
      await new Promise(resolve => setTimeout(resolve, 150));

      // Mock successful response
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        data: { test: true },
        timestamp: Date.now(),
        ttl: 300,
        hits: 0,
      }));

      // This should reset the circuit breaker
      const result = await shortTimeoutService.get('test-key');
      expect(result).toEqual({ test: true });

      metrics = shortTimeoutService.getMetrics();
      expect(metrics.circuitBreakerState.isOpen).toBe(false);

      await shortTimeoutService.shutdown();
    });
  });

  describe('Cache Warming', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should warm cache with provided tasks', async () => {
      const warmingTasks = [
        {
          key: 'warm-key-1',
          dataLoader: jest.fn().mockResolvedValue({ id: 1, data: 'test1' }),
          ttl: 300,
        },
        {
          key: 'warm-key-2',
          dataLoader: jest.fn().mockResolvedValue({ id: 2, data: 'test2' }),
          ttl: 600,
        },
      ];

      // Mock cache misses for all keys
      mockRedisClient.get.mockResolvedValue(null);

      const warmedCount = await cacheService.warmCache(warmingTasks);
      
      expect(warmedCount).toBe(2);
      expect(warmingTasks[0].dataLoader).toHaveBeenCalled();
      expect(warmingTasks[1].dataLoader).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledTimes(2);
    });

    it('should skip keys that are already cached', async () => {
      const warmingTasks = [
        {
          key: 'existing-key',
          dataLoader: jest.fn(),
          ttl: 300,
        },
      ];

      // Mock cache hit
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        data: { existing: true },
        timestamp: Date.now(),
        ttl: 300,
        hits: 0,
      }));

      const warmedCount = await cacheService.warmCache(warmingTasks);
      
      expect(warmedCount).toBe(0);
      expect(warmingTasks[0].dataLoader).not.toHaveBeenCalled();
    });

    it('should handle warming task errors gracefully', async () => {
      const warmingTasks = [
        {
          key: 'error-key',
          dataLoader: jest.fn().mockRejectedValue(new Error('Data loading failed')),
          ttl: 300,
        },
        {
          key: 'success-key',
          dataLoader: jest.fn().mockResolvedValue({ success: true }),
          ttl: 300,
        },
      ];

      mockRedisClient.get.mockResolvedValue(null);

      const warmedCount = await cacheService.warmCache(warmingTasks);
      
      expect(warmedCount).toBe(1); // Only successful task
      expect(logger.error).toHaveBeenCalledWith(
        'Enhanced cache warming error',
        expect.objectContaining({
          key: 'error-key',
        })
      );
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should track cache hit and miss rates', async () => {
      // Mock cache hits
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify({
          data: { hit: 1 },
          timestamp: Date.now(),
          ttl: 300,
          hits: 0,
        }))
        .mockResolvedValueOnce(null) // Miss
        .mockResolvedValueOnce(JSON.stringify({
          data: { hit: 2 },
          timestamp: Date.now(),
          ttl: 300,
          hits: 0,
        }));

      await cacheService.get('key1'); // Hit
      await cacheService.get('key2'); // Miss  
      await cacheService.get('key3'); // Hit

      const metrics = cacheService.getMetrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe(66.67); // 2/3 * 100, rounded
    });

    it('should track response times', async () => {
      mockRedisClient.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(null), 10))
      );

      await cacheService.get('test-key');

      const metrics = cacheService.getMetrics();
      expect(metrics.avgResponseTime).toBeGreaterThan(0);
    });

    it('should provide health check status', async () => {
      const health = await cacheService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.responseTime).toBeGreaterThan(0);
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should handle health check failures', async () => {
      const error = new Error('Ping failed');
      mockRedisClient.ping.mockRejectedValue(error);

      const health = await cacheService.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Ping failed');
    });
  });

  describe('Cache Statistics', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should collect cache statistics', async () => {
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield 'test:spots:1';
          yield 'test:pricing:rate:1';
        },
      };

      mockRedisClient.scanIterator.mockReturnValue(mockIterator);
      mockRedisClient.get
        .mockResolvedValueOnce('{"data":{"id":1},"timestamp":1234567890,"ttl":30,"hits":5}')
        .mockResolvedValueOnce('{"data":{"rate":10},"timestamp":1234567890,"ttl":300,"hits":2}');
      mockRedisClient.ttl
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(250);

      const stats = await cacheService.getCacheStatistics();
      
      expect(stats.totalKeys).toBe(2);
      expect(stats.totalMemory).toBeGreaterThan(0);
      expect(stats.expirationTimes.size).toBe(2);
    });

    it('should filter statistics by pattern', async () => {
      const pattern = 'spots:*';
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield 'test:spots:1';
          yield 'test:spots:2';
        },
      };

      mockRedisClient.scanIterator.mockReturnValue(mockIterator);
      mockRedisClient.get.mockResolvedValue('{"data":{},"timestamp":123,"ttl":30,"hits":0}');
      mockRedisClient.ttl.mockResolvedValue(25);

      const stats = await cacheService.getCacheStatistics(pattern);
      
      expect(stats.totalKeys).toBe(2);
      expect(mockRedisClient.scanIterator).toHaveBeenCalledWith({
        MATCH: 'test:spots:*',
        COUNT: 100,
      });
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should emit write-through events', (done) => {
      const key = 'test-key';
      const data = { test: true };

      cacheService.on('writeThrough', (eventKey, eventData) => {
        expect(eventKey).toBe(key);
        expect(eventData).toEqual(data);
        done();
      });

      // Register a strategy with write-through enabled
      cacheService.registerStrategy('test', {
        ttl: 300,
        priority: 'high',
        enableWriteThrough: true,
      });

      cacheService.set(key, data);
    });

    it('should emit invalidation events', (done) => {
      const pattern = 'test:*';
      
      mockRedisClient.keys.mockResolvedValue(['test:key1', 'test:key2']);
      mockRedisClient.del.mockResolvedValue(2);

      cacheService.on('invalidation', (eventPattern, deletedCount) => {
        expect(eventPattern).toBe(pattern);
        expect(deletedCount).toBe(2);
        done();
      });

      cacheService.invalidatePattern(pattern);
    });

    it('should emit circuit breaker events', (done) => {
      const error = new Error('Connection failed');
      mockRedisClient.get.mockRejectedValue(error);

      cacheService.on('circuitBreakerOpen', (state) => {
        expect(state.isOpen).toBe(true);
        expect(state.failures).toBeGreaterThanOrEqual(5);
        done();
      });

      // Trip the circuit breaker
      Promise.all([
        cacheService.get('key1'),
        cacheService.get('key2'),
        cacheService.get('key3'),
        cacheService.get('key4'),
        cacheService.get('key5'),
        cacheService.get('key6'), // This should trip the breaker
      ]);
    });
  });

  describe('Strategy Management', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should register and use custom strategies', async () => {
      const strategy = {
        ttl: 120,
        priority: 'high' as const,
        enableWriteThrough: true,
        refreshAhead: true,
        tags: ['custom', 'test'],
      };

      cacheService.registerStrategy('custom', strategy);

      const key = 'custom:test-key';
      const data = { custom: true };

      await cacheService.set(key, data);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:custom:test-key',
        expect.stringContaining('"ttl":120'),
        { PX: 120 * 1000 }
      );
    });

    it('should use default strategy for unknown key patterns', async () => {
      const key = 'unknown:pattern:key';
      const data = { unknown: true };

      await cacheService.set(key, data);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:unknown:pattern:key',
        expect.stringContaining(`"ttl":${config.defaultTTL}`),
        { PX: config.defaultTTL * 1000 }
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should handle Redis connection errors gracefully', async () => {
      const error = new Error('Connection lost');
      mockRedisClient.get.mockRejectedValue(error);

      const result = await cacheService.get('test-key');
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Enhanced cache get error',
        expect.objectContaining({ key: 'test-key', error })
      );
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');

      const result = await cacheService.get('test-key');
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Enhanced cache get error',
        expect.any(Object)
      );
    });

    it('should handle set operation failures', async () => {
      const error = new Error('Set failed');
      mockRedisClient.set.mockRejectedValue(error);

      const result = await cacheService.set('test-key', { data: true });
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Enhanced cache set error',
        expect.objectContaining({ key: 'test-key', error })
      );
    });
  });

  describe('Shutdown and Cleanup', () => {
    it('should shutdown gracefully', async () => {
      await cacheService.connect();
      await cacheService.shutdown();
      
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Enhanced cache service shutdown completed');
    });

    it('should reset metrics successfully', async () => {
      await cacheService.connect();
      
      // Generate some metrics
      await cacheService.get('test-key');
      await cacheService.set('test-key', { data: true });

      let metrics = cacheService.getMetrics();
      expect(metrics.misses).toBeGreaterThan(0);
      expect(metrics.sets).toBeGreaterThan(0);

      // Reset metrics
      cacheService.resetMetrics();

      metrics = cacheService.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.sets).toBe(0);
      expect(metrics.deletes).toBe(0);
      expect(metrics.errors).toBe(0);
    });
  });

  describe('Cache Keys', () => {
    it('should generate correct cache keys', () => {
      expect(CacheKeys.VEHICLE('ABC123')).toBe('vehicle:ABC123');
      expect(CacheKeys.SPOT('P001')).toBe('spots:P001');
      expect(CacheKeys.SESSION('sess-123')).toBe('session:sess-123');
      expect(CacheKeys.PRICING_RATE('hourly', 120)).toBe('pricing:rate:hourly:120');
      expect(CacheKeys.DAILY_STATS('2024-01-01')).toBe('analytics:daily:2024-01-01');
    });

    it('should handle case normalization for vehicle plates', () => {
      expect(CacheKeys.VEHICLE('abc123')).toBe('vehicle:ABC123');
      expect(CacheKeys.VEHICLE('XyZ789')).toBe('vehicle:XYZ789');
    });
  });
});