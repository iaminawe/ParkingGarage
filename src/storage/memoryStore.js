/**
 * In-memory storage singleton using JavaScript Maps for O(1) lookups
 *
 * This module provides a centralized in-memory data store for the parking garage
 * application. It uses the singleton pattern to ensure a single instance across
 * the entire application and provides high-performance O(1) lookups using Map objects.
 *
 * @module MemoryStore
 */

class MemoryStore {
  constructor() {
    if (MemoryStore.instance) {
      return MemoryStore.instance;
    }

    /**
     * Map storing parking spots by their ID
     * @type {Map<string, Object>}
     */
    this.spots = new Map();

    /**
     * Map storing vehicle parking records by license plate
     * @type {Map<string, Object>}
     */
    this.vehicles = new Map();

    /**
     * Map storing garage configuration data
     * @type {Map<string, Object>}
     */
    this.garageConfig = new Map();

    /**
     * Map for quick lookup of spots by floor and bay
     * @type {Map<string, Set<string>>}
     */
    this.spotsByFloorBay = new Map();

    /**
     * Map for tracking occupied spots
     * @type {Set<string>}
     */
    this.occupiedSpots = new Set();

    MemoryStore.instance = this;
    return this;
  }

  /**
   * Get the singleton instance of MemoryStore
   * @returns {MemoryStore} The singleton instance
   */
  static getInstance() {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
    }
    return MemoryStore.instance;
  }

  /**
   * Clear all data from the store (useful for testing)
   */
  clear() {
    this.spots.clear();
    this.vehicles.clear();
    this.garageConfig.clear();
    this.spotsByFloorBay.clear();
    this.occupiedSpots.clear();
  }

  /**
   * Get statistics about the current state of the store
   * @returns {Object} Store statistics
   */
  getStats() {
    return {
      totalSpots: this.spots.size,
      totalVehicles: this.vehicles.size,
      occupiedSpots: this.occupiedSpots.size,
      availableSpots: this.spots.size - this.occupiedSpots.size,
      floorsAndBays: this.spotsByFloorBay.size
    };
  }
}

module.exports = MemoryStore;
