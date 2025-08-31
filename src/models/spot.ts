/**
 * Spot model definition for the parking garage system
 *
 * This module defines the Spot class which represents a parking spot
 * in the garage. Each spot has a unique ID, location information,
 * type, status, and optional features.
 *
 * @module Spot
 */

import { 
  SpotData, 
  SpotInfo, 
  SpotType, 
  SpotStatus, 
  SpotFeature,
  ValidationResult,
  PlainObject,
  VALID_SPOT_FEATURES,
  isSpotFeature,
  areSpotFeatures
} from './ts-types/types';
import { validateSpot, generateSpotId } from '../utils/validators';

/**
 * Represents a parking spot in the garage with comprehensive type safety
 */
export class Spot implements SpotInfo {
  /** Unique spot identifier (F{floor}-B{bay}-S{spot}) */
  public readonly id: string;
  
  /** Floor number (1-based) */
  public readonly floor: number;
  
  /** Bay number within floor (1-based) */
  public readonly bay: number;
  
  /** Spot number within bay (1-based) */
  public readonly spotNumber: number;
  
  /** Spot type */
  public type: SpotType;
  
  /** Current status */
  public status: SpotStatus;
  
  /** Special features */
  public features: SpotFeature[];
  
  /** License plate of current vehicle or null */
  public currentVehicle: string | null;
  
  /** ISO timestamp when spot was created */
  public readonly createdAt: string;
  
  /** ISO timestamp when spot was last updated */
  public updatedAt: string;

