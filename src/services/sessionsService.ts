/**
 * Sessions Service
 *
 * Business logic for parking session management operations.
 * Handles session lifecycle, analytics, filtering, and data export.
 *
 * @module SessionsService
 */

import { SessionRepository } from '../repositories/SessionRepository';
import { VehicleRepository } from '../repositories/VehicleRepository';
import { SpotRepository } from '../repositories/SpotRepository';
import { ParkingSession, PaginatedResponse, Vehicle, ParkingSpot } from '../types/api';

export interface SessionFilters {
  status: 'all' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  search: string;
  limit: number;
  offset: number;
  sort: 'createdAt' | 'endTime' | 'duration' | 'totalAmount' | 'licensePlate';
  order: 'asc' | 'desc';
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  totalRevenue: number;
  averageDuration: number;
  averageCost: number;
  todaySessions: number;
  todayRevenue: number;
  peakHour: {
    hour: number;
    sessionCount: number;
  };
  vehicleTypeBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

export interface SessionAnalytics {
  type: 'revenue' | 'duration' | 'peak' | 'trends';
  period: 'day' | 'week' | 'month' | 'year';
  data: any[];
  summary: Record<string, any>;
}

export class SessionsService {
  private sessionsRepository: SessionRepository;
  private vehicleRepository: VehicleRepository;
  private spotRepository: SpotRepository;

  constructor() {
    this.sessionsRepository = new SessionRepository();
    this.vehicleRepository = new VehicleRepository();
    this.spotRepository = new SpotRepository();
  }

  /**
   * Get parking sessions with filtering and pagination
   */
  async getSessions(filters: SessionFilters): Promise<PaginatedResponse<ParkingSession[]>> {
    try {
      // Get all sessions from repository
      const allSessionsResult = await this.sessionsRepository.findAll();
      const allSessions = allSessionsResult.data.map(session => this.mapPrismaSessionToApi(session));

      // Apply filters
      let filteredSessions = this.applyFilters(allSessions, filters);

      // Apply sorting
      filteredSessions = this.applySorting(filteredSessions, filters.sort, filters.order);

      // Calculate pagination
      const total = filteredSessions.length;
      const totalPages = Math.ceil(total / filters.limit);
      const currentPage = Math.floor(filters.offset / filters.limit) + 1;
      const hasNextPage = currentPage < totalPages;
      const hasPreviousPage = currentPage > 1;

      // Apply pagination
      const paginatedSessions = filteredSessions.slice(
        filters.offset || 0,
        (filters.offset || 0) + (filters.limit || 50)
      );

      // Enhance sessions with additional data
      const enhancedSessions = await this.enhanceSessionsWithDetails(paginatedSessions);

      return {
        data: enhancedSessions,
        pagination: {
          total,
          limit: filters.limit,
          offset: filters.offset || 0,
          page: currentPage,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      console.error('SessionsService.getSessions error:', error);
      throw new Error('Failed to fetch sessions');
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(
    period: 'today' | 'week' | 'month' | 'year' | 'all'
  ): Promise<SessionStats> {
    try {
      const allSessionsResult = await this.sessionsRepository.findAll();
      const allSessions = allSessionsResult.data.map(session => this.mapPrismaSessionToApi(session));
      const filteredSessions = this.filterSessionsByPeriod(allSessions, period);

      // Calculate basic stats
      const totalSessions = filteredSessions.length;
      const activeSessions = filteredSessions.filter(s => s.status === 'ACTIVE').length;
      const completedSessions = filteredSessions.filter(s => s.status === 'COMPLETED').length;
      const cancelledSessions = filteredSessions.filter(s => s.status === 'CANCELLED').length;

      const totalRevenue = filteredSessions
        .filter(s => s.status === 'COMPLETED')
        .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

      const completedWithDuration = filteredSessions.filter(
        s => s.status === 'COMPLETED' && s.duration
      );
      const averageDuration =
        completedWithDuration.length > 0
          ? completedWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) /
            completedWithDuration.length
          : 0;

      const averageCost = completedSessions > 0 ? totalRevenue / completedSessions : 0;

      // Today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySessions = allSessions.filter(s => {
        if (!s.createdAt) return false;
        const sessionDate = new Date(s.createdAt);
        return sessionDate >= today;
      });

      const todayRevenue = todaySessions
        .filter(s => s.status === 'COMPLETED')
        .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

      // Peak hour calculation
      const hourCounts: Record<number, number> = {};
      filteredSessions.forEach(session => {
        if (!session.createdAt) return;
        const hour = new Date(session.createdAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const peakHourEntry = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), sessionCount: count }))
        .sort((a, b) => b.sessionCount - a.sessionCount)[0];

      const peakHour = peakHourEntry || { hour: 0, sessionCount: 0 };

      // Vehicle type breakdown
      const vehicleTypeBreakdown: Record<string, number> = {};
      filteredSessions.forEach(session => {
        const type = session.vehicleType || 'unknown';
        vehicleTypeBreakdown[type] = (vehicleTypeBreakdown[type] || 0) + 1;
      });

      // Status breakdown
      const statusBreakdown: Record<string, number> = {
        ACTIVE: activeSessions,
        COMPLETED: completedSessions,
        CANCELLED: cancelledSessions,
      };

      return {
        totalSessions,
        activeSessions,
        completedSessions,
        cancelledSessions,
        totalRevenue,
        averageDuration,
        averageCost,
        todaySessions: todaySessions.length,
        todayRevenue,
        peakHour,
        vehicleTypeBreakdown,
        statusBreakdown,
      };
    } catch (error) {
      console.error('SessionsService.getSessionStats error:', error);
      throw new Error('Failed to calculate session statistics');
    }
  }

