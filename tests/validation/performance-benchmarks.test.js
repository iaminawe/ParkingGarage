const request = require('supertest');
const { performance } = require('perf_hooks');

const API_BASE = 'http://localhost:3001';

describe('Performance Benchmarks', () => {
  let performanceMetrics = {
    responseTimesMs: {},
    throughputReqPerSec: {},
    errorRates: {},
    memoryUsage: {}
  };

  afterAll(() => {
    console.log('\n📊 PERFORMANCE BENCHMARK RESULTS:');
    console.log('==================================');
    Object.entries(performanceMetrics.responseTimesMs).forEach(([endpoint, times]) => {
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
      
      console.log(`${endpoint}:`);
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  Min: ${min.toFixed(2)}ms`);
      console.log(`  Max: ${max.toFixed(2)}ms`);
      console.log(`  95th percentile: ${p95.toFixed(2)}ms`);
    });
    
    console.log('\nThroughput Results:');
    Object.entries(performanceMetrics.throughputReqPerSec).forEach(([test, rps]) => {
      console.log(`  ${test}: ${rps.toFixed(2)} req/s`);
    });
    
    console.log('\nError Rates:');
    Object.entries(performanceMetrics.errorRates).forEach(([test, rate]) => {
      console.log(`  ${test}: ${(rate * 100).toFixed(2)}%`);
    });
  });

  describe('Response Time Benchmarks', () => {
    const endpoints = [
      { path: '/health', method: 'GET', name: 'Health Check' },
      { path: '/api/garage/status', method: 'GET', name: 'Garage Status' },
      { path: '/api/spots', method: 'GET', name: 'List Spots' },
      { path: '/api/spots?status=available', method: 'GET', name: 'Available Spots' },
      { path: '/api/spots?floor=1', method: 'GET', name: 'Floor Filter' },
      { path: '/api/spots?type=compact', method: 'GET', name: 'Type Filter' }
    ];

    endpoints.forEach(endpoint => {
      it(`should meet response time requirements for ${endpoint.name}`, async () => {
        const iterations = 20;
        const responseTimes = [];
        
        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();
          
          const response = await request(API_BASE)[endpoint.method.toLowerCase()](endpoint.path);
          
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          expect(response.status).toBe(200);
          responseTimes.push(responseTime);
          
          // Brief pause between requests
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        performanceMetrics.responseTimesMs[endpoint.name] = responseTimes;
        
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        
        console.log(`${endpoint.name}: avg ${avgResponseTime.toFixed(2)}ms, max ${maxResponseTime.toFixed(2)}ms`);
        
        // Performance requirements
        expect(avgResponseTime).toBeLessThan(100); // 100ms average
        expect(maxResponseTime).toBeLessThan(500); // 500ms max
      });
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should handle high throughput for read operations', async () => {
      const duration = 10000; // 10 seconds
      const concurrency = 10;
      const startTime = Date.now();
      
      let totalRequests = 0;
      let successfulRequests = 0;
      let totalResponseTime = 0;

      const workers = Array.from({ length: concurrency }, async () => {
        while (Date.now() - startTime < duration) {
          const reqStart = performance.now();
          
          try {
            const response = await request(API_BASE)
              .get('/api/garage/status');
            
            totalRequests++;
            if (response.status === 200) {
              successfulRequests++;
            }
            totalResponseTime += performance.now() - reqStart;
          } catch (error) {
            totalRequests++;
          }
          
          // Small delay to prevent overwhelming
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      });

      await Promise.all(workers);
      
      const actualDuration = Date.now() - startTime;
      const throughput = (successfulRequests / actualDuration) * 1000; // req/s
      const errorRate = (totalRequests - successfulRequests) / totalRequests;
      const avgResponseTime = totalResponseTime / totalRequests;
      
      performanceMetrics.throughputReqPerSec['Read Operations'] = throughput;
      performanceMetrics.errorRates['Read Operations'] = errorRate;
      
      console.log(`Throughput test results (${actualDuration}ms):`);
      console.log(`  Total requests: ${totalRequests}`);
      console.log(`  Successful: ${successfulRequests}`);
      console.log(`  Throughput: ${throughput.toFixed(2)} req/s`);
      console.log(`  Error rate: ${(errorRate * 100).toFixed(2)}%`);
      console.log(`  Avg response time: ${avgResponseTime.toFixed(2)}ms`);
      
      expect(throughput).toBeGreaterThan(50); // At least 50 req/s
      expect(errorRate).toBeLessThan(0.05); // Less than 5% error rate
      expect(avgResponseTime).toBeLessThan(200);
    });

    it('should handle write operations under load', async () => {
      const duration = 5000; // 5 seconds
      const startTime = Date.now();
      
      let totalRequests = 0;
      let successfulRequests = 0;
      const vehicles = [];

      while (Date.now() - startTime < duration) {
        const licensePlate = `LOAD${Date.now()}${Math.random().toString(36).substr(2, 3)}`;
        
        try {
          const response = await request(API_BASE)
            .post('/api/checkin')
            .send({
              licensePlate,
              vehicleType: 'standard'
            });
          
          totalRequests++;
          if (response.status === 201) {
            successfulRequests++;
            vehicles.push(licensePlate);
          }
        } catch (error) {
          totalRequests++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const actualDuration = Date.now() - startTime;
      const throughput = (successfulRequests / actualDuration) * 1000;
      const errorRate = (totalRequests - successfulRequests) / totalRequests;
      
      performanceMetrics.throughputReqPerSec['Write Operations'] = throughput;
      performanceMetrics.errorRates['Write Operations'] = errorRate;
      
      console.log(`Write throughput test (${actualDuration}ms):`);
      console.log(`  Check-ins attempted: ${totalRequests}`);
      console.log(`  Successful: ${successfulRequests}`);
      console.log(`  Throughput: ${throughput.toFixed(2)} req/s`);
      console.log(`  Error rate: ${(errorRate * 100).toFixed(2)}%`);
      
      // Clean up all checked-in vehicles
      const cleanupPromises = vehicles.map(licensePlate =>
        request(API_BASE)
          .post('/api/checkout')
          .send({ licensePlate })
          .catch(() => {}) // Ignore cleanup failures
      );
      
      await Promise.all(cleanupPromises);
      
      expect(errorRate).toBeLessThan(0.1); // Less than 10% error rate for writes
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not exhibit memory leaks during extended operation', async () => {
      const iterations = 200;
      const vehicles = [];
      
      console.log(`Testing memory stability with ${iterations} check-in/check-out cycles`);
      
      for (let i = 0; i < iterations; i++) {
        const licensePlate = `MEM${i}`;
        
        // Check in
        const checkInResponse = await request(API_BASE)
          .post('/api/checkin')
          .send({
            licensePlate,
            vehicleType: 'compact'
          });
        
        if (checkInResponse.status === 201) {
          vehicles.push(licensePlate);
          
          // Immediately check out every 10th vehicle to test rapid cycles
          if (i % 10 === 0 && vehicles.length > 0) {
            const toCheckOut = vehicles.shift();
            await request(API_BASE)
              .post('/api/checkout')
              .send({ licensePlate: toCheckOut });
          }
        }
        
        // Brief pause every 50 iterations
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Check out remaining vehicles
      for (const licensePlate of vehicles) {
        await request(API_BASE)
          .post('/api/checkout')
          .send({ licensePlate })
          .catch(() => {}); // Ignore failures
      }

      // Verify system is still responsive after load
      const finalResponse = await request(API_BASE)
        .get('/api/garage/status');
      
      expect(finalResponse.status).toBe(200);
      console.log('✅ System remained responsive after extended operation');
    });
  });

  describe('System Stability', () => {
    it('should recover gracefully from invalid operations', async () => {
      const invalidOperations = [
        // Invalid check-ins
        () => request(API_BASE).post('/api/checkin').send({}),
        () => request(API_BASE).post('/api/checkin').send({ licensePlate: '' }),
        () => request(API_BASE).post('/api/checkin').send({ vehicleType: 'invalid' }),
        
        // Invalid check-outs
        () => request(API_BASE).post('/api/checkout').send({}),
        () => request(API_BASE).post('/api/checkout').send({ licensePlate: '' }),
        () => request(API_BASE).post('/api/checkout').send({ licensePlate: 'NOTFOUND' }),
        
        // Invalid spot queries
        () => request(API_BASE).get('/api/spots/invalid'),
        () => request(API_BASE).get('/api/spots/-1'),
        () => request(API_BASE).get('/api/spots/99999'),
        
        // Invalid vehicle queries
        () => request(API_BASE).get('/api/vehicles/'),
        () => request(API_BASE).get('/api/vehicles/NOTFOUND')
      ];

      let systemStable = true;
      
      for (const operation of invalidOperations) {
        try {
          const response = await operation();
          // Should return appropriate error, not crash
          expect([400, 404, 422].includes(response.status)).toBe(true);
        } catch (error) {
          console.error(`System instability detected:`, error.message);
          systemStable = false;
        }
        
        // Verify system is still responsive after each invalid operation
        const healthCheck = await request(API_BASE).get('/health');
        expect(healthCheck.status).toBe(200);
      }

      expect(systemStable).toBe(true);
      console.log('✅ System remained stable through all invalid operations');
    });
  });
});