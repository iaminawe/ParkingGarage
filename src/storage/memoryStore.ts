/**
 * In-memory storage singleton using JavaScript Maps for O(1) lookups
 * 
 * This module provides a centralized in-memory data store for the parking garage
 * application. It uses the singleton pattern to ensure a single instance across
 * the entire application and provides high-performance O(1) lookups using Map objects.
 */

import { ISpot, IVehicle, IGarage } from '../types';

export interface StoreStatistics {
  totalSpots: number;
  totalVehicles: number;
  occupiedSpots: number;
  availableSpots: number;
  floorsAndBays: number;
}

/**
 * Singleton in-memory storage class
 */
export class MemoryStore {
  private static instance: MemoryStore;

  /**
   * Map storing parking spots by their ID
   */
  public spots: Map<string, ISpot> = new Map();

  /**
   * Map storing vehicle parking records by license plate
   */
  public vehicles: Map<string, IVehicle> = new Map();

  /**
   * Map storing garage configuration data
   */
  public garageConfig: Map<string, any> = new Map();

  /**
   * Map for quick lookup of spots by floor and bay
   */
  public spotsByFloorBay: Map<string, Set<string>> = new Map();

  /**
   * Map for tracking occupied spots
   */
  public occupiedSpots: Set<string> = new Set();

  private constructor() {
    if (MemoryStore.instance) {
      return MemoryStore.instance;
    }

    this.spots = new Map();
    this.vehicles = new Map();
    this.garageConfig = new Map();
    this.spotsByFloorBay = new Map();
    this.occupiedSpots = new Set();

    MemoryStore.instance = this;
  }

  /**
   * Get the singleton instance of MemoryStore
   */
  static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
    }
    return MemoryStore.instance;
  }

  /**
   * Clear all data from the store (useful for testing)
   */
  clear(): void {
    this.spots.clear();
    this.vehicles.clear();
    this.garageConfig.clear();
    this.spotsByFloorBay.clear();
    this.occupiedSpots.clear();
  }

  /**
   * Get statistics about the current state of the store
   */
  getStats(): StoreStatistics {
    return {
      totalSpots: this.spots.size,
      totalVehicles: this.vehicles.size,
      occupiedSpots: this.occupiedSpots.size,
      availableSpots: this.spots.size - this.occupiedSpots.size,
      floorsAndBays: this.spotsByFloorBay.size
    };
  }
}

// Export singleton instance
export default MemoryStore;