  /**
   * Get detailed session analytics
   */
  async getSessionAnalytics(
    type: 'revenue' | 'duration' | 'peak' | 'trends',
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<SessionAnalytics> {
    try {
      const allSessionsResult = await this.sessionsRepository.findAll();
      const allSessions = allSessionsResult.data.map(session => this.mapPrismaSessionToApi(session));

      switch (type) {
        case 'revenue':
          return this.getRevenueAnalytics(allSessions, period);
        case 'duration':
          return this.getDurationAnalytics(allSessions, period);
        case 'peak':
          return this.getPeakAnalytics(allSessions, period);
        case 'trends':
          return this.getTrendAnalytics(allSessions, period);
        default:
          throw new Error(`Unsupported analytics type: ${type}`);
      }
    } catch (error) {
      console.error('SessionsService.getSessionAnalytics error:', error);
      throw new Error('Failed to generate session analytics');
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<ParkingSession | null> {
    try {
      const session = await this.sessionsRepository.findById(sessionId);
      if (!session) {
        return null;
      }

      // Map to API format and enhance with additional details
      const mappedSession = this.mapPrismaSessionToApi(session);
      const [enhancedSession] = await this.enhanceSessionsWithDetails([mappedSession]);
      return enhancedSession || null;
    } catch (error) {
      console.error('SessionsService.getSessionById error:', error);
      throw new Error('Failed to fetch session');
    }
  }

  /**
   * End an active parking session
   */
  async endSession(sessionId: any, reason: any = 'Manual end') {
    try {
      const session = await this.sessionsRepository.findById(sessionId);

      if (!session) {
        throw new Error(`Session with ID '${sessionId}' not found`);
      }

      if (session.status !== 'ACTIVE') {
        throw new Error(`Session is not active (current status: ${session.status})`);
      }

      const endTime = new Date();
      if (!session.startTime && !session.createdAt) {
        throw new Error('Session missing start time - cannot calculate duration');
      }
      const startTime = session.startTime ? new Date(session.startTime) : new Date(session.createdAt);
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      // Calculate cost (simplified - in real app would use proper billing service)
      const hourlyRate = this.getHourlyRateForVehicleType(session.vehicleType);
      const hours = Math.ceil(durationMinutes / 60);
      const cost = Math.max(hours * hourlyRate, hourlyRate * 0.5); // Minimum 30 minutes

      // Update session
      const updatedSession = await this.sessionsRepository.update(sessionId, {
        status: 'COMPLETED',
        endTime: endTime,
        duration: durationMinutes,
        totalAmount: Math.round(cost * 100) / 100, // Round to 2 decimal places
        notes: reason,
      });

      // Free up the parking spot
      if (session.spotId) {
        await this.spotRepository.update(session.spotId, { status: 'AVAILABLE' });
      }

      return {
        session: updatedSession,
        duration: durationMinutes,
        cost: Math.round(cost * 100) / 100,
        message: 'Session ended successfully',
      };
    } catch (error) {
      console.error('SessionsService.endSession error:', error);
      throw error;
    }
  }

  /**
   * Cancel an active parking session
   */
  async cancelSession(sessionId: any, reason: any = 'Manual cancellation') {
    try {
      const session = await this.sessionsRepository.findById(sessionId);

      if (!session) {
        throw new Error(`Session with ID '${sessionId}' not found`);
      }

      // Update session
      const updatedSession = await this.sessionsRepository.update(sessionId, {
        status: 'CANCELLED',
        endTime: new Date(),
        notes: reason,
        totalAmount: 0, // No charge for cancelled sessions
      });

      // Free up the parking spot
      if (session.spotId) {
        await this.spotRepository.update(session.spotId, { status: 'AVAILABLE' });
      }

      return {
        session: updatedSession,
        message: 'Session cancelled successfully',
      };
    } catch (error) {
      console.error('SessionsService.cancelSession error:', error);
      throw error;
    }
  }

  /**
   * Extend an active parking session
   */
  async extendSession(sessionId: any, additionalHours: number) {
    try {
      const session = await this.sessionsRepository.findById(sessionId);

      if (!session) {
        throw new Error(`Session with ID '${sessionId}' not found`);
      }

      if (session.status !== 'ACTIVE') {
        throw new Error(`Session is not active (current status: ${session.status})`);
      }

      // Calculate additional cost
      const hourlyRate = this.getHourlyRateForVehicleType(session.vehicle?.vehicleType || session.vehicles?.vehicleType);
      const additionalCost = additionalHours * hourlyRate;

      // For extension, we don't need to update expected end time as it's not part of the schema
      // Just add a note about the extension

      const updatedSession = await this.sessionsRepository.update(sessionId, {
        notes: `Extended by ${additionalHours} hour(s). Additional cost: $${additionalCost.toFixed(2)}`,
      });

      return {
        session: updatedSession,
        additionalHours,
        additionalCost: Math.round(additionalCost * 100) / 100,
        message: `Session extended by ${additionalHours} hour(s)`,
      };
    } catch (error) {
      console.error('SessionsService.extendSession error:', error);
      throw error;
    }
  }

  /**
   * Export sessions as CSV
   */
  async exportSessionsCSV(filters: Partial<SessionFilters>): Promise<string> {
    try {
      const allSessionsResult = await this.sessionsRepository.findAll();
      const allSessions = allSessionsResult.data.map(session => this.mapPrismaSessionToApi(session));
      const filteredSessions = this.applyFilters(allSessions, {
        status: filters.status || 'all',
        dateRange: filters.dateRange || 'all',
        search: filters.search || '',
        limit: 10000, // Large limit for export
        offset: 0,
        sort: 'createdAt',
        order: 'desc',
      });

      // CSV headers
      const headers = [
        'Session ID',
        'License Plate',
        'Vehicle Type',
        'Make',
        'Model',
        'Spot ID',
        'Floor',
        'Bay',
        'Status',
        'Start Time',
        'End Time',
        'Duration (minutes)',
        'Cost',
        'Notes',
      ];

      // CSV rows
      const rows = filteredSessions.map(session => [
        session.id || '',
        session.licensePlate || '',
        session.vehicleType || '',
        session.vehicleMake || '',
        session.vehicleModel || '',
        session.spotId || '',
        session.floor?.toString() || '',
        session.bay || '',
        session.status || '',
        session.startTime || session.createdAt || '',
        session.endTime || '',
        session.duration?.toString() || '',
        session.totalAmount?.toString() || '',
        session.notes || '',
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field || ''}"`).join(','))
        .join('\n');

      return csvContent;
    } catch (error) {
      console.error('SessionsService.exportSessionsCSV error:', error);
      throw new Error('Failed to export sessions as CSV');
    }
  }

  // Private helper methods

  /**
   * Map Prisma session data to API format
   */
  private mapPrismaSessionToApi(session: any): ParkingSession {
    // Handle date conversion safely
    const toISOString = (date: any): string | undefined => {
      if (!date) return undefined;
      if (typeof date === 'string') return date;
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'object' && typeof date.toISOString === 'function') {
        return date.toISOString();
      }
      return undefined;
    };

    return {
      id: session.id,
      vehicleId: session.vehicleId,
      licensePlate: session.vehicle?.licensePlate || session.vehicles?.licensePlate || `LIC-${session.vehicleId?.slice(-6) || 'UNKNOWN'}`,
      vehicleType: session.vehicle?.vehicleType || session.vehicles?.vehicleType,
      vehicleMake: session.vehicle?.make || session.vehicles?.make,
      vehicleModel: session.vehicle?.model || session.vehicles?.model,
      vehicleColor: session.vehicle?.color || session.vehicles?.color,
      spotId: session.spotId,
      floor: session.spot?.floor?.floorNumber || session.parking_spots?.floors?.floorNumber,
      bay: session.spot?.section || session.parking_spots?.section,
      spotNumber: session.spot?.spotNumber || session.parking_spots?.spotNumber,
      garageId: session.spot?.floor?.garageId || session.parking_spots?.floors?.garageId,
      status: session.status,
      createdAt: toISOString(session.createdAt),
      updatedAt: toISOString(session.updatedAt),
      startTime: toISOString(session.startTime),
      endTime: toISOString(session.endTime),
      checkInTime: toISOString(session.startTime),
      checkOutTime: toISOString(session.endTime),
      expectedEndTime: toISOString(session.expectedEndTime),
      duration: session.duration,
      hourlyRate: session.hourlyRate,
      isPaid: session.isPaid,
      paymentMethod: session.paymentMethod,
      paymentTime: toISOString(session.paymentTime),
      cost: session.totalAmount,
      totalAmount: session.totalAmount,
      amountPaid: session.amountPaid,
      notes: session.notes,
    };
  }

  private applyFilters(sessions: ParkingSession[], filters: any): ParkingSession[] {
    let filtered = [...sessions];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(session => session.status === filters.status);
    }

    // Date range filter
    filtered = this.filterSessionsByPeriod(filtered, filters.dateRange);

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        session =>
          session.licensePlate?.toLowerCase().includes(searchTerm) ||
          session.vehicleMake?.toLowerCase().includes(searchTerm) ||
          session.vehicleModel?.toLowerCase().includes(searchTerm) ||
          session.spotId?.toLowerCase().includes(searchTerm) ||
          session.id?.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }

  private filterSessionsByPeriod(sessions: ParkingSession[], period: any): ParkingSession[] {
    if (period === 'all') {
      return sessions;
    }

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return sessions;
    }

    return sessions.filter(session => {
      if (!session.createdAt) return false;
      const sessionDate = new Date(session.createdAt);
      return sessionDate >= startDate;
    });
  }

  private applySorting(
    sessions: ParkingSession[],
    sort: any,
    order: 'asc' | 'desc'
  ): ParkingSession[] {
    return sessions.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sort) {
        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'endTime':
          aVal = a.endTime ? new Date(a.endTime).getTime() : 0;
          bVal = b.endTime ? new Date(b.endTime).getTime() : 0;
          break;
        case 'duration':
          aVal = a.duration || 0;
          bVal = b.duration || 0;
          break;
        case 'totalAmount':
          aVal = a.totalAmount || 0;
          bVal = b.totalAmount || 0;
          break;
        case 'licensePlate':
          aVal = (a.licensePlate || '').toLowerCase();
          bVal = (b.licensePlate || '').toLowerCase();
          break;
        default:
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }

      if (order === 'desc') {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });
  }

