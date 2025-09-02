/**
 * API Test Helpers
 * 
 * Comprehensive utilities for end-to-end API testing including
 * authentication, data setup, cleanup, and test utilities.
 */

import request from 'supertest';
import { Application } from 'express';
import { faker } from '@faker-js/faker';
import { DatabaseService } from '../../src/services/DatabaseService';
import { createLogger } from '../../src/utils/logger';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const logger = createLogger('APITestHelpers');

export interface TestUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'CUSTOMER';
  phoneNumber?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  accessToken?: string;
  refreshToken?: string;
}

export interface TestVehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  color: string;
  vehicleType: 'CAR' | 'TRUCK' | 'MOTORCYCLE' | 'SUV';
  ownerId: string;
}

export interface TestReservation {
  id: string;
  userId: string;
  vehicleId: string;
  spotId: string;
  startTime: Date;
  endTime: Date;
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  totalAmount?: number;
}

export interface TestPayment {
  id: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentMethod: 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'MOBILE_PAY';
  reservationId?: string;
  transactionId?: string;
}

export interface TestTransaction {
  id: string;
  type: 'PAYMENT' | 'REFUND' | 'FEE' | 'PENALTY';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description: string;
  userId: string;
  reservationId?: string;
  paymentId?: string;
}

export interface APITestContext {
  app: Application;
  dbService: DatabaseService;
  testUsers: TestUser[];
  testVehicles: TestVehicle[];
  testReservations: TestReservation[];
  testPayments: TestPayment[];
  testTransactions: TestTransaction[];
  adminToken: string;
  managerToken: string;
  customerToken: string;
}

/**
 * Generate test user data
 */
export function generateTestUser(overrides?: Partial<TestUser>): Omit<TestUser, 'id' | 'accessToken' | 'refreshToken'> {
  const password = 'TestPassword123!';
  
  return {
    email: faker.internet.email().toLowerCase(),
    password,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: 'CUSTOMER',
    phoneNumber: faker.phone.number(),
    isActive: true,
    isEmailVerified: true,
    ...overrides
  };
}

/**
 * Generate test vehicle data
 */
export function generateTestVehicle(ownerId: string, overrides?: Partial<TestVehicle>): Omit<TestVehicle, 'id'> {
  return {
    licensePlate: faker.vehicle.vrm(),
    make: faker.vehicle.manufacturer(),
    model: faker.vehicle.model(),
    color: faker.vehicle.color(),
    vehicleType: faker.helpers.arrayElement(['CAR', 'TRUCK', 'MOTORCYCLE', 'SUV']),
    ownerId,
    ...overrides
  };
}

/**
 * Generate test reservation data
 */
export function generateTestReservation(
  userId: string, 
  vehicleId: string, 
  spotId: string,
  overrides?: Partial<TestReservation>
): Omit<TestReservation, 'id'> {
  const startTime = faker.date.future();
  const endTime = new Date(startTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours later

  return {
    userId,
    vehicleId,
    spotId,
    startTime,
    endTime,
    status: 'PENDING',
    totalAmount: parseFloat(faker.commerce.price({ min: 5, max: 50 })),
    ...overrides
  };
}

/**
 * Generate test payment data
 */
export function generateTestPayment(overrides?: Partial<TestPayment>): Omit<TestPayment, 'id'> {
  return {
    amount: parseFloat(faker.commerce.price({ min: 5, max: 100 })),
    status: 'PENDING',
    paymentMethod: faker.helpers.arrayElement(['CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'MOBILE_PAY']),
    ...overrides
  };
}

/**
 * Generate test transaction data
 */
export function generateTestTransaction(userId: string, overrides?: Partial<TestTransaction>): Omit<TestTransaction, 'id'> {
  return {
    type: faker.helpers.arrayElement(['PAYMENT', 'REFUND', 'FEE', 'PENALTY']),
    amount: parseFloat(faker.commerce.price({ min: 1, max: 100 })),
    status: 'PENDING',
    description: faker.lorem.sentence(),
    userId,
    ...overrides
  };
}

/**
 * Create JWT token for testing
 */
export function createTestToken(user: Partial<TestUser>, expiresIn: string = '24h'): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn }
  );
}

/**
 * Hash password for testing
 */
export async function hashTestPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Setup test database with sample data
 */
