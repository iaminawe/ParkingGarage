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
import { SpotRepository } from '../repositories/spotRepository';
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

      const vehicle = this.vehicleRepository.findById(licensePlate);

      if (!vehicle) {
        return {
          found: false,
          vehicle: null,
          message: 'Vehicle not found',
        };
      }

      // Get spot information for the vehicle
      const spot = this.spotRepository.findById(vehicle.spotId);

      return {
        found: true,
        vehicle: {
          licensePlate: vehicle.licensePlate,
          spotId: vehicle.spotId,
          checkInTime: vehicle.checkInTime,
          vehicleType: vehicle.vehicleType,
          rateType: vehicle.rateType,
          currentDuration: this._calculateCurrentDuration(vehicle.checkInTime),
          totalAmount: vehicle.totalAmount,
          isPaid: vehicle.isPaid,
          status: vehicle.getStatus(),
          spot: spot
            ? {
                floor: spot.floor,
                bay: spot.bay,
                spotNumber: spot.spotNumber,
                type: spot.type,
                features: spot.features,
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
      const parkedVehicles = this.vehicleRepository.findParked();
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
        const vehicle = this.vehicleRepository.findById(result.licensePlate);
        const spot = vehicle ? this.spotRepository.findById(vehicle.spotId) : null;

        if (vehicle) {
          enrichedMatches.push({
            licensePlate: result.licensePlate,
            score: result.score,
            matchType: result.matchType,
            vehicle: {
              spotId: vehicle.spotId,
              checkInTime: vehicle.checkInTime,
              vehicleType: vehicle.vehicleType,
              currentDuration: this._calculateCurrentDuration(vehicle.checkInTime),
              status: vehicle.getStatus(),
            },
            spot: spot
              ? {
                  floor: spot.floor,
                  bay: spot.bay,
                  spotNumber: spot.spotNumber,
                  type: spot.type,
                }
              : null,
          });
        }
      }

      return {
        matches: enrichedMatches,
        count: enrichedMatches.length,
        searchTerm: validation.normalized,
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
        // Find vehicles in specific spot
        const vehicle = this.vehicleRepository.findBySpotId(spotId);
        vehicles = vehicle ? [vehicle] : [];
      } else if (floor && bay) {
        // Find vehicles in specific floor and bay
        const spots = this.spotRepository.findByFloorAndBay(floor, bay);
        vehicles = spots
          .filter(spot => spot.currentVehicle)
          .map(spot => this.vehicleRepository.findById(spot.currentVehicle))
          .filter(vehicle => vehicle);
      } else if (floor) {
        // Find vehicles on specific floor
        const spots = this.spotRepository.findByFloor(floor);
        vehicles = spots
          .filter(spot => spot.currentVehicle)
          .map(spot => this.vehicleRepository.findById(spot.currentVehicle))
          .filter(vehicle => vehicle);
      } else {
        // Return all parked vehicles
        vehicles = this.vehicleRepository.findParked();
      }

      // Format response with location and duration info
      return vehicles.map(vehicle => {
        const spot = this.spotRepository.findById(vehicle.spotId);
        return {
          licensePlate: vehicle.licensePlate,
          spotId: vehicle.spotId,
          checkInTime: vehicle.checkInTime,
          vehicleType: vehicle.vehicleType,
          currentDuration: this._calculateCurrentDuration(vehicle.checkInTime),
          status: vehicle.getStatus(),
          spot: spot
            ? {
                floor: spot.floor,
                bay: spot.bay,
                spotNumber: spot.spotNumber,
                type: spot.type,
                features: spot.features,
              }
            : null,
        };
      });
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
      let availableSpots = this.spotRepository.findAvailable();

      // Apply filters
      if (floor) {
        availableSpots = availableSpots.filter(spot => spot.floor === parseInt(floor.toString()));
      }

      if (bay) {
        availableSpots = availableSpots.filter(spot => spot.bay === parseInt(bay.toString()));
      }

      if (type) {
        availableSpots = availableSpots.filter(spot => spot.type === type);
      }

      if (features && features.length > 0) {
        availableSpots = availableSpots.filter(spot =>
          features.every(feature => spot.hasFeature(feature))
        );
      }

      return availableSpots.map(spot => ({
        spotId: spot.id,
        floor: spot.floor,
        bay: spot.bay,
        spotNumber: spot.spotNumber,
        type: spot.type,
        status: spot.status,
        features: spot.features,
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
      const licensePlates = this._getCachedLicensePlates();

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
  private _getCachedLicensePlates(): string[] {
    const now = Date.now();

    // Check if cache is valid
    if (this._cacheTimestamp && now - this._cacheTimestamp < this._cacheExpiryMs) {
      return Array.from(this._licensePlateCache.keys());
    }

    // Refresh cache
    const parkedVehicles = this.vehicleRepository.findParked();
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
