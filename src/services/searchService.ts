/**
 * Search service for efficient vehicle and spot lookups
 *
 * This module provides high-performance search capabilities using Map-based
 * lookups for O(1) exact matches and optimized algorithms for partial and
 * fuzzy matching of license plates.
 *
 * @module SearchService
 */

import { VehicleRepository } from '../repositories/VehicleRepository';
import { SpotRepository } from '../repositories/SpotRepository';
import { searchLicensePlates, validateSearchTerm } from '../utils/stringMatcher';
import { VehicleType, SpotFeature, VehicleStatus } from '../types/models';

interface VehicleSearchResult {
  found: boolean;
  vehicle: any | null;
  message?: string;
}

interface SearchOptions {
  maxResults?: number;
  threshold?: number;
  mode?: 'partial' | 'fuzzy' | 'all';
}

interface SearchMatch {
  licensePlate: string;
  score: number;
  matchType: string;
  vehicle: {
    spotId: string;
    checkInTime: string;
    vehicleType: VehicleType;
    currentDuration: { hours: number; minutes: number };
    status: VehicleStatus;
  };
  spot: {
    floor: number;
    bay: number;
    spotNumber: number;
    type: VehicleType;
  } | null;
}

interface VehicleSearchResults {
  matches: SearchMatch[];
  count: number;
  searchTerm?: string;
  mode?: string;
  errors?: string[];
}

interface LocationCriteria {
  floor?: number;
  bay?: number;
  spotId?: string;
}

interface VehicleLocationInfo {
  licensePlate: string;
  spotId: string;
  checkInTime: string;
  vehicleType: VehicleType;
  currentDuration: { hours: number; minutes: number };
  status: VehicleStatus;
  spot: {
    floor: number;
    bay: number;
    spotNumber: number;
    type: VehicleType;
    features: SpotFeature[];
  } | null;
}

interface SpotSearchCriteria {
  floor?: number;
  bay?: number;
  type?: VehicleType;
  features?: SpotFeature[];
}

interface AvailableSpotInfo {
  spotId: string;
  floor: number;
  bay: number;
  spotNumber: number;
  type: VehicleType;
  status: string;
  features: SpotFeature[];
}

class SearchService {
  private vehicleRepository: VehicleRepository;
  private spotRepository: SpotRepository;
  private _licensePlateCache: Map<string, any>;
  private _cacheTimestamp: number | null;
  private _cacheExpiryMs: number;

  constructor() {
    this.vehicleRepository = new VehicleRepository();
    this.spotRepository = new SpotRepository();

    // Cache for performance optimization
    this._licensePlateCache = new Map();
    this._cacheTimestamp = null;
    this._cacheExpiryMs = 30000; // 30 seconds cache
  }

  /**
   * Find a vehicle by exact license plate match
   * @param licensePlate - License plate to search for
   * @returns Vehicle with location info or null if not found
   */
  async findVehicleByLicensePlate(licensePlate: string): Promise<VehicleSearchResult> {
    try {
      if (!licensePlate) {
        throw new Error('License plate is required');
      }

      const vehicle = await this.vehicleRepository.findById(licensePlate);

      if (!vehicle) {
        return {
          found: false,
          vehicle: null,
          message: 'Vehicle not found',
        };
      }

      // Get spot information for the vehicle
      const spot = vehicle.currentSpotId ? await this.spotRepository.findById(vehicle.currentSpotId) : null;

      return {
        found: true,
        vehicle: {
          licensePlate: vehicle.licensePlate,
          spotId: vehicle.currentSpotId || '',
          checkInTime: vehicle.createdAt.toISOString(),
          vehicleType: vehicle.vehicleType,
          rateType: vehicle.rateType,
          currentDuration: this._calculateCurrentDuration(vehicle.createdAt.toISOString()),
          totalAmount: vehicle.totalAmount || 0,
          isPaid: vehicle.isPaid,
          status: vehicle.status.toLowerCase() as VehicleStatus,
          spot: spot
            ? {
                floor: spot.level,
                bay: parseInt(spot.section || '0'),
                spotNumber: parseInt(spot.spotNumber),
                type: spot.spotType.toLowerCase() as VehicleType,
                features: [], // SpotFeature[] - would need to be implemented
              }
            : null,
        },
      };
    } catch (error) {
      throw new Error(`Failed to find vehicle: ${(error as Error).message}`);
    }
  }

