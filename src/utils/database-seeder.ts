/**
 * Database seeding utilities for development and testing
 *
 * This module provides utilities for seeding the database with sample data
 * for development and testing purposes. It creates realistic test data
 * following the database schema constraints.
 *
 * @module DatabaseSeeder
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from './logger';
import { withRetry } from './database-utils';
import * as bcrypt from 'bcryptjs';

const logger = createLogger('DatabaseSeeder');

/**
 * Seeding configuration
 */
export interface SeedConfig {
  users?: number;
  garages?: number;
  floors?: number;
  spots?: number;
  vehicles?: number;
  sessions?: number;
  payments?: number;
  transactions?: number;
  clearExisting?: boolean;
}

/**
 * Default seeding configuration
 */
export const DEFAULT_SEED_CONFIG: Required<SeedConfig> = {
  users: 10,
  garages: 2,
  floors: 3,
  spots: 50,
  vehicles: 25,
  sessions: 40,
  payments: 30,
  transactions: 35,
  clearExisting: false,
};

/**
 * Database seeder class
 */
export class DatabaseSeeder {
  private client: PrismaClient;
  private config: Required<SeedConfig>;

  constructor(client: PrismaClient, config?: SeedConfig) {
    this.client = client;
    this.config = { ...DEFAULT_SEED_CONFIG, ...config };
  }

  /**
   * Run complete database seeding
   */
  async seed(): Promise<void> {
    try {
      logger.info('Starting database seeding', this.config);

      if (this.config.clearExisting) {
        await this.clearDatabase();
      }

      // Seed in dependency order
      const users = await this.seedUsers();
      const garages = await this.seedGarages();
      const floors = await this.seedFloors(garages);
      const spots = await this.seedParkingSpots(floors);
      const vehicles = await this.seedVehicles(users);
      const sessions = await this.seedParkingSessions(vehicles, spots);
      const payments = await this.seedPayments(sessions, vehicles);
      const transactions = await this.seedTransactions(garages);

      logger.info('Database seeding completed successfully', {
        users: users.length,
        garages: garages.length,
        floors: floors.length,
        spots: spots.length,
        vehicles: vehicles.length,
        sessions: sessions.length,
        payments: payments.length,
        transactions: transactions.length,
      });
    } catch (error) {
      logger.error('Database seeding failed', error as Error);
      throw error;
    }
  }

  /**
   * Clear all existing data (development only)
   */
  async clearDatabase(): Promise<void> {
    logger.info('Clearing existing database data');

    await withRetry(
      async () => {
        await this.client.$transaction([
          this.client.payment.deleteMany({}),
          this.client.transaction.deleteMany({}),
          this.client.parkingSession.deleteMany({}),
          this.client.vehicle.deleteMany({}),
          this.client.parkingSpot.deleteMany({}),
          this.client.floor.deleteMany({}),
          this.client.garage.deleteMany({}),
          this.client.userSession.deleteMany({}),
          this.client.loginHistory.deleteMany({}),
          this.client.securityAuditLog.deleteMany({}),
          this.client.userDevice.deleteMany({}),
          this.client.user.deleteMany({}),
          this.client.ticket.deleteMany({}),
          this.client.emailTemplate.deleteMany({}),
          this.client.securitySettings.deleteMany({}),
        ]);
      },
      undefined,
      'clear database'
    );

    logger.info('Database cleared successfully');
  }

  /**
   * Seed users with realistic data
   */
  async seedUsers(): Promise<any[]> {
    logger.info('Seeding users');

    const users = [];
    const passwordHash = await bcrypt.hash('password123', 10);

    for (let i = 0; i < this.config.users; i++) {
      const user = await withRetry(
        () =>
          this.client.user.create({
            data: {
              email: `user${i + 1}@example.com`,
              passwordHash,
              firstName: this.generateFirstName(),
              lastName: this.generateLastName(),
              role: i === 0 ? 'ADMIN' : i < 3 ? 'MANAGER' : 'USER',
              isActive: Math.random() > 0.1, // 90% active
              isEmailVerified: Math.random() > 0.2, // 80% verified
              phoneNumber: this.generatePhoneNumber(),
              preferredLanguage: 'en',
              timezone: 'UTC',
            },
          }),
        undefined,
        `create user ${i + 1}`
      );

      users.push(user);
    }

    logger.info(`Created ${users.length} users`);
    return users;
  }

