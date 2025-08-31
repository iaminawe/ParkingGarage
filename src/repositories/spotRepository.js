/**
 * Spot repository for data access operations
 *
 * This module provides data access methods for parking spots using
 * the repository pattern. It abstracts the underlying storage mechanism
 * and provides a clean interface for CRUD operations.
 *
 * @module SpotRepository
 */

const MemoryStore = require('../storage/memoryStore');
const Spot = require('../models/spot');
const { generateSpotId, isValidSpotId } = require('../utils/validators');

/**
 * Repository for managing parking spots
 */
class SpotRepository {
  constructor() {
    this.store = MemoryStore.getInstance();
  }

  /**
   * Create a new parking spot
   * @param {Object} spotData - Spot data to create
   * @returns {Spot} Created spot instance
   * @throws {Error} If spot already exists or data is invalid
   */
  create(spotData) {
    const spot = new Spot(spotData);

    if (this.store.spots.has(spot.id)) {
      throw new Error(`Spot with ID ${spot.id} already exists`);
    }

    this.store.spots.set(spot.id, spot);

    // Update floor/bay index
    const floorBayKey = `F${spot.floor}-B${spot.bay}`;
    if (!this.store.spotsByFloorBay.has(floorBayKey)) {
      this.store.spotsByFloorBay.set(floorBayKey, new Set());
    }
    this.store.spotsByFloorBay.get(floorBayKey).add(spot.id);

    return spot;
  }

  /**
   * Create a spot from floor, bay, and spot number
   * @param {number} floor - Floor number
   * @param {number} bay - Bay number
   * @param {number} spotNumber - Spot number
   * @param {string} type - Spot type
   * @param {string[]} features - Optional features
   * @returns {Spot} Created spot instance
   */
  createSpot(floor, bay, spotNumber, type = 'standard', features = []) {
    const spot = Spot.createSpot(floor, bay, spotNumber, type, features);
    return this.create(spot.toObject());
  }

  /**
   * Find a spot by ID
   * @param {string} spotId - Spot ID to find
   * @returns {Spot|null} Found spot or null if not found
   */
  findById(spotId) {
    return this.store.spots.get(spotId) || null;
  }

  /**
   * Find all spots
   * @returns {Spot[]} Array of all spots
   */
  findAll() {
    return Array.from(this.store.spots.values());
  }

  /**
   * Find spots by status
   * @param {string} status - Status to filter by ('available' or 'occupied')
   * @returns {Spot[]} Array of spots matching the status
   */
  findByStatus(status) {
    return this.findAll().filter(spot => spot.status === status);
  }

  /**
   * Find available spots
   * @returns {Spot[]} Array of available spots
   */
  findAvailable() {
    return this.findByStatus('available');
  }

  /**
   * Find occupied spots
   * @returns {Spot[]} Array of occupied spots
   */
  findOccupied() {
    return this.findByStatus('occupied');
  }

  /**
   * Find spots by type
   * @param {string} type - Spot type to filter by
   * @returns {Spot[]} Array of spots matching the type
   */
  findByType(type) {
    return this.findAll().filter(spot => spot.type === type);
  }

  /**
   * Find spots by floor
   * @param {number} floor - Floor number
   * @returns {Spot[]} Array of spots on the specified floor
   */
  findByFloor(floor) {
    return this.findAll().filter(spot => spot.floor === floor);
  }

  /**
   * Find spots by floor and bay
   * @param {number} floor - Floor number
   * @param {number} bay - Bay number
   * @returns {Spot[]} Array of spots in the specified floor and bay
   */
  findByFloorAndBay(floor, bay) {
    const floorBayKey = `F${floor}-B${bay}`;
    const spotIds = this.store.spotsByFloorBay.get(floorBayKey);

    if (!spotIds) {
      return [];
    }

    return Array.from(spotIds)
      .map(spotId => this.store.spots.get(spotId))
      .filter(spot => spot !== undefined);
  }

  /**
   * Find spots with a specific feature
   * @param {string} feature - Feature to search for
   * @returns {Spot[]} Array of spots with the feature
   */
  findByFeature(feature) {
    return this.findAll().filter(spot => spot.hasFeature(feature));
  }

  /**
   * Find spots by vehicle license plate
   * @param {string} licensePlate - License plate to search for
   * @returns {Spot|null} Spot occupied by the vehicle or null
   */
  findByVehicle(licensePlate) {
    return this.findAll().find(spot => spot.currentVehicle === licensePlate.toUpperCase()) || null;
  }

