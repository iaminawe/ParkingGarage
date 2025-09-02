/**
 * Monitoring and observability configuration
 *
 * Features:
 * - Application Performance Monitoring (APM)
 * - Custom metrics collection
 * - Health check configuration
 * - Error tracking integration
 * - Performance benchmarking
 * - System resource monitoring
 *
 * @module MonitoringConfig
 */

import { env } from './environment';
import { systemLogger } from './logger.config';
import * as Sentry from '@sentry/node';
import { performance } from 'perf_hooks';

// Metric types for structured monitoring
export interface Metric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  httpRequestDuration: number;
  httpRequestCount: number;
  databaseQueryDuration: number;
  databaseQueryCount: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
  errorCount: number;
}

// Metrics collector class
export class MetricsCollector {
  private metrics: Metric[] = [];
  private performanceMarks: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  // Record a metric
  record(name: string, value: number, unit = 'count', tags?: Record<string, string>) {
    const metric: Metric = {
      name,
      value,
      unit,
      tags: tags || {},
      timestamp: new Date(),
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    systemLogger.debug('Metric recorded', { metric });
  }

  // Increment a counter
  increment(name: string, tags?: Record<string, string>, value = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
    this.record(name, current + value, 'count', tags);
  }

  // Record histogram value
  histogram(name: string, value: number, tags?: Record<string, string>) {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }

    const values = this.histograms.get(name)!;
    values.push(value);

    // Keep only last 100 values
    if (values.length > 100) {
      values.splice(0, values.length - 100);
    }

    this.record(name, value, 'duration', tags);
  }

  // Start timing an operation
  startTimer(name: string): void {
    this.performanceMarks.set(name, performance.now());
  }

  // End timing and record metric
  endTimer(name: string, tags?: Record<string, string>): number {
    const start = this.performanceMarks.get(name);
    if (!start) {
      systemLogger.warn('Timer not found', { timerName: name });
      return 0;
    }

    const duration = performance.now() - start;
    this.performanceMarks.delete(name);
    this.histogram(name, duration, tags);

    return duration;
  }

  // Get current metrics
  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  // Get counter value
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  // Get histogram statistics
  getHistogramStats(name: string): { count: number; min: number; max: number; avg: number } {
    const values = this.histograms.get(name) || [];
    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0 };
    }

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
    };
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
    this.counters.clear();
    this.histograms.clear();
    this.performanceMarks.clear();
  }
}

// Health check provider interface
export interface HealthCheckProvider {
  name: string;
  check(): Promise<HealthCheckResult>;
}

// Database health check
export class DatabaseHealthCheck implements HealthCheckProvider {
  name = 'database';

  async check(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      // Import dynamically to avoid circular dependencies
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Simple query to check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();

      const duration = performance.now() - start;

      return {
        name: this.name,
        status: duration < 1000 ? 'healthy' : 'degraded',
        message: duration < 1000 ? 'Database connection healthy' : 'Database connection slow',
        duration,
      };
    } catch (error) {
      const duration = performance.now() - start;

      return {
        name: this.name,
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }
}

// Memory health check
export class MemoryHealthCheck implements HealthCheckProvider {
  name = 'memory';

  async check(): Promise<HealthCheckResult> {
    const memoryUsage = process.memoryUsage();
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const usagePercent = (usedMB / totalMB) * 100;

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let message = `Memory usage: ${usedMB}MB / ${totalMB}MB (${usagePercent.toFixed(1)}%)`;

    if (usagePercent > 90) {
      status = 'unhealthy';
      message += ' - Critical memory usage';
    } else if (usagePercent > 75) {
      status = 'degraded';
      message += ' - High memory usage';
    }

    return {
      name: this.name,
      status,
      message,
      metadata: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        usagePercent,
      },
    };
  }
}

// System health check
export class SystemHealthCheck implements HealthCheckProvider {
  name = 'system';

