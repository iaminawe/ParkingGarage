/**
 * ReportingService - Comprehensive reporting system for occupancy, revenue,
 * user activity, audit logging, and admin dashboard analytics
 */

import { prisma } from '../config/database';
import { SecurityAuditService } from './SecurityAuditService';
import type { VehicleType, SpotFeature } from '../types/models';

export interface OccupancyReport {
  period: string;
  totalSpots: number;
  occupiedSpots: number;
  occupancyRate: number;
  peakOccupancy: number;
  peakOccupancyTime: Date;
  averageOccupancy: number;
  bySpotType: Record<
    VehicleType,
    {
      total: number;
      occupied: number;
      rate: number;
    }
  >;
  byFloor: Record<
    number,
    {
      total: number;
      occupied: number;
      rate: number;
    }
  >;
  trends: Array<{
    timestamp: Date;
    occupancyRate: number;
    occupiedSpots: number;
  }>;
}

export interface RevenueReport {
  period: string;
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  revenueGrowth: number; // Percentage change from previous period
  byPaymentMethod: Record<
    string,
    {
      amount: number;
      transactions: number;
      percentage: number;
    }
  >;
  bySpotType: Record<
    VehicleType,
    {
      revenue: number;
      sessions: number;
      averageValue: number;
    }
  >;
  byTimeOfDay: Array<{
    hour: number;
    revenue: number;
    sessions: number;
  }>;
  refunds: {
    total: number;
    amount: number;
    refundRate: number;
  };
}

export interface UserActivityReport {
  period: string;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  userRetentionRate: number;
  averageSessionDuration: number;
  mostActiveUsers: Array<{
    userId: string;
    email: string;
    sessionCount: number;
    totalSpent: number;
  }>;
  userSegments: {
    byMembershipTier: Record<string, number>;
    byUsageFrequency: Record<string, number>;
  };
  geographicDistribution?: Record<string, number>;
}

