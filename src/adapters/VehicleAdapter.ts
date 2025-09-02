/**
 * Vehicle adapter implementation
 *
 * This class extends PrismaAdapter to provide vehicle-specific
 * database operations with proper typing and business logic.
 *
 * @module VehicleAdapter
 */

import { Vehicle, Prisma, PrismaClient, VehicleStatus, VehicleType } from '@prisma/client';
import { PrismaAdapter } from './PrismaAdapter';
import { IAdapterLogger } from './interfaces/BaseAdapter';
import { RetryConfig } from '../utils/prisma-errors';

/**
 * Vehicle creation data type
 */
export type VehicleCreateData = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Vehicle update data type
 */
export type VehicleUpdateData = Partial<Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Vehicle adapter class extending PrismaAdapter
 */
export class VehicleAdapter extends PrismaAdapter<Vehicle, VehicleCreateData, VehicleUpdateData> {
  protected readonly modelName = 'vehicle';
  protected readonly delegate: typeof PrismaClient.prototype.vehicle;

  constructor(prisma?: PrismaClient, logger?: IAdapterLogger, retryConfig?: Partial<RetryConfig>) {
    super(prisma, logger, retryConfig);
    this.delegate = this.prisma.vehicle;
  }

  /**
   * Find vehicle by license plate
   */
  async findByLicensePlate(
    licensePlate: string,
    tx?: Prisma.TransactionClient
  ): Promise<Vehicle | null> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client.vehicle.findFirst({
        where: {
          licensePlate: licensePlate.toUpperCase(),
        },
      });

      this.logger.debug('Found vehicle by license plate', {
        licensePlate,
        found: !!result,
        model: this.modelName,
      });