  async check(): Promise<HealthCheckResult> {
    const uptime = process.uptime();
    const loadAverage = (process as any).loadavg ? (process as any).loadavg() : [0, 0, 0];
    const cpuUsage = process.cpuUsage();

    return {
      name: this.name,
      status: 'healthy',
      message: `System uptime: ${Math.round(uptime)}s`,
      metadata: {
        uptime,
        loadAverage,
        cpuUsage,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }
}

// Monitoring configuration class
export class MonitoringConfig {
  private static instance: MonitoringConfig;
  private metricsCollector: MetricsCollector;
  private healthChecks: HealthCheckProvider[];
  private isInitialized = false;

  private constructor() {
    this.metricsCollector = new MetricsCollector();
    this.healthChecks = [
      new DatabaseHealthCheck(),
      new MemoryHealthCheck(),
      new SystemHealthCheck(),
    ];
  }

  static getInstance(): MonitoringConfig {
    if (!MonitoringConfig.instance) {
      MonitoringConfig.instance = new MonitoringConfig();
    }
    return MonitoringConfig.instance;
  }

  // Initialize monitoring systems
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize Sentry if DSN is provided
      if (env.SENTRY_DSN) {
        Sentry.init({
          dsn: env.SENTRY_DSN,
          environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
          tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE || 0.1,
          integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
        });
        systemLogger.info('Sentry initialized', { environment: env.SENTRY_ENVIRONMENT });
      }

      // Start metrics collection if enabled
      if (env.ENABLE_METRICS) {
        this.startMetricsCollection();
        systemLogger.info('Metrics collection started');
      }

      this.isInitialized = true;
      systemLogger.info('Monitoring initialized successfully');
    } catch (error) {
      systemLogger.error('Failed to initialize monitoring', error as Error);
      throw error;
    }
  }

  // Start metrics collection interval
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Collect every minute
  }

  // Collect system metrics
  private collectSystemMetrics(): void {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Record memory metrics
      this.metricsCollector.record('memory.heap.used', memoryUsage.heapUsed, 'bytes');
      this.metricsCollector.record('memory.heap.total', memoryUsage.heapTotal, 'bytes');
      this.metricsCollector.record('memory.external', memoryUsage.external, 'bytes');
      this.metricsCollector.record('memory.rss', memoryUsage.rss, 'bytes');

      // Record CPU metrics
      this.metricsCollector.record('cpu.user', cpuUsage.user, 'microseconds');
      this.metricsCollector.record('cpu.system', cpuUsage.system, 'microseconds');

      // Record uptime
      this.metricsCollector.record('system.uptime', process.uptime(), 'seconds');
    } catch (error) {
      systemLogger.error('Failed to collect system metrics', error as Error);
    }
  }

  // Get metrics collector
  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }

  // Add health check provider
  addHealthCheck(healthCheck: HealthCheckProvider): void {
    this.healthChecks.push(healthCheck);
  }

  // Run all health checks
  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const healthCheck of this.healthChecks) {
      try {
        const result = await Promise.race([
          healthCheck.check(),
          new Promise<HealthCheckResult>((_, reject) =>
            setTimeout(
              () => reject(new Error('Health check timeout')),
              env.HEALTH_CHECK_TIMEOUT || 5000
            )
          ),
        ]);
        results.push(result);
      } catch (error) {
        results.push({
          name: healthCheck.name,
          status: 'unhealthy',
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return results;
  }

  // Get overall health status
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    checks: HealthCheckResult[];
  }> {
    const checks = await this.runHealthChecks();

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    for (const check of checks) {
      if (check.status === 'unhealthy') {
        overallStatus = 'unhealthy';
        break;
      } else if (check.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }

    return { status: overallStatus, checks };
  }

  // Report error to monitoring systems
  reportError(error: Error, context?: Record<string, any>): void {
    systemLogger.error('Error reported to monitoring', error, context);

    if (env.SENTRY_DSN) {
      Sentry.captureException(error, context ? { extra: context } : undefined);
    }

    this.metricsCollector.increment('errors.total', {
      type: error.constructor.name,
      ...context,
    });
  }

  // Report custom event
  reportEvent(name: string, data?: Record<string, any>): void {
    systemLogger.info(`Event: ${name}`, data);

    if (env.SENTRY_DSN) {
      Sentry.addBreadcrumb({
        message: name,
        data: data || {},
        level: 'info',
      });
    }

    this.metricsCollector.increment(`events.${name}`, data);
  }
}

// Export singleton instance
export const monitoring = MonitoringConfig.getInstance();

// Utility functions
export function recordMetric(
  name: string,
  value: number,
  unit?: string,
  tags?: Record<string, string>
): void {
  monitoring.getMetricsCollector().record(name, value, unit, tags);
}

export function incrementCounter(
  name: string,
  tags?: Record<string, string>,
  value?: number
): void {
  monitoring.getMetricsCollector().increment(name, tags, value);
}

export function startTimer(name: string): void {
  monitoring.getMetricsCollector().startTimer(name);
}

export function endTimer(name: string, tags?: Record<string, string>): number {
  return monitoring.getMetricsCollector().endTimer(name, tags);
}

export function reportError(error: Error, context?: Record<string, any>): void {
  monitoring.reportError(error, context);
}

export function reportEvent(name: string, data?: Record<string, any>): void {
  monitoring.reportEvent(name, data);
}

export default monitoring;