export async function setupTestData(dbService: DatabaseService): Promise<{
  users: TestUser[];
  vehicles: TestVehicle[];
  reservations: TestReservation[];
  payments: TestPayment[];
  transactions: TestTransaction[];
}> {
  logger.info('Setting up test data...');

  // Create test users
  const testUsers: TestUser[] = [];
  
  // Admin user
  const adminData = generateTestUser({
    email: 'admin@test.com',
    role: 'ADMIN',
    firstName: 'Admin',
    lastName: 'User'
  });
  const hashedAdminPassword = await hashTestPassword(adminData.password);
  
  // Manager user
  const managerData = generateTestUser({
    email: 'manager@test.com',
    role: 'MANAGER',
    firstName: 'Manager',
    lastName: 'User'
  });
  const hashedManagerPassword = await hashTestPassword(managerData.password);
  
  // Customer users
  const customerUsers = await Promise.all(
    Array.from({ length: 3 }, async () => {
      const userData = generateTestUser();
      const hashedPassword = await hashTestPassword(userData.password);
      return { ...userData, hashedPassword };
    })
  );

  // Insert users into database (this would be database-specific)
  // For now, we'll simulate the IDs
  const adminUser: TestUser = {
    ...adminData,
    id: faker.string.uuid(),
    accessToken: createTestToken({ ...adminData, id: faker.string.uuid() })
  };
  adminUser.accessToken = createTestToken(adminUser);
  adminUser.refreshToken = createTestToken(adminUser, '7d');

  const managerUser: TestUser = {
    ...managerData,
    id: faker.string.uuid(),
    accessToken: createTestToken({ ...managerData, id: faker.string.uuid() })
  };
  managerUser.accessToken = createTestToken(managerUser);
  managerUser.refreshToken = createTestToken(managerUser, '7d');

  const customers: TestUser[] = customerUsers.map(userData => {
    const user: TestUser = {
      ...userData,
      password: userData.password || 'TestPassword123!',
      id: faker.string.uuid()
    };
    user.accessToken = createTestToken(user);
    user.refreshToken = createTestToken(user, '7d');
    return user;
  });

  testUsers.push(adminUser, managerUser, ...customers);

  // Create test vehicles
  const testVehicles: TestVehicle[] = customers.flatMap(user => 
    Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
      ...generateTestVehicle(user.id),
      id: faker.string.uuid()
    }))
  );

  // Create test reservations
  const testReservations: TestReservation[] = testVehicles.slice(0, 5).map(vehicle => ({
    ...generateTestReservation(vehicle.ownerId, vehicle.id, faker.string.uuid()),
    id: faker.string.uuid()
  }));

  // Create test payments
  const testPayments: TestPayment[] = testReservations.map(reservation => ({
    ...generateTestPayment({ reservationId: reservation.id }),
    id: faker.string.uuid()
  }));

  // Create test transactions
  const testTransactions: TestTransaction[] = testPayments.map(payment => ({
    ...generateTestTransaction(
      testReservations.find(r => r.id === payment.reservationId)?.userId || '',
      { paymentId: payment.id }
    ),
    id: faker.string.uuid()
  }));

  logger.info('Test data setup completed', {
    users: testUsers.length,
    vehicles: testVehicles.length,
    reservations: testReservations.length,
    payments: testPayments.length,
    transactions: testTransactions.length
  });

  return {
    users: testUsers,
    vehicles: testVehicles,
    reservations: testReservations,
    payments: testPayments,
    transactions: testTransactions
  };
}

/**
 * Cleanup test data
 */
export async function cleanupTestData(dbService: DatabaseService): Promise<void> {
  logger.info('Cleaning up test data...');
  
  // This would typically clean up database tables
  // For now, we'll just log the cleanup
  logger.info('Test data cleanup completed');
}

/**
 * Create authenticated request with token
 */
export function createAuthenticatedRequest(
  app: Application, 
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  token: string
) {
  return request(app)[method](path)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json');
}

/**
 * Validate API response structure
 */
export interface APIResponseValidation {
  hasSuccessField: boolean;
  hasDataField: boolean;
  hasMessageField: boolean;
  hasTimestampField: boolean;
  statusCodeMatches: boolean;
  expectedStatusCode: number;
  actualStatusCode: number;
}

export function validateAPIResponse(
  response: any,
  expectedStatusCode: number,
  shouldHaveData: boolean = true
): APIResponseValidation {
  const body = response.body;
  
  return {
    hasSuccessField: typeof body.success === 'boolean',
    hasDataField: shouldHaveData ? body.hasOwnProperty('data') : true,
    hasMessageField: body.hasOwnProperty('message'),
    hasTimestampField: body.hasOwnProperty('timestamp'),
    statusCodeMatches: response.status === expectedStatusCode,
    expectedStatusCode,
    actualStatusCode: response.status
  };
}

/**
 * Create batch requests for load testing
 */
