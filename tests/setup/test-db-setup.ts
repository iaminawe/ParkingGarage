/**
 * Test Database Setup
 * 
 * Comprehensive database configuration and setup for API testing.
 * Handles test database initialization, cleanup, and data seeding.
 */

import { DatabaseService } from '../../src/services/DatabaseService';
import { createLogger } from '../../src/utils/logger';
import { PrismaClient } from '../../src/generated/prisma';
import { hashTestPassword } from '../helpers/api-test-helpers';

const logger = createLogger('TestDatabaseSetup');

export interface TestDatabaseConfig {
  url: string;
  resetBetweenTests: boolean;
  seedData: boolean;
  logQueries: boolean;
}

export class TestDatabase {
  private prisma: PrismaClient;
  private dbService: DatabaseService;
  private config: TestDatabaseConfig;

  constructor(config?: Partial<TestDatabaseConfig>) {
    this.config = {
      url: process.env.TEST_DATABASE_URL || 'file:./test.db',
      resetBetweenTests: true,
      seedData: true,
      logQueries: process.env.NODE_ENV === 'development',
      ...config
    };

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.config.url
        }
      },
      log: this.config.logQueries ? ['query', 'info', 'warn', 'error'] : ['error']
    });

    this.dbService = new DatabaseService();
  }

  /**
   * Initialize test database
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing test database...');

      // Connect to database
      await this.prisma.$connect();
      logger.info('Connected to test database');

      // Run migrations (in a real scenario)
      // await this.prisma.$executeRaw`PRAGMA foreign_keys = ON`;
      
      // Create tables if they don't exist
      await this.createTables();

      if (this.config.seedData) {
        await this.seedData();
      }

      logger.info('Test database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize test database', error as Error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    logger.info('Creating database tables...');

    // Users table
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'CUSTOMER',
        phoneNumber TEXT,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        isEmailVerified BOOLEAN NOT NULL DEFAULT FALSE,
        emailVerificationToken TEXT,
        passwordResetToken TEXT,
        passwordResetExpires DATETIME,
        lastLogin DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Vehicles table
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        licensePlate TEXT UNIQUE NOT NULL,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        color TEXT NOT NULL,
        vehicleType TEXT NOT NULL,
        ownerId TEXT NOT NULL,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Spots table
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS spots (
        id TEXT PRIMARY KEY,
        spotNumber TEXT UNIQUE NOT NULL,
        level INTEGER NOT NULL,
        zone TEXT NOT NULL,
        spotType TEXT NOT NULL DEFAULT 'REGULAR',
        isAvailable BOOLEAN NOT NULL DEFAULT TRUE,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        hourlyRate DECIMAL(10,2) NOT NULL DEFAULT 5.00,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reservations table
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        vehicleId TEXT NOT NULL,
        spotId TEXT NOT NULL,
        startTime DATETIME NOT NULL,
        endTime DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        totalAmount DECIMAL(10,2),
        notes TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
        FOREIGN KEY (spotId) REFERENCES spots(id) ON DELETE CASCADE
      )
    `);

    // Payments table
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        amount DECIMAL(10,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        paymentMethod TEXT NOT NULL,
        paymentIntentId TEXT,
        reservationId TEXT,
        transactionId TEXT,
        refundId TEXT,
        refundAmount DECIMAL(10,2),
        refundReason TEXT,
        processedAt DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE SET NULL
      )
    `);

    // Transactions table
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        description TEXT NOT NULL,
        userId TEXT NOT NULL,
        reservationId TEXT,
        paymentId TEXT,
        metadata TEXT,
        processedAt DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE SET NULL,
        FOREIGN KEY (paymentId) REFERENCES payments(id) ON DELETE SET NULL
      )
    `);

    // Sessions table for tracking user sessions
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        vehicleId TEXT NOT NULL,
        spotId TEXT NOT NULL,
        startTime DATETIME NOT NULL,
        endTime DATETIME,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        duration INTEGER DEFAULT 0,
        totalCost DECIMAL(10,2) DEFAULT 0.00,
        paymentStatus TEXT DEFAULT 'PENDING',
        notes TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
        FOREIGN KEY (spotId) REFERENCES spots(id) ON DELETE CASCADE
      )
    `);

    logger.info('Database tables created successfully');
  }

  /**
   * Seed test data
   */
  async seedData(): Promise<void> {
    logger.info('Seeding test data...');

    // Create admin user
    const adminPasswordHash = await hashTestPassword('AdminPass123!');
    await this.prisma.$executeRawUnsafe(`
      INSERT OR REPLACE INTO users (
        id, email, password, firstName, lastName, role, isActive, isEmailVerified
      ) VALUES (
        'admin-test-id', 
        'admin@test.com', 
        '${adminPasswordHash}', 
        'Admin', 
        'User', 
        'ADMIN', 
        TRUE, 
        TRUE
      )
    `);

    // Create manager user
    const managerPasswordHash = await hashTestPassword('ManagerPass123!');
    await this.prisma.$executeRawUnsafe(`
      INSERT OR REPLACE INTO users (
        id, email, password, firstName, lastName, role, isActive, isEmailVerified
      ) VALUES (
        'manager-test-id', 
        'manager@test.com', 
        '${managerPasswordHash}', 
        'Manager', 
        'User', 
        'MANAGER', 
        TRUE, 
        TRUE
      )
    `);

    // Create customer users
    const customerPasswordHash = await hashTestPassword('CustomerPass123!');
    const customers = [
      { id: 'customer-1-id', email: 'customer1@test.com', firstName: 'John', lastName: 'Doe' },
      { id: 'customer-2-id', email: 'customer2@test.com', firstName: 'Jane', lastName: 'Smith' },
      { id: 'customer-3-id', email: 'customer3@test.com', firstName: 'Bob', lastName: 'Johnson' }
    ];

    for (const customer of customers) {
      await this.prisma.$executeRawUnsafe(`
        INSERT OR REPLACE INTO users (
          id, email, password, firstName, lastName, role, isActive, isEmailVerified, phoneNumber
        ) VALUES (
          '${customer.id}', 
          '${customer.email}', 
          '${customerPasswordHash}', 
          '${customer.firstName}', 
          '${customer.lastName}', 
          'CUSTOMER', 
          TRUE, 
          TRUE,
          '+1555${Math.floor(Math.random() * 9000000) + 1000000}'
        )
      `);
    }

    // Create test vehicles
    const vehicles = [
      { id: 'vehicle-1-id', licensePlate: 'ABC123', make: 'Toyota', model: 'Camry', color: 'Blue', type: 'CAR', ownerId: 'customer-1-id' },
      { id: 'vehicle-2-id', licensePlate: 'XYZ789', make: 'Honda', model: 'Civic', color: 'Red', type: 'CAR', ownerId: 'customer-2-id' },
      { id: 'vehicle-3-id', licensePlate: 'DEF456', make: 'Ford', model: 'F-150', color: 'Black', type: 'TRUCK', ownerId: 'customer-3-id' }
    ];

    for (const vehicle of vehicles) {
      await this.prisma.$executeRawUnsafe(`
        INSERT OR REPLACE INTO vehicles (
          id, licensePlate, make, model, color, vehicleType, ownerId, isActive
        ) VALUES (
          '${vehicle.id}', 
          '${vehicle.licensePlate}', 
          '${vehicle.make}', 
          '${vehicle.model}', 
          '${vehicle.color}', 
          '${vehicle.type}', 
          '${vehicle.ownerId}', 
          TRUE
        )
      `);
    }

    // Create test spots
    const spots = [
      { id: 'spot-1-id', spotNumber: 'A1', level: 1, zone: 'A', type: 'REGULAR', rate: 5.00 },
      { id: 'spot-2-id', spotNumber: 'A2', level: 1, zone: 'A', type: 'REGULAR', rate: 5.00 },
      { id: 'spot-3-id', spotNumber: 'B1', level: 1, zone: 'B', type: 'COMPACT', rate: 4.00 },
      { id: 'spot-4-id', spotNumber: 'P1', level: 1, zone: 'Premium', type: 'PREMIUM', rate: 8.00 },
      { id: 'spot-5-id', spotNumber: 'H1', level: 1, zone: 'Handicap', type: 'HANDICAP', rate: 5.00 }
    ];

    for (const spot of spots) {
      await this.prisma.$executeRawUnsafe(`
        INSERT OR REPLACE INTO spots (
          id, spotNumber, level, zone, spotType, isAvailable, isActive, hourlyRate
        ) VALUES (
          '${spot.id}', 
          '${spot.spotNumber}', 
          ${spot.level}, 
          '${spot.zone}', 
          '${spot.type}', 
          TRUE, 
          TRUE, 
          ${spot.rate}
        )
      `);
    }

    // Create test reservations
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const reservations = [
      { id: 'reservation-1-id', userId: 'customer-1-id', vehicleId: 'vehicle-1-id', spotId: 'spot-1-id', amount: 10.00 },
      { id: 'reservation-2-id', userId: 'customer-2-id', vehicleId: 'vehicle-2-id', spotId: 'spot-2-id', amount: 10.00 }
    ];

    for (const reservation of reservations) {
      await this.prisma.$executeRawUnsafe(`
        INSERT OR REPLACE INTO reservations (
          id, userId, vehicleId, spotId, startTime, endTime, status, totalAmount
        ) VALUES (
          '${reservation.id}', 
          '${reservation.userId}', 
          '${reservation.vehicleId}', 
          '${reservation.spotId}', 
          '${startTime.toISOString()}', 
          '${endTime.toISOString()}', 
          'CONFIRMED', 
          ${reservation.amount}
        )
      `);
    }

    // Create test payments
    const payments = [
      { id: 'payment-1-id', amount: 10.00, reservationId: 'reservation-1-id', method: 'CREDIT_CARD' },
      { id: 'payment-2-id', amount: 10.00, reservationId: 'reservation-2-id', method: 'DEBIT_CARD' }
    ];

    for (const payment of payments) {
      await this.prisma.$executeRawUnsafe(`
        INSERT OR REPLACE INTO payments (
          id, amount, status, paymentMethod, reservationId
        ) VALUES (
          '${payment.id}', 
          ${payment.amount}, 
          'COMPLETED', 
          '${payment.method}', 
          '${payment.reservationId}'
        )
      `);
    }

    // Create test transactions
    const transactions = [
      { id: 'transaction-1-id', type: 'PAYMENT', amount: 10.00, userId: 'customer-1-id', paymentId: 'payment-1-id', description: 'Parking payment' },
      { id: 'transaction-2-id', type: 'PAYMENT', amount: 10.00, userId: 'customer-2-id', paymentId: 'payment-2-id', description: 'Parking payment' }
    ];

    for (const transaction of transactions) {
      await this.prisma.$executeRawUnsafe(`
        INSERT OR REPLACE INTO transactions (
          id, type, amount, status, description, userId, paymentId
        ) VALUES (
          '${transaction.id}', 
          '${transaction.type}', 
          ${transaction.amount}, 
          'COMPLETED', 
          '${transaction.description}', 
          '${transaction.userId}', 
          '${transaction.paymentId}'
        )
      `);
    }

    logger.info('Test data seeded successfully');
  }

  /**
   * Clean up test data
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up test database...');

      // Delete data in reverse dependency order
      await this.prisma.$executeRawUnsafe('DELETE FROM sessions');
      await this.prisma.$executeRawUnsafe('DELETE FROM transactions');
      await this.prisma.$executeRawUnsafe('DELETE FROM payments');
      await this.prisma.$executeRawUnsafe('DELETE FROM reservations');
      await this.prisma.$executeRawUnsafe('DELETE FROM vehicles');
      await this.prisma.$executeRawUnsafe('DELETE FROM spots');
      await this.prisma.$executeRawUnsafe('DELETE FROM users');

      logger.info('Test database cleaned up successfully');
    } catch (error) {
      logger.error('Failed to cleanup test database', error as Error);
      throw error;
    }
  }

  /**
   * Reset database to initial state
   */
  async reset(): Promise<void> {
    await this.cleanup();
    if (this.config.seedData) {
      await this.seedData();
    }
  }

  /**
   * Get Prisma client
   */
  getPrisma(): PrismaClient {
    return this.prisma;
  }

  /**
   * Get database service
   */
  getService(): DatabaseService {
    return this.dbService;
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect();
    logger.info('Test database connections closed');
  }

  /**
   * Execute raw query
   */
  async executeRaw(query: string, params?: any[]): Promise<any> {
    return this.prisma.$executeRawUnsafe(query, ...(params || []));
  }

  /**
   * Query raw data
   */
  async queryRaw(query: string, params?: any[]): Promise<any> {
    return this.prisma.$queryRawUnsafe(query, ...(params || []));
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    users: number;
    vehicles: number;
    spots: number;
    reservations: number;
    payments: number;
    transactions: number;
    sessions: number;
  }> {
    const [
      users,
      vehicles,
      spots,
      reservations,
      payments,
      transactions,
      sessions
    ] = await Promise.all([
      this.prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM users'),
      this.prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM vehicles'),
      this.prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM spots'),
      this.prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM reservations'),
      this.prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM payments'),
      this.prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM transactions'),
      this.prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM sessions')
    ]);

    return {
      users: (users as any)[0]?.count || 0,
      vehicles: (vehicles as any)[0]?.count || 0,
      spots: (spots as any)[0]?.count || 0,
      reservations: (reservations as any)[0]?.count || 0,
      payments: (payments as any)[0]?.count || 0,
      transactions: (transactions as any)[0]?.count || 0,
      sessions: (sessions as any)[0]?.count || 0
    };
  }
}

/**
 * Create test database instance
 */
export function createTestDatabase(config?: Partial<TestDatabaseConfig>): TestDatabase {
  return new TestDatabase(config);
}

/**
 * Global test database setup and teardown
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  const testDb = createTestDatabase();
  await testDb.initialize();
  return testDb;
}

export async function teardownTestDatabase(testDb: TestDatabase): Promise<void> {
  await testDb.cleanup();
  await testDb.close();
}

export default TestDatabase;