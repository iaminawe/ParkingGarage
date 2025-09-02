/**
 * Authentication helpers for testing
 * 
 * Provides utilities for creating test users, generating JWT tokens,
 * and setting up authentication for tests.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../../src/services/DatabaseService';
import { User, Prisma } from '@prisma/client';
import { USER_ROLES } from '../../src/config/constants';
import { faker } from '@faker-js/faker';

export interface TestUserOptions {
  email?: string;
  name?: string;
  role?: UserRole;
  password?: string;
  isActive?: boolean;
}

/**
 * Create a test user with hashed password
 */
export async function createTestUser(
  databaseService: DatabaseService,
  options: TestUserOptions = {}
): Promise<User> {
  const email = options.email || faker.internet.email().toLowerCase();
  const name = options.name || faker.person.fullName();
  const role = options.role || UserRole.USER;
  const plainPassword = options.password || 'test123456';
  const isActive = options.isActive !== undefined ? options.isActive : true;

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

  const userData: Prisma.UserCreateInput = {
    email,
    passwordHash: hashedPassword,
    role,
    isActive,
    isEmailVerified: true,
    lastLoginAt: faker.date.recent({ days: 1 })
  };

  const user = await databaseService.getClient().user.create({
    data: userData
  });

  // Add plaintext password for testing purposes
  (user as any).plainPassword = plainPassword;
  return user;
}

/**
 * Generate a JWT token for a user
 */
export function generateAuthToken(user: User, options: {
  expiresIn?: string;
  secret?: string;
} = {}): string {
  const secret = options.secret || process.env.JWT_SECRET || 'test-secret-key';
  const expiresIn = options.expiresIn || '24h';

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  const secretKey = secret || 'test-secret';
  return jwt.sign(payload, secretKey, { expiresIn: expiresIn || '1h' });
}

/**
 * Generate an expired JWT token for testing
 */
export function generateExpiredToken(user: User): string {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
  };

  return jwt.sign(payload, secret, { noTimestamp: true });
}

/**
 * Generate an invalid JWT token for testing
 */
export function generateInvalidToken(): string {
  return 'invalid.jwt.token';
}

/**
 * Generate a token with tampered payload
 */
export function generateTamperedToken(user: User): string {
  // Create a valid token first
  const validToken = generateAuthToken(user);
  
  // Tamper with the payload (change user ID)
  const parts = validToken.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  payload.id = 'tampered-user-id';
  payload.role = UserRole.ADMIN; // Privilege escalation attempt
  
  // Re-encode the tampered payload
  const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
  
  return `${parts[0]}.${tamperedPayload}.${parts[2]}`;
}

/**
 * Create multiple test users with different roles
 */
export async function createTestUsers(
  databaseService: DatabaseService,
  count: number = 3
): Promise<{
  admin: User;
  manager: User;
  user: User;
  users: User[];
}> {
  const admin = await createTestUser(databaseService, {
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    name: 'Test Admin'
  });

  const manager = await createTestUser(databaseService, {
    email: 'manager@test.com',
    role: UserRole.MANAGER,
    name: 'Test Manager'
  });

  const user = await createTestUser(databaseService, {
    email: 'user@test.com',
    role: UserRole.USER,
    name: 'Test User'
  });

  // Create additional regular users
  const additionalUsers = await Promise.all(
    Array.from({ length: Math.max(0, count - 3) }, (_, i) => 
      createTestUser(databaseService, {
        email: `user${i + 1}@test.com`,
        name: `Test User ${i + 1}`
      })
    )
  );

  return {
    admin,
    manager,
    user,
    users: [admin, manager, user, ...additionalUsers]
  };
}

/**
 * Create authentication headers for requests
 */
export function createAuthHeaders(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`
  };
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyAuthToken(token: string, secret?: string): any {
  const jwtSecret = secret || process.env.JWT_SECRET || 'test-secret-key';
  
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Create a user session for testing (simulates login)
 */
export async function createUserSession(
  databaseService: DatabaseService,
  userOptions: TestUserOptions = {}
): Promise<{
  user: User;
  token: string;
  headers: { Authorization: string };
}> {
  const user = await createTestUser(databaseService, userOptions);
  const token = generateAuthToken(user);
  const headers = createAuthHeaders(token);

  // Update last login time
  await databaseService.getClient().user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return { user, token, headers };
}

/**
 * Create multiple user sessions with different roles
 */
export async function createUserSessions(
  databaseService: DatabaseService
): Promise<{
  admin: { user: User; token: string; headers: { Authorization: string } };
  manager: { user: User; token: string; headers: { Authorization: string } };
  user: { user: User; token: string; headers: { Authorization: string } };
}> {
  const [adminSession, managerSession, userSession] = await Promise.all([
    createUserSession(databaseService, { role: UserRole.ADMIN }),
    createUserSession(databaseService, { role: UserRole.MANAGER }),
    createUserSession(databaseService, { role: UserRole.USER })
  ]);

  return {
    admin: adminSession,
    manager: managerSession,
    user: userSession
  };
}

/**
 * Mock authentication middleware bypass for testing
 */
export function mockAuthBypass(user: User) {
  return (req: any, res: any, next: any) => {
    req.user = user;
    req.token = generateAuthToken(user);
    next();
  };
}

/**
 * Create a test API key for service-to-service authentication
 */
export function generateApiKey(service: string = 'test-service'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `${service}_${timestamp}_${random}`;
}

/**
 * Generate refresh token for testing
 */
export function generateRefreshToken(user: User): string {
  const secret = process.env.REFRESH_SECRET || 'test-refresh-secret';
  
  const payload = {
    id: user.id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, secret, { expiresIn: '30d' });
}

/**
 * Simulate password reset token
 */
export function generatePasswordResetToken(user: User): string {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  
  const payload = {
    id: user.id,
    type: 'password_reset',
    email: user.email,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

/**
 * Simulate email verification token
 */
export function generateEmailVerificationToken(user: User): string {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  
  const payload = {
    id: user.id,
    type: 'email_verification',
    email: user.email,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

/**
 * Clean up test authentication data
 */
export async function cleanupAuthData(
  databaseService: DatabaseService,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return;

  // Delete users and cascade related data
  await databaseService.getClient().user.deleteMany({
    where: {
      id: { in: userIds }
    }
  });
}

/**
 * Validate password strength for testing
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Hash password for testing (matches production hashing)
 */
export async function hashPassword(password: string, rounds: number = 10): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/**
 * Compare password for testing
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate test credentials with various security levels
 */
export function generateTestCredentials(): {
  weak: { email: string; password: string };
  medium: { email: string; password: string };
  strong: { email: string; password: string };
} {
  return {
    weak: {
      email: 'weak@test.com',
      password: '123456'
    },
    medium: {
      email: 'medium@test.com',
      password: 'Password123'
    },
    strong: {
      email: 'strong@test.com',
      password: 'P@ssw0rd!2023$ecur3'
    }
  };
}

export default {
  createTestUser,
  generateAuthToken,
  generateExpiredToken,
  generateInvalidToken,
  generateTamperedToken,
  createTestUsers,
  createAuthHeaders,
  verifyAuthToken,
  createUserSession,
  createUserSessions,
  mockAuthBypass,
  generateApiKey,
  generateRefreshToken,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  cleanupAuthData,
  validatePasswordStrength,
  hashPassword,
  comparePassword,
  generateTestCredentials
};
