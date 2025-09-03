import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';

export interface MockRequest extends Partial<Request> {
  body: any;
  params: any;
  query: any;
  headers: any;
  user?: any;
  token?: string;
  ip: string;
  get: jest.MockedFunction<any>;
}

export interface MockResponse extends Partial<Response> {
  status: jest.MockedFunction<any>;
  json: jest.MockedFunction<any>;
  send: jest.MockedFunction<any>;
  cookie: jest.MockedFunction<any>;
  clearCookie: jest.MockedFunction<any>;
}

/**
 * Create a mock Express request object
 */
export const createMockRequest = (overrides: Partial<MockRequest> = {}): MockRequest => {
  const mockGet = jest.fn((header: string) => {
    const headers = overrides.headers || {};
    return headers[header.toLowerCase()] || null;
  });

  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: faker.internet.ip(),
    get: mockGet,
    ...overrides,
  };
};

/**
 * Create a mock Express response object
 */
export const createMockResponse = (): MockResponse => {
  const mockStatus = jest.fn().mockReturnThis();
  const mockJson = jest.fn().mockReturnThis();
  const mockSend = jest.fn().mockReturnThis();
  const mockCookie = jest.fn().mockReturnThis();
  const mockClearCookie = jest.fn().mockReturnThis();

  return {
    status: mockStatus,
    json: mockJson,
    send: mockSend,
    cookie: mockCookie,
    clearCookie: mockClearCookie,
  };
};

/**
 * Create a test user object
 */
export const createTestUser = (overrides: any = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  role: 'USER',
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  passwordHash: faker.internet.password(),
  loginAttempts: 0,
  lockoutUntil: null,
  emailVerificationToken: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  ...overrides,
});

/**
 * Create a test garage object
 */
export const createTestGarage = (overrides: any = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name() + ' Garage',
  address: faker.location.streetAddress(),
  totalSpots: faker.number.int({ min: 50, max: 500 }),
  availableSpots: faker.number.int({ min: 0, max: 50 }),
  hourlyRate: faker.number.float({ min: 2.0, max: 10.0 }),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a test parking spot object
 */
export const createTestSpot = (garageId: string, overrides: any = {}) => ({
  id: faker.string.uuid(),
  garageId,
  spotNumber: faker.number.int({ min: 1, max: 999 }),
  level: faker.number.int({ min: 1, max: 5 }),
  isOccupied: false,
  isReserved: false,
  vehicleType: 'STANDARD',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a test vehicle object
 */
export const createTestVehicle = (userId: string, overrides: any = {}) => ({
  id: faker.string.uuid(),
  userId,
  licensePlate: faker.vehicle.vrm(),
  make: faker.vehicle.manufacturer(),
  model: faker.vehicle.model(),
  color: faker.vehicle.color(),
  vehicleType: 'STANDARD',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a test parking session object
 */
export const createTestSession = (userId: string, spotId: string, vehicleId: string, overrides: any = {}) => ({
  id: faker.string.uuid(),
  userId,
  spotId,
  vehicleId,
  checkinTime: new Date(),
  checkoutTime: null,
  totalAmount: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Generate a test JWT token
 */
export const createTestToken = (userId: string, role = 'USER') => {
  return jwt.sign(
    { 
      id: userId,
      userId, 
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    },
    process.env.JWT_SECRET || 'test-secret',
  );
};

/**
 * Create an authenticated mock request
 */
export const createAuthenticatedRequest = (user: any, overrides: Partial<MockRequest> = {}): MockRequest => {
  const token = createTestToken(user.id, user.role);
  return createMockRequest({
    user,
    token,
    headers: {
      authorization: `Bearer ${token}`,
      ...overrides.headers,
    },
    ...overrides,
  });
};

/**
 * Wait for a specified amount of time (useful for testing timing)
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Clean up test database
 */
export const cleanupTestDatabase = async (prisma: PrismaClient) => {
  try {
    await prisma.$executeRaw`DELETE FROM Vehicle WHERE 1=1`;
    await prisma.$executeRaw`DELETE FROM ParkingSession WHERE 1=1`;
    await prisma.$executeRaw`DELETE FROM ParkingSpot WHERE 1=1`;
    await prisma.$executeRaw`DELETE FROM Garage WHERE 1=1`;
    await prisma.$executeRaw`DELETE FROM User WHERE 1=1`;
  } catch (error) {
    console.warn('Could not clean test database:', error);
  }
};

/**
 * Seed test database with basic data
 */
export const seedTestDatabase = async (prisma: PrismaClient) => {
  // Create a test user
  const testUser = await prisma.user.create({
    data: createTestUser({ 
      email: 'test@example.com',
      role: 'USER'
    })
  });

  // Create an admin user
  const adminUser = await prisma.user.create({
    data: createTestUser({ 
      email: 'admin@example.com',
      role: 'ADMIN'
    })
  });

  // Create a test garage
  const testGarage = await prisma.garage.create({
    data: createTestGarage()
  });

  // Create some parking spots
  const spots = await Promise.all([
    prisma.parkingSpot.create({ data: createTestSpot(testGarage.id, { spotNumber: 1 }) }),
    prisma.parkingSpot.create({ data: createTestSpot(testGarage.id, { spotNumber: 2 }) }),
    prisma.parkingSpot.create({ data: createTestSpot(testGarage.id, { spotNumber: 3, isOccupied: true }) })
  ]);

  // Create a test vehicle
  const testVehicle = await prisma.vehicle.create({
    data: createTestVehicle(testUser.id)
  });

  return {
    testUser,
    adminUser,
    testGarage,
    spots,
    testVehicle
  };
};

/**
 * Mock console methods to avoid noise in test output
 */
export const mockConsole = () => {
  const originalError = console.error;
  const originalLog = console.log;
  const originalWarn = console.warn;
  
  beforeEach(() => {
    console.error = jest.fn();
    console.log = jest.fn();
    console.warn = jest.fn();
  });
  
  afterEach(() => {
    console.error = originalError;
    console.log = originalLog;
    console.warn = originalWarn;
  });
};

/**
 * Assert response structure for API endpoints
 */
export const expectSuccessResponse = (response: any, expectedData?: any) => {
  expect(response.json).toHaveBeenCalledWith(
    expect.objectContaining({
      success: true,
      message: expect.any(String),
      ...(expectedData && { data: expect.objectContaining(expectedData) })
    })
  );
};

export const expectErrorResponse = (response: any, statusCode: number, message?: string) => {
  expect(response.status).toHaveBeenCalledWith(statusCode);
  expect(response.json).toHaveBeenCalledWith(
    expect.objectContaining({
      success: false,
      message: message ? expect.stringContaining(message) : expect.any(String)
    })
  );
};