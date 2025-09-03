/**
 * Floor repository for data access operations using Prisma
 *
 * This module provides data access methods for parking garage floors using
 * the PrismaAdapter pattern. It handles floor CRUD operations following
 * the established repository pattern.
 *
 * @module FloorRepository
 */

import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { Floor, Prisma } from '@prisma/client';
import type {
  QueryOptions,
  PaginatedResult,
  IAdapterLogger,
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * Floor creation data interface
 */
export interface CreateFloorData {
  garageId: string;
  floorNumber: number;
  description?: string;
  totalSpots?: number;
  isActive?: boolean;
}

/**
 * Floor update data interface
 */
export interface UpdateFloorData {
  garageId?: string;
  floorNumber?: number;
  description?: string;
  totalSpots?: number;
  isActive?: boolean;
}

/**
 * Floor search criteria interface
 */
export interface FloorSearchCriteria {
  garageId?: string;
  floorNumber?: number;
  isActive?: boolean;
  hasAvailableSpots?: boolean;
}

/**
 * Floor statistics interface
 */
export interface FloorStats {
  total: number;
  active: number;
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  occupancyRate: number;
  floorOccupancy: Array<{
    floorId: string;
    floorNumber: number;
    totalSpots: number;
    occupiedSpots: number;
    availableSpots: number;
    occupancyRate: number;
  }>;
}

/**
 * Repository for managing floor records using Prisma
 */
export class FloorRepository extends PrismaAdapter<Floor, CreateFloorData, UpdateFloorData> {
  protected readonly modelName = 'floor';
  protected readonly delegate: Prisma.FloorDelegate;

  constructor(databaseService?: DatabaseService, logger?: IAdapterLogger) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prismaClient = dbService.getClient();

    super(prismaClient, logger || createLogger('FloorRepository'));
    this.delegate = prismaClient.floor;
  }

  /**
   * Find floor by floor number within a garage
   */
  async findByFloorNumber(
    garageId: string,
    floorNumber: number,
    options: QueryOptions = {}
  ): Promise<Floor | null> {
    // Build Prisma query options properly
    const prismaOptions: any = {
      where: {
        garageId,
        floorNumber,
        isActive: true,
      },
      ...(options.include && { include: options.include }),
      ...(options.select && { select: options.select }),
      ...(options.orderBy && { orderBy: options.orderBy }),
    };

    return await this.delegate.findFirst(prismaOptions);
  }

  /**
   * Find floors by garage with optional filtering
   */
  async findByGarage(
    garageId: string,
    criteria: FloorSearchCriteria = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Floor>> {
    const where: Prisma.FloorWhereInput = {
      garageId,
      ...(criteria.floorNumber && { floorNumber: criteria.floorNumber }),
      ...(criteria.isActive !== undefined && { isActive: criteria.isActive }),
    };

    // Build Prisma query options, excluding cursor if it doesn't match expected type
    const prismaOptions: any = {
      where,
      ...(options.include && { include: options.include }),
      ...(options.select && { select: options.select }),
      ...(options.distinct && { distinct: options.distinct }),
      ...(options.skip && { skip: options.skip }),
      ...(options.take && { take: options.take }),
      ...(options.orderBy && { orderBy: options.orderBy }),
    };

    const floors = await this.delegate.findMany(prismaOptions);
    const totalCount = await this.delegate.count({ where });

    return {
      data: floors,
      totalCount,
      hasNextPage: (options.skip || 0) + floors.length < totalCount,
      hasPrevPage: (options.skip || 0) > 0,
      currentPage: Math.floor((options.skip || 0) / (options.take || 10)) + 1,
      totalPages: Math.ceil(totalCount / (options.take || 10)),
    };
  }

  /**
   * Find floors with their parking spots
   */
  async findWithSpots(
    garageId?: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Floor & { spots?: any[] }>> {
    const where: Prisma.FloorWhereInput = {
      ...(garageId && { garageId }),
      isActive: true,
    };

    // Build Prisma query options properly
    const prismaOptions: any = {
      where,
      include: {
        spots: true,
        garage: true,
      },
      ...(options.skip && { skip: options.skip }),
      ...(options.take && { take: options.take }),
      ...(options.orderBy && { orderBy: options.orderBy }),
    };

    const floors = await this.delegate.findMany(prismaOptions);
    const totalCount = await this.delegate.count({ where });

    return {
      data: floors,
      totalCount,
      hasNextPage: (options.skip || 0) + floors.length < totalCount,
      hasPrevPage: (options.skip || 0) > 0,
      currentPage: Math.floor((options.skip || 0) / (options.take || 10)) + 1,
      totalPages: Math.ceil(totalCount / (options.take || 10)),
    };
  }

  /**
   * Get floor statistics
   */
  async getFloorStats(garageId?: string): Promise<FloorStats> {
    const where: Prisma.FloorWhereInput = {
      ...(garageId && { garageId }),
      isActive: true,
    };

    const floors = await this.delegate.findMany({
      where,
      include: {
        spots: true,
      },
    });

    const total = floors.length;
    const active = floors.filter(f => f.isActive).length;
    const totalSpots = floors.reduce((sum, floor) => sum + (floor.totalSpots || 0), 0);
    
    // Calculate occupied spots (assuming parkingSpots have a status field)
    const occupiedSpots = floors.reduce((sum, floor) => {
      const occupied = floor.spots?.filter((spot: any) => spot.status === 'OCCUPIED').length || 0;
      return sum + occupied;
    }, 0);
    
    const availableSpots = totalSpots - occupiedSpots;
    const occupancyRate = totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0;

    const floorOccupancy = floors.map(floor => {
      const floorOccupied = floor.spots?.filter((spot: any) => spot.status === 'OCCUPIED').length || 0;
      const floorTotal = floor.totalSpots || 0;
      const floorAvailable = floorTotal - floorOccupied;
      const floorRate = floorTotal > 0 ? (floorOccupied / floorTotal) * 100 : 0;

      return {
        floorId: floor.id,
        floorNumber: floor.floorNumber,
        totalSpots: floorTotal,
        occupiedSpots: floorOccupied,
        availableSpots: floorAvailable,
        occupancyRate: Math.round(floorRate * 100) / 100,
      };
    });

    return {
      total,
      active,
      totalSpots,
      occupiedSpots,
      availableSpots,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      floorOccupancy,
    };
  }

  /**
   * Update floor spot count based on actual parking spots
   */
  async updateSpotCount(floorId: string): Promise<Floor | null> {
    const floor = await this.delegate.findUnique({
      where: { id: floorId },
      include: { spots: true },
    });

    if (!floor) {
      return null;
    }

    const actualSpotCount = floor.spots?.length || 0;

    const updatedFloor = await this.delegate.update({
      where: { id: floorId },
      data: { totalSpots: actualSpotCount },
    });

    return updatedFloor;
  }
}