export interface AdminDashboardData {
  summary: {
    currentOccupancy: number;
    todayRevenue: number;
    activeReservations: number;
    pendingIssues: number;
  };
  realtimeMetrics: {
    occupancyTrend: Array<{ time: Date; value: number }>;
    revenueTrend: Array<{ time: Date; value: number }>;
    userActivity: Array<{ time: Date; count: number }>;
  };
  alerts: Array<{
    id: string;
    type: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>;
  systemHealth: {
    apiResponseTime: number;
    databasePerformance: number;
    paymentSystemStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
    errorRate: number;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  action: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  riskLevel?: string;
}

export interface ReportOptions {
  startDate: Date;
  endDate: Date;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  spotTypes?: VehicleType[];
  floors?: number[];
  includeInactive?: boolean;
}

export interface ExportOptions {
  format: 'CSV' | 'PDF' | 'EXCEL' | 'JSON';
  includeCharts?: boolean;
  template?: string;
}

class ReportingService {
  private auditService: SecurityAuditService;

  constructor() {
    this.auditService = new SecurityAuditService();
  }

  /**
   * Generate occupancy report
   */
  async generateOccupancyReport(options: ReportOptions): Promise<OccupancyReport> {
    try {
      const { startDate, endDate, groupBy = 'day' } = options;

      // Get current spot counts
      const [totalSpots, currentOccupied] = await Promise.all([
        prisma.parkingSpot.count({
          where: {
            isActive: true,
            ...(options.spotTypes && {
              spotType: { in: options.spotTypes.map(t => t.toUpperCase()) as any },
            }),
            ...(options.floors && { level: { in: options.floors } }),
          },
        }),
        prisma.parkingSpot.count({
          where: {
            status: 'OCCUPIED',
            isActive: true,
            ...(options.spotTypes && {
              spotType: { in: options.spotTypes.map(t => t.toUpperCase()) as any },
            }),
            ...(options.floors && { level: { in: options.floors } }),
          },
        }),
      ]);

      // Get historical occupancy data
      const sessions = await prisma.parkingSession.findMany({
        where: {
          startTime: { gte: startDate, lte: endDate },
          ...(options.spotTypes && {
            spot: {
              spotType: { in: options.spotTypes.map(t => t.toUpperCase()) as any },
            },
          }),
        },
        include: { spot: true },
        orderBy: { startTime: 'asc' },
      });

      // Calculate occupancy by spot type
      const bySpotType: Record<VehicleType, { total: number; occupied: number; rate: number }> = {
        compact: { total: 0, occupied: 0, rate: 0 },
        standard: { total: 0, occupied: 0, rate: 0 },
        oversized: { total: 0, occupied: 0, rate: 0 },
      };

      for (const spotType of Object.keys(bySpotType) as VehicleType[]) {
        const total = await prisma.parkingSpot.count({
          where: {
            spotType: spotType.toUpperCase() as any,
            isActive: true,
          },
        });
        const occupied = await prisma.parkingSpot.count({
          where: {
            spotType: spotType.toUpperCase() as any,
            status: 'OCCUPIED',
            isActive: true,
          },
        });

        bySpotType[spotType] = {
          total,
          occupied,
          rate: total > 0 ? (occupied / total) * 100 : 0,
        };
      }

      // Calculate occupancy by floor
      const floors = await prisma.parkingSpot.groupBy({
        by: ['level'],
        where: { isActive: true },
        _count: { _all: true },
      });

      const byFloor: Record<number, { total: number; occupied: number; rate: number }> = {};
      for (const floor of floors) {
        const occupied = await prisma.parkingSpot.count({
          where: {
            level: floor.level,
            status: 'OCCUPIED',
            isActive: true,
          },
        });

        byFloor[floor.level] = {
          total: floor._count._all,
          occupied,
          rate: floor._count._all > 0 ? (occupied / floor._count._all) * 100 : 0,
        };
      }

      // Generate trends data
      const trends = this.generateOccupancyTrends(sessions, totalSpots, groupBy);

      // Calculate metrics
      const occupancyRate = totalSpots > 0 ? (currentOccupied / totalSpots) * 100 : 0;
      const peakOccupancy = Math.max(...trends.map(t => t.occupancyRate), occupancyRate);
      const averageOccupancy =
        trends.length > 0
          ? trends.reduce((sum, t) => sum + t.occupancyRate, 0) / trends.length
          : occupancyRate;

      const peakTrend = trends.find(t => t.occupancyRate === peakOccupancy);
      const peakOccupancyTime = peakTrend?.timestamp || new Date();

      return {
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        totalSpots,
        occupiedSpots: currentOccupied,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        peakOccupancy: Math.round(peakOccupancy * 100) / 100,
        peakOccupancyTime,
        averageOccupancy: Math.round(averageOccupancy * 100) / 100,
        bySpotType,
        byFloor,
        trends,
      };
    } catch (error) {
      console.error('Occupancy report generation error:', error);
      throw new Error('Failed to generate occupancy report');
    }
  }

  /**
   * Generate revenue report
   */
  async generateRevenueReport(options: ReportOptions): Promise<RevenueReport> {
    try {
      const { startDate, endDate, groupBy = 'day' } = options;

      // Get payment data
      const payments = await prisma.payment.findMany({
        where: {
          status: 'COMPLETED',
          processedAt: { gte: startDate, lte: endDate },
        },
        include: {
          session: {
            include: { spot: true },
          },
        },
        orderBy: { processedAt: 'asc' },
      });

      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalTransactions = payments.length;
      const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Calculate revenue by payment method
      const byPaymentMethod: Record<
        string,
        { amount: number; transactions: number; percentage: number }
      > = {};
      payments.forEach(payment => {
        const method = payment.paymentMethod;
        if (!byPaymentMethod[method]) {
          byPaymentMethod[method] = { amount: 0, transactions: 0, percentage: 0 };
        }
        byPaymentMethod[method].amount += payment.amount;
        byPaymentMethod[method].transactions += 1;
      });

      // Calculate percentages
      Object.keys(byPaymentMethod).forEach(method => {
        byPaymentMethod[method].percentage =
          totalRevenue > 0 ? (byPaymentMethod[method].amount / totalRevenue) * 100 : 0;
      });

      // Revenue by spot type
      const bySpotType: Record<
        VehicleType,
        { revenue: number; sessions: number; averageValue: number }
      > = {
        compact: { revenue: 0, sessions: 0, averageValue: 0 },
        standard: { revenue: 0, sessions: 0, averageValue: 0 },
        oversized: { revenue: 0, sessions: 0, averageValue: 0 },
      };

      payments.forEach(payment => {
        if (payment.session?.spot?.spotType) {
          const spotType = payment.session.spot.spotType.toLowerCase() as VehicleType;
          if (bySpotType[spotType]) {
            bySpotType[spotType].revenue += payment.amount;
            bySpotType[spotType].sessions += 1;
          }
        }
      });

      // Calculate average values
      Object.keys(bySpotType).forEach(type => {
        const spotType = type as VehicleType;
        if (bySpotType[spotType].sessions > 0) {
          bySpotType[spotType].averageValue =
            bySpotType[spotType].revenue / bySpotType[spotType].sessions;
        }
      });

      // Revenue by time of day
      const byTimeOfDay = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        revenue: 0,
        sessions: 0,
      }));

      payments.forEach(payment => {
        if (payment.processedAt) {
          const hour = payment.processedAt.getHours();
          byTimeOfDay[hour].revenue += payment.amount;
          byTimeOfDay[hour].sessions += 1;
        }
      });

      // Calculate refunds
      const refundAmount = payments.reduce((sum, p) => sum + (p.refundAmount || 0), 0);
      const refundCount = payments.filter(p => (p.refundAmount || 0) > 0).length;
      const refundRate = totalTransactions > 0 ? (refundCount / totalTransactions) * 100 : 0;

      // Calculate growth (stub - would need previous period data)
      const revenueGrowth = 0; // Would be calculated against previous period

      return {
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTransactions,
        averageTransactionValue: Math.round(averageTransactionValue * 100) / 100,
        revenueGrowth,
        byPaymentMethod,
        bySpotType,
        byTimeOfDay,
        refunds: {
          total: refundCount,
          amount: Math.round(refundAmount * 100) / 100,
          refundRate: Math.round(refundRate * 100) / 100,
        },
      };
    } catch (error) {
      console.error('Revenue report generation error:', error);
      throw new Error('Failed to generate revenue report');
    }
  }

  /**
   * Generate user activity report
   */
  async generateUserActivityReport(options: ReportOptions): Promise<UserActivityReport> {
    try {
      const { startDate, endDate } = options;

      // Get user counts
      const [totalUsers, activeUsers, newUsers] = await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({
          where: {
            isActive: true,
            lastLoginAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.user.count({
          where: {
            isActive: true,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
      ]);

      const returningUsers = activeUsers - newUsers;
      const userRetentionRate = totalUsers > 0 ? (returningUsers / totalUsers) * 100 : 0;

      // Get session data for active users
      const sessions = await prisma.parkingSession.findMany({
        where: {
          startTime: { gte: startDate, lte: endDate },
          duration: { not: null },
        },
        include: {
          vehicle: {
            include: { owner: true },
          },
        },
      });

      // Calculate average session duration
      const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const averageSessionDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;

      // Find most active users
      const userActivity = new Map<
        string,
        { sessionCount: number; totalSpent: number; email: string }
      >();

      sessions.forEach(session => {
        const userId = session.vehicle?.ownerId;
        const userEmail = session.vehicle?.owner?.email || 'N/A';
        if (userId) {
          if (!userActivity.has(userId)) {
            userActivity.set(userId, { sessionCount: 0, totalSpent: 0, email: userEmail });
          }
          const user = userActivity.get(userId)!;
          user.sessionCount += 1;
          user.totalSpent += session.amountPaid || 0;
        }
      });

      const mostActiveUsers = Array.from(userActivity.entries())
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.sessionCount - a.sessionCount)
        .slice(0, 10);

      // User segments by membership tier (mock data)
      const userSegments = {
        byMembershipTier: {
          BASIC: Math.floor(totalUsers * 0.7),
          PREMIUM: Math.floor(totalUsers * 0.2),
          VIP: Math.floor(totalUsers * 0.08),
          CORPORATE: Math.floor(totalUsers * 0.02),
        },
        byUsageFrequency: {
          Daily: Math.floor(activeUsers * 0.15),
          Weekly: Math.floor(activeUsers * 0.35),
          Monthly: Math.floor(activeUsers * 0.35),
          Occasional: Math.floor(activeUsers * 0.15),
        },
      };

      return {
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        totalUsers,
        activeUsers,
        newUsers,
        returningUsers,
        userRetentionRate: Math.round(userRetentionRate * 100) / 100,
        averageSessionDuration: Math.round(averageSessionDuration),
        mostActiveUsers,
        userSegments,
      };
    } catch (error) {
      console.error('User activity report generation error:', error);
      throw new Error('Failed to generate user activity report');
    }
  }

  /**
   * Get admin dashboard data
   */
  async getAdminDashboardData(): Promise<AdminDashboardData> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Summary metrics
      const [currentOccupancy, todayRevenue, activeReservations, recentErrors] = await Promise.all([
        this.getCurrentOccupancyRate(),
        this.getTodayRevenue(todayStart),
        prisma.parkingSession.count({ where: { status: 'ACTIVE' } }),
        prisma.securityAuditLog.count({
          where: {
            severity: { in: ['HIGH', 'CRITICAL'] },
            createdAt: { gte: last24Hours },
          },
        }),
      ]);

      // Realtime metrics (mock implementation)
      const occupancyTrend = await this.generateRealtimeOccupancyTrend();
      const revenueTrend = await this.generateRealtimeRevenueTrend();
      const userActivity = await this.generateRealtimeUserActivity();

      // System alerts
      const alerts = await this.getSystemAlerts();

      // System health metrics
      const systemHealth = await this.getSystemHealthMetrics();

      return {
        summary: {
          currentOccupancy: Math.round(currentOccupancy * 100) / 100,
          todayRevenue: Math.round(todayRevenue * 100) / 100,
          activeReservations,
          pendingIssues: recentErrors,
        },
        realtimeMetrics: {
          occupancyTrend,
          revenueTrend,
          userActivity,
        },
        alerts,
        systemHealth,
      };
    } catch (error) {
      console.error('Dashboard data generation error:', error);
      throw new Error('Failed to generate admin dashboard data');
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(options: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    action?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      const where: any = {};

      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) {
          where.createdAt.gte = options.startDate;
        }
        if (options.endDate) {
          where.createdAt.lte = options.endDate;
        }
      }

      if (options.userId) {
        where.userId = options.userId;
      }
      if (options.action) {
        where.action = { contains: options.action };
      }
      if (options.severity) {
        where.severity = options.severity;
      }

      const [logs, total] = await Promise.all([
        prisma.securityAuditLog.findMany({
          where,
          include: {
            user: {
              select: { email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        prisma.securityAuditLog.count({ where }),
      ]);

      const auditEntries: AuditLogEntry[] = logs.map(log => ({
        id: log.id,
        timestamp: log.createdAt,
        userId: log.userId || undefined,
        userEmail: log.user?.email || undefined,
        action: log.action,
        category: log.category,
        severity: log.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        description: log.description,
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
        riskLevel: log.riskLevel || undefined,
      }));

      return { logs: auditEntries, total };
    } catch (error) {
      console.error('Audit logs retrieval error:', error);
      throw new Error('Failed to retrieve audit logs');
    }
  }

  /**
   * Export report to specified format
   */
  async exportReport(
    reportType: 'occupancy' | 'revenue' | 'activity',
    options: ReportOptions,
    exportOptions: ExportOptions
  ): Promise<{ success: boolean; fileUrl?: string; message: string }> {
    try {
      let reportData: any;

      switch (reportType) {
        case 'occupancy':
          reportData = await this.generateOccupancyReport(options);
          break;
        case 'revenue':
          reportData = await this.generateRevenueReport(options);
          break;
        case 'activity':
          reportData = await this.generateUserActivityReport(options);
          break;
        default:
          throw new Error('Invalid report type');
      }

      // Mock export functionality
      const fileName = `${reportType}_report_${Date.now()}.${exportOptions.format.toLowerCase()}`;
      const fileUrl = `/exports/${fileName}`;

      // In production, this would generate the actual file
      console.log(`Exporting ${reportType} report in ${exportOptions.format} format:`, reportData);

      return {
        success: true,
        fileUrl,
        message: `Report exported successfully as ${exportOptions.format}`,
      };
    } catch (error) {
      console.error('Report export error:', error);
      return {
        success: false,
        message: 'Failed to export report',
      };
    }
  }

  /**
   * Helper methods
   */
  private generateOccupancyTrends(
    sessions: any[],
    totalSpots: number,
    groupBy: 'hour' | 'day' | 'week' | 'month'
  ): Array<{ timestamp: Date; occupancyRate: number; occupiedSpots: number }> {
    // Mock implementation - would calculate actual trends based on historical data
    const trends = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const occupiedSpots =
        Math.floor(Math.random() * totalSpots * 0.8) + Math.floor(totalSpots * 0.1);
      const occupancyRate = totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0;

      trends.push({
        timestamp,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        occupiedSpots,
      });
    }

    return trends;
  }

  private async getCurrentOccupancyRate(): Promise<number> {
    const [total, occupied] = await Promise.all([
      prisma.parkingSpot.count({ where: { isActive: true } }),
      prisma.parkingSpot.count({ where: { status: 'OCCUPIED', isActive: true } }),
    ]);
    return total > 0 ? (occupied / total) * 100 : 0;
  }

  private async getTodayRevenue(todayStart: Date): Promise<number> {
    const result = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        processedAt: { gte: todayStart },
      },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  private async generateRealtimeOccupancyTrend(): Promise<Array<{ time: Date; value: number }>> {
    // Mock realtime data - in production, this would use actual realtime metrics
    const trends = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000); // 5-minute intervals
      const value = Math.random() * 100; // Mock occupancy percentage
      trends.push({ time, value: Math.round(value * 100) / 100 });
    }

    return trends;
  }

  private async generateRealtimeRevenueTrend(): Promise<Array<{ time: Date; value: number }>> {
    // Mock realtime revenue data
    const trends = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      const value = Math.random() * 100; // Mock revenue
      trends.push({ time, value: Math.round(value * 100) / 100 });
    }

    return trends;
  }

  private async generateRealtimeUserActivity(): Promise<Array<{ time: Date; count: number }>> {
    // Mock user activity data
    const activity = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      const count = Math.floor(Math.random() * 10) + 1;
      activity.push({ time, count });
    }

    return activity;
  }

  private async getSystemAlerts(): Promise<AdminDashboardData['alerts']> {
    // Mock system alerts
    return [
      {
        id: 'alert_1',
        type: 'WARNING',
        message: 'High occupancy rate detected (>90%)',
        timestamp: new Date(),
        acknowledged: false,
      },
      {
        id: 'alert_2',
        type: 'INFO',
        message: 'Daily revenue target reached',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        acknowledged: true,
      },
    ];
  }

  private async getSystemHealthMetrics(): Promise<AdminDashboardData['systemHealth']> {
    // Mock system health metrics
    return {
      apiResponseTime: 120, // ms
      databasePerformance: 95, // percentage
      paymentSystemStatus: 'OPERATIONAL',
      errorRate: 0.5, // percentage
    };
  }
}

export default new ReportingService();
export { ReportingService };
