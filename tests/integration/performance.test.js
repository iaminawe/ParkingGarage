const request = require('supertest');
const { createMockApp } = require('../helpers/mockApp');

describe('Performance and Load Tests', () => {
  let app;
  let api;

  beforeEach(() => {
    app = createMockApp();
    api = app.locals.api;
  });

  describe('Load Testing', () => {
    test('should handle 100 vehicles per hour (normal load)', async () => {
      const startTime = Date.now();
      const vehiclesPerHour = 100;
      const testDuration = 5000; // 5 seconds test
      const vehiclesToProcess = Math.floor(vehiclesPerHour * (testDuration / 3600000));

      const checkIns = [];
      const checkOuts = [];

      // Simulate check-ins
      for (let i = 0; i < vehiclesToProcess; i++) {
        const response = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: `LOAD-${i}` });
        
        if (response.status === 201) {
          checkIns.push({
            licensePlate: `LOAD-${i}`,
            spot: response.body.spot,
            timestamp: Date.now()
          });
        }
      }

      // Simulate some check-outs (30% leave)
      const checkOutCount = Math.floor(checkIns.length * 0.3);
      for (let i = 0; i < checkOutCount; i++) {
        const response = await request(app)
          .post('/api/checkout')
          .send({ licensePlate: checkIns[i].licensePlate });
        
        if (response.status === 200) {
          checkOuts.push({
            licensePlate: checkIns[i].licensePlate,
            duration: response.body.durationMinutes
          });
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Performance assertions
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(checkIns.length).toBeGreaterThan(0);
      
      // Calculate throughput
      const throughput = (checkIns.length + checkOuts.length) / (totalTime / 1000);
      console.log(`Throughput: ${throughput.toFixed(2)} operations/second`);
      
      expect(throughput).toBeGreaterThan(1); // At least 1 operation per second
    });

    test('should handle peak load (500 vehicles per hour)', async () => {
      const operations = [];
      const startTime = Date.now();

      // Simulate 50 vehicles in rapid succession
      for (let i = 0; i < 50; i++) {
        operations.push(
          request(app)
            .post('/api/checkin')
            .send({ licensePlate: `PEAK-${i}` })
        );
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successCount = results.filter(r => r.status === 201).length;
      const failureCount = results.filter(r => r.status === 503).length;

      // All requests should be handled
      expect(successCount + failureCount).toBe(50);
      
      // Response time should be reasonable even under load
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 50 concurrent requests
      
      const avgResponseTime = totalTime / 50;
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      
      expect(avgResponseTime).toBeLessThan(500); // Less than 500ms average
    });

    test('should maintain consistency under stress', async () => {
      const stressOperations = [];
      const vehicleCount = 100;

      // Rapid fire check-ins and check-outs
      for (let i = 0; i < vehicleCount; i++) {
        if (i % 3 === 0 && i > 10) {
          // Every third operation after 10, do a checkout
          stressOperations.push(
            request(app)
              .post('/api/checkout')
              .send({ licensePlate: `STRESS-${i - 10}` })
          );
        } else {
          // Otherwise do a checkin
          stressOperations.push(
            request(app)
              .post('/api/checkin')
              .send({ licensePlate: `STRESS-${i}` })
          );
        }
      }

      await Promise.all(stressOperations);

      // Verify data integrity
      const spotsResponse = await request(app)
        .get('/api/spots')
        .expect(200);

      const { total, available, occupied } = spotsResponse.body.summary;
      
      // Spot counts should be consistent
      expect(total).toBe(125);
      expect(available + occupied).toBe(total);
      expect(occupied).toBeGreaterThanOrEqual(0);
      expect(occupied).toBeLessThanOrEqual(total);
    });
  });

  describe('Query Performance', () => {
    test('should efficiently query large result sets', async () => {
      // Fill garage to 80%
      await request(app)
        .post('/api/test/seed')
        .send({ occupancy: 0.8 });

      const queries = [
        '/api/spots',
        '/api/spots?status=available',
        '/api/spots?status=occupied',
        '/api/spots?floor=1',
        '/api/spots?bay=A',
        '/api/spots?status=available&floor=2&bay=B'
      ];

      for (const query of queries) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get(query)
          .expect(200);

        const responseTime = Date.now() - startTime;
        
        // All queries should respond quickly
        expect(responseTime).toBeLessThan(100); // Less than 100ms
        expect(response.body).toHaveProperty('spots');
      }
    });

    test('should handle rapid spot status checks', async () => {
      // Check in some vehicles
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: `RAPID-${i}` });
      }

      // Rapid fire spot status checks
      const statusChecks = [];
      for (let floor = 1; floor <= 3; floor++) {
        for (let spot = 1; spot <= 5; spot++) {
          statusChecks.push(
            request(app).get(`/api/spots/F${floor}-A-${String(spot).padStart(3, '0')}`)
          );
        }
      }

      const startTime = Date.now();
      const results = await Promise.all(statusChecks);
      const totalTime = Date.now() - startTime;

      // All should return valid responses
      results.forEach(result => {
        expect([200, 404]).toContain(result.status);
      });

      // Should handle 15 concurrent requests efficiently
      expect(totalTime).toBeLessThan(1000); // Less than 1 second for all
    });
  });

  describe('Memory and Resource Management', () => {
    test('should not leak memory during extended operations', async () => {
      // This is a conceptual test - in real implementation would use memory profiling
      const iterations = 100;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        // Check in
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: `MEM-${i}` });

        // Query
        await request(app)
          .get(`/api/cars/MEM-${i}`);

        // Check out
        await request(app)
          .post('/api/checkout')
          .send({ licensePlate: `MEM-${i}` });

        // Track that operations complete successfully
        results.push(i);
      }

      // All iterations should complete
      expect(results.length).toBe(iterations);

      // Final state should be clean
      const finalState = await request(app)
        .get('/api/spots')
        .expect(200);

      expect(finalState.body.summary.occupied).toBe(0);
    });

    test('should handle maximum capacity efficiently', async () => {
      // Fill garage completely
      const checkIns = [];
      
      for (let i = 0; i < 125; i++) {
        const response = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: `MAX-${i}` });
        
        if (response.status === 201) {
          checkIns.push(`MAX-${i}`);
        }
      }

      expect(checkIns.length).toBe(125);

      // Verify rejection of additional vehicles
      const overflow = await request(app)
        .post('/api/checkin')
        .send({ licensePlate: 'OVERFLOW' })
        .expect(503);

      expect(overflow.body.error).toBe('No available spots');

      // System should still be responsive
      const queryStart = Date.now();
      await request(app)
        .get('/api/spots')
        .expect(200);
      const queryTime = Date.now() - queryStart;

      expect(queryTime).toBeLessThan(100); // Still fast even when full
    });
  });

  describe('Recovery and Resilience', () => {
    test('should recover from rapid state changes', async () => {
      // Rapidly alternate between check-ins and check-outs
      for (let cycle = 0; cycle < 10; cycle++) {
        // Check in 10 vehicles
        const checkInPromises = [];
        for (let i = 0; i < 10; i++) {
          checkInPromises.push(
            request(app)
              .post('/api/checkin')
              .send({ licensePlate: `CYCLE${cycle}-${i}` })
          );
        }
        await Promise.all(checkInPromises);

        // Immediately check them all out
        const checkOutPromises = [];
        for (let i = 0; i < 10; i++) {
          checkOutPromises.push(
            request(app)
              .post('/api/checkout')
              .send({ licensePlate: `CYCLE${cycle}-${i}` })
          );
        }
        await Promise.all(checkOutPromises);
      }

      // Verify system is in consistent state
      const finalState = await request(app)
        .get('/api/spots')
        .expect(200);

      expect(finalState.body.summary.occupied).toBe(0);
      expect(finalState.body.summary.available).toBe(125);
    });

    test('should handle malformed requests gracefully under load', async () => {
      const malformedRequests = [];

      // Send various malformed requests
      for (let i = 0; i < 20; i++) {
        malformedRequests.push(
          request(app)
            .post('/api/checkin')
            .send({ wrongField: 'value' }),
          request(app)
            .post('/api/checkin')
            .send({ licensePlate: null }),
          request(app)
            .post('/api/checkout')
            .send({}),
          request(app)
            .patch('/api/spots/INVALID/status')
            .send({ status: 'invalid' })
        );
      }

      const results = await Promise.all(malformedRequests);

      // All should return error responses, not crash
      results.forEach(result => {
        expect(result.status).toBeGreaterThanOrEqual(400);
        expect(result.status).toBeLessThan(600);
      });

      // System should still be functional
      await request(app)
        .get('/api/spots')
        .expect(200);
    });
  });
});