  /**
   * Update a spot
   * @param {string} spotId - ID of spot to update
   * @param {Object} updates - Fields to update
   * @returns {Spot|null} Updated spot or null if not found
   * @throws {Error} If trying to update immutable fields
   */
  update(spotId, updates) {
    const spot = this.findById(spotId);
    if (!spot) {
      return null;
    }

    // Prevent updating immutable fields
    const immutableFields = ['id', 'floor', 'bay', 'spotNumber', 'createdAt'];
    const invalidFields = Object.keys(updates).filter(field => immutableFields.includes(field));

    if (invalidFields.length > 0) {
      throw new Error(`Cannot update immutable fields: ${invalidFields.join(', ')}`);
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key === 'features') {
        spot.features = [...updates[key]];
      } else {
        spot[key] = updates[key];
      }
    });

    spot.updatedAt = new Date().toISOString();

    // Update occupied spots tracking
    if (updates.status === 'occupied' && !this.store.occupiedSpots.has(spotId)) {
      this.store.occupiedSpots.add(spotId);
    } else if (updates.status === 'available' && this.store.occupiedSpots.has(spotId)) {
      this.store.occupiedSpots.delete(spotId);
    }

    return spot;
  }

  /**
   * Occupy a spot with a vehicle
   * @param {string} spotId - ID of spot to occupy
   * @param {string} licensePlate - License plate of vehicle
   * @returns {boolean} True if successful, false if spot not found
   * @throws {Error} If spot is already occupied
   */
  occupy(spotId, licensePlate) {
    const spot = this.findById(spotId);
    if (!spot) {
      return false;
    }

    spot.occupy(licensePlate);
    this.store.occupiedSpots.add(spotId);
    return true;
  }

  /**
   * Vacate a spot
   * @param {string} spotId - ID of spot to vacate
   * @returns {boolean} True if successful, false if spot not found
   * @throws {Error} If spot is not occupied
   */
  vacate(spotId) {
    const spot = this.findById(spotId);
    if (!spot) {
      return false;
    }

    spot.vacate();
    this.store.occupiedSpots.delete(spotId);
    return true;
  }

  /**
   * Delete a spot
   * @param {string} spotId - ID of spot to delete
   * @returns {boolean} True if deleted, false if not found
   * @throws {Error} If spot is currently occupied
   */
  delete(spotId) {
    const spot = this.findById(spotId);
    if (!spot) {
      return false;
    }

    if (spot.isOccupied()) {
      throw new Error(`Cannot delete occupied spot ${spotId}`);
    }

    // Remove from main storage
    this.store.spots.delete(spotId);

    // Remove from floor/bay index
    const floorBayKey = `F${spot.floor}-B${spot.bay}`;
    const spotSet = this.store.spotsByFloorBay.get(floorBayKey);
    if (spotSet) {
      spotSet.delete(spotId);
      if (spotSet.size === 0) {
        this.store.spotsByFloorBay.delete(floorBayKey);
      }
    }

    // Remove from occupied spots
    this.store.occupiedSpots.delete(spotId);

    return true;
  }

  /**
   * Check if a spot exists
   * @param {string} spotId - Spot ID to check
   * @returns {boolean} True if spot exists
   */
  exists(spotId) {
    return this.store.spots.has(spotId);
  }

  /**
   * Get total count of spots
   * @returns {number} Total number of spots
   */
  count() {
    return this.store.spots.size;
  }

  /**
   * Get count by status
   * @param {string} status - Status to count
   * @returns {number} Count of spots with the status
   */
  countByStatus(status) {
    return this.findByStatus(status).length;
  }

  /**
   * Get garage occupancy statistics
   * @returns {Object} Occupancy statistics
   */
  getOccupancyStats() {
    const total = this.count();
    const occupied = this.countByStatus('occupied');
    const available = total - occupied;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;

    return {
      total,
      occupied,
      available,
      occupancyRate: Math.round(occupancyRate * 100) / 100
    };
  }

  /**
   * Bulk create spots for a floor
   * @param {number} floor - Floor number
   * @param {number} bays - Number of bays
   * @param {number} spotsPerBay - Spots per bay
   * @param {string} defaultType - Default spot type
   * @returns {Spot[]} Array of created spots
   */
  createFloorSpots(floor, bays, spotsPerBay, defaultType = 'standard') {
    const createdSpots = [];

    for (let bay = 1; bay <= bays; bay++) {
      for (let spotNumber = 1; spotNumber <= spotsPerBay; spotNumber++) {
        const spot = this.createSpot(floor, bay, spotNumber, defaultType);
        createdSpots.push(spot);
      }
    }

    return createdSpots;
  }

  /**
   * Clear all spots (mainly for testing)
   */
  clear() {
    this.store.spots.clear();
    this.store.spotsByFloorBay.clear();
    this.store.occupiedSpots.clear();
  }
}

module.exports = SpotRepository;
