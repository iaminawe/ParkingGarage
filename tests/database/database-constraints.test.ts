/**
 * Database Constraints and Business Rules Tests
 * Tests all database triggers, constraints, and business logic validation
 */

import { PrismaClient } from '@prisma/client';
import { DatabaseConstraintsValidator } from '../../src/utils/database-constraints';

describe('Database Constraints and Business Rules', () => {
  let prisma: PrismaClient;
  let validator: DatabaseConstraintsValidator;
  let testGarage: any;
  let testFloor: any;
  let testSpot: any;
  let testVehicle: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    validator = new DatabaseConstraintsValidator(prisma);
    await prisma.$connect();

    // Create test data
    testGarage = await prisma.garage.create({
      data: {
        name: 'Test Garage Constraints',
        description: 'Test garage for constraint validation',
        totalFloors: 1,
        totalSpots: 1,
      },
    });

    testFloor = await prisma.floor.create({
      data: {
        garageId: testGarage.id,
        floorNumber: 1,
        totalSpots: 1,
      },
    });

    testSpot = await prisma.parkingSpot.create({
      data: {
        spotNumber: 'TEST-001',
        floorId: testFloor.id,
        level: 1,
        spotType: 'STANDARD',
        status: 'AVAILABLE',
        width: 10.0,
        length: 20.0,
        height: 3.0,
      },
    });

    testVehicle = await prisma.vehicle.create({
      data: {
        licensePlate: 'TEST-001',
        vehicleType: 'STANDARD',
        ownerName: 'Test Owner',
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.parkingSession.deleteMany({ where: { vehicleId: testVehicle.id } });
    await prisma.payment.deleteMany({ where: { vehicleId: testVehicle.id } });
    await prisma.vehicle.deleteMany({ where: { licensePlate: 'TEST-001' } });
    await prisma.parkingSpot.deleteMany({ where: { spotNumber: { startsWith: 'TEST-' } } });
    await prisma.floor.deleteMany({ where: { garageId: testGarage.id } });
    await prisma.garage.deleteMany({ where: { name: { startsWith: 'Test Garage' } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset spot status before each test
    await prisma.parkingSpot.update({
      where: { id: testSpot.id },
      data: { status: 'AVAILABLE' },
    });

    // Clean up any existing sessions
    await prisma.parkingSession.deleteMany({ where: { vehicleId: testVehicle.id } });
    await prisma.payment.deleteMany({ where: { vehicleId: testVehicle.id } });
  });

  describe('Parking Session Constraints', () => {
    test('should prevent endTime before startTime', async () => {
      const startTime = new Date('2025-01-01T10:00:00Z');
      const endTime = new Date('2025-01-01T09:00:00Z'); // Before start time

      await expect(
        prisma.parkingSession.create({
          data: {
            vehicleId: testVehicle.id,
            spotId: testSpot.id,
            startTime,
            endTime,
            hourlyRate: 5.0,
            status: 'COMPLETED',
          },
        })
      ).rejects.toThrow('End time must be after start time');
    });

    test('should prevent negative duration', async () => {
      await expect(
        prisma.parkingSession.create({
          data: {
            vehicleId: testVehicle.id,
            spotId: testSpot.id,
            duration: -30,
            hourlyRate: 5.0,
          },
        })
      ).rejects.toThrow('Session duration must be positive');
    });

    test('should prevent zero or negative hourly rate', async () => {
      await expect(
        prisma.parkingSession.create({
          data: {
            vehicleId: testVehicle.id,
            spotId: testSpot.id,
            hourlyRate: 0,
          },
        })
      ).rejects.toThrow('Hourly rate must be positive');

      await expect(
        prisma.parkingSession.create({
          data: {
            vehicleId: testVehicle.id,
            spotId: testSpot.id,
            hourlyRate: -5.0,
          },
        })
      ).rejects.toThrow('Hourly rate must be positive');
    });

    test('should prevent negative total amount', async () => {
      await expect(
        prisma.parkingSession.create({
          data: {
            vehicleId: testVehicle.id,
            spotId: testSpot.id,
            hourlyRate: 5.0,
            totalAmount: -10.0,
          },
        })
      ).rejects.toThrow('Total amount must be non-negative');
    });

    test('should prevent negative amount paid', async () => {
      await expect(
        prisma.parkingSession.create({
          data: {
            vehicleId: testVehicle.id,
            spotId: testSpot.id,
            hourlyRate: 5.0,
            amountPaid: -5.0,
          },
        })
      ).rejects.toThrow('Amount paid must be non-negative');
    });

    test('should prevent overlapping vehicle sessions', async () => {
      // Create first active session
      await prisma.parkingSession.create({
        data: {
          vehicleId: testVehicle.id,
          spotId: testSpot.id,
          hourlyRate: 5.0,
          status: 'ACTIVE',
        },
      });

      // Create another spot for the second session
      const secondSpot = await prisma.parkingSpot.create({
        data: {
          spotNumber: 'TEST-002',
          floorId: testFloor.id,
          level: 1,
          spotType: 'STANDARD',
          status: 'AVAILABLE',
        },
      });

      // Try to create another active session for same vehicle
      await expect(
        prisma.parkingSession.create({
          data: {
            vehicleId: testVehicle.id,
            spotId: secondSpot.id,
            hourlyRate: 5.0,
            status: 'ACTIVE',
          },
        })
      ).rejects.toThrow('Vehicle already has an active parking session');

      // Cleanup
      await prisma.parkingSpot.delete({ where: { id: secondSpot.id } });
    });

    test('should prevent double-booking of spots', async () => {
      // Create first active session
      await prisma.parkingSession.create({
        data: {
          vehicleId: testVehicle.id,
          spotId: testSpot.id,
          hourlyRate: 5.0,
          status: 'ACTIVE',
        },
      });

      // Create another vehicle for the second session
      const secondVehicle = await prisma.vehicle.create({
        data: {
          licensePlate: 'TEST-002',
          vehicleType: 'STANDARD',
          ownerName: 'Test Owner 2',
        },
      });

      // Try to create another active session for same spot
      await expect(
        prisma.parkingSession.create({
          data: {
            vehicleId: secondVehicle.id,
            spotId: testSpot.id,
            hourlyRate: 5.0,
            status: 'ACTIVE',
          },
        })
      ).rejects.toThrow('Parking spot is already occupied');

      // Cleanup
      await prisma.vehicle.delete({ where: { id: secondVehicle.id } });
    });

    test('should auto-update spot status when session starts', async () => {
      const session = await prisma.parkingSession.create({
        data: {
          vehicleId: testVehicle.id,
          spotId: testSpot.id,
          hourlyRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const updatedSpot = await prisma.parkingSpot.findUnique({
        where: { id: testSpot.id },
      });

      expect(updatedSpot?.status).toBe('OCCUPIED');
    });

    test('should auto-update spot status when session ends', async () => {
      const session = await prisma.parkingSession.create({
        data: {
          vehicleId: testVehicle.id,
          spotId: testSpot.id,
          hourlyRate: 5.0,
          status: 'ACTIVE',
        },
      });

      // Update session to completed
      await prisma.parkingSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED' },
      });

      const updatedSpot = await prisma.parkingSpot.findUnique({
        where: { id: testSpot.id },
      });

      expect(updatedSpot?.status).toBe('AVAILABLE');
    });

    test('should validate vehicle and spot type compatibility', async () => {
      // Create a motorcycle parking spot
      const motorcycleSpot = await prisma.parkingSpot.create({
        data: {
          spotNumber: 'MOTO-001',
          floorId: testFloor.id,
          level: 1,
          spotType: 'MOTORCYCLE',
          status: 'AVAILABLE',
        },
      });

      // Try to park a standard vehicle in motorcycle spot
      await expect(
        prisma.parkingSession.create({
          data: {
            vehicleId: testVehicle.id,
            spotId: motorcycleSpot.id,
            hourlyRate: 5.0,
            status: 'ACTIVE',
          },
        })
      ).rejects.toThrow('Vehicle type not compatible with spot type');

      // Cleanup
      await prisma.parkingSpot.delete({ where: { id: motorcycleSpot.id } });
    });

    test('should auto-calculate session duration', async () => {
      const startTime = new Date('2025-01-01T10:00:00Z');
      const endTime = new Date('2025-01-01T12:00:00Z'); // 2 hours = 120 minutes

      const session = await prisma.parkingSession.create({
        data: {
          vehicleId: testVehicle.id,
          spotId: testSpot.id,
          startTime,
          hourlyRate: 5.0,
          status: 'ACTIVE',
        },
      });

      // Update with end time to trigger duration calculation
      await prisma.parkingSession.update({
        where: { id: session.id },
        data: { endTime },
      });

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: session.id },
      });

      expect(updatedSession?.duration).toBe(120);
    });

    test('should auto-calculate total amount based on duration and rate', async () => {
      const session = await prisma.parkingSession.create({
        data: {
          vehicleId: testVehicle.id,
          spotId: testSpot.id,
          hourlyRate: 5.0,
          status: 'ACTIVE',
        },
      });

      // Update with duration to trigger amount calculation
      await prisma.parkingSession.update({
        where: { id: session.id },
        data: { duration: 120 }, // 2 hours
      });

      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: session.id },
      });

      expect(updatedSession?.totalAmount).toBe(10.0); // 2 hours * $5/hour
    });

    test('should sync vehicle status with session status', async () => {
      const session = await prisma.parkingSession.create({
        data: {
          vehicleId: testVehicle.id,
          spotId: testSpot.id,
          hourlyRate: 5.0,
          status: 'ACTIVE',
        },
      });

      let vehicle = await prisma.vehicle.findUnique({
        where: { id: testVehicle.id },
      });
      expect(vehicle?.status).toBe('PARKED');

      // Update session to completed
      await prisma.parkingSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED' },
      });

      vehicle = await prisma.vehicle.findUnique({
        where: { id: testVehicle.id },
      });
      expect(vehicle?.status).toBe('DEPARTED');
    });
  });

  describe('Payment Constraints', () => {
    test('should prevent zero or negative payment amount', async () => {
      await expect(
        prisma.payment.create({
          data: {
            amount: 0,
            paymentMethod: 'CREDIT_CARD',
            vehicleId: testVehicle.id,
          },
        })
      ).rejects.toThrow('Payment amount must be positive');

      await expect(
        prisma.payment.create({
          data: {
            amount: -10.0,
            paymentMethod: 'CREDIT_CARD',
            vehicleId: testVehicle.id,
          },
        })
      ).rejects.toThrow('Payment amount must be positive');
    });

    test('should prevent negative refund amount', async () => {
      await expect(
        prisma.payment.create({
          data: {
            amount: 10.0,
            refundAmount: -5.0,
            paymentMethod: 'CREDIT_CARD',
            vehicleId: testVehicle.id,
          },
        })
      ).rejects.toThrow('Refund amount must be non-negative');
    });

    test('should validate referenced session exists', async () => {
      await expect(
        prisma.payment.create({
          data: {
            amount: 10.0,
            paymentMethod: 'CREDIT_CARD',
            sessionId: 'non-existent-session-id',
          },
        })
      ).rejects.toThrow('Referenced parking session does not exist');
    });

    test('should validate referenced vehicle exists', async () => {
      await expect(
        prisma.payment.create({
          data: {
            amount: 10.0,
            paymentMethod: 'CREDIT_CARD',
            vehicleId: 'non-existent-vehicle-id',
          },
        })
      ).rejects.toThrow('Referenced vehicle does not exist');
    });
  });

  describe('Parking Spot Constraints', () => {
    test('should prevent zero or negative spot dimensions', async () => {
      await expect(
        prisma.parkingSpot.create({
          data: {
            spotNumber: 'INVALID-001',
            floorId: testFloor.id,
            level: 1,
            width: 0,
            spotType: 'STANDARD',
          },
        })
      ).rejects.toThrow('Spot dimensions must be positive');

      await expect(
        prisma.parkingSpot.create({
          data: {
            spotNumber: 'INVALID-002',
            floorId: testFloor.id,
            level: 1,
            length: -5.0,
            spotType: 'STANDARD',
          },
        })
      ).rejects.toThrow('Spot dimensions must be positive');
    });
  });

  describe('Garage and Floor Constraints', () => {
    test('should prevent zero or negative total floors in garage', async () => {
      await expect(
        prisma.garage.create({
          data: {
            name: 'Invalid Garage 1',
            totalFloors: 0,
          },
        })
      ).rejects.toThrow('Total floors must be positive');

      await expect(
        prisma.garage.create({
          data: {
            name: 'Invalid Garage 2',
            totalFloors: -1,
          },
        })
      ).rejects.toThrow('Total floors must be positive');
    });

    test('should prevent negative total spots in garage', async () => {
      await expect(
        prisma.garage.create({
          data: {
            name: 'Invalid Garage 3',
            totalSpots: -5,
          },
        })
      ).rejects.toThrow('Total spots must be non-negative');
    });

    test('should prevent zero or negative floor number', async () => {
      await expect(
        prisma.floor.create({
          data: {
            garageId: testGarage.id,
            floorNumber: 0,
          },
        })
      ).rejects.toThrow('Floor number must be positive');

      await expect(
        prisma.floor.create({
          data: {
            garageId: testGarage.id,
            floorNumber: -1,
          },
        })
      ).rejects.toThrow('Floor number must be positive');
    });

    test('should prevent negative total spots in floor', async () => {
      await expect(
        prisma.floor.create({
          data: {
            garageId: testGarage.id,
            floorNumber: 2,
            totalSpots: -1,
          },
        })
      ).rejects.toThrow('Floor total spots must be non-negative');
    });
  });

  describe('Unique Constraints', () => {
    test('should enforce unique active vehicle sessions', async () => {
      // This is already tested in the overlapping sessions test above
      // but we can add additional verification here
      const activeSession = await prisma.parkingSession.create({
        data: {
          vehicleId: testVehicle.id,
          spotId: testSpot.id,
          hourlyRate: 5.0,
          status: 'ACTIVE',
        },
      });

      expect(activeSession.status).toBe('ACTIVE');
      
      // Query should only return one active session for this vehicle
      const activeSessions = await prisma.parkingSession.findMany({
        where: {
          vehicleId: testVehicle.id,
          status: 'ACTIVE',
        },
      });

      expect(activeSessions).toHaveLength(1);
    });

    test('should enforce unique active spot sessions', async () => {
      const activeSession = await prisma.parkingSession.create({
        data: {
          vehicleId: testVehicle.id,
          spotId: testSpot.id,
          hourlyRate: 5.0,
          status: 'ACTIVE',
        },
      });

      expect(activeSession.status).toBe('ACTIVE');
      
      // Query should only return one active session for this spot
      const activeSessions = await prisma.parkingSession.findMany({
        where: {
          spotId: testSpot.id,
          status: 'ACTIVE',
        },
      });

      expect(activeSessions).toHaveLength(1);
    });
  });

  describe('Application-Level Constraints Validator', () => {
    test('should validate parking session creation', async () => {
      const sessionData = {
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        startTime: new Date(),
        hourlyRate: 5.0,
      };

      const validation = await validator.validateParkingSessionCreation(sessionData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect invalid parking session data', async () => {
      // Create an active session first
      await prisma.parkingSession.create({
        data: {
          vehicleId: testVehicle.id,
          spotId: testSpot.id,
          hourlyRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const sessionData = {
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        startTime: new Date(),
        hourlyRate: 0, // Invalid rate
      };

      const validation = await validator.validateParkingSessionCreation(sessionData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Vehicle already has an active parking session');
      expect(validation.errors).toContain('Hourly rate must be positive');
    });

    test('should validate spot availability', async () => {
      const availability = await validator.validateSpotAvailability(
        testSpot.id,
        new Date(),
        new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours later
      );

      expect(availability.isAvailable).toBe(true);
    });

    test('should calculate parking cost correctly', async () => {
      const startTime = new Date('2025-01-01T10:00:00Z');
      const endTime = new Date('2025-01-01T12:30:00Z'); // 2.5 hours
      const hourlyRate = 5.0;

      const cost = validator.calculateParkingCost(startTime, endTime, hourlyRate);
      
      expect(cost.duration).toBe(150); // 2.5 hours = 150 minutes
      expect(cost.totalAmount).toBe(12.5); // 2.5 hours * $5/hour
    });

    test('should validate garage capacity', async () => {
      const capacity = await validator.validateGarageCapacity(testGarage.id);
      
      expect(capacity.isValid).toBe(true);
      expect(capacity.totalCapacity).toBeGreaterThan(0);
      expect(capacity.availableSpots).toBeGreaterThanOrEqual(0);
    });

    test('should validate floor capacity', async () => {
      const capacity = await validator.validateFloorCapacity(testFloor.id);
      
      expect(capacity.isValid).toBe(true);
      expect(capacity.actualSpots).toBeGreaterThanOrEqual(0);
      expect(capacity.declaredSpots).toBeGreaterThanOrEqual(0);
    });

    test('should validate and cleanup orphaned records', async () => {
      const cleanup = await validator.validateAndCleanupOrphanedRecords();
      
      expect(cleanup.orphanedPayments).toBeGreaterThanOrEqual(0);
      expect(cleanup.orphanedSessions).toBeGreaterThanOrEqual(0);
      expect(cleanup.inconsistentSpotStatus).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Index Validation', () => {
    test('should handle concurrent session creation attempts', async () => {
      const promises = [];
      
      // Create multiple vehicles for concurrent testing
      const vehicles = [];
      for (let i = 0; i < 5; i++) {
        vehicles.push(await prisma.vehicle.create({
          data: {
            licensePlate: `CONCURRENT-${i}`,
            vehicleType: 'STANDARD',
            ownerName: `Test Owner ${i}`,
          },
        }));
      }

      // Create multiple spots
      const spots = [];
      for (let i = 0; i < 5; i++) {
        spots.push(await prisma.parkingSpot.create({
          data: {
            spotNumber: `CONCURRENT-${i}`,
            floorId: testFloor.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'AVAILABLE',
          },
        }));
      }

      // Try to create sessions concurrently
      for (let i = 0; i < 5; i++) {
        promises.push(
          prisma.parkingSession.create({
            data: {
              vehicleId: vehicles[i].id,
              spotId: spots[i].id,
              hourlyRate: 5.0,
              status: 'ACTIVE',
            },
          })
        );
      }

      const results = await Promise.allSettled(promises);
      
      // All should succeed since they're using different vehicles and spots
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(5);

      // Cleanup
      await prisma.parkingSession.deleteMany({
        where: {
          vehicleId: { in: vehicles.map(v => v.id) },
        },
      });
      await prisma.vehicle.deleteMany({
        where: {
          id: { in: vehicles.map(v => v.id) },
        },
      });
      await prisma.parkingSpot.deleteMany({
        where: {
          id: { in: spots.map(s => s.id) },
        },
      });
    });

    test('should efficiently query with indexes', async () => {
      // Create some test data for performance testing
      const testSessions = [];
      for (let i = 0; i < 10; i++) {
        const vehicle = await prisma.vehicle.create({
          data: {
            licensePlate: `PERF-${i}`,
            vehicleType: 'STANDARD',
            ownerName: `Perf Test ${i}`,
          },
        });

        const spot = await prisma.parkingSpot.create({
          data: {
            spotNumber: `PERF-${i}`,
            floorId: testFloor.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'AVAILABLE',
          },
        });

        testSessions.push(await prisma.parkingSession.create({
          data: {
            vehicleId: vehicle.id,
            spotId: spot.id,
            hourlyRate: 5.0,
            status: i % 2 === 0 ? 'ACTIVE' : 'COMPLETED',
            startTime: new Date(Date.now() - i * 60 * 60 * 1000),
          },
        }));
      }

      // Test indexed queries
      const startTime = Date.now();
      
      const activeSessions = await prisma.parkingSession.findMany({
        where: { status: 'ACTIVE' },
        include: { vehicle: true, spot: true },
      });

      const availableSpots = await prisma.parkingSpot.findMany({
        where: { status: 'AVAILABLE', isActive: true },
      });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      // Queries should be fast (under 100ms for this small dataset)
      expect(queryTime).toBeLessThan(100);
      expect(activeSessions.length).toBeGreaterThan(0);
      expect(availableSpots.length).toBeGreaterThan(0);

      // Cleanup performance test data
      const vehicleIds = testSessions.map(s => s.vehicleId);
      const spotIds = testSessions.map(s => s.spotId);
      
      await prisma.parkingSession.deleteMany({
        where: { id: { in: testSessions.map(s => s.id) } },
      });
      await prisma.vehicle.deleteMany({
        where: { id: { in: vehicleIds } },
      });
      await prisma.parkingSpot.deleteMany({
        where: { id: { in: spotIds } },
      });
    });
  });
});