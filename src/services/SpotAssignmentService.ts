/**
 * Spot Assignment Service
 * Handles spot assignment logic and database operations
 * Provides production-ready parking spot assignment with transactional consistency
 */

import { SpotService } from './spotService';
import { VehicleType, SpotStatus, ParkingSession } from '../types/models';
import { prisma } from '../config/database';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

interface AvailabilityInfo {
  total: number;
  hasAvailable: boolean;
  available: number;
  occupied: number;
  bySpotType?: Record<string, number>;
}

interface AssignmentResult {
  success: boolean;
  assignedSpot?: any;
  spotLocation?: string;
  parkingSession?: ParkingSession;
  error?: string;
  reason?: string;
}

interface SpotCompatibility {
  isCompatible: boolean;
  score: number;
  reasons: string[];
}

interface AssignmentOptions {
  preferredFloor?: number;
  requiresEVCharging?: boolean;
  requiresHandicapAccess?: boolean;
  maxWalkDistance?: number;
}

export class SpotAssignmentService {
  private spotService: SpotService;

  constructor() {
    this.spotService = new SpotService();
  }

  /**
   * Get availability by vehicle type from database
   */
  async getAvailabilityByVehicleType(vehicleType: VehicleType): Promise<AvailabilityInfo> {
    try {
      // Map VehicleType to SpotType for database query
      const spotType = this.mapVehicleTypeToSpotType(vehicleType);

      // Get total spots of this type
      const totalSpots = await prisma.parkingSpot.count({
        where: {
          spotType: spotType as any,
          isActive: true
        }
      });

      // Get available spots of this type
      const availableSpots = await prisma.parkingSpot.count({
        where: {
          spotType: spotType as any,
          status: 'AVAILABLE',
          isActive: true
        }
      });

      // Get occupied spots of this type
      const occupiedSpots = await prisma.parkingSpot.count({
        where: {
          spotType: spotType as any,
          status: 'OCCUPIED',
          isActive: true
        }
      });

      return {
        total: totalSpots,
        hasAvailable: availableSpots > 0,
        available: availableSpots,
        occupied: occupiedSpots,
        bySpotType: {
          [vehicleType]: availableSpots
        }
      };
    } catch (error) {
      console.error('Error getting availability by vehicle type:', error);
      throw new Error(`Failed to get availability for ${vehicleType}: ${(error as Error).message}`);
    }
  }

  /**
   * Assign a spot to a vehicle with full database transaction
   */
  async assignSpot(
    licensePlate: string, 
    vehicleType: VehicleType, 
    options: AssignmentOptions = {}
  ): Promise<AssignmentResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Find the best available spot
        const bestSpot = await this.findBestAvailableSpot(vehicleType, options, tx);
        
        if (!bestSpot) {
          return {
            success: false,
            error: 'No available spots found',
            reason: `No ${vehicleType} spots available matching criteria`
          };
        }

        // Check vehicle compatibility
        const compatibility = this.checkVehicleCompatibility(bestSpot, vehicleType);
        if (!compatibility.isCompatible) {
          return {
            success: false,
            error: 'Vehicle not compatible with available spots',
            reason: compatibility.reasons.join(', ')
          };
        }

        // Update spot status to OCCUPIED
        const updatedSpot = await tx.parkingSpot.update({
          where: { id: bestSpot.id },
          data: {
            status: 'OCCUPIED',
            updatedAt: new Date()
          },
          include: {
            floor: {
              include: {
                garage: true
              }
            }
          }
        });

        // Create or update vehicle record
        let vehicle = await tx.vehicle.findUnique({
          where: { licensePlate }
        });

        if (!vehicle) {
          vehicle = await tx.vehicle.create({
            data: {
              licensePlate,
              vehicleType: this.mapVehicleTypeToEnum(vehicleType) as any,
              status: 'PARKED',
              spotId: bestSpot.id,
              currentSpotId: bestSpot.id,
              checkInTime: new Date(),
              isPaid: false,
              hourlyRate: this.getHourlyRateByType(vehicleType)
            }
          });
        } else {
          vehicle = await tx.vehicle.update({
            where: { id: vehicle.id },
            data: {
              status: 'PARKED',
              spotId: bestSpot.id,
              currentSpotId: bestSpot.id,
              checkInTime: new Date(),
              checkOutTime: null,
              isPaid: false
            }
          });
        }

