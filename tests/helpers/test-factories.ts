import { faker } from '@faker-js/faker';
import { VehicleType, PaymentMethod, TransactionStatus, ParkingSessionStatus } from '@prisma/client';

export class TestDataFactory {
  // User factories
  static createUserData(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phoneNumber: faker.phone.number(),
      password: faker.internet.password(),
      isActive: true,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createAdminUserData(overrides: any = {}) {
    return this.createUserData({
      role: 'ADMIN',
      email: faker.internet.email({ provider: 'admin.example.com' }),
      ...overrides
    });
  }

  // Garage factories
  static createGarageData(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      name: `${faker.company.name()} Parking Garage`,
      location: faker.location.streetAddress(),
      capacity: faker.number.int({ min: 50, max: 500 }),
      hourlyRate: faker.number.float({ min: 2.50, max: 15.00, fractionDigits: 2 }),
      maxHeight: faker.number.float({ min: 2.0, max: 3.5, fractionDigits: 1 }),
      isActive: true,
      contactInfo: {
        phone: faker.phone.number(),
        email: faker.internet.email(),
        website: faker.internet.url()
      },
      operatingHours: {
        weekdays: '06:00-22:00',
        weekends: '08:00-20:00'
      },
      amenities: faker.helpers.arrayElements([
        'EV_CHARGING', 'VALET', 'COVERED', 'SECURITY', 'CAR_WASH'
      ], { min: 1, max: 3 }),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  // Spot factories
  static createSpotData(garageId: string, overrides: any = {}) {
    const level = faker.number.int({ min: 1, max: 5 });
    const section = faker.helpers.arrayElement(['A', 'B', 'C', 'D', 'E']);
    const spotNumber = faker.number.int({ min: 1, max: 999 });

    return {
      id: faker.string.uuid(),
      spotNumber: `${level}${section}${spotNumber.toString().padStart(3, '0')}`,
      level,
      section,
      isOccupied: false,
      vehicleType: faker.helpers.enumValue(VehicleType),
      dimensions: {
        width: faker.number.float({ min: 2.4, max: 3.0, fractionDigits: 1 }),
        length: faker.number.float({ min: 5.0, max: 6.5, fractionDigits: 1 })
      },
      features: faker.helpers.arrayElements([
        'EV_CHARGING', 'NEAR_ELEVATOR', 'COVERED', 'HANDICAP_ACCESSIBLE'
      ], { min: 0, max: 2 }),
      garageId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createHandicapSpotData(garageId: string, overrides: any = {}) {
    return this.createSpotData(garageId, {
      vehicleType: VehicleType.HANDICAP,
      features: ['HANDICAP_ACCESSIBLE', 'NEAR_ELEVATOR'],
      dimensions: {
        width: 3.2,
        length: 6.0
      },
      ...overrides
    });
  }

  // Vehicle factories
  static createVehicleData(userId: string, overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      licensePlate: this.generateLicensePlate(),
      make: faker.vehicle.manufacturer(),
      model: faker.vehicle.model(),
      color: faker.vehicle.color(),
      year: faker.number.int({ min: 2000, max: 2024 }),
      vehicleType: faker.helpers.enumValue(VehicleType),
      userId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static generateLicensePlate(): string {
    // Generate realistic license plate patterns
    const patterns = [
      () => faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(4),
      () => faker.string.numeric(3) + faker.string.alpha({ length: 3, casing: 'upper' }),
      () => faker.string.alpha({ length: 2, casing: 'upper' }) + faker.string.numeric(5)
    ];
    
    return faker.helpers.arrayElement(patterns)();
  }

  // Parking Session factories
  static createParkingSessionData(vehicleId: string, spotId: string, overrides: any = {}) {
    const entryTime = overrides.entryTime || faker.date.recent({ days: 7 });
    const isActive = overrides.status !== ParkingSessionStatus.COMPLETED;

    return {
      id: faker.string.uuid(),
      vehicleId,
      spotId,
      entryTime,
      exitTime: isActive ? null : faker.date.between({ from: entryTime, to: new Date() }),
      hourlyRate: faker.number.float({ min: 2.50, max: 15.00, fractionDigits: 2 }),
      status: ParkingSessionStatus.ACTIVE,
      totalAmount: null,
      createdAt: entryTime,
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createCompletedSessionData(vehicleId: string, spotId: string, overrides: any = {}) {
    const entryTime = overrides.entryTime || faker.date.recent({ days: 7 });
    const exitTime = overrides.exitTime || faker.date.between({ from: entryTime, to: new Date() });
    const duration = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60); // hours
    const hourlyRate = overrides.hourlyRate || faker.number.float({ min: 2.50, max: 15.00, fractionDigits: 2 });
    const totalAmount = Math.ceil(duration) * hourlyRate;

    return this.createParkingSessionData(vehicleId, spotId, {
      exitTime,
      status: ParkingSessionStatus.COMPLETED,
      totalAmount,
      hourlyRate,
      ...overrides
    });
  }

  // Transaction factories
  static createTransactionData(sessionId: string, userId: string, overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      sessionId,
      userId,
      amount: faker.number.float({ min: 5.00, max: 200.00, fractionDigits: 2 }),
      paymentMethod: faker.helpers.enumValue(PaymentMethod),
      status: TransactionStatus.COMPLETED,
      paymentProcessor: faker.helpers.arrayElement(['STRIPE', 'PAYPAL', 'SQUARE']),
      processorTransactionId: faker.string.alphanumeric(20),
      transactionTime: new Date(),
      metadata: {
        ip: faker.internet.ip(),
        userAgent: faker.internet.userAgent()
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createFailedTransactionData(sessionId: string, userId: string, overrides: any = {}) {
    return this.createTransactionData(sessionId, userId, {
      status: TransactionStatus.FAILED,
      errorCode: faker.helpers.arrayElement(['INSUFFICIENT_FUNDS', 'CARD_DECLINED', 'NETWORK_ERROR']),
      errorMessage: faker.lorem.sentence(),
      ...overrides
    });
  }

  // Batch creation helpers
  static createMultipleUsers(count: number, overrides: any = {}): any[] {
    return Array.from({ length: count }, () => this.createUserData(overrides));
  }

  static createMultipleSpots(garageId: string, count: number, overrides: any = {}): any[] {
    return Array.from({ length: count }, () => this.createSpotData(garageId, overrides));
  }

  static createMultipleVehicles(userId: string, count: number, overrides: any = {}): any[] {
    return Array.from({ length: count }, () => this.createVehicleData(userId, overrides));
  }

  // Realistic test scenarios
  static createWeeklyUsagePattern(vehicleId: string, spotId: string) {
    const sessions = [];
    const startDate = faker.date.recent({ days: 7 });
    
    for (let i = 0; i < 5; i++) { // Weekdays
      const entryTime = new Date(startDate);
      entryTime.setDate(startDate.getDate() + i);
      entryTime.setHours(8, faker.number.int({ min: 0, max: 30 }), 0, 0);
      
      const exitTime = new Date(entryTime);
      exitTime.setHours(17, faker.number.int({ min: 0, max: 59 }), 0, 0);
      
      sessions.push(this.createCompletedSessionData(vehicleId, spotId, {
        entryTime,
        exitTime
      }));
    }
    
    return sessions;
  }

  // Edge case data
  static createLongTermParkingSession(vehicleId: string, spotId: string) {
    const entryTime = faker.date.recent({ days: 30 });
    return this.createParkingSessionData(vehicleId, spotId, {
      entryTime,
      hourlyRate: 2.50 // Long-term rate
    });
  }

  static createHighValueTransaction(sessionId: string, userId: string) {
    return this.createTransactionData(sessionId, userId, {
      amount: faker.number.float({ min: 500, max: 2000, fractionDigits: 2 }),
      paymentMethod: PaymentMethod.CREDIT_CARD
    });
  }

  // Validation test data
  static createInvalidUserData() {
    return {
      email: 'invalid-email',
      name: '',
      phoneNumber: '123', // Too short
      password: '123' // Too weak
    };
  }

  static createInvalidVehicleData(userId: string) {
    return {
      licensePlate: '', // Empty
      make: 'A'.repeat(101), // Too long
      model: '',
      color: null,
      vehicleType: 'INVALID_TYPE',
      userId
    };
  }
}