  /**
   * Create a new parking spot
   * @param spotData - The spot data
   * @throws {Error} If spot data is invalid
   */
  constructor(spotData: SpotData) {
    // Validate the spot data
    const validation: ValidationResult = validateSpot(spotData as any);
    if (!validation.isValid) {
      throw new Error(`Invalid spot data: ${validation.errors.join(', ')}`);
    }

    this.id = spotData.id;
    this.floor = spotData.floor;
    this.bay = spotData.bay;
    this.spotNumber = spotData.spotNumber;
    this.type = spotData.type;
    this.status = spotData.status;
    this.features = [...spotData.features]; // Create a copy of the array
    this.currentVehicle = spotData.currentVehicle;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Create a spot from floor, bay, and spot number
   * @param floor - Floor number
   * @param bay - Bay number
   * @param spotNumber - Spot number
   * @param type - Spot type
   * @param features - Optional features
   * @returns New spot instance
   */
  static createSpot(
    floor: number, 
    bay: number, 
    spotNumber: number, 
    type: SpotType = SpotType.STANDARD, 
    features: SpotFeature[] = []
  ): Spot {
    const id = generateSpotId(floor, bay, spotNumber);

    return new Spot({
      id,
      floor,
      bay,
      spotNumber,
      type,
      status: SpotStatus.AVAILABLE,
      features,
      currentVehicle: null
    });
  }

  /**
   * Check if the spot is available
   * @returns True if spot is available
   */
  isAvailable(): boolean {
    return this.status === SpotStatus.AVAILABLE;
  }

  /**
   * Check if the spot is occupied
   * @returns True if spot is occupied
   */
  isOccupied(): boolean {
    return this.status === SpotStatus.OCCUPIED;
  }

  /**
   * Occupy the spot with a vehicle
   * @param licensePlate - License plate of the vehicle
   * @throws {Error} If spot is already occupied
   */
  occupy(licensePlate: string): void {
    if (this.isOccupied()) {
      throw new Error(`Spot ${this.id} is already occupied by ${this.currentVehicle}`);
    }

    if (typeof licensePlate !== 'string' || licensePlate.trim().length === 0) {
      throw new Error('License plate must be a non-empty string');
    }

    this.status = SpotStatus.OCCUPIED;
    this.currentVehicle = licensePlate.toUpperCase().trim();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Vacate the spot
   * @throws {Error} If spot is not occupied
   */
  vacate(): void {
    if (!this.isOccupied()) {
      throw new Error(`Spot ${this.id} is not occupied`);
    }

    this.status = SpotStatus.AVAILABLE;
    this.currentVehicle = null;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Check if spot has a specific feature
   * @param feature - Feature to check for
   * @returns True if spot has the feature
   */
  hasFeature(feature: SpotFeature | string): boolean {
    if (typeof feature === 'string') {
      if (!isSpotFeature(feature)) {
        return false;
      }
      return this.features.includes(feature as SpotFeature);
    }
    return this.features.includes(feature);
  }

  /**
   * Add a feature to the spot
   * @param feature - Feature to add
   * @throws {Error} If feature is invalid or already exists
   */
  addFeature(feature: SpotFeature | string): void {
    // Convert string to SpotFeature if needed
    let spotFeature: SpotFeature;
    if (typeof feature === 'string') {
      if (!isSpotFeature(feature)) {
        throw new Error(`Invalid feature: ${feature}. Valid features: ${VALID_SPOT_FEATURES.join(', ')}`);
      }
      spotFeature = feature as SpotFeature;
    } else {
      spotFeature = feature;
    }

    if (this.hasFeature(spotFeature)) {
      throw new Error(`Spot ${this.id} already has feature: ${spotFeature}`);
    }

    this.features.push(spotFeature);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Remove a feature from the spot
   * @param feature - Feature to remove
   * @throws {Error} If feature doesn't exist
   */
  removeFeature(feature: SpotFeature | string): void {
    // Convert string to SpotFeature if needed
    let spotFeature: SpotFeature;
    if (typeof feature === 'string') {
      if (!isSpotFeature(feature)) {
        throw new Error(`Invalid feature: ${feature}`);
      }
      spotFeature = feature as SpotFeature;
    } else {
      spotFeature = feature;
    }

    const index = this.features.indexOf(spotFeature);

    if (index === -1) {
      throw new Error(`Spot ${this.id} does not have feature: ${spotFeature}`);
    }

    this.features.splice(index, 1);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Update the spot type
   * @param newType - New spot type
   * @throws {Error} If spot is occupied and type change affects compatibility
   */
  updateType(newType: SpotType): void {
    if (this.type === newType) {
      return; // No change needed
    }

    // You might want to add business logic here to check if type change
    // is compatible with current vehicle (if any)
    if (this.isOccupied()) {
      // For now, we'll allow the change but log a warning
      console.warn(`Changing type of occupied spot ${this.id} from ${this.type} to ${newType}`);
    }

    this.type = newType;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get the full location string for this spot
   * @returns Location string in format "Floor X, Bay Y, Spot Z"
   */
  getLocationString(): string {
    return `Floor ${this.floor}, Bay ${this.bay}, Spot ${this.spotNumber}`;
  }

  /**
   * Check if this spot is suitable for a vehicle type
   * @param vehicleType - The type of vehicle to check compatibility for
   * @returns True if the spot can accommodate the vehicle type
   */
  canAccommodateVehicle(vehicleType: SpotType): boolean {
    // Simple compatibility: compact spots can't fit oversized vehicles, etc.
    const compatibility: Record<SpotType, SpotType[]> = {
      [SpotType.COMPACT]: [SpotType.COMPACT],
      [SpotType.STANDARD]: [SpotType.COMPACT, SpotType.STANDARD],
      [SpotType.OVERSIZED]: [SpotType.COMPACT, SpotType.STANDARD, SpotType.OVERSIZED]
    };

    return compatibility[this.type].includes(vehicleType);
  }

  /**
   * Get a plain object representation of the spot
   * @returns Plain object with spot data
   */
  toObject(): PlainObject<SpotInfo> {
    return {
      id: this.id,
      floor: this.floor,
      bay: this.bay,
      spotNumber: this.spotNumber,
      type: this.type,
      status: this.status,
      features: [...this.features],
      currentVehicle: this.currentVehicle,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Get JSON representation of the spot
   * @returns JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  /**
   * Create a spot from a plain object
   * @param obj - Plain object with spot data
   * @returns New spot instance
   */
  static fromObject(obj: Partial<SpotInfo>): Spot {
    if (!obj.id || typeof obj.floor !== 'number' || typeof obj.bay !== 'number' || 
        typeof obj.spotNumber !== 'number' || !obj.type || !obj.status) {
      throw new Error('Missing required spot properties');
    }

    // Validate features if provided
    if (obj.features && !areSpotFeatures(obj.features)) {
      throw new Error('Invalid spot features provided');
    }

    const spot = new Spot({
      id: obj.id,
      floor: obj.floor,
      bay: obj.bay,
      spotNumber: obj.spotNumber,
      type: obj.type,
      status: obj.status,
      features: obj.features || [],
      currentVehicle: obj.currentVehicle || null
    });
    
    if (obj.createdAt) {
      (spot as any).createdAt = obj.createdAt;
    }
    if (obj.updatedAt) {
      spot.updatedAt = obj.updatedAt;
    }
    
    return spot;
  }
}