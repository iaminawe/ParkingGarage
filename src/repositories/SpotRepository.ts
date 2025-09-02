/**
 * Spot repository for data access operations using Prisma ORM
 * 
 * This module provides data access methods for parking spot records
 * using the repository pattern with Prisma integration. It handles 
 * spot CRUD operations, availability management, and maintains data consistency.
 * 
 * @module SpotRepository
 */

import { PrismaClient, ParkingSpot, Prisma } from '@prisma/client';
import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { DatabaseService } from '../services/DatabaseService';

// Type definitions for Spot operations
interface SpotCreateData {
  spotNumber: string;
  level: number;
  section?: string;
  spotType?: string;
  status?: string;
  isActive?: boolean;
  width?: number;
  length?: number;
  height?: number;
}

interface SpotUpdateData {
  spotNumber?: string;
  level?: number;
  section?: string;
  spotType?: string;
  status?: string;
  isActive?: boolean;
  width?: number;
  length?: number;
  height?: number;
}

interface SpotSearchCriteria {
  spotNumber?: string;
  level?: number;
  section?: string;
  spotType?: string;
  status?: string;
  isActive?: boolean;
  availableOnly?: boolean;
}

/**
 * Repository for managing parking spot records with Prisma ORM
 */
export class SpotRepository extends PrismaAdapter<ParkingSpot, SpotCreateData, SpotUpdateData> {
  protected model: PrismaClient['parkingSpot'];
  protected readonly modelName = 'parkingSpot';
  protected readonly delegate: PrismaClient['parkingSpot'];

