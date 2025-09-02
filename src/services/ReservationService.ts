/**
 * ReservationService - Handles parking spot reservations, conflict detection,
 * waitlist management, and auto-cancellation functionality
 */

import { prisma } from '../config/database';
import { SecurityAuditService } from './SecurityAuditService';
import type { VehicleType, SpotFeature } from '../types/models';

export interface ReservationRequest {
  userId: string;
  spotId?: string; // Specific spot or let system choose
  spotType: VehicleType;
  preferredFeatures?: SpotFeature[];
  startTime: Date;
  endTime: Date;
  vehicleInfo: {
    licensePlate: string;
    make?: string;
    model?: string;
    color?: string;
  };
  notes?: string;
  allowWaitlist?: boolean;
}

export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  spotId?: string;
  status: ReservationStatus;
  message: string;
  waitlistPosition?: number;
  alternativeSpots?: Array<{
    spotId: string;
    spotNumber: string;
    floor: number;
    features: SpotFeature[];
    distance?: number; // Distance from preferred spot
  }>;
}

export type ReservationStatus = 
  | 'CONFIRMED' 
  | 'WAITLISTED' 
  | 'PENDING_PAYMENT' 
  | 'CANCELLED' 
  | 'EXPIRED' 
  | 'NO_SHOW' 
  | 'ACTIVE' 
  | 'COMPLETED';

export interface Reservation {
  id: string;
  userId: string;
  spotId: string;
  spotNumber: string;
  vehiclePlate: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
  gracePeriodMinutes: number;
  noShowGracePeriod: number;
  estimatedCost: number;
  actualCost?: number;
  cancellationDeadline: Date;
  notes?: string;
}

export interface WaitlistEntry {
  id: string;
  userId: string;
  spotType: VehicleType;
  preferredFeatures: SpotFeature[];
  requestedTime: Date;
  endTime: Date;
  position: number;
  createdAt: Date;
  expiresAt: Date;
  notificationsSent: number;
  maxNotifications: number;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: Array<{
    reservationId: string;
    spotId: string;
    timeOverlap: {
      start: Date;
      end: Date;
      durationMinutes: number;
    };
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  resolution: 'AUTO_RESOLVE' | 'MANUAL_REVIEW' | 'REJECT';
}

export interface ReservationStats {
  totalReservations: number;
  activeReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  noShowReservations: number;
  waitlistSize: number;
  averageReservationDuration: number;
  occupancyRate: number;
  revenue: number;
}

class ReservationService {
  private auditService: SecurityAuditService;
  private readonly GRACE_PERIOD_MINUTES = 15;
  private readonly NO_SHOW_GRACE_PERIOD_MINUTES = 30;
  private readonly CANCELLATION_DEADLINE_HOURS = 2;
  private readonly MAX_RESERVATION_DURATION_HOURS = 24;
  private readonly WAITLIST_EXPIRY_HOURS = 24;

  constructor() {
    this.auditService = new SecurityAuditService();
    this.startAutoCleanupProcess();
  }

  /**
   * Create a new reservation
   */
  async createReservation(request: ReservationRequest): Promise<ReservationResult> {
    try {
      // Validate reservation request
      const validation = await this.validateReservationRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          status: 'CANCELLED',
          message: validation.errors.join(', ')
        };
      }

      // Find available spot
      const spotResult = await this.findAvailableSpot(request);
      if (!spotResult.available) {
        // Add to waitlist if allowed
        if (request.allowWaitlist) {
          const waitlistResult = await this.addToWaitlist(request);
          return {
            success: true,
            status: 'WAITLISTED',
            message: 'Added to waitlist - you will be notified when a spot becomes available',
            waitlistPosition: waitlistResult.position
          };
        }

        return {
          success: false,
          status: 'CANCELLED',
          message: 'No available spots for the requested time',
          alternativeSpots: spotResult.alternatives
        };
      }

      // Check for conflicts
      const conflictCheck = await this.checkForConflicts(spotResult.spotId!, request.startTime, request.endTime);
      if (conflictCheck.hasConflict && conflictCheck.resolution === 'REJECT') {
        return {
          success: false,
          status: 'CANCELLED',
          message: 'Time conflict detected with existing reservations'
        };
      }

