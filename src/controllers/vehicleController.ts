/**
 * Vehicle controller for search and lookup operations
 *
 * This controller handles HTTP requests for vehicle search functionality,
 * including exact license plate lookups and partial/fuzzy matching.
 * It uses the SearchService for efficient vehicle lookups.
 *
 * @module VehicleController
 */

import { NextFunction } from 'express';
import { 
  TypedRequest, 
  TypedResponse, 
  ApiResponse,
  Vehicle,
  VehicleType,
  SpotType,
  SpotFeature,
  Spot,
  AsyncControllerMethod
} from '../types/api';

const SearchService = require('../services/searchService');
const { validateSearchTerm } = require('../utils/stringMatcher');

interface VehicleSearchOptions {
  mode: 'exact' | 'partial' | 'fuzzy' | 'all';
  threshold: number;
  maxResults: number;
}

interface SearchResult {
  found: boolean;
  vehicle?: Vehicle;
  spot?: Spot;
  message?: string;
}

interface VehicleSearchQueryParams {
  search?: string;
  mode?: string;
  threshold?: string;
  maxResults?: string;
}

interface LocationQueryParams {
  floor?: string;
  bay?: string;
  spotId?: string;
}

interface AvailableSpotsQueryParams {
  floor?: string;
  bay?: string;
  type?: string;
  features?: string;
}

interface SuggestionsQueryParams {
  partial?: string;
  limit?: string;
}

class VehicleController {
  private searchService: any;

  constructor() {
    this.searchService = new SearchService();
  }

  /**
   * Find a vehicle by exact license plate
   * GET /api/v1/vehicles/:licensePlate
   */
  async findVehicle(
    req: TypedRequest<never> & { params: { licensePlate: string } }, 
    res: TypedResponse<SearchResult>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { licensePlate } = req.params;

      if (!licensePlate) {
        res.status(400).json({
          success: false,
          error: 'License plate is required'
        });
        return;
      }

      const result = await this.searchService.findVehicleByLicensePlate(licensePlate);

      if (!result.found) {
        res.status(404).json({
          success: false,
          found: false,
          message: result.message || 'Vehicle not found',
          licensePlate: licensePlate.toUpperCase()
        });
        return;
      }

      res.json({
        success: true,
        ...result
      });

    } catch (error: any) {
      console.error('Vehicle lookup error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Search vehicles by partial license plate
   * GET /api/v1/vehicles?search=ABC&mode=all&threshold=0.6&maxResults=20
   */
  async searchVehicles(
    req: TypedRequest<never> & { query: VehicleSearchQueryParams }, 
    res: TypedResponse<any>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const {
        search,
        mode = 'all',
        threshold = '0.6',
        maxResults = '20'
      } = req.query;

      if (!search) {
        res.status(400).json({
          success: false,
          error: 'Search parameter is required'
        });
        return;
      }

      // Validate search term
      const validation = validateSearchTerm(search);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid search term',
          details: validation.errors
        });
        return;
      }

      // Parse numeric parameters
      const searchOptions: VehicleSearchOptions = {
        mode: mode as VehicleSearchOptions['mode'],
        threshold: parseFloat(threshold),
        maxResults: parseInt(maxResults)
      };

      // Validate parameters
      if (searchOptions.threshold < 0 || searchOptions.threshold > 1) {
        res.status(400).json({
          success: false,
          error: 'Threshold must be between 0 and 1'
        });
        return;
      }

      if (searchOptions.maxResults < 1 || searchOptions.maxResults > 100) {
        res.status(400).json({
          success: false,
          error: 'MaxResults must be between 1 and 100'
        });
        return;
      }

      if (!['exact', 'partial', 'fuzzy', 'all'].includes(mode)) {
        res.status(400).json({
          success: false,
          error: 'Mode must be one of: exact, partial, fuzzy, all'
        });
        return;
      }

      const result = await this.searchService.searchVehicles(search, searchOptions);