  constructor(databaseService?: DatabaseService) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prisma = dbService.getPrismaClient();
    super(prisma);
    this.model = prisma.parkingSpot;
    this.delegate = prisma.parkingSpot;
  }

  /**
   * Create a new spot record
   * @param spotData - Spot data to create
   * @returns Created spot instance
   * @throws Error if spot already exists or data is invalid
   */
  async create(spotData: SpotCreateData): Promise<ParkingSpot> {
    const normalizedData = {
      ...spotData,
      spotType: spotData.spotType || 'STANDARD',
      status: spotData.status || 'AVAILABLE',
      isActive: spotData.isActive !== false
    };

    try {
      return await this.model.create({
        data: normalizedData as Prisma.ParkingSpotCreateInput,
        include: {
          vehicles: {
            take: 5,
            orderBy: { checkInTime: 'desc' }
          },
          sessions: {
            take: 5,
            orderBy: { startTime: 'desc' }
          }
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error(`Spot with number ${normalizedData.spotNumber} already exists`);
        }
      }
      throw error;
    }
  }

  /**
   * Find spot by spot number
   * @param spotNumber - Spot number to search for
   * @returns Spot if found, null otherwise
   */
  async findBySpotNumber(spotNumber: string): Promise<ParkingSpot | null> {
    return await this.model.findUnique({
      where: { spotNumber },
      include: {
        vehicles: {
          take: 5,
          orderBy: { checkInTime: 'desc' }
        },
        sessions: {
          take: 5,
          orderBy: { startTime: 'desc' }
        }
      }
    });
  }

  /**
   * Find available spots
   * @param spotType - Optional filter by spot type
   * @returns Array of available spots
   */
  async findAvailable(spotType?: string): Promise<ParkingSpot[]> {
    const whereClause: Prisma.ParkingSpotWhereInput = {
      status: 'AVAILABLE',
      isActive: true
    };

    if (spotType) {
      whereClause.spotType = spotType;
    }

    return await this.model.findMany({
      where: whereClause,
      include: {
        vehicles: {
          take: 3,
          orderBy: { checkInTime: 'desc' }
        }
      },
      orderBy: [
        { level: 'asc' },
        { spotNumber: 'asc' }
      ]
    });
  }

  /**
   * Find spots by level
   * @param level - Floor level
   * @returns Array of spots on the specified level
   */
  async findByLevel(level: number): Promise<ParkingSpot[]> {
    return await this.model.findMany({
      where: { level },
      include: {
        vehicles: {
          take: 3,
          orderBy: { checkInTime: 'desc' }
        },
        sessions: {
          take: 3,
          orderBy: { startTime: 'desc' }
        }
      },
      orderBy: { spotNumber: 'asc' }
    });
  }

  /**
   * Search spots with flexible criteria
   * @param criteria - Search criteria
   * @returns Array of matching spots
   */
  async search(criteria: SpotSearchCriteria): Promise<ParkingSpot[]> {
    const whereClause: Prisma.ParkingSpotWhereInput = {};

    if (criteria.spotNumber) {
      whereClause.spotNumber = {
        contains: criteria.spotNumber
      };
    }

    if (criteria.level !== undefined) {
      whereClause.level = criteria.level;
    }

    if (criteria.section) {
      whereClause.section = {
        contains: criteria.section
      };
    }

    if (criteria.spotType) {
      whereClause.spotType = criteria.spotType;
    }

    if (criteria.status) {
      whereClause.status = criteria.status;
    }

    if (criteria.isActive !== undefined) {
      whereClause.isActive = criteria.isActive;
    }

    if (criteria.availableOnly) {
      whereClause.status = 'AVAILABLE';
      whereClause.isActive = true;
    }

    return await this.model.findMany({
      where: whereClause,
      include: {
        vehicles: {
          take: 3,
          orderBy: { checkInTime: 'desc' }
        },
        sessions: {
          take: 3,
          orderBy: { startTime: 'desc' }
        }
      },
      orderBy: [
        { level: 'asc' },
        { spotNumber: 'asc' }
      ]
    });
  }

  /**
   * Update spot status
   * @param spotNumber - Spot number to update
   * @param status - New status
   * @returns Updated spot
   */
  async updateStatus(spotNumber: string, status: string): Promise<ParkingSpot> {
    return await this.model.update({
      where: { spotNumber },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        vehicles: {
          take: 5,
          orderBy: { checkInTime: 'desc' }
        },
        sessions: {
          take: 5,
          orderBy: { startTime: 'desc' }
        }
      }
    });
  }

  /**
   * Occupy a spot
   * @param spotNumber - Spot number to occupy
   * @returns Updated spot
   */
  async occupy(spotNumber: string): Promise<ParkingSpot> {
    return await this.updateStatus(spotNumber, 'OCCUPIED');
  }

  /**
   * Vacate a spot
   * @param spotNumber - Spot number to vacate
   * @returns Updated spot
   */
  async vacate(spotNumber: string): Promise<ParkingSpot> {
    return await this.updateStatus(spotNumber, 'AVAILABLE');
  }

  /**
   * Reserve a spot
   * @param spotNumber - Spot number to reserve
   * @returns Updated spot
   */
  async reserve(spotNumber: string): Promise<ParkingSpot> {
    return await this.updateStatus(spotNumber, 'RESERVED');
  }

  /**
   * Update spot information
   * @param spotNumber - Spot number to update
   * @param updateData - Data to update
   * @returns Updated spot
   */
  async update(spotNumber: string, updateData: SpotUpdateData): Promise<ParkingSpot> {
    return await this.model.update({
      where: { spotNumber },
      data: updateData as Prisma.ParkingSpotUpdateInput,
      include: {
        vehicles: {
          take: 5,
          orderBy: { checkInTime: 'desc' }
        },
        sessions: {
          take: 5,
          orderBy: { startTime: 'desc' }
        }
      }
    });
  }

  /**
   * Delete spot record
   * @param spotNumber - Spot number to delete
   * @returns Deleted spot
   */
  async delete(spotNumber: string): Promise<ParkingSpot> {
    return await this.model.delete({
      where: { spotNumber },
      include: {
        vehicles: true,
        sessions: true
      }
    });
  }

  /**
   * Get all spots with pagination
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @returns Array of spots
   */
  async findMany(skip: number = 0, take: number = 50): Promise<ParkingSpot[]> {
    return await this.model.findMany({
      skip,
      take,
      include: {
        vehicles: {
          take: 3,
          orderBy: { checkInTime: 'desc' }
        },
        sessions: {
          take: 3,
          orderBy: { startTime: 'desc' }
        }
      },
      orderBy: [
        { level: 'asc' },
        { spotNumber: 'asc' }
      ]
    });
  }

  /**
   * Count total spots
   * @param criteria - Optional search criteria
   * @returns Total count
   */
  async count(criteria?: SpotSearchCriteria): Promise<number> {
    const whereClause = criteria ? this.buildWhereClause(criteria) : {};
    return await this.model.count({ where: whereClause });
  }

  /**
   * Check if spot exists
   * @param spotNumber - Spot number to check
   * @returns True if spot exists
   */
  async exists(spotNumber: string): Promise<boolean> {
    const count = await this.model.count({
      where: { spotNumber }
    });
    return count > 0;
  }

  /**
   * Get spot statistics
   * @returns Spot statistics
   */
  async getStatistics(): Promise<{
    totalSpots: number;
    availableSpots: number;
    occupiedSpots: number;
    reservedSpots: number;
    maintenanceSpots: number;
    outOfOrderSpots: number;
    byType: Record<string, number>;
    byLevel: Record<number, number>;
  }> {
    const [
      totalSpots,
      availableSpots,
      occupiedSpots,
      reservedSpots,
      maintenanceSpots,
      outOfOrderSpots,
      byType,
      byLevel
    ] = await Promise.all([
      this.model.count({ where: { isActive: true } }),
      this.model.count({ where: { status: 'AVAILABLE', isActive: true } }),
      this.model.count({ where: { status: 'OCCUPIED', isActive: true } }),
      this.model.count({ where: { status: 'RESERVED', isActive: true } }),
      this.model.count({ where: { status: 'MAINTENANCE', isActive: true } }),
      this.model.count({ where: { status: 'OUT_OF_ORDER', isActive: true } }),
      this.model.groupBy({
        by: ['spotType'],
        _count: true,
        where: { isActive: true }
      }),
      this.model.groupBy({
        by: ['level'],
        _count: true,
        where: { isActive: true }
      })
    ]);

    return {
      totalSpots,
      availableSpots,
      occupiedSpots,
      reservedSpots,
      maintenanceSpots,
      outOfOrderSpots,
      byType: byType.reduce((acc, item) => {
        acc[item.spotType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byLevel: byLevel.reduce((acc, item) => {
        acc[item.level] = item._count;
        return acc;
      }, {} as Record<number, number>)
    };
  }

  /**
   * Build where clause from search criteria
   */
  private buildWhereClause(criteria: SpotSearchCriteria): Prisma.ParkingSpotWhereInput {
    const whereClause: Prisma.ParkingSpotWhereInput = {};

    if (criteria.spotNumber) {
      whereClause.spotNumber = { contains: criteria.spotNumber };
    }
    if (criteria.level !== undefined) {
      whereClause.level = criteria.level;
    }
    if (criteria.section) {
      whereClause.section = { contains: criteria.section };
    }
    if (criteria.spotType) {
      whereClause.spotType = criteria.spotType;
    }
    if (criteria.status) {
      whereClause.status = criteria.status;
    }
    if (criteria.isActive !== undefined) {
      whereClause.isActive = criteria.isActive;
    }
    if (criteria.availableOnly) {
      whereClause.status = 'AVAILABLE';
      whereClause.isActive = true;
    }

    return whereClause;
  }
}

// Export default instance for convenience
export const spotRepository = new SpotRepository();
export default spotRepository;