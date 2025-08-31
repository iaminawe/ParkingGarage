/**
 * Garage repository for configuration data access operations
 *
 * This module provides data access methods for garage configuration
 * using the repository pattern. It manages garage settings, rates,
 * and configuration data.
 *
 * @module GarageRepository
 */

const MemoryStore = require('../storage/memoryStore');
const Garage = require('../models/garage');

/**
 * Repository for managing garage configuration
 */
class GarageRepository {
  constructor() {
    this.store = MemoryStore.getInstance();
    this.defaultConfigKey = 'default';
  }

  /**
   * Create a new garage configuration
   * @param {Object} garageData - Garage configuration data
   * @param {string} configName - Name/key for the configuration
   * @returns {Garage} Created garage instance
   * @throws {Error} If configuration already exists or data is invalid
   */
  create(garageData, configName = this.defaultConfigKey) {
    const garage = new Garage(garageData);

    if (this.store.garageConfig.has(configName)) {
      throw new Error(`Garage configuration '${configName}' already exists`);
    }

    this.store.garageConfig.set(configName, garage);
    return garage;
  }

  /**
   * Initialize with default garage configuration
   * @param {string} garageName - Name of the garage
   * @returns {Garage} Created default garage configuration
   */
  createDefault(garageName = 'Default Parking Garage') {
    const garage = Garage.createDefault(garageName);
    this.store.garageConfig.set(this.defaultConfigKey, garage);
    return garage;
  }

  /**
   * Find garage configuration by name
   * @param {string} configName - Configuration name to find
   * @returns {Garage|null} Found garage configuration or null if not found
   */
  findByName(configName = this.defaultConfigKey) {
    return this.store.garageConfig.get(configName) || null;
  }

  /**
   * Get the default garage configuration
   * @returns {Garage|null} Default garage configuration or null if not set
   */
  getDefault() {
    return this.findByName(this.defaultConfigKey);
  }

  /**
   * Find all garage configurations
   * @returns {Garage[]} Array of all garage configurations
   */
  findAll() {
    return Array.from(this.store.garageConfig.values());
  }

  /**
   * Get all configuration names
   * @returns {string[]} Array of configuration names
   */
  getConfigNames() {
    return Array.from(this.store.garageConfig.keys());
  }

