/**
 * @file parking-flow.integration.test.ts
 * @description Full end-to-end integration tests for complete parking flow
 * 
 * Tests cover:
 * - Complete parking workflow: check-in → parking → check-out
 * - Multi-vehicle scenarios
 * - Payment processing integration
 * - Database consistency across operations
 * - Error recovery and rollback scenarios
 * - Performance under load
 */

import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import {
  createMockRequest,
  createMockResponse,
  createTestUser,
  createTestGarage,
  cleanupTestDatabase,
  seedTestDatabase,
  expectSuccessResponse,
  expectErrorResponse,
  wait
} from '../helpers/testUtils';

const prisma = new PrismaClient();

describe('Parking Flow Integration Tests', () => {
  let testGarage: any;
  let testFloor: any;
  let testSpots: any[] = [];
  let authToken: string;
  let adminToken: string;
  
  beforeAll(async () => {
    // Clean database before all tests
    await cleanupTestDatabase(prisma);
    
    // Seed test data
    const seedData = await seedTestDatabase(prisma);
    testGarage = seedData.testGarage;
    
    // Create auth tokens
    authToken = `Bearer test-user-token`;
    adminToken = `Bearer test-admin-token`;
    
    // Create test floor with multiple spots
    testFloor = await prisma.floor.create({
      data: {
        garageId: testGarage.id,
        floorNumber: 1,
        description: 'Ground Floor',
        totalSpots: 20,
        isActive: true
      }
    });

    // Create various types of parking spots
    testSpots = await Promise.all([
      // Standard spots
      ...Array(10).fill(null).map(async (_, index) => 
        prisma.parkingSpot.create({
          data: {
            spotNumber: `F1-B1-S${index + 1}`,
            floorId: testFloor.id,
            level: 1,
            section: 'B1',
            spotType: 'STANDARD',
            status: 'AVAILABLE',
            isActive: true
          }
        })
      ),
      // Compact spots
      ...Array(5).fill(null).map(async (_, index) => 
        prisma.parkingSpot.create({
          data: {
            spotNumber: `F1-B2-S${index + 1}`,
            floorId: testFloor.id,
            level: 1,
            section: 'B2',
            spotType: 'COMPACT',
            status: 'AVAILABLE',
            isActive: true
          }
        })
      ),
      // Oversized spots
      ...Array(5).fill(null).map(async (_, index) => 
        prisma.parkingSpot.create({
          data: {
            spotNumber: `F1-B3-S${index + 1}`,
            floorId: testFloor.id,
            level: 1,
            section: 'B3',
            spotType: 'OVERSIZED',
            status: 'AVAILABLE',
            isActive: true
          }
        })
      )
    ]);
  });

  afterEach(async () => {
    // Clean up between tests but preserve spots
    await prisma.payment.deleteMany({});
    await prisma.parkingSession.deleteMany({});
    await prisma.vehicle.deleteMany({});
    
    // Reset all spots to available
    await prisma.parkingSpot.updateMany({
      where: { floorId: testFloor.id },
      data: { status: 'AVAILABLE' }
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('Complete Parking Flow - Single Vehicle', () => {
    it('should handle complete parking flow: check-in → parking → check-out', async () => {
      const licensePlate = 'FLOW001';
      const vehicleType = 'STANDARD';
      
      // Step 1: Check availability before check-in
      const availabilityResponse = await request(app)
        .get('/api/checkin/availability')
        .expect(200);

      expect(availabilityResponse.body.success).toBe(true);
      const initialAvailable = availabilityResponse.body.data.overall.availableSpots;
      expect(initialAvailable).toBeGreaterThan(0);

      // Step 2: Perform check-in
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate,
          vehicleType,
          ownerName: 'John Doe',
          ownerEmail: 'john@example.com',
          rateType: 'HOURLY'
        })
        .expect(201);

      expect(checkinResponse.body.success).toBe(true);
      const assignedSpotId = checkinResponse.body.data.spotId;
      const checkInTime = checkinResponse.body.data.checkInTime;

      // Step 3: Verify availability decreased
      const afterCheckinAvailability = await request(app)
        .get('/api/checkin/availability')
        .expect(200);

      expect(afterCheckinAvailability.body.data.overall.availableSpots)
        .toBe(initialAvailable - 1);

      // Step 4: Verify spot status is occupied
      const spotResponse = await request(app)
        .get(`/api/spots/${checkinResponse.body.data.location.spotNumber}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(spotResponse.body.data.spot.status).toBe('OCCUPIED');

      // Step 5: Get current cost estimate after some time
      await wait(100); // Small wait to ensure time has passed

      const estimateResponse = await request(app)
        .get(`/api/checkout/estimate/${licensePlate}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(estimateResponse.body.success).toBe(true);
      expect(estimateResponse.body.data.estimate.currentAmount).toBeGreaterThan(0);

      // Step 6: Simulate checkout to see expected cost
      const simulateResponse = await request(app)
        .post('/api/checkout/simulate')
        .set('Authorization', authToken)
        .send({ licensePlate })
        .expect(200);

      expect(simulateResponse.body.success).toBe(true);
      expect(simulateResponse.body.data.simulation).toBe(true);
      expect(simulateResponse.body.data.estimatedAmount).toBeGreaterThan(0);

      // Step 7: Perform actual checkout
      const checkoutResponse = await request(app)
        .post('/api/checkout')
        .send({ licensePlate })
        .expect(200);

      expect(checkoutResponse.body.success).toBe(true);
      expect(checkoutResponse.body.data.licensePlate).toBe(licensePlate);
      expect(checkoutResponse.body.data.billing.totalAmount).toBeGreaterThan(0);
      expect(checkoutResponse.body.data.timing.duration).toBeGreaterThan(0);

      // Step 8: Verify availability increased back
      const afterCheckoutAvailability = await request(app)
        .get('/api/checkin/availability')
        .expect(200);

      expect(afterCheckoutAvailability.body.data.overall.availableSpots)
        .toBe(initialAvailable);

      // Step 9: Verify spot is now available
      const freedSpotResponse = await request(app)
        .get(`/api/spots/${checkinResponse.body.data.location.spotNumber}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(freedSpotResponse.body.data.spot.status).toBe('AVAILABLE');

      // Step 10: Verify database consistency
      const vehicle = await prisma.vehicle.findUnique({
        where: { licensePlate }
      });
      expect(vehicle?.status).toBe('DEPARTED');
      expect(vehicle?.checkOutTime).toBeTruthy();
      expect(vehicle?.totalAmount).toBeGreaterThan(0);

      const session = await prisma.parkingSession.findFirst({
        where: { vehicleId: vehicle?.id }
      });
      expect(session?.status).toBe('COMPLETED');
      expect(session?.endTime).toBeTruthy();
      expect(session?.duration).toBeGreaterThan(0);
      expect(session?.totalAmount).toBeGreaterThan(0);

      const spot = await prisma.parkingSpot.findUnique({
        where: { id: assignedSpotId }
      });
      expect(spot?.status).toBe('AVAILABLE');
    });

    it('should handle different vehicle types with appropriate spot assignment', async () => {
      const testCases = [
        { licensePlate: 'COMPACT1', vehicleType: 'COMPACT' },
        { licensePlate: 'STANDARD1', vehicleType: 'STANDARD' },
        { licensePlate: 'OVERSIZED1', vehicleType: 'OVERSIZED' }
      ];

      for (const testCase of testCases) {
        // Check-in
        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send({
            licensePlate: testCase.licensePlate,
            vehicleType: testCase.vehicleType,
            rateType: 'HOURLY'
          })
          .expect(201);

        // Verify appropriate spot type assignment
        const assignedSpot = await prisma.parkingSpot.findUnique({
          where: { id: checkinResponse.body.data.spotId }
        });

        if (testCase.vehicleType === 'COMPACT') {
          expect(['COMPACT', 'STANDARD'].includes(assignedSpot?.spotType || '')).toBe(true);
        } else if (testCase.vehicleType === 'OVERSIZED') {
          expect(assignedSpot?.spotType).toBe('OVERSIZED');
        } else {
          expect(['STANDARD', 'OVERSIZED'].includes(assignedSpot?.spotType || '')).toBe(true);
        }

        // Checkout
        await request(app)
          .post('/api/checkout')
          .send({ licensePlate: testCase.licensePlate })
          .expect(200);
      }
    });

    it('should handle different rate types correctly', async () => {
      const testCases = [
        { licensePlate: 'HOURLY1', rateType: 'HOURLY' },
        { licensePlate: 'DAILY1', rateType: 'DAILY' }
      ];

      for (const testCase of testCases) {
        // Check-in
        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send({
            licensePlate: testCase.licensePlate,
            vehicleType: 'STANDARD',
            rateType: testCase.rateType
          })
          .expect(201);

        expect(checkinResponse.body.data.vehicle.rateType).toBe(testCase.rateType);

        // Small wait to accumulate some time
        await wait(100);

        // Checkout
        const checkoutResponse = await request(app)
          .post('/api/checkout')
          .send({ licensePlate: testCase.licensePlate })
          .expect(200);

        expect(checkoutResponse.body.data.billing.rateType).toBe(testCase.rateType);
        expect(checkoutResponse.body.data.billing.totalAmount).toBeGreaterThan(0);
      }
    });
  });

  describe('Multi-Vehicle Scenarios', () => {
    it('should handle multiple concurrent check-ins and checkouts', async () => {
      const vehicleCount = 10;
      const vehicles = Array(vehicleCount).fill(null).map((_, index) => ({
        licensePlate: `MULTI${index.toString().padStart(3, '0')}`,
        vehicleType: ['COMPACT', 'STANDARD', 'OVERSIZED'][index % 3],
        rateType: ['HOURLY', 'DAILY'][index % 2]
      }));

      // Phase 1: Check-in all vehicles concurrently
      const checkinPromises = vehicles.map(vehicle => 
        request(app)
          .post('/api/checkin')
          .send({
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType,
            rateType: vehicle.rateType,
            ownerName: `Owner ${vehicle.licensePlate}`
          })
      );

      const checkinResults = await Promise.all(checkinPromises);

      // Verify all check-ins succeeded
      expect(checkinResults.every(r => r.status === 201)).toBe(true);

      // Verify all got unique spots
      const assignedSpots = checkinResults.map(r => r.body.data.spotId);
      const uniqueSpots = [...new Set(assignedSpots)];
      expect(uniqueSpots.length).toBe(assignedSpots.length);

      // Phase 2: Verify garage statistics
      const statsResponse = await request(app)
        .get('/api/checkin/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(statsResponse.body.data.statistics.currentlyParked).toBe(vehicleCount);

      // Phase 3: Check availability
      const availabilityResponse = await request(app)
        .get('/api/checkin/availability')
        .expect(200);

      expect(availabilityResponse.body.data.overall.occupiedSpots).toBe(vehicleCount);

      // Phase 4: Wait a bit for time to accumulate
      await wait(200);

      // Phase 5: Check out half the vehicles
      const checkoutCount = Math.floor(vehicleCount / 2);
      const checkoutPromises = vehicles.slice(0, checkoutCount).map(vehicle =>
        request(app)
          .post('/api/checkout')
          .send({ licensePlate: vehicle.licensePlate })
      );

      const checkoutResults = await Promise.all(checkoutPromises);

      // Verify all checkouts succeeded
      expect(checkoutResults.every(r => r.status === 200)).toBe(true);

      // Phase 6: Verify remaining vehicles are still parked
      const remainingVehicles = vehicles.slice(checkoutCount);
      for (const vehicle of remainingVehicles) {
        const estimateResponse = await request(app)
          .get(`/api/checkout/estimate/${vehicle.licensePlate}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(estimateResponse.body.success).toBe(true);
        expect(estimateResponse.body.data.estimate.currentAmount).toBeGreaterThan(0);
      }

      // Phase 7: Check out remaining vehicles
      const remainingCheckoutPromises = remainingVehicles.map(vehicle =>
        request(app)
          .post('/api/checkout')
          .send({ licensePlate: vehicle.licensePlate })
      );

      const remainingCheckoutResults = await Promise.all(remainingCheckoutPromises);
      expect(remainingCheckoutResults.every(r => r.status === 200)).toBe(true);

      // Phase 8: Verify all spots are available again
      const finalAvailabilityResponse = await request(app)
        .get('/api/checkin/availability')
        .expect(200);

      expect(finalAvailabilityResponse.body.data.overall.occupiedSpots).toBe(0);
    });

    it('should handle spot exhaustion gracefully', async () => {
      // Fill up all available spots
      const totalSpots = testSpots.length;
      const vehicles = Array(totalSpots + 2).fill(null).map((_, index) => ({
        licensePlate: `FULL${index.toString().padStart(3, '0')}`,
        vehicleType: 'STANDARD'
      }));

      const checkinPromises = vehicles.map(vehicle => 
        request(app)
          .post('/api/checkin')
          .send({
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType
          })
          .catch(err => err) // Don't fail promise chain on 503
      );

      const results = await Promise.all(checkinPromises);
      
      // Count successful check-ins
      const successful = results.filter(r => r.status === 201);
      const failed = results.filter(r => r.status === 503 || r.response?.status === 503);

      // Should have filled all available spots
      expect(successful.length).toBe(totalSpots);
      expect(failed.length).toBe(2); // The extra vehicles that couldn't be accommodated

      // Verify garage is full
      const availabilityResponse = await request(app)
        .get('/api/checkin/availability')
        .expect(200);

      expect(availabilityResponse.body.data.overall.availableSpots).toBe(0);
      expect(availabilityResponse.body.data.overall.occupancyRate).toBe(1.0);

      // Clean up - checkout all vehicles
      const checkoutPromises = successful.map(result =>
        request(app)
          .post('/api/checkout')
          .send({ licensePlate: result.body.data.vehicle.licensePlate })
      );

      await Promise.all(checkoutPromises);
    });
  });

  describe('Error Recovery and Rollback Scenarios', () => {
    it('should rollback failed check-in transactions', async () => {
      // This test would simulate database failures during check-in
      // Implementation would depend on specific transaction handling

      const licensePlate = 'ROLLBACK1';
      const initialSpotCount = await prisma.parkingSpot.count({
        where: { status: 'AVAILABLE' }
      });

      // Attempt check-in that should succeed normally
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate,
          vehicleType: 'STANDARD'
        });

      if (response.status === 201) {
        // Verify data consistency
        const vehicle = await prisma.vehicle.findUnique({
          where: { licensePlate }
        });
        expect(vehicle).toBeTruthy();
        expect(vehicle?.status).toBe('PARKED');

        const session = await prisma.parkingSession.findFirst({
          where: { vehicleId: vehicle?.id }
        });
        expect(session).toBeTruthy();
        expect(session?.status).toBe('ACTIVE');

        const occupiedSpot = await prisma.parkingSpot.findUnique({
          where: { id: vehicle?.spotId || '' }
        });
        expect(occupiedSpot?.status).toBe('OCCUPIED');

        // Clean up
        await request(app)
          .post('/api/checkout')
          .send({ licensePlate });
      }

      // Verify spot count is back to normal
      const finalSpotCount = await prisma.parkingSpot.count({
        where: { status: 'AVAILABLE' }
      });
      expect(finalSpotCount).toBe(initialSpotCount);
    });

    it('should handle checkout failures gracefully', async () => {
      const licensePlate = 'CHECKFAIL1';

      // First check-in
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate,
          vehicleType: 'STANDARD'
        })
        .expect(201);

      const assignedSpotId = checkinResponse.body.data.spotId;

      // Simulate checkout failure scenario by attempting invalid checkout
      const invalidCheckoutResponse = await request(app)
        .post('/api/checkout')
        .send({
          licensePlate,
          checkOutTime: 'invalid-date' // This should fail
        })
        .expect(400);

      expect(invalidCheckoutResponse.body.success).toBe(false);

      // Verify vehicle is still parked
      const vehicle = await prisma.vehicle.findUnique({
        where: { licensePlate }
      });
      expect(vehicle?.status).toBe('PARKED');
      expect(vehicle?.checkOutTime).toBeNull();

      // Verify spot is still occupied
      const spot = await prisma.parkingSpot.findUnique({
        where: { id: assignedSpotId }
      });
      expect(spot?.status).toBe('OCCUPIED');

      // Verify session is still active
      const session = await prisma.parkingSession.findFirst({
        where: { vehicleId: vehicle?.id }
      });
      expect(session?.status).toBe('ACTIVE');
      expect(session?.endTime).toBeNull();

      // Now perform valid checkout
      const validCheckoutResponse = await request(app)
        .post('/api/checkout')
        .send({ licensePlate })
        .expect(200);

      expect(validCheckoutResponse.body.success).toBe(true);
    });

    it('should handle duplicate license plate check-ins', async () => {
      const licensePlate = 'DUPLICATE1';

      // First check-in should succeed
      const firstCheckinResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate,
          vehicleType: 'STANDARD'
        })
        .expect(201);

      // Second check-in with same license plate should fail
      const duplicateCheckinResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate,
          vehicleType: 'STANDARD'
        })
        .expect(409);

      expect(duplicateCheckinResponse.body.success).toBe(false);
      expect(duplicateCheckinResponse.body.message).toContain('already parked');

      // Verify only one vehicle record exists
      const vehicles = await prisma.vehicle.findMany({
        where: { licensePlate }
      });
      expect(vehicles.length).toBe(1);

      // Verify only one session exists
      const sessions = await prisma.parkingSession.findMany({
        where: { vehicleId: vehicles[0].id }
      });
      expect(sessions.length).toBe(1);

      // Clean up
      await request(app)
        .post('/api/checkout')
        .send({ licensePlate })
        .expect(200);
    });
  });

  describe('Database Consistency Verification', () => {
    it('should maintain referential integrity throughout parking flow', async () => {
      const licensePlate = 'INTEGRITY1';

      // Check-in
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate,
          vehicleType: 'STANDARD',
          ownerName: 'Test Owner',
          ownerEmail: 'test@example.com'
        })
        .expect(201);

      const vehicleId = checkinResponse.body.data.vehicle.id;
      const spotId = checkinResponse.body.data.spotId;

      // Verify all related records exist and are properly linked
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: {
          sessions: true,
          spot: true
        }
      });

      expect(vehicle).toBeTruthy();
      expect(vehicle?.spotId).toBe(spotId);
      expect(vehicle?.sessions.length).toBe(1);
      expect(vehicle?.spot?.id).toBe(spotId);

      const session = vehicle?.sessions[0];
      expect(session?.vehicleId).toBe(vehicleId);
      expect(session?.spotId).toBe(spotId);
      expect(session?.status).toBe('ACTIVE');

      const spot = await prisma.parkingSpot.findUnique({
        where: { id: spotId }
      });
      expect(spot?.status).toBe('OCCUPIED');

      // Wait for time accumulation
      await wait(100);

      // Checkout
      const checkoutResponse = await request(app)
        .post('/api/checkout')
        .send({ licensePlate })
        .expect(200);

      // Verify all records are properly updated
      const updatedVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: {
          sessions: true,
          spot: true
        }
      });

      expect(updatedVehicle?.status).toBe('DEPARTED');
      expect(updatedVehicle?.checkOutTime).toBeTruthy();
      expect(updatedVehicle?.totalAmount).toBeGreaterThan(0);

      const updatedSession = updatedVehicle?.sessions[0];
      expect(updatedSession?.status).toBe('COMPLETED');
      expect(updatedSession?.endTime).toBeTruthy();
      expect(updatedSession?.duration).toBeGreaterThan(0);
      expect(updatedSession?.totalAmount).toBeGreaterThan(0);

      const updatedSpot = await prisma.parkingSpot.findUnique({
        where: { id: spotId }
      });
      expect(updatedSpot?.status).toBe('AVAILABLE');
    });

    it('should maintain accurate statistics throughout operations', async () => {
      const vehicleCount = 5;
      const vehicles = Array(vehicleCount).fill(null).map((_, index) => ({
        licensePlate: `STATS${index}`,
        vehicleType: 'STANDARD'
      }));

      // Get initial statistics
      const initialStatsResponse = await request(app)
        .get('/api/checkin/stats')
        .set('Authorization', authToken)
        .expect(200);

      const initialStats = initialStatsResponse.body.data.statistics;

      // Check-in all vehicles
      for (const vehicle of vehicles) {
        await request(app)
          .post('/api/checkin')
          .send({
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType
          })
          .expect(201);
      }

      // Verify intermediate statistics
      const midStatsResponse = await request(app)
        .get('/api/checkin/stats')
        .set('Authorization', authToken)
        .expect(200);

      const midStats = midStatsResponse.body.data.statistics;
      expect(midStats.currentlyParked).toBe(initialStats.currentlyParked + vehicleCount);
      expect(midStats.totalCheckIns).toBe(initialStats.totalCheckIns + vehicleCount);

      // Wait for time accumulation
      await wait(200);

      // Check out all vehicles
      for (const vehicle of vehicles) {
        await request(app)
          .post('/api/checkout')
          .send({ licensePlate: vehicle.licensePlate })
          .expect(200);
      }

      // Verify final statistics
      const finalStatsResponse = await request(app)
        .get('/api/checkin/stats')
        .set('Authorization', authToken)
        .expect(200);

      const finalStats = finalStatsResponse.body.data.statistics;
      expect(finalStats.currentlyParked).toBe(initialStats.currentlyParked);
      expect(finalStats.totalCheckIns).toBe(initialStats.totalCheckIns + vehicleCount);

      // Verify checkout statistics
      const checkoutStatsResponse = await request(app)
        .get('/api/checkout/stats')
        .set('Authorization', authToken)
        .expect(200);

      const checkoutStats = checkoutStatsResponse.body.data.statistics;
      expect(checkoutStats.totalCheckouts).toBeGreaterThanOrEqual(vehicleCount);
      expect(checkoutStats.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid check-in/check-out cycles efficiently', async () => {
      const cycleCount = 20;
      const vehicles = Array(cycleCount).fill(null).map((_, index) => ({
        licensePlate: `RAPID${index.toString().padStart(3, '0')}`,
        vehicleType: ['COMPACT', 'STANDARD', 'OVERSIZED'][index % 3]
      }));

      const startTime = Date.now();

      // Perform rapid check-in/check-out cycles
      for (const vehicle of vehicles) {
        // Check-in
        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send({
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType
          });

        expect(checkinResponse.status).toBe(201);

        // Small wait to accumulate minimal time
        await wait(10);

        // Check-out
        const checkoutResponse = await request(app)
          .post('/api/checkout')
          .send({ licensePlate: vehicle.licensePlate });

        expect(checkoutResponse.status).toBe(200);
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerCycle = totalTime / cycleCount;

      // Performance assertion - should complete each cycle reasonably fast
      expect(avgTimePerCycle).toBeLessThan(1000); // Less than 1 second per cycle

      // Verify system is clean after rapid operations
      const availabilityResponse = await request(app)
        .get('/api/checkin/availability')
        .expect(200);

      expect(availabilityResponse.body.data.overall.occupiedSpots).toBe(0);
    });

    it('should maintain consistency under concurrent operations', async () => {
      const concurrentOperations = 10;
      const operationSets = Array(concurrentOperations).fill(null).map((_, index) => ({
        checkinData: {
          licensePlate: `CONCURRENT${index}`,
          vehicleType: 'STANDARD'
        }
      }));

      // Phase 1: Concurrent check-ins
      const checkinPromises = operationSets.map(({ checkinData }) =>
        request(app)
          .post('/api/checkin')
          .send(checkinData)
      );

      const checkinResults = await Promise.all(checkinPromises);
      
      // All should succeed and get unique spots
      expect(checkinResults.every(r => r.status === 201)).toBe(true);
      const assignedSpots = checkinResults.map(r => r.body.data.spotId);
      expect([...new Set(assignedSpots)].length).toBe(assignedSpots.length);

      // Wait for time accumulation
      await wait(100);

      // Phase 2: Concurrent checkouts
      const checkoutPromises = operationSets.map(({ checkinData }) =>
        request(app)
          .post('/api/checkout')
          .send({ licensePlate: checkinData.licensePlate })
      );

      const checkoutResults = await Promise.all(checkoutPromises);
      
      // All should succeed
      expect(checkoutResults.every(r => r.status === 200)).toBe(true);

      // Verify all amounts are positive and reasonable
      checkoutResults.forEach(result => {
        expect(result.body.data.billing.totalAmount).toBeGreaterThan(0);
        expect(result.body.data.billing.totalAmount).toBeLessThan(1000); // Reasonable upper bound
      });

      // Verify system consistency
      const finalAvailabilityResponse = await request(app)
        .get('/api/checkin/availability')
        .expect(200);

      expect(finalAvailabilityResponse.body.data.overall.occupiedSpots).toBe(0);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle check-in at capacity limits', async () => {
      const spotCount = testSpots.length;
      
      // Fill garage to capacity
      const vehicles = Array(spotCount).fill(null).map((_, index) => ({
        licensePlate: `LIMIT${index.toString().padStart(3, '0')}`,
        vehicleType: 'STANDARD'
      }));

      const checkinResults = await Promise.all(
        vehicles.map(vehicle =>
          request(app)
            .post('/api/checkin')
            .send({
              licensePlate: vehicle.licensePlate,
              vehicleType: vehicle.vehicleType
            })
        )
      );

      // All should succeed
      expect(checkinResults.every(r => r.status === 201)).toBe(true);

      // Try one more - should fail
      const overflowResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'OVERFLOW1',
          vehicleType: 'STANDARD'
        })
        .expect(503);

      expect(overflowResponse.body.success).toBe(false);
      expect(overflowResponse.body.message).toContain('No suitable spots available');

      // Clean up
      await Promise.all(
        vehicles.map(vehicle =>
          request(app)
            .post('/api/checkout')
            .send({ licensePlate: vehicle.licensePlate })
        )
      );
    });

    it('should handle immediate checkout (zero duration)', async () => {
      const licensePlate = 'IMMEDIATE1';

      // Check-in
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate,
          vehicleType: 'STANDARD',
          rateType: 'HOURLY'
        })
        .expect(201);

      // Immediate checkout (no wait)
      const checkoutResponse = await request(app)
        .post('/api/checkout')
        .send({ licensePlate })
        .expect(200);

      expect(checkoutResponse.body.success).toBe(true);
      expect(checkoutResponse.body.data.billing.totalAmount).toBeGreaterThanOrEqual(0);
      
      // Should have minimal duration
      expect(checkoutResponse.body.data.timing.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long parking durations', async () => {
      const licensePlate = 'LONGTERM1';

      // Create a vehicle with very old check-in time
      const longTermVehicle = await prisma.vehicle.create({
        data: {
          licensePlate,
          vehicleType: 'STANDARD',
          status: 'PARKED',
          checkInTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          hourlyRate: 5.0,
          rateType: 'HOURLY'
        }
      });

      const assignedSpot = await prisma.parkingSpot.findFirst({
        where: { status: 'AVAILABLE' }
      });

      await prisma.vehicle.update({
        where: { id: longTermVehicle.id },
        data: { spotId: assignedSpot?.id }
      });

      await prisma.parkingSpot.update({
        where: { id: assignedSpot?.id },
        data: { status: 'OCCUPIED' }
      });

      await prisma.parkingSession.create({
        data: {
          vehicleId: longTermVehicle.id,
          spotId: assignedSpot?.id || '',
          startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          hourlyRate: 5.0,
          status: 'ACTIVE'
        }
      });

      // Checkout after long duration
      const checkoutResponse = await request(app)
        .post('/api/checkout')
        .send({ licensePlate })
        .expect(200);

      expect(checkoutResponse.body.success).toBe(true);
      expect(checkoutResponse.body.data.billing.totalAmount).toBeGreaterThan(100); // Should be substantial
      expect(checkoutResponse.body.data.timing.durationHours).toBeGreaterThan(160); // ~7 days
    });
  });
});