      // Calculate estimated cost
      const estimatedCost = await this.calculateReservationCost(request);

      // Create reservation
      const reservation = await prisma.$transaction(async (tx) => {
        // Create reservation record
        const newReservation = await tx.parkingSession.create({
          data: {
            vehicle: {
              create: {
                licensePlate: request.vehicleInfo.licensePlate,
                vehicleType: request.spotType.toUpperCase() as any,
                make: request.vehicleInfo.make,
                model: request.vehicleInfo.model,
                color: request.vehicleInfo.color,
                ownerId: request.userId
              }
            },
            spot: {
              connect: { id: spotResult.spotId! }
            },
            startTime: request.startTime,
            totalAmount: estimatedCost,
            status: 'ACTIVE',
            notes: request.notes
          },
          include: {
            vehicle: true,
            spot: true
          }
        });

        // Update spot status to reserved
        await tx.parkingSpot.update({
          where: { id: spotResult.spotId! },
          data: { status: 'RESERVED' }
        });

        return newReservation;
      });

      // Log reservation creation
      await this.auditService.logSecurityEvent({
        userId: request.userId,
        action: 'RESERVATION_CREATED',
        category: 'BOOKING',
        severity: 'LOW',
        description: `Parking reservation created for spot ${spotResult.spotNumber}`,
        metadata: {
          reservationId: reservation.id,
          spotId: spotResult.spotId,
          startTime: request.startTime,
          endTime: request.endTime
        }
      });

      return {
        success: true,
        reservationId: reservation.id,
        spotId: spotResult.spotId!,
        status: 'CONFIRMED',
        message: `Reservation confirmed for spot ${spotResult.spotNumber}`
      };
    } catch (error) {
      console.error('Reservation creation error:', error);
      return {
        success: false,
        status: 'CANCELLED',
        message: 'Failed to create reservation'
      };
    }
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(reservationId: string, userId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    refundAmount?: number;
  }> {
    try {
      const reservation = await prisma.parkingSession.findUnique({
        where: { id: reservationId },
        include: { vehicle: true, spot: true }
      });

      if (!reservation) {
        return {
          success: false,
          message: 'Reservation not found'
        };
      }

      if (reservation.vehicle?.ownerId !== userId) {
        return {
          success: false,
          message: 'Unauthorized to cancel this reservation'
        };
      }

      if (reservation.status === 'CANCELLED' || reservation.status === 'COMPLETED') {
        return {
          success: false,
          message: 'Reservation cannot be cancelled'
        };
      }

      // Check cancellation deadline
      const now = new Date();
      const cancellationDeadline = new Date(
        reservation.startTime.getTime() - (this.CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000)
      );

      let refundAmount = 0;
      if (now <= cancellationDeadline) {
        refundAmount = reservation.totalAmount; // Full refund
      } else if (now <= reservation.startTime) {
        refundAmount = reservation.totalAmount * 0.5; // 50% refund
      }
      // No refund after start time

      // Cancel reservation
      await prisma.$transaction(async (tx) => {
        await tx.parkingSession.update({
          where: { id: reservationId },
          data: {
            status: 'CANCELLED',
            notes: reason ? `Cancelled: ${reason}` : 'Cancelled by user'
          }
        });

        // Release spot
        if (reservation.spotId) {
          await tx.parkingSpot.update({
            where: { id: reservation.spotId },
            data: { status: 'AVAILABLE' }
          });
        }
      });

      // Check waitlist for this spot type
      await this.processWaitlistForCancellation(reservation);

      // Log cancellation
      await this.auditService.logSecurityEvent({
        userId,
        action: 'RESERVATION_CANCELLED',
        category: 'BOOKING',
        severity: 'LOW',
        description: `Reservation cancelled - Reason: ${reason || 'User initiated'}`,
        metadata: {
          reservationId,
          refundAmount,
          reason
        }
      });

      return {
        success: true,
        message: `Reservation cancelled successfully${refundAmount > 0 ? ` - Refund: $${refundAmount.toFixed(2)}` : ''}`,
        refundAmount
      };
    } catch (error) {
      console.error('Reservation cancellation error:', error);
      return {
        success: false,
        message: 'Failed to cancel reservation'
      };
    }
  }

