/**
 * Data Backup Utility
 *
 * Provides comprehensive backup and restore functionality for migration safety.
 * Supports both MemoryStore data and SQLite database backups.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MemoryStore } from '../storage/memoryStore';

export interface BackupOptions {
  includeMemoryStore: boolean;
  includeSQLiteDB: boolean;
  compressionLevel?: number;
  retentionDays?: number;
}

export interface BackupResult {
  success: boolean;
  backupPath: string;
  timestamp: Date;
  size: number;
  files: string[];
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredFiles: string[];
  error?: string;
}

export class DataBackupUtility {
  private backupDir: string;

  constructor(baseBackupDir?: string) {
    this.backupDir = baseBackupDir || path.join(process.cwd(), '.migration', 'backups');

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a complete backup before migration
   */
  async createBackup(
    migrationId: string,
    options: BackupOptions = {
      includeMemoryStore: true,
      includeSQLiteDB: true,
      retentionDays: 30,
    }
  ): Promise<BackupResult> {
    const timestamp = new Date();
    const backupId = `${migrationId}-${timestamp.getTime()}`;
    const backupPath = path.join(this.backupDir, backupId);

    try {
      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      const backedUpFiles: string[] = [];
      let totalSize = 0;

      // Backup MemoryStore data
      if (options.includeMemoryStore) {
        const memoryStoreBackup = await this.backupMemoryStore(backupPath);
        if (memoryStoreBackup.success) {
          backedUpFiles.push(...memoryStoreBackup.files);
          totalSize += memoryStoreBackup.size;
        } else {
          throw new Error(`MemoryStore backup failed: ${memoryStoreBackup.error}`);
        }
      }

      // Backup SQLite database
      if (options.includeSQLiteDB) {
        const dbBackup = await this.backupSQLiteDB(backupPath);
        if (dbBackup.success) {
          backedUpFiles.push(...dbBackup.files);
          totalSize += dbBackup.size;
        } else {
          throw new Error(`SQLite backup failed: ${dbBackup.error}`);
        }
      }

      // Create backup metadata
      const metadata = {
        migrationId,
        timestamp,
        options,
        files: backedUpFiles,
        totalSize,
        version: '1.0.0',
      };

      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      backedUpFiles.push('backup-metadata.json');

      // Clean up old backups
      if (options.retentionDays) {
        await this.cleanupOldBackups(options.retentionDays);
      }

      return {
        success: true,
        backupPath,
        timestamp,
        size: totalSize,
        files: backedUpFiles,
      };
    } catch (error) {
      return {
        success: false,
        backupPath,
        timestamp,
        size: 0,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown backup error',
      };
    }
  }

  /**
   * Backup MemoryStore data to JSON files
   */
  private async backupMemoryStore(backupPath: string): Promise<{
    success: boolean;
    files: string[];
    size: number;
    error?: string;
  }> {
    try {
      const memoryStore = MemoryStore.getInstance();
      const files: string[] = [];
      let totalSize = 0;

      // Backup each collection
      const collections = [
        { name: 'spots', data: Array.from(memoryStore.spots.entries()) },
        { name: 'vehicles', data: Array.from(memoryStore.vehicles.entries()) },
        { name: 'sessions', data: [] }, // Memory store doesn't have sessions
        { name: 'garageConfig', data: Array.from(memoryStore.garageConfig.entries()) },
        {
          name: 'spotsByFloorBay',
          data: Array.from(memoryStore.spotsByFloorBay.entries()).map(([key, value]) => [
            key,
            Array.from(value),
          ]),
        },
        { name: 'occupiedSpots', data: Array.from(memoryStore.occupiedSpots) },
      ];

      for (const collection of collections) {
        const filePath = path.join(backupPath, `memorystore-${collection.name}.json`);
        const content = JSON.stringify(collection.data, null, 2);
        await fs.promises.writeFile(filePath, content);

        const stats = await fs.promises.stat(filePath);
        totalSize += stats.size;
        files.push(path.basename(filePath));
      }

      // Backup statistics
      const stats = memoryStore.getStats();
      const statsPath = path.join(backupPath, 'memorystore-stats.json');
      await fs.promises.writeFile(statsPath, JSON.stringify(stats, null, 2));
      const statsFileStats = await fs.promises.stat(statsPath);
      totalSize += statsFileStats.size;
      files.push('memorystore-stats.json');

      return { success: true, files, size: totalSize };
    } catch (error) {
      return {
        success: false,
        files: [],
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown MemoryStore backup error',
      };
    }
  }

  /**
   * Backup SQLite database file
   */
  private async backupSQLiteDB(backupPath: string): Promise<{
    success: boolean;
    files: string[];
    size: number;
    error?: string;
  }> {
    try {
      const files: string[] = [];
      let totalSize = 0;

      // Common SQLite database file locations
      const possibleDBPaths = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), 'dev.db'),
        path.join(process.cwd(), 'database.db'),
        path.join(process.cwd(), 'parking-garage.db'),
      ];

      for (const dbPath of possibleDBPaths) {
        if (fs.existsSync(dbPath)) {
          const dbFileName = path.basename(dbPath);
          const backupDBPath = path.join(backupPath, `sqlite-${dbFileName}`);

          await fs.promises.copyFile(dbPath, backupDBPath);

          const stats = await fs.promises.stat(backupDBPath);
          totalSize += stats.size;
          files.push(path.basename(backupDBPath));

          // Also backup WAL and SHM files if they exist
          const walPath = `${dbPath}-wal`;
          const shmPath = `${dbPath}-shm`;

          if (fs.existsSync(walPath)) {
            const backupWalPath = path.join(backupPath, `sqlite-${dbFileName}-wal`);
            await fs.promises.copyFile(walPath, backupWalPath);
            const walStats = await fs.promises.stat(backupWalPath);
            totalSize += walStats.size;
            files.push(path.basename(backupWalPath));
          }

          if (fs.existsSync(shmPath)) {
            const backupShmPath = path.join(backupPath, `sqlite-${dbFileName}-shm`);
            await fs.promises.copyFile(shmPath, backupShmPath);
            const shmStats = await fs.promises.stat(backupShmPath);
            totalSize += shmStats.size;
            files.push(path.basename(backupShmPath));
          }
        }
      }

      if (files.length === 0) {
        return {
          success: false,
          files: [],
          size: 0,
          error: 'No SQLite database files found to backup',
        };
      }

      return { success: true, files, size: totalSize };
    } catch (error) {
      return {
        success: false,
        files: [],
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown SQLite backup error',
      };
    }
  }

  /**
   * Restore data from backup
   */
  async restoreFromBackup(backupPath: string): Promise<RestoreResult> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup path does not exist: ${backupPath}`);
      }

      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      if (!fs.existsSync(metadataPath)) {
        throw new Error('Invalid backup: metadata file not found');
      }

      const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
      const restoredFiles: string[] = [];

      // Restore MemoryStore data
      const memoryStoreFiles = metadata.files.filter((f: string) => f.startsWith('memorystore-'));
      if (memoryStoreFiles.length > 0) {
        await this.restoreMemoryStore(backupPath, memoryStoreFiles);
        restoredFiles.push(...memoryStoreFiles);
      }

      // Restore SQLite database
      const sqliteFiles = metadata.files.filter((f: string) => f.startsWith('sqlite-'));
      if (sqliteFiles.length > 0) {
        await this.restoreSQLiteDB(backupPath, sqliteFiles);
        restoredFiles.push(...sqliteFiles);
      }

      return {
        success: true,
        restoredFiles,
      };
    } catch (error) {
      return {
        success: false,
        restoredFiles: [],
        error: error instanceof Error ? error.message : 'Unknown restore error',
      };
    }
  }

  /**
   * Restore MemoryStore from backup files
   */
  private async restoreMemoryStore(backupPath: string, files: string[]): Promise<void> {
    const memoryStore = MemoryStore.getInstance();

    for (const file of files) {
      if (file === 'memorystore-stats.json') {
        continue;
      } // Skip stats file

      const filePath = path.join(backupPath, file);
      const content = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      const collectionName = file.replace('memorystore-', '').replace('.json', '');

      switch (collectionName) {
        case 'spots':
          memoryStore.spots.clear();
          for (const [key, value] of data) {
            memoryStore.spots.set(key, value);
          }
          break;
        case 'vehicles':
          memoryStore.vehicles.clear();
          for (const [key, value] of data) {
            memoryStore.vehicles.set(key, value);
          }
          break;
        case 'sessions':
          // Memory store doesn't have sessions, skipping
          break;
        case 'garageConfig':
          memoryStore.garageConfig.clear();
          for (const [key, value] of data) {
            memoryStore.garageConfig.set(key, value);
          }
          break;
        case 'spotsByFloorBay':
          memoryStore.spotsByFloorBay.clear();
          for (const [key, value] of data) {
            memoryStore.spotsByFloorBay.set(key, new Set(value));
          }
          break;
        case 'occupiedSpots':
          memoryStore.occupiedSpots.clear();
          for (const value of data) {
            memoryStore.occupiedSpots.add(value);
          }
          break;
      }
    }
  }

  /**
   * Restore SQLite database from backup
   */
  private async restoreSQLiteDB(backupPath: string, files: string[]): Promise<void> {
    for (const file of files) {
      const backupFilePath = path.join(backupPath, file);

      // Determine restore path based on file name
      const originalFileName = file.replace('sqlite-', '');
      let restorePath: string;

      if (originalFileName.includes('-wal') || originalFileName.includes('-shm')) {
        // Handle WAL and SHM files
        const baseFileName = originalFileName.replace('-wal', '').replace('-shm', '');
        const isWal = originalFileName.includes('-wal');
        const extension = isWal ? '-wal' : '-shm';

        restorePath = path.join(process.cwd(), 'prisma', baseFileName) + extension;
        if (!fs.existsSync(path.dirname(restorePath))) {
          restorePath = path.join(process.cwd(), baseFileName) + extension;
        }
      } else {
        // Handle main database file
        restorePath = path.join(process.cwd(), 'prisma', originalFileName);
        if (!fs.existsSync(path.dirname(restorePath))) {
          restorePath = path.join(process.cwd(), originalFileName);
        }
      }

      await fs.promises.copyFile(backupFilePath, restorePath);
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<
    Array<{
      id: string;
      path: string;
      timestamp: Date;
      size: number;
      migrationId: string;
      files: string[];
    }>
  > {
    const backups: Array<any> = [];

    try {
      const entries = await fs.promises.readdir(this.backupDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const metadataPath = path.join(this.backupDir, entry.name, 'backup-metadata.json');

          if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));

            backups.push({
              id: entry.name,
              path: path.join(this.backupDir, entry.name),
              timestamp: new Date(metadata.timestamp),
              size: metadata.totalSize,
              migrationId: metadata.migrationId,
              files: metadata.files,
            });
          }
        }
      }

      // Sort by timestamp, newest first
      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  private async cleanupOldBackups(retentionDays: number): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const backups = await this.listBackups();

      for (const backup of backups) {
        if (backup.timestamp < cutoffDate) {
          await fs.promises.rm(backup.path, { recursive: true, force: true });
          console.log(`Cleaned up old backup: ${backup.id}`);
        }
      }
    } catch (error) {
      console.warn(`Warning: Failed to cleanup old backups: ${error}`);
    }
  }
}