  /**
   * Search vehicles by partial license plate match
   * @param searchTerm - Partial license plate to search for
   * @param options - Search options
   * @returns Search results with matches array
   */
  async searchVehicles(
    searchTerm: string,
    options: SearchOptions = {}
  ): Promise<VehicleSearchResults> {
    try {
      const { maxResults = 20, threshold = 0.6, mode = 'all' } = options;

      // Validate search term
      const validation = validateSearchTerm(searchTerm);
      if (!validation.isValid) {
        return {
          matches: [],
          count: 0,
          errors: validation.errors,
        };
      }

      // Get all currently parked vehicles
      const parkedVehicles = await this.vehicleRepository.findCurrentlyParked();
      const licensePlates = parkedVehicles.map(v => v.licensePlate);

      // Perform search using string matcher
      const searchResults = searchLicensePlates(searchTerm, licensePlates, {
        mode,
        threshold,
        maxResults,
      });

      // Enrich results with vehicle and spot information
      const enrichedMatches: SearchMatch[] = [];

      for (const result of searchResults) {
        const vehicle = await this.vehicleRepository.findById(result.licensePlate);
        const spot = vehicle && vehicle.currentSpotId ? await this.spotRepository.findById(vehicle.currentSpotId) : null;

        if (vehicle) {
          enrichedMatches.push({
            licensePlate: result.licensePlate,
            score: result.score,
            matchType: result.matchType,
            vehicle: {
              spotId: vehicle.currentSpotId || '',
              checkInTime: vehicle.createdAt.toISOString(),
              vehicleType: vehicle.vehicleType.toLowerCase() as VehicleType,
              currentDuration: this._calculateCurrentDuration(vehicle.createdAt.toISOString()),
              status: vehicle.status.toLowerCase() as VehicleStatus,
            },
            spot: spot
              ? {
                  floor: spot.level,
                  bay: parseInt(spot.section || '0'),
                  spotNumber: parseInt(spot.spotNumber),
                  type: spot.spotType.toLowerCase() as VehicleType,
                }
              : null,
          });
        }
      }

      return {
        matches: enrichedMatches,
        count: enrichedMatches.length,
        searchTerm: validation.normalized || undefined,
        mode,
      };
    } catch (error) {
      throw new Error(`Failed to search vehicles: ${(error as Error).message}`);
    }
  }

  /**
   * Find all vehicles in a specific spot, bay, or floor
   * @param location - Location criteria
   * @returns Array of vehicles matching location criteria
   */
  async findVehiclesByLocation(location: LocationCriteria = {}): Promise<VehicleLocationInfo[]> {
    try {
      const { floor, bay, spotId } = location;
      let vehicles: any[] = [];

      if (spotId) {
        // Find vehicles by spot - need to search by current spot
        const allVehicles = await this.vehicleRepository.findCurrentlyParked();
        vehicles = allVehicles.filter(v => v.currentSpotId === spotId);
      } else if (floor && bay) {
        // Find vehicles in specific floor and bay
        const spots = await this.spotRepository.findByLevelAndSection(floor, bay.toString());
        const allVehicles = await this.vehicleRepository.findCurrentlyParked();
        vehicles = allVehicles.filter(v => 
          spots.some(spot => spot.id === v.currentSpotId)
        );
      } else if (floor) {
        // Find vehicles on specific floor
        const spots = await this.spotRepository.findByLevel(floor);
        const allVehicles = await this.vehicleRepository.findCurrentlyParked();
        vehicles = allVehicles.filter(v => 
          spots.some(spot => spot.id === v.currentSpotId)
        );
      } else {
        // Return all parked vehicles
        vehicles = await this.vehicleRepository.findCurrentlyParked();
      }

      // Format response with location and duration info
      const results: VehicleLocationInfo[] = [];
      for (const vehicle of vehicles) {
        const spot = vehicle.currentSpotId ? await this.spotRepository.findById(vehicle.currentSpotId) : null;
        results.push({
          licensePlate: vehicle.licensePlate,
          spotId: vehicle.currentSpotId || '',
          checkInTime: vehicle.createdAt.toISOString(),
          vehicleType: vehicle.vehicleType.toLowerCase() as VehicleType,
          currentDuration: this._calculateCurrentDuration(vehicle.createdAt.toISOString()),
          status: vehicle.status.toLowerCase() as VehicleStatus,
          spot: spot
            ? {
                floor: spot.level,
                bay: parseInt(spot.section || '0'),
                spotNumber: parseInt(spot.spotNumber),
                type: spot.spotType.toLowerCase() as VehicleType,
                features: [], // SpotFeature[] - would need to be implemented
              }
            : null,
        });
      }
      return results;
    } catch (error) {
      throw new Error(`Failed to find vehicles by location: ${(error as Error).message}`);
    }
  }

