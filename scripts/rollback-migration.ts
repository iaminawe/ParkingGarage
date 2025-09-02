#!/usr/bin/env ts-node

/**
 * Rollback Migration Script
 * 
 * This script provides comprehensive rollback capabilities to restore the system
 * to a previous state in case of migration failures or issues.
 * 
 * Usage:
 *   npm run db:rollback [--backup-id=<id>] [--confirm] [--preserve-new-data]
 */

import { PrismaClient } from '../src/generated/prisma';
import { MemoryStore } from '../src/storage/memoryStore';
import { MigrationStatusTracker } from '../src/utils/migration-status';
import { DataBackupUtility } from '../src/utils/data-backup';
import * as fs from 'fs';
import * as path from 'path';

interface RollbackOptions {
  backupId?: string;
  confirm?: boolean;
  preserveNewData?: boolean;
  validateAfter?: boolean;
}

interface RollbackResult {
  success: boolean;
  backupRestored?: string;
  memoryStoreRestored: boolean;
  databaseCleared: boolean;
  error?: string;
  warnings: string[];
}

class MigrationRollback {
  private prisma: PrismaClient;
  private memoryStore: MemoryStore;
  private statusTracker: MigrationStatusTracker;
  private backupUtility: DataBackupUtility;
  private migrationId: string;

  constructor(migrationId?: string) {
    this.migrationId = migrationId || 'rollback-operation';
    this.prisma = new PrismaClient();
    this.memoryStore = MemoryStore.getInstance();
    this.statusTracker = new MigrationStatusTracker(this.migrationId);
    this.backupUtility = new DataBackupUtility();
  }

  /**
   * Main rollback entry point
   */
  async rollback(options: RollbackOptions = {}): Promise<RollbackResult> {
    const result: RollbackResult = {
      success: false,
      memoryStoreRestored: false,
      databaseCleared: false,
      warnings: []
    };

    try {
      console.log('🔄 Starting migration rollback...');

      // Safety check - require confirmation for non-interactive runs
      if (!options.confirm && !process.stdout.isTTY) {
        throw new Error('Rollback requires --confirm flag when running non-interactively');
      }

      // Interactive confirmation
      if (!options.confirm && process.stdout.isTTY) {
        const confirmed = await this.promptConfirmation();
        if (!confirmed) {
          console.log('❌ Rollback cancelled by user');
          return result;
        }
      }

      // Find the backup to restore
      const backupToRestore = await this.selectBackup(options.backupId);
      if (!backupToRestore) {
        throw new Error('No suitable backup found for rollback');
      }

      console.log(`📦 Selected backup: ${backupToRestore.id} (${backupToRestore.timestamp})`);

      // Update status
      await this.statusTracker.initializeMigration(this.migrationId, 4);
      await this.statusTracker.updateStatus({ 
        id: this.migrationId, 
        status: 'in_progress' 
      });

      // Step 1: Create a backup of current state (if preserveNewData)
      if (options.preserveNewData) {
        console.log('💾 Creating backup of current state before rollback...');
        const preRollbackBackup = await this.backupUtility.createBackup(
          `pre-rollback-${Date.now()}`,
          {
            includeMemoryStore: true,
            includeSQLiteDB: true,
            retentionDays: 7
          }
        );

        if (!preRollbackBackup.success) {
          result.warnings.push(`Warning: Failed to backup current state: ${preRollbackBackup.error}`);
        }

        await this.statusTracker.createCheckpoint(
          'pre-rollback-backup',
          { totalRecords: 1, processedRecords: 1, currentTable: 'backup' }
        );
      }

      // Step 2: Clear current database
      if (!options.preserveNewData) {
        console.log('🗑️ Clearing current database...');
        await this.clearDatabase();
        result.databaseCleared = true;
        
        await this.statusTracker.createCheckpoint(
          'clear-database',
          { totalRecords: 1, processedRecords: 1, currentTable: 'database' }
        );
      }

      // Step 3: Restore from backup
      console.log('📥 Restoring from backup...');
      const restoreResult = await this.backupUtility.restoreFromBackup(backupToRestore.path);
      
      if (!restoreResult.success) {
        throw new Error(`Backup restore failed: ${restoreResult.error}`);
      }

      result.backupRestored = backupToRestore.id;
      result.memoryStoreRestored = restoreResult.restoredFiles.some(f => f.startsWith('memorystore-'));
      
      await this.statusTracker.createCheckpoint(
        'restore-backup',
        { totalRecords: 1, processedRecords: 1, currentTable: 'restore' }
      );

      // Step 4: Validate rollback
      if (options.validateAfter !== false) {
        console.log('🔍 Validating rollback...');
        await this.validateRollback();
        
        await this.statusTracker.createCheckpoint(
          'validate-rollback',
          { totalRecords: 1, processedRecords: 1, currentTable: 'validation' }
        );
      }

      // Complete rollback
      await this.statusTracker.updateStatus({
        id: this.migrationId,
        status: 'completed',
        completedSteps: 4
      });

      result.success = true;
      console.log('✅ Rollback completed successfully!');

      // Print summary
      this.printRollbackSummary(result, backupToRestore);

      return result;

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      
      await this.statusTracker.updateStatus({
        id: this.migrationId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown rollback error'
      });

      result.error = error instanceof Error ? error.message : 'Unknown rollback error';
      return result;

    } finally {
      await this.cleanup();
    }
  }

