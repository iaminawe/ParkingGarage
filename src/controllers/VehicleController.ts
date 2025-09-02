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
import { VehicleRepository } from '../repositories/vehicleRepository';
import { SearchService } from '../services/searchService';
import Vehicle, { ExtendedVehicleData, FullVehicleRecord } from '../models/Vehicle';
import { 
  ApiResponse,
  PaginatedApiResponse 
} from '../types/api';
import { 
  VehicleRecord, 
  VehicleType, 
  RateType,
  VehicleStatus 
} from '../types/models';

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
  vehicleType?: VehicleType;
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
  byType: Record<VehicleType, number>;
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
  getAllVehicles = async (req: Request<{}, ApiResponse<FrontendVehicle[]>, {}, VehicleSearchQuery>, res: Response): Promise<void> => {
    try {
      const { 
        search, 
        vehicleType, 
        status, 
        page = '1', 
        limit = '20', 
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = req.query;

      let vehicles = this.vehicleRepository.findAll();

      // Apply filters
      if (search) {
        vehicles = vehicles.filter(vehicle => 
          vehicle.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
          (vehicle.make && vehicle.make.toLowerCase().includes(search.toLowerCase())) ||
          (vehicle.model && vehicle.model.toLowerCase().includes(search.toLowerCase())) ||
          (vehicle.ownerName && vehicle.ownerName.toLowerCase().includes(search.toLowerCase()))
        );
      }

      if (vehicleType) {
        vehicles = vehicles.filter(vehicle => vehicle.vehicleType === vehicleType);
      }

      if (status) {
        if (status === 'active') {
          vehicles = vehicles.filter(vehicle => !vehicle.isCheckedOut());
        } else if (status === 'inactive') {
          vehicles = vehicles.filter(vehicle => vehicle.isCheckedOut());
        } else {
          vehicles = vehicles.filter(vehicle => vehicle.getStatus() === status);
        }
      }

      // Apply sorting
      vehicles.sort((a, b) => {
        let aValue: any = a[sortBy as keyof Vehicle];
        let bValue: any = b[sortBy as keyof Vehicle];

        if (aValue === undefined) aValue = '';
        if (bValue === undefined) bValue = '';

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
      const paginatedVehicles = vehicles.slice(startIndex, endIndex);

      // Transform to frontend format
      const transformedVehicles = paginatedVehicles.map(vehicle => this.transformToFrontend(vehicle));

      res.status(200).json({
        success: true,
        data: transformedVehicles,
        pagination: {
          totalItems: vehicles.length,
          totalPages: Math.ceil(vehicles.length / limitNum),
          currentPage: pageNum,
          itemsPerPage: limitNum,
          hasNextPage: endIndex < vehicles.length,
          hasPreviousPage: pageNum > 1
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get all vehicles error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get vehicle by ID (license plate)
   * GET /api/vehicles/:id
   */
  getVehicleById = async (req: Request<{ id: string }>, res: Response<ApiResponse<FrontendVehicle>>): Promise<void> => {
    try {
      const { id } = req.params;
      const vehicle = this.vehicleRepository.findById(id);

      if (!vehicle) {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const transformedVehicle = this.transformToFrontend(vehicle);

      res.status(200).json({
        success: true,
        data: transformedVehicle,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get vehicle by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Create a new vehicle
   * POST /api/vehicles
   */
  createVehicle = async (req: Request<{}, ApiResponse<FrontendVehicle>, Partial<FrontendVehicle>>, res: Response): Promise<void> => {
    try {
      const vehicleData = req.body;

      // Check for existing vehicle
      const existingVehicle = this.vehicleRepository.findById(vehicleData.licensePlate!);
      if (existingVehicle) {
        res.status(409).json({
          success: false,
          message: `Vehicle with license plate ${vehicleData.licensePlate} already exists`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Map frontend data to backend format
      const backendVehicleData: ExtendedVehicleData = {
        licensePlate: vehicleData.licensePlate!,
        spotId: 'temp', // Will be assigned during check-in
        checkInTime: new Date().toISOString(),
        vehicleType: this.mapFrontendVehicleType(vehicleData.type || 'car'),
        rateType: 'hourly' as RateType,
        make: vehicleData.make,
        model: vehicleData.model,
        color: vehicleData.color,
        year: vehicleData.year,
        ownerId: vehicleData.ownerId,
        ownerName: vehicleData.ownerName,
        ownerEmail: vehicleData.ownerEmail,
        ownerPhone: vehicleData.ownerPhone,
        notes: vehicleData.notes
      };

      const vehicle = this.vehicleRepository.create(backendVehicleData);
      const transformedVehicle = this.transformToFrontend(vehicle);

      res.status(201).json({
        success: true,
        data: transformedVehicle,
        message: 'Vehicle created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Create vehicle error:', error);
      if ((error as Error).message.includes('already exists')) {
        res.status(409).json({
          success: false,
          message: 'Vehicle with this license plate already exists',
          timestamp: new Date().toISOString()
        });
      } else if ((error as Error).message.includes('Invalid vehicle data')) {
        res.status(400).json({
          success: false,
          message: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Update a vehicle
   * PUT /api/vehicles/:id
   */
  updateVehicle = async (req: Request<{ id: string }, ApiResponse<FrontendVehicle>, Partial<FrontendVehicle>>, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const vehicle = this.vehicleRepository.findById(id);
      if (!vehicle) {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Map frontend updates to backend format
      const backendUpdates: Partial<ExtendedVehicleData> = {};
      
      if (updates.type !== undefined) {
        backendUpdates.vehicleType = this.mapFrontendVehicleType(updates.type);
      }
      if (updates.make !== undefined) backendUpdates.make = updates.make;
      if (updates.model !== undefined) backendUpdates.model = updates.model;
      if (updates.color !== undefined) backendUpdates.color = updates.color;
      if (updates.year !== undefined) backendUpdates.year = updates.year;
      if (updates.ownerId !== undefined) backendUpdates.ownerId = updates.ownerId;
      if (updates.ownerName !== undefined) backendUpdates.ownerName = updates.ownerName;
      if (updates.ownerEmail !== undefined) backendUpdates.ownerEmail = updates.ownerEmail;
      if (updates.ownerPhone !== undefined) backendUpdates.ownerPhone = updates.ownerPhone;
      if (updates.notes !== undefined) backendUpdates.notes = updates.notes;

      // Update the vehicle using the model's update method
      const updateResult = vehicle.update(backendUpdates);

      if (!updateResult.isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid update data',
          errors: updateResult.errors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const transformedVehicle = this.transformToFrontend(vehicle);

      res.status(200).json({
        success: true,
        data: transformedVehicle,
        message: 'Vehicle updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Update vehicle error:', error);
      if ((error as Error).message.includes('immutable fields')) {
        res.status(400).json({
          success: false,
          message: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Delete a vehicle
   * DELETE /api/vehicles/:id
   */
  deleteVehicle = async (req: Request<{ id: string }>, res: Response<ApiResponse<void>>): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = this.vehicleRepository.delete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Vehicle deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Delete vehicle error:', error);
      if ((error as Error).message.includes('still parked')) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete vehicle that is currently parked. Check out the vehicle first.',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Bulk delete vehicles
   * POST /api/vehicles/bulk-delete
   */
  bulkDeleteVehicles = async (req: Request<{}, ApiResponse<any>, BulkDeleteRequest>, res: Response): Promise<void> => {
    try {
      const { vehicleIds } = req.body;

      const results = vehicleIds.map(id => {
        try {
          const deleted = this.vehicleRepository.delete(id);
          return { id, success: deleted, error: deleted ? null : 'Vehicle not found' };
        } catch (error) {
          return { id, success: false, error: (error as Error).message };
        }
      });

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      res.status(200).json({
        success: true,
        data: {
          total: vehicleIds.length,
          successful: successCount,
          failed: failureCount,
          results
        },
        message: `Bulk delete completed: ${successCount} successful, ${failureCount} failed`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Bulk delete vehicles error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get vehicle metrics/statistics
   * GET /api/vehicles/metrics
   */
  getVehicleMetrics = async (req: Request, res: Response<ApiResponse<VehicleMetrics>>): Promise<void> => {
    try {
      const vehicles = this.vehicleRepository.findAll();
      const parkedVehicles = this.vehicleRepository.findParked();
      const unpaidVehicles = this.vehicleRepository.findUnpaid();
      const completedSessions = this.vehicleRepository.findCompleted();

      const metrics: VehicleMetrics = {
        total: vehicles.length,
        parked: parkedVehicles.length,
        unpaid: unpaidVehicles.length,
        completed: completedSessions.length,
        byType: {
          compact: vehicles.filter(v => v.vehicleType === 'compact').length,
          standard: vehicles.filter(v => v.vehicleType === 'standard').length,
          oversized: vehicles.filter(v => v.vehicleType === 'oversized').length
        },
        byStatus: {
          active: vehicles.filter(v => !v.isCheckedOut()).length,
          inactive: vehicles.filter(v => v.isCheckedOut()).length,
          parked: parkedVehicles.length,
          checked_out_unpaid: unpaidVehicles.length,
          completed: completedSessions.length
        }
      };

      res.status(200).json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get vehicle metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
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
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.searchService.searchVehicles(search, {
        mode: mode as string,
        threshold: parseFloat(threshold as string),
        maxResults: parseInt(maxResults as string, 10)
      });

      res.json({
        success: true,
        ...result,
        data: result.vehicles || [],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Vehicle search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
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
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
      year: vehicle.year,
      type: this.mapVehicleType(vehicle.vehicleType),
      ownerId: vehicle.ownerId,
      ownerName: vehicle.ownerName,
      ownerEmail: vehicle.ownerEmail,
      ownerPhone: vehicle.ownerPhone,
      notes: vehicle.notes,
      status: vehicle.isCheckedOut() ? 'inactive' : 'active',
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt
    };
  }

  /**
   * Helper method to map backend VehicleType to frontend vehicle type
   */
  private mapVehicleType(backendType: VehicleType): 'car' | 'motorcycle' | 'truck' | 'van' | 'bus' {
    const typeMap: Record<VehicleType, 'car' | 'motorcycle' | 'truck' | 'van' | 'bus'> = {
      'compact': 'car',
      'standard': 'car',
      'oversized': 'truck'
    };
    return typeMap[backendType] || 'car';
  }

  /**
   * Helper method to map frontend vehicle type to backend VehicleType
   */
  private mapFrontendVehicleType(frontendType: 'car' | 'motorcycle' | 'truck' | 'van' | 'bus'): VehicleType {
    const typeMap: Record<string, VehicleType> = {
      'car': 'standard',
      'motorcycle': 'compact',
      'truck': 'oversized',
      'van': 'oversized',
      'bus': 'oversized'
    };
    return typeMap[frontendType] || 'standard';
  }
}

export default VehicleController;