/**
 * Performance Monitoring Middleware
 * 
 * Provides comprehensive request/response monitoring, database query tracking,
 * and performance metrics collection for the parking garage API.
 * 
 * @module PerformanceMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/CacheService';
import { logger } from '../utils/logger';

export interface RequestMetrics {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  userAgent?: string;
  ip: string;
  queryParams?: any;
  bodySize?: number;
  responseSize?: number;
  cacheHit?: boolean;
  dbQueries?: number;
  dbTime?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  errors?: string[];
}

export interface PerformanceAlert {
  type: 'SLOW_REQUEST' | 'HIGH_ERROR_RATE' | 'MEMORY_LEAK' | 'DB_SLOW' | 'CACHE_MISS_HIGH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  metrics: any;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: RequestMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private readonly MAX_METRICS_RETENTION = 10000;
  private readonly MAX_ALERTS_RETENTION = 1000;
  
  // Thresholds for alerts
  private readonly THRESHOLDS = {
    SLOW_REQUEST: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '2000'), // 2 seconds
    HIGH_ERROR_RATE: parseFloat(process.env.HIGH_ERROR_RATE || '0.1'), // 10%
    MEMORY_GROWTH: parseInt(process.env.MEMORY_GROWTH_THRESHOLD || '100'), // 100MB
    DB_SLOW: parseInt(process.env.DB_SLOW_THRESHOLD || '1000'), // 1 second
    CACHE_MISS_RATE: parseFloat(process.env.CACHE_MISS_RATE_THRESHOLD || '0.7') // 70%
  };

  private cache: CacheService | null = null;

  constructor(cache?: CacheService) {
    this.cache = cache || null;
  }

  /**
   * Express middleware for performance monitoring
   */
  createMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      const startMemory = process.memoryUsage();

      // Add request ID to headers
      res.setHeader('X-Request-ID', requestId);
      
      // Track request data
      req.performanceMetrics = {
        requestId,
        startTime,
        startMemory,
        dbQueries: 0,
        dbTime: 0,
        errors: []
      };

      // Override res.json to track response size
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        req.performanceMetrics.responseSize = JSON.stringify(data).length;
        return originalJson(data);
      };

      // Override res.send to track response size
      const originalSend = res.send.bind(res);
      res.send = function(data: any) {
        if (typeof data === 'string') {
          req.performanceMetrics.responseSize = Buffer.byteLength(data, 'utf8');
        } else if (Buffer.isBuffer(data)) {
          req.performanceMetrics.responseSize = data.length;
        }
        return originalSend(data);
      };

      // Capture response when finished
      res.on('finish', () => {
        this.recordRequestMetrics(req, res, startTime, startMemory);
      });

      next();
    };
  }

  /**
   * Database query tracking middleware
   */
  trackDatabaseQuery(queryType: string, duration: number, requestId?: string) {
    if (requestId) {
      // Find the request metrics and update
      const metric = this.metrics.find(m => m.requestId === requestId);
      if (metric) {
        metric.dbQueries = (metric.dbQueries || 0) + 1;
        metric.dbTime = (metric.dbTime || 0) + duration;
      }
    }

    // Check for slow database queries
    if (duration > this.THRESHOLDS.DB_SLOW) {
      this.createAlert('DB_SLOW', 'HIGH', `Slow database query detected: ${queryType}`, {
        queryType,
        duration,
        requestId
      });
    }
  }

  /**
   * Cache operation tracking
   */
  trackCacheOperation(operation: 'HIT' | 'MISS', key: string, requestId?: string) {
    if (requestId) {
      const metric = this.metrics.find(m => m.requestId === requestId);
      if (metric) {
        metric.cacheHit = operation === 'HIT';
      }
    }
  }

  /**
   * Get performance analytics
   */
  getAnalytics(timeRange: number = 3600000): { // Default: last hour
    summary: {
      totalRequests: number;
      averageResponseTime: number;
      errorRate: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
    };
    breakdown: {
      byEndpoint: Record<string, {
        count: number;
        avgResponseTime: number;
        errorRate: number;
      }>;
      byMethod: Record<string, number>;
      byStatusCode: Record<string, number>;
    };
    performance: {
      slowestRequests: RequestMetrics[];
      memoryTrend: { timestamp: number; usage: number }[];
      dbPerformance: {
        totalQueries: number;
        averageQueryTime: number;
        slowQueries: number;
      };
    };
    alerts: PerformanceAlert[];
  } {
    const cutoffTime = Date.now() - timeRange;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        summary: {
          totalRequests: 0,
          averageResponseTime: 0,
          errorRate: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0
        },
        breakdown: {
          byEndpoint: {},
          byMethod: {},
          byStatusCode: {}
        },
        performance: {
          slowestRequests: [],
          memoryTrend: [],
          dbPerformance: {
            totalQueries: 0,
            averageQueryTime: 0,
            slowQueries: 0
          }
        },
        alerts: this.alerts.filter(a => a.timestamp >= cutoffTime)
      };
    }

    // Summary statistics
    const totalRequests = recentMetrics.length;
    const responseTimes = recentMetrics.map(m => m.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;
    
    const p95Index = Math.floor(totalRequests * 0.95);
    const p99Index = Math.floor(totalRequests * 0.99);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    const p99ResponseTime = responseTimes[p99Index] || 0;

    // Breakdown by endpoint
    const byEndpoint = recentMetrics.reduce((acc, metric) => {
      const key = `${metric.method} ${metric.path}`;
      if (!acc[key]) {
        acc[key] = { requests: [], errors: 0 };
      }
      acc[key].requests.push(metric.responseTime);
      if (metric.statusCode >= 400) {
        acc[key].errors++;
      }
      return acc;
    }, {} as Record<string, { requests: number[]; errors: number }>);

    const endpointBreakdown = Object.entries(byEndpoint).reduce((acc, [endpoint, data]) => {
      acc[endpoint] = {
        count: data.requests.length,
        avgResponseTime: Math.round(data.requests.reduce((sum, time) => sum + time, 0) / data.requests.length),
        errorRate: Math.round((data.errors / data.requests.length) * 10000) / 100
      };
      return acc;
    }, {} as Record<string, any>);

    // Breakdown by method and status code
    const byMethod = recentMetrics.reduce((acc, metric) => {
      acc[metric.method] = (acc[metric.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatusCode = recentMetrics.reduce((acc, metric) => {
      const code = metric.statusCode.toString();
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Performance data
    const slowestRequests = recentMetrics
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);

    const memoryTrend = recentMetrics
      .filter(m => m.memoryUsage)
      .map(m => ({
        timestamp: m.timestamp,
        usage: m.memoryUsage!.heapUsed
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    const dbMetrics = recentMetrics.filter(m => m.dbQueries && m.dbTime);
    const totalQueries = dbMetrics.reduce((sum, m) => sum + (m.dbQueries || 0), 0);
    const totalDbTime = dbMetrics.reduce((sum, m) => sum + (m.dbTime || 0), 0);
    const averageQueryTime = totalQueries > 0 ? Math.round(totalDbTime / totalQueries) : 0;
    const slowQueries = dbMetrics.filter(m => (m.dbTime || 0) > this.THRESHOLDS.DB_SLOW).length;

    return {
      summary: {
        totalRequests,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        p95ResponseTime: Math.round(p95ResponseTime),
        p99ResponseTime: Math.round(p99ResponseTime)
      },
      breakdown: {
        byEndpoint: endpointBreakdown,
        byMethod,
        byStatusCode
      },
      performance: {
        slowestRequests,
        memoryTrend,
        dbPerformance: {
          totalQueries,
          averageQueryTime,
          slowQueries
        }
      },
      alerts: this.alerts.filter(a => a.timestamp >= cutoffTime)
    };
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): {
    currentMemoryUsage: NodeJS.MemoryUsage;
    activeRequests: number;
    recentAverageResponseTime: number;
    errorRateLast5Min: number;
  } {
    const now = Date.now();
    const last5Min = now - 300000; // 5 minutes
    const recentMetrics = this.metrics.filter(m => m.timestamp >= last5Min);

    const activeRequests = this.metrics.filter(m => !m.responseTime).length;
    const recentAverageResponseTime = recentMetrics.length > 0 
      ? Math.round(recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length)
      : 0;
    
    const recentErrors = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRateLast5Min = recentMetrics.length > 0 
      ? Math.round((recentErrors / recentMetrics.length) * 10000) / 100
      : 0;

    return {
      currentMemoryUsage: process.memoryUsage(),
      activeRequests,
      recentAverageResponseTime,
      errorRateLast5Min
    };
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(): void {
    const cutoffTime = Date.now() - 3600000; // Keep last hour
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoffTime);
    
    // Ensure we don't exceed retention limits
    if (this.metrics.length > this.MAX_METRICS_RETENTION) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_RETENTION);
    }
    
    if (this.alerts.length > this.MAX_ALERTS_RETENTION) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS_RETENTION);
    }
  }

  private recordRequestMetrics(
    req: Request,
    res: Response,
    startTime: number,
    startMemory: NodeJS.MemoryUsage
  ): void {
    const responseTime = Date.now() - startTime;
    const endMemory = process.memoryUsage();

    const metrics: RequestMetrics = {
      requestId: req.performanceMetrics.requestId,
      method: req.method,
      path: req.route ? req.route.path : req.path,
      statusCode: res.statusCode,
      responseTime,
      timestamp: Date.now(),
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      queryParams: Object.keys(req.query).length > 0 ? req.query : undefined,
      bodySize: req.get('Content-Length') ? parseInt(req.get('Content-Length')!) : undefined,
      responseSize: req.performanceMetrics.responseSize,
      cacheHit: req.performanceMetrics.cacheHit,
      dbQueries: req.performanceMetrics.dbQueries,
      dbTime: req.performanceMetrics.dbTime,
      memoryUsage: endMemory,
      errors: req.performanceMetrics.errors.length > 0 ? req.performanceMetrics.errors : undefined
    };

    this.metrics.push(metrics);

    // Trim metrics if needed
    if (this.metrics.length > this.MAX_METRICS_RETENTION) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_RETENTION);
    }

    // Check for performance issues and create alerts
    this.checkForAlerts(metrics, startMemory, endMemory);

    // Log slow requests
    if (responseTime > this.THRESHOLDS.SLOW_REQUEST) {
      logger.warn('Slow request detected', {
        requestId: metrics.requestId,
        method: metrics.method,
        path: metrics.path,
        responseTime,
        statusCode: metrics.statusCode
      });
    }

    // Log errors
    if (metrics.statusCode >= 400) {
      logger.error('Request error', {
        requestId: metrics.requestId,
        method: metrics.method,
        path: metrics.path,
        statusCode: metrics.statusCode,
        responseTime,
        errors: metrics.errors
      });
    }
  }

  private checkForAlerts(
    metrics: RequestMetrics,
    startMemory: NodeJS.MemoryUsage,
    endMemory: NodeJS.MemoryUsage
  ): void {
    // Slow request alert
    if (metrics.responseTime > this.THRESHOLDS.SLOW_REQUEST) {
      this.createAlert('SLOW_REQUEST', 'HIGH', 
        `Slow request: ${metrics.method} ${metrics.path}`,
        { responseTime: metrics.responseTime, requestId: metrics.requestId }
      );
    }

    // Memory leak detection
    const memoryGrowth = endMemory.heapUsed - startMemory.heapUsed;
    if (memoryGrowth > this.THRESHOLDS.MEMORY_GROWTH * 1024 * 1024) { // Convert MB to bytes
      this.createAlert('MEMORY_LEAK', 'MEDIUM',
        'Significant memory growth detected during request',
        { memoryGrowth: Math.round(memoryGrowth / 1024 / 1024), requestId: metrics.requestId }
      );
    }

    // High error rate alert (check last 100 requests)
    const recentMetrics = this.metrics.slice(-100);
    const recentErrors = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = recentErrors / recentMetrics.length;
    
    if (recentMetrics.length >= 50 && errorRate > this.THRESHOLDS.HIGH_ERROR_RATE) {
      this.createAlert('HIGH_ERROR_RATE', 'CRITICAL',
        `High error rate detected: ${Math.round(errorRate * 100)}%`,
        { errorRate: Math.round(errorRate * 10000) / 100, recentRequests: recentMetrics.length }
      );
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    metrics: any
  ): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      metrics,
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    // Trim alerts if needed
    if (this.alerts.length > this.MAX_ALERTS_RETENTION) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS_RETENTION);
    }

    // Log critical alerts
    if (severity === 'CRITICAL') {
      logger.error('Performance alert', alert);
    } else if (severity === 'HIGH') {
      logger.warn('Performance alert', alert);
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      performanceMetrics: {
        requestId: string;
        startTime: number;
        startMemory: NodeJS.MemoryUsage;
        dbQueries: number;
        dbTime: number;
        responseSize?: number;
        cacheHit?: boolean;
        errors: string[];
      };
    }
  }
}

export default PerformanceMonitor;