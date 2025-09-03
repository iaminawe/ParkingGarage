import { Request, Response } from 'express';
import { SessionsController } from '../../controllers/sessionsController';
import { SessionService } from '../../services/SessionService';
import { AuthRequest } from '../../middleware/auth';
import {
  createMockRequest,
  createMockResponse,
  createTestUser,
  createAuthenticatedRequest,
  mockConsole,
  expectSuccessResponse,
  expectErrorResponse
} from '../helpers/testUtils';

// Mock services
jest.mock('../../services/SessionService');

const MockedSessionService = SessionService as jest.MockedClass<typeof SessionService>;

describe('SessionsController', () => {
  let sessionsController: SessionsController;
  let mockRequest: ReturnType<typeof createMockRequest>;
  let mockResponse: ReturnType<typeof createMockResponse>;
  let mockSessionService: jest.Mocked<SessionService>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();

    mockSessionService = {
      getUserSessions: jest.fn(),
      terminateSession: jest.fn(),
      terminateAllSessions: jest.fn(),
      getSessionById: jest.fn(),
      extendSession: jest.fn(),
      getActiveSessionsCount: jest.fn(),
      cleanupExpiredSessions: jest.fn(),
      validateSessionSecurity: jest.fn(),
    } as any;

    MockedSessionService.mockImplementation(() => mockSessionService);
    sessionsController = new SessionsController();
    jest.clearAllMocks();
  });

  mockConsole();

  describe('getUserSessions', () => {
    it('should return user sessions successfully', async () => {
      const testUser = createTestUser();
      const mockSessions = [
        {
          id: 'session-1',
          deviceInfo: 'Chrome on Windows',
          ipAddress: '192.168.1.100',
          createdAt: '2023-06-15T09:00:00.000Z',
          lastAccessedAt: '2023-06-15T12:00:00.000Z',
          isActive: true,
          isCurrent: true
        },
        {
          id: 'session-2',
          deviceInfo: 'Safari on iPhone',
          ipAddress: '192.168.1.101',
          createdAt: '2023-06-14T15:30:00.000Z',
          lastAccessedAt: '2023-06-14T18:45:00.000Z',
          isActive: false,
          isCurrent: false
        }
      ];

      const authenticatedRequest = createAuthenticatedRequest(testUser);
      mockSessionService.getUserSessions.mockResolvedValue(mockSessions);

      await sessionsController.getUserSessions(authenticatedRequest as any, mockResponse as any);

      expect(mockSessionService.getUserSessions).toHaveBeenCalledWith(testUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User sessions retrieved successfully',
        data: {
          sessions: mockSessions,
          totalSessions: 2,
          activeSessions: 1
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle unauthenticated requests', async () => {
      mockRequest.user = undefined;

      await sessionsController.getUserSessions(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 401, 'Authentication required');
      expect(mockSessionService.getUserSessions).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      mockSessionService.getUserSessions.mockRejectedValue(
        new Error('Session database unavailable')
      );

      await sessionsController.getUserSessions(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 500, 'Failed to retrieve user sessions');
    });

    it('should handle empty session list', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      mockSessionService.getUserSessions.mockResolvedValue([]);

      await sessionsController.getUserSessions(authenticatedRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessions: [],
            totalSessions: 0,
            activeSessions: 0
          })
        })
      );
    });
  });

  describe('terminateSession', () => {
    it('should terminate a specific session successfully', async () => {
      const testUser = createTestUser();
      const sessionId = 'session-to-terminate';
      
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId }
      });

      const mockResult = {
        success: true,
        message: 'Session terminated successfully',
        sessionId: sessionId,
        terminatedAt: '2023-06-15T12:00:00.000Z'
      };

      mockSessionService.terminateSession.mockResolvedValue(mockResult);

      await sessionsController.terminateSession(authenticatedRequest as any, mockResponse as any);

      expect(mockSessionService.terminateSession).toHaveBeenCalledWith(testUser.id, sessionId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Session terminated successfully',
        data: mockResult,
        timestamp: expect.any(String)
      });
    });

    it('should handle session not found', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId: 'nonexistent-session' }
      });

      mockSessionService.terminateSession.mockRejectedValue(
        new Error('Session not found')
      );

      await sessionsController.terminateSession(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 404, 'Session not found');
    });

    it('should handle unauthorized session termination', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId: 'unauthorized-session' }
      });

      mockSessionService.terminateSession.mockRejectedValue(
        new Error('Unauthorized to terminate this session')
      );

      await sessionsController.terminateSession(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 403, 'Unauthorized to terminate this session');
    });

    it('should handle missing session ID', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: {}
      });

      await sessionsController.terminateSession(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Session ID is required');
      expect(mockSessionService.terminateSession).not.toHaveBeenCalled();
    });
  });

  describe('terminateAllSessions', () => {
    it('should terminate all user sessions successfully', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      const mockResult = {
        success: true,
        message: 'All sessions terminated',
        terminatedCount: 3,
        terminatedAt: '2023-06-15T12:00:00.000Z'
      };

      mockSessionService.terminateAllSessions.mockResolvedValue(mockResult);

      await sessionsController.terminateAllSessions(authenticatedRequest as any, mockResponse as any);

      expect(mockSessionService.terminateAllSessions).toHaveBeenCalledWith(testUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'All sessions terminated successfully',
        data: {
          terminatedSessions: 3,
          timestamp: '2023-06-15T12:00:00.000Z'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle no sessions to terminate', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      const mockResult = {
        success: true,
        message: 'No sessions to terminate',
        terminatedCount: 0
      };

      mockSessionService.terminateAllSessions.mockResolvedValue(mockResult);

      await sessionsController.terminateAllSessions(authenticatedRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            terminatedSessions: 0
          })
        })
      );
    });

    it('should handle service errors during bulk termination', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      mockSessionService.terminateAllSessions.mockRejectedValue(
        new Error('Bulk termination failed')
      );

      await sessionsController.terminateAllSessions(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 500, 'Failed to terminate all sessions');
    });
  });

  describe('getSessionDetails', () => {
    it('should return session details successfully', async () => {
      const testUser = createTestUser();
      const sessionId = 'detailed-session';
      
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId }
      });

      const mockSessionDetails = {
        id: sessionId,
        userId: testUser.id,
        deviceInfo: 'Chrome 114.0.0.0 on Windows 10',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        createdAt: '2023-06-15T09:00:00.000Z',
        lastAccessedAt: '2023-06-15T12:00:00.000Z',
        expiresAt: '2023-06-22T09:00:00.000Z',
        isActive: true,
        isCurrent: false,
        securityEvents: [
          {
            event: 'login',
            timestamp: '2023-06-15T09:00:00.000Z',
            ipAddress: '192.168.1.100'
          }
        ]
      };

      mockSessionService.getSessionById.mockResolvedValue(mockSessionDetails);

      await sessionsController.getSessionDetails(authenticatedRequest as any, mockResponse as any);

      expect(mockSessionService.getSessionById).toHaveBeenCalledWith(testUser.id, sessionId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Session details retrieved successfully',
        data: mockSessionDetails,
        timestamp: expect.any(String)
      });
    });

    it('should handle session details not found', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId: 'nonexistent' }
      });

      mockSessionService.getSessionById.mockResolvedValue(null);

      await sessionsController.getSessionDetails(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 404, 'Session not found');
    });
  });

  describe('extendSession', () => {
    it('should extend session successfully', async () => {
      const testUser = createTestUser();
      const sessionId = 'session-to-extend';
      
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId },
        body: { extendBy: 3600000 } // 1 hour in milliseconds
      });

      const mockResult = {
        success: true,
        message: 'Session extended successfully',
        sessionId: sessionId,
        newExpiryTime: '2023-06-15T13:00:00.000Z',
        extendedBy: 3600000
      };

      mockSessionService.extendSession.mockResolvedValue(mockResult);

      await sessionsController.extendSession(authenticatedRequest as any, mockResponse as any);

      expect(mockSessionService.extendSession).toHaveBeenCalledWith(testUser.id, sessionId, 3600000);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Session extended successfully',
        data: mockResult,
        timestamp: expect.any(String)
      });
    });

    it('should use default extension time when not provided', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId: 'test-session' },
        body: {}
      });

      const mockResult = {
        success: true,
        message: 'Session extended with default time'
      };

      mockSessionService.extendSession.mockResolvedValue(mockResult);

      await sessionsController.extendSession(authenticatedRequest as any, mockResponse as any);

      expect(mockSessionService.extendSession).toHaveBeenCalledWith(
        testUser.id, 
        'test-session', 
        3600000 // Default 1 hour
      );
    });

    it('should handle invalid extension time', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId: 'test-session' },
        body: { extendBy: -1000 }
      });

      await sessionsController.extendSession(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Extension time must be positive');
    });
  });

  describe('getActiveSessionsCount', () => {
    it('should return active sessions count', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      mockSessionService.getActiveSessionsCount.mockResolvedValue(5);

      await sessionsController.getActiveSessionsCount(authenticatedRequest as any, mockResponse as any);

      expect(mockSessionService.getActiveSessionsCount).toHaveBeenCalledWith(testUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Active sessions count retrieved successfully',
        data: {
          activeSessionsCount: 5,
          userId: testUser.id
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle zero active sessions', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      mockSessionService.getActiveSessionsCount.mockResolvedValue(0);

      await sessionsController.getActiveSessionsCount(authenticatedRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            activeSessionsCount: 0
          })
        })
      );
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions successfully (admin only)', async () => {
      const adminUser = createTestUser({ role: 'ADMIN' });
      const authenticatedRequest = createAuthenticatedRequest(adminUser);

      const mockResult = {
        success: true,
        message: 'Expired sessions cleaned up',
        cleanedCount: 15,
        cleanupTimestamp: '2023-06-15T12:00:00.000Z'
      };

      mockSessionService.cleanupExpiredSessions.mockResolvedValue(mockResult);

      await sessionsController.cleanupExpiredSessions(authenticatedRequest as any, mockResponse as any);

      expect(mockSessionService.cleanupExpiredSessions).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Expired sessions cleaned up successfully',
        data: {
          cleanedSessionsCount: 15,
          timestamp: '2023-06-15T12:00:00.000Z'
        },
        timestamp: expect.any(String)
      });
    });

    it('should reject non-admin users', async () => {
      const regularUser = createTestUser({ role: 'USER' });
      const authenticatedRequest = createAuthenticatedRequest(regularUser);

      await sessionsController.cleanupExpiredSessions(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 403, 'Admin access required');
      expect(mockSessionService.cleanupExpiredSessions).not.toHaveBeenCalled();
    });
  });

  describe('validateSessionSecurity', () => {
    it('should validate session security successfully', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId: 'security-check-session' }
      });

      const mockValidation = {
        isSecure: true,
        riskLevel: 'LOW',
        issues: [],
        recommendations: ['Consider enabling 2FA'],
        lastSecurityCheck: '2023-06-15T12:00:00.000Z'
      };

      mockSessionService.validateSessionSecurity.mockResolvedValue(mockValidation);

      await sessionsController.validateSessionSecurity(authenticatedRequest as any, mockResponse as any);

      expect(mockSessionService.validateSessionSecurity).toHaveBeenCalledWith(
        testUser.id, 
        'security-check-session'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Session security validation completed',
        data: mockValidation,
        timestamp: expect.any(String)
      });
    });

    it('should handle security issues found', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId: 'insecure-session' }
      });

      const mockValidation = {
        isSecure: false,
        riskLevel: 'HIGH',
        issues: [
          'Multiple failed login attempts detected',
          'Session accessed from unusual location'
        ],
        recommendations: [
          'Change password immediately',
          'Enable 2FA',
          'Review recent account activity'
        ]
      };

      mockSessionService.validateSessionSecurity.mockResolvedValue(mockValidation);

      await sessionsController.validateSessionSecurity(authenticatedRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isSecure: false,
            riskLevel: 'HIGH',
            issues: expect.arrayContaining([
              expect.stringContaining('failed login attempts')
            ])
          })
        })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent session operations', async () => {
      const testUser = createTestUser();
      const sessionId = 'concurrent-session';
      
      // Simulate concurrent terminate and extend operations
      const terminateReq = createAuthenticatedRequest(testUser, { params: { sessionId } });
      const extendReq = createAuthenticatedRequest(testUser, { 
        params: { sessionId }, 
        body: { extendBy: 3600000 }
      });

      mockSessionService.terminateSession.mockResolvedValue({
        success: true,
        message: 'Session terminated'
      });

      mockSessionService.extendSession.mockRejectedValue(
        new Error('Session no longer exists')
      );

      const terminateRes = createMockResponse();
      const extendRes = createMockResponse();

      await Promise.all([
        sessionsController.terminateSession(terminateReq as any, terminateRes as any),
        sessionsController.extendSession(extendReq as any, extendRes as any)
      ]);

      expect(terminateRes.status).toHaveBeenCalledWith(200);
      expect(extendRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle malformed session IDs', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId: '../../../etc/passwd' }
      });

      mockSessionService.getSessionById.mockRejectedValue(
        new Error('Invalid session ID format')
      );

      await sessionsController.getSessionDetails(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 500);
    });

    it('should handle very large extension times', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { sessionId: 'test-session' },
        body: { extendBy: Number.MAX_SAFE_INTEGER }
      });

      await sessionsController.extendSession(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Extension time exceeds maximum allowed');
    });

    it('should handle database connection failures gracefully', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      mockSessionService.getUserSessions.mockRejectedValue(
        new Error('ECONNREFUSED: Database connection refused')
      );

      await sessionsController.getUserSessions(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 500, 'Failed to retrieve user sessions');
    });
  });
});