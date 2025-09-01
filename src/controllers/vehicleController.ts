/**
 * Vehicle controller for search and lookup operations
 * 
 * This controller handles HTTP requests for vehicle search functionality,
 * including exact license plate lookups and partial/fuzzy matching.
 * It uses the SearchService for efficient vehicle lookups.
 * 
 * @module VehicleController
 */

import { Request, Response } from 'express';
const SearchService = require('../services/searchService');
const { validateSearchTerm } = require('../utils/stringMatcher');
import { 
  SearchVehiclesRequest, 
  ApiResponse,
  PaginatedApiResponse 
} from '../types/api';
import { 
  VehicleRecord, 
  VehicleType, 
  SpotFeature,
  SpotRecord 
} from '../types/models';

interface VehicleSearchQuery {
  search?: string;
  mode?: 'exact' | 'partial' | 'fuzzy' | 'all';
  threshold?: string;
  maxResults?: string;
}

interface LocationQuery {
  floor?: string;
  bay?: string;
  spotId?: string;
}

interface SuggestionsQuery {
  partial?: string;
  limit?: string;
}

interface AvailableSpotsQuery {
  floor?: string;
  bay?: string;
  type?: VehicleType;
  features?: string | string[];
}

interface LocationCriteria {
  spotId?: string;
  floor?: number;
  bay?: number;
}

interface SpotCriteria {
  floor?: number;
  bay?: number;
  type?: VehicleType;
  features?: string[];
}

