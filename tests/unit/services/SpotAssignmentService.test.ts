/**
 * Test suite for SpotAssignmentService
 * Tests the production-ready implementation with actual database operations
 */

import { describe, it, beforeEach, afterEach, beforeAll, afterAll, expect } from '@jest/globals';
import { SpotAssignmentService } from '../../../src/services/SpotAssignmentService';
import { VehicleType } from '../../../src/types/models';
import { prisma } from '../../../src/config/database';
import { PrismaClient } from '@prisma/client';

describe('SpotAssignmentService', () => {
  let service: SpotAssignmentService;
  let testClient: PrismaClient;

  beforeAll(async () => {
    // Use a test database for integration tests
    testClient = prisma;
    await testClient.$connect();
  });

  afterAll(async () => {
    await testClient.$disconnect();
  });

  beforeEach(() => {
    service = new SpotAssignmentService();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await testClient.parkingSession.deleteMany();
    await testClient.vehicle.deleteMany();
    await testClient.parkingSpot.updateMany({
      where: { status: 'OCCUPIED' },
      data: { status: 'AVAILABLE' }
    });
  });

  describe('getAvailabilityByVehicleType', () => {
    it('should return actual availability from database', async () => {
      // Create test spots
      const floor = await testClient.floor.create({
        data: {
          floorNumber: 1,
          totalSpots: 3,
          garage: {
            create: {
              name: 'Test Garage',
              totalFloors: 1,
              totalSpots: 3
            }
          }
        }
      });

      await testClient.parkingSpot.createMany({
        data: [
          {
            spotNumber: 'A-001',
            floorId: floor.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'AVAILABLE'
          },
          {
            spotNumber: 'A-002',
            floorId: floor.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'AVAILABLE'
          },
          {
            spotNumber: 'A-003',
            floorId: floor.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'OCCUPIED'
          }
        ]
      });

      const result = await service.getAvailabilityByVehicleType('standard' as VehicleType);

      expect(result).toBeDefined();
      expect(result.total).toBe(3);
      expect(result.available).toBe(2);
      expect(result.occupied).toBe(1);
      expect(result.hasAvailable).toBe(true);
    });

    it('should handle no available spots', async () => {
      const result = await service.getAvailabilityByVehicleType('oversized' as VehicleType);
      
      expect(result.total).toBe(0);
      expect(result.available).toBe(0);
      expect(result.hasAvailable).toBe(false);
    });
  });

  describe('assignSpot', () => {
    it('should successfully assign a spot and create parking session', async () => {
      // Create test garage and spot
      const floor = await testClient.floor.create({
        data: {
          floorNumber: 1,
          totalSpots: 1,
          garage: {
            create: {
              name: 'Test Garage',
              totalFloors: 1,
              totalSpots: 1
            }
          }
        }
      });

      await testClient.parkingSpot.create({
        data: {
          spotNumber: 'A-001',
          floorId: floor.id,
          level: 1,
          spotType: 'STANDARD',
          status: 'AVAILABLE'
        }
      });

      const result = await service.assignSpot('TEST123', 'standard' as VehicleType);

      expect(result.success).toBe(true);
      expect(result.assignedSpot).toBeDefined();
      expect(result.parkingSession).toBeDefined();
      expect(result.spotLocation).toContain('Floor 1');

      // Verify database state
      const updatedSpot = await testClient.parkingSpot.findFirst({
        where: { spotNumber: 'A-001' }
      });
      expect(updatedSpot?.status).toBe('OCCUPIED');

      const vehicle = await testClient.vehicle.findUnique({
        where: { licensePlate: 'TEST123' }
      });
      expect(vehicle).toBeDefined();
      expect(vehicle?.status).toBe('PARKED');

      const session = await testClient.parkingSession.findFirst({
        where: { vehicleId: vehicle?.id }
      });
      expect(session).toBeDefined();
      expect(session?.status).toBe('ACTIVE');
    });

    it('should handle no available spots', async () => {
      const result = await service.assignSpot('TEST456', 'standard' as VehicleType);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No available spots found');
    });

    it('should handle vehicle compatibility', async () => {
      // Create only compact spot
      const floor = await testClient.floor.create({
        data: {
          floorNumber: 1,
          totalSpots: 1,
          garage: {
            create: {
              name: 'Test Garage',
              totalFloors: 1,
              totalSpots: 1
            }
          }
        }
      });

      await testClient.parkingSpot.create({
        data: {
          spotNumber: 'A-001',
          floorId: floor.id,
          level: 1,
          spotType: 'COMPACT',
          status: 'AVAILABLE'
        }
      });

      // Try to assign standard vehicle to compact spot
      const result = await service.assignSpot('STANDARD123', 'standard' as VehicleType);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vehicle not compatible with available spots');
    });

    it('should update existing vehicle record', async () => {
      // Create test spot
      const floor = await testClient.floor.create({
        data: {
          floorNumber: 1,
          totalSpots: 1,
          garage: {
            create: {
              name: 'Test Garage',
              totalFloors: 1,
              totalSpots: 1
            }
          }
        }
      });

      await testClient.parkingSpot.create({
        data: {
          spotNumber: 'A-001',
          floorId: floor.id,
          level: 1,
          spotType: 'STANDARD',
          status: 'AVAILABLE'
        }
      });

      // Create existing vehicle
      await testClient.vehicle.create({
        data: {
          licensePlate: 'EXISTING123',
          vehicleType: 'STANDARD',
          status: 'DEPARTED'
        }
      });

      const result = await service.assignSpot('EXISTING123', 'standard' as VehicleType);

      expect(result.success).toBe(true);
      
      // Verify vehicle was updated, not created new
      const vehicles = await testClient.vehicle.findMany({
        where: { licensePlate: 'EXISTING123' }
      });
      expect(vehicles.length).toBe(1);
      expect(vehicles[0].status).toBe('PARKED');
    });
  });

  describe('findBestSpot', () => {
    it('should find and return best available spot', async () => {
      // Create test spots on different floors
      const floor1 = await testClient.floor.create({
        data: {
          floorNumber: 1,
          totalSpots: 2,
          garage: {
            create: {
              name: 'Test Garage',
              totalFloors: 2,
              totalSpots: 4
            }
          }
        }
      });

      const floor2 = await testClient.floor.create({
        data: {
          floorNumber: 2,
          totalSpots: 2,
          garageId: floor1.garageId
        }
      });

      await testClient.parkingSpot.createMany({
        data: [
          {
            spotNumber: 'A-101',
            floorId: floor1.id,
            level: 1,
            section: 'A',
            spotType: 'STANDARD',
            status: 'AVAILABLE'
          },
          {
            spotNumber: 'A-201',
            floorId: floor2.id,
            level: 2,
            section: 'A',
            spotType: 'STANDARD',
            status: 'AVAILABLE'
          }
        ]
      });

      const result = await service.findBestSpot('standard' as VehicleType);

      expect(result).toBeDefined();
      // Should prefer lower floor (floor 1)
      expect(result.level).toBe(1);
    });

    it('should respect floor preference', async () => {
      const floor1 = await testClient.floor.create({
        data: {
          floorNumber: 1,
          totalSpots: 1,
          garage: {
            create: {
              name: 'Test Garage',
              totalFloors: 2,
              totalSpots: 2
            }
          }
        }
      });

      const floor2 = await testClient.floor.create({
        data: {
          floorNumber: 2,
          totalSpots: 1,
          garageId: floor1.garageId
        }
      });

      await testClient.parkingSpot.createMany({
        data: [
          {
            spotNumber: 'A-101',
            floorId: floor1.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'AVAILABLE'
          },
          {
            spotNumber: 'A-201',
            floorId: floor2.id,
            level: 2,
            spotType: 'STANDARD',
            status: 'AVAILABLE'
          }
        ]
      });

      const result = await service.findBestSpot('standard' as VehicleType, { 
        preferredFloor: 2 
      });

      expect(result).toBeDefined();
      expect(result.level).toBe(2);
    });
  });

  describe('getAssignmentStats', () => {
    it('should return actual statistics from database', async () => {
      // Create test data
      const floor = await testClient.floor.create({
        data: {
          floorNumber: 1,
          totalSpots: 2,
          garage: {
            create: {
              name: 'Test Garage',
              totalFloors: 1,
              totalSpots: 2
            }
          }
        }
      });

      const spot = await testClient.parkingSpot.create({
        data: {
          spotNumber: 'A-001',
          floorId: floor.id,
          level: 1,
          spotType: 'STANDARD',
          status: 'OCCUPIED'
        }
      });

      const vehicle = await testClient.vehicle.create({
        data: {
          licensePlate: 'STATS123',
          vehicleType: 'STANDARD',
          status: 'PARKED',
          spotId: spot.id
        }
      });

      await testClient.parkingSession.create({
        data: {
          vehicleId: vehicle.id,
          spotId: spot.id,
          status: 'ACTIVE',
          hourlyRate: 5.0
        }
      });

      await testClient.parkingSpot.create({
        data: {
          spotNumber: 'A-002',
          floorId: floor.id,
          level: 1,
          spotType: 'STANDARD',
          status: 'AVAILABLE'
        }
      });

      const result = await service.getAssignmentStats();

      expect(result).toBeDefined();
      expect(result.totalSpots).toBe(2);
      expect(result.occupiedSpots).toBe(1);
      expect(result.availableSpots).toBe(1);
      expect(result.activeAssignments).toBe(1);
      expect(result.occupancyRate).toBe(50);
    });
  });
});