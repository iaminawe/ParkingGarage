/**
 * Floor service for business logic operations
 *
 * This module provides business logic services for parking garage floor operations,
 * including filtering, sorting, and atomic updates using the repository pattern.
 *
 * @module FloorService
 */

import { FloorRepository, CreateFloorData, UpdateFloorData, FloorStats } from '../repositories/FloorRepository';
import { SpotRepository } from '../repositories/SpotRepository';
import { calculatePagination, paginateArray } from '../utils/pagination';

interface FloorFilters {
  garageId?: string;
  floorNumber?: number;
  isActive?: boolean;
  hasAvailableSpots?: boolean;
}

interface PaginationParams {
  limit?: number;
  offset?: number;
}

interface SortingParams {
  sort?: string;
  order?: 'asc' | 'desc';
}

interface FloorMetadata {
  total: number;
  filtered: number;
  hasFilters: boolean;
  filtersApplied: FloorFilters;
  activeFloors: number;
  totalSpots: number;
  availableSpots: number;
  occupancyRate: number;
  processingTimeMs?: number;
  timestamp?: string;
}

interface FloorResult {
  floors: any[];
  pagination: any;
  metadata: FloorMetadata;
}

/**
 * Service class for floor operations
 */
export class FloorService {
  private floorRepository: FloorRepository;
  private spotRepository: SpotRepository;

  constructor() {
    this.floorRepository = new FloorRepository();
    this.spotRepository = new SpotRepository();
  }

