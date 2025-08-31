/**
 * Spot service for business logic operations
 *
 * This module provides business logic services for parking spot operations,
 * including efficient filtering, sorting, and atomic updates using the
 * repository pattern.
 *
 * @module SpotService
 */

const SpotRepository = require('../repositories/spotRepository');
const { calculatePagination, paginateArray } = require('../utils/pagination');

/**
 * Service class for spot operations
 */
class SpotService {
  constructor() {
    this.spotRepository = new SpotRepository();
  }

  /**
   * Get spots with filtering, sorting, and pagination
   * Uses efficient Map iteration for performance
   * @param {Object} filters - Filter criteria (status, type, floor, bay)
   * @param {Object} pagination - Pagination parameters (limit, offset)
   * @param {Object} sorting - Sorting parameters (sort, order)
   * @returns {Object} Filtered and paginated spots with metadata
   */
  async getSpots(filters = {}, pagination = {}, sorting = {}) {
    try {
      const startTime = process.hrtime.bigint();

      // Get all spots using efficient Map iteration
      const allSpots = this.spotRepository.findAll();

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
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      throw new Error(`Failed to retrieve spots: ${error.message}`);
    }
  }

  /**
   * Get a single spot by ID
   * @param {string} spotId - Spot ID to retrieve
   * @returns {Object|null} Spot data or null if not found
   */
  async getSpotById(spotId) {
    try {
      const spot = this.spotRepository.findById(spotId);
      return spot ? spot.toObject() : null;
    } catch (error) {
      throw new Error(`Failed to retrieve spot ${spotId}: ${error.message}`);
    }
  }

  /**
   * Update a spot with atomic operations
   * @param {string} spotId - Spot ID to update
   * @param {Object} updates - Updates to apply
   * @returns {Object|null} Updated spot or null if not found
   */
  async updateSpot(spotId, updates) {
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
      throw new Error(`Failed to update spot ${spotId}: ${error.message}`);
    }
  }

  /**
   * Get spot statistics and counts
   * @returns {Object} Comprehensive spot statistics
   */
  async getSpotStatistics() {
    try {
      const startTime = process.hrtime.bigint();

      const occupancyStats = this.spotRepository.getOccupancyStats();
      const allSpots = this.spotRepository.findAll();

      // Generate detailed statistics
      const stats = this._generateDetailedStats(allSpots, occupancyStats);

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
      throw new Error(`Failed to retrieve spot statistics: ${error.message}`);
    }
  }

  /**
   * Filter spots efficiently using Map iteration
   * @private
   * @param {Array} spots - Array of spots to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered spots
   */
  _filterSpots(spots, filters) {
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
   * @param {Array} spots - Array of spots to sort
   * @param {Object} sorting - Sorting parameters
   * @returns {Array} Sorted spots
   */
  _sortSpots(spots, sorting) {
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
   * @param {Array} allSpots - All spots
   * @param {Array} filteredSpots - Filtered spots
   * @param {Object} filters - Applied filters
   * @returns {Object} Metadata object
   */
  _generateSpotMetadata(allSpots, filteredSpots, filters) {
    const total = allSpots.length;
    const filtered = filteredSpots.length;

    // Count by status
    const statusCounts = {
      available: 0,
      occupied: 0
    };

    // Count by type
    const typeCounts = {
      compact: 0,
      standard: 0,
      oversized: 0
    };

    // Count by features
    const featureCounts = {
      ev_charging: 0,
      handicap: 0
    };

    // Count floors and bays
    const floorSet = new Set();
    const baySet = new Set();

    filteredSpots.forEach(spot => {
      statusCounts[spot.status]++;
      typeCounts[spot.type]++;

      spot.features.forEach(feature => {
        if (featureCounts[feature] !== undefined) {
          featureCounts[feature]++;
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
   * @private
   * @param {Array} allSpots - All spots in the system
   * @param {Object} occupancyStats - Basic occupancy statistics
   * @returns {Object} Detailed statistics
   */
  _generateDetailedStats(allSpots, occupancyStats) {
    const floorStats = {};
    const typeStats = {
      compact: { total: 0, occupied: 0, available: 0 },
      standard: { total: 0, occupied: 0, available: 0 },
      oversized: { total: 0, occupied: 0, available: 0 }
    };

    const featureStats = {
      ev_charging: { total: 0, occupied: 0, available: 0 },
      handicap: { total: 0, occupied: 0, available: 0 }
    };

    allSpots.forEach(spot => {
      // Floor statistics
      if (!floorStats[spot.floor]) {
        floorStats[spot.floor] = {
          total: 0,
          occupied: 0,
          available: 0,
          bays: new Set()
        };
      }

      floorStats[spot.floor].total++;
      floorStats[spot.floor][spot.status]++;
      floorStats[spot.floor].bays.add(spot.bay);

      // Type statistics
      typeStats[spot.type].total++;
      typeStats[spot.type][spot.status]++;

      // Feature statistics
      spot.features.forEach(feature => {
        if (featureStats[feature]) {
          featureStats[feature].total++;
          featureStats[feature][spot.status]++;
        }
      });
    });

    // Convert bay sets to counts
    Object.keys(floorStats).forEach(floor => {
      floorStats[floor].bays = floorStats[floor].bays.size;
    });

    return {
      ...occupancyStats,
      floorStats,
      typeStats,
      featureStats
    };
  }
}

module.exports = SpotService;
