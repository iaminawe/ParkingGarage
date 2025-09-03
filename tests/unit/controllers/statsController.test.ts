/**
 * Stats Controller Tests
 * 
 * Comprehensive test suite for the StatsController covering:
 * - Garage statistics
 * - Floor-specific statistics
 * - Occupancy trends
 * - Revenue analytics
 * - Usage patterns
 * - Dashboard summaries
 * - Comparative statistics
 * - Data export functionality
 * - Health checks
 * - Input validation
 * - Error handling
 */

import request from 'supertest';
import app from '../../../src/app';
import { StatsController } from '../../../src/controllers/statsController';
import { ReportingService } from '../../../src/services/ReportingService';

// Mock the services
jest.mock('../../../src/services/ReportingService');

const MockedReportingService = ReportingService as jest.MockedClass<typeof ReportingService>;

describe('StatsController', () => {
  let statsController: StatsController;
  let mockReportingService: jest.Mocked<ReportingService>;

  const mockGarageStats = {
    totalSpots: 300,
    occupiedSpots: 180,
    availableSpots: 120,
    occupancyRate: 60.0,
    currentSessions: 180,
    byType: {
      compact: { total: 120, occupied: 72, available: 48 },
      standard: { total: 120, occupied: 72, available: 48 },
      oversized: { total: 60, occupied: 36, available: 24 }
    },
    byFloor: {
      1: { total: 100, occupied: 60, available: 40 },
      2: { total: 100, occupied: 60, available: 40 },
      3: { total: 100, occupied: 60, available: 40 }
    },
    averageDuration: 145,
    garage: {
      id: 'garage-001',
      name: 'Downtown Parking',
      description: 'Main parking facility'
    },
    timestamp: new Date().toISOString()
  };

  const mockFloorStats = {
    floorNumber: 2,
    totalSpots: 100,
    occupiedSpots: 60,
    availableSpots: 40,
    occupancyRate: 60.0,
    byType: {
      compact: { total: 40, occupied: 24, available: 16 },
      standard: { total: 40, occupied: 24, available: 16 },
      oversized: { total: 20, occupied: 12, available: 8 }
    },
    revenue: {
      today: 450.00,
      thisWeek: 3150.00,
      thisMonth: 13500.00
    },
    peakHours: ['09:00-11:00', '17:00-19:00'],
    averageDuration: 135
  };

  const mockOccupancyTrends = [
    { timestamp: '2024-01-01T08:00:00Z', occupancyRate: 45.5, totalSessions: 137 },
    { timestamp: '2024-01-01T09:00:00Z', occupancyRate: 62.3, totalSessions: 187 },
    { timestamp: '2024-01-01T10:00:00Z', occupancyRate: 78.9, totalSessions: 237 },
    { timestamp: '2024-01-01T11:00:00Z', occupancyRate: 71.2, totalSessions: 214 }
  ];

  const mockRevenueAnalytics = {
    revenue: 2450.00,
    sessions: 196,
    averagePerSession: 12.5,
    dailyBreakdown: [
      { date: '2024-01-01', revenue: 450.00, sessions: 36 },
      { date: '2024-01-02', revenue: 520.00, sessions: 42 },
      { date: '2024-01-03', revenue: 380.00, sessions: 30 }
    ],
    trends: {
      weeklyGrowth: 12.5,
      monthlyGrowth: 8.3
    }
  };

  const mockUsagePatterns = {
    totalSessions: 1450,
    peaks: {
      hour: '09:00-10:00',
      day: 'Tuesday',
      occupancyRate: 89.5
    },
    patterns: {
      hourly: [
        { hour: '08:00', sessions: 45, occupancyRate: 55.2 },
        { hour: '09:00', sessions: 78, occupancyRate: 89.5 },
        { hour: '10:00', sessions: 65, occupancyRate: 76.8 }
      ],
      daily: [
        { day: 'Monday', sessions: 180, occupancyRate: 72.3 },
        { day: 'Tuesday', sessions: 220, occupancyRate: 78.9 },
        { day: 'Wednesday', sessions: 195, occupancyRate: 69.1 }
      ]
    },
    averageSessionDuration: 145,
    shortestSession: 15,
    longestSession: 480
  };

  const mockHealthCheck = {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    uptime: 86400,
    version: '1.0.0',
    services: {
      database: 'connected' as const,
      cache: 'connected' as const,
      storage: 'available' as const
    },
    stats: {
      totalRequests: 1250,
      avgResponseTime: 125.5,
      errorRate: 0.02
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    statsController = new StatsController();
    
    // Get mocked instance
    mockReportingService = MockedReportingService.mock.instances[MockedReportingService.mock.instances.length - 1] as jest.Mocked<ReportingService>;

    // Set up default mocks for the analyticsService
    const mockAnalyticsService = {
      getGarageStats: jest.fn().mockResolvedValue(mockGarageStats),
      getFloorStats: jest.fn().mockResolvedValue(mockFloorStats),
      getOccupancyTrends: jest.fn().mockResolvedValue(mockOccupancyTrends),
      getRevenueAnalytics: jest.fn().mockResolvedValue(mockRevenueAnalytics),
      getUsagePatterns: jest.fn().mockResolvedValue(mockUsagePatterns)
    };

    // Replace the mock analyticsService
    (statsController as any).analyticsService = mockAnalyticsService;
  });

  describe('GET /api/v1/stats - getGarageStats', () => {
    it('should get garage statistics successfully', async () => {
      const response = await request(app)
        .get('/api/v1/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalSpots).toBe(300);
      expect(response.body.data.occupancyRate).toBe(60.0);
      expect(response.body.data.byType).toBeDefined();
      expect(response.body.data.byFloor).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle garage not initialized error (404)', async () => {
      const mockAnalyticsService = (statsController as any).analyticsService;
      mockAnalyticsService.getGarageStats.mockRejectedValue(
        new Error('Garage not initialized - please initialize first')
      );

      const response = await request(app)
        .get('/api/v1/stats')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage not initialized');
      expect(response.body.errors).toContain('Please initialize the garage first');
    });

    it('should handle service error (500)', async () => {
      const mockAnalyticsService = (statsController as any).analyticsService;
      mockAnalyticsService.getGarageStats.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should show different error messages in development vs production', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const mockAnalyticsService = (statsController as any).analyticsService;
      
      // Test development mode
      process.env.NODE_ENV = 'development';
      mockAnalyticsService.getGarageStats.mockRejectedValue(new Error('Detailed database error'));

      const devResponse = await request(app)
        .get('/api/v1/stats')
        .expect(500);

      expect(devResponse.body.errors[0]).toBe('Detailed database error');

      // Test production mode
      process.env.NODE_ENV = 'production';
      mockAnalyticsService.getGarageStats.mockRejectedValue(new Error('Detailed database error'));

      const prodResponse = await request(app)
        .get('/api/v1/stats')
        .expect(500);

      expect(prodResponse.body.errors[0]).toBe('Internal server error');

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('GET /api/v1/stats/floor/:id - getFloorStats', () => {
    it('should get floor statistics with valid floor number', async () => {
      const response = await request(app)
        .get('/api/v1/stats/floor/2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.floorNumber).toBe(2);
      expect(response.body.data.totalSpots).toBe(100);
      expect(response.body.data.occupancyRate).toBe(60.0);

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getFloorStats).toHaveBeenCalledWith(2);
    });

    it('should reject invalid floor ID format (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/floor/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Floor ID must be a positive number');
    });

    it('should reject negative floor numbers (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/floor/-1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Floor ID must be a positive number');
    });

    it('should reject zero floor number (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/floor/0')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Floor ID must be a positive number');
    });

    it('should handle floor not found error (404)', async () => {
      const mockAnalyticsService = (statsController as any).analyticsService;
      mockAnalyticsService.getFloorStats.mockRejectedValue(
        new Error('Floor 5 not found in garage configuration')
      );

      const response = await request(app)
        .get('/api/v1/stats/floor/5')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Floor not found');
      expect(response.body.errors).toContain('Floor 5 not found in garage configuration');
    });

    it('should handle garage not initialized for floor stats (404)', async () => {
      const mockAnalyticsService = (statsController as any).analyticsService;
      mockAnalyticsService.getFloorStats.mockRejectedValue(
        new Error('Garage not initialized - cannot get floor stats')
      );

      const response = await request(app)
        .get('/api/v1/stats/floor/1')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage not initialized');
    });
  });

  describe('GET /api/v1/stats/trends - getOccupancyTrends', () => {
    it('should get occupancy trends with default hours', async () => {
      const response = await request(app)
        .get('/api/v1/stats/trends')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getOccupancyTrends).toHaveBeenCalledWith({ hours: 24 });
    });

    it('should get occupancy trends with custom hours', async () => {
      const response = await request(app)
        .get('/api/v1/stats/trends?hours=48')
        .expect(200);

      expect(response.body.success).toBe(true);

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getOccupancyTrends).toHaveBeenCalledWith({ hours: 48 });
    });

    it('should reject invalid hours parameter (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/trends?hours=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Hours must be a number between 1 and 168 (1 week)');
    });

    it('should reject hours less than 1 (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/trends?hours=0')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Hours must be a number between 1 and 168 (1 week)');
    });

    it('should reject hours greater than 168 (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/trends?hours=200')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Hours must be a number between 1 and 168 (1 week)');
    });

    it('should handle service error', async () => {
      const mockAnalyticsService = (statsController as any).analyticsService;
      mockAnalyticsService.getOccupancyTrends.mockRejectedValue(new Error('Trends calculation failed'));

      const response = await request(app)
        .get('/api/v1/stats/trends')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('GET /api/v1/stats/revenue - getRevenueAnalytics', () => {
    it('should get revenue analytics with default days', async () => {
      const response = await request(app)
        .get('/api/v1/stats/revenue')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.revenue).toBeDefined();
      expect(response.body.data.sessions).toBeDefined();

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getRevenueAnalytics).toHaveBeenCalledWith({ days: 7 });
    });

    it('should get revenue analytics with custom days', async () => {
      const response = await request(app)
        .get('/api/v1/stats/revenue?days=30')
        .expect(200);

      expect(response.body.success).toBe(true);

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getRevenueAnalytics).toHaveBeenCalledWith({ days: 30 });
    });

    it('should reject invalid days parameter (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/revenue?days=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Days must be a number between 1 and 365 (1 year)');
    });

    it('should reject days less than 1 (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/revenue?days=0')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Days must be a number between 1 and 365 (1 year)');
    });

    it('should reject days greater than 365 (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/revenue?days=400')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Days must be a number between 1 and 365 (1 year)');
    });
  });

  describe('GET /api/v1/stats/usage - getUsagePatterns', () => {
    it('should get usage patterns successfully', async () => {
      const response = await request(app)
        .get('/api/v1/stats/usage')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalSessions).toBe(1450);
      expect(response.body.data.peaks).toBeDefined();
      expect(response.body.data.patterns).toBeDefined();

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getUsagePatterns).toHaveBeenCalled();
    });

    it('should handle service error', async () => {
      const mockAnalyticsService = (statsController as any).analyticsService;
      mockAnalyticsService.getUsagePatterns.mockRejectedValue(new Error('Usage pattern calculation failed'));

      const response = await request(app)
        .get('/api/v1/stats/usage')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('GET /api/v1/stats/occupancy - getOccupancySummary', () => {
    it('should get occupancy summary successfully', async () => {
      const response = await request(app)
        .get('/api/v1/stats/occupancy')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.occupancy).toBeDefined();
      expect(response.body.data.occupancy.totalSpots).toBe(300);
      expect(response.body.data.occupancy.occupancyRate).toBe(60.0);
      expect(response.body.data.occupancy.byType).toBeDefined();
      expect(response.body.data.occupancy.byFloor).toBeDefined();
    });
  });

  describe('GET /api/v1/stats/dashboard - getDashboardStats', () => {
    it('should get dashboard statistics successfully', async () => {
      const response = await request(app)
        .get('/api/v1/stats/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dashboard).toBeDefined();
      expect(response.body.data.dashboard.overview).toBeDefined();
      expect(response.body.data.dashboard.revenue).toBeDefined();
      expect(response.body.data.dashboard.usage).toBeDefined();
      expect(response.body.data.dashboard.byType).toBeDefined();
      expect(response.body.data.dashboard.byFloor).toBeDefined();

      // Verify multiple services were called
      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getGarageStats).toHaveBeenCalled();
      expect(mockAnalyticsService.getRevenueAnalytics).toHaveBeenCalledWith({ days: 1 });
      expect(mockAnalyticsService.getUsagePatterns).toHaveBeenCalled();
    });

    it('should handle dashboard service error', async () => {
      const mockAnalyticsService = (statsController as any).analyticsService;
      mockAnalyticsService.getGarageStats.mockRejectedValue(new Error('Dashboard data failed'));

      const response = await request(app)
        .get('/api/v1/stats/dashboard')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('GET /api/v1/stats/compare - getComparativeStats', () => {
    it('should get comparative stats with default period', async () => {
      const response = await request(app)
        .get('/api/v1/stats/compare')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('day');
      expect(response.body.data.comparison).toBeDefined();
      expect(response.body.data.comparison.current).toBeDefined();

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getRevenueAnalytics).toHaveBeenCalledWith({ days: 1 });
    });

    it('should get comparative stats for week period', async () => {
      const response = await request(app)
        .get('/api/v1/stats/compare?period=week')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('week');

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getRevenueAnalytics).toHaveBeenCalledWith({ days: 7 });
    });

    it('should get comparative stats for month period', async () => {
      const response = await request(app)
        .get('/api/v1/stats/compare?period=month')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('month');

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getRevenueAnalytics).toHaveBeenCalledWith({ days: 30 });
    });

    it('should reject invalid period (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/compare?period=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Period must be one of: day, week, month');
    });
  });

  describe('GET /api/v1/stats/export - exportStats', () => {
    it('should export garage stats with default parameters', async () => {
      const response = await request(app)
        .get('/api/v1/stats/export')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exportType).toBe('garage');
      expect(response.body.data.exportFormat).toBe('json');
      expect(response.body.data.data).toBeDefined();
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="garage_stats_\d{4}-\d{2}-\d{2}\.json"/);
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    });

    it('should export revenue stats', async () => {
      const response = await request(app)
        .get('/api/v1/stats/export?type=revenue')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exportType).toBe('revenue');

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getRevenueAnalytics).toHaveBeenCalledWith({ days: 30 });
    });

    it('should export usage stats', async () => {
      const response = await request(app)
        .get('/api/v1/stats/export?type=usage')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exportType).toBe('usage');

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getUsagePatterns).toHaveBeenCalled();
    });

    it('should reject unsupported format (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/export?format=csv')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only JSON format is currently supported');
    });

    it('should reject invalid export type (400)', async () => {
      const response = await request(app)
        .get('/api/v1/stats/export?type=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Type must be one of: garage, revenue, usage');
    });
  });

  describe('GET /api/v1/stats/health - getHealthCheck', () => {
    it('should return healthy status when all services are working', async () => {
      const response = await request(app)
        .get('/api/v1/stats/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.uptime).toBeDefined();
      expect(response.body.data.version).toBe('1.0.0');
      expect(response.body.data.services).toBeDefined();
      expect(response.body.data.services.database).toBe('connected');
    });

    it('should return degraded status when database is down', async () => {
      const mockAnalyticsService = (statsController as any).analyticsService;
      mockAnalyticsService.getGarageStats.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/stats/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe('degraded');
      expect(response.body.data.services.database).toBe('disconnected');
    });

    it('should handle complete health check failure', async () => {
      // Mock the entire health check to fail
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Process uptime failed');
      });

      const response = await request(app)
        .get('/api/v1/stats/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Service unavailable');
      expect(response.body.errors).toContain('Health check failed');

      process.uptime = originalUptime;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/v1/stats')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getGarageStats).toHaveBeenCalledTimes(10);
    });

    it('should handle very large numbers in statistics', async () => {
      const largeStats = {
        ...mockGarageStats,
        totalSpots: 999999,
        occupiedSpots: 750000,
        availableSpots: 249999,
        occupancyRate: 75.0
      };

      const mockAnalyticsService = (statsController as any).analyticsService;
      mockAnalyticsService.getGarageStats.mockResolvedValue(largeStats);

      const response = await request(app)
        .get('/api/v1/stats')
        .expect(200);

      expect(response.body.data.totalSpots).toBe(999999);
      expect(response.body.data.occupancyRate).toBe(75.0);
    });

    it('should handle empty/null statistics gracefully', async () => {
      const emptyStats = {
        totalSpots: 0,
        occupiedSpots: 0,
        availableSpots: 0,
        occupancyRate: 0,
        currentSessions: 0,
        byType: {},
        byFloor: {},
        averageDuration: 0,
        garage: null,
        timestamp: new Date().toISOString()
      };

      const mockAnalyticsService = (statsController as any).analyticsService;
      mockAnalyticsService.getGarageStats.mockResolvedValue(emptyStats);

      const response = await request(app)
        .get('/api/v1/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSpots).toBe(0);
      expect(response.body.data.occupancyRate).toBe(0);
    });

    it('should handle float values in query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/stats/trends?hours=24.5')
        .expect(200);

      expect(response.body.success).toBe(true);

      const mockAnalyticsService = (statsController as any).analyticsService;
      expect(mockAnalyticsService.getOccupancyTrends).toHaveBeenCalledWith({ hours: 24 });
    });

    it('should handle negative numbers in query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/stats/revenue?days=-5')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('must be a number between 1 and 365');
    });
  });

  describe('Performance Tests', () => {
    it('should complete dashboard request within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v1/stats/dashboard')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple dashboard requests concurrently', async () => {
      const concurrentRequests = 5;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app).get('/api/v1/stats/dashboard')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(duration).toBeLessThan(10000); // All requests within 10 seconds
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response format for all endpoints', async () => {
      const endpoints = [
        '/api/v1/stats',
        '/api/v1/stats/floor/1',
        '/api/v1/stats/trends',
        '/api/v1/stats/revenue',
        '/api/v1/stats/usage',
        '/api/v1/stats/occupancy',
        '/api/v1/stats/dashboard',
        '/api/v1/stats/compare'
      ];

      const responses = await Promise.all(
        endpoints.map(endpoint => request(app).get(endpoint))
      );

      responses.forEach(response => {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
      });
    });

    it('should return consistent error response format', async () => {
      const mockAnalyticsService = (statsController as any).analyticsService;
      mockAnalyticsService.getGarageStats.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/v1/stats')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should include proper timestamps in all responses', async () => {
      const response = await request(app)
        .get('/api/v1/stats')
        .expect(200);

      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
      expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});