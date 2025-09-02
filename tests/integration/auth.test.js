const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../../src/app').default;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test-integration.db'
    }
  }
});

describe('Authentication Integration Tests', () => {
  let testUser;
  let authToken;
  let refreshToken;

  beforeAll(async () => {
    // Clean database
    await prisma.$executeRaw`DELETE FROM user_sessions`;
    await prisma.$executeRaw`DELETE FROM users`;
  });

  afterAll(async () => {
    await prisma.$executeRaw`DELETE FROM user_sessions`;
    await prisma.$executeRaw`DELETE FROM users`;
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.$executeRaw`DELETE FROM user_sessions`;
    await prisma.$executeRaw`DELETE FROM users`;
  });

  describe('POST /api/auth/signup', () => {
    test('should register new user successfully', async () => {
      const signupData = {
        email: 'integration@example.com',
        password: 'IntegrationTest123!',
        firstName: 'Integration',
        lastName: 'Test'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeTruthy();
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();
      expect(response.body.data.user.email).toBe(signupData.email.toLowerCase());
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeTruthy();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'ValidPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeTruthy();
    });

    test('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeTruthy();
    });

    test('should reject duplicate email', async () => {
      const signupData = {
        email: 'duplicate@example.com',
        password: 'DuplicateTest123!',
        firstName: 'Duplicate',
        lastName: 'Test'
      };

      // First signup should succeed
      await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      // Second signup with same email should fail
      const response = await request(app)
        .post('/api/auth/signup')
        .send(signupData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    test('should respect rate limiting for signups', async () => {
      const signupData = {
        email: 'ratelimit@example.com',
        password: 'RateLimit123!',
        firstName: 'Rate',
        lastName: 'Limit'
      };

      // Make multiple rapid signup attempts
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/auth/signup')
            .send({ ...signupData, email: `ratelimit${i}@example.com` })
        );
      }

      const responses = await Promise.all(promises);
      
      // First few should succeed, but we should hit rate limit
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeTruthy();
      expect(rateLimitedResponse.body.message).toContain('Too many signup attempts');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user for login tests
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'login@example.com',
          password: 'LoginTest123!',
          firstName: 'Login',
          lastName: 'Test'
        });

      testUser = response.body.data.user;
    });

    test('should authenticate user with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'LoginTest123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeTruthy();
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();
      expect(response.body.data.user.email).toBe('login@example.com');

      authToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;
    });

    test('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    test('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeTruthy();
    });

    test('should handle case insensitive email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'LOGIN@EXAMPLE.COM',
          password: 'LoginTest123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('login@example.com');
    });

    test('should respect rate limiting for logins', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'WrongPassword123!'
      };

      // Make multiple rapid failed login attempts
      const promises = [];
      for (let i = 0; i < 7; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send(loginData)
        );
      }

      const responses = await Promise.all(promises);
      
      // Should hit rate limit after too many attempts
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeTruthy();
      expect(rateLimitedResponse.body.message).toContain('Too many authentication attempts');
    });
  });

  describe('POST /api/auth/refresh', () => {
    beforeEach(async () => {
      // Create user and get tokens
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'refresh@example.com',
          password: 'RefreshTest123!',
          firstName: 'Refresh',
          lastName: 'Test'
        });

      authToken = signupResponse.body.data.token;
      refreshToken = signupResponse.body.data.refreshToken;
    });

    test('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();
      expect(response.body.data.token).not.toBe(authToken);
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid refresh token');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeTruthy();
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      // Create user and get token
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'logout@example.com',
          password: 'LogoutTest123!',
          firstName: 'Logout',
          lastName: 'Test'
        });

      authToken = signupResponse.body.data.token;
    });

    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });

    test('should require authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });
  });

  describe('GET /api/auth/profile', () => {
    beforeEach(async () => {
      // Create user and get token
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'profile@example.com',
          password: 'ProfileTest123!',
          firstName: 'Profile',
          lastName: 'Test'
        });

      authToken = signupResponse.body.data.token;
      testUser = signupResponse.body.data.user;
    });

    test('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeTruthy();
      expect(response.body.data.user.email).toBe('profile@example.com');
      expect(response.body.data.user.firstName).toBe('Profile');
      expect(response.body.data.user.lastName).toBe('Test');
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    beforeEach(async () => {
      // Create user and get token
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'updateprofile@example.com',
          password: 'UpdateProfileTest123!',
          firstName: 'Update',
          lastName: 'Profile'
        });

      authToken = signupResponse.body.data.token;
    });

    test('should update profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'User'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Updated');
      expect(response.body.data.user.lastName).toBe('User');
      expect(response.body.data.user.email).toBe('updateprofile@example.com');
    });

    test('should validate input data', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: '', // Invalid empty string
          email: 'invalid-email' // Invalid email format
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeTruthy();
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({ firstName: 'Test' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });

    test('should respect rate limiting', async () => {
      // Make multiple rapid profile update attempts
      const promises = [];
      for (let i = 0; i < 12; i++) {
        promises.push(
          request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ firstName: `Update${i}` })
        );
      }

      const responses = await Promise.all(promises);
      
      // Should hit rate limit
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeTruthy();
      expect(rateLimitedResponse.body.message).toContain('Too many profile update attempts');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    beforeEach(async () => {
      // Create user and get token
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'changepass@example.com',
          password: 'ChangePassTest123!',
          firstName: 'Change',
          lastName: 'Password'
        });

      authToken = signupResponse.body.data.token;
    });

    test('should change password successfully', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'ChangePassTest123!',
          newPassword: 'NewPassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password changed successfully');

      // Verify old password no longer works
      const oldPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'changepass@example.com',
          password: 'ChangePassTest123!'
        })
        .expect(401);

      // Verify new password works
      const newPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'changepass@example.com',
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(newPasswordResponse.body.success).toBe(true);
    });

    test('should reject incorrect current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Current password is incorrect');
    });

    test('should validate new password strength', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'ChangePassTest123!',
          newPassword: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeTruthy();
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .send({
          currentPassword: 'ChangePassTest123!',
          newPassword: 'NewPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });
  });

  describe('GET /api/auth/verify', () => {
    beforeEach(async () => {
      // Create user and get token
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'verify@example.com',
          password: 'VerifyTest123!',
          firstName: 'Verify',
          lastName: 'Test'
        });

      authToken = signupResponse.body.data.token;
    });

    test('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authenticated).toBe(true);
      expect(response.body.data.user).toBeTruthy();
      expect(response.body.data.user.email).toBe('verify@example.com');
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });
  });

  describe('POST /api/auth/validate-password', () => {
    test('should validate strong password', async () => {
      const response = await request(app)
        .post('/api/auth/validate-password')
        .send({ password: 'StrongPassword123!' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.errors).toHaveLength(0);
    });

    test('should identify weak password', async () => {
      const response = await request(app)
        .post('/api/auth/validate-password')
        .send({ password: 'weak' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });

    test('should require password field', async () => {
      const response = await request(app)
        .post('/api/auth/validate-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Password is required');
    });

    test('should respect rate limiting', async () => {
      // Make multiple rapid password validation requests
      const promises = [];
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app)
            .post('/api/auth/validate-password')
            .send({ password: `Password${i}123!` })
        );
      }

      const responses = await Promise.all(promises);
      
      // Should hit rate limit
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeTruthy();
      expect(rateLimitedResponse.body.message).toContain('Too many password validation requests');
    });
  });
});