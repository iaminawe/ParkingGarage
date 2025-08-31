/**
 * Spot service for business logic operations
 *
 * This module provides business logic services for parking spot operations,
 * including efficient filtering, sorting, and atomic updates using the
 * repository pattern.
 *
 * @module SpotService
 */

import {
  ISpotService,
  SpotData,
  SpotFilters,
  SpotQueryOptions,
  SpotSearchResult,
  SpotUpdateData,
  SpotStatistics,
  SpotTypeStats,
  SpotFeatureStats,
  FloorSpotStats,
  PaginationParams,
  SortOptions,
  ResponseMetadata,
  SpotId,
  SpotType,
  SpotFeature,
  ServiceOperationError
} from '../types/index.js';

// Import utilities and repository (keeping CommonJS imports for now)
const SpotRepository = require('../repositories/spotRepository');
const { calculatePagination, paginateArray } = require('../utils/pagination');

/**
 * Service class for spot operations
 */
export class SpotService implements ISpotService {
  private spotRepository: any;

  constructor() {
    this.spotRepository = new SpotRepository();
  }

  /**
   * Get spots with filtering, sorting, and pagination
   * Uses efficient Map iteration for performance
   */
  async getSpots(
    filters: SpotFilters = {}, 
    pagination: PaginationParams = {}, 
    sorting: SortOptions = {}
  ): Promise<SpotSearchResult> {
    try {
      const startTime = process.hrtime.bigint();

      // Get all spots using efficient Map iteration
      const allSpots = this.spotRepository.findAll();

      // Apply filters efficiently using iterator pattern
      const filteredSpots = this.filterSpots(allSpots, filters);

      // Apply sorting if specified
      const sortedSpots = this.sortSpots(filteredSpots, sorting);

      // Calculate pagination
      const paginationData = calculatePagination(pagination, sortedSpots.length);

      // Apply pagination
      const paginatedSpots = paginateArray(sortedSpots, paginationData);

      // Generate metadata
      const metadata = this.generateSpotMetadata(allSpots, filteredSpots, filters);

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      return {
        spots: paginatedSpots.map((spot: any): SpotData => spot.toObject()),
        pagination: paginationData,
        metadata: {
          ...metadata,
          processingTimeMs: Math.round(processingTime * 100) / 100,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      throw new ServiceOperationError(`Failed to retrieve spots: ${(error as Error).message}`, 'getSpots');
    }
  }

  /**
   * Get a single spot by ID
   */
  async getSpotById(spotId: SpotId): Promise<SpotData | null> {
    try {
      const spot = this.spotRepository.findById(spotId);
      return spot ? spot.toObject() : null;
    } catch (error) {
      throw new ServiceOperationError(`Failed to retrieve spot ${spotId}: ${(error as Error).message}`, 'getSpotById');
    }
  }

  /**
   * Update a spot with atomic operations
   */
  async updateSpot(spotId: SpotId, updates: SpotUpdateData): Promise<(SpotData & { metadata: ResponseMetadata }) | null> {
    try {
      const startTime = process.hrtime.bigint();

      // Check if spot exists first
      const existingSpot = this.spotRepository.findById(spotId);
      if (!existingSpot) {
        return null;
      }

      // Perform atomic update
      const updatedSpot = this.spotRepository.update(spotId, updates);

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      if (!updatedSpot) {
        return null;
      }

      const result = updatedSpot.toObject();
      result.metadata = {
        processingTimeMs: Math.round(processingTime * 100) / 100,
        timestamp: new Date().toISOString()
      };

      return result;

    } catch (error) {
      throw new ServiceOperationError(`Failed to update spot ${spotId}: ${(error as Error).message}`, 'updateSpot');
    }
  }

  /**
   * Get spot statistics and counts
   */
  async getSpotStatistics(): Promise<SpotStatistics> {
    try {
      const startTime = process.hrtime.bigint();

      const occupancyStats = this.spotRepository.getOccupancyStats();
      const allSpots = this.spotRepository.findAll();

      // Generate detailed statistics
      const stats = this.generateDetailedStats(allSpots, occupancyStats);

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      return {
        ...stats,
        metadata: {
          processingTimeMs: Math.round(processingTime * 100) / 100,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      throw new ServiceOperationError(`Failed to retrieve spot statistics: ${(error as Error).message}`, 'getStatistics');
    }
  }

  /**
   * Filter spots efficiently using Map iteration
   */
  private filterSpots(spots: any[], filters: SpotFilters): any[] {
    if (Object.keys(filters).length === 0) {
      return spots;
    }

    return spots.filter((spot: any) => {
      // Status filter
      if (filters.status && spot.status !== filters.status) {
        return false;
      }

      // Type filter
      if (filters.type && spot.type !== filters.type) {
        return false;
      }

      // Floor filter
      if (filters.floor && spot.floor !== filters.floor) {
        return false;
      }

      // Bay filter
      if (filters.bay && spot.bay !== filters.bay) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort spots based on criteria
   */
  private sortSpots(spots: any[], sorting: SortOptions): any[] {
    if (!sorting.sort) {
      // Default sort by ID for consistent ordering
      return spots.sort((a: any, b: any) => a.id.localeCompare(b.id));
    }

    const { sort, order = 'asc' } = sorting;
    const direction = order === 'desc' ? -1 : 1;

    return spots.sort((a: any, b: any) => {
      let valueA = a[sort];
      let valueB = b[sort];

      // Handle different data types
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
        return direction * valueA.localeCompare(valueB);
      }

      if (typeof valueA === 'number') {
        return direction * (valueA - valueB);
      }

      if (valueA instanceof Date || typeof valueA === 'string') {
        const dateA = new Date(valueA);
        const dateB = new Date(valueB);
        return direction * (dateA.getTime() - dateB.getTime());
      }

      return 0;
    });
  }

  /**
   * Generate comprehensive spot metadata
   */
  private generateSpotMetadata(
    allSpots: any[], 
    filteredSpots: any[], 
    filters: SpotFilters
  ): Omit<SpotSearchResult['metadata'], 'processingTimeMs' | 'timestamp'> {
    const total = allSpots.length;
    const filtered = filteredSpots.length;

    // Count by status
    const statusCounts = {
      available: 0,
      occupied: 0
    };

    // Count by type
    const typeCounts: Record<SpotType, number> = {
      compact: 0,
      standard: 0,
      oversized: 0
    };

    // Count by features
    const featureCounts: Record<SpotFeature, number> = {
      ev_charging: 0,
      handicap: 0
    };

    // Count floors and bays
    const floorSet = new Set<number>();
    const baySet = new Set<string>();

    filteredSpots.forEach((spot: any) => {
      const status = spot.status as 'available' | 'occupied';
      if (status === 'available' || status === 'occupied') {
        statusCounts[status]++;
      }
      
      if (typeCounts[spot.type as SpotType] !== undefined) {
        typeCounts[spot.type as SpotType]++;
      }

      spot.features.forEach((feature: string) => {
        if (featureCounts[feature as SpotFeature] !== undefined) {
          featureCounts[feature as SpotFeature]++;
        }
      });

      floorSet.add(spot.floor);
      baySet.add(`F${spot.floor}-B${spot.bay}`);
    });

    return {
      total,
      filtered,
      hasFilters: Object.keys(filters).length > 0,
      filtersApplied: filters,
      statusCounts,
      typeCounts,
      featureCounts,
      floors: Array.from(floorSet).sort((a, b) => a - b),
      uniqueBays: baySet.size,
      occupancyRate: total > 0 ? Math.round((statusCounts.occupied / total) * 10000) / 100 : 0
    };
  }

  /**
   * Generate detailed statistics for all spots
   */
  private generateDetailedStats(allSpots: any[], occupancyStats: any): Omit<SpotStatistics, 'metadata'> {
    const floorStats: Record<number, FloorSpotStats> = {};
    const typeStats: Record<SpotType, SpotTypeStats> = {
      compact: { total: 0, occupied: 0, available: 0, occupancyRate: 0 },
      standard: { total: 0, occupied: 0, available: 0, occupancyRate: 0 },
      oversized: { total: 0, occupied: 0, available: 0, occupancyRate: 0 }
    };

    const featureStats: Record<SpotFeature, SpotFeatureStats> = {
      ev_charging: { total: 0, occupied: 0, available: 0, occupancyRate: 0 },
      handicap: { total: 0, occupied: 0, available: 0, occupancyRate: 0 }
    };

    allSpots.forEach((spot: any) => {
      // Floor statistics
      if (!floorStats[spot.floor]) {
        floorStats[spot.floor] = {
          total: 0,
          occupied: 0,
          available: 0,
          occupancyRate: 0,
          bays: 0
        };
      }

      floorStats[spot.floor].total++;
      if (spot.status === 'occupied') {
        floorStats[spot.floor].occupied++;
      } else if (spot.status === 'available') {
        floorStats[spot.floor].available++;
      }

      // Type statistics
      if (typeStats[spot.type as SpotType]) {
        typeStats[spot.type as SpotType].total++;
        if (spot.status === 'occupied') {
          typeStats[spot.type as SpotType].occupied++;
        } else if (spot.status === 'available') {
          typeStats[spot.type as SpotType].available++;
        }
      }

      // Feature statistics
      spot.features.forEach((feature: string) => {
        if (featureStats[feature as SpotFeature]) {
          featureStats[feature as SpotFeature].total++;
          if (spot.status === 'occupied') {
            featureStats[feature as SpotFeature].occupied++;
          } else if (spot.status === 'available') {
            featureStats[feature as SpotFeature].available++;
          }
        }
      });
    });

    // Calculate occupancy rates
    Object.keys(floorStats).forEach(floorKey => {
      const floor = parseInt(floorKey);
      const floorStat = floorStats[floor];
      floorStat.occupancyRate = floorStat.total > 0 ? Math.round((floorStat.occupied / floorStat.total) * 100) : 0;
      
      // Count unique bays for this floor
      const uniqueBays = new Set(
        allSpots
          .filter((spot: any) => spot.floor === floor)
          .map((spot: any) => spot.bay)
      );
      floorStat.bays = uniqueBays.size;
    });

    Object.keys(typeStats).forEach(typeKey => {
      const typeStat = typeStats[typeKey as SpotType];
      typeStat.occupancyRate = typeStat.total > 0 ? Math.round((typeStat.occupied / typeStat.total) * 100) : 0;
    });

    Object.keys(featureStats).forEach(featureKey => {
      const featureStat = featureStats[featureKey as SpotFeature];
      featureStat.occupancyRate = featureStat.total > 0 ? Math.round((featureStat.occupied / featureStat.total) * 100) : 0;
    });

    return {
      ...occupancyStats,
      floorStats,
      typeStats,
      featureStats
    };
  }
}

export default SpotService;