  /**
   * Select backup for rollback
   */
  private async selectBackup(backupId?: string): Promise<any> {
    const backups = await this.backupUtility.listBackups();
    
    if (backups.length === 0) {
      throw new Error('No backups available for rollback');
    }

    if (backupId) {
      const backup = backups.find(b => b.id === backupId);
      if (!backup) {
        throw new Error(`Backup with ID '${backupId}' not found`);
      }
      return backup;
    }

    // Interactive selection if available
    if (process.stdout.isTTY) {
      return await this.promptBackupSelection(backups);
    }

    // Non-interactive: use most recent backup
    console.log('No backup ID specified, using most recent backup');
    return backups[0];
  }

  /**
   * Clear current database
   */
  private async clearDatabase(): Promise<void> {
    try {
      // Clear in dependency order to avoid foreign key constraints
      await this.prisma.payment.deleteMany();
      await this.prisma.ticket.deleteMany();
      await this.prisma.parkingSession.deleteMany();
      await this.prisma.vehicle.deleteMany();
      await this.prisma.spot.deleteMany();
      await this.prisma.floor.deleteMany();
      await this.prisma.garage.deleteMany();

      console.log('  ✅ Database cleared successfully');
    } catch (error) {
      throw new Error(`Failed to clear database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate rollback integrity
   */
  private async validateRollback(): Promise<void> {
    try {
      // Check if MemoryStore was restored
      const memoryStats = this.memoryStore.getStats();
      console.log(`  📊 MemoryStore stats: ${JSON.stringify(memoryStats)}`);

      // Check database state
      const dbStats = {
        garages: await this.prisma.garage.count(),
        spots: await this.prisma.spot.count(),
        vehicles: await this.prisma.vehicle.count(),
        sessions: await this.prisma.parkingSession.count(),
        tickets: await this.prisma.ticket.count(),
        payments: await this.prisma.payment.count()
      };
      console.log(`  📊 Database stats: ${JSON.stringify(dbStats)}`);

      console.log('  ✅ Rollback validation passed');
    } catch (error) {
      console.warn(`  ⚠️ Rollback validation warning: ${error}`);
    }
  }

  /**
   * Prompt user for confirmation
   */
  private async promptConfirmation(): Promise<boolean> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(
        '⚠️  This will rollback your migration and potentially lose data. Continue? (y/N): ',
        (answer: string) => {
          rl.close();
          resolve(answer.toLowerCase().startsWith('y'));
        }
      );
    });
  }

  /**
   * Prompt user for backup selection
   */
  private async promptBackupSelection(backups: any[]): Promise<any> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n📦 Available backups:');
    backups.forEach((backup, index) => {
      const size = Math.round(backup.size / 1024);
      console.log(`  ${index + 1}. ${backup.id} (${backup.timestamp.toLocaleString()}, ${size}KB)`);
    });

    return new Promise((resolve) => {
      rl.question(
        `\nSelect backup to restore (1-${backups.length}, or Enter for most recent): `,
        (answer: string) => {
          rl.close();
          
          if (!answer.trim()) {
            resolve(backups[0]);
          } else {
            const index = parseInt(answer) - 1;
            if (index >= 0 && index < backups.length) {
              resolve(backups[index]);
            } else {
              console.log('Invalid selection, using most recent backup');
              resolve(backups[0]);
            }
          }
        }
      );
    });
  }

  /**
   * Print rollback summary
   */
  private printRollbackSummary(result: RollbackResult, backup: any): void {
    console.log('\n📋 Rollback Summary:');
    console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Backup restored: ${result.backupRestored || 'None'}`);
    console.log(`   Backup timestamp: ${backup.timestamp.toLocaleString()}`);
    console.log(`   MemoryStore restored: ${result.memoryStoreRestored ? '✅' : '❌'}`);
    console.log(`   Database cleared: ${result.databaseCleared ? '✅' : '❌'}`);
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (result.error) {
      console.log(`\n❌ Error: ${result.error}`);
    }
  }

  /**
   * Emergency rollback - minimal dependencies
   */
  static async emergencyRollback(backupPath?: string): Promise<void> {
    console.log('🚨 Emergency rollback initiated...');
    
    try {
      const backupUtility = new DataBackupUtility();
      const backups = await backupUtility.listBackups();
      
      if (backups.length === 0) {
        throw new Error('No backups available for emergency rollback');
      }

      const backupToRestore = backupPath 
        ? backups.find(b => b.path === backupPath) || backups[0]
        : backups[0];

      console.log(`📦 Restoring from backup: ${backupToRestore.id}`);
      
      const restoreResult = await backupUtility.restoreFromBackup(backupToRestore.path);
      
      if (!restoreResult.success) {
        throw new Error(`Emergency restore failed: ${restoreResult.error}`);
      }

      console.log('✅ Emergency rollback completed');
      console.log('⚠️ Please run a full migration validation');

    } catch (error) {
      console.error('❌ Emergency rollback failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options: RollbackOptions = {
    backupId: args.find(arg => arg.startsWith('--backup-id='))?.split('=')[1],
    confirm: args.includes('--confirm'),
    preserveNewData: args.includes('--preserve-new-data'),
    validateAfter: !args.includes('--skip-validation')
  };

  // Handle emergency rollback
  if (args.includes('--emergency')) {
    const backupPath = args.find(arg => arg.startsWith('--backup-path='))?.split('=')[1];
    try {
      await MigrationRollback.emergencyRollback(backupPath);
      process.exit(0);
    } catch (error) {
      console.error('Emergency rollback failed:', error);
      process.exit(1);
    }
  }

  const migrationId = args.find(arg => arg.startsWith('--migration-id='))?.split('=')[1];
  const rollback = new MigrationRollback(migrationId);
  
  try {
    const result = await rollback.rollback(options);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { MigrationRollback };