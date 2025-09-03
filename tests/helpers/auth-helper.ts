/**
 * Authentication helper for tests
 * Provides utilities for generating test JWT tokens
 */

import jwt from 'jsonwebtoken';

interface TestUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

/**
 * Generate a JWT token for testing
 */
export function generateTestToken(user: TestUser): string {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    secret,
    {
      expiresIn: '1h',
      issuer: 'parking-garage-api',
    }
  );
}

/**
 * Generate an admin test token
 */
export function generateAdminToken(): string {
  return generateTestToken({
    id: 'admin_test_123',
    email: 'admin@test.com',
    role: 'ADMIN',
    name: 'Test Admin',
  });
}

/**
 * Generate a manager test token
 */
export function generateManagerToken(): string {
  return generateTestToken({
    id: 'manager_test_123',
    email: 'manager@test.com',
    role: 'MANAGER',
    name: 'Test Manager',
  });
}

/**
 * Generate a user test token
 */
export function generateUserToken(): string {
  return generateTestToken({
    id: 'user_test_123',
    email: 'user@test.com',
    role: 'USER',
    name: 'Test User',
  });
}

/**
 * Generate an expired test token
 */
export function generateExpiredToken(): string {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  
  return jwt.sign(
    {
      userId: 'expired_user_123',
      email: 'expired@test.com',
      role: 'USER',
    },
    secret,
    {
      expiresIn: '-1h', // Already expired
      issuer: 'parking-garage-api',
    }
  );
}

/**
 * Decode a test token
 */
export function decodeTestToken(token: string): any {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  return jwt.decode(token);
}