  /**
   * Find available spots with optional criteria
   * @param criteria - Search criteria
   * @returns Array of available spots matching criteria
   */
  async findAvailableSpots(criteria: SpotSearchCriteria = {}): Promise<AvailableSpotInfo[]> {
    try {
      const { floor, bay, type, features } = criteria;
      let availableSpots = await this.spotRepository.findAvailable();

      // Apply filters
      if (floor) {
        availableSpots = availableSpots.filter(spot => spot.level === parseInt(floor.toString()));
      }

      if (bay) {
        availableSpots = availableSpots.filter(spot => spot.section === bay.toString());
      }

      if (type) {
        availableSpots = availableSpots.filter(spot => spot.spotType.toLowerCase() === type);
      }

      // Note: features filtering would need to be implemented based on actual spot feature system
      if (features && features.length > 0) {
        // For now, we'll skip this filter as the spot schema doesn't have a features array
        console.warn('Feature filtering not implemented yet');
      }

      return availableSpots.map(spot => ({
        spotId: spot.id,
        floor: spot.level,
        bay: parseInt(spot.section || '0'),
        spotNumber: parseInt(spot.spotNumber),
        type: spot.spotType.toLowerCase() as VehicleType,
        status: spot.status.toLowerCase(),
        features: [], // SpotFeature[] - would need to be implemented
      }));
    } catch (error) {
      throw new Error(`Failed to find available spots: ${(error as Error).message}`);
    }
  }

  /**
   * Get quick search suggestions based on partial input
   * @param partial - Partial license plate input
   * @param limit - Maximum suggestions to return
   * @returns Array of license plate suggestions
   */
  async getSearchSuggestions(partial: string, limit = 10): Promise<string[]> {
    try {
      if (!partial || partial.length < 2) {
        return [];
      }

      // Get cached license plates for performance
      const licensePlates = await this._getCachedLicensePlates();

      // Find matches that start with the partial input
      const suggestions: string[] = [];
      const partialUpper = partial.toUpperCase();

      for (const plate of licensePlates) {
        if (plate.startsWith(partialUpper)) {
          suggestions.push(plate);
        }
        if (suggestions.length >= limit) {
          break;
        }
      }

      // If not enough matches, include contains matches
      if (suggestions.length < limit) {
        for (const plate of licensePlates) {
          if (!suggestions.includes(plate) && plate.includes(partialUpper)) {
            suggestions.push(plate);
            if (suggestions.length >= limit) {
              break;
            }
          }
        }
      }

      return suggestions;
    } catch (error) {
      throw new Error(`Failed to get search suggestions: ${(error as Error).message}`);
    }
  }

  /**
   * Get cached license plates for performance optimization
   * @private
   * @returns Array of cached license plates
   */
  private async _getCachedLicensePlates(): Promise<string[]> {
    const now = Date.now();

    // Check if cache is valid
    if (this._cacheTimestamp && now - this._cacheTimestamp < this._cacheExpiryMs) {
      return Array.from(this._licensePlateCache.keys());
    }

    // Refresh cache
    const parkedVehicles = await this.vehicleRepository.findCurrentlyParked();
    this._licensePlateCache.clear();

    parkedVehicles.forEach(vehicle => {
      this._licensePlateCache.set(vehicle.licensePlate, vehicle);
    });

    this._cacheTimestamp = now;

    return Array.from(this._licensePlateCache.keys());
  }

  /**
   * Calculate current parking duration
   * @private
   * @param checkInTime - ISO timestamp of check-in
   * @returns Duration object with hours and minutes
   */
  private _calculateCurrentDuration(checkInTime: string): { hours: number; minutes: number } {
    const checkIn = new Date(checkInTime);
    const now = new Date();
    const durationMs = now.getTime() - checkIn.getTime();

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes };
  }

  /**
   * Clear search cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this._licensePlateCache.clear();
    this._cacheTimestamp = null;
  }
}

export { SearchService };
