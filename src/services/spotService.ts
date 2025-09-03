/**
 * Spot service for business logic operations
 *
 * This module provides business logic services for parking spot operations,
 * including efficient filtering, sorting, and atomic updates using the
 * repository pattern.
 *
 * @module SpotService
 */

import { SpotRepository } from '../repositories/SpotRepository';
import { calculatePagination, paginateArray } from '../utils/pagination';
import {
  SpotStatus,
  VehicleType,
  SpotFeature,
  ServiceResponse,
  PaginationOptions,
} from '../types/models';

interface SpotFilters {
  status?: SpotStatus;
  type?: VehicleType;
  floor?: number;
  bay?: number;
}

interface PaginationParams {
  limit?: number;
  offset?: number;
}

interface SortingParams {
  sort?: string;
  order?: 'asc' | 'desc';
}

interface SpotMetadata {
  total: number;
  filtered: number;
  hasFilters: boolean;
  filtersApplied: SpotFilters;
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  featureCounts: Record<string, number>;
  floors: number[];
  uniqueBays: number;
  occupancyRate: number;
  processingTimeMs?: number;
  timestamp?: string;
}

interface SpotResult {
  spots: any[];
  pagination: any;
  metadata: SpotMetadata;
}

interface StatusUpdateMetadata {
  vehicleId?: string;
  licensePlate?: string;
  reason?: string;
  estimatedCompletion?: string;
}

interface SpotStatistics {
  [key: string]: any;
  metadata?: {
    processingTimeMs: number;
    timestamp: string;
  };
}

/**
 * Service class for spot operations
 */
class SpotService {
  private spotRepository: SpotRepository;

  constructor() {
    this.spotRepository = new SpotRepository();
  }

