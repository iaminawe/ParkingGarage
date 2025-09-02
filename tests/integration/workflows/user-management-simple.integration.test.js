/**
 * User Management Workflow Integration Tests (Simple)
 * 
 * Tests complete user management workflows using the same patterns as existing E2E tests
 */

const request = require('supertest');
const { faker } = require('@faker-js/faker');

// Use the existing working auth E2E test setup
const { createTestApp } = require('../../helpers/app-helpers');
const { setupTestDatabase, teardownTestDatabase } = require('../../setup/test-db-setup');

describe('User Management Workflow Integration Tests', () => {
  let app;
  let testDb;

  beforeAll(async () => {
    try {
      // Setup test database
      testDb = await setupTestDatabase();
      // Create test application with real dependencies
      app = await createTestApp(testDb.getService());
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (testDb) {
      await teardownTestDatabase(testDb);
    }
  });

  beforeEach(async () => {
    if (testDb) {
      await testDb.reset();
    }
  });

  describe('Complete User Authentication Flow', () => {
    test('should complete signup → login → profile → logout workflow', async () => {
      // Test data
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      // Step 1: User signup
      console.log('🔐 Testing user signup...');
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      // Handle both 201 and 409 (duplicate email) as valid outcomes
      if (signupResponse.status === 409) {
        // If duplicate email, generate a new one and try again
        userData.email = faker.internet.email().toLowerCase();
        const retrySignupResponse = await request(app)
          .post('/api/auth/signup')
          .send(userData)
          .expect(201);
        
        expect(retrySignupResponse.body.success).toBe(true);
      } else {
        expect(signupResponse.status).toBe(201);
        expect(signupResponse.body.success).toBe(true);
      }

      // Step 2: User login
      console.log('🔐 Testing user login...');
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty('accessToken');
      expect(loginResponse.body.data).toHaveProperty('user');

      const accessToken = loginResponse.body.data.accessToken;
      const user = loginResponse.body.data.user;

      // Step 3: Get profile
      console.log('👤 Testing get profile...');
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.email).toBe(userData.email);

      // Step 4: Update profile
      console.log('✏️  Testing profile update...');
      const updatedData = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const updateResponse = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatedData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.user.firstName).toBe(updatedData.firstName);
      expect(updateResponse.body.data.user.lastName).toBe(updatedData.lastName);

      // Step 5: Verify profile update
      console.log('✅ Verifying profile was updated...');
      const verifyUpdateResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(verifyUpdateResponse.body.data.user.firstName).toBe(updatedData.firstName);
      expect(verifyUpdateResponse.body.data.user.lastName).toBe(updatedData.lastName);

      // Step 6: Logout
      console.log('🚪 Testing user logout...');
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // Step 7: Verify token is invalidated
      console.log('🔒 Verifying token invalidation...');
      const invalidTokenResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(invalidTokenResponse.body.success).toBe(false);

      console.log('✅ Complete user workflow test passed!');
    }, 30000); // 30 second timeout

    test('should handle password change workflow', async () => {
      // Setup: Create and login user
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'OriginalPass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      console.log('🔐 Setting up user for password change test...');
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

      const accessToken = loginResponse.body.data.accessToken;

      // Test: Change password
      console.log('🔑 Testing password change...');
      const newPassword = 'NewPassword123!';
      const changePasswordResponse = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: userData.password,
          newPassword: newPassword
        })
        .expect(200);

      expect(changePasswordResponse.body.success).toBe(true);

      // Verify: Old password no longer works
      console.log('❌ Verifying old password is rejected...');
      const oldPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(401);

      expect(oldPasswordResponse.body.success).toBe(false);

      // Verify: New password works
      console.log('✅ Verifying new password works...');
      const newPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: newPassword
        })
        .expect(200);

      expect(newPasswordResponse.body.success).toBe(true);

      console.log('✅ Password change workflow test passed!');
    }, 30000);

    test('should handle token refresh workflow', async () => {
      // Setup: Create and login user
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'TestPassword123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      console.log('🔐 Setting up user for token refresh test...');
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

      const originalAccessToken = loginResponse.body.data.accessToken;
      const refreshToken = loginResponse.body.data.refreshToken;

      // Test: Refresh token
      console.log('🔄 Testing token refresh...');
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data).toHaveProperty('accessToken');
      expect(refreshResponse.body.data).toHaveProperty('refreshToken');

      // Verify tokens are different
      const newAccessToken = refreshResponse.body.data.accessToken;
      const newRefreshToken = refreshResponse.body.data.refreshToken;

      expect(newAccessToken).not.toBe(originalAccessToken);
      expect(newRefreshToken).not.toBe(refreshToken);

      // Verify: New access token works
      console.log('✅ Verifying new access token works...');
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.email).toBe(userData.email);

      console.log('✅ Token refresh workflow test passed!');
    }, 30000);
  });

  describe('Authentication Security Tests', () => {
    test('should reject invalid credentials', async () => {
      console.log('🔒 Testing credential validation...');

      // Test invalid email format
      const invalidEmailResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'somepassword'
        })
        .expect(400);

      expect(invalidEmailResponse.body.success).toBe(false);

      // Test non-existent user
      const nonExistentResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'somepassword'
        })
        .expect(401);

      expect(nonExistentResponse.body.success).toBe(false);

      console.log('✅ Security validation tests passed!');
    });

    test('should validate password complexity', async () => {
      console.log('🔐 Testing password complexity validation...');

      const baseUserData = {
        email: faker.internet.email().toLowerCase(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const weakPasswords = [
        '123',           // Too short
        'password',      // No numbers/symbols
        'PASSWORD123',   // No special characters
        '12345678'       // Only numbers
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({ ...baseUserData, password })
          .expect(400);

        expect(response.body.success).toBe(false);
      }

      console.log('✅ Password complexity validation tests passed!');
    });

    test('should handle invalid tokens', async () => {
      console.log('🔒 Testing token validation...');

      const invalidTokens = [
        'invalid-token',
        'Bearer.invalid.token',
        '',
        'malformed.jwt.token'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      }

      console.log('✅ Token validation tests passed!');
    });
  });
});