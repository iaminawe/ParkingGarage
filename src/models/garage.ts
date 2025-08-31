/**
 * Garage model definition for garage configuration
 *
 * This module defines the Garage class which represents the overall
 * garage configuration including floors, rates, and spot types.
 * It provides methods for managing garage-wide settings.
 *
 * @module Garage
 */

import { 
  GarageData, 
  GarageConfig, 
  GarageSummary,
  FloorConfig, 
  FloorSummary,
  RateStructure,
  SpotTypeMap,
  SpotType,
  SpotFeature,
  ValidationResult,
  PlainObject,
  DEFAULT_GARAGE_CONFIG,
  isSpotType
} from './ts-types/types';
import { validateGarageConfig } from '../utils/validators';

/**
 * Represents a parking garage configuration with comprehensive type safety
 */
export class Garage implements GarageConfig {
  /** Name of the garage */
  public readonly name: string;
  
  /** Array of floor configurations */
  public floors: FloorConfig[];
  
  /** Rate structure for different spot types and features */
  public rates: RateStructure;
  
  /** Spot type configurations with size constraints */
  public spotTypes: SpotTypeMap;
  
  /** ISO timestamp when garage was created */
  public readonly createdAt: string;
  
  /** ISO timestamp when garage was last updated */
  public updatedAt: string;