  /**
   * Get spots with filtering, sorting, and pagination
   * Uses efficient Map iteration for performance
   * @param filters - Filter criteria (status, type, floor, bay)
   * @param pagination - Pagination parameters (limit, offset)
   * @param sorting - Sorting parameters (sort, order)
   * @returns Filtered and paginated spots with metadata
   */
  async getSpots(
    filters: SpotFilters = {},
    pagination: any = {},
    sorting: SortingParams = {}
  ): Promise<SpotResult> {
    try {
      const startTime = process.hrtime.bigint();

      // Get all spots using repository - returns PaginatedResult
      const spotResult = await this.spotRepository.findAll({ take: 1000 }); // Get more spots
      const allSpots = spotResult.data;

      // Apply filters efficiently using iterator pattern
      const filteredSpots = this._filterSpots(allSpots, filters);

      // Apply sorting if specified
      const sortedSpots = this._sortSpots(filteredSpots, sorting);

      // Calculate pagination
      const paginationData = calculatePagination(pagination, sortedSpots.length);

      // Apply pagination
      const paginatedSpots = paginateArray(sortedSpots, paginationData);

      // Generate metadata
      const metadata = this._generateSpotMetadata(allSpots, filteredSpots, filters);

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      return {
        spots: paginatedSpots.map(spot => spot.toObject()),
        pagination: paginationData,
        metadata: {
          ...metadata,
          processingTimeMs: Math.round(processingTime * 100) / 100,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to retrieve spots: ${(error as Error).message}`);
    }
  }

  /**
   * Get a single spot by ID
   * @param spotId - Spot ID to retrieve
   * @returns Spot data or null if not found
   */
  async getSpotById(spotId: string): Promise<any | null> {
    try {
      const spot = await this.spotRepository.findById(spotId);
      return spot;
    } catch (error) {
      throw new Error(`Failed to retrieve spot ${spotId}: ${(error as Error).message}`);
    }
  }

  /**
   * Update a spot with atomic operations
   * @param spotId - Spot ID to update
   * @param updates - Updates to apply
   * @returns Updated spot or null if not found
   */
  async updateSpot(spotId: string, updates: Record<string, any>): Promise<any | null> {
    try {
      const startTime = process.hrtime.bigint();

      // Check if spot exists first
      const existingSpot = await this.spotRepository.findById(spotId);
      if (!existingSpot) {
        return null;
      }

      // Perform atomic update
      const updatedSpot = await this.spotRepository.update(spotId, updates);

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      if (!updatedSpot) {
        return null;
      }

      const result = updatedSpot;
      (result as any).metadata = {
        processingTimeMs: Math.round(processingTime * 100) / 100,
        timestamp: new Date().toISOString(),
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to update spot ${spotId}: ${(error as Error).message}`);
    }
  }

  /**
   * Find available spots with optional filters
   * @param filters - Filter criteria (floor, bay, type, features)
   * @returns Array of available spots
   */
  async findAvailableSpots(filters: SpotFilters = {}): Promise<any[]> {
    try {
      const spotResult = await this.spotRepository.findAll({ take: 1000 });
      const allSpots = spotResult.data;

      // Filter for available spots first
      const availableSpots = allSpots.filter(spot => spot.status === 'AVAILABLE');

      // Apply additional filters
      const filteredSpots = this._filterSpots(availableSpots, filters);

      return filteredSpots;
    } catch (error) {
      throw new Error(`Failed to find available spots: ${(error as Error).message}`);
    }
  }

  /**
   * Find spots with flexible filtering
   * @param filters - Filter criteria (status, floor, bay, type, features)
   * @returns Array of matching spots
   */
  async findSpots(filters: SpotFilters = {}): Promise<any[]> {
    try {
      const spotResult = await this.spotRepository.findAll({ take: 1000 });
      const allSpots = spotResult.data;

      // Apply filters
      const filteredSpots = this._filterSpots(allSpots, filters);

      return filteredSpots;
    } catch (error) {
      throw new Error(`Failed to find spots: ${(error as Error).message}`);
    }
  }

  /**
   * Update spot status with metadata
   * @param spotId - Spot ID to update
   * @param status - New status (available, occupied, maintenance)
   * @param metadata - Additional metadata for the status change
   * @returns Updated spot or null if not found
   */
  async updateSpotStatus(
    spotId: string,
    status: SpotStatus,
    metadata: StatusUpdateMetadata = {}
  ): Promise<any | null> {
    try {
      const updates: Record<string, any> = {
        status,
        lastUpdated: new Date().toISOString(),
      };

      // Add metadata based on status
      if (status === 'occupied' && metadata.vehicleId) {
        updates.vehicleId = metadata.vehicleId;
        updates.licensePlate = metadata.licensePlate;
        updates.occupiedSince = new Date().toISOString();
      } else if (status === 'occupied' && metadata.reason) {
        updates.maintenanceReason = metadata.reason;
        updates.estimatedCompletion = metadata.estimatedCompletion;
      } else if (status === 'available') {
        // Clear occupancy data when spot becomes available
        updates.vehicleId = null;
        updates.licensePlate = null;
        updates.occupiedSince = null;
        updates.maintenanceReason = null;
        updates.estimatedCompletion = null;
      }

      return await this.updateSpot(spotId, updates);
    } catch (error) {
      throw new Error(`Failed to update spot status ${spotId}: ${(error as Error).message}`);
    }
  }

  /**
   * Get spot statistics and counts
   * @returns Comprehensive spot statistics
   */
  async getSpotStatistics(): Promise<SpotStatistics> {
    try {
      const startTime = process.hrtime.bigint();

      // Note: getOccupancyStats doesn't exist in SpotRepository, so we'll build stats from spots
      const spotResult = await this.spotRepository.findAll({ take: 1000 });
      const allSpots = spotResult.data;
      
      const occupancyStats = {
        total: allSpots.length,
        available: allSpots.filter(s => s.status === 'AVAILABLE').length,
        occupied: allSpots.filter(s => s.status === 'OCCUPIED').length,
        rate: 0
      };
      
      occupancyStats.rate = occupancyStats.total > 0 
        ? (occupancyStats.occupied / occupancyStats.total) * 100 
        : 0;

      // Generate detailed statistics
      const stats = this._generateDetailedStats(allSpots, occupancyStats);

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      return {
        ...stats,
        metadata: {
          processingTimeMs: Math.round(processingTime * 100) / 100,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to retrieve spot statistics: ${(error as Error).message}`);
    }
  }

  /**
   * Filter spots efficiently using Map iteration
   * @private
   * @param spots - Array of spots to filter
   * @param filters - Filter criteria
   * @returns Filtered spots
   */
  private _filterSpots(spots: any[], filters: SpotFilters): any[] {
    if (Object.keys(filters).length === 0) {
      return spots;
    }

    return spots.filter(spot => {
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
   * @private
   * @param spots - Array of spots to sort
   * @param sorting - Sorting parameters
   * @returns Sorted spots
   */
  private _sortSpots(spots: any[], sorting: SortingParams): any[] {
    if (!sorting.sort) {
      // Default sort by ID for consistent ordering
      return spots.sort((a, b) => a.id.localeCompare(b.id));
    }

    const { sort, order = 'asc' } = sorting;
    const direction = order === 'desc' ? -1 : 1;

    return spots.sort((a, b) => {
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
   * @private
   * @param allSpots - All spots
   * @param filteredSpots - Filtered spots
   * @param filters - Applied filters
   * @returns Metadata object
   */
  private _generateSpotMetadata(
    allSpots: any[],
    filteredSpots: any[],
    filters: SpotFilters
  ): SpotMetadata {
    const total = allSpots.length;
    const filtered = filteredSpots.length;

    // Count by status
    const statusCounts: Record<string, number> = {
      available: 0,
      occupied: 0,
    };

    // Count by type
    const typeCounts: Record<string, number> = {
      compact: 0,
      standard: 0,
      oversized: 0,
    };

    // Count by features
    const featureCounts: Record<string, number> = {
      ev_charging: 0,
      handicap: 0,
    };

    // Count floors and bays
    const floorSet = new Set<number>();
    const baySet = new Set<string>();

    filteredSpots.forEach(spot => {
      statusCounts[spot.status] = (statusCounts[spot.status] || 0) + 1;
      typeCounts[spot.type] = (typeCounts[spot.type] || 0) + 1;

      spot.features?.forEach((feature: SpotFeature) => {
        featureCounts[feature] = (featureCounts[feature] || 0) + 1;
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
      occupancyRate: total > 0 ? Math.round(((statusCounts.occupied || 0) / total) * 10000) / 100 : 0,
    };
  }

  /**
   * Generate detailed statistics for all spots
   * @private
   * @param allSpots - All spots in the system
   * @param occupancyStats - Basic occupancy statistics
   * @returns Detailed statistics
   */
  private _generateDetailedStats(allSpots: any[], occupancyStats: any): any {
    const floorStats: Record<number, any> = {};
    const typeStats: Record<VehicleType, any> = {
      compact: { total: 0, occupied: 0, available: 0 },
      standard: { total: 0, occupied: 0, available: 0 },
      oversized: { total: 0, occupied: 0, available: 0 },
    };

    const featureStats: Record<SpotFeature, any> = {
      ev_charging: { total: 0, occupied: 0, available: 0 },
      handicap: { total: 0, occupied: 0, available: 0 },
    };

    allSpots.forEach(spot => {
      // Floor statistics
      if (!floorStats[spot.floor]) {
        floorStats[spot.floor] = {
          total: 0,
          occupied: 0,
          available: 0,
          bays: new Set(),
        };
      }

      floorStats[spot.floor].total++;
      floorStats[spot.floor][spot.status]++;
      floorStats[spot.floor].bays.add(spot.bay);

      // Type statistics
      typeStats[spot.type as VehicleType].total++;
      typeStats[spot.type as VehicleType][spot.status]++;

      // Feature statistics
      spot.features.forEach((feature: SpotFeature) => {
        if (featureStats[feature]) {
          featureStats[feature].total++;
          featureStats[feature][spot.status]++;
        }
      });
    });

    // Convert bay sets to counts
    Object.keys(floorStats).forEach(floor => {
      floorStats[floor as any].bays = floorStats[floor as any].bays.size;
    });

    return {
      ...occupancyStats,
      floorStats,
      typeStats,
      featureStats,
    };
  }
}

export { SpotService };
