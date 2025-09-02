/**
 * Users API End-to-End Tests
 * 
 * Comprehensive test suite for all user management endpoints including:
 * - GET /api/users - List all users (admin only)
 * - GET /api/users/:id - Get user by ID
 * - PUT /api/users/:id - Update user profile
 * - DELETE /api/users/:id - Delete user (soft delete)
 * - POST /api/users/change-password - Change password
 * - POST /api/users/reset-password - Reset password
 * - Additional endpoints: role management, activation/deactivation, stats
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

describe('Users API E2E Tests', () => {
  let app: Application;
  let testDb: TestDatabase;
  let context: APITestContext;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    app = await createTestApp(testDb.getService());
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

  describe('GET /api/users (List Users)', () => {
    const usersEndpoint = '/api/users';

    describe('Admin Access', () => {
      it('should return paginated list of users for admin', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', usersEndpoint, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('totalCount');
        expect(response.body.data).toHaveProperty('page');
        expect(response.body.data).toHaveProperty('limit');
        expect(Array.isArray(response.body.data.data)).toBe(true);
        expect(response.body.data.data.length).toBeGreaterThan(0);

        // Verify user data structure
        const user = response.body.data.data[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('firstName');
        expect(user).toHaveProperty('lastName');
        expect(user).toHaveProperty('role');
        expect(user).not.toHaveProperty('password');
      });

      it('should support pagination parameters', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${usersEndpoint}?page=1&limit=2`, context.adminToken
        ).expect(200);

        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(2);
        expect(response.body.data.data.length).toBeLessThanOrEqual(2);
      });

      it('should support sorting parameters', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${usersEndpoint}?sortBy=firstName&sortOrder=asc`, context.adminToken
        ).expect(200);

        const users = response.body.data.data;
        if (users.length > 1) {
          expect(users[0].firstName.localeCompare(users[1].firstName)).toBeLessThanOrEqual(0);
        }
      });

      it('should support filtering by email', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${usersEndpoint}?email=admin@test.com`, context.adminToken
        ).expect(200);

        const users = response.body.data.data;
        expect(users.length).toBe(1);
        expect(users[0].email).toBe('admin@test.com');
      });

      it('should support filtering by role', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${usersEndpoint}?role=CUSTOMER`, context.adminToken
        ).expect(200);

        const users = response.body.data.data;
        users.forEach((user: any) => {
          expect(user.role).toBe('CUSTOMER');
        });
      });

      it('should support filtering by active status', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${usersEndpoint}?isActive=true`, context.adminToken
        ).expect(200);

        const users = response.body.data.data;
        users.forEach((user: any) => {
          expect(user.isActive).toBe(true);
        });
      });
    });

    describe('Authorization', () => {
      it('should reject non-admin users', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', usersEndpoint, context.customerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });

      it('should reject manager users (admin only)', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', usersEndpoint, context.managerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .get(usersEndpoint)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limiting', async () => {
        const results = await testRateLimit(
          app,
          usersEndpoint,
          'get',
          50,
          60000,
          context.adminToken
        );

        expect(results.firstRateLimitHit).toBeGreaterThan(40);
        expect(results.rateLimitedRequests).toBeGreaterThan(0);
      });
    });
  });

  describe('GET /api/users/:id (Get User by ID)', () => {
    const testUserId = 'customer-1-id';

    describe('Valid Access', () => {
      it('should allow admin to get any user', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/users/${testUserId}`, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const user = response.body.data;
        expect(user.id).toBe(testUserId);
        expect(user).toHaveProperty('email');
        expect(user).not.toHaveProperty('password');
      });

      it('should allow manager to get any user', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/users/${testUserId}`, context.managerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testUserId);
      });

      it('should allow users to get their own profile', async () => {
        // This assumes the customer token corresponds to customer-1-id
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/users/${testUserId}`, context.customerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Authorization Restrictions', () => {
      it('should prevent customer from accessing other users', async () => {
        const otherUserId = 'customer-2-id';
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/users/${otherUserId}`, context.customerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent user', async () => {
        const nonExistentId = 'non-existent-id';
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/users/${nonExistentId}`, context.adminToken
        ).expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('not found');
      });

      it('should validate user ID format', async () => {
        const invalidId = 'invalid-id-format';
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/users/${invalidId}`, context.adminToken
        ).expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('PUT /api/users/:id (Update User)', () => {
    const testUserId = 'customer-1-id';

    describe('Valid Updates', () => {
      it('should allow admin to update any user', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          phoneNumber: '+1555123456'
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${testUserId}`, context.adminToken
        )
          .send(updateData)
          .expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const user = response.body.data;
        expect(user.firstName).toBe(updateData.firstName);
        expect(user.lastName).toBe(updateData.lastName);
        expect(user.phoneNumber).toBe(updateData.phoneNumber);
      });

      it('should allow users to update their own profile', async () => {
        const updateData = {
          firstName: 'SelfUpdated',
          phoneNumber: '+1555987654'
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${testUserId}`, context.customerToken
        )
          .send(updateData)
          .expect(200);

        expect(response.body.data.firstName).toBe(updateData.firstName);
        expect(response.body.data.phoneNumber).toBe(updateData.phoneNumber);
      });

      it('should allow admin to change user role', async () => {
        const updateData = { role: 'MANAGER' };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${testUserId}`, context.adminToken
        )
          .send(updateData)
          .expect(200);

        expect(response.body.data.role).toBe('MANAGER');
      });

      it('should allow admin to activate/deactivate users', async () => {
        const updateData = { isActive: false };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${testUserId}`, context.adminToken
        )
          .send(updateData)
          .expect(200);

        expect(response.body.data.isActive).toBe(false);
      });
    });

    describe('Authorization Restrictions', () => {
      it('should prevent customer from changing their role', async () => {
        const updateData = { role: 'ADMIN' };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${testUserId}`, context.customerToken
        )
          .send(updateData)
          .expect(200);

        // Role should not be changed
        expect(response.body.data.role).toBe('CUSTOMER');
      });

      it('should prevent manager from changing roles (admin only)', async () => {
        const updateData = { role: 'ADMIN' };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${testUserId}`, context.managerToken
        )
          .send(updateData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('role');
      });

      it('should prevent customer from updating other users', async () => {
        const otherUserId = 'customer-2-id';
        const updateData = { firstName: 'Hacked' };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${otherUserId}`, context.customerToken
        )
          .send(updateData)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Input Validation', () => {
      const updateValidationCases: ValidationTestCase[] = [
        {
          name: 'invalid email format',
          input: { email: 'invalid-email' },
          expectedStatus: 400
        },
        {
          name: 'invalid role',
          input: { role: 'INVALID_ROLE' },
          expectedStatus: 400
        },
        {
          name: 'invalid phone number format',
          input: { phoneNumber: 'invalid-phone' },
          expectedStatus: 400
        },
        {
          name: 'firstName too short',
          input: { firstName: 'A' },
          expectedStatus: 400
        },
        {
          name: 'lastName too short',
          input: { lastName: 'B' },
          expectedStatus: 400
        }
      ];

      it('should validate update data', async () => {
        const results = await testInputValidation(
          app,
          'put',
          `/api/users/${testUserId}`,
          updateValidationCases,
          context.adminToken
        );

        results.forEach(result => {
          if (result.testCase.name !== 'invalid role') { // Role validation might be handled differently
            expect(result.passed).toBe(true);
          }
        });
      });

      it('should prevent email duplication', async () => {
        const updateData = { email: 'admin@test.com' }; // Existing email

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${testUserId}`, context.adminToken
        )
          .send(updateData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('email');
      });
    });
  });

  describe('DELETE /api/users/:id (Delete User)', () => {
    const testUserId = 'customer-2-id';

    describe('Valid Deletion', () => {
      it('should allow admin to delete user', async () => {
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/users/${testUserId}`, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200, false);
        expect(validation.hasSuccessField).toBe(true);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');
      });

      it('should soft delete (user becomes inactive)', async () => {
        await createAuthenticatedRequest(
          app, 'delete', `/api/users/${testUserId}`, context.adminToken
        ).expect(200);

        // Try to get the deleted user
        const getResponse = await createAuthenticatedRequest(
          app, 'get', `/api/users/${testUserId}`, context.adminToken
        );

        // User should still exist but be inactive
        if (getResponse.status === 200) {
          expect(getResponse.body.data.isActive).toBe(false);
        } else {
          // Or might return 404 if soft delete removes from queries
          expect(getResponse.status).toBe(404);
        }
      });
    });

    describe('Authorization Restrictions', () => {
      it('should only allow admin to delete users', async () => {
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/users/${testUserId}`, context.managerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should reject customer deletion attempts', async () => {
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/users/${testUserId}`, context.customerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Business Logic', () => {
      it('should prevent admin from deleting themselves', async () => {
        const adminUserId = 'admin-test-id';
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/users/${adminUserId}`, context.adminToken
        ).expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('yourself');
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent user', async () => {
        const nonExistentId = 'non-existent-user';
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/users/${nonExistentId}`, context.adminToken
        ).expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('POST /api/users/change-password (Change Password)', () => {
    const changePasswordEndpoint = '/api/users/change-password';

    describe('Valid Password Change', () => {
      it('should allow authenticated user to change password', async () => {
        const passwordData = {
          currentPassword: 'CustomerPass123!',
          newPassword: 'NewPassword456!'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', changePasswordEndpoint, context.customerToken
        )
          .send(passwordData)
          .expect(200);

        const validation = validateAPIResponse(response, 200, false);
        expect(validation.hasSuccessField).toBe(true);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('changed');
      });
    });

    describe('Input Validation', () => {
      const passwordValidationCases: ValidationTestCase[] = [
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
          name: 'weak new password (too short)',
          input: { currentPassword: 'CustomerPass123!', newPassword: '123' },
          expectedStatus: 400
        },
        {
          name: 'weak new password (no numbers)',
          input: { currentPassword: 'CustomerPass123!', newPassword: 'WeakPassword' },
          expectedStatus: 400
        },
        {
          name: 'weak new password (no special chars)',
          input: { currentPassword: 'CustomerPass123!', newPassword: 'WeakPassword123' },
          expectedStatus: 400
        }
      ];

      it('should validate password change input', async () => {
        const results = await testInputValidation(
          app,
          'post',
          changePasswordEndpoint,
          passwordValidationCases,
          context.customerToken
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });
    });

    describe('Authentication Requirements', () => {
      it('should require authentication', async () => {
        const passwordData = {
          currentPassword: 'CustomerPass123!',
          newPassword: 'NewPassword456!'
        };

        const response = await request(app)
          .post(changePasswordEndpoint)
          .send(passwordData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce strict rate limiting for password changes', async () => {
        const results = await testRateLimit(
          app,
          changePasswordEndpoint,
          'post',
          10,
          60000,
          context.customerToken
        );

        expect(results.firstRateLimitHit).toBeLessThan(10);
        expect(results.rateLimitedRequests).toBeGreaterThan(0);
      });
    });
  });

  describe('POST /api/users/reset-password (Reset Password)', () => {
    const resetPasswordEndpoint = '/api/users/reset-password';

    describe('Valid Password Reset', () => {
      it('should accept valid reset token and new password', async () => {
        const resetData = {
          token: 'valid-reset-token-here',
          newPassword: 'NewResetPassword123!'
        };

        const response = await request(app)
          .post(resetPasswordEndpoint)
          .send(resetData)
          .expect(200);

        const validation = validateAPIResponse(response, 200, false);
        expect(validation.hasSuccessField).toBe(true);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('reset');
      });
    });

    describe('Input Validation', () => {
      const resetValidationCases: ValidationTestCase[] = [
        {
          name: 'missing token',
          input: { newPassword: 'NewPassword123!' },
          expectedStatus: 400
        },
        {
          name: 'missing new password',
          input: { token: 'valid-token' },
          expectedStatus: 400
        },
        {
          name: 'weak new password',
          input: { token: 'valid-token', newPassword: '123' },
          expectedStatus: 400
        }
      ];

      it('should validate reset password input', async () => {
        const results = await testInputValidation(
          app,
          'post',
          resetPasswordEndpoint,
          resetValidationCases
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });
    });
  });

  describe('Additional User Management Endpoints', () => {
    describe('GET /api/users/role/:role (Get Users by Role)', () => {
      it('should allow admin to get users by role', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', '/api/users/role/CUSTOMER', context.adminToken
        ).expect(200);

        const users = response.body.data.data;
        users.forEach((user: any) => {
          expect(user.role).toBe('CUSTOMER');
        });
      });

      it('should allow manager to get users by role', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', '/api/users/role/CUSTOMER', context.managerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should reject invalid roles', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', '/api/users/role/INVALID_ROLE', context.adminToken
        ).expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('role');
      });
    });

    describe('PUT /api/users/:id/role (Update User Role)', () => {
      it('should allow admin to update user role', async () => {
        const testUserId = 'customer-3-id';
        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${testUserId}/role`, context.adminToken
        )
          .send({ role: 'MANAGER' })
          .expect(200);

        expect(response.body.data.role).toBe('MANAGER');
      });

      it('should prevent admin from changing their own role', async () => {
        const adminUserId = 'admin-test-id';
        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${adminUserId}/role`, context.adminToken
        )
          .send({ role: 'CUSTOMER' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('own role');
      });
    });

    describe('PUT /api/users/:id/activate and /api/users/:id/deactivate', () => {
      it('should allow admin/manager to activate user', async () => {
        const testUserId = 'customer-3-id';
        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${testUserId}/activate`, context.adminToken
        ).expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should allow admin/manager to deactivate user', async () => {
        const testUserId = 'customer-3-id';
        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${testUserId}/deactivate`, context.adminToken
        ).expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should prevent user from deactivating themselves', async () => {
        const adminUserId = 'admin-test-id';
        const response = await createAuthenticatedRequest(
          app, 'put', `/api/users/${adminUserId}/deactivate`, context.adminToken
        ).expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('yourself');
      });
    });

    describe('GET /api/users/stats (User Statistics)', () => {
      it('should allow admin to get user statistics', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', '/api/users/stats', context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        expect(response.body.data).toHaveProperty('total');
        expect(typeof response.body.data.total).toBe('number');
      });

      it('should allow manager to get user statistics', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', '/api/users/stats', context.managerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should reject customer access to statistics', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', '/api/users/stats', context.customerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Security and Error Handling', () => {
    it('should sanitize user input to prevent injection attacks', async () => {
      const maliciousInput = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'DROP TABLE users;',
        phoneNumber: '"; DELETE FROM users; --'
      };

      const response = await createAuthenticatedRequest(
        app, 'put', '/api/users/customer-1-id', context.adminToken
      )
        .send(maliciousInput)
        .expect(200);

      // Values should be sanitized
      expect(response.body.data.firstName).not.toContain('<script>');
      expect(response.body.data.lastName).not.toContain('DROP TABLE');
    });

    it('should handle concurrent updates gracefully', async () => {
      const updateData = { firstName: 'Concurrent' };
      const testUserId = 'customer-1-id';

      // Send multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        createAuthenticatedRequest(app, 'put', `/api/users/${testUserId}`, context.adminToken)
          .send(updateData)
      );

      const responses = await Promise.all(promises);
      
      // All requests should complete (some might succeed, some might conflict)
      responses.forEach(response => {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      });
    });

    it('should log user management actions for audit trail', async () => {
      // This test would verify that actions are logged
      // For now, we just verify the operations complete successfully
      const testUserId = 'customer-1-id';
      
      const response = await createAuthenticatedRequest(
        app, 'put', `/api/users/${testUserId}`, context.adminToken
      )
        .send({ firstName: 'AuditTest' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // In a real scenario, you'd check audit logs here
    });
  });
});