        // Create parking session
        const parkingSession = await tx.parkingSession.create({
          data: {
            vehicleId: vehicle.id,
            spotId: bestSpot.id,
            startTime: new Date(),
            hourlyRate: this.getHourlyRateByType(vehicleType),
            status: 'ACTIVE',
            isPaid: false
          }
        });

        // Format spot location
        const spotLocation = `Floor ${updatedSpot.level}, Section ${updatedSpot.section || 'N/A'}, Spot ${updatedSpot.spotNumber}`;

        return {
          success: true,
          assignedSpot: {
            id: updatedSpot.id,
            spotNumber: updatedSpot.spotNumber,
            level: updatedSpot.level,
            section: updatedSpot.section,
            spotType: updatedSpot.spotType,
            status: updatedSpot.status
          },
          spotLocation,
          parkingSession: {
            id: parkingSession.id,
            vehicleId: parkingSession.vehicleId,
            licensePlate,
            spotId: parkingSession.spotId,
            status: parkingSession.status,
            createdAt: parkingSession.createdAt.toISOString(),
            checkInTime: parkingSession.startTime.toISOString()
          }
        };
      });
    } catch (error) {
      console.error('Error assigning spot:', error);
      
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return {
            success: false,
            error: 'Spot assignment conflict',
            reason: 'Another vehicle was assigned to this spot simultaneously'
          };
        }
      }
      
      return {
        success: false,
        error: 'Database error during assignment',
        reason: (error as Error).message
      };
    }
  }

  /**
   * Find best available spot using advanced algorithm
   */
  async findBestSpot(vehicleType: VehicleType, options: AssignmentOptions = {}): Promise<any | null> {
    try {
      return await this.findBestAvailableSpot(vehicleType, options);
    } catch (error) {
      console.error('Error finding best spot:', error);
      return null;
    }
  }

  /**
   * Find best available spot with advanced selection algorithm
   */
  private async findBestAvailableSpot(
    vehicleType: VehicleType, 
    options: AssignmentOptions = {},
    tx: any = prisma
  ): Promise<any | null> {
    try {
      const spotType = this.mapVehicleTypeToSpotType(vehicleType);
      
      // Build where clause based on options
      const where: any = {
        spotType: spotType as any,
        status: 'AVAILABLE',
        isActive: true
      };

      // Add floor preference if specified
      if (options.preferredFloor) {
        where.level = options.preferredFloor;
      }

      // Find available spots with advanced ordering
      const availableSpots = await tx.parkingSpot.findMany({
        where,
        include: {
          floor: {
            include: {
              garage: true
            }
          }
        },
        orderBy: [
          // Priority 1: Preferred floor (if specified)
          ...(options.preferredFloor ? [{ level: 'asc' as const }] : []),
          // Priority 2: Lower floors first (easier access)
          { level: 'asc' as const },
          // Priority 3: Section order for logical flow
          { section: 'asc' as const },
          // Priority 4: Spot number for consistency
          { spotNumber: 'asc' as const }
        ],
        take: 10 // Limit to top candidates for efficiency
      });

      if (availableSpots.length === 0) {
        return null;
      }

      // Score and rank spots based on various criteria
      const scoredSpots = availableSpots.map(spot => ({
        spot,
        score: this.calculateSpotScore(spot, vehicleType, options)
      }));

      // Sort by score (highest first)
      scoredSpots.sort((a, b) => b.score - a.score);

      return scoredSpots[0].spot;
    } catch (error) {
      console.error('Error in findBestAvailableSpot:', error);
      return null;
    }
  }

  /**
   * Get assignment statistics from database
   */
  async getAssignmentStats(): Promise<any> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get various assignment statistics
      const [totalSessions, todaySessions, weekSessions, monthSessions, activeSessions, completedSessions] = await Promise.all([
        prisma.parkingSession.count(),
        prisma.parkingSession.count({
          where: {
            createdAt: {
              gte: startOfDay
            }
          }
        }),
        prisma.parkingSession.count({
          where: {
            createdAt: {
              gte: startOfWeek
            }
          }
        }),
        prisma.parkingSession.count({
          where: {
            createdAt: {
              gte: startOfMonth
            }
          }
        }),
        prisma.parkingSession.count({
          where: {
            status: 'ACTIVE'
          }
        }),
        prisma.parkingSession.count({
          where: {
            status: 'COMPLETED'
          }
        })
      ]);

      // Calculate average session duration for completed sessions
      const completedSessionsWithDuration = await prisma.parkingSession.findMany({
        where: {
          status: 'COMPLETED',
          endTime: { not: null },
          duration: { not: null }
        },
        select: {
          duration: true
        },
        take: 1000 // Limit for performance
      });

      const averageDuration = completedSessionsWithDuration.length > 0
        ? completedSessionsWithDuration.reduce((sum, session) => sum + (session.duration || 0), 0) / completedSessionsWithDuration.length
        : 0;

      // Get occupancy statistics
      const totalSpots = await prisma.parkingSpot.count({ where: { isActive: true } });
      const occupiedSpots = await prisma.parkingSpot.count({
        where: {
          status: 'OCCUPIED',
          isActive: true
        }
      });

      const occupancyRate = totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0;

      return {
        totalAssignments: totalSessions,
        successfulAssignments: completedSessions + activeSessions,
        failedAssignments: Math.max(0, totalSessions - completedSessions - activeSessions),
        todayAssignments: todaySessions,
        weekAssignments: weekSessions,
        monthAssignments: monthSessions,
        activeAssignments: activeSessions,
        completedAssignments: completedSessions,
        averageSessionDuration: Math.round(averageDuration), // in minutes
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        totalSpots,
        occupiedSpots,
        availableSpots: totalSpots - occupiedSpots
      };
    } catch (error) {
      console.error('Error getting assignment statistics:', error);
      throw new Error(`Failed to get assignment statistics: ${(error as Error).message}`);
    }
  }

  /**
   * Map VehicleType to Prisma SpotType enum
   */
  private mapVehicleTypeToSpotType(vehicleType: VehicleType): string {
    const mapping: Record<VehicleType, string> = {
      'compact': 'COMPACT',
      'standard': 'STANDARD', 
      'oversized': 'OVERSIZED'
    };
    return mapping[vehicleType] || 'STANDARD';
  }

  /**
   * Map VehicleType to Prisma VehicleType enum
   */
  private mapVehicleTypeToEnum(vehicleType: VehicleType): string {
    const mapping: Record<VehicleType, string> = {
      'compact': 'COMPACT',
      'standard': 'STANDARD',
      'oversized': 'OVERSIZED'
    };
    return mapping[vehicleType] || 'STANDARD';
  }

  /**
   * Get hourly rate by vehicle type
   */
  private getHourlyRateByType(vehicleType: VehicleType): number {
    const rates: Record<VehicleType, number> = {
      'compact': 4.0,
      'standard': 5.0,
      'oversized': 7.0
    };
    return rates[vehicleType] || 5.0;
  }

  /**
   * Calculate spot score for ranking algorithm
   */
  private calculateSpotScore(spot: any, vehicleType: VehicleType, options: AssignmentOptions): number {
    let score = 100; // Base score

    // Prefer lower floors (easier access)
    score -= (spot.level - 1) * 5;

    // Prefer spots matching preferred floor
    if (options.preferredFloor && spot.level === options.preferredFloor) {
      score += 20;
    }

    // Perfect type match gets bonus
    const expectedSpotType = this.mapVehicleTypeToSpotType(vehicleType);
    if (spot.spotType === expectedSpotType) {
      score += 15;
    }

    // Bonus for section organization (A sections preferred)
    if (spot.section === 'A') {
      score += 5;
    }

    return Math.max(0, score);
  }

  /**
   * Check vehicle compatibility with spot
   */
  private checkVehicleCompatibility(spot: any, vehicleType: VehicleType): SpotCompatibility {
    const reasons: string[] = [];
    let score = 100;
    
    const spotType = spot.spotType;
    const expectedSpotType = this.mapVehicleTypeToSpotType(vehicleType);

    // Check if vehicle can fit in spot
    if (vehicleType === 'oversized' && spotType !== 'OVERSIZED') {
      reasons.push('Oversized vehicle requires oversized spot');
      return { isCompatible: false, score: 0, reasons };
    }

    if (vehicleType === 'standard' && spotType === 'COMPACT') {
      reasons.push('Standard vehicle too large for compact spot');
      return { isCompatible: false, score: 0, reasons };
    }

    // Perfect match
    if (spotType === expectedSpotType) {
      reasons.push('Perfect size match');
      score = 100;
    } else {
      // Acceptable but not perfect
      reasons.push('Acceptable fit but not optimal');
      score = 80;
    }

    return {
      isCompatible: true,
      score,
      reasons
    };
  }
}