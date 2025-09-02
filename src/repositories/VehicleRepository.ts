/**
 * Vehicle repository for data access operations using Prisma ORM
 * 
 * This module provides data access methods for vehicle records
 * using the repository pattern with Prisma integration. It handles 
 * vehicle CRUD operations, search functionality, and maintains data consistency.
 * 
 * @module VehicleRepository
 */

import { PrismaClient, Vehicle, Prisma } from '@prisma/client';
import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { VehicleData, VehicleStatus, VehicleType, RateType } from '../types/models';

// Type definitions for Vehicle operations
interface VehicleCreateData {
  licensePlate: string;
  vehicleType?: string;
  rateType?: string;
  spotId?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  notes?: string;
}

interface VehicleUpdateData {
  vehicleType?: string;
  rateType?: string;
  spotId?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  isPaid?: boolean;
  amountPaid?: number;
  notes?: string;
}

interface VehicleSearchCriteria {
  licensePlate?: string;
  vehicleType?: string;
  spotId?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  make?: string;
  model?: string;
  color?: string;
  isPaid?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Repository for managing vehicle records with Prisma ORM
 */
export class VehicleRepository extends PrismaAdapter<Vehicle, VehicleCreateData, VehicleUpdateData> {
  protected model: PrismaClient['vehicle'];

  constructor(databaseService?: DatabaseService) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prisma = dbService.getPrismaClient();
    super(prisma);
    this.model = prisma.vehicle;
  }

  /**
   * Create a new vehicle record
   * @param vehicleData - Vehicle data to create
   * @returns Created vehicle instance
   * @throws Error if vehicle already exists or data is invalid
   */
  async create(vehicleData: VehicleCreateData): Promise<Vehicle> {
    // Normalize license plate to uppercase
    const normalizedData = {
      ...vehicleData,
      licensePlate: vehicleData.licensePlate.toUpperCase(),
      vehicleType: vehicleData.vehicleType || 'STANDARD',
      rateType: vehicleData.rateType || 'HOURLY'
    };

    try {
      return await this.model.create({
        data: normalizedData as Prisma.VehicleCreateInput,
        include: {
          spot: true,
          owner: true,
          sessions: {
            orderBy: { startTime: 'desc' },
            take: 5
          }
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error(`Vehicle with license plate ${normalizedData.licensePlate} already exists`);
        }
      }
      throw error;
    }
  }

  /**
   * Find vehicle by license plate
   * @param licensePlate - License plate to search for
   * @returns Vehicle if found, null otherwise
   */
  async findByLicensePlate(licensePlate: string): Promise<Vehicle | null> {
    return await this.model.findUnique({
      where: { 
        licensePlate: licensePlate.toUpperCase()
      },
      include: {
        spot: true,
        owner: true,
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 5
        }
      }
    });
  }

  /**
   * Find vehicles by owner
   * @param ownerId - Owner ID to search for
   * @returns Array of vehicles owned by the user
   */
  async findByOwner(ownerId: string): Promise<Vehicle[]> {
    return await this.model.findMany({
      where: { ownerId },
      include: {
        spot: true,
        owner: true,
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 3
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Find vehicles by spot
   * @param spotId - Spot ID to search for
   * @returns Array of vehicles in the specified spot
   */
  async findBySpot(spotId: string): Promise<Vehicle[]> {
    return await this.model.findMany({
      where: { spotId },
      include: {
        spot: true,
        owner: true,
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 3
        }
      },
      orderBy: { checkInTime: 'desc' }
    });
  }

  /**
   * Search vehicles with flexible criteria
   * @param criteria - Search criteria
   * @returns Array of matching vehicles
   */
  async search(criteria: VehicleSearchCriteria): Promise<Vehicle[]> {
    const whereClause: Prisma.VehicleWhereInput = {};

    if (criteria.licensePlate) {
      whereClause.licensePlate = {
        contains: criteria.licensePlate.toUpperCase()
      };
    }

    if (criteria.vehicleType) {
      whereClause.vehicleType = criteria.vehicleType;
    }

    if (criteria.spotId) {
      whereClause.spotId = criteria.spotId;
    }

    if (criteria.ownerId) {
      whereClause.ownerId = criteria.ownerId;
    }

    if (criteria.ownerName) {
      whereClause.ownerName = {
        contains: criteria.ownerName,
        mode: 'insensitive'
      };
    }

    if (criteria.ownerEmail) {
      whereClause.ownerEmail = {
        contains: criteria.ownerEmail,
        mode: 'insensitive'
      };
    }

    if (criteria.make) {
      whereClause.make = {
        contains: criteria.make,
        mode: 'insensitive'
      };
    }

    if (criteria.model) {
      whereClause.model = {
        contains: criteria.model,
        mode: 'insensitive'
      };
    }

    if (criteria.color) {
      whereClause.color = {
        contains: criteria.color,
        mode: 'insensitive'
      };
    }

    if (criteria.isPaid !== undefined) {
      whereClause.isPaid = criteria.isPaid;
    }

    if (criteria.dateFrom || criteria.dateTo) {
      whereClause.checkInTime = {};
      if (criteria.dateFrom) {
        whereClause.checkInTime.gte = criteria.dateFrom;
      }
      if (criteria.dateTo) {
        whereClause.checkInTime.lte = criteria.dateTo;
      }
    }

    return await this.model.findMany({
      where: whereClause,
      include: {
        spot: true,
        owner: true,
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 3
        }
      },
      orderBy: { checkInTime: 'desc' }
    });
  }

  /**
   * Update vehicle information
   * @param licensePlate - License plate of vehicle to update
   * @param updateData - Data to update
   * @returns Updated vehicle
   */
  async update(licensePlate: string, updateData: VehicleUpdateData): Promise<Vehicle> {
    return await this.model.update({
      where: { 
        licensePlate: licensePlate.toUpperCase()
      },
      data: updateData as Prisma.VehicleUpdateInput,
      include: {
        spot: true,
        owner: true,
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 5
        }
      }
    });
  }

  /**
   * Delete vehicle record
   * @param licensePlate - License plate of vehicle to delete
   * @returns Deleted vehicle
   */
  async delete(licensePlate: string): Promise<Vehicle> {
    return await this.model.delete({
      where: { 
        licensePlate: licensePlate.toUpperCase()
      },
      include: {
        spot: true,
        owner: true,
        sessions: true
      }
    });
  }

  /**
   * Get all vehicles with pagination
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @returns Array of vehicles
   */
  async findMany(skip: number = 0, take: number = 50): Promise<Vehicle[]> {
    return await this.model.findMany({
      skip,
      take,
      include: {
        spot: true,
        owner: true,
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 3
        }
      },
      orderBy: { checkInTime: 'desc' }
    });
  }

