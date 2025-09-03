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
  status: 'all' | 'active' | 'completed' | 'cancelled';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  search: any;
  limit: number;
  offset: number;
  sort: 'createdAt' | 'endTime' | 'duration' | 'cost' | 'licensePlate';
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
  async getSessions(filters: any): Promise<PaginatedResponse<ParkingSession[]>> {
    try {
      // Get all sessions with vehicle relations from repository
      const sessionResult = await this.sessionsRepository.findAllWithRelations({
        take: filters.limit || 50,
        skip: filters.offset || 0,
      });
      const allSessions = sessionResult.data || [];

      // Map to proper ParkingSession format with licensePlate
      const mappedSessions = allSessions.map((session: any) => ({
        id: session.id,
        vehicleId: session.vehicleId,
        licensePlate: session.vehicle?.licensePlate || 'UNKNOWN',
        vehicleType: session.vehicle?.vehicleType || 'standard',
        vehicleMake: session.vehicle?.make,
        vehicleModel: session.vehicle?.model,
        vehicleColor: session.vehicle?.color,
        spotId: session.spotId,
        floor: session.spot?.floor?.number,
        bay: session.spot?.bay,
        spotNumber: session.spot?.number,
        garageId: session.spot?.floor?.garageId,
        status: session.status?.toLowerCase() || 'unknown',
        createdAt: session.createdAt?.toISOString(),
        updatedAt: session.updatedAt?.toISOString(),
        startTime: session.startTime?.toISOString(),
        endTime: session.endTime?.toISOString(),
        expectedEndTime: session.endTime?.toISOString(), // Use endTime as expectedEndTime for now
        checkInTime: session.startTime?.toISOString(),
        checkOutTime: session.endTime?.toISOString(),
        duration: session.duration,
        cost: session.totalAmount,
        amount: session.totalAmount,
        rateType: 'hourly',
        endReason: 'manual',
        notes: session.notes,
      }));

      // Apply filters
      let filteredSessions = this.applyFilters(mappedSessions, filters);

      // Apply sorting
      filteredSessions = this.applySorting(filteredSessions, filters.sort, filters.order);

      // Calculate pagination
      const total = filteredSessions.length;
      const totalPages = Math.ceil(total / (filters as any).limit);
      const currentPage = Math.floor((filters as any).offset / (filters as any).limit) + 1;
      const hasNextPage = currentPage < totalPages;
      const hasPreviousPage = currentPage > 1;

      // Apply pagination
      const paginatedSessions = filteredSessions.slice(
        (filters as any).offset || 0,
        ((filters as any).offset || 0) + ((filters as any).limit || 50)
      );

      // Enhance sessions with additional data
      const enhancedSessions = await this.enhanceSessionsWithDetails(paginatedSessions);

      return {
        data: enhancedSessions,
        pagination: {
          total,
          limit: (filters as any).limit,
          offset: (filters as any).offset || 0,
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
      const sessionResult = await this.sessionsRepository.findAllWithRelations();
      const rawSessions = sessionResult.data || [];
      
      // Map sessions to consistent format
      const allSessions = rawSessions.map((session: any) => ({
        id: session.id,
        licensePlate: session.vehicle?.licensePlate || 'UNKNOWN',
        vehicleType: session.vehicle?.vehicleType || 'standard',
        status: session.status?.toLowerCase() || 'unknown',
        createdAt: session.createdAt?.toISOString() || new Date().toISOString(),
        startTime: session.startTime?.toISOString(),
        cost: session.totalAmount || 0,
        duration: session.duration || 0,
        totalAmount: session.totalAmount || 0,
        spotId: session.spotId,
        endTime: session.endTime?.toISOString(),
      } as ParkingSession));
      
      const filteredSessions = this.filterSessionsByPeriod(allSessions, period);

      // Calculate basic stats
      const totalSessions = filteredSessions.length;
      const activeSessions = filteredSessions.filter(s => s.status === 'active').length;
      const completedSessions = filteredSessions.filter(s => s.status === 'completed').length;
      const cancelledSessions = filteredSessions.filter(s => s.status === 'cancelled').length;

      const totalRevenue = filteredSessions
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + (s.cost || 0), 0);

      const completedWithDuration = filteredSessions.filter(
        s => s.status === 'completed' && s.duration
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
        const sessionDate = new Date(s.createdAt || new Date());
        return sessionDate >= today;
      });

      const todayRevenue = todaySessions
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + (s.cost || 0), 0);

      // Peak hour calculation
      const hourCounts: Record<number, number> = {};
      filteredSessions.forEach(session => {
        const dateStr = session.createdAt || session.startTime || new Date().toISOString();
        const hour = new Date(dateStr).getHours();
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
        active: activeSessions,
        completed: completedSessions,
        cancelled: cancelledSessions,
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
      const sessionResult = await this.sessionsRepository.findAllWithRelations();
      const rawSessions = sessionResult.data || [];
      
      // Map sessions to consistent format
      const allSessions = rawSessions.map((session: any) => ({
        id: session.id,
        licensePlate: session.vehicle?.licensePlate || 'UNKNOWN',
        vehicleType: session.vehicle?.vehicleType || 'standard',
        status: session.status?.toLowerCase() || 'unknown',
        createdAt: session.createdAt?.toISOString() || new Date().toISOString(),
        startTime: session.startTime?.toISOString(),
        cost: session.totalAmount || 0,
        duration: session.duration || 0,
        spotId: session.spotId,
        endTime: session.endTime?.toISOString(),
      } as ParkingSession));

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
  async getSessionById(sessionId: any): Promise<ParkingSession | null> {
    try {
      const session = await this.sessionsRepository.findById(sessionId);
      if (!session) {
        return null;
      }

      // Map to ParkingSession format (session from findById doesn't include vehicle data)
      const mappedSession = {
        id: session.id,
        vehicleId: session.vehicleId,
        licensePlate: 'UNKNOWN', // Would need to fetch vehicle data separately
        vehicleType: 'standard',
        spotId: session.spotId,
        status: session.status.toLowerCase(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        startTime: session.startTime?.toISOString(),
        endTime: session.endTime?.toISOString(),
        duration: session.duration,
        cost: session.totalAmount,
        notes: session.notes,
      } as ParkingSession;

      // Enhance with additional details
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
      const startTime = new Date(session.createdAt);
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      // Calculate cost (simplified - in real app would use proper billing service)
      const hourlyRate = this.getHourlyRateForVehicleType('standard'); // Use default since session doesn't include vehicle data
      const hours = Math.ceil(durationMinutes / 60);
      const cost = Math.max(hours * hourlyRate, hourlyRate * 0.5); // Minimum 30 minutes

      // Update session
      const updatedSession = await this.sessionsRepository.update(sessionId, {
        status: 'COMPLETED',
        endTime: endTime,
        duration: durationMinutes,
        cost: Math.round(cost * 100) / 100, // Round to 2 decimal places
        endReason: reason,
      });

      // Free up the parking spot
      if (session.spotId) {
        await this.spotRepository.updateSpotStatus(session.spotId, 'AVAILABLE');
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
        endReason: reason,
        cost: 0, // No charge for cancelled sessions
      });

      // Free up the parking spot
      if (session.spotId) {
        await this.spotRepository.updateSpotStatus(session.spotId, 'AVAILABLE');
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
      const hourlyRate = this.getHourlyRateForVehicleType('standard'); // Use default since session doesn't include vehicle data
      const additionalCost = additionalHours * hourlyRate;

      // Just update notes since expectedEndTime may not be in the database schema
      const updatedSession = await this.sessionsRepository.update(sessionId, {
        notes: `Extended by ${additionalHours} hour(s). Additional cost: $${additionalCost.toFixed(2)}`,
      });

      return {
        session: updatedSession,
        additionalHours,
        additionalCost: Math.round(additionalCost * 100) / 100,
        newExpectedEndTime: undefined, // Will be implemented when expectedEndTime is added to schema
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
      const sessionResult = await this.sessionsRepository.findAllWithRelations();
      const rawSessions = sessionResult.data || [];
      
      // Map sessions to ParkingSession format
      const allSessions = rawSessions.map((session: any) => ({
        id: session.id,
        licensePlate: session.vehicle?.licensePlate || 'UNKNOWN',
        vehicleType: session.vehicle?.vehicleType || 'standard',
        vehicleMake: session.vehicle?.make || '',
        vehicleModel: session.vehicle?.model || '',
        spotId: session.spotId,
        floor: session.spot?.floor?.number || '',
        bay: session.spot?.bay || '',
        status: session.status?.toLowerCase() || 'unknown',
        createdAt: session.createdAt?.toISOString(),
        endTime: session.endTime?.toISOString(),
        duration: session.duration,
        cost: session.totalAmount,
        endReason: 'manual',
      } as ParkingSession));
      
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
        'End Reason',
      ];

      // CSV rows
      const rows = filteredSessions.map(session => [
        session.id,
        session.licensePlate || '',
        session.vehicleType || '',
        session.vehicleMake || '',
        session.vehicleModel || '',
        session.spotId || '',
        session.floor || '',
        session.bay || '',
        session.status,
        session.createdAt,
        session.endTime || '',
        session.duration?.toString() || '',
        session.cost?.toString() || '',
        session.endReason || '',
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\\n');

      return csvContent;
    } catch (error) {
      console.error('SessionsService.exportSessionsCSV error:', error);
      throw new Error('Failed to export sessions as CSV');
    }
  }

  // Private helper methods

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
          (session.id || '').toLowerCase().includes(searchTerm)
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
      const sessionDate = new Date(session.createdAt || new Date());
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
          aVal = new Date(a.createdAt || new Date()).getTime();
          bVal = new Date(b.createdAt || new Date()).getTime();
          break;
        case 'endTime':
          aVal = a.endTime ? new Date(a.endTime).getTime() : 0;
          bVal = b.endTime ? new Date(b.endTime).getTime() : 0;
          break;
        case 'duration':
          aVal = a.duration || 0;
          bVal = b.duration || 0;
          break;
        case 'cost':
          aVal = a.cost || 0;
          bVal = b.cost || 0;
          break;
        case 'licensePlate':
          aVal = (a.licensePlate || '').toLowerCase();
          bVal = (b.licensePlate || '').toLowerCase();
          break;
        default:
          aVal = new Date(a.createdAt || new Date()).getTime();
          bVal = new Date(b.createdAt || new Date()).getTime();
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
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const data: any[] = [];
    const summary = {
      totalRevenue: completedSessions.reduce((sum, s) => sum + (s.cost || 0), 0),
      averageRevenue: 0,
      totalSessions: completedSessions.length,
    };

    summary.averageRevenue =
      summary.totalSessions > 0 ? summary.totalRevenue / summary.totalSessions : 0;

    return { type: 'revenue', period: period as any, data, summary };
  }

  private getDurationAnalytics(sessions: ParkingSession[], period: any): SessionAnalytics {
    // Implement duration analytics logic
    const completedSessions = sessions.filter(s => s.status === 'completed' && s.duration);
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
      const hour = new Date(session.createdAt || new Date()).getHours();
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
