/**
 * Spot controller for HTTP request handling
 * 
 * This module handles HTTP requests for spot operations, including
 * listing, filtering, retrieving individual spots, and updating spot status.
 * Follows RESTful API conventions with proper error handling.
 * 
 * @module SpotController
 */

import { Request, Response } from 'express';
import { SpotService } from "../services/spotService";
import { 
  UpdateSpotRequest,
  SearchSpotsRequest, 
  ApiResponse,
  PaginatedApiResponse 
} from '../types/api';
import { 
  SpotRecord, 
  VehicleType, 
  SpotFeature,
  FilterOptions,
  PaginationOptions 
} from '../types/models';

interface SpotFilters extends FilterOptions {
  status?: 'available' | 'occupied' | 'maintenance';
  type?: VehicleType;
  floor?: number;
  bay?: number;
}

interface SpotQuery extends SpotFilters {
  limit?: string;
  offset?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  include?: string;
}

interface SearchQuery {
  query?: string;
}

interface RequestWithFilters extends Request {
  filters?: SpotFilters;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Controller class for spot operations
 */
export class SpotController {
  private spotService: any;

  constructor() {
    this.spotService = new SpotService();
  }

  /**
   * GET /api/v1/spots
   * List all spots with filtering and pagination
   */
  getSpots = async (req: RequestWithFilters & Request<{}, PaginatedApiResponse<SpotRecord>, {}, SpotQuery>, res: Response<PaginatedApiResponse<SpotRecord>>): Promise<void> => {
    try {
      const filters = req.filters || {};
      const pagination: any = {
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      };
      const sorting = {
        sort: req.sort,
        order: req.order
      };
      
      const result = await this.spotService.getSpots(filters, pagination, sorting);
      
      // Create response with pagination metadata
      const response: PaginatedApiResponse<SpotRecord> = {
        success: true,
        data: result.spots,
        timestamp: new Date().toISOString()
      };
      
      // Add navigation hints for better UX
      if (result.pagination?.hasMore) {
        const nextLink = `${req.baseUrl}${req.path}?limit=${result.pagination.limit}&offset=${result.pagination.nextOffset}`;
        
        // Add current filters to next link
        const filterParams = Object.keys(filters)
          .map(key => `${key}=${encodeURIComponent(String(filters[key as keyof SpotFilters]))}`)
          .join('&');
        
        (response as any).links = {
          next: filterParams ? `${nextLink}&${filterParams}` : nextLink
        };
      }
      
      res.status(200).json(response);
      
    } catch (error) {
      console.error('Error in getSpots:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving spots',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/v1/spots/:id
   * Get individual spot details
   */
  getSpotById = async (req: Request<{ id: string }>, res: Response<ApiResponse<SpotRecord>>): Promise<void> => {
    try {
      const { id } = req.params;
      const spot = await this.spotService.getSpotById(id);
      
      if (!spot) {
        res.status(404).json({
          success: false,
          message: `Spot with ID '${id}' not found`,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: spot,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error in getSpotById for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving spot',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PATCH /api/v1/spots/:id
   * Update spot status and/or type
   */
  updateSpot = async (req: Request<{ id: string }, ApiResponse<SpotRecord>, UpdateSpotRequest>, res: Response<ApiResponse<SpotRecord>>): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedSpot = await this.spotService.updateSpot(id, updates);
      
      if (!updatedSpot) {
        res.status(404).json({
          success: false,
          message: `Spot with ID '${id}' not found`,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Spot updated successfully',
        data: updatedSpot,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error in updateSpot for ID ${req.params.id}:`, error);
      
      // Handle validation errors
      if ((error as Error).message.includes('Invalid') || (error as Error).message.includes('Cannot update')) {
        res.status(400).json({
          success: false,
          message: (error as Error).message,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating spot',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/v1/spots/statistics
   * Get comprehensive spot statistics
   */
  getSpotStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const statistics = await this.spotService.getSpotStatistics();
      
      res.status(200).json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error in getSpotStatistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving spot statistics',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/v1/spots/available
   * Get only available spots (convenience endpoint)
   */
  getAvailableSpots = async (req: RequestWithFilters & Request<{}, PaginatedApiResponse<SpotRecord>, {}, SpotQuery>, res: Response<PaginatedApiResponse<SpotRecord>>): Promise<void> => {
    try {
      // Override filters to only show available spots
      req.filters = { ...req.filters, status: 'available' };
      
      // Use the main getSpots method
      await this.getSpots(req, res);
      
    } catch (error) {
      console.error('Error in getAvailableSpots:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving available spots',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/v1/spots/occupied  
   * Get only occupied spots (convenience endpoint)
   */
  getOccupiedSpots = async (req: RequestWithFilters & Request<{}, PaginatedApiResponse<SpotRecord>, {}, SpotQuery>, res: Response<PaginatedApiResponse<SpotRecord>>): Promise<void> => {
    try {
      // Override filters to only show occupied spots
      req.filters = { ...req.filters, status: 'occupied' };
      
      // Use the main getSpots method
      await this.getSpots(req, res);
      
    } catch (error) {
      console.error('Error in getOccupiedSpots:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving occupied spots',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/v1/spots/search
   * Advanced spot search with multiple criteria
   */
  searchSpots = async (req: RequestWithFilters & Request<{}, PaginatedApiResponse<SpotRecord>, {}, SpotQuery & SearchQuery>, res: Response<PaginatedApiResponse<SpotRecord>>): Promise<void> => {
    try {
      const { query } = req.query;
      
      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Search query is required',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Parse search query and convert to filters
      const filters = this.parseSearchQuery(query);
      
      // Merge with existing filters
      req.filters = { ...req.filters, ...filters };
      
      // Use the main getSpots method
      await this.getSpots(req, res);
      
    } catch (error) {
      console.error('Error in searchSpots:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while searching spots',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Parse search query into filters
   * @private
   */
  private parseSearchQuery(query: string): SpotFilters {
    const filters: SpotFilters = {};
    const terms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    terms.forEach(term => {
      // Handle field:value format
      if (term.includes(':')) {
        const [field, value] = term.split(':');
        
        switch (field) {
          case 'floor':
          case 'f':
            const floor = parseInt(value);
            if (!isNaN(floor)) filters.floor = floor;
            break;
          case 'bay':
          case 'b':
            const bay = parseInt(value);
            if (!isNaN(bay)) filters.bay = bay;
            break;
          case 'type':
          case 't':
            if (['compact', 'standard', 'oversized'].includes(value)) {
              filters.type = value as VehicleType;
            }
            break;
          case 'status':
          case 's':
            if (['available', 'occupied', 'maintenance'].includes(value)) {
              filters.status = value as 'available' | 'occupied' | 'maintenance';
            }
            break;
        }
      } else {
        // Handle simple terms
        if (['available', 'occupied', 'maintenance'].includes(term)) {
          filters.status = term as 'available' | 'occupied' | 'maintenance';
        } else if (['compact', 'standard', 'oversized'].includes(term)) {
          filters.type = term as VehicleType;
        } else if (term.startsWith('f') && term.includes('-b')) {
          // Handle F1-B2 format
          const match = term.match(/f(\d+)-b(\d+)/);
          if (match) {
            filters.floor = parseInt(match[1]);
            filters.bay = parseInt(match[2]);
          }
        }
      }
    });
    
    return filters;
  }
}