  /**
   * Seed garages
   */
  async seedGarages(): Promise<any[]> {
    logger.info('Seeding garages');

    const garages = [];
    const garageNames = ['Downtown Parking', 'Mall Parking', 'Airport Garage', 'Hospital Parking'];

    for (let i = 0; i < this.config.garages; i++) {
      const garage = await withRetry(
        () =>
          this.client.garage.create({
            data: {
              name: garageNames[i] || `Garage ${i + 1}`,
              description: `Multi-level parking garage ${i + 1}`,
              totalFloors: 3,
              totalSpots: 150,
              isActive: true,
              operatingHours: JSON.stringify({
                open: '06:00',
                close: '22:00',
                timezone: 'UTC',
              }),
            },
          }),
        undefined,
        `create garage ${i + 1}`
      );

      garages.push(garage);
    }

    logger.info(`Created ${garages.length} garages`);
    return garages;
  }

  /**
   * Seed floors for garages
   */
  async seedFloors(garages: any[]): Promise<any[]> {
    logger.info('Seeding floors');

    const floors = [];

    for (const garage of garages) {
      for (let floorNum = 1; floorNum <= 3; floorNum++) {
        const floor = await withRetry(
          () =>
            this.client.floor.create({
              data: {
                garageId: garage.id,
                floorNumber: floorNum,
                description: `Floor ${floorNum}`,
                totalSpots: 50,
                isActive: true,
              },
            }),
          undefined,
          `create floor ${floorNum} for garage ${garage.name}`
        );

        floors.push(floor);
      }
    }

    logger.info(`Created ${floors.length} floors`);
    return floors;
  }

  /**
   * Seed parking spots
   */
  async seedParkingSpots(floors: any[]): Promise<any[]> {
    logger.info('Seeding parking spots');

    const spots = [];
    const spotTypes = ['STANDARD', 'COMPACT', 'ELECTRIC', 'HANDICAP', 'OVERSIZED'];
    const spotStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'];

    let spotCounter = 1;
    for (const floor of floors) {
      const spotsPerFloor = Math.floor(this.config.spots / floors.length);

      for (let i = 0; i < spotsPerFloor; i++) {
        const spot = await withRetry(
          () =>
            this.client.parkingSpot.create({
              data: {
                spotNumber: `${floor.floorNumber}${String(spotCounter).padStart(2, '0')}`,
                floorId: floor.id,
                level: floor.floorNumber,
                section: String.fromCharCode(65 + Math.floor(i / 10)), // A, B, C, etc.
                spotType: this.randomChoice(spotTypes) as any,
                status: this.randomChoice(spotStatuses, [0.7, 0.2, 0.05, 0.05]) as any, // Weighted
                isActive: true,
                width: 2.4 + Math.random() * 0.6, // 2.4-3.0m
                length: 5.0 + Math.random() * 1.0, // 5.0-6.0m
                height: 2.1 + Math.random() * 0.4, // 2.1-2.5m
              },
            }),
          undefined,
          `create spot ${spotCounter}`
        );

        spots.push(spot);
        spotCounter++;
      }
    }

    logger.info(`Created ${spots.length} parking spots`);
    return spots;
  }

  /**
   * Seed vehicles
   */
  async seedVehicles(users: any[]): Promise<any[]> {
    logger.info('Seeding vehicles');

    const vehicles = [];
    const vehicleTypes = ['STANDARD', 'COMPACT', 'OVERSIZED', 'ELECTRIC'];
    const makes = ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes', 'Audi', 'Nissan', 'Hyundai'];
    const models = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Truck', 'Van'];
    const colors = ['White', 'Black', 'Silver', 'Blue', 'Red', 'Gray', 'Green'];

    for (let i = 0; i < this.config.vehicles; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const licensePlate = this.generateLicensePlate();

      const vehicle = await withRetry(
        () =>
          this.client.vehicle.create({
            data: {
              licensePlate,
              vehicleType: this.randomChoice(vehicleTypes) as any,
              ownerId: Math.random() > 0.3 ? user.id : null, // 70% have registered owners
              ownerName: user.firstName + ' ' + user.lastName,
              ownerEmail: user.email,
              ownerPhone: this.generatePhoneNumber(),
              make: this.randomChoice(makes),
              model: this.randomChoice(models),
              year: 2015 + Math.floor(Math.random() * 9), // 2015-2023
              color: this.randomChoice(colors),
              status: this.randomChoice(['PARKED', 'DEPARTED', 'ACTIVE'], [0.3, 0.5, 0.2]),
              hourlyRate: 5.0 + Math.random() * 10.0, // $5-15/hour
              isPaid: Math.random() > 0.3, // 70% paid
              totalAmount: Math.random() * 50, // $0-50
              amountPaid: Math.random() * 40, // $0-40
            },
          }),
        undefined,
        `create vehicle ${licensePlate}`
      );

      vehicles.push(vehicle);
    }

    logger.info(`Created ${vehicles.length} vehicles`);
    return vehicles;
  }