      return result;
    }, 'find vehicle by license plate');
  }

  /**
   * Find vehicles by status
   */
  async findByStatus(status: VehicleStatus, tx?: Prisma.TransactionClient): Promise<Vehicle[]> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client.vehicle.findMany({
        where: {
          status,
          deletedAt: null,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      this.logger.debug('Found vehicles by status', {
        status,
        count: result.length,
        model: this.modelName,
      });

      return result;
    }, 'find vehicles by status');
  }

  /**
   * Find vehicles by type
   */
  async findByVehicleType(
    vehicleType: VehicleType,
    tx?: Prisma.TransactionClient
  ): Promise<Vehicle[]> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client.vehicle.findMany({
        where: {
          vehicleType,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.debug('Found vehicles by type', {
        vehicleType,
        count: result.length,
        model: this.modelName,
      });

      return result;
    }, 'find vehicles by type');
  }

  /**
   * Find currently parked vehicles (those with currentSpotId)
   */
  async findCurrentlyParked(tx?: Prisma.TransactionClient): Promise<Vehicle[]> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client.vehicle.findMany({
        where: {
          currentSpotId: { not: null },
          deletedAt: null,
        },
        include: {
          spot: {
            select: {
              id: true,
              spotNumber: true,
              level: true,
              section: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      this.logger.debug('Found currently parked vehicles', {
        count: result.length,
        model: this.modelName,
      });

      return result;
    }, 'find currently parked vehicles');
  }

  /**
   * Search vehicles with multiple criteria
   */
  async searchVehicles(
    criteria: {
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
    },
    tx?: Prisma.TransactionClient
  ): Promise<Vehicle[]> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const where: any = {
        deletedAt: null,
      };

      // Add search conditions
      if (criteria.licensePlate) {
        where.licensePlate = {
          contains: criteria.licensePlate.toUpperCase(),
          mode: 'insensitive',
        };
      }

      if (criteria.vehicleType) {
        where.vehicleType = criteria.vehicleType;
      }

      if (criteria.make) {
        where.make = {
          contains: criteria.make,
          mode: 'insensitive',
        };
      }

      if (criteria.model) {
        where.model = {
          contains: criteria.model,
          mode: 'insensitive',
        };
      }

      if (criteria.color) {
        where.color = {
          contains: criteria.color,
          mode: 'insensitive',
        };
      }

      if (criteria.ownerName) {
        where.ownerName = {
          contains: criteria.ownerName,
          mode: 'insensitive',
        };
      }

      if (criteria.ownerEmail) {
        where.ownerEmail = {
          contains: criteria.ownerEmail,
          mode: 'insensitive',
        };
      }

      if (criteria.status) {
        where.status = criteria.status;
      }

      if (criteria.yearFrom || criteria.yearTo) {
        where.year = {};
        if (criteria.yearFrom) {
          where.year.gte = criteria.yearFrom;
        }
        if (criteria.yearTo) {
          where.year.lte = criteria.yearTo;
        }
      }

      const result = await client.vehicle.findMany({
        where,
        orderBy: {
          updatedAt: 'desc',
        },
      });

      this.logger.debug('Searched vehicles', {
        criteria,
        count: result.length,
        model: this.modelName,
      });

      return result;
    }, 'search vehicles');
  }

  /**
   * Update vehicle license plate with validation
   */
  async updateLicensePlate(
    id: string,
    newLicensePlate: string,
    tx?: Prisma.TransactionClient
  ): Promise<Vehicle> {
    return this.executeWithRetry(async () => {
      const normalizedPlate = newLicensePlate.toUpperCase();

      // Check if the new license plate is already taken
      const existing = await this.findByLicensePlate(normalizedPlate, tx);
      if (existing && existing.id !== id) {
        throw new Error(`License plate ${normalizedPlate} is already in use`);
      }

      const client = tx || this.prisma;
      const result = await client.vehicle.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          licensePlate: normalizedPlate,
          updatedAt: new Date(),
        },
      });

      this.logger.info('Updated vehicle license plate', {
        id,
        oldPlate: 'hidden',
        newPlate: normalizedPlate,
        model: this.modelName,
      });

      return result;
    }, 'update vehicle license plate');
  }

  /**
   * Assign vehicle to parking spot
   */
  async assignToSpot(
    vehicleId: string,
    spotId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Vehicle> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;

      // Update vehicle with current spot
      const result = await client.vehicle.update({
        where: {
          id: vehicleId,
          deletedAt: null,
        },
        data: {
          currentSpotId: spotId,
          status: VehicleStatus.ACTIVE, // Assuming vehicle becomes active when parked
          updatedAt: new Date(),
        },
        include: {
          currentSpot: true,
        },
      });

      this.logger.info('Assigned vehicle to spot', {
        vehicleId,
        spotId,
        model: this.modelName,
      });

      return result;
    }, 'assign vehicle to spot');
  }

  /**
   * Remove vehicle from parking spot
   */
  async removeFromSpot(vehicleId: string, tx?: Prisma.TransactionClient): Promise<Vehicle> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;

      const result = await client.vehicle.update({
        where: {
          id: vehicleId,
          deletedAt: null,
        },
        data: {
          currentSpotId: null,
          updatedAt: new Date(),
        },
      });

      this.logger.info('Removed vehicle from spot', {
        vehicleId,
        model: this.modelName,
      });

      return result;
    }, 'remove vehicle from spot');
  }

  /**
   * Get vehicle statistics
   */
  async getStatistics(tx?: Prisma.TransactionClient): Promise<{
    total: number;
    active: number;
    blocked: number;
    banned: number;
    inactive: number;
    currentlyParked: number;
    byType: Record<string, number>;
  }> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;

      // Get counts by status
      const [total, active, blocked, banned, inactive, currentlyParked, typeStats] =
        await Promise.all([
          client.vehicle.count({ where: { deletedAt: null } }),
          client.vehicle.count({ where: { status: VehicleStatus.ACTIVE, deletedAt: null } }),
          client.vehicle.count({ where: { status: VehicleStatus.PARKED, deletedAt: null } }),
          client.vehicle.count({ where: { status: VehicleStatus.DEPARTED, deletedAt: null } }),
          client.vehicle.count({ where: { status: VehicleStatus.INACTIVE, deletedAt: null } }),
          client.vehicle.count({ where: { currentSpotId: { not: null }, deletedAt: null } }),
          client.vehicle.groupBy({
            by: ['vehicleType'],
            where: { deletedAt: null },
            _count: { id: true },
          }),
        ]);

      const byType = typeStats.reduce(
        (acc, stat) => {
          acc[stat.vehicleType] = stat._count.id;
          return acc;
        },
        {} as Record<string, number>
      );

      const statistics = {
        total,
        active,
        blocked,
        banned,
        inactive,
        currentlyParked,
        byType,
      };

      this.logger.debug('Retrieved vehicle statistics', {
        statistics,
        model: this.modelName,
      });

      return statistics;
    }, 'get vehicle statistics');
  }
}
