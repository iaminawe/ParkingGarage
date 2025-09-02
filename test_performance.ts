// Simple test to check performance middleware types
import { PerformanceAlert, RequestMetrics, PerformanceMonitor } from './src/middleware/performance.middleware';

// Test PerformanceAlert interface - should have 'name' property
const testAlert: PerformanceAlert = {
  type: 'SLOW_REQUEST',
  severity: 'HIGH', 
  message: 'Test alert',
  name: 'TestAlert',
  metrics: { test: true },
  timestamp: Date.now()
};

// Test that we can create a PerformanceMonitor
const monitor = new PerformanceMonitor();

console.log('TypeScript compilation test passed for performance middleware!');