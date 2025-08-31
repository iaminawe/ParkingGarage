/**
 * Garage model definition for garage configuration
 *
 * This module defines the Garage class which represents the overall
 * garage configuration including floors, rates, and spot types.
 * It provides methods for managing garage-wide settings.
 *
 * @module Garage
 */

const { validateGarageConfig } = require('../utils/validators');

/**
 * Represents a parking garage configuration
 */
class Garage {
  /**
   * Create a new garage configuration
   * @param {Object} garageData - The garage configuration data
   * @param {string} garageData.name - Garage name
   * @param {Array} garageData.floors - Array of floor configurations
   * @param {Object} garageData.rates - Rate structure by spot type
   * @param {Object} garageData.spotTypes - Spot type configurations
   */
  constructor(garageData) {
    // Validate the garage configuration
    const validation = validateGarageConfig(garageData);
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
   * @param {string} name - Garage name
   * @returns {Garage} New garage instance with default configuration
   */
  static createDefault(name = 'Default Parking Garage') {
    return new Garage({
      name,
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
    });
  }

  /**
   * Get total number of floors
   * @returns {number} Number of floors
   */
  getTotalFloors() {
    return this.floors.length;
  }

  /**
   * Get floor configuration by floor number
   * @param {number} floorNumber - Floor number to get
   * @returns {Object|null} Floor configuration or null if not found
   */
  getFloor(floorNumber) {
    return this.floors.find(floor => floor.number === floorNumber) || null;
  }

  /**
   * Calculate total capacity of the garage
   * @returns {number} Total number of parking spots
   */
  getTotalCapacity() {
    return this.floors.reduce((total, floor) => {
      return total + (floor.bays * floor.spotsPerBay);
    }, 0);
  }

  /**
   * Get capacity for a specific floor
   * @param {number} floorNumber - Floor number
   * @returns {number} Number of spots on floor, or 0 if floor doesn't exist
   */
  getFloorCapacity(floorNumber) {
    const floor = this.getFloor(floorNumber);
    return floor ? (floor.bays * floor.spotsPerBay) : 0;
  }

  /**
   * Get the hourly rate for a spot type
   * @param {string} spotType - Type of spot ('standard', 'compact', 'oversized')
   * @param {string[]} features - Array of features (e.g., ['ev_charging'])
   * @returns {number} Hourly rate for the spot type
   */
  getHourlyRate(spotType, features = []) {
    let baseRate = this.rates[spotType] || this.rates.standard;

    // Add premium for special features
    if (features.includes('ev_charging')) {
      baseRate = Math.max(baseRate, this.rates.ev_charging);
    }

    return baseRate;
  }

  /**
   * Update hourly rate for a spot type
   * @param {string} spotType - Spot type to update
   * @param {number} newRate - New hourly rate
   * @throws {Error} If spot type is invalid or rate is negative
   */
  updateRate(spotType, newRate) {
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
   * @param {number} floorNumber - Floor number
   * @param {number} bays - Number of bays on the floor
   * @param {number} spotsPerBay - Number of spots per bay
   * @throws {Error} If floor already exists or parameters are invalid
   */
  addFloor(floorNumber, bays, spotsPerBay) {
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
   * @param {number} floorNumber - Floor number to remove
   * @throws {Error} If floor doesn't exist or is the last floor
   */
  removeFloor(floorNumber) {
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
   * @returns {Object} Summary of garage configuration
   */
  getSummary() {
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
   * @param {string} spotType - Spot type to validate
   * @returns {boolean} True if spot type is valid
   */
  isValidSpotType(spotType) {
    return this.spotTypes.hasOwnProperty(spotType);
  }

  /**
   * Get spot type configuration
   * @param {string} spotType - Spot type
   * @returns {Object|null} Spot type configuration or null if invalid
   */
  getSpotTypeConfig(spotType) {
    return this.spotTypes[spotType] || null;
  }

  /**
   * Get a plain object representation of the garage configuration
   * @returns {Object} Plain object with garage data
   */
  toObject() {
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
   * @returns {string} JSON string
   */
  toJSON() {
    return JSON.stringify(this.toObject());
  }

  /**
   * Create a garage configuration from a plain object
   * @param {Object} obj - Plain object with garage data
   * @returns {Garage} New garage instance
   */
  static fromObject(obj) {
    const garage = new Garage(obj);
    if (obj.createdAt) {garage.createdAt = obj.createdAt;}
    if (obj.updatedAt) {garage.updatedAt = obj.updatedAt;}
    return garage;
  }
}

module.exports = Garage;
