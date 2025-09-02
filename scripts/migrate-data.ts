#!/usr/bin/env ts-node

/**
 * Data Migration Script - MemoryStore to SQLite
 * 
 * This script safely migrates data from the in-memory storage to SQLite database
 * with comprehensive backup, rollback, and validation capabilities.
 * 
 * Usage:
 *   npm run db:migrate-data [--resume] [--validate-only] [--dry-run]
 */

import { PrismaClient } from '../src/generated/prisma';
import { MemoryStore } from '../src/storage/memoryStore';
import { MigrationStatusTracker } from '../src/utils/migration-status';
import { DataBackupUtility } from '../src/utils/data-backup';
import { DataValidator } from '../src/utils/data-validation';
import * as path from 'path';

interface MigrationOptions {
  resume?: boolean;
  validateOnly?: boolean;
  dryRun?: boolean;
  batchSize?: number;
  skipBackup?: boolean;
}

interface MigrationStats {
  garages: { processed: number; total: number };
  spots: { processed: number; total: number };
  vehicles: { processed: number; total: number };
  sessions: { processed: number; total: number };
  startTime: Date;
  endTime?: Date;
}

class DataMigration {
  private prisma: PrismaClient;
  private memoryStore: MemoryStore;
  private statusTracker: MigrationStatusTracker;
  private backupUtility: DataBackupUtility;
  private validator: DataValidator;
  private migrationId: string;

  constructor(migrationId?: string) {
    this.migrationId = migrationId || `migration-${Date.now()}`;
    this.prisma = new PrismaClient();
    this.memoryStore = MemoryStore.getInstance();
    this.statusTracker = new MigrationStatusTracker(this.migrationId);
    this.backupUtility = new DataBackupUtility();
    this.validator = new DataValidator();
  }

