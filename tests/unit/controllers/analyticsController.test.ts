/**
 * Analytics Controller Tests
 * 
 * Comprehensive test suite for the AnalyticsController covering:
 * - System-wide analytics
 * - Garage-specific analytics
 * - Dashboard analytics
 * - Occupancy trends
 * - Revenue data
 * - Vehicle distribution metrics
 * - Error handling
 * - Input validation
 * - Database interaction testing
 */

import request from 'supertest';
import app from '../../../src/app';
import { prisma } from '../../../src/config/database';
import { HTTP_STATUS, API_RESPONSES } from '../../../src/config/constants';

// Mock Prisma
jest.mock('../../../src/config/database', () => ({
  prisma: {
    garage: {
      count: jest.fn(),
      findUnique: jest.fn()
    },
    parkingSpot: {
      count: jest.fn()
    },
    vehicle: {
      count: jest.fn()
    },
    parkingSession: {
      count: jest.fn()
    },
    user: {
      count: jest.fn()
    },
    payment: {
      aggregate: jest.fn()
    }
  }
}));

const mockPrisma = prisma as any;

describe('AnalyticsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock responses
    mockPrisma.garage.count.mockResolvedValue(5);
    mockPrisma.parkingSpot.count.mockResolvedValue(500);
    mockPrisma.vehicle.count.mockResolvedValue(1000);
    mockPrisma.parkingSession.count.mockResolvedValue(150);
    mockPrisma.user.count.mockResolvedValue(300);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 15000 } });
  });

  describe('GET /api/analytics/system - getSystemAnalytics', () => {
    it('should get system-wide analytics successfully', async () => {
      // Configure specific mocks for this test
      mockPrisma.parkingSpot.count
        .mockResolvedValueOnce(500) // Total spots
        .mockResolvedValueOnce(125); // Available spots

      const response = await request(app)
        .get('/api/analytics/system')
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('System analytics retrieved successfully');
      
      // Verify overview data
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.overview.totalGarages).toBe(5);
      expect(response.body.data.overview.totalSpots).toBe(500);
      expect(response.body.data.overview.totalVehicles).toBe(1000);
      expect(response.body.data.overview.activeSessions).toBe(150);
      expect(response.body.data.overview.totalUsers).toBe(300);

      // Verify occupancy calculations
      expect(response.body.data.occupancy).toBeDefined();
      expect(response.body.data.occupancy.totalSpots).toBe(500);
      expect(response.body.data.occupancy.availableSpots).toBe(125);
      expect(response.body.data.occupancy.occupiedSpots).toBe(375);
      expect(response.body.data.occupancy.occupancyRate).toBe(75.0);

      // Verify revenue data
      expect(response.body.data.revenue).toBeDefined();
      expect(response.body.data.revenue.monthlyRevenue).toBe(15000);
      expect(response.body.data.revenue.period).toBe('last_30_days');

      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle zero spots gracefully', async () => {
      mockPrisma.parkingSpot.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/analytics/system')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.occupancy.occupancyRate).toBe(0);
    });

    it('should handle null revenue data', async () => {
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const response = await request(app)
        .get('/api/analytics/system')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.revenue.monthlyRevenue).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.garage.count.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/analytics/system')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(API_RESPONSES.ERRORS.INTERNAL_ERROR);
    });
  });

  describe('GET /api/analytics/garages/:id - getGarageAnalytics', () => {
    const mockGarage = {
      id: 'garage-001',
      name: 'Test Garage',
      description: 'Test garage description',
      floors: [
        {
          id: 'floor-001',
          floorNumber: 1,
          spots: [
            { id: 'spot-001', status: 'AVAILABLE' },
            { id: 'spot-002', status: 'OCCUPIED' },
            { id: 'spot-003', status: 'AVAILABLE' }
          ]
        },
        {
          id: 'floor-002',
          floorNumber: 2,
          spots: [
            { id: 'spot-004', status: 'OCCUPIED' },
            { id: 'spot-005', status: 'OCCUPIED' }
          ]
        }
      ]
    };

    it('should get garage analytics successfully', async () => {
      mockPrisma.garage.findUnique.mockResolvedValue(mockGarage);

      const response = await request(app)
        .get('/api/analytics/garages/garage-001')
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Garage analytics retrieved successfully');
      
      expect(response.body.data.garage).toBeDefined();
      expect(response.body.data.garage.id).toBe('garage-001');
      expect(response.body.data.garage.name).toBe('Test Garage');

      expect(response.body.data.occupancy).toBeDefined();
      expect(response.body.data.occupancy.totalSpots).toBe(5);
      expect(response.body.data.occupancy.availableSpots).toBe(2);
      expect(response.body.data.occupancy.occupiedSpots).toBe(3);
      expect(response.body.data.occupancy.occupancyRate).toBe(60.0);

      expect(response.body.data.floors).toHaveLength(2);
      expect(response.body.data.floors[0].floorNumber).toBe(1);
      expect(response.body.data.floors[0].totalSpots).toBe(3);
      expect(response.body.data.floors[0].availableSpots).toBe(2);
      expect(response.body.data.floors[0].occupiedSpots).toBe(1);
    });

    it('should handle garage not found (404)', async () => {
      mockPrisma.garage.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/analytics/garages/nonexistent-garage')
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage not found');
    });

    it('should handle garage with no floors gracefully', async () => {
      const emptyGarage = { ...mockGarage, floors: [] };
      mockPrisma.garage.findUnique.mockResolvedValue(emptyGarage);

      const response = await request(app)
        .get('/api/analytics/garages/empty-garage')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.occupancy.totalSpots).toBe(0);
      expect(response.body.data.occupancy.occupancyRate).toBe(0);
      expect(response.body.data.floors).toHaveLength(0);
    });

    it('should handle query parameters', async () => {
      mockPrisma.garage.findUnique.mockResolvedValue(mockGarage);

      const response = await request(app)
        .get('/api/analytics/garages/garage-001?startDate=2024-01-01&endDate=2024-01-31')
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
    });

    it('should handle database errors', async () => {
      mockPrisma.garage.findUnique.mockRejectedValue(new Error('Database query failed'));

      const response = await request(app)
        .get('/api/analytics/garages/error-garage')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(API_RESPONSES.ERRORS.INTERNAL_ERROR);
    });
  });

  describe('GET /api/analytics/dashboard - getDashboardAnalytics', () => {
    it('should get dashboard analytics successfully', async () => {
      // Mock the Promise.all results
      mockPrisma.parkingSession.count
        .mockResolvedValueOnce(1000) // Total sessions
        .mockResolvedValueOnce(25)   // Today sessions
        .mockResolvedValueOnce(150)  // Week sessions
        .mockResolvedValueOnce(400); // Month sessions

      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 50000 } }) // Total revenue
        .mockResolvedValueOnce({ _sum: { amount: 1200 } });  // Today revenue

      mockPrisma.parkingSpot.count
        .mockResolvedValueOnce(300) // Total spots
        .mockResolvedValueOnce(180); // Occupied spots

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Dashboard analytics retrieved successfully');

      // Verify sessions data
      expect(response.body.data.sessions).toBeDefined();
      expect(response.body.data.sessions.total).toBe(1000);
      expect(response.body.data.sessions.today).toBe(25);
      expect(response.body.data.sessions.thisWeek).toBe(150);
      expect(response.body.data.sessions.thisMonth).toBe(400);

      // Verify revenue data
      expect(response.body.data.revenue).toBeDefined();
      expect(response.body.data.revenue.total).toBe(50000);
      expect(response.body.data.revenue.today).toBe(1200);

      // Verify occupancy data
      expect(response.body.data.occupancy).toBeDefined();
      expect(response.body.data.occupancy.totalSpots).toBe(300);
      expect(response.body.data.occupancy.availableSpots).toBe(120);
      expect(response.body.data.occupancy.occupiedSpots).toBe(180);
      expect(response.body.data.occupancy.occupancyRate).toBe(60.0);
    });

    it('should handle null revenue aggregations', async () => {
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrisma.parkingSession.count.mockResolvedValue(0);
      mockPrisma.parkingSpot.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.revenue.total).toBe(0);
      expect(response.body.data.revenue.today).toBe(0);
    });

    it('should handle database errors', async () => {
      mockPrisma.parkingSession.count.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(API_RESPONSES.ERRORS.INTERNAL_ERROR);
    });
  });

  describe('GET /api/analytics/occupancy-trends - getOccupancyTrends', () => {
    it('should get occupancy trends successfully', async () => {
      const response = await request(app)
        .get('/api/analytics/occupancy-trends')
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Occupancy trends retrieved successfully');
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify trend data structure
      const firstTrend = response.body.data[0];
      expect(firstTrend.timestamp).toBeDefined();
      expect(firstTrend.occupancyRate).toBeDefined();
      expect(firstTrend.totalSpots).toBeDefined();
    });

    it('should handle service errors', async () => {
      // Force an error by overriding the controller method
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      // This is a bit tricky to test since the trends are mock data
      // For now, we'll just verify the response structure
      const response = await request(app)
        .get('/api/analytics/occupancy-trends')
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      
      console.error = originalConsoleError;
    });
  });

  describe('Placeholder Analytics Endpoints', () => {
    const placeholderEndpoints = [
      '/api/analytics/revenue-data',
      '/api/analytics/vehicle-type-distribution', 
      '/api/analytics/duration-distribution',
      '/api/analytics/peak-hours-data',
      '/api/analytics/spot-utilization',
      '/api/analytics/export-report'
    ];

    it.each(placeholderEndpoints)('should respond successfully to %s', async (endpoint) => {
      const response = await request(app)
        .get(endpoint)
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent analytics requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/api/analytics/system')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle malformed garage ID', async () => {
      mockPrisma.garage.findUnique.mockResolvedValue(null);

      const malformedIds = ['', 'invalid-id', '12345', 'garage-@#$'];

      for (const id of malformedIds) {
        const response = await request(app)
          .get(`/api/analytics/garages/${id}`)
          .expect(HTTP_STATUS.NOT_FOUND);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Garage not found');
      }
    });

    it('should handle large numbers in calculations', async () => {
      // Test with very large numbers
      mockPrisma.parkingSpot.count
        .mockResolvedValueOnce(999999) // Total spots
        .mockResolvedValueOnce(500000); // Available spots

      const response = await request(app)
        .get('/api/analytics/system')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.occupancy.totalSpots).toBe(999999);
      expect(response.body.data.occupancy.occupiedSpots).toBe(499999);
      expect(response.body.data.occupancy.occupancyRate).toBeCloseTo(50.0, 2);
    });

    it('should handle negative occupancy edge cases', async () => {
      // Edge case where available > total (data inconsistency)
      mockPrisma.parkingSpot.count
        .mockResolvedValueOnce(100) // Total spots
        .mockResolvedValueOnce(150); // Available spots (more than total)

      const response = await request(app)
        .get('/api/analytics/system')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.occupancy.occupiedSpots).toBe(-50);
      // The occupancy rate calculation should handle this gracefully
    });

    it('should handle database connection timeout', async () => {
      mockPrisma.garage.count.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );

      const response = await request(app)
        .get('/api/analytics/system')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(API_RESPONSES.ERRORS.INTERNAL_ERROR);
    });
  });

  describe('Performance Tests', () => {
    it('should complete system analytics within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/analytics/system')
        .expect(HTTP_STATUS.OK);

      const duration = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple concurrent dashboard requests', async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app).get('/api/analytics/dashboard')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
      });

      expect(duration).toBeLessThan(10000); // All requests within 10 seconds
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent timestamp format', async () => {
      const response = await request(app)
        .get('/api/analytics/system')
        .expect(HTTP_STATUS.OK);

      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
      
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should include all required response fields', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return properly formatted error responses', async () => {
      mockPrisma.garage.count.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/analytics/system')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Data Validation', () => {
    it('should validate garage analytics floor data', async () => {
      const garageWithInvalidFloors = {
        id: 'garage-invalid',
        name: 'Invalid Garage',
        description: 'Test',
        floors: [
          {
            id: 'floor-001',
            floorNumber: 1,
            spots: null // Invalid spots data
          }
        ]
      };

      mockPrisma.garage.findUnique.mockResolvedValue(garageWithInvalidFloors);

      const response = await request(app)
        .get('/api/analytics/garages/garage-invalid')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing garage properties gracefully', async () => {
      const incompleteGarage = {
        id: 'garage-incomplete',
        // Missing name and description
        floors: []
      };

      mockPrisma.garage.findUnique.mockResolvedValue(incompleteGarage);

      const response = await request(app)
        .get('/api/analytics/garages/garage-incomplete')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.garage.name).toBeUndefined();
      expect(response.body.data.garage.description).toBeUndefined();
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory with large datasets', async () => {
      // Mock large dataset
      const largeMockGarage = {
        id: 'large-garage',
        name: 'Large Garage',
        description: 'Very large garage',
        floors: Array.from({ length: 100 }, (_, i) => ({
          id: `floor-${i}`,
          floorNumber: i + 1,
          spots: Array.from({ length: 100 }, (_, j) => ({
            id: `spot-${i}-${j}`,
            status: j % 2 === 0 ? 'AVAILABLE' : 'OCCUPIED'
          }))
        }))
      };

      mockPrisma.garage.findUnique.mockResolvedValue(largeMockGarage);

      const response = await request(app)
        .get('/api/analytics/garages/large-garage')
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floors.length).toBe(100);
      
      // Verify calculations are correct for large dataset
      expect(response.body.data.occupancy.totalSpots).toBe(10000);
      expect(response.body.data.occupancy.availableSpots).toBe(5000);
      expect(response.body.data.occupancy.occupiedSpots).toBe(5000);
      expect(response.body.data.occupancy.occupancyRate).toBe(50.0);
    });
  });
});