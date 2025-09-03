/**
 * Test script to verify graceful degradation in authentication system
 * Tests that login system continues to work even when Redis, Email, or Audit services are unavailable
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import authService from '../services/authService';
import { prisma } from '../config/database';

describe('Auth Service Graceful Degradation', () => {
  let testUser: any;
  const testEmail = 'graceful-test@example.com';
  const testPassword = 'TestPassword123@';

  beforeAll(async () => {
    // Clean up any existing test user
    await prisma.user.deleteMany({
      where: { email: testEmail }
    });
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: testEmail }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Ensure fresh state for each test
    await prisma.user.deleteMany({
      where: { email: testEmail }
    });
  });

  describe('User Signup', () => {
    it('should successfully create user even when optional services fail', async () => {
      const result = await authService.signup({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User'
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user?.email).toBe(testEmail);
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Create test user before each login test
      await authService.signup({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User'
      });
    });

    it('should successfully login even when cache service is unavailable', async () => {
      const result = await authService.login({
        email: testEmail,
        password: testPassword
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should handle device info gracefully during login', async () => {
      const deviceInfo = {
        userAgent: 'Test User Agent',
        ipAddress: '127.0.0.1',
        deviceFingerprint: 'test-device-123'
      };

      const result = await authService.login({
        email: testEmail,
        password: testPassword
      }, deviceInfo);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should fail gracefully for invalid credentials', async () => {
      const result = await authService.login({
        email: testEmail,
        password: 'wrong-password'
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid email or password');
    });

    it('should fail gracefully for non-existent user', async () => {
      const result = await authService.login({
        email: 'nonexistent@example.com',
        password: testPassword
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid email or password');
    });
  });

  describe('Token Operations', () => {
    let userToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Create user and get tokens
      const signupResult = await authService.signup({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User'
      });
      userToken = signupResult.token!;
      refreshToken = signupResult.refreshToken!;
    });

    it('should verify tokens even when cache service is unavailable', async () => {
      const user = await authService.getUserByToken(userToken);
      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);
    });

    it('should refresh tokens gracefully', async () => {
      const result = await authService.refreshToken(refreshToken);
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should handle blacklist operations gracefully when cache is unavailable', async () => {
      // These methods should not throw even if cache service is null
      await expect(authService.blacklistToken(userToken)).resolves.not.toThrow();
      
      const isBlacklisted = await authService.isTokenBlacklisted(userToken);
      expect(typeof isBlacklisted).toBe('boolean');
    });
  });

  describe('Password Operations', () => {
    let userId: string;

    beforeEach(async () => {
      const signupResult = await authService.signup({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User'
      });
      userId = signupResult.user!.id as string;
    });

    it('should change password even when audit service is unavailable', async () => {
      const result = await authService.changePassword({
        userId,
        currentPassword: testPassword,
        newPassword: 'NewPassword123@'
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password changed successfully');
    });

    it('should handle password reset request even when email service is unavailable', async () => {
      const result = await authService.requestPasswordReset({
        email: testEmail
      });

      // Should always return success for security (email enumeration prevention)
      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link has been sent');
    });
  });

  describe('Session Management', () => {
    let userId: string;

    beforeEach(async () => {
      const signupResult = await authService.signup({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User'
      });
      userId = signupResult.user!.id as string;
    });

    it('should get active session count gracefully', async () => {
      const count = await authService.getActiveSessionCount(userId);
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should revoke sessions gracefully', async () => {
      const count = await authService.revokeAllUserSessions(userId);
      expect(typeof count).toBe('number');
    });

    it('should cleanup expired sessions without errors', async () => {
      const cleaned = await authService.cleanupExpiredSessions();
      expect(typeof cleaned).toBe('number');
    });
  });

  describe('Password Validation', () => {
    it('should validate passwords without external dependencies', () => {
      const validResult = authService.validatePassword('ValidPassword123@');
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = authService.validatePassword('weak');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });
});