/**
 * @file checkout.api.test.ts
 * @description Comprehensive API tests for vehicle check-out functionality
 * 
 * Tests cover:
 * - Vehicle check-out process
 * - Payment calculation and processing
 * - Check-out simulation
 * - Cost estimation
 * - Statistics and metrics
 * - Force checkout functionality
 * - Error handling and edge cases
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

describe('Checkout API Endpoints', () => {
  let testGarage: any;
  let testFloor: any;
  let testSpots: any[] = [];
  let parkedVehicles: any[] = [];
  let activeSessions: any[] = [];
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
    
    // Create test floor
    testFloor = await prisma.floor.create({
      data: {
        garageId: testGarage.id,
        floorNumber: 1,
        description: 'Ground Floor',
        totalSpots: 10,
        isActive: true
      }
    });
  });

  beforeEach(async () => {
    // Create test spots
    testSpots = await Promise.all([
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S1',
          floorId: testFloor.id,
          level: 1,
          section: 'B1',
          spotType: 'STANDARD',
          status: 'OCCUPIED',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S2',
          floorId: testFloor.id,
          level: 1,
          section: 'B1',
          spotType: 'STANDARD',
          status: 'OCCUPIED',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S3',
          floorId: testFloor.id,
          level: 1,
          section: 'B1',
          spotType: 'COMPACT',
          status: 'AVAILABLE',
          isActive: true
        }
      })
    ]);

    // Create parked vehicles with active sessions
    parkedVehicles = await Promise.all([
      prisma.vehicle.create({
        data: {
          licensePlate: 'PARK123',
          vehicleType: 'STANDARD',
          status: 'PARKED',
          spotId: testSpots[0].id,
          checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          hourlyRate: 5.0,
          rateType: 'HOURLY'
        }
      }),
      prisma.vehicle.create({
        data: {
          licensePlate: 'PARK456',
          vehicleType: 'STANDARD',
          status: 'PARKED',
          spotId: testSpots[1].id,
          checkInTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          hourlyRate: 5.0,
          rateType: 'HOURLY'
        }
      })
    ]);

    // Create active parking sessions
    activeSessions = await Promise.all([
      prisma.parkingSession.create({
        data: {
          vehicleId: parkedVehicles[0].id,
          spotId: testSpots[0].id,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          hourlyRate: 5.0,
          status: 'ACTIVE'
        }
      }),
      prisma.parkingSession.create({
        data: {
          vehicleId: parkedVehicles[1].id,
          spotId: testSpots[1].id,
          startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          hourlyRate: 5.0,
          status: 'ACTIVE'
        }
      })
    ]);
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.payment.deleteMany({});
    await prisma.parkingSession.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.parkingSpot.deleteMany({
      where: { floorId: testFloor.id }
    });
    
    testSpots = [];
    parkedVehicles = [];
    activeSessions = [];
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('POST /api/checkout', () => {
    it('should successfully check out a parked vehicle', async () => {
      const checkoutData = {
        licensePlate: 'PARK123'
      };

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send(checkoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licensePlate).toBe(checkoutData.licensePlate);
      expect(response.body.data.spotId).toBeDefined();
      expect(response.body.data.timing).toBeDefined();
      expect(response.body.data.billing).toBeDefined();
      expect(response.body.data.checkOutTime).toBeDefined();

      // Verify timing calculations
      const timing = response.body.data.timing;
      expect(timing.duration).toBeGreaterThan(0);
      expect(timing.durationHours).toBeGreaterThan(0);
      expect(timing.checkInTime).toBeDefined();
      expect(timing.checkOutTime).toBeDefined();

      // Verify billing calculations
      const billing = response.body.data.billing;
      expect(billing.hourlyRate).toBe(5.0);
      expect(billing.totalAmount).toBeGreaterThan(0);
      expect(billing.rateType).toBe('HOURLY');

      // Verify vehicle was updated in database
      const updatedVehicle = await prisma.vehicle.findUnique({
        where: { licensePlate: checkoutData.licensePlate }
      });
      expect(updatedVehicle?.status).toBe('DEPARTED');
      expect(updatedVehicle?.checkOutTime).toBeTruthy();
      expect(updatedVehicle?.totalAmount).toBeGreaterThan(0);

      // Verify spot was freed
      const freedSpot = await prisma.parkingSpot.findUnique({
        where: { id: testSpots[0].id }
      });
      expect(freedSpot?.status).toBe('AVAILABLE');

      // Verify session was completed
      const completedSession = await prisma.parkingSession.findFirst({
        where: { vehicleId: parkedVehicles[0].id }
      });
      expect(completedSession?.status).toBe('COMPLETED');
      expect(completedSession?.endTime).toBeTruthy();
      expect(completedSession?.duration).toBeGreaterThan(0);
      expect(completedSession?.totalAmount).toBeGreaterThan(0);
    });

    it('should calculate billing correctly for different durations', async () => {
      // Create a vehicle that has been parked for exactly 1 hour
      const oneHourVehicle = await prisma.vehicle.create({
        data: {
          licensePlate: 'ONEHOUR1',
          vehicleType: 'STANDARD',
          status: 'PARKED',
          spotId: testSpots[2].id,
          checkInTime: new Date(Date.now() - 60 * 60 * 1000), // Exactly 1 hour ago
          hourlyRate: 10.0,
          rateType: 'HOURLY'
        }
      });

      await prisma.parkingSession.create({
        data: {
          vehicleId: oneHourVehicle.id,
          spotId: testSpots[2].id,
          startTime: new Date(Date.now() - 60 * 60 * 1000),
          hourlyRate: 10.0,
          status: 'ACTIVE'
        }
      });

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send({ licensePlate: 'ONEHOUR1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const billing = response.body.data.billing;
      expect(billing.hourlyRate).toBe(10.0);
      
      // For exactly 1 hour, should be approximately $10
      expect(billing.totalAmount).toBeGreaterThanOrEqual(9.0);
      expect(billing.totalAmount).toBeLessThanOrEqual(11.0);
    });

    it('should handle daily rate vehicles correctly', async () => {
      const dailyVehicle = await prisma.vehicle.create({
        data: {
          licensePlate: 'DAILY123',
          vehicleType: 'STANDARD',
          status: 'PARKED',
          spotId: testSpots[2].id,
          checkInTime: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
          hourlyRate: 5.0,
          rateType: 'DAILY'
        }
      });

      await prisma.parkingSession.create({
        data: {
          vehicleId: dailyVehicle.id,
          spotId: testSpots[2].id,
          startTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
          hourlyRate: 5.0,
          status: 'ACTIVE'
        }
      });

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send({ licensePlate: 'DAILY123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.billing.rateType).toBe('DAILY');
      expect(response.body.data.billing.totalAmount).toBeGreaterThan(0);
    });

    it('should apply grace period when requested', async () => {
      const checkoutData = {
        licensePlate: 'PARK456',
        applyGracePeriod: true
      };

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send(checkoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.billing.gracePeriodApplied).toBe(true);
      expect(response.body.data.billing.gracePeriodMinutes).toBeGreaterThan(0);
    });

    it('should handle custom checkout time', async () => {
      const customCheckoutTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const checkoutData = {
        licensePlate: 'PARK123',
        checkOutTime: customCheckoutTime.toISOString()
      };

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send(checkoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(new Date(response.body.data.checkOutTime)).toEqual(customCheckoutTime);
    });

    it('should remove record when requested', async () => {
      const checkoutData = {
        licensePlate: 'PARK456',
        removeRecord: true
      };

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send(checkoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recordRemoved).toBe(true);

      // Verify vehicle record was soft deleted
      const deletedVehicle = await prisma.vehicle.findUnique({
        where: { licensePlate: checkoutData.licensePlate }
      });
      expect(deletedVehicle?.deletedAt).toBeTruthy();
    });

    it('should return 404 for non-existent license plate', async () => {
      const checkoutData = {
        licensePlate: 'NOTFOUND'
      };

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send(checkoutData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Vehicle not found');
    });

    it('should return 400 for already departed vehicle', async () => {
      // Mark vehicle as already departed
      await prisma.vehicle.update({
        where: { id: parkedVehicles[0].id },
        data: { 
          status: 'DEPARTED',
          checkOutTime: new Date()
        }
      });

      const checkoutData = {
        licensePlate: 'PARK123'
      };

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send(checkoutData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already departed');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('licensePlate is required');
    });

    it('should validate license plate format', async () => {
      const invalidData = {
        licensePlate: '' // Empty license plate
      };

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid license plate');
    });

    it('should validate custom checkout time', async () => {
      const invalidData = {
        licensePlate: 'PARK123',
        checkOutTime: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid checkout time');
    });

    it('should prevent checkout time before check-in time', async () => {
      const invalidCheckoutTime = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago (before check-in)
      const invalidData = {
        licensePlate: 'PARK123',
        checkOutTime: invalidCheckoutTime.toISOString()
      };

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('before check-in time');
    });

    it('should sanitize input data', async () => {
      const xssData = {
        licensePlate: 'XSS123',
        notes: '<script>alert("xss")</script>Legitimate note'
      };

      // First create a vehicle for checkout
      await prisma.vehicle.create({
        data: {
          licensePlate: 'XSS123',
          vehicleType: 'STANDARD',
          status: 'PARKED',
          spotId: testSpots[2].id,
          checkInTime: new Date(Date.now() - 60 * 60 * 1000),
          hourlyRate: 5.0
        }
      });

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send(xssData)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.notes) {
        expect(response.body.data.notes).not.toContain('<script>');
        expect(response.body.data.notes).toContain('Legitimate note');
      }
    });
  });

  describe('POST /api/checkout/simulate', () => {
    it('should simulate checkout without making changes', async () => {
      const simulationData = {
        licensePlate: 'PARK123'
      };

      const response = await request(app)
        .post('/api/checkout/simulate')
        .set('Authorization', authToken)
        .send(simulationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.simulation).toBe(true);
      expect(response.body.data.estimatedAmount).toBeGreaterThan(0);
      expect(response.body.data.duration).toBeGreaterThan(0);
      expect(response.body.data.timing).toBeDefined();
      expect(response.body.data.billing).toBeDefined();

      // Verify no actual changes were made
      const vehicle = await prisma.vehicle.findUnique({
        where: { licensePlate: simulationData.licensePlate }
      });
      expect(vehicle?.status).toBe('PARKED'); // Still parked
      expect(vehicle?.checkOutTime).toBeNull(); // No checkout time

      const spot = await prisma.parkingSpot.findUnique({
        where: { id: testSpots[0].id }
      });
      expect(spot?.status).toBe('OCCUPIED'); // Still occupied

      const session = await prisma.parkingSession.findFirst({
        where: { vehicleId: parkedVehicles[0].id }
      });
      expect(session?.status).toBe('ACTIVE'); // Still active
    });

    it('should simulate with grace period', async () => {
      const simulationData = {
        licensePlate: 'PARK456',
        applyGracePeriod: true
      };

      const response = await request(app)
        .post('/api/checkout/simulate')
        .set('Authorization', authToken)
        .send(simulationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.billing.gracePeriodApplied).toBe(true);
      expect(response.body.data.billing.gracePeriodMinutes).toBeGreaterThan(0);
      expect(response.body.data.billing.originalAmount).toBeGreaterThan(0);
      expect(response.body.data.billing.finalAmount).toBeLessThanOrEqual(
        response.body.data.billing.originalAmount
      );
    });

    it('should simulate with custom checkout time', async () => {
      const customTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const simulationData = {
        licensePlate: 'PARK123',
        checkOutTime: customTime.toISOString()
      };

      const response = await request(app)
        .post('/api/checkout/simulate')
        .set('Authorization', authToken)
        .send(simulationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(new Date(response.body.data.timing.checkOutTime)).toEqual(customTime);
    });

    it('should return 404 for non-existent vehicle in simulation', async () => {
      const simulationData = {
        licensePlate: 'SIMNOTFOUND'
      };

      const response = await request(app)
        .post('/api/checkout/simulate')
        .set('Authorization', authToken)
        .send(simulationData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Vehicle not found');
    });
  });

  describe('GET /api/checkout/stats', () => {
    beforeEach(async () => {
      // Create some completed checkout history for statistics
      const completedVehicle = await prisma.vehicle.create({
        data: {
          licensePlate: 'COMPLETED1',
          vehicleType: 'STANDARD',
          status: 'DEPARTED',
          checkInTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          checkOutTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          totalAmount: 15.0,
          amountPaid: 15.0,
          isPaid: true,
          hourlyRate: 5.0
        }
      });

      await prisma.parkingSession.create({
        data: {
          vehicleId: completedVehicle.id,
          spotId: testSpots[0].id,
          startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          duration: 120, // 2 hours
          totalAmount: 15.0,
          amountPaid: 15.0,
          isPaid: true,
          status: 'COMPLETED'
        }
      });

      await prisma.payment.create({
        data: {
          sessionId: (await prisma.parkingSession.findFirst({ where: { vehicleId: completedVehicle.id } }))?.id,
          vehicleId: completedVehicle.id,
          amount: 15.0,
          paymentType: 'PARKING',
          paymentMethod: 'CREDIT_CARD',
          status: 'COMPLETED',
          paymentDate: new Date(Date.now() - 1 * 60 * 60 * 1000)
        }
      });
    });

    it('should return comprehensive checkout statistics', async () => {
      const response = await request(app)
        .get('/api/checkout/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
      
      const stats = response.body.data.statistics;
      expect(stats.totalCheckouts).toBeGreaterThanOrEqual(0);
      expect(stats.todayCheckouts).toBeGreaterThanOrEqual(0);
      expect(stats.averageDuration).toBeDefined();
      expect(stats.averageAmount).toBeDefined();
      expect(stats.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(stats.byVehicleType).toBeDefined();
      expect(stats.byRateType).toBeDefined();
      expect(stats.paymentStats).toBeDefined();
    });

    it('should include revenue breakdown', async () => {
      const response = await request(app)
        .get('/api/checkout/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const revenue = response.body.data.statistics.revenue;
      expect(revenue.total).toBeGreaterThanOrEqual(0);
      expect(revenue.today).toBeGreaterThanOrEqual(0);
      expect(revenue.thisWeek).toBeGreaterThanOrEqual(0);
      expect(revenue.thisMonth).toBeGreaterThanOrEqual(0);
    });

    it('should include payment statistics', async () => {
      const response = await request(app)
        .get('/api/checkout/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const paymentStats = response.body.data.statistics.paymentStats;
      expect(paymentStats.paidCount).toBeGreaterThanOrEqual(0);
      expect(paymentStats.unpaidCount).toBeGreaterThanOrEqual(0);
      expect(paymentStats.paymentRate).toBeDefined();
      expect(paymentStats.byMethod).toBeDefined();
    });
  });

  describe('GET /api/checkout/ready', () => {
    it('should return vehicles ready for checkout', async () => {
      const response = await request(app)
        .get('/api/checkout/ready')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.body.data.vehicles)).toBe(true);
      
      // All returned vehicles should be currently parked
      response.body.data.vehicles.forEach((vehicle: any) => {
        expect(vehicle.status).toBe('PARKED');
        expect(vehicle.checkInTime).toBeDefined();
        expect(vehicle.checkOutTime).toBeNull();
      });
    });

    it('should filter by minimum minutes parked', async () => {
      const response = await request(app)
        .get('/api/checkout/ready?minMinutes=60')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // All returned vehicles should have been parked for at least 60 minutes
      response.body.data.vehicles.forEach((vehicle: any) => {
        const parkedMinutes = (Date.now() - new Date(vehicle.checkInTime).getTime()) / (1000 * 60);
        expect(parkedMinutes).toBeGreaterThanOrEqual(60);
      });
    });

    it('should filter by vehicle type', async () => {
      const response = await request(app)
        .get('/api/checkout/ready?vehicleType=STANDARD')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      response.body.data.vehicles.forEach((vehicle: any) => {
        expect(vehicle.vehicleType).toBe('STANDARD');
      });
    });

    it('should filter by rate type', async () => {
      const response = await request(app)
        .get('/api/checkout/ready?rateType=HOURLY')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      response.body.data.vehicles.forEach((vehicle: any) => {
        expect(vehicle.rateType).toBe('HOURLY');
      });
    });

    it('should support combined filters', async () => {
      const response = await request(app)
        .get('/api/checkout/ready?minMinutes=30&vehicleType=STANDARD&rateType=HOURLY')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      response.body.data.vehicles.forEach((vehicle: any) => {
        const parkedMinutes = (Date.now() - new Date(vehicle.checkInTime).getTime()) / (1000 * 60);
        expect(parkedMinutes).toBeGreaterThanOrEqual(30);
        expect(vehicle.vehicleType).toBe('STANDARD');
        expect(vehicle.rateType).toBe('HOURLY');
      });
    });

    it('should return 400 for invalid minMinutes parameter', async () => {
      const response = await request(app)
        .get('/api/checkout/ready?minMinutes=abc')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid minMinutes');
    });
  });

  describe('GET /api/checkout/estimate/:licensePlate', () => {
    it('should return current cost estimate for parked vehicle', async () => {
      const response = await request(app)
        .get('/api/checkout/estimate/PARK123')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licensePlate).toBe('PARK123');
      expect(response.body.data.estimate).toBeDefined();
      
      const estimate = response.body.data.estimate;
      expect(estimate.currentAmount).toBeGreaterThan(0);
      expect(estimate.duration).toBeGreaterThan(0);
      expect(estimate.durationHours).toBeGreaterThan(0);
      expect(estimate.hourlyRate).toBe(5.0);
      expect(estimate.rateType).toBe('HOURLY');
      expect(estimate.checkInTime).toBeDefined();
      expect(estimate.estimatedAt).toBeDefined();
    });

    it('should include projected costs for different time periods', async () => {
      const response = await request(app)
        .get('/api/checkout/estimate/PARK456')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const projections = response.body.data.estimate.projections;
      
      expect(projections.in1Hour).toBeGreaterThan(0);
      expect(projections.in2Hours).toBeGreaterThan(0);
      expect(projections.in4Hours).toBeGreaterThan(0);
      expect(projections.in8Hours).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .get('/api/checkout/estimate/NOTFOUND')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Vehicle not found');
    });

    it('should return 400 for already departed vehicle', async () => {
      // Mark vehicle as departed
      await prisma.vehicle.update({
        where: { id: parkedVehicles[0].id },
        data: { 
          status: 'DEPARTED',
          checkOutTime: new Date()
        }
      });

      const response = await request(app)
        .get('/api/checkout/estimate/PARK123')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already departed');
    });

    it('should validate license plate format', async () => {
      const response = await request(app)
        .get('/api/checkout/estimate/')
        .set('Authorization', authToken)
        .expect(404); // Route not found

      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/checkout/force', () => {
    it('should force checkout with valid admin key', async () => {
      const forceData = {
        licensePlate: 'PARK123',
        reason: 'Emergency maintenance required',
        adminKey: process.env.ADMIN_KEY || 'test-admin-key'
      };

      const response = await request(app)
        .post('/api/checkout/force')
        .set('Authorization', adminToken)
        .send(forceData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forced).toBe(true);
      expect(response.body.data.reason).toBe(forceData.reason);
      expect(response.body.data.licensePlate).toBe(forceData.licensePlate);

      // Verify vehicle was force checked out
      const vehicle = await prisma.vehicle.findUnique({
        where: { licensePlate: forceData.licensePlate }
      });
      expect(vehicle?.status).toBe('DEPARTED');
      expect(vehicle?.checkOutTime).toBeTruthy();

      // Verify audit log was created
      const auditLog = await prisma.securityAuditLog.findFirst({
        where: { 
          action: 'FORCE_CHECKOUT',
          description: { contains: forceData.licensePlate }
        }
      });
      expect(auditLog).toBeTruthy();
      expect(auditLog?.severity).toBe('HIGH');
    });

    it('should return 401 for invalid admin key', async () => {
      const forceData = {
        licensePlate: 'PARK456',
        reason: 'Test force checkout',
        adminKey: 'invalid-key'
      };

      const response = await request(app)
        .post('/api/checkout/force')
        .set('Authorization', adminToken)
        .send(forceData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid admin key');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        licensePlate: 'PARK123'
        // Missing reason and adminKey
      };

      const response = await request(app)
        .post('/api/checkout/force')
        .set('Authorization', adminToken)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should return 404 for non-existent vehicle', async () => {
      const forceData = {
        licensePlate: 'NOTFOUND',
        reason: 'Test force checkout',
        adminKey: process.env.ADMIN_KEY || 'test-admin-key'
      };

      const response = await request(app)
        .post('/api/checkout/force')
        .set('Authorization', adminToken)
        .send(forceData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Vehicle not found');
    });

    it('should validate reason length', async () => {
      const forceData = {
        licensePlate: 'PARK456',
        reason: 'Short', // Too short
        adminKey: process.env.ADMIN_KEY || 'test-admin-key'
      };

      const response = await request(app)
        .post('/api/checkout/force')
        .set('Authorization', adminToken)
        .send(forceData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('reason must be at least');
    });

    it('should sanitize reason field', async () => {
      const forceData = {
        licensePlate: 'PARK456',
        reason: '<script>alert("xss")</script>Emergency situation requires immediate checkout',
        adminKey: process.env.ADMIN_KEY || 'test-admin-key'
      };

      const response = await request(app)
        .post('/api/checkout/force')
        .set('Authorization', adminToken)
        .send(forceData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reason).not.toContain('<script>');
      expect(response.body.data.reason).toContain('Emergency situation');
    });
  });

  describe('GET /api/checkout/health', () => {
    it('should return service health status', async () => {
      const response = await request(app)
        .get('/api/checkout/health')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('checkout');
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should include dependencies status', async () => {
      const response = await request(app)
        .get('/api/checkout/health')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dependencies).toBeDefined();
      expect(response.body.data.dependencies.database).toBeDefined();
      expect(response.body.data.dependencies.billing).toBeDefined();
      expect(response.body.data.dependencies.spotManagement).toBeDefined();
    });

    it('should work without authentication for monitoring', async () => {
      const response = await request(app)
        .get('/api/checkout/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid JSON');
    });

    it('should handle concurrent checkout attempts', async () => {
      const checkoutData = {
        licensePlate: 'PARK123'
      };

      // Make two concurrent checkout requests
      const promises = [
        request(app)
          .post('/api/checkout')
          .set('Authorization', authToken)
          .send(checkoutData),
        request(app)
          .post('/api/checkout')
          .set('Authorization', authToken)
          .send(checkoutData)
      ];

      const responses = await Promise.all(promises.map(p => p.catch(e => e)));
      
      // One should succeed (200), one should fail (400 - already departed)
      const statusCodes = responses.map(r => r.status || r.response?.status);
      expect(statusCodes.includes(200)).toBe(true);
      expect(statusCodes.includes(400)).toBe(true);
    });

    it('should handle database transaction failures', async () => {
      // This would require mocking database failures
      // Implementation would depend on specific database error scenarios
    });

    it('should handle payment processing failures gracefully', async () => {
      // This would require mocking payment processing failures
      // Implementation would depend on payment system integration
    });

    it('should validate extremely large checkout amounts', async () => {
      // Create a vehicle with very long parking duration
      const longParkedVehicle = await prisma.vehicle.create({
        data: {
          licensePlate: 'LONGPARK',
          vehicleType: 'STANDARD',
          status: 'PARKED',
          spotId: testSpots[2].id,
          checkInTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago!
          hourlyRate: 1000.0, // Very high rate
          rateType: 'HOURLY'
        }
      });

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send({ licensePlate: 'LONGPARK' });

      // Should handle large amounts appropriately
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.data.billing.totalAmount).toBeGreaterThan(0);
        // Should have some reasonable upper limit or handling
      }
    });

    it('should handle zero or negative durations', async () => {
      // Create a vehicle with check-in time in the future (edge case)
      const futureVehicle = await prisma.vehicle.create({
        data: {
          licensePlate: 'FUTURE123',
          vehicleType: 'STANDARD',
          status: 'PARKED',
          spotId: testSpots[2].id,
          checkInTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in the future
          hourlyRate: 5.0,
          rateType: 'HOURLY'
        }
      });

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send({ licensePlate: 'FUTURE123' });

      // Should handle gracefully
      expect([200, 400]).toContain(response.status);
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', authToken)
        .send({
          licensePlate: '', // Invalid
          checkOutTime: 'invalid-date'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should allow checkout without authentication (public access)', async () => {
      const checkoutData = {
        licensePlate: 'PARK456'
      };

      const response = await request(app)
        .post('/api/checkout')
        .send(checkoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should restrict force checkout to admin users only', async () => {
      const userToken = 'Bearer test-user-token';
      const forceData = {
        licensePlate: 'PARK123',
        reason: 'Emergency checkout',
        adminKey: process.env.ADMIN_KEY || 'test-admin-key'
      };

      const response = await request(app)
        .post('/api/checkout/force')
        .set('Authorization', userToken)
        .send(forceData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('insufficient permissions');
    });

    it('should restrict detailed statistics to authenticated users', async () => {
      const response = await request(app)
        .get('/api/checkout/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('unauthorized');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent checkouts efficiently', async () => {
      // Create multiple parked vehicles for concurrent checkout
      const vehiclePromises = Array(5).fill(null).map(async (_, index) => {
        const vehicle = await prisma.vehicle.create({
          data: {
            licensePlate: `PERF${index}`,
            vehicleType: 'STANDARD',
            status: 'PARKED',
            checkInTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            hourlyRate: 5.0,
            rateType: 'HOURLY'
          }
        });

        // Create a spot for this vehicle
        const spot = await prisma.parkingSpot.create({
          data: {
            spotNumber: `F1-B1-PERF${index}`,
            floorId: testFloor.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'OCCUPIED',
            isActive: true
          }
        });

        // Update vehicle with spot
        await prisma.vehicle.update({
          where: { id: vehicle.id },
          data: { spotId: spot.id }
        });

        return vehicle;
      });

      await Promise.all(vehiclePromises);

      // Make concurrent checkout requests
      const checkoutPromises = Array(5).fill(null).map((_, index) => 
        request(app)
          .post('/api/checkout')
          .set('Authorization', authToken)
          .send({ licensePlate: `PERF${index}` })
      );

      const start = Date.now();
      const responses = await Promise.all(checkoutPromises);
      const duration = Date.now() - start;

      // All checkouts should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should handle rapid estimate requests', async () => {
      const promises = Array(10).fill(null).map(() => 
        request(app)
          .get('/api/checkout/estimate/PARK123')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(promises);
      
      // All estimates should succeed and be consistent
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      const amounts = responses.map(r => r.body.data.estimate.currentAmount);
      const uniqueAmounts = [...new Set(amounts)];
      
      // Amounts should be very similar (allowing for small time differences)
      expect(uniqueAmounts.length).toBeLessThanOrEqual(2);
    });
  });
});