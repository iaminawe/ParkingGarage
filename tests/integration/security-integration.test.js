/**
 * Security Integration Tests
 * End-to-end validation that all security fixes work together
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

// Import the actual app
const app = require('../../src/app');

// Import test utilities
const { prisma } = require('../../src/config/database');
const { env } = require('../../src/config/environment');

describe('Security Integration Tests', () => {
  let testUser;
  let authToken;
  let refreshToken;

  beforeAll(async () => {
    // Clean up test data
    await prisma.$executeRaw`DELETE FROM user_sessions`;
    await prisma.$executeRaw`DELETE FROM users`;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.$executeRaw`DELETE FROM user_sessions`;
    await prisma.$executeRaw`DELETE FROM users`;
  });

  describe('Complete Authentication Flow', () => {
    test('should complete full signup -> login -> authenticated request -> logout flow', async () => {
      // 1. Signup
      const signupData = {
        email: 'integration-test@example.com',
        password: 'StrongPassword123!',
        firstName: 'Integration',
        lastName: 'Test'
      };

      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      expect(signupResponse.body.success).toBe(true);
      expect(signupResponse.body.user).toBeDefined();
      expect(signupResponse.body.token).toBeDefined();
      expect(signupResponse.body.refreshToken).toBeDefined();

      testUser = signupResponse.body.user;
      authToken = signupResponse.body.token;
      refreshToken = signupResponse.body.refreshToken;

      // 2. Login (verify credentials work)
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: signupData.email,
          password: signupData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      authToken = loginResponse.body.token; // Use login token for subsequent requests

      // 3. Access authenticated endpoint
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.email).toBe(signupData.email);

      // 4. Logout (requires authentication now)
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // 5. Verify token is invalidated after logout
      const profileAfterLogoutResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(profileAfterLogoutResponse.body.success).toBe(false);
    });

    test('should handle token refresh properly', async () => {
      // First create a user and login
      const userData = {
        email: 'refresh-test@example.com',
        password: 'RefreshPassword123!',
        firstName: 'Refresh',
        lastName: 'Test'
      };

      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const { refreshToken } = loginResponse.body;

      // Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.token).toBeDefined();
      expect(refreshResponse.body.refreshToken).toBeDefined();
      expect(refreshResponse.body.user).toBeDefined();

      // Verify new token works
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
    });
  });

  describe('Security Validations', () => {
    test('should require authentication for logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token required');
    });

    test('should validate password strength', async () => {
      const weakPasswordData = {
        email: 'weak-password@example.com',
        password: '123',
        firstName: 'Weak',
        lastName: 'Password'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(weakPasswordData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should prevent duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'DuplicatePassword123!',
        firstName: 'Duplicate',
        lastName: 'Test'
      };

      // First signup should succeed
      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Second signup with same email should fail
      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    test('should handle invalid credentials properly', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    test('should reject invalid tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    test('should handle malformed authorization headers', async () => {
      // Missing Bearer prefix
      const response1 = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'not-bearer-token')
        .expect(401);

      expect(response1.body.success).toBe(false);

      // Empty authorization header
      const response2 = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', '')
        .expect(401);

      expect(response2.body.success).toBe(false);

      // Only Bearer prefix
      const response3 = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response3.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits on auth endpoints', async () => {
      const failingCredentials = {
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!'
      };

      // Make multiple failed login attempts
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send(failingCredentials)
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Environment Security', () => {
    test('should have secure JWT configuration', () => {
      expect(env.JWT_SECRET).toBeDefined();
      expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
      expect(env.JWT_REFRESH_SECRET).toBeDefined();
      expect(env.JWT_REFRESH_SECRET.length).toBeGreaterThanOrEqual(32);
      
      // Should not be default values
      expect(env.JWT_SECRET).not.toContain('your-super-secret');
      expect(env.JWT_REFRESH_SECRET).not.toContain('your-super-secret');
    });

    test('should have proper bcrypt configuration', () => {
      expect(env.BCRYPT_SALT_ROUNDS).toBeGreaterThanOrEqual(10);
      expect(env.BCRYPT_SALT_ROUNDS).toBeLessThanOrEqual(15);
    });
  });

  describe('Database Connection Management', () => {
    test('should handle concurrent requests without connection issues', async () => {
      // Create user for testing
      const userData = {
        email: 'concurrent-test@example.com',
        password: 'ConcurrentPassword123!',
        firstName: 'Concurrent',
        lastName: 'Test'
      };

      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      const token = signupResponse.body.token;

      // Make multiple concurrent authenticated requests
      const concurrentRequests = [];
      for (let i = 0; i < 10; i++) {
        concurrentRequests.push(
          request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${token}`)
        );
      }

      const responses = await Promise.all(concurrentRequests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('API Response Consistency', () => {
    test('should return consistent response structure', async () => {
      // Test successful response
      const signupData = {
        email: 'consistent-test@example.com',
        password: 'ConsistentPassword123!',
        firstName: 'Consistent',
        lastName: 'Test'
      };

      const successResponse = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      expect(successResponse.body).toHaveProperty('success');
      expect(successResponse.body).toHaveProperty('message');
      expect(successResponse.body.success).toBe(true);

      // Test error response
      const errorResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(errorResponse.body).toHaveProperty('success');
      expect(errorResponse.body).toHaveProperty('message');
      expect(errorResponse.body.success).toBe(false);
    });
  });
});