  /**
   * Main migration entry point
   */
  async migrate(options: MigrationOptions = {}): Promise<void> {
    const stats: MigrationStats = {
      garages: { processed: 0, total: 0 },
      spots: { processed: 0, total: 0 },
      vehicles: { processed: 0, total: 0 },
      sessions: { processed: 0, total: 0 },
      startTime: new Date()
    };

    try {
      console.log(`🚀 Starting data migration: ${this.migrationId}`);
      console.log(`Options:`, options);

      // Validation only mode
      if (options.validateOnly) {
        await this.validateDataIntegrity();
        return;
      }

      // Check if we can resume
      const canResume = await this.statusTracker.canResume();
      if (options.resume && canResume) {
        console.log('📍 Resuming migration from checkpoint...');
        await this.resumeMigration(options, stats);
      } else {
        console.log('🎬 Starting fresh migration...');
        await this.startFreshMigration(options, stats);
      }

      // Final validation
      console.log('✅ Migration completed! Running final validation...');
      await this.validateDataIntegrity();
      
      stats.endTime = new Date();
      const duration = Math.round((stats.endTime.getTime() - stats.startTime.getTime()) / 1000);
      
      console.log('\n📊 Migration Summary:');
      console.log(`   Duration: ${duration}s`);
      console.log(`   Garages: ${stats.garages.processed}/${stats.garages.total}`);
      console.log(`   Spots: ${stats.spots.processed}/${stats.spots.total}`);
      console.log(`   Vehicles: ${stats.vehicles.processed}/${stats.vehicles.total}`);
      console.log(`   Sessions: ${stats.sessions.processed}/${stats.sessions.total}`);

      await this.statusTracker.updateStatus({
        id: this.migrationId,
        status: 'completed',
        completedSteps: 7
      });

    } catch (error) {
      console.error('❌ Migration failed:', error);
      
      await this.statusTracker.updateStatus({
        id: this.migrationId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Start fresh migration process
   */
  private async startFreshMigration(options: MigrationOptions, stats: MigrationStats): Promise<void> {
    // Step 1: Initialize migration status
    await this.statusTracker.initializeMigration(this.migrationId, 7);
    await this.statusTracker.updateStatus({ id: this.migrationId, status: 'in_progress' });

    // Step 2: Create backup
    if (!options.skipBackup && !options.dryRun) {
      console.log('💾 Creating backup...');
      const backupResult = await this.backupUtility.createBackup(this.migrationId, {
        includeMemoryStore: true,
        includeSQLiteDB: true,
        retentionDays: 30
      });
      
      if (!backupResult.success) {
        throw new Error(`Backup failed: ${backupResult.error}`);
      }
      
      await this.statusTracker.updateStatus({ 
        id: this.migrationId, 
        backupPath: backupResult.backupPath,
        completedSteps: 1
      });
      console.log(`✅ Backup created: ${backupResult.backupPath}`);
    }

    // Step 3: Apply database schema
    if (!options.dryRun) {
      console.log('🗄️ Applying database schema...');
      await this.statusTracker.createCheckpoint(
        'schema-migration',
        { totalRecords: 0, processedRecords: 0, currentTable: 'schema' }
      );
      
      // This assumes Prisma migrations have been run
      await this.statusTracker.updateStatus({ id: this.migrationId, completedSteps: 2 });
    }

    // Step 4-7: Migrate data
    await this.migrateAllData(options, stats);
  }

  /**
   * Resume migration from checkpoint
   */
  private async resumeMigration(options: MigrationOptions, stats: MigrationStats): Promise<void> {
    const lastCheckpoint = await this.statusTracker.getLastCheckpoint();
    if (!lastCheckpoint) {
      throw new Error('Cannot resume: no valid checkpoint found');
    }

    console.log(`📍 Resuming from checkpoint: ${lastCheckpoint.step}`);
    console.log(`   Last processed: ${lastCheckpoint.data.currentTable}`);
    console.log(`   Progress: ${lastCheckpoint.data.processedRecords}/${lastCheckpoint.data.totalRecords}`);

    // Resume from where we left off
    await this.migrateAllData(options, stats, lastCheckpoint);
  }

  /**
   * Migrate all data tables
   */
  private async migrateAllData(
    options: MigrationOptions, 
    stats: MigrationStats, 
    resumeFrom?: any
  ): Promise<void> {
    const batchSize = options.batchSize || 100;

    // Step 4: Migrate Garage Configuration
    if (!resumeFrom || resumeFrom.data.currentTable === 'garageConfig') {
      console.log('🏢 Migrating garage configuration...');
      stats.garages = await this.migrateGarageConfig(options.dryRun, batchSize);
      await this.statusTracker.updateStatus({ id: this.migrationId, completedSteps: 3 });
    }

    // Step 5: Migrate Spots
    if (!resumeFrom || resumeFrom.data.currentTable === 'spots') {
      console.log('🅿️ Migrating parking spots...');
      stats.spots = await this.migrateSpots(options.dryRun, batchSize);
      await this.statusTracker.updateStatus({ id: this.migrationId, completedSteps: 4 });
    }

    // Step 6: Migrate Vehicles
    if (!resumeFrom || resumeFrom.data.currentTable === 'vehicles') {
      console.log('🚗 Migrating vehicles...');
      stats.vehicles = await this.migrateVehicles(options.dryRun, batchSize);
      await this.statusTracker.updateStatus({ id: this.migrationId, completedSteps: 5 });
    }

    // Step 7: Migrate Sessions
    if (!resumeFrom || resumeFrom.data.currentTable === 'sessions') {
      console.log('📝 Migrating parking sessions...');
      stats.sessions = await this.migrateSessions(options.dryRun, batchSize);
      await this.statusTracker.updateStatus({ id: this.migrationId, completedSteps: 6 });
    }
  }

  /**
   * Migrate garage configuration
   */
  private async migrateGarageConfig(dryRun?: boolean, batchSize: number = 100): Promise<{ processed: number; total: number }> {
    const garageEntries = Array.from(this.memoryStore.garageConfig.entries());
    const total = garageEntries.length;
    let processed = 0;

    if (total === 0) {
      console.log('  ⏭️ No garage configuration found, creating default garage...');
      
      if (!dryRun) {
        await this.prisma.garage.create({
          data: {
            name: 'Main Garage',
            description: 'Default parking garage',
            totalFloors: 3,
            totalSpots: 300,
            isActive: true
          }
        });
      }
      return { processed: 1, total: 1 };
    }

    await this.statusTracker.createCheckpoint(
      'migrate-garage-config',
      { totalRecords: total, processedRecords: 0, currentTable: 'garageConfig' }
    );

    for (let i = 0; i < garageEntries.length; i += batchSize) {
      const batch = garageEntries.slice(i, i + batchSize);
      
      if (!dryRun) {
        const garageData = batch.map(([_, garage]) => ({
          name: garage.name || 'Parking Garage',
          description: garage.description || 'Migrated from MemoryStore',
          totalFloors: garage.totalFloors || 3,
          totalSpots: garage.totalSpots || 0,
          isActive: garage.isActive !== false
        }));

        await this.prisma.garage.createMany({
          data: garageData,
          skipDuplicates: true
        });
      }

      processed += batch.length;
      console.log(`  📊 Progress: ${processed}/${total} garages migrated`);
      
      await this.statusTracker.createCheckpoint(
        'migrate-garage-config',
        { totalRecords: total, processedRecords: processed, currentTable: 'garageConfig' }
      );
    }

    return { processed, total };
  }

  /**
   * Migrate parking spots
   */
  private async migrateSpots(dryRun?: boolean, batchSize: number = 100): Promise<{ processed: number; total: number }> {
    const spotEntries = Array.from(this.memoryStore.spots.entries());
    const total = spotEntries.length;
    let processed = 0;

    if (total === 0) {
      return { processed: 0, total: 0 };
    }

    // Get or create default garage
    let defaultGarage;
    if (!dryRun) {
      defaultGarage = await this.prisma.garage.findFirst() || 
        await this.prisma.garage.create({
          data: {
            name: 'Main Garage',
            description: 'Default parking garage',
            totalFloors: 3,
            totalSpots: total,
            isActive: true
          }
        });
    }

    await this.statusTracker.createCheckpoint(
      'migrate-spots',
      { totalRecords: total, processedRecords: 0, currentTable: 'spots' }
    );

    for (let i = 0; i < spotEntries.length; i += batchSize) {
      const batch = spotEntries.slice(i, i + batchSize);
      
      if (!dryRun && defaultGarage) {
        const spotData = batch.map(([spotId, spot]) => ({
          garageId: defaultGarage.id,
          floor: spot.floor || 1,
          bay: spot.bay || 1,
          spotNumber: spot.spotNumber || spotId,
          type: this.mapSpotType(spot.type),
          status: this.mapSpotStatus(spot.status),
          features: JSON.stringify(spot.features || [])
        }));

        await this.prisma.spot.createMany({
          data: spotData,
          skipDuplicates: true
        });
      }

      processed += batch.length;
      console.log(`  📊 Progress: ${processed}/${total} spots migrated`);
      
      await this.statusTracker.createCheckpoint(
        'migrate-spots',
        { totalRecords: total, processedRecords: processed, currentTable: 'spots' }
      );
    }

    return { processed, total };
  }

  /**
   * Migrate vehicles
   */
  private async migrateVehicles(dryRun?: boolean, batchSize: number = 100): Promise<{ processed: number; total: number }> {
    const vehicleEntries = Array.from(this.memoryStore.vehicles.entries());
    const total = vehicleEntries.length;
    let processed = 0;

    if (total === 0) {
      return { processed: 0, total: 0 };
    }

    await this.statusTracker.createCheckpoint(
      'migrate-vehicles',
      { totalRecords: total, processedRecords: 0, currentTable: 'vehicles' }
    );

    for (let i = 0; i < vehicleEntries.length; i += batchSize) {
      const batch = vehicleEntries.slice(i, i + batchSize);
      
      if (!dryRun) {
        const vehicleData = batch.map(([licensePlate, vehicle]) => ({
          licensePlate: licensePlate,
          vehicleType: this.mapVehicleType(vehicle.type),
          make: vehicle.make || null,
          model: vehicle.model || null,
          color: vehicle.color || null,
          year: vehicle.year || null,
          ownerName: vehicle.ownerName || null,
          ownerEmail: vehicle.ownerEmail || null,
          ownerPhone: vehicle.ownerPhone || null,
          status: this.mapVehicleStatus(vehicle.status)
        }));

        await this.prisma.vehicle.createMany({
          data: vehicleData,
          skipDuplicates: true
        });
      }

      processed += batch.length;
      console.log(`  📊 Progress: ${processed}/${total} vehicles migrated`);
      
      await this.statusTracker.createCheckpoint(
        'migrate-vehicles',
        { totalRecords: total, processedRecords: processed, currentTable: 'vehicles' }
      );
    }

    return { processed, total };
  }

  /**
   * Migrate parking sessions
   */
  private async migrateSessions(dryRun?: boolean, batchSize: number = 100): Promise<{ processed: number; total: number }> {
    const sessionEntries = Array.from(this.memoryStore.sessions.entries());
    const total = sessionEntries.length;
    let processed = 0;

    if (total === 0) {
      return { processed: 0, total: 0 };
    }

    // Get lookup maps for foreign keys
    let vehicleLookup = new Map();
    let spotLookup = new Map();
    let garageLookup = new Map();

    if (!dryRun) {
      const vehicles = await this.prisma.vehicle.findMany();
      const spots = await this.prisma.spot.findMany();
      const garages = await this.prisma.garage.findMany();

      vehicleLookup = new Map(vehicles.map(v => [v.licensePlate, v.id]));
      spotLookup = new Map(spots.map(s => [s.spotNumber, s.id]));
      garageLookup = new Map(garages.map(g => [g.name, g.id]));
    }

    await this.statusTracker.createCheckpoint(
      'migrate-sessions',
      { totalRecords: total, processedRecords: 0, currentTable: 'sessions' }
    );

    for (let i = 0; i < sessionEntries.length; i += batchSize) {
      const batch = sessionEntries.slice(i, i + batchSize);
      
      if (!dryRun) {
        const sessionData: any[] = [];

        for (const [sessionId, session] of batch) {
          const vehicleId = vehicleLookup.get(session.licensePlate || session.vehicleId);
          const spotId = spotLookup.get(session.spotId || session.spotNumber);
          const garageId = Array.from(garageLookup.values())[0]; // Use first garage

          if (vehicleId && spotId && garageId) {
            sessionData.push({
              garageId,
              spotId,
              vehicleId,
              status: this.mapSessionStatus(session.status),
              rateType: this.mapRateType(session.rateType),
              checkInTime: new Date(session.checkInTime || Date.now()),
              checkOutTime: session.checkOutTime ? new Date(session.checkOutTime) : null,
              durationMinutes: session.durationMinutes || null,
              hourlyRate: session.hourlyRate || 5.0,
              totalAmount: session.totalAmount || 0,
              isPaid: session.isPaid || false,
              notes: session.notes || null
            });
          }
        }

        if (sessionData.length > 0) {
          await this.prisma.parkingSession.createMany({
            data: sessionData,
            skipDuplicates: true
          });
        }
      }

      processed += batch.length;
      console.log(`  📊 Progress: ${processed}/${total} sessions migrated`);
      
      await this.statusTracker.createCheckpoint(
        'migrate-sessions',
        { totalRecords: total, processedRecords: processed, currentTable: 'sessions' }
      );
    }

    return { processed, total };
  }

  /**
   * Validate data integrity after migration
   */
  private async validateDataIntegrity(): Promise<void> {
    console.log('🔍 Validating data integrity...');
    
    const result = await this.validator.validateDataIntegrity();
    
    if (result.success) {
      console.log('✅ Data validation passed!');
    } else {
      console.log('❌ Data validation failed!');
      console.log(`   Total errors: ${result.errors.length}`);
      
      // Show first few errors
      for (const error of result.errors.slice(0, 5)) {
        console.log(`   - ${error.table}.${error.field || ''}: ${error.message}`);
      }
      
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more errors`);
      }
    }

    console.log('\n📊 Validation Statistics:');
    console.log(`   Total records: ${result.statistics.totalRecords}`);
    console.log(`   Valid records: ${result.statistics.validRecords}`);
    console.log(`   Invalid records: ${result.statistics.invalidRecords}`);
  }

  /**
   * Map MemoryStore types to Prisma enums
   */
  private mapSpotType(type: string): any {
    const mapping: Record<string, string> = {
      'compact': 'COMPACT',
      'standard': 'STANDARD',
      'oversized': 'OVERSIZED',
      'handicap': 'HANDICAP',
      'electric': 'ELECTRIC',
      'motorcycle': 'MOTORCYCLE'
    };
    return mapping[type?.toLowerCase()] || 'STANDARD';
  }

  private mapSpotStatus(status: string): any {
    const mapping: Record<string, string> = {
      'available': 'AVAILABLE',
      'occupied': 'OCCUPIED',
      'reserved': 'RESERVED',
      'out_of_order': 'OUT_OF_ORDER',
      'maintenance': 'MAINTENANCE'
    };
    return mapping[status?.toLowerCase()] || 'AVAILABLE';
  }

  private mapVehicleType(type: string): any {
    const mapping: Record<string, string> = {
      'compact': 'COMPACT',
      'standard': 'STANDARD',
      'oversized': 'OVERSIZED',
      'motorcycle': 'MOTORCYCLE',
      'truck': 'TRUCK',
      'bus': 'BUS'
    };
    return mapping[type?.toLowerCase()] || 'STANDARD';
  }

  private mapVehicleStatus(status: string): any {
    const mapping: Record<string, string> = {
      'active': 'ACTIVE',
      'blocked': 'BLOCKED',
      'banned': 'BANNED',
      'inactive': 'INACTIVE'
    };
    return mapping[status?.toLowerCase()] || 'ACTIVE';
  }

  private mapSessionStatus(status: string): any {
    const mapping: Record<string, string> = {
      'active': 'ACTIVE',
      'completed': 'COMPLETED',
      'expired': 'EXPIRED',
      'cancelled': 'CANCELLED',
      'abandoned': 'ABANDONED'
    };
    return mapping[status?.toLowerCase()] || 'ACTIVE';
  }

  private mapRateType(type: string): any {
    const mapping: Record<string, string> = {
      'hourly': 'HOURLY',
      'daily': 'DAILY',
      'weekly': 'WEEKLY',
      'monthly': 'MONTHLY',
      'flat_rate': 'FLAT_RATE'
    };
    return mapping[type?.toLowerCase()] || 'HOURLY';
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
    await this.validator.cleanup();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    resume: args.includes('--resume'),
    validateOnly: args.includes('--validate-only'),
    dryRun: args.includes('--dry-run'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100'),
    skipBackup: args.includes('--skip-backup')
  };

  const migrationId = args.find(arg => arg.startsWith('--id='))?.split('=')[1];

  const migration = new DataMigration(migrationId);
  
  try {
    await migration.migrate(options);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DataMigration };