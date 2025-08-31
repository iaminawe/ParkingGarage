/**
 * Search service for efficient vehicle and spot lookups
 *
 * This module provides high-performance search capabilities using Map-based
 * lookups for O(1) exact matches and optimized algorithms for partial and
 * fuzzy matching of license plates.
 *
 * @module SearchService
 */

import {
  ISearchService,
  VehicleLookupResult,
  VehicleSearchOptions,
  VehicleSearchResult,
  LocationSearchCriteria,
  VehicleLocationInfo,
  AvailableSpotInfo,
  LicensePlate,
  SpotId,
  SpotType,
  SpotFeature,
  Duration,
  ServiceOperationError
} from '../types/index.js';

// Import repositories and utilities (keeping CommonJS imports for now)
const VehicleRepository = require('../repositories/vehicleRepository');
const SpotRepository = require('../repositories/spotRepository');
const { searchLicensePlates, validateSearchTerm } = require('../utils/stringMatcher');

export class SearchService implements ISearchService {
  private vehicleRepository: any;
  private spotRepository: any;

  // Cache for performance optimization
  private licensePlateCache: Map<string, any> = new Map();
  private cacheTimestamp: number | null = null;
  private cacheExpiryMs: number = 30000; // 30 seconds cache

  constructor() {
    this.vehicleRepository = new VehicleRepository();
    this.spotRepository = new SpotRepository();
  }

  /**
   * Find a vehicle by exact license plate match
   */
  async findVehicleByLicensePlate(licensePlate: LicensePlate): Promise<VehicleLookupResult> {
    try {
      if (!licensePlate) {
        throw new ServiceOperationError('License plate is required', 'findVehicle');
      }

      const vehicle = this.vehicleRepository.findById(licensePlate);

      if (!vehicle) {
        return {
          found: false,
          vehicle: null,
          message: 'Vehicle not found'
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
          currentDuration: this.calculateCurrentDuration(vehicle.checkInTime),
          totalAmount: vehicle.totalAmount,
          isPaid: vehicle.isPaid,
          status: vehicle.getStatus(),
          spot: spot ? {
            floor: spot.floor,
            bay: spot.bay,
            spotNumber: spot.spotNumber,
            type: spot.type,
            features: spot.features
          } : null
        }
      };
    } catch (error) {
      if (error instanceof ServiceOperationError) {
        throw error;
      }
      throw new ServiceOperationError(`Failed to find vehicle: ${(error as Error).message}`, 'findVehicle');
    }
  }

