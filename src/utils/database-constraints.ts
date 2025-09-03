/**
 * Database Constraints and Business Rules Validation Utility
 * Provides application-level validation for complex business rules
 * that complement the database triggers and constraints
 */

import { PrismaClient } from '@prisma/client';

export class DatabaseConstraintsValidator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate parking session business rules before creation
   */
  async validateParkingSessionCreation(sessionData: {
    vehicleId: string;
    spotId: string;
    startTime: Date;
    endTime?: Date;
    hourlyRate: number;
  }): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if vehicle already has an active session
    const existingVehicleSession = await this.prisma.parkingSession.findFirst({
      where: {
        vehicleId: sessionData.vehicleId,
        status: 'ACTIVE',
      },
    });

    if (existingVehicleSession) {
      errors.push('Vehicle already has an active parking session');
    }

    // Check if spot is already occupied
    const existingSpotSession = await this.prisma.parkingSession.findFirst({
      where: {
        spotId: sessionData.spotId,
        status: 'ACTIVE',
      },
    });

    if (existingSpotSession) {
      errors.push('Parking spot is already occupied');
    }

    // Validate time range
    if (sessionData.endTime && sessionData.endTime <= sessionData.startTime) {
      errors.push('End time must be after start time');
    }

    // Validate hourly rate
    if (sessionData.hourlyRate <= 0) {
      errors.push('Hourly rate must be positive');
    }

    // Validate vehicle and spot compatibility
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: sessionData.vehicleId },
    });

    const spot = await this.prisma.parkingSpot.findUnique({
      where: { id: sessionData.spotId },
    });

    if (vehicle && spot) {
      const isCompatible = this.validateVehicleSpotCompatibility(
        vehicle.vehicleType,
        spot.spotType
      );
      if (!isCompatible) {
        errors.push('Vehicle type not compatible with spot type');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate vehicle and spot type compatibility
   */
  private validateVehicleSpotCompatibility(
    vehicleType: string,
    spotType: string
  ): boolean {
    const compatibilityMatrix: Record<string, string[]> = {
      COMPACT: ['COMPACT', 'STANDARD', 'OVERSIZED'],
      STANDARD: ['STANDARD', 'OVERSIZED'],
      OVERSIZED: ['OVERSIZED'],
      ELECTRIC: ['ELECTRIC', 'STANDARD', 'OVERSIZED'],
      MOTORCYCLE: ['MOTORCYCLE', 'COMPACT'],
      HANDICAP: ['HANDICAP', 'STANDARD', 'OVERSIZED'],
    };

    const allowedSpots = compatibilityMatrix[vehicleType] || [];
    return allowedSpots.includes(spotType);
  }

  /**
   * Validate payment business rules
   */
  async validatePaymentCreation(paymentData: {
    amount: number;
    refundAmount?: number;
    sessionId?: string;
    vehicleId?: string;
  }): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate positive amount
    if (paymentData.amount <= 0) {
      errors.push('Payment amount must be positive');
    }

    // Validate refund amount
    if (paymentData.refundAmount !== undefined && paymentData.refundAmount < 0) {
      errors.push('Refund amount must be non-negative');
    }

    // Validate session existence
    if (paymentData.sessionId) {
      const session = await this.prisma.parkingSession.findUnique({
        where: { id: paymentData.sessionId },
      });
      if (!session) {
        errors.push('Referenced parking session does not exist');
      }
    }

    // Validate vehicle existence
    if (paymentData.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: paymentData.vehicleId },
      });
      if (!vehicle) {
        errors.push('Referenced vehicle does not exist');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate spot availability for reservation
   */
  async validateSpotAvailability(
    spotId: string,
    startTime: Date,
    endTime?: Date
  ): Promise<{ isAvailable: boolean; reason?: string }> {
    const spot = await this.prisma.parkingSpot.findUnique({
      where: { id: spotId },
    });

    if (!spot) {
      return { isAvailable: false, reason: 'Spot does not exist' };
    }

    if (!spot.isActive) {
      return { isAvailable: false, reason: 'Spot is not active' };
    }

    if (spot.status === 'OUT_OF_ORDER') {
      return { isAvailable: false, reason: 'Spot is out of order' };
    }

    if (spot.status === 'MAINTENANCE') {
      return { isAvailable: false, reason: 'Spot is under maintenance' };
    }

    // Check for active sessions
    const activeSession = await this.prisma.parkingSession.findFirst({
      where: {
        spotId,
        status: 'ACTIVE',
      },
    });

    if (activeSession) {
      return { isAvailable: false, reason: 'Spot is currently occupied' };
    }

    // Check for overlapping reservations if endTime is provided
    if (endTime) {
      const overlappingReservation = await this.prisma.parkingSession.findFirst({
        where: {
          spotId,
          status: 'RESERVED' as any, // Cast to handle string type in schema
          AND: [
            {
              startTime: {
                lt: endTime,
              },
            },
            {
              OR: [
                { endTime: null },
                {
                  endTime: {
                    gt: startTime,
                  },
                },
              ],
            },
          ],
        },
      });

      if (overlappingReservation) {
        return {
          isAvailable: false,
          reason: 'Spot has overlapping reservation',
        };
      }
    }

    return { isAvailable: true };
  }

  /**
   * Calculate parking session cost
   */
  calculateParkingCost(
    startTime: Date,
    endTime: Date,
    hourlyRate: number
  ): { duration: number; totalAmount: number } {
    const durationMs = endTime.getTime() - startTime.getTime();
    const duration = Math.ceil(durationMs / (1000 * 60)); // Duration in minutes, rounded up
    const totalAmount = Math.round(((duration / 60) * hourlyRate) * 100) / 100; // Round to 2 decimal places

    return { duration, totalAmount };
  }

  /**
   * Validate business constraint for garage capacity
   */
  async validateGarageCapacity(garageId: string): Promise<{
    isValid: boolean;
    currentOccupancy: number;
    totalCapacity: number;
    availableSpots: number;
  }> {
    const garage = await this.prisma.garage.findUnique({
      where: { id: garageId },
      include: {
        floors: {
          include: {
            spots: {
              include: {
                sessions: {
                  where: {
                    status: 'ACTIVE',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!garage) {
      throw new Error('Garage not found');
    }

    let totalSpots = 0;
    let occupiedSpots = 0;

    for (const floor of garage.floors) {
      for (const spot of floor.spots) {
        if (spot.isActive) {
          totalSpots++;
          if (spot.sessions.length > 0) {
            occupiedSpots++;
          }
        }
      }
    }

    return {
      isValid: occupiedSpots <= totalSpots,
      currentOccupancy: occupiedSpots,
      totalCapacity: totalSpots,
      availableSpots: totalSpots - occupiedSpots,
    };
  }

  /**
   * Validate floor capacity constraints
   */
  async validateFloorCapacity(floorId: string): Promise<{
    isValid: boolean;
    actualSpots: number;
    declaredSpots: number;
  }> {
    const floor = await this.prisma.floor.findUnique({
      where: { id: floorId },
      include: {
        spots: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!floor) {
      throw new Error('Floor not found');
    }

    const actualSpots = floor.spots.length;
    const declaredSpots = floor.totalSpots;

    return {
      isValid: actualSpots === declaredSpots,
      actualSpots,
      declaredSpots,
    };
  }

  /**
   * Auto-update spot counts for garage and floor
   */
  async updateSpotCounts(): Promise<void> {
    // Update floor spot counts
    const floors = await this.prisma.floor.findMany({
      include: {
        spots: {
          where: {
            isActive: true,
          },
        },
      },
    });

    for (const floor of floors) {
      await this.prisma.floor.update({
        where: { id: floor.id },
        data: {
          totalSpots: floor.spots.length,
          updatedAt: new Date(),
        },
      });
    }

    // Update garage spot counts
    const garages = await this.prisma.garage.findMany({
      include: {
        floors: {
          include: {
            spots: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    for (const garage of garages) {
      let totalSpots = 0;
      for (const floor of garage.floors) {
        totalSpots += floor.spots.length;
      }

      await this.prisma.garage.update({
        where: { id: garage.id },
        data: {
          totalSpots,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Validate and prevent resource leaks
   */
  async validateAndCleanupOrphanedRecords(): Promise<{
    orphanedPayments: number;
    orphanedSessions: number;
    inconsistentSpotStatus: number;
  }> {
    let orphanedPayments = 0;
    let orphanedSessions = 0;
    let inconsistentSpotStatus = 0;

    // Find orphaned payments (payments with non-existent sessions)
    const paymentsWithInvalidSession = await this.prisma.payment.findMany({
      where: {
        sessionId: {
          not: null,
        },
        session: null,
      },
    });
    orphanedPayments = paymentsWithInvalidSession.length;

    // Find orphaned sessions (sessions with non-existent vehicles or spots)
    // Note: With foreign key constraints, these should not exist, but check anyway
    const allSessions = await this.prisma.parkingSession.findMany({
      select: { id: true, vehicleId: true, spotId: true },
    });
    
    let sessionsWithInvalidVehicle = 0;
    let sessionsWithInvalidSpot = 0;
    
    for (const session of allSessions) {
      const vehicleExists = await this.prisma.vehicle.count({
        where: { id: session.vehicleId },
      });
      if (vehicleExists === 0) {
        sessionsWithInvalidVehicle++;
      }
      
      const spotExists = await this.prisma.parkingSpot.count({
        where: { id: session.spotId },
      });
      if (spotExists === 0) {
        sessionsWithInvalidSpot++;
      }
    }
    
    orphanedSessions = sessionsWithInvalidVehicle + sessionsWithInvalidSpot;

    // Find spots with inconsistent status (marked as occupied but no active session)
    const spotsMarkedOccupied = await this.prisma.parkingSpot.findMany({
      where: {
        status: 'OCCUPIED',
        sessions: {
          none: {
            status: 'ACTIVE',
          },
        },
      },
    });

    inconsistentSpotStatus = spotsMarkedOccupied.length;

    // Auto-fix inconsistent spot statuses
    for (const spot of spotsMarkedOccupied) {
      await this.prisma.parkingSpot.update({
        where: { id: spot.id },
        data: {
          status: 'AVAILABLE',
          updatedAt: new Date(),
        },
      });
    }

    return {
      orphanedPayments,
      orphanedSessions,
      inconsistentSpotStatus,
    };
  }
}

export default DatabaseConstraintsValidator;