  /**
   * Update garage configuration
   * @param {string} configName - Configuration name to update
   * @param {Object} updates - Fields to update
   * @returns {Garage|null} Updated garage or null if not found
   * @throws {Error} If trying to update immutable fields
   */
  update(configName, updates) {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    // Prevent updating immutable fields
    const immutableFields = ['createdAt'];
    const invalidFields = Object.keys(updates).filter(field => immutableFields.includes(field));

    if (invalidFields.length > 0) {
      throw new Error(`Cannot update immutable fields: ${invalidFields.join(', ')}`);
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key === 'floors') {
        garage.floors = updates[key].map(floor => ({ ...floor }));
      } else if (key === 'rates') {
        garage.rates = { ...updates[key] };
      } else if (key === 'spotTypes') {
        garage.spotTypes = { ...updates[key] };
      } else {
        garage[key] = updates[key];
      }
    });

    garage.updatedAt = new Date().toISOString();
    return garage;
  }

  /**
   * Update hourly rate for a spot type
   * @param {string} spotType - Spot type to update
   * @param {number} newRate - New hourly rate
   * @param {string} configName - Configuration name
   * @returns {boolean} True if successful, false if config not found
   * @throws {Error} If spot type is invalid or rate is invalid
   */
  updateRate(spotType, newRate, configName = this.defaultConfigKey) {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    garage.updateRate(spotType, newRate);
    return true;
  }

  /**
   * Get hourly rate for a spot type
   * @param {string} spotType - Spot type
   * @param {string[]} features - Array of features
   * @param {string} configName - Configuration name
   * @returns {number|null} Hourly rate or null if config not found
   */
  getHourlyRate(spotType, features = [], configName = this.defaultConfigKey) {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    return garage.getHourlyRate(spotType, features);
  }

  /**
   * Add a new floor to the garage
   * @param {number} floorNumber - Floor number
   * @param {number} bays - Number of bays on the floor
   * @param {number} spotsPerBay - Number of spots per bay
   * @param {string} configName - Configuration name
   * @returns {boolean} True if successful, false if config not found
   * @throws {Error} If floor already exists or parameters are invalid
   */
  addFloor(floorNumber, bays, spotsPerBay, configName = this.defaultConfigKey) {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    garage.addFloor(floorNumber, bays, spotsPerBay);
    return true;
  }

  /**
   * Remove a floor from the garage
   * @param {number} floorNumber - Floor number to remove
   * @param {string} configName - Configuration name
   * @returns {boolean} True if successful, false if config not found
   * @throws {Error} If floor doesn't exist or is the last floor
   */
  removeFloor(floorNumber, configName = this.defaultConfigKey) {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    garage.removeFloor(floorNumber);
    return true;
  }

  /**
   * Get floor configuration
   * @param {number} floorNumber - Floor number
   * @param {string} configName - Configuration name
   * @returns {Object|null} Floor configuration or null if not found
   */
  getFloor(floorNumber, configName = this.defaultConfigKey) {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    return garage.getFloor(floorNumber);
  }

  /**
   * Get total garage capacity
   * @param {string} configName - Configuration name
   * @returns {number} Total capacity or 0 if config not found
   */
  getTotalCapacity(configName = this.defaultConfigKey) {
    const garage = this.findByName(configName);
    if (!garage) {
      return 0;
    }

    return garage.getTotalCapacity();
  }

  /**
   * Get capacity for a specific floor
   * @param {number} floorNumber - Floor number
   * @param {string} configName - Configuration name
   * @returns {number} Floor capacity or 0 if not found
   */
  getFloorCapacity(floorNumber, configName = this.defaultConfigKey) {
    const garage = this.findByName(configName);
    if (!garage) {
      return 0;
    }

    return garage.getFloorCapacity(floorNumber);
  }

  /**
   * Get garage configuration summary
   * @param {string} configName - Configuration name
   * @returns {Object|null} Configuration summary or null if not found
   */
  getSummary(configName = this.defaultConfigKey) {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    return garage.getSummary();
  }

  /**
   * Check if a spot type is valid
   * @param {string} spotType - Spot type to validate
   * @param {string} configName - Configuration name
   * @returns {boolean} True if valid, false otherwise
   */
  isValidSpotType(spotType, configName = this.defaultConfigKey) {
    const garage = this.findByName(configName);
    if (!garage) {
      return false;
    }

    return garage.isValidSpotType(spotType);
  }

  /**
   * Get spot type configuration
   * @param {string} spotType - Spot type
   * @param {string} configName - Configuration name
   * @returns {Object|null} Spot type configuration or null if not found
   */
  getSpotTypeConfig(spotType, configName = this.defaultConfigKey) {
    const garage = this.findByName(configName);
    if (!garage) {
      return null;
    }

    return garage.getSpotTypeConfig(spotType);
  }

  /**
   * Delete garage configuration
   * @param {string} configName - Configuration name to delete
   * @returns {boolean} True if deleted, false if not found
   * @throws {Error} If trying to delete the default configuration and it's the only one
   */
  delete(configName) {
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
   * @param {string} configName - Configuration name to check
   * @returns {boolean} True if configuration exists
   */
  exists(configName) {
    return this.store.garageConfig.has(configName);
  }

  /**
   * Get count of configurations
   * @returns {number} Number of configurations
   */
  count() {
    return this.store.garageConfig.size;
  }

  /**
   * Clone a configuration with a new name
   * @param {string} sourceConfigName - Source configuration name
   * @param {string} newConfigName - New configuration name
   * @returns {Garage|null} Cloned garage configuration or null if source not found
   * @throws {Error} If new configuration name already exists
   */
  clone(sourceConfigName, newConfigName) {
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
  clear() {
    this.store.garageConfig.clear();
  }

  /**
   * Ensure default configuration exists, create if not
   * @param {string} garageName - Name for default garage
   * @returns {Garage} Default garage configuration
   */
  ensureDefault(garageName = 'Default Parking Garage') {
    let defaultGarage = this.getDefault();

    if (!defaultGarage) {
      defaultGarage = this.createDefault(garageName);
    }

    return defaultGarage;
  }
}

module.exports = GarageRepository;
