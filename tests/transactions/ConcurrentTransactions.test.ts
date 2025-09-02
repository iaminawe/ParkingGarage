/**
 * Concurrent Transaction Tests
 * 
 * Tests for handling concurrent transactions, deadlock detection,
 * and race condition scenarios.
 */

import { TransactionManager } from '../../src/services/TransactionManager';
import { ParkingService } from '../../src/services/ParkingService';
import { DatabaseService } from '../../src/services/DatabaseService';
import {
  TransactionDeadlockError,
  TransactionConflictError,
  TransactionPriority
} from '../../src/types/transaction.types';
import { PrismaClient } from '../../src/generated/prisma';

describe('Concurrent Transaction Tests', () => {
  let transactionManager: TransactionManager;
  let parkingService: ParkingService;
  let databaseService: DatabaseService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Use in-memory SQLite for testing
    process.env.DATABASE_URL = 'file:./test-concurrent.db';
    
    databaseService = DatabaseService.getInstance({
      enableLogging: false
    });
    
    await databaseService.initialize();
    prisma = databaseService.getClient();
    
    transactionManager = TransactionManager.getInstance(databaseService);
    parkingService = new ParkingService(databaseService);
  });

  afterAll(async () => {
    await databaseService.shutdown();
    DatabaseService.reset();
    TransactionManager.reset();
  });

  beforeEach(async () => {
    // Clean up data
    await prisma.parkingSession.deleteMany();
    await prisma.spot.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.garage.deleteMany();
    
    // Create test data
    const garage = await prisma.garage.create({
      data: {
        name: 'Concurrent Test Garage',
        address: '123 Concurrent St',
        totalSpots: 5
      }
    });
    
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

  describe('Concurrent Spot Allocation', () => {
    it('should handle concurrent parking attempts on same spot gracefully', async () => {
      const spot = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      expect(spot).toBeDefined();

      const sessionData1 = {
        vehicle: { licensePlate: 'RACE001' },
        spotId: spot!.id
      };
      
      const sessionData2 = {
        vehicle: { licensePlate: 'RACE002' },
        spotId: spot!.id
      };

      // Start both parking operations simultaneously
      const results = await Promise.allSettled([
        parkingService.parkVehicle(sessionData1),
        parkingService.parkVehicle(sessionData2)
      ]);

      // Both operations should complete (fulfilled), but only one should succeed
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      
      const [result1, result2] = results.map(r => 
        r.status === 'fulfilled' ? r.value : null
      );
      
      // Exactly one should succeed, one should fail
      const successCount = [result1, result2].filter(r => r?.success).length;
      const failureCount = [result1, result2].filter(r => !r?.success).length;
      
      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Verify final database state
      const finalSpot = await prisma.spot.findUnique({ where: { id: spot!.id } });
      expect(finalSpot!.status).toBe('OCCUPIED');
      
      const activeSessions = await prisma.parkingSession.count({
        where: { spotId: spot!.id, status: 'ACTIVE' }
      });
      expect(activeSessions).toBe(1);
    });

    it('should handle concurrent parking on different spots successfully', async () => {
      const spots = await prisma.spot.findMany({ where: { status: 'AVAILABLE' } });
      expect(spots.length).toBeGreaterThanOrEqual(2);

      const sessionData1 = {
        vehicle: { licensePlate: 'PARALLEL001' },
        spotId: spots[0].id
      };
      
      const sessionData2 = {
        vehicle: { licensePlate: 'PARALLEL002' },
        spotId: spots[1].id
      };

      // Both operations should succeed
      const results = await Promise.all([
        parkingService.parkVehicle(sessionData1),
        parkingService.parkVehicle(sessionData2)
      ]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);

      // Both spots should be occupied
      const updatedSpots = await prisma.spot.findMany({
        where: { id: { in: [spots[0].id, spots[1].id] } }
      });
      
      updatedSpots.forEach(spot => {
        expect(spot.status).toBe('OCCUPIED');
      });
    });
  });

  describe('Concurrent Vehicle Operations', () => {
    let parkedVehicleData: any;
    let parkedSpot: any;

    beforeEach(async () => {
      // Set up a parked vehicle for concurrent exit/transfer tests
      const spot = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      
      const result = await parkingService.parkVehicle({
        vehicle: { licensePlate: 'CONCURRENT123' },
        spotId: spot!.id
      });
      
      expect(result.success).toBe(true);
      parkedVehicleData = result.data!;
      parkedSpot = spot;
    });

    it('should handle concurrent exit attempts', async () => {
      const licensePlate = parkedVehicleData.vehicle.licensePlate;

      // Attempt to exit the same vehicle concurrently
      const results = await Promise.allSettled([
        parkingService.exitVehicle(licensePlate),
        parkingService.exitVehicle(licensePlate)
      ]);

      expect(results).toHaveLength(2);
      
      const [result1, result2] = results.map(r => 
        r.status === 'fulfilled' ? r.value : null
      );
      
      // Only one should succeed
      const successCount = [result1, result2].filter(r => r?.success).length;
      const failureCount = [result1, result2].filter(r => !r?.success).length;
      
      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Vehicle should be properly exited
      const finalSpot = await prisma.spot.findUnique({ 
        where: { id: parkedSpot.id } 
      });
      expect(finalSpot!.status).toBe('AVAILABLE');
      expect(finalSpot!.currentVehicleId).toBeNull();

      const completedSessions = await prisma.parkingSession.count({
        where: { 
          vehicleId: parkedVehicleData.vehicle.id, 
          status: 'COMPLETED' 
        }
      });
      expect(completedSessions).toBe(1);
    });

    it('should handle concurrent transfer attempts', async () => {
      const availableSpots = await prisma.spot.findMany({ 
        where: { 
          status: 'AVAILABLE',
          id: { not: parkedSpot.id }
        }
      });
      expect(availableSpots.length).toBeGreaterThanOrEqual(2);

      const transferData1 = {
        fromSpotId: parkedSpot.id,
        toSpotId: availableSpots[0].id
      };
      
      const transferData2 = {
        fromSpotId: parkedSpot.id,
        toSpotId: availableSpots[1].id
      };

      // Attempt concurrent transfers
      const results = await Promise.allSettled([
        parkingService.transferVehicle(transferData1),
        parkingService.transferVehicle(transferData2)
      ]);

      const [result1, result2] = results.map(r => 
        r.status === 'fulfilled' ? r.value : null
      );
      
      // Only one should succeed
      const successCount = [result1, result2].filter(r => r?.success).length;
      const failureCount = [result1, result2].filter(r => !r?.success).length;
      
      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Original spot should be available
      const originalSpot = await prisma.spot.findUnique({ 
        where: { id: parkedSpot.id } 
      });
      expect(originalSpot!.status).toBe('AVAILABLE');

      // One of the target spots should be occupied
      const targetSpots = await prisma.spot.findMany({
        where: { id: { in: [availableSpots[0].id, availableSpots[1].id] } }
      });
      
      const occupiedTargets = targetSpots.filter(s => s.status === 'OCCUPIED');
      expect(occupiedTargets).toHaveLength(1);
    });
  });

  describe('High Concurrency Scenarios', () => {
    it('should handle many concurrent transactions', async () => {
      const concurrencyLevel = 20;
      const spots = await prisma.spot.findMany({ where: { status: 'AVAILABLE' } });
      
      // Create more spots if needed
      if (spots.length < concurrencyLevel) {
        const garage = await prisma.garage.findFirst();
        const additionalSpots = [];
        
        for (let i = spots.length; i < concurrencyLevel; i++) {
          additionalSpots.push({
            garageId: garage!.id,
            spotNumber: `CONC${String(i).padStart(3, '0')}`,
            floor: 1,
            status: 'AVAILABLE' as const
          });
        }
        
        await prisma.spot.createMany({ data: additionalSpots });
      }
      
      const allSpots = await prisma.spot.findMany({ where: { status: 'AVAILABLE' } });

      // Create concurrent parking operations
      const operations = [];
      for (let i = 0; i < concurrencyLevel; i++) {
        const spotIndex = i % allSpots.length;
        operations.push(
          parkingService.parkVehicle({
            vehicle: { licensePlate: `CONC${String(i).padStart(3, '0')}` },
            spotId: allSpots[spotIndex].id
          })
        );
      }

      const results = await Promise.allSettled(operations);
      
      // All operations should complete
      expect(results).toHaveLength(concurrencyLevel);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
      
      const actualResults = results.map(r => 
        r.status === 'fulfilled' ? r.value : null
      ).filter(r => r !== null);
      
      // Count successes and failures
      const successes = actualResults.filter(r => r!.success).length;
      const failures = actualResults.filter(r => !r!.success).length;
      
      expect(successes + failures).toBe(concurrencyLevel);
      expect(successes).toBeGreaterThan(0); // At least some should succeed
      
      // Verify database consistency
      const occupiedSpots = await prisma.spot.count({ where: { status: 'OCCUPIED' } });
      const activeSessions = await prisma.parkingSession.count({ where: { status: 'ACTIVE' } });
      const vehicles = await prisma.vehicle.count();
      
      expect(occupiedSpots).toBe(successes);
      expect(activeSessions).toBe(successes);
      expect(vehicles).toBe(successes); // Only successful operations create vehicles
    });
  });

  describe('Transaction Priority and Ordering', () => {
    it('should respect transaction priorities', async () => {
      const spot = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      
      // Create transactions with different priorities
      const lowPriorityPromise = transactionManager.executeTransaction(
        async (tx, context) => {
          // Add small delay to ensure this starts first
          await new Promise(resolve => setTimeout(resolve, 10));
          
          return await tx.vehicle.create({
            data: {
              licensePlate: 'LOWPRI123',
              vehicleType: 'STANDARD'
            }
          });
        },
        { 
          priority: TransactionPriority.LOW,
          enableLogging: true 
        }
      );
      
      const highPriorityPromise = transactionManager.executeTransaction(
        async (tx, context) => {
          return await tx.vehicle.create({
            data: {
              licensePlate: 'HIGHPRI123',
              vehicleType: 'STANDARD'
            }
          });
        },
        { 
          priority: TransactionPriority.HIGH,
          enableLogging: true 
        }
      );

      const results = await Promise.all([lowPriorityPromise, highPriorityPromise]);
      
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].context.priority).toBe(TransactionPriority.LOW);
      expect(results[1].context.priority).toBe(TransactionPriority.HIGH);
      
      // Both vehicles should be created
      const vehicleCount = await prisma.vehicle.count();
      expect(vehicleCount).toBe(2);
    });
  });

  describe('Deadlock and Conflict Resolution', () => {
    it('should handle resource conflicts gracefully', async () => {
      const spot = await prisma.spot.findFirst({ where: { status: 'AVAILABLE' } });
      
      // Create competing transactions that might cause conflicts
      const transaction1 = transactionManager.executeTransaction(
        async (tx, context) => {
          // Read spot
          const spotData = await tx.spot.findUnique({ where: { id: spot!.id } });
          
          if (spotData?.status === 'AVAILABLE') {
            // Small delay to increase chance of conflict
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Try to occupy spot
            return await tx.spot.update({
              where: { id: spot!.id },
              data: { status: 'OCCUPIED' }
            });
          }
          
          throw new Error('Spot not available');
        },
        { enableRetry: true, maxRetries: 3 }
      );
      
      const transaction2 = transactionManager.executeTransaction(
        async (tx, context) => {
          // Read spot
          const spotData = await tx.spot.findUnique({ where: { id: spot!.id } });
          
          if (spotData?.status === 'AVAILABLE') {
            // Small delay to increase chance of conflict
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Try to occupy spot
            return await tx.spot.update({
              where: { id: spot!.id },
              data: { status: 'OCCUPIED' }
            });
          }
          
          throw new Error('Spot not available');
        },
        { enableRetry: true, maxRetries: 3 }
      );

      const results = await Promise.allSettled([transaction1, transaction2]);
      
      // At least one should succeed
      const fulfilledResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as any).value);
      
      const successCount = fulfilledResults.filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(1);
      
      // Verify final state is consistent
      const finalSpot = await prisma.spot.findUnique({ where: { id: spot!.id } });
      expect(finalSpot!.status).toBe('OCCUPIED');
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with concurrent transactions', async () => {
      const startTime = Date.now();
      const concurrentOperations = 50;
      
      // Create enough spots
      const garage = await prisma.garage.findFirst();
      const additionalSpots = [];
      
      for (let i = 0; i < concurrentOperations; i++) {
        additionalSpots.push({
          garageId: garage!.id,
          spotNumber: `PERF${String(i).padStart(3, '0')}`,
          floor: 1,
          status: 'AVAILABLE' as const
        });
      }
      
      await prisma.spot.createMany({ data: additionalSpots });
      const spots = await prisma.spot.findMany({ where: { status: 'AVAILABLE' } });
      
      // Create concurrent transactions
      const operations = spots.slice(0, concurrentOperations).map((spot, index) => 
        transactionManager.executeTransaction(
          async (tx, context) => {
            // Simulate some processing time
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
            
            const vehicle = await tx.vehicle.create({
              data: {
                licensePlate: `PERF${String(index).padStart(3, '0')}`,
                vehicleType: 'STANDARD'
              }
            });
            
            await tx.spot.update({
              where: { id: spot.id },
              data: { 
                status: 'OCCUPIED',
                currentVehicleId: vehicle.id
              }
            });
            
            return { vehicle, spot };
          },
          { 
            timeout: 10000,
            enableRetry: false // Disable retry for performance test
          }
        )
      );

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All operations should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(concurrentOperations);
      
      // Performance should be reasonable (less than 10 seconds for 50 operations)
      expect(totalTime).toBeLessThan(10000);
      
      // Verify data consistency
      const vehicleCount = await prisma.vehicle.count();
      const occupiedSpotCount = await prisma.spot.count({ where: { status: 'OCCUPIED' } });
      
      expect(vehicleCount).toBe(concurrentOperations);
      expect(occupiedSpotCount).toBe(concurrentOperations);
      
      console.log(`Completed ${concurrentOperations} concurrent transactions in ${totalTime}ms`);
      console.log(`Average time per transaction: ${Math.round(totalTime / concurrentOperations)}ms`);
    });
  });
});
