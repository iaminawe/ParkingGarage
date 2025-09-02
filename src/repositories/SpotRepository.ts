/**
 * Spot repository for data access operations using Prisma
 * 
 * This module provides data access methods for parking spots using
 * the PrismaAdapter pattern. It handles spot CRUD operations,
 * occupancy management, and provides optimized queries.
 * 
 * @module SpotRepository
 */

import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { Spot, Prisma, SpotType, SpotStatus } from '../generated/prisma';
import type { 
  QueryOptions,
  PaginatedResult,
  IAdapterLogger
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * Spot creation data interface
 */
export interface CreateSpotData {
  garageId: string;
  floorId?: string;
  floor?: number;
  bay?: number;
  spotNumber: string;
  type?: SpotType;
  status?: SpotStatus;
  features?: string; // JSON array as string
}

/**
 * Spot update data interface
 */
export interface UpdateSpotData {
  garageId?: string;
  floorId?: string;
  floor?: number;
  bay?: number;
  spotNumber?: string;
  type?: SpotType;
  status?: SpotStatus;
  features?: string;
  currentVehicleId?: string;
}

/**
 * Spot search criteria interface
 */
export interface SpotSearchCriteria {
  garageId?: string;
  floor?: number;
  bay?: number;
  spotNumber?: string;
  type?: SpotType;
  status?: SpotStatus;
  features?: string[];
  isAvailable?: boolean;
}

/**
 * Spot statistics interface
 */
export interface SpotStats {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  outOfOrder: number;
  maintenance: number;
  byType: Record<SpotType, number>;
  byFloor: Record<number, number>;
  occupancyRate: number;
}

/**
 * Repository for managing parking spots using Prisma
 */
export class SpotRepository extends PrismaAdapter<Spot, CreateSpotData, UpdateSpotData> {
  protected readonly modelName = 'spot';
  protected readonly delegate: Prisma.SpotDelegate;

  constructor(
    databaseService?: DatabaseService,
    logger?: IAdapterLogger
  ) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prismaClient = dbService.getClient();
    
    super(prismaClient, logger || createLogger('SpotRepository'));
    this.delegate = prismaClient.spot;
  }

  /**
   * Find spot by spot number within a garage
   * @param garageId - Garage ID
   * @param spotNumber - Spot number
   * @param options - Query options
   * @returns Found spot or null
   */
  async findBySpotNumber(
    garageId: string,
    spotNumber: string,
    options?: QueryOptions
  ): Promise<Spot | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: {
          garageId,
          spotNumber,
          deletedAt: null
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found spot by spot number', {
        garageId,
        spotNumber,
        found: !!result
      });
      
      return result;
    }, `find spot by number: ${spotNumber}`);
  }

  /**
   * Find spots by status
   * @param status - Spot status to filter by
   * @param options - Query options
   * @returns Array of spots matching the status
   */
  async findByStatus(
    status: SpotStatus,
    options?: QueryOptions
  ): Promise<Spot[]> {
    return this.findMany({ status }, options);
  }

  /**
   * Find available spots
   * @param options - Query options
   * @returns Array of available spots
   */
  async findAvailable(options?: QueryOptions): Promise<Spot[]> {
    return this.findByStatus('AVAILABLE', options);
  }

  /**
   * Find occupied spots
   * @param options - Query options
   * @returns Array of occupied spots
   */
  async findOccupied(options?: QueryOptions): Promise<Spot[]> {
    return this.findByStatus('OCCUPIED', options);
  }

  /**
   * Find spots by type
   * @param type - Spot type to filter by
   * @param options - Query options
   * @returns Array of spots matching the type
   */
  async findByType(
    type: SpotType,
    options?: QueryOptions
  ): Promise<Spot[]> {
    return this.findMany({ type }, options);
  }

  /**
   * Find spots by floor
   * @param floor - Floor number
   * @param options - Query options
   * @returns Array of spots on the floor
   */
  async findByFloor(
    floor: number,
    options?: QueryOptions
  ): Promise<Spot[]> {
    return this.findMany({ floor }, options);
  }

  /**
   * Find spots by floor and bay
   * @param floor - Floor number
   * @param bay - Bay number
   * @param options - Query options
   * @returns Array of spots in the floor and bay
   */
  async findByFloorAndBay(
    floor: number,
    bay: number,
    options?: QueryOptions
  ): Promise<Spot[]> {
    return this.findMany({ floor, bay }, options);
  }

  /**
   * Find spots by garage
   * @param garageId - Garage ID
   * @param options - Query options
   * @returns Array of spots in the garage
   */
  async findByGarage(
    garageId: string,
    options?: QueryOptions
  ): Promise<Spot[]> {
    return this.findMany({ garageId }, options);
  }

  /**
   * Find spots with specific features
   * @param features - Array of features to search for
   * @param matchAll - Whether to match all features (AND) or any (OR)
   * @param options - Query options
   * @returns Array of spots with the features
   */
  async findByFeatures(
    features: string[],
    matchAll: boolean = false,
    options?: QueryOptions
  ): Promise<Spot[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.SpotWhereInput = {
        deletedAt: null
      };

      if (features.length > 0) {
        if (matchAll) {
          // All features must be present - use AND logic
          whereClause.AND = features.map(feature => ({
            features: {
              contains: `"${feature}"`
            }
          }));
        } else {
          // Any feature can be present - use OR logic
          whereClause.OR = features.map(feature => ({
            features: {
              contains: `"${feature}"`
            }
          }));
        }
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found spots by features', {
        features,
        matchAll,
        count: result.length
      });
      
      return result;
    }, `find spots by features: ${features.join(', ')}`);
  }

  /**
   * Find spot occupied by a specific vehicle
   * @param vehicleId - Vehicle ID
   * @param options - Query options
   * @returns Spot occupied by the vehicle or null
   */
  async findByVehicle(
    vehicleId: string,
    options?: QueryOptions
  ): Promise<Spot | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: {
          currentVehicleId: vehicleId,
          deletedAt: null
        },
        include: {
          currentVehicle: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found spot by vehicle', {
        vehicleId,
        found: !!result
      });
      
      return result;
    }, `find spot by vehicle: ${vehicleId}`);
  }

  /**
   * Search spots with multiple criteria
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Array of spots matching all criteria
   */
  async search(
    criteria: SpotSearchCriteria,
    options?: QueryOptions
  ): Promise<Spot[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.SpotWhereInput = {
        deletedAt: null
      };

      // Exact matches
      if (criteria.garageId) {
        whereClause.garageId = criteria.garageId;
      }

      if (criteria.floor !== undefined) {
        whereClause.floor = criteria.floor;
      }

      if (criteria.bay !== undefined) {
        whereClause.bay = criteria.bay;
      }

      if (criteria.type) {
        whereClause.type = criteria.type;
      }

      if (criteria.status) {
        whereClause.status = criteria.status;
      }

      // Spot number search
      if (criteria.spotNumber) {
        whereClause.spotNumber = {
          contains: criteria.spotNumber,
          mode: 'insensitive'
        };
      }

      // Feature search
      if (criteria.features && criteria.features.length > 0) {
        whereClause.OR = criteria.features.map(feature => ({
          features: {
            contains: `"${feature}"`
          }
        }));
      }

      // Availability filter
      if (criteria.isAvailable !== undefined) {
        whereClause.status = criteria.isAvailable ? 'AVAILABLE' : { not: 'AVAILABLE' };
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        include: {
          garage: true,
          currentVehicle: true,
          floorRel: true
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Spot search completed', {
        criteria,
        count: result.length
      });
      
      return result;
    }, 'search spots');
  }

  /**
   * Occupy a spot with a vehicle
   * @param spotId - Spot ID
   * @param vehicleId - Vehicle ID
   * @returns Updated spot
   */
  async occupyWithVehicle(spotId: string, vehicleId: string): Promise<Spot> {
    return this.executeWithRetry(async () => {
      // First, check if spot is available
      const spot = await this.delegate.findFirst({
        where: {
          id: spotId,
          status: 'AVAILABLE',
          deletedAt: null
        }
      });

      if (!spot) {
        throw new Error(`Spot ${spotId} is not available for occupancy`);
      }

      // Update spot status and assign vehicle
      const result = await this.update(spotId, {
        status: 'OCCUPIED',
        currentVehicleId: vehicleId
      });

      this.logger.info('Spot occupied', {
        spotId,
        vehicleId,
        spotNumber: spot.spotNumber
      });

      return result;
    }, `occupy spot: ${spotId}`);
  }

  /**
   * Vacate a spot
   * @param spotId - Spot ID
   * @returns Updated spot
   */
  async vacate(spotId: string): Promise<Spot> {
    return this.executeWithRetry(async () => {
      // First, check if spot is occupied
      const spot = await this.delegate.findFirst({
        where: {
          id: spotId,
          status: 'OCCUPIED',
          deletedAt: null
        }
      });

      if (!spot) {
        throw new Error(`Spot ${spotId} is not currently occupied`);
      }

      // Update spot status and clear vehicle
      const result = await this.update(spotId, {
        status: 'AVAILABLE',
        currentVehicleId: null as any
      });

      this.logger.info('Spot vacated', {
        spotId,
        spotNumber: spot.spotNumber,
        previousVehicle: spot.currentVehicleId
      });

      return result;
    }, `vacate spot: ${spotId}`);
  }

  /**
   * Get spot statistics
   * @param garageId - Optional garage ID to filter statistics
   * @returns Spot statistics
   */
  async getStats(garageId?: string): Promise<SpotStats> {
    return this.executeWithRetry(async () => {
      const whereClause = garageId ? { garageId } : {};
      
      // Get total count
      const totalCount = await this.count(whereClause);

      // Count by status
      const statusCounts = await this.prisma.$queryRaw<
        Array<{ status: SpotStatus; count: bigint }>
      >`
        SELECT status, COUNT(*) as count
        FROM spots
        WHERE deletedAt IS NULL ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY status
      `;

      // Count by type
      const typeCounts = await this.prisma.$queryRaw<
        Array<{ type: SpotType; count: bigint }>
      >`
        SELECT type, COUNT(*) as count
        FROM spots
        WHERE deletedAt IS NULL ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY type
      `;

      // Count by floor
      const floorCounts = await this.prisma.$queryRaw<
        Array<{ floor: number; count: bigint }>
      >`
        SELECT floor, COUNT(*) as count
        FROM spots
        WHERE deletedAt IS NULL ${garageId ? Prisma.sql`AND garageId = ${garageId}` : Prisma.empty}
        GROUP BY floor
      `;

      // Build result
      const stats: SpotStats = {
        total: totalCount,
        available: 0,
        occupied: 0,
        reserved: 0,
        outOfOrder: 0,
        maintenance: 0,
        byType: {} as Record<SpotType, number>,
        byFloor: {} as Record<number, number>,
        occupancyRate: 0
      };

      // Process status counts
      statusCounts.forEach(({ status, count }) => {
        const countNum = Number(count);
        switch (status) {
          case 'AVAILABLE':
            stats.available = countNum;
            break;
          case 'OCCUPIED':
            stats.occupied = countNum;
            break;
          case 'RESERVED':
            stats.reserved = countNum;
            break;
          case 'OUT_OF_ORDER':
            stats.outOfOrder = countNum;
            break;
          case 'MAINTENANCE':
            stats.maintenance = countNum;
            break;
        }
      });

      // Process type counts
      typeCounts.forEach(({ type, count }) => {
        stats.byType[type] = Number(count);
      });

      // Process floor counts
      floorCounts.forEach(({ floor, count }) => {
        stats.byFloor[floor] = Number(count);
      });

      // Calculate occupancy rate
      if (stats.total > 0) {
        const occupiedCount = stats.occupied + stats.reserved;
        stats.occupancyRate = Math.round((occupiedCount / stats.total) * 10000) / 100; // 2 decimal places
      }

      this.logger.debug('Spot statistics calculated', {
        garageId,
        stats
      });
      
      return stats;
    }, 'get spot statistics');
  }

  /**
   * Get availability by type for a garage
   * @param garageId - Garage ID
   * @param vehicleType - Optional vehicle type filter
   * @returns Availability statistics
   */
  async getAvailabilityStats(
    garageId: string,
    vehicleType?: SpotType
  ): Promise<{
    total: number;
    available: number;
    occupied: number;
    availabilityRate: number;
  }> {
    return this.executeWithRetry(async () => {
      const whereClause: any = {
        garageId,
        deletedAt: null
      };

      if (vehicleType) {
        whereClause.type = vehicleType;
      }

      const total = await this.count(whereClause);
      const available = await this.count({
        ...whereClause,
        status: 'AVAILABLE'
      });
      const occupied = await this.count({
        ...whereClause,
        status: 'OCCUPIED'
      });

      const availabilityRate = total > 0 ? Math.round((available / total) * 10000) / 100 : 0;

      const stats = {
        total,
        available,
        occupied,
        availabilityRate
      };

      this.logger.debug('Availability statistics calculated', {
        garageId,
        vehicleType,
        stats
      });

      return stats;
    }, `get availability stats for garage: ${garageId}`);
  }

  /**
   * Bulk create spots for a garage floor
   * @param garageId - Garage ID
   * @param floor - Floor number
   * @param bay - Bay number
   * @param spotNumbers - Array of spot numbers to create
   * @param type - Spot type
   * @returns Array of created spots
   */
  async bulkCreateSpots(
    garageId: string,
    floor: number,
    bay: number,
    spotNumbers: string[],
    type: SpotType = 'STANDARD'
  ): Promise<Spot[]> {
    return this.executeWithRetry(async () => {
      const spotsData = spotNumbers.map(spotNumber => ({
        garageId,
        floor,
        bay,
        spotNumber,
        type,
        status: 'AVAILABLE' as SpotStatus,
        features: '[]' // Empty features array
      }));

      await this.createMany(spotsData);

      // Fetch the created spots
      const createdSpots = await this.delegate.findMany({
        where: {
          garageId,
          floor,
          bay,
          spotNumber: { in: spotNumbers },
          deletedAt: null
        }
      });

      this.logger.info('Bulk created spots', {
        garageId,
        floor,
        bay,
        count: createdSpots.length,
        type
      });

      return createdSpots;
    }, `bulk create ${spotNumbers.length} spots`);
  }

  /**
   * Legacy method compatibility - maintain existing API
   * @param spotId - Spot ID
   * @param licensePlate - License plate
   * @returns Success boolean
   */
  async occupy(spotId: string, licensePlate: string): Promise<boolean> {
    try {
      // First find the vehicle by license plate
      const vehicle = await this.prisma.vehicle.findFirst({
        where: {
          licensePlate: licensePlate.toUpperCase(),
          deletedAt: null
        }
      });

      if (!vehicle) {
        throw new Error(`Vehicle with license plate ${licensePlate} not found`);
      }

      await this.occupyWithVehicle(spotId, vehicle.id);
      return true;
    } catch (error) {
      this.logger.error('Failed to occupy spot', error as Error, {
        spotId,
        licensePlate
      });
      return false;
    }
  }

  /**
   * Legacy method compatibility - maintain existing API
   * @param spotId - Spot ID
   * @returns Success boolean
   */
  async vacate(spotId: string): Promise<boolean> {
    try {
      await this.vacate(spotId);
      return true;
    } catch (error) {
      this.logger.error('Failed to vacate spot', error as Error, {
        spotId
      });
      return false;
    }
  }
}

export default SpotRepository;