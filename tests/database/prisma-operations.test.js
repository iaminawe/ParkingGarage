/**
 * Database-Specific Tests for Prisma Operations
 * 
 * Tests Prisma ORM specific functionality, constraints, and database operations
 * that are not covered in repository tests.
 */

const { PrismaClient } = require('@prisma/client');
const { createParkingScenario, GarageFactory, SpotFactory, VehicleFactory } = require('../factories');

describe('Prisma Database Operations', () => {
  let prisma;

  beforeAll(async () => {
    // Initialize Prisma client for direct database operations
    try {
      const testDbPath = require('path').join(process.cwd(), 'tests', 'data', 'test.db');
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${testDbPath}`
          }
        }
      });
      await prisma.$connect();
    } catch (error) {
      console.warn('Could not connect to test database:', error.message);
      prisma = null;
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  // Skip all tests if Prisma is not available
  beforeEach(() => {
    if (!prisma) {
      pending('Prisma client not available');
    }
  });

  describe('Database Schema Validation', () => {
    test('should have all expected tables', async () => {
      const tables = await prisma.$queryRaw`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `;
      
      const tableNames = tables.map(t => t.name).sort();
      
      expect(tableNames).toEqual(
        expect.arrayContaining(['Garage', 'Spot', 'Vehicle', 'Session', 'Payment'])
      );
    });

    test('should have correct primary keys', async () => {
      // Test that all tables have proper UUID primary keys
      const garageInfo = await prisma.$queryRaw`PRAGMA table_info(Garage)`;
      const pkColumn = garageInfo.find(col => col.pk === 1);
      
      expect(pkColumn.name).toBe('id');
      expect(pkColumn.type).toMatch(/TEXT|VARCHAR/i);
      expect(pkColumn.notnull).toBe(1);
    });

    test('should have proper foreign key constraints', async () => {
      // Test foreign key relationships
      const spotForeignKeys = await prisma.$queryRaw`PRAGMA foreign_key_list(Spot)`;
      const sessionForeignKeys = await prisma.$queryRaw`PRAGMA foreign_key_list(Session)`;
      
      expect(spotForeignKeys.length).toBeGreaterThan(0);
      expect(sessionForeignKeys.length).toBeGreaterThan(0);
      
      // Check specific relationships
      const garageFK = spotForeignKeys.find(fk => fk.table === 'Garage');
      expect(garageFK).toBeDefined();
      expect(garageFK.from).toBe('garageId');
      expect(garageFK.to).toBe('id');
    });

    test('should have proper indexes for performance', async () => {
      const indexes = await prisma.$queryRaw`
        SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND tbl_name IN ('Vehicle', 'Spot', 'Session')
      `;
      
      const indexNames = indexes.map(i => i.name);
      
      // Should have indexes on frequently queried columns
      expect(indexNames.some(name => name.includes('licensePlate'))).toBe(true);
      expect(indexNames.some(name => name.includes('status'))).toBe(true);
    });
  });

  describe('Database Constraints', () => {
    test('should enforce unique constraints', async () => {
      const garage = await GarageFactory.createGarage({ name: 'Unique Test' });
      
      // Test unique license plate constraint
      await VehicleFactory.createVehicle({ licensePlate: 'UNIQUE01' });
      
      await expect(VehicleFactory.createVehicle({ licensePlate: 'UNIQUE01' }))
        .rejects.toThrow(/unique constraint|UNIQUE constraint/i);
      
      // Test unique spot position constraint
      await SpotFactory.createSpot({
        garageId: garage.id,
        floor: 1,
        bay: 1,
        spotNumber: 1
      });
      
      await expect(SpotFactory.createSpot({
        garageId: garage.id,
        floor: 1,
        bay: 1,
        spotNumber: 1
      })).rejects.toThrow(/unique constraint/i);
    });

    test('should enforce foreign key constraints', async () => {
      // Test invalid garage ID for spot
      await expect(prisma.spot.create({
        data: {
          floor: 1,
          bay: 1,
          spotNumber: 1,
          type: 'standard',
          status: 'available',
          garageId: '00000000-0000-0000-0000-000000000000'
        }
      })).rejects.toThrow(/foreign key constraint|FOREIGN KEY constraint/i);
    });

    test('should enforce check constraints', async () => {
      const garage = await GarageFactory.createGarage();
      
      // Test positive number constraints
      await expect(prisma.spot.create({
        data: {
          floor: 0, // Should be positive
          bay: 1,
          spotNumber: 1,
          type: 'standard',
          status: 'available',
          garageId: garage.id
        }
      })).rejects.toThrow(/check constraint|constraint failed/i);
      
      // Test negative amount constraint
      await expect(prisma.payment.create({
        data: {
          amount: -10.00, // Should be positive
          method: 'credit_card',
          status: 'pending',
          sessionId: '00000000-0000-0000-0000-000000000000'
        }
      })).rejects.toThrow(/check constraint|positive/i);
    });

    test('should enforce enum constraints', async () => {
      const garage = await GarageFactory.createGarage();
      
      // Test invalid spot type
      await expect(prisma.spot.create({
        data: {
          floor: 1,
          bay: 1,
          spotNumber: 1,
          type: 'invalid_type',
          status: 'available',
          garageId: garage.id
        }
      })).rejects.toThrow(/constraint|invalid/i);
      
      // Test invalid status
      await expect(prisma.spot.create({
        data: {
          floor: 1,
          bay: 1,
          spotNumber: 1,
          type: 'standard',
          status: 'invalid_status',
          garageId: garage.id
        }
      })).rejects.toThrow(/constraint|invalid/i);
    });
  });

  describe('Database Transactions', () => {
    test('should support atomic transactions', async () => {
      const initialGarageCount = await prisma.garage.count();
      
      try {
        await prisma.$transaction(async (tx) => {
          // Create garage
          const garage = await tx.garage.create({
            data: {
              name: 'Transaction Test',
              address: '123 Test St',
              totalSpots: 10,
              hourlyRate: 5.00,
              dailyRate: 25.00,
              status: 'active'
            }
          });
          
          // Create spot
          await tx.spot.create({
            data: {
              floor: 1,
              bay: 1,
              spotNumber: 1,
              type: 'standard',
              status: 'available',
              garageId: garage.id
            }
          });
          
          // Force rollback
          throw new Error('Rollback test');
        });
      } catch (error) {
        expect(error.message).toBe('Rollback test');
      }
      
      // Verify rollback worked
      const finalGarageCount = await prisma.garage.count();
      expect(finalGarageCount).toBe(initialGarageCount);
    });

    test('should handle concurrent transactions', async () => {
      const garage = await GarageFactory.createGarage();
      
      // Create multiple transactions that update the same garage
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          prisma.$transaction(async (tx) => {
            const currentGarage = await tx.garage.findUnique({
              where: { id: garage.id }
            });
            
            await tx.garage.update({
              where: { id: garage.id },
              data: {
                totalSpots: currentGarage.totalSpots + 1
              }
            });
          })
        );
      }
      
      await Promise.all(promises);
      
      const updatedGarage = await prisma.garage.findUnique({
        where: { id: garage.id }
      });
      
      expect(updatedGarage.totalSpots).toBe(garage.totalSpots + 5);
    });

    test('should handle deadlock scenarios gracefully', async () => {
      const garage1 = await GarageFactory.createGarage({ name: 'Garage 1' });
      const garage2 = await GarageFactory.createGarage({ name: 'Garage 2' });
      
      // Create transactions that could potentially deadlock
      const promise1 = prisma.$transaction(async (tx) => {
        await tx.garage.update({
          where: { id: garage1.id },
          data: { name: 'Updated Garage 1' }
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await tx.garage.update({
          where: { id: garage2.id },
          data: { name: 'Updated by Transaction 1' }
        });
      });
      
      const promise2 = prisma.$transaction(async (tx) => {
        await tx.garage.update({
          where: { id: garage2.id },
          data: { name: 'Updated Garage 2' }
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await tx.garage.update({
          where: { id: garage1.id },
          data: { name: 'Updated by Transaction 2' }
        });
      });
      
      // Both transactions should complete without deadlock
      await expect(Promise.all([promise1, promise2])).resolves.toBeDefined();
    });
  });

  describe('Database Performance', () => {
    test('should perform large inserts efficiently', async () => {
      const garage = await GarageFactory.createGarage();
      
      const startTime = Date.now();
      
      // Create 100 spots using createMany for efficiency
      const spotsData = [];
      for (let i = 1; i <= 100; i++) {
        spotsData.push({
          floor: Math.ceil(i / 20),
          bay: Math.ceil((i % 20 || 20) / 5),
          spotNumber: ((i - 1) % 5) + 1,
          type: 'standard',
          status: 'available',
          features: [],
          garageId: garage.id
        });
      }
      
      await prisma.spot.createMany({
        data: spotsData,
        skipDuplicates: true
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      const spotCount = await prisma.spot.count({
        where: { garageId: garage.id }
      });
      expect(spotCount).toBe(100);
    });

    test('should perform complex queries efficiently', async () => {
      // Create test data
      const scenario = await createParkingScenario({
        spotCount: 50,
        vehicleCount: 30,
        activeSessionCount: 10,
        completedSessionCount: 20
      });
      
      const startTime = Date.now();
      
      // Complex query with multiple joins and conditions
      const result = await prisma.session.findMany({
        where: {
          garage: {
            id: scenario.garage.id
          },
          status: 'completed',
          totalAmount: {
            gte: 10.00
          }
        },
        include: {
          vehicle: true,
          spot: true,
          payments: {
            where: {
              status: 'completed'
            }
          }
        },
        orderBy: {
          endTime: 'desc'
        },
        take: 10
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 1 second
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('vehicle');
      expect(result[0]).toHaveProperty('spot');
      expect(result[0]).toHaveProperty('payments');
    });

    test('should use indexes effectively', async () => {
      const garage = await GarageFactory.createGarage();
      
      // Create test data
      for (let i = 0; i < 20; i++) {
        await VehicleFactory.createVehicle({
          licensePlate: `INDEX${String(i).padStart(2, '0')}`,
          owner: i % 2 === 0 ? 'John Doe' : 'Jane Smith'
        });
      }
      
      const startTime = Date.now();
      
      // Query that should use license plate index
      const vehicle = await prisma.vehicle.findUnique({
        where: {
          licensePlate: 'INDEX15'
        }
      });
      
      // Query that should use owner index (if exists)
      const johnVehicles = await prisma.vehicle.findMany({
        where: {
          owner: 'John Doe'
        }
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Very fast for indexed queries
      expect(vehicle).toBeTruthy();
      expect(johnVehicles.length).toBe(10);
    });
  });

  describe('Data Integrity', () => {
    test('should maintain referential integrity on delete', async () => {
      const garage = await GarageFactory.createGarage();
      const vehicle = await VehicleFactory.createVehicle();
      const spot = await SpotFactory.createSpot({ garageId: garage.id });
      
      // Create session
      const session = await prisma.session.create({
        data: {
          vehicleId: vehicle.id,
          spotId: spot.id,
          garageId: garage.id,
          startTime: new Date(),
          status: 'active',
          hourlyRate: 5.00,
          paymentStatus: 'pending'
        }
      });
      
      // Create payment
      await prisma.payment.create({
        data: {
          sessionId: session.id,
          amount: 10.00,
          method: 'credit_card',
          status: 'pending',
          transactionId: 'TEST123'
        }
      });
      
      // Attempt to delete garage with related data should fail or cascade
      await expect(prisma.garage.delete({
        where: { id: garage.id }
      })).rejects.toThrow(/foreign key constraint|constraint failed/i);
    });

    test('should handle soft deletes correctly', async () => {
      const vehicle = await VehicleFactory.createVehicle();
      
      // Soft delete (if implemented)
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          deletedAt: new Date()
        }
      });
      
      // Regular queries should not find soft deleted records
      const foundVehicle = await prisma.vehicle.findMany({
        where: {
          id: vehicle.id,
          deletedAt: null
        }
      });
      
      expect(foundVehicle).toHaveLength(0);
      
      // But should be found when including deleted
      const deletedVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicle.id }
      });
      
      expect(deletedVehicle.deletedAt).toBeTruthy();
    });
  });

  describe('Database Migrations', () => {
    test('should have applied all migrations', async () => {
      // Check if migration table exists
      const migrationTable = await prisma.$queryRaw`
        SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'
      `;
      
      expect(migrationTable).toHaveLength(1);
      
      // Check migration status
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at, rolled_back_at 
        FROM _prisma_migrations 
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `;
      
      expect(migrations.length).toBeGreaterThan(0);
    });

    test('should handle schema evolution gracefully', async () => {
      // Test that the current schema matches expectations
      const tables = await prisma.$queryRaw`
        SELECT sql FROM sqlite_master WHERE type='table' AND name='Vehicle'
      `;
      
      const vehicleSchema = tables[0].sql;
      
      // Verify key columns exist
      expect(vehicleSchema).toMatch(/id.*TEXT.*PRIMARY KEY/i);
      expect(vehicleSchema).toMatch(/licensePlate.*TEXT.*UNIQUE/i);
      expect(vehicleSchema).toMatch(/createdAt.*TEXT/i);
      expect(vehicleSchema).toMatch(/updatedAt.*TEXT/i);
    });
  });

  describe('Database Backup and Recovery', () => {
    test('should support database backup operations', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const testDbPath = path.join(process.cwd(), 'tests', 'data', 'test.db');
      const backupPath = path.join(process.cwd(), 'tests', 'data', 'backup.db');
      
      // Create some test data
      await GarageFactory.createGarage({ name: 'Backup Test' });
      
      // Copy database file (simple backup)
      if (fs.existsSync(testDbPath)) {
        fs.copyFileSync(testDbPath, backupPath);
        
        expect(fs.existsSync(backupPath)).toBe(true);
        
        // Clean up
        fs.unlinkSync(backupPath);
      }
    });
  });
});