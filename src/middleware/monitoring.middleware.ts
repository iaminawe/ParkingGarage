/**
 * Monitoring middleware for request tracking and performance measurement
 * 
 * Features:
 * - Request/response logging with correlation IDs
 * - Performance metrics collection
 * - Error tracking and reporting
 * - Custom metrics and events
 * - Request context enrichment
 * 
 * @module MonitoringMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { StructuredLogger, extractRequestContext, generateCorrelationId } from '../config/logger.config';
import { monitoring, incrementCounter, startTimer, endTimer, recordMetric } from '../config/monitoring.config';
import { performance } from 'perf_hooks';

// Extended request interface for monitoring context
export interface MonitoredRequest extends Request {
  correlationId: string;
  startTime: number;
  logger: StructuredLogger;
  metrics: {
    record: (name: string, value: number, unit?: string, tags?: Record<string, string>) => void;
    increment: (name: string, tags?: Record<string, string>, value?: number) => void;
    timer: (name: string) => { end: (tags?: Record<string, string>) => number };
  };
}

/**
 * Correlation ID middleware
 * Adds correlation ID to requests for tracking across services
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || generateCorrelationId();
  
  // Set correlation ID on request
  (req as MonitoredRequest).correlationId = correlationId;
  
  // Add to response headers
  res.setHeader('x-correlation-id', correlationId);
  
  // Create request-scoped logger
  const requestContext = extractRequestContext(req);
  (req as MonitoredRequest).logger = new StructuredLogger(requestContext);
  
  next();
}

/**
 * Request logging middleware
 * Logs all incoming requests with context
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const monitoredReq = req as MonitoredRequest;
  
  // Log incoming request
  monitoredReq.logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    correlationId: monitoredReq.correlationId,
  });
  
  // Track request metrics
  incrementCounter('http.requests.total', {
    method: req.method,
    route: req.route?.path || 'unknown',
  });
  
  next();
}

/**
 * Performance monitoring middleware
 * Measures request duration and tracks performance metrics
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const monitoredReq = req as MonitoredRequest;
  const startTime = performance.now();
  
  monitoredReq.startTime = startTime;
  
  // Add metrics utilities to request
  monitoredReq.metrics = {
    record: (name: string, value: number, unit?: string, tags?: Record<string, string>) => {
      recordMetric(name, value, unit, {
        correlationId: monitoredReq.correlationId,
        ...tags,
      });
    },
    increment: (name: string, tags?: Record<string, string>, value?: number) => {
      incrementCounter(name, {
        correlationId: monitoredReq.correlationId,
        ...tags,
      }, value);
    },
    timer: (name: string) => {
      const timerName = `${name}_${monitoredReq.correlationId}`;
      startTimer(timerName);
      return {
        end: (tags?: Record<string, string>) => {
          return endTimer(timerName, {
            correlationId: monitoredReq.correlationId,
            ...tags,
          });
        },
      };
    },
  };
  
  // Measure response time
  const originalSend = res.send;
  res.send = function(data) {
    const duration = performance.now() - startTime;
    
    // Log response
    monitoredReq.logger.http('Request completed', {
      statusCode: res.statusCode,
      duration: Math.round(duration),
      contentLength: res.get('content-length'),
    });
    
    // Record performance metrics
    recordMetric('http.request.duration', duration, 'ms', {
      method: req.method,
      statusCode: res.statusCode.toString(),
      route: req.route?.path || 'unknown',
    });
    
    // Track status code metrics
    incrementCounter('http.responses.total', {
      method: req.method,
      statusCode: res.statusCode.toString(),
      route: req.route?.path || 'unknown',
    });
    
    // Track slow requests
    if (duration > 1000) {
      incrementCounter('http.requests.slow', {
        method: req.method,
        route: req.route?.path || 'unknown',
      });
      
      monitoredReq.logger.warn('Slow request detected', {
        duration: Math.round(duration),
        threshold: 1000,
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * Error tracking middleware
 * Captures and reports errors with context
 */
