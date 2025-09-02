/**
 * Session repository for data access operations using Prisma ORM
 * 
 * This module provides data access methods for parking session records
 * using the repository pattern with Prisma integration. It handles 
 * session CRUD operations, duration calculations, and maintains data consistency.
 * 
 * @module SessionRepository
 */

import { PrismaClient, ParkingSession, Prisma } from '@prisma/client';
import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { DatabaseService } from '../services/DatabaseService';

// Type definitions for Session operations
interface SessionCreateData {
  vehicleId: string;
  spotId: string;
  startTime?: Date;
  hourlyRate?: number;
  status?: string;
  paymentMethod?: string;
  notes?: string;
}

interface SessionUpdateData {
  endTime?: Date;
  duration?: number;
  totalAmount?: number;
  amountPaid?: number;
  isPaid?: boolean;
  paymentMethod?: string;
  paymentTime?: Date;
  status?: string;
  notes?: string;
}

interface SessionSearchCriteria {
  vehicleId?: string;
  spotId?: string;
  status?: string;
  isPaid?: boolean;
  paymentMethod?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  durationMin?: number;
  durationMax?: number;
  amountMin?: number;
  amountMax?: number;
}

/**
 * Repository for managing parking session records with Prisma ORM
 */
export class SessionRepository extends PrismaAdapter<ParkingSession, SessionCreateData, SessionUpdateData> {
  protected model: PrismaClient['parkingSession'];

