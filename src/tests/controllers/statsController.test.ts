import { Request, Response } from 'express';
import { StatsController } from '../../controllers/statsController';
import { StatsService } from '../../services/statsService';
import {
  createMockRequest,
  createMockResponse,
  mockConsole,
  expectSuccessResponse,
  expectErrorResponse
} from '../helpers/testUtils';

// Mock services
jest.mock('../../services/statsService');

const MockedStatsService = StatsService as jest.MockedClass<typeof StatsService>;

describe('StatsController', () => {
  let statsController: StatsController;
  let mockRequest: ReturnType<typeof createMockRequest>;
  let mockResponse: ReturnType<typeof createMockResponse>;
  let mockStatsService: jest.Mocked<StatsService>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();

    mockStatsService = {
      getOverallStats: jest.fn(),
      getRevenueStats: jest.fn(),
      getOccupancyStats: jest.fn(),
      getVehicleStats: jest.fn(),
      getUtilizationStats: jest.fn(),
      getPeakHoursStats: jest.fn(),
      getDurationStats: jest.fn(),
      getRealtimeStats: jest.fn(),
      getHistoricalStats: jest.fn(),
      exportStats: jest.fn(),
      getComparisonStats: jest.fn(),
      getTrendAnalysis: jest.fn(),
    } as any;

    MockedStatsService.mockImplementation(() => mockStatsService);
    statsController = new StatsController();
    jest.clearAllMocks();
  });

  mockConsole();

  describe('getOverallStats', () => {
    it('should return comprehensive overall statistics', async () => {
      const mockStats = {
        summary: {
          totalSpots: 500,
          availableSpots: 125,
          occupiedSpots: 375,
          occupancyRate: 75.0,
          totalRevenue: 125000.50,
          totalSessions: 25000,
          averageSessionDuration: 7200000 // 2 hours in milliseconds
        },
        breakdown: {
          byVehicleType: {
            COMPACT: { count: 150, revenue: 37500.00 },
            STANDARD: { count: 200, revenue: 62500.00 },
            OVERSIZED: { count: 25, revenue: 25000.50 }
          },
          byFloor: {
            1: { spots: 100, occupied: 80, revenue: 20000.00 },
            2: { spots: 150, occupied: 110, revenue: 30000.00 },
            3: { spots: 125, occupied: 95, revenue: 25000.00 },
            4: { spots: 125, occupied: 90, revenue: 22500.50 }
          }
        },
        timeRange: {
          start: '2023-06-01T00:00:00.000Z',
          end: '2023-06-15T23:59:59.999Z'
        }
      };

      mockStatsService.getOverallStats.mockResolvedValue(mockStats);

      await statsController.getOverallStats(mockRequest as any, mockResponse as any);

      expect(mockStatsService.getOverallStats).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Overall statistics retrieved successfully',
        data: mockStats,
        timestamp: expect.any(String)
      });
    });

    it('should handle date range filters', async () => {
      mockRequest.query = {
        startDate: '2023-06-01',
        endDate: '2023-06-15',
        includeBreakdown: 'true'
      };

      const filteredStats = {
        summary: { totalSpots: 500, occupancyRate: 68.5 },
        breakdown: { byVehicleType: {}, byFloor: {} },
        timeRange: {
          start: '2023-06-01T00:00:00.000Z',
          end: '2023-06-15T23:59:59.999Z'
        }
      };

      mockStatsService.getOverallStats.mockResolvedValue(filteredStats);

      await statsController.getOverallStats(mockRequest as any, mockResponse as any);

      expect(mockStatsService.getOverallStats).toHaveBeenCalledWith({
        startDate: '2023-06-01',
        endDate: '2023-06-15',
        includeBreakdown: true
      });
    });

    it('should handle service errors', async () => {
      mockStatsService.getOverallStats.mockRejectedValue(
        new Error('Statistics calculation failed')
      );

      await statsController.getOverallStats(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 500, 'Failed to retrieve overall statistics');
    });
  });

  describe('getRevenueStats', () => {
    it('should return revenue statistics with trends', async () => {
      const mockRevenueStats = {
        totalRevenue: 87500.25,
        dailyRevenue: 2500.00,
        weeklyRevenue: 17500.00,
        monthlyRevenue: 75000.25,
        averageRevenuePerSession: 3.50,
        revenueByPaymentMethod: {
          credit_card: 65625.19,
          cash: 10937.53,
          mobile_app: 10937.53
        },
        hourlyBreakdown: [
          { hour: 8, revenue: 1250.00, sessions: 357 },
          { hour: 9, revenue: 1875.50, sessions: 536 },
          { hour: 12, revenue: 2100.75, sessions: 600 },
          { hour: 17, revenue: 1950.25, sessions: 557 }
        ],
        trends: {
          dailyGrowth: 5.2,
          weeklyGrowth: 12.8,
          monthlyGrowth: -2.1
        }
      };

      mockStatsService.getRevenueStats.mockResolvedValue(mockRevenueStats);

      await statsController.getRevenueStats(mockRequest as any, mockResponse as any);

      expect(mockStatsService.getRevenueStats).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Revenue statistics retrieved successfully',
        data: mockRevenueStats,
        timestamp: expect.any(String)
      });
    });

    it('should handle zero revenue gracefully', async () => {
      const zeroRevenueStats = {
        totalRevenue: 0,
        dailyRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        averageRevenuePerSession: 0,
        revenueByPaymentMethod: {},
        hourlyBreakdown: [],
        trends: {
          dailyGrowth: 0,
          weeklyGrowth: 0,
          monthlyGrowth: 0
        }
      };

      mockStatsService.getRevenueStats.mockResolvedValue(zeroRevenueStats);

      await statsController.getRevenueStats(mockRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalRevenue: 0
          })
        })
      );
    });
  });

  describe('getOccupancyStats', () => {
    it('should return occupancy statistics and patterns', async () => {
      const mockOccupancyStats = {
        currentOccupancy: {
          totalSpots: 500,
          occupiedSpots: 387,
          availableSpots: 113,
          occupancyRate: 77.4,
          outOfServiceSpots: 5
        },
        historicalAverages: {
          dailyAverage: 72.5,
          weeklyAverage: 69.8,
          monthlyAverage: 71.2,
          yearToDateAverage: 68.9
        },
        peakOccupancy: {
          rate: 98.5,
          timestamp: '2023-06-14T14:30:00.000Z',
          duration: 45 // minutes
        },
        lowOccupancy: {
          rate: 12.3,
          timestamp: '2023-06-13T03:15:00.000Z',
          duration: 180 // minutes
        },
        patterns: {
          weekdayAverage: 78.5,
          weekendAverage: 52.1,
          rushHourPeak: 92.3,
          overnightLow: 8.7
        },
        forecast: {
          nextHour: 82.1,
          nextDay: 74.5,
          confidence: 0.89
        }
      };

      mockStatsService.getOccupancyStats.mockResolvedValue(mockOccupancyStats);

      await statsController.getOccupancyStats(mockRequest as any, mockResponse as any);

      expect(mockStatsService.getOccupancyStats).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Occupancy statistics retrieved successfully',
        data: mockOccupancyStats,
        timestamp: expect.any(String)
      });
    });

    it('should handle empty occupancy data', async () => {
      const emptyStats = {
        currentOccupancy: {
          totalSpots: 0,
          occupiedSpots: 0,
          availableSpots: 0,
          occupancyRate: 0,
          outOfServiceSpots: 0
        },
        historicalAverages: {},
        patterns: {},
        forecast: null
      };

      mockStatsService.getOccupancyStats.mockResolvedValue(emptyStats);

      await statsController.getOccupancyStats(mockRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentOccupancy: expect.objectContaining({
              totalSpots: 0,
              occupancyRate: 0
            })
          })
        })
      );
    });
  });

  describe('getVehicleStats', () => {
    it('should return comprehensive vehicle statistics', async () => {
      const mockVehicleStats = {
        totalVehiclesParked: 387,
        vehiclesByType: {
          COMPACT: { count: 142, percentage: 36.7 },
          STANDARD: { count: 201, percentage: 51.9 },
          OVERSIZED: { count: 44, percentage: 11.4 }
        },
        averageParkingDuration: {
          overall: 7200000, // 2 hours
          byType: {
            COMPACT: 5400000, // 1.5 hours
            STANDARD: 7200000, // 2 hours
            OVERSIZED: 10800000 // 3 hours
          }
        },
        sessionDistribution: {
          under1Hour: 89,
          oneToThreeHours: 201,
          threeToSixHours: 67,
          sixToTwelveHours: 25,
          overTwelveHours: 5
        },
        peakVehicleTypes: {
          weekdays: 'STANDARD',
          weekends: 'COMPACT',
          rushHours: 'STANDARD'
        },
        turnoverRate: 2.3, // vehicles per spot per day
        frequentParkers: 15 // vehicles with 5+ sessions this month
      };

      mockStatsService.getVehicleStats.mockResolvedValue(mockVehicleStats);

      await statsController.getVehicleStats(mockRequest as any, mockResponse as any);

      expect(mockStatsService.getVehicleStats).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Vehicle statistics retrieved successfully',
        data: mockVehicleStats,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getPeakHoursStats', () => {
    it('should return peak hours analysis', async () => {
      const mockPeakStats = {
        dailyPeaks: [
          { hour: 8, occupancyRate: 92.5, avgDuration: 6300000 },
          { hour: 12, occupancyRate: 87.3, avgDuration: 4500000 },
          { hour: 17, occupancyRate: 94.8, avgDuration: 5400000 }
        ],
        weeklyPatterns: {
          monday: { peakHour: 8, peakRate: 89.2 },
          tuesday: { peakHour: 9, peakRate: 91.7 },
          wednesday: { peakHour: 8, peakRate: 93.1 },
          thursday: { peakHour: 8, peakRate: 94.5 },
          friday: { peakHour: 17, peakRate: 96.2 },
          saturday: { peakHour: 14, peakRate: 76.8 },
          sunday: { peakHour: 15, peakRate: 68.4 }
        },
        seasonalTrends: {
          spring: { avgPeakRate: 88.7, rushHourIntensity: 'HIGH' },
          summer: { avgPeakRate: 82.3, rushHourIntensity: 'MEDIUM' },
          fall: { avgPeakRate: 91.2, rushHourIntensity: 'HIGH' },
          winter: { avgPeakRate: 85.9, rushHourIntensity: 'MEDIUM' }
        },
        congestionMetrics: {
          avgWaitTime: 12.5, // minutes
          maxQueueLength: 23,
          exitEfficiency: 0.87
        }
      };

      mockStatsService.getPeakHoursStats.mockResolvedValue(mockPeakStats);

      await statsController.getPeakHoursStats(mockRequest as any, mockResponse as any);

      expect(mockStatsService.getPeakHoursStats).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Peak hours statistics retrieved successfully',
        data: mockPeakStats,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getRealtimeStats', () => {
    it('should return real-time statistics', async () => {
      const mockRealtimeStats = {
        currentStatus: {
          timestamp: '2023-06-15T14:30:15.123Z',
          occupancyRate: 78.4,
          availableSpots: 108,
          totalSpots: 500,
          vehiclesEntering: 3,
          vehiclesExiting: 1,
          queueLength: 5
        },
        liveMetrics: {
          revenueToday: 3247.50,
          sessionsToday: 892,
          avgSessionDuration: 6900000,
          peakOccupancyToday: 96.2,
          efficiency: 0.91
        },
        predictions: {
          occupancyIn1Hour: 82.7,
          occupancyIn3Hours: 74.1,
          predictedPeakTime: '17:30',
          confidence: 0.84
        },
        alerts: [
          {
            type: 'HIGH_OCCUPANCY',
            message: 'Approaching capacity - 92% occupied',
            priority: 'HIGH',
            timestamp: '2023-06-15T14:28:00.000Z'
          },
          {
            type: 'MAINTENANCE_DUE',
            message: '3 spots scheduled for maintenance',
            priority: 'MEDIUM',
            timestamp: '2023-06-15T14:25:00.000Z'
          }
        ]
      };

      mockStatsService.getRealtimeStats.mockResolvedValue(mockRealtimeStats);

      await statsController.getRealtimeStats(mockRequest as any, mockResponse as any);

      expect(mockStatsService.getRealtimeStats).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Real-time statistics retrieved successfully',
        data: mockRealtimeStats,
        timestamp: expect.any(String)
      });
    });

    it('should handle real-time service unavailability', async () => {
      mockStatsService.getRealtimeStats.mockRejectedValue(
        new Error('Real-time service temporarily unavailable')
      );

      await statsController.getRealtimeStats(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 503, 'Real-time statistics temporarily unavailable');
    });
  });

  describe('exportStats', () => {
    it('should export statistics in specified format', async () => {
      mockRequest.query = {
        format: 'csv',
        startDate: '2023-06-01',
        endDate: '2023-06-15',
        includeDetails: 'true'
      };

      const mockExportResult = {
        success: true,
        exportUrl: '/exports/stats-20230615.csv',
        filename: 'parking-stats-20230615.csv',
        size: 45678,
        recordCount: 1234,
        generatedAt: '2023-06-15T14:30:00.000Z',
        expiresAt: '2023-06-16T14:30:00.000Z'
      };

      mockStatsService.exportStats.mockResolvedValue(mockExportResult);

      await statsController.exportStats(mockRequest as any, mockResponse as any);

      expect(mockStatsService.exportStats).toHaveBeenCalledWith({
        format: 'csv',
        startDate: '2023-06-01',
        endDate: '2023-06-15',
        includeDetails: true
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Statistics export generated successfully',
        data: mockExportResult,
        timestamp: expect.any(String)
      });
    });

    it('should handle unsupported export formats', async () => {
      mockRequest.query = { format: 'unsupported' };

      mockStatsService.exportStats.mockRejectedValue(
        new Error('Unsupported export format: unsupported')
      );

      await statsController.exportStats(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Unsupported export format');
    });
  });

  describe('getTrendAnalysis', () => {
    it('should return comprehensive trend analysis', async () => {
      mockRequest.query = {
        metric: 'occupancy',
        period: '30d',
        granularity: 'daily'
      };

      const mockTrends = {
        metric: 'occupancy',
        period: '30d',
        granularity: 'daily',
        dataPoints: [
          { date: '2023-06-01', value: 72.5, trend: 'UP' },
          { date: '2023-06-02', value: 74.1, trend: 'UP' },
          { date: '2023-06-03', value: 73.8, trend: 'STABLE' }
        ],
        summary: {
          average: 73.8,
          min: 65.2,
          max: 87.4,
          stdDev: 5.7,
          overallTrend: 'INCREASING',
          changeRate: 0.15, // 15% increase
          volatility: 'LOW'
        },
        patterns: [
          'Higher occupancy on weekdays',
          'Peak usage between 8-10 AM and 5-7 PM',
          'Gradual increase over the analysis period'
        ],
        forecasts: [
          { date: '2023-06-16', predicted: 75.2, confidence: 0.87 },
          { date: '2023-06-17', predicted: 76.1, confidence: 0.84 }
        ]
      };

      mockStatsService.getTrendAnalysis.mockResolvedValue(mockTrends);

      await statsController.getTrendAnalysis(mockRequest as any, mockResponse as any);

      expect(mockStatsService.getTrendAnalysis).toHaveBeenCalledWith({
        metric: 'occupancy',
        period: '30d',
        granularity: 'daily'
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Trend analysis completed successfully',
        data: mockTrends,
        timestamp: expect.any(String)
      });
    });

    it('should handle insufficient data for trends', async () => {
      mockStatsService.getTrendAnalysis.mockRejectedValue(
        new Error('Insufficient data for trend analysis')
      );

      await statsController.getTrendAnalysis(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Insufficient data for trend analysis');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connectivity issues', async () => {
      mockStatsService.getOverallStats.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused')
      );

      await statsController.getOverallStats(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 500, 'Failed to retrieve overall statistics');
    });

    it('should handle memory limitations for large datasets', async () => {
      mockStatsService.exportStats.mockRejectedValue(
        new Error('Dataset too large for export - memory limit exceeded')
      );

      await statsController.exportStats(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Dataset too large for export');
    });

    it('should handle concurrent statistics requests', async () => {
      const mockStats = { totalSpots: 500, occupancyRate: 75 };
      
      mockStatsService.getOverallStats.mockResolvedValue(mockStats);

      // Simulate multiple concurrent requests
      const promises = Array(5).fill(null).map(() => {
        const req = createMockRequest();
        const res = createMockResponse();
        return statsController.getOverallStats(req as any, res as any);
      });

      await Promise.all(promises);

      expect(mockStatsService.getOverallStats).toHaveBeenCalledTimes(5);
    });

    it('should validate date range parameters', async () => {
      mockRequest.query = {
        startDate: '2023-06-15',
        endDate: '2023-06-01' // End before start
      };

      mockStatsService.getOverallStats.mockRejectedValue(
        new Error('Invalid date range: end date must be after start date')
      );

      await statsController.getOverallStats(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Invalid date range');
    });

    it('should handle malformed query parameters', async () => {
      mockRequest.query = {
        startDate: 'not-a-date',
        includeBreakdown: 'maybe',
        limit: 'unlimited'
      };

      mockStatsService.getOverallStats.mockRejectedValue(
        new Error('Invalid query parameters')
      );

      await statsController.getOverallStats(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Invalid query parameters');
    });

    it('should handle statistics calculation timeouts', async () => {
      mockStatsService.getOverallStats.mockRejectedValue(
        new Error('Statistics calculation timeout')
      );

      await statsController.getOverallStats(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 408, 'Statistics calculation timeout');
    });

    it('should gracefully handle missing optional data', async () => {
      const partialStats = {
        summary: { totalSpots: 500, occupancyRate: 75 },
        // Missing breakdown, timeRange, etc.
      };

      mockStatsService.getOverallStats.mockResolvedValue(partialStats);

      await statsController.getOverallStats(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: partialStats
        })
      );
    });
  });
});