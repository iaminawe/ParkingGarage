/**
 * Sessions Controller Tests
 * 
 * Comprehensive test suite for the SessionsController covering:
 * - Session listing with filtering and pagination
 * - Session statistics and analytics
 * - Individual session management (get, end, cancel, extend)
 * - CSV export functionality
 * - Input validation
 * - Error handling
 * - Edge cases and boundary conditions
 */

import request from 'supertest';
import app from '../../../src/app';
import { SessionsController } from '../../../src/controllers/sessionsController';
import { SessionsService } from '../../../src/services/sessionsService';

// Mock the services
jest.mock('../../../src/services/sessionsService');

const MockedSessionsService = SessionsService as jest.MockedClass<typeof SessionsService>;

describe('SessionsController', () => {
  let sessionsController: SessionsController;
  let mockSessionsService: jest.Mocked<SessionsService>;

  const mockSessionsData = {
    data: [
      {
        id: 'session-001',
        licensePlate: 'ABC123',
        vehicleType: 'compact',
        spotId: 'spot-001',
        startTime: '2024-01-01T10:00:00Z',
        endTime: null,
        status: 'active',
        cost: 15.50,
        duration: 120
      },
      {
        id: 'session-002',
        licensePlate: 'XYZ789',
        vehicleType: 'standard',
        spotId: 'spot-002',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T11:30:00Z',
        status: 'completed',
        cost: 12.50,
        duration: 150
      }
    ],
    total: 2,
    limit: 50,
    offset: 0,
    hasMore: false
  };

  const mockSessionStats = {
    overview: {
      totalSessions: 1500,
      activeSessions: 85,
      completedSessions: 1400,
      cancelledSessions: 15
    },
    revenue: {
      totalRevenue: 18750.00,
      averageRevenue: 12.50,
      todayRevenue: 450.00
    },
    duration: {
      averageDuration: 145, // minutes
      shortestSession: 15,
      longestSession: 480
    },
    vehicleTypes: {
      compact: 600,
      standard: 700,
      oversized: 200
    }
  };

  const mockSessionAnalytics = {
    revenue: [
      { date: '2024-01-01', revenue: 450.00, sessions: 36 },
      { date: '2024-01-02', revenue: 520.00, sessions: 42 },
      { date: '2024-01-03', revenue: 380.00, sessions: 30 }
    ],
    trends: {
      weeklyGrowth: 12.5,
      monthlyGrowth: 8.3,
      peakHours: ['09:00-11:00', '17:00-19:00']
    }
  };

  const mockSession = {
    id: 'session-001',
    licensePlate: 'ABC123',
    vehicleType: 'compact',
    spotId: 'spot-001',
    spotLocation: 'Level 1 - A1',
    startTime: '2024-01-01T10:00:00Z',
    endTime: null,
    status: 'active',
    cost: 15.50,
    duration: 120,
    rateType: 'hourly',
    vehicle: {
      licensePlate: 'ABC123',
      type: 'compact',
      owner: 'John Doe'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    sessionsController = new SessionsController();
    
    // Get mocked instance
    mockSessionsService = MockedSessionsService.mock.instances[MockedSessionsService.mock.instances.length - 1] as jest.Mocked<SessionsService>;

    // Set up default mocks
    mockSessionsService.getSessions = jest.fn().mockResolvedValue(mockSessionsData);
    mockSessionsService.getSessionStats = jest.fn().mockResolvedValue(mockSessionStats);
    mockSessionsService.getSessionAnalytics = jest.fn().mockResolvedValue(mockSessionAnalytics);
    mockSessionsService.getSessionById = jest.fn().mockResolvedValue(mockSession);
    mockSessionsService.endSession = jest.fn().mockResolvedValue({
      id: 'session-001',
      endedAt: new Date().toISOString(),
      finalCost: 18.75,
      message: 'Session ended successfully'
    });
    mockSessionsService.cancelSession = jest.fn().mockResolvedValue({
      id: 'session-001',
      cancelledAt: new Date().toISOString(),
      refund: 5.00,
      message: 'Session cancelled successfully'
    });
    mockSessionsService.extendSession = jest.fn().mockResolvedValue({
      id: 'session-001',
      extendedUntil: new Date().toISOString(),
      additionalCost: 10.00,
      message: 'Session extended successfully'
    });
    mockSessionsService.exportSessionsCSV = jest.fn().mockResolvedValue(
      'id,licensePlate,startTime,endTime,cost,status\nsession-001,ABC123,2024-01-01T10:00:00Z,,15.50,active'
    );
  });

  describe('GET /api/sessions - getSessions', () => {
    it('should get sessions with default parameters', async () => {
      const response = await request(app)
        .get('/api/sessions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.timestamp).toBeDefined();

      expect(mockSessionsService.getSessions).toHaveBeenCalledWith({
        status: 'all',
        dateRange: 'all',
        search: '',
        limit: 50,
        sort: 'createdAt',
        order: 'desc'
      });
    });

    it('should get sessions with custom filters', async () => {
      const response = await request(app)
        .get('/api/sessions?status=active&dateRange=today&search=ABC&limit=25&offset=10&sort=cost&order=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSessionsService.getSessions).toHaveBeenCalledWith({
        status: 'active',
        dateRange: 'today',
        search: 'ABC',
        limit: 25,
        sort: 'cost',
        order: 'asc'
      });
    });

    it('should validate status parameter', async () => {
      const response = await request(app)
        .get('/api/sessions?status=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status filter');
    });

    it('should validate dateRange parameter', async () => {
      const response = await request(app)
        .get('/api/sessions?dateRange=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid dateRange filter');
    });

    it('should validate sort parameter', async () => {
      const response = await request(app)
        .get('/api/sessions?sort=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid sort field');
    });

    it('should validate order parameter', async () => {
      const response = await request(app)
        .get('/api/sessions?order=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid order');
    });

    it('should handle limit boundaries', async () => {
      // Test maximum limit
      const response1 = await request(app)
        .get('/api/sessions?limit=200')
        .expect(200);

      expect(mockSessionsService.getSessions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }) // Should be capped at 100
      );

      // Test minimum limit
      const response2 = await request(app)
        .get('/api/sessions?limit=0')
        .expect(200);

      expect(mockSessionsService.getSessions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 1 }) // Should be minimum 1
      );
    });

    it('should handle negative offset', async () => {
      const response = await request(app)
        .get('/api/sessions?offset=-10')
        .expect(200);

      expect(mockSessionsService.getSessions).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0 }) // Should be minimum 0
      );
    });

    it('should handle service error', async () => {
      mockSessionsService.getSessions.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/sessions')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while fetching sessions');
    });
  });

  describe('GET /api/sessions/stats - getSessionStats', () => {
    it('should get session statistics with default period', async () => {
      const response = await request(app)
        .get('/api/sessions/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.revenue).toBeDefined();
      expect(response.body.data.duration).toBeDefined();

      expect(mockSessionsService.getSessionStats).toHaveBeenCalledWith('all');
    });

    it('should get session statistics with custom period', async () => {
      const response = await request(app)
        .get('/api/sessions/stats?period=month')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSessionsService.getSessionStats).toHaveBeenCalledWith('month');
    });

    it('should validate period parameter', async () => {
      const response = await request(app)
        .get('/api/sessions/stats?period=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid period');
    });

    it('should handle service error', async () => {
      mockSessionsService.getSessionStats.mockRejectedValue(new Error('Stats calculation failed'));

      const response = await request(app)
        .get('/api/sessions/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while fetching session statistics');
    });
  });

  describe('GET /api/sessions/analytics - getSessionAnalytics', () => {
    it('should get session analytics with default parameters', async () => {
      const response = await request(app)
        .get('/api/sessions/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      expect(mockSessionsService.getSessionAnalytics).toHaveBeenCalledWith('revenue', 'week');
    });

    it('should get session analytics with custom parameters', async () => {
      const response = await request(app)
        .get('/api/sessions/analytics?type=duration&period=month')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSessionsService.getSessionAnalytics).toHaveBeenCalledWith('duration', 'month');
    });

    it('should validate type parameter', async () => {
      const response = await request(app)
        .get('/api/sessions/analytics?type=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid analytics type');
    });

    it('should validate period parameter', async () => {
      const response = await request(app)
        .get('/api/sessions/analytics?period=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid period');
    });

    it('should handle service error', async () => {
      mockSessionsService.getSessionAnalytics.mockRejectedValue(new Error('Analytics error'));

      const response = await request(app)
        .get('/api/sessions/analytics')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while fetching session analytics');
    });
  });

  describe('GET /api/sessions/:id - getSessionById', () => {
    it('should get session by valid ID', async () => {
      const response = await request(app)
        .get('/api/sessions/session-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('session-001');
      expect(response.body.data.licensePlate).toBe('ABC123');

      expect(mockSessionsService.getSessionById).toHaveBeenCalledWith('session-001');
    });

    it('should handle missing session ID', async () => {
      const response = await request(app)
        .get('/api/sessions/')
        .expect(404); // Express routing handles this

      // This would actually be a 404 from Express routing, not our controller
    });

    it('should handle session not found', async () => {
      mockSessionsService.getSessionById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/sessions/nonexistent-session')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Session with ID 'nonexistent-session' not found");
    });

    it('should handle service error', async () => {
      mockSessionsService.getSessionById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/sessions/session-001')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while fetching session');
    });
  });

  describe('POST /api/sessions/:id/end - endSession', () => {
    it('should end session successfully', async () => {
      const response = await request(app)
        .post('/api/sessions/session-001/end')
        .send({ reason: 'User requested end' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Session ended successfully');
      expect(response.body.data).toBeDefined();

      expect(mockSessionsService.endSession).toHaveBeenCalledWith('session-001', 'User requested end');
    });

    it('should end session with default reason', async () => {
      const response = await request(app)
        .post('/api/sessions/session-001/end')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSessionsService.endSession).toHaveBeenCalledWith('session-001', 'Manual end');
    });

    it('should handle session not found error', async () => {
      mockSessionsService.endSession.mockRejectedValue(new Error('Session not found'));

      const response = await request(app)
        .post('/api/sessions/nonexistent/end')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Session not found');
    });

    it('should handle session not active error', async () => {
      mockSessionsService.endSession.mockRejectedValue(new Error('Session not active'));

      const response = await request(app)
        .post('/api/sessions/session-001/end')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Session not active');
    });

    it('should handle generic service error', async () => {
      mockSessionsService.endSession.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/sessions/session-001/end')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while ending session');
    });
  });

  describe('POST /api/sessions/:id/cancel - cancelSession', () => {
    it('should cancel session successfully', async () => {
      const response = await request(app)
        .post('/api/sessions/session-001/cancel')
        .send({ reason: 'User requested cancellation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Session cancelled successfully');
      expect(response.body.data).toBeDefined();

      expect(mockSessionsService.cancelSession).toHaveBeenCalledWith('session-001', 'User requested cancellation');
    });

    it('should cancel session with default reason', async () => {
      const response = await request(app)
        .post('/api/sessions/session-001/cancel')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSessionsService.cancelSession).toHaveBeenCalledWith('session-001', 'Manual cancellation');
    });

    it('should handle session not found error', async () => {
      mockSessionsService.cancelSession.mockRejectedValue(new Error('Session not found'));

      const response = await request(app)
        .post('/api/sessions/nonexistent/cancel')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Session not found');
    });

    it('should handle service error', async () => {
      mockSessionsService.cancelSession.mockRejectedValue(new Error('Cancellation failed'));

      const response = await request(app)
        .post('/api/sessions/session-001/cancel')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while cancelling session');
    });
  });

  describe('POST /api/sessions/:id/extend - extendSession', () => {
    it('should extend session successfully', async () => {
      const response = await request(app)
        .post('/api/sessions/session-001/extend')
        .send({ additionalHours: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Session extended by 2 hour(s)');
      expect(response.body.data).toBeDefined();

      expect(mockSessionsService.extendSession).toHaveBeenCalledWith('session-001', 2);
    });

    it('should reject missing additional hours', async () => {
      const response = await request(app)
        .post('/api/sessions/session-001/extend')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Additional hours must be a positive number');
    });

    it('should reject negative additional hours', async () => {
      const response = await request(app)
        .post('/api/sessions/session-001/extend')
        .send({ additionalHours: -1 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Additional hours must be a positive number');
    });

    it('should reject zero additional hours', async () => {
      const response = await request(app)
        .post('/api/sessions/session-001/extend')
        .send({ additionalHours: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Additional hours must be a positive number');
    });

    it('should reject non-numeric additional hours', async () => {
      const response = await request(app)
        .post('/api/sessions/session-001/extend')
        .send({ additionalHours: 'two' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Additional hours must be a positive number');
    });

    it('should handle session not found error', async () => {
      mockSessionsService.extendSession.mockRejectedValue(new Error('Session not found'));

      const response = await request(app)
        .post('/api/sessions/nonexistent/extend')
        .send({ additionalHours: 1 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Session not found');
    });

    it('should handle session not active error', async () => {
      mockSessionsService.extendSession.mockRejectedValue(new Error('Session not active'));

      const response = await request(app)
        .post('/api/sessions/session-001/extend')
        .send({ additionalHours: 1 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Session not active');
    });
  });

  describe('GET /api/sessions/export/csv - exportSessionsCSV', () => {
    it('should export sessions as CSV with default parameters', async () => {
      const response = await request(app)
        .get('/api/sessions/export/csv')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="parking-sessions-\d{4}-\d{2}-\d{2}\.csv"/);
      expect(response.text).toContain('id,licensePlate,startTime,endTime,cost,status');

      expect(mockSessionsService.exportSessionsCSV).toHaveBeenCalledWith({
        status: 'all',
        dateRange: 'all',
        search: ''
      });
    });

    it('should export sessions as CSV with filters', async () => {
      const response = await request(app)
        .get('/api/sessions/export/csv?status=completed&dateRange=month&search=ABC')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(mockSessionsService.exportSessionsCSV).toHaveBeenCalledWith({
        status: 'completed',
        dateRange: 'month',
        search: 'ABC'
      });
    });

    it('should handle export service error', async () => {
      mockSessionsService.exportSessionsCSV.mockRejectedValue(new Error('Export failed'));

      const response = await request(app)
        .get('/api/sessions/export/csv')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while exporting sessions');
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle very large limit values', async () => {
      const response = await request(app)
        .get('/api/sessions?limit=999999')
        .expect(200);

      expect(mockSessionsService.getSessions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }) // Should be capped
      );
    });

    it('should handle float values for limit and offset', async () => {
      const response = await request(app)
        .get('/api/sessions?limit=25.5&offset=10.7')
        .expect(200);

      expect(mockSessionsService.getSessions).toHaveBeenCalledWith(
        expect.objectContaining({ 
          limit: 25, // Should be parsed as integer
          offset: 10  // Should be parsed as integer
        })
      );
    });

    it('should handle empty search strings', async () => {
      const response = await request(app)
        .get('/api/sessions?search=')
        .expect(200);

      expect(mockSessionsService.getSessions).toHaveBeenCalledWith(
        expect.objectContaining({ search: '' })
      );
    });

    it('should handle special characters in search', async () => {
      const specialSearch = 'ABC-123@#$%';
      const response = await request(app)
        .get(`/api/sessions?search=${encodeURIComponent(specialSearch)}`)
        .expect(200);

      expect(mockSessionsService.getSessions).toHaveBeenCalledWith(
        expect.objectContaining({ search: specialSearch })
      );
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/sessions')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(mockSessionsService.getSessions).toHaveBeenCalledTimes(10);
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/sessions/session-001/end')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle very long session IDs', async () => {
      const longId = 'a'.repeat(1000);
      
      const response = await request(app)
        .get(`/api/sessions/${longId}`)
        .expect(404);

      expect(mockSessionsService.getSessionById).toHaveBeenCalledWith(longId);
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response format for successful operations', async () => {
      const responses = await Promise.all([
        request(app).get('/api/sessions'),
        request(app).get('/api/sessions/stats'),
        request(app).get('/api/sessions/analytics'),
        request(app).get('/api/sessions/session-001'),
      ]);

      responses.forEach(response => {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
      });
    });

    it('should return consistent error response format', async () => {
      mockSessionsService.getSessions.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/sessions')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include appropriate messages for action endpoints', async () => {
      const responses = await Promise.all([
        request(app).post('/api/sessions/session-001/end').send({}),
        request(app).post('/api/sessions/session-001/cancel').send({}),
        request(app).post('/api/sessions/session-001/extend').send({ additionalHours: 1 })
      ]);

      responses.forEach(response => {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toMatch(/(ended|cancelled|extended)/);
      });
    });
  });
});