  /**
   * Seed parking sessions
   */
  async seedParkingSessions(vehicles: any[], spots: any[]): Promise<any[]> {
    logger.info('Seeding parking sessions');

    const sessions = [];
    const sessionStatuses = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'];

    for (let i = 0; i < this.config.sessions; i++) {
      const vehicle = this.randomChoice(vehicles);
      const spot = this.randomChoice(spots);
      const startTime = this.randomDateInRange(30); // Last 30 days
      const status = this.randomChoice(sessionStatuses, [0.2, 0.6, 0.1, 0.1]) as any;

      let endTime: Date | null = null;
      let duration: number | null = null;

      if (status !== 'ACTIVE') {
        endTime = new Date(startTime.getTime() + Math.random() * 8 * 60 * 60 * 1000); // 0-8 hours
        duration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes
      }

      const hourlyRate = 5.0 + Math.random() * 5.0; // $5-10/hour
      const totalAmount = duration ? (duration / 60) * hourlyRate : 0;

      const session = await withRetry(
        () =>
          this.client.parkingSession.create({
            data: {
              vehicleId: vehicle.id,
              spotId: spot.id,
              startTime,
              endTime,
              duration,
              hourlyRate,
              totalAmount,
              amountPaid: Math.random() > 0.3 ? totalAmount : 0, // 70% paid
              isPaid: Math.random() > 0.3, // 70% paid
              paymentMethod: this.randomChoice(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAY']),
              paymentTime: endTime
                ? new Date(endTime.getTime() + Math.random() * 60 * 60 * 1000)
                : null,
              status,
              notes: Math.random() > 0.8 ? 'Test session notes' : null,
            },
          }),
        undefined,
        `create session ${i + 1}`
      );

      sessions.push(session);
    }

    logger.info(`Created ${sessions.length} parking sessions`);
    return sessions;
  }

  /**
   * Seed payments
   */
  async seedPayments(sessions: any[], vehicles: any[]): Promise<any[]> {
    logger.info('Seeding payments');

    const payments = [];
    const paymentTypes = ['PARKING', 'PENALTY', 'SUBSCRIPTION', 'REFUND'];
    const paymentMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAY', 'APP_PAYMENT'];
    const paymentStatuses = ['COMPLETED', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED'];

    for (let i = 0; i < this.config.payments; i++) {
      const session = this.randomChoice(sessions);
      const vehicle = this.randomChoice(vehicles);
      const amount = 5.0 + Math.random() * 45.0; // $5-50
      const status = this.randomChoice(paymentStatuses, [0.7, 0.15, 0.1, 0.03, 0.02]);

      const payment = await withRetry(
        () =>
          this.client.payment.create({
            data: {
              sessionId: Math.random() > 0.3 ? session.id : null, // 70% linked to sessions
              vehicleId: vehicle.id,
              amount,
              currency: 'USD',
              paymentType: this.randomChoice(paymentTypes, [0.8, 0.1, 0.05, 0.05]) as any,
              paymentMethod: this.randomChoice(paymentMethods) as any,
              status: status as any,
              transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              paymentDate: this.randomDateInRange(30),
              processedAt: status === 'COMPLETED' ? this.randomDateInRange(30) : null,
              failureReason: status === 'FAILED' ? 'Insufficient funds' : null,
              refundAmount: status === 'REFUNDED' ? amount * 0.8 : 0,
              refundedAt: status === 'REFUNDED' ? this.randomDateInRange(7) : null,
              notes: Math.random() > 0.9 ? 'Test payment notes' : null,
            },
          }),
        undefined,
        `create payment ${i + 1}`
      );

      payments.push(payment);
    }

    logger.info(`Created ${payments.length} payments`);
    return payments;
  }

  /**
   * Seed transactions
   */
  async seedTransactions(garages: any[]): Promise<any[]> {
    logger.info('Seeding transactions');

    const transactions = [];
    const transactionTypes = ['PARKING_FEE', 'PENALTY', 'REFUND', 'SUBSCRIPTION', 'LATE_FEE'];
    const statuses = ['COMPLETED', 'PENDING', 'FAILED', 'CANCELLED'];
    const paymentMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAY'];

    for (let i = 0; i < this.config.transactions; i++) {
      const garage = this.randomChoice(garages);
      const amount = 5.0 + Math.random() * 95.0; // $5-100
      const status = this.randomChoice(statuses, [0.75, 0.15, 0.08, 0.02]);

      const transaction = await withRetry(
        () =>
          this.client.transaction.create({
            data: {
              garageId: garage.id,
              transactionType: this.randomChoice(transactionTypes, [0.7, 0.15, 0.05, 0.05, 0.05]),
              amount,
              currency: 'USD',
              status,
              paymentMethod: this.randomChoice(paymentMethods),
              paymentReference: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              description: `${this.randomChoice(transactionTypes)} transaction`,
              metadata: JSON.stringify({
                source: 'seeder',
                timestamp: new Date().toISOString(),
              }),
              processedAt: status === 'COMPLETED' ? this.randomDateInRange(30) : null,
            },
          }),
        undefined,
        `create transaction ${i + 1}`
      );

      transactions.push(transaction);
    }

    logger.info(`Created ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Generate random first name
   */
  private generateFirstName(): string {
    const names = [
      'John',
      'Jane',
      'Michael',
      'Sarah',
      'David',
      'Emily',
      'Robert',
      'Ashley',
      'William',
      'Jessica',
      'James',
      'Amanda',
      'Christopher',
      'Stephanie',
      'Daniel',
      'Lisa',
    ];
    return this.randomChoice(names);
  }

  /**
   * Generate random last name
   */
  private generateLastName(): string {
    const names = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Rodriguez',
      'Martinez',
      'Hernandez',
      'Lopez',
      'Gonzalez',
      'Wilson',
      'Anderson',
      'Thomas',
    ];
    return this.randomChoice(names);
  }

  /**
   * Generate random phone number
   */
  private generatePhoneNumber(): string {
    return `+1${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  /**
   * Generate random license plate
   */
  private generateLicensePlate(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    let plate = '';
    for (let i = 0; i < 3; i++) {
      plate += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
      plate += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return plate;
  }

  /**
   * Generate random date within specified days from now
   */
  private randomDateInRange(daysBack: number): Date {
    const now = new Date();
    const msBack = daysBack * 24 * 60 * 60 * 1000;
    return new Date(now.getTime() - Math.random() * msBack);
  }

  /**
   * Choose random item from array with optional weights
   */
  private randomChoice<T>(items: T[], weights?: number[]): T {
    if (!weights) {
      const randomIndex = Math.floor(Math.random() * items.length);
      return items[randomIndex]!; // We know items has at least one element
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i]!; // We know weights has corresponding elements
      if (random <= 0) {
        return items[i]!; // We know this index exists
      }
    }

    return items[items.length - 1]!; // Fallback to last item
  }
}

/**
 * Quick seed function for development
 */
export async function quickSeed(client: PrismaClient, config?: Partial<SeedConfig>): Promise<void> {
  const seeder = new DatabaseSeeder(client, config);
  await seeder.seed();
}

/**
 * Create minimal seed for testing
 */
export async function minimalSeed(client: PrismaClient): Promise<void> {
  const config: SeedConfig = {
    users: 3,
    garages: 1,
    floors: 1,
    spots: 10,
    vehicles: 5,
    sessions: 8,
    payments: 5,
    transactions: 5,
    clearExisting: true,
  };

  const seeder = new DatabaseSeeder(client, config);
  await seeder.seed();
}

export default DatabaseSeeder;
