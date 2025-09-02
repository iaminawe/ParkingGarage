/**
 * Database helpers for testing
 * 
 * Provides utilities for setting up test databases, managing transactions,
 * and cleaning up test data.
 */

import { DatabaseService } from '../../src/services/DatabaseService';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'file:./test.db';
const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

/**
 * Setup a clean test database
 */
export async function setupTestDatabase(): Promise<DatabaseService> {
  // Set test database URL
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  
  try {
    // Create a fresh database service instance
    const databaseService = DatabaseService.getInstance(); // Get instance
    
    // Reset the database schema
    await resetTestDatabase();
    
    // Apply migrations
    await applyTestMigrations();
    
    return databaseService;
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Clean up test database and restore original configuration
 */
export async function cleanupTestDatabase(databaseService?: DatabaseService): Promise<void> {
  try {
    if (databaseService) {
      // Close database connections
      await databaseService.disconnect();
    }
    
    // Remove test database file if using SQLite
    if (TEST_DATABASE_URL.startsWith('file:')) {
      const dbPath = TEST_DATABASE_URL.replace('file:', '');
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
    
    // Restore original database URL
    if (ORIGINAL_DATABASE_URL) {
      process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
    } else {
      delete process.env.DATABASE_URL;
    }
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
    throw error;
  }
}

/**
 * Reset the test database by dropping all tables
 */
export async function resetTestDatabase(): Promise<void> {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: TEST_DATABASE_URL
      }
    }
  });
  
  try {
    // Get all table names
    const tables = await prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'
    `;
    
    // Drop all tables
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table.name}"`);
    }
    
    // Reset migration table
    await prisma.$executeRaw`DROP TABLE IF EXISTS "_prisma_migrations"`;
  } catch (error) {
    console.error('Failed to reset test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Apply migrations to test database
 */
export async function applyTestMigrations(): Promise<void> {
  try {
    const schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
    
    // Push the schema to the test database
    execSync(`npx prisma db push --schema=${schemaPath} --force-reset`, {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'inherit'
    });
    
    // Generate Prisma client for test database
    execSync(`npx prisma generate --schema=${schemaPath}`, {
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('Failed to apply test migrations:', error);
    throw error;
  }
}

/**
 * Create a database transaction for testing
 */
export async function withTransaction<T>(
  databaseService: DatabaseService,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const prisma = databaseService.getClient();
  
  return prisma.$transaction(async (tx) => {
    return callback(tx);
  });
}

/**
 * Seed the test database with initial data
 */
export async function seedTestDatabase(databaseService: DatabaseService): Promise<void> {
  const prisma = databaseService.getClient();
  
  try {
    // Create test garages
    const testGarages = await prisma.garage.createMany({
      data: [
        {
          name: 'Downtown Parking Garage',
          city: 'Test City',
          state: 'TC',
          zipCode: '12345',
          capacity: 100,
          hourlyRate: 5.00,
          isActive: true
        },
        {
          name: 'Airport Parking Garage',
          city: 'Test City',
          state: 'TC',
          zipCode: '12346',
          capacity: 500,
          hourlyRate: 3.00,
          isActive: true
        }
      ]
    });
    
    console.log(`Created ${testGarages.count} test garages`);
  } catch (error) {
    console.error('Failed to seed test database:', error);
    throw error;
  }
}

/**
 * Clear all data from test database while keeping schema
 */
export async function clearTestDatabase(databaseService: DatabaseService): Promise<void> {
  const prisma = databaseService.getClient();
  
  try {
    // Delete in reverse order of dependencies to avoid foreign key constraints
    await prisma.parkingSession.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.parkingSpot.deleteMany({});
    await prisma.garage.deleteMany({});
    await prisma.user.deleteMany({});
    
    console.log('Test database cleared successfully');
  } catch (error) {
    console.error('Failed to clear test database:', error);
    throw error;
  }
}

/**
 * Get database statistics for testing
 */
export async function getDatabaseStats(databaseService: DatabaseService): Promise<{
  vehicles: number;
  spots: number;
  sessions: number;
  users: number;
  garages: number;
}> {
  const prisma = databaseService.getClient();
  
  const [vehicles, spots, sessions, users, garages] = await Promise.all([
    prisma.vehicle.count(),
    prisma.parkingSpot.count(),
    prisma.parkingSession.count(),
    prisma.user.count(),
    prisma.garage.count()
  ]);
  
  return { vehicles, spots, sessions, users, garages };
}

/**
 * Execute raw SQL for testing
 */
export async function executeRawSQL(
  databaseService: DatabaseService,
  sql: string,
  params: any[] = []
): Promise<any> {
  const prisma = databaseService.getClient();
  
  if (params.length > 0) {
    return prisma.$queryRawUnsafe(sql, ...params);
  } else {
    return prisma.$queryRawUnsafe(sql);
  }
}

/**
 * Create a database backup for testing
 */
export async function createDatabaseBackup(
  databaseService: DatabaseService,
  backupName: string
): Promise<string> {
  if (!TEST_DATABASE_URL.startsWith('file:')) {
    throw new Error('Backup only supported for SQLite databases');
  }
  
  const dbPath = TEST_DATABASE_URL.replace('file:', '');
  const backupPath = `${dbPath}.${backupName}.backup`;
  
  try {
    fs.copyFileSync(dbPath, backupPath);
    return backupPath;
  } catch (error) {
    console.error('Failed to create database backup:', error);
    throw error;
  }
}

/**
 * Restore database from backup
 */
export async function restoreDatabaseBackup(
  databaseService: DatabaseService,
  backupPath: string
): Promise<void> {
  if (!TEST_DATABASE_URL.startsWith('file:')) {
    throw new Error('Restore only supported for SQLite databases');
  }
  
  const dbPath = TEST_DATABASE_URL.replace('file:', '');
  
  try {
    // Disconnect current connections
    await databaseService.disconnect();
    
    // Restore backup
    fs.copyFileSync(backupPath, dbPath);
    
    // Reconnect
    await databaseService.connect();
  } catch (error) {
    console.error('Failed to restore database backup:', error);
    throw error;
  }
}

/**
 * Check if database is healthy and accessible
 */
export async function checkDatabaseHealth(databaseService: DatabaseService): Promise<{
  isHealthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Simple query to test connectivity
    await databaseService.getClient().$queryRaw`SELECT 1`;
    
    const latency = Date.now() - startTime;
    
    return {
      isHealthy: true,
      latency
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    return {
      isHealthy: false,
      latency,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create test database constraints for edge case testing
 */
export async function createTestConstraints(databaseService: DatabaseService): Promise<void> {
  const prisma = databaseService.getClient();
  
  try {
    // Add additional constraints for testing
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_vehicle_license_plate_active 
      ON vehicles(licensePlate) WHERE deletedAt IS NULL
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_spot_status_garage 
      ON spots(status, garageId) WHERE deletedAt IS NULL
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_session_active 
      ON sessions(status, checkInTime) WHERE status = 'ACTIVE' AND deletedAt IS NULL
    `;
    
    console.log('Test database constraints created');
  } catch (error) {
    console.error('Failed to create test constraints:', error);
    // Don't throw - constraints might already exist
  }
}

/**
 * Simulate database connection issues for testing
 */
export async function simulateDatabaseFailure(
  databaseService: DatabaseService,
  duration: number = 5000
): Promise<void> {
  // Temporarily disconnect the database
  await databaseService.disconnect();
  
  // Wait for specified duration
  await new Promise(resolve => setTimeout(resolve, duration));
  
  // Reconnect
  await databaseService.connect();
}

/**
 * Monitor database performance during tests
 */
export class DatabasePerformanceMonitor {
  private startTime: number = 0;
  private queryCount: number = 0;
  private queryTimes: number[] = [];
  
  start(): void {
    this.startTime = Date.now();
    this.queryCount = 0;
    this.queryTimes = [];
  }
  
  recordQuery(queryTime: number): void {
    this.queryCount++;
    this.queryTimes.push(queryTime);
  }
  
  getStats(): {
    totalTime: number;
    queryCount: number;
    averageQueryTime: number;
    maxQueryTime: number;
    minQueryTime: number;
  } {
    const totalTime = Date.now() - this.startTime;
    const averageQueryTime = this.queryTimes.length > 0 
      ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length 
      : 0;
    const maxQueryTime = this.queryTimes.length > 0 
      ? Math.max(...this.queryTimes) 
      : 0;
    const minQueryTime = this.queryTimes.length > 0 
      ? Math.min(...this.queryTimes) 
      : 0;
    
    return {
      totalTime,
      queryCount: this.queryCount,
      averageQueryTime,
      maxQueryTime,
      minQueryTime
    };
  }
}

/**
 * Create isolated test database for parallel test execution
 */
export async function createIsolatedTestDatabase(testId: string): Promise<{
  databaseService: DatabaseService;
  cleanup: () => Promise<void>;
}> {
  const isolatedDbUrl = `file:./test-${testId}.db`;
  const originalUrl = process.env.DATABASE_URL;
  
  // Set isolated database URL
  process.env.DATABASE_URL = isolatedDbUrl;
  
  try {
    // Create database service
    const databaseService = DatabaseService.getInstance();
    
    // Apply schema
    await applyTestMigrations();
    
    const cleanup = async () => {
      await databaseService.disconnect();
      
      // Remove database file
      const dbPath = isolatedDbUrl.replace('file:', '');
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      
      // Restore original URL
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
    };
    
    return { databaseService, cleanup };
  } catch (error) {
    // Restore original URL on error
    if (originalUrl) {
      process.env.DATABASE_URL = originalUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    throw error;
  }
}

export default {
  setupTestDatabase,
  cleanupTestDatabase,
  resetTestDatabase,
  applyTestMigrations,
  withTransaction,
  seedTestDatabase,
  clearTestDatabase,
  getDatabaseStats,
  executeRawSQL,
  createDatabaseBackup,
  restoreDatabaseBackup,
  checkDatabaseHealth,
  createTestConstraints,
  simulateDatabaseFailure,
  DatabasePerformanceMonitor,
  createIsolatedTestDatabase
};
