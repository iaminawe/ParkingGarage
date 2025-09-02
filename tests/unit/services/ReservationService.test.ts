import { ReservationService, ReservationStatus } from '@/services/ReservationService';
import { testDb } from '@tests/helpers/test-database';
import { TestDataFactory } from '@tests/helpers/test-factories';
import { TestUtils } from '@tests/helpers/test-utils';
import { VehicleType } from '@prisma/client';

// Mock dependencies
jest.mock('@/services/SecurityAuditService');

describe('ReservationService', () => {
  let reservationService: ReservationService;
  let testUser: any;
  let testGarage: any;
  let testSpot: any;
  let testVehicle: any;

  beforeAll(async () => {
    await testDb.setupDatabase();
  });

  afterAll(async () => {
    await testDb.teardownDatabase();
  });

  beforeEach(async () => {
    await testDb.setupDatabase();
    reservationService = new ReservationService();
    
    // Create test data
    const scenario = await testDb.createCompleteTestScenario();
    testUser = scenario.user;
    testGarage = scenario.garage;
    testSpot = scenario.spot;
    testVehicle = scenario.vehicle;
  });

  describe('Reservation Creation', () => {
    it('should create a successful reservation with valid data', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      const endTime = new Date(tomorrow);
      endTime.setHours(17, 0, 0, 0);

      const reservationRequest = {
        userId: testUser.id,
        spotId: testSpot.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime,
        vehicleInfo: {
          licensePlate: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue'
        },
        notes: 'Business meeting',
        allowWaitlist: false
      };

      const result = await reservationService.createReservation(reservationRequest);

      expect(result.success).toBe(true);
      expect(result.status).toBe('CONFIRMED');
      expect(result.reservationId).toBeDefined();
      expect(result.spotId).toBe(testSpot.id);
      expect(result.message).toContain('confirmed');
    });

    it('should reject reservation with start time in the past', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const reservationRequest = {
        userId: testUser.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: yesterday,
        endTime: new Date(),
        vehicleInfo: {
          licensePlate: 'TEST123'
        }
      };

      const result = await reservationService.createReservation(reservationRequest);

      expect(result.success).toBe(false);
      expect(result.status).toBe('CANCELLED');
      expect(result.message).toContain('Start time must be in the future');
    });

    it('should reject reservation with end time before start time', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const reservationRequest = {
        userId: testUser.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() - 60 * 60 * 1000), // 1 hour before start
        vehicleInfo: {
          licensePlate: 'TEST123'
        }
      };

      const result = await reservationService.createReservation(reservationRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('End time must be after start time');
    });

    it('should reject reservation exceeding maximum duration', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const endTime = new Date(tomorrow);
      endTime.setDate(endTime.getDate() + 2); // 2 days later (exceeds 24h max)
      
      const reservationRequest = {
        userId: testUser.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime,
        vehicleInfo: {
          licensePlate: 'TEST123'
        }
      };

      const result = await reservationService.createReservation(reservationRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Maximum reservation duration');
    });

    it('should reject reservation with duration less than 30 minutes', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const endTime = new Date(tomorrow.getTime() + 15 * 60 * 1000); // 15 minutes
      
      const reservationRequest = {
        userId: testUser.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime,
        vehicleInfo: {
          licensePlate: 'TEST123'
        }
      };

      const result = await reservationService.createReservation(reservationRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Minimum reservation duration is 30 minutes');
    });

    it('should reject reservation without license plate', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const reservationRequest = {
        userId: testUser.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        vehicleInfo: {
          licensePlate: '' // Empty license plate
        }
      };

      const result = await reservationService.createReservation(reservationRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('License plate is required');
    });

    it('should add to waitlist when no spots available and allowWaitlist is true', async () => {
      // First, occupy the test spot
      const prisma = testDb.getPrismaClient();
      await prisma.parkingSpot.update({
        where: { id: testSpot.id },
        data: { status: 'OCCUPIED' }
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const reservationRequest = {
        userId: testUser.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        vehicleInfo: {
          licensePlate: 'WAIT123'
        },
        allowWaitlist: true
      };

      const result = await reservationService.createReservation(reservationRequest);

      expect(result.success).toBe(true);
      expect(result.status).toBe('WAITLISTED');
      expect(result.waitlistPosition).toBeDefined();
      expect(result.waitlistPosition).toBeGreaterThan(0);
      expect(result.message).toContain('waitlist');
    });

    it('should find alternative spots when specific spot is unavailable', async () => {
      // Create additional spots
      const alternativeSpot = await testDb.createTestSpot(testGarage.id, {
        spotNumber: 'ALT001',
        level: 2,
        isOccupied: false,
        vehicleType: 'REGULAR'
      });

      // Make the requested spot unavailable
      const prisma = testDb.getPrismaClient();
      await prisma.parkingSpot.update({
        where: { id: testSpot.id },
        data: { status: 'OCCUPIED' }
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const reservationRequest = {
        userId: testUser.id,
        spotId: testSpot.id, // Request specific unavailable spot
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        vehicleInfo: {
          licensePlate: 'ALT123'
        }
      };

      const result = await reservationService.createReservation(reservationRequest);

      // Should find alternative spot
      expect(result.success).toBe(true);
      expect(result.spotId).toBe(alternativeSpot.id);
    });
  });

  describe('Reservation Conflicts', () => {
    let existingReservation: any;

    beforeEach(async () => {
      // Create an existing reservation
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const endTime = new Date(tomorrow);
      endTime.setHours(14, 0, 0, 0); // 4-hour reservation

      const existingRequest = {
        userId: testUser.id,
        spotId: testSpot.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime,
        vehicleInfo: {
          licensePlate: 'EXIST123'
        }
      };

      const result = await reservationService.createReservation(existingRequest);
      existingReservation = result;
    });

    it('should detect complete overlap conflict', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(11, 0, 0, 0); // Overlaps with existing 10-14
      
      const endTime = new Date(tomorrow);
      endTime.setHours(13, 0, 0, 0);

      const conflictingRequest = {
        userId: testUser.id,
        spotId: testSpot.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime,
        vehicleInfo: {
          licensePlate: 'CONF123'
        }
      };

      const result = await reservationService.createReservation(conflictingRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('conflict');
    });

    it('should detect partial overlap conflict', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(13, 0, 0, 0); // Partially overlaps existing 10-14
      
      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0);

      const partialConflictRequest = {
        userId: testUser.id,
        spotId: testSpot.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime,
        vehicleInfo: {
          licensePlate: 'PART123'
        }
      };

      const result = await reservationService.createReservation(partialConflictRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('conflict');
    });

    it('should allow non-conflicting adjacent reservations', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // Starts exactly when existing ends
      
      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0);

      const adjacentRequest = {
        userId: testUser.id,
        spotId: testSpot.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime,
        vehicleInfo: {
          licensePlate: 'ADJ123'
        }
      };

      const result = await reservationService.createReservation(adjacentRequest);

      expect(result.success).toBe(true);
      expect(result.status).toBe('CONFIRMED');
    });
  });

  describe('Reservation Cancellation', () => {
    let testReservation: any;
    let reservationId: string;

    beforeEach(async () => {
      // Create a reservation to cancel
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const endTime = new Date(tomorrow);
      endTime.setHours(14, 0, 0, 0);

      const request = {
        userId: testUser.id,
        spotId: testSpot.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime,
        vehicleInfo: {
          licensePlate: 'CANCEL123'
        }
      };

      const result = await reservationService.createReservation(request);
      reservationId = result.reservationId!;
    });

    it('should successfully cancel reservation with full refund when cancelled early', async () => {
      const result = await reservationService.cancelReservation(
        reservationId, 
        testUser.id, 
        'Plans changed'
      );

      expect(result.success).toBe(true);
      expect(result.refundAmount).toBeGreaterThan(0);
      expect(result.message).toContain('cancelled successfully');
      expect(result.message).toContain('Refund');
    });

    it('should prevent unauthorized cancellation', async () => {
      const otherUser = await testDb.createTestUser({ email: 'other@example.com' });

      const result = await reservationService.cancelReservation(
        reservationId,
        otherUser.id,
        'Unauthorized attempt'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unauthorized');
    });

    it('should prevent cancellation of non-existent reservation', async () => {
      const result = await reservationService.cancelReservation(
        'non-existent-id',
        testUser.id,
        'Test'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should calculate partial refund for late cancellation', async () => {
      // Create a reservation starting soon (within cancellation deadline)
      const soonTime = new Date();
      soonTime.setHours(soonTime.getHours() + 1); // 1 hour from now
      
      const endTime = new Date(soonTime);
      endTime.setHours(endTime.getHours() + 2);

      const quickRequest = {
        userId: testUser.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: soonTime,
        endTime,
        vehicleInfo: {
          licensePlate: 'LATE123'
        }
      };

      const reservationResult = await reservationService.createReservation(quickRequest);
      
      const cancelResult = await reservationService.cancelReservation(
        reservationResult.reservationId!,
        testUser.id,
        'Late cancellation'
      );

      expect(cancelResult.success).toBe(true);
      if (cancelResult.refundAmount !== undefined) {
        expect(cancelResult.refundAmount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('User Reservations Retrieval', () => {
    beforeEach(async () => {
      // Create multiple reservations for testing
      const baseTime = new Date();
      baseTime.setDate(baseTime.getDate() + 1);

      const reservationRequests = [
        {
          startHour: 9,
          endHour: 11,
          plate: 'PAST123',
          status: 'COMPLETED'
        },
        {
          startHour: 13,
          endHour: 15,
          plate: 'CURR123',
          status: 'ACTIVE'
        },
        {
          startHour: 17,
          endHour: 19,
          plate: 'FUTR123',
          status: 'CONFIRMED'
        }
      ];

      for (const req of reservationRequests) {
        const startTime = new Date(baseTime);
        startTime.setHours(req.startHour, 0, 0, 0);
        
        const endTime = new Date(baseTime);
        endTime.setHours(req.endHour, 0, 0, 0);

        await reservationService.createReservation({
          userId: testUser.id,
          spotType: VehicleType.REGULAR,
          preferredFeatures: [],
          startTime,
          endTime,
          vehicleInfo: {
            licensePlate: req.plate
          }
        });
      }
    });

    it('should retrieve all user reservations', async () => {
      const reservations = await reservationService.getUserReservations(testUser.id);

      expect(reservations.length).toBeGreaterThanOrEqual(3);
      expect(reservations[0]).toMatchObject({
        userId: testUser.id,
        spotId: expect.any(String),
        spotNumber: expect.any(String),
        vehiclePlate: expect.any(String),
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        status: expect.any(String),
        gracePeriodMinutes: 15,
        noShowGracePeriod: 30
      });
    });

    it('should filter reservations by status', async () => {
      const activeReservations = await reservationService.getUserReservations(
        testUser.id, 
        'ACTIVE'
      );

      activeReservations.forEach(reservation => {
        expect(reservation.status).toBe('ACTIVE');
      });
    });

    it('should return empty array for user with no reservations', async () => {
      const newUser = await testDb.createTestUser({ email: 'empty@example.com' });
      const reservations = await reservationService.getUserReservations(newUser.id);

      expect(reservations).toEqual([]);
    });
  });

  describe('Reservation Statistics', () => {
    beforeEach(async () => {
      // Create test data for statistics
      const prisma = testDb.getPrismaClient();
      const now = new Date();

      const testSessions = [
        {
          startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          endTime: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          status: 'COMPLETED',
          totalAmount: 10.00,
          amountPaid: 10.00,
          duration: 60,
          vehicleId: testVehicle.id,
          spotId: testSpot.id
        },
        {
          startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          endTime: new Date(now.getTime() + 1 * 60 * 60 * 1000),
          status: 'ACTIVE',
          totalAmount: 20.00,
          duration: null,
          vehicleId: testVehicle.id,
          spotId: testSpot.id
        },
        {
          startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
          endTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          status: 'CANCELLED',
          totalAmount: 15.00,
          amountPaid: 0,
          duration: null,
          vehicleId: testVehicle.id,
          spotId: testSpot.id
        }
      ];

      for (const session of testSessions) {
        await prisma.parkingSession.create({
          data: session
        });
      }
    });

    it('should calculate daily statistics correctly', async () => {
      const stats = await reservationService.getReservationStats('day');

      expect(stats).toMatchObject({
        totalReservations: expect.any(Number),
        activeReservations: expect.any(Number),
        completedReservations: expect.any(Number),
        cancelledReservations: expect.any(Number),
        noShowReservations: expect.any(Number),
        waitlistSize: 0,
        averageReservationDuration: expect.any(Number),
        occupancyRate: expect.any(Number),
        revenue: expect.any(Number)
      });

      expect(stats.totalReservations).toBeGreaterThanOrEqual(3);
      expect(stats.activeReservations).toBeGreaterThanOrEqual(1);
      expect(stats.completedReservations).toBeGreaterThanOrEqual(1);
      expect(stats.cancelledReservations).toBeGreaterThanOrEqual(1);
    });

    it('should calculate weekly and monthly statistics', async () => {
      const weeklyStats = await reservationService.getReservationStats('week');
      const monthlyStats = await reservationService.getReservationStats('month');

      expect(weeklyStats.totalReservations).toBeGreaterThanOrEqual(3);
      expect(monthlyStats.totalReservations).toBeGreaterThanOrEqual(weeklyStats.totalReservations);
    });

    it('should calculate occupancy rate correctly', async () => {
      const stats = await reservationService.getReservationStats('day');

      expect(stats.occupancyRate).toBeGreaterThanOrEqual(0);
      expect(stats.occupancyRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Auto-cleanup Process', () => {
    beforeEach(async () => {
      // Mock intervals to prevent actual timers from running
      jest.spyOn(global, 'setInterval').mockImplementation(jest.fn());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should start auto-cleanup process on service initialization', () => {
      const newService = new ReservationService();
      
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        10 * 60 * 1000 // 10 minutes
      );
    });

    it('should cleanup expired reservations', async () => {
      const prisma = testDb.getPrismaClient();
      
      // Create an expired reservation
      const expiredTime = new Date();
      expiredTime.setHours(expiredTime.getHours() - 2); // 2 hours ago

      const expiredSession = await prisma.parkingSession.create({
        data: {
          startTime: new Date(expiredTime.getTime() - 2 * 60 * 60 * 1000),
          endTime: expiredTime,
          status: 'ACTIVE',
          totalAmount: 15.00,
          vehicleId: testVehicle.id,
          spotId: testSpot.id
        }
      });

      // Call the private method (access through any)
      await (reservationService as any).cleanupExpiredReservations();

      // Verify the session was marked as completed
      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: expiredSession.id }
      });

      expect(updatedSession?.status).toBe('COMPLETED');
    });

    it('should mark no-show reservations', async () => {
      const prisma = testDb.getPrismaClient();
      
      // Create a no-show reservation (started more than 30 minutes ago, still active)
      const noShowTime = new Date();
      noShowTime.setMinutes(noShowTime.getMinutes() - 45); // 45 minutes ago

      const noShowSession = await prisma.parkingSession.create({
        data: {
          startTime: noShowTime,
          endTime: new Date(noShowTime.getTime() + 2 * 60 * 60 * 1000),
          status: 'ACTIVE',
          totalAmount: 20.00,
          vehicleId: testVehicle.id,
          spotId: testSpot.id
        }
      });

      // Call the private method
      await (reservationService as any).markNoShowReservations();

      // Verify the session was marked as no-show
      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: noShowSession.id }
      });

      expect(updatedSession?.status).toBe('NO_SHOW');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error
      const originalFindUnique = testDb.getPrismaClient().user.findUnique;
      jest.spyOn(testDb.getPrismaClient().user, 'findUnique')
        .mockRejectedValue(new Error('Database connection failed'));

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const request = {
        userId: testUser.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        vehicleInfo: {
          licensePlate: 'ERROR123'
        }
      };

      const result = await reservationService.createReservation(request);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to create reservation');

      // Restore original method
      testDb.getPrismaClient().user.findUnique = originalFindUnique;
    });

    it('should handle invalid user ID', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const request = {
        userId: 'invalid-user-id',
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        vehicleInfo: {
          licensePlate: 'INVALID123'
        }
      };

      const result = await reservationService.createReservation(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid or inactive user');
    });

    it('should handle concurrent reservation attempts', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const endTime = new Date(tomorrow);
      endTime.setHours(12, 0, 0, 0);

      // Create multiple concurrent reservation requests for the same spot
      const requests = Array.from({ length: 5 }, (_, i) => ({
        userId: testUser.id,
        spotId: testSpot.id,
        spotType: VehicleType.REGULAR,
        preferredFeatures: [],
        startTime: tomorrow,
        endTime,
        vehicleInfo: {
          licensePlate: `CONC${i.toString().padStart(3, '0')}`
        }
      }));

      const results = await Promise.all(
        requests.map(req => reservationService.createReservation(req))
      );

      // Only one should succeed, others should fail due to conflicts
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(4);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple reservation operations efficiently', async () => {
      const operations = [];
      const startTime = Date.now();

      // Create multiple reservations
      for (let i = 0; i < 10; i++) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9 + i, 0, 0, 0);
        
        const endTime = new Date(tomorrow);
        endTime.setHours(10 + i, 0, 0, 0);

        operations.push(reservationService.createReservation({
          userId: testUser.id,
          spotType: VehicleType.REGULAR,
          preferredFeatures: [],
          startTime: tomorrow,
          endTime,
          vehicleInfo: {
            licensePlate: `PERF${i.toString().padStart(3, '0')}`
          }
        }));
      }

      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // At least some should succeed (depending on spot availability)
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should maintain performance under load', async () => {
      const measurements = [];

      for (let i = 0; i < 3; i++) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1 + i); // Different days to avoid conflicts
        
        const request = {
          userId: testUser.id,
          spotType: VehicleType.REGULAR,
          preferredFeatures: [],
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
          vehicleInfo: {
            licensePlate: `LOAD${i.toString().padStart(3, '0')}`
          }
        };

        const { duration } = await TestUtils.measureExecutionTime(() =>
          reservationService.createReservation(request)
        );

        measurements.push(duration);
      }

      // Performance should be consistent
      const avgTime = measurements.reduce((a, b) => a + b) / measurements.length;
      const maxTime = Math.max(...measurements);

      expect(avgTime).toBeLessThan(1000); // Average under 1 second
      expect(maxTime).toBeLessThan(2000); // Max under 2 seconds
    });
  });
});