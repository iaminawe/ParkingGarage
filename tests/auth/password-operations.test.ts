/**
 * Comprehensive test suite for password operations
 * Tests password change, reset, and security features
 */

import request from 'supertest';
import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import authService from '../../src/services/authService';
import emailService from '../../src/services/EmailService';
import { app } from '../../src/app';

const prisma = new PrismaClient();

describe('Password Operations', () => {
  let testUser: any;
  let testUserToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test-password@example.com', 'test-reset@example.com']
        }
      }
    });
  });

  beforeEach(async () => {
    // Create a test user for each test
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    testUser = await prisma.user.create({
      data: {
        email: 'test-password@example.com',
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        isActive: true,
        isEmailVerified: true,
      }
    });
    testUserId = testUser.id;

    // Get authentication token
    const loginResult = await authService.login({
      email: 'test-password@example.com',
      password: 'TestPassword123!'
    });
    testUserToken = loginResult.token!;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.userSession.deleteMany({
      where: { userId: testUserId }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test-password@example.com', 'test-reset@example.com']
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Password Change', () => {
    test('should change password with valid current password', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword456!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password changed successfully');

      // Verify the password was actually changed
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      const isNewPasswordValid = await bcrypt.compare('NewPassword456!', updatedUser!.passwordHash);
      expect(isNewPasswordValid).toBe(true);

      // Verify old password no longer works
      const isOldPasswordValid = await bcrypt.compare('TestPassword123!', updatedUser!.passwordHash);
      expect(isOldPasswordValid).toBe(false);
    });

    test('should reject password change with incorrect current password', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Current password is incorrect');
    });

    test('should reject weak passwords', async () => {
      const weakPasswords = [
        'weak',
        '12345678',
        'password',
        'NoNumbers!',
        'nonumbers123',
        'NONLOWERCASE123!',
        'NoSpecialChars123'
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/users/change-password')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            currentPassword: 'TestPassword123!',
            newPassword: weakPassword
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should reject if new password same as current', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'TestPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('New password must be different');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword456!'
        });

      expect(response.status).toBe(401);
    });

    test('should validate required fields', async () => {
      // Missing current password
      let response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          newPassword: 'NewPassword456!'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Current password and new password are required');

      // Missing new password
      response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          currentPassword: 'TestPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Current password and new password are required');
    });

    test('should invalidate all user sessions after password change', async () => {
      // Create multiple sessions
      const session2 = await authService.login({
        email: 'test-password@example.com',
        password: 'TestPassword123!'
      });

      // Verify both sessions are active
      let activeSessions = await prisma.userSession.count({
        where: {
          userId: testUserId,
          isRevoked: false,
          expiresAt: { gt: new Date() }
        }
      });
      expect(activeSessions).toBeGreaterThanOrEqual(2);

      // Change password
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword456!'
        });

      expect(response.status).toBe(200);

      // All sessions should be revoked
      activeSessions = await prisma.userSession.count({
        where: {
          userId: testUserId,
          isRevoked: false,
          expiresAt: { gt: new Date() }
        }
      });
      expect(activeSessions).toBe(0);
    });
  });

  describe('Password Reset Request', () => {
    test('should send password reset email for valid user', async () => {
      const emailSendSpy = jest.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/users/request-password-reset')
        .send({
          email: 'test-password@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');

      // Verify reset token was created
      const updatedUser = await prisma.user.findUnique({
        where: { email: 'test-password@example.com' }
      });
      expect(updatedUser!.passwordResetToken).toBeTruthy();
      expect(updatedUser!.passwordResetExpires).toBeTruthy();
      expect(updatedUser!.passwordResetExpires!.getTime()).toBeGreaterThan(Date.now());

      emailSendSpy.mockRestore();
    });

    test('should not reveal if email exists (security)', async () => {
      const response = await request(app)
        .post('/api/users/request-password-reset')
        .send({
          email: 'nonexistent@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });

    test('should require email field', async () => {
      const response = await request(app)
        .post('/api/users/request-password-reset')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email is required');
    });
  });

  describe('Password Reset Confirmation', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Generate and set reset token
      resetToken = 'test-reset-token-' + Date.now();
      const tokenHash = await bcrypt.hash(resetToken, 12);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: testUserId },
        data: {
          passwordResetToken: tokenHash,
          passwordResetExpires: expiresAt,
        }
      });
    });

    test('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: resetToken,
          newPassword: 'ResetPassword789!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset successfully');

      // Verify password was changed
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      const isNewPasswordValid = await bcrypt.compare('ResetPassword789!', updatedUser!.passwordHash);
      expect(isNewPasswordValid).toBe(true);

      // Verify reset token was cleared
      expect(updatedUser!.passwordResetToken).toBeNull();
      expect(updatedUser!.passwordResetExpires).toBeNull();
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'ResetPassword789!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired password reset token');
    });

    test('should reject expired token', async () => {
      // Set token as expired
      await prisma.user.update({
        where: { id: testUserId },
        data: {
          passwordResetExpires: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        }
      });

      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: resetToken,
          newPassword: 'ResetPassword789!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired password reset token');
    });

    test('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: resetToken,
          newPassword: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should require both token and password', async () => {
      // Missing token
      let response = await request(app)
        .post('/api/users/reset-password')
        .send({
          newPassword: 'ResetPassword789!'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Reset token and new password are required');

      // Missing password
      response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: resetToken
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Reset token and new password are required');
    });

    test('should revoke all sessions after password reset', async () => {
      // Create an additional session
      await authService.login({
        email: 'test-password@example.com',
        password: 'TestPassword123!'
      });

      // Verify sessions exist
      let activeSessions = await prisma.userSession.count({
        where: {
          userId: testUserId,
          isRevoked: false,
          expiresAt: { gt: new Date() }
        }
      });
      expect(activeSessions).toBeGreaterThan(0);

      // Reset password
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: resetToken,
          newPassword: 'ResetPassword789!'
        });

      expect(response.status).toBe(200);

      // All sessions should be revoked
      activeSessions = await prisma.userSession.count({
        where: {
          userId: testUserId,
          isRevoked: false,
          expiresAt: { gt: new Date() }
        }
      });
      expect(activeSessions).toBe(0);
    });
  });

  describe('Rate Limiting', () => {
    test('should rate limit password change attempts', async () => {
      const promises = [];
      
      // Make 10 password change attempts (should exceed rate limit)
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/users/change-password')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({
              currentPassword: 'TestPassword123!',
              newPassword: `NewPassword${i}!`
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should rate limit password reset requests', async () => {
      const promises = [];
      
      // Make 10 reset requests (should exceed rate limit)
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/users/request-password-reset')
            .send({
              email: 'test-password@example.com'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Logging', () => {
    test('should log password change events', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword456!'
        });

      expect(response.status).toBe(200);

      // Check audit log
      const auditLogs = await prisma.securityAuditLog.findMany({
        where: {
          userId: testUserId,
          action: 'PASSWORD_CHANGED'
        }
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });

    test('should log failed password change attempts', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!'
        });

      expect(response.status).toBe(400);

      // Check audit log for failed attempt
      const auditLogs = await prisma.securityAuditLog.findMany({
        where: {
          userId: testUserId,
          action: 'PASSWORD_CHANGE_FAILED'
        }
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });

    test('should log password reset events', async () => {
      // Request password reset
      await request(app)
        .post('/api/users/request-password-reset')
        .send({
          email: 'test-password@example.com'
        });

      // Check audit log
      const auditLogs = await prisma.securityAuditLog.findMany({
        where: {
          userId: testUserId,
          action: 'PASSWORD_RESET_REQUESTED'
        }
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });
});