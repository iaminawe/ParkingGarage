/**
 * Session repository for data access operations using Prisma
 *
 * This module provides data access methods for parking sessions using
 * the PrismaAdapter pattern. It handles session CRUD operations,
 * tracking, and provides optimized queries for session management.
 *
 * @module SessionRepository
 */

import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { ParkingSession, Prisma, SessionStatus } from '@prisma/client';
import type {
  QueryOptions,
  PaginatedResult,
  IAdapterLogger,
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * Session creation data interface
 */
export interface CreateSessionData {
  vehicleId: string;
  spotId: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  hourlyRate?: number;
  totalAmount?: number;
  amountPaid?: number;
  isPaid?: boolean;
  paymentMethod?: string;
  paymentTime?: Date;
  status?: SessionStatus;
  notes?: string;
}

/**
 * Session update data interface
 */
export interface UpdateSessionData {
  vehicleId?: string;
  spotId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  hourlyRate?: number;
  totalAmount?: number;
  amountPaid?: number;
  isPaid?: boolean;
  paymentMethod?: string;
  paymentTime?: Date;
  status?: SessionStatus;
  notes?: string;
}

/**
 * Session search criteria interface
 */
export interface SessionSearchCriteria {
  spotId?: string;
  vehicleId?: string;
  status?: SessionStatus;
  startDate?: Date;
  endDate?: Date;
  isPaid?: boolean;
  licensePlate?: string;
}

/**
 * Session statistics interface
 */
export interface SessionStats {
  total: number;
  active: number;
  completed: number;
  expired: number;
  cancelled: number;
  abandoned: number;
  totalRevenue: number;
  averageDuration: number;
  averageAmount: number;
}

/**
 * Repository for managing parking sessions using Prisma
 */
export class SessionRepository extends PrismaAdapter<
  ParkingSession,
  CreateSessionData,
  UpdateSessionData
> {
  protected readonly modelName = 'parkingSession';
  protected readonly delegate: Prisma.ParkingSessionDelegate;

  constructor(databaseService?: DatabaseService, logger?: IAdapterLogger) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prismaClient = dbService.getClient();

    super(prismaClient, logger || createLogger('SessionRepository'));
    this.delegate = prismaClient.parkingSession;
  }

  /**
   * Find sessions by status
   * @param status - Session status to filter by
   * @param options - Query options
   * @returns Array of sessions matching the status
   */
  async findByStatus(status: SessionStatus, options?: QueryOptions): Promise<ParkingSession[]> {
    return this.findMany({ status }, options);
  }

  /**
   * Find active sessions
   * @param options - Query options
   * @returns Array of active sessions
   */
  async findActiveSessions(options?: QueryOptions): Promise<ParkingSession[]> {
    return this.findByStatus('ACTIVE', options);
  }

  /**
   * Find completed sessions
   * @param options - Query options
   * @returns Array of completed sessions
   */
  async findCompletedSessions(options?: QueryOptions): Promise<ParkingSession[]> {
    return this.findByStatus('COMPLETED', options);
  }

  /**
   * Find sessions by vehicle ID
   * @param vehicleId - Vehicle ID
   * @param options - Query options
   * @returns Array of sessions for the vehicle
   */
  async findByVehicleId(vehicleId: string, options?: QueryOptions): Promise<ParkingSession[]> {
    return this.findMany({ vehicleId }, options);
  }

  /**
   * Find sessions by vehicle license plate
   * @param licensePlate - Vehicle license plate
   * @param options - Query options
   * @returns Array of sessions for the vehicle
   */
  async findByLicensePlate(
    licensePlate: string,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findMany({
        where: {
          vehicle: {
            licensePlate: licensePlate.toUpperCase(),
          },
        },
        include: {
          vehicle: true,
          spot: true,
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found sessions by license plate', {
        licensePlate,
        count: result.length,
      });

      return result;
    }, `find sessions by license plate: ${licensePlate}`);
  }

  /**
   * Find sessions by spot ID
   * @param spotId - Spot ID
   * @param options - Query options
   * @returns Array of sessions for the spot
   */
  async findBySpotId(spotId: string, options?: QueryOptions): Promise<ParkingSession[]> {
    return this.findMany({ spotId }, options);
  }

  /**
   * Find sessions by garage ID (through spot relation)
   * @param garageId - Garage ID
   * @param options - Query options
   * @returns Array of sessions for the garage
   */
  async findByGarageId(garageId: string, options?: QueryOptions): Promise<ParkingSession[]> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findMany({
        where: {
          spot: {
            floor: {
              garageId,
            },
          },
        },
        include: {
          vehicle: true,
          spot: {
            include: {
              floor: {
                include: {
                  garage: true,
                },
              },
            },
          },
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found sessions by garage ID', {
        garageId,
        count: result.length,
      });

      return result;
    }, `find sessions by garage ID: ${garageId}`);
  }

  /**
   * Find current active session for a vehicle
   * @param vehicleId - Vehicle ID
   * @param options - Query options
   * @param tx - Optional transaction client
   * @returns Active session or null
   */
  async findActiveByVehicle(
    vehicleId: string,
    options?: QueryOptions,
    tx?: Prisma.TransactionClient
  ): Promise<ParkingSession | null> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client.parkingSession.findFirst({
        where: {
          vehicleId,
          status: 'ACTIVE',
        },
        include: {
          vehicle: true,
          spot: true,
        },
        orderBy: {
          startTime: 'desc',
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found active session for vehicle', {
        vehicleId,
        found: !!result,
      });

      return result;
    }, `find active session for vehicle: ${vehicleId}`);
  }

  /**
   * Find current active session for a vehicle
   * @param vehicleId - Vehicle ID
   * @param options - Query options
   * @returns Active session or null
   */
  async findActiveSessionForVehicle(
    vehicleId: string,
    options?: QueryOptions
  ): Promise<ParkingSession | null> {
    return this.findActiveByVehicle(vehicleId, options);
  }

  /**
   * Find current active session for a spot
   * @param spotId - Spot ID
   * @param options - Query options
   * @returns Active session or null
   */
  async findActiveSessionForSpot(
    spotId: string,
    options?: QueryOptions
  ): Promise<ParkingSession | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: {
          spotId,
          status: 'ACTIVE',
        },
        include: {
          vehicle: true,
          spot: true,
        },
        orderBy: {
          startTime: 'desc',
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found active session for spot', {
        spotId,
        found: !!result,
      });

      return result;
    }, `find active session for spot: ${spotId}`);
  }

  /**
   * Find session by spot and status
   * @param spotId - Spot ID
   * @param status - Session status
   * @param options - Query options
   * @param tx - Optional transaction client
   * @returns Session or null
   */
  async findBySpotAndStatus(
    spotId: string,
    status: SessionStatus,
    options?: QueryOptions,
    tx?: Prisma.TransactionClient
  ): Promise<ParkingSession | null> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client.parkingSession.findFirst({
        where: {
          spotId,
          status,
        },
        include: {
          vehicle: true,
          spot: true,
        },
        orderBy: {
          startTime: 'desc',
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found session by spot and status', {
        spotId,
        status,
        found: !!result,
      });

      return result;
    }, `find session by spot: ${spotId} and status: ${status}`);
  }

  /**
   * Search sessions with multiple criteria
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Array of sessions matching all criteria
   */
  async search(criteria: SessionSearchCriteria, options?: QueryOptions): Promise<ParkingSession[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.ParkingSessionWhereInput = {};

      // Direct field matches

      if (criteria.spotId) {
        whereClause.spotId = criteria.spotId;
      }

      if (criteria.vehicleId) {
        whereClause.vehicleId = criteria.vehicleId;
      }

      if (criteria.status) {
        whereClause.status = criteria.status;
      }

      if (criteria.isPaid !== undefined) {
        whereClause.isPaid = criteria.isPaid;
      }

      // Date range search
      if (criteria.startDate || criteria.endDate) {
        whereClause.startTime = {};
        if (criteria.startDate) {
          whereClause.startTime.gte = criteria.startDate;
        }
        if (criteria.endDate) {
          whereClause.startTime.lte = criteria.endDate;
        }
      }

      // License plate search
      if (criteria.licensePlate) {
        whereClause.vehicle = {
          licensePlate: {
            contains: criteria.licensePlate.toUpperCase(),
          },
        };
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        include: {
          vehicle: true,
          spot: true,
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Session search completed', {
        criteria,
        count: result.length,
      });

      return result;
    }, 'search sessions');
  }

  /**
   * Create a new parking session and update related entities
   * @param sessionData - Session creation data
   * @returns Created session with relations
   */
  async createSession(
    sessionData: CreateSessionData
  ): Promise<ParkingSession & { vehicle: any; spot: any }> {
    return this.executeTransaction(async tx => {
      // Create the session
      const session = await tx.parkingSession.create({
        data: {
          vehicleId: sessionData.vehicleId,
          spotId: sessionData.spotId,
          startTime: sessionData.startTime || new Date(),
          status: sessionData.status || 'ACTIVE',
          hourlyRate: sessionData.hourlyRate || 5.0,
          totalAmount: sessionData.totalAmount || 0.0,
          isPaid: sessionData.isPaid || false,
          notes: sessionData.notes,
        },
        include: {
          vehicle: true,
          spot: true,
        },
      });

      // Update spot status to occupied
      await tx.parkingSpot.update({
        where: { id: sessionData.spotId },
        data: {
          status: 'OCCUPIED',
        },
      });

      this.logger.info('Session created with related entity updates', {
        sessionId: session.id,
        vehicleId: sessionData.vehicleId,
        spotId: sessionData.spotId,
      });

      return session;
    });
  }

  /**
   * End a parking session and calculate charges
   * @param sessionId - Session ID
   * @param endReason - Reason for ending session
   * @param hourlyRate - Hourly rate for billing
   * @returns Updated session
   */
  async endSession(
    sessionId: string,
    endReason = 'manual',
    hourlyRate = 5.0
  ): Promise<ParkingSession> {
    return this.executeTransaction(async tx => {
      // Get the session
      const session = await tx.parkingSession.findFirst({
        where: {
          id: sessionId,
          status: 'ACTIVE',
        },
        include: {
          vehicle: true,
          spot: true,
        },
      });

      if (!session) {
        throw new Error(`Active session with ID ${sessionId} not found`);
      }

      // Calculate duration and amount
      const checkOutTime = new Date();
      const durationMs = checkOutTime.getTime() - session.startTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
      const totalAmount = Math.round(durationHours * hourlyRate * 100) / 100;

      // Update session
      const updatedSession = await tx.parkingSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          endTime: checkOutTime,
          duration: durationMinutes,
          hourlyRate,
          totalAmount,
        },
      });

      // Update spot status (make it available)
      if (session.spot) {
        await tx.parkingSpot.update({
          where: { id: session.spotId },
          data: {
            status: 'AVAILABLE',
          },
        });
      }

      this.logger.info('Session ended with related entity updates', {
        sessionId,
        durationMinutes,
        totalAmount,
        endReason,
      });

      return updatedSession;
    });
  }

  /**
   * Mark a session as paid
   * @param sessionId - Session ID
   * @param amountPaid - Amount paid
   * @returns Updated session
   */
  async markAsPaid(sessionId: string, amountPaid: number): Promise<ParkingSession> {
    return this.executeWithRetry(async () => {
      const session = await this.delegate.findFirst({
        where: {
          id: sessionId,
        },
      });

      if (!session) {
        throw new Error(`Session with ID ${sessionId} not found`);
      }

      if (session.isPaid) {
        throw new Error(`Session ${sessionId} is already paid`);
      }

      if (amountPaid < session.totalAmount) {
        throw new Error(
          `Insufficient payment. Required: $${session.totalAmount}, Provided: $${amountPaid}`
        );
      }

      const updatedSession = await this.update(sessionId, {
        isPaid: true,
      });

      this.logger.info('Session marked as paid', {
        sessionId,
        totalAmount: session.totalAmount,
        amountPaid,
      });

      return updatedSession;
    }, `mark session as paid: ${sessionId}`);
  }

  /**
   * Get session statistics
   * @param garageId - Optional garage ID to filter statistics (through spot relation)
   * @returns Session statistics
   */
  async getStats(garageId?: string): Promise<SessionStats> {
    return this.executeWithRetry(async () => {
      let whereClause: any = {};

      if (garageId) {
        whereClause = {
          spot: {
            floor: {
              garageId,
            },
          },
        };
      }

      // Get total count
      const totalCount = await this.count(whereClause);

      // Count by status - use Prisma aggregation instead of raw SQL
      const statusCounts = await this.delegate.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
        ...(garageId
          ? {
              where: {
                spot: {
                  floor: {
                    garageId,
                  },
                },
              },
            }
          : {}),
      });

      // Calculate revenue and averages
      const aggregates = await this.delegate.aggregate({
        _sum: {
          totalAmount: true,
        },
        _avg: {
          duration: true,
          totalAmount: true,
        },
        where: {
          isPaid: true,
          ...(garageId
            ? {
                spot: {
                  floor: {
                    garageId,
                  },
                },
              }
            : {}),
        },
      });

      // Build result
      const stats: SessionStats = {
        total: totalCount,
        active: 0,
        completed: 0,
        expired: 0,
        cancelled: 0,
        abandoned: 0, // Keep for interface compatibility, even though not in schema
        totalRevenue: aggregates._sum.totalAmount || 0,
        averageDuration: aggregates._avg.duration || 0,
        averageAmount: aggregates._avg.totalAmount || 0,
      };

      // Process status counts
      statusCounts.forEach(({ status, _count }) => {
        const countNum = _count.status;
        switch (status) {
          case 'ACTIVE':
            stats.active = countNum;
            break;
          case 'COMPLETED':
            stats.completed = countNum;
            break;
          case 'EXPIRED':
            stats.expired = countNum;
            break;
          case 'CANCELLED':
            stats.cancelled = countNum;
            break;
          // No ABANDONED status in schema - skipping
        }
      });

      this.logger.debug('Session statistics calculated', {
        garageId,
        stats,
      });

      return stats;
    }, 'get session statistics');
  }

  /**
   * Find expired sessions (active sessions past expected end time)
   * @param options - Query options
   * @returns Array of expired sessions
   */
  async findExpiredSessions(options?: QueryOptions): Promise<ParkingSession[]> {
    return this.executeWithRetry(async () => {
      const now = new Date();

      const result = await this.delegate.findMany({
        where: {
          status: 'ACTIVE',
          endTime: {
            lt: now,
          },
        },
        include: {
          vehicle: true,
          spot: true,
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found expired sessions', {
        count: result.length,
        currentTime: now,
      });

      return result;
    }, 'find expired sessions');
  }

  /**
   * Find long-running sessions (active for more than specified hours)
   * @param maxHours - Maximum allowed hours
   * @param options - Query options
   * @returns Array of long-running sessions
   */
  async findLongRunningSessions(maxHours = 24, options?: QueryOptions): Promise<ParkingSession[]> {
    return this.executeWithRetry(async () => {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - maxHours);

      const result = await this.delegate.findMany({
        where: {
          status: 'ACTIVE',
          startTime: {
            lte: cutoffTime,
          },
        },
        include: {
          vehicle: true,
          spot: true,
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found long-running sessions', {
        maxHours,
        count: result.length,
        cutoffTime,
      });

      return result;
    }, `find long-running sessions (max ${maxHours}h)`);
  }

  /**
   * Legacy compatibility method - maintain existing API
   * @param sessionData - Session data
   * @returns Created session
   */
  override async create(sessionData: any): Promise<any> {
    // Map legacy session data to Prisma format
    const prismaData: CreateSessionData = {
      spotId: sessionData.spotId,
      vehicleId: sessionData.vehicleId,
      status: sessionData.status || 'ACTIVE',
      startTime: sessionData.createdAt ? new Date(sessionData.createdAt) : new Date(),
      hourlyRate: sessionData.hourlyRate || 5.0,
      totalAmount: sessionData.totalAmount || 0.0,
      isPaid: sessionData.isPaid || false,
      notes: sessionData.notes,
    };

    const session = await this.createSession(prismaData);

    // Map back to legacy format
    return {
      id: session.id,
      vehicleId: session.vehicleId,
      licensePlate: session.vehicle?.licensePlate,
      vehicleType: session.vehicle?.vehicleType,
      spotId: session.spotId,
      status: session.status.toLowerCase(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      endTime: session.endTime?.toISOString(),
      duration: session.duration,
      cost: session.totalAmount,
      notes: session.notes,
    };
  }
}

export default SessionRepository;
