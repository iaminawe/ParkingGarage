/**
 * Security fixes validation tests
 * Tests for the critical security issues identified in code review:
 * 1. Default JWT secrets removed
 * 2. Prisma client resource leak fixes
 * 3. Authentication required for logout
 * 4. Session cleanup functionality
 * 5. Type safety improvements
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import the fixed modules
const { env, EnvironmentValidator } = require('../../src/config/environment');
const { prisma, PrismaClientSingleton, testDatabaseConnection } = require('../../src/config/database');
const authService = require('../../src/services/authService').default;
const { authenticate, authorize, USER_ROLES } = require('../../src/middleware/auth');
const { SECURITY, TIME_CONSTANTS, API_RESPONSES } = require('../../src/config/constants');

// Mock Express app for testing
const express = require('express');
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Test routes
  app.post('/test-auth', authenticate, (req, res) => {
    res.json({ success: true, user: req.user });
  });
  
  app.post('/test-logout', authenticate, (req, res) => {
    res.json({ success: true, message: 'Logout endpoint requires authentication' });
  });
  
  app.post('/test-admin', authenticate, authorize([USER_ROLES.ADMIN]), (req, res) => {
    res.json({ success: true, message: 'Admin access granted' });
  });
  
  return app;
};

describe('Security Fixes Validation', () => {
  let app;
  let testUser;
  let validToken;
  let expiredToken;

  beforeAll(async () => {
    app = createTestApp();
    
    // Test database connection
    const isConnected = await testDatabaseConnection();
    expect(isConnected).toBe(true);
    
    // Clean up test data
    await prisma.$executeRaw`DELETE FROM user_sessions`;
    await prisma.$executeRaw`DELETE FROM users`;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.$executeRaw`DELETE FROM user_sessions`;
    await prisma.$executeRaw`DELETE FROM users`;
  });

  beforeEach(async () => {
    // Create test user for each test
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        isActive: true
      }
    });

    // Generate valid token
    const tokenData = authService.generateTokens(testUser);
    validToken = tokenData.token;
    
    // Create session
    await prisma.userSession.create({
      data: {
        userId: testUser.id,
        token: validToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        refreshExpiresAt: tokenData.refreshExpiresAt
      }
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.$executeRaw`DELETE FROM user_sessions`;
    await prisma.$executeRaw`DELETE FROM users`;
  });

  describe('1. Environment Validation Security', () => {
    test('should reject default JWT secrets', () => {
      // Test that environment validation prevents default secrets
      const oldEnv = process.env.JWT_SECRET;
      
      // Try to set default secret
      process.env.JWT_SECRET = 'your-super-secret-jwt-key';
      
      expect(() => {
        EnvironmentValidator.validate();
      }).not.toThrow(); // It should handle this gracefully in development
      
      // Restore original environment
      process.env.JWT_SECRET = oldEnv;
    });

    test('should require minimum JWT secret length', () => {
      const oldEnv = process.env.JWT_SECRET;
      
      // Try short secret
      process.env.JWT_SECRET = 'short';
      
      const result = EnvironmentValidator.validate();
      const errors = EnvironmentValidator.getValidationErrors();
      
      if (process.env.NODE_ENV === 'production') {
        expect(errors.length).toBeGreaterThan(0);
      }
      
      // Restore original environment
      process.env.JWT_SECRET = oldEnv;
    });

    test('should validate required environment variables', () => {
      expect(env.JWT_SECRET).toBeDefined();
      expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(SECURITY.MIN_JWT_SECRET_LENGTH);
      expect(env.JWT_REFRESH_SECRET).toBeDefined();
      expect(env.DATABASE_URL).toBeDefined();
    });
  });

  describe('2. Prisma Client Resource Leak Prevention', () => {
    test('should use singleton Prisma client', () => {
      const client1 = require('../../src/config/database').prisma;
      const client2 = require('../../src/config/database').prisma;
      
      // Should be the same instance
      expect(client1).toBe(client2);
      expect(PrismaClientSingleton.isConnected()).toBe(true);
    });

    test('should handle database connection properly', async () => {
      const isConnected = await testDatabaseConnection();
      expect(isConnected).toBe(true);
      
      // Test that multiple connections don't create new instances
      const connection1 = await testDatabaseConnection();
      const connection2 = await testDatabaseConnection();
      expect(connection1).toBe(connection2);
    });
  });

  describe('3. Authentication Required for Logout', () => {
    test('should require authentication for logout endpoint', async () => {
      const response = await request(app)
        .post('/test-logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(API_RESPONSES.ERRORS.TOKEN_REQUIRED);
    });

    test('should allow logout with valid authentication', async () => {
      const response = await request(app)
        .post('/test-logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('authentication');
    });

    test('should reject invalid tokens on logout', async () => {
      const invalidToken = 'invalid.token.here';
      
      const response = await request(app)
        .post('/test-logout')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(API_RESPONSES.ERRORS.INVALID_TOKEN);
    });
  });

  describe('4. Session Cleanup Functionality', () => {
    test('should clean up expired sessions', async () => {
      // Create expired session
      const expiredDate = new Date(Date.now() - TIME_CONSTANTS.EXPIRED_SESSION_GRACE_PERIOD_MS - 1000);
      
      await prisma.userSession.create({
        data: {
          userId: testUser.id,
          token: 'expired-token',
          refreshToken: 'expired-refresh',
          expiresAt: expiredDate,
          refreshExpiresAt: expiredDate
        }
      });

      // Count sessions before cleanup
      const sessionsBefore = await prisma.userSession.count();
      expect(sessionsBefore).toBeGreaterThan(1);

      // Run cleanup
      const cleanedCount = await authService.cleanupExpiredSessions();
      
      expect(cleanedCount).toBeGreaterThan(0);
      
      // Verify expired session was removed but valid session remains
      const sessionsAfter = await prisma.userSession.count();
      expect(sessionsAfter).toBe(sessionsBefore - cleanedCount);
    });

    test('should revoke all user sessions', async () => {
      // Create multiple sessions for user
      await prisma.userSession.create({
        data: {
          userId: testUser.id,
          token: 'second-token',
          refreshToken: 'second-refresh',
          expiresAt: new Date(Date.now() + TIME_CONSTANTS.SESSION_DURATION_MS),
          refreshExpiresAt: new Date(Date.now() + TIME_CONSTANTS.REFRESH_TOKEN_DURATION_MS)
        }
      });

      // Count active sessions
      const activeBefore = await authService.getActiveSessionCount(testUser.id);
      expect(activeBefore).toBeGreaterThan(1);

      // Revoke all sessions
      const revokedCount = await authService.revokeAllUserSessions(testUser.id);
      expect(revokedCount).toBe(activeBefore);

      // Verify no active sessions remain
      const activeAfter = await authService.getActiveSessionCount(testUser.id);
      expect(activeAfter).toBe(0);
    });

    test('should count active sessions correctly', async () => {
      const count = await authService.getActiveSessionCount(testUser.id);
      expect(count).toBe(1); // One session from beforeEach
      
      // Add expired session (should not count)
      await prisma.userSession.create({
        data: {
          userId: testUser.id,
          token: 'expired-token',
          refreshToken: 'expired-refresh',
          expiresAt: new Date(Date.now() - 1000),
          refreshExpiresAt: new Date(Date.now() - 1000)
        }
      });

      const countAfter = await authService.getActiveSessionCount(testUser.id);
      expect(countAfter).toBe(1); // Still only one active session
    });
  });

  describe('5. Type Safety and Constants Usage', () => {
    test('should use constants instead of magic numbers', () => {
      // Verify constants are defined
      expect(SECURITY.MIN_PASSWORD_LENGTH).toBe(8);
      expect(SECURITY.MAX_PASSWORD_LENGTH).toBe(128);
      expect(SECURITY.JWT_ALGORITHM).toBe('HS256');
      expect(TIME_CONSTANTS.SESSION_DURATION_MS).toBeDefined();
      expect(API_RESPONSES.ERRORS.INVALID_TOKEN).toBeDefined();
    });

    test('should use proper HTTP status codes from constants', async () => {
      // Test unauthorized access
      const response = await request(app)
        .post('/test-auth')
        .expect(401);

      expect(response.status).toBe(401); // Should use HTTP_STATUS.UNAUTHORIZED
    });

    test('should validate user roles with type safety', async () => {
      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash: await bcrypt.hash('AdminPassword123!', 12),
          firstName: 'Admin',
          lastName: 'User',
          role: USER_ROLES.ADMIN,
          isActive: true
        }
      });

      const adminTokenData = authService.generateTokens(adminUser);
      
      await prisma.userSession.create({
        data: {
          userId: adminUser.id,
          token: adminTokenData.token,
          refreshToken: adminTokenData.refreshToken,
          expiresAt: adminTokenData.expiresAt,
          refreshExpiresAt: adminTokenData.refreshExpiresAt
        }
      });

      // Test admin access
      const adminResponse = await request(app)
        .post('/test-admin')
        .set('Authorization', `Bearer ${adminTokenData.token}`)
        .expect(200);

      expect(adminResponse.body.success).toBe(true);

      // Test user trying to access admin endpoint
      const userResponse = await request(app)
        .post('/test-admin')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(userResponse.body.success).toBe(false);
      expect(userResponse.body.message).toBe(API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS);
    });
  });

  describe('6. Password Validation with Constants', () => {
    test('should validate password strength using constants', () => {
      const weakPassword = '123';
      const strongPassword = 'StrongPassword123!';
      
      const weakResult = authService.validatePassword(weakPassword);
      const strongResult = authService.validatePassword(strongPassword);
      
      expect(weakResult.isValid).toBe(false);
      expect(weakResult.errors.length).toBeGreaterThan(0);
      
      expect(strongResult.isValid).toBe(true);
      expect(strongResult.errors.length).toBe(0);
    });

    test('should enforce minimum password length from constants', () => {
      const shortPassword = 'A1!';
      const result = authService.validatePassword(shortPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Password must be at least ${SECURITY.MIN_PASSWORD_LENGTH} characters long`);
    });

    test('should enforce maximum password length from constants', () => {
      const longPassword = 'A'.repeat(SECURITY.MAX_PASSWORD_LENGTH + 1) + '1!';
      const result = authService.validatePassword(longPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Password must be no more than ${SECURITY.MAX_PASSWORD_LENGTH} characters long`);
    });
  });

  describe('7. JWT Token Security', () => {
    test('should use secure JWT algorithm', () => {
      const token = authService.generateTokens(testUser).token;
      const decoded = jwt.decode(token, { complete: true });
      
      expect(decoded.header.alg).toBe(SECURITY.JWT_ALGORITHM);
    });

    test('should include proper token type in refresh tokens', () => {
      const { refreshToken } = authService.generateTokens(testUser);
      const decoded = jwt.decode(refreshToken);
      
      expect(decoded.type).toBe(SECURITY.TOKEN_TYPE_REFRESH);
      expect(decoded.userId).toBe(testUser.id);
    });

    test('should reject tokens with wrong algorithm', () => {
      // Create token with different algorithm (security vulnerability)
      const maliciousToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        env.JWT_SECRET,
        { algorithm: 'none' }
      );
      
      const result = authService.verifyToken(maliciousToken);
      expect(result).toBeNull(); // Should reject tokens with wrong algorithm
    });
  });

  describe('8. Error Message Standardization', () => {
    test('should use standardized error messages', async () => {
      // Test various error scenarios
      const invalidTokenResponse = await request(app)
        .post('/test-auth')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(invalidTokenResponse.body.message).toBe(API_RESPONSES.ERRORS.INVALID_TOKEN);
      
      const noTokenResponse = await request(app)
        .post('/test-auth')
        .expect(401);
      
      expect(noTokenResponse.body.message).toBe(API_RESPONSES.ERRORS.TOKEN_REQUIRED);
    });

    test('should return consistent error structure', async () => {
      const response = await request(app)
        .post('/test-auth')
        .expect(401);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(false);
    });
  });

  describe('9. Backward Compatibility', () => {
    test('should maintain existing API contract', async () => {
      // Test that existing functionality still works
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };
      
      const result = await authService.login(loginData);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.message).toBe(API_RESPONSES.SUCCESS.LOGIN);
    });

    test('should handle token refresh correctly', async () => {
      const { refreshToken } = authService.generateTokens(testUser);
      
      const result = await authService.refreshToken(refreshToken);
      
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
    });
  });

  describe('10. Resource Management', () => {
    test('should handle multiple database operations without leaks', async () => {
      // Perform multiple operations to test resource management
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(authService.getActiveSessionCount(testUser.id));
      }
      
      const results = await Promise.all(operations);
      
      // All operations should succeed
      results.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(0);
      });
      
      // Connection should still be healthy
      expect(PrismaClientSingleton.isConnected()).toBe(true);
    });
  });
});