/**
 * Spot controller for HTTP request handling
 *
 * This module handles HTTP requests for spot operations, including
 * listing, filtering, retrieving individual spots, and updating spot status.
 * Follows RESTful API conventions with proper error handling.
 *
 * @module SpotController
 */

import { NextFunction } from 'express';
import { 
  TypedRequest, 
  TypedResponse, 
  ApiResponse,
  Spot,
  SpotUpdateRequest,
  SpotQueryParams,
  SpotFilters,
  PaginatedResponse,
  AsyncControllerMethod
} from '../types/api';

const SpotService = require('../services/spotService');
const { createPaginatedResponse } = require('../utils/pagination');

interface SpotStatsResult {
  totalSpots: number;
  availableSpots: number;
  occupiedSpots: number;
  occupancyRate: number;
  byType: Record<string, number>;
  byFloor: Record<number, any>;
  timestamp: string;
}

/**
 * Controller class for spot operations
 */
class SpotController {
  private spotService: any;

  constructor() {
    this.spotService = new SpotService();
  }

  /**
   * GET /api/v1/spots
   * List all spots with filtering and pagination
   */
  async getSpots(
    req: TypedRequest<never> & { query: SpotQueryParams; filters?: SpotFilters; sort?: string; order?: 'asc' | 'desc' }, 
    res: TypedResponse<Spot[]>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const filters = req.filters || {};
      const pagination = {
        limit: req.query.limit ? parseInt(req.query.limit) : 20,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };
      const sorting = {
        sort: req.sort,
        order: req.order
      };

      const result = await this.spotService.getSpots(filters, pagination, sorting);

      // Create response with pagination metadata
      const response: PaginatedResponse<Spot> = {
        success: true,
        data: result.spots,
        pagination: result.pagination,
        metadata: result.metadata
      };

      // Add navigation hints for better UX
      if (result.pagination.hasMore) {
        response.links = {
          next: `${req.baseUrl}${req.path}?limit=${result.pagination.limit}&offset=${result.pagination.nextOffset}`
        };

        // Add current filters to next link
        Object.keys(filters).forEach(key => {
          if (response.links?.next) {
            response.links.next += `&${key}=${encodeURIComponent(String(filters[key as keyof SpotFilters]))}`;
          }
        });
      }

      res.status(200).json(response);

    } catch (error: any) {
      console.error('Error in getSpots:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving spots',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/v1/spots/:id
   * Get individual spot details
   */
  async getSpotById(
    req: TypedRequest<never> & { params: { id: string } }, 
    res: TypedResponse<Spot>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const spot = await this.spotService.getSpotById(id);

      if (!spot) {
        res.status(404).json({
          success: false,
          message: `Spot with ID '${id}' not found`,
          suggestion: 'Please verify the spot ID format (F{floor}-B{bay}-S{spot})',
          examples: ['F1-B2-S3', 'F2-B1-S15'],
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: spot,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error(`Error in getSpotById for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving spot',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * PATCH /api/v1/spots/:id
   * Update spot status and/or type
   */
  async updateSpot(
    req: TypedRequest<SpotUpdateRequest> & { params: { id: string } }, 
    res: TypedResponse<Spot>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedSpot = await this.spotService.updateSpot(id, updates);

      if (!updatedSpot) {
        res.status(404).json({
          success: false,
          message: `Spot with ID '${id}' not found`,
          suggestion: 'Please verify the spot ID format (F{floor}-B{bay}-S{spot})',
          examples: ['F1-B2-S3', 'F2-B1-S15'],
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Spot updated successfully',
        data: updatedSpot,
        changes: updates
      });

    } catch (error: any) {
      console.error(`Error in updateSpot for ID ${req.params.id}:`, error);

      // Handle validation errors
      if (error.message?.includes('Invalid') || error.message?.includes('Cannot update')) {
        res.status(400).json({
          success: false,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error while updating spot',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/v1/spots/statistics
   * Get comprehensive spot statistics
   */
  async getSpotStatistics(
    req: TypedRequest<never>, 
    res: TypedResponse<SpotStatsResult>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const statistics = await this.spotService.getSpotStatistics();

      res.status(200).json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error in getSpotStatistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving spot statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/v1/spots/available
   * Get only available spots (convenience endpoint)
   */
  async getAvailableSpots(
    req: TypedRequest<never> & { query: SpotQueryParams; filters?: SpotFilters; sort?: string; order?: 'asc' | 'desc' }, 
    res: TypedResponse<Spot[]>,
    next?: NextFunction
  ): Promise<void> {
    try {
      // Override filters to only show available spots
      req.filters = { ...req.filters, status: 'available' };

      // Use the main getSpots method
      await this.getSpots(req, res);

    } catch (error: any) {
      console.error('Error in getAvailableSpots:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving available spots',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/v1/spots/occupied
   * Get only occupied spots (convenience endpoint)
   */
  async getOccupiedSpots(
    req: TypedRequest<never> & { query: SpotQueryParams; filters?: SpotFilters; sort?: string; order?: 'asc' | 'desc' }, 
    res: TypedResponse<Spot[]>,
    next?: NextFunction
  ): Promise<void> {
    try {
      // Override filters to only show occupied spots
      req.filters = { ...req.filters, status: 'occupied' };

      // Use the main getSpots method
      await this.getSpots(req, res);

    } catch (error: any) {
      console.error('Error in getOccupiedSpots:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving occupied spots',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/v1/spots/search
   * Advanced spot search with multiple criteria
   */
  async searchSpots(
    req: TypedRequest<never> & { query: SpotQueryParams & { query?: string }; filters?: SpotFilters }, 
    res: TypedResponse<Spot[]>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { query } = req.query;

      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Search query is required',
          examples: ['F1-B2', 'compact', 'ev_charging', 'floor:1', 'type:standard'],
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Parse search query and convert to filters
      const filters = this._parseSearchQuery(query);

      // Merge with existing filters
      req.filters = { ...req.filters, ...filters };

      // Use the main getSpots method
      await this.getSpots(req, res);

    } catch (error: any) {
      console.error('Error in searchSpots:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while searching spots',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Parse search query into filters
   * @private
   * @param query - Search query string
   * @returns Parsed filters
   */
  private _parseSearchQuery(query: string): Partial<SpotFilters> {
    const filters: Partial<SpotFilters> = {};
    const terms = query.toLowerCase().split(' ').filter(term => term.length > 0);

    terms.forEach(term => {
      // Handle field:value format
      if (term.includes(':')) {
        const [field, value] = term.split(':');

        switch (field) {
        case 'floor':
        case 'f':
          const floor = parseInt(value);
          if (!isNaN(floor)) { filters.floor = floor; }
          break;
        case 'bay':
        case 'b':
          const bay = parseInt(value);
          if (!isNaN(bay)) { filters.bay = bay; }
          break;
        case 'type':
        case 't':
          if (['compact', 'standard', 'oversized'].includes(value)) {
            filters.type = value as any;
          }
          break;
        case 'status':
        case 's':
          if (['available', 'occupied'].includes(value)) {
            filters.status = value as any;
          }
          break;
        }
      } else {
        // Handle simple terms
        if (['available', 'occupied'].includes(term)) {
          filters.status = term as any;
        } else if (['compact', 'standard', 'oversized'].includes(term)) {
          filters.type = term as any;
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

export = SpotController;