export async function createBatchRequests(
  app: Application,
  requests: Array<{
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    data?: any;
    token?: string;
    expectedStatus?: number;
  }>,
  concurrent: boolean = false
): Promise<any[]> {
  const executeRequest = async (req: any) => {
    let testRequest = request(app)[req.method](req.path);
    
    if (req.token) {
      testRequest = testRequest.set('Authorization', `Bearer ${req.token}`);
    }
    
    if (req.data) {
      testRequest = testRequest.send(req.data);
    }
    
    return testRequest;
  };

  if (concurrent) {
    return Promise.all(requests.map(executeRequest));
  } else {
    const results = [];
    for (const req of requests) {
      results.push(await executeRequest(req));
    }
    return results;
  }
}

/**
 * Rate limiting test helper
 */
export async function testRateLimit(
  app: Application,
  path: string,
  method: 'get' | 'post' | 'put' | 'delete' = 'get',
  maxRequests: number = 100,
  windowMs: number = 60000,
  token?: string
): Promise<{
  requestsMade: number;
  firstRateLimitHit: number;
  successfulRequests: number;
  rateLimitedRequests: number;
}> {
  const results = {
    requestsMade: 0,
    firstRateLimitHit: -1,
    successfulRequests: 0,
    rateLimitedRequests: 0
  };

  for (let i = 0; i < maxRequests + 10; i++) {
    let req = request(app)[method](path);
    
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }

    const response = await req;
    results.requestsMade++;

    if (response.status === 429) {
      if (results.firstRateLimitHit === -1) {
        results.firstRateLimitHit = i + 1;
      }
      results.rateLimitedRequests++;
    } else {
      results.successfulRequests++;
    }

    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return results;
}

/**
 * Input validation test helper
 */
export interface ValidationTestCase {
  name: string;
  input: any;
  expectedStatus: number;
  expectedMessage?: string;
}

export async function testInputValidation(
  app: Application,
  method: 'post' | 'put' | 'patch',
  path: string,
  testCases: ValidationTestCase[],
  token?: string
): Promise<Array<{
  testCase: ValidationTestCase;
  passed: boolean;
  actualStatus: number;
  actualMessage?: string;
}>> {
  const results = [];

  for (const testCase of testCases) {
    let req = request(app)[method](path).send(testCase.input);
    
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }

    const response = await req;
    
    results.push({
      testCase,
      passed: response.status === testCase.expectedStatus,
      actualStatus: response.status,
      actualMessage: response.body.message
    });
  }

  return results;
}

/**
 * Security test helper
 */
export async function testSecurityHeaders(
  app: Application,
  path: string = '/health'
): Promise<{
  hasHelmetHeaders: boolean;
  hasCorsHeaders: boolean;
  hasSecurityHeaders: boolean;
  headers: Record<string, string>;
}> {
  const response = await request(app).get(path);
  const headers = response.headers;

  return {
    hasHelmetHeaders: !!(headers['x-content-type-options'] || headers['x-frame-options']),
    hasCorsHeaders: !!(headers['access-control-allow-origin']),
    hasSecurityHeaders: !!(headers['x-powered-by'] === undefined), // Should be hidden by Helmet
    headers: headers
  };
}

/**
 * Performance test helper
 */
export async function measureResponseTime(
  app: Application,
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  iterations: number = 10,
  token?: string,
  data?: any
): Promise<{
  averageTime: number;
  minTime: number;
  maxTime: number;
  times: number[];
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    
    let req = request(app)[method](path);
    
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }
    
    if (data) {
      req = req.send(data);
    }
    
    await req;
    const time = Date.now() - start;
    times.push(time);
  }

  return {
    averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    times
  };
}

/**
 * Create complete API test context
 */
export async function createAPITestContext(
  app: Application,
  dbService: DatabaseService
): Promise<APITestContext> {
  const testData = await setupTestData(dbService);
  
  const adminUser = testData.users.find(u => u.role === 'ADMIN')!;
  const managerUser = testData.users.find(u => u.role === 'MANAGER')!;
  const customerUser = testData.users.find(u => u.role === 'CUSTOMER')!;

  return {
    app,
    dbService,
    testUsers: testData.users,
    testVehicles: testData.vehicles,
    testReservations: testData.reservations,
    testPayments: testData.payments,
    testTransactions: testData.transactions,
    adminToken: adminUser.accessToken!,
    managerToken: managerUser.accessToken!,
    customerToken: customerUser.accessToken!
  };
}

export default {
  generateTestUser,
  generateTestVehicle,
  generateTestReservation,
  generateTestPayment,
  generateTestTransaction,
  createTestToken,
  hashTestPassword,
  setupTestData,
  cleanupTestData,
  createAuthenticatedRequest,
  validateAPIResponse,
  createBatchRequests,
  testRateLimit,
  testInputValidation,
  testSecurityHeaders,
  measureResponseTime,
  createAPITestContext
};