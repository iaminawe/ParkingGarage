/**
 * Performance Metrics Collection Utilities
 *
 * Provides comprehensive system performance monitoring including
 * CPU usage, memory consumption, network I/O, and application-specific metrics.
 *
 * @module PerformanceMetrics
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { logger } from './logger';

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: [number, number, number];
    cores: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    arrayBuffers: number;
    heapUtilization: number;
  };
  process: {
    uptime: number;
    pid: number;
    ppid: number;
    title: string;
    version: string;
    arch: string;
    platform: string;
  };
  gc?: {
    totalDuration: number;
    totalCount: number;
    averageDuration: number;
  };
}

export interface ApplicationMetrics {
  timestamp: number;
  requests: {
    total: number;
    active: number;
    perSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  database: {
    connections: {
      active: number;
      idle: number;
      total: number;
    };
    queries: {
      total: number;
      perSecond: number;
      averageTime: number;
      slowQueries: number;
    };
  };
  cache: {
    hitRate: number;
    operations: number;
    keysCount: number;
    memoryUsed: number;
  };
  business: {
    activeVehicles: number;
    availableSpots: number;
    occupancyRate: number;
    revenueToday: number;
  };
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export class PerformanceMetricsCollector extends EventEmitter {
  private systemMetrics: SystemMetrics[] = [];
  private applicationMetrics: ApplicationMetrics[] = [];
  private isCollecting = false;
  private collectionInterval: NodeJS.Timeout | null = null;
  private gcStats: { duration: number; timestamp: number }[] = [];
  private readonly MAX_METRICS_RETENTION = 1000;
  private readonly COLLECTION_INTERVAL = 5000; // 5 seconds

  // Performance thresholds
  private readonly thresholds: PerformanceThreshold[] = [
    { metric: 'cpu.usage', warning: 70, critical: 90, unit: '%' },
    { metric: 'memory.heapUtilization', warning: 70, critical: 90, unit: '%' },
    { metric: 'requests.averageResponseTime', warning: 1000, critical: 2000, unit: 'ms' },
    { metric: 'requests.errorRate', warning: 5, critical: 10, unit: '%' },
    { metric: 'database.queries.averageTime', warning: 500, critical: 1000, unit: 'ms' },
    { metric: 'cache.hitRate', warning: 50, critical: 30, unit: '%' },
  ];

  constructor() {
    super();
    this.setupGCMonitoring();
  }

  /**
   * Start metrics collection
   */
  startCollection(): void {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    logger.info('Performance metrics collection started');

    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, this.COLLECTION_INTERVAL);

    // Collect initial metrics
    this.collectMetrics();
  }

  /**
   * Stop metrics collection
   */
  stopCollection(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    logger.info('Performance metrics collection stopped');
  }

  /**
   * Collect current system and application metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const systemMetrics = await this.collectSystemMetrics();
      const applicationMetrics = await this.collectApplicationMetrics();

      this.systemMetrics.push(systemMetrics);
      this.applicationMetrics.push(applicationMetrics);

      // Trim old metrics
      if (this.systemMetrics.length > this.MAX_METRICS_RETENTION) {
        this.systemMetrics = this.systemMetrics.slice(-this.MAX_METRICS_RETENTION);
      }
      if (this.applicationMetrics.length > this.MAX_METRICS_RETENTION) {
        this.applicationMetrics = this.applicationMetrics.slice(-this.MAX_METRICS_RETENTION);
      }

      // Check thresholds and emit alerts
      this.checkThresholds(systemMetrics, applicationMetrics);

      // Emit metrics event
      this.emit('metrics', { system: systemMetrics, application: applicationMetrics });
    } catch (error) {
      logger.error('Failed to collect performance metrics', error as Error);
    }
  }

  /**
   * Collect system-level performance metrics
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAverage = process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0];

    return {
      timestamp: Date.now(),
      cpu: {
        usage: this.calculateCpuUsage(cpuUsage),
        loadAverage: loadAverage as [number, number, number],
        cores: require('os').cpus().length,
      },
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
        heapUtilization: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 10000) / 100,
      },
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        ppid: process.ppid || 0,
        title: process.title,
        version: process.version,
        arch: process.arch,
        platform: process.platform,
      },
      gc: this.calculateGCStats(),
    };
  }

  /**
   * Collect application-specific metrics
   */
  private async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    // These would typically be injected from actual services
    // For now, we'll return placeholder data that would be populated by real services
    return {
      timestamp: Date.now(),
      requests: {
        total: 0,
        active: 0,
        perSecond: 0,
        averageResponseTime: 0,
        errorRate: 0,
      },
      database: {
        connections: {
          active: 0,
          idle: 0,
          total: 0,
        },
        queries: {
          total: 0,
          perSecond: 0,
          averageTime: 0,
          slowQueries: 0,
        },
      },
      cache: {
        hitRate: 0,
        operations: 0,
        keysCount: 0,
        memoryUsed: 0,
      },
      business: {
        activeVehicles: 0,
        availableSpots: 0,
        occupancyRate: 0,
        revenueToday: 0,
      },
    };
  }

  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics(): {
    system: SystemMetrics | null;
    application: ApplicationMetrics | null;
  } {
    return {
      system: this.systemMetrics[this.systemMetrics.length - 1] || null,
      application: this.applicationMetrics[this.applicationMetrics.length - 1] || null,
    };
  }

  /**
   * Get metrics history for a time range
   */
  getMetricsHistory(minutes = 60): {
    system: SystemMetrics[];
    application: ApplicationMetrics[];
  } {
    const cutoffTime = Date.now() - minutes * 60 * 1000;

    return {
      system: this.systemMetrics.filter(m => m.timestamp >= cutoffTime),
      application: this.applicationMetrics.filter(m => m.timestamp >= cutoffTime),
    };
  }

  /**
   * Get performance summary for a time period
   */
  getPerformanceSummary(minutes = 60): {
    timeRange: string;
    system: {
      avgCpuUsage: number;
      maxCpuUsage: number;
      avgMemoryUsage: number;
      maxMemoryUsage: number;
      gcCount: number;
      gcTotalTime: number;
    };
    application: {
      totalRequests: number;
      avgResponseTime: number;
      maxResponseTime: number;
      errorRate: number;
      cacheHitRate: number;
    };
    alerts: Array<{
      timestamp: number;
      metric: string;
      value: number;
      threshold: number;
      severity: 'warning' | 'critical';
    }>;
  } {
    const history = this.getMetricsHistory(minutes);

    if (history.system.length === 0) {
      return {
        timeRange: `Last ${minutes} minutes`,
        system: {
          avgCpuUsage: 0,
          maxCpuUsage: 0,
          avgMemoryUsage: 0,
          maxMemoryUsage: 0,
          gcCount: 0,
          gcTotalTime: 0,
        },
        application: {
          totalRequests: 0,
          avgResponseTime: 0,
          maxResponseTime: 0,
          errorRate: 0,
          cacheHitRate: 0,
        },
        alerts: [],
      };
    }

    // System metrics summary
    const cpuUsages = history.system.map(m => m.cpu.usage);
    const memoryUsages = history.system.map(m => m.memory.heapUtilization);
    const gcStats = history.system.map(m => m.gc).filter(gc => gc !== undefined) as NonNullable<
      SystemMetrics['gc']
    >[];

    // Application metrics summary
    const responseTimes = history.application.map(m => m.requests.averageResponseTime);
    const errorRates = history.application.map(m => m.requests.errorRate);
    const cacheHitRates = history.application.map(m => m.cache.hitRate);

    return {
      timeRange: `Last ${minutes} minutes`,
      system: {
        avgCpuUsage:
          Math.round((cpuUsages.reduce((sum, usage) => sum + usage, 0) / cpuUsages.length) * 100) /
          100,
        maxCpuUsage: Math.round(Math.max(...cpuUsages) * 100) / 100,
        avgMemoryUsage:
          Math.round(
            (memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length) * 100
          ) / 100,
        maxMemoryUsage: Math.round(Math.max(...memoryUsages) * 100) / 100,
        gcCount: gcStats.reduce((sum, gc) => sum + gc.totalCount, 0),
        gcTotalTime: Math.round(gcStats.reduce((sum, gc) => sum + gc.totalDuration, 0)),
      },
      application: {
        totalRequests: history.application.reduce((sum, m) => sum + m.requests.total, 0),
        avgResponseTime: Math.round(
          responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        ),
        maxResponseTime: Math.round(Math.max(...responseTimes)),
        errorRate:
          Math.round((errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length) * 100) /
          100,
        cacheHitRate:
          Math.round(
            (cacheHitRates.reduce((sum, rate) => sum + rate, 0) / cacheHitRates.length) * 100
          ) / 100,
      },
      alerts: [], // Would be populated by threshold checking
    };
  }

  /**
   * Create performance benchmark
   */
  async benchmark<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{
    result: T;
    duration: number;
    memoryDelta: number;
  }> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await fn();
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      const benchmark = {
        result,
        duration: Math.round((endTime - startTime) * 100) / 100,
        memoryDelta: endMemory - startMemory,
      };

      logger.info(`Benchmark completed: ${name}`, {
        duration: `${benchmark.duration}ms`,
        memoryDelta: `${Math.round(benchmark.memoryDelta / 1024)}KB`,
      });

      this.emit('benchmark', { name, ...benchmark });

      return benchmark;
    } catch (error) {
      const endTime = performance.now();
      logger.error(`Benchmark failed: ${name}`, {
        duration: `${Math.round((endTime - startTime) * 100) / 100}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Clear metrics history
   */
  clearHistory(): void {
    this.systemMetrics = [];
    this.applicationMetrics = [];
    this.gcStats = [];
    logger.info('Performance metrics history cleared');
  }

  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // This is a simplified CPU usage calculation
    // In a real implementation, you'd track previous values for accurate calculation
    const totalTime = cpuUsage.user + cpuUsage.system;
    return Math.min(100, Math.round((totalTime / 1000000) * 100) / 100); // Convert microseconds to percentage
  }

  private calculateGCStats(): SystemMetrics['gc'] | undefined {
    if (this.gcStats.length === 0) {
      return undefined;
    }

    const totalDuration = this.gcStats.reduce((sum, gc) => sum + gc.duration, 0);
    const totalCount = this.gcStats.length;
    const averageDuration = totalCount > 0 ? totalDuration / totalCount : 0;

    return {
      totalDuration: Math.round(totalDuration * 100) / 100,
      totalCount,
      averageDuration: Math.round(averageDuration * 100) / 100,
    };
  }

  private setupGCMonitoring(): void {
    // Monitor garbage collection if available
    if (process.env.NODE_ENV === 'development' && (global as any).gc) {
      const originalGC = (global as any).gc;
      (global as any).gc = () => {
        const start = performance.now();
        const result = originalGC();
        const duration = performance.now() - start;

        this.gcStats.push({ duration, timestamp: Date.now() });

        // Keep only recent GC stats
        if (this.gcStats.length > 100) {
          this.gcStats = this.gcStats.slice(-100);
        }

        return result;
      };
    }

    // Use performance observer for GC events if available
    try {
      const { PerformanceObserver } = require('perf_hooks');
      const obs = new PerformanceObserver((list: any) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.entryType === 'gc') {
            this.gcStats.push({
              duration: entry.duration,
              timestamp: Date.now(),
            });
          }
        });
      });
      obs.observe({ entryTypes: ['gc'] });
    } catch (error) {
      // GC monitoring not available in this environment
    }
  }

  private checkThresholds(system: SystemMetrics, application: ApplicationMetrics): void {
    const values = {
      'cpu.usage': system.cpu.usage,
      'memory.heapUtilization': system.memory.heapUtilization,
      'requests.averageResponseTime': application.requests.averageResponseTime,
      'requests.errorRate': application.requests.errorRate,
      'database.queries.averageTime': application.database.queries.averageTime,
      'cache.hitRate': application.cache.hitRate,
    };

    this.thresholds.forEach(threshold => {
      const value = (values as any)[threshold.metric] as number | undefined;
      if (value === undefined) {
        return;
      }

      if (value >= threshold.critical) {
        this.emit('alert', {
          timestamp: Date.now(),
          metric: threshold.metric,
          value,
          threshold: threshold.critical,
          severity: 'critical',
          unit: threshold.unit,
        });
      } else if (value >= threshold.warning) {
        this.emit('alert', {
          timestamp: Date.now(),
          metric: threshold.metric,
          value,
          threshold: threshold.warning,
          severity: 'warning',
          unit: threshold.unit,
        });
      }
    });
  }
}

/**
 * Singleton instance for global access
 */
export const performanceMetrics = new PerformanceMetricsCollector();

/**
 * Utility functions for performance monitoring
 */
export const PerformanceUtils = {
  /**
   * Measure execution time of a function
   */
  time<T>(fn: () => T): { result: T; duration: number } {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    return { result, duration: Math.round(duration * 100) / 100 };
  },

  /**
   * Measure execution time of an async function
   */
  async timeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration: Math.round(duration * 100) / 100 };
  },

  /**
   * Monitor memory usage during function execution
   */
  monitorMemory<T>(fn: () => T): { result: T; memoryDelta: number; peakMemory: number } {
    const startMemory = process.memoryUsage().heapUsed;
    let peakMemory = startMemory;

    // Sample memory during execution (simplified)
    const memoryInterval = setInterval(() => {
      const currentMemory = process.memoryUsage().heapUsed;
      peakMemory = Math.max(peakMemory, currentMemory);
    }, 10);

    try {
      const result = fn();
      clearInterval(memoryInterval);

      const endMemory = process.memoryUsage().heapUsed;
      return {
        result,
        memoryDelta: endMemory - startMemory,
        peakMemory: peakMemory - startMemory,
      };
    } catch (error) {
      clearInterval(memoryInterval);
      throw error;
    }
  },

  /**
   * Get formatted memory usage
   */
  getFormattedMemoryUsage(): string {
    const usage = process.memoryUsage();
    const formatBytes = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

    return `Heap: ${formatBytes(usage.heapUsed)}/${formatBytes(usage.heapTotal)}MB, RSS: ${formatBytes(usage.rss)}MB`;
  },

  /**
   * Get system uptime formatted
   */
  getFormattedUptime(): string {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    return `${hours}h ${minutes}m ${seconds}s`;
  },
};

export default {
  PerformanceMetricsCollector,
  performanceMetrics,
  PerformanceUtils,
};
