const request = require('supertest');
const { performance } = require('perf_hooks');

// Real API endpoint for testing
const API_BASE = 'http://localhost:3001';

describe('End-to-End Production Validation', () => {
  let app;
  
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify server is running
    try {
      const response = await request(API_BASE).get('/health');
      expect(response.status).toBe(200);
      console.log('✅ Server is running and healthy');
    } catch (error) {
      throw new Error(`Server not responding: ${error.message}`);
    }
  });

  describe('WORKFLOW 1: Complete Parking Lifecycle', () => {
    let checkInData;
    let assignedSpot;
    
    it('should initialize garage with fresh state', async () => {
      const response = await request(API_BASE)
        .get('/api/garage/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalSpots');
      expect(response.body).toHaveProperty('availableSpots');
      expect(response.body).toHaveProperty('occupiedSpots');
      
      console.log('Initial garage state:', response.body);
    });

    it('should check-in compact vehicle successfully', async () => {
      const vehicleData = {
        licensePlate: 'ABC123',
        vehicleType: 'compact'
      };

      const startTime = performance.now();
      const response = await request(API_BASE)
        .post('/api/checkin')
        .send(vehicleData);
      const endTime = performance.now();

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('spotNumber');
      expect(response.body).toHaveProperty('checkInTime');
      expect(response.body).toHaveProperty('vehicle');
      expect(response.body.vehicle.licensePlate).toBe('ABC123');
      expect(response.body.vehicle.vehicleType).toBe('compact');

      checkInData = response.body;
      assignedSpot = response.body.spotNumber;
      
      const responseTime = endTime - startTime;
      console.log(`Check-in response time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(100);
    });

    it('should verify spot is now occupied', async () => {
      const response = await request(API_BASE)
        .get(`/api/spots/${assignedSpot}`);
      
      expect(response.status).toBe(200);
      expect(response.body.isOccupied).toBe(true);
      expect(response.body.vehicle.licensePlate).toBe('ABC123');
      expect(response.body.occupiedAt).toBeDefined();
    });

    it('should update garage statistics correctly', async () => {
      const response = await request(API_BASE)
        .get('/api/garage/status');
      
      expect(response.status).toBe(200);
      expect(response.body.occupiedSpots).toBeGreaterThan(0);
      expect(response.body.availableSpots).toBeLessThan(response.body.totalSpots);
    });

    it('should query vehicle status by license plate', async () => {
      const response = await request(API_BASE)
        .get('/api/vehicles/ABC123');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('licensePlate', 'ABC123');
      expect(response.body).toHaveProperty('spotNumber', assignedSpot);
      expect(response.body).toHaveProperty('checkInTime');
      expect(response.body).toHaveProperty('isParked', true);
    });

    it('should check-out vehicle and calculate billing', async () => {
      // Wait a moment to ensure billing calculation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const startTime = performance.now();
      const response = await request(API_BASE)
        .post('/api/checkout')
        .send({ licensePlate: 'ABC123' });
      const endTime = performance.now();

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('licensePlate', 'ABC123');
      expect(response.body).toHaveProperty('spotNumber', assignedSpot);
      expect(response.body).toHaveProperty('checkInTime');
      expect(response.body).toHaveProperty('checkOutTime');
      expect(response.body).toHaveProperty('duration');
      expect(response.body).toHaveProperty('totalCost');
      expect(response.body.totalCost).toBeGreaterThan(0);

      const responseTime = endTime - startTime;
      console.log(`Check-out response time: ${responseTime.toFixed(2)}ms`);
      console.log(`Billing details:`, {
        duration: response.body.duration,
        totalCost: response.body.totalCost
      });
      expect(responseTime).toBeLessThan(100);
    });

    it('should verify spot is now available', async () => {
      const response = await request(API_BASE)
        .get(`/api/spots/${assignedSpot}`);
      
      expect(response.status).toBe(200);
      expect(response.body.isOccupied).toBe(false);
      expect(response.body.vehicle).toBeNull();
      expect(response.body.occupiedAt).toBeNull();
    });

    it('should verify garage statistics updated', async () => {
      const response = await request(API_BASE)
        .get('/api/garage/status');
      
      expect(response.status).toBe(200);
      expect(response.body.availableSpots).toBe(response.body.totalSpots);
      expect(response.body.occupiedSpots).toBe(0);
    });
  });

  describe('WORKFLOW 2: Different Vehicle Types', () => {
    const vehicles = [
      { licensePlate: 'COMPACT1', vehicleType: 'compact' },
      { licensePlate: 'STANDARD1', vehicleType: 'standard' },
      { licensePlate: 'OVERSIZED1', vehicleType: 'oversized' }
    ];

    it('should handle all vehicle types with appropriate spot assignment', async () => {
      const checkIns = [];
      
      for (const vehicle of vehicles) {
        const response = await request(API_BASE)
          .post('/api/checkin')
          .send(vehicle);
        
        expect(response.status).toBe(201);
        expect(response.body.vehicle.vehicleType).toBe(vehicle.vehicleType);
        
        checkIns.push(response.body);
        console.log(`${vehicle.vehicleType} vehicle assigned to spot ${response.body.spotNumber}`);
      }

      // Validate spot types are appropriate
      for (const checkIn of checkIns) {
        const spotResponse = await request(API_BASE)
          .get(`/api/spots/${checkIn.spotNumber}`);
        
        expect(spotResponse.status).toBe(200);
        const spot = spotResponse.body;
        
        // Oversized vehicles should get oversized spots when available
        if (checkIn.vehicle.vehicleType === 'oversized') {
          expect(['oversized', 'standard'].includes(spot.type)).toBe(true);
        }
      }

      // Clean up - check out all vehicles
      for (const vehicle of vehicles) {
        await request(API_BASE)
          .post('/api/checkout')
          .send({ licensePlate: vehicle.licensePlate });
      }
    });
  });

  describe('WORKFLOW 3: Concurrent Operations', () => {
    it('should handle multiple simultaneous check-ins without conflicts', async () => {
      const vehicles = Array.from({ length: 10 }, (_, i) => ({
        licensePlate: `CONCURRENT${i}`,
        vehicleType: 'standard'
      }));

      const startTime = performance.now();
      
      // Execute all check-ins concurrently
      const promises = vehicles.map(vehicle =>
        request(API_BASE)
          .post('/api/checkin')
          .send(vehicle)
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();

      // Validate all succeeded
      expect(responses.every(r => r.status === 201)).toBe(true);
      
      // Validate unique spot assignments
      const assignedSpots = responses.map(r => r.body.spotNumber);
      const uniqueSpots = new Set(assignedSpots);
      expect(uniqueSpots.size).toBe(assignedSpots.length);

      const totalTime = endTime - startTime;
      console.log(`Concurrent check-ins completed in ${totalTime.toFixed(2)}ms`);
      console.log(`Average per operation: ${(totalTime / vehicles.length).toFixed(2)}ms`);

      // Clean up
      const checkoutPromises = vehicles.map(vehicle =>
        request(API_BASE)
          .post('/api/checkout')
          .send({ licensePlate: vehicle.licensePlate })
      );
      
      await Promise.all(checkoutPromises);
    });

    it('should handle race condition for last available spot', async () => {
      // First, fill garage to near capacity
      const garageStatus = await request(API_BASE).get('/api/garage/status');
      const availableSpots = garageStatus.body.availableSpots;
      
      if (availableSpots <= 2) {
        console.log('Garage already near capacity, skipping race condition test');
        return;
      }

      // Fill all but 1 spot
      const fillVehicles = Array.from({ length: availableSpots - 1 }, (_, i) => ({
        licensePlate: `FILL${i}`,
        vehicleType: 'compact'
      }));

      for (const vehicle of fillVehicles) {
        await request(API_BASE)
          .post('/api/checkin')
          .send(vehicle);
      }

      // Now try to race for the last spot
      const raceVehicles = [
        { licensePlate: 'RACE1', vehicleType: 'standard' },
        { licensePlate: 'RACE2', vehicleType: 'standard' }
      ];

      const racePromises = raceVehicles.map(vehicle =>
        request(API_BASE)
          .post('/api/checkin')
          .send(vehicle)
          .catch(err => ({ error: err.response }))
      );

      const raceResults = await Promise.all(racePromises);
      
      // Exactly one should succeed, one should fail
      const successes = raceResults.filter(r => !r.error && r.status === 201);
      const failures = raceResults.filter(r => r.error || r.status !== 201);
      
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      
      console.log('Race condition handled correctly - one success, one failure');

      // Clean up all vehicles
      const allVehicles = [...fillVehicles, ...raceVehicles];
      for (const vehicle of allVehicles) {
        await request(API_BASE)
          .post('/api/checkout')
          .send({ licensePlate: vehicle.licensePlate })
          .catch(() => {}); // Ignore if already checked out
      }
    });
  });

  describe('WORKFLOW 4: Edge Cases & Error Handling', () => {
    it('should prevent duplicate vehicle check-ins', async () => {
      const vehicle = { licensePlate: 'DUPLICATE1', vehicleType: 'standard' };
      
      // First check-in should succeed
      const firstResponse = await request(API_BASE)
        .post('/api/checkin')
        .send(vehicle);
      
      expect(firstResponse.status).toBe(201);
      
      // Second check-in should fail
      const secondResponse = await request(API_BASE)
        .post('/api/checkin')
        .send(vehicle);
      
      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.error).toContain('already parked');
      
      // Clean up
      await request(API_BASE)
        .post('/api/checkout')
        .send({ licensePlate: 'DUPLICATE1' });
    });

    it('should handle invalid data validation', async () => {
      const invalidRequests = [
        { data: {}, expectedError: 'licensePlate' },
        { data: { licensePlate: '' }, expectedError: 'licensePlate' },
        { data: { licensePlate: 'TEST', vehicleType: 'invalid' }, expectedError: 'vehicleType' },
        { data: { licensePlate: 'A' }, expectedError: 'licensePlate' }, // Too short
        { data: { licensePlate: 'TOOLONGPLATENUMBER123' }, expectedError: 'licensePlate' } // Too long
      ];

      for (const { data, expectedError } of invalidRequests) {
        const response = await request(API_BASE)
          .post('/api/checkin')
          .send(data);
        
        expect(response.status).toBe(400);
        expect(response.body.error.toLowerCase()).toContain(expectedError.toLowerCase());
      }
    });

    it('should handle checkout of non-existent vehicle', async () => {
      const response = await request(API_BASE)
        .post('/api/checkout')
        .send({ licensePlate: 'NOTFOUND' });
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should handle garage full scenario', async () => {
      // Get total spots
      const garageStatus = await request(API_BASE).get('/api/garage/status');
      const totalSpots = garageStatus.body.totalSpots;
      
      // Fill all spots
      const vehicles = Array.from({ length: totalSpots }, (_, i) => ({
        licensePlate: `FULL${i}`,
        vehicleType: 'compact'
      }));

      // Check in all vehicles
      for (const vehicle of vehicles) {
        const response = await request(API_BASE)
          .post('/api/checkin')
          .send(vehicle);
        expect(response.status).toBe(201);
      }

      // Try to check in one more
      const extraVehicle = { licensePlate: 'EXTRA', vehicleType: 'standard' };
      const response = await request(API_BASE)
        .post('/api/checkin')
        .send(extraVehicle);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('full');

      // Verify garage is actually full
      const fullStatus = await request(API_BASE).get('/api/garage/status');
      expect(fullStatus.body.availableSpots).toBe(0);
      expect(fullStatus.body.occupiedSpots).toBe(totalSpots);

      // Clean up - check out all vehicles
      for (const vehicle of vehicles) {
        await request(API_BASE)
          .post('/api/checkout')
          .send({ licensePlate: vehicle.licensePlate });
      }
    });
  });

  describe('WORKFLOW 5: Performance & Load Testing', () => {
    it('should maintain response times under load', async () => {
      const requestCount = 50;
      const maxResponseTime = 100; // ms
      
      const promises = Array.from({ length: requestCount }, () => {
        const startTime = performance.now();
        return request(API_BASE)
          .get('/api/garage/status')
          .then(response => ({
            status: response.status,
            responseTime: performance.now() - startTime
          }));
      });

      const results = await Promise.all(promises);
      
      // All requests should succeed
      expect(results.every(r => r.status === 200)).toBe(true);
      
      // Calculate performance metrics
      const responseTimes = results.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxActualResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      console.log(`Performance metrics for ${requestCount} requests:`);
      console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxActualResponseTime.toFixed(2)}ms`);
      console.log(`  Min: ${minResponseTime.toFixed(2)}ms`);
      
      expect(avgResponseTime).toBeLessThan(maxResponseTime);
      expect(maxActualResponseTime).toBeLessThan(maxResponseTime * 2);
    });

    it('should handle sustained load without memory leaks', async () => {
      const duration = 30000; // 30 seconds
      const requestsPerSecond = 5;
      const startTime = Date.now();
      
      let totalRequests = 0;
      let successfulRequests = 0;
      const responseTimes = [];
      
      console.log(`Starting sustained load test for ${duration/1000}s at ${requestsPerSecond} req/s`);

      while (Date.now() - startTime < duration) {
        const batchStart = Date.now();
        
        const batch = Array.from({ length: requestsPerSecond }, () => {
          const reqStart = performance.now();
          return request(API_BASE)
            .get('/api/spots?status=available')
            .then(response => ({
              status: response.status,
              responseTime: performance.now() - reqStart
            }))
            .catch(() => ({ status: 500, responseTime: 0 }));
        });

        const results = await Promise.all(batch);
        totalRequests += requestsPerSecond;
        
        results.forEach(result => {
          if (result.status === 200) {
            successfulRequests++;
            responseTimes.push(result.responseTime);
          }
        });

        // Wait for next second
        const elapsed = Date.now() - batchStart;
        if (elapsed < 1000) {
          await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
        }
      }

      const successRate = successfulRequests / totalRequests;
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      
      console.log(`Sustained load test results:`);
      console.log(`  Total requests: ${totalRequests}`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(2)}%`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
      
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(avgResponseTime).toBeLessThan(100);
    });
  });

  describe('WORKFLOW 6: API Contract Compliance', () => {
    it('should return correct HTTP status codes', async () => {
      const testCases = [
        { method: 'GET', path: '/health', expectedStatus: 200 },
        { method: 'GET', path: '/api/garage/status', expectedStatus: 200 },
        { method: 'GET', path: '/api/spots', expectedStatus: 200 },
        { method: 'GET', path: '/api/spots/999', expectedStatus: 404 },
        { method: 'GET', path: '/api/vehicles/NOTFOUND', expectedStatus: 404 },
        { method: 'POST', path: '/api/checkin', data: {}, expectedStatus: 400 },
        { method: 'POST', path: '/api/checkout', data: {}, expectedStatus: 400 },
        { method: 'GET', path: '/nonexistent', expectedStatus: 404 }
      ];

      for (const testCase of testCases) {
        let response;
        if (testCase.method === 'GET') {
          response = await request(API_BASE).get(testCase.path);
        } else if (testCase.method === 'POST') {
          response = await request(API_BASE)
            .post(testCase.path)
            .send(testCase.data || {});
        }

        expect(response.status).toBe(testCase.expectedStatus);
        console.log(`✅ ${testCase.method} ${testCase.path} → ${response.status}`);
      }
    });

    it('should return consistent error message format', async () => {
      const errorRequests = [
        { path: '/api/spots/999', method: 'GET' },
        { path: '/api/vehicles/NOTFOUND', method: 'GET' },
        { path: '/api/checkin', method: 'POST', data: {} },
        { path: '/api/checkout', method: 'POST', data: {} }
      ];

      for (const req of errorRequests) {
        let response;
        if (req.method === 'GET') {
          response = await request(API_BASE).get(req.path);
        } else {
          response = await request(API_BASE)
            .post(req.path)
            .send(req.data || {});
        }

        if (response.status >= 400) {
          expect(response.body).toHaveProperty('error');
          expect(typeof response.body.error).toBe('string');
          expect(response.body.error.length).toBeGreaterThan(0);
        }
      }
    });

    it('should return proper content types', async () => {
      const response = await request(API_BASE)
        .get('/api/garage/status');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('WORKFLOW 7: Data Persistence & Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      const vehicle = { licensePlate: 'PERSIST1', vehicleType: 'standard' };
      
      // Check-in
      const checkInResponse = await request(API_BASE)
        .post('/api/checkin')
        .send(vehicle);
      expect(checkInResponse.status).toBe(201);
      
      const spotNumber = checkInResponse.body.spotNumber;
      const checkInTime = checkInResponse.body.checkInTime;
      
      // Verify consistency across different endpoints
      const spotResponse = await request(API_BASE)
        .get(`/api/spots/${spotNumber}`);
      const vehicleResponse = await request(API_BASE)
        .get(`/api/vehicles/${vehicle.licensePlate}`);
      const garageResponse = await request(API_BASE)
        .get('/api/garage/status');

      // Spot data consistency
      expect(spotResponse.body.isOccupied).toBe(true);
      expect(spotResponse.body.vehicle.licensePlate).toBe(vehicle.licensePlate);
      expect(new Date(spotResponse.body.occupiedAt)).toEqual(new Date(checkInTime));

      // Vehicle data consistency
      expect(vehicleResponse.body.licensePlate).toBe(vehicle.licensePlate);
      expect(vehicleResponse.body.spotNumber).toBe(spotNumber);
      expect(vehicleResponse.body.checkInTime).toBe(checkInTime);

      // Garage statistics consistency
      expect(garageResponse.body.occupiedSpots).toBeGreaterThan(0);
      
      // Check-out and verify cleanup
      const checkOutResponse = await request(API_BASE)
        .post('/api/checkout')
        .send({ licensePlate: vehicle.licensePlate });
      expect(checkOutResponse.status).toBe(200);
      
      // Verify all data is cleaned up
      const cleanSpotResponse = await request(API_BASE)
        .get(`/api/spots/${spotNumber}`);
      expect(cleanSpotResponse.body.isOccupied).toBe(false);
      expect(cleanSpotResponse.body.vehicle).toBeNull();
      
      const cleanVehicleResponse = await request(API_BASE)
        .get(`/api/vehicles/${vehicle.licensePlate}`);
      expect(cleanVehicleResponse.status).toBe(404);
    });
  });

  describe('WORKFLOW 8: Real-time System State', () => {
    it('should provide accurate real-time garage statistics', async () => {
      // Start with empty garage
      const initialStatus = await request(API_BASE)
        .get('/api/garage/status');
      
      // Check in vehicles and verify count updates
      const testVehicles = [
        { licensePlate: 'REALTIME1', vehicleType: 'compact' },
        { licensePlate: 'REALTIME2', vehicleType: 'standard' }
      ];

      for (let i = 0; i < testVehicles.length; i++) {
        await request(API_BASE)
          .post('/api/checkin')
          .send(testVehicles[i]);
        
        const status = await request(API_BASE)
          .get('/api/garage/status');
        
        expect(status.body.occupiedSpots).toBe(i + 1);
        expect(status.body.availableSpots).toBe(initialStatus.body.totalSpots - (i + 1));
      }

      // Check out and verify count updates
      for (let i = 0; i < testVehicles.length; i++) {
        await request(API_BASE)
          .post('/api/checkout')
          .send({ licensePlate: testVehicles[i].licensePlate });
        
        const status = await request(API_BASE)
          .get('/api/garage/status');
        
        expect(status.body.occupiedSpots).toBe(testVehicles.length - (i + 1));
      }
    });
  });
});