  /**
   * Create a new garage configuration
   * @param garageData - The garage configuration data
   * @throws {Error} If garage configuration is invalid
   */
  constructor(garageData: GarageData) {
    // Validate the garage configuration
    const validation: ValidationResult = validateGarageConfig(garageData);
    if (!validation.isValid) {
      throw new Error(`Invalid garage configuration: ${validation.errors.join(', ')}`);
    }

    this.name = garageData.name;
    this.floors = garageData.floors.map(floor => ({
      number: floor.number,
      bays: floor.bays,
      spotsPerBay: floor.spotsPerBay
    }));
    this.rates = { ...garageData.rates };
    this.spotTypes = { ...garageData.spotTypes };
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Create a default garage configuration
   * @param name - Garage name
   * @returns New garage instance with default configuration
   */
  static createDefault(name: string = 'Default Parking Garage'): Garage {
    const defaultConfig = DEFAULT_GARAGE_CONFIG;
    
    return new Garage({
      name,
      floors: defaultConfig.floors!,
      rates: defaultConfig.rates!,
      spotTypes: defaultConfig.spotTypes!
    });
  }

  /**
   * Get total number of floors
   * @returns Number of floors
   */
  getTotalFloors(): number {
    return this.floors.length;
  }

  /**
   * Get floor configuration by floor number
   * @param floorNumber - Floor number to get
   * @returns Floor configuration or null if not found
   */
  getFloor(floorNumber: number): FloorConfig | null {
    return this.floors.find(floor => floor.number === floorNumber) || null;
  }

  /**
   * Calculate total capacity of the garage
   * @returns Total number of parking spots
   */
  getTotalCapacity(): number {
    return this.floors.reduce((total, floor) => {
      return total + (floor.bays * floor.spotsPerBay);
    }, 0);
  }

  /**
   * Get capacity for a specific floor
   * @param floorNumber - Floor number
   * @returns Number of spots on floor, or 0 if floor doesn't exist
   */
  getFloorCapacity(floorNumber: number): number {
    const floor = this.getFloor(floorNumber);
    return floor ? (floor.bays * floor.spotsPerBay) : 0;
  }

  /**
   * Get the hourly rate for a spot type with optional features
   * @param spotType - Type of spot
   * @param features - Array of features (e.g., ['ev_charging'])
   * @returns Hourly rate for the spot type
   */
  getHourlyRate(spotType: SpotType, features: SpotFeature[] = []): number {
    let baseRate = this.rates[spotType] || this.rates.standard;

    // Add premium for special features
    if (features.includes(SpotFeature.EV_CHARGING)) {
      baseRate = Math.max(baseRate, this.rates.ev_charging);
    }

    return baseRate;
  }

  /**
   * Update hourly rate for a spot type
   * @param spotType - Spot type to update
   * @param newRate - New hourly rate
   * @throws {Error} If spot type is invalid or rate is negative
   */
  updateRate(spotType: SpotType, newRate: number): void {
    if (!this.rates.hasOwnProperty(spotType)) {
      throw new Error(`Invalid spot type: ${spotType}`);
    }

    if (typeof newRate !== 'number' || newRate < 0) {
      throw new Error('Rate must be a non-negative number');
    }

    this.rates[spotType] = newRate;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Add a new floor to the garage
   * @param floorNumber - Floor number
   * @param bays - Number of bays on the floor
   * @param spotsPerBay - Number of spots per bay
   * @throws {Error} If floor already exists or parameters are invalid
   */
  addFloor(floorNumber: number, bays: number, spotsPerBay: number): void {
    if (this.getFloor(floorNumber)) {
      throw new Error(`Floor ${floorNumber} already exists`);
    }

    if (typeof floorNumber !== 'number' || floorNumber < 1) {
      throw new Error('Floor number must be a positive number');
    }

    if (typeof bays !== 'number' || bays < 1) {
      throw new Error('Number of bays must be a positive number');
    }

    if (typeof spotsPerBay !== 'number' || spotsPerBay < 1) {
      throw new Error('Spots per bay must be a positive number');
    }

    this.floors.push({ number: floorNumber, bays, spotsPerBay });
    this.floors.sort((a, b) => a.number - b.number);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Remove a floor from the garage
   * @param floorNumber - Floor number to remove
   * @throws {Error} If floor doesn't exist or is the last floor
   */
  removeFloor(floorNumber: number): void {
    const index = this.floors.findIndex(floor => floor.number === floorNumber);

    if (index === -1) {
      throw new Error(`Floor ${floorNumber} does not exist`);
    }

    if (this.floors.length === 1) {
      throw new Error('Cannot remove the last floor');
    }

    this.floors.splice(index, 1);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get configuration summary
   * @returns Summary of garage configuration
   */
  getSummary(): GarageSummary {
    return {
      name: this.name,
      totalFloors: this.getTotalFloors(),
      totalCapacity: this.getTotalCapacity(),
      rates: { ...this.rates },
      floorsConfiguration: this.floors.map(floor => ({
        floor: floor.number,
        bays: floor.bays,
        spotsPerBay: floor.spotsPerBay,
        capacity: floor.bays * floor.spotsPerBay
      }))
    };
  }

  /**
   * Check if a spot type is valid for this garage
   * @param spotType - Spot type to validate (string or SpotType enum)
   * @returns True if spot type is valid
   */
  isValidSpotType(spotType: string | SpotType): boolean {
    if (typeof spotType === 'string') {
      return isSpotType(spotType) && this.spotTypes.hasOwnProperty(spotType);
    }
    return this.spotTypes.hasOwnProperty(spotType);
  }

  /**
   * Get spot type configuration
   * @param spotType - Spot type
   * @returns Spot type configuration or null if invalid
   */
  getSpotTypeConfig(spotType: SpotType): { minSize: number; maxSize: number } | null {
    return this.spotTypes[spotType] || null;
  }

  /**
   * Get a plain object representation of the garage configuration
   * @returns Plain object with garage data
   */
  toObject(): PlainObject<GarageConfig> {
    return {
      name: this.name,
      floors: this.floors.map(floor => ({ ...floor })),
      rates: { ...this.rates },
      spotTypes: { ...this.spotTypes },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Get JSON representation of the garage configuration
   * @returns JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  /**
   * Create a garage configuration from a plain object
   * @param obj - Plain object with garage data
   * @returns New garage instance
   */
  static fromObject(obj: Partial<GarageConfig>): Garage {
    if (!obj.name || !obj.floors || !obj.rates || !obj.spotTypes) {
      throw new Error('Missing required garage configuration properties');
    }

    const garage = new Garage({
      name: obj.name,
      floors: obj.floors,
      rates: obj.rates,
      spotTypes: obj.spotTypes
    });
    
    if (obj.createdAt) {
      (garage as any).createdAt = obj.createdAt;
    }
    if (obj.updatedAt) {
      garage.updatedAt = obj.updatedAt;
    }
    
    return garage;
  }
}