/**
 * Parking Service Transaction Tests
 * 
 * Tests for complex transactional parking operations including
 * vehicle parking, exiting, transfers, and error recovery.
 */

import { ParkingService } from '../../src/services/ParkingService';
import { DatabaseService } from '../../src/services/DatabaseService';
import { TransactionManager } from '../../src/services/TransactionManager';
import { SpotRepository } from '../../src/repositories/SpotRepository';
import { VehicleRepository } from '../../src/repositories/VehicleRepository';
import { SessionRepository } from '../../src/repositories/SessionRepository';
import {
  TransactionError,
  TransactionStatus,
  TransactionPriority
} from '../../src/types/transaction.types';
import { SpotStatus, VehicleType, SessionStatus } from '../../src/generated/prisma';
import { PrismaClient } from '../../src/generated/prisma';

describe('ParkingService Transaction Tests', () => {
  let parkingService: ParkingService;
  let databaseService: DatabaseService;
  let transactionManager: TransactionManager;
  let spotRepository: SpotRepository;
  let vehicleRepository: VehicleRepository;
  let sessionRepository: SessionRepository;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Use in-memory SQLite for testing
    process.env.DATABASE_URL = 'file:./test-parking.db';
    
    databaseService = DatabaseService.getInstance({
      enableLogging: false,
      connectionTimeout: 5000
    });
    
    await databaseService.initialize();
    prisma = databaseService.getClient();
    
    transactionManager = TransactionManager.getInstance(databaseService);
    spotRepository = new SpotRepository(databaseService);
    vehicleRepository = new VehicleRepository(databaseService);
    sessionRepository = new SessionRepository(databaseService);
    parkingService = new ParkingService(databaseService);
  });

  afterAll(async () => {
    await databaseService.shutdown();
    DatabaseService.reset();
    TransactionManager.reset();
  });

  beforeEach(async () => {
    // Clean up any existing data
    await prisma.parkingSession.deleteMany();
    await prisma.spot.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.garage.deleteMany();
    
    // Create test garage and spots
    const garage = await prisma.garage.create({
      data: {
        name: 'Test Garage',
        address: '123 Test St',
        totalSpots: 10
      }
    });
    
    // Create test spots
    await prisma.spot.createMany({
      data: [
        {
          garageId: garage.id,
          spotNumber: 'A001',
          floor: 1,
          status: 'AVAILABLE'
        },
        {
          garageId: garage.id,
          spotNumber: 'A002',
          floor: 1,
          status: 'AVAILABLE'
        },
        {
          garageId: garage.id,
          spotNumber: 'A003',
          floor: 1,
          status: 'AVAILABLE'
        }
      ]
    });
  });

  describe('Vehicle Parking Operations', () => {
    it('should park a new vehicle successfully', async () => {
      const spot = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      expect(spot).toBeDefined();

      const sessionData = {
        vehicle: {
          licensePlate: 'TEST123',
          vehicleType: 'STANDARD',
          color: 'Blue',
          make: 'Toyota',
          model: 'Camry',
          year: 2020
        },
        spotId: spot!.id,
        entryTime: new Date(),
        metadata: { source: 'mobile_app' }
      };

      const result = await parkingService.parkVehicle(sessionData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.session).toBeDefined();
      expect(result.data!.spot).toBeDefined();
      expect(result.data!.vehicle).toBeDefined();
      expect(result.transactionId).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);

      // Verify database state
      const updatedSpot = await prisma.spot.findUnique({ where: { id: spot!.id } });
      expect(updatedSpot!.status).toBe('OCCUPIED');
      expect(updatedSpot!.currentVehicleId).toBeDefined();

      const vehicle = await prisma.vehicle.findFirst({
        where: { licensePlate: 'TEST123' }
      });
      expect(vehicle).toBeDefined();
      expect(vehicle!.make).toBe('Toyota');

      const session = await prisma.parkingSession.findFirst({
        where: { vehicleId: vehicle!.id }
      });
      expect(session).toBeDefined();
      expect(session!.status).toBe('ACTIVE');
    });

    it('should park an existing vehicle successfully', async () => {
      // Create existing vehicle
      const existingVehicle = await prisma.vehicle.create({
        data: {
          licensePlate: 'EXIST123',
          vehicleType: 'STANDARD'
        }
      });

      const spot = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      expect(spot).toBeDefined();

      const sessionData = {
        vehicle: {
          licensePlate: 'EXIST123'
        },
        spotId: spot!.id
      };

      const result = await parkingService.parkVehicle(sessionData);

      expect(result.success).toBe(true);
      expect(result.data!.vehicle.id).toBe(existingVehicle.id);
      
      // Should not create duplicate vehicle
      const vehicleCount = await prisma.vehicle.count({
        where: { licensePlate: 'EXIST123' }
      });
      expect(vehicleCount).toBe(1);
    });

    it('should fail when spot is not available', async () => {
      const spot = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      
      // Make spot occupied
      await prisma.spot.update({
        where: { id: spot!.id },
        data: { status: 'OCCUPIED' }
      });

      const sessionData = {
        vehicle: {
          licensePlate: 'FAIL123'
        },
        spotId: spot!.id
      };

      const result = await parkingService.parkVehicle(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
      
      // No vehicle or session should be created
      const vehicle = await prisma.vehicle.findFirst({
        where: { licensePlate: 'FAIL123' }
      });
      expect(vehicle).toBeNull();
    });

    it('should fail when vehicle is already parked', async () => {
      // First park a vehicle
      const spot1 = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      
      const sessionData1 = {
        vehicle: { licensePlate: 'DUPLICATE123' },
        spotId: spot1!.id
      };
      
      const result1 = await parkingService.parkVehicle(sessionData1);
      expect(result1.success).toBe(true);

      // Try to park the same vehicle in another spot
      const spot2 = await prisma.spot.findFirst({
        where: { status: 'AVAILABLE', id: { not: spot1!.id } }
      });
      
      const sessionData2 = {
        vehicle: { licensePlate: 'DUPLICATE123' },
        spotId: spot2!.id
      };
      
      const result2 = await parkingService.parkVehicle(sessionData2);
      
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already parked');
      
      // Second spot should remain available
      const updatedSpot2 = await prisma.spot.findUnique({ where: { id: spot2!.id } });
      expect(updatedSpot2!.status).toBe('AVAILABLE');
    });

    it('should handle partial failures with rollback', async () => {
      const spot = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      
      // Mock a scenario where session creation fails
      const originalCreate = sessionRepository.create;
      sessionRepository.create = jest.fn().mockRejectedValue(
        new Error('Session creation failed')
      );

      const sessionData = {
        vehicle: {
          licensePlate: 'ROLLBACK123'
        },
        spotId: spot!.id
      };

      const result = await parkingService.parkVehicle(sessionData);

      expect(result.success).toBe(false);
      
      // Spot should remain available (rolled back)
      const updatedSpot = await prisma.spot.findUnique({ where: { id: spot!.id } });
      expect(updatedSpot!.status).toBe('AVAILABLE');
      
      // Vehicle should not exist (rolled back)
      const vehicle = await prisma.vehicle.findFirst({
        where: { licensePlate: 'ROLLBACK123' }
      });
      expect(vehicle).toBeNull();

      // Restore original method
      sessionRepository.create = originalCreate;
    });
  });

  describe('Vehicle Exit Operations', () => {
    let parkedVehicle: any;
    let parkedSpot: any;
    let activeSession: any;

    beforeEach(async () => {
      // Set up a parked vehicle
      const spot = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      
      const sessionData = {
        vehicle: {
          licensePlate: 'EXIT123',
          vehicleType: 'STANDARD'
        },
        spotId: spot!.id
      };
      
      const result = await parkingService.parkVehicle(sessionData);
      expect(result.success).toBe(true);
      
      parkedVehicle = result.data!.vehicle;
      parkedSpot = result.data!.spot;
      activeSession = result.data!.session;
    });

    it('should exit vehicle successfully', async () => {
      const exitTime = new Date();
      
      const result = await parkingService.exitVehicle(
        parkedVehicle.licensePlate,
        exitTime
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.session.status).toBe('COMPLETED');
      expect(result.data!.spot.status).toBe('AVAILABLE');
      expect(result.data!.payment).toBeDefined();
      expect(result.data!.payment.amount).toBeGreaterThan(0);

      // Verify database state
      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: activeSession.id }
      });
      expect(updatedSession!.status).toBe('COMPLETED');
      expect(updatedSession!.exitTime).toBeDefined();
      expect(updatedSession!.totalFee).toBeGreaterThan(0);

      const updatedSpot = await prisma.spot.findUnique({
        where: { id: parkedSpot.id }
      });
      expect(updatedSpot!.status).toBe('AVAILABLE');
      expect(updatedSpot!.currentVehicleId).toBeNull();
    });

    it('should calculate correct parking fees', async () => {
      // Park for exactly 2 hours by backdating the entry time
      const twoHoursAgo = new Date(Date.now() - (2 * 60 * 60 * 1000));
      await prisma.parkingSession.update({
        where: { id: activeSession.id },
        data: { entryTime: twoHoursAgo }
      });

      const result = await parkingService.exitVehicle(parkedVehicle.licensePlate);

      expect(result.success).toBe(true);
      expect(result.data!.payment.hours).toBe(2);
      expect(result.data!.payment.amount).toBe(8); // $5 + $3 = $8 for 2 hours
    });

    it('should fail when vehicle not found', async () => {
      const result = await parkingService.exitVehicle('NOTFOUND123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail when no active session', async () => {
      // End the session first
      await prisma.parkingSession.update({
        where: { id: activeSession.id },
        data: { status: 'COMPLETED' }
      });

      const result = await parkingService.exitVehicle(parkedVehicle.licensePlate);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active parking session');
    });
  });

  describe('Vehicle Transfer Operations', () => {
    let parkedVehicle: any;
    let sourceSpot: any;
    let targetSpot: any;
    let activeSession: any;

    beforeEach(async () => {
      const spots = await prisma.spot.findMany({ where: { status: 'AVAILABLE' } });
      sourceSpot = spots[0];
      targetSpot = spots[1];
      
      // Park a vehicle
      const sessionData = {
        vehicle: {
          licensePlate: 'TRANSFER123'
        },
        spotId: sourceSpot.id
      };
      
      const result = await parkingService.parkVehicle(sessionData);
      expect(result.success).toBe(true);
      
      parkedVehicle = result.data!.vehicle;
      activeSession = result.data!.session;
    });

    it('should transfer vehicle successfully', async () => {
      const transferData = {
        fromSpotId: sourceSpot.id,
        toSpotId: targetSpot.id,
        reason: 'Customer request',
        metadata: { requestedBy: 'admin' }
      };

      const result = await parkingService.transferVehicle(transferData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.session.spotId).toBe(targetSpot.id);
      expect(result.data!.fromSpot.status).toBe('AVAILABLE');
      expect(result.data!.toSpot.status).toBe('OCCUPIED');

      // Verify database state
      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: activeSession.id }
      });
      expect(updatedSession!.spotId).toBe(targetSpot.id);

      const updatedSourceSpot = await prisma.spot.findUnique({
        where: { id: sourceSpot.id }
      });
      expect(updatedSourceSpot!.status).toBe('AVAILABLE');
      expect(updatedSourceSpot!.currentVehicleId).toBeNull();

      const updatedTargetSpot = await prisma.spot.findUnique({
        where: { id: targetSpot.id }
      });
      expect(updatedTargetSpot!.status).toBe('OCCUPIED');
      expect(updatedTargetSpot!.currentVehicleId).toBe(parkedVehicle.id);
    });

    it('should fail when source spot is not occupied', async () => {
      // Make source spot available first
      await prisma.spot.update({
        where: { id: sourceSpot.id },
        data: { status: 'AVAILABLE', currentVehicleId: null }
      });

      const transferData = {
        fromSpotId: sourceSpot.id,
        toSpotId: targetSpot.id
      };

      const result = await parkingService.transferVehicle(transferData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not occupied');
    });

    it('should fail when target spot is not available', async () => {
      // Make target spot occupied
      await prisma.spot.update({
        where: { id: targetSpot.id },
        data: { status: 'OCCUPIED' }
      });

      const transferData = {
        fromSpotId: sourceSpot.id,
        toSpotId: targetSpot.id
      };

      const result = await parkingService.transferVehicle(transferData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });
  });

  describe('Bulk Operations', () => {
    it('should update multiple spot statuses successfully', async () => {
      const spots = await prisma.spot.findMany({ where: { status: 'AVAILABLE' } });
      const spotIds = spots.map(s => s.id);

      const result = await parkingService.bulkUpdateSpotStatus(
        spotIds,
        'MAINTENANCE',
        'Scheduled maintenance'
      );

      expect(result.success).toBe(true);
      expect(result.data!.updatedCount).toBe(spotIds.length);
      expect(result.data!.spots).toHaveLength(spotIds.length);

      // Verify all spots are updated
      const updatedSpots = await prisma.spot.findMany({
        where: { id: { in: spotIds } }
      });
      
      updatedSpots.forEach(spot => {
        expect(spot.status).toBe('MAINTENANCE');
      });
    });

    it('should handle partial batch failures with rollback', async () => {
      const spots = await prisma.spot.findMany({ where: { status: 'AVAILABLE' } });
      const spotIds = [...spots.map(s => s.id), 'non-existent-id'];

      const result = await parkingService.bulkUpdateSpotStatus(
        spotIds,
        'MAINTENANCE'
      );

      expect(result.success).toBe(false);
      
      // All spots should remain unchanged due to rollback
      const unchangedSpots = await prisma.spot.findMany({
        where: { id: { in: spots.map(s => s.id) } }
      });
      
      unchangedSpots.forEach(spot => {
        expect(spot.status).toBe('AVAILABLE');
      });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent parking attempts gracefully', async () => {
      const spot = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      
      const sessionData1 = {
        vehicle: { licensePlate: 'CONCURRENT1' },
        spotId: spot!.id
      };
      
      const sessionData2 = {
        vehicle: { licensePlate: 'CONCURRENT2' },
        spotId: spot!.id
      };

      // Attempt to park two vehicles in the same spot concurrently
      const promises = [
        parkingService.parkVehicle(sessionData1),
        parkingService.parkVehicle(sessionData2)
      ];

      const results = await Promise.all(promises);
      
      // Only one should succeed
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
      
      // Spot should be occupied by exactly one vehicle
      const finalSpot = await prisma.spot.findUnique({ where: { id: spot!.id } });
      expect(finalSpot!.status).toBe('OCCUPIED');
      
      // Only one session should exist
      const sessionCount = await prisma.parkingSession.count({
        where: { spotId: spot!.id }
      });
      expect(sessionCount).toBe(1);
    });
  });

  describe('Service Statistics', () => {
    it('should provide accurate service statistics', async () => {
      // Execute some operations to generate statistics
      const spot = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      
      // Successful parking
      await parkingService.parkVehicle({
        vehicle: { licensePlate: 'STATS1' },
        spotId: spot!.id
      });
      
      // Failed parking (try same spot again)
      await parkingService.parkVehicle({
        vehicle: { licensePlate: 'STATS2' },
        spotId: spot!.id
      });
      
      const stats = await parkingService.getServiceStatistics();
      
      expect(stats.totalTransactions).toBeGreaterThanOrEqual(2);
      expect(stats.successRate).toBeLessThan(100); // Due to the failure
      expect(stats.averageDuration).toBeGreaterThan(0);
    });
  });
});
