/**
 * Load Tests for Concurrent Operations
 * 
 * Tests the system's ability to handle high concurrent loads,
 * particularly for check-in and check-out operations.
 */

const request = require('supertest');
const app = require('../../src/app');
const TestDataFactory = require('../fixtures/testData');
const MemoryStore = require('../../src/storage/memoryStore');

describe('Concurrent Operations Load Tests', () => {
  let store;

  beforeEach(() => {
    // Reset memory store
    store = MemoryStore.getInstance();
    store.spots.clear();
    store.vehicles.clear();
    store.spotsByFloorBay.clear();
    store.occupiedSpots.clear();

    // Initialize garage with larger capacity for load testing
    initializeLargeGarage();
  });

  /**
   * Initialize garage with sufficient capacity for load testing
   */
  function initializeLargeGarage() {
    const SpotRepository = require('../../src/repositories/spotRepository');
    const spotRepo = new SpotRepository();

    // Create 5 floors, 5 bays each, 20 spots per bay = 500 total spots
    for (let floor = 1; floor <= 5; floor++) {
      for (let bay = 1; bay <= 5; bay++) {
        for (let spot = 1; spot <= 20; spot++) {
          let spotType = 'standard';
          const position = ((bay - 1) * 20 + spot - 1) % 10;
          if (position < 2) spotType = 'compact';
          if (position >= 9) spotType = 'oversized';

          const features = [];
          if (spot === 1) features.push('ev_charging');
          if (spot === 2 && floor === 1) features.push('handicap');

          spotRepo.createSpot(floor, bay, spot, spotType, features);
        }
      }
    }
  }

  describe('Concurrent Check-in Operations', () => {
    test('should handle 50 concurrent check-ins without conflicts', async () => {
      const vehicleData = TestDataFactory.createPerformanceTestData(50);
      
      const startTime = Date.now();
      
      // Create 50 concurrent check-in requests
      const promises = vehicleData.map(data => 
        request(app)
          .post('/api/checkin')
          .send(data)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // Verify all check-ins succeeded
      const successfulCheckins = results.filter(res => res.status === 201);
      expect(successfulCheckins).toHaveLength(50);
      
      // Verify all got different spots
      const assignedSpots = successfulCheckins.map(res => res.body.spotId);
      const uniqueSpots = new Set(assignedSpots);
      expect(uniqueSpots.size).toBe(assignedSpots.length);
      
      // Performance metrics
      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / 50;
      
      console.log(`50 concurrent check-ins completed in ${totalTime}ms`);
      console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
      
      // Performance assertions
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(averageResponseTime).toBeLessThan(100); // Average response under 100ms
    }, 10000); // 10 second timeout

    test('should handle 100 concurrent check-ins with mixed vehicle types', async () => {
      const vehicleData = TestDataFactory.createPerformanceTestData(100);
      
      const startTime = Date.now();
      
      const promises = vehicleData.map(data => 
        request(app)
          .post('/api/checkin')
          .send(data)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      const successfulCheckins = results.filter(res => res.status === 201);
      expect(successfulCheckins).toHaveLength(100);
      
      // Verify spot assignment algorithm handles different vehicle types correctly
      const assignmentByType = {
        compact: successfulCheckins.filter(res => res.body.vehicle.type === 'compact').length,
        standard: successfulCheckins.filter(res => res.body.vehicle.type === 'standard').length,
        oversized: successfulCheckins.filter(res => res.body.vehicle.type === 'oversized').length
      };
      
      expect(assignmentByType.compact).toBeGreaterThan(0);
      expect(assignmentByType.standard).toBeGreaterThan(0);
      expect(assignmentByType.oversized).toBeGreaterThan(0);
      
      const totalTime = endTime - startTime;
      console.log(`100 concurrent check-ins completed in ${totalTime}ms`);
      
      expect(totalTime).toBeLessThan(8000); // Should complete within 8 seconds
    }, 15000); // 15 second timeout

    test('should handle concurrent check-ins when approaching capacity', async () => {
      // Fill garage to 80% capacity first
      const initialVehicles = TestDataFactory.createPerformanceTestData(400);
      
      for (let i = 0; i < initialVehicles.length; i += 50) {
        const batch = initialVehicles.slice(i, i + 50);
        const batchPromises = batch.map(data => 
          request(app).post('/api/checkin').send(data)
        );
        await Promise.all(batchPromises);
      }
      
      // Now try 50 more concurrent check-ins when garage is mostly full
      const additionalVehicles = Array.from({ length: 50 }, (_, i) => ({
        licensePlate: `NEAR${String(i + 1).padStart(3, '0')}`,
        vehicleType: ['compact', 'standard', 'oversized'][i % 3],
        rateType: 'hourly'
      }));
      
      const promises = additionalVehicles.map(data => 
        request(app)
          .post('/api/checkin')
          .send(data)
      );

      const results = await Promise.all(promises);
      
      // Some should succeed, some should fail due to capacity
      const successful = results.filter(res => res.status === 201);
      const failed = results.filter(res => res.status === 503);
      
      expect(successful.length + failed.length).toBe(50);
      expect(successful.length).toBeGreaterThan(0); // At least some should succeed
      
      // Verify failed requests have proper error messages
      failed.forEach(res => {
        expect(res.body.errorCode).toBe('GARAGE_FULL');
      });
    }, 20000); // 20 second timeout
  });

  describe('Concurrent Check-out Operations', () => {
    beforeEach(async () => {
      // Check in 100 vehicles first
      const vehicleData = TestDataFactory.createPerformanceTestData(100);
      
      const checkinPromises = vehicleData.map(data => 
        request(app)
          .post('/api/checkin')
          .send(data)
      );

      await Promise.all(checkinPromises);
    });

    test('should handle 50 concurrent check-outs without conflicts', async () => {
      // Get license plates of first 50 vehicles
      const licensePlates = Array.from({ length: 50 }, (_, i) => 
        `PERF${String(i + 1).padStart(3, '0')}`
      );
      
      const startTime = Date.now();
      
      const promises = licensePlates.map(licensePlate => 
        request(app)
          .post('/api/checkout')
          .send({ 
            licensePlate,
            paymentMethod: 'credit_card'
          })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // Verify all check-outs succeeded
      const successfulCheckouts = results.filter(res => res.status === 200);
      expect(successfulCheckouts).toHaveLength(50);
      
      // Verify billing calculations
      successfulCheckouts.forEach(res => {
        expect(res.body.billing).toBeTruthy();
        expect(res.body.billing.totalAmount).toBeGreaterThan(0);
        expect(res.body.billing.billableHours).toBeGreaterThan(0);
      });
      
      const totalTime = endTime - startTime;
      console.log(`50 concurrent check-outs completed in ${totalTime}ms`);
      
      expect(totalTime).toBeLessThan(5000);
    }, 15000);
  });

  describe('Mixed Concurrent Operations', () => {
    test('should handle simultaneous check-ins and check-outs', async () => {
      // Pre-populate with 50 vehicles for checkout
      const existingVehicles = TestDataFactory.createPerformanceTestData(50);
      const checkinPromises = existingVehicles.map(data => 
        request(app).post('/api/checkin').send(data)
      );
      await Promise.all(checkinPromises);
      
      // Prepare new vehicles for check-in
      const newVehicles = Array.from({ length: 25 }, (_, i) => ({
        licensePlate: `NEW${String(i + 1).padStart(3, '0')}`,
        vehicleType: ['compact', 'standard', 'oversized'][i % 3],
        rateType: 'hourly'
      }));
      
      // Prepare vehicles for check-out (first 25 existing)
      const checkoutPlates = existingVehicles.slice(0, 25).map(v => v.licensePlate);
      
      const startTime = Date.now();
      
      // Create mixed operations
      const checkinPromises = newVehicles.map(data => 
        request(app).post('/api/checkin').send(data)
      );
      
      const checkoutPromises = checkoutPlates.map(licensePlate => 
        request(app).post('/api/checkout').send({ 
          licensePlate,
          paymentMethod: 'credit_card'
        })
      );
      
      // Execute all operations concurrently
      const allPromises = [...checkinPromises, ...checkoutPromises];
      const results = await Promise.all(allPromises);
      
      const endTime = Date.now();
      
      // Verify results
      const checkinResults = results.slice(0, 25);
      const checkoutResults = results.slice(25);
      
      const successfulCheckins = checkinResults.filter(res => res.status === 201);
      const successfulCheckouts = checkoutResults.filter(res => res.status === 200);
      
      expect(successfulCheckins).toHaveLength(25);
      expect(successfulCheckouts).toHaveLength(25);
      
      const totalTime = endTime - startTime;
      console.log(`25 check-ins + 25 check-outs completed in ${totalTime}ms`);
      
      expect(totalTime).toBeLessThan(6000);
    }, 20000);
  });

  describe('Stress Tests', () => {
    test('should maintain data consistency under high load', async () => {
      const vehicleCount = 200;
      const vehicleData = TestDataFactory.createPerformanceTestData(vehicleCount);
      
      // Execute check-ins in batches to avoid overwhelming the system
      const batchSize = 25;
      const batches = [];
      
      for (let i = 0; i < vehicleData.length; i += batchSize) {
        batches.push(vehicleData.slice(i, i + batchSize));
      }
      
      const startTime = Date.now();
      
      for (const batch of batches) {
        const batchPromises = batch.map(data => 
          request(app).post('/api/checkin').send(data)
        );
        await Promise.all(batchPromises);
      }
      
      const endTime = Date.now();
      
      // Verify data consistency
      const statsResponse = await request(app).get('/api/checkin/stats');
      expect(statsResponse.status).toBe(200);
      
      const stats = statsResponse.body.statistics;
      expect(stats.vehicles.totalParked).toBeLessThanOrEqual(vehicleCount);
      expect(stats.occupancy.occupiedSpots).toBe(stats.vehicles.totalParked);
      
      const totalTime = endTime - startTime;
      console.log(`${vehicleCount} check-ins in batches completed in ${totalTime}ms`);
      
      // Check that system maintains reasonable performance even under stress
      expect(totalTime).toBeLessThan(30000); // 30 seconds max
    }, 35000);

    test('should handle memory usage efficiently during high load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform 100 check-ins and check-outs
      const operations = [];
      
      // Check-ins
      for (let i = 0; i < 100; i++) {
        operations.push(
          request(app)
            .post('/api/checkin')
            .send({
              licensePlate: `MEM${String(i + 1).padStart(3, '0')}`,
              vehicleType: ['compact', 'standard', 'oversized'][i % 3],
              rateType: 'hourly'
            })
        );
      }
      
      await Promise.all(operations);
      
      // Check-outs
      const checkoutOps = [];
      for (let i = 0; i < 100; i++) {
        checkoutOps.push(
          request(app)
            .post('/api/checkout')
            .send({
              licensePlate: `MEM${String(i + 1).padStart(3, '0')}`,
              paymentMethod: 'credit_card'
            })
        );
      }
      
      await Promise.all(checkoutOps);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory usage should not increase dramatically
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      
      // Memory increase should be reasonable (less than 50MB for 200 operations)
      expect(memoryIncreaseMB).toBeLessThan(50);
    }, 25000);
  });

  describe('Performance Benchmarks', () => {
    test('should meet response time requirements under normal load', async () => {
      const operationCount = 100;
      const responseTimes = [];
      
      for (let i = 0; i < operationCount; i++) {
        const startTime = Date.now();
        
        const response = await request(app)
          .post('/api/checkin')
          .send({
            licensePlate: `BENCH${String(i + 1).padStart(3, '0')}`,
            vehicleType: 'standard',
            rateType: 'hourly'
          });
        
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
        
        expect(response.status).toBe(201);
      }
      
      // Calculate performance metrics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      // Calculate 95th percentile
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95ResponseTime = sortedTimes[p95Index];
      
      console.log(`Performance Metrics for ${operationCount} sequential operations:`);
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Min response time: ${minResponseTime}ms`);
      console.log(`Max response time: ${maxResponseTime}ms`);
      console.log(`95th percentile: ${p95ResponseTime}ms`);
      
      // Performance assertions
      expect(avgResponseTime).toBeLessThan(50); // Average under 50ms
      expect(p95ResponseTime).toBeLessThan(100); // 95% under 100ms
      expect(maxResponseTime).toBeLessThan(200); // Max under 200ms
    }, 30000);
  });
});