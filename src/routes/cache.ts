/**
 * Cache Management Routes
 * 
 * Provides admin endpoints for cache operations including:
 * - Cache statistics and health monitoring
 * - Manual cache invalidation and warming
 * - Performance metrics and analytics
 * - Circuit breaker status and control
 * 
 * @module CacheRoutes
 */

import { Router, Request, Response } from 'express';
import { EnhancedCacheService, CacheKeys, CacheInvalidationRules } from '../services/EnhancedCacheService';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { logger } from '../utils/logger';
import { body, query, param, validationResult } from 'express-validator';

export interface CacheManagerConfig {
  cacheService: EnhancedCacheService;
  enableDebugMode?: boolean;
  rateLimitWindowMs?: number;
  maxRequestsPerWindow?: number;
}

export class CacheManager {
  private router = Router();
  private cacheService: EnhancedCacheService;
  private config: CacheManagerConfig;

  constructor(config: CacheManagerConfig) {
    this.cacheService = config.cacheService;
    this.config = {
      enableDebugMode: false,
      rateLimitWindowMs: 60000, // 1 minute
      maxRequestsPerWindow: 100,
      ...config,
    };

    this.setupRoutes();
    this.setupEventHandlers();
  }

  private setupRoutes(): void {
    // Apply authentication and authorization to all cache management routes
    this.router.use(authenticate);
    this.router.use(authorize(['admin', 'operator']));

    // Health and status endpoints
    this.router.get('/health', this.getHealth.bind(this));
    this.router.get('/metrics', this.getMetrics.bind(this));
    this.router.get('/statistics', this.getCacheStatistics.bind(this));
    this.router.get('/status', this.getStatus.bind(this));

    // Cache operations
    this.router.post('/warm', [
      body('keys').isArray().withMessage('Keys must be an array'),
      body('keys.*').isString().withMessage('Each key must be a string'),
    ], this.warmCache.bind(this));

    this.router.delete('/clear', [
      body('pattern').optional().isString().withMessage('Pattern must be a string'),
      body('keys').optional().isArray().withMessage('Keys must be an array'),
      body('tags').optional().isArray().withMessage('Tags must be an array'),
    ], this.clearCache.bind(this));

    this.router.post('/invalidate', [
      body('pattern').optional().isString().withMessage('Pattern must be a string'),
      body('cascadeRules').optional().isArray().withMessage('Cascade rules must be an array'),
      body('tags').optional().isArray().withMessage('Tags must be an array'),
    ], this.invalidateCache.bind(this));

    this.router.post('/refresh', [
      body('keys').optional().isArray().withMessage('Keys must be an array'),
      body('pattern').optional().isString().withMessage('Pattern must be a string'),
    ], this.refreshCache.bind(this));

    // Performance operations
    this.router.post('/flush-expired', this.flushExpiredKeys.bind(this));
    this.router.post('/reset-metrics', this.resetMetrics.bind(this));
    this.router.post('/start-background-refresh', [
      body('intervalMs').optional().isInt({ min: 10000 }).withMessage('Interval must be at least 10 seconds'),
    ], this.startBackgroundRefresh.bind(this));

    // Circuit breaker operations
    this.router.get('/circuit-breaker', this.getCircuitBreakerStatus.bind(this));
    this.router.post('/circuit-breaker/reset', this.resetCircuitBreaker.bind(this));

    // Debugging endpoints (only in debug mode)
    if (this.config.enableDebugMode) {
      this.router.get('/debug/keys', [
        query('pattern').optional().isString(),
      ], this.listKeys.bind(this));
      
      this.router.get('/debug/key/:key', [
        param('key').isString(),
      ], this.inspectKey.bind(this));
    }

    // Advanced operations
    this.router.get('/analyze/:pattern', [
      param('pattern').isString().withMessage('Pattern is required'),
    ], this.analyzePattern.bind(this));

    this.router.post('/optimize', this.optimizeCache.bind(this));
    this.router.get('/recommendations', this.getCacheRecommendations.bind(this));
  }

