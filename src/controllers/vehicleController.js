/**
 * Vehicle controller for search and lookup operations
 *
 * This controller handles HTTP requests for vehicle search functionality,
 * including exact license plate lookups and partial/fuzzy matching.
 * It uses the SearchService for efficient vehicle lookups.
 *
 * @module VehicleController
 */

const SearchService = require('../services/searchService');
const { validateSearchTerm } = require('../utils/stringMatcher');

class VehicleController {
  constructor() {
    this.searchService = new SearchService();
  }

  /**
   * Find a vehicle by exact license plate
   * GET /api/v1/vehicles/:licensePlate
   */
  async findVehicle(req, res) {
    try {
      const { licensePlate } = req.params;

      if (!licensePlate) {
        return res.status(400).json({
          success: false,
          error: 'License plate is required'
        });
      }

      const result = await this.searchService.findVehicleByLicensePlate(licensePlate);

      if (!result.found) {
        return res.status(404).json({
          success: false,
          found: false,
          message: result.message || 'Vehicle not found',
          licensePlate: licensePlate.toUpperCase()
        });
      }

      return res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('Vehicle lookup error:', error);
      return res.status(500).json({
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
  async searchVehicles(req, res) {
    try {
      const {
        search,
        mode = 'all',
        threshold = 0.6,
        maxResults = 20
      } = req.query;

      if (!search) {
        return res.status(400).json({
          success: false,
          error: 'Search parameter is required'
        });
      }

      // Validate search term
      const validation = validateSearchTerm(search);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid search term',
          details: validation.errors
        });
      }

      // Parse numeric parameters
      const searchOptions = {
        mode,
        threshold: parseFloat(threshold),
        maxResults: parseInt(maxResults)
      };

      // Validate parameters
      if (searchOptions.threshold < 0 || searchOptions.threshold > 1) {
        return res.status(400).json({
          success: false,
          error: 'Threshold must be between 0 and 1'
        });
      }

      if (searchOptions.maxResults < 1 || searchOptions.maxResults > 100) {
        return res.status(400).json({
          success: false,
          error: 'MaxResults must be between 1 and 100'
        });
      }

      if (!['exact', 'partial', 'fuzzy', 'all'].includes(mode)) {
        return res.status(400).json({
          success: false,
          error: 'Mode must be one of: exact, partial, fuzzy, all'
        });
      }

      const result = await this.searchService.searchVehicles(search, searchOptions);

      return res.json({
        success: true,
        ...result,
        query: {
          search: validation.normalized,
          mode,
          threshold: searchOptions.threshold,
          maxResults: searchOptions.maxResults
        }
      });

    } catch (error) {
      console.error('Vehicle search error:', error);
      return res.status(500).json({
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
  async getVehiclesByLocation(req, res) {
    try {
      const { floor, bay, spotId } = req.query;
      const location = {};

      if (spotId) {
        location.spotId = spotId;
      } else {
        if (floor) {
          location.floor = parseInt(floor);
          if (isNaN(location.floor)) {
            return res.status(400).json({
              success: false,
              error: 'Floor must be a valid number'
            });
          }
        }

        if (bay) {
          location.bay = parseInt(bay);
          if (isNaN(location.bay)) {
            return res.status(400).json({
              success: false,
              error: 'Bay must be a valid number'
            });
          }
        }
      }

      const vehicles = await this.searchService.findVehiclesByLocation(location);

      return res.json({
        success: true,
        vehicles,
        count: vehicles.length,
        location,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Vehicle location search error:', error);
      return res.status(500).json({
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
  async getSearchSuggestions(req, res) {
    try {
      const { partial, limit = 10 } = req.query;

      if (!partial) {
        return res.status(400).json({
          success: false,
          error: 'Partial parameter is required'
        });
      }

      if (partial.length < 2) {
        return res.json({
          success: true,
          suggestions: [],
          message: 'Enter at least 2 characters for suggestions'
        });
      }

      const searchLimit = parseInt(limit);
      if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 50) {
        return res.status(400).json({
          success: false,
          error: 'Limit must be a number between 1 and 50'
        });
      }

      const suggestions = await this.searchService.getSearchSuggestions(partial, searchLimit);

      return res.json({
        success: true,
        suggestions,
        count: suggestions.length,
        partial: partial.toUpperCase(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Search suggestions error:', error);
      return res.status(500).json({
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
  async getAvailableSpots(req, res) {
    try {
      const { floor, bay, type, features } = req.query;
      const criteria = {};

      if (floor) {
        criteria.floor = parseInt(floor);
        if (isNaN(criteria.floor)) {
          return res.status(400).json({
            success: false,
            error: 'Floor must be a valid number'
          });
        }
      }

      if (bay) {
        criteria.bay = parseInt(bay);
        if (isNaN(criteria.bay)) {
          return res.status(400).json({
            success: false,
            error: 'Bay must be a valid number'
          });
        }
      }

      if (type) {
        const validTypes = ['compact', 'standard', 'oversized'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({
            success: false,
            error: `Type must be one of: ${validTypes.join(', ')}`
          });
        }
        criteria.type = type;
      }

      if (features) {
        const featureList = Array.isArray(features) ? features : features.split(',');
        const validFeatures = ['ev_charging', 'handicap'];
        const invalidFeatures = featureList.filter(f => !validFeatures.includes(f.trim()));

        if (invalidFeatures.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid features: ${invalidFeatures.join(', ')}. Valid features: ${validFeatures.join(', ')}`
          });
        }

        criteria.features = featureList.map(f => f.trim());
      }

      const spots = await this.searchService.findAvailableSpots(criteria);

      return res.json({
        success: true,
        availableSpots: spots,
        count: spots.length,
        criteria,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Available spots search error:', error);
      return res.status(500).json({
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
  async clearCache(req, res) {
    try {
      this.searchService.clearCache();

      return res.json({
        success: true,
        message: 'Search cache cleared successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cache clear error:', error);
      return res.status(500).json({
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
  async getCacheStats(req, res) {
    try {
      // This would require additional methods in SearchService to expose cache stats
      // For now, return basic information
      return res.json({
        success: true,
        cache: {
          enabled: true,
          expiryMs: 30000,
          status: 'active'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cache stats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = VehicleController;