export function errorTrackingMiddleware(error: Error, req: Request, res: Response, next: NextFunction): void {
  const monitoredReq = req as MonitoredRequest;
  
  // Log error with full context
  monitoredReq.logger.error('Request error', error, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query,
  });
  
  // Report to monitoring systems
  monitoring.reportError(error, {
    correlationId: monitoredReq.correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  });
  
  // Track error metrics
  incrementCounter('http.errors.total', {
    method: req.method,
    errorType: error.constructor.name,
    route: req.route?.path || 'unknown',
  });
  
  next(error);
}

/**
 * Health check response middleware
 * Adds health check data to monitoring
 */
export function healthCheckMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health' || req.path === '/health/ready' || req.path === '/health/live') {
    const timer = performance.now();
    
    res.on('finish', () => {
      const duration = performance.now() - timer;
      recordMetric('health.check.duration', duration, 'ms', {
        endpoint: req.path,
        status: res.statusCode.toString(),
      });
    });
  }
  
  next();
}

/**
 * Database operation monitoring
 * Tracks database query performance
 */
export class DatabaseMonitor {
  private static timers: Map<string, number> = new Map();
  
  static startQuery(queryId: string, query: string, correlationId?: string): void {
    this.timers.set(queryId, performance.now());
    
    recordMetric('database.query.started', 1, 'count', {
      correlationId,
      queryType: query.split(' ')[0]?.toLowerCase(),
    });
  }
  
  static endQuery(queryId: string, success: boolean, correlationId?: string, error?: Error): void {
    const startTime = this.timers.get(queryId);
    if (!startTime) return;
    
    const duration = performance.now() - startTime;
    this.timers.delete(queryId);
    
    recordMetric('database.query.duration', duration, 'ms', {
      correlationId,
      success: success.toString(),
    });
    
    incrementCounter('database.queries.total', {
      success: success.toString(),
      correlationId,
    });
    
    if (!success && error) {
      monitoring.reportError(error, {
        correlationId,
        queryId,
        duration,
      });
    }
    
    // Warn on slow queries
    if (duration > 500) {
      incrementCounter('database.queries.slow', {
        correlationId,
      });
    }
  }
}

/**
 * Authentication monitoring
 * Tracks authentication events and security metrics
 */
export function authenticationMonitor(event: string, success: boolean, userId?: string, correlationId?: string, metadata?: Record<string, any>): void {
  incrementCounter(`auth.${event}.total`, {
    success: success.toString(),
    correlationId,
  });
  
  if (success) {
    incrementCounter(`auth.${event}.success`, { correlationId });
  } else {
    incrementCounter(`auth.${event}.failure`, { correlationId });
    
    // Track security events
    monitoring.reportEvent('security.auth_failure', {
      event,
      userId,
      correlationId,
      ...metadata,
    });
  }
}

/**
 * Business logic monitoring
 * Tracks business operations and metrics
 */
export class BusinessMetrics {
  static recordOperation(operation: string, success: boolean, duration?: number, metadata?: Record<string, any>): void {
    incrementCounter(`business.${operation}.total`, {
      success: success.toString(),
    });
    
    if (duration !== undefined) {
      recordMetric(`business.${operation}.duration`, duration, 'ms');
    }
    
    if (!success) {
      monitoring.reportEvent('business.operation_failure', {
        operation,
        ...metadata,
      });
    }
  }
  
  static recordUserAction(action: string, userId: string, metadata?: Record<string, any>): void {
    incrementCounter(`user.actions.${action}`, {
      userId,
    });
    
    monitoring.reportEvent('user.action', {
      action,
      userId,
      ...metadata,
    });
  }
}

// Export all middleware and utilities
export {
  correlationIdMiddleware,
  requestLoggingMiddleware,
  performanceMiddleware,
  errorTrackingMiddleware,
  healthCheckMiddleware,
  DatabaseMonitor,
  authenticationMonitor,
  BusinessMetrics,
};

// Create combined monitoring middleware stack
export function createMonitoringMiddleware(): Array<(req: Request, res: Response, next: NextFunction) => void> {
  return [
    correlationIdMiddleware,
    requestLoggingMiddleware,
    performanceMiddleware,
    healthCheckMiddleware,
  ];
}