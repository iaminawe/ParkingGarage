import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '@/services/DatabaseService';
import { faker } from '@faker-js/faker';

export class TestDatabaseHelper {
  private static instance: TestDatabaseHelper;
  private prisma: PrismaClient;
  private databaseService: DatabaseService;

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'file:./test.db'
        }
      }
    });
    this.databaseService = new DatabaseService();
  }

  public static getInstance(): TestDatabaseHelper {
    if (!TestDatabaseHelper.instance) {
      TestDatabaseHelper.instance = new TestDatabaseHelper();
    }
    return TestDatabaseHelper.instance;
  }

  public async setupDatabase(): Promise<void> {
    try {
      // Clear all tables in the correct order to avoid foreign key conflicts
      await this.prisma.transaction.deleteMany();
      await this.prisma.parkingSession.deleteMany();
      await this.prisma.vehicle.deleteMany();
      await this.prisma.user.deleteMany();
      await this.prisma.spot.deleteMany();
      await this.prisma.garage.deleteMany();
    } catch (error) {
      console.warn('Error clearing test database:', error);
    }
  }

  public async teardownDatabase(): Promise<void> {
    try {
      await this.setupDatabase(); // Clear all data
      await this.prisma.$disconnect();
    } catch (error) {
      console.warn('Error tearing down test database:', error);
    }
  }

  public getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  public getDatabaseService(): DatabaseService {
    return this.databaseService;
  }

  public async withTransaction<T>(
    callback: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return callback(tx as PrismaClient);
    });
  }

  public async createTestUser(overrides: any = {}): Promise<any> {
    const defaultUser = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phoneNumber: faker.phone.number(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    return this.prisma.user.create({
      data: defaultUser
    });
  }

  public async createTestGarage(overrides: any = {}): Promise<any> {
    const defaultGarage = {
      id: faker.string.uuid(),
      name: faker.company.name() + ' Garage',
      location: faker.location.streetAddress(),
      capacity: faker.number.int({ min: 50, max: 500 }),
      hourlyRate: faker.number.float({ min: 2, max: 10, fractionDigits: 2 }),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    return this.prisma.garage.create({
      data: defaultGarage
    });
  }

  public async createTestSpot(garageId: string, overrides: any = {}): Promise<any> {
    const defaultSpot = {
      id: faker.string.uuid(),
      spotNumber: faker.number.int({ min: 1, max: 999 }).toString(),
      level: faker.number.int({ min: 1, max: 5 }),
      section: faker.helpers.arrayElement(['A', 'B', 'C', 'D']),
      isOccupied: false,
      vehicleType: faker.helpers.arrayElement(['COMPACT', 'REGULAR', 'LARGE', 'HANDICAP']),
      garageId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    return this.prisma.spot.create({
      data: defaultSpot
    });
  }

  public async createTestVehicle(userId: string, overrides: any = {}): Promise<any> {
    const defaultVehicle = {
      id: faker.string.uuid(),
      licensePlate: faker.vehicle.vin().substring(0, 8),
      make: faker.vehicle.manufacturer(),
      model: faker.vehicle.model(),
      color: faker.vehicle.color(),
      vehicleType: faker.helpers.arrayElement(['COMPACT', 'REGULAR', 'LARGE']),
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    return this.prisma.vehicle.create({
      data: defaultVehicle
    });
  }

  public async createTestParkingSession(
    vehicleId: string,
    spotId: string,
    overrides: any = {}
  ): Promise<any> {
    const entryTime = new Date();
    const defaultSession = {
      id: faker.string.uuid(),
      vehicleId,
      spotId,
      entryTime,
      hourlyRate: faker.number.float({ min: 2, max: 10, fractionDigits: 2 }),
      status: 'ACTIVE',
      createdAt: entryTime,
      updatedAt: entryTime,
      ...overrides
    };

    return this.prisma.parkingSession.create({
      data: defaultSession
    });
  }

  public async createTestTransaction(
    sessionId: string,
    userId: string,
    overrides: any = {}
  ): Promise<any> {
    const defaultTransaction = {
      id: faker.string.uuid(),
      sessionId,
      userId,
      amount: faker.number.float({ min: 5, max: 100, fractionDigits: 2 }),
      paymentMethod: faker.helpers.arrayElement(['CREDIT_CARD', 'CASH', 'MOBILE']),
      status: 'COMPLETED',
      transactionTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    return this.prisma.transaction.create({
      data: defaultTransaction
    });
  }

  public async createCompleteTestScenario(): Promise<{
    user: any;
    garage: any;
    spot: any;
    vehicle: any;
    session: any;
    transaction: any;
  }> {
    const user = await this.createTestUser();
    const garage = await this.createTestGarage();
    const spot = await this.createTestSpot(garage.id);
    const vehicle = await this.createTestVehicle(user.id);
    const session = await this.createTestParkingSession(vehicle.id, spot.id);
    const transaction = await this.createTestTransaction(session.id, user.id);

    return {
      user,
      garage,
      spot,
      vehicle,
      session,
      transaction
    };
  }
}

export const testDb = TestDatabaseHelper.getInstance();