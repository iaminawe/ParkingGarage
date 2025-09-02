/**
 * Test Data Factory for creating consistent test data
 * 
 * Provides methods to create vehicles, spots, sessions, users,
 * and other test entities with realistic data.
 */

import { faker } from '@faker-js/faker';
import { DatabaseService } from '../../src/services/DatabaseService';
import { 
  Vehicle, 
  Spot, 
  Session, 
  User, 
  Garage,
  VehicleType, 
  VehicleStatus, 
  SpotType, 
  SpotStatus,
  SessionStatus,
  UserRole,
  Prisma
} from '@prisma/client';

export interface CreateVehicleOptions {
  licensePlate?: string;
  vehicleType?: VehicleType;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  status?: VehicleStatus;
  currentSpotId?: string;
  notes?: string;
}

export interface CreateSpotOptions {
  number?: string;
  type?: SpotType;
  status?: SpotStatus;
  garageId?: string;
  floor?: number;
  section?: string;
  isHandicapAccessible?: boolean;
  hourlyRate?: number;
  currentVehicleId?: string;
}

export interface CreateSessionOptions {
  vehicleId?: string;
  spotId?: string;
  status?: SessionStatus;
  checkInTime?: Date;
  checkOutTime?: Date;
  duration?: number;
  totalAmount?: number;
  isPaid?: boolean;
  paymentMethod?: string;
  notes?: string;
}

export interface CreateUserOptions {
  email?: string;
  name?: string;
  role?: UserRole;
  password?: string;
  isActive?: boolean;
  lastLoginAt?: Date;
}

export interface CreateGarageOptions {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  capacity?: number;
  hourlyRate?: number;
  isActive?: boolean;
}

/**
 * Factory class for creating test data with realistic and consistent values
 */
