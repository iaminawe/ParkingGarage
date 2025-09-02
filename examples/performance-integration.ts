/**
 * Performance Optimization Integration Example
 * 
 * This example demonstrates how to integrate all performance optimization
 * components in a real application setup.
 * 
 * @module PerformanceIntegrationExample
 */

import { PrismaClient } from '@prisma/client';
import { createOptimizedPrismaClient } from '../src/config/database.config';
import CacheService from '../src/services/CacheService';
import QueryOptimizer from '../src/services/QueryOptimizer';
import PerformanceMonitor from '../src/middleware/performance.middleware';
import { performanceMetrics } from '../src/utils/performanceMetrics';
import express from 'express';

/**
 * Complete performance optimization setup
 */
export async function setupPerformanceOptimizations() {
  console.log('🚀 Setting up performance optimizations...');

  // 1. Setup optimized database connection
  console.log('📊 Configuring optimized database connection...');
  const prisma = createOptimizedPrismaClient({
    url: process.env.DATABASE_URL || 'file:./parking_garage.db',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000'),
    enableQueryLogging: process.env.NODE_ENV === 'development',
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
    enableMetrics: true,
    poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '15000'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '600000'),
    maxLifetime: parseInt(process.env.DB_MAX_LIFETIME || '3600000'),
    sqliteOptimizations: {
      enableWAL: process.env.SQLITE_WAL !== 'false',
      cacheSize: parseInt(process.env.SQLITE_CACHE_SIZE || '4000'),
      tempStore: 'memory',
      synchronous: 'NORMAL',
      journalMode: 'WAL',
      mmapSize: parseInt(process.env.SQLITE_MMAP_SIZE || '536870912'), // 512MB
      pageSize: parseInt(process.env.SQLITE_PAGE_SIZE || '4096')
    }
  });

  // 2. Setup cache service
  console.log('🗄️ Configuring Redis cache service...');
  const cache = new CacheService({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '600'),
    maxRetries: parseInt(process.env.CACHE_MAX_RETRIES || '5'),
    retryDelayMs: parseInt(process.env.CACHE_RETRY_DELAY || '2000')
  });

  try {
    await cache.connect();
    console.log('✅ Cache service connected successfully');
  } catch (error) {
    console.warn('⚠️ Cache service connection failed, running without cache:', error);
  }

  // 3. Setup query optimizer
  console.log('⚡ Initializing query optimizer...');
  const queryOptimizer = new QueryOptimizer(prisma, cache);

  // 4. Setup performance monitoring
  console.log('📈 Configuring performance monitoring...');
  const performanceMonitor = new PerformanceMonitor(cache);
  
  // Start performance metrics collection
  performanceMetrics.startCollection();

  // 5. Cache warming for critical data
  console.log('🔥 Warming cache with critical data...');
  await warmCriticalData(cache, queryOptimizer);

  console.log('✅ Performance optimizations setup complete!');

  return {
    prisma,
    cache,
    queryOptimizer,
    performanceMonitor,
    performanceMetrics
  };
}

/**
 * Warm cache with frequently accessed data
 */
async function warmCriticalData(cache: CacheService, queryOptimizer: QueryOptimizer) {
  const warmingTasks = [
    {
      key: 'spots:available',
      dataLoader: async () => {
        return await queryOptimizer.findAvailableSpots();
      },
      ttl: 60 // 1 minute
    },
    {
      key: 'analytics:parking_stats',
      dataLoader: async () => {
        return await queryOptimizer.getParkingStatistics();
      },
      ttl: 1800 // 30 minutes
    },
    // Add more critical data warming tasks as needed
  ];

  const warmedCount = await cache.warmCache(warmingTasks);
  console.log(`🔥 Warmed ${warmedCount} cache entries`);
}

/**
 * Express application with performance optimizations
 */
export function createOptimizedExpressApp() {
  const app = express();
  
  return setupPerformanceOptimizations().then(({ 
    prisma, 
    cache, 
    queryOptimizer, 
    performanceMonitor 
  }) => {
    // Add performance monitoring middleware
    app.use(performanceMonitor.createMiddleware());

    // Add request parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoints
    app.get('/api/health', async (req, res) => {
      const [dbHealth, cacheHealth] = await Promise.all([
        prisma.$queryRaw`SELECT 1 as test`.then(() => ({ status: 'healthy' })).catch((error: Error) => ({ status: 'unhealthy', error: error.message })),
        cache.healthCheck()
      ]);

      const health = {
        status: dbHealth.status === 'healthy' && cacheHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        database: dbHealth,
        cache: cacheHealth,
        timestamp: new Date().toISOString()
      };

      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });

    // Performance metrics endpoint
    app.get('/api/metrics', (req, res) => {
      const analytics = performanceMonitor.getAnalytics();
      const cacheMetrics = cache.getMetrics();
      const systemMetrics = performanceMetrics.getCurrentMetrics();

      res.json({
        performance: analytics,
        cache: cacheMetrics,
        system: systemMetrics,
        timestamp: new Date().toISOString()
      });
    });

    // Example optimized vehicle endpoints
    app.get('/api/vehicles/:licensePlate', async (req, res) => {
      try {
        const { licensePlate } = req.params;
        const vehicle = await queryOptimizer.findVehicleByLicensePlate(licensePlate);
        
        if (!vehicle) {
          return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json(vehicle);
      } catch (error) {
        console.error('Error fetching vehicle:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/vehicles', async (req, res) => {
      try {
        const {
          licensePlate,
          vehicleType,
          ownerId,
          status,
          dateFrom,
          dateTo,
          limit = 50,
          offset = 0
        } = req.query;

        const searchParams = {
          licensePlate: licensePlate as string,
          vehicleType: vehicleType as string,
          ownerId: ownerId as string,
          status: status as string,
          dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
          dateTo: dateTo ? new Date(dateTo as string) : undefined,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        };

        const result = await queryOptimizer.searchVehicles(searchParams);
        res.json(result);
      } catch (error) {
        console.error('Error searching vehicles:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/spots/available', async (req, res) => {
      try {
        const { spotType, level } = req.query;
        const spots = await queryOptimizer.findAvailableSpots(
          spotType as string,
          level ? parseInt(level as string) : undefined
        );
        res.json(spots);
      } catch (error) {
        console.error('Error fetching available spots:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/analytics/stats', async (req, res) => {
      try {
        const stats = await queryOptimizer.getParkingStatistics();
        res.json(stats);
      } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Graceful shutdown handling
    const gracefulShutdown = async () => {
      console.log('🛑 Shutting down gracefully...');
      
      try {
        performanceMetrics.stopCollection();
        await cache.disconnect();
        await prisma.$disconnect();
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    // Store services on app for access in other modules
    app.locals.prisma = prisma;
    app.locals.cache = cache;
    app.locals.queryOptimizer = queryOptimizer;
    app.locals.performanceMonitor = performanceMonitor;

    return app;
  });
}

/**
 * Usage example
 */
if (require.main === module) {
  createOptimizedExpressApp()
    .then(app => {
      const port = process.env.PORT || 3000;
      
      app.listen(port, () => {
        console.log(`🚀 Server running on port ${port} with performance optimizations`);
        console.log(`📊 Metrics available at http://localhost:${port}/api/metrics`);
        console.log(`🏥 Health check at http://localhost:${port}/api/health`);
      });
    })
    .catch(error => {
      console.error('❌ Failed to start optimized server:', error);
      process.exit(1);
    });
}