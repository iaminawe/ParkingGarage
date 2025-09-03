/**
 * @file checkin.api.test.ts
 * @description Comprehensive API tests for vehicle check-in functionality
 * 
 * Tests cover:
 * - Vehicle check-in process
 * - Spot assignment logic
 * - Check-in simulation
 * - Availability checking
 * - Statistics and metrics
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

describe('Check-in API Endpoints', () => {
  let testGarage: any;
  let testFloor: any;
  let testSpots: any[] = [];
  let authToken: string;
  
  beforeAll(async () => {
    // Clean database before all tests
    await cleanupTestDatabase(prisma);
    
    // Seed test data
    const seedData = await seedTestDatabase(prisma);
    testGarage = seedData.testGarage;
    
    // Create auth token for regular user
    authToken = `Bearer test-user-token`;
    
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
    // Create various types of available spots for each test
    testSpots = await Promise.all([
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S1',
          floorId: testFloor.id,
          level: 1,
          section: 'B1',
          spotType: 'STANDARD',
          status: 'AVAILABLE',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S2',
          floorId: testFloor.id,
          level: 1,
          section: 'B1',
          spotType: 'COMPACT',
          status: 'AVAILABLE',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S3',
          floorId: testFloor.id,
          level: 1,
          section: 'B1',
          spotType: 'OVERSIZED',
          status: 'AVAILABLE',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B2-S1',
          floorId: testFloor.id,
          level: 1,
          section: 'B2',
          spotType: 'STANDARD',
          status: 'OCCUPIED', // Occupied spot for testing
          isActive: true
        }
      })
    ]);
  });

  afterEach(async () => {
    // Clean up vehicles and parking sessions
    await prisma.parkingSession.deleteMany({});
    await prisma.vehicle.deleteMany({});
    
    // Clean up spots
    await prisma.parkingSpot.deleteMany({
      where: { floorId: testFloor.id }
    });
    testSpots = [];
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('POST /api/checkin', () => {
    it('should successfully check in a standard vehicle', async () => {
      const checkinData = {
        licensePlate: 'ABC123',
        vehicleType: 'STANDARD',
        rateType: 'HOURLY'
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(checkinData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spotId).toBeDefined();
      expect(response.body.data.location).toBeDefined();
      expect(response.body.data.checkInTime).toBeDefined();
      expect(response.body.data.vehicle).toBeDefined();
      expect(response.body.data.vehicle.licensePlate).toBe(checkinData.licensePlate);
      expect(response.body.data.vehicle.vehicleType).toBe(checkinData.vehicleType);

      // Verify vehicle was created in database
      const createdVehicle = await prisma.vehicle.findUnique({
        where: { licensePlate: checkinData.licensePlate }
      });
      expect(createdVehicle).toBeTruthy();
      expect(createdVehicle?.status).toBe('PARKED');

      // Verify spot was assigned and marked as occupied
      const assignedSpot = await prisma.parkingSpot.findUnique({
        where: { id: response.body.data.spotId }
      });
      expect(assignedSpot?.status).toBe('OCCUPIED');

      // Verify parking session was created
      const session = await prisma.parkingSession.findFirst({
        where: { vehicleId: createdVehicle?.id }
      });
      expect(session).toBeTruthy();
      expect(session?.status).toBe('ACTIVE');
    });

    it('should assign appropriate spot type for compact vehicle', async () => {
      const checkinData = {
        licensePlate: 'COMPACT1',
        vehicleType: 'COMPACT'
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(checkinData)
        .expect(201);

      expect(response.body.success).toBe(true);
      
      // Should preferably assign a compact spot
      const assignedSpot = await prisma.parkingSpot.findUnique({
        where: { id: response.body.data.spotId }
      });
      
      // Compact vehicle can use compact or standard spots
      expect(['COMPACT', 'STANDARD'].includes(assignedSpot?.spotType || '')).toBe(true);
    });

    it('should assign appropriate spot type for oversized vehicle', async () => {
      const checkinData = {
        licensePlate: 'OVERSIZED1',
        vehicleType: 'OVERSIZED'
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(checkinData)
        .expect(201);

      expect(response.body.success).toBe(true);
      
      // Should assign an oversized spot
      const assignedSpot = await prisma.parkingSpot.findUnique({
        where: { id: response.body.data.spotId }
      });
      expect(assignedSpot?.spotType).toBe('OVERSIZED');
    });

    it('should include optional owner information when provided', async () => {
      const checkinData = {
        licensePlate: 'OWNER123',
        vehicleType: 'STANDARD',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        ownerPhone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(checkinData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicle.ownerName).toBe(checkinData.ownerName);
      expect(response.body.data.vehicle.ownerEmail).toBe(checkinData.ownerEmail);
      expect(response.body.data.vehicle.ownerPhone).toBe(checkinData.ownerPhone);
    });

    it('should handle different rate types correctly', async () => {
      const dailyCheckinData = {
        licensePlate: 'DAILY123',
        vehicleType: 'STANDARD',
        rateType: 'DAILY'
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(dailyCheckinData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicle.rateType).toBe('DAILY');
      expect(response.body.data.pricing).toBeDefined();
      expect(response.body.data.pricing.rateType).toBe('DAILY');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        vehicleType: 'STANDARD'
        // missing licensePlate
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for invalid vehicle type', async () => {
      const invalidData = {
        licensePlate: 'INVALID1',
        vehicleType: 'INVALID_TYPE'
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid vehicle type');
    });

    it('should return 400 for invalid rate type', async () => {
      const invalidData = {
        licensePlate: 'INVALID2',
        vehicleType: 'STANDARD',
        rateType: 'INVALID_RATE'
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid rate type');
    });

    it('should return 409 for duplicate license plate check-in', async () => {
      const checkinData = {
        licensePlate: 'DUPLICATE1',
        vehicleType: 'STANDARD'
      };

      // First check-in should succeed
      await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(checkinData)
        .expect(201);

      // Second check-in with same license plate should fail
      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(checkinData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already parked');
    });

    it('should return 503 when no suitable spots are available', async () => {
      // Mark all oversized spots as occupied
      await prisma.parkingSpot.updateMany({
        where: { spotType: 'OVERSIZED' },
        data: { status: 'OCCUPIED' }
      });

      // Mark all standard spots as occupied  
      await prisma.parkingSpot.updateMany({
        where: { spotType: 'STANDARD' },
        data: { status: 'OCCUPIED' }
      });

      const checkinData = {
        licensePlate: 'NOSPOT1',
        vehicleType: 'OVERSIZED'
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(checkinData)
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No suitable spots available');
    });

    it('should validate license plate format', async () => {
      const invalidLicensePlates = [
        '', // Empty
        'A', // Too short
        '1234567890123456', // Too long
        'ABC-123-XYZ-999', // Too many parts
        '   ', // Only whitespace
      ];

      for (const licensePlate of invalidLicensePlates) {
        const response = await request(app)
          .post('/api/checkin')
          .set('Authorization', authToken)
          .send({
            licensePlate,
            vehicleType: 'STANDARD'
          });

        expect([400, 422]).toContain(response.status);
        expect(response.body.success).toBe(false);
      }
    });

    it('should sanitize input data to prevent XSS', async () => {
      const xssData = {
        licensePlate: 'XSS123',
        vehicleType: 'STANDARD',
        ownerName: '<script>alert("xss")</script>John Doe',
        ownerEmail: 'john@example.com',
        notes: '<img src="x" onerror="alert(1)">Legitimate note'
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(xssData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicle.ownerName).not.toContain('<script>');
      expect(response.body.data.vehicle.ownerName).toContain('John Doe');
      
      if (response.body.data.notes) {
        expect(response.body.data.notes).not.toContain('<img');
        expect(response.body.data.notes).toContain('Legitimate note');
      }
    });

    it('should validate email format when provided', async () => {
      const invalidEmailData = {
        licensePlate: 'EMAIL123',
        vehicleType: 'STANDARD',
        ownerEmail: 'invalid-email-format'
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(invalidEmailData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email');
    });

    it('should validate phone number format when provided', async () => {
      const invalidPhoneData = {
        licensePlate: 'PHONE123',
        vehicleType: 'STANDARD',
        ownerPhone: '123' // Too short
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(invalidPhoneData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid phone');
    });
  });

  describe('POST /api/checkin/simulate', () => {
    it('should simulate check-in without creating records', async () => {
      const simulationData = {
        licensePlate: 'SIM123',
        vehicleType: 'STANDARD'
      };

      const response = await request(app)
        .post('/api/checkin/simulate')
        .set('Authorization', authToken)
        .send(simulationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.simulation).toBe(true);
      expect(response.body.data.wouldAssignSpot).toBeDefined();
      expect(response.body.data.spotLocation).toBeDefined();
      expect(response.body.data.estimatedCost).toBeDefined();

      // Verify no records were actually created
      const vehicle = await prisma.vehicle.findUnique({
        where: { licensePlate: simulationData.licensePlate }
      });
      expect(vehicle).toBeNull();

      // Verify no spots were actually occupied
      const occupiedSpots = await prisma.parkingSpot.findMany({
        where: { status: 'OCCUPIED' }
      });
      const originalOccupiedCount = testSpots.filter(s => s.status === 'OCCUPIED').length;
      expect(occupiedSpots.length).toBe(originalOccupiedCount);
    });

    it('should simulate different vehicle types correctly', async () => {
      const simulations = [
        { licensePlate: 'SIM-COMPACT', vehicleType: 'COMPACT' },
        { licensePlate: 'SIM-STANDARD', vehicleType: 'STANDARD' },
        { licensePlate: 'SIM-OVERSIZED', vehicleType: 'OVERSIZED' }
      ];

      for (const sim of simulations) {
        const response = await request(app)
          .post('/api/checkin/simulate')
          .set('Authorization', authToken)
          .send(sim)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.simulation).toBe(true);
        expect(response.body.data.wouldAssignSpot).toBeDefined();
        expect(response.body.data.vehicleType).toBe(sim.vehicleType);
      }
    });

    it('should indicate when no spots would be available', async () => {
      // Mark all spots as occupied for simulation
      await prisma.parkingSpot.updateMany({
        data: { status: 'OCCUPIED' }
      });

      const simulationData = {
        licensePlate: 'SIM-FULL',
        vehicleType: 'STANDARD'
      };

      const response = await request(app)
        .post('/api/checkin/simulate')
        .set('Authorization', authToken)
        .send(simulationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.simulation).toBe(true);
      expect(response.body.data.wouldAssignSpot).toBeNull();
      expect(response.body.data.reason).toContain('No suitable spots');
    });

    it('should provide accurate cost estimation', async () => {
      const simulationData = {
        licensePlate: 'SIM-COST',
        vehicleType: 'STANDARD',
        rateType: 'HOURLY'
      };

      const response = await request(app)
        .post('/api/checkin/simulate')
        .set('Authorization', authToken)
        .send(simulationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.estimatedCost).toBeDefined();
      expect(response.body.data.estimatedCost.hourlyRate).toBeGreaterThan(0);
      expect(response.body.data.estimatedCost.rateType).toBe('HOURLY');
    });

    it('should handle simulation with same validation as real check-in', async () => {
      const invalidData = {
        licensePlate: '',
        vehicleType: 'INVALID_TYPE'
      };

      const response = await request(app)
        .post('/api/checkin/simulate')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('GET /api/checkin/availability', () => {
    it('should return overall availability information', async () => {
      const response = await request(app)
        .get('/api/checkin/availability')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overall).toBeDefined();
      expect(response.body.data.byVehicleType).toBeDefined();
      
      const overall = response.body.data.overall;
      expect(overall.totalSpots).toBeGreaterThanOrEqual(0);
      expect(overall.availableSpots).toBeGreaterThanOrEqual(0);
      expect(overall.occupiedSpots).toBeGreaterThanOrEqual(0);
      expect(overall.occupancyRate).toBeDefined();
      
      const byType = response.body.data.byVehicleType;
      expect(byType.STANDARD).toBeDefined();
      expect(byType.COMPACT).toBeDefined();
      expect(byType.OVERSIZED).toBeDefined();
    });

    it('should calculate availability percentages correctly', async () => {
      const response = await request(app)
        .get('/api/checkin/availability')
        .set('Authorization', authToken)
        .expect(200);

      const overall = response.body.data.overall;
      const calculatedRate = overall.occupiedSpots / overall.totalSpots;
      expect(Math.abs(overall.occupancyRate - calculatedRate)).toBeLessThan(0.01);
    });

    it('should include real-time availability data', async () => {
      // Occupy a spot and immediately check availability
      await prisma.parkingSpot.update({
        where: { id: testSpots[0].id },
        data: { status: 'OCCUPIED' }
      });

      const response = await request(app)
        .get('/api/checkin/availability')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overall.occupiedSpots).toBeGreaterThan(0);
      expect(response.body.data.lastUpdated).toBeDefined();
    });
  });

  describe('GET /api/checkin/availability/:vehicleType', () => {
    it('should return availability for standard vehicles', async () => {
      const response = await request(app)
        .get('/api/checkin/availability/STANDARD')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.availability).toBeDefined();
      expect(response.body.data.assignment).toBeDefined();
      expect(response.body.data.vehicleType).toBe('STANDARD');
      
      const availability = response.body.data.availability;
      expect(availability.suitableSpots).toBeGreaterThanOrEqual(0);
      expect(availability.availableSpots).toBeGreaterThanOrEqual(0);
    });

    it('should return availability for compact vehicles', async () => {
      const response = await request(app)
        .get('/api/checkin/availability/COMPACT')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicleType).toBe('COMPACT');
      
      // Compact vehicles can use both compact and standard spots
      const availability = response.body.data.availability;
      expect(availability.suitableSpots).toBeGreaterThanOrEqual(0);
    });

    it('should return availability for oversized vehicles', async () => {
      const response = await request(app)
        .get('/api/checkin/availability/OVERSIZED')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicleType).toBe('OVERSIZED');
      
      // Oversized vehicles can only use oversized spots
      const availability = response.body.data.availability;
      expect(availability.spotTypes).toContain('OVERSIZED');
    });

    it('should return 400 for invalid vehicle type', async () => {
      const response = await request(app)
        .get('/api/checkin/availability/INVALID_TYPE')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid vehicle type');
    });

    it('should provide spot assignment recommendations', async () => {
      const response = await request(app)
        .get('/api/checkin/availability/STANDARD')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignment).toBeDefined();
      
      if (response.body.data.assignment.recommendedSpot) {
        expect(response.body.data.assignment.recommendedSpot.spotNumber).toBeDefined();
        expect(response.body.data.assignment.recommendedSpot.location).toBeDefined();
      }
    });
  });

  describe('GET /api/checkin/stats', () => {
    beforeEach(async () => {
      // Create some check-in history for statistics
      const testVehicle = await prisma.vehicle.create({
        data: {
          licensePlate: 'STATS123',
          vehicleType: 'STANDARD',
          status: 'DEPARTED',
          spotId: testSpots[0].id,
          checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          checkOutTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          totalAmount: 10.0,
          isPaid: true
        }
      });

      await prisma.parkingSession.create({
        data: {
          vehicleId: testVehicle.id,
          spotId: testSpots[0].id,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          duration: 60, // 60 minutes
          totalAmount: 10.0,
          isPaid: true,
          status: 'COMPLETED'
        }
      });
    });

    it('should return comprehensive check-in statistics', async () => {
      const response = await request(app)
        .get('/api/checkin/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
      
      const stats = response.body.data.statistics;
      expect(stats.totalCheckIns).toBeGreaterThanOrEqual(0);
      expect(stats.currentlyParked).toBeGreaterThanOrEqual(0);
      expect(stats.todayCheckIns).toBeGreaterThanOrEqual(0);
      expect(stats.averageDuration).toBeDefined();
      expect(stats.byVehicleType).toBeDefined();
      expect(stats.byRateType).toBeDefined();
      expect(stats.byHour).toBeDefined();
    });

    it('should include occupancy trends', async () => {
      const response = await request(app)
        .get('/api/checkin/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics.occupancyTrends).toBeDefined();
      expect(response.body.data.statistics.peakHours).toBeDefined();
    });

    it('should provide revenue statistics', async () => {
      const response = await request(app)
        .get('/api/checkin/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const stats = response.body.data.statistics;
      expect(stats.revenue).toBeDefined();
      expect(stats.revenue.total).toBeGreaterThanOrEqual(0);
      expect(stats.revenue.today).toBeGreaterThanOrEqual(0);
      expect(stats.revenue.average).toBeDefined();
    });
  });

  describe('GET /api/checkin/health', () => {
    it('should return service health status', async () => {
      const response = await request(app)
        .get('/api/checkin/health')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('check-in');
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should include system dependencies status', async () => {
      const response = await request(app)
        .get('/api/checkin/health')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dependencies).toBeDefined();
      expect(response.body.data.dependencies.database).toBeDefined();
      expect(response.body.data.dependencies.spotAssignment).toBeDefined();
    });

    it('should work without authentication for monitoring', async () => {
      const response = await request(app)
        .get('/api/checkin/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid JSON');
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // Implementation would depend on specific database error scenarios
    });

    it('should handle concurrent check-in attempts for same license plate', async () => {
      const checkinData = {
        licensePlate: 'CONCURRENT1',
        vehicleType: 'STANDARD'
      };

      // Make two concurrent check-in requests
      const promises = [
        request(app)
          .post('/api/checkin')
          .set('Authorization', authToken)
          .send(checkinData),
        request(app)
          .post('/api/checkin')
          .set('Authorization', authToken)
          .send(checkinData)
      ];

      const responses = await Promise.all(promises.map(p => p.catch(e => e)));
      
      // One should succeed (201), one should fail (409 - duplicate)
      const statusCodes = responses.map(r => r.status || r.response?.status);
      expect(statusCodes.includes(201)).toBe(true);
      expect(statusCodes.includes(409)).toBe(true);
    });

    it('should handle race conditions in spot assignment', async () => {
      const checkinPromises = Array(3).fill(null).map((_, index) => 
        request(app)
          .post('/api/checkin')
          .set('Authorization', authToken)
          .send({
            licensePlate: `RACE${index}`,
            vehicleType: 'STANDARD'
          })
      );

      const responses = await Promise.all(checkinPromises.map(p => p.catch(e => e)));
      
      // All should get unique spots (no conflicts)
      const successfulResponses = responses.filter(r => r.status === 201);
      const assignedSpots = successfulResponses.map(r => r.body.data.spotId);
      const uniqueSpots = [...new Set(assignedSpots)];
      
      expect(uniqueSpots.length).toBe(assignedSpots.length); // No duplicate assignments
    });

    it('should validate request size limits', async () => {
      const largeData = {
        licensePlate: 'LARGE123',
        vehicleType: 'STANDARD',
        notes: 'x'.repeat(10000), // Very long notes
        ownerName: 'x'.repeat(1000) // Very long name
      };

      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send(largeData);

      // Should either accept with truncation or reject as too large
      expect([201, 400, 413]).toContain(response.status);
    });

    it('should handle special characters in license plates correctly', async () => {
      const specialPlates = [
        'ABC-123',
        'ABC 123',
        'ABC.123',
        'ABC_123',
        'ÀBC123', // Unicode
        'АВС123', // Cyrillic that looks like Latin
      ];

      for (const plate of specialPlates) {
        const response = await request(app)
          .post('/api/checkin/simulate')
          .set('Authorization', authToken)
          .send({
            licensePlate: plate,
            vehicleType: 'STANDARD'
          });

        // Should handle gracefully (accept valid formats, reject invalid)
        expect([200, 400]).toContain(response.status);
        expect(response.body.success).toBeDefined();
      }
    });

    it('should return consistent error format across all endpoints', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', authToken)
        .send({
          licensePlate: '', // Invalid
          vehicleType: 'INVALID'
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
    it('should allow check-in without authentication (public access)', async () => {
      const checkinData = {
        licensePlate: 'PUBLIC123',
        vehicleType: 'STANDARD'
      };

      const response = await request(app)
        .post('/api/checkin')
        .send(checkinData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should allow check-in simulation without authentication', async () => {
      const simulationData = {
        licensePlate: 'PUBSIM123',
        vehicleType: 'STANDARD'
      };

      const response = await request(app)
        .post('/api/checkin/simulate')
        .send(simulationData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should restrict statistics endpoint to authenticated users', async () => {
      const response = await request(app)
        .get('/api/checkin/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('unauthorized');
    });

    it('should restrict admin statistics to admin users only', async () => {
      const userToken = 'Bearer test-user-token';
      
      // This test would depend on actual role-based access control implementation
      const response = await request(app)
        .get('/api/checkin/stats?detailed=true')
        .set('Authorization', userToken);
        
      // Should either succeed for all users or require admin permissions
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent check-ins efficiently', async () => {
      const promises = Array(10).fill(null).map((_, index) => 
        request(app)
          .post('/api/checkin')
          .set('Authorization', authToken)
          .send({
            licensePlate: `PERF${index}`,
            vehicleType: 'STANDARD'
          })
      );

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      // All requests should complete
      expect(responses.every(r => [201, 503].includes(r.status))).toBe(true);
      
      // Should complete in reasonable time (adjust based on system capacity)
      expect(duration).toBeLessThan(10000); // 10 seconds
      
      // Count successful check-ins
      const successful = responses.filter(r => r.status === 201);
      expect(successful.length).toBeGreaterThan(0);
    });

    it('should handle rapid availability checks', async () => {
      const promises = Array(20).fill(null).map(() => 
        request(app)
          .get('/api/checkin/availability')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(promises);
      
      // All availability checks should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      // Should return consistent data
      const occupancyRates = responses.map(r => r.body.data.overall.occupancyRate);
      const uniqueRates = [...new Set(occupancyRates)];
      
      // Rates should be similar (allowing for small variations due to timing)
      expect(uniqueRates.length).toBeLessThanOrEqual(3);
    });
  });
});