/**
 * User Management Workflow Integration Tests (Fixed)
 * 
 * Tests complete user management workflows from registration to role changes
 */

const request = require('supertest');
const { faker } = require('@faker-js/faker');
const { createTestApp } = require('../../helpers/app-helpers');
const { setupTestDatabase, teardownTestDatabase } = require('../../setup/test-db-setup');

describe('User Management Workflow Integration Tests', () => {
  let app;
  let testDb;
  let testUsers = [];

  beforeAll(async () => {
    // Setup test database
    testDb = await setupTestDatabase();
    // Create test application with real dependencies
    app = await createTestApp(testDb.getService());
  });

  afterAll(async () => {
    await teardownTestDatabase(testDb);
  });

  beforeEach(async () => {
    if (testDb) {
      await testDb.reset();
    }
    testUsers = [];
  });

  afterEach(async () => {
    // Cleanup test users
    for (const user of testUsers) {
      try {
        if (user.id) {
          // In a real implementation, we'd need an admin endpoint to delete users
          console.log(`Would clean up user ${user.id}`);
        }
      } catch (error) {
        // User already deleted or doesn't exist
      }
    }
  });

  describe('1. Complete User Registration Workflow', () => {
    test('should complete full registration flow: signup → login → profile update → logout', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data).toHaveProperty('user');
      expect(registerResponse.body.data).toHaveProperty('accessToken');
      expect(registerResponse.body.data.user.email).toBe(userData.email);
      expect(registerResponse.body.data.user).not.toHaveProperty('password');

      testUsers.push({ id: registerResponse.body.data.user.id, email: userData.email });

      // Step 2: Login with registered credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty('accessToken');
      expect(loginResponse.body.data).toHaveProperty('refreshToken');
      expect(loginResponse.body.data).toHaveProperty('user');
      expect(loginResponse.body.data.user.email).toBe(userData.email);

      const authToken = loginResponse.body.data.accessToken;

      // Step 3: Get current profile
      const initialProfileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(initialProfileResponse.body.success).toBe(true);
      expect(initialProfileResponse.body.data.user.email).toBe(userData.email);

      // Step 4: Update profile with authentication
      const profileUpdateData = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const updateResponse = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileUpdateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.user.firstName).toBe(profileUpdateData.firstName);
      expect(updateResponse.body.data.user.lastName).toBe(profileUpdateData.lastName);

      // Step 5: Verify profile was updated by fetching it again
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.firstName).toBe(profileUpdateData.firstName);
      expect(profileResponse.body.data.user.lastName).toBe(profileUpdateData.lastName);
      expect(profileResponse.body.data.user.email).toBe(userData.email);

      // Step 6: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // Step 7: Verify token is invalidated after logout
      const profileAfterLogoutResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(profileAfterLogoutResponse.body.success).toBe(false);
    });

    test('should reject registration with duplicate email', async () => {
      const email = faker.internet.email().toLowerCase();
      const userData = {
        email,
        password: 'SecurePass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      // First registration
      const firstResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      testUsers.push({ id: firstResponse.body.data.user.id, email });

      // Second registration with same email should fail
      const secondResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(409);

      expect(secondResponse.body.success).toBe(false);
      expect(secondResponse.body.message).toContain('email');
    });

    test('should validate password complexity during registration', async () => {
      const baseUserData = {
        email: faker.internet.email().toLowerCase(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const weakPasswords = [
        '123',           // Too short
        'password',      // No numbers/symbols
        'Password',      // No numbers/symbols
        '12345678',      // Only numbers
        'ABCDEFGH'       // Only letters
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({ ...baseUserData, password })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/password/i);
      }
    });
  });

  describe('2. Password Change Workflow', () => {
    test('should change password with valid current password', async () => {
      // Setup: Create and login user
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'OldPassword123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const registerResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      testUsers.push({ id: registerResponse.body.data.user.id, email: userData.email });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const authToken = loginResponse.body.data.accessToken;

      // Step 1: Change password
      const newPassword = 'NewPassword123!';
      const changePasswordResponse = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: userData.password,
          newPassword: newPassword
        })
        .expect(200);

      expect(changePasswordResponse.body.success).toBe(true);

      // Step 2: Verify old password no longer works
      const loginWithOldPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(401);

      expect(loginWithOldPasswordResponse.body.success).toBe(false);

      // Step 3: Verify new password works
      const loginWithNewPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: newPassword
        })
        .expect(200);

      expect(loginWithNewPasswordResponse.body.success).toBe(true);
      expect(loginWithNewPasswordResponse.body.data).toHaveProperty('accessToken');
    });

    test('should reject password change with wrong current password', async () => {
      // Setup: Create and login user
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'CorrectPassword123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const registerResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      testUsers.push({ id: registerResponse.body.data.user.id, email: userData.email });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const authToken = loginResponse.body.data.accessToken;

      // Attempt to change password with wrong current password
      const changePasswordResponse = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!'
        })
        .expect(401);

      expect(changePasswordResponse.body.success).toBe(false);
    });
  });

  describe('3. Token Refresh Workflow', () => {
    test('should refresh access token using valid refresh token', async () => {
      // Setup: Create and login user
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'TestPassword123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const registerResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      testUsers.push({ id: registerResponse.body.data.user.id, email: userData.email });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const originalAccessToken = loginResponse.body.data.accessToken;
      const refreshToken = loginResponse.body.data.refreshToken;

      // Step 1: Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data).toHaveProperty('accessToken');
      expect(refreshResponse.body.data).toHaveProperty('refreshToken');
      
      // New tokens should be different from original
      expect(refreshResponse.body.data.accessToken).not.toBe(originalAccessToken);
      expect(refreshResponse.body.data.refreshToken).not.toBe(refreshToken);

      // Step 2: Verify new access token works
      const newAccessToken = refreshResponse.body.data.accessToken;
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.email).toBe(userData.email);
    });

    test('should reject refresh with invalid token', async () => {
      const invalidRefreshToken = 'invalid.refresh.token';

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: invalidRefreshToken })
        .expect(401);

      expect(refreshResponse.body.success).toBe(false);
    });
  });

  describe('4. Password Reset Workflow', () => {
    test('should handle password reset request', async () => {
      // Setup: Create user
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'OriginalPassword123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const registerResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      testUsers.push({ id: registerResponse.body.data.user.id, email: userData.email });

      // Step 1: Request password reset
      const resetRequestResponse = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: userData.email })
        .expect(200);

      expect(resetRequestResponse.body.success).toBe(true);
      expect(resetRequestResponse.body.message).toContain('reset');

      // Step 2: Also test with non-existent email (should return same response for security)
      const resetRequestNonExistentResponse = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(resetRequestNonExistentResponse.body.success).toBe(true);
      expect(resetRequestNonExistentResponse.body.message).toBe(resetRequestResponse.body.message);
    });

    test('should validate email format in password reset', async () => {
      const invalidEmails = ['invalid-email', '', '@example.com', 'test@'];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/password-reset')
          .send({ email })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('5. Authentication Security Features', () => {
    test('should enforce rate limiting on login attempts', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'TestPassword123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      // Register user first
      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Make multiple rapid login attempts with wrong password
      const loginAttempts = [];
      for (let i = 0; i < 30; i++) {
        loginAttempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: userData.email,
              password: 'WrongPassword123!'
            })
        );
      }

      const results = await Promise.all(loginAttempts);
      
      // Some requests should be rate limited (status 429)
      const rateLimitedRequests = results.filter(result => result.status === 429);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    test('should validate authentication token format', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        '',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });

    test('should verify token validation endpoint', async () => {
      // Setup: Create and login user
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'TestPassword123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const registerResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      testUsers.push({ id: registerResponse.body.data.user.id, email: userData.email });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const authToken = loginResponse.body.data.accessToken;

      // Test valid token
      const verifyResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.authenticated).toBe(true);
      expect(verifyResponse.body.data.user.email).toBe(userData.email);

      // Test invalid token
      const verifyInvalidResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(verifyInvalidResponse.body.success).toBe(false);
    });
  });
});