  private setupEventHandlers(): void {
    this.cacheService.on('circuitBreakerOpen', (state) => {
      logger.warn('Cache circuit breaker opened', { state });
    });

    this.cacheService.on('invalidation', (pattern, count) => {
      logger.info('Cache invalidation completed', { pattern, deletedCount: count });
    });

    this.cacheService.on('writeThrough', (key, data) => {
      logger.debug('Write-through operation', { key, dataSize: JSON.stringify(data).length });
    });

    this.cacheService.on('backgroundRefresh', (key, data) => {
      logger.debug('Background refresh triggered', { key });
    });
  }

  /**
   * Get cache service health status
   */
  private async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.cacheService.healthCheck();
      const metrics = this.cacheService.getMetrics();

      res.json({
        status: health.status,
        responseTime: health.responseTime,
        isConnected: metrics.isConnected,
        circuitBreakerOpen: metrics.circuitBreakerState.isOpen,
        error: health.error,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache health check error', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get comprehensive cache metrics
   */
  private async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.cacheService.getMetrics();
      const stats = await this.cacheService.getCacheStatistics();

      res.json({
        metrics,
        statistics: stats,
        recommendations: await this.generateMetricsRecommendations(metrics),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache metrics error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get detailed cache statistics
   */
  private async getCacheStatistics(req: Request, res: Response): Promise<void> {
    try {
      const pattern = req.query.pattern as string;
      const stats = await this.cacheService.getCacheStatistics(pattern);

      res.json({
        statistics: stats,
        breakdown: {
          totalKeys: stats.totalKeys,
          totalMemoryMB: Math.round(stats.totalMemory / 1024 / 1024 * 100) / 100,
          hitRateByPattern: Object.fromEntries(stats.hitRateByPattern),
          averageExpirationTime: this.calculateAverageExpiration(stats.expirationTimes),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache statistics error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get overall cache status
   */
  private async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.cacheService.healthCheck();
      const metrics = this.cacheService.getMetrics();
      const stats = await this.cacheService.getCacheStatistics();

      res.json({
        health: {
          status: health.status,
          responseTime: health.responseTime,
          isConnected: metrics.isConnected,
        },
        performance: {
          hitRate: metrics.hitRate,
          avgResponseTime: metrics.avgResponseTime,
          totalRequests: metrics.hits + metrics.misses,
        },
        capacity: {
          totalKeys: stats.totalKeys,
          totalMemoryMB: Math.round(stats.totalMemory / 1024 / 1024 * 100) / 100,
        },
        circuitBreaker: metrics.circuitBreakerState,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache status error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Warm cache with specified keys
   */
  private async warmCache(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { keys, dataLoaders } = req.body;

      if (!dataLoaders || typeof dataLoaders !== 'object') {
        res.status(400).json({ error: 'Data loaders configuration required' });
        return;
      }

      const warmingTasks = keys.map((key: string) => ({
        key,
        dataLoader: async () => {
          // This would typically call the appropriate service method
          // For now, return empty data - should be customized based on key pattern
          return await this.getDataForKey(key);
        },
      }));

      const warmedCount = await this.cacheService.warmCache(warmingTasks);

      res.json({
        success: true,
        warmedCount,
        totalKeys: keys.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache warming error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Clear cache by pattern, keys, or tags
   */
  private async clearCache(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { pattern, keys, tags } = req.body;
      let deletedCount = 0;

      if (pattern) {
        deletedCount = await this.cacheService.invalidatePattern(pattern);
      } else if (keys && Array.isArray(keys)) {
        for (const key of keys) {
          const deleted = await this.cacheService.delete(key);
          if (deleted) deletedCount++;
        }
      } else if (tags && Array.isArray(tags)) {
        deletedCount = await this.cacheService.invalidateByTags(tags);
      } else {
        res.status(400).json({ error: 'Must specify pattern, keys, or tags' });
        return;
      }

      res.json({
        success: true,
        deletedCount,
        method: pattern ? 'pattern' : keys ? 'keys' : 'tags',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache clear error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Invalidate cache with cascade rules
   */
  private async invalidateCache(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { pattern, cascadeRules, tags } = req.body;
      let deletedCount = 0;

      if (tags && Array.isArray(tags)) {
        deletedCount = await this.cacheService.invalidateByTags(tags);
      } else if (pattern) {
        deletedCount = await this.cacheService.invalidatePattern(pattern, cascadeRules);
      } else {
        res.status(400).json({ error: 'Must specify pattern or tags' });
        return;
      }

      res.json({
        success: true,
        deletedCount,
        cascadeApplied: !!cascadeRules,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache invalidation error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Refresh cache entries
   */
  private async refreshCache(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { keys, pattern } = req.body;
      let refreshedCount = 0;

      if (keys && Array.isArray(keys)) {
        for (const key of keys) {
          try {
            const data = await this.getDataForKey(key);
            const success = await this.cacheService.set(key, data);
            if (success) refreshedCount++;
          } catch (error) {
            logger.warn(`Failed to refresh cache key: ${key}`, error);
          }
        }
      } else if (pattern) {
        // This would require implementing a pattern-based refresh
        res.status(501).json({ error: 'Pattern-based refresh not yet implemented' });
        return;
      } else {
        res.status(400).json({ error: 'Must specify keys or pattern' });
        return;
      }

      res.json({
        success: true,
        refreshedCount,
        totalRequested: keys?.length || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache refresh error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Flush expired keys
   */
  private async flushExpiredKeys(req: Request, res: Response): Promise<void> {
    try {
      const flushedCount = await this.cacheService.flushExpiredKeys();

      res.json({
        success: true,
        flushedCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache flush expired keys error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Reset cache metrics
   */
  private async resetMetrics(req: Request, res: Response): Promise<void> {
    try {
      this.cacheService.resetMetrics();

      res.json({
        success: true,
        message: 'Cache metrics reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache reset metrics error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Start background refresh
   */
  private async startBackgroundRefresh(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { intervalMs = 300000 } = req.body; // Default 5 minutes

      await this.cacheService.startBackgroundRefresh(intervalMs);

      res.json({
        success: true,
        intervalMs,
        message: 'Background refresh started successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache start background refresh error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get circuit breaker status
   */
  private async getCircuitBreakerStatus(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.cacheService.getMetrics();

      res.json({
        circuitBreaker: metrics.circuitBreakerState,
        totalTrips: metrics.circuitBreakerTrips,
        status: metrics.circuitBreakerState.isOpen ? 'OPEN' : 'CLOSED',
        nextRetryTime: metrics.circuitBreakerState.isOpen 
          ? new Date(metrics.circuitBreakerState.nextRetryTime).toISOString()
          : null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Circuit breaker status error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Reset circuit breaker
   */
  private async resetCircuitBreaker(req: Request, res: Response): Promise<void> {
    try {
      // Force reset circuit breaker by accessing private method
      // This is a privileged operation that should be used carefully
      const metrics = this.cacheService.getMetrics();
      
      if (metrics.circuitBreakerState.isOpen) {
        // The circuit breaker will be reset on next successful operation
        // For now, we'll attempt a simple operation to trigger reset
        await this.cacheService.healthCheck();
      }

      res.json({
        success: true,
        message: 'Circuit breaker reset attempted',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Circuit breaker reset error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * List cache keys (debug mode only)
   */
  private async listKeys(req: Request, res: Response): Promise<void> {
    if (!this.config.enableDebugMode) {
      res.status(403).json({ error: 'Debug mode not enabled' });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const pattern = req.query.pattern as string || '*';
      const stats = await this.cacheService.getCacheStatistics(pattern);

      res.json({
        pattern,
        totalKeys: stats.totalKeys,
        keys: Array.from(stats.expirationTimes.keys()).slice(0, 100), // Limit to 100 keys
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache list keys error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Inspect specific cache key (debug mode only)
   */
  private async inspectKey(req: Request, res: Response): Promise<void> {
    if (!this.config.enableDebugMode) {
      res.status(403).json({ error: 'Debug mode not enabled' });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const key = req.params.key;
      const data = await this.cacheService.get(key);

      res.json({
        key,
        exists: data !== null,
        data: data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache inspect key error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Analyze cache pattern performance
   */
  private async analyzePattern(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const pattern = req.params.pattern;
      const stats = await this.cacheService.getCacheStatistics(pattern);
      const metrics = this.cacheService.getMetrics();

      const analysis = {
        pattern,
        keyCount: stats.totalKeys,
        memoryUsage: stats.totalMemory,
        hitRate: metrics.hitRate,
        recommendations: await this.analyzePatternRecommendations(pattern, stats),
        timestamp: new Date().toISOString(),
      };

      res.json(analysis);
    } catch (error) {
      logger.error('Cache analyze pattern error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Optimize cache performance
   */
  private async optimizeCache(req: Request, res: Response): Promise<void> {
    try {
      const optimizations = [];
      const metrics = this.cacheService.getMetrics();
      const stats = await this.cacheService.getCacheStatistics();

      // Analyze and suggest optimizations
      if (metrics.hitRate < 70) {
        optimizations.push({
          type: 'HIT_RATE_IMPROVEMENT',
          description: 'Consider increasing cache TTL for frequently accessed keys',
          impact: 'HIGH',
        });
      }

      if (stats.totalMemory > 100 * 1024 * 1024) { // 100MB
        optimizations.push({
          type: 'MEMORY_OPTIMIZATION',
          description: 'Cache memory usage is high. Consider implementing LRU eviction',
          impact: 'MEDIUM',
        });
      }

      if (metrics.avgResponseTime > 10) {
        optimizations.push({
          type: 'PERFORMANCE_OPTIMIZATION',
          description: 'Average response time is high. Check Redis configuration',
          impact: 'HIGH',
        });
      }

      res.json({
        currentMetrics: metrics,
        optimizations,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache optimize error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get cache recommendations
   */
  private async getCacheRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.cacheService.getMetrics();
      const stats = await this.cacheService.getCacheStatistics();

      const recommendations = await this.generateRecommendations(metrics, stats);

      res.json({
        recommendations,
        basedOn: {
          hitRate: metrics.hitRate,
          totalKeys: stats.totalKeys,
          memoryUsage: stats.totalMemory,
          avgResponseTime: metrics.avgResponseTime,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache recommendations error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Helper methods
  private async getDataForKey(key: string): Promise<any> {
    // This would be implemented to call appropriate service methods based on key pattern
    // For now, return a placeholder
    const keyType = key.split(':')[0];
    
    switch (keyType) {
      case 'spots':
        return { status: 'available', timestamp: Date.now() };
      case 'pricing':
        return { rate: 10.0, timestamp: Date.now() };
      case 'analytics':
        return { data: [], timestamp: Date.now() };
      default:
        return { data: null, timestamp: Date.now() };
    }
  }

  private calculateAverageExpiration(expirationTimes: Map<string, number>): number {
    const times = Array.from(expirationTimes.values());
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }

  private async generateMetricsRecommendations(metrics: any): Promise<string[]> {
    const recommendations = [];

    if (metrics.hitRate < 70) {
      recommendations.push('Consider optimizing cache keys and TTL values to improve hit rate');
    }

    if (metrics.avgResponseTime > 10) {
      recommendations.push('High average response time detected - check Redis connection and performance');
    }

    if (metrics.circuitBreakerTrips > 0) {
      recommendations.push('Circuit breaker has tripped - investigate Redis connectivity issues');
    }

    return recommendations;
  }

  private async analyzePatternRecommendations(pattern: string, stats: any): Promise<string[]> {
    const recommendations = [];

    if (stats.totalKeys > 10000) {
      recommendations.push('High key count for pattern - consider implementing key expiration or cleanup');
    }

    if (stats.totalMemory > 10 * 1024 * 1024) {
      recommendations.push('High memory usage for pattern - consider data compression or smaller TTL');
    }

    return recommendations;
  }

  private async generateRecommendations(metrics: any, stats: any): Promise<any[]> {
    return [
      {
        category: 'Performance',
        recommendations: await this.generateMetricsRecommendations(metrics),
      },
      {
        category: 'Memory',
        recommendations: stats.totalMemory > 50 * 1024 * 1024 
          ? ['Consider implementing memory-based eviction policies']
          : ['Memory usage is within acceptable limits'],
      },
      {
        category: 'Reliability',
        recommendations: metrics.circuitBreakerState.isOpen
          ? ['Circuit breaker is open - check Redis connectivity']
          : ['System reliability is good'],
      },
    ];
  }

  getRouter(): Router {
    return this.router;
  }
}

export default CacheManager;