  /**
   * Search vehicles by partial license plate match
   */
  async searchVehicles(searchTerm: string, options: VehicleSearchOptions = {}): Promise<VehicleSearchResult> {
    try {
      const {
        maxResults = 20,
        threshold = 0.6,
        mode = 'all'
      } = options;

      // Validate search term
      const validation = validateSearchTerm(searchTerm);
      if (!validation.isValid) {
        return {
          matches: [],
          count: 0,
          errors: validation.errors,
          searchTerm: searchTerm,
          mode
        };
      }

      // Get all currently parked vehicles
      const parkedVehicles = this.vehicleRepository.findParked();
      const licensePlates = parkedVehicles.map((v: any) => v.licensePlate);

      // Perform search using string matcher
      const searchResults = searchLicensePlates(searchTerm, licensePlates, {
        mode,
        threshold,
        maxResults
      });

      // Enrich results with vehicle and spot information
      const enrichedMatches = [];

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
              currentDuration: this.calculateCurrentDuration(vehicle.checkInTime),
              status: vehicle.getStatus()
            },
            spot: spot ? {
              floor: spot.floor,
              bay: spot.bay,
              spotNumber: spot.spotNumber,
              type: spot.type
            } : null
          });
        }
      }

      return {
        matches: enrichedMatches,
        count: enrichedMatches.length,
        searchTerm: validation.normalized,
        mode
      };
    } catch (error) {
      throw new ServiceOperationError(`Failed to search vehicles: ${(error as Error).message}`, 'searchVehicles');
    }
  }

  /**
   * Find all vehicles in a specific spot, bay, or floor
   */
  async findVehiclesByLocation(location: LocationSearchCriteria = {}): Promise<VehicleLocationInfo[]> {
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
          .filter((spot: any) => spot.currentVehicle)
          .map((spot: any) => this.vehicleRepository.findById(spot.currentVehicle))
          .filter((vehicle: any) => vehicle);
      } else if (floor) {
        // Find vehicles on specific floor
        const spots = this.spotRepository.findByFloor(floor);
        vehicles = spots
          .filter((spot: any) => spot.currentVehicle)
          .map((spot: any) => this.vehicleRepository.findById(spot.currentVehicle))
          .filter((vehicle: any) => vehicle);
      } else {
        // Return all parked vehicles
        vehicles = this.vehicleRepository.findParked();
      }

      // Format response with location and duration info
      return vehicles.map((vehicle: any): VehicleLocationInfo => {
        const spot = this.spotRepository.findById(vehicle.spotId);
        return {
          licensePlate: vehicle.licensePlate,
          spotId: vehicle.spotId,
          checkInTime: vehicle.checkInTime,
          vehicleType: vehicle.vehicleType,
          rateType: vehicle.rateType,
          currentDuration: this.calculateCurrentDuration(vehicle.checkInTime),
          totalAmount: vehicle.totalAmount,
          isPaid: vehicle.isPaid,
          status: vehicle.getStatus(),
          spot: spot ? {
            floor: spot.floor,
            bay: spot.bay,
            spotNumber: spot.spotNumber,
            type: spot.type,
            features: spot.features
          } : null
        };
      });
    } catch (error) {
      throw new ServiceOperationError(`Failed to find vehicles by location: ${(error as Error).message}`, 'findVehiclesByLocation');
    }
  }

  /**
   * Find available spots with optional criteria
   */
  async findAvailableSpots(criteria: {
    floor?: number;
    bay?: number;
    type?: SpotType;
    features?: SpotFeature[];
  } = {}): Promise<AvailableSpotInfo[]> {
    try {
      const { floor, bay, type, features } = criteria;
      let availableSpots = this.spotRepository.findAvailable();

      // Apply filters
      if (floor) {
        availableSpots = availableSpots.filter((spot: any) => spot.floor === parseInt(floor.toString()));
      }

      if (bay) {
        availableSpots = availableSpots.filter((spot: any) => spot.bay === parseInt(bay.toString()));
      }

      if (type) {
        availableSpots = availableSpots.filter((spot: any) => spot.type === type);
      }

      if (features && features.length > 0) {
        availableSpots = availableSpots.filter((spot: any) =>
          features.every((feature: SpotFeature) => spot.hasFeature(feature))
        );
      }

      return availableSpots.map((spot: any): AvailableSpotInfo => ({
        spotId: spot.id,
        floor: spot.floor,
        bay: spot.bay,
        spotNumber: spot.spotNumber,
        type: spot.type,
        status: spot.status,
        features: spot.features
      }));
    } catch (error) {
      throw new ServiceOperationError(`Failed to find available spots: ${(error as Error).message}`, 'findAvailableSpots');
    }
  }

  /**
   * Get quick search suggestions based on partial input
   */
  async getSearchSuggestions(partial: string, limit: number = 10): Promise<LicensePlate[]> {
    try {
      if (!partial || partial.length < 2) {
        return [];
      }

      // Get cached license plates for performance
      const licensePlates = this.getCachedLicensePlates();

      // Find matches that start with the partial input
      const suggestions: string[] = [];
      const partialUpper = partial.toUpperCase();

      for (const plate of licensePlates) {
        if (plate.startsWith(partialUpper)) {
          suggestions.push(plate);
        }
        if (suggestions.length >= limit) break;
      }

      // If not enough matches, include contains matches
      if (suggestions.length < limit) {
        for (const plate of licensePlates) {
          if (!suggestions.includes(plate) && plate.includes(partialUpper)) {
            suggestions.push(plate);
            if (suggestions.length >= limit) break;
          }
        }
      }

      return suggestions;
    } catch (error) {
      throw new ServiceOperationError(`Failed to get search suggestions: ${(error as Error).message}`, 'getSearchSuggestions');
    }
  }

  /**
   * Get cached license plates for performance optimization
   */
  private getCachedLicensePlates(): string[] {
    const now = Date.now();

    // Check if cache is valid
    if (this.cacheTimestamp && (now - this.cacheTimestamp) < this.cacheExpiryMs) {
      return Array.from(this.licensePlateCache.keys());
    }

    // Refresh cache
    const parkedVehicles = this.vehicleRepository.findParked();
    this.licensePlateCache.clear();

    parkedVehicles.forEach((vehicle: any) => {
      this.licensePlateCache.set(vehicle.licensePlate, vehicle);
    });

    this.cacheTimestamp = now;

    return Array.from(this.licensePlateCache.keys());
  }

  /**
   * Calculate current parking duration
   */
  private calculateCurrentDuration(checkInTime: string): Duration {
    const checkIn = new Date(checkInTime);
    const now = new Date();
    const durationMs = now.getTime() - checkIn.getTime();

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const totalMinutes = Math.floor(durationMs / (1000 * 60));

    return { hours, minutes, totalMinutes };
  }

  /**
   * Clear search cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.licensePlateCache.clear();
    this.cacheTimestamp = null;
  }
}

export default SearchService;