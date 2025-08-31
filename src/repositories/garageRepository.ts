/**
 * Garage repository for configuration data access operations
 * 
 * This module provides data access methods for garage configuration
 * using the repository pattern. It manages garage settings, rates,
 * and configuration data.
 */

import MemoryStore from '../storage/memoryStore';
import { IGarage, FloorConfig, RateStructure, SpotTypeConfigurations } from '../types';

/**
 * Repository for managing garage configuration
 */
export class GarageRepository {
  private store: MemoryStore;
  private readonly defaultConfigKey = 'default';

  constructor() {
    this.store = MemoryStore.getInstance();
  }

  /**
   * Create a new garage configuration
   */
  create(garageData: Omit<IGarage, 'createdAt' | 'updatedAt'>, configName: string = this.defaultConfigKey): IGarage {
    const garage: IGarage = {
      ...garageData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (this.store.garageConfig.has(configName)) {
      throw new Error(`Garage configuration '${configName}' already exists`);
    }

    this.store.garageConfig.set(configName, garage);
    return { ...garage };
  }

  /**
   * Initialize with default garage configuration
   */
  createDefault(garageName: string = 'Default Parking Garage'): IGarage {
    const garageData: Omit<IGarage, 'createdAt' | 'updatedAt'> = {
      name: garageName,
      floors: [
        { number: 1, bays: 3, spotsPerBay: 20 }
      ],
      rates: {
        standard: 5.00,
        compact: 4.00,
        oversized: 7.00,
        ev_charging: 8.00
      },
      spotTypes: {
        compact: { minSize: 0, maxSize: 1 },
        standard: { minSize: 1, maxSize: 2 },
        oversized: { minSize: 2, maxSize: 3 }
      }
    };

    return this.create(garageData, this.defaultConfigKey);
  }

  /**
   * Find garage configuration by name
   */
  findByName(configName: string = this.defaultConfigKey): IGarage | null {
    const garage = this.store.garageConfig.get(configName);
    return garage ? { ...garage } : null;
  }

  /**
   * Get the default garage configuration
   */
  getDefault(): IGarage | null {
    return this.findByName(this.defaultConfigKey);
  }

  /**
   * Find all garage configurations
   */
  findAll(): IGarage[] {
    return Array.from(this.store.garageConfig.values()).map(garage => ({ ...garage }));
  }

  /**
   * Get all configuration names
   */
  getConfigNames(): string[] {
    return Array.from(this.store.garageConfig.keys());
  }

  /**
   * Update garage configuration
   */
  update(configName: string, updates: Partial<Omit<IGarage, 'createdAt'>>): IGarage | null {
    const garage = this.store.garageConfig.get(configName);
    if (!garage) {
      return null;
    }

    // Apply updates
    const updatedGarage: IGarage = {
      ...garage,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.store.garageConfig.set(configName, updatedGarage);
    return { ...updatedGarage };
  }

  /**
   * Update hourly rate for a spot type
   */
  updateRate(spotType: keyof RateStructure, newRate: number, configName: string = this.defaultConfigKey): boolean {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    if (!garage.rates.hasOwnProperty(spotType)) {
      throw new Error(`Invalid spot type: ${String(spotType)}`);
    }

    if (typeof newRate !== 'number' || newRate < 0) {
      throw new Error('Rate must be a non-negative number');
    }

    const updatedRates = { ...garage.rates, [spotType]: newRate };
    this.update(configName, { rates: updatedRates });
    return true;
  }

  /**
   * Get hourly rate for a spot type
   */
  getHourlyRate(spotType: string, features: string[] = [], configName: string = this.defaultConfigKey): number | null {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    let baseRate = garage.rates[spotType as keyof RateStructure] || garage.rates.standard;

    // Add premium for special features
    if (features.includes('ev_charging')) {
      baseRate = Math.max(baseRate, garage.rates.ev_charging);
    }

    return baseRate;
  }

  /**
   * Add a new floor to the garage
   */
  addFloor(floorNumber: number, bays: number, spotsPerBay: number, configName: string = this.defaultConfigKey): boolean {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    // Check if floor already exists
    if (garage.floors.find(floor => floor.number === floorNumber)) {
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

    const newFloor: FloorConfig = { number: floorNumber, bays, spotsPerBay };
    const updatedFloors = [...garage.floors, newFloor].sort((a, b) => a.number - b.number);
    
    this.update(configName, { floors: updatedFloors });
    return true;
  }

  /**
   * Remove a floor from the garage
   */
  removeFloor(floorNumber: number, configName: string = this.defaultConfigKey): boolean {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    const floorIndex = garage.floors.findIndex(floor => floor.number === floorNumber);
    if (floorIndex === -1) {
      throw new Error(`Floor ${floorNumber} does not exist`);
    }

    if (garage.floors.length === 1) {
      throw new Error('Cannot remove the last floor');
    }

    const updatedFloors = garage.floors.filter(floor => floor.number !== floorNumber);
    this.update(configName, { floors: updatedFloors });
    return true;
  }

  /**
   * Get floor configuration
   */
  getFloor(floorNumber: number, configName: string = this.defaultConfigKey): FloorConfig | null {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    return garage.floors.find(floor => floor.number === floorNumber) || null;
  }

  /**
   * Get total garage capacity
   */
  getTotalCapacity(configName: string = this.defaultConfigKey): number {
    const garage = this.findByName(configName);
    if (!garage) {
      return 0;
    }

    return garage.floors.reduce((total, floor) => {
      return total + (floor.bays * floor.spotsPerBay);
    }, 0);
  }

  /**
   * Get capacity for a specific floor
   */
  getFloorCapacity(floorNumber: number, configName: string = this.defaultConfigKey): number {
    const floor = this.getFloor(floorNumber, configName);
    return floor ? (floor.bays * floor.spotsPerBay) : 0;
  }

  /**
   * Get garage configuration summary
   */
  getSummary(configName: string = this.defaultConfigKey): any | null {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    return {
      name: garage.name,
      totalFloors: garage.floors.length,
      totalCapacity: this.getTotalCapacity(configName),
      rates: { ...garage.rates },
      floorsConfiguration: garage.floors.map(floor => ({
        floor: floor.number,
        bays: floor.bays,
        spotsPerBay: floor.spotsPerBay,
        capacity: floor.bays * floor.spotsPerBay
      }))
    };
  }

  /**
   * Check if a spot type is valid
   */
  isValidSpotType(spotType: string, configName: string = this.defaultConfigKey): boolean {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    return garage.spotTypes.hasOwnProperty(spotType);
  }

  /**
   * Get spot type configuration
   */
  getSpotTypeConfig(spotType: string, configName: string = this.defaultConfigKey): any | null {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    return garage.spotTypes[spotType as keyof SpotTypeConfigurations] || null;
  }

  /**
   * Delete garage configuration
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
   */
  exists(configName: string): boolean {
    return this.store.garageConfig.has(configName);
  }

  /**
   * Get count of configurations
   */
  count(): number {
    return this.store.garageConfig.size;
  }

  /**
   * Clone a configuration with a new name
   */
  clone(sourceConfigName: string, newConfigName: string): IGarage | null {
    const sourceGarage = this.findByName(sourceConfigName);
    if (!sourceGarage) {
      return null;
    }

    if (this.exists(newConfigName)) {
      throw new Error(`Configuration '${newConfigName}' already exists`);
    }

    const clonedData = JSON.parse(JSON.stringify(sourceGarage));
    delete clonedData.createdAt;
    delete clonedData.updatedAt;
    
    return this.create(clonedData, newConfigName);
  }

  /**
   * Clear all configurations (mainly for testing)
   */
  clear(): void {
    this.store.garageConfig.clear();
  }

  /**
   * Ensure default configuration exists, create if not
   */
  ensureDefault(garageName: string = 'Default Parking Garage'): IGarage {
    let defaultGarage = this.getDefault();
    
    if (!defaultGarage) {
      defaultGarage = this.createDefault(garageName);
    }
    
    return defaultGarage;
  }
}