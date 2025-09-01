/**
 * Check-in Service
 * 
 * This module handles the business logic for vehicle check-in operations,
 * including duplicate prevention, atomic spot assignment, vehicle record
 * creation, and integration with spot assignment algorithms.
 * 
 * @module CheckinService
 */

const { VehicleRepository } = require('../repositories/vehicleRepository');
const { SpotRepository } = require('../repositories/spotRepository');
const { SpotAssignmentService } = require('./spotAssignmentService');

/**
 * Service for handling vehicle check-in operations
 */
class CheckinService {
  constructor() {
    this.vehicleRepository = new VehicleRepository();
    this.spotRepository = new SpotRepository();
    this.spotAssignmentService = new SpotAssignmentService();
  }

  /**
   * Check in a vehicle to the garage
   * Performs atomic operation: finds spot, creates vehicle record, occupies spot
   * @param {string} licensePlate - Vehicle license plate
   * @param {string} vehicleType - Vehicle type ('compact', 'standard', 'oversized')
   * @param {string} rateType - Rate type ('hourly', 'daily', 'monthly')
   * @returns {Object} Check-in result with spot assignment details
   * @throws {Error} If check-in fails
   */
  checkInVehicle(licensePlate, vehicleType, rateType = 'hourly') {
    // Validate inputs
    this.validateCheckinInputs(licensePlate, vehicleType, rateType);

    // Step 1: Check for duplicate check-in
    this.checkForDuplicateVehicle(licensePlate);

    // Step 2: Find the best available spot
    const assignedSpot = this.findAndReserveSpot(vehicleType);

    try {
      // Step 3: Create vehicle record (atomic with spot assignment)
      const vehicle = this.createVehicleRecord(licensePlate, assignedSpot.id, vehicleType, rateType);

      // Step 4: Mark spot as occupied (atomic operation)
      this.occupySpot(assignedSpot.id, licensePlate);

      // Return success result
      return this.formatCheckinResult(vehicle, assignedSpot);

    } catch (error) {
      // Rollback: If vehicle creation or spot occupation fails, ensure cleanup
      this.rollbackCheckin(licensePlate, assignedSpot.id);
      throw error;
    }
  }

  /**
   * Validate check-in inputs
   * @param {string} licensePlate - License plate
   * @param {string} vehicleType - Vehicle type
   * @param {string} rateType - Rate type
   * @throws {Error} If inputs are invalid
   */
  validateCheckinInputs(licensePlate, vehicleType, rateType) {
    if (!licensePlate || typeof licensePlate !== 'string') {
      throw new Error('License plate is required and must be a string');
    }

    const validVehicleTypes = ['compact', 'standard', 'oversized'];
    if (!validVehicleTypes.includes(vehicleType)) {
      throw new Error(`Invalid vehicle type: ${vehicleType}. Valid types: ${validVehicleTypes.join(', ')}`);
    }

    const validRateTypes = ['hourly', 'daily', 'monthly'];
    if (!validRateTypes.includes(rateType)) {
      throw new Error(`Invalid rate type: ${rateType}. Valid types: ${validRateTypes.join(', ')}`);
    }
  }

  /**
   * Check if vehicle is already checked in (prevent duplicates)
   * @param {string} licensePlate - License plate to check
   * @throws {Error} If vehicle already checked in
   */
  checkForDuplicateVehicle(licensePlate) {
    const existingVehicle = this.vehicleRepository.findById(licensePlate);
    
    if (existingVehicle && !existingVehicle.isCheckedOut()) {
      throw new Error(
        `Vehicle ${licensePlate} is already checked in at spot ${existingVehicle.spotId}. ` +
        `Check-in time: ${existingVehicle.checkInTime}`
      );
    }
  }

  /**
   * Find and reserve the best available spot
   * @param {string} vehicleType - Vehicle type
   * @returns {Object} Assigned spot
   * @throws {Error} If no spots available
   */
  findAndReserveSpot(vehicleType) {
    const bestSpot = this.spotAssignmentService.findBestAvailableSpot(vehicleType);
    
    if (!bestSpot) {
      // Provide helpful error message with availability info
      const availability = this.spotAssignmentService.getAvailabilityByVehicleType(vehicleType);
      const totalAvailable = this.spotRepository.findAvailable().length;
      
      throw new Error(
        `No available spots for ${vehicleType} vehicles. ` +
        `Compatible spots available: ${availability.total}. ` +
        `Total spots available: ${totalAvailable}`
      );
    }

    return bestSpot;
  }