export class TestDataFactory {
  private databaseService: DatabaseService;
  private createdEntities: {
    vehicles: string[];
    spots: string[];
    sessions: string[];
    users: string[];
    garages: string[];
  };

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
    this.createdEntities = {
      vehicles: [],
      spots: [],
      sessions: [],
      users: [],
      garages: []
    };
  }

  /**
   * Create a single vehicle with realistic data
   */
  async createVehicle(options: CreateVehicleOptions = {}): Promise<Vehicle> {
    const licensePlate = options.licensePlate || this.generateLicensePlate();
    const vehicleType = options.vehicleType || faker.helpers.enumValue(VehicleType);
    const make = options.make || faker.vehicle.manufacturer();
    const model = options.model || faker.vehicle.model();
    const color = options.color || faker.vehicle.color();
    const year = options.year || faker.date.past({ years: 15 }).getFullYear();
    const ownerName = options.ownerName || faker.person.fullName();
    const ownerEmail = options.ownerEmail || faker.internet.email();
    const ownerPhone = options.ownerPhone || faker.phone.number();
    const status = options.status || VehicleStatus.ACTIVE;

    const vehicleData: Prisma.VehicleCreateInput = {
      licensePlate: licensePlate.toUpperCase(),
      vehicleType,
      make,
      model,
      color,
      year,
      ownerName,
      ownerEmail,
      ownerPhone,
      status,
      currentSpotId: options.currentSpotId,
      notes: options.notes
    };

    const vehicle = await this.databaseService.getClient().vehicle.create({
      data: vehicleData
    });

    this.createdEntities.vehicles.push(vehicle.id);
    return vehicle;
  }

  /**
   * Create multiple vehicles
   */
  async createVehicles(count: number | CreateVehicleOptions[]): Promise<Vehicle[]> {
    if (typeof count === 'number') {
      const promises = Array.from({ length: count }, () => this.createVehicle());
      return Promise.all(promises);
    } else {
      const promises = count.map(options => this.createVehicle(options));
      return Promise.all(promises);
    }
  }

  /**
   * Create a parking spot with realistic data
   */
  async createSpot(options: CreateSpotOptions = {}): Promise<Spot> {
    const number = options.number || this.generateSpotNumber();
    const type = options.type || faker.helpers.enumValue(SpotType);
    const status = options.status || SpotStatus.AVAILABLE;
    const floor = options.floor || faker.number.int({ min: 1, max: 10 });
    const section = options.section || faker.helpers.arrayElement(['A', 'B', 'C', 'D', 'E']);
    const isHandicapAccessible = options.isHandicapAccessible || faker.datatype.boolean(0.1); // 10% handicap accessible
    const hourlyRate = options.hourlyRate || faker.number.float({ min: 2.0, max: 8.0, fractionDigits: 2 });

    // Create or get garage ID
    let garageId = options.garageId;
    if (!garageId) {
      const garage = await this.createGarage();
      garageId = garage.id;
    }

    const spotData: Prisma.SpotCreateInput = {
      number: number.toUpperCase(),
      type,
      status,
      garage: {
        connect: { id: garageId }
      },
      floor,
      section,
      isHandicapAccessible,
      hourlyRate,
      currentVehicleId: options.currentVehicleId
    };

    const spot = await this.databaseService.getClient().spot.create({
      data: spotData
    });

    this.createdEntities.spots.push(spot.id);
    return spot;
  }

  /**
   * Create multiple parking spots
   */
  async createSpots(count: number | CreateSpotOptions[]): Promise<Spot[]> {
    if (typeof count === 'number') {
      const promises = Array.from({ length: count }, () => this.createSpot());
      return Promise.all(promises);
    } else {
      const promises = count.map(options => this.createSpot(options));
      return Promise.all(promises);
    }
  }

  /**
   * Create a parking session with realistic data
   */
  async createParkingSession(options: CreateSessionOptions = {}): Promise<Session> {
    let vehicleId = options.vehicleId;
    let spotId = options.spotId;

    // Create vehicle if not provided
    if (!vehicleId) {
      const vehicle = await this.createVehicle();
      vehicleId = vehicle.id;
    }

    // Create spot if not provided
    if (!spotId) {
      const spot = await this.createSpot();
      spotId = spot.id;
    }

    const checkInTime = options.checkInTime || faker.date.recent({ days: 7 });
    const status = options.status || SessionStatus.ACTIVE;
    const duration = options.duration || (status === SessionStatus.COMPLETED ? 
      faker.number.int({ min: 30, max: 480 }) : null); // 30 minutes to 8 hours
    const checkOutTime = options.checkOutTime || (duration ? 
      new Date(checkInTime.getTime() + duration * 60000) : null);
    const hourlyRate = faker.number.float({ min: 3.0, max: 8.0, fractionDigits: 2 });
    const totalAmount = options.totalAmount || (duration ? 
      Math.ceil(duration / 60) * hourlyRate : null);
    const isPaid = options.isPaid !== undefined ? options.isPaid : 
      (status === SessionStatus.COMPLETED ? faker.datatype.boolean(0.8) : false);
    const paymentMethod = options.paymentMethod || (isPaid ? 
      faker.helpers.arrayElement(['credit_card', 'debit_card', 'cash', 'mobile_pay']) : null);

    const sessionData: Prisma.SessionCreateInput = {
      vehicle: {
        connect: { id: vehicleId }
      },
      spot: {
        connect: { id: spotId }
      },
      status,
      checkInTime,
      checkOutTime,
      duration,
      totalAmount,
      isPaid,
      paymentMethod,
      notes: options.notes
    };

    const session = await this.databaseService.getClient().session.create({
      data: sessionData
    });

    this.createdEntities.sessions.push(session.id);
    return session;
  }

  /**
   * Create multiple parking sessions
   */
  async createParkingSessions(count: number | CreateSessionOptions[]): Promise<Session[]> {
    if (typeof count === 'number') {
      const promises = Array.from({ length: count }, () => this.createParkingSession());
      return Promise.all(promises);
    } else {
      const promises = count.map(options => this.createParkingSession(options));
      return Promise.all(promises);
    }
  }

  /**
   * Create a user with realistic data
   */
  async createUser(options: CreateUserOptions = {}): Promise<User> {
    const email = options.email || faker.internet.email();
    const name = options.name || faker.person.fullName();
    const role = options.role || UserRole.USER;
    const password = options.password || await this.hashPassword('password123');
    const isActive = options.isActive !== undefined ? options.isActive : true;
    const lastLoginAt = options.lastLoginAt || faker.date.recent({ days: 30 });

    const userData: Prisma.UserCreateInput = {
      email: email.toLowerCase(),
      name,
      role,
      password,
      isActive,
      lastLoginAt
    };

    const user = await this.databaseService.getClient().user.create({
      data: userData
    });

    this.createdEntities.users.push(user.id);
    return user;
  }

  /**
   * Create multiple users
   */
  async createUsers(count: number | CreateUserOptions[]): Promise<User[]> {
    if (typeof count === 'number') {
      const promises = Array.from({ length: count }, () => this.createUser());
      return Promise.all(promises);
    } else {
      const promises = count.map(options => this.createUser(options));
      return Promise.all(promises);
    }
  }

  /**
   * Create a garage with realistic data
   */
  async createGarage(options: CreateGarageOptions = {}): Promise<Garage> {
    const name = options.name || `${faker.company.name()} Parking Garage`;
    const address = options.address || faker.location.streetAddress();
    const city = options.city || faker.location.city();
    const state = options.state || faker.location.state({ abbreviated: true });
    const zipCode = options.zipCode || faker.location.zipCode();
    const capacity = options.capacity || faker.number.int({ min: 50, max: 500 });
    const hourlyRate = options.hourlyRate || faker.number.float({ min: 2.0, max: 10.0, fractionDigits: 2 });
    const isActive = options.isActive !== undefined ? options.isActive : true;

    const garageData: Prisma.GarageCreateInput = {
      name,
      address,
      city,
      state,
      zipCode,
      capacity,
      hourlyRate,
      isActive
    };

    const garage = await this.databaseService.getClient().garage.create({
      data: garageData
    });

    this.createdEntities.garages.push(garage.id);
    return garage;
  }

  /**
   * Create a complete parking scenario (garage with spots, vehicles, and active sessions)
   */
  async createParkingScenario(options: {
    garageCapacity?: number;
    occupancyRate?: number;
    activeSessionsCount?: number;
    completedSessionsCount?: number;
  } = {}): Promise<{
    garage: Garage;
    spots: Spot[];
    vehicles: Vehicle[];
    activeSessions: Session[];
    completedSessions: Session[];
  }> {
    const garageCapacity = options.garageCapacity || 100;
    const occupancyRate = options.occupancyRate || 0.7; // 70% occupied
    const activeSessionsCount = options.activeSessionsCount || Math.floor(garageCapacity * occupancyRate);
    const completedSessionsCount = options.completedSessionsCount || faker.number.int({ min: 50, max: 200 });

    // Create garage
    const garage = await this.createGarage({ capacity: garageCapacity });

    // Create spots
    const spotOptions: CreateSpotOptions[] = Array.from({ length: garageCapacity }, (_, i) => ({
      garageId: garage.id,
      number: `${garage.id.slice(0, 1).toUpperCase()}${(i + 1).toString().padStart(3, '0')}`,
      type: i % 10 === 0 ? SpotType.HANDICAP : 
            i % 5 === 0 ? SpotType.COMPACT : SpotType.STANDARD,
      status: i < activeSessionsCount ? SpotStatus.OCCUPIED : SpotStatus.AVAILABLE
    }));
    const spots = await this.createSpots(spotOptions);

    // Create vehicles for active sessions
    const vehicles = await this.createVehicles(activeSessionsCount);

    // Create active sessions
    const activeSessionOptions: CreateSessionOptions[] = vehicles.map((vehicle, i) => ({
      vehicleId: vehicle.id,
      spotId: spots[i].id,
      status: SessionStatus.ACTIVE,
      checkInTime: faker.date.recent({ days: 1 })
    }));
    const activeSessions = await this.createParkingSessions(activeSessionOptions);

    // Create completed sessions
    const completedVehicles = await this.createVehicles(completedSessionsCount);
    const availableSpots = spots.slice(activeSessionsCount);
    const completedSessionOptions: CreateSessionOptions[] = completedVehicles.map((vehicle, i) => ({
      vehicleId: vehicle.id,
      spotId: availableSpots[i % availableSpots.length].id,
      status: SessionStatus.COMPLETED,
      checkInTime: faker.date.past({ days: 30 }),
      isPaid: faker.datatype.boolean(0.9) // 90% paid
    }));
    const completedSessions = await this.createParkingSessions(completedSessionOptions);

    return {
      garage,
      spots,
      vehicles: [...vehicles, ...completedVehicles],
      activeSessions,
      completedSessions
    };
  }

  /**
   * Generate a realistic license plate
   */
  private generateLicensePlate(): string {
    const patterns = [
      () => faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(3),
      () => faker.string.alpha({ length: 2, casing: 'upper' }) + faker.string.numeric(4),
      () => faker.string.numeric(3) + faker.string.alpha({ length: 3, casing: 'upper' }),
      () => faker.string.alpha({ length: 1, casing: 'upper' }) + faker.string.numeric(6)
    ];
    
    return faker.helpers.arrayElement(patterns)();
  }

  /**
   * Generate a realistic spot number
   */
  private generateSpotNumber(): string {
    const section = faker.helpers.arrayElement(['A', 'B', 'C', 'D', 'E', 'P', 'H']);
    const number = faker.number.int({ min: 1, max: 999 }).toString().padStart(3, '0');
    return `${section}${number}`;
  }

  /**
   * Hash password for user creation
   */
  private async hashPassword(password: string): Promise<string> {
    // In a real implementation, this would use bcrypt or similar
    // For testing, we'll use a simple hash
    return `hashed_${password}`;
  }

  /**
   * Create test data for performance testing
   */
  async createPerformanceTestData(options: {
    vehicleCount?: number;
    spotCount?: number;
    sessionCount?: number;
    userCount?: number;
  } = {}): Promise<{
    vehicles: Vehicle[];
    spots: Spot[];
    sessions: Session[];
    users: User[];
  }> {
    const vehicleCount = options.vehicleCount || 1000;
    const spotCount = options.spotCount || 500;
    const sessionCount = options.sessionCount || 2000;
    const userCount = options.userCount || 100;

    console.log(`Creating performance test data: ${vehicleCount} vehicles, ${spotCount} spots, ${sessionCount} sessions, ${userCount} users`);

    // Create in parallel batches for better performance
    const [vehicles, spots, users] = await Promise.all([
      this.createVehicles(vehicleCount),
      this.createSpots(spotCount),
      this.createUsers(userCount)
    ]);

    // Create sessions using existing vehicles and spots
    const sessions = await this.createParkingSessions(
      Array.from({ length: sessionCount }, (_, i) => ({
        vehicleId: vehicles[i % vehicles.length].id,
        spotId: spots[i % spots.length].id,
        status: i % 4 === 0 ? SessionStatus.ACTIVE : SessionStatus.COMPLETED
      }))
    );

    console.log('Performance test data created successfully');

    return { vehicles, spots, sessions, users };
  }

  /**
   * Create realistic test data for edge case testing
   */
  async createEdgeCaseTestData(): Promise<{
    vehicles: Vehicle[];
    spots: Spot[];
    sessions: Session[];
  }> {
    // Create vehicles with edge case data
    const edgeCaseVehicles = await this.createVehicles([
      // Very long license plate (boundary test)
      { licensePlate: 'ABCD1234' },
      // Special characters in owner name
      { ownerName: "O'Connor-Smith Jr.", ownerEmail: 'special.chars+test@domain-name.co.uk' },
      // Old vehicle
      { year: 1990, make: 'Classic', model: 'Vintage' },
      // Future year (should be invalid but test boundary)
      { year: new Date().getFullYear() + 1 },
      // Unicode characters
      { ownerName: 'José García', make: 'Peugeot', model: 'Citroën' },
      // Very long strings
      { 
        make: 'VeryLongManufacturerNameThatExceedsNormalLimits',
        model: 'VeryLongModelNameThatExceedsNormalLimits',
        ownerName: 'VeryLongOwnerNameThatExceedsNormalLimits'
      },
      // Empty optional fields
      { licensePlate: 'EMPTY001', color: null, notes: null }
    ]);

    // Create spots with edge case data
    const edgeCaseSpots = await this.createSpots([
      // Very high floor
      { floor: 50, number: 'P050001' },
      // Very low rate
      { hourlyRate: 0.01 },
      // Very high rate
      { hourlyRate: 99.99 },
      // Handicap accessible
      { type: SpotType.HANDICAP, isHandicapAccessible: true },
      // Special characters in section
      { section: 'A-1', number: 'A1-001' }
    ]);

    // Create sessions with edge case data
    const edgeCaseSessions = await this.createParkingSessions([
      // Very short session (1 minute)
      {
        vehicleId: edgeCaseVehicles[0].id,
        spotId: edgeCaseSpots[0].id,
        status: SessionStatus.COMPLETED,
        duration: 1,
        totalAmount: 0.01
      },
      // Very long session (24 hours)
      {
        vehicleId: edgeCaseVehicles[1].id,
        spotId: edgeCaseSpots[1].id,
        status: SessionStatus.COMPLETED,
        duration: 1440,
        totalAmount: 200.00
      },
      // Session with exact hour duration
      {
        vehicleId: edgeCaseVehicles[2].id,
        spotId: edgeCaseSpots[2].id,
        status: SessionStatus.COMPLETED,
        duration: 60,
        totalAmount: 5.00
      },
      // Unpaid completed session
      {
        vehicleId: edgeCaseVehicles[3].id,
        spotId: edgeCaseSpots[3].id,
        status: SessionStatus.COMPLETED,
        isPaid: false,
        totalAmount: 15.50
      }
    ]);

    return {
      vehicles: edgeCaseVehicles,
      spots: edgeCaseSpots,
      sessions: edgeCaseSessions
    };
  }

  /**
   * Clean up all created test data
   */
  async cleanup(): Promise<void> {
    const client = this.databaseService.getClient();

    // Delete in reverse order of dependencies
    if (this.createdEntities.sessions.length > 0) {
      await client.parkingSession.deleteMany({
        where: { id: { in: this.createdEntities.sessions } }
      });
      this.createdEntities.sessions = [];
    }

    if (this.createdEntities.vehicles.length > 0) {
      await client.vehicle.deleteMany({
        where: { id: { in: this.createdEntities.vehicles } }
      });
      this.createdEntities.vehicles = [];
    }

    if (this.createdEntities.spots.length > 0) {
      await client.parkingSpot.deleteMany({
        where: { id: { in: this.createdEntities.spots } }
      });
      this.createdEntities.spots = [];
    }

    if (this.createdEntities.garages.length > 0) {
      await client.garage.deleteMany({
        where: { id: { in: this.createdEntities.garages } }
      });
      this.createdEntities.garages = [];
    }

    if (this.createdEntities.users.length > 0) {
      await client.user.deleteMany({
        where: { id: { in: this.createdEntities.users } }
      });
      this.createdEntities.users = [];
    }
  }

  /**
   * Get counts of created entities for verification
   */
  getCreatedCounts(): {
    vehicles: number;
    spots: number;
    sessions: number;
    users: number;
    garages: number;
  } {
    return {
      vehicles: this.createdEntities.vehicles.length,
      spots: this.createdEntities.spots.length,
      sessions: this.createdEntities.sessions.length,
      users: this.createdEntities.users.length,
      garages: this.createdEntities.garages.length
    };
  }
}

export default TestDataFactory;
