/**
 * In-memory storage singleton using JavaScript Maps for O(1) lookups
 * 
 * This module provides a centralized in-memory data store for the parking garage
 * application. It uses the singleton pattern to ensure a single instance across
 * the entire application and provides high-performance O(1) lookups using Map objects.
 * 
 * @module MemoryStore
 */

// Type imports for storage - we'll store the actual implementations
type StoredVehicle = any;
type StoredSpot = any;
type StoredGarage = any;

export class MemoryStore {
  private static instance: MemoryStore;

  /**
   * Map storing parking spots by their ID
   */
  public readonly spots: Map<string, StoredSpot>;

  /**
   * Map storing vehicle parking records by license plate
   */
  public readonly vehicles: Map<string, StoredVehicle>;

  /**
   * Map storing parking sessions by session ID
   */
  public readonly sessions: Map<string, any>;

  /**
   * Map storing garage configuration data
   */
  public readonly garageConfig: Map<string, StoredGarage>;

  /**
   * Map for quick lookup of spots by floor and bay
   */
  public readonly spotsByFloorBay: Map<string, Set<string>>;

  /**
   * Set for tracking occupied spots
   */
  public readonly occupiedSpots: Set<string>;

  private constructor() {
    this.spots = new Map<string, StoredSpot>();
    this.vehicles = new Map<string, StoredVehicle>();
    this.sessions = new Map<string, any>();
    this.garageConfig = new Map<string, StoredGarage>();
    this.spotsByFloorBay = new Map<string, Set<string>>();
    this.occupiedSpots = new Set<string>();
  }

  /**
   * Get the singleton instance of MemoryStore
   * @returns The singleton instance
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
    this.sessions.clear();
    this.garageConfig.clear();
    this.spotsByFloorBay.clear();
    this.occupiedSpots.clear();
  }

  /**
   * Get statistics about the current state of the store
   * @returns Store statistics
   */
  getStats(): {
    totalSpots: number;
    totalVehicles: number;
    totalSessions: number;
    occupiedSpots: number;
    availableSpots: number;
    floorsAndBays: number;
  } {
    return {
      totalSpots: this.spots.size,
      totalVehicles: this.vehicles.size,
      totalSessions: this.sessions.size,
      occupiedSpots: this.occupiedSpots.size,
      availableSpots: this.spots.size - this.occupiedSpots.size,
      floorsAndBays: this.spotsByFloorBay.size
    };
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  static resetInstance(): void {
    MemoryStore.instance = new MemoryStore();
  }
}