/**
 * Authentication API End-to-End Tests
 * 
 * Comprehensive test suite for all authentication endpoints including:
 * - POST /api/auth/register (signup)
 * - POST /api/auth/login
 * - POST /api/auth/refresh
 * - POST /api/auth/logout
 * - POST /api/auth/forgot-password (password reset)
 * - Additional auth endpoints: profile, change-password, etc.
 */

import request from 'supertest';
import { Application } from 'express';
import { faker } from '@faker-js/faker';
import { 
  createAPITestContext,
  APITestContext,
  generateTestUser,
  validateAPIResponse,
  testRateLimit,
  testInputValidation,
  ValidationTestCase,
  createAuthenticatedRequest
} from '../../helpers/api-test-helpers';
import { createTestApp } from '../../helpers/app-helpers';
import { setupTestDatabase, teardownTestDatabase, TestDatabase } from '../../setup/test-db-setup';
import jwt from 'jsonwebtoken';

describe('Authentication API E2E Tests', () => {
  let app: Application;
  let testDb: TestDatabase;
  let context: APITestContext;

  beforeAll(async () => {
    // Setup test database
    testDb = await setupTestDatabase();
    
    // Create test application
    app = await createTestApp(testDb.getService());
    
    // Create test context
    context = await createAPITestContext(app, testDb.getService());
  });

  afterAll(async () => {
    await teardownTestDatabase(testDb);
  });

  beforeEach(async () => {
    if (testDb) {
      await testDb.reset();
    }
  });

  describe('POST /api/auth/signup (User Registration)', () => {
    const signupEndpoint = '/api/auth/signup';

    describe('Valid Registration Requests', () => {
      it('should register a new user with valid data', async () => {
        const userData = generateTestUser({
          email: 'newuser@test.com',
          password: 'ValidPass123!',
          firstName: 'New',
          lastName: 'User'
        });

        const response = await request(app)
          .post(signupEndpoint)
          .send(userData)
          .expect(201);

        const validation = validateAPIResponse(response, 201);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
        
        // Verify user data
        const user = response.body.data.user;
        expect(user.email).toBe(userData.email.toLowerCase());
        expect(user.firstName).toBe(userData.firstName);
        expect(user.lastName).toBe(userData.lastName);
        expect(user).not.toHaveProperty('password'); // Password should not be returned
      });

      it('should handle different valid roles during registration', async () => {
        const roles = ['CUSTOMER', 'MANAGER'];
        
        for (const role of roles) {
          const userData = generateTestUser({
            email: `${role.toLowerCase()}@test.com`,
            role: role as any,
            password: 'ValidPass123!'
          });

          const response = await request(app)
            .post(signupEndpoint)
            .send(userData)
            .expect(201);

          expect(response.body.data.user.role).toBe(role);
        }
      });

      it('should set default values for optional fields', async () => {
        const userData = {
          email: 'minimal@test.com',
          password: 'ValidPass123!',
          firstName: 'Minimal',
          lastName: 'User'
        };

        const response = await request(app)
          .post(signupEndpoint)
          .send(userData)
          .expect(201);

        const user = response.body.data.user;
        expect(user.role).toBe('CUSTOMER'); // Default role
        expect(user.isActive).toBe(true);
        expect(user.isEmailVerified).toBe(false); // Should be false initially
      });
    });

    describe('Invalid Registration Requests', () => {
      const validationTestCases: ValidationTestCase[] = [
        {
          name: 'missing email',
          input: {
            password: 'ValidPass123!',
            firstName: 'Test',
            lastName: 'User'
          },
          expectedStatus: 400
        },
        {
          name: 'invalid email format',
          input: {
            email: 'invalid-email',
            password: 'ValidPass123!',
            firstName: 'Test',
            lastName: 'User'
          },
          expectedStatus: 400
        },
        {
          name: 'missing password',
          input: {
            email: 'test@test.com',
            firstName: 'Test',
            lastName: 'User'
          },
          expectedStatus: 400
        },
        {
          name: 'weak password (too short)',
          input: {
            email: 'test@test.com',
            password: '123',
            firstName: 'Test',
            lastName: 'User'
          },
          expectedStatus: 400
        },
        {
          name: 'weak password (no numbers)',
          input: {
            email: 'test@test.com',
            password: 'WeakPassword',
            firstName: 'Test',
            lastName: 'User'
          },
          expectedStatus: 400
        },
        {
          name: 'missing firstName',
          input: {
            email: 'test@test.com',
            password: 'ValidPass123!',
            lastName: 'User'
          },
          expectedStatus: 400
        },
        {
          name: 'missing lastName',
          input: {
            email: 'test@test.com',
            password: 'ValidPass123!',
            firstName: 'Test'
          },
          expectedStatus: 400
        },
        {
          name: 'invalid role',
          input: {
            email: 'test@test.com',
            password: 'ValidPass123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'INVALID_ROLE'
          },
          expectedStatus: 400
        }
      ];

      it('should validate input data correctly', async () => {
        const results = await testInputValidation(
          app, 
          'post', 
          signupEndpoint, 
          validationTestCases
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
          expect(result.actualStatus).toBe(result.testCase.expectedStatus);
        });
      });

      it('should prevent duplicate email registration', async () => {
        const userData = generateTestUser({
          email: 'duplicate@test.com',
          password: 'ValidPass123!'
        });

        // First registration should succeed
        await request(app)
          .post(signupEndpoint)
          .send(userData)
          .expect(201);

        // Second registration with same email should fail
        const response = await request(app)
          .post(signupEndpoint)
          .send(userData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('email');
        expect(response.body.message.toLowerCase()).toContain('exists');
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limiting on signup endpoint', async () => {
        const results = await testRateLimit(
          app,
          signupEndpoint,
          'post',
          20, // Should allow reasonable number of signups
          60000 // 1 minute window
        );

        expect(results.firstRateLimitHit).toBeGreaterThan(15);
        expect(results.rateLimitedRequests).toBeGreaterThan(0);
      });
    });
  });

  describe('POST /api/auth/login (User Login)', () => {
    const loginEndpoint = '/api/auth/login';

    describe('Valid Login Requests', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post(loginEndpoint)
          .send({
            email: 'admin@test.com',
            password: 'AdminPass123!'
          })
          .expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');

        // Verify token is valid JWT
        const token = response.body.data.accessToken;
        expect(typeof token).toBe('string');
        
        const decoded = jwt.decode(token) as any;
        expect(decoded).toHaveProperty('email');
        expect(decoded.email).toBe('admin@test.com');
      });

      it('should login different user roles', async () => {
        const testLogins = [
          { email: 'admin@test.com', password: 'AdminPass123!', expectedRole: 'ADMIN' },
          { email: 'manager@test.com', password: 'ManagerPass123!', expectedRole: 'MANAGER' },
          { email: 'customer1@test.com', password: 'CustomerPass123!', expectedRole: 'CUSTOMER' }
        ];

        for (const login of testLogins) {
          const response = await request(app)
            .post(loginEndpoint)
            .send({
              email: login.email,
              password: login.password
            })
            .expect(200);

          expect(response.body.data.user.role).toBe(login.expectedRole);
        }
      });

      it('should handle case-insensitive email login', async () => {
        const response = await request(app)
          .post(loginEndpoint)
          .send({
            email: 'ADMIN@TEST.COM', // Uppercase
            password: 'AdminPass123!'
          })
          .expect(200);

        expect(response.body.data.user.email).toBe('admin@test.com');
      });
    });

    describe('Invalid Login Requests', () => {
      const loginValidationCases: ValidationTestCase[] = [
        {
          name: 'missing email',
          input: { password: 'password' },
          expectedStatus: 400
        },
        {
          name: 'missing password',
          input: { email: 'test@test.com' },
          expectedStatus: 400
        },
        {
          name: 'invalid email format',
          input: { email: 'invalid-email', password: 'password' },
          expectedStatus: 400
        },
        {
          name: 'empty email',
          input: { email: '', password: 'password' },
          expectedStatus: 400
        },
        {
          name: 'empty password',
          input: { email: 'test@test.com', password: '' },
          expectedStatus: 400
        }
      ];

      it('should validate login input data', async () => {
        const results = await testInputValidation(
          app,
          'post',
          loginEndpoint,
          loginValidationCases
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });

      it('should reject invalid credentials', async () => {
        const invalidCredentials = [
          { email: 'admin@test.com', password: 'WrongPassword' },
          { email: 'nonexistent@test.com', password: 'AdminPass123!' },
          { email: 'admin@test.com', password: '' }
        ];

        for (const creds of invalidCredentials) {
          const response = await request(app)
            .post(loginEndpoint)
            .send(creds)
            .expect(401);

          expect(response.body.success).toBe(false);
          expect(response.body.message).toContain('Invalid');
        }
      });

      it('should handle inactive user login attempt', async () => {
        // This test assumes we can deactivate a user
        // In a real scenario, you'd deactivate a test user first
        const response = await request(app)
          .post(loginEndpoint)
          .send({
            email: 'inactive@test.com',
            password: 'password'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Security Features', () => {
      it('should enforce rate limiting on login attempts', async () => {
        const results = await testRateLimit(
          app,
          loginEndpoint,
          'post',
          25, // Should allow reasonable number of login attempts
          60000
        );

        expect(results.firstRateLimitHit).toBeGreaterThan(20);
        expect(results.rateLimitedRequests).toBeGreaterThan(0);
      });

      it('should not reveal whether email exists in error messages', async () => {
        const responses = await Promise.all([
          request(app)
            .post(loginEndpoint)
            .send({ email: 'nonexistent@test.com', password: 'password' }),
          request(app)
            .post(loginEndpoint)
            .send({ email: 'admin@test.com', password: 'wrongpassword' })
        ]);

        // Both should return similar error messages
        responses.forEach(response => {
          expect(response.status).toBe(401);
          expect(response.body.message).toContain('Invalid');
          expect(response.body.message).not.toContain('email');
          expect(response.body.message).not.toContain('password');
        });
      });
    });
  });

  describe('POST /api/auth/refresh (Token Refresh)', () => {
    const refreshEndpoint = '/api/auth/refresh';
    let validRefreshToken: string;

    beforeEach(async () => {
      // Get a valid refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'AdminPass123!'
        })
        .expect(200);

      validRefreshToken = loginResponse.body.data.refreshToken;
    });

    describe('Valid Token Refresh', () => {
      it('should refresh token with valid refresh token', async () => {
        const response = await request(app)
          .post(refreshEndpoint)
          .send({ refreshToken: validRefreshToken })
          .expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
        
        // New tokens should be different from original
        expect(response.body.data.refreshToken).not.toBe(validRefreshToken);
      });

      it('should return user data with new tokens', async () => {
        const response = await request(app)
          .post(refreshEndpoint)
          .send({ refreshToken: validRefreshToken })
          .expect(200);

        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user.email).toBe('admin@test.com');
        expect(response.body.data.user.role).toBe('ADMIN');
      });
    });

    describe('Invalid Token Refresh', () => {
      const refreshValidationCases: ValidationTestCase[] = [
        {
          name: 'missing refresh token',
          input: {},
          expectedStatus: 400
        },
        {
          name: 'empty refresh token',
          input: { refreshToken: '' },
          expectedStatus: 400
        },
        {
          name: 'invalid token format',
          input: { refreshToken: 'invalid-token' },
          expectedStatus: 401
        },
        {
          name: 'expired token',
          input: { refreshToken: 'expired.token.here' },
          expectedStatus: 401
        }
      ];

      it('should validate refresh token input', async () => {
        const results = await testInputValidation(
          app,
          'post',
          refreshEndpoint,
          refreshValidationCases
        );

        results.forEach(result => {
          if (result.testCase.name === 'missing refresh token' || result.testCase.name === 'empty refresh token') {
            expect(result.passed).toBe(true);
          }
          // For invalid tokens, we expect 401 instead of 400
          if (result.testCase.name === 'invalid token format' || result.testCase.name === 'expired token') {
            expect(result.actualStatus).toBe(401);
          }
        });
      });
    });
  });

  describe('POST /api/auth/logout (User Logout)', () => {
    const logoutEndpoint = '/api/auth/logout';
    let userToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer1@test.com',
          password: 'CustomerPass123!'
        })
        .expect(200);

      userToken = loginResponse.body.data.accessToken;
    });

    describe('Valid Logout Requests', () => {
      it('should logout authenticated user', async () => {
        const response = await createAuthenticatedRequest(app, 'post', logoutEndpoint, userToken)
          .expect(200);

        const validation = validateAPIResponse(response, 200, false);
        expect(validation.hasSuccessField).toBe(true);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('logged out');
      });

      it('should invalidate token after logout', async () => {
        // First logout
        await createAuthenticatedRequest(app, 'post', logoutEndpoint, userToken)
          .expect(200);

        // Try to use the same token again
        const response = await createAuthenticatedRequest(app, 'get', '/api/auth/profile', userToken)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('token');
      });
    });

    describe('Unauthorized Logout Attempts', () => {
      it('should require authentication for logout', async () => {
        const response = await request(app)
          .post(logoutEndpoint)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should reject invalid tokens', async () => {
        const response = await request(app)
          .post(logoutEndpoint)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('POST /api/auth/forgot-password (Password Reset)', () => {
    const forgotPasswordEndpoint = '/api/auth/password-reset';

    describe('Valid Password Reset Requests', () => {
      it('should accept valid email for password reset', async () => {
        const response = await request(app)
          .post(forgotPasswordEndpoint)
          .send({ email: 'customer1@test.com' })
          .expect(200);

        const validation = validateAPIResponse(response, 200, false);
        expect(validation.hasSuccessField).toBe(true);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('reset');
      });

      it('should handle case-insensitive email', async () => {
        const response = await request(app)
          .post(forgotPasswordEndpoint)
          .send({ email: 'CUSTOMER1@TEST.COM' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should not reveal if email exists (security)', async () => {
        // Both existing and non-existing emails should return same response
        const [existingResponse, nonExistingResponse] = await Promise.all([
          request(app)
            .post(forgotPasswordEndpoint)
            .send({ email: 'customer1@test.com' }),
          request(app)
            .post(forgotPasswordEndpoint)
            .send({ email: 'nonexistent@test.com' })
        ]);

        expect(existingResponse.status).toBe(200);
        expect(nonExistingResponse.status).toBe(200);
        expect(existingResponse.body.message).toBe(nonExistingResponse.body.message);
      });
    });

    describe('Invalid Password Reset Requests', () => {
      const passwordResetValidationCases: ValidationTestCase[] = [
        {
          name: 'missing email',
          input: {},
          expectedStatus: 400
        },
        {
          name: 'empty email',
          input: { email: '' },
          expectedStatus: 400
        },
        {
          name: 'invalid email format',
          input: { email: 'invalid-email' },
          expectedStatus: 400
        }
      ];

      it('should validate password reset input', async () => {
        const results = await testInputValidation(
          app,
          'post',
          forgotPasswordEndpoint,
          passwordResetValidationCases
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce strict rate limiting on password reset', async () => {
        const results = await testRateLimit(
          app,
          forgotPasswordEndpoint,
          'post',
          10, // Very low limit for security
          60000
        );

        expect(results.firstRateLimitHit).toBeLessThan(10);
        expect(results.rateLimitedRequests).toBeGreaterThan(0);
      });
    });
  });

  describe('Additional Auth Endpoints', () => {
    let userToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer1@test.com',
          password: 'CustomerPass123!'
        })
        .expect(200);

      userToken = loginResponse.body.data.accessToken;
    });

    describe('GET /api/auth/profile', () => {
      it('should return user profile for authenticated user', async () => {
        const response = await createAuthenticatedRequest(app, 'get', '/api/auth/profile', userToken)
          .expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        expect(response.body.data.user).toHaveProperty('email');
        expect(response.body.data.user).toHaveProperty('firstName');
        expect(response.body.data.user).toHaveProperty('lastName');
        expect(response.body.data.user).toHaveProperty('role');
        expect(response.body.data.user).not.toHaveProperty('password');
      });

      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/auth/change-password', () => {
      it('should change password with valid current password', async () => {
        const response = await createAuthenticatedRequest(app, 'put', '/api/auth/change-password', userToken)
          .send({
            currentPassword: 'CustomerPass123!',
            newPassword: 'NewPassword123!'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('changed');
      });

      it('should validate password change input', async () => {
        const validationCases: ValidationTestCase[] = [
          {
            name: 'missing current password',
            input: { newPassword: 'NewPassword123!' },
            expectedStatus: 400
          },
          {
            name: 'missing new password',
            input: { currentPassword: 'CustomerPass123!' },
            expectedStatus: 400
          },
          {
            name: 'weak new password',
            input: { currentPassword: 'CustomerPass123!', newPassword: '123' },
            expectedStatus: 400
          }
        ];

        const results = await testInputValidation(
          app,
          'put',
          '/api/auth/change-password',
          validationCases,
          userToken
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });
    });

    describe('GET /api/auth/verify', () => {
      it('should verify valid token', async () => {
        const response = await createAuthenticatedRequest(app, 'get', '/api/auth/verify', userToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.authenticated).toBe(true);
        expect(response.body.data.user).toHaveProperty('email');
      });

      it('should reject invalid token', async () => {
        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Security and Error Handling', () => {
    it('should set security headers on auth endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'AdminPass123!'
        });

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .type('json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Error message should not reveal internal details
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('sql');
      expect(response.body.message).not.toContain('error');
    });
  });
});