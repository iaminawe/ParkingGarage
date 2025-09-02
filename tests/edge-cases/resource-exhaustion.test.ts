import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../factories/TestDataFactory';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

describe('Resource Exhaustion Testing', () => {
  let testFactory: TestDataFactory;
  let authToken: string;
  let garage: any;

  beforeEach(async () => {
    testFactory = new TestDataFactory();
    
    const user = await testFactory.createUser();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'testPassword123'
      });
    
    authToken = loginResponse.body.token;
    garage = await testFactory.createGarage();
  });

  afterEach(async () => {
    await testFactory.cleanup();
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Memory Limit Testing', () => {
    it('should handle large dataset queries without memory exhaustion', async () => {
      // Create a large number of vehicles
      console.log('Creating large dataset...');
      const batchSize = 100;
      const totalBatches = 10; // 1000 vehicles total
      
      for (let batch = 0; batch < totalBatches; batch++) {
        const vehicles = [];
        for (let i = 0; i < batchSize; i++) {
          vehicles.push({
            licensePlate: `LARGE-${batch}-${i}`,
            make: `Make${i % 10}`,
            model: `Model${i % 20}`,
            color: `Color${i % 5}`,
            description: 'A'.repeat(500) // 500 char description
          });
        }
        
        await prisma.vehicle.createMany({ data: vehicles });
      }

      const initialMemory = process.memoryUsage();
      console.log('Initial memory usage:', initialMemory.heapUsed / 1024 / 1024, 'MB');

      // Query large dataset
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1000 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(1000);

      const finalMemory = process.memoryUsage();
      console.log('Final memory usage:', finalMemory.heapUsed / 1024 / 1024, 'MB');
      
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      console.log('Memory increase:', memoryIncrease / 1024 / 1024, 'MB');

      // Memory increase should be reasonable (< 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle memory-intensive operations with pagination', async () => {
      // Create vehicles with large descriptions
      const vehicles = [];
      for (let i = 0; i < 500; i++) {
        vehicles.push({
          licensePlate: `MEM-${i}`,
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          description: 'X'.repeat(2000) // 2KB per vehicle description
        });
      }
      
      await prisma.vehicle.createMany({ data: vehicles });

      const initialMemory = process.memoryUsage();

      // Query with pagination to prevent memory exhaustion
      let totalFetched = 0;
      let page = 1;
      const pageSize = 50;

      while (totalFetched < 500) {
        const response = await request(app)
          .get('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ 
            page: page,
            limit: pageSize
          });

        expect(response.status).toBe(200);
        totalFetched += response.body.data.length;
        page++;

        if (response.body.data.length === 0) break;
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be controlled due to pagination
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB
      expect(totalFetched).toBe(500);
    });

    it('should reject extremely large payload requests', async () => {
      const hugeDescription = 'A'.repeat(10 * 1024 * 1024); // 10MB string

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licensePlate: 'HUGE123',
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          description: hugeDescription
        });

      expect(response.status).toBe(413); // Payload Too Large
    });

    it('should handle memory leaks in long-running operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate long-running operation with many small requests
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/garages')
          .set('Authorization', `Bearer ${authToken}`);
        
        // Periodic memory check
        if (i % 20 === 0) {
          const currentMemory = process.memoryUsage().heapUsed;
          const memoryGrowth = currentMemory - initialMemory;
          
          // Memory shouldn't grow excessively (< 50MB growth)
          expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const totalGrowth = finalMemory - initialMemory;
      
      // Total memory growth should be reasonable
      expect(totalGrowth).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Connection Pool Exhaustion', () => {
    it('should handle connection pool exhaustion gracefully', async () => {
      // Generate many concurrent database operations
      const concurrentOperations = 50; // More than typical connection pool size
      
      const startTime = performance.now();
      
      const operations = Array(concurrentOperations).fill(null).map(async (_, index) => {
        try {
          const response = await request(app)
            .get('/api/vehicles')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ limit: 10 });
          
          return { success: response.status === 200, index };
        } catch (error) {
          return { success: false, index, error: error.message };
        }
      });

      const results = await Promise.allSettled(operations);
      const endTime = performance.now();
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );

      // Most should succeed (allowing for some failures due to limits)
      expect(successful.length).toBeGreaterThan(concurrentOperations * 0.8);
      
      // Should complete within reasonable time (not timeout)
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds
    });

    it('should recover from temporary connection issues', async () => {
      // Test connection recovery by creating many operations in waves
      const waves = 3;
      const operationsPerWave = 20;
      
      for (let wave = 0; wave < waves; wave++) {
        console.log(`Testing wave ${wave + 1}/${waves}`);
        
        const waveOperations = Array(operationsPerWave).fill(null).map(() =>
          request(app)
            .get('/api/garages')
            .set('Authorization', `Bearer ${authToken}`)
        );

        const waveResults = await Promise.allSettled(waveOperations);
        
        const successfulInWave = waveResults.filter(r => 
          r.status === 'fulfilled' && r.value.status === 200
        );

        // Each wave should have mostly successful operations
        expect(successfulInWave.length).toBeGreaterThan(operationsPerWave * 0.7);
        
        // Small delay between waves
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    });

    it('should handle database query timeouts', async () => {
      // Simulate heavy query that might timeout
      const response = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          includeDetails: true,
          sortBy: 'duration',
          limit: 1000 
        })
        .timeout(10000); // 10 second timeout

      // Should either succeed or fail gracefully (not hang)
      expect([200, 408, 500]).toContain(response.status);
    });
  });

  describe('File System Limits', () => {
    it('should handle large file uploads', async () => {
      // Simulate large file upload (report generation)
      const response = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'DETAILED',
          format: 'PDF',
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31'
          },
          includeCharts: true,
          includeRawData: true
        })
        .timeout(30000);

      if (response.status === 200) {
        // If successful, check reasonable file size limits
        expect(response.headers['content-length']).toBeDefined();
        const fileSize = parseInt(response.headers['content-length']);
        expect(fileSize).toBeLessThan(100 * 1024 * 1024); // < 100MB
      } else {
        // Should fail gracefully with appropriate error
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should handle temporary file cleanup', async () => {
      // Generate multiple reports to test temp file cleanup
      const reportPromises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/reports/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'SUMMARY',
            format: 'CSV',
            dateRange: {
              start: '2024-01-01',
              end: '2024-01-31'
            }
          })
      );

      const results = await Promise.allSettled(reportPromises);
      
      // Check that at least some succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Network Resource Limits', () => {
    it('should handle request flooding', async () => {
      const floodSize = 200;
      const startTime = performance.now();
      
      // Generate flood of lightweight requests
      const floodRequests = Array(floodSize).fill(null).map((_, index) =>
        request(app)
          .get('/api/health')
          .timeout(5000)
      );

      const results = await Promise.allSettled(floodRequests);
      const endTime = performance.now();
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      
      const rateLimited = results.filter(r =>
        r.status === 'fulfilled' && r.value.status === 429
      );

      // Either succeed or be rate limited (not crash)
      expect(successful.length + rateLimited.length).toBe(floodSize);
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(60000); // 1 minute
    });

    it('should handle concurrent large response generation', async () => {
      // Create data for large responses
      const vehicles = [];
      for (let i = 0; i < 100; i++) {
        vehicles.push({
          licensePlate: `RESP-${i}`,
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          description: 'Large response test vehicle with detailed description that makes the JSON response larger'
        });
      }
      
      await prisma.vehicle.createMany({ data: vehicles });

      // Request large responses concurrently
      const largeResponseRequests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ limit: 100, includeDetails: true })
      );

      const results = await Promise.allSettled(largeResponseRequests);
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      // Most should succeed
      expect(successful.length).toBeGreaterThan(7);
    });
  });

  describe('CPU Intensive Operations', () => {
    it('should handle computationally expensive operations', async () => {
      // Create complex data for expensive calculations
      const sessions = [];
      for (let i = 0; i < 100; i++) {
        const spot = await testFactory.createSpot({ garageId: garage.id });
        const vehicle = await testFactory.createVehicle();
        
        sessions.push(await testFactory.createSession({
          spotId: spot.id,
          vehicleId: vehicle.id,
          checkInTime: new Date(Date.now() - Math.random() * 1000000000),
          checkOutTime: new Date(Date.now() - Math.random() * 500000000)
        }));
      }

      const startTime = performance.now();
      
      // Request complex analytics calculation
      const response = await request(app)
        .get(`/api/garages/${garage.id}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          metrics: 'all',
          aggregation: 'detailed',
          period: 'year'
        })
        .timeout(30000);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect([200, 408]).toContain(response.status);
      
      if (response.status === 200) {
        // Should complete within reasonable time
        expect(processingTime).toBeLessThan(30000);
        expect(response.body.analytics).toBeDefined();
      }
    });

    it('should prevent infinite loops in business logic', async () => {
      // Test edge case that could cause infinite loops
      const spot = await testFactory.createSpot({ garageId: garage.id });
      
      const startTime = performance.now();
      
      // Request that could potentially cause infinite loop
      const response = await request(app)
        .get(`/api/spots/${spot.id}/optimization-suggestions`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          algorithm: 'complex',
          maxIterations: 1000
        })
        .timeout(15000);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should either complete quickly or timeout gracefully
      expect([200, 408]).toContain(response.status);
      expect(processingTime).toBeLessThan(15000);
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources after failed operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate operations that are likely to fail
      const failingOperations = Array(50).fill(null).map(() =>
        request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: 'invalid-id',
            spotId: 'invalid-id'
          })
      );

      await Promise.allSettled(failingOperations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory shouldn't increase significantly from failed operations
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // < 20MB
    });

    it('should close connections properly after errors', async () => {
      // Test connection cleanup after database errors
      const invalidOperations = Array(20).fill(null).map(() =>
        request(app)
          .get('/api/sessions/invalid-session-id-that-does-not-exist')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(invalidOperations);
      
      // All should fail gracefully (404 Not Found)
      const notFoundErrors = results.filter(r =>
        r.status === 'fulfilled' && r.value.status === 404
      );

      expect(notFoundErrors.length).toBe(20);
      
      // Subsequent valid operations should still work
      const validResponse = await request(app)
        .get('/api/garages')
        .set('Authorization', `Bearer ${authToken}`);

      expect(validResponse.status).toBe(200);
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should enforce rate limits to prevent resource exhaustion', async () => {
      const rapidRequests = Array(100).fill(null).map(() =>
        request(app)
          .get('/api/garages')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(rapidRequests);
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      
      const rateLimited = results.filter(r =>
        r.status === 'fulfilled' && r.value.status === 429
      );

      // Some should be rate limited
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(successful.length + rateLimited.length).toBe(100);
    });

    it('should handle burst traffic patterns', async () => {
      // Simulate burst pattern: quiet -> burst -> quiet
      
      // Initial quiet period
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Burst
      const burstSize = 50;
      const burstStart = performance.now();
      
      const burstRequests = Array(burstSize).fill(null).map(() =>
        request(app)
          .get('/api/health')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const burstResults = await Promise.allSettled(burstRequests);
      const burstEnd = performance.now();
      
      // System should handle burst without crashing
      const burstSuccessful = burstResults.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      
      expect(burstSuccessful.length).toBeGreaterThan(0);
      expect(burstEnd - burstStart).toBeLessThan(30000);
      
      // Recovery period
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Normal operation should resume
      const recoveryResponse = await request(app)
        .get('/api/garages')
        .set('Authorization', `Bearer ${authToken}`);

      expect(recoveryResponse.status).toBe(200);
    });
  });
});