/**
 * Vehicle repository for data access operations
 *
 * This module provides data access methods for vehicle parking records
 * using the repository pattern. It handles parking sessions, billing,
 * and vehicle tracking operations.
 *
 * @module VehicleRepository
 */

const MemoryStore = require('../storage/memoryStore');
const Vehicle = require('../models/vehicle');

/**
 * Repository for managing vehicle parking records
 */
class VehicleRepository {
  constructor() {
    this.store = MemoryStore.getInstance();
  }

  /**
   * Create a new vehicle parking record
   * @param {Object} vehicleData - Vehicle data to create
   * @returns {Vehicle} Created vehicle instance
   * @throws {Error} If vehicle already exists or data is invalid
   */
  create(vehicleData) {
    const vehicle = new Vehicle(vehicleData);

    if (this.store.vehicles.has(vehicle.licensePlate)) {
      throw new Error(`Vehicle with license plate ${vehicle.licensePlate} already exists`);
    }

    this.store.vehicles.set(vehicle.licensePlate, vehicle);
    return vehicle;
  }

  /**
   * Check in a vehicle to a parking spot
   * @param {string} licensePlate - Vehicle license plate
   * @param {string} spotId - ID of the spot being occupied
   * @param {string} vehicleType - Type of vehicle
   * @param {string} rateType - Rate type for billing
   * @returns {Vehicle} Created vehicle parking record
   */
  checkIn(licensePlate, spotId, vehicleType = 'standard', rateType = 'hourly') {
    const vehicle = Vehicle.checkIn(licensePlate, spotId, vehicleType, rateType);

    if (this.store.vehicles.has(vehicle.licensePlate)) {
      throw new Error(`Vehicle ${vehicle.licensePlate} is already parked`);
    }

    this.store.vehicles.set(vehicle.licensePlate, vehicle);
    return vehicle;
  }

  /**
   * Find a vehicle by license plate
   * @param {string} licensePlate - License plate to find
   * @returns {Vehicle|null} Found vehicle or null if not found
   */
  findById(licensePlate) {
    return this.store.vehicles.get(licensePlate.toUpperCase()) || null;
  }

  /**
   * Find all vehicle records
   * @returns {Vehicle[]} Array of all vehicles
   */
  findAll() {
    return Array.from(this.store.vehicles.values());
  }

  /**
   * Find vehicles by spot ID
   * @param {string} spotId - Spot ID to search for
   * @returns {Vehicle[]} Array of vehicles in the spot
   */
  findBySpotId(spotId) {
    return this.findAll().filter(vehicle => vehicle.spotId === spotId);
  }

  /**
   * Find current vehicle in a spot (not checked out)
   * @param {string} spotId - Spot ID to search for
   * @returns {Vehicle|null} Current vehicle or null
   */
  findCurrentInSpot(spotId) {
    return this.findAll().find(vehicle =>
      vehicle.spotId === spotId && !vehicle.isCheckedOut()
    ) || null;
  }

  /**
   * Find vehicles by status
   * @param {string} status - Status to filter by ('parked', 'checked_out_unpaid', 'completed')
   * @returns {Vehicle[]} Array of vehicles matching the status
   */
  findByStatus(status) {
    return this.findAll().filter(vehicle => vehicle.getStatus() === status);
  }

  /**
   * Find currently parked vehicles
   * @returns {Vehicle[]} Array of parked vehicles
   */
  findParked() {
    return this.findByStatus('parked');
  }

  /**
   * Find checked out but unpaid vehicles
   * @returns {Vehicle[]} Array of unpaid vehicles
   */
  findUnpaid() {
    return this.findByStatus('checked_out_unpaid');
  }

  /**
   * Find completed parking sessions
   * @returns {Vehicle[]} Array of completed sessions
   */
  findCompleted() {
    return this.findByStatus('completed');
  }

  /**
   * Find vehicles by vehicle type
   * @param {string} vehicleType - Vehicle type to filter by
   * @returns {Vehicle[]} Array of vehicles matching the type
   */
  findByVehicleType(vehicleType) {
    return this.findAll().filter(vehicle => vehicle.vehicleType === vehicleType);
  }

  /**
   * Find vehicles by rate type
   * @param {string} rateType - Rate type to filter by
   * @returns {Vehicle[]} Array of vehicles matching the rate type
   */
  findByRateType(rateType) {
    return this.findAll().filter(vehicle => vehicle.rateType === rateType);
  }

  /**
   * Find vehicles by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Vehicle[]} Array of vehicles checked in within the range
   */
  findByDateRange(startDate, endDate) {
    return this.findAll().filter(vehicle => {
      const checkInDate = new Date(vehicle.checkInTime);
      return checkInDate >= startDate && checkInDate <= endDate;
    });
  }

