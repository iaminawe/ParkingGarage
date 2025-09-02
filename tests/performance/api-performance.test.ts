/**
 * Performance tests for API endpoints
 * 
 * Tests response times, throughput, memory usage, and scalability
 * under various load conditions.
 */

import request from 'supertest';
import { Application } from 'express';
import { DatabaseService } from '../../src/services/DatabaseService';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database-helpers';
import { createTestApp } from '../helpers/app-helpers';
import { generateAuthToken, createTestUser } from '../helpers/auth-helpers';
import { TestDataFactory } from '../factories/TestDataFactory';
import { VehicleType, VehicleStatus } from '@prisma/client';
import { performance } from 'perf_hooks';

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  FAST_RESPONSE: 100,
  NORMAL_RESPONSE: 500,
  SLOW_RESPONSE: 1000,
  DATABASE_QUERY: 200,
  BULK_OPERATION: 2000
};

describe('API Performance Tests', () => {
  let app: Application;
  let databaseService: DatabaseService;
  let authToken: string;
  let testDataFactory: TestDataFactory;

  beforeAll(async () => {
    databaseService = await setupTestDatabase();
    app = await createTestApp(databaseService);
    testDataFactory = new TestDataFactory(databaseService);
    
    const testUser = await createTestUser(databaseService, {
      email: 'test@example.com',
      role: 'ADMIN'
    });
    authToken = generateAuthToken(testUser);
  }, 30000);

  afterAll(async () => {
    await cleanupTestDatabase(databaseService);
  }, 30000);

  beforeEach(async () => {
    await testDataFactory.cleanup();
  });

  describe('Single Request Performance', () => {
    it('should respond to vehicle creation within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licensePlate: 'PERF001',
          vehicleType: VehicleType.STANDARD,
          make: 'Toyota',
          model: 'Camry'
        })
        .expect(201);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL_RESPONSE);
      expect(response.body.success).toBe(true);
    });

    it('should respond to vehicle lookup within acceptable time', async () => {
      // Create test vehicle
      await testDataFactory.createVehicle({
        licensePlate: 'LOOKUP001',
        vehicleType: VehicleType.STANDARD
      });

      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/vehicles/LOOKUP001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST_RESPONSE);
      expect(response.body.data.licensePlate).toBe('LOOKUP001');
    });

    it('should respond to vehicle search within acceptable time', async () => {
      // Create test data
      await testDataFactory.createVehicles([
        { licensePlate: 'SEARCH001', make: 'Toyota', vehicleType: VehicleType.STANDARD },
        { licensePlate: 'SEARCH002', make: 'Honda', vehicleType: VehicleType.COMPACT },
        { licensePlate: 'SEARCH003', make: 'Ford', vehicleType: VehicleType.SUV }
      ]);

      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/vehicles?make=Toyota')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY);
      expect(response.body.data.vehicles.length).toBe(1);
    });
  });

  describe('Large Dataset Performance', () => {
    beforeEach(async () => {
      // Create a large dataset for testing
      const vehicles = Array.from({ length: 1000 }, (_, i) => ({
        licensePlate: `LARGE${i.toString().padStart(4, '0')}`,
        vehicleType: i % 3 === 0 ? VehicleType.STANDARD : 
                     i % 3 === 1 ? VehicleType.COMPACT : VehicleType.SUV,
        make: ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes'][i % 5],
        model: ['Model A', 'Model B', 'Model C'][i % 3],
        status: i % 10 === 0 ? VehicleStatus.INACTIVE : VehicleStatus.ACTIVE
      }));
      
      // Create in batches to avoid overwhelming the database
      for (let i = 0; i < vehicles.length; i += 50) {
        const batch = vehicles.slice(i, i + 50);
        await testDataFactory.createVehicles(batch);
      }
    }, 60000);

    it('should handle pagination efficiently with large dataset', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/vehicles?page=1&limit=50')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY);
      expect(response.body.data.vehicles.length).toBe(50);
      expect(response.body.data.pagination.total).toBe(1000);
    });

    it('should maintain performance across different pages', async () => {
      const pages = [1, 5, 10, 20];
      const durations: number[] = [];
      
      for (const page of pages) {
        const startTime = performance.now();
        
        const response = await request(app)
          .get(`/api/vehicles?page=${page}&limit=25`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        const duration = performance.now() - startTime;
        durations.push(duration);
        
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY);
        expect(response.body.data.vehicles.length).toBe(25);
      }
      
      // Performance should be consistent across pages
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      const performanceVariation = (maxDuration - minDuration) / minDuration;
      
      expect(performanceVariation).toBeLessThan(2); // Less than 200% variation
    });

    it('should handle complex searches efficiently', async () => {
      const searchQueries = [
        { make: 'Toyota', vehicleType: VehicleType.STANDARD },
        { status: VehicleStatus.ACTIVE, make: 'Honda' },
        { licensePlate: 'LARGE', vehicleType: VehicleType.SUV },
        { model: 'Model A', status: VehicleStatus.ACTIVE }
      ];
      
      for (const query of searchQueries) {
        const queryString = Object.entries(query)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
        
        const startTime = performance.now();
        
        const response = await request(app)
          .get(`/api/vehicles?${queryString}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY);
        expect(response.body.data.vehicles).toBeDefined();
      }
    });

    it('should generate statistics efficiently', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/vehicles/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION);
      expect(response.body.data.total).toBe(1000);
      expect(response.body.data.byType).toBeDefined();
      expect(response.body.data.byStatus).toBeDefined();
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle multiple concurrent reads efficiently', async () => {
      // Create test data
      await testDataFactory.createVehicles([
        { licensePlate: 'CONC001', vehicleType: VehicleType.STANDARD },
        { licensePlate: 'CONC002', vehicleType: VehicleType.COMPACT },
        { licensePlate: 'CONC003', vehicleType: VehicleType.SUV }
      ]);

      const concurrentRequests = 10;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        request(app)
          .get(`/api/vehicles/CONC${(i % 3) + 1}`.padStart(7, '00'))
          .set('Authorization', `Bearer ${authToken}`)
      );
      
      const responses = await Promise.all(promises);
      const totalDuration = performance.now() - startTime;
      const averageDuration = totalDuration / concurrentRequests;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Average response time should be reasonable
      expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL_RESPONSE);
      
      // Total time should be less than sequential execution
      expect(totalDuration).toBeLessThan(concurrentRequests * PERFORMANCE_THRESHOLDS.FAST_RESPONSE);
    });

    it('should handle mixed read/write operations efficiently', async () => {
      const operations = [
        // Read operations
        () => request(app).get('/api/vehicles').set('Authorization', `Bearer ${authToken}`),
        () => request(app).get('/api/vehicles?make=Toyota').set('Authorization', `Bearer ${authToken}`),
        // Write operations
        () => request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            licensePlate: `MIX${Math.random().toString(36).substr(2, 5)}`,
            vehicleType: VehicleType.STANDARD
          })
      ];
      
      const startTime = performance.now();
      
      // Execute mixed operations concurrently
      const promises = Array.from({ length: 15 }, () => {
        const randomOperation = operations[Math.floor(Math.random() * operations.length)];
        return randomOperation();
      });
      
      const responses = await Promise.allSettled(promises);
      const duration = performance.now() - startTime;
      
      // Most operations should succeed
      const successfulOperations = responses.filter(
        result => result.status === 'fulfilled' && 
                  (result.value.status === 200 || result.value.status === 201)
      ).length;
      
      expect(successfulOperations).toBeGreaterThan(10);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION);
    });

    it('should maintain performance under high concurrent load', async () => {
      const concurrentUsers = 50;
      const requestsPerUser = 5;
      
      const startTime = performance.now();
      
      const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        const userRequests = Array.from({ length: requestsPerUser }, () => 
          request(app)
            .get('/api/vehicles?limit=10')
            .set('Authorization', `Bearer ${authToken}`)
        );
        
        return Promise.all(userRequests);
      });
      
      const allUserResponses = await Promise.all(userPromises);
      const totalDuration = performance.now() - startTime;
      
      // Calculate success rate
      const totalRequests = concurrentUsers * requestsPerUser;
      const successfulRequests = allUserResponses.flat().filter(
        response => response.status === 200
      ).length;
      
      const successRate = successfulRequests / totalRequests;
      
      expect(successRate).toBeGreaterThan(0.8); // At least 80% success rate
      expect(totalDuration).toBeLessThan(10000); // Complete within 10 seconds
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            licensePlate: `MEM${i.toString().padStart(3, '0')}`,
            vehicleType: VehicleType.STANDARD
          });
        
        await request(app)
          .get(`/api/vehicles/MEM${i.toString().padStart(3, '0')}`)
          .set('Authorization', `Bearer ${authToken}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle large response payloads efficiently', async () => {
      // Create vehicles with large data
      const largeVehicles = Array.from({ length: 100 }, (_, i) => ({
        licensePlate: `LARGE${i.toString().padStart(3, '0')}`,
        vehicleType: VehicleType.STANDARD,
        make: 'VeryLongMakeNameThatTakesUpSpace'.repeat(3),
        model: 'VeryLongModelNameThatTakesUpSpace'.repeat(3),
        ownerName: 'VeryLongOwnerNameThatTakesUpSpace'.repeat(3),
        notes: 'Very long notes that take up a lot of space. '.repeat(100)
      }));
      
      await testDataFactory.createVehicles(largeVehicles);
      
      const startTime = performance.now();
      const initialMemory = process.memoryUsage().heapUsed;
      
      const response = await request(app)
        .get('/api/vehicles?limit=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const duration = performance.now() - startTime;
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryUsed = finalMemory - initialMemory;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION);
      expect(response.body.data.vehicles.length).toBe(100);
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe('Database Query Performance', () => {
    beforeEach(async () => {
      // Create indexed test data
      const vehicles = Array.from({ length: 500 }, (_, i) => ({
        licensePlate: `DB${i.toString().padStart(4, '0')}`,
        vehicleType: [VehicleType.STANDARD, VehicleType.COMPACT, VehicleType.SUV][i % 3],
        make: ['Toyota', 'Honda', 'Ford', 'BMW'][i % 4],
        ownerName: `Owner ${i}`,
        status: i % 10 === 0 ? VehicleStatus.INACTIVE : VehicleStatus.ACTIVE
      }));
      
      await testDataFactory.createVehicles(vehicles);
    }, 30000);

    it('should perform indexed searches efficiently', async () => {
      // Test license plate search (should use index)
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/vehicles/DB0100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(50); // Very fast with index
      expect(response.body.data.licensePlate).toBe('DB0100');
    });

    it('should handle full-text searches efficiently', async () => {
      const searchTerms = ['Toyota', 'Owner 1', 'DB01'];
      
      for (const term of searchTerms) {
        const startTime = performance.now();
        
        const response = await request(app)
          .get(`/api/vehicles?search=${encodeURIComponent(term)}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY);
        expect(response.body.data.vehicles.length).toBeGreaterThan(0);
      }
    });

    it('should optimize complex filtering queries', async () => {
      const complexQueries = [
        { make: 'Toyota', vehicleType: VehicleType.STANDARD, status: VehicleStatus.ACTIVE },
        { ownerName: 'Owner', make: 'Honda' },
        { licensePlate: 'DB', vehicleType: VehicleType.SUV }
      ];
      
      for (const query of complexQueries) {
        const queryString = Object.entries(query)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
        
        const startTime = performance.now();
        
        const response = await request(app)
          .get(`/api/vehicles?${queryString}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY);
        expect(response.body.data).toBeDefined();
      }
    });
  });

  describe('API Response Time Consistency', () => {
    it('should maintain consistent response times under normal load', async () => {
      const measurements: number[] = [];
      const iterations = 50;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await request(app)
          .get('/api/vehicles?limit=20')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        const duration = performance.now() - startTime;
        measurements.push(duration);
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const average = measurements.reduce((a, b) => a + b) / measurements.length;
      const variance = measurements.reduce((sum, x) => sum + Math.pow(x - average, 2), 0) / measurements.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Response times should be consistent (low standard deviation)
      expect(standardDeviation).toBeLessThan(average * 0.5); // SD less than 50% of mean
      expect(average).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL_RESPONSE);
    });

    it('should handle traffic spikes gracefully', async () => {
      // Simulate traffic spike
      const spikeRequests = 20;
      const normalRequests = 5;
      
      // Normal baseline
      const baselineTimes: number[] = [];
      for (let i = 0; i < normalRequests; i++) {
        const startTime = performance.now();
        await request(app)
          .get('/api/vehicles?limit=10')
          .set('Authorization', `Bearer ${authToken}`);
        baselineTimes.push(performance.now() - startTime);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const baselineAverage = baselineTimes.reduce((a, b) => a + b) / baselineTimes.length;
      
      // Traffic spike
      const spikeStartTime = performance.now();
      const spikePromises = Array.from({ length: spikeRequests }, () => 
        request(app)
          .get('/api/vehicles?limit=10')
          .set('Authorization', `Bearer ${authToken}`)
      );
      
      const spikeResponses = await Promise.all(spikePromises);
      const spikeTotalTime = performance.now() - spikeStartTime;
      
      // All requests should succeed
      spikeResponses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Average response time during spike should not be drastically worse
      const spikeAverageTime = spikeTotalTime / spikeRequests;
      expect(spikeAverageTime).toBeLessThan(baselineAverage * 3); // At most 3x slower
    });
  });

  describe('Caching Performance', () => {
    it('should benefit from caching on repeated requests', async () => {
      await testDataFactory.createVehicle({
        licensePlate: 'CACHE001',
        vehicleType: VehicleType.STANDARD
      });
      
      // First request (cache miss)
      const firstRequestStart = performance.now();
      await request(app)
        .get('/api/vehicles/CACHE001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const firstRequestTime = performance.now() - firstRequestStart;
      
      // Second request (should be cached)
      const secondRequestStart = performance.now();
      await request(app)
        .get('/api/vehicles/CACHE001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const secondRequestTime = performance.now() - secondRequestStart;
      
      // Cached request should be significantly faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.8);
      expect(secondRequestTime).toBeLessThan(50); // Very fast with cache
    });
  });
});
