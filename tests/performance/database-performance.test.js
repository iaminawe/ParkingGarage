/**
 * Performance Tests for Database Operations
 * 
 * Tests database performance, query optimization, and bulk operations
 * to ensure the system scales properly with load.
 */

const { performance } = require('perf_hooks');
const { createParkingScenario, GarageFactory, SpotFactory, VehicleFactory, SessionFactory, PaymentFactory } = require('../factories');

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  SINGLE_OPERATION: 100,    // 100ms max for single operations
  BULK_OPERATION: 5000,     // 5s max for bulk operations
  COMPLEX_QUERY: 1000,      // 1s max for complex queries
  CONCURRENT_OPERATION: 2000 // 2s max for concurrent operations
};

describe('Database Performance Tests', () => {
  let testGarage;

  beforeEach(async () => {
    testGarage = await GarageFactory.createGarage({
      name: 'Performance Test Garage',
      totalSpots: 1000
    });
  });

  describe('Single Operation Performance', () => {
    test('should create single entities quickly', async () => {
      const operations = [
        () => GarageFactory.createGarage({ name: 'Speed Test' }),
        () => VehicleFactory.createVehicle({ licensePlate: 'SPEED01' }),
        () => SpotFactory.createSpot({ garageId: testGarage.id }),
      ];

      for (const operation of operations) {
        const start = performance.now();
        await operation();
        const end = performance.now();
        const duration = end - start;
        
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_OPERATION);
      }
    });

    test('should perform single queries quickly', async () => {
      // Create test data
      const vehicle = await VehicleFactory.createVehicle({ licensePlate: 'QUERY01' });
      const spot = await SpotFactory.createSpot({ garageId: testGarage.id });
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const queries = [
        () => prisma.vehicle.findUnique({ where: { id: vehicle.id } }),
        () => prisma.spot.findUnique({ where: { id: spot.id } }),
        () => prisma.garage.findUnique({ where: { id: testGarage.id } }),
      ];

      for (const query of queries) {
        const start = performance.now();
        const result = await query();
        const end = performance.now();
        const duration = end - start;
        
        expect(result).toBeTruthy();
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_OPERATION);
      }
    });

    test('should perform updates quickly', async () => {
      const vehicle = await VehicleFactory.createVehicle({ licensePlate: 'UPDATE01' });
      const spot = await SpotFactory.createSpot({ garageId: testGarage.id });
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const updateOperations = [
        () => prisma.vehicle.update({
          where: { id: vehicle.id },
          data: { color: 'blue' }
        }),
        () => prisma.spot.update({
          where: { id: spot.id },
          data: { status: 'maintenance' }
        })
      ];

      for (const operation of updateOperations) {
        const start = performance.now();
        await operation();
        const end = performance.now();
        const duration = end - start;
        
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_OPERATION);
      }
    });
  });

  describe('Bulk Operation Performance', () => {
    test('should handle bulk spot creation efficiently', async () => {
      const SPOT_COUNT = 200;
      
      const start = performance.now();
      
      await SpotFactory.createSpotsForGarage(testGarage.id, SPOT_COUNT);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION);
      
      // Verify all spots were created
      const prisma = global.testDb?.getPrisma?.();
      if (prisma) {
        const spotCount = await prisma.spot.count({
          where: { garageId: testGarage.id }
        });
        expect(spotCount).toBe(SPOT_COUNT);
      }
    });

    test('should handle bulk vehicle creation efficiently', async () => {
      const VEHICLE_COUNT = 100;
      
      const start = performance.now();
      
      const promises = [];
      for (let i = 0; i < VEHICLE_COUNT; i++) {
        promises.push(VehicleFactory.createVehicle({
          licensePlate: `BULK${String(i).padStart(3, '0')}`
        }));
      }
      
      await Promise.all(promises);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION);
      
      // Verify all vehicles were created
      const prisma = global.testDb?.getPrisma?.();
      if (prisma) {
        const vehicleCount = await prisma.vehicle.count({
          where: {
            licensePlate: {
              startsWith: 'BULK'
            }
          }
        });
        expect(vehicleCount).toBe(VEHICLE_COUNT);
      }
    });

    test('should handle bulk session creation efficiently', async () => {
      const SESSION_COUNT = 50;
      
      // Create prerequisite data
      const spots = await SpotFactory.createSpotsForGarage(testGarage.id, SESSION_COUNT);
      const vehicles = [];
      for (let i = 0; i < SESSION_COUNT; i++) {
        vehicles.push(await VehicleFactory.createVehicle({
          licensePlate: `SESS${String(i).padStart(3, '0')}`
        }));
      }
      
      const start = performance.now();
      
      const sessionPromises = [];
      for (let i = 0; i < SESSION_COUNT; i++) {
        sessionPromises.push(SessionFactory.createSession({
          vehicleId: vehicles[i].id,
          spotId: spots[i].id,
          garageId: testGarage.id
        }));
      }
      
      await Promise.all(sessionPromises);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION);
    });
  });

  describe('Complex Query Performance', () => {
    test('should perform complex joins efficiently', async () => {
      // Create comprehensive test scenario
      await createParkingScenario({
        garage: testGarage,
        spotCount: 50,
        vehicleCount: 40,
        activeSessionCount: 15,
        completedSessionCount: 25
      });
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const start = performance.now();
      
      // Complex query with multiple joins and conditions
      const result = await prisma.session.findMany({
        where: {
          garageId: testGarage.id,
          OR: [
            { status: 'active' },
            { 
              status: 'completed',
              totalAmount: { gte: 10.00 }
            }
          ]
        },
        include: {
          vehicle: true,
          spot: {
            include: {
              garage: true
            }
          },
          payments: {
            where: {
              status: {
                in: ['completed', 'pending']
              }
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { startTime: 'desc' }
        ]
      });
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_QUERY);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('vehicle');
      expect(result[0]).toHaveProperty('spot');
      expect(result[0]).toHaveProperty('payments');
    });

    test('should perform aggregation queries efficiently', async () => {
      // Create test data for aggregation
      const spots = await SpotFactory.createSpotsForGarage(testGarage.id, 30);
      
      for (let i = 0; i < 20; i++) {
        const vehicle = await VehicleFactory.createVehicle({
          licensePlate: `AGG${String(i).padStart(3, '0')}`
        });
        
        const session = await SessionFactory.createCompletedSession(
          vehicle.id,
          spots[i % spots.length].id,
          {
            garageId: testGarage.id,
            totalAmount: 5.00 + (i * 2.5) // Varying amounts
          }
        );
        
        await PaymentFactory.createSuccessfulPayment(session.id, session.totalAmount);
      }
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const start = performance.now();
      
      // Complex aggregation query
      const stats = await prisma.session.aggregate({
        where: {
          garageId: testGarage.id,
          status: 'completed'
        },
        _count: {
          id: true
        },
        _sum: {
          totalAmount: true
        },
        _avg: {
          totalAmount: true
        },
        _min: {
          totalAmount: true
        },
        _max: {
          totalAmount: true
        }
      });
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_QUERY);
      expect(stats._count.id).toBe(20);
      expect(stats._sum.totalAmount).toBeGreaterThan(0);
      expect(stats._avg.totalAmount).toBeGreaterThan(0);
    });

    test('should perform full-text search efficiently', async () => {
      // Create test data with searchable content
      for (let i = 0; i < 25; i++) {
        await VehicleFactory.createVehicle({
          licensePlate: `SEARCH${i}`,
          owner: i % 3 === 0 ? 'John Smith' : i % 3 === 1 ? 'Jane Johnson' : 'Bob Wilson',
          make: i % 2 === 0 ? 'Toyota' : 'Honda'
        });
      }
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const start = performance.now();
      
      // Search queries
      const johnVehicles = await prisma.vehicle.findMany({
        where: {
          owner: {
            contains: 'John'
          }
        }
      });
      
      const toyotaVehicles = await prisma.vehicle.findMany({
        where: {
          make: 'Toyota'
        }
      });
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_QUERY);
      expect(johnVehicles.length).toBeGreaterThan(0);
      expect(toyotaVehicles.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operation Performance', () => {
    test('should handle concurrent read operations efficiently', async () => {
      // Create test data
      const spots = await SpotFactory.createSpotsForGarage(testGarage.id, 20);
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const start = performance.now();
      
      // Simulate concurrent read operations
      const readPromises = [];
      for (let i = 0; i < 10; i++) {
        readPromises.push(
          prisma.spot.findMany({
            where: { garageId: testGarage.id },
            include: { garage: true }
          })
        );
      }
      
      const results = await Promise.all(readPromises);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATION);
      expect(results.every(r => r.length === 20)).toBe(true);
    });

    test('should handle concurrent write operations efficiently', async () => {
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const start = performance.now();
      
      // Simulate concurrent vehicle creations
      const writePromises = [];
      for (let i = 0; i < 15; i++) {
        writePromises.push(
          VehicleFactory.createVehicle({
            licensePlate: `CONC${String(i).padStart(3, '0')}`
          })
        );
      }
      
      const results = await Promise.all(writePromises);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATION);
      expect(results).toHaveLength(15);
      expect(results.every(r => r.id)).toBe(true);
    });

    test('should handle mixed read/write operations efficiently', async () => {
      const spots = await SpotFactory.createSpotsForGarage(testGarage.id, 10);
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const start = performance.now();
      
      // Mix of read and write operations
      const mixedPromises = [];
      
      // Read operations
      for (let i = 0; i < 5; i++) {
        mixedPromises.push(
          prisma.garage.findUnique({ where: { id: testGarage.id } })
        );
      }
      
      // Write operations
      for (let i = 0; i < 5; i++) {
        mixedPromises.push(
          VehicleFactory.createVehicle({
            licensePlate: `MIX${String(i).padStart(3, '0')}`
          })
        );
      }
      
      // Update operations
      for (let i = 0; i < 3; i++) {
        mixedPromises.push(
          prisma.spot.update({
            where: { id: spots[i].id },
            data: { status: 'maintenance' }
          })
        );
      }
      
      const results = await Promise.all(mixedPromises);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATION);
      expect(results).toHaveLength(13);
    });
  });

  describe('Index Effectiveness', () => {
    test('should use indexes for primary key lookups', async () => {
      const vehicle = await VehicleFactory.createVehicle({ licensePlate: 'INDEX01' });
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      // Test multiple primary key lookups
      const start = performance.now();
      
      for (let i = 0; i < 50; i++) {
        await prisma.vehicle.findUnique({ where: { id: vehicle.id } });
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should be very fast with primary key index
      expect(duration).toBeLessThan(500); // 500ms for 50 lookups
    });

    test('should use indexes for unique constraint lookups', async () => {
      const vehicles = [];
      for (let i = 0; i < 20; i++) {
        vehicles.push(await VehicleFactory.createVehicle({
          licensePlate: `UNIQUE${String(i).padStart(2, '0')}`
        }));
      }
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const start = performance.now();
      
      // Test unique constraint lookups
      for (const vehicle of vehicles) {
        await prisma.vehicle.findUnique({
          where: { licensePlate: vehicle.licensePlate }
        });
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should be fast with unique index
      expect(duration).toBeLessThan(200); // 200ms for 20 unique lookups
    });

    test('should perform efficiently with filtered queries', async () => {
      // Create test data with various statuses
      const spots = [];
      for (let i = 0; i < 50; i++) {
        spots.push(await SpotFactory.createSpot({
          garageId: testGarage.id,
          status: i % 3 === 0 ? 'available' : i % 3 === 1 ? 'occupied' : 'maintenance'
        }));
      }
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const start = performance.now();
      
      // Query with status filter (should use index if exists)
      const availableSpots = await prisma.spot.findMany({
        where: {
          garageId: testGarage.id,
          status: 'available'
        }
      });
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(100);
      expect(availableSpots.length).toBeGreaterThan(0);
      expect(availableSpots.every(s => s.status === 'available')).toBe(true);
    });
  });

  describe('Memory Usage Performance', () => {
    test('should handle large result sets efficiently', async () => {
      // Create large dataset
      await SpotFactory.createSpotsForGarage(testGarage.id, 200);
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const memoryBefore = process.memoryUsage().heapUsed;
      
      // Query large result set
      const spots = await prisma.spot.findMany({
        where: { garageId: testGarage.id },
        include: { garage: true }
      });
      
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfter - memoryBefore;
      
      expect(spots).toHaveLength(200);
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });

    test('should handle pagination efficiently', async () => {
      // Create test data
      for (let i = 0; i < 100; i++) {
        await VehicleFactory.createVehicle({
          licensePlate: `PAGE${String(i).padStart(3, '0')}`
        });
      }
      
      const prisma = global.testDb?.getPrisma?.();
      if (!prisma) {
        pending('Prisma client not available');
        return;
      }

      const start = performance.now();
      
      // Test pagination
      const page1 = await prisma.vehicle.findMany({
        where: {
          licensePlate: { startsWith: 'PAGE' }
        },
        skip: 0,
        take: 10,
        orderBy: { licensePlate: 'asc' }
      });
      
      const page5 = await prisma.vehicle.findMany({
        where: {
          licensePlate: { startsWith: 'PAGE' }
        },
        skip: 40,
        take: 10,
        orderBy: { licensePlate: 'asc' }
      });
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(200);
      expect(page1).toHaveLength(10);
      expect(page5).toHaveLength(10);
      expect(page1[0].licensePlate).toBe('PAGE000');
      expect(page5[0].licensePlate).toBe('PAGE040');
    });
  });
});