export class VehicleController {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  /**
   * Find a vehicle by exact license plate
   * GET /api/v1/vehicles/:licensePlate
   */
  findVehicle = async (req: Request<{ licensePlate: string }>, res: Response<ApiResponse<VehicleRecord>>): Promise<void> => {
    try {
      const { licensePlate } = req.params;

      if (!licensePlate) {
        res.status(400).json({
          success: false,
          message: 'License plate is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.searchService.findVehicleByLicensePlate(licensePlate);
      
      if (!result.found) {
        res.status(404).json({
          success: false,
          message: result.message || 'Vehicle not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Vehicle lookup error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Search vehicles by partial license plate
   * GET /api/v1/vehicles?search=ABC&mode=all&threshold=0.6&maxResults=20
   */
  searchVehicles = async (req: Request<{}, ApiResponse<VehicleRecord[]>, {}, VehicleSearchQuery>, res: Response<ApiResponse<VehicleRecord[]>>): Promise<void> => {
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
          message: 'Search parameter is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate search term
      const validation = validateSearchTerm(search);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid search term',
          errors: validation.errors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Parse numeric parameters
      const searchOptions = {
        mode,
        threshold: parseFloat(threshold),
        maxResults: parseInt(maxResults, 10)
      };

      // Validate parameters
      if (searchOptions.threshold < 0 || searchOptions.threshold > 1) {
        res.status(400).json({
          success: false,
          message: 'Threshold must be between 0 and 1',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (searchOptions.maxResults < 1 || searchOptions.maxResults > 100) {
        res.status(400).json({
          success: false,
          message: 'MaxResults must be between 1 and 100',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!['exact', 'partial', 'fuzzy', 'all'].includes(mode)) {
        res.status(400).json({
          success: false,
          message: 'Mode must be one of: exact, partial, fuzzy, all',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.searchService.searchVehicles(search, searchOptions);

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
   * Get vehicles by location (floor, bay, or specific spot)
   * GET /api/v1/vehicles/location?floor=1&bay=2&spotId=F1-B2-S001
   */
  getVehiclesByLocation = async (req: Request<{}, ApiResponse<VehicleRecord[]>, {}, LocationQuery>, res: Response<ApiResponse<VehicleRecord[]>>): Promise<void> => {
    try {
      const { floor, bay, spotId } = req.query;
      const location: LocationCriteria = {};

      if (spotId) {
        location.spotId = spotId;
      } else {
        if (floor) {
          location.floor = parseInt(floor, 10);
          if (isNaN(location.floor)) {
            res.status(400).json({
              success: false,
              message: 'Floor must be a valid number',
              timestamp: new Date().toISOString()
            });
            return;
          }
        }

        if (bay) {
          location.bay = parseInt(bay, 10);
          if (isNaN(location.bay)) {
            res.status(400).json({
              success: false,
              message: 'Bay must be a valid number',
              timestamp: new Date().toISOString()
            });
            return;
          }
        }
      }

      const vehicles = await this.searchService.findVehiclesByLocation(location);

      res.json({
        success: true,
        data: vehicles,
        message: `Found ${vehicles.length} vehicles`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Vehicle location search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get search suggestions for auto-complete
   * GET /api/v1/vehicles/suggestions?partial=ABC&limit=10
   */
  getSearchSuggestions = async (req: Request<{}, ApiResponse<string[]>, {}, SuggestionsQuery>, res: Response<ApiResponse<string[]>>): Promise<void> => {
    try {
      const { partial, limit = '10' } = req.query;

      if (!partial) {
        res.status(400).json({
          success: false,
          message: 'Partial parameter is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (partial.length < 2) {
        res.json({
          success: true,
          data: [],
          message: 'Enter at least 2 characters for suggestions',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const searchLimit = parseInt(limit, 10);
      if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 50) {
        res.status(400).json({
          success: false,
          message: 'Limit must be a number between 1 and 50',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const suggestions = await this.searchService.getSearchSuggestions(partial, searchLimit);

      res.json({
        success: true,
        data: suggestions,
        message: `Found ${suggestions.length} suggestions`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Search suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get available spots with optional filtering
   * GET /api/v1/vehicles/spots/available?floor=1&type=standard&features=ev_charging
   */
  getAvailableSpots = async (req: Request<{}, ApiResponse<SpotRecord[]>, {}, AvailableSpotsQuery>, res: Response<ApiResponse<SpotRecord[]>>): Promise<void> => {
    try {
      const { floor, bay, type, features } = req.query;
      const criteria: SpotCriteria = {};

      if (floor) {
        criteria.floor = parseInt(floor, 10);
        if (isNaN(criteria.floor)) {
          res.status(400).json({
            success: false,
            message: 'Floor must be a valid number',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      if (bay) {
        criteria.bay = parseInt(bay, 10);
        if (isNaN(criteria.bay)) {
          res.status(400).json({
            success: false,
            message: 'Bay must be a valid number',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      if (type) {
        const validTypes: VehicleType[] = ['compact', 'standard', 'oversized'];
        if (!validTypes.includes(type)) {
          res.status(400).json({
            success: false,
            message: `Type must be one of: ${validTypes.join(', ')}`,
            timestamp: new Date().toISOString()
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
            message: `Invalid features: ${invalidFeatures.join(', ')}. Valid features: ${validFeatures.join(', ')}`,
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        criteria.features = featureList.map(f => f.trim());
      }

      const spots = await this.searchService.findAvailableSpots(criteria);

      res.json({
        success: true,
        data: spots,
        message: `Found ${spots.length} available spots`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Available spots search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Clear search cache (for testing or manual refresh)
   * POST /api/v1/vehicles/cache/clear
   */
  clearCache = async (req: Request, res: Response): Promise<void> => {
    try {
      this.searchService.clearCache();

      res.json({
        success: true,
        message: 'Search cache cleared successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cache clear error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get search statistics and cache information
   * GET /api/v1/vehicles/cache/stats
   */
  getCacheStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // This would require additional methods in SearchService to expose cache stats
      // For now, return basic information
      res.json({
        success: true,
        data: {
          cache: {
            enabled: true,
            expiryMs: 30000,
            status: 'active'
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cache stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'],
        timestamp: new Date().toISOString()
      });
    }
  };
}