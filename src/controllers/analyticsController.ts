/**
 * Analytics Controller
 *
 * Handles HTTP requests for analytics and statistical data.
 * Provides system-wide metrics, garage-specific analytics,
 * and dashboard summaries.
 *
 * @module AnalyticsController
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { HTTP_STATUS, API_RESPONSES } from '../config/constants';

const prisma = new PrismaClient();

export class AnalyticsController {
  /**
   * GET /api/analytics/system
   * Get system-wide analytics and statistics
   */
  async getSystemAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // Get basic counts
      const [
        totalGarages,
        totalSpots,
        totalVehicles,
        activeSessions,
        totalUsers
      ] = await Promise.all([
        prisma.garage.count({ where: { isActive: true } }),
        prisma.parkingSpot.count({ where: { isActive: true } }),
        prisma.vehicle.count(),
        prisma.parkingSession.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { isActive: true } })
      ]);

      // Calculate occupancy
      const availableSpots = await prisma.parkingSpot.count({
        where: { status: 'AVAILABLE', isActive: true }
      });
      const occupiedSpots = totalSpots - availableSpots;
      const occupancyRate = totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0;

      // Get revenue data for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const revenueData = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'COMPLETED',
          paymentDate: {
            gte: thirtyDaysAgo
          }
        }
      });

      const monthlyRevenue = revenueData._sum.amount || 0;

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'System analytics retrieved successfully',
        data: {
          overview: {
            totalGarages,
            totalSpots,
            totalVehicles,
            activeSessions,
            totalUsers
          },
          occupancy: {
            totalSpots,
            availableSpots,
            occupiedSpots,
            occupancyRate: Math.round(occupancyRate * 100) / 100
          },
          revenue: {
            monthlyRevenue,
            period: 'last_30_days'
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('System analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/analytics/garages/:id
   * Get analytics for a specific garage
   */
  async getGarageAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      // Basic garage info
      const garage = await prisma.garage.findUnique({
        where: { id },
        include: {
          floors: {
            include: {
              spots: true
            }
          }
        }
      });

      if (!garage) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Garage not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const totalSpots = garage.floors.reduce((sum, floor) => sum + floor.spots.length, 0);
      const availableSpots = garage.floors.reduce(
        (sum, floor) => sum + floor.spots.filter(spot => spot.status === 'AVAILABLE').length,
        0
      );
      const occupiedSpots = totalSpots - availableSpots;
      const occupancyRate = totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0;

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Garage analytics retrieved successfully',
        data: {
          garage: {
            id: garage.id,
            name: garage.name,
            description: garage.description
          },
          occupancy: {
            totalSpots,
            availableSpots,
            occupiedSpots,
            occupancyRate: Math.round(occupancyRate * 100) / 100
          },
          floors: garage.floors.map(floor => ({
            id: floor.id,
            floorNumber: floor.floorNumber,
            totalSpots: floor.spots.length,
            availableSpots: floor.spots.filter(spot => spot.status === 'AVAILABLE').length,
            occupiedSpots: floor.spots.filter(spot => spot.status === 'OCCUPIED').length
          })),
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Garage analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/analytics/dashboard
   * Get dashboard analytics summary
   */
  async getDashboardAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // Get current date ranges
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get key metrics
      const [
        totalSessions,
        todaySessions,
        weekSessions,
        monthSessions,
        totalRevenue,
        todayRevenue,
        totalSpots,
        occupiedSpots
      ] = await Promise.all([
        prisma.parkingSession.count(),
        prisma.parkingSession.count({
          where: { startTime: { gte: startOfDay } }
        }),
        prisma.parkingSession.count({
          where: { startTime: { gte: startOfWeek } }
        }),
        prisma.parkingSession.count({
          where: { startTime: { gte: startOfMonth } }
        }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'COMPLETED' }
        }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: 'COMPLETED',
            paymentDate: { gte: startOfDay }
          }
        }),
        prisma.parkingSpot.count({ where: { isActive: true } }),
        prisma.parkingSpot.count({ where: { status: 'OCCUPIED', isActive: true } })
      ]);

      const availableSpots = totalSpots - occupiedSpots;
      const occupancyRate = totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0;

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Dashboard analytics retrieved successfully',
        data: {
          sessions: {
            total: totalSessions,
            today: todaySessions,
            thisWeek: weekSessions,
            thisMonth: monthSessions
          },
          revenue: {
            total: totalRevenue._sum.amount || 0,
            today: todayRevenue._sum.amount || 0
          },
          occupancy: {
            totalSpots,
            availableSpots,
            occupiedSpots,
            occupancyRate: Math.round(occupancyRate * 100) / 100
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Dashboard analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/analytics/occupancy-trends
   * Get occupancy trends over time
   */
  async getOccupancyTrends(req: Request, res: Response): Promise<void> {
    try {
      // For now, return mock data structure
      // In a real implementation, this would query historical occupancy data
      const trends = [
        { timestamp: new Date().toISOString(), occupancyRate: 65.5, totalSpots: 100 },
        { timestamp: new Date(Date.now() - 3600000).toISOString(), occupancyRate: 72.0, totalSpots: 100 },
        { timestamp: new Date(Date.now() - 7200000).toISOString(), occupancyRate: 58.3, totalSpots: 100 }
      ];

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Occupancy trends retrieved successfully',
        data: trends,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Occupancy trends error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Placeholder methods for other analytics endpoints
   * These can be implemented as needed
   */

  async getRevenueData(req: Request, res: Response): Promise<void> {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Revenue data retrieved successfully',
      data: [],
      timestamp: new Date().toISOString()
    });
  }

  async getVehicleTypeDistribution(req: Request, res: Response): Promise<void> {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Vehicle type distribution retrieved successfully',
      data: [],
      timestamp: new Date().toISOString()
    });
  }

  async getDurationDistribution(req: Request, res: Response): Promise<void> {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Duration distribution retrieved successfully',
      data: [],
      timestamp: new Date().toISOString()
    });
  }

  async getPeakHoursData(req: Request, res: Response): Promise<void> {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Peak hours data retrieved successfully',
      data: [],
      timestamp: new Date().toISOString()
    });
  }

  async getSpotUtilization(req: Request, res: Response): Promise<void> {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Spot utilization retrieved successfully',
      data: [],
      timestamp: new Date().toISOString()
    });
  }

  async exportAnalyticsReport(req: Request, res: Response): Promise<void> {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Export functionality not implemented yet',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
}