  /**
   * Get floors with filtering, sorting, and pagination
   * @param filters - Filter criteria (garageId, floorNumber, isActive)
   * @param pagination - Pagination parameters (limit, offset)
   * @param sorting - Sorting parameters (sort, order)
   * @returns Filtered and paginated floors with metadata
   */
  async getFloors(
    filters: FloorFilters = {},
    pagination: PaginationParams = {},
    sorting: SortingParams = {}
  ): Promise<FloorResult> {
    try {
      const startTime = process.hrtime.bigint();

      // Get floors with spots information
      const floorResult = await this.floorRepository.findWithSpots(filters.garageId, {
        take: 1000, // Get all floors first
      });

      const allFloors = floorResult.data;

      // Apply filters efficiently
      const filteredFloors = this._filterFloors(allFloors, filters);

      // Apply sorting if specified
      const sortedFloors = this._sortFloors(filteredFloors, sorting);

      // Calculate pagination
      const paginationData = calculatePagination(pagination, sortedFloors.length);

      // Apply pagination
      const paginatedFloors = paginateArray(sortedFloors, paginationData);

      // Generate metadata
      const metadata = await this._generateFloorMetadata(allFloors, filteredFloors, filters);

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      return {
        floors: paginatedFloors,
        pagination: paginationData,
        metadata: {
          ...metadata,
          processingTimeMs: Math.round(processingTime * 100) / 100,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to retrieve floors: ${(error as Error).message}`);
    }
  }

  /**
   * Get a single floor by ID with spots information
   * @param floorId - Floor ID to retrieve
   * @returns Floor data or null if not found
   */
  async getFloorById(floorId: string): Promise<any | null> {
    try {
      const floor = await this.floorRepository.findById(floorId, {
        include: {
          spots: {
            select: {
              id: true,
              spotNumber: true,
              status: true,
              spotType: true,
              level: true,
              section: true,
              isActive: true,
            },
          },
          garage: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              spots: true,
            },
          },
        },
      });

      return floor;
    } catch (error) {
      throw new Error(`Failed to retrieve floor ${floorId}: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new floor
   * @param floorData - Floor creation data
   * @returns Created floor
   */
  async createFloor(floorData: CreateFloorData): Promise<any> {
    try {
      const startTime = process.hrtime.bigint();

      // Check if floor number already exists in this garage
      const existingFloor = await this.floorRepository.findByFloorNumber(
        floorData.garageId,
        floorData.floorNumber
      );

      if (existingFloor) {
        throw new Error(`Floor ${floorData.floorNumber} already exists in this garage`);
      }

      // Create the floor
      const newFloor = await this.floorRepository.create(floorData);

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      // Add metadata
      (newFloor as any).metadata = {
        processingTimeMs: Math.round(processingTime * 100) / 100,
        timestamp: new Date().toISOString(),
      };

      return newFloor;
    } catch (error) {
      throw new Error(`Failed to create floor: ${(error as Error).message}`);
    }
  }

  /**
   * Update a floor with atomic operations
   * @param floorId - Floor ID to update
   * @param updates - Updates to apply
   * @returns Updated floor or null if not found
   */
  async updateFloor(floorId: string, updates: UpdateFloorData): Promise<any | null> {
    try {
      const startTime = process.hrtime.bigint();

      // Check if floor exists first
      const existingFloor = await this.floorRepository.findById(floorId);
      if (!existingFloor) {
        return null;
      }

      // If updating floor number, check for conflicts
      if (updates.floorNumber && updates.floorNumber !== existingFloor.floorNumber) {
        const conflictingFloor = await this.floorRepository.findByFloorNumber(
          existingFloor.garageId,
          updates.floorNumber
        );
        if (conflictingFloor && conflictingFloor.id !== floorId) {
          throw new Error(`Floor ${updates.floorNumber} already exists in this garage`);
        }
      }

      // Perform atomic update
      const updatedFloor = await this.floorRepository.update(floorId, updates);

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      if (!updatedFloor) {
        return null;
      }

      // Add metadata
      (updatedFloor as any).metadata = {
        processingTimeMs: Math.round(processingTime * 100) / 100,
        timestamp: new Date().toISOString(),
      };

      return updatedFloor;
    } catch (error) {
      throw new Error(`Failed to update floor ${floorId}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a floor (soft delete by setting isActive to false)
   * @param floorId - Floor ID to delete
   * @returns Success status
   */
  async deleteFloor(floorId: string): Promise<{ success: boolean; message: string }> {
    try {
      const startTime = process.hrtime.bigint();

      // Check if floor exists and has active spots
      const floor = await this.floorRepository.findById(floorId, {
        include: {
          _count: {
            select: {
              spots: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
      });

      if (!floor) {
        return { success: false, message: 'Floor not found' };
      }

      if ((floor as any)._count.spots > 0) {
        return {
          success: false,
          message: 'Cannot delete floor with active parking spots. Please remove spots first.',
        };
      }

      // Soft delete the floor
      await this.floorRepository.update(floorId, { isActive: false });

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      return {
        success: true,
        message: `Floor ${floor.floorNumber} deleted successfully`,
      };
    } catch (error) {
      throw new Error(`Failed to delete floor ${floorId}: ${(error as Error).message}`);
    }
  }

  /**
   * Get floor statistics
   * @param garageId - Optional garage ID to filter by
   * @returns Comprehensive floor statistics
   */
  async getFloorStatistics(garageId?: string): Promise<FloorStats> {
    try {
      const startTime = process.hrtime.bigint();

      const stats = await this.floorRepository.getFloorStats(garageId);

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      return {
        ...stats,
        metadata: {
          processingTimeMs: Math.round(processingTime * 100) / 100,
          timestamp: new Date().toISOString(),
        },
      } as any;
    } catch (error) {
      throw new Error(`Failed to retrieve floor statistics: ${(error as Error).message}`);
    }
  }

  /**
   * Update spot count for a floor (useful after adding/removing spots)
   * @param floorId - Floor ID
   * @returns Updated floor
   */
  async updateFloorSpotCount(floorId: string): Promise<any | null> {
    try {
      const updatedFloor = await this.floorRepository.updateSpotCount(floorId);
      return updatedFloor;
    } catch (error) {
      throw new Error(`Failed to update spot count for floor ${floorId}: ${(error as Error).message}`);
    }
  }

  /**
   * Filter floors based on criteria
   * @private
   * @param floors - Array of floors to filter
   * @param filters - Filter criteria
   * @returns Filtered floors
   */
  private _filterFloors(floors: any[], filters: FloorFilters): any[] {
    if (Object.keys(filters).length === 0) {
      return floors;
    }

    return floors.filter((floor) => {
      // Floor number filter
      if (filters.floorNumber && floor.floorNumber !== filters.floorNumber) {
        return false;
      }

      // Active status filter
      if (filters.isActive !== undefined && floor.isActive !== filters.isActive) {
        return false;
      }

      // Has available spots filter
      if (filters.hasAvailableSpots) {
        const hasAvailable = floor.spots?.some(
          (spot: any) => spot.status === 'AVAILABLE' && spot.isActive
        );
        if (!hasAvailable) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort floors based on criteria
   * @private
   * @param floors - Array of floors to sort
   * @param sorting - Sorting parameters
   * @returns Sorted floors
   */
  private _sortFloors(floors: any[], sorting: SortingParams): any[] {
    if (!sorting.sort) {
      // Default sort by floor number
      return floors.sort((a, b) => a.floorNumber - b.floorNumber);
    }

    const { sort, order = 'asc' } = sorting;
    const direction = order === 'desc' ? -1 : 1;

    return floors.sort((a, b) => {
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
   * Generate comprehensive floor metadata
   * @private
   * @param allFloors - All floors
   * @param filteredFloors - Filtered floors
   * @param filters - Applied filters
   * @returns Metadata object
   */
  private async _generateFloorMetadata(
    allFloors: any[],
    filteredFloors: any[],
    filters: FloorFilters
  ): Promise<FloorMetadata> {
    const total = allFloors.length;
    const filtered = filteredFloors.length;
    const activeFloors = filteredFloors.filter((floor) => floor.isActive).length;

    // Calculate spot statistics
    let totalSpots = 0;
    let availableSpots = 0;

    filteredFloors.forEach((floor) => {
      if (floor.spots && Array.isArray(floor.spots)) {
        totalSpots += floor.spots.length;
        availableSpots += floor.spots.filter((spot: any) => spot.status === 'AVAILABLE').length;
      }
    });

    const occupancyRate = totalSpots > 0 ? Math.round(((totalSpots - availableSpots) / totalSpots) * 10000) / 100 : 0;

    return {
      total,
      filtered,
      hasFilters: Object.keys(filters).length > 0,
      filtersApplied: filters,
      activeFloors,
      totalSpots,
      availableSpots,
      occupancyRate,
    };
  }

  /**
   * Get bay information for a specific floor
   * @param floorId - The floor ID
   * @param options - Options for bay retrieval
   */
  async getFloorBays(
    floorId: string, 
    options: { includeSpots?: boolean; status?: string } = {}
  ) {
    try {
      // First check if floor exists
      const floor = await this.floorRepository.findById(floorId);
      if (!floor) {
        return null;
      }

      // Get all spots for this floor
      const spotsResult = await this.spotRepository.findAll({
        where: { floorId },
        take: 1000, // Reasonable limit
      });

      const spots = spotsResult.data;
      
      // Group spots by bay (section)
      const bayMap = new Map<string, any>();
      
      spots.forEach(spot => {
        const bayKey = spot.section || 'Unknown';
        
        if (!bayMap.has(bayKey)) {
          bayMap.set(bayKey, {
            bayNumber: bayKey,
            totalSpots: 0,
            availableSpots: 0,
            occupiedSpots: 0,
            spots: options.includeSpots ? [] : undefined,
          });
        }

        const bay = bayMap.get(bayKey);
        bay.totalSpots++;
        
        if (spot.status === 'AVAILABLE') {
          bay.availableSpots++;
        } else if (spot.status === 'OCCUPIED') {
          bay.occupiedSpots++;
        }

        // Add spot details if requested
        if (options.includeSpots) {
          // Apply status filter if provided
          if (!options.status || options.status === 'all' || spot.status.toLowerCase() === options.status.toLowerCase()) {
            bay.spots.push(spot);
          }
        }
      });

      // Convert map to array and sort by bay number
      const bays = Array.from(bayMap.values()).sort((a, b) => {
        if (a.bayNumber === 'Unknown') return 1;
        if (b.bayNumber === 'Unknown') return -1;
        return a.bayNumber.localeCompare(b.bayNumber);
      });

      return {
        floorId,
        floorNumber: floor.floorNumber,
        totalBays: bays.length,
        bays,
      };
    } catch (error) {
      console.error(`Error getting floor bays for ${floorId}:`, error);
      throw error;
    }
  }

  /**
   * Get specific bay details with spots
   * @param floorId - The floor ID
   * @param bayNumber - The bay number (section identifier like A, B, C, D)
   * @param options - Options for bay retrieval
   */
  async getBayDetails(
    floorId: string, 
    bayNumber: string | number, 
    options: { includeSpots?: boolean; status?: string } = {}
  ) {
    try {
      // First check if floor exists
      const floor = await this.floorRepository.findById(floorId);
      if (!floor) {
        return null;
      }

      // Convert bay number to string for section matching
      const sectionId = bayNumber.toString();

      // Find spots in the specific bay
      const spotsResult = await this.spotRepository.findAll({
        where: { 
          floorId,
          section: sectionId 
        },
        take: 100, // Reasonable limit for a single bay
      });

      const spots = spotsResult.data;
      
      if (spots.length === 0) {
        return null; // Bay doesn't exist or has no spots
      }

      // Calculate bay statistics
      const totalSpots = spots.length;
      const availableSpots = spots.filter(s => s.status === 'AVAILABLE').length;
      const occupiedSpots = spots.filter(s => s.status === 'OCCUPIED').length;
      const maintenanceSpots = spots.filter(s => s.status === 'MAINTENANCE').length;

      // Filter spots by status if requested
      let filteredSpots = spots;
      if (options.status && options.status !== 'all') {
        filteredSpots = spots.filter(s => s.status.toLowerCase() === options.status!.toLowerCase());
      }

      return {
        floorId,
        floorNumber: floor.floorNumber,
        bayNumber: sectionId,
        totalSpots,
        availableSpots,
        occupiedSpots,
        maintenanceSpots,
        occupancyRate: totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0,
        spots: options.includeSpots ? filteredSpots : undefined,
      };
    } catch (error) {
      console.error(`Error getting bay details for floor ${floorId}, bay ${bayNumber}:`, error);
      throw error;
    }
  }
}