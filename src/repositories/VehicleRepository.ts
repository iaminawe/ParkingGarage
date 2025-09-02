/**
 * Vehicle repository for data access operations using Prisma
 * 
 * This module provides data access methods for vehicle records
 * using the PrismaAdapter pattern. It handles vehicle CRUD operations,
 * search functionality, and maintains data consistency.
 * 
 * @module VehicleRepository
 */

import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { Vehicle, Prisma, VehicleType, VehicleStatus } from '../generated/prisma';
import type { 
  QueryOptions,
  PaginatedResult,
  IAdapterLogger
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * Vehicle creation data interface
 */
export interface CreateVehicleData {
  licensePlate: string;
  vehicleType?: VehicleType;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  status?: VehicleStatus;
}

/**
 * Vehicle update data interface
 */
export interface UpdateVehicleData {
  licensePlate?: string;
  vehicleType?: VehicleType;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  status?: VehicleStatus;
}

/**
 * Vehicle search criteria interface
 */
export interface VehicleSearchCriteria {
  licensePlate?: string;
  vehicleType?: VehicleType;
  make?: string;
  model?: string;
  color?: string;
  ownerName?: string;
  ownerEmail?: string;
  status?: VehicleStatus;
  yearFrom?: number;
  yearTo?: number;
}

/**
 * Vehicle statistics interface
 */
export interface VehicleStats {
  total: number;
  byStatus: Record<VehicleStatus, number>;
  byType: Record<VehicleType, number>;
  totalRevenue: number;
  averageSessionDuration: number;
}

/**
 * Repository for managing vehicle records using Prisma
 */
export class VehicleRepository extends PrismaAdapter<Vehicle, CreateVehicleData, UpdateVehicleData> {
  protected readonly modelName = 'vehicle';
  protected readonly delegate: Prisma.VehicleDelegate;

  constructor(
    databaseService?: DatabaseService,
    logger?: IAdapterLogger
  ) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prismaClient = dbService.getClient();
    
    super(prismaClient, logger || createLogger('VehicleRepository'));
    this.delegate = prismaClient.vehicle;
  }

  /**
   * Find vehicle by license plate
   * @param licensePlate - License plate to find
   * @param options - Query options
   * @param tx - Optional transaction client
   * @returns Found vehicle or null
   */
  async findByLicensePlate(
    licensePlate: string,
    options?: QueryOptions,
    tx?: Prisma.TransactionClient
  ): Promise<Vehicle | null> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client.vehicle.findFirst({
        where: {
          licensePlate: licensePlate.toUpperCase(),
          deletedAt: null
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found vehicle by license plate', {
        licensePlate,
        found: !!result
      });
      
      return result;
    }, `find vehicle by license plate: ${licensePlate}`);
  }

  /**
   * Find vehicles by status
   * @param status - Vehicle status to filter by
   * @param options - Query options
   * @returns Array of vehicles matching the status
   */
  async findByStatus(
    status: VehicleStatus,
    options?: QueryOptions
  ): Promise<Vehicle[]> {
    return this.findMany({ status }, options);
  }

  /**
   * Find vehicles by type
   * @param vehicleType - Vehicle type to filter by
   * @param options - Query options
   * @returns Array of vehicles matching the type
   */
  async findByType(
    vehicleType: VehicleType,
    options?: QueryOptions
  ): Promise<Vehicle[]> {
    return this.findMany({ vehicleType }, options);
  }

  /**
   * Find vehicles by owner
   * @param ownerId - Owner ID to search for
   * @param options - Query options
   * @returns Array of vehicles belonging to the owner
   */
  async findByOwner(
    ownerName: string,
    options?: QueryOptions
  ): Promise<Vehicle[]> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findMany({
        where: {
          ownerName: {
            contains: ownerName,
            mode: 'insensitive'
          },
          deletedAt: null
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found vehicles by owner', {
        ownerName,
        count: result.length
      });
      
      return result;
    }, `find vehicles by owner: ${ownerName}`);
  }

  /**
   * Find vehicles by make and model
   * @param make - Vehicle make (optional)
   * @param model - Vehicle model (optional)
   * @param options - Query options
   * @returns Array of vehicles matching criteria
   */
  async findByMakeModel(
    make?: string,
    model?: string,
    options?: QueryOptions
  ): Promise<Vehicle[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.VehicleWhereInput = {
        deletedAt: null
      };

      if (make) {
        whereClause.make = {
          contains: make,
          mode: 'insensitive'
        };
      }

      if (model) {
        whereClause.model = {
          contains: model,
          mode: 'insensitive'
        };
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found vehicles by make/model', {
        make,
        model,
        count: result.length
      });
      
      return result;
    }, `find vehicles by make/model: ${make}/${model}`);
  }

  /**
   * Search vehicles with multiple criteria
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Array of vehicles matching all criteria
   */
  async search(
    criteria: VehicleSearchCriteria,
    options?: QueryOptions
  ): Promise<Vehicle[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.VehicleWhereInput = {
        deletedAt: null
      };

      // License plate search
      if (criteria.licensePlate) {
        whereClause.licensePlate = {
          contains: criteria.licensePlate.toUpperCase(),
          mode: 'insensitive'
        };
      }

      // Exact matches
      if (criteria.vehicleType) {
        whereClause.vehicleType = criteria.vehicleType;
      }

      if (criteria.status) {
        whereClause.status = criteria.status;
      }

      // Text searches
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

      // Year range
      if (criteria.yearFrom || criteria.yearTo) {
        whereClause.year = {};
        if (criteria.yearFrom) {
          whereClause.year.gte = criteria.yearFrom;
        }
        if (criteria.yearTo) {
          whereClause.year.lte = criteria.yearTo;
        }
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Vehicle search completed', {
        criteria,
        count: result.length
      });
      
      return result;
    }, 'search vehicles');
  }

  /**
   * Find vehicles with active parking sessions
   * @param options - Query options
   * @returns Array of vehicles currently parked
   */
  async findCurrentlyParked(options?: QueryOptions): Promise<Vehicle[]> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findMany({
        where: {
          currentSpotId: {
            not: null
          },
          sessions: {
            some: {
              status: 'ACTIVE',
              deletedAt: null
            }
          },
          deletedAt: null
        },
        include: {
          currentSpot: true,
          sessions: {
            where: {
              status: 'ACTIVE',
              deletedAt: null
            },
            take: 1,
            orderBy: {
              checkInTime: 'desc'
            }
          }
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found currently parked vehicles', {
        count: result.length
      });
      
      return result;
    }, 'find currently parked vehicles');
  }

  /**
   * Get vehicle statistics
   * @returns Vehicle statistics
   */
  async getStats(): Promise<VehicleStats> {
    return this.executeWithRetry(async () => {
      const totalCount = await this.count();
      
      // Count by status
      const statusCounts = await this.prisma.$queryRaw<
        Array<{ status: VehicleStatus; count: bigint }>
      >`
        SELECT status, COUNT(*) as count
        FROM vehicles
        WHERE deletedAt IS NULL
        GROUP BY status
      `;

      // Count by type
      const typeCounts = await this.prisma.$queryRaw<
        Array<{ vehicleType: VehicleType; count: bigint }>
      >`
        SELECT vehicleType, COUNT(*) as count
        FROM vehicles
        WHERE deletedAt IS NULL
        GROUP BY vehicleType
      `;

      // Calculate revenue and average session duration
      const revenueAndDuration = await this.prisma.$queryRaw<
        Array<{
          totalRevenue: number | null;
          avgDuration: number | null;
        }>
      >`
        SELECT 
          SUM(ps.totalAmount) as totalRevenue,
          AVG(ps.durationMinutes) as avgDuration
        FROM parking_sessions ps
        JOIN vehicles v ON v.id = ps.vehicleId
        WHERE v.deletedAt IS NULL
          AND ps.deletedAt IS NULL
          AND ps.isPaid = 1
      `;

      // Build result
      const byStatus = {} as Record<VehicleStatus, number>;
      statusCounts.forEach(({ status, count }) => {
        byStatus[status] = Number(count);
      });

      const byType = {} as Record<VehicleType, number>;
      typeCounts.forEach(({ vehicleType, count }) => {
        byType[vehicleType] = Number(count);
      });

      const stats: VehicleStats = {
        total: totalCount,
        byStatus,
        byType,
        totalRevenue: revenueAndDuration[0]?.totalRevenue || 0,
        averageSessionDuration: revenueAndDuration[0]?.avgDuration || 0
      };

      this.logger.debug('Vehicle statistics calculated', stats);
      
      return stats;
    }, 'get vehicle statistics');
  }

  /**
   * Get vehicles that have been parked for more than specified hours
   * @param maxHours - Maximum allowed parking hours
   * @param options - Query options
   * @returns Array of overstaying vehicles
   */
  async findOverstayed(
    maxHours: number = 24,
    options?: QueryOptions
  ): Promise<Vehicle[]> {
    return this.executeWithRetry(async () => {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - maxHours);

      const result = await this.delegate.findMany({
        where: {
          currentSpotId: {
            not: null
          },
          sessions: {
            some: {
              status: 'ACTIVE',
              checkInTime: {
                lte: cutoffTime
              },
              deletedAt: null
            }
          },
          deletedAt: null
        },
        include: {
          currentSpot: true,
          sessions: {
            where: {
              status: 'ACTIVE',
              deletedAt: null
            },
            take: 1,
            orderBy: {
              checkInTime: 'desc'
            }
          }
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug('Found overstayed vehicles', {
        maxHours,
        count: result.length,
        cutoffTime
      });
      
      return result;
    }, `find overstayed vehicles (max ${maxHours}h)`);
  }

  /**
   * Update vehicle with license plate validation
   * @param id - Vehicle ID
   * @param data - Update data
   * @param options - Query options
   * @returns Updated vehicle
   */
  async updateWithValidation(
    id: string,
    data: UpdateVehicleData,
    options?: QueryOptions
  ): Promise<Vehicle> {
    return this.executeWithRetry(async () => {
      // If updating license plate, check for uniqueness
      if (data.licensePlate) {
        const normalizedPlate = data.licensePlate.toUpperCase();
        const existing = await this.delegate.findFirst({
          where: {
            licensePlate: normalizedPlate,
            id: { not: id },
            deletedAt: null
          }
        });

        if (existing) {
          throw new Error(`Vehicle with license plate ${normalizedPlate} already exists`);
        }

        data.licensePlate = normalizedPlate;
      }

      return this.update(id, data, options);
    }, `update vehicle with validation: ${id}`);
  }

  /**
   * Create vehicle with license plate normalization
   * @param data - Vehicle creation data
   * @returns Created vehicle
   */
  async createWithValidation(data: CreateVehicleData): Promise<Vehicle> {
    return this.executeWithRetry(async () => {
      // Normalize license plate
      const normalizedPlate = data.licensePlate.toUpperCase();
      
      // Check for uniqueness
      const existing = await this.delegate.findFirst({
        where: {
          licensePlate: normalizedPlate,
          deletedAt: null
        }
      });

      if (existing) {
        throw new Error(`Vehicle with license plate ${normalizedPlate} already exists`);
      }

      return this.create({
        ...data,
        licensePlate: normalizedPlate
      });
    }, 'create vehicle with validation');
  }

  /**
   * Legacy method compatibility - find by ID using license plate
   * @param licensePlate - License plate as ID
   * @returns Found vehicle or null
   * @deprecated Use findByLicensePlate instead
   */
  async findById(
    licensePlate: string,
    options?: QueryOptions
  ): Promise<Vehicle | null> {
    // For backward compatibility, if the ID looks like a license plate, search by it
    if (licensePlate && licensePlate.length <= 10 && !licensePlate.includes('-')) {
      return this.findByLicensePlate(licensePlate, options);
    }
    
    // Otherwise, use standard ID lookup
    return super.findById(licensePlate, options);
  }
}

export default VehicleRepository;