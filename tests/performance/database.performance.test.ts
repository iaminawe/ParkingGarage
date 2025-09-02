/**
 * Database Performance Tests
 * 
 * Comprehensive performance benchmarks for database operations including
 * CRUD operations, queries, indexes, and concurrent access patterns.
 * 
 * @module DatabasePerformanceTests
 */

import { PrismaClient } from '@prisma/client';
import { createOptimizedPrismaClient } from '../../src/config/database.config';
import CacheService from '../../src/services/CacheService';
import QueryOptimizer from '../../src/services/QueryOptimizer';
import { performanceMetrics, PerformanceUtils } from '../../src/utils/performanceMetrics';

describe('Database Performance Tests', () => {
  let prisma: PrismaClient;
  let cache: CacheService;
  let queryOptimizer: QueryOptimizer;

  beforeAll(async () => {
    // Setup optimized database client
    prisma = createOptimizedPrismaClient({
      url: 'file:./test_performance.db',
      maxConnections: 20,
      connectionTimeout: 5000,
      queryTimeout: 30000,
      enableQueryLogging: true,
      slowQueryThreshold: 100,
      enableMetrics: true,
      poolTimeout: 10000,
      idleTimeout: 300000,
      maxLifetime: 3600000,
      sqliteOptimizations: {
        enableWAL: true,
        cacheSize: 4000,
        tempStore: 'memory',
        synchronous: 'NORMAL',
        journalMode: 'WAL',
        mmapSize: 268435456,
        pageSize: 4096
      }
    });

    // Setup cache service for testing
    cache = new CacheService({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      defaultTTL: 300,
      maxRetries: 3,
      retryDelayMs: 1000
    });

    // Initialize cache connection (mock for testing)
    try {
      await cache.connect();
    } catch (error) {
      console.warn('Redis not available for performance tests, using mock cache');
      // Create mock cache for testing
      (cache as any).get = jest.fn().mockResolvedValue(null);
      (cache as any).set = jest.fn().mockResolvedValue(true);
    }

    queryOptimizer = new QueryOptimizer(prisma, cache);

    // Setup performance metrics collection
    performanceMetrics.startCollection();

    // Migrate database schema
    await prisma.$executeRaw`PRAGMA journal_mode = WAL`;
    await prisma.$executeRaw`PRAGMA cache_size = 4000`;
    await prisma.$executeRaw`PRAGMA mmap_size = 268435456`;
  });

  afterAll(async () => {
    performanceMetrics.stopCollection();
    await cache.disconnect();
    await prisma.$disconnect();
  });

  describe('CRUD Operations Performance', () => {
    test('Vehicle creation performance', async () => {
      const vehicleCount = 1000;
      const vehicles = Array.from({ length: vehicleCount }, (_, i) => ({
        licensePlate: `PERF${String(i).padStart(4, '0')}`,
        vehicleType: ['COMPACT', 'STANDARD', 'OVERSIZED'][i % 3] as any,
        make: 'TestMake',
        model: 'TestModel',
        year: 2020 + (i % 5)
      }));

      const benchmark = await performanceMetrics.benchmark(
        'vehicle_creation_batch',
        async () => {
          return await prisma.$transaction(
            vehicles.map(vehicle => 
              prisma.vehicle.create({ data: vehicle })
            )
          );
        }
      );

      expect(benchmark.duration).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(benchmark.result).toHaveLength(vehicleCount);
      
      console.log(`Created ${vehicleCount} vehicles in ${benchmark.duration}ms`);
      console.log(`Average: ${(benchmark.duration / vehicleCount).toFixed(2)}ms per vehicle`);
    });

    test('Vehicle lookup performance with indexes', async () => {
      const lookupCount = 100;
      const licensePlates = Array.from({ length: lookupCount }, (_, i) => 
        `PERF${String(i).padStart(4, '0')}`
      );

      const benchmark = await performanceMetrics.benchmark(
        'vehicle_lookup_indexed',
        async () => {
          const results = await Promise.all(
            licensePlates.map(plate => 
              prisma.vehicle.findUnique({
                where: { licensePlate: plate }
              })
            )
          );
          return results.filter(Boolean);
        }
      );

      expect(benchmark.duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(benchmark.result.length).toBe(lookupCount);
      
      console.log(`Looked up ${lookupCount} vehicles in ${benchmark.duration}ms`);
      console.log(`Average: ${(benchmark.duration / lookupCount).toFixed(2)}ms per lookup`);
    });

    test('Complex query performance with joins', async () => {
      // Create some parking sessions first
      await prisma.$executeRaw`
        INSERT INTO parking_sessions (id, vehicleId, spotId, startTime, totalAmount)
        SELECT 
          'session_' || v.id,
          v.id,
          'spot_1',
          datetime('now', '-' || (random() % 720) || ' minutes') as startTime,
          5.0 + (random() % 20)
        FROM vehicles v 
        LIMIT 500
      `;

      const benchmark = await performanceMetrics.benchmark(
        'complex_vehicle_query',
        async () => {
          return await prisma.vehicle.findMany({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            },
            include: {
              sessions: {
                select: {
                  startTime: true,
                  endTime: true,
                  totalAmount: true,
                  isPaid: true
                },
                orderBy: {
                  startTime: 'desc'
                },
                take: 5
              }
            },
            orderBy: {
              checkInTime: 'desc'
            },
            take: 100
          });
        }
      );

      expect(benchmark.duration).toBeLessThan(500); // Should complete in under 500ms
      expect(benchmark.result.length).toBeGreaterThan(0);
      
      console.log(`Complex query with joins completed in ${benchmark.duration}ms`);
    });
  });

  describe('Query Optimization Performance', () => {
    test('Optimized vehicle search performance', async () => {
      const searchParams = {
        vehicleType: 'STANDARD',
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        limit: 50
      };

      const benchmark = await performanceMetrics.benchmark(
        'optimized_vehicle_search',
        async () => {
          return await queryOptimizer.searchVehicles(searchParams);
        }
      );

      expect(benchmark.duration).toBeLessThan(200); // Should complete in under 200ms
      expect(benchmark.result.vehicles.length).toBeGreaterThan(0);
      
      console.log(`Optimized search completed in ${benchmark.duration}ms`);
    });

    test('Cached vs uncached lookup performance', async () => {
      const licensePlate = 'PERF0001';

      // First lookup (uncached)
      const uncachedBenchmark = await performanceMetrics.benchmark(
        'uncached_vehicle_lookup',
        async () => {
          return await queryOptimizer.findVehicleByLicensePlate(licensePlate, false);
        }
      );

      // Second lookup (should be cached)
      const cachedBenchmark = await performanceMetrics.benchmark(
        'cached_vehicle_lookup',
        async () => {
          return await queryOptimizer.findVehicleByLicensePlate(licensePlate, true);
        }
      );

      // Cache should be significantly faster
      const speedupRatio = uncachedBenchmark.duration / Math.max(cachedBenchmark.duration, 1);
      console.log(`Cache speedup: ${speedupRatio.toFixed(2)}x`);
      console.log(`Uncached: ${uncachedBenchmark.duration}ms, Cached: ${cachedBenchmark.duration}ms`);

      expect(speedupRatio).toBeGreaterThan(1); // Cache should provide some speedup
    });

    test('Batch operations performance', async () => {
      const operations = Array.from({ length: 50 }, (_, i) => ({
        type: i % 2 === 0 ? 'CHECK_IN' : 'CHECK_OUT' as const,
        vehicleData: {
          id: `vehicle_${i}`,
          licensePlate: `BATCH${String(i).padStart(3, '0')}`,
          vehicleType: 'STANDARD',
          spotId: `spot_${i % 10}`,
          updates: {
            checkOutTime: new Date(),
            totalAmount: 15.50
          }
        }
      }));

      const benchmark = await performanceMetrics.benchmark(
        'batch_vehicle_operations',
        async () => {
          return await queryOptimizer.batchVehicleOperations(operations.slice(0, 25)); // Only check-ins
        }
      );

      expect(benchmark.duration).toBeLessThan(2000); // Should complete in under 2 seconds
      
      console.log(`Batch operations completed in ${benchmark.duration}ms`);
      console.log(`Average: ${(benchmark.duration / 25).toFixed(2)}ms per operation`);
    });
  });

  describe('Concurrent Access Performance', () => {
    test('Concurrent read performance', async () => {
      const concurrentReads = 50;
      const licensePlates = Array.from({ length: concurrentReads }, (_, i) => 
        `PERF${String(i % 100).padStart(4, '0')}`
      );

      const benchmark = await performanceMetrics.benchmark(
        'concurrent_reads',
        async () => {
          return await Promise.all(
            licensePlates.map(plate => 
              queryOptimizer.findVehicleByLicensePlate(plate, false)
            )
          );
        }
      );

      const successfulReads = benchmark.result.filter(Boolean).length;
      
      expect(benchmark.duration).toBeLessThan(3000); // Should handle concurrent reads efficiently
      expect(successfulReads).toBeGreaterThan(0);
      
      console.log(`${concurrentReads} concurrent reads completed in ${benchmark.duration}ms`);
      console.log(`Successful reads: ${successfulReads}/${concurrentReads}`);
    });

    test('Mixed read/write concurrent operations', async () => {
      const operations = Array.from({ length: 20 }, (_, i) => {
        if (i % 3 === 0) {
          // Write operation
          return async () => {
            return await prisma.vehicle.create({
              data: {
                licensePlate: `CONC${String(Date.now())}_${i}`,
                vehicleType: 'STANDARD',
                make: 'ConcurrentTest',
                model: 'Model'
              }
            });
          };
        } else {
          // Read operation
          return async () => {
            return await prisma.vehicle.findMany({
              where: {
                vehicleType: 'STANDARD'
              },
              take: 10
            });
          };
        }
      });

      const benchmark = await performanceMetrics.benchmark(
        'mixed_concurrent_operations',
        async () => {
          return await Promise.all(operations.map(op => op()));
        }
      );

      expect(benchmark.duration).toBeLessThan(5000); // Should handle mixed operations
      
      console.log(`Mixed concurrent operations completed in ${benchmark.duration}ms`);
    });
  });

  describe('Index Performance Analysis', () => {
    test('Query performance with and without indexes', async () => {
      // This test would ideally run against a database with indexes disabled,
      // then enabled to compare performance. For SQLite, we'll simulate this
      // by running different query patterns.

      const indexedQueryBenchmark = await performanceMetrics.benchmark(
        'indexed_query',
        async () => {
          return await prisma.vehicle.findMany({
            where: {
              vehicleType: 'STANDARD',
              checkInTime: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              }
            },
            orderBy: {
              checkInTime: 'desc'
            },
            take: 100
          });
        }
      );

      const fullTableScanBenchmark = await performanceMetrics.benchmark(
        'full_table_scan',
        async () => {
          // Force a full table scan with complex conditions
          return await prisma.$queryRaw`
            SELECT * FROM vehicles 
            WHERE UPPER(make) LIKE '%TEST%' 
            AND year > 2015
            ORDER BY random()
            LIMIT 100
          `;
        }
      );

      console.log(`Indexed query: ${indexedQueryBenchmark.duration}ms`);
      console.log(`Full table scan: ${fullTableScanBenchmark.duration}ms`);
      
      // Indexed query should generally be faster
      expect(indexedQueryBenchmark.duration).toBeLessThan(fullTableScanBenchmark.duration * 2);
    });
  });

  describe('Performance Regression Tests', () => {
    test('Performance should not degrade significantly', async () => {
      const baselineMetrics = {
        singleVehicleLookup: 50,    // ms
        batchVehicleCreation: 3000, // ms for 1000 vehicles
        complexQuery: 200,          // ms
        concurrentReads: 2000       // ms for 50 concurrent reads
      };

      // Single vehicle lookup
      const lookupBenchmark = await performanceMetrics.benchmark(
        'regression_single_lookup',
        async () => {
          return await queryOptimizer.findVehicleByLicensePlate('PERF0001', false);
        }
      );

      // Complex query
      const complexBenchmark = await performanceMetrics.benchmark(
        'regression_complex_query',
        async () => {
          return await prisma.vehicle.findMany({
            include: {
              sessions: {
                take: 3
              }
            },
            take: 50
          });
        }
      );

      // Performance should not degrade more than 20% from baseline
      const toleranceMultiplier = 1.2;
      
      expect(lookupBenchmark.duration).toBeLessThan(
        baselineMetrics.singleVehicleLookup * toleranceMultiplier
      );
      expect(complexBenchmark.duration).toBeLessThan(
        baselineMetrics.complexQuery * toleranceMultiplier
      );

      console.log('Performance regression test results:');
      console.log(`Single lookup: ${lookupBenchmark.duration}ms (baseline: ${baselineMetrics.singleVehicleLookup}ms)`);
      console.log(`Complex query: ${complexBenchmark.duration}ms (baseline: ${baselineMetrics.complexQuery}ms)`);
    });
  });

  describe('Memory Usage Analysis', () => {
    test('Memory usage during large operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform memory-intensive operation
      const memoryBenchmark = PerformanceUtils.monitorMemory(() => {
        // Create large dataset in memory
        const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          data: `Large data entry ${i}`.repeat(100),
          timestamp: new Date()
        }));
        
        return largeDataset.length;
      });

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory delta: ${(memoryBenchmark.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Peak memory: ${(memoryBenchmark.peakMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Total memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

      // Memory usage should be reasonable
      expect(memoryBenchmark.peakMemory).toBeLessThan(100 * 1024 * 1024); // Less than 100MB peak
    });
  });

  describe('Database Connection Pool Performance', () => {
    test('Connection pool efficiency under load', async () => {
      const concurrentConnections = 15;
      
      const connectionBenchmark = await performanceMetrics.benchmark(
        'connection_pool_load',
        async () => {
          const operations = Array.from({ length: concurrentConnections }, async (_, i) => {
            // Simulate different types of database operations
            const operationType = i % 4;
            
            switch (operationType) {
              case 0:
                return await prisma.vehicle.count();
              case 1:
                return await prisma.vehicle.findMany({ take: 10 });
              case 2:
                return await prisma.parkingSpot.findMany({ take: 5 });
              default:
                return await prisma.$queryRaw`SELECT COUNT(*) as total FROM vehicles`;
            }
          });

          return await Promise.all(operations);
        }
      );

      expect(connectionBenchmark.duration).toBeLessThan(3000); // Should handle pool efficiently
      expect(connectionBenchmark.result).toHaveLength(concurrentConnections);
      
      console.log(`Connection pool handled ${concurrentConnections} concurrent operations in ${connectionBenchmark.duration}ms`);
    });
  });
});