import { Request, Response } from 'express';
import {
  signup,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  validatePasswordStrength,
  requestPasswordReset,
  confirmPasswordReset,
  logoutAllDevices,
  getUserSessions
} from '../../controllers/authController';
import authService from '../../services/authService';
import { sessionManager } from '../../services/SessionManager';
import { HTTP_STATUS } from '../../config/constants';
import {
  createMockRequest,
  createMockResponse,
  createTestUser,
  createAuthenticatedRequest,
  createTestToken,
  mockConsole,
  expectSuccessResponse,
  expectErrorResponse
} from '../helpers/testUtils';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../services/SessionManager');
jest.mock('@prisma/client');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockSessionManager = sessionManager as jest.Mocked<typeof sessionManager>;

describe('AuthController', () => {
  let mockRequest: ReturnType<typeof createMockRequest>;
  let mockResponse: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();
  });

  mockConsole();

  describe('signup', () => {
    const signupData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe'
    };

    it('should successfully register a new user', async () => {
      const testUser = createTestUser();
      const mockResult = {
        success: true,
        message: 'User registered successfully',
        user: testUser,
        token: 'test-token',
        refreshToken: 'test-refresh-token'
      };

      mockRequest.body = signupData;
      mockAuthService.signup.mockResolvedValue(mockResult);

      await signup(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.signup).toHaveBeenCalledWith(signupData);
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      expectSuccessResponse(mockResponse, {
        user: testUser,
        token: 'test-token',
        refreshToken: 'test-refresh-token'
      });
    });

    it('should handle signup failure', async () => {
      const mockResult = {
        success: false,
        message: 'Email already exists'
      };

      mockRequest.body = signupData;
      mockAuthService.signup.mockResolvedValue(mockResult);

      await signup(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle service errors', async () => {
      mockRequest.body = signupData;
      mockAuthService.signup.mockRejectedValue(new Error('Database error'));

      await signup(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expectErrorResponse(mockResponse, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    });

    it('should handle missing required fields', async () => {
      mockRequest.body = { email: 'test@example.com' }; // Missing password
      
      const mockResult = {
        success: false,
        message: 'Password is required'
      };
      mockAuthService.signup.mockResolvedValue(mockResult);

      await signup(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'SecurePass123!'
    };

    it('should successfully login a user', async () => {
      const testUser = createTestUser();
      const mockResult = {
        success: true,
        message: 'Login successful',
        user: testUser,
        token: 'test-token',
        refreshToken: 'test-refresh-token'
      };

      mockRequest.body = loginData;
      mockRequest.ip = '192.168.1.1';
      mockRequest.get.mockImplementation((header) => {
        if (header === 'User-Agent') return 'Mozilla/5.0';
        return null;
      });

      mockAuthService.login.mockResolvedValue(mockResult);
      mockSessionManager.createSession.mockResolvedValue(true);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith(
        loginData,
        expect.objectContaining({
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
          deviceFingerprint: expect.any(String)
        })
      );

      expect(mockSessionManager.createSession).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          userId: testUser.id,
          userRole: testUser.role,
          userEmail: testUser.email
        }),
        expect.objectContaining({
          maxConcurrentSessions: 5,
          requireDeviceConsistency: true
        })
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expectSuccessResponse(mockResponse, {
        user: testUser,
        token: 'test-token',
        refreshToken: 'test-refresh-token'
      });
    });

    it('should handle login failure', async () => {
      const mockResult = {
        success: false,
        message: 'Invalid credentials'
      };

      mockRequest.body = loginData;
      mockAuthService.login.mockResolvedValue(mockResult);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle service errors during login', async () => {
      mockRequest.body = loginData;
      mockAuthService.login.mockRejectedValue(new Error('Database error'));

      await login(mockRequest as Request, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    it('should handle session creation errors', async () => {
      const testUser = createTestUser();
      const mockResult = {
        success: true,
        message: 'Login successful',
        user: testUser,
        token: 'test-token',
        refreshToken: 'test-refresh-token'
      };

      mockRequest.body = loginData;
      mockAuthService.login.mockResolvedValue(mockResult);
      mockSessionManager.createSession.mockRejectedValue(new Error('Session error'));

      await login(mockRequest as Request, mockResponse as Response);

      // Should still return success even if session creation fails
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh a token', async () => {
      const testUser = createTestUser();
      const mockResult = {
        success: true,
        message: 'Token refreshed successfully',
        user: testUser,
        token: 'new-token',
        refreshToken: 'new-refresh-token'
      };

      mockRequest.body = { refreshToken: 'old-refresh-token' };
      mockAuthService.refreshToken.mockResolvedValue(mockResult);

      await refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expectSuccessResponse(mockResponse, {
        user: testUser,
        token: 'new-token',
        refreshToken: 'new-refresh-token'
      });
    });

    it('should handle invalid refresh token', async () => {
      const mockResult = {
        success: false,
        message: 'Invalid refresh token'
      };

      mockRequest.body = { refreshToken: 'invalid-token' };
      mockAuthService.refreshToken.mockResolvedValue(mockResult);

      await refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      const mockResult = {
        success: true,
        message: 'Logged out successfully'
      };

      (mockRequest as any).token = 'test-token';
      mockAuthService.logout.mockResolvedValue(mockResult);
      mockSessionManager.deleteSession.mockResolvedValue(true);

      await logout(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.logout).toHaveBeenCalledWith('test-token');
      expect(mockSessionManager.deleteSession).toHaveBeenCalledWith('test-token');
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expectSuccessResponse(mockResponse);
    });

    it('should handle missing token', async () => {
      await logout(mockRequest as Request, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.BAD_REQUEST, 'Access token required');
    });
  });

  describe('getProfile', () => {
    it('should successfully get user profile', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      await getProfile(authenticatedRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: expect.not.objectContaining({
            passwordHash: expect.anything(),
            loginAttempts: expect.anything(),
            lockoutUntil: expect.anything(),
            emailVerificationToken: expect.anything(),
            passwordResetToken: expect.anything(),
            passwordResetExpires: expect.anything(),
            twoFactorSecret: expect.anything()
          })
        }
      });
    });

    it('should handle unauthenticated request', async () => {
      mockRequest.user = undefined;

      await getProfile(mockRequest as any, mockResponse as Response);

      expectErrorResponse(mockResponse, 401, 'User not authenticated');
    });
  });

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      const testUser = createTestUser();
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com'
      };

      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: updateData
      });

      // Mock PrismaClient
      const mockPrisma = {
        user: {
          update: jest.fn().mockResolvedValue({
            ...testUser,
            ...updateData
          })
        },
        $disconnect: jest.fn().mockResolvedValue(true)
      };

      jest.doMock('@prisma/client', () => ({
        PrismaClient: jest.fn(() => mockPrisma)
      }));

      await updateProfile(authenticatedRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expectSuccessResponse(mockResponse);
    });

    it('should handle duplicate email error', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: { email: 'existing@example.com' }
      });

      const mockPrisma = {
        user: {
          update: jest.fn().mockRejectedValue({
            code: 'P2002',
            meta: { target: ['email'] }
          })
        },
        $disconnect: jest.fn().mockResolvedValue(true)
      };

      jest.doMock('@prisma/client', () => ({
        PrismaClient: jest.fn(() => mockPrisma)
      }));

      await updateProfile(authenticatedRequest as any, mockResponse as Response);

      expectErrorResponse(mockResponse, 400, 'Email address is already in use');
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const testUser = createTestUser();
      const passwordData = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123!'
      };

      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: passwordData
      });

      const mockResult = {
        success: true,
        message: 'Password changed successfully'
      };

      mockAuthService.changePassword.mockResolvedValue(mockResult);
      mockAuthService.logoutAllDevices.mockResolvedValue({ success: true, count: 2 });

      await changePassword(authenticatedRequest as any, mockResponse as Response);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith({
        userId: testUser.id,
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123!'
      });

      expect(mockAuthService.logoutAllDevices).toHaveBeenCalledWith(testUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expectSuccessResponse(mockResponse);
    });

    it('should handle incorrect current password', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123!'
        }
      });

      const mockResult = {
        success: false,
        message: 'Current password is incorrect'
      };

      mockAuthService.changePassword.mockResolvedValue(mockResult);

      await changePassword(authenticatedRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate a strong password', async () => {
      mockRequest.body = { password: 'StrongPass123!' };

      const mockValidation = {
        isValid: true,
        errors: []
      };

      mockAuthService.validatePassword.mockReturnValue(mockValidation);

      await validatePasswordStrength(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.validatePassword).toHaveBeenCalledWith('StrongPass123!');
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expectSuccessResponse(mockResponse, {
        isValid: true,
        errors: []
      });
    });

    it('should validate a weak password', async () => {
      mockRequest.body = { password: 'weak' };

      const mockValidation = {
        isValid: false,
        errors: ['Password must be at least 8 characters', 'Password must contain uppercase letter']
      };

      mockAuthService.validatePassword.mockReturnValue(mockValidation);

      await validatePasswordStrength(mockRequest as Request, mockResponse as Response);

      expectSuccessResponse(mockResponse, {
        isValid: false,
        errors: expect.arrayContaining(['Password must be at least 8 characters'])
      });
    });

    it('should handle missing password', async () => {
      mockRequest.body = {};

      await validatePasswordStrength(mockRequest as Request, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.BAD_REQUEST, 'Password is required');
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset for existing email', async () => {
      mockRequest.body = { email: 'test@example.com' };

      const mockResult = {
        success: true,
        message: 'Password reset email sent'
      };

      mockAuthService.requestPasswordReset.mockResolvedValue(mockResult);

      await requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith({
        email: 'test@example.com'
      });

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expectSuccessResponse(mockResponse);
    });

    it('should handle missing email', async () => {
      mockRequest.body = {};

      await requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.BAD_REQUEST, 'Email is required');
    });

    it('should always return success for security (email enumeration prevention)', async () => {
      mockRequest.body = { email: 'nonexistent@example.com' };
      mockAuthService.requestPasswordReset.mockRejectedValue(new Error('User not found'));

      await requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('password reset link has been sent')
      });
    });
  });

  describe('confirmPasswordReset', () => {
    it('should successfully reset password', async () => {
      mockRequest.body = {
        token: 'valid-reset-token',
        newPassword: 'NewSecurePass123!'
      };

      const mockResult = {
        success: true,
        message: 'Password reset successfully'
      };

      mockAuthService.confirmPasswordReset.mockResolvedValue(mockResult);

      await confirmPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.confirmPasswordReset).toHaveBeenCalledWith({
        token: 'valid-reset-token',
        newPassword: 'NewSecurePass123!'
      });

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expectSuccessResponse(mockResponse);
    });

    it('should handle invalid reset token', async () => {
      mockRequest.body = {
        token: 'invalid-token',
        newPassword: 'NewSecurePass123!'
      };

      const mockResult = {
        success: false,
        message: 'Invalid or expired reset token'
      };

      mockAuthService.confirmPasswordReset.mockResolvedValue(mockResult);

      await confirmPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle missing required fields', async () => {
      mockRequest.body = { token: 'valid-token' }; // Missing newPassword

      await confirmPasswordReset(mockRequest as Request, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.BAD_REQUEST, 'Token and new password are required');
    });
  });

  describe('logoutAllDevices', () => {
    it('should successfully logout from all devices', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      const mockResult = {
        success: true,
        message: 'Logged out from all devices',
        count: 3
      };

      mockAuthService.logoutAllDevices.mockResolvedValue(mockResult);
      mockSessionManager.revokeAllUserSessions.mockResolvedValue(true);

      await logoutAllDevices(authenticatedRequest as any, mockResponse as Response);

      expect(mockAuthService.logoutAllDevices).toHaveBeenCalledWith(testUser.id);
      expect(mockSessionManager.revokeAllUserSessions).toHaveBeenCalledWith(testUser.id);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expectSuccessResponse(mockResponse, {
        devicesLoggedOut: 3
      });
    });

    it('should handle unauthenticated request', async () => {
      mockRequest.user = undefined;

      await logoutAllDevices(mockRequest as any, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.UNAUTHORIZED, 'Access token required');
    });
  });

  describe('getUserSessions', () => {
    it('should successfully get user sessions', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      const mockSessions = [
        {
          deviceInfo: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          isActive: true
        }
      ];

      mockSessionManager.getUserSessions.mockResolvedValue(mockSessions);
      mockAuthService.getActiveSessionCount.mockResolvedValue(1);

      await getUserSessions(authenticatedRequest as any, mockResponse as Response);

      expect(mockSessionManager.getUserSessions).toHaveBeenCalledWith(testUser.id);
      expect(mockAuthService.getActiveSessionCount).toHaveBeenCalledWith(testUser.id);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expectSuccessResponse(mockResponse, {
        sessions: expect.arrayContaining([
          expect.objectContaining({
            deviceInfo: 'Mozilla/5.0',
            ipAddress: '192.168.1.1',
            isActive: true
          })
        ]),
        totalActiveSessions: 1
      });
    });

    it('should handle unauthenticated request', async () => {
      mockRequest.user = undefined;

      await getUserSessions(mockRequest as any, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.UNAUTHORIZED, 'Access token required');
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle concurrent login attempts', async () => {
      const loginData = { email: 'test@example.com', password: 'password' };
      const testUser = createTestUser();
      
      mockRequest.body = loginData;
      mockAuthService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        user: testUser,
        token: 'token',
        refreshToken: 'refresh'
      });

      // Simulate concurrent requests
      const promises = Array(5).fill(null).map(() => 
        login({ ...mockRequest } as Request, { ...mockResponse } as Response)
      );

      await Promise.all(promises);

      expect(mockAuthService.login).toHaveBeenCalledTimes(5);
    });

    it('should generate unique device fingerprints', async () => {
      const requests = [
        createMockRequest({ 
          ip: '192.168.1.1',
          headers: { 'user-agent': 'Chrome/91.0' }
        }),
        createMockRequest({ 
          ip: '192.168.1.2',
          headers: { 'user-agent': 'Firefox/89.0' }
        })
      ];

      mockAuthService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        user: createTestUser(),
        token: 'token',
        refreshToken: 'refresh'
      });

      for (const req of requests) {
        req.body = { email: 'test@example.com', password: 'password' };
        await login(req as Request, mockResponse as Response);
      }

      const calls = mockAuthService.login.mock.calls;
      expect(calls[0][1].deviceFingerprint).not.toBe(calls[1][1].deviceFingerprint);
    });

    it('should handle malformed request data', async () => {
      mockRequest.body = { email: null, password: undefined };
      
      mockAuthService.signup.mockResolvedValue({
        success: false,
        message: 'Invalid input data'
      });

      await signup(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });
});