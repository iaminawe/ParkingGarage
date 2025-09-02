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
import { ParkingSession, Prisma, SessionStatus, RateType } from '../generated/prisma';
import type { 
  QueryOptions,
  PaginatedResult,
  IAdapterLogger
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * Session creation data interface
 */
export interface CreateSessionData {
  garageId?: string;
  spotId: string;
  vehicleId: string;
  status?: SessionStatus;
  rateType?: RateType;
  entryTime?: Date;
  checkInTime?: Date;
  expectedExitTime?: Date;
  expectedEndTime?: Date;
  hourlyRate?: number;
  notes?: string;
  metadata?: string;
}

/**
 * Session update data interface
 */
export interface UpdateSessionData {
  garageId?: string;
  spotId?: string;
  vehicleId?: string;
  status?: SessionStatus;
  rateType?: RateType;
  entryTime?: Date;
  checkInTime?: Date;
  exitTime?: Date;
  checkOutTime?: Date;
  expectedExitTime?: Date;
  expectedEndTime?: Date;
  duration?: number;
  durationMinutes?: number;
  totalFee?: number;
  hourlyRate?: number;
  totalAmount?: number;
  isPaid?: boolean;
  notes?: string;
  metadata?: string;
  endReason?: string;
}

/**
 * Session search criteria interface
 */
export interface SessionSearchCriteria {
  garageId?: string;
  spotId?: string;
  vehicleId?: string;
  status?: SessionStatus;
  rateType?: RateType;
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
export class SessionRepository extends PrismaAdapter<ParkingSession, CreateSessionData, UpdateSessionData> {
  protected readonly modelName = 'parkingSession';
  protected readonly delegate: Prisma.ParkingSessionDelegate;

  constructor(
    databaseService?: DatabaseService,
    logger?: IAdapterLogger
  ) {
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
  async findByStatus(
    status: SessionStatus,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
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
  async findByVehicleId(
    vehicleId: string,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
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
            deletedAt: null
          },
          deletedAt: null
        },
        include: {
          vehicle: true,
          spot: true,
          garage: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found sessions by license plate', {
        licensePlate,
        count: result.length
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
  async findBySpotId(
    spotId: string,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
    return this.findMany({ spotId }, options);
  }

  /**
   * Find sessions by garage ID
   * @param garageId - Garage ID
   * @param options - Query options
   * @returns Array of sessions for the garage
   */
  async findByGarageId(
    garageId: string,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
    return this.findMany({ garageId }, options);
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
          deletedAt: null
        },
        include: {
          vehicle: true,
          spot: true,
          garage: true
        },
        orderBy: {
          checkInTime: 'desc'
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found active session for vehicle', {
        vehicleId,
        found: !!result
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
          deletedAt: null
        },
        include: {
          vehicle: true,
          spot: true,
          garage: true
        },
        orderBy: {
          checkInTime: 'desc'
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found active session for spot', {
        spotId,
        found: !!result
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
          deletedAt: null
        },
        include: {
          vehicle: true,
          spot: true,
          garage: true
        },
        orderBy: {
          checkInTime: 'desc'
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found session by spot and status', {
        spotId,
        status,
        found: !!result
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
  async search(
    criteria: SessionSearchCriteria,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.ParkingSessionWhereInput = {
        deletedAt: null
      };

      // Direct field matches
      if (criteria.garageId) {
        whereClause.garageId = criteria.garageId;
      }

      if (criteria.spotId) {
        whereClause.spotId = criteria.spotId;
      }

      if (criteria.vehicleId) {
        whereClause.vehicleId = criteria.vehicleId;
      }

      if (criteria.status) {
        whereClause.status = criteria.status;
      }

      if (criteria.rateType) {
        whereClause.rateType = criteria.rateType;
      }

      if (criteria.isPaid !== undefined) {
        whereClause.isPaid = criteria.isPaid;
      }

      // Date range search
      if (criteria.startDate || criteria.endDate) {
        whereClause.checkInTime = {};
        if (criteria.startDate) {
          whereClause.checkInTime.gte = criteria.startDate;
        }
        if (criteria.endDate) {
          whereClause.checkInTime.lte = criteria.endDate;
        }
      }

      // License plate search
      if (criteria.licensePlate) {
        whereClause.vehicle = {
          licensePlate: {
            contains: criteria.licensePlate.toUpperCase(),
            mode: 'insensitive'
          },
          deletedAt: null
        };
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        include: {
          vehicle: true,
          spot: true,
          garage: true,
          tickets: true,
          payments: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Session search completed', {
        criteria,
        count: result.length
      });
      
      return result;
    }, 'search sessions');
  }

  /**
   * Create a new parking session and update related entities
   * @param sessionData - Session creation data
   * @returns Created session
   */
  async createSession(sessionData: CreateSessionData): Promise<ParkingSession> {
    return this.executeTransaction(async (tx) => {
      // Create the session
      const session = await tx.parkingSession.create({
        data: {
          ...sessionData,
          checkInTime: sessionData.checkInTime || new Date(),
          status: sessionData.status || 'ACTIVE',
          rateType: sessionData.rateType || 'HOURLY',
          totalAmount: 0.0,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          vehicle: true,
          spot: true,
          garage: true
        }
      });

      // Update vehicle's current spot
      await tx.vehicle.update({
        where: { id: sessionData.vehicleId },
        data: { currentSpotId: sessionData.spotId }
      });

      // Update spot's current vehicle
      await tx.spot.update({
        where: { id: sessionData.spotId },
        data: { 
          currentVehicleId: sessionData.vehicleId,
          status: 'OCCUPIED'
        }
      });

      this.logger.info('Session created with related entity updates', {
        sessionId: session.id,
        vehicleId: sessionData.vehicleId,
        spotId: sessionData.spotId
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
    endReason: string = 'manual',
    hourlyRate: number = 5.0
  ): Promise<ParkingSession> {
    return this.executeTransaction(async (tx) => {
      // Get the session
      const session = await tx.parkingSession.findFirst({
        where: {
          id: sessionId,
          status: 'ACTIVE',
          deletedAt: null
        },
        include: {
          vehicle: true,
          spot: true
        }
      });

      if (!session) {
        throw new Error(`Active session with ID ${sessionId} not found`);
      }

      // Calculate duration and amount
      const checkOutTime = new Date();
      const durationMs = checkOutTime.getTime() - session.checkInTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
      const totalAmount = Math.round(durationHours * hourlyRate * 100) / 100;

      // Update session
      const updatedSession = await tx.parkingSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          checkOutTime,
          durationMinutes,
          hourlyRate,
          totalAmount,
          endReason,
          updatedAt: new Date()
        }
      });

      // Update vehicle's current spot (clear it)
      if (session.vehicle) {
        await tx.vehicle.update({
          where: { id: session.vehicleId },
          data: { currentSpotId: null }
        });
      }

      // Update spot status (make it available)
      if (session.spot) {
        await tx.spot.update({
          where: { id: session.spotId },
          data: { 
            currentVehicleId: null,
            status: 'AVAILABLE'
          }
        });
      }

      this.logger.info('Session ended with related entity updates', {
        sessionId,
        durationMinutes,
        totalAmount,
        endReason
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
          deletedAt: null
        }
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
        isPaid: true
      });

      this.logger.info('Session marked as paid', {
        sessionId,
        totalAmount: session.totalAmount,
        amountPaid
      });

      return updatedSession;
    }, `mark session as paid: ${sessionId}`);
  }

  /**
   * Get session statistics
   * @param garageId - Optional garage ID to filter statistics
   * @returns Session statistics
   */
  async getStats(garageId?: string): Promise<SessionStats> {
    return this.executeWithRetry(async () => {
      const whereClause = garageId ? { garageId } : {};
      
      // Get total count
      const totalCount = await this.count(whereClause);

      // Count by status
      const statusCounts = await this.prisma.$queryRaw<
        Array<{ status: SessionStatus; count: bigint }>
      >`
        SELECT status, COUNT(*) as count
        FROM parking_sessions
        WHERE deletedAt IS NULL ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY status
      `;

      // Calculate revenue and averages
      const aggregates = await this.prisma.$queryRaw<
        Array<{
          totalRevenue: number | null;
          avgDuration: number | null;
          avgAmount: number | null;
        }>
      >`
        SELECT 
          SUM(totalAmount) as totalRevenue,
          AVG(durationMinutes) as avgDuration,
          AVG(totalAmount) as avgAmount
        FROM parking_sessions
        WHERE deletedAt IS NULL 
          AND isPaid = 1 
          ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
      `;

      // Build result
      const stats: SessionStats = {
        total: totalCount,
        active: 0,
        completed: 0,
        expired: 0,
        cancelled: 0,
        abandoned: 0,
        totalRevenue: aggregates[0]?.totalRevenue || 0,
        averageDuration: aggregates[0]?.avgDuration || 0,
        averageAmount: aggregates[0]?.avgAmount || 0
      };

      // Process status counts
      statusCounts.forEach(({ status, count }) => {
        const countNum = Number(count);
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
          case 'ABANDONED':
            stats.abandoned = countNum;
            break;
        }
      });

      this.logger.debug('Session statistics calculated', {
        garageId,
        stats
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
          expectedEndTime: {
            lt: now
          },
          deletedAt: null
        },
        include: {
          vehicle: true,
          spot: true,
          garage: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found expired sessions', {
        count: result.length,
        currentTime: now
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
  async findLongRunningSessions(
    maxHours: number = 24,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
    return this.executeWithRetry(async () => {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - maxHours);
      
      const result = await this.delegate.findMany({
        where: {
          status: 'ACTIVE',
          checkInTime: {
            lte: cutoffTime
          },
          deletedAt: null
        },
        include: {
          vehicle: true,
          spot: true,
          garage: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found long-running sessions', {
        maxHours,
        count: result.length,
        cutoffTime
      });
      
      return result;
    }, `find long-running sessions (max ${maxHours}h)`);
  }

  /**
   * Legacy compatibility method - maintain existing API
   * @param sessionData - Session data
   * @returns Created session
   */
  async create(sessionData: any): Promise<any> {
    // Map legacy session data to Prisma format
    const prismaData: CreateSessionData = {
      garageId: sessionData.garageId || 'default-garage',
      spotId: sessionData.spotId,
      vehicleId: sessionData.vehicleId,
      status: sessionData.status || 'ACTIVE',
      rateType: sessionData.rateType || 'HOURLY',
      checkInTime: sessionData.createdAt ? new Date(sessionData.createdAt) : new Date(),
      notes: sessionData.notes,
      metadata: sessionData.metadata ? JSON.stringify(sessionData.metadata) : undefined
    };

    const session = await this.createSession(prismaData);
    
    // Map back to legacy format
    return {
      id: session.id,
      vehicleId: session.vehicleId,
      licensePlate: session.vehicle?.licensePlate,
      vehicleType: session.vehicle?.vehicleType,
      spotId: session.spotId,
      garageId: session.garageId,
      status: session.status.toLowerCase(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      endTime: session.checkOutTime?.toISOString(),
      duration: session.durationMinutes,
      cost: session.totalAmount,
      rateType: session.rateType?.toLowerCase(),
      endReason: session.endReason,
      notes: session.notes,
      metadata: session.metadata ? JSON.parse(session.metadata) : undefined
    };
  }
}

export default SessionRepository;