/**
 * Spot model definition for the parking garage system
 * 
 * This module defines the Spot class which represents a parking spot
 * in the garage. Each spot has a unique ID, location information,
 * type, status, and optional features.
 * 
 * @module Spot
 */

import { validateSpot, generateSpotId } from '../utils/validators';
import type { 
  SpotData, 
  SpotRecord, 
  VehicleType, 
  SpotStatus, 
  SpotFeature 
} from '../types/models';

/**
 * Represents a parking spot in the garage
 */
export class Spot implements SpotRecord {
  public id: string;
  public floor: number;
  public bay: number;
  public spotNumber: number;
  public type: VehicleType;
  public status: SpotStatus;
  public features: SpotFeature[];
  public currentVehicle: string | null;
  public createdAt: string;
  public updatedAt: string;

  /**
   * Create a new parking spot
   * @param spotData - The spot data
   */
  constructor(spotData: SpotData) {
    // Validate the spot data
    const validation = validateSpot(spotData);
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
    type: VehicleType = 'standard', 
    features: SpotFeature[] = []
  ): Spot {
    const id = generateSpotId(floor, bay, spotNumber);
    
    return new Spot({
      id,
      floor,
      bay,
      spotNumber,
      type,
      status: 'available',
      features,
      currentVehicle: null
    });
  }

  /**
   * Check if the spot is available
   * @returns True if spot is available
   */
  isAvailable(): boolean {
    return this.status === 'available';
  }

  /**
   * Check if the spot is occupied
   * @returns True if spot is occupied
   */
  isOccupied(): boolean {
    return this.status === 'occupied';
  }

  /**
   * Occupy the spot with a vehicle
   * @param licensePlate - License plate of the vehicle
   * @throws If spot is already occupied
   */
  occupy(licensePlate: string): void {
    if (this.isOccupied()) {
      throw new Error(`Spot ${this.id} is already occupied by ${this.currentVehicle}`);
    }

    this.status = 'occupied';
    this.currentVehicle = licensePlate;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Vacate the spot
   * @throws If spot is not occupied
   */
  vacate(): void {
    if (!this.isOccupied()) {
      throw new Error(`Spot ${this.id} is not occupied`);
    }

    this.status = 'available';
    this.currentVehicle = null;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Check if spot has a specific feature
   * @param feature - Feature to check for
   * @returns True if spot has the feature
   */
  hasFeature(feature: SpotFeature): boolean {
    return this.features.includes(feature);
  }

  /**
   * Add a feature to the spot
   * @param feature - Feature to add
   * @throws If feature is invalid or already exists
   */
  addFeature(feature: SpotFeature): void {
    const validFeatures: SpotFeature[] = ['ev_charging', 'handicap'];
    
    if (!validFeatures.includes(feature)) {
      throw new Error(`Invalid feature: ${feature}. Valid features: ${validFeatures.join(', ')}`);
    }

    if (this.hasFeature(feature)) {
      throw new Error(`Spot ${this.id} already has feature: ${feature}`);
    }

    this.features.push(feature);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Remove a feature from the spot
   * @param feature - Feature to remove
   * @throws If feature doesn't exist
   */
  removeFeature(feature: SpotFeature): void {
    const index = this.features.indexOf(feature);
    
    if (index === -1) {
      throw new Error(`Spot ${this.id} does not have feature: ${feature}`);
    }

    this.features.splice(index, 1);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get a plain object representation of the spot
   * @returns Plain object with spot data
   */
  toObject(): SpotRecord {
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
  static fromObject(obj: Partial<SpotRecord> & SpotData): Spot {
    const spot = new Spot(obj);
    if (obj.createdAt) spot.createdAt = obj.createdAt;
    if (obj.updatedAt) spot.updatedAt = obj.updatedAt;
    return spot;
  }
}

export default Spot;