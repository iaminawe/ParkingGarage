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
import { ParkingSpot, Prisma, SpotType, SpotStatus } from '@prisma/client';
import type {
  QueryOptions,
  PaginatedResult,
  IAdapterLogger,
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * Spot creation data interface
 */
export interface CreateSpotData {
  floorId: string;
  spotNumber: string;
  level: number;
  section?: string;
  spotType?: SpotType;
  status?: SpotStatus;
  width?: number;
  length?: number;
  height?: number;
}

/**
 * Spot update data interface
 */
export interface UpdateSpotData {
  floorId?: string;
  spotNumber?: string;
  level?: number;
  section?: string;
  spotType?: SpotType;
  status?: SpotStatus;
  width?: number;
  length?: number;
  height?: number;
}

/**
 * Spot search criteria interface
 */
export interface SpotSearchCriteria {
  floorId?: string;
  level?: number;
  section?: string;
  spotNumber?: string;
  spotType?: SpotType;
  status?: SpotStatus;
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
  byLevel: Record<number, number>;
  occupancyRate: number;
}

/**
 * Repository for managing parking spots using Prisma
 */
export class SpotRepository extends PrismaAdapter<ParkingSpot, CreateSpotData, UpdateSpotData> {
  protected readonly modelName = 'parkingSpot';
  protected readonly delegate: Prisma.ParkingSpotDelegate;

  constructor(databaseService?: DatabaseService, logger?: IAdapterLogger) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prismaClient = dbService.getClient();

    super(prismaClient, logger || createLogger('SpotRepository'));
    this.delegate = prismaClient.parkingSpot;
  }

  /**
   * Find spot by spot number within a floor
   * @param floorId - Floor ID
   * @param spotNumber - Spot number
   * @param options - Query options
   * @returns Found spot or null
   */
  async findBySpotNumber(
    floorId: string,
    spotNumber: string,
    options?: QueryOptions
  ): Promise<ParkingSpot | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: {
          floorId,
          spotNumber,
          isActive: true,
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found spot by spot number', {
        floorId,
        spotNumber,
        found: !!result,
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
  async findByStatus(status: SpotStatus, options?: QueryOptions): Promise<ParkingSpot[]> {
    return this.findMany({ status }, options);
  }

  /**
   * Find available spots
   * @param options - Query options
   * @returns Array of available spots
   */
  async findAvailable(options?: QueryOptions): Promise<ParkingSpot[]> {
    return this.findByStatus('AVAILABLE', options);
  }

  /**
   * Find occupied spots
   * @param options - Query options
   * @returns Array of occupied spots
   */
  async findOccupied(options?: QueryOptions): Promise<ParkingSpot[]> {
    return this.findByStatus('OCCUPIED', options);
  }

  /**
   * Find spots by type
   * @param spotType - Spot type to filter by
   * @param options - Query options
   * @returns Array of spots matching the type
   */
  async findByType(spotType: SpotType, options?: QueryOptions): Promise<ParkingSpot[]> {
    return this.findMany({ spotType }, options);
  }

  /**
   * Find spots by level
   * @param level - Level number
   * @param options - Query options
   * @returns Array of spots on the level
   */
  async findByLevel(level: number, options?: QueryOptions): Promise<ParkingSpot[]> {
    return this.findMany({ level }, options);
  }

  /**
   * Find spots by level and section
   * @param level - Level number
   * @param section - Section name
   * @param options - Query options
   * @returns Array of spots in the level and section
   */
  async findByLevelAndSection(
    level: number,
    section: string,
    options?: QueryOptions
  ): Promise<ParkingSpot[]> {
    return this.findMany({ level, section }, options);
  }

  /**
   * Find spots by floor
   * @param floorId - Floor ID
   * @param options - Query options
   * @returns Array of spots in the floor
   */
  async findByFloor(floorId: string, options?: QueryOptions): Promise<ParkingSpot[]> {
    return this.findMany({ floorId }, options);
  }

  /**
   * Find spots by section
   * @param section - Section name
   * @param options - Query options
   * @returns Array of spots in the section
   */
  async findBySection(section: string, options?: QueryOptions): Promise<ParkingSpot[]> {
    return this.findMany({ section }, options);
  }

  /**
   * Find spot occupied by a specific vehicle
   * @param vehicleId - Vehicle ID
   * @param options - Query options
   * @returns Spot occupied by the vehicle or null
   */
  async findByVehicle(vehicleId: string, options?: QueryOptions): Promise<ParkingSpot | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: {
          currentVehicles: {
            some: {
              id: vehicleId,
            },
          },
          isActive: true,
        },
        include: {
          currentVehicles: true,
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found spot by vehicle', {
        vehicleId,
        found: !!result,
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
  async search(criteria: SpotSearchCriteria, options?: QueryOptions): Promise<ParkingSpot[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.ParkingSpotWhereInput = {
        isActive: true,
      };

      // Exact matches
      if (criteria.floorId) {
        whereClause.floorId = criteria.floorId;
      }

      if (criteria.level !== undefined) {
        whereClause.level = criteria.level;
      }

      if (criteria.section !== undefined) {
        whereClause.section = criteria.section;
      }

      if (criteria.spotType) {
        whereClause.spotType = criteria.spotType;
      }

      if (criteria.status) {
        whereClause.status = criteria.status;
      }

      // Spot number search
      if (criteria.spotNumber) {
        whereClause.spotNumber = {
          contains: criteria.spotNumber,
        };
      }

      // Availability filter
      if (criteria.isAvailable !== undefined) {
        whereClause.status = criteria.isAvailable ? 'AVAILABLE' : { not: 'AVAILABLE' };
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        include: {
          floor: true,
          currentVehicles: true,
          vehicles: true,
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Spot search completed', {
        criteria,
        count: result.length,
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
  async occupyWithVehicle(spotId: string, vehicleId: string): Promise<ParkingSpot> {
    return this.executeWithRetry(async () => {
      // First, check if spot is available
      const spot = await this.delegate.findFirst({
        where: {
          id: spotId,
          status: 'AVAILABLE',
          isActive: true,
        },
      });

      if (!spot) {
        throw new Error(`Spot ${spotId} is not available for occupancy`);
      }

      // Update spot status (vehicle assignment handled through Vehicle relation)
      const result = await this.update(spotId, {
        status: 'OCCUPIED',
      });

      // Update the vehicle to reference this spot
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { currentSpotId: spotId },
      });

      this.logger.info('Spot occupied', {
        spotId,
        vehicleId,
        spotNumber: spot.spotNumber,
      });

      return result;
    }, `occupy spot: ${spotId}`);
  }

  /**
   * Vacate a spot
   * @param spotId - Spot ID
   * @returns Updated spot
   */
  async vacate(spotId: string): Promise<ParkingSpot> {
    return this.executeWithRetry(async () => {
      // First, check if spot is occupied
      const spot = await this.delegate.findFirst({
        where: {
          id: spotId,
          status: 'OCCUPIED',
          isActive: true,
        },
      });

      if (!spot) {
        throw new Error(`Spot ${spotId} is not currently occupied`);
      }

      // Update spot status
      const result = await this.update(spotId, {
        status: 'AVAILABLE',
      });

      // Clear vehicle's current spot reference
      await this.prisma.vehicle.updateMany({
        where: { currentSpotId: spotId },
        data: { currentSpotId: null },
      });

      this.logger.info('Spot vacated', {
        spotId,
        spotNumber: spot.spotNumber,
      });

      return result;
    }, `vacate spot: ${spotId}`);
  }

  /**
   * Get spot statistics
   * @param garageId - Optional garage ID to filter statistics
   * @returns Spot statistics
   */
  async getStats(floorId?: string): Promise<SpotStats> {
    return this.executeWithRetry(async () => {
      const whereClause = floorId ? { floorId } : {};

      // Get total count
      const totalCount = await this.count(whereClause);

      // Count by status
      const statusCounts = await this.prisma.$queryRaw<
        Array<{ status: SpotStatus; count: bigint }>
      >`
        SELECT status, COUNT(*) as count
        FROM parking_spots
        WHERE isActive = 1 ${floorId ? Prisma.sql`AND floorId = ${floorId}` : Prisma.empty}
        GROUP BY status
      `;

      // Count by type
      const typeCounts = await this.prisma.$queryRaw<Array<{ spotType: SpotType; count: bigint }>>`
        SELECT spotType, COUNT(*) as count
        FROM parking_spots
        WHERE isActive = 1 ${floorId ? Prisma.sql`AND floorId = ${floorId}` : Prisma.empty}
        GROUP BY spotType
      `;

      // Count by level
      const levelCounts = await this.prisma.$queryRaw<Array<{ level: number; count: bigint }>>`
        SELECT level, COUNT(*) as count
        FROM parking_spots
        WHERE isActive = 1 ${floorId ? Prisma.sql`AND floorId = ${floorId}` : Prisma.empty}
        GROUP BY level
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
        byLevel: {} as Record<number, number>,
        occupancyRate: 0,
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
      typeCounts.forEach(({ spotType, count }) => {
        stats.byType[spotType] = Number(count);
      });

      // Process level counts
      levelCounts.forEach(({ level, count }) => {
        stats.byLevel[level] = Number(count);
      });

      // Calculate occupancy rate
      if (stats.total > 0) {
        const occupiedCount = stats.occupied + stats.reserved;
        stats.occupancyRate = Math.round((occupiedCount / stats.total) * 10000) / 100; // 2 decimal places
      }

      this.logger.debug('Spot statistics calculated', {
        floorId,
        stats,
      });

      return stats;
    }, 'get spot statistics');
  }

  /**
   * Get availability by type for a floor
   * @param floorId - Floor ID
   * @param spotType - Optional spot type filter
   * @returns Availability statistics
   */
  async getAvailabilityStats(
    floorId: string,
    spotType?: SpotType
  ): Promise<{
    total: number;
    available: number;
    occupied: number;
    availabilityRate: number;
  }> {
    return this.executeWithRetry(async () => {
      const whereClause: any = {
        floorId,
        isActive: true,
      };

      if (spotType) {
        whereClause.spotType = spotType;
      }

      const total = await this.count(whereClause);
      const available = await this.count({
        ...whereClause,
        status: 'AVAILABLE',
      });
      const occupied = await this.count({
        ...whereClause,
        status: 'OCCUPIED',
      });

      const availabilityRate = total > 0 ? Math.round((available / total) * 10000) / 100 : 0;

      const stats = {
        total,
        available,
        occupied,
        availabilityRate,
      };

      this.logger.debug('Availability statistics calculated', {
        floorId,
        spotType,
        stats,
      });

      return stats;
    }, `get availability stats for floor: ${floorId}`);
  }

  /**
   * Bulk create spots for a floor
   * @param floorId - Floor ID
   * @param level - Level number
   * @param section - Section name
   * @param spotNumbers - Array of spot numbers to create
   * @param spotType - Spot type
   * @returns Array of created spots
   */
  async bulkCreateSpots(
    floorId: string,
    level: number,
    section: string,
    spotNumbers: string[],
    spotType: SpotType = 'STANDARD'
  ): Promise<ParkingSpot[]> {
    return this.executeWithRetry(async () => {
      const spotsData = spotNumbers.map(spotNumber => ({
        floorId,
        level,
        section,
        spotNumber,
        spotType,
        status: 'AVAILABLE' as SpotStatus,
      }));

      await this.createMany(spotsData);

      // Fetch the created spots
      const createdSpots = await this.delegate.findMany({
        where: {
          floorId,
          level,
          section,
          spotNumber: { in: spotNumbers },
          isActive: true,
        },
      });

      this.logger.info('Bulk created spots', {
        floorId,
        level,
        section,
        count: createdSpots.length,
        spotType,
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
        },
      });

      if (!vehicle) {
        throw new Error(`Vehicle with license plate ${licensePlate} not found`);
      }

      await this.occupyWithVehicle(spotId, vehicle.id);
      return true;
    } catch (error) {
      this.logger.error('Failed to occupy spot', error as Error, {
        spotId,
        licensePlate,
      });
      return false;
    }
  }

  /**
   * Legacy method compatibility - maintain existing API
   * @param spotId - Spot ID
   * @returns Success boolean
   */
  async vacateSpotLegacy(spotId: string): Promise<boolean> {
    try {
      await this.vacate(spotId);
      return true;
    } catch (error) {
      this.logger.error('Failed to vacate spot', error as Error, {
        spotId,
      });
      return false;
    }
  }
}

export default SpotRepository;
