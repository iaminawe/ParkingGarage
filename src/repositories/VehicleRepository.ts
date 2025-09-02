/**
<<<<<<< HEAD
 * Vehicle repository for data access operations using Prisma ORM
 * 
 * This module provides data access methods for vehicle records
 * using the repository pattern with Prisma integration. It handles 
 * vehicle CRUD operations, search functionality, and maintains data consistency.
=======
 * Vehicle repository for data access operations using Prisma
 * 
 * This module provides data access methods for vehicle records
 * using the PrismaAdapter pattern. It handles vehicle CRUD operations,
 * search functionality, and maintains data consistency.
>>>>>>> origin/main
 * 
 * @module VehicleRepository
 */

<<<<<<< HEAD
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
  protected readonly modelName = 'vehicle';
  protected readonly delegate: PrismaClient['vehicle'];

  constructor(databaseService?: DatabaseService) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prisma = dbService.getPrismaClient();
    super(prisma);
    this.model = prisma.vehicle;
    this.delegate = prisma.vehicle;
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
=======
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
>>>>>>> origin/main
  }

  /**
   * Find vehicle by license plate
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
  }

  /**
   * Find vehicles by owner
   * @param ownerId - Owner ID to search for
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
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