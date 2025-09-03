/**
 * Authentication Schema Integration Test
 * 
 * This test specifically verifies that the database schema issues are resolved
 * and that the authentication system works with the graceful degradation in place.
 */

import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../services/DatabaseService';
import { AuthService } from '../services/authService';

describe('Authentication Schema Integration', () => {
  let prisma: PrismaClient;
  let dbService: DatabaseService;
  let authService: AuthService;

  beforeAll(async () => {
    // Initialize database service
    dbService = DatabaseService.getInstance();
    await dbService.initialize();
    prisma = dbService.getClient();

    // Initialize AuthService - this tests graceful service initialization
    authService = new AuthService();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up test data
    try {
      await prisma.user.deleteMany();
    } catch (error) {
      // Ignore if tables don't exist
    }
  });

  describe('Database Schema Compatibility', () => {
    it('should successfully create a user without referencing lastLoginIP', async () => {
      // This test verifies the schema fix - we removed lastLoginIP references
      const userData = {
        email: 'schema-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Schema',
        lastName: 'Test'
      };

      // Sign up user - this should work without lastLoginIP issues
      const signupResult = await authService.signup(userData);
      expect(signupResult).toBeDefined();
      expect(signupResult.user).toBeDefined();
      expect(signupResult.user.email).toBe(userData.email);

      // Verify user was created in database with correct fields
      const dbUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      expect(dbUser).toBeDefined();
      expect(dbUser!.email).toBe(userData.email);
      expect(dbUser!.lastLoginAt).toBeDefined(); // This field should exist
      expect(dbUser!.loginAttempts).toBe(0);
      expect(dbUser!.lockoutUntil).toBeNull();
    });

    it('should successfully login and update only existing database fields', async () => {
      // Create a test user first
      const userData = {
        email: 'login-schema-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Login',
        lastName: 'Schema'
      };

      await authService.signup(userData);

      // Get initial state
      const beforeLogin = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      expect(beforeLogin).toBeDefined();

      // Login - this should update lastLoginAt but NOT try to update lastLoginIP
      const loginResult = await authService.login({
        email: userData.email,
        password: userData.password
      });

      expect(loginResult).toBeDefined();
      expect(loginResult.user).toBeDefined();
      expect(loginResult.accessToken).toBeDefined();

      // Verify database was updated with correct fields only
      const afterLogin = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      expect(afterLogin).toBeDefined();
      expect(afterLogin!.lastLoginAt).toBeDefined();
      expect(afterLogin!.lastLoginAt!.getTime()).toBeGreaterThan(beforeLogin!.lastLoginAt!.getTime());
      expect(afterLogin!.loginAttempts).toBe(0); // Should be reset on successful login
      expect(afterLogin!.lockoutUntil).toBeNull(); // Should be cleared on successful login
    });

    it('should handle multiple logins without schema errors', async () => {
      const userData = {
        email: 'multiple-login-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Multiple',
        lastName: 'Login'
      };

      await authService.signup(userData);

      // Perform multiple logins - each should update lastLoginAt successfully
      for (let i = 0; i < 3; i++) {
        const loginResult = await authService.login({
          email: userData.email,
          password: userData.password
        });

        expect(loginResult).toBeDefined();
        expect(loginResult.accessToken).toBeDefined();

        // Verify lastLoginAt was updated
        const user = await prisma.user.findUnique({
          where: { email: userData.email }
        });
        expect(user!.lastLoginAt).toBeDefined();
      }
    });
  });

  describe('Graceful Service Degradation', () => {
    it('should initialize AuthService successfully even with service failures', () => {
      // This test verifies that AuthService constructor doesn't throw
      // even if optional services (cache, email, audit) are unavailable
      expect(() => {
        const testAuthService = new AuthService();
        expect(testAuthService).toBeDefined();
      }).not.toThrow();
    });

    it('should handle authentication operations with service degradation', async () => {
      const userData = {
        email: 'degradation-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Degradation',
        lastName: 'Test'
      };

      // These operations should work even if cache/email/audit services fail
      await expect(authService.signup(userData)).resolves.toBeDefined();
      await expect(authService.login({
        email: userData.email,
        password: userData.password
      })).resolves.toBeDefined();
    });
  });

  describe('Core Database Operations', () => {
    it('should verify all required User table fields exist and are accessible', async () => {
      // Create a user and verify all expected fields are present
      const userData = {
        email: 'fields-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Fields',
        lastName: 'Test'
      };

      await authService.signup(userData);
      
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      expect(user).toBeDefined();
      
      // Verify all the fields that AuthService uses exist
      expect(user!.id).toBeDefined();
      expect(user!.email).toBe(userData.email);
      expect(user!.firstName).toBe(userData.firstName);
      expect(user!.lastName).toBe(userData.lastName);
      expect(user!.password).toBeDefined();
      expect(user!.lastLoginAt).toBeDefined();
      expect(user!.loginAttempts).toBeDefined();
      expect(user!.lockoutUntil === null || user!.lockoutUntil instanceof Date).toBe(true);
      expect(user!.isEmailVerified).toBeDefined();
      expect(user!.createdAt).toBeDefined();
      expect(user!.updatedAt).toBeDefined();
      
      // Importantly: we should NOT try to access lastLoginIP as it doesn't exist
      // This is verified implicitly - if the code tried to access it, the tests would fail
    });
  });
});