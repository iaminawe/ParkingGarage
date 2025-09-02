/**
 * In-memory storage singleton using JavaScript Maps for O(1) lookups
 * 
 * This module provides a centralized in-memory data store for the parking garage
 * application. It uses the singleton pattern to ensure a single instance across
 * the entire application and provides high-performance O(1) lookups using Map objects.
 * 
 * @module MemoryStore
 */

import type { SpotRecord, VehicleRecord, GarageRecord } from '../types/models';

/**
 * Statistics interface for the memory store
 */
interface MemoryStoreStats {
  totalSpots: number;
  totalVehicles: number;
  occupiedSpots: number;
  availableSpots: number;
  floorsAndBays: number;
}

/**
 * In-memory storage singleton class
 */
export class MemoryStore {
  private static instance: MemoryStore;

  /**
   * Map storing parking spots by their ID
   */
  public readonly spots: Map<string, SpotRecord>;

  /**
   * Map storing vehicle parking records by license plate
   */
  public readonly vehicles: Map<string, VehicleRecord>;

  /**
   * Map storing garage configuration data
   */
  public readonly garageConfig: Map<string, GarageRecord>;

  /**
   * Map for quick lookup of spots by floor and bay
   */
  public readonly spotsByFloorBay: Map<string, Set<string>>;

  /**
   * Set for tracking occupied spots
   */
  public readonly occupiedSpots: Set<string>;

  private constructor() {
    this.spots = new Map<string, SpotRecord>();
    this.vehicles = new Map<string, VehicleRecord>();
    this.garageConfig = new Map<string, GarageRecord>();
    this.spotsByFloorBay = new Map<string, Set<string>>();
    this.occupiedSpots = new Set<string>();
  }

  /**
   * Get the singleton instance of MemoryStore
   * @returns The singleton instance
   */
  public static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
    }
    return MemoryStore.instance;
  }

  /**
   * Clear all data from the store (useful for testing)
   */
  public clear(): void {
    this.spots.clear();
    this.vehicles.clear();
    this.garageConfig.clear();
    this.spotsByFloorBay.clear();
    this.occupiedSpots.clear();
  }

  /**
   * Get statistics about the current state of the store
   * @returns Store statistics
   */
  public getStats(): MemoryStoreStats {
    return {
      totalSpots: this.spots.size,
      totalVehicles: this.vehicles.size,
      occupiedSpots: this.occupiedSpots.size,
      availableSpots: this.spots.size - this.occupiedSpots.size,
      floorsAndBays: this.spotsByFloorBay.size
    };
  }
}

export default MemoryStore;