  /**
   * Update a vehicle record
   * @param {string} licensePlate - License plate of vehicle to update
   * @param {Object} updates - Fields to update
   * @returns {Vehicle|null} Updated vehicle or null if not found
   * @throws {Error} If trying to update immutable fields
   */
  update(licensePlate, updates) {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return null;
    }

    // Prevent updating immutable fields
    const immutableFields = ['licensePlate', 'checkInTime', 'createdAt'];
    const invalidFields = Object.keys(updates).filter(field => immutableFields.includes(field));

    if (invalidFields.length > 0) {
      throw new Error(`Cannot update immutable fields: ${invalidFields.join(', ')}`);
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      vehicle[key] = updates[key];
    });

    vehicle.updatedAt = new Date().toISOString();
    return vehicle;
  }

  /**
   * Check out a vehicle
   * @param {string} licensePlate - License plate of vehicle to check out
   * @param {number} hourlyRate - Rate per hour for billing
   * @returns {Vehicle|null} Checked out vehicle or null if not found
   * @throws {Error} If vehicle is already checked out
   */
  checkOut(licensePlate, hourlyRate = 5.00) {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return null;
    }

    vehicle.checkOut(hourlyRate);
    return vehicle;
  }

  /**
   * Mark a vehicle's parking fee as paid
   * @param {string} licensePlate - License plate of vehicle
   * @param {number} amountPaid - Amount paid by customer
   * @returns {Vehicle|null} Updated vehicle or null if not found
   * @throws {Error} If insufficient payment or already paid
   */
  markAsPaid(licensePlate, amountPaid) {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return null;
    }

    vehicle.markAsPaid(amountPaid);
    return vehicle;
  }

  /**
   * Delete a vehicle record
   * @param {string} licensePlate - License plate of vehicle to delete
   * @returns {boolean} True if deleted, false if not found
   * @throws {Error} If vehicle is still parked (not checked out)
   */
  delete(licensePlate) {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return false;
    }

    if (!vehicle.isCheckedOut()) {
      throw new Error(`Cannot delete vehicle ${licensePlate} that is still parked`);
    }

    this.store.vehicles.delete(licensePlate.toUpperCase());
    return true;
  }

  /**
   * Check if a vehicle exists
   * @param {string} licensePlate - License plate to check
   * @returns {boolean} True if vehicle exists
   */
  exists(licensePlate) {
    return this.store.vehicles.has(licensePlate.toUpperCase());
  }

  /**
   * Get total count of vehicle records
   * @returns {number} Total number of vehicles
   */
  count() {
    return this.store.vehicles.size;
  }

  /**
   * Get count by status
   * @param {string} status - Status to count
   * @returns {number} Count of vehicles with the status
   */
  countByStatus(status) {
    return this.findByStatus(status).length;
  }

  /**
   * Get parking statistics
   * @returns {Object} Parking statistics
   */
  getParkingStats() {
    const total = this.count();
    const parked = this.countByStatus('parked');
    const unpaid = this.countByStatus('checked_out_unpaid');
    const completed = this.countByStatus('completed');

    return {
      total,
      parked,
      unpaid,
      completed,
      checkedOut: unpaid + completed
    };
  }

  /**
   * Get revenue statistics
   * @returns {Object} Revenue statistics
   */
  getRevenueStats() {
    const vehicles = this.findAll();
    const totalRevenue = vehicles
      .filter(v => v.isPaid)
      .reduce((sum, v) => sum + v.totalAmount, 0);

    const pendingRevenue = vehicles
      .filter(v => v.isCheckedOut() && !v.isPaid)
      .reduce((sum, v) => sum + v.totalAmount, 0);

    const completedSessions = vehicles.filter(v => v.isPaid).length;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      pendingRevenue: Math.round(pendingRevenue * 100) / 100,
      completedSessions,
      averageRevenue: completedSessions > 0
        ? Math.round((totalRevenue / completedSessions) * 100) / 100
        : 0
    };
  }

  /**
   * Get vehicles that have overstayed (parked for more than specified hours)
   * @param {number} maxHours - Maximum allowed parking hours
   * @returns {Vehicle[]} Array of overstaying vehicles
   */
  findOverstayed(maxHours = 24) {
    const maxMilliseconds = maxHours * 60 * 60 * 1000;
    const now = new Date();

    return this.findParked().filter(vehicle => {
      const checkInTime = new Date(vehicle.checkInTime);
      return (now - checkInTime) > maxMilliseconds;
    });
  }

  /**
   * Clear all vehicle records (mainly for testing)
   */
  clear() {
    this.store.vehicles.clear();
  }
}

module.exports = VehicleRepository;
