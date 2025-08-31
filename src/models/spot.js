/**
 * Spot model definition for the parking garage system
 * 
 * This module defines the Spot class which represents a parking spot
 * in the garage. Each spot has a unique ID, location information,
 * type, status, and optional features.
 * 
 * @module Spot
 */

const { validateSpot, generateSpotId } = require('../utils/validators');

/**
 * Represents a parking spot in the garage
 */
class Spot {
  /**
   * Create a new parking spot
   * @param {Object} spotData - The spot data
   * @param {string} spotData.id - Unique spot identifier (F{floor}-B{bay}-S{spot})
   * @param {number} spotData.floor - Floor number (1-based)
   * @param {number} spotData.bay - Bay number within floor (1-based)
   * @param {number} spotData.spotNumber - Spot number within bay (1-based)
   * @param {string} spotData.type - Spot type: 'compact', 'standard', 'oversized'
   * @param {string} spotData.status - Current status: 'available', 'occupied'
   * @param {string[]} spotData.features - Special features: ['ev_charging', 'handicap']
   * @param {string|null} spotData.currentVehicle - License plate of current vehicle or null
   */
  constructor(spotData) {
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
   * @param {number} floor - Floor number
   * @param {number} bay - Bay number
   * @param {number} spotNumber - Spot number
   * @param {string} type - Spot type
   * @param {string[]} features - Optional features
   * @returns {Spot} New spot instance
   */
  static createSpot(floor, bay, spotNumber, type = 'standard', features = []) {
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
   * @returns {boolean} True if spot is available
   */
  isAvailable() {
    return this.status === 'available';
  }

  /**
   * Check if the spot is occupied
   * @returns {boolean} True if spot is occupied
   */
  isOccupied() {
    return this.status === 'occupied';
  }

  /**
   * Occupy the spot with a vehicle
   * @param {string} licensePlate - License plate of the vehicle
   * @throws {Error} If spot is already occupied
   */
  occupy(licensePlate) {
    if (this.isOccupied()) {
      throw new Error(`Spot ${this.id} is already occupied by ${this.currentVehicle}`);
    }

    this.status = 'occupied';
    this.currentVehicle = licensePlate;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Vacate the spot
   * @throws {Error} If spot is not occupied
   */
  vacate() {
    if (!this.isOccupied()) {
      throw new Error(`Spot ${this.id} is not occupied`);
    }

    this.status = 'available';
    this.currentVehicle = null;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Check if spot has a specific feature
   * @param {string} feature - Feature to check for
   * @returns {boolean} True if spot has the feature
   */
  hasFeature(feature) {
    return this.features.includes(feature);
  }

  /**
   * Add a feature to the spot
   * @param {string} feature - Feature to add
   * @throws {Error} If feature is invalid or already exists
   */
  addFeature(feature) {
    const validFeatures = ['ev_charging', 'handicap'];
    
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
   * @param {string} feature - Feature to remove
   * @throws {Error} If feature doesn't exist
   */
  removeFeature(feature) {
    const index = this.features.indexOf(feature);
    
    if (index === -1) {
      throw new Error(`Spot ${this.id} does not have feature: ${feature}`);
    }

    this.features.splice(index, 1);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get a plain object representation of the spot
   * @returns {Object} Plain object with spot data
   */
  toObject() {
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
   * @returns {string} JSON string
   */
  toJSON() {
    return JSON.stringify(this.toObject());
  }

  /**
   * Create a spot from a plain object
   * @param {Object} obj - Plain object with spot data
   * @returns {Spot} New spot instance
   */
  static fromObject(obj) {
    const spot = new Spot(obj);
    if (obj.createdAt) spot.createdAt = obj.createdAt;
    if (obj.updatedAt) spot.updatedAt = obj.updatedAt;
    return spot;
  }
}

module.exports = Spot;