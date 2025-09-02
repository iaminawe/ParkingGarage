const { PrismaClient } = require('@prisma/client');
const authService = require('../../../src/services/authService').default;

// Use in-memory SQLite for testing
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

describe('AuthService', () => {
  let testUser;
  
  beforeAll(async () => {
    // Ensure database is clean
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

  describe('Password Management', () => {
    test('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await authService.hashPassword(password);
      
      expect(hashedPassword).toBeTruthy();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    test('should compare password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await authService.hashPassword(password);
      
      const isValid = await authService.comparePassword(password, hashedPassword);
      const isInvalid = await authService.comparePassword('WrongPassword', hashedPassword);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('should validate password strength correctly', () => {
      const validPassword = 'StrongPassword123!';
      const weakPasswords = [
        '123456',           // Too short, no uppercase, no special chars
        'password',         // No uppercase, no numbers, no special chars
        'PASSWORD',         // No lowercase, no numbers, no special chars
        'Password123',      // No special chars
        'Password!',        // No numbers
        'password123!'      // No uppercase
      ];

      const validResult = authService.validatePassword(validPassword);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      weakPasswords.forEach(password => {
        const result = authService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Token Management', () => {
    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: await authService.hashPassword('TestPassword123!'),
          firstName: 'Test',
          lastName: 'User',
          role: 'USER'
        }
      });
    });

    test('should generate JWT tokens correctly', () => {
      const tokens = authService.generateTokens(testUser);
      
      expect(tokens.token).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.expiresAt).toBeInstanceOf(Date);
      expect(tokens.refreshExpiresAt).toBeInstanceOf(Date);
      expect(tokens.refreshExpiresAt.getTime()).toBeGreaterThan(tokens.expiresAt.getTime());
    });

    test('should verify JWT tokens correctly', () => {
      const tokens = authService.generateTokens(testUser);
      
      const accessPayload = authService.verifyToken(tokens.token);
      const refreshPayload = authService.verifyToken(tokens.refreshToken, true);
      
      expect(accessPayload).toBeTruthy();
      expect(accessPayload.userId).toBe(testUser.id);
      expect(accessPayload.email).toBe(testUser.email);
      expect(accessPayload.role).toBe(testUser.role);
      
      expect(refreshPayload).toBeTruthy();
      expect(refreshPayload.userId).toBe(testUser.id);
    });

    test('should reject invalid tokens', () => {
      const invalidToken = 'invalid.token.here';
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      expect(authService.verifyToken(invalidToken)).toBeNull();
      expect(authService.verifyToken(expiredToken)).toBeNull();
    });
  });

  describe('User Registration', () => {
    test('should register new user successfully', async () => {
      const signupData = {
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        firstName: 'New',
        lastName: 'User'
      };

      const result = await authService.signup(signupData);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.token).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.email).toBe(signupData.email.toLowerCase());
      expect(result.user.firstName).toBe(signupData.firstName);
      expect(result.user.lastName).toBe(signupData.lastName);
      expect(result.user.role).toBe('USER');
      expect(result.user.passwordHash).toBeUndefined(); // Should not include password hash
    });

    test('should reject duplicate email registration', async () => {
      const signupData = {
        email: 'duplicate@example.com',
        password: 'Password123!',
        firstName: 'First',
        lastName: 'User'
      };

      // First registration should succeed
      const firstResult = await authService.signup(signupData);
      expect(firstResult.success).toBe(true);

      // Second registration with same email should fail
      const secondResult = await authService.signup({
        ...signupData,
        firstName: 'Second'
      });
      
      expect(secondResult.success).toBe(false);
      expect(secondResult.message).toContain('already exists');
    });

    test('should handle email case insensitivity', async () => {
      const signupData1 = {
        email: 'CaseTest@Example.COM',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const signupData2 = {
        email: 'casetest@example.com',
        password: 'Password123!',
        firstName: 'Test2',
        lastName: 'User2'
      };

      const firstResult = await authService.signup(signupData1);
      expect(firstResult.success).toBe(true);
      expect(firstResult.user.email).toBe('casetest@example.com');

      const secondResult = await authService.signup(signupData2);
      expect(secondResult.success).toBe(false);
    });
  });

  describe('User Authentication', () => {
    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'auth@example.com',
          passwordHash: await authService.hashPassword('AuthPassword123!'),
          firstName: 'Auth',
          lastName: 'User',
          role: 'USER',
          isActive: true
        }
      });
    });

    test('should authenticate user with correct credentials', async () => {
      const loginData = {
        email: 'auth@example.com',
        password: 'AuthPassword123!'
      };

      const result = await authService.login(loginData, 'test-device', '127.0.0.1');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.token).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.email).toBe(loginData.email);
      expect(result.user.passwordHash).toBeUndefined();
      expect(result.user.loginAttempts).toBeUndefined();
      expect(result.user.lockoutUntil).toBeUndefined();
    });

    test('should reject authentication with incorrect password', async () => {
      const loginData = {
        email: 'auth@example.com',
        password: 'WrongPassword123!'
      };

      const result = await authService.login(loginData);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid email or password');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();

      // Check that login attempts were incremented
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser.loginAttempts).toBe(1);
    });

    test('should reject authentication for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      const result = await authService.login(loginData);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid email or password');
    });

    test('should reject authentication for inactive user', async () => {
      // Make user inactive
      await prisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      const loginData = {
        email: 'auth@example.com',
        password: 'AuthPassword123!'
      };

      const result = await authService.login(loginData);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('deactivated');
    });

    test('should handle case insensitive email login', async () => {
      const loginData = {
        email: 'AUTH@EXAMPLE.COM',
        password: 'AuthPassword123!'
      };

      const result = await authService.login(loginData);
      
      expect(result.success).toBe(true);
      expect(result.user.email).toBe('auth@example.com');
    });
  });

  describe('Account Lockout', () => {
    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'lockout@example.com',
          passwordHash: await authService.hashPassword('LockoutPassword123!'),
          firstName: 'Lockout',
          lastName: 'User',
          role: 'USER',
          isActive: true
        }
      });
    });

    test('should lock account after maximum failed login attempts', async () => {
      const loginData = {
        email: 'lockout@example.com',
        password: 'WrongPassword123!'
      };

      // Attempt failed logins up to the max
      for (let i = 0; i < 5; i++) {
        const result = await authService.login(loginData);
        expect(result.success).toBe(false);
      }

      // Check that account is now locked
      const lockedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(lockedUser.loginAttempts).toBe(5);
      expect(lockedUser.lockoutUntil).toBeTruthy();
      expect(lockedUser.lockoutUntil.getTime()).toBeGreaterThan(Date.now());

      // Next login attempt should be rejected due to lockout
      const lockedResult = await authService.login(loginData);
      expect(lockedResult.success).toBe(false);
      expect(lockedResult.message).toContain('temporarily locked');

      // Even correct password should be rejected when locked
      const correctPasswordResult = await authService.login({
        email: 'lockout@example.com',
        password: 'LockoutPassword123!'
      });
      expect(correctPasswordResult.success).toBe(false);
      expect(correctPasswordResult.message).toContain('temporarily locked');
    });

    test('should reset login attempts after successful login', async () => {
      // Make some failed attempts
      for (let i = 0; i < 3; i++) {
        await authService.login({
          email: 'lockout@example.com',
          password: 'WrongPassword123!'
        });
      }

      // Verify attempts were recorded
      let user = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(user.loginAttempts).toBe(3);

      // Successful login should reset attempts
      const result = await authService.login({
        email: 'lockout@example.com',
        password: 'LockoutPassword123!'
      });
      expect(result.success).toBe(true);

      // Verify attempts were reset
      user = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(user.loginAttempts).toBe(0);
      expect(user.lockoutUntil).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    let userSession;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'refresh@example.com',
          passwordHash: await authService.hashPassword('RefreshPassword123!'),
          firstName: 'Refresh',
          lastName: 'User',
          role: 'USER'
        }
      });

      const tokens = authService.generateTokens(testUser);
      userSession = await prisma.userSession.create({
        data: {
          userId: testUser.id,
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          refreshExpiresAt: tokens.refreshExpiresAt
        }
      });
    });

    test('should refresh token successfully', async () => {
      const result = await authService.refreshToken(userSession.refreshToken);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.token).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.token).not.toBe(userSession.token);
      expect(result.refreshToken).not.toBe(userSession.refreshToken);
    });

    test('should reject invalid refresh token', async () => {
      const result = await authService.refreshToken('invalid-refresh-token');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid refresh token');
    });

    test('should reject revoked refresh token', async () => {
      // Revoke the session
      await prisma.userSession.update({
        where: { id: userSession.id },
        data: { isRevoked: true }
      });

      const result = await authService.refreshToken(userSession.refreshToken);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('expired or invalid');
    });
  });

  describe('Logout', () => {
    let userSession;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'logout@example.com',
          passwordHash: await authService.hashPassword('LogoutPassword123!'),
          firstName: 'Logout',
          lastName: 'User',
          role: 'USER'
        }
      });

      const tokens = authService.generateTokens(testUser);
      userSession = await prisma.userSession.create({
        data: {
          userId: testUser.id,
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          refreshExpiresAt: tokens.refreshExpiresAt
        }
      });
    });

    test('should logout successfully', async () => {
      const result = await authService.logout(userSession.token);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Logged out successfully');

      // Verify session is revoked
      const revokedSession = await prisma.userSession.findUnique({
        where: { id: userSession.id }
      });
      expect(revokedSession.isRevoked).toBe(true);
    });
  });

  describe('Get User by Token', () => {
    let userSession;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'getuser@example.com',
          passwordHash: await authService.hashPassword('GetUserPassword123!'),
          firstName: 'GetUser',
          lastName: 'User',
          role: 'USER'
        }
      });

      const tokens = authService.generateTokens(testUser);
      userSession = await prisma.userSession.create({
        data: {
          userId: testUser.id,
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          refreshExpiresAt: tokens.refreshExpiresAt
        }
      });
    });

    test('should get user by valid token', async () => {
      const user = await authService.getUserByToken(userSession.token);
      
      expect(user).toBeTruthy();
      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe(testUser.email);
    });

    test('should return null for invalid token', async () => {
      const user = await authService.getUserByToken('invalid-token');
      
      expect(user).toBeNull();
    });

    test('should return null for revoked session', async () => {
      await prisma.userSession.update({
        where: { id: userSession.id },
        data: { isRevoked: true }
      });

      const user = await authService.getUserByToken(userSession.token);
      
      expect(user).toBeNull();
    });
  });
});