  /**
   * Create vehicle parking record
   * @param {string} licensePlate - License plate
   * @param {string} spotId - Assigned spot ID
   * @param {string} vehicleType - Vehicle type
   * @param {string} rateType - Rate type
   * @returns {Object} Created vehicle record
   */
  createVehicleRecord(licensePlate, spotId, vehicleType, rateType) {
    try {
      const vehicle = this.vehicleRepository.checkIn(licensePlate, spotId, vehicleType, rateType);
      return vehicle;
    } catch (error) {
      throw new Error(`Failed to create vehicle record: ${error.message}`);
    }
  }

  /**
   * Mark spot as occupied atomically
   * @param {string} spotId - Spot ID to occupy
   * @param {string} licensePlate - License plate of vehicle
   */
  occupySpot(spotId, licensePlate) {
    try {
      const success = this.spotRepository.occupy(spotId, licensePlate);
      if (!success) {
        throw new Error(`Spot ${spotId} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to occupy spot ${spotId}: ${error.message}`);
    }
  }

  /**
   * Rollback check-in operation if something fails
   * @param {string} licensePlate - License plate
   * @param {string} spotId - Spot ID to potentially free
   */
  rollbackCheckin(licensePlate, spotId) {
    try {
      // Remove vehicle record if it was created
      if (this.vehicleRepository.exists(licensePlate)) {
        this.vehicleRepository.delete(licensePlate);
      }
    } catch (error) {
      // Log error but don't throw - we're already in error handling
      console.error(`Failed to rollback vehicle record for ${licensePlate}:`, error.message);
    }

    try {
      // Free spot if it was occupied
      const spot = this.spotRepository.findById(spotId);
      if (spot && spot.isOccupied() && spot.currentVehicle === licensePlate) {
        this.spotRepository.vacate(spotId);
      }
    } catch (error) {
      // Log error but don't throw - we're already in error handling
      console.error(`Failed to rollback spot occupation for ${spotId}:`, error.message);
    }
  }

  /**
   * Format check-in result response
   * @param {Object} vehicle - Vehicle record
   * @param {Object} spot - Assigned spot
   * @returns {Object} Formatted result
   */
  formatCheckinResult(vehicle, spot) {
    return {
      success: true,
      message: 'Vehicle checked in successfully',
      spotId: spot.id,
      location: {
        floor: spot.floor,
        bay: spot.bay,
        spot: spot.spotNumber
      },
      checkInTime: vehicle.checkInTime,
      vehicle: {
        licensePlate: vehicle.licensePlate,
        type: vehicle.vehicleType,
        rateType: vehicle.rateType
      },
      spotDetails: {
        type: spot.type,
        features: spot.features
      }
    };
  }

  /**
   * Get current check-in statistics
   * @returns {Object} Check-in statistics
   */
  getCheckinStats() {
    const vehicleStats = this.vehicleRepository.getParkingStats();
    const spotStats = this.spotRepository.getOccupancyStats();
    const assignmentStats = this.spotAssignmentService.getAssignmentStats();

    return {
      vehicles: {
        totalParked: vehicleStats.parked,
        totalProcessed: vehicleStats.total
      },
      spots: {
        totalSpots: spotStats.total,
        availableSpots: spotStats.available,
        occupiedSpots: spotStats.occupied,
        occupancyRate: spotStats.occupancyRate
      },
      assignment: assignmentStats.byVehicleType,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Simulate check-in without actually performing it
   * Useful for previewing what would happen
   * @param {string} licensePlate - License plate
   * @param {string} vehicleType - Vehicle type
   * @returns {Object} Simulation result
   */
  simulateCheckin(licensePlate, vehicleType) {
    try {
      // Check for duplicate
      const existingVehicle = this.vehicleRepository.findById(licensePlate);
      if (existingVehicle && !existingVehicle.isCheckedOut()) {
        return {
          success: false,
          error: 'DUPLICATE_VEHICLE',
          message: `Vehicle ${licensePlate} is already checked in at spot ${existingVehicle.spotId}`
        };
      }

      // Simulate spot assignment
      const simulation = this.spotAssignmentService.simulateAssignment(vehicleType);
      
      if (!simulation.success) {
        return {
          success: false,
          error: 'NO_AVAILABLE_SPOTS',
          message: simulation.message,
          availableCount: simulation.availableCount
        };
      }

      return {
        success: true,
        message: 'Check-in simulation successful',
        wouldAssignSpot: simulation.assignedSpot.id,
        spotLocation: simulation.spotLocation,
        compatibility: simulation.compatibility
      };

    } catch (error) {
      return {
        success: false,
        error: 'SIMULATION_ERROR',
        message: error.message
      };
    }
  }
}

module.exports = CheckinService;