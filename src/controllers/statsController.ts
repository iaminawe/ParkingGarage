/**
 * Statistics controller for analytics and reporting
 *
 * This controller handles HTTP requests for garage statistics,
 * occupancy reports, revenue analytics, and operational insights.
 * It uses the ReportingService for comprehensive data analysis.
 *
 * @module StatsController
 */

import { Request, Response } from 'express';
import { ReportingService } from '../services/ReportingService';
import { StatsResponse, ReportRequest, ApiResponse, HealthCheckResponse } from '../types/api';
import { GarageStats } from '../types/models';

interface TrendsQuery {
  hours?: string;
}

interface RevenueQuery {
  days?: string;
}

interface CompareQuery {
  period?: 'day' | 'week' | 'month';
}

interface ExportQuery {
  type?: 'garage' | 'revenue' | 'usage';
  format?: 'json';
}

interface SuggestionsQuery {
  partial?: string;
  limit?: string;
}

export class StatsController {
  private analyticsService: any;

  constructor() {
    this.reportingService = new ReportingService();
  }

  /**
   * Get comprehensive garage statistics
   * GET /api/v1/stats
   */
  getGarageStats = async (req: Request, res: Response<ApiResponse<GarageStats>>): Promise<void> => {
    try {
      const stats = await this.analyticsService.getGarageStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Garage stats error:', error);

      if ((error as Error).message.includes('not initialized')) {
        res.status(404).json({
          success: false,
          message: 'Garage not initialized',
          errors: ['Please initialize the garage first'],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get floor-specific statistics
   * GET /api/v1/stats/floor/:id
   */
  getFloorStats = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { id: floorId } = req.params;

      if (!floorId) {
        res.status(400).json({
          success: false,
          message: 'Floor ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const floor = parseInt(floorId, 10);
      if (isNaN(floor) || floor < 1) {
        res.status(400).json({
          success: false,
          message: 'Floor ID must be a positive number',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const stats = await this.analyticsService.getFloorStats(floor);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Floor stats error:', error);

      if ((error as Error).message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: 'Floor not found',
          errors: [(error as Error).message],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if ((error as Error).message.includes('not initialized')) {
        res.status(404).json({
          success: false,
          message: 'Garage not initialized',
          errors: ['Please initialize the garage first'],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get occupancy trends over time
   * GET /api/v1/stats/trends?hours=24
   */
  getOccupancyTrends = async (
    req: Request<{}, ApiResponse, {}, TrendsQuery>,
    res: Response
  ): Promise<void> => {
    try {
      const { hours = '24' } = req.query;

      const hoursNum = parseInt(hours, 10);
      if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 168) {
        // Max 1 week
        res.status(400).json({
          success: false,
          message: 'Hours must be a number between 1 and 168 (1 week)',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const trends = await this.analyticsService.getOccupancyTrends({ hours: hoursNum });

      res.json({
        success: true,
        data: trends,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Occupancy trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get revenue analytics
   * GET /api/v1/stats/revenue?days=7
   */
  getRevenueAnalytics = async (
    req: Request<{}, ApiResponse, {}, RevenueQuery>,
    res: Response
  ): Promise<void> => {
    try {
      const { days = '7' } = req.query;

      const daysNum = parseInt(days, 10);
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        // Max 1 year
        res.status(400).json({
          success: false,
          message: 'Days must be a number between 1 and 365 (1 year)',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const analytics = await this.analyticsService.getRevenueAnalytics({ days: daysNum });

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Revenue analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get usage patterns and peak times
   * GET /api/v1/stats/usage
   */
  getUsagePatterns = async (req: Request, res: Response): Promise<void> => {
    try {
      const patterns = await this.analyticsService.getUsagePatterns();

      res.json({
        success: true,
        data: patterns,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Usage patterns error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get real-time occupancy summary
   * GET /api/v1/stats/occupancy
   */
  getOccupancySummary = async (req: Request, res: Response): Promise<void> => {
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
        timestamp: stats.timestamp,
      };

      res.json({
        success: true,
        data: { occupancy: summary },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Occupancy summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get dashboard summary with key metrics
   * GET /api/v1/stats/dashboard
   */
  getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get multiple analytics in parallel for dashboard
      const [garageStats, revenueAnalytics, usagePatterns] = await Promise.all([
        this.analyticsService.getGarageStats(),
        this.analyticsService.getRevenueAnalytics({ days: 1 }), // Today's revenue
        this.analyticsService.getUsagePatterns(),
      ]);

      const dashboard = {
        overview: {
          totalSpots: garageStats.totalSpots,
          occupiedSpots: garageStats.occupiedSpots,
          availableSpots: garageStats.availableSpots,
          occupancyRate: garageStats.occupancyRate,
          currentSessions: garageStats.currentSessions,
        },
        revenue: {
          today: revenueAnalytics.revenue,
          sessions: revenueAnalytics.sessions,
        },
        usage: {
          peakHour: usagePatterns.peaks?.hour,
          peakDay: usagePatterns.peaks?.day,
          totalSessions: usagePatterns.totalSessions,
        },
        byType: garageStats.byType,
        byFloor: garageStats.byFloor,
        averageDuration: garageStats.averageDuration,
        garage: garageStats.garage,
        timestamp: new Date().toISOString(),
      };

      res.json({
        success: true,
        data: { dashboard },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get comparative statistics (current vs previous period)
   * GET /api/v1/stats/compare?period=week
   */
  getComparativeStats = async (
    req: Request<{}, ApiResponse, {}, CompareQuery>,
    res: Response
  ): Promise<void> => {
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
            message: 'Period must be one of: day, week, month',
            timestamp: new Date().toISOString(),
          });
          return;
      }

      // Get current and previous period analytics
      const [current] = await Promise.all([
        this.analyticsService.getRevenueAnalytics({ days }),
        // For comparison, we'd need a more sophisticated approach
        // This is simplified - in production, you'd want date range filtering
      ]);

      res.json({
        success: true,
        data: {
          period,
          comparison: {
            current,
            // previous, // Would be actual previous period data
            // growth: this._calculateGrowth(current, previous)
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Comparative stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Export statistics data (JSON format)
   * GET /api/v1/stats/export?type=garage&format=json
   */
  exportStats = async (
    req: Request<{}, ApiResponse, {}, ExportQuery>,
    res: Response
  ): Promise<void> => {
    try {
      const { type = 'garage', format = 'json' } = req.query;

      if (format !== 'json') {
        res.status(400).json({
          success: false,
          message: 'Only JSON format is currently supported',
          timestamp: new Date().toISOString(),
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
            message: 'Type must be one of: garage, revenue, usage',
            timestamp: new Date().toISOString(),
          });
          return;
      }

      // Set appropriate headers for file download
      const filename = `${type}_stats_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');

      res.json({
        success: true,
        data: {
          exportType: type,
          exportFormat: format,
          exportDate: new Date().toISOString(),
          data,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Export stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get health check information including service status
   * GET /api/v1/stats/health
   */
  getHealthCheck = async (
    req: Request,
    res: Response<ApiResponse<HealthCheckResponse>>
  ): Promise<void> => {
    try {
      const health: HealthCheckResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        services: {
          database: 'connected',
          cache: 'connected',
          storage: 'available',
        },
        stats: {
          totalRequests: 0,
          avgResponseTime: 0,
          errorRate: 0,
        },
      };

      // Basic service validation
      try {
        await this.analyticsService.getGarageStats();
        health.services.database = 'connected';
      } catch (error) {
        health.services.database = 'disconnected';
        health.status = 'degraded';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        message: 'Service unavailable',
        errors: ['Health check failed'],
        timestamp: new Date().toISOString(),
      });
    }
  };
}
