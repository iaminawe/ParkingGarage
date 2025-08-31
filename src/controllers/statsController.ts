/**
 * Statistics controller for analytics and reporting
 *
 * This controller handles HTTP requests for garage statistics,
 * occupancy reports, revenue analytics, and operational insights.
 * It uses the AnalyticsService for comprehensive data analysis.
 *
 * @module StatsController
 */

import { NextFunction } from 'express';
import { 
  TypedRequest, 
  TypedResponse, 
  ApiResponse,
  DetailedStatistics,
  StatsFilters,
  AsyncControllerMethod
} from '../types/api';

const AnalyticsService = require('../services/analyticsService');

interface GarageStatsResponse {
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  occupancyRate: number;
  byType: Record<string, number>;
  byFloor: Record<number, any>;
  currentSessions: number;
  garage: any;
  averageDuration: any;
  timestamp: string;
}

interface FloorStatsResponse {
  floor: number;
  totalSpots: number;
  availableSpots: number;
  occupiedSpots: number;
  occupancyRate: number;
  byType: Record<string, number>;
  bays: any[];
  timestamp: string;
}

interface OccupancyTrendsResponse {
  period: string;
  data: any[];
  summary: any;
  timestamp: string;
}

interface RevenueAnalyticsResponse {
  period: string;
  revenue: number;
  sessions: number;
  averageSession: number;
  breakdown: Record<string, number>;
  timestamp: string;
}

interface UsagePatternsResponse {
  totalSessions: number;
  peaks: {
    hour: number;
    day: string;
  };
  patterns: any;
  timestamp: string;
}

interface OccupancySummaryResponse {
  occupancy: {
    totalSpots: number;
    occupiedSpots: number;
    availableSpots: number;
    occupancyRate: number;
    byType: Record<string, number>;
    byFloor: Record<number, any>;
    currentSessions: number;
    timestamp: string;
  };
}

interface DashboardStatsResponse {
  dashboard: {
    overview: any;
    revenue: any;
    usage: any;
    byType: Record<string, number>;
    byFloor: Record<number, any>;
    averageDuration: any;
    garage: any;
    timestamp: string;
  };
}

interface ComparisonPeriod {
  period: 'day' | 'week' | 'month';
}

interface ExportQueryParams {
  type?: 'garage' | 'revenue' | 'usage';
  format?: 'json';
}

interface HealthCheckResponse {
  health: {
    status: string;
    services: {
      analyticsService: string;
      dataAccess: string;
    };
    timestamp: string;
    uptime: number;
    issues?: string[];
  };
}

