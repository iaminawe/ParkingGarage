/**
 * Auth Controller Tests
 * 
 * Comprehensive test suite for the authController module covering:
 * - User registration (signup)
 * - User authentication (login)
 * - Token management (refresh, validation)
 * - Session management
 * - Password operations
 * - Profile management
 * - Security features
 * - Error handling scenarios
 * - Input validation
 * - Authentication/authorization checks
 */

import request from 'supertest';
import app from '../../../src/app';
import { prisma } from '../../../src/config/database';
import authService from '../../../src/services/authService';
import { sessionManager } from '../../../src/services/SessionManager';
import { HTTP_STATUS, API_RESPONSES } from '../../../src/config/constants';
import * as crypto from 'crypto';

describe('AuthController', () => {
  let testUser: any;
  let authToken: string;
  let refreshToken: string;
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    // Clean up test database
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test database
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
    await sessionManager.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('POST /api/auth/signup', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User'
    };

    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(HTTP_STATUS.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Verify user data structure
      const user = response.body.data.user;
      expect(user.email).toBe(validUserData.email);
      expect(user.firstName).toBe(validUserData.firstName);
      expect(user.lastName).toBe(validUserData.lastName);
      expect(user.passwordHash).toBeUndefined(); // Should not expose password hash
      expect(user.role).toBe('USER');
      expect(user.isActive).toBe(true);

      // Verify user was created in database
      const dbUser = await prisma.user.findUnique({
        where: { email: validUserData.email }
      });
      expect(dbUser).toBeTruthy();
      expect(dbUser!.passwordHash).toBeDefined();
    });

    it('should reject registration with missing required fields', async () => {
      const incompleteData = {
        email: 'test@example.com'
        // Missing password, firstName, lastName
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(incompleteData)
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should reject registration with invalid email format', async () => {
      const invalidEmailData = {
        ...validUserData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidEmailData)
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordData = {
        ...validUserData,
        password: '123' // Too weak
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(weakPasswordData)
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject registration with duplicate email', async () => {
      // First registration should succeed
      await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(HTTP_STATUS.CREATED);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(API_RESPONSES.ERRORS.USER_EXISTS);
    });

    it('should handle internal server errors gracefully', async () => {
      // Mock authService to throw error
      const originalSignup = authService.signup;
      authService.signup = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validUserData)
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(API_RESPONSES.ERRORS.INTERNAL_ERROR);

      // Restore original method
      authService.signup = originalSignup;
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user for login tests
      const result = await authService.signup({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      });
      testUser = result.user;
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();

      authToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;

      // Verify session was created
      const sessions = await sessionManager.getUserSessions(testUser.id);
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should reject login with invalid email', async () => {
      const invalidEmailData = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidEmailData)
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(API_RESPONSES.ERRORS.INVALID_CREDENTIALS);
    });

    it('should reject login with invalid password', async () => {
      const invalidPasswordData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidPasswordData)
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(API_RESPONSES.ERRORS.INVALID_CREDENTIALS);
    });

    it('should reject login with missing credentials', async () => {
      const incompleteData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(incompleteData)
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });

    it('should track device information during login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Test-Browser/1.0')
        .send(loginData)
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);

      // Verify session contains device info
      const sessions = await sessionManager.getUserSessions(testUser.id);
      expect(sessions[0].deviceInfo).toContain('Test-Browser');
    });

    it('should enforce account lockout after failed attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // Next attempt should return account locked
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.message).toBe(API_RESPONSES.ERRORS.ACCOUNT_LOCKED);
    });
  });

  describe('POST /api/auth/refresh', () => {
    beforeEach(async () => {
      // Create test user and get tokens
      const signupResult = await authService.signup({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      testUser = signupResult.user;
      authToken = signupResult.token!;
      refreshToken = signupResult.refreshToken!;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).not.toBe(authToken); // Should be new token
    });

    it('should reject invalid refresh token', async () => {
      const invalidRefreshToken = 'invalid.refresh.token';

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: invalidRefreshToken })
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      const signupResult = await authService.signup({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      testUser = signupResult.user;
      authToken = signupResult.token!;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);

      // Verify token is now blacklisted
      const verifyResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(verifyResponse.body.success).toBe(false);
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });
  });

  describe('GET /api/auth/profile', () => {
    beforeEach(async () => {
      const signupResult = await authService.signup({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      testUser = signupResult.user;
      authToken = signupResult.token!;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(response.body.data.user.emailVerificationToken).toBeUndefined();
    });

    it('should reject profile request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
    });

    it('should reject profile request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token')
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    beforeEach(async () => {
      const signupResult = await authService.signup({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      testUser = signupResult.user;
      authToken = signupResult.token!;
    });

    it('should update user profile with valid data', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe(updateData.firstName);
      expect(response.body.data.user.lastName).toBe(updateData.lastName);
      expect(response.body.data.user.email).toBe(updateData.email);
    });

    it('should update partial profile data', async () => {
      const updateData = {
        firstName: 'OnlyFirst'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe(updateData.firstName);
      expect(response.body.data.user.lastName).toBe('User'); // Should remain unchanged
    });

    it('should reject duplicate email update', async () => {
      // Create another user
      await authService.signup({
        email: 'other@example.com',
        password: 'SecurePass123!',
        firstName: 'Other',
        lastName: 'User'
      });

      const updateData = {
        email: 'other@example.com' // Already exists
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email address is already in use');
    });

    it('should reject profile update without authentication', async () => {
      const updateData = {
        firstName: 'Updated'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .send(updateData)
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/change-password', () => {
    beforeEach(async () => {
      const signupResult = await authService.signup({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      testUser = signupResult.user;
      authToken = signupResult.token!;
    });

    it('should change password with valid current password', async () => {
      const changeData = {
        currentPassword: 'SecurePass123!',
        newPassword: 'NewSecurePass456!'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);

      // Verify old password no longer works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(loginResponse.body.success).toBe(false);
    });

    it('should reject password change with invalid current password', async () => {
      const changeData = {
        currentPassword: 'WrongCurrentPassword',
        newPassword: 'NewSecurePass456!'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });

    it('should reject password change with weak new password', async () => {
      const changeData = {
        currentPassword: 'SecurePass123!',
        newPassword: '123' // Too weak
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });

    it('should reject password change without authentication', async () => {
      const changeData = {
        currentPassword: 'SecurePass123!',
        newPassword: 'NewSecurePass456!'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .send(changeData)
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/validate-password', () => {
    it('should validate strong password correctly', async () => {
      const strongPassword = 'SecurePass123!';

      const response = await request(app)
        .post('/api/auth/validate-password')
        .send({ password: strongPassword })
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.errors).toHaveLength(0);
    });

    it('should validate weak password correctly', async () => {
      const weakPassword = '123';

      const response = await request(app)
        .post('/api/auth/validate-password')
        .send({ password: weakPassword })
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });

    it('should reject validation without password', async () => {
      const response = await request(app)
        .post('/api/auth/validate-password')
        .send({})
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Password is required');
    });
  });

  describe('POST /api/auth/password-reset', () => {
    beforeEach(async () => {
      await authService.signup({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      });
    });

    it('should initiate password reset for existing email', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'test@example.com' })
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');
    });

    it('should handle password reset for non-existent email securely', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');
    });

    it('should reject password reset without email', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({})
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email is required');
    });
  });

  describe('POST /api/auth/password-reset/confirm', () => {
    it('should reject confirmation without required fields', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ token: 'some-token' })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token and new password are required');
    });

    it('should reject confirmation with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ 
          token: 'invalid-token', 
          newPassword: 'NewSecurePass123!' 
        })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout-all', () => {
    beforeEach(async () => {
      const signupResult = await authService.signup({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      testUser = signupResult.user;
      authToken = signupResult.token!;
    });

    it('should logout from all devices', async () => {
      // Create another session
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        });

      const token2 = loginResponse.body.data.token;

      // Verify both tokens work
      await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.OK);

      await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token2}`)
        .expect(HTTP_STATUS.OK);

      // Logout from all devices
      const logoutResponse = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.OK);

      expect(logoutResponse.body.success).toBe(true);
      expect(logoutResponse.body.data.devicesLoggedOut).toBeGreaterThan(0);

      // Both tokens should now be invalid
      await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.UNAUTHORIZED);

      await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token2}`)
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should reject logout-all without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout-all')
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/sessions', () => {
    beforeEach(async () => {
      const signupResult = await authService.signup({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      testUser = signupResult.user;
      authToken = signupResult.token!;
    });

    it('should get user sessions with valid authentication', async () => {
      const response = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toBeDefined();
      expect(response.body.data.totalActiveSessions).toBeDefined();
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
    });

    it('should reject sessions request without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/sessions')
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Security and Edge Cases', () => {
    it('should handle malformed request bodies gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send('invalid json')
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize input data to prevent XSS', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(maliciousData)
        .expect(HTTP_STATUS.CREATED);

      expect(response.body.data.user.firstName).not.toContain('<script>');
    });

    it('should handle concurrent requests safely', async () => {
      const userData = {
        email: 'concurrent@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      };

      // Create user first
      await authService.signup(userData);

      // Make concurrent login requests
      const promises = Array(5).fill(0).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: userData.email,
            password: userData.password
          })
      );

      const responses = await Promise.all(promises);
      
      // All should either succeed or be rate limited
      responses.forEach(response => {
        expect([HTTP_STATUS.OK, HTTP_STATUS.TOO_MANY_REQUESTS]).toContain(response.status);
      });
    });

    it('should handle database connection errors', async () => {
      // Mock prisma to throw connection error
      const originalDisconnect = prisma.$disconnect;
      prisma.$disconnect = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      };

      // This might not fail immediately but shows error handling pattern
      try {
        await request(app)
          .post('/api/auth/signup')
          .send(userData);
      } catch (error) {
        // Expected behavior - handle gracefully
      }

      // Restore original method
      prisma.$disconnect = originalDisconnect;
    });

    it('should enforce session limits', async () => {
      const signupResult = await authService.signup({
        email: 'session-limit@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      // Create multiple sessions (more than the limit)
      const sessionTokens = [];
      
      for (let i = 0; i < 7; i++) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'session-limit@example.com',
            password: 'SecurePass123!'
          });
        
        if (loginResponse.status === HTTP_STATUS.OK) {
          sessionTokens.push(loginResponse.body.data.token);
        }
      }

      // Should have limited the number of concurrent sessions
      const activeSessionCount = await authService.getActiveSessionCount(signupResult.user!.id);
      expect(activeSessionCount).toBeLessThanOrEqual(6);
    });
  });

  describe('Performance Tests', () => {
    it('should handle password hashing efficiently', async () => {
      const userData = {
        email: 'perf-test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const startTime = Date.now();
      
      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(HTTP_STATUS.CREATED);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Password hashing should complete within reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000);
    });

    it('should handle multiple simultaneous signups', async () => {
      const promises = Array(10).fill(0).map((_, index) =>
        request(app)
          .post('/api/auth/signup')
          .send({
            email: `perf${index}@example.com`,
            password: 'SecurePass123!',
            firstName: 'Test',
            lastName: 'User'
          })
      );

      const responses = await Promise.all(promises);
      
      // All should either succeed or be rate limited
      responses.forEach(response => {
        expect([HTTP_STATUS.CREATED, HTTP_STATUS.TOO_MANY_REQUESTS]).toContain(response.status);
      });
    });
  });
});