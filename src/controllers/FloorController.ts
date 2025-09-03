/**
 * Floor controller for HTTP request handling
 *
 * This module handles HTTP requests for floor operations, including
 * listing, creating, updating, and deleting floors.
 * Follows RESTful API conventions with proper error handling.
 *
 * @module FloorController
 */

import { Request, Response } from 'express';
import { FloorService } from '../services/FloorService';
import { CreateFloorData, UpdateFloorData } from '../repositories/FloorRepository';

interface FloorFilters {
  garageId?: string;
  floorNumber?: number;
  isActive?: boolean;
  hasAvailableSpots?: boolean;
}

interface FloorQuery extends FloorFilters {
  limit?: string;
  offset?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  include?: string;
}

interface FloorCreateRequest {
  garageId: string;
  floorNumber: number;
  description?: string;
  totalSpots?: number;
  isActive?: boolean;
}

interface FloorUpdateRequest {
  garageId?: string;
  floorNumber?: number;
  description?: string;
  totalSpots?: number;
  isActive?: boolean;
}

interface RequestWithFilters extends Request {
  filters?: FloorFilters;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Controller class for floor operations
 */
export class FloorController {
  private floorService: FloorService;

  constructor() {
    this.floorService = new FloorService();
  }

  /**
   * GET /api/floors
   * List all floors with filtering and pagination
   */
  getFloors = async (
    req: RequestWithFilters & Request<{}, any, {}, FloorQuery>,
    res: Response
  ): Promise<void> => {
    try {
      const filters: FloorFilters = {
        garageId: req.query.garageId,
        floorNumber: req.query.floorNumber ? parseInt(req.query.floorNumber.toString(), 10) : undefined,
        isActive: req.query.isActive !== undefined ? String(req.query.isActive) === 'true' : undefined,
        hasAvailableSpots: req.query.hasAvailableSpots !== undefined ? String(req.query.hasAvailableSpots) === 'true' : undefined,
      };

      const pagination = {
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
        offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
      };

      const sorting = {
        sort: req.query.sort,
        order: req.query.order,
      };

      const result = await this.floorService.getFloors(filters, pagination, sorting);

      // Create response with pagination metadata
      const response = {
        success: true,
        data: result.floors,
        pagination: result.pagination,
        metadata: result.metadata,
        timestamp: new Date().toISOString(),
      };

      // Add navigation hints for better UX
      if (result.pagination?.hasMore) {
        const nextLink = `${req.baseUrl}${req.path}?limit=${result.pagination.limit}&offset=${result.pagination.nextOffset}`;
        
        // Add current filters to next link
        const filterParams = Object.entries(filters)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
          .join('&');

        (response as any).links = {
          next: filterParams ? `${nextLink}&${filterParams}` : nextLink,
        };
      }

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getFloors:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving floors',
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
   * GET /api/floors/:id
   * Get individual floor details with spots information
   */
  getFloorById = async (
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const floor = await this.floorService.getFloorById(id);

      if (!floor) {
        res.status(404).json({
          success: false,
          message: `Floor with ID '${id}' not found`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: floor,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error in getFloorById for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving floor',
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
   * POST /api/floors
   * Create a new floor
   */
  createFloor = async (
    req: Request<{}, any, FloorCreateRequest>,
    res: Response
  ): Promise<void> => {
    try {
      const floorData: CreateFloorData = {
        garageId: req.body.garageId,
        floorNumber: req.body.floorNumber,
        description: req.body.description,
        totalSpots: req.body.totalSpots || 0,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      };

      // Basic validation
      if (!floorData.garageId || !floorData.floorNumber) {
        res.status(400).json({
          success: false,
          message: 'garageId and floorNumber are required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const newFloor = await this.floorService.createFloor(floorData);

      res.status(201).json({
        success: true,
        message: 'Floor created successfully',
        data: newFloor,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in createFloor:', error);

      // Handle validation errors
      if (
        (error as Error).message.includes('already exists') ||
        (error as Error).message.includes('Invalid')
      ) {
        res.status(400).json({
          success: false,
          message: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error while creating floor',
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
   * PUT /api/floors/:id
   * Update floor information
   */
  updateFloor = async (
    req: Request<{ id: string }, any, FloorUpdateRequest>,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const updates: UpdateFloorData = req.body;

      const updatedFloor = await this.floorService.updateFloor(id, updates);

      if (!updatedFloor) {
        res.status(404).json({
          success: false,
          message: `Floor with ID '${id}' not found`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Floor updated successfully',
        data: updatedFloor,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error in updateFloor for ID ${req.params.id}:`, error);

      // Handle validation errors
      if (
        (error as Error).message.includes('already exists') ||
        (error as Error).message.includes('Invalid') ||
        (error as Error).message.includes('Cannot update')
      ) {
        res.status(400).json({
          success: false,
          message: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error while updating floor',
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
   * DELETE /api/floors/:id
   * Delete a floor (soft delete)
   */
  deleteFloor = async (
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.floorService.deleteFloor(id);

      if (!result.success) {
        const statusCode = result.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          message: result.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error in deleteFloor for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while deleting floor',
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
   * GET /api/floors/statistics
   * Get comprehensive floor statistics
   */
  getFloorStatistics = async (
    req: Request<{}, any, {}, { garageId?: string }>,
    res: Response
  ): Promise<void> => {
    try {
      const { garageId } = req.query;
      const statistics = await this.floorService.getFloorStatistics(garageId);

      res.status(200).json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getFloorStatistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving floor statistics',
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
   * PUT /api/floors/:id/update-spot-count
   * Update the spot count for a floor
   */
  updateFloorSpotCount = async (
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const updatedFloor = await this.floorService.updateFloorSpotCount(id);

      if (!updatedFloor) {
        res.status(404).json({
          success: false,
          message: `Floor with ID '${id}' not found`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Floor spot count updated successfully',
        data: updatedFloor,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error in updateFloorSpotCount for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating floor spot count',
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
   * GET /api/floors/:id/bays
   * Get bay information for a specific floor
   */
  getFloorBays = async (
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const includeSpots = req.query.includeSpots === 'true';
      const status = req.query.status as string;

      const bays = await this.floorService.getFloorBays(id, { includeSpots, status });

      if (!bays) {
        res.status(404).json({
          success: false,
          message: `Floor with ID '${id}' not found`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: bays,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error in getFloorBays for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving floor bays',
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
   * GET /api/floors/:id/bays/:bayNumber
   * Get specific bay information with spots
   */
  getBayDetails = async (
    req: Request<{ id: string; bayNumber: string }>,
    res: Response
  ): Promise<void> => {
    try {
      const { id, bayNumber } = req.params;
      const includeSpots = req.query.includeSpots !== 'false'; // Default to true
      const status = req.query.status as string;

      // For bay numbers, we treat them as strings (section letters like A, B, C, D)
      // But the service getBayDetails expects a number, so we need to use getFloorBays instead
      // or fix the service method to handle string bay identifiers
      const bay = await this.floorService.getBayDetails(id, bayNumber, { includeSpots, status });

      if (!bay) {
        res.status(404).json({
          success: false,
          message: `Bay ${bayNumber} not found on floor '${id}'`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: bay,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error in getBayDetails for floor ${req.params.id}, bay ${req.params.bayNumber}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving bay details',
        errors: [
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        ],
        timestamp: new Date().toISOString(),
      });
    }
  };
}