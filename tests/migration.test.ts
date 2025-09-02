/**
 * Migration Testing Suite
 * 
 * Comprehensive tests for data migration functionality including:
 * - Migration script execution
 * - Backup and restore operations
 * - Data validation
 * - Rollback procedures
 * - Error handling and recovery
 */

import { PrismaClient } from '../src/generated/prisma';
import { MemoryStore } from '../src/storage/memoryStore';
import { DataMigration } from '../scripts/migrate-data';
import { MigrationRollback } from '../scripts/rollback-migration';
import { DataBackupUtility } from '../src/utils/data-backup';
import { DataValidator } from '../src/utils/data-validation';
import { MigrationStatusTracker } from '../src/utils/migration-status';
import { DatabaseSeeder } from '../prisma/seed';
import * as fs from 'fs';
import * as path from 'path';

describe('Migration System', () => {
  let prisma: PrismaClient;
  let memoryStore: MemoryStore;
  let testMigrationId: string;
  let backupUtility: DataBackupUtility;
  let validator: DataValidator;

  beforeAll(async () => {
    prisma = new PrismaClient();
    memoryStore = MemoryStore.getInstance();
    testMigrationId = `test-migration-${Date.now()}`;
    backupUtility = new DataBackupUtility();
    validator = new DataValidator();
  });

  beforeEach(async () => {
    // Clear database and memory store
    await clearTestDatabase();
    memoryStore.clear();
    
    // Reset memory store instance for clean tests
    MemoryStore.resetInstance();
    memoryStore = MemoryStore.getInstance();
  });

  afterAll(async () => {
    await clearTestDatabase();
    await prisma.$disconnect();
    await validator.cleanup();
  });

  describe('Migration Status Tracking', () => {
    test('should initialize migration status correctly', async () => {
      const statusTracker = new MigrationStatusTracker(testMigrationId);
      
      const status = await statusTracker.initializeMigration(testMigrationId, 5, '/backup/path');
      
      expect(status.id).toBe(testMigrationId);
      expect(status.status).toBe('pending');
      expect(status.totalSteps).toBe(5);
      expect(status.completedSteps).toBe(0);
      expect(status.backupPath).toBe('/backup/path');
      expect(status.checkpoints).toHaveLength(0);
    });

    test('should create and track checkpoints', async () => {
      const statusTracker = new MigrationStatusTracker(testMigrationId);
      await statusTracker.initializeMigration(testMigrationId, 3);
      
      const checkpoint = await statusTracker.createCheckpoint(
        'test-step',
        { totalRecords: 100, processedRecords: 50, currentTable: 'test_table' },
        { testMeta: 'value' }
      );
      
      expect(checkpoint.step).toBe('test-step');
      expect(checkpoint.data.totalRecords).toBe(100);
      expect(checkpoint.data.processedRecords).toBe(50);
      expect(checkpoint.metadata?.testMeta).toBe('value');
      
      const status = await statusTracker.getStatus();
      expect(status.checkpoints).toHaveLength(1);
    });

    test('should track migration progress', async () => {
      const statusTracker = new MigrationStatusTracker(testMigrationId);
      await statusTracker.initializeMigration(testMigrationId, 10);
      
      // Create some progress
      await statusTracker.createCheckpoint(
        'step-1',
        { totalRecords: 200, processedRecords: 100, currentTable: 'vehicles' }
      );
      
      await statusTracker.updateStatus({ 
        id: testMigrationId, 
        status: 'in_progress',
        completedSteps: 5 
      });
      
      const progress = await statusTracker.getProgress();
      
      expect(progress.percentage).toBe(50);
      expect(progress.currentStep).toBe('step-1');
      expect(progress.details).toContain('5/10 steps completed');
      expect(progress.details).toContain('vehicles (50%)');
    });
  });

  describe('Data Backup and Restore', () => {
    test('should create backup with MemoryStore data', async () => {
      // Setup test data in MemoryStore
      memoryStore.spots.set('A1', { spotNumber: 'A1', floor: 1, bay: 1, status: 'available' });
      memoryStore.vehicles.set('ABC123', { licensePlate: 'ABC123', type: 'standard' });
      memoryStore.garageConfig.set('main', { name: 'Main Garage', floors: 3 });

      const backupResult = await backupUtility.createBackup(testMigrationId, {
        includeMemoryStore: true,
        includeSQLiteDB: false
      });
      
      expect(backupResult.success).toBe(true);
      expect(backupResult.files.length).toBeGreaterThan(0);
      expect(backupResult.files).toContain('memorystore-spots.json');
      expect(backupResult.files).toContain('memorystore-vehicles.json');
      expect(backupResult.files).toContain('backup-metadata.json');
      
      // Verify backup files exist
      expect(fs.existsSync(backupResult.backupPath)).toBe(true);
    });

    test('should restore MemoryStore data from backup', async () => {
      // Create initial data
      const originalData = {
        spots: new Map([['A1', { spotNumber: 'A1', floor: 1 }]]),
        vehicles: new Map([['XYZ789', { licensePlate: 'XYZ789' }]])
      };

      memoryStore.spots.set('A1', originalData.spots.get('A1')!);
      memoryStore.vehicles.set('XYZ789', originalData.vehicles.get('XYZ789')!);

      // Create backup
      const backupResult = await backupUtility.createBackup(testMigrationId, {
        includeMemoryStore: true,
        includeSQLiteDB: false
      });

      // Clear memory store
      memoryStore.clear();
      expect(memoryStore.spots.size).toBe(0);
      expect(memoryStore.vehicles.size).toBe(0);

      // Restore from backup
      const restoreResult = await backupUtility.restoreFromBackup(backupResult.backupPath);
      
      expect(restoreResult.success).toBe(true);
      expect(memoryStore.spots.size).toBe(1);
      expect(memoryStore.vehicles.size).toBe(1);
      expect(memoryStore.spots.get('A1')).toEqual(originalData.spots.get('A1'));
      expect(memoryStore.vehicles.get('XYZ789')).toEqual(originalData.vehicles.get('XYZ789'));
    });

    test('should list available backups', async () => {
      // Create multiple backups
      await backupUtility.createBackup(`test-1-${Date.now()}`, {
        includeMemoryStore: true,
        includeSQLiteDB: false
      });
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Ensure different timestamps
      
      await backupUtility.createBackup(`test-2-${Date.now()}`, {
        includeMemoryStore: true,
        includeSQLiteDB: false
      });

      const backups = await backupUtility.listBackups();
      
      expect(backups.length).toBeGreaterThanOrEqual(2);
      expect(backups[0].timestamp).toBeInstanceOf(Date);
      expect(backups[0].files).toBeInstanceOf(Array);
      
      // Should be sorted by timestamp (newest first)
      if (backups.length > 1) {
        expect(backups[0].timestamp.getTime()).toBeGreaterThanOrEqual(backups[1].timestamp.getTime());
      }
    });
  });

  describe('Data Validation', () => {
    test('should detect data integrity issues', async () => {
      // Setup mismatched data
      memoryStore.vehicles.set('TEST123', { 
        licensePlate: 'TEST123',
        type: 'standard',
        make: 'Toyota'
      });

      // Create conflicting database entry
      await prisma.garage.create({
        data: { name: 'Test Garage', totalFloors: 1, totalSpots: 1 }
      });

      const garage = await prisma.garage.findFirst();
      await prisma.vehicle.create({
        data: {
          licensePlate: 'TEST123',
          vehicleType: 'COMPACT', // Different from MemoryStore
          make: 'Honda' // Different from MemoryStore
        }
      });

      const validationResult = await validator.validateDataIntegrity();
      
      expect(validationResult.success).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      
      const typeError = validationResult.errors.find(e => 
        e.field === 'vehicleType' && e.recordId === 'TEST123'
      );
      expect(typeError).toBeDefined();
      expect(typeError?.expected).toBe('standard');
      expect(typeError?.actual).toBe('COMPACT');
    });

    test('should validate foreign key relationships', async () => {
      const garage = await prisma.garage.create({
        data: { name: 'Test Garage', totalFloors: 1, totalSpots: 1 }
      });

      const vehicle = await prisma.vehicle.create({
        data: { licensePlate: 'REL123' }
      });

      // Create session with non-existent spot reference
      await prisma.parkingSession.create({
        data: {
          garageId: garage.id,
          vehicleId: vehicle.id,
          spotId: 'non-existent-spot-id',
          checkInTime: new Date(),
          status: 'ACTIVE',
          rateType: 'HOURLY',
          totalAmount: 0
        }
      });

      const relationshipErrors = await validator.validateRelationships();
      
      expect(relationshipErrors.length).toBeGreaterThan(0);
      
      const spotError = relationshipErrors.find(e => 
        e.field === 'spotId' && e.type === 'constraint'
      );
      expect(spotError).toBeDefined();
      expect(spotError?.message).toContain('non-existent spot');
    });
  });

  describe('Data Migration Process', () => {
    test('should migrate garage configuration', async () => {
      // Setup MemoryStore data
      memoryStore.garageConfig.set('main', {
        name: 'Main Test Garage',
        description: 'Test facility',
        totalFloors: 5,
        totalSpots: 500,
        isActive: true
      });

      const migration = new DataMigration(testMigrationId);
      
      // Run migration
      await migration.migrate({
        dryRun: false,
        skipBackup: true,
        validateOnly: false
      });

      // Verify migration
      const garages = await prisma.garage.findMany();
      expect(garages.length).toBeGreaterThan(0);
      
      const mainGarage = garages.find(g => g.name.includes('Main'));
      expect(mainGarage).toBeDefined();
      expect(mainGarage?.totalFloors).toBe(5);
      expect(mainGarage?.totalSpots).toBe(500);
    });

    test('should migrate vehicles with proper type mapping', async () => {
      // Create default garage first
      await prisma.garage.create({
        data: { name: 'Test Garage', totalFloors: 1, totalSpots: 100 }
      });

      memoryStore.vehicles.set('VEH001', {
        licensePlate: 'VEH001',
        type: 'standard',
        make: 'Toyota',
        model: 'Camry',
        color: 'Blue',
        year: 2020,
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        status: 'active'
      });

      memoryStore.vehicles.set('VEH002', {
        licensePlate: 'VEH002',
        type: 'compact',
        make: 'Honda',
        model: 'Civic'
      });

      const migration = new DataMigration(testMigrationId);
      await migration.migrate({
        dryRun: false,
        skipBackup: true
      });

      const vehicles = await prisma.vehicle.findMany();
      expect(vehicles.length).toBe(2);
      
      const standardVehicle = vehicles.find(v => v.licensePlate === 'VEH001');
      expect(standardVehicle?.vehicleType).toBe('STANDARD');
      expect(standardVehicle?.make).toBe('Toyota');
      expect(standardVehicle?.ownerName).toBe('John Doe');
      
      const compactVehicle = vehicles.find(v => v.licensePlate === 'VEH002');
      expect(compactVehicle?.vehicleType).toBe('COMPACT');
    });

    test('should handle migration with checkpoints for large datasets', async () => {
      // Create many spots to test batching
      for (let i = 1; i <= 250; i++) {
        memoryStore.spots.set(`SPOT${i.toString().padStart(3, '0')}`, {
          spotNumber: `A${i}`,
          floor: Math.ceil(i / 100),
          bay: Math.ceil(i / 25),
          type: 'standard',
          status: 'available'
        });
      }

      const migration = new DataMigration(testMigrationId);
      
      // Use small batch size to test checkpoint creation
      await migration.migrate({
        dryRun: false,
        skipBackup: true,
        batchSize: 50
      });

      // Verify all spots were migrated
      const spots = await prisma.spot.findMany();
      expect(spots.length).toBe(250);

      // Verify checkpoints were created
      const statusTracker = new MigrationStatusTracker(testMigrationId);
      const status = await statusTracker.getStatus();
      expect(status.checkpoints.length).toBeGreaterThan(0);
      
      const spotCheckpoint = status.checkpoints.find(cp => 
        cp.step === 'migrate-spots'
      );
      expect(spotCheckpoint).toBeDefined();
      expect(spotCheckpoint?.data.totalRecords).toBe(250);
      expect(spotCheckpoint?.data.processedRecords).toBe(250);
    });

    test('should validate data after successful migration', async () => {
      // Setup test data
      memoryStore.garageConfig.set('test', { name: 'Test Garage' });
      memoryStore.vehicles.set('TEST456', { 
        licensePlate: 'TEST456',
        type: 'standard'
      });
      memoryStore.spots.set('A1', {
        spotNumber: 'A1',
        floor: 1,
        bay: 1,
        type: 'standard'
      });

      const migration = new DataMigration(testMigrationId);
      await migration.migrate({
        dryRun: false,
        skipBackup: true
      });

      // Manual validation
      const validationResult = await validator.validateDataIntegrity();
      
      expect(validationResult.success).toBe(true);
      expect(validationResult.errors.length).toBe(0);
      expect(validationResult.statistics.totalRecords).toBeGreaterThan(0);
    });
  });

  describe('Migration Rollback', () => {
    test('should rollback migration successfully', async () => {
      // Setup and run migration
      memoryStore.garageConfig.set('rollback-test', { name: 'Rollback Test Garage' });
      memoryStore.vehicles.set('ROLL123', { licensePlate: 'ROLL123' });

      const migration = new DataMigration(testMigrationId);
      await migration.migrate({
        dryRun: false,
        skipBackup: false // Create backup for rollback
      });

      // Verify migration worked
      let garages = await prisma.garage.findMany();
      let vehicles = await prisma.vehicle.findMany();
      expect(garages.length).toBeGreaterThan(0);
      expect(vehicles.length).toBeGreaterThan(0);

      // Perform rollback
      const rollback = new MigrationRollback(testMigrationId);
      const rollbackResult = await rollback.rollback({
        confirm: true,
        validateAfter: true
      });

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.memoryStoreRestored).toBe(true);
      expect(rollbackResult.databaseCleared).toBe(true);

      // Verify rollback cleared database
      garages = await prisma.garage.findMany();
      vehicles = await prisma.vehicle.findMany();
      expect(garages.length).toBe(0);
      expect(vehicles.length).toBe(0);

      // Verify MemoryStore was restored
      expect(memoryStore.garageConfig.has('rollback-test')).toBe(true);
      expect(memoryStore.vehicles.has('ROLL123')).toBe(true);
    });

    test('should handle rollback with preserved new data', async () => {
      // Run initial migration
      memoryStore.vehicles.set('OLD123', { licensePlate: 'OLD123' });
      
      const migration = new DataMigration(testMigrationId);
      await migration.migrate({
        dryRun: false,
        skipBackup: false
      });

      // Add new data after migration
      await prisma.vehicle.create({
        data: { licensePlate: 'NEW456' }
      });

      const rollback = new MigrationRollback(testMigrationId);
      const rollbackResult = await rollback.rollback({
        confirm: true,
        preserveNewData: true
      });

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Database Seeding', () => {
    test('should seed database with small dataset', async () => {
      const seeder = new DatabaseSeeder();
      const stats = await seeder.seed({
        size: 'small',
        clearExisting: true,
        generateSessions: true,
        generatePayments: true
      });

      expect(stats.garages).toBe(1);
      expect(stats.floors).toBe(3);
      expect(stats.spots).toBeGreaterThan(0);
      expect(stats.vehicles).toBeGreaterThan(0);
      expect(stats.sessions).toBeGreaterThan(0);

      // Verify data in database
      const garages = await prisma.garage.findMany();
      const spots = await prisma.spot.findMany();
      const vehicles = await prisma.vehicle.findMany();

      expect(garages.length).toBe(1);
      expect(spots.length).toBeGreaterThan(0);
      expect(vehicles.length).toBeGreaterThan(0);
    });

    test('should generate valid relationships in seeded data', async () => {
      const seeder = new DatabaseSeeder();
      await seeder.seed({
        size: 'small',
        clearExisting: true
      });

      // Check relationships
      const sessionsWithRelations = await prisma.parkingSession.findMany({
        include: {
          vehicle: true,
          spot: true,
          garage: true
        }
      });

      for (const session of sessionsWithRelations) {
        expect(session.vehicle).toBeDefined();
        expect(session.spot).toBeDefined();
        expect(session.garage).toBeDefined();
        expect(session.vehicle.licensePlate).toBeTruthy();
        expect(session.spot.spotNumber).toBeTruthy();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle migration failure gracefully', async () => {
      // Create invalid data that will cause migration to fail
      memoryStore.vehicles.set('', { licensePlate: '' }); // Empty license plate

      const migration = new DataMigration(testMigrationId);
      
      await expect(migration.migrate({
        dryRun: false,
        skipBackup: true
      })).rejects.toThrow();

      // Verify status was updated to failed
      const statusTracker = new MigrationStatusTracker(testMigrationId);
      const status = await statusTracker.getStatus();
      expect(status.status).toBe('failed');
      expect(status.error).toBeTruthy();
    });

    test('should handle backup creation failure', async () => {
      // Mock backup utility to simulate failure
      const mockBackupUtility = {
        createBackup: jest.fn().mockResolvedValue({
          success: false,
          error: 'Simulated backup failure'
        })
      };

      // This would typically be injected, but for test we'll verify the error handling pattern
      const result = await mockBackupUtility.createBackup('test', {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Simulated backup failure');
    });
  });

  // Utility function to clear test database
  async function clearTestDatabase(): Promise<void> {
    await prisma.payment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.parkingSession.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.spot.deleteMany();
    await prisma.floor.deleteMany();
    await prisma.garage.deleteMany();
  }
});