/**
 * Reservation repository for data access operations using Prisma
 * 
 * This module provides data access methods for parking reservations using the PrismaAdapter pattern.
 * It handles reservation CRUD operations, availability checks, and reservation management.
 * 
 * @module ReservationRepository
 */

import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { ParkingSession, Prisma, SessionStatus } from '@prisma/client';
import type { 
  QueryOptions,
  PaginatedResult,
  IAdapterLogger
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * Reservation creation data interface
 */
export interface CreateReservationData {
  vehicleId: string;
  spotId: string;
  startTime: Date;
  endTime?: Date;
  expectedEndTime?: Date;
  hourlyRate?: number;
  totalAmount?: number;
  status?: SessionStatus;
  notes?: string;
}

/**
 * Reservation update data interface
 */
export interface UpdateReservationData {
  vehicleId?: string;
  spotId?: string;
  startTime?: Date;
  endTime?: Date;
  expectedEndTime?: Date;
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
 * Reservation search criteria interface
 */
export interface ReservationSearchCriteria {
  vehicleId?: string;
  spotId?: string;
  licensePlate?: string;
  status?: SessionStatus;
  startAfter?: Date;
  startBefore?: Date;
  endAfter?: Date;
  endBefore?: Date;
  isPaid?: boolean;
  floor?: number;
  spotType?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Spot availability check result
 */
export interface SpotAvailability {
  spotId: string;
  isAvailable: boolean;
  conflictingReservations?: ParkingSession[];
  nextAvailableTime?: Date;
}

/**
 * Repository for managing reservations (parking sessions) using Prisma
 */
export class ReservationRepository extends PrismaAdapter<ParkingSession, CreateReservationData, UpdateReservationData> {
  protected readonly modelName = 'parkingSession';
  protected readonly delegate: Prisma.ParkingSessionDelegate;

  constructor(
    databaseService?: DatabaseService,
    logger?: IAdapterLogger
  ) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prismaClient = dbService.getClient();
    
    super(prismaClient, logger || createLogger('ReservationRepository'));
    this.delegate = prismaClient.parkingSession;
  }

  /**
   * Find reservations by vehicle ID
   * @param vehicleId - Vehicle ID
   * @param options - Query options
   * @returns Array of reservations for the vehicle
   */
  async findByVehicleId(
    vehicleId: string,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
    return this.findMany({ vehicleId }, options);
  }

  /**
   * Find reservations by spot ID
   * @param spotId - Spot ID
   * @param options - Query options
   * @returns Array of reservations for the spot
   */
  async findBySpotId(
    spotId: string,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
    return this.findMany({ spotId }, options);
  }

  /**
   * Find reservations by status
   * @param status - Reservation status
   * @param options - Query options
   * @returns Array of reservations with the specified status
   */
  async findByStatus(
    status: SessionStatus,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
    return this.findMany({ status }, options);
  }

  /**
   * Find active reservations
   * @param options - Query options
   * @returns Array of active reservations
   */
  async findActive(options?: QueryOptions): Promise<ParkingSession[]> {
    return this.findByStatus('ACTIVE', options);
  }

  /**
   * Find completed reservations
   * @param options - Query options
   * @returns Array of completed reservations
   */
  async findCompleted(options?: QueryOptions): Promise<ParkingSession[]> {
    return this.findByStatus('COMPLETED', options);
  }

  /**
   * Find cancelled reservations
   * @param options - Query options
   * @returns Array of cancelled reservations
   */
  async findCancelled(options?: QueryOptions): Promise<ParkingSession[]> {
    return this.findByStatus('CANCELLED', options);
  }

  /**
   * Find expired reservations
   * @param options - Query options
   * @returns Array of expired reservations
   */
  async findExpired(options?: QueryOptions): Promise<ParkingSession[]> {
    return this.findByStatus('EXPIRED', options);
  }

  /**
   * Find reservations by license plate
   * @param licensePlate - Vehicle license plate
   * @param options - Query options
   * @returns Array of reservations for the vehicle
   */
  async findByLicensePlate(
    licensePlate: string,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findMany({
        where: {
          vehicle: {
            licensePlate: licensePlate.toUpperCase()
          }
        },
        include: {
          vehicle: true,
          spot: {
            include: {
              floor: {
                include: {
                  garage: true
                }
              }
            }
          },
          payments: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found reservations by license plate', {
        licensePlate,
        count: result.length
      });
      
      return result;
    }, `find reservations by license plate: ${licensePlate}`);
  }

  /**
   * Search reservations with multiple criteria
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Array of reservations matching the criteria
   */
  async search(
    criteria: ReservationSearchCriteria,
    options?: QueryOptions
  ): Promise<ParkingSession[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.ParkingSessionWhereInput = {};

      if (criteria.vehicleId) {
        whereClause.vehicleId = criteria.vehicleId;
      }

      if (criteria.spotId) {
        whereClause.spotId = criteria.spotId;
      }

      if (criteria.status) {
        whereClause.status = criteria.status;
      }

      if (criteria.isPaid !== undefined) {
        whereClause.isPaid = criteria.isPaid;
      }

      if (criteria.licensePlate) {
        whereClause.vehicle = {
          licensePlate: {
            contains: criteria.licensePlate.toUpperCase()
          }
        };
      }

      // Date range filters
      if (criteria.startAfter || criteria.startBefore) {
        whereClause.startTime = {};
        if (criteria.startAfter) {
          whereClause.startTime.gte = criteria.startAfter;
        }
        if (criteria.startBefore) {
          whereClause.startTime.lte = criteria.startBefore;
        }
      }

      if (criteria.endAfter || criteria.endBefore) {
        whereClause.endTime = {};
        if (criteria.endAfter) {
          whereClause.endTime.gte = criteria.endAfter;
        }
        if (criteria.endBefore) {
          whereClause.endTime.lte = criteria.endBefore;
        }
      }

      if (criteria.createdAfter || criteria.createdBefore) {
        whereClause.createdAt = {};
        if (criteria.createdAfter) {
          whereClause.createdAt.gte = criteria.createdAfter;
        }
        if (criteria.createdBefore) {
          whereClause.createdAt.lte = criteria.createdBefore;
        }
      }

      // Floor and spot type filters
      if (criteria.floor || criteria.spotType) {
        whereClause.spot = {};
        if (criteria.floor) {
          whereClause.spot.floor = {
            floorNumber: criteria.floor
          };
        }
        if (criteria.spotType) {
          whereClause.spot.spotType = criteria.spotType as any;
        }
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        include: {
          vehicle: true,
          spot: {
            include: {
              floor: {
                include: {
                  garage: true
                }
              }
            }
          },
          payments: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Reservation search completed', {
        criteria,
        count: result.length
      });
      
      return result;
    }, 'search reservations');
  }

  /**
   * Check spot availability for a time range
   * @param spotId - Spot ID
   * @param startTime - Start time
   * @param endTime - End time
   * @param excludeSessionId - Optional session ID to exclude from check
   * @returns Spot availability information
   */
  async checkSpotAvailability(
    spotId: string,
    startTime: Date,
    endTime: Date,
    excludeSessionId?: string
  ): Promise<SpotAvailability> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.ParkingSessionWhereInput = {
        spotId,
        status: {
          in: ['ACTIVE'] // Only consider active reservations
        },
        OR: [
          // Overlapping reservations
          {
            AND: [
              { startTime: { lte: endTime } },
              {
                OR: [
                  { endTime: { gte: startTime } },
                  { endTime: null } // Active sessions without end time
                ]
              }
            ]
          }
        ]
      };

      // Exclude specific session if provided (for updates)
      if (excludeSessionId) {
        whereClause.id = {
          not: excludeSessionId
        };
      }

      const conflictingReservations = await this.delegate.findMany({
        where: whereClause,
        include: {
          vehicle: true
        }
      });

      const isAvailable = conflictingReservations.length === 0;

      // Find next available time if not available
      let nextAvailableTime: Date | undefined;
      if (!isAvailable) {
        const nextSession = await this.delegate.findFirst({
          where: {
            spotId,
            status: 'ACTIVE',
            endTime: {
              gte: startTime
            }
          },
          orderBy: {
            endTime: 'asc'
          }
        });
        
        nextAvailableTime = nextSession?.endTime || undefined;
      }

      this.logger.debug('Checked spot availability', {
        spotId,
        startTime,
        endTime,
        isAvailable,
        conflictCount: conflictingReservations.length
      });

      return {
        spotId,
        isAvailable,
        conflictingReservations: isAvailable ? undefined : conflictingReservations,
        nextAvailableTime
      };
    }, `check spot availability: ${spotId}`);
  }

  /**
   * Find available spots for a time range
   * @param startTime - Start time
   * @param endTime - End time
   * @param spotType - Optional spot type filter
   * @param floor - Optional floor filter
   * @returns Array of available spot IDs
   */
  async findAvailableSpots(
    startTime: Date,
    endTime: Date,
    spotType?: string,
    floor?: number
  ): Promise<string[]> {
    return this.executeWithRetry(async () => {
      // First get all spots with optional filters
      const spotWhereClause: any = {
        status: 'AVAILABLE',
        isActive: true
      };

      if (spotType) {
        spotWhereClause.spotType = spotType;
      }

      if (floor !== undefined) {
        spotWhereClause.floor = {
          floorNumber: floor
        };
      }

      const allSpots = await this.prisma.parkingSpot.findMany({
        where: spotWhereClause,
        select: { id: true }
      });

      // Check availability for each spot
      const availableSpots: string[] = [];
      for (const spot of allSpots) {
        const availability = await this.checkSpotAvailability(spot.id, startTime, endTime);
        if (availability.isAvailable) {
          availableSpots.push(spot.id);
        }
      }

      this.logger.debug('Found available spots', {
        startTime,
        endTime,
        spotType,
        floor,
        totalSpots: allSpots.length,
        availableCount: availableSpots.length
      });

      return availableSpots;
    }, 'find available spots');
  }

  /**
   * Create a new reservation
   * @param reservationData - Reservation creation data
   * @param tx - Optional transaction client
   * @returns Created reservation
   */
  async createReservation(
    reservationData: CreateReservationData,
    tx?: Prisma.TransactionClient
  ): Promise<ParkingSession> {
    return this.executeWithRetry(async () => {
      // Check spot availability first
      if (reservationData.endTime) {
        const availability = await this.checkSpotAvailability(
          reservationData.spotId,
          reservationData.startTime,
          reservationData.endTime
        );

        if (!availability.isAvailable) {
          throw new Error(
            `Spot ${reservationData.spotId} is not available for the requested time range`
          );
        }
      }

      // Set defaults
      const createData = {
        ...reservationData,
        status: reservationData.status || 'ACTIVE',
        hourlyRate: reservationData.hourlyRate || 5.0,
        totalAmount: reservationData.totalAmount || 0.0,
        amountPaid: 0.0,
        isPaid: false
      };

      const reservation = await this.create(createData, tx);

      this.logger.info('Reservation created', {
        reservationId: reservation.id,
        vehicleId: reservation.vehicleId,
        spotId: reservation.spotId,
        startTime: reservation.startTime,
        endTime: reservation.endTime
      });

      return reservation;
    }, 'create reservation');
  }

  /**
   * Complete a reservation (check out)
   * @param reservationId - Reservation ID
   * @param endTime - End time (defaults to now)
   * @param tx - Optional transaction client
   * @returns Updated reservation
   */
  async completeReservation(
    reservationId: string,
    endTime: Date = new Date(),
    tx?: Prisma.TransactionClient
  ): Promise<ParkingSession> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      
      const reservation = await client.parkingSession.findFirst({
        where: {
          id: reservationId,
          status: 'ACTIVE'
        }
      });

      if (!reservation) {
        throw new Error(`Active reservation with ID ${reservationId} not found`);
      }

      // Calculate duration in minutes
      const duration = Math.floor((endTime.getTime() - reservation.startTime.getTime()) / (1000 * 60));
      
      // Calculate total amount based on duration and hourly rate
      const hours = Math.ceil(duration / 60); // Round up to nearest hour
      const totalAmount = hours * reservation.hourlyRate;

      const updatedReservation = await this.update(
        reservationId,
        {
          endTime,
          duration,
          totalAmount,
          status: 'COMPLETED'
        },
        undefined,
        tx
      );

      this.logger.info('Reservation completed', {
        reservationId,
        duration,
        totalAmount,
        endTime
      });

      return updatedReservation;
    }, `complete reservation: ${reservationId}`);
  }

  /**
   * Cancel a reservation
   * @param reservationId - Reservation ID
   * @param reason - Cancellation reason
   * @param tx - Optional transaction client
   * @returns Updated reservation
   */
  async cancelReservation(
    reservationId: string,
    reason?: string,
    tx?: Prisma.TransactionClient
  ): Promise<ParkingSession> {
    return this.executeWithRetry(async () => {
      const reservation = await this.findById(reservationId);
      if (!reservation) {
        throw new Error(`Reservation with ID ${reservationId} not found`);
      }

      if (reservation.status === 'COMPLETED') {
        throw new Error('Cannot cancel a completed reservation');
      }

      const updatedReservation = await this.update(
        reservationId,
        {
          status: 'CANCELLED',
          notes: reason ? `${reservation.notes || ''} [CANCELLED: ${reason}]` : reservation.notes
        },
        undefined,
        tx
      );

      this.logger.info('Reservation cancelled', {
        reservationId,
        reason
      });

      return updatedReservation;
    }, `cancel reservation: ${reservationId}`);
  }

  /**
   * Get reservation statistics
   * @param startDate - Start date for statistics
   * @param endDate - End date for statistics
   * @returns Reservation statistics
   */
  async getStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byStatus: Record<SessionStatus, number>;
    totalRevenue: number;
    averageDuration: number;
    occupancyRate: number;
  }> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.ParkingSessionWhereInput = {};
      
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const total = await this.count(whereClause);
      
      // Get counts by status
      const statusCounts = await this.prisma.$queryRaw<
        Array<{ status: SessionStatus; count: bigint }>
      >`
        SELECT status, COUNT(*) as count
        FROM parking_sessions
        WHERE ${startDate ? Prisma.sql`createdAt >= ${startDate}` : Prisma.sql`1=1`}
          ${endDate ? Prisma.sql`AND createdAt <= ${endDate}` : Prisma.empty}
        GROUP BY status
      `;

      const byStatus: Record<SessionStatus, number> = {
        ACTIVE: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        EXPIRED: 0
      };

      statusCounts.forEach(({ status, count }) => {
        byStatus[status] = Number(count);
      });

      // Get revenue and duration stats
      const revenueResult = await this.prisma.$queryRaw<
        Array<{ totalRevenue: number | null; avgDuration: number | null }>
      >`
        SELECT 
          SUM(totalAmount) as totalRevenue,
          AVG(duration) as avgDuration
        FROM parking_sessions
        WHERE status = 'COMPLETED'
          ${startDate ? Prisma.sql`AND createdAt >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND createdAt <= ${endDate}` : Prisma.empty}
      `;

      const totalRevenue = revenueResult[0]?.totalRevenue || 0;
      const averageDuration = revenueResult[0]?.avgDuration || 0;

      // Calculate occupancy rate (completed sessions vs total spots)
      const totalSpots = await this.prisma.parkingSpot.count({
        where: { isActive: true }
      });
      const occupancyRate = totalSpots > 0 ? (byStatus.COMPLETED / totalSpots) * 100 : 0;

      this.logger.debug('Reservation statistics calculated', {
        total,
        totalRevenue,
        averageDuration,
        occupancyRate
      });

      return {
        total,
        byStatus,
        totalRevenue,
        averageDuration,
        occupancyRate
      };
    }, 'get reservation statistics');
  }
}

export default ReservationRepository;