class StatsController {
  private analyticsService: any;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Get comprehensive garage statistics
   * GET /api/v1/stats
   */
  async getGarageStats(
    req: TypedRequest<never>, 
    res: TypedResponse<GarageStatsResponse>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const stats = await this.analyticsService.getGarageStats();

      res.json({
        success: true,
        ...stats
      });

    } catch (error: any) {
      console.error('Garage stats error:', error);

      if (error.message?.includes('not initialized')) {
        res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get floor-specific statistics
   * GET /api/v1/stats/floor/:id
   */
  async getFloorStats(
    req: TypedRequest<never> & { params: { id: string } }, 
    res: TypedResponse<FloorStatsResponse>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { id: floorId } = req.params;

      if (!floorId) {
        res.status(400).json({
          success: false,
          error: 'Floor ID is required'
        });
        return;
      }

      const floor = parseInt(floorId);
      if (isNaN(floor) || floor < 1) {
        res.status(400).json({
          success: false,
          error: 'Floor ID must be a positive number'
        });
        return;
      }

      const stats = await this.analyticsService.getFloorStats(floor);

      res.json({
        success: true,
        ...stats
      });

    } catch (error: any) {
      console.error('Floor stats error:', error);

      if (error.message?.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Floor not found',
          message: error.message
        });
        return;
      }

      if (error.message?.includes('not initialized')) {
        res.status(404).json({
          success: false,
          error: 'Garage not initialized',
          message: 'Please initialize the garage first'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get occupancy trends over time
   * GET /api/v1/stats/trends?hours=24
   */
  async getOccupancyTrends(
    req: TypedRequest<never> & { query: { hours?: string } }, 
    res: TypedResponse<OccupancyTrendsResponse>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { hours = '24' } = req.query;

      const hoursNum = parseInt(hours);
      if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 168) { // Max 1 week
        res.status(400).json({
          success: false,
          error: 'Hours must be a number between 1 and 168 (1 week)'
        });
        return;
      }

      const trends = await this.analyticsService.getOccupancyTrends({ hours: hoursNum });

      res.json({
        success: true,
        ...trends
      });

    } catch (error: any) {
      console.error('Occupancy trends error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get revenue analytics
   * GET /api/v1/stats/revenue?days=7
   */
  async getRevenueAnalytics(
    req: TypedRequest<never> & { query: { days?: string } }, 
    res: TypedResponse<RevenueAnalyticsResponse>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { days = '7' } = req.query;

      const daysNum = parseInt(days);
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) { // Max 1 year
        res.status(400).json({
          success: false,
          error: 'Days must be a number between 1 and 365 (1 year)'
        });
        return;
      }

      const analytics = await this.analyticsService.getRevenueAnalytics({ days: daysNum });

      res.json({
        success: true,
        ...analytics
      });

    } catch (error: any) {
      console.error('Revenue analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get usage patterns and peak times
   * GET /api/v1/stats/usage
   */
  async getUsagePatterns(
    req: TypedRequest<never>, 
    res: TypedResponse<UsagePatternsResponse>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const patterns = await this.analyticsService.getUsagePatterns();

      res.json({
        success: true,
        ...patterns
      });

    } catch (error: any) {
      console.error('Usage patterns error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get real-time occupancy summary
   * GET /api/v1/stats/occupancy
   */
  async getOccupancySummary(
    req: TypedRequest<never>, 
    res: TypedResponse<OccupancySummaryResponse>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const stats = await this.analyticsService.getGarageStats();

      // Extract occupancy-focused data
      const summary = {
        totalSpots: stats.totalSpots,
        occupiedSpots: stats.occupiedSpots,
        availableSpots: stats.availableSpots,
        occupancyRate: stats.occupancyRate,
        byType: stats.byType,
        byFloor: stats.byFloor,
        currentSessions: stats.currentSessions,
        timestamp: stats.timestamp
      };

      res.json({
        success: true,
        occupancy: summary
      });

    } catch (error: any) {
      console.error('Occupancy summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get dashboard summary with key metrics
   * GET /api/v1/stats/dashboard
   */
  async getDashboardStats(
    req: TypedRequest<never>, 
    res: TypedResponse<DashboardStatsResponse>,
    next?: NextFunction
  ): Promise<void> {
    try {
      // Get multiple analytics in parallel for dashboard
      const [garageStats, revenueAnalytics, usagePatterns] = await Promise.all([
        this.analyticsService.getGarageStats(),
        this.analyticsService.getRevenueAnalytics({ days: 1 }), // Today's revenue
        this.analyticsService.getUsagePatterns()
      ]);

      const dashboard = {
        overview: {
          totalSpots: garageStats.totalSpots,
          occupiedSpots: garageStats.occupiedSpots,
          availableSpots: garageStats.availableSpots,
          occupancyRate: garageStats.occupancyRate,
          currentSessions: garageStats.currentSessions
        },
        revenue: {
          today: revenueAnalytics.revenue,
          sessions: revenueAnalytics.sessions
        },
        usage: {
          peakHour: usagePatterns.peaks.hour,
          peakDay: usagePatterns.peaks.day,
          totalSessions: usagePatterns.totalSessions
        },
        byType: garageStats.byType,
        byFloor: garageStats.byFloor,
        averageDuration: garageStats.averageDuration,
        garage: garageStats.garage,
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        dashboard
      });

    } catch (error: any) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get comparative statistics (current vs previous period)
   * GET /api/v1/stats/compare?period=week
   */
  async getComparativeStats(
    req: TypedRequest<never> & { query: { period?: string } }, 
    res: TypedResponse<any>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { period = 'day' } = req.query;

      let days: number;
      switch (period) {
      case 'day':
        days = 1;
        break;
      case 'week':
        days = 7;
        break;
      case 'month':
        days = 30;
        break;
      default:
        res.status(400).json({
          success: false,
          error: 'Period must be one of: day, week, month'
        });
        return;
      }

      // Get current and previous period analytics
      const [current, previous] = await Promise.all([
        this.analyticsService.getRevenueAnalytics({ days }),
        // For comparison, we'd need a more sophisticated approach
        // This is simplified - in production, you'd want date range filtering
        this.analyticsService.getRevenueAnalytics({ days })
      ]);

      res.json({
        success: true,
        period,
        comparison: {
          current
          // previous, // Would be actual previous period data
          // growth: this._calculateGrowth(current, previous)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Comparative stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Export statistics data (JSON format)
   * GET /api/v1/stats/export?type=garage&format=json
   */
  async exportStats(
    req: TypedRequest<never> & { query: ExportQueryParams }, 
    res: TypedResponse<any>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { type = 'garage', format = 'json' } = req.query;

      if (format !== 'json') {
        res.status(400).json({
          success: false,
          error: 'Only JSON format is currently supported'
        });
        return;
      }

      let data: any;
      switch (type) {
      case 'garage':
        data = await this.analyticsService.getGarageStats();
        break;
      case 'revenue':
        data = await this.analyticsService.getRevenueAnalytics({ days: 30 });
        break;
      case 'usage':
        data = await this.analyticsService.getUsagePatterns();
        break;
      default:
        res.status(400).json({
          success: false,
          error: 'Type must be one of: garage, revenue, usage'
        });
        return;
      }

      // Set appropriate headers for file download
      const filename = `${type}_stats_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');

      res.json({
        success: true,
        exportType: type,
        exportFormat: format,
        exportDate: new Date().toISOString(),
        data
      });

    } catch (error: any) {
      console.error('Export stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get health check information including service status
   * GET /api/v1/stats/health
   */
  async getHealthCheck(
    req: TypedRequest<never>, 
    res: TypedResponse<HealthCheckResponse>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const health: HealthCheckResponse['health'] = {
        status: 'healthy',
        services: {
          analyticsService: 'operational',
          dataAccess: 'operational'
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };

      // Basic service validation
      try {
        await this.analyticsService.getGarageStats();
        health.services.analyticsService = 'operational';
      } catch (error: any) {
        health.services.analyticsService = 'degraded';
        health.status = 'degraded';
        health.issues = health.issues || [];
        health.issues.push('Analytics service error');
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        success: health.status === 'healthy',
        health
      });

    } catch (error: any) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        health: {
          status: 'unhealthy',
          error: 'Service unavailable',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

export = StatsController;