/**
 * User Management Workflow Integration Tests
 * 
 * Tests complete user management workflows from registration to role changes
 */

const request = require('supertest');
const { faker } = require('@faker-js/faker');
const { createMockApp } = require('../../helpers/mockApp');
const bcrypt = require('bcryptjs');

describe('User Management Workflow Integration Tests', () => {
  let app;
  let api;
  let testUsers = [];

  beforeEach(() => {
    app = createMockApp();
    api = app.locals.api;
    testUsers = [];
  });

  afterEach(async () => {
    // Cleanup test users
    for (const user of testUsers) {
      try {
        if (user.id) {
          await api.deleteUser(user.id);
        }
      } catch (error) {
        // User already deleted or doesn't exist
      }
    }
  });

  describe('1. Complete User Registration Workflow', () => {
    test('should complete full registration flow: register → verify email → login → profile update', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: faker.phone.number()
      };

      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('id');
      expect(registerResponse.body).toHaveProperty('email', userData.email);
      expect(registerResponse.body).toHaveProperty('isEmailVerified', false);
      expect(registerResponse.body).toHaveProperty('status', 'pending_verification');
      expect(registerResponse.body).not.toHaveProperty('password');

      testUsers.push({ id: registerResponse.body.id, email: userData.email });

      // Step 2: Attempt login before email verification (should fail)
      const loginBeforeVerifyResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(403);

      expect(loginBeforeVerifyResponse.body.error).toBe('Email not verified');

      // Step 3: Simulate email verification
      const verificationToken = 'mock-verification-token-' + Date.now();
      const verifyResponse = await request(app)
        .post('/api/users/verify-email')
        .send({ token: verificationToken, email: userData.email })
        .expect(200);

      expect(verifyResponse.body.message).toBe('Email verified successfully');

      // Step 4: Login after verification (should succeed)
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body.user.isEmailVerified).toBe(true);
      expect(loginResponse.body.user.status).toBe('active');

      const authToken = loginResponse.body.token;

      // Step 5: Update profile with authentication
      const profileUpdateData = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: faker.phone.number(),
        preferences: {
          notifications: true,
          newsletter: false,
          language: 'en'
        }
      };

      const updateResponse = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileUpdateData)
        .expect(200);

      expect(updateResponse.body.firstName).toBe(profileUpdateData.firstName);
      expect(updateResponse.body.lastName).toBe(profileUpdateData.lastName);
      expect(updateResponse.body.preferences).toEqual(profileUpdateData.preferences);

      // Step 6: Verify profile was updated by fetching it
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.firstName).toBe(profileUpdateData.firstName);
      expect(profileResponse.body.lastName).toBe(profileUpdateData.lastName);
      expect(profileResponse.body.preferences).toEqual(profileUpdateData.preferences);
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
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      testUsers.push({ id: firstResponse.body.id, email });

      // Attempt duplicate registration
      const duplicateResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(409);

      expect(duplicateResponse.body.error).toBe('Email already registered');
    });

    test('should validate registration data thoroughly', async () => {
      const invalidDataSets = [
        {
          data: { email: 'invalid-email', password: 'pass' },
          expectedErrors: ['Invalid email format', 'Password too short']
        },
        {
          data: { email: faker.internet.email(), password: '' },
          expectedErrors: ['Password required']
        },
        {
          data: { password: 'ValidPass123!' },
          expectedErrors: ['Email required']
        },
        {
          data: { 
            email: faker.internet.email(), 
            password: 'weakpass',
            firstName: 'A'.repeat(101)
          },
          expectedErrors: ['Password must contain uppercase, lowercase, number and special character', 'First name too long']
        }
      ];

      for (const testCase of invalidDataSets) {
        const response = await request(app)
          .post('/api/users/register')
          .send(testCase.data)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        expect(response.body.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('2. Password Reset Workflow', () => {
    let registeredUser;
    let authToken;

    beforeEach(async () => {
      // Create a verified user for password reset tests
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'OriginalPass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      // Simulate email verification
      await request(app)
        .post('/api/users/verify-email')
        .send({ 
          token: 'mock-token-' + Date.now(), 
          email: userData.email 
        })
        .expect(200);

      registeredUser = { ...userData, id: registerResponse.body.id };
      testUsers.push(registeredUser);

      // Get auth token
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: registeredUser.email,
          password: registeredUser.password
        })
        .expect(200);

      authToken = loginResponse.body.token;
    });

    test('should complete password reset flow: request → validate token → reset → login with new password', async () => {
      // Step 1: Request password reset
      const resetRequestResponse = await request(app)
        .post('/api/users/forgot-password')
        .send({ email: registeredUser.email })
        .expect(200);

      expect(resetRequestResponse.body.message).toBe('Password reset email sent');

      // Step 2: Simulate reset token validation
      const resetToken = 'mock-reset-token-' + Date.now();
      const validateTokenResponse = await request(app)
        .get(`/api/users/validate-reset-token/${resetToken}`)
        .expect(200);

      expect(validateTokenResponse.body.valid).toBe(true);

      // Step 3: Reset password with token
      const newPassword = 'NewSecurePass456!';
      const resetPasswordResponse = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: resetToken,
          email: registeredUser.email,
          newPassword
        })
        .expect(200);

      expect(resetPasswordResponse.body.message).toBe('Password reset successfully');

      // Step 4: Verify old password doesn't work
      const oldPasswordResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: registeredUser.email,
          password: registeredUser.password
        })
        .expect(401);

      expect(oldPasswordResponse.body.error).toBe('Invalid credentials');

      // Step 5: Login with new password
      const newPasswordResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: registeredUser.email,
          password: newPassword
        })
        .expect(200);

      expect(newPasswordResponse.body).toHaveProperty('token');
      expect(newPasswordResponse.body.user.email).toBe(registeredUser.email);
    });

    test('should handle expired reset tokens', async () => {
      const expiredToken = 'expired-token-' + (Date.now() - 3600000); // 1 hour ago
      
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: expiredToken,
          email: registeredUser.email,
          newPassword: 'NewPass123!'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired reset token');
    });

    test('should require strong password for reset', async () => {
      const resetToken = 'mock-reset-token-' + Date.now();
      
      const weakPasswords = ['weak', '12345', 'password', 'Pass123'];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/users/reset-password')
          .send({
            token: resetToken,
            email: registeredUser.email,
            newPassword: weakPassword
          })
          .expect(400);

        expect(response.body).toHaveProperty('errors');
      }
    });

    test('should allow authenticated password change without reset token', async () => {
      const newPassword = 'AuthenticatedNewPass789!';
      
      const changePasswordResponse = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: registeredUser.password,
          newPassword
        })
        .expect(200);

      expect(changePasswordResponse.body.message).toBe('Password changed successfully');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: registeredUser.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
    });
  });

  describe('3. Admin User Management Workflow', () => {
    let adminUser;
    let adminToken;
    let regularUser;

    beforeEach(async () => {
      // Create admin user
      const adminData = {
        email: 'admin@test.com',
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      };

      const adminResponse = await request(app)
        .post('/api/users/register')
        .send(adminData)
        .expect(201);

      await request(app)
        .post('/api/users/verify-email')
        .send({ 
          token: 'admin-token', 
          email: adminData.email 
        })
        .expect(200);

      const adminLoginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: adminData.email,
          password: adminData.password
        })
        .expect(200);

      adminUser = { ...adminData, id: adminResponse.body.id };
      adminToken = adminLoginResponse.body.token;
      testUsers.push(adminUser);

      // Create regular user
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'RegularPass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const userResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      await request(app)
        .post('/api/users/verify-email')
        .send({ 
          token: 'user-token', 
          email: userData.email 
        })
        .expect(200);

      regularUser = { ...userData, id: userResponse.body.id };
      testUsers.push(regularUser);
    });

    test('should allow admin to manage user roles and permissions', async () => {
      // Step 1: Get user details as admin
      const userDetailsResponse = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(userDetailsResponse.body.email).toBe(regularUser.email);
      expect(userDetailsResponse.body.role).toBe('user');

      // Step 2: Update user role to manager
      const roleUpdateResponse = await request(app)
        .put(`/api/users/${regularUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          role: 'manager',
          reason: 'Promotion to parking manager'
        })
        .expect(200);

      expect(roleUpdateResponse.body.role).toBe('manager');
      expect(roleUpdateResponse.body.updatedBy).toBe(adminUser.id);

      // Step 3: Verify role change persisted
      const updatedUserResponse = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(updatedUserResponse.body.role).toBe('manager');

      // Step 4: Update user permissions
      const permissionsResponse = await request(app)
        .put(`/api/users/${regularUser.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permissions: [
            'garage_management',
            'spot_configuration',
            'user_reports'
          ]
        })
        .expect(200);

      expect(permissionsResponse.body.permissions).toContain('garage_management');
      expect(permissionsResponse.body.permissions).toContain('spot_configuration');

      // Step 5: Deactivate user account
      const deactivateResponse = await request(app)
        .put(`/api/users/${regularUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          status: 'inactive',
          reason: 'Account suspended for review'
        })
        .expect(200);

      expect(deactivateResponse.body.status).toBe('inactive');

      // Step 6: Reactivate user account
      const reactivateResponse = await request(app)
        .put(`/api/users/${regularUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          status: 'active',
          reason: 'Review completed, account restored'
        })
        .expect(200);

      expect(reactivateResponse.body.status).toBe('active');
    });

    test('should prevent non-admin users from managing other users', async () => {
      // Get regular user token
      const userLoginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: regularUser.email,
          password: regularUser.password
        })
        .expect(200);

      const userToken = userLoginResponse.body.token;

      // Try to access admin endpoints as regular user
      const forbiddenEndpoints = [
        { method: 'get', path: `/api/users/${adminUser.id}` },
        { method: 'put', path: `/api/users/${adminUser.id}/role`, body: { role: 'admin' } },
        { method: 'put', path: `/api/users/${adminUser.id}/status`, body: { status: 'inactive' } },
        { method: 'delete', path: `/api/users/${adminUser.id}` }
      ];

      for (const endpoint of forbiddenEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${userToken}`)
          .send(endpoint.body || {});

        expect(response.status).toBe(403);
        expect(response.body.error).toMatch(/insufficient permissions|forbidden/i);
      }
    });

    test('should maintain audit trail for user management actions', async () => {
      // Perform several admin actions
      await request(app)
        .put(`/api/users/${regularUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'manager', reason: 'Promotion' })
        .expect(200);

      await request(app)
        .put(`/api/users/${regularUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive', reason: 'Temporary suspension' })
        .expect(200);

      await request(app)
        .put(`/api/users/${regularUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active', reason: 'Suspension lifted' })
        .expect(200);

      // Get audit trail
      const auditResponse = await request(app)
        .get(`/api/users/${regularUser.id}/audit-log`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(auditResponse.body).toBeInstanceOf(Array);
      expect(auditResponse.body.length).toBeGreaterThanOrEqual(3);

      // Verify audit entries contain required information
      auditResponse.body.forEach(entry => {
        expect(entry).toHaveProperty('action');
        expect(entry).toHaveProperty('performedBy', adminUser.id);
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('reason');
        expect(entry).toHaveProperty('oldValue');
        expect(entry).toHaveProperty('newValue');
      });
    });
  });

  describe('4. User Authentication Edge Cases', () => {
    test('should handle account lockout after multiple failed attempts', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'CorrectPass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      testUsers.push({ id: registerResponse.body.id, email: userData.email });

      await request(app)
        .post('/api/users/verify-email')
        .send({ token: 'verify-token', email: userData.email })
        .expect(200);

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/users/login')
          .send({
            email: userData.email,
            password: 'WrongPassword'
          })
          .expect(401);
      }

      // 6th attempt should result in account lockout
      const lockoutResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: 'WrongPassword'
        })
        .expect(423);

      expect(lockoutResponse.body.error).toBe('Account locked due to multiple failed attempts');
      expect(lockoutResponse.body).toHaveProperty('lockoutExpiry');

      // Even correct password should fail when locked
      const correctPasswordResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(423);

      expect(correctPasswordResponse.body.error).toBe('Account locked due to multiple failed attempts');
    });

    test('should handle session management and token refresh', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SessionPass123!',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      testUsers.push({ id: registerResponse.body.id, email: userData.email });

      await request(app)
        .post('/api/users/verify-email')
        .send({ token: 'verify-token', email: userData.email })
        .expect(200);

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const token = loginResponse.body.token;
      const refreshToken = loginResponse.body.refreshToken;

      // Use token to access protected endpoint
      const protectedResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(protectedResponse.body.email).toBe(userData.email);

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/users/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('token');
      expect(refreshResponse.body).toHaveProperty('refreshToken');

      // Use new token
      const newTokenResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.token}`)
        .expect(200);

      expect(newTokenResponse.body.email).toBe(userData.email);

      // Logout should invalidate tokens
      await request(app)
        .post('/api/users/logout')
        .set('Authorization', `Bearer ${refreshResponse.body.token}`)
        .expect(200);

      // Token should no longer work
      const invalidTokenResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.token}`)
        .expect(401);

      expect(invalidTokenResponse.body.error).toBe('Token expired or invalid');
    });
  });
});