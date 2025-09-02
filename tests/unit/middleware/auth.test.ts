import { Request, Response, NextFunction } from 'express';
import {
  authenticate,
  authorize,
  requirePermission,
  requireRoleLevel,
  enforceSessionLimit,
  optionalAuth,
  adminOnly,
  managerOrAdmin,
  operatorOrHigher,
  authenticatedUsers,
  hasRole,
  hasAnyRole,
  isAdmin,
  isManagerOrHigher,
  userHasPermission,
  getUserRoleLevel
} from '@/middleware/auth';
import { TestUtils } from '@tests/helpers/test-utils';
import { testDb } from '@tests/helpers/test-database';
import authService from '@/services/authService';
import { USER_ROLES, HTTP_STATUS, API_RESPONSES } from '@/config/constants';

// Mock dependencies
jest.mock('@/services/authService');
jest.mock('@/config/constants', () => ({
  API_RESPONSES: {
    ERRORS: {
      TOKEN_REQUIRED: 'Authentication token required',
      INVALID_TOKEN: 'Invalid or expired token',
      ACCOUNT_DEACTIVATED: 'Account has been deactivated',
      INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
      INTERNAL_ERROR: 'Internal server error'
    }
  },
  HTTP_STATUS: {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    INTERNAL_SERVER_ERROR: 500
  },
  SECURITY: {
    BEARER_PREFIX: 'Bearer '
  },
  USER_ROLES: {
    USER: 'USER',
    OPERATOR: 'OPERATOR',
    MANAGER: 'MANAGER',
    ADMIN: 'ADMIN'
  },
  UTILS: {
    hasPermission: jest.fn(),
    hasRoleLevel: jest.fn()
  }
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = TestUtils.createMockResponse();
    nextFunction = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    it('should authenticate user with valid token', async () => {
      const testUser = await testDb.createTestUser({ isActive: true });
      const token = 'valid-jwt-token';

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockAuthService.isTokenBlacklisted.mockResolvedValue(false);
      mockAuthService.getUserByToken.mockResolvedValue(testUser);

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockAuthService.isTokenBlacklisted).toHaveBeenCalledWith(token);
      expect(mockAuthService.getUserByToken).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toBe(testUser);
      expect((mockRequest as any).token).toBe(token);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      mockRequest.headers = {};

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: API_RESPONSES.ERRORS.TOKEN_REQUIRED
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with empty token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer '
      };

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: API_RESPONSES.ERRORS.TOKEN_REQUIRED
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject blacklisted token', async () => {
      const token = 'blacklisted-token';

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockAuthService.isTokenBlacklisted.mockResolvedValue(true);

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: API_RESPONSES.ERRORS.INVALID_TOKEN
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      const token = 'invalid-token';

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockAuthService.isTokenBlacklisted.mockResolvedValue(false);
      mockAuthService.getUserByToken.mockResolvedValue(null);

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: API_RESPONSES.ERRORS.INVALID_TOKEN
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject inactive user', async () => {
      const testUser = await testDb.createTestUser({ isActive: false });
      const token = 'valid-token';

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockAuthService.isTokenBlacklisted.mockResolvedValue(false);
      mockAuthService.getUserByToken.mockResolvedValue(testUser);

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: API_RESPONSES.ERRORS.ACCOUNT_DEACTIVATED
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle token without Bearer prefix', async () => {
      const testUser = await testDb.createTestUser({ isActive: true });
      const token = 'valid-token-without-bearer';

      mockRequest.headers = {
        authorization: token
      };

      mockAuthService.isTokenBlacklisted.mockResolvedValue(false);
      mockAuthService.getUserByToken.mockResolvedValue(testUser);

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockAuthService.getUserByToken).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toBe(testUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle authentication service errors', async () => {
      const token = 'token';
      
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockAuthService.isTokenBlacklisted.mockRejectedValue(new Error('Service unavailable'));

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    it('should allow user with correct role', () => {
      const testUser = { role: 'ADMIN' } as any;
      mockRequest.user = testUser;

      const middleware = authorize(['ADMIN']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow user with any of the allowed roles', () => {
      const testUser = { role: 'MANAGER' } as any;
      mockRequest.user = testUser;

      const middleware = authorize(['MANAGER', 'ADMIN']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject user with insufficient role', () => {
      const testUser = { role: 'USER' } as any;
      mockRequest.user = testUser;

      const middleware = authorize(['ADMIN']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      mockRequest.user = undefined;

      const middleware = authorize(['ADMIN']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: API_RESPONSES.ERRORS.TOKEN_REQUIRED
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle authorization errors gracefully', () => {
      // Mock an error by setting user to an invalid object
      mockRequest.user = null as any;

      const middleware = authorize(['ADMIN']);
      
      // This should not throw, but handle the error gracefully
      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }).not.toThrow();
    });
  });

  describe('requirePermission middleware', () => {
    const mockUtils = require('@/config/constants').UTILS;

    it('should allow user with required permission', () => {
      const testUser = { role: 'ADMIN' } as any;
      mockRequest.user = testUser;

      mockUtils.hasPermission.mockReturnValue(true);

      const middleware = requirePermission('users:manage');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUtils.hasPermission).toHaveBeenCalledWith('ADMIN', 'users:manage');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject user without required permission', () => {
      const testUser = { role: 'USER' } as any;
      mockRequest.user = testUser;

      mockUtils.hasPermission.mockReturnValue(false);

      const middleware = requirePermission('users:manage');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      mockRequest.user = undefined;

      const middleware = requirePermission('users:manage');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireRoleLevel middleware', () => {
    const mockUtils = require('@/config/constants').UTILS;

    it('should allow user with sufficient role level', () => {
      const testUser = { role: 'ADMIN' } as any;
      mockRequest.user = testUser;

      mockUtils.hasRoleLevel.mockReturnValue(true);

      const middleware = requireRoleLevel('MANAGER');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUtils.hasRoleLevel).toHaveBeenCalledWith('ADMIN', 'MANAGER');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject user with insufficient role level', () => {
      const testUser = { role: 'USER' } as any;
      mockRequest.user = testUser;

      mockUtils.hasRoleLevel.mockReturnValue(false);

      const middleware = requireRoleLevel('MANAGER');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('enforceSessionLimit middleware', () => {
    it('should allow request when session limit not exceeded', async () => {
      const testUser = { id: 'user-123', role: 'USER' } as any;
      mockRequest.user = testUser;

      mockAuthService.getActiveSessionCount.mockResolvedValue(3);

      const middleware = enforceSessionLimit(5);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockAuthService.getActiveSessionCount).toHaveBeenCalledWith('user-123');
      expect(mockAuthService.revokeOldestSession).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should revoke oldest session when limit exceeded', async () => {
      const testUser = { id: 'user-123', role: 'USER' } as any;
      mockRequest.user = testUser;

      mockAuthService.getActiveSessionCount.mockResolvedValue(6);
      mockAuthService.revokeOldestSession.mockResolvedValue(undefined);

      const middleware = enforceSessionLimit(5);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockAuthService.getActiveSessionCount).toHaveBeenCalledWith('user-123');
      expect(mockAuthService.revokeOldestSession).toHaveBeenCalledWith('user-123');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue on session service error', async () => {
      const testUser = { id: 'user-123', role: 'USER' } as any;
      mockRequest.user = testUser;

      mockAuthService.getActiveSessionCount.mockRejectedValue(new Error('Service error'));

      const middleware = enforceSessionLimit(5);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue when no user present', async () => {
      mockRequest.user = undefined;

      const middleware = enforceSessionLimit(5);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockAuthService.getActiveSessionCount).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    it('should add user to request when valid token provided', async () => {
      const testUser = { id: 'user-123', isActive: true } as any;
      const token = 'valid-token';

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockAuthService.getUserByToken.mockResolvedValue(testUser);

      await optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockAuthService.getUserByToken).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toBe(testUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue without user when no token provided', async () => {
      mockRequest.headers = {};

      await optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue without user when invalid token provided', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockAuthService.getUserByToken.mockResolvedValue(null);

      await optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue without user when user is inactive', async () => {
      const inactiveUser = { id: 'user-123', isActive: false } as any;
      
      mockRequest.headers = {
        authorization: 'Bearer token'
      };

      mockAuthService.getUserByToken.mockResolvedValue(inactiveUser);

      await optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue on authentication error', async () => {
      mockRequest.headers = {
        authorization: 'Bearer token'
      };

      mockAuthService.getUserByToken.mockRejectedValue(new Error('Auth error'));

      await optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Predefined authorization middlewares', () => {
    it('should configure adminOnly middleware correctly', () => {
      const testUser = { role: 'ADMIN' } as any;
      mockRequest.user = testUser;

      adminOnly(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should configure managerOrAdmin middleware correctly', () => {
      const managerUser = { role: 'MANAGER' } as any;
      mockRequest.user = managerUser;

      managerOrAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();

      // Test with admin
      jest.clearAllMocks();
      const adminUser = { role: 'ADMIN' } as any;
      mockRequest.user = adminUser;

      managerOrAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should configure operatorOrHigher middleware correctly', () => {
      const operatorUser = { role: 'OPERATOR' } as any;
      mockRequest.user = operatorUser;

      operatorOrHigher(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should configure authenticatedUsers middleware correctly', () => {
      const regularUser = { role: 'USER' } as any;
      mockRequest.user = regularUser;

      authenticatedUsers(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Utility functions', () => {
    describe('hasRole', () => {
      it('should return true for matching role', () => {
        const user = { role: 'ADMIN' } as any;
        expect(hasRole(user, 'ADMIN')).toBe(true);
      });

      it('should return false for non-matching role', () => {
        const user = { role: 'USER' } as any;
        expect(hasRole(user, 'ADMIN')).toBe(false);
      });

      it('should return false for undefined user', () => {
        expect(hasRole(undefined, 'ADMIN')).toBe(false);
      });
    });

    describe('hasAnyRole', () => {
      it('should return true when user has one of the roles', () => {
        const user = { role: 'MANAGER' } as any;
        expect(hasAnyRole(user, ['ADMIN', 'MANAGER'])).toBe(true);
      });

      it('should return false when user has none of the roles', () => {
        const user = { role: 'USER' } as any;
        expect(hasAnyRole(user, ['ADMIN', 'MANAGER'])).toBe(false);
      });

      it('should return false for undefined user', () => {
        expect(hasAnyRole(undefined, ['ADMIN'])).toBe(false);
      });
    });

    describe('isAdmin', () => {
      it('should return true for admin user', () => {
        const user = { role: 'ADMIN' } as any;
        expect(isAdmin(user)).toBe(true);
      });

      it('should return false for non-admin user', () => {
        const user = { role: 'USER' } as any;
        expect(isAdmin(user)).toBe(false);
      });
    });

    describe('isManagerOrHigher', () => {
      it('should return true for manager', () => {
        const user = { role: 'MANAGER' } as any;
        expect(isManagerOrHigher(user)).toBe(true);
      });

      it('should return true for admin', () => {
        const user = { role: 'ADMIN' } as any;
        expect(isManagerOrHigher(user)).toBe(true);
      });

      it('should return false for regular user', () => {
        const user = { role: 'USER' } as any;
        expect(isManagerOrHigher(user)).toBe(false);
      });
    });

    describe('userHasPermission', () => {
      const mockUtils = require('@/config/constants').UTILS;

      it('should return true when user has permission', () => {
        const user = { role: 'ADMIN' } as any;
        mockUtils.hasPermission.mockReturnValue(true);

        expect(userHasPermission(user, 'users:manage')).toBe(true);
        expect(mockUtils.hasPermission).toHaveBeenCalledWith('ADMIN', 'users:manage');
      });

      it('should return false when user lacks permission', () => {
        const user = { role: 'USER' } as any;
        mockUtils.hasPermission.mockReturnValue(false);

        expect(userHasPermission(user, 'users:manage')).toBe(false);
      });

      it('should return false for undefined user', () => {
        expect(userHasPermission(undefined, 'users:manage')).toBe(false);
        expect(mockUtils.hasPermission).not.toHaveBeenCalled();
      });
    });

    describe('getUserRoleLevel', () => {
      const mockUtils = require('@/config/constants').UTILS;

      it('should return correct level for admin user', () => {
        const user = { role: 'ADMIN' } as any;
        mockUtils.hasRoleLevel.mockReturnValue(true);

        const level = getUserRoleLevel(user);
        expect(level).toBe(4);
      });

      it('should return correct level for manager user', () => {
        const user = { role: 'MANAGER' } as any;
        mockUtils.hasRoleLevel.mockReturnValue(true);

        const level = getUserRoleLevel(user);
        expect(level).toBe(3);
      });

      it('should return correct level for operator user', () => {
        const user = { role: 'OPERATOR' } as any;
        mockUtils.hasRoleLevel.mockReturnValue(true);

        const level = getUserRoleLevel(user);
        expect(level).toBe(2);
      });

      it('should return correct level for regular user', () => {
        const user = { role: 'USER' } as any;
        mockUtils.hasRoleLevel.mockReturnValue(true);

        const level = getUserRoleLevel(user);
        expect(level).toBe(1);
      });

      it('should return 0 for undefined user', () => {
        expect(getUserRoleLevel(undefined)).toBe(0);
      });

      it('should return 0 when hasRoleLevel returns false', () => {
        const user = { role: 'INVALID' } as any;
        mockUtils.hasRoleLevel.mockReturnValue(false);

        expect(getUserRoleLevel(user)).toBe(0);
      });
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle malformed authorization header', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat'
      };

      mockAuthService.isTokenBlacklisted.mockResolvedValue(false);
      mockAuthService.getUserByToken.mockResolvedValue(null);

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should handle concurrent authentication requests', async () => {
      const testUser = { id: 'user-123', isActive: true } as any;
      const token = 'concurrent-token';

      const requests = Array.from({ length: 10 }, () => ({
        headers: { authorization: `Bearer ${token}` }
      }));

      mockAuthService.isTokenBlacklisted.mockResolvedValue(false);
      mockAuthService.getUserByToken.mockResolvedValue(testUser);

      const promises = requests.map(req => 
        authenticate(req as Request, mockResponse as Response, nextFunction)
      );

      await Promise.all(promises);

      // All requests should succeed
      expect(nextFunction).toHaveBeenCalledTimes(10);
    });

    it('should handle case-sensitive token comparison', async () => {
      const token = 'CaseSensitiveToken123';
      
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockAuthService.isTokenBlacklisted.mockResolvedValue(false);
      mockAuthService.getUserByToken.mockResolvedValue(null);

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockAuthService.getUserByToken).toHaveBeenCalledWith(token);
    });
  });

  describe('Performance considerations', () => {
    it('should handle authentication in reasonable time', async () => {
      const testUser = { id: 'user-123', isActive: true } as any;
      const token = 'performance-token';

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockAuthService.isTokenBlacklisted.mockResolvedValue(false);
      mockAuthService.getUserByToken.mockResolvedValue(testUser);

      const startTime = Date.now();
      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should efficiently handle multiple authorization checks', () => {
      const testUser = { role: 'ADMIN' } as any;
      mockRequest.user = testUser;

      const middlewares = [
        authorize(['ADMIN']),
        authorize(['ADMIN', 'MANAGER']),
        authorize(['ADMIN', 'MANAGER', 'OPERATOR']),
      ];

      const startTime = Date.now();
      
      middlewares.forEach(middleware => {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      });
      
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10); // Should complete very quickly
      expect(nextFunction).toHaveBeenCalledTimes(3);
    });
  });
});