  constructor(databaseService?: DatabaseService) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prisma = dbService.getPrismaClient();
    super(prisma);
    this.model = prisma.parkingSession;
  }

  /**
   * Create a new session record
   * @param sessionData - Session data to create
   * @returns Created session instance
   * @throws Error if session data is invalid
   */
  async create(sessionData: SessionCreateData): Promise<ParkingSession> {
    const normalizedData = {
      ...sessionData,
      startTime: sessionData.startTime || new Date(),
      hourlyRate: sessionData.hourlyRate || 5.0,
      status: sessionData.status || 'ACTIVE'
    };

    try {
      return await this.model.create({
        data: normalizedData as Prisma.ParkingSessionCreateInput,
        include: {
          vehicle: true,
          spot: true
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Session with this data already exists');
        }
        if (error.code === 'P2003') {
          throw new Error('Invalid vehicle or spot reference');
        }
      }
      throw error;
    }
  }

  /**
   * Find session by ID
   * @param id - Session ID to search for
   * @returns Session if found, null otherwise
   */
  async findById(id: string): Promise<ParkingSession | null> {
    return await this.model.findUnique({
      where: { id },
      include: {
        vehicle: true,
        spot: true
      }
    });
  }

  /**
   * Find sessions by vehicle ID
   * @param vehicleId - Vehicle ID to search for
   * @returns Array of sessions for the vehicle
   */
  async findByVehicleId(vehicleId: string): Promise<ParkingSession[]> {
    return await this.model.findMany({
      where: { vehicleId },
      include: {
        vehicle: true,
        spot: true
      },
      orderBy: { startTime: 'desc' }
    });
  }

  /**
   * Find sessions by spot ID
   * @param spotId - Spot ID to search for
   * @returns Array of sessions for the spot
   */
  async findBySpotId(spotId: string): Promise<ParkingSession[]> {
    return await this.model.findMany({
      where: { spotId },
      include: {
        vehicle: true,
        spot: true
      },
      orderBy: { startTime: 'desc' }
    });
  }

  /**
   * Find active sessions
   * @returns Array of currently active sessions
   */
  async findActive(): Promise<ParkingSession[]> {
    return await this.model.findMany({
      where: { 
        status: 'ACTIVE',
        endTime: null
      },
      include: {
        vehicle: true,
        spot: true
      },
      orderBy: { startTime: 'desc' }
    });
  }

  /**
   * Find unpaid sessions
   * @returns Array of unpaid sessions
   */
  async findUnpaid(): Promise<ParkingSession[]> {
    return await this.model.findMany({
      where: { 
        isPaid: false,
        status: { not: 'CANCELLED' }
      },
      include: {
        vehicle: true,
        spot: true
      },
      orderBy: { startTime: 'desc' }
    });
  }

  /**
   * Search sessions with flexible criteria
   * @param criteria - Search criteria
   * @returns Array of matching sessions
   */
  async search(criteria: SessionSearchCriteria): Promise<ParkingSession[]> {
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

    if (criteria.paymentMethod) {
      whereClause.paymentMethod = criteria.paymentMethod;
    }

    if (criteria.startDateFrom || criteria.startDateTo) {
      whereClause.startTime = {};
      if (criteria.startDateFrom) {
        whereClause.startTime.gte = criteria.startDateFrom;
      }
      if (criteria.startDateTo) {
        whereClause.startTime.lte = criteria.startDateTo;
      }
    }

    if (criteria.endDateFrom || criteria.endDateTo) {
      whereClause.endTime = {};
      if (criteria.endDateFrom) {
        whereClause.endTime.gte = criteria.endDateFrom;
      }
      if (criteria.endDateTo) {
        whereClause.endTime.lte = criteria.endDateTo;
      }
    }

    if (criteria.durationMin || criteria.durationMax) {
      whereClause.duration = {};
      if (criteria.durationMin) {
        whereClause.duration.gte = criteria.durationMin;
      }
      if (criteria.durationMax) {
        whereClause.duration.lte = criteria.durationMax;
      }
    }

    if (criteria.amountMin || criteria.amountMax) {
      whereClause.totalAmount = {};
      if (criteria.amountMin) {
        whereClause.totalAmount.gte = criteria.amountMin;
      }
      if (criteria.amountMax) {
        whereClause.totalAmount.lte = criteria.amountMax;
      }
    }

    return await this.model.findMany({
      where: whereClause,
      include: {
        vehicle: true,
        spot: true
      },
      orderBy: { startTime: 'desc' }
    });
  }

  /**
   * End a session
   * @param id - Session ID to end
   * @param endTime - Optional end time (defaults to now)
   * @returns Updated session with calculated totals
   */
  async endSession(id: string, endTime?: Date): Promise<ParkingSession> {
    const session = await this.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.endTime) {
      throw new Error('Session is already ended');
    }

    const actualEndTime = endTime || new Date();
    const duration = Math.ceil((actualEndTime.getTime() - session.startTime.getTime()) / (1000 * 60)); // minutes
    const hours = Math.ceil(duration / 60); // Round up to full hours
    const totalAmount = hours * session.hourlyRate;

    return await this.model.update({
      where: { id },
      data: {
        endTime: actualEndTime,
        duration,
        totalAmount,
        status: 'COMPLETED'
      },
      include: {
        vehicle: true,
        spot: true
      }
    });
  }

  /**
   * Mark session as paid
   * @param id - Session ID to mark as paid
   * @param amountPaid - Amount paid
   * @param paymentMethod - Payment method used
   * @returns Updated session
   */
  async markAsPaid(id: string, amountPaid: number, paymentMethod?: string): Promise<ParkingSession> {
    return await this.model.update({
      where: { id },
      data: {
        isPaid: true,
        amountPaid,
        paymentMethod,
        paymentTime: new Date()
      },
      include: {
        vehicle: true,
        spot: true
      }
    });
  }

  /**
   * Cancel a session
   * @param id - Session ID to cancel
   * @param reason - Optional cancellation reason
   * @returns Updated session
   */
  async cancel(id: string, reason?: string): Promise<ParkingSession> {
    return await this.model.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        endTime: new Date(),
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled'
      },
      include: {
        vehicle: true,
        spot: true
      }
    });
  }

  /**
   * Update session information
   * @param id - Session ID to update
   * @param updateData - Data to update
   * @returns Updated session
   */
  async update(id: string, updateData: SessionUpdateData): Promise<ParkingSession> {
    return await this.model.update({
      where: { id },
      data: updateData as Prisma.ParkingSessionUpdateInput,
      include: {
        vehicle: true,
        spot: true
      }
    });
  }

  /**
   * Delete session record
   * @param id - Session ID to delete
   * @returns Deleted session
   */
  async delete(id: string): Promise<ParkingSession> {
    return await this.model.delete({
      where: { id },
      include: {
        vehicle: true,
        spot: true
      }
    });
  }

  /**
   * Get all sessions with pagination
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @returns Array of sessions
   */
  async findMany(skip: number = 0, take: number = 50): Promise<ParkingSession[]> {
    return await this.model.findMany({
      skip,
      take,
      include: {
        vehicle: true,
        spot: true
      },
      orderBy: { startTime: 'desc' }
    });
  }

  /**
   * Count total sessions
   * @param criteria - Optional search criteria
   * @returns Total count
   */
  async count(criteria?: SessionSearchCriteria): Promise<number> {
    const whereClause = criteria ? this.buildWhereClause(criteria) : {};
    return await this.model.count({ where: whereClause });
  }

  /**
   * Get session statistics
   * @returns Session statistics
   */
  async getStatistics(): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    paidSessions: number;
    unpaidSessions: number;
    totalRevenue: number;
    averageDuration: number;
    averageAmount: number;
    byStatus: Record<string, number>;
    byPaymentMethod: Record<string, number>;
  }> {
    const [
      totalSessions,
      activeSessions,
      completedSessions,
      cancelledSessions,
      paidSessions,
      unpaidSessions,
      revenueResult,
      avgDurationResult,
      avgAmountResult,
      byStatus,
      byPaymentMethod
    ] = await Promise.all([
      this.model.count(),
      this.model.count({ where: { status: 'ACTIVE' } }),
      this.model.count({ where: { status: 'COMPLETED' } }),
      this.model.count({ where: { status: 'CANCELLED' } }),
      this.model.count({ where: { isPaid: true } }),
      this.model.count({ where: { isPaid: false, status: { not: 'CANCELLED' } } }),
      this.model.aggregate({
        _sum: { amountPaid: true },
        where: { isPaid: true }
      }),
      this.model.aggregate({
        _avg: { duration: true },
        where: { duration: { not: null } }
      }),
      this.model.aggregate({
        _avg: { totalAmount: true },
        where: { totalAmount: { not: null } }
      }),
      this.model.groupBy({
        by: ['status'],
        _count: true
      }),
      this.model.groupBy({
        by: ['paymentMethod'],
        _count: true,
        where: { paymentMethod: { not: null } }
      })
    ]);

    return {
      totalSessions,
      activeSessions,
      completedSessions,
      cancelledSessions,
      paidSessions,
      unpaidSessions,
      totalRevenue: revenueResult._sum.amountPaid || 0,
      averageDuration: avgDurationResult._avg.duration || 0,
      averageAmount: avgAmountResult._avg.totalAmount || 0,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byPaymentMethod: byPaymentMethod.reduce((acc, item) => {
        acc[item.paymentMethod || 'unknown'] = item._count;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Build where clause from search criteria
   */
  private buildWhereClause(criteria: SessionSearchCriteria): Prisma.ParkingSessionWhereInput {
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
    if (criteria.paymentMethod) {
      whereClause.paymentMethod = criteria.paymentMethod;
    }
    if (criteria.startDateFrom || criteria.startDateTo) {
      whereClause.startTime = {};
      if (criteria.startDateFrom) {
        whereClause.startTime.gte = criteria.startDateFrom;
      }
      if (criteria.startDateTo) {
        whereClause.startTime.lte = criteria.startDateTo;
      }
    }

    return whereClause;
  }
}

// Export default instance for convenience
export const sessionRepository = new SessionRepository();
export default sessionRepository;