  private async enhanceSessionsWithDetails(sessions: ParkingSession[]): Promise<ParkingSession[]> {
    // For now, return sessions as-is
    // In a real implementation, you might fetch vehicle and spot details
    return sessions;
  }

  private getHourlyRateForVehicleType(vehicleType?: any): number {
    // Simplified rate calculation - in real app would fetch from configuration
    switch (vehicleType?.toLowerCase()) {
      case 'compact':
        return 4.0;
      case 'electric':
        return 6.0;
      case 'oversized':
      case 'truck':
        return 8.0;
      default:
        return 5.0; // Standard rate
    }
  }

  // Analytics helper methods
  private getRevenueAnalytics(sessions: ParkingSession[], period: any): SessionAnalytics {
    // Implement revenue analytics logic
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    const data: any[] = [];
    const summary = {
      totalRevenue: completedSessions.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
      averageRevenue: 0,
      totalSessions: completedSessions.length,
    };

    summary.averageRevenue =
      summary.totalSessions > 0 ? summary.totalRevenue / summary.totalSessions : 0;

    return { type: 'revenue', period: period as any, data, summary };
  }

  private getDurationAnalytics(sessions: ParkingSession[], period: any): SessionAnalytics {
    // Implement duration analytics logic
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED' && s.duration);
    const data: any[] = [];
    const summary = {
      averageDuration: 0,
      totalSessions: completedSessions.length,
      shortestSession: 0,
      longestSession: 0,
    };

    if (completedSessions.length > 0) {
      const durations = completedSessions.map(s => s.duration || 0);
      summary.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      summary.shortestSession = Math.min(...durations);
      summary.longestSession = Math.max(...durations);
    }

    return { type: 'duration', period: period as any, data, summary };
  }

  private getPeakAnalytics(sessions: ParkingSession[], period: any): SessionAnalytics {
    // Implement peak hours analytics logic
    const hourCounts: Record<number, number> = {};
    sessions.forEach(session => {
      if (!session.createdAt) return;
      const hour = new Date(session.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const data = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sessionCount: hourCounts[hour] || 0,
      label: `${hour.toString().padStart(2, '0')}:00`,
    }));

    const peakEntry = data.reduce((max, current) =>
      current.sessionCount > max.sessionCount ? current : max
    );

    const summary = {
      peakHour: peakEntry.hour,
      peakSessionCount: peakEntry.sessionCount,
      totalSessions: sessions.length,
    };

    return { type: 'peak', period: period as any, data, summary };
  }

  private getTrendAnalytics(sessions: ParkingSession[], period: any): SessionAnalytics {
    // Implement trend analytics logic
    const data: any[] = [];
    const summary = {
      trend: 'stable',
      growthRate: 0,
      totalSessions: sessions.length,
    };

    return { type: 'trends', period: period as any, data, summary };
  }
}