      res.json({
        success: true,
        ...result,
        query: {
          search: validation.normalized,
          mode,
          threshold: searchOptions.threshold,
          maxResults: searchOptions.maxResults
        }
      });

    } catch (error: any) {
      console.error('Vehicle search error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get vehicles by location (floor, bay, or specific spot)
   * GET /api/v1/vehicles/location?floor=1&bay=2&spotId=F1-B2-S001
   */
  async getVehiclesByLocation(
    req: TypedRequest<never> & { query: LocationQueryParams }, 
    res: TypedResponse<{ vehicles: Vehicle[]; count: number; location: any; timestamp: string }>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { floor, bay, spotId } = req.query;
      const location: any = {};

      if (spotId) {
        location.spotId = spotId;
      } else {
        if (floor) {
          location.floor = parseInt(floor);
          if (isNaN(location.floor)) {
            res.status(400).json({
              success: false,
              error: 'Floor must be a valid number'
            });
            return;
          }
        }

        if (bay) {
          location.bay = parseInt(bay);
          if (isNaN(location.bay)) {
            res.status(400).json({
              success: false,
              error: 'Bay must be a valid number'
            });
            return;
          }
        }
      }

      const vehicles = await this.searchService.findVehiclesByLocation(location);

      res.json({
        success: true,
        vehicles,
        count: vehicles.length,
        location,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Vehicle location search error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get search suggestions for auto-complete
   * GET /api/v1/vehicles/suggestions?partial=ABC&limit=10
   */
  async getSearchSuggestions(
    req: TypedRequest<never> & { query: SuggestionsQueryParams }, 
    res: TypedResponse<{ suggestions: string[]; count: number; partial: string; timestamp: string }>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { partial, limit = '10' } = req.query;

      if (!partial) {
        res.status(400).json({
          success: false,
          error: 'Partial parameter is required'
        });
        return;
      }

      if (partial.length < 2) {
        res.json({
          success: true,
          suggestions: [],
          message: 'Enter at least 2 characters for suggestions'
        });
        return;
      }

      const searchLimit = parseInt(limit);
      if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 50) {
        res.status(400).json({
          success: false,
          error: 'Limit must be a number between 1 and 50'
        });
        return;
      }

      const suggestions = await this.searchService.getSearchSuggestions(partial, searchLimit);

      res.json({
        success: true,
        suggestions,
        count: suggestions.length,
        partial: partial.toUpperCase(),
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Search suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get available spots with optional filtering
   * GET /api/v1/vehicles/spots/available?floor=1&type=standard&features=ev_charging
   */
  async getAvailableSpots(
    req: TypedRequest<never> & { query: AvailableSpotsQueryParams }, 
    res: TypedResponse<{ availableSpots: Spot[]; count: number; criteria: any; timestamp: string }>,
    next?: NextFunction
  ): Promise<void> {
    try {
      const { floor, bay, type, features } = req.query;
      const criteria: any = {};

      if (floor) {
        criteria.floor = parseInt(floor);
        if (isNaN(criteria.floor)) {
          res.status(400).json({
            success: false,
            error: 'Floor must be a valid number'
          });
          return;
        }
      }

      if (bay) {
        criteria.bay = parseInt(bay);
        if (isNaN(criteria.bay)) {
          res.status(400).json({
            success: false,
            error: 'Bay must be a valid number'
          });
          return;
        }
      }

      if (type) {
        const validTypes: SpotType[] = ['compact', 'standard', 'oversized'];
        if (!validTypes.includes(type as SpotType)) {
          res.status(400).json({
            success: false,
            error: `Type must be one of: ${validTypes.join(', ')}`
          });
          return;
        }
        criteria.type = type;
      }

      if (features) {
        const featureList = Array.isArray(features) ? features : features.split(',');
        const validFeatures: SpotFeature[] = ['ev_charging', 'handicap'];
        const invalidFeatures = featureList.filter(f => !validFeatures.includes(f.trim() as SpotFeature));

        if (invalidFeatures.length > 0) {
          res.status(400).json({
            success: false,
            error: `Invalid features: ${invalidFeatures.join(', ')}. Valid features: ${validFeatures.join(', ')}`
          });
          return;
        }

        criteria.features = featureList.map(f => f.trim());
      }

      const spots = await this.searchService.findAvailableSpots(criteria);

      res.json({
        success: true,
        availableSpots: spots,
        count: spots.length,
        criteria,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Available spots search error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Clear search cache (for testing or manual refresh)
   * POST /api/v1/vehicles/cache/clear
   */
  async clearCache(
    req: TypedRequest<never>, 
    res: TypedResponse<{ message: string; timestamp: string }>,
    next?: NextFunction
  ): Promise<void> {
    try {
      this.searchService.clearCache();

      res.json({
        success: true,
        message: 'Search cache cleared successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Cache clear error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get search statistics and cache information
   * GET /api/v1/vehicles/cache/stats
   */
  async getCacheStats(
    req: TypedRequest<never>, 
    res: TypedResponse<{ cache: any; timestamp: string }>,
    next?: NextFunction
  ): Promise<void> {
    try {
      // This would require additional methods in SearchService to expose cache stats
      // For now, return basic information
      res.json({
        success: true,
        cache: {
          enabled: true,
          expiryMs: 30000,
          status: 'active'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Cache stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export = VehicleController;