  /**
   * Check for reservation conflicts
   */
  private async checkForConflicts(
    spotId: string,
    startTime: Date,
    endTime: Date,
    excludeReservationId?: string
  ): Promise<ConflictCheckResult> {
    const conflicts = await prisma.parkingSession.findMany({
      where: {
        spotId,
        status: { in: ['ACTIVE', 'CONFIRMED'] },
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        OR: [
          {
            startTime: { lte: endTime },
            endTime: { gte: startTime }
          }
        ]
      },
      include: { spot: true }
    });

    const conflictDetails = conflicts.map(conflict => {
      const overlapStart = new Date(Math.max(startTime.getTime(), conflict.startTime.getTime()));
      const overlapEnd = new Date(Math.min(endTime.getTime(), conflict.endTime?.getTime() || Date.now()));
      const durationMinutes = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));

      let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (durationMinutes > 120) severity = 'HIGH';
      else if (durationMinutes > 60) severity = 'MEDIUM';

      return {
        reservationId: conflict.id,
        spotId: conflict.spotId,
        timeOverlap: {
          start: overlapStart,
          end: overlapEnd,
          durationMinutes
        },
        severity
      };
    });

    const hasConflict = conflictDetails.length > 0;
    const hasHighSeverityConflict = conflictDetails.some(c => c.severity === 'HIGH');

    let resolution: 'AUTO_RESOLVE' | 'MANUAL_REVIEW' | 'REJECT' = 'AUTO_RESOLVE';
    if (hasHighSeverityConflict) {
      resolution = 'REJECT';
    } else if (hasConflict) {
      resolution = 'MANUAL_REVIEW';
    }

    return {
      hasConflict,
      conflicts: conflictDetails,
      resolution
    };
  }

  /**
   * Find available spot for reservation
   */
  private async findAvailableSpot(request: ReservationRequest): Promise<{
    available: boolean;
    spotId?: string;
    spotNumber?: string;
    alternatives?: Array<{
      spotId: string;
      spotNumber: string;
      floor: number;
      features: SpotFeature[];
      distance?: number;
    }>;
  }> {
    // If specific spot requested, check its availability
    if (request.spotId) {
      const spot = await prisma.parkingSpot.findUnique({
        where: { id: request.spotId },
        include: { floor: true }
      });

      if (!spot || !spot.isActive) {
        return { available: false };
      }

      const conflicts = await this.checkForConflicts(request.spotId, request.startTime, request.endTime);
      if (!conflicts.hasConflict) {
        return {
          available: true,
          spotId: spot.id,
          spotNumber: spot.spotNumber
        };
      }
    }

    // Find available spots matching criteria
    const availableSpots = await prisma.parkingSpot.findMany({
      where: {
        spotType: request.spotType.toUpperCase() as any,
        status: 'AVAILABLE',
        isActive: true
      },
      include: {
        floor: true,
        sessions: {
          where: {
            status: { in: ['ACTIVE', 'CONFIRMED'] },
            startTime: { lte: request.endTime },
            endTime: { gte: request.startTime }
          }
        }
      },
      orderBy: [{ level: 'asc' }, { spotNumber: 'asc' }]
    });

    // Filter out spots with conflicts
    const conflictFreeSpots = [];
    const alternatives = [];

    for (const spot of availableSpots) {
      const conflicts = await this.checkForConflicts(spot.id, request.startTime, request.endTime);
      
      const spotInfo = {
        spotId: spot.id,
        spotNumber: spot.spotNumber,
        floor: spot.level,
        features: [] as SpotFeature[] // Would be populated from database
      };

      if (!conflicts.hasConflict) {
        conflictFreeSpots.push(spotInfo);
      } else {
        alternatives.push(spotInfo);
      }
    }

    if (conflictFreeSpots.length > 0) {
      const bestSpot = conflictFreeSpots[0]; // Take the first available (lowest floor/number)
      return {
        available: true,
        spotId: bestSpot.spotId,
        spotNumber: bestSpot.spotNumber
      };
    }

    return {
      available: false,
      alternatives: alternatives.slice(0, 5) // Return top 5 alternatives
    };
  }

  /**
   * Add user to waitlist
   */
  private async addToWaitlist(request: ReservationRequest): Promise<{ position: number }> {
    // This would be implemented with a proper waitlist table in production
    // For now, simulate waitlist position
    const position = Math.floor(Math.random() * 10) + 1;
    
    // Log waitlist addition
    await this.auditService.logSecurityEvent({
      userId: request.userId,
      action: 'WAITLIST_ADDED',
      category: 'BOOKING',
      severity: 'LOW',
      description: `Added to waitlist for ${request.spotType} spot`,
      metadata: {
        spotType: request.spotType,
        requestedTime: request.startTime,
        position
      }
    });

    return { position };
  }

  /**
   * Process waitlist when a reservation is cancelled
   */
  private async processWaitlistForCancellation(cancelledReservation: any): Promise<void> {
    // In production, this would query waitlist entries and notify users
    console.log(`Processing waitlist for cancelled reservation in spot ${cancelledReservation.spotId}`);
  }

  /**
   * Validate reservation request
   */
  private async validateReservationRequest(request: ReservationRequest): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Time validation
    const now = new Date();
    if (request.startTime <= now) {
      errors.push('Start time must be in the future');
    }

    if (request.endTime <= request.startTime) {
      errors.push('End time must be after start time');
    }

    // Duration validation
    const durationHours = (request.endTime.getTime() - request.startTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > this.MAX_RESERVATION_DURATION_HOURS) {
      errors.push(`Maximum reservation duration is ${this.MAX_RESERVATION_DURATION_HOURS} hours`);
    }

    if (durationHours < 0.5) {
      errors.push('Minimum reservation duration is 30 minutes');
    }

    // License plate validation
    if (!request.vehicleInfo.licensePlate || request.vehicleInfo.licensePlate.trim().length === 0) {
      errors.push('License plate is required');
    }

    // User validation
    const user = await prisma.user.findUnique({ where: { id: request.userId } });
    if (!user || !user.isActive) {
      errors.push('Invalid or inactive user');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate reservation cost
   */
  private async calculateReservationCost(request: ReservationRequest): Promise<number> {
    const durationHours = (request.endTime.getTime() - request.startTime.getTime()) / (1000 * 60 * 60);
    const baseRatePerHour = this.getBaseRate(request.spotType);
    return Math.round(durationHours * baseRatePerHour * 100) / 100;
  }

  /**
   * Get base rate for spot type
   */
  private getBaseRate(spotType: VehicleType): number {
    const rates = {
      compact: 4.0,
      standard: 5.0,
      oversized: 7.0
    };
    return rates[spotType] || 5.0;
  }

  /**
   * Get user's reservations
   */
  async getUserReservations(userId: string, status?: ReservationStatus): Promise<Reservation[]> {
    const sessions = await prisma.parkingSession.findMany({
      where: {
        vehicle: { ownerId: userId },
        status: status ? status : undefined
      },
      include: {
        vehicle: true,
        spot: true
      },
      orderBy: { startTime: 'desc' }
    });

    return sessions.map(session => ({
      id: session.id,
      userId,
      spotId: session.spotId,
      spotNumber: session.spot?.spotNumber || 'N/A',
      vehiclePlate: session.vehicle?.licensePlate || '',
      startTime: session.startTime,
      endTime: session.endTime || new Date(),
      status: session.status as ReservationStatus,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      gracePeriodMinutes: this.GRACE_PERIOD_MINUTES,
      noShowGracePeriod: this.NO_SHOW_GRACE_PERIOD_MINUTES,
      estimatedCost: session.totalAmount,
      actualCost: session.amountPaid,
      cancellationDeadline: new Date(
        session.startTime.getTime() - (this.CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000)
      ),
      notes: session.notes
    }));
  }

  /**
   * Start auto-cleanup process for expired reservations
   */
  private startAutoCleanupProcess(): void {
    // Run cleanup every 10 minutes
    setInterval(async () => {
      try {
        await this.cleanupExpiredReservations();
        await this.markNoShowReservations();
      } catch (error) {
        console.error('Auto-cleanup error:', error);
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Cleanup expired reservations
   */
  private async cleanupExpiredReservations(): Promise<void> {
    const now = new Date();
    const expiredReservations = await prisma.parkingSession.findMany({
      where: {
        status: 'ACTIVE',
        endTime: { lt: now }
      },
      include: { spot: true }
    });

    for (const reservation of expiredReservations) {
      await prisma.$transaction(async (tx) => {
        // Mark reservation as completed
        await tx.parkingSession.update({
          where: { id: reservation.id },
          data: { status: 'COMPLETED' }
        });

        // Release spot
        if (reservation.spotId) {
          await tx.parkingSpot.update({
            where: { id: reservation.spotId },
            data: { status: 'AVAILABLE' }
          });
        }
      });
    }

    if (expiredReservations.length > 0) {
      console.log(`Cleaned up ${expiredReservations.length} expired reservations`);
    }
  }

  /**
   * Mark no-show reservations
   */
  private async markNoShowReservations(): Promise<void> {
    const now = new Date();
    const noShowCutoff = new Date(now.getTime() - (this.NO_SHOW_GRACE_PERIOD_MINUTES * 60 * 1000));
    
    const noShowReservations = await prisma.parkingSession.findMany({
      where: {
        status: 'ACTIVE',
        startTime: { lt: noShowCutoff }
      },
      include: { spot: true, vehicle: true }
    });

    for (const reservation of noShowReservations) {
      await prisma.$transaction(async (tx) => {
        // Mark as no-show
        await tx.parkingSession.update({
          where: { id: reservation.id },
          data: { status: 'NO_SHOW' as any }
        });

        // Release spot
        if (reservation.spotId) {
          await tx.parkingSpot.update({
            where: { id: reservation.spotId },
            data: { status: 'AVAILABLE' }
          });
        }
      });

      // Log no-show
      await this.auditService.logSecurityEvent({
        userId: reservation.vehicle?.ownerId,
        action: 'RESERVATION_NO_SHOW',
        category: 'BOOKING',
        severity: 'MEDIUM',
        description: `No-show for reservation ${reservation.id}`,
        metadata: {
          reservationId: reservation.id,
          spotId: reservation.spotId
        }
      });
    }

    if (noShowReservations.length > 0) {
      console.log(`Marked ${noShowReservations.length} reservations as no-show`);
    }
  }

  /**
   * Get reservation statistics
   */
  async getReservationStats(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<ReservationStats> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const [total, active, completed, cancelled, revenue, totalSpots, occupiedSpots] = await Promise.all([
      prisma.parkingSession.count({ where: { createdAt: { gte: startDate } } }),
      prisma.parkingSession.count({ where: { status: 'ACTIVE', createdAt: { gte: startDate } } }),
      prisma.parkingSession.count({ where: { status: 'COMPLETED', createdAt: { gte: startDate } } }),
      prisma.parkingSession.count({ where: { status: 'CANCELLED', createdAt: { gte: startDate } } }),
      prisma.parkingSession.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: startDate } },
        _sum: { amountPaid: true }
      }),
      prisma.parkingSpot.count({ where: { isActive: true } }),
      prisma.parkingSpot.count({ where: { status: 'OCCUPIED', isActive: true } })
    ]);

    const avgDuration = await prisma.parkingSession.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate },
        duration: { not: null }
      },
      _avg: { duration: true }
    });

    return {
      totalReservations: total,
      activeReservations: active,
      completedReservations: completed,
      cancelledReservations: cancelled,
      noShowReservations: total - active - completed - cancelled,
      waitlistSize: 0, // Would be calculated from waitlist table
      averageReservationDuration: avgDuration._avg.duration || 0,
      occupancyRate: totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0,
      revenue: revenue._sum.amountPaid || 0
    };
  }
}

export default new ReservationService();
export { ReservationService };