  /**
   * Count total vehicles
   * @param criteria - Optional search criteria
   * @returns Total count
   */
  async count(criteria?: VehicleSearchCriteria): Promise<number> {
    const whereClause = criteria ? this.buildWhereClause(criteria) : {};
    return await this.model.count({ where: whereClause });
  }

  /**
   * Check if vehicle exists
   * @param licensePlate - License plate to check
   * @returns True if vehicle exists
   */
  async exists(licensePlate: string): Promise<boolean> {
    const count = await this.model.count({
      where: { 
        licensePlate: licensePlate.toUpperCase()
      }
    });
    return count > 0;
  }

  /**
   * Get vehicle statistics
   * @returns Vehicle statistics
   */
  async getStatistics(): Promise<{
    totalVehicles: number;
    byType: Record<string, number>;
    byRateType: Record<string, number>;
    paidVehicles: number;
    unpaidVehicles: number;
  }> {
    const [totalVehicles, byType, byRateType, paidCount, unpaidCount] = await Promise.all([
      this.model.count(),
      this.model.groupBy({
        by: ['vehicleType'],
        _count: true
      }),
      this.model.groupBy({
        by: ['rateType'],
        _count: true
      }),
      this.model.count({ where: { isPaid: true } }),
      this.model.count({ where: { isPaid: false } })
    ]);

    return {
      totalVehicles,
      byType: byType.reduce((acc, item) => {
        acc[item.vehicleType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byRateType: byRateType.reduce((acc, item) => {
        acc[item.rateType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      paidVehicles: paidCount,
      unpaidVehicles: unpaidCount
    };
  }

  /**
   * Build where clause from search criteria
   */
  private buildWhereClause(criteria: VehicleSearchCriteria): Prisma.VehicleWhereInput {
    const whereClause: Prisma.VehicleWhereInput = {};

    if (criteria.licensePlate) {
      whereClause.licensePlate = { contains: criteria.licensePlate.toUpperCase() };
    }
    if (criteria.vehicleType) {
      whereClause.vehicleType = criteria.vehicleType;
    }
    if (criteria.spotId) {
      whereClause.spotId = criteria.spotId;
    }
    if (criteria.ownerId) {
      whereClause.ownerId = criteria.ownerId;
    }
    if (criteria.ownerName) {
      whereClause.ownerName = { contains: criteria.ownerName, mode: 'insensitive' };
    }
    if (criteria.ownerEmail) {
      whereClause.ownerEmail = { contains: criteria.ownerEmail, mode: 'insensitive' };
    }
    if (criteria.make) {
      whereClause.make = { contains: criteria.make, mode: 'insensitive' };
    }
    if (criteria.model) {
      whereClause.model = { contains: criteria.model, mode: 'insensitive' };
    }
    if (criteria.color) {
      whereClause.color = { contains: criteria.color, mode: 'insensitive' };
    }
    if (criteria.isPaid !== undefined) {
      whereClause.isPaid = criteria.isPaid;
    }
    if (criteria.dateFrom || criteria.dateTo) {
      whereClause.checkInTime = {};
      if (criteria.dateFrom) {
        whereClause.checkInTime.gte = criteria.dateFrom;
      }
      if (criteria.dateTo) {
        whereClause.checkInTime.lte = criteria.dateTo;
      }
    }

    return whereClause;
  }
}

// Export default instance for convenience
export const vehicleRepository = new VehicleRepository();
export default vehicleRepository;