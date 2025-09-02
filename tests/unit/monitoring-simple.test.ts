/**
 * Simple tests for monitoring configuration
 */

// Mock Sentry
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  Integrations: {
    Http: jest.fn(() => ({ tracing: true })),
    Express: jest.fn(() => ({ app: undefined }))
  }
}));

// Mock environment
const mockEnv = {
  NODE_ENV: 'test',
  SENTRY_DSN: '',
  ENABLE_METRICS: true,
  HEALTH_CHECK_TIMEOUT: 5000
};

jest.mock('../../src/config/environment', () => ({
  env: mockEnv
}));

import { MonitoringConfig, MetricsCollector, MemoryHealthCheck, SystemHealthCheck } from '../../src/config/monitoring.config';

describe('MonitoringConfig', () => {
  let monitoring: MonitoringConfig;
  
  beforeEach(() => {
    monitoring = MonitoringConfig.getInstance();
  });
  
  it('should return singleton instance', () => {
    const instance1 = MonitoringConfig.getInstance();
    const instance2 = MonitoringConfig.getInstance();
    expect(instance1).toBe(instance2);
  });
  
  it('should return metrics collector instance', () => {
    const collector = monitoring.getMetricsCollector();
    expect(collector).toBeInstanceOf(MetricsCollector);
  });
  
  it('should run health checks', async () => {
    const results = await monitoring.runHealthChecks();
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    results.forEach(result => {
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('status');
      expect(['healthy', 'unhealthy', 'degraded']).toContain(result.status);
    });
  });
  
  it('should get overall health status', async () => {
    const healthStatus = await monitoring.getHealthStatus();
    
    expect(healthStatus).toHaveProperty('status');
    expect(healthStatus).toHaveProperty('checks');
    expect(['healthy', 'unhealthy', 'degraded']).toContain(healthStatus.status);
    expect(Array.isArray(healthStatus.checks)).toBe(true);
  });
  
  it('should report error without throwing', () => {
    const error = new Error('Test error');
    const context = { userId: '123', operation: 'test' };
    
    expect(() => {
      monitoring.reportError(error, context);
    }).not.toThrow();
  });
  
  it('should report event without throwing', () => {
    const eventName = 'user.login';
    const eventData = { userId: '123', ip: '127.0.0.1' };
    
    expect(() => {
      monitoring.reportEvent(eventName, eventData);
    }).not.toThrow();
  });
});

describe('MetricsCollector', () => {
  let collector: MetricsCollector;
  
  beforeEach(() => {
    collector = new MetricsCollector();
  });
  
  it('should record a metric', () => {
    collector.record('test.metric', 42, 'count');
    
    const metrics = collector.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      name: 'test.metric',
      value: 42,
      unit: 'count',
    });
  });
  
  it('should increment counter', () => {
    collector.increment('test.counter');
    collector.increment('test.counter', undefined, 3);
    
    expect(collector.getCounter('test.counter')).toBe(4);
  });
  
  it('should record histogram values', () => {
    collector.histogram('response.time', 100);
    collector.histogram('response.time', 200);
    collector.histogram('response.time', 150);
    
    const stats = collector.getHistogramStats('response.time');
    expect(stats.count).toBe(3);
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(200);
    expect(stats.avg).toBe(150);
  });
  
  it('should measure timing', () => {
    collector.startTimer('test.operation');
    const duration = collector.endTimer('test.operation');
    
    expect(duration).toBeGreaterThanOrEqual(0);
  });
  
  it('should clear all metrics', () => {
    collector.record('test.metric', 42);
    collector.increment('test.counter', undefined, 5);
    
    collector.clear();
    
    expect(collector.getMetrics()).toHaveLength(0);
    expect(collector.getCounter('test.counter')).toBe(0);
  });
});

describe('MemoryHealthCheck', () => {
  let healthCheck: MemoryHealthCheck;
  
  beforeEach(() => {
    healthCheck = new MemoryHealthCheck();
  });
  
  it('should have correct name', () => {
    expect(healthCheck.name).toBe('memory');
  });
  
  it('should return memory health status', async () => {
    const result = await healthCheck.check();
    
    expect(result).toHaveProperty('name', 'memory');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('metadata');
    
    expect(result.metadata).toHaveProperty('heapUsed');
    expect(result.metadata).toHaveProperty('heapTotal');
    expect(result.metadata).toHaveProperty('usagePercent');
  });
});

describe('SystemHealthCheck', () => {
  let healthCheck: SystemHealthCheck;
  
  beforeEach(() => {
    healthCheck = new SystemHealthCheck();
  });
  
  it('should have correct name', () => {
    expect(healthCheck.name).toBe('system');
  });
  
  it('should return system health status', async () => {
    const result = await healthCheck.check();
    
    expect(result).toHaveProperty('name', 'system');
    expect(result).toHaveProperty('status', 'healthy');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('metadata');
    
    expect(result.metadata).toHaveProperty('uptime');
    expect(result.metadata).toHaveProperty('platform');
  });
});