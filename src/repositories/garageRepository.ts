/**
 * Garage repository for configuration data access operations
 *
 * This module provides data access methods for garage configuration
 * using the repository pattern. It manages garage settings, rates,
 * and configuration data.
 *
 * @module GarageRepository
 */

import { MemoryStore } from '../storage/memoryStore';
import {
  GarageConfig,
  GarageRecord,
  FloorConfig,
  RateStructure,
  SpotTypeConfig,
  VehicleType,
  SpotFeature,
} from '../types/models';
import { Garage } from '../models/garage';

/**
 * Repository for managing garage configurations
 */
export class GarageRepository {
  private store: MemoryStore;
  private defaultConfigKey = 'default';

  constructor() {
    this.store = MemoryStore.getInstance();
  }

  /**
   * Create a new garage configuration
   * @param garageData - Garage configuration data
   * @param configName - Name/key for the configuration
   * @returns Created garage instance
   * @throws Error If configuration already exists or data is invalid
   */
  create(garageData: GarageConfig, configName: string = this.defaultConfigKey): Garage {
    const garage = new Garage(garageData);

    if (this.store.garageConfig.has(configName)) {
      throw new Error(`Garage configuration '${configName}' already exists`);
    }

    this.store.garageConfig.set(configName, garage);
    return garage;
  }

  /**
   * Initialize with default garage configuration
   * @param garageName - Name of the garage
   * @returns Created default garage configuration
   */
  createDefault(garageName = 'Default Parking Garage'): Garage {
    const garage = Garage.createDefault(garageName);
    this.store.garageConfig.set(this.defaultConfigKey, garage);
    return garage;
  }

  /**
   * Find garage configuration by name
   * @param configName - Configuration name to find
   * @returns Found garage configuration or null if not found
   */
  findByName(configName: string = this.defaultConfigKey): Garage | null {
    const garage = this.store.garageConfig.get(configName);
    return garage || null;
  }

  /**
   * Get the default garage configuration
   * @returns Default garage configuration or null if not set
   */
  getDefault(): Garage | null {
    return this.findByName(this.defaultConfigKey);
  }

  /**
   * Find all garage configurations
   * @returns Array of all garage configurations
   */
  findAll(): Garage[] {
    const garages = Array.from(this.store.garageConfig.values());
    return garages;
  }

  /**
   * Get all configuration names
   * @returns Array of configuration names
   */
  getConfigNames(): string[] {
    return Array.from(this.store.garageConfig.keys());
  }

  /**
   * Update garage configuration
   * @param configName - Configuration name to update
   * @param updates - Fields to update
   * @returns Updated garage or null if not found
   * @throws Error If trying to update immutable fields
   */
  update(configName: string, updates: Partial<GarageRecord>): Garage | null {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    // Prevent updating immutable fields
    const immutableFields: (keyof GarageRecord)[] = ['createdAt'];
    const invalidFields = Object.keys(updates).filter(field =>
      immutableFields.includes(field as keyof GarageRecord)
    );

    if (invalidFields.length > 0) {
      throw new Error(`Cannot update immutable fields: ${invalidFields.join(', ')}`);
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key === 'floors' && updates.floors) {
        garage.floors = updates.floors.map(floor => ({ ...floor }));
      } else if (key === 'rates' && updates.rates) {
        garage.rates = { ...updates.rates };
      } else if (key === 'spotTypes' && updates.spotTypes) {
        garage.spotTypes = { ...updates.spotTypes };
      } else if (updates[key as keyof GarageRecord] !== undefined) {
        (garage as any)[key] = updates[key as keyof GarageRecord];
      }
    });

    garage.updatedAt = new Date().toISOString();
    return garage;
  }

  /**
   * Update hourly rate for a spot type
   * @param spotType - Spot type to update
   * @param newRate - New hourly rate
   * @param configName - Configuration name
   * @returns True if successful, false if config not found
   * @throws Error If spot type is invalid or rate is invalid
   */
  updateRate(
    spotType: VehicleType,
    newRate: number,
    configName: string = this.defaultConfigKey
  ): boolean {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    garage.updateRate(spotType, newRate);
    return true;
  }

  /**
   * Get hourly rate for a spot type
   * @param spotType - Spot type
   * @param features - Array of features
   * @param configName - Configuration name
   * @returns Hourly rate or null if config not found
   */
  getHourlyRate(
    spotType: VehicleType,
    features: SpotFeature[] = [],
    configName: string = this.defaultConfigKey
  ): number | null {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    return garage.getHourlyRate(spotType, features);
  }

  /**
   * Add a new floor to the garage
   * @param floorNumber - Floor number
   * @param bays - Number of bays on the floor
   * @param spotsPerBay - Number of spots per bay
   * @param configName - Configuration name
   * @returns True if successful, false if config not found
   * @throws Error If floor already exists or parameters are invalid
   */
  addFloor(
    floorNumber: number,
    bays: number,
    spotsPerBay: number,
    configName: string = this.defaultConfigKey
  ): boolean {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    garage.addFloor(floorNumber, bays, spotsPerBay);
    return true;
  }

  /**
   * Remove a floor from the garage
   * @param floorNumber - Floor number to remove
   * @param configName - Configuration name
   * @returns True if successful, false if config not found
   * @throws Error If floor doesn't exist or is the last floor
   */
  removeFloor(floorNumber: number, configName: string = this.defaultConfigKey): boolean {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    garage.removeFloor(floorNumber);
    return true;
  }

  /**
   * Get floor configuration
   * @param floorNumber - Floor number
   * @param configName - Configuration name
   * @returns Floor configuration or null if not found
   */
  getFloor(floorNumber: number, configName: string = this.defaultConfigKey): FloorConfig | null {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    return garage.getFloor(floorNumber);
  }

  /**
   * Get total garage capacity
   * @param configName - Configuration name
   * @returns Total capacity or 0 if config not found
   */
  getTotalCapacity(configName: string = this.defaultConfigKey): number {
    const garage = this.findByName(configName);
    if (!garage) {
      return 0;
    }

    return garage.getTotalCapacity();
  }

  /**
   * Get capacity for a specific floor
   * @param floorNumber - Floor number
   * @param configName - Configuration name
   * @returns Floor capacity or 0 if not found
   */
  getFloorCapacity(floorNumber: number, configName: string = this.defaultConfigKey): number {
    const garage = this.findByName(configName);
    if (!garage) {
      return 0;
    }

    return garage.getFloorCapacity(floorNumber);
  }

  /**
   * Get garage configuration summary
   * @param configName - Configuration name
   * @returns Configuration summary or null if not found
   */
  getSummary(configName: string = this.defaultConfigKey): ReturnType<Garage['getSummary']> | null {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    return garage.getSummary();
  }

  /**
   * Check if a spot type is valid
   * @param spotType - Spot type to validate
   * @param configName - Configuration name
   * @returns True if valid, false otherwise
   */
  isValidSpotType(
    spotType: string,
    configName: string = this.defaultConfigKey
  ): spotType is VehicleType {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    return garage.isValidSpotType(spotType);
  }

  /**
   * Get spot type configuration
   * @param spotType - Spot type
   * @param configName - Configuration name
   * @returns Spot type configuration or null if not found
   */
  getSpotTypeConfig(
    spotType: VehicleType,
    configName: string = this.defaultConfigKey
  ): SpotTypeConfig[VehicleType] | null {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    return garage.getSpotTypeConfig(spotType);
  }

  /**
   * Delete garage configuration
   * @param configName - Configuration name to delete
   * @returns True if deleted, false if not found
   * @throws Error If trying to delete the default configuration and it's the only one
   */
  delete(configName: string): boolean {
    if (!this.store.garageConfig.has(configName)) {
      return false;
    }

    if (configName === this.defaultConfigKey && this.store.garageConfig.size === 1) {
      throw new Error('Cannot delete the only garage configuration');
    }

    this.store.garageConfig.delete(configName);
    return true;
  }

  /**
   * Check if a configuration exists
   * @param configName - Configuration name to check
   * @returns True if configuration exists
   */
  exists(configName: string): boolean {
    return this.store.garageConfig.has(configName);
  }

  /**
   * Get count of configurations
   * @returns Number of configurations
   */
  count(): number {
    return this.store.garageConfig.size;
  }

  /**
   * Clone a configuration with a new name
   * @param sourceConfigName - Source configuration name
   * @param newConfigName - New configuration name
   * @returns Cloned garage configuration or null if source not found
   * @throws Error If new configuration name already exists
   */
  clone(sourceConfigName: string, newConfigName: string): Garage | null {
    const sourceGarage = this.findByName(sourceConfigName);
    if (!sourceGarage) {
      return null;
    }

    if (this.exists(newConfigName)) {
      throw new Error(`Configuration '${newConfigName}' already exists`);
    }

    const clonedData = sourceGarage.toObject();
    const clonedGarage = new Garage(clonedData);

    this.store.garageConfig.set(newConfigName, clonedGarage);
    return clonedGarage;
  }

  /**
   * Clear all configurations (mainly for testing)
   */
  clear(): void {
    this.store.garageConfig.clear();
  }

  /**
   * Ensure default configuration exists, create if not
   * @param garageName - Name for default garage
   * @returns Default garage configuration
   */
  ensureDefault(garageName = 'Default Parking Garage'): Garage {
    let defaultGarage = this.getDefault();

    if (!defaultGarage) {
      defaultGarage = this.createDefault(garageName);
    }

    return defaultGarage;
  }
}
