/**
 * Reservation repository for parking spot reservations using Prisma
 *
 * This module provides data access methods for parking spot reservations.
 * Since there's no explicit Reservation model in the schema, this repository
 * manages reservations through the ParkingSpot status and sessions.
 *
 * @module ReservationRepository
 */

import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { PrismaClient } from '@prisma/client';
import { ParkingSpot, ParkingSession, Vehicle, Prisma } from '@prisma/client';

// Define transaction client type
type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

// Define session with includes type using Prisma's generated types
type SessionWithIncludes = Prisma.ParkingSessionGetPayload<{
  include: {
    vehicle: true;
    spot: {
      include: {
        floor: {
          include: {
            garage: true;
          };
        };
      };
    };
  };
}>;

// Define session with just spot for simpler queries
type SessionWithSpot = Prisma.ParkingSessionGetPayload<{
  include: {
    spot: true;
  };
}>;
import type {
  QueryOptions,
  PaginatedResult,
  IAdapterLogger,
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * Reservation data interface (virtual reservation through session)
 */
export interface ReservationData {
  id: string;
  spotId: string;
  vehicleId: string;
  userId?: string;
  reservedAt: Date;
  expiresAt: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'USED' | 'CANCELLED';
  startTime?: Date;
  endTime?: Date;
  expectedEndTime?: Date;
  duration?: number;
  totalAmount?: number;
  hourlyRate?: number;
  isPaid?: boolean;
  paymentTime?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  spot?: ParkingSpot;
  vehicle?: Vehicle;
  session?: ParkingSession;
}

/**
 * Reservation creation data interface
 */
export interface CreateReservationData {
  spotId: string;
  vehicleId: string;
  userId?: string;
  reservationDurationMinutes?: number;
  notes?: string;
  status?: 'ACTIVE' | 'EXPIRED' | 'USED' | 'CANCELLED';
  hourlyRate?: number;
  startTime?: Date;
  endTime?: Date;
  expectedEndTime?: Date;
}

/**
 * Reservation update data interface
 */
export interface UpdateReservationData {
  status?: 'ACTIVE' | 'EXPIRED' | 'USED' | 'CANCELLED';
  expiresAt?: Date;
  notes?: string;
}

/**
 * Reservation search criteria interface
 */
export interface ReservationSearchCriteria {
  spotId?: string;
  vehicleId?: string;
  userId?: string;
  status?: 'ACTIVE' | 'EXPIRED' | 'USED' | 'CANCELLED';
  garageId?: string;
  floorId?: string;
  startDate?: Date;
  endDate?: Date;
  licensePlate?: string;
}

/**
 * Reservation statistics interface
 */
export interface ReservationStats {
  total: number;
  active: number;
  expired: number;
  used: number;
  cancelled: number;
  byGarage: Record<string, number>;
  averageDuration: number;
  utilizationRate: number; // percentage of reservations that were used
}

/**
 * Spot availability interface
 */
export interface SpotAvailability {
  isAvailable: boolean;
  conflictingReservations: ReservationData[];
  reason?: string;
}

/**
 * Repository for managing parking spot reservations
 * Note: This manages virtual reservations through spot status and sessions
 */
export class ReservationRepository {
  private prisma: any;
  private logger: IAdapterLogger;

  constructor(databaseService?: DatabaseService, logger?: IAdapterLogger) {
    const dbService = databaseService || DatabaseService.getInstance();
    this.prisma = dbService.getClient();
    this.logger = logger || createLogger('ReservationRepository');
  }

  /**
   * Create a new reservation by reserving a spot
   * @param reservationData - Reservation creation data
   * @returns Created reservation data
   */
  async createReservation(reservationData: CreateReservationData): Promise<ReservationData> {
    return this.executeWithRetry(async () => {
      return this.prisma.$transaction(async (tx: TransactionClient) => {
        // Check if spot is available
        const spot = await tx.parkingSpot.findFirst({
          where: {
            id: reservationData.spotId,
            status: 'AVAILABLE',
            isActive: true,
          },
          include: {
            floor: {
              include: {
                garage: true,
              },
            },
          },
        });

        if (!spot) {
          throw new Error(
            `Parking spot ${reservationData.spotId} is not available for reservation`
          );
        }

        // Check if vehicle exists
        const vehicle = await tx.vehicle.findFirst({
          where: {
            id: reservationData.vehicleId,
            deletedAt: null,
          },
        });

        if (!vehicle) {
          throw new Error(`Vehicle ${reservationData.vehicleId} not found`);
        }

        // Check if vehicle already has an active reservation or session
        const activeSession = await tx.parkingSession.findFirst({
          where: {
            vehicleId: reservationData.vehicleId,
            status: 'ACTIVE',
          },
        });

        if (activeSession) {
          throw new Error(`Vehicle ${vehicle.licensePlate} already has an active parking session`);
        }

        // Reserve the spot by updating its status
        await tx.parkingSpot.update({
          where: { id: reservationData.spotId },
          data: { status: 'RESERVED' },
        });

        // Create a placeholder session to track the reservation
        const reservationDuration = reservationData.reservationDurationMinutes || 30; // 30 minutes default
        const now = new Date();
        const expiresAt = new Date(now.getTime() + reservationDuration * 60 * 1000);

        const session = await tx.parkingSession.create({
          data: {
            vehicleId: reservationData.vehicleId,
            spotId: reservationData.spotId,
            startTime: now,
            endTime: expiresAt,
            status: 'ACTIVE', // Will be used to track reservation status
            hourlyRate: 0, // No charge for reservation itself
            totalAmount: 0,
            amountPaid: 0,
            isPaid: true, // Mark as paid to avoid charging for reservation
            notes: `RESERVATION: ${reservationData.notes || 'Auto-generated reservation'}`,
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
        });

        const reservation: ReservationData = {
          id: session.id,
          spotId: reservationData.spotId,
          vehicleId: reservationData.vehicleId,
          userId: reservationData.userId,
          reservedAt: now,
          expiresAt,
          status: 'ACTIVE',
          spot: session.spot,
          vehicle: session.vehicle,
          session,
        };

        this.logger.info('Reservation created', {
          reservationId: session.id,
          spotNumber: spot.spotNumber,
          licensePlate: vehicle.licensePlate,
          expiresAt,
        });

        return reservation;
      });
    }, 'create reservation');
  }

  /**
   * Find reservation by ID
   * @param reservationId - Reservation ID (session ID)
   * @param options - Query options
   * @returns Found reservation or null
   */
  async findById(reservationId: string, options?: QueryOptions): Promise<ReservationData | null> {
    return this.executeWithRetry(async () => {
      const session = await this.prisma.parkingSession.findFirst({
        where: {
          id: reservationId,
          notes: {
            contains: 'RESERVATION:',
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
      });

      if (!session) {
        return null;
      }

      return this.sessionToReservation(session);
    }, `find reservation: ${reservationId}`);
  }

  /**
   * Find reservations by vehicle ID
   * @param vehicleId - Vehicle ID
   * @param options - Query options
   * @returns Array of reservations for the vehicle
   */
  async findByVehicleId(vehicleId: string, options?: QueryOptions): Promise<ReservationData[]> {
    return this.executeWithRetry(async () => {
      const sessions = await this.prisma.parkingSession.findMany({
        where: {
          vehicleId,
          notes: {
            contains: 'RESERVATION:',
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

      return sessions.map((session: SessionWithIncludes) => this.sessionToReservation(session));
    }, `find reservations for vehicle: ${vehicleId}`);
  }

  /**
   * Find reservations by spot ID
   * @param spotId - Spot ID
   * @param options - Query options
   * @returns Array of reservations for the spot
   */
  async findBySpotId(spotId: string, options?: QueryOptions): Promise<ReservationData[]> {
    return this.executeWithRetry(async () => {
      const sessions = await this.prisma.parkingSession.findMany({
        where: {
          spotId,
          notes: {
            contains: 'RESERVATION:',
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

      return sessions.map((session: SessionWithIncludes) => this.sessionToReservation(session));
    }, `find reservations for spot: ${spotId}`);
  }

  /**
   * Find active reservations
   * @param options - Query options
   * @returns Array of active reservations
   */
  async findActiveReservations(options?: QueryOptions): Promise<ReservationData[]> {
    return this.executeWithRetry(async () => {
      const now = new Date();
      const sessions = await this.prisma.parkingSession.findMany({
        where: {
          notes: {
            contains: 'RESERVATION:',
          },
          status: 'ACTIVE',
          endTime: {
            gt: now, // Not expired
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

      return sessions.map((session: SessionWithIncludes) => this.sessionToReservation(session));
    }, 'find active reservations');
  }

  /**
   * Find expired reservations
   * @param options - Query options
   * @returns Array of expired reservations
   */
  async findExpiredReservations(options?: QueryOptions): Promise<ReservationData[]> {
    return this.executeWithRetry(async () => {
      const now = new Date();
      const sessions = await this.prisma.parkingSession.findMany({
        where: {
          notes: {
            contains: 'RESERVATION:',
          },
          status: 'ACTIVE',
          endTime: {
            lt: now, // Expired
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

      return sessions.map((session: SessionWithIncludes) => this.sessionToReservation(session));
    }, 'find expired reservations');
  }

  /**
   * Use a reservation (convert to actual parking session)
   * @param reservationId - Reservation ID
   * @param actualStartTime - Actual parking start time
   * @returns Updated session
   */
  async useReservation(reservationId: string, actualStartTime?: Date): Promise<ParkingSession> {
    return this.executeWithRetry(async () => {
      return this.prisma.$transaction(async (tx: TransactionClient) => {
        const session = await tx.parkingSession.findFirst({
          where: {
            id: reservationId,
            notes: {
              contains: 'RESERVATION:',
            },
            status: 'ACTIVE',
          },
          include: {
            spot: true,
            vehicle: true,
          },
        });

        if (!session) {
          throw new Error(`Active reservation ${reservationId} not found`);
        }

        // Check if reservation is expired
        if (session.endTime && session.endTime < new Date()) {
          throw new Error(`Reservation ${reservationId} has expired`);
        }

        // Convert to actual parking session
        const startTime = actualStartTime || new Date();
        const updatedSession = await tx.parkingSession.update({
          where: { id: reservationId },
          data: {
            startTime,
            endTime: null, // Remove expiration, now it's an active session
            duration: null,
            status: 'ACTIVE',
            hourlyRate: 5.0, // Set actual hourly rate
            totalAmount: 0,
            amountPaid: 0,
            isPaid: false, // Now requires payment
            notes:
              session.notes?.replace('RESERVATION:', 'USED_RESERVATION:') || 'Used reservation',
          },
          include: {
            vehicle: true,
            spot: true,
          },
        });

        // Update spot status to occupied
        await tx.parkingSpot.update({
          where: { id: session.spotId },
          data: { status: 'OCCUPIED' },
        });

        this.logger.info('Reservation used and converted to parking session', {
          reservationId,
          sessionId: updatedSession.id,
          spotNumber: session.spot?.spotNumber,
          licensePlate: session.vehicle?.licensePlate,
        });

        return updatedSession;
      });
    }, `use reservation: ${reservationId}`);
  }

  /**
   * Cancel a reservation
   * @param reservationId - Reservation ID
   * @param reason - Cancellation reason
   * @returns Updated reservation data
   */
  async cancelReservation(reservationId: string, reason?: string): Promise<ReservationData> {
    return this.executeWithRetry(async () => {
      return this.prisma.$transaction(async (tx: TransactionClient) => {
        const session = await tx.parkingSession.findFirst({
          where: {
            id: reservationId,
            notes: {
              contains: 'RESERVATION:',
            },
            status: 'ACTIVE',
          },
          include: {
            spot: true,
            vehicle: true,
          },
        });

        if (!session) {
          throw new Error(`Active reservation ${reservationId} not found`);
        }

        // Cancel the session
        const cancelledSession = await tx.parkingSession.update({
          where: { id: reservationId },
          data: {
            status: 'CANCELLED',
            notes: `${session.notes} - CANCELLED: ${reason || 'User cancelled'}`,
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
        });

        // Make spot available again
        await tx.parkingSpot.update({
          where: { id: session.spotId },
          data: { status: 'AVAILABLE' },
        });

        const reservation = this.sessionToReservation(cancelledSession);

        this.logger.info('Reservation cancelled', {
          reservationId,
          spotNumber: session.spot?.spotNumber,
          licensePlate: session.vehicle?.licensePlate,
          reason,
        });

        return reservation;
      });
    }, `cancel reservation: ${reservationId}`);
  }

  /**
   * Clean up expired reservations
   * @returns Number of cleaned up reservations
   */
  async cleanupExpiredReservations(): Promise<number> {
    return this.executeWithRetry(async () => {
      return this.prisma.$transaction(async (tx: TransactionClient) => {
        const now = new Date();

        // Find expired reservations
        const expiredSessions = await tx.parkingSession.findMany({
          where: {
            notes: {
              contains: 'RESERVATION:',
            },
            status: 'ACTIVE',
            endTime: {
              lt: now,
            },
          },
          include: {
            spot: true,
          },
        });

        if (expiredSessions.length === 0) {
          return 0;
        }

        // Mark sessions as expired
        await tx.parkingSession.updateMany({
          where: {
            id: {
              in: expiredSessions.map((s: SessionWithSpot) => s.id),
            },
          },
          data: {
            status: 'EXPIRED',
            notes: {
              set: 'EXPIRED_RESERVATION: Automatically expired',
            },
          },
        });

        // Make spots available again
        const spotIds = expiredSessions.map((s: SessionWithSpot) => s.spotId);
        await tx.parkingSpot.updateMany({
          where: {
            id: {
              in: spotIds,
            },
            status: 'RESERVED', // Only update if still reserved
          },
          data: {
            status: 'AVAILABLE',
          },
        });

        this.logger.info('Cleaned up expired reservations', {
          count: expiredSessions.length,
          spotIds,
        });

        return expiredSessions.length;
      });
    }, 'cleanup expired reservations');
  }

  /**
   * Get reservation statistics
   * @param garageId - Optional garage ID filter
   * @returns Reservation statistics
   */
  async getStats(garageId?: string): Promise<ReservationStats> {
    return this.executeWithRetry(async () => {
      const whereClause: any = {
        notes: {
          contains: 'RESERVATION:',
        },
      };

      if (garageId) {
        whereClause.spot = {
          floor: {
            garageId,
          },
        };
      }

      // Count by status
      const sessions = await this.prisma.parkingSession.findMany({
        where: whereClause,
        include: {
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
      });

      const stats: ReservationStats = {
        total: sessions.length,
        active: 0,
        expired: 0,
        used: 0,
        cancelled: 0,
        byGarage: {},
        averageDuration: 0,
        utilizationRate: 0,
      };

      let totalDuration = 0;
      let usedCount = 0;

      sessions.forEach((session: SessionWithIncludes) => {
        const reservation = this.sessionToReservation(session);
        const garageName = session.spot?.floor?.garage?.name || 'Unknown';

        // Count by status
        switch (reservation.status) {
          case 'ACTIVE':
            stats.active++;
            break;
          case 'EXPIRED':
            stats.expired++;
            break;
          case 'USED':
            stats.used++;
            usedCount++;
            break;
          case 'CANCELLED':
            stats.cancelled++;
            break;
        }

        // Count by garage
        stats.byGarage[garageName] = (stats.byGarage[garageName] || 0) + 1;

        // Calculate duration
        if (session.startTime && session.endTime) {
          totalDuration += session.endTime.getTime() - session.startTime.getTime();
        }
      });

      stats.averageDuration =
        sessions.length > 0 ? totalDuration / sessions.length / (1000 * 60) : 0; // minutes
      stats.utilizationRate = sessions.length > 0 ? (usedCount / sessions.length) * 100 : 0;

      this.logger.debug('Reservation statistics calculated', {
        garageId,
        stats,
      });

      return stats;
    }, 'get reservation statistics');
  }

  /**
   * Convert parking session to reservation data
   */
  private sessionToReservation(session: SessionWithIncludes): ReservationData {
    let status: 'ACTIVE' | 'EXPIRED' | 'USED' | 'CANCELLED' = 'ACTIVE';

    if (session.status === 'CANCELLED') {
      status = 'CANCELLED';
    } else if (session.status === 'EXPIRED') {
      status = 'EXPIRED';
    } else if (session.notes?.includes('USED_RESERVATION:')) {
      status = 'USED';
    } else if (session.endTime && session.endTime < new Date()) {
      status = 'EXPIRED';
    }

    return {
      id: session.id,
      spotId: session.spotId,
      vehicleId: session.vehicleId,
      reservedAt: session.startTime,
      expiresAt: session.endTime || new Date(),
      status,
      startTime: session.startTime,
      endTime: session.endTime || undefined,
      duration: session.duration || undefined,
      totalAmount: session.totalAmount,
      hourlyRate: session.hourlyRate,
      isPaid: session.isPaid,
      paymentTime: session.paymentTime,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      spot: session.spot,
      vehicle: session.vehicle,
      session,
    };
  }

  /**
   * Build query options for Prisma
   */
  private buildQueryOptions(options?: QueryOptions): any {
    if (!options) {
      return {};
    }

    const queryOptions: any = {};

    if (options.skip !== undefined) {
      queryOptions.skip = options.skip;
    }
    if (options.take !== undefined) {
      queryOptions.take = options.take;
    }
    if (options.cursor) {
      queryOptions.cursor = options.cursor;
    }
    if (options.orderBy) {
      queryOptions.orderBy = options.orderBy;
    }

    return queryOptions;
  }

  /**
   * Search reservations with criteria
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Array of matching reservations
   */
  async search(criteria: ReservationSearchCriteria, options?: QueryOptions): Promise<ReservationData[]> {
    return this.executeWithRetry(async () => {
      const whereClause: any = {
        notes: {
          contains: 'RESERVATION:',
        },
      };

      if (criteria.spotId) {
        whereClause.spotId = criteria.spotId;
      }
      if (criteria.vehicleId) {
        whereClause.vehicleId = criteria.vehicleId;
      }
      if (criteria.userId) {
        whereClause.userId = criteria.userId;
      }
      if (criteria.status === 'ACTIVE') {
        whereClause.status = 'ACTIVE';
        whereClause.endTime = { gt: new Date() };
      } else if (criteria.status === 'EXPIRED') {
        whereClause.endTime = { lt: new Date() };
      }
      if (criteria.startDate || criteria.endDate) {
        whereClause.startTime = {};
        if (criteria.startDate) {
          whereClause.startTime.gte = criteria.startDate;
        }
        if (criteria.endDate) {
          whereClause.startTime.lte = criteria.endDate;
        }
      }

      const sessions = await this.prisma.parkingSession.findMany({
        where: whereClause,
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

      return sessions.map((session: SessionWithIncludes) => this.sessionToReservation(session));
    }, 'search reservations');
  }

  /**
   * Find all reservations with pagination
   * @param options - Query options
   * @returns Paginated result of reservations
   */
  async findAll(options?: QueryOptions): Promise<PaginatedResult<ReservationData>> {
    return this.executeWithRetry(async () => {
      const whereClause = {
        notes: {
          contains: 'RESERVATION:',
        },
      };

      const [totalCount, sessions] = await Promise.all([
        this.prisma.parkingSession.count({ where: whereClause }),
        this.prisma.parkingSession.findMany({
          where: whereClause,
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
        }),
      ]);

      const take = options?.take || 10;
      const skip = options?.skip || 0;
      const currentPage = Math.floor(skip / take) + 1;
      const totalPages = Math.ceil(totalCount / take);

      return {
        data: sessions.map((session: SessionWithIncludes) => this.sessionToReservation(session)),
        totalCount,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        currentPage,
        totalPages,
        pageSize: take,
      };
    }, 'find all reservations');
  }

  /**
   * Check spot availability for reservation
   * @param spotId - Spot ID
   * @param startTime - Proposed start time
   * @param endTime - Proposed end time
   * @returns Availability information
   */
  async checkSpotAvailability(
    spotId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    isAvailable: boolean;
    conflictingReservations: ReservationData[];
    reason?: string;
  }> {
    return this.executeWithRetry(async () => {
      // Check if spot exists and is active
      const spot = await this.prisma.parkingSpot.findFirst({
        where: {
          id: spotId,
          isActive: true,
        },
      });

      if (!spot) {
        return {
          isAvailable: false,
          conflictingReservations: [],
          reason: 'Spot not found or inactive',
        };
      }

      if (spot.status === 'OUT_OF_ORDER' || spot.status === 'MAINTENANCE') {
        return {
          isAvailable: false,
          conflictingReservations: [],
          reason: `Spot is ${spot.status.toLowerCase().replace('_', ' ')}`,
        };
      }

      // Check for conflicting reservations
      const conflictingSessions = await this.prisma.parkingSession.findMany({
        where: {
          spotId,
          notes: {
            contains: 'RESERVATION:',
          },
          status: 'ACTIVE',
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gte: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lte: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
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
      });

      const conflictingReservations = conflictingSessions.map(
        (session: SessionWithIncludes) => this.sessionToReservation(session)
      );

      return {
        isAvailable: conflictingReservations.length === 0,
        conflictingReservations,
        reason: conflictingReservations.length > 0 ? 'Time slot conflicts with existing reservations' : undefined,
      };
    }, `check spot availability: ${spotId}`);
  }

  /**
   * Update a reservation
   * @param reservationId - Reservation ID
   * @param updateData - Update data
   * @returns Updated reservation
   */
  async update(reservationId: string, updateData: UpdateReservationData): Promise<ReservationData> {
    return this.executeWithRetry(async () => {
      const sessionUpdateData: any = {};

      if (updateData.status) {
        if (updateData.status === 'CANCELLED') {
          sessionUpdateData.status = 'CANCELLED';
        } else if (updateData.status === 'EXPIRED') {
          sessionUpdateData.status = 'EXPIRED';
        }
      }

      if (updateData.expiresAt) {
        sessionUpdateData.endTime = updateData.expiresAt;
      }

      if (updateData.notes) {
        sessionUpdateData.notes = `RESERVATION: ${updateData.notes}`;
      }

      const updatedSession = await this.prisma.parkingSession.update({
        where: { id: reservationId },
        data: sessionUpdateData,
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
      });

      return this.sessionToReservation(updatedSession);
    }, `update reservation: ${reservationId}`);
  }

  /**
   * Complete a reservation (mark as used)
   * @param reservationId - Reservation ID
   * @returns Completed reservation
   */
  async completeReservation(reservationId: string): Promise<ReservationData> {
    return this.executeWithRetry(async () => {
      const updatedSession = await this.prisma.parkingSession.update({
        where: { id: reservationId },
        data: {
          notes: { 
            set: this.prisma.parkingSession.fields.notes + " USED_RESERVATION:"
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
      });

      return this.sessionToReservation(updatedSession);
    }, `complete reservation: ${reservationId}`);
  }

  /**
   * Find available spots for reservation
   * @param criteria - Search criteria for available spots
   * @param startTime - Desired start time
   * @param endTime - Desired end time
   * @returns Array of available spots
   */
  async findAvailableSpots(
    criteria: { garageId?: string; floorId?: string; spotType?: string },
    startTime: Date,
    endTime: Date
  ): Promise<ParkingSpot[]> {
    return this.executeWithRetry(async () => {
      const whereClause: any = {
        isActive: true,
        status: 'AVAILABLE',
      };

      if (criteria.floorId) {
        whereClause.floorId = criteria.floorId;
      }
      if (criteria.spotType) {
        whereClause.spotType = criteria.spotType;
      }
      if (criteria.garageId) {
        whereClause.floor = {
          garageId: criteria.garageId,
        };
      }

      // Get spots that don't have conflicting reservations
      const availableSpots = await this.prisma.parkingSpot.findMany({
        where: {
          ...whereClause,
          NOT: {
            sessions: {
              some: {
                notes: {
                  contains: 'RESERVATION:',
                },
                status: 'ACTIVE',
                OR: [
                  {
                    AND: [
                      { startTime: { lte: startTime } },
                      { endTime: { gte: startTime } },
                    ],
                  },
                  {
                    AND: [
                      { startTime: { lte: endTime } },
                      { endTime: { gte: endTime } },
                    ],
                  },
                  {
                    AND: [
                      { startTime: { gte: startTime } },
                      { endTime: { lte: endTime } },
                    ],
                  },
                ],
              },
            },
          },
        },
        include: {
          floor: {
            include: {
              garage: true,
            },
          },
        },
      });

      return availableSpots;
    }, 'find available spots');
  }

  /**
   * Count reservations matching criteria
   * @param criteria - Search criteria
   * @returns Count of matching reservations
   */
  async count(criteria: Partial<ReservationSearchCriteria>): Promise<number> {
    return this.executeWithRetry(async () => {
      const whereClause: any = {
        notes: {
          contains: 'RESERVATION:',
        },
      };

      if (criteria.spotId) {
        whereClause.spotId = criteria.spotId;
      }
      if (criteria.vehicleId) {
        whereClause.vehicleId = criteria.vehicleId;
      }
      if (criteria.status === 'ACTIVE') {
        whereClause.status = 'ACTIVE';
        whereClause.endTime = { gt: new Date() };
      }

      return await this.prisma.parkingSession.count({ where: whereClause });
    }, 'count reservations');
  }

  /**
   * Find reservations by license plate
   * @param licensePlate - License plate
   * @param options - Query options
   * @returns Array of reservations for the license plate
   */
  async findByLicensePlate(licensePlate: string, options?: QueryOptions): Promise<ReservationData[]> {
    return this.executeWithRetry(async () => {
      const sessions = await this.prisma.parkingSession.findMany({
        where: {
          notes: {
            contains: 'RESERVATION:',
          },
          vehicle: {
            licensePlate: licensePlate.toUpperCase(),
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

      return sessions.map((session: SessionWithIncludes) => this.sessionToReservation(session));
    }, `find reservations by license plate: ${licensePlate}`);
  }

  /**
   * Execute operation with retry logic (simplified version)
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName = 'operation'
  ): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;

      this.logger.debug(`${operationName} completed`, {
        duration,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      this.logger.error(`${operationName} failed`, error as Error);
      throw error;
    }
  }
}

export default ReservationRepository;
