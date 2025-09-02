/**
 * Cache Performance Tests
 * 
 * Performance benchmarks for cache operations including hit/miss ratios,
 * cache warming, invalidation strategies, and memory usage patterns.
 * 
 * @module CachePerformanceTests
 */

import CacheService, { CacheKeys } from '../../src/services/CacheService';
import { performanceMetrics, PerformanceUtils } from '../../src/utils/performanceMetrics';

describe('Cache Performance Tests', () => {
  let cache: CacheService;
  let mockRedis: any;

  beforeAll(async () => {
    // Create mock Redis client for consistent testing
    mockRedis = {
      data: new Map<string, string>(),
      expiry: new Map<string, number>(),
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn().mockImplementation((key: string) => {
        const expiry = mockRedis.expiry.get(key);
        if (expiry && Date.now() > expiry) {
          mockRedis.data.delete(key);
          mockRedis.expiry.delete(key);
          return null;
        }
        return mockRedis.data.get(key) || null;
      }),
      set: jest.fn().mockImplementation((key: string, value: string, options?: any) => {
        mockRedis.data.set(key, value);
        if (options?.PX) {
          mockRedis.expiry.set(key, Date.now() + options.PX);
        }
        return 'OK';
      }),
      del: jest.fn().mockImplementation((key: string | string[]) => {
        const keys = Array.isArray(key) ? key : [key];
        let deleted = 0;
        keys.forEach(k => {
          if (mockRedis.data.has(k)) {
            mockRedis.data.delete(k);
            mockRedis.expiry.delete(k);
            deleted++;
          }
        });
        return deleted;
      }),
      mGet: jest.fn().mockImplementation((keys: string[]) => {
        return keys.map(key => {
          const expiry = mockRedis.expiry.get(key);
          if (expiry && Date.now() > expiry) {
            mockRedis.data.delete(key);
            mockRedis.expiry.delete(key);
            return null;
          }
          return mockRedis.data.get(key) || null;
        });
      }),
      keys: jest.fn().mockImplementation((pattern: string) => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(mockRedis.data.keys()).filter(key => regex.test(key));
      }),
      multi: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      }),
      on: jest.fn(),
      off: jest.fn()
    };

    cache = new CacheService({
      host: 'localhost',
      port: 6379,
      defaultTTL: 300,
      maxRetries: 3,
      retryDelayMs: 1000
    });

    // Replace Redis client with mock
    (cache as any).client = mockRedis;
    (cache as any).isConnected = true;

    performanceMetrics.startCollection();
  });

  afterAll(async () => {
    performanceMetrics.stopCollection();
    await cache.disconnect();
  });

  describe('Basic Cache Operations Performance', () => {
    test('Single cache operations performance', async () => {
      const testData = { id: '1', name: 'Test Vehicle', type: 'STANDARD' };

      // Set operation
      const setBenchmark = await performanceMetrics.benchmark(
        'cache_set_operation',
        async () => {
          return await cache.set('test:vehicle:1', testData, 300);
        }
      );

      // Get operation
      const getBenchmark = await performanceMetrics.benchmark(
        'cache_get_operation',
        async () => {
          return await cache.get('test:vehicle:1');
        }
      );

      // Delete operation
      const deleteBenchmark = await performanceMetrics.benchmark(
        'cache_delete_operation',
        async () => {
          return await cache.delete('test:vehicle:1');
        }
      );

      // Basic operations should be very fast
      expect(setBenchmark.duration).toBeLessThan(50);
      expect(getBenchmark.duration).toBeLessThan(50);
      expect(deleteBenchmark.duration).toBeLessThan(50);

      expect(setBenchmark.result).toBe(true);
      expect(getBenchmark.result).toEqual(testData);
      expect(deleteBenchmark.result).toBe(true);

      console.log(`Cache set: ${setBenchmark.duration}ms`);
      console.log(`Cache get: ${getBenchmark.duration}ms`);
      console.log(`Cache delete: ${deleteBenchmark.duration}ms`);
    });

    test('Batch cache operations performance', async () => {
      const testData = new Map();
      for (let i = 0; i < 1000; i++) {
        testData.set(`vehicle:${i}`, {
          id: i,
          licensePlate: `TEST${String(i).padStart(4, '0')}`,
          type: 'STANDARD',
          timestamp: Date.now()
        });
      }

      // Batch set operations
      const batchSetBenchmark = await performanceMetrics.benchmark(
        'cache_batch_set',
        async () => {
          return await cache.setMany(testData, 300);
        }
      );

      // Batch get operations
      const keys = Array.from(testData.keys());
      const batchGetBenchmark = await performanceMetrics.benchmark(
        'cache_batch_get',
        async () => {
          return await cache.getMany(keys);
        }
      );

      expect(batchSetBenchmark.duration).toBeLessThan(1000); // 1 second for 1000 items
      expect(batchGetBenchmark.duration).toBeLessThan(500);  // 500ms for 1000 items

      expect(batchSetBenchmark.result).toBe(1000);
      expect(batchGetBenchmark.result.size).toBe(1000);

      console.log(`Batch set 1000 items: ${batchSetBenchmark.duration}ms`);
      console.log(`Batch get 1000 items: ${batchGetBenchmark.duration}ms`);
    });
  });

  describe('Cache Hit Ratio Performance', () => {
    test('Cache hit ratio under different access patterns', async () => {
      // Populate cache with test data
      const dataSize = 500;
      for (let i = 0; i < dataSize; i++) {
        await cache.set(`perf:item:${i}`, { id: i, data: `Item ${i}` }, 600);
      }

      // Random access pattern (should have good hit rate)
      const randomAccessBenchmark = await performanceMetrics.benchmark(
        'random_access_pattern',
        async () => {
          const promises = Array.from({ length: 1000 }, () => {
            const randomId = Math.floor(Math.random() * dataSize);
            return cache.get(`perf:item:${randomId}`);
          });
          return await Promise.all(promises);
        }
      );

      // Sequential access pattern (100% hit rate)
      const sequentialAccessBenchmark = await performanceMetrics.benchmark(
        'sequential_access_pattern',
        async () => {
          const promises = Array.from({ length: dataSize }, (_, i) => {
            return cache.get(`perf:item:${i}`);
          });
          return await Promise.all(promises);
        }
      );

      // Mixed access pattern (some hits, some misses)
      const mixedAccessBenchmark = await performanceMetrics.benchmark(
        'mixed_access_pattern',
        async () => {
          const promises = Array.from({ length: 1000 }, (_, i) => {
            // 70% existing keys, 30% non-existing keys
            const key = i < 700 
              ? `perf:item:${Math.floor(Math.random() * dataSize)}`
              : `perf:item:${dataSize + i}`;
            return cache.get(key);
          });
          return await Promise.all(promises);
        }
      );

      const randomHits = randomAccessBenchmark.result.filter(Boolean).length;
      const sequentialHits = sequentialAccessBenchmark.result.filter(Boolean).length;
      const mixedHits = mixedAccessBenchmark.result.filter(Boolean).length;

      console.log(`Random access: ${randomHits}/1000 hits (${randomAccessBenchmark.duration}ms)`);
      console.log(`Sequential access: ${sequentialHits}/${dataSize} hits (${sequentialAccessBenchmark.duration}ms)`);
      console.log(`Mixed access: ${mixedHits}/1000 hits (${mixedAccessBenchmark.duration}ms)`);

      expect(sequentialHits).toBe(dataSize); // Should be 100% hit rate
      expect(mixedHits).toBeGreaterThan(600); // Should have >60% hit rate
    });
  });

  describe('Cache Warming Performance', () => {
    test('Cache warming efficiency', async () => {
      // Clear existing cache
      mockRedis.data.clear();
      mockRedis.expiry.clear();

      const warmingTasks = Array.from({ length: 100 }, (_, i) => ({
        key: `warm:vehicle:${i}`,
        dataLoader: async () => ({
          id: i,
          licensePlate: `WARM${String(i).padStart(4, '0')}`,
          type: 'STANDARD',
          loadedAt: Date.now()
        }),
        ttl: 3600
      }));

      const warmingBenchmark = await performanceMetrics.benchmark(
        'cache_warming',
        async () => {
          return await cache.warmCache(warmingTasks);
        }
      );

      // After warming, test cache hit performance
      const hitTestBenchmark = await performanceMetrics.benchmark(
        'post_warming_hits',
        async () => {
          const promises = Array.from({ length: 100 }, (_, i) => 
            cache.get(`warm:vehicle:${i}`)
          );
          return await Promise.all(promises);
        }
      );

      expect(warmingBenchmark.result).toBe(100); // All items should be warmed
      expect(warmingBenchmark.duration).toBeLessThan(2000); // Should warm efficiently

      const hitCount = hitTestBenchmark.result.filter(Boolean).length;
      expect(hitCount).toBe(100); // All should be cache hits

      console.log(`Cache warming: ${warmingBenchmark.duration}ms for 100 items`);
      console.log(`Post-warming hit test: ${hitTestBenchmark.duration}ms (${hitCount}/100 hits)`);
    });

    test('Large dataset cache warming', async () => {
      const largeWarmingTasks = Array.from({ length: 1000 }, (_, i) => ({
        key: `large:dataset:${i}`,
        dataLoader: async () => ({
          id: i,
          data: Array.from({ length: 100 }, (_, j) => `field_${j}_value_${i}_${j}`),
          timestamp: Date.now(),
          metadata: {
            category: i % 10,
            priority: Math.floor(i / 100),
            tags: [`tag${i % 5}`, `category${i % 10}`]
          }
        }),
        ttl: 1800
      }));

      const largeWarmingBenchmark = await performanceMetrics.benchmark(
        'large_dataset_warming',
        async () => {
          return await cache.warmCache(largeWarmingTasks);
        }
      );

      expect(largeWarmingBenchmark.result).toBe(1000);
      expect(largeWarmingBenchmark.duration).toBeLessThan(10000); // 10 seconds max

      console.log(`Large dataset warming: ${largeWarmingBenchmark.duration}ms for 1000 complex items`);
      console.log(`Average per item: ${(largeWarmingBenchmark.duration / 1000).toFixed(2)}ms`);
    });
  });

  describe('Cache Invalidation Performance', () => {
    test('Pattern-based cache invalidation', async () => {
      // Populate cache with different patterns
      const patterns = ['user:', 'vehicle:', 'session:', 'analytics:'];
      for (const pattern of patterns) {
        for (let i = 0; i < 250; i++) {
          await cache.set(`${pattern}${i}`, { pattern, id: i }, 600);
        }
      }

      // Invalidate specific pattern
      const invalidationBenchmark = await performanceMetrics.benchmark(
        'pattern_invalidation',
        async () => {
          return await cache.invalidatePattern('vehicle:*');
        }
      );

      // Verify invalidation worked
      const verificationBenchmark = await performanceMetrics.benchmark(
        'invalidation_verification',
        async () => {
          const vehicleKeys = Array.from({ length: 250 }, (_, i) => `vehicle:${i}`);
          const sessionKeys = Array.from({ length: 250 }, (_, i) => `session:${i}`);
          
          const vehicleResults = await cache.getMany(vehicleKeys);
          const sessionResults = await cache.getMany(sessionKeys);
          
          return {
            vehicleHits: vehicleResults.size,
            sessionHits: sessionResults.size
          };
        }
      );

      expect(invalidationBenchmark.result).toBe(250); // Should invalidate 250 vehicle entries
      expect(invalidationBenchmark.duration).toBeLessThan(1000);

      expect(verificationBenchmark.result.vehicleHits).toBe(0); // Vehicle cache cleared
      expect(verificationBenchmark.result.sessionHits).toBe(250); // Session cache intact

      console.log(`Pattern invalidation: ${invalidationBenchmark.duration}ms (${invalidationBenchmark.result} items)`);
    });
  });

  describe('Memory Usage Optimization', () => {
    test('Cache memory efficiency', async () => {
      const initialMemory = process.memoryUsage();

      // Store large objects in cache
      const largeObjects = Array.from({ length: 500 }, (_, i) => ({
        key: `memory:test:${i}`,
        data: {
          id: i,
          largeString: 'x'.repeat(10000), // 10KB string
          arrayData: Array.from({ length: 1000 }, (_, j) => j),
          nestedObject: {
            level1: Array.from({ length: 100 }, (_, k) => ({
              id: k,
              data: `nested_${i}_${k}`
            }))
          }
        }
      }));

      const memoryBenchmark = PerformanceUtils.monitorMemory(() => {
        // Simulate storing in cache (our mock doesn't actually use memory like Redis)
        largeObjects.forEach(({ key, data }) => {
          mockRedis.data.set(`parking:${key}`, JSON.stringify({
            data,
            timestamp: Date.now(),
            ttl: 600,
            hits: 0
          }));
        });
        return largeObjects.length;
      });

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory benchmark for ${largeObjects.length} large objects:`);
      console.log(`Memory delta: ${(memoryBenchmark.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Peak memory: ${(memoryBenchmark.peakMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Total growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

      // Memory usage should be reasonable
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
    });
  });

  describe('Concurrent Cache Access', () => {
    test('Concurrent cache operations performance', async () => {
      const concurrentOperations = 100;

      const concurrentBenchmark = await performanceMetrics.benchmark(
        'concurrent_cache_operations',
        async () => {
          const operations = Array.from({ length: concurrentOperations }, (_, i) => {
            const operationType = i % 4;
            switch (operationType) {
              case 0: // Set operation
                return cache.set(`concurrent:set:${i}`, { id: i, type: 'set' });
              case 1: // Get operation
                return cache.get(`concurrent:get:${i % 50}`); // Some will miss
              case 2: // Delete operation
                return cache.delete(`concurrent:delete:${i}`);
              default: // Complex object set
                return cache.set(`concurrent:complex:${i}`, {
                  id: i,
                  data: Array.from({ length: 100 }, (_, j) => `item_${j}`),
                  timestamp: Date.now()
                }, 300);
            }
          });

          return await Promise.all(operations);
        }
      );

      expect(concurrentBenchmark.duration).toBeLessThan(2000); // Should handle concurrent ops efficiently
      expect(concurrentBenchmark.result).toHaveLength(concurrentOperations);

      console.log(`${concurrentOperations} concurrent cache operations: ${concurrentBenchmark.duration}ms`);
    });

    test('Cache performance under high load', async () => {
      const highLoadOperations = 1000;
      const loadTestData = Array.from({ length: highLoadOperations }, (_, i) => ({
        key: `load:test:${i}`,
        value: {
          id: i,
          timestamp: Date.now(),
          data: `Load test data item ${i}`,
          metadata: {
            index: i,
            batch: Math.floor(i / 100),
            category: i % 10
          }
        }
      }));

      // High load write test
      const writeLoadBenchmark = await performanceMetrics.benchmark(
        'high_load_writes',
        async () => {
          const writePromises = loadTestData.map(({ key, value }) => 
            cache.set(key, value, 300)
          );
          return await Promise.all(writePromises);
        }
      );

      // High load read test
      const readLoadBenchmark = await performanceMetrics.benchmark(
        'high_load_reads',
        async () => {
          const readPromises = loadTestData.map(({ key }) => 
            cache.get(key)
          );
          return await Promise.all(readPromises);
        }
      );

      const writeSuccessCount = writeLoadBenchmark.result.filter(Boolean).length;
      const readSuccessCount = readLoadBenchmark.result.filter(Boolean).length;

      expect(writeLoadBenchmark.duration).toBeLessThan(5000); // 5 seconds max for 1000 writes
      expect(readLoadBenchmark.duration).toBeLessThan(3000);  // 3 seconds max for 1000 reads

      expect(writeSuccessCount).toBe(highLoadOperations);
      expect(readSuccessCount).toBe(highLoadOperations);

      console.log(`High load test results:`);
      console.log(`Writes: ${writeLoadBenchmark.duration}ms (${writeSuccessCount}/${highLoadOperations})`);
      console.log(`Reads: ${readLoadBenchmark.duration}ms (${readSuccessCount}/${highLoadOperations})`);
    });
  });

  describe('Cache Metrics and Health', () => {
    test('Cache metrics collection performance', async () => {
      // Perform various cache operations
      for (let i = 0; i < 100; i++) {
        await cache.set(`metrics:test:${i}`, { id: i });
        await cache.get(`metrics:test:${i}`);
        if (i % 10 === 0) {
          await cache.delete(`metrics:test:${i}`);
        }
      }

      const metricsBenchmark = await performanceMetrics.benchmark(
        'cache_metrics_collection',
        async () => {
          return cache.getMetrics();
        }
      );

      const healthBenchmark = await performanceMetrics.benchmark(
        'cache_health_check',
        async () => {
          return await cache.healthCheck();
        }
      );

      expect(metricsBenchmark.duration).toBeLessThan(100); // Should be very fast
      expect(healthBenchmark.duration).toBeLessThan(100);

      expect(metricsBenchmark.result.hits).toBeGreaterThan(0);
      expect(metricsBenchmark.result.sets).toBeGreaterThan(0);
      expect(healthBenchmark.result.status).toBe('healthy');

      console.log(`Metrics collection: ${metricsBenchmark.duration}ms`);
      console.log(`Health check: ${healthBenchmark.duration}ms`);
      console.log(`Cache hit rate: ${metricsBenchmark.result.hitRate}%`);
    });
  });
});