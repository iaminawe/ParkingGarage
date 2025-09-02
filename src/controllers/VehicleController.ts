/**
 * Vehicle controller for comprehensive vehicle management
 *
 * This controller handles HTTP requests for vehicle CRUD operations,
 * owner management, and search functionality. It provides complete
 * vehicle lifecycle management with proper error handling and validation.
 *
 * @module VehicleController
 */

import { Request, Response } from 'express';
import { VehicleRepository } from '../repositories/VehicleRepository';
import { SearchService } from '../services/searchService';
import { Vehicle, VehicleType, RateType } from '@prisma/client';
import { ApiResponse, PaginatedApiResponse } from '../types/api';
import { VehicleRecord, VehicleType as LegacyVehicleType, VehicleStatus } from '../types/models';

// Frontend vehicle interface (for API compatibility)
interface FrontendVehicle {
  id: string;
  licensePlate: string;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  type: 'car' | 'motorcycle' | 'truck' | 'van' | 'bus';
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface VehicleSearchQuery {
  search?: string;
  vehicleType?: LegacyVehicleType;
  status?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface BulkDeleteRequest {
  vehicleIds: string[];
}

interface VehicleMetrics {
  total: number;
  parked: number;
  unpaid: number;
  completed: number;
  byType: Record<LegacyVehicleType, number>;
  byStatus: Record<string, number>;
}

export class VehicleController {
  private vehicleRepository: VehicleRepository;
  private searchService: SearchService;

  constructor() {
    this.vehicleRepository = new VehicleRepository();
    this.searchService = new SearchService();
  }

  /**
   * Get all vehicles with pagination and filtering
   * GET /api/vehicles
   */
  getAllVehicles = async (
    req: Request<{}, ApiResponse<FrontendVehicle[]>, {}, VehicleSearchQuery>,
    res: Response
  ): Promise<void> => {
    try {
      const {
        search,
        vehicleType,
        status,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      // Build search criteria for database query
      const searchCriteria: any = {};

      if (search) {
        searchCriteria.licensePlate = search;
      }

      if (vehicleType) {
        searchCriteria.vehicleType = vehicleType;
      }

      // Use repository's search method for efficient database queries
      const vehicles = await this.vehicleRepository.search(searchCriteria);

      // Apply any additional filtering that couldn't be done at database level
      const filteredVehicles = vehicles;

      // Apply sorting (if needed beyond database ordering)
      filteredVehicles.sort((a, b) => {
        let aValue: any = (a as any)[sortBy];
        let bValue: any = (b as any)[sortBy];

        if (aValue === undefined) {
          aValue = '';
        }
        if (bValue === undefined) {
          bValue = '';
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      // Apply pagination
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex);

      // Transform to frontend format
      const transformedVehicles = paginatedVehicles.map(vehicle =>
        this.transformToFrontend(vehicle)
      );

      res.status(200).json({
        success: true,
        data: transformedVehicles,
        pagination: {
          totalItems: filteredVehicles.length,
          totalPages: Math.ceil(filteredVehicles.length / limitNum),
          currentPage: pageNum,
          itemsPerPage: limitNum,
          hasNextPage: endIndex < filteredVehicles.length,
          hasPreviousPage: pageNum > 1,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get all vehicles error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get vehicle by ID (license plate)
   * GET /api/vehicles/:id
   */
  getVehicleById = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<FrontendVehicle>>
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const vehicle = await this.vehicleRepository.findByLicensePlate(id);

      if (!vehicle) {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const transformedVehicle = this.transformToFrontend(vehicle);

      res.status(200).json({
        success: true,
        data: transformedVehicle,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get vehicle by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Create a new vehicle
   * POST /api/vehicles
   */
  createVehicle = async (
    req: Request<{}, ApiResponse<FrontendVehicle>, Partial<FrontendVehicle>>,
    res: Response
  ): Promise<void> => {
    try {
      const vehicleData = req.body;

      // Check for existing vehicle
      const existingVehicle = await this.vehicleRepository.findByLicensePlate(
        vehicleData.licensePlate!
      );
      if (existingVehicle) {
        res.status(409).json({
          success: false,
          message: `Vehicle with license plate ${vehicleData.licensePlate} already exists`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Map frontend data to backend format
      const backendVehicleData = {
        licensePlate: vehicleData.licensePlate!,
        spotId: 'temp', // Will be assigned during check-in
        vehicleType: this.mapFrontendVehicleTypeToEnum(vehicleData.type || 'car'),
        rateType: RateType.HOURLY,
        make: vehicleData.make,
        model: vehicleData.model,
        color: vehicleData.color,
        year: vehicleData.year,
        ownerId: vehicleData.ownerId,
        ownerName: vehicleData.ownerName,
        ownerEmail: vehicleData.ownerEmail,
        ownerPhone: vehicleData.ownerPhone,
        notes: vehicleData.notes,
      };

      const vehicle = await this.vehicleRepository.create(backendVehicleData);
      const transformedVehicle = this.transformToFrontend(vehicle);

      res.status(201).json({
        success: true,
        data: transformedVehicle,
        message: 'Vehicle created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Create vehicle error:', error);
      if ((error as Error).message.includes('already exists')) {
        res.status(409).json({
          success: false,
          message: 'Vehicle with this license plate already exists',
          timestamp: new Date().toISOString(),
        });
      } else if ((error as Error).message.includes('Invalid vehicle data')) {
        res.status(400).json({
          success: false,
          message: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          errors: [
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : 'Internal server error',
          ],
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  /**
   * Update a vehicle
   * PUT /api/vehicles/:id
   */
  updateVehicle = async (
    req: Request<{ id: string }, ApiResponse<FrontendVehicle>, Partial<FrontendVehicle>>,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const vehicle = await this.vehicleRepository.findByLicensePlate(id);
      if (!vehicle) {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Map frontend updates to backend format
      const backendUpdates: any = {};

      if (updates.type !== undefined) {
        backendUpdates.vehicleType = this.mapFrontendVehicleTypeToEnum(updates.type);
      }
      if (updates.make !== undefined) {
        backendUpdates.make = updates.make;
      }
      if (updates.model !== undefined) {
        backendUpdates.model = updates.model;
      }
      if (updates.color !== undefined) {
        backendUpdates.color = updates.color;
      }
      if (updates.year !== undefined) {
        backendUpdates.year = updates.year;
      }
      if (updates.ownerId !== undefined) {
        backendUpdates.ownerId = updates.ownerId;
      }
      if (updates.ownerName !== undefined) {
        backendUpdates.ownerName = updates.ownerName;
      }
      if (updates.ownerEmail !== undefined) {
        backendUpdates.ownerEmail = updates.ownerEmail;
      }
      if (updates.ownerPhone !== undefined) {
        backendUpdates.ownerPhone = updates.ownerPhone;
      }
      if (updates.notes !== undefined) {
        backendUpdates.notes = updates.notes;
      }

      // Update the vehicle using the repository's update method
      const updatedVehicle = await this.vehicleRepository.update(id, backendUpdates);

      const transformedVehicle = this.transformToFrontend(updatedVehicle);

      res.status(200).json({
        success: true,
        data: transformedVehicle,
        message: 'Vehicle updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update vehicle error:', error);
      if ((error as any)?.code === 'P2025') {
        // Prisma error for record not found
        res.status(404).json({
          success: false,
          message: 'Vehicle not found',
          timestamp: new Date().toISOString(),
        });
      } else if ((error as Error).message.includes('immutable fields')) {
        res.status(400).json({
          success: false,
          message: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          errors: [
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : 'Internal server error',
          ],
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  /**
   * Delete a vehicle
   * DELETE /api/vehicles/:id
   */
  deleteVehicle = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<void>>
  ): Promise<void> => {
    try {
      const { id } = req.params;
      await this.vehicleRepository.delete(id);

      // If we get here, the vehicle was successfully deleted
      // Prisma throws an error if the record doesn't exist

      res.status(200).json({
        success: true,
        message: 'Vehicle deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Delete vehicle error:', error);
      if ((error as any)?.code === 'P2025') {
        // Prisma error for record not found
        res.status(404).json({
          success: false,
          message: 'Vehicle not found',
          timestamp: new Date().toISOString(),
        });
      } else if ((error as Error).message.includes('still parked')) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete vehicle that is currently parked. Check out the vehicle first.',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          errors: [
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : 'Internal server error',
          ],
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  /**
   * Bulk delete vehicles
   * POST /api/vehicles/bulk-delete
   */
  bulkDeleteVehicles = async (
    req: Request<{}, ApiResponse<any>, BulkDeleteRequest>,
    res: Response
  ): Promise<void> => {
    try {
      const { vehicleIds } = req.body;

      const results = await Promise.all(
        vehicleIds.map(async id => {
          try {
            await this.vehicleRepository.delete(id);
            return { id, success: true, error: null };
          } catch (error) {
            return { id, success: false, error: (error as Error).message };
          }
        })
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      res.status(200).json({
        success: true,
        data: {
          total: vehicleIds.length,
          successful: successCount,
          failed: failureCount,
          results,
        },
        message: `Bulk delete completed: ${successCount} successful, ${failureCount} failed`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Bulk delete vehicles error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get vehicle metrics/statistics
   * GET /api/vehicles/metrics
   */
  getVehicleMetrics = async (
    req: Request,
    res: Response<ApiResponse<VehicleMetrics>>
  ): Promise<void> => {
    try {
      const vehicles = await this.vehicleRepository.findMany();
      const parkedVehicles = vehicles.filter(v => v.spotId && !v.checkOutTime);
      const unpaidVehicles = vehicles.filter(v => !v.isPaid && v.checkOutTime);
      const completedSessions = vehicles.filter(v => v.checkOutTime && v.isPaid);

      const metrics: VehicleMetrics = {
        total: vehicles.length,
        parked: parkedVehicles.length,
        unpaid: unpaidVehicles.length,
        completed: completedSessions.length,
        byType: {
          compact: vehicles.filter(v => v.vehicleType === 'COMPACT').length,
          standard: vehicles.filter(v => v.vehicleType === 'STANDARD').length,
          oversized: vehicles.filter(v => v.vehicleType === 'OVERSIZED').length,
        },
        byStatus: {
          active: vehicles.filter(v => !v.checkOutTime).length,
          inactive: vehicles.filter(v => !!v.checkOutTime).length,
          parked: parkedVehicles.length,
          checked_out_unpaid: unpaidVehicles.length,
          completed: completedSessions.length,
        },
      };

      res.status(200).json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get vehicle metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Search vehicles (legacy endpoint for compatibility)
   * GET /api/vehicles/search
   */
  searchVehicles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { search, mode = 'all', threshold = '0.6', maxResults = '20' } = req.query;

      if (!search || typeof search !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search parameter is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.searchService.searchVehicles(search, {
        mode: mode as 'partial' | 'fuzzy' | 'all',
        threshold: parseFloat(threshold as string),
        maxResults: parseInt(maxResults as string, 10),
      });

      res.json({
        success: true,
        ...result,
        data: result.matches || [],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Vehicle search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Helper method to transform backend Vehicle to frontend format
   */
  private transformToFrontend(vehicle: Vehicle): FrontendVehicle {
    return {
      id: vehicle.licensePlate,
      licensePlate: vehicle.licensePlate,
      make: vehicle.make || undefined,
      model: vehicle.model || undefined,
      color: vehicle.color || undefined,
      year: vehicle.year || undefined,
      type: this.mapVehicleType(vehicle.vehicleType),
      ownerId: vehicle.ownerId || undefined,
      ownerName: vehicle.ownerName || undefined,
      ownerEmail: vehicle.ownerEmail || undefined,
      ownerPhone: vehicle.ownerPhone || undefined,
      notes: vehicle.notes || undefined,
      status: vehicle.checkOutTime ? 'inactive' : 'active',
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    };
  }

  /**
   * Helper method to map backend VehicleType to frontend vehicle type
   */
  private mapVehicleType(backendType: string): 'car' | 'motorcycle' | 'truck' | 'van' | 'bus' {
    const typeMap: Record<string, 'car' | 'motorcycle' | 'truck' | 'van' | 'bus'> = {
      COMPACT: 'car',
      STANDARD: 'car',
      OVERSIZED: 'truck',
    };
    return typeMap[backendType] || 'car';
  }

  /**
   * Helper method to map frontend vehicle type to backend VehicleType
   */
  private mapFrontendVehicleTypeToEnum(
    frontendType: 'car' | 'motorcycle' | 'truck' | 'van' | 'bus'
  ): VehicleType {
    const typeMap: Record<string, VehicleType> = {
      car: VehicleType.STANDARD,
      motorcycle: VehicleType.COMPACT,
      truck: VehicleType.OVERSIZED,
      van: VehicleType.OVERSIZED,
      bus: VehicleType.OVERSIZED,
    };
    return typeMap[frontendType] || VehicleType.STANDARD;
  }
}

export default VehicleController;
