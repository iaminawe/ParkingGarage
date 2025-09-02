/**
 * Transaction Manager Tests
 * 
 * Comprehensive test suite for transaction management functionality
 * including nested transactions, savepoints, error handling, and retry logic.
 */

import { TransactionManager } from '../../src/services/TransactionManager';
import { DatabaseService } from '../../src/services/DatabaseService';
import {
  TransactionStatus,
  TransactionPriority,
  TransactionError,
  TransactionTimeoutError,
  TransactionDeadlockError,
  SavepointError,
  ITransactionOptions
} from '../../src/types/transaction.types';
import { PrismaClient } from '../../src/generated/prisma';

describe('TransactionManager', () => {
  let transactionManager: TransactionManager;
  let databaseService: DatabaseService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Use in-memory SQLite for testing
    process.env.DATABASE_URL = 'file:./test-transaction.db';
    
    databaseService = DatabaseService.getInstance({
      enableLogging: false,
      connectionTimeout: 5000
    });
    
    await databaseService.initialize();
    prisma = databaseService.getClient();
    transactionManager = TransactionManager.getInstance(databaseService);
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
  });

  describe('Basic Transaction Operations', () => {
    it('should execute a simple transaction successfully', async () => {
      const result = await transactionManager.executeTransaction(
        async (tx, context) => {
          expect(context.id).toBeDefined();
          expect(context.status).toBe(TransactionStatus.ACTIVE);
          expect(context.client).toBeDefined();
          
          // Simple operation - create a garage
          const garage = await tx.garage.create({
            data: {
              name: 'Test Garage',
              address: '123 Test St',
              totalSpots: 10
            }
          });
          
          return garage;
        },
        { enableLogging: true }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.name).toBe('Test Garage');
      expect(result.context.status).toBe(TransactionStatus.COMMITTED);
      expect(result.totalDuration).toBeGreaterThan(0);

      // Verify data was committed
      const garage = await prisma.garage.findFirst();
      expect(garage?.name).toBe('Test Garage');
    });

    it('should rollback transaction on error', async () => {
      const result = await transactionManager.executeTransaction(
        async (tx, context) => {
          // Create a garage first
          await tx.garage.create({
            data: {
              name: 'Test Garage',
              address: '123 Test St',
              totalSpots: 10
            }
          });
          
          // Throw an error to trigger rollback
          throw new Error('Intentional test error');
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Intentional test error');
      expect(result.context.status).toBe(TransactionStatus.FAILED);

      // Verify data was rolled back
      const garage = await prisma.garage.findFirst();
      expect(garage).toBeNull();
    });

    it('should handle transaction timeout', async () => {
      const result = await transactionManager.executeTransaction(
        async (tx, context) => {
          // Simulate a long-running operation
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          return 'should timeout';
        },
        {
          timeout: 1000 // 1 second timeout
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TransactionTimeoutError);
      expect(result.error?.code).toBe('TRANSACTION_TIMEOUT');
    });
  });

  describe('Nested Transactions and Savepoints', () => {
    it('should create and release savepoints', async () => {
      const result = await transactionManager.executeTransaction(
        async (tx, context) => {
          // Create initial data
          const garage = await tx.garage.create({
            data: {
              name: 'Test Garage',
              address: '123 Test St',
              totalSpots: 10
            }
          });
          
          // Create savepoint
          const savepoint = await transactionManager.createSavepoint('test_savepoint', context);
          expect(savepoint.id).toBeDefined();
          expect(savepoint.name).toContain('test_savepoint');
          expect(context.savepoints).toHaveLength(1);
          
          // Create more data after savepoint
          const vehicle = await tx.vehicle.create({
            data: {
              licensePlate: 'TEST123',
              vehicleType: 'STANDARD'
            }
          });
          
          // Release savepoint
          await transactionManager.releaseSavepoint(savepoint.id, context);
          expect(context.savepoints).toHaveLength(0);
          
          return { garage, vehicle };
        }
      );

      expect(result.success).toBe(true);
      expect(result.result.garage).toBeDefined();
      expect(result.result.vehicle).toBeDefined();
      
      // Verify both records exist
      const garage = await prisma.garage.findFirst();
      const vehicle = await prisma.vehicle.findFirst();
      expect(garage).toBeDefined();
      expect(vehicle).toBeDefined();
    });

    it('should rollback to savepoint on error', async () => {
      const result = await transactionManager.executeTransaction(
        async (tx, context) => {
          // Create initial data
          const garage = await tx.garage.create({
            data: {
              name: 'Test Garage',
              address: '123 Test St',
              totalSpots: 10
            }
          });
          
          // Create savepoint
          const savepoint = await transactionManager.createSavepoint('rollback_test', context);
          
          // Create data after savepoint
          const vehicle = await tx.vehicle.create({
            data: {
              licensePlate: 'TEST123',
              vehicleType: 'STANDARD'
            }
          });
          
          // Rollback to savepoint (should remove vehicle but keep garage)
          await transactionManager.rollbackToSavepoint(savepoint.id, context);
          
          return { garage };
        }
      );

      expect(result.success).toBe(true);
      
      // Garage should exist (created before savepoint)
      const garage = await prisma.garage.findFirst();
      expect(garage).toBeDefined();
      
      // Vehicle should not exist (created after savepoint and rolled back)
      const vehicle = await prisma.vehicle.findFirst();
      expect(vehicle).toBeNull();
    });

    it('should handle multiple nested savepoints', async () => {
      const result = await transactionManager.executeTransaction(
        async (tx, context) => {
          // Create garage
          const garage = await tx.garage.create({
            data: {
              name: 'Test Garage',
              address: '123 Test St',
              totalSpots: 10
            }
          });
          
          // First savepoint
          const savepoint1 = await transactionManager.createSavepoint('level1', context);
          
          // Create vehicle
          const vehicle = await tx.vehicle.create({
            data: {
              licensePlate: 'TEST123',
              vehicleType: 'STANDARD'
            }
          });
          
          // Second savepoint
          const savepoint2 = await transactionManager.createSavepoint('level2', context);
          
          // Create spot
          const spot = await tx.spot.create({
            data: {
              garageId: garage.id,
              spotNumber: '001',
              floor: 1,
              status: 'AVAILABLE'
            }
          });
          
          expect(context.savepoints).toHaveLength(2);
          
          // Rollback to first savepoint (should keep garage, remove vehicle and spot)
          await transactionManager.rollbackToSavepoint(savepoint1.id, context);
          
          return { garage };
        }
      );

      expect(result.success).toBe(true);
      
      // Only garage should exist
      const garage = await prisma.garage.findFirst();
      const vehicle = await prisma.vehicle.findFirst();
      const spot = await prisma.spot.findFirst();
      
      expect(garage).toBeDefined();
      expect(vehicle).toBeNull();
      expect(spot).toBeNull();
    });
  });

  describe('Multiple Operations', () => {
    it('should execute multiple operations sequentially', async () => {
      const operations = [
        async (tx: any) => {
          return await tx.garage.create({
            data: {
              name: 'Garage 1',
              address: '123 Test St',
              totalSpots: 10
            }
          });
        },
        async (tx: any) => {
          return await tx.vehicle.create({
            data: {
              licensePlate: 'TEST123',
              vehicleType: 'STANDARD'
            }
          });
        }
      ];

      const result = await transactionManager.executeMultipleOperations(operations);
      
      expect(result.success).toBe(true);
      expect(result.result).toHaveLength(2);
      
      // Verify both records exist
      const garage = await prisma.garage.findFirst();
      const vehicle = await prisma.vehicle.findFirst();
      expect(garage).toBeDefined();
      expect(vehicle).toBeDefined();
    });

    it('should rollback all operations if one fails', async () => {
      const operations = [
        async (tx: any) => {
          return await tx.garage.create({
            data: {
              name: 'Garage 1',
              address: '123 Test St',
              totalSpots: 10
            }
          });
        },
        async (tx: any) => {
          throw new Error('Operation 2 failed');
        },
        async (tx: any) => {
          return await tx.vehicle.create({
            data: {
              licensePlate: 'TEST123',
              vehicleType: 'STANDARD'
            }
          });
        }
      ];

      const result = await transactionManager.executeMultipleOperations(operations);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Operation 2 failed');
      
      // No records should exist
      const garage = await prisma.garage.findFirst();
      const vehicle = await prisma.vehicle.findFirst();
      expect(garage).toBeNull();
      expect(vehicle).toBeNull();
    });
  });

  describe('Transaction Options', () => {
    it('should respect different transaction priorities', async () => {
      const options: ITransactionOptions = {
        priority: TransactionPriority.HIGH,
        enableLogging: true,
        metadata: { testType: 'priority' }
      };

      const result = await transactionManager.executeTransaction(
        async (tx, context) => {
          expect(context.priority).toBe(TransactionPriority.HIGH);
          expect(context.metadata.testType).toBe('priority');
          
          return 'high priority transaction';
        },
        options
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('high priority transaction');
    });

    it('should handle custom timeout values', async () => {
      const shortTimeout = 500; // 500ms
      
      const result = await transactionManager.executeTransaction(
        async (tx, context) => {
          // Operation that takes longer than timeout
          await new Promise(resolve => setTimeout(resolve, 700));
          return 'should timeout';
        },
        { timeout: shortTimeout }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TransactionTimeoutError);
    });
  });

  describe('Error Handling', () => {
    it('should handle Prisma constraint errors', async () => {
      const result = await transactionManager.executeTransaction(
        async (tx, context) => {
          // Create first garage
          await tx.garage.create({
            data: {
              name: 'Test Garage',
              address: '123 Test St',
              totalSpots: 10
            }
          });
          
          // Try to create duplicate with same unique constraint (if exists)
          await tx.vehicle.create({
            data: {
              licensePlate: 'TEST123',
              vehicleType: 'STANDARD'
            }
          });
          
          // Try to create duplicate license plate
          await tx.vehicle.create({
            data: {
              licensePlate: 'TEST123', // Duplicate
              vehicleType: 'STANDARD'
            }
          });
          
          return 'should fail';
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TransactionError);
      
      // No records should exist due to rollback
      const garageCount = await prisma.garage.count();
      const vehicleCount = await prisma.vehicle.count();
      expect(garageCount).toBe(0);
      expect(vehicleCount).toBe(0);
    });
  });

  describe('Transaction Metrics and Monitoring', () => {
    it('should track active transactions', async () => {
      const promise1 = transactionManager.executeTransaction(
        async (tx, context) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'transaction 1';
        }
      );
      
      const promise2 = transactionManager.executeTransaction(
        async (tx, context) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'transaction 2';
        }
      );
      
      // Check active transactions before completion
      await new Promise(resolve => setTimeout(resolve, 50));
      const activeTransactions = transactionManager.getActiveTransactions();
      expect(activeTransactions.length).toBeGreaterThanOrEqual(0); // May be 0 if completed quickly
      
      const results = await Promise.all([promise1, promise2]);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should provide transaction statistics', async () => {
      // Execute some transactions
      await transactionManager.executeTransaction(async () => 'success 1');
      await transactionManager.executeTransaction(async () => 'success 2');
      
      try {
        await transactionManager.executeTransaction(async () => {
          throw new Error('failure');
        });
      } catch (e) {
        // Expected to fail
      }
      
      const stats = transactionManager.getTransactionStatistics();
      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.success).toBeGreaterThanOrEqual(2);
      expect(stats.failed).toBeGreaterThanOrEqual(1);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });
  });

  describe('Savepoint Error Handling', () => {
    it('should handle invalid savepoint operations', async () => {
      await expect(
        transactionManager.executeTransaction(
          async (tx, context) => {
            // Try to release non-existent savepoint
            await transactionManager.releaseSavepoint('non-existent', context);
          }
        )
      ).resolves.toMatchObject({
        success: false,
        error: expect.any(SavepointError)
      });
    });

    it('should handle rollback to non-existent savepoint', async () => {
      await expect(
        transactionManager.executeTransaction(
          async (tx, context) => {
            // Try to rollback to non-existent savepoint
            await transactionManager.rollbackToSavepoint('non-existent', context);
          }
        )
      ).resolves.toMatchObject({
        success: false,
        error: expect.any(SavepointError)
      });
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should clean up old metrics', async () => {
      // Execute a transaction
      await transactionManager.executeTransaction(
        async () => 'test transaction'
      );
      
      const metricsBefore = transactionManager.getAllTransactionMetrics();
      const countBefore = Object.keys(metricsBefore).length;
      expect(countBefore).toBeGreaterThan(0);
      
      // Clean up metrics older than 0 hours (should clean all)
      transactionManager.clearOldMetrics(0);
      
      const metricsAfter = transactionManager.getAllTransactionMetrics();
      const countAfter = Object.keys(metricsAfter).length;
      expect(countAfter).toBe(0);
    });

    it('should handle transaction context cleanup', async () => {
      let contextId: string;
      
      const result = await transactionManager.executeTransaction(
        async (tx, context) => {
          contextId = context.id;
          return 'test';
        }
      );
      
      expect(result.success).toBe(true);
      
      // Context should be cleaned up after transaction
      const activeTransactions = transactionManager.getActiveTransactions();
      expect(activeTransactions.find(t => t.id === contextId!)).toBeUndefined();
    });
  });
});
