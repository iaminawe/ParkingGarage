/**
 * Checkout Service
 * 
 * This module handles the business logic for vehicle checkout operations,
 * including vehicle lookup, duration calculation, fee computation,
 * atomic spot release, and parking record cleanup.
 * 
 * @module CheckoutService
 */

const VehicleRepository = require('../repositories/vehicleRepository');
const SpotRepository = require('../repositories/spotRepository');
const BillingService = require('./billingService');
const { calculateParkingDuration, getCurrentTimestamp } = require('../utils/timeCalculator');

/**
 * Service for handling vehicle checkout operations
 */
class CheckoutService {
  constructor() {
    this.vehicleRepository = new VehicleRepository();
    this.spotRepository = new SpotRepository();
    this.billingService = new BillingService();
  }

  /**
   * Check out a vehicle from the garage
   * Performs atomic operation: finds vehicle, calculates fees, releases spot, removes record
   * @param {string} licensePlate - Vehicle license plate
   * @param {Object} options - Checkout options
   * @param {boolean} options.applyGracePeriod - Apply grace period if applicable
   * @param {boolean} options.removeRecord - Remove vehicle record after checkout (default: true)
   * @param {string} options.checkOutTime - Override checkout time (for testing)
   * @returns {Object} Checkout result with billing details
   * @throws {Error} If checkout fails
   */
  checkOutVehicle(licensePlate, options = {}) {
    const {
      applyGracePeriod = false,
      removeRecord = true,
      checkOutTime = null
    } = options;

    // Step 1: Find and validate vehicle
    const vehicle = this.findAndValidateVehicle(licensePlate);

    // Step 2: Find associated spot
    const spot = this.findAssociatedSpot(vehicle.spotId);

    // Step 3: Calculate parking duration and fees
    const checkOutTimestamp = checkOutTime || getCurrentTimestamp();
    const duration = this.calculateDuration(vehicle.checkInTime, checkOutTimestamp);
    const billing = this.calculateFees(duration, spot, vehicle, applyGracePeriod);

    try {
      // Step 4: Update vehicle record with checkout details (atomic)
      this.updateVehicleForCheckout(vehicle, checkOutTimestamp, billing.billing.totalAmount);

      // Step 5: Release spot (atomic)
      this.releaseSpot(spot, vehicle.licensePlate);

      // Step 6: Optionally remove vehicle record
      if (removeRecord) {
        this.removeVehicleRecord(vehicle.licensePlate);
      }

      // Return success result
      return this.formatCheckoutResult(vehicle, spot, duration, billing, checkOutTimestamp);

    } catch (error) {
      // Rollback: If any operation fails, ensure cleanup
      this.rollbackCheckout(vehicle, spot, error);
      throw error;
    }
  }

  /**
   * Find and validate vehicle for checkout
   * @param {string} licensePlate - License plate to find
   * @returns {Object} Vehicle record
   * @throws {Error} If vehicle not found or invalid state
   */
  findAndValidateVehicle(licensePlate) {
    if (!licensePlate || typeof licensePlate !== 'string') {
      throw new Error('License plate is required and must be a string');
    }

    const vehicle = this.vehicleRepository.findById(licensePlate);
    
    if (!vehicle) {
      throw new Error(`Vehicle with license plate ${licensePlate} not found. Please check the license plate and try again.`);
    }

    if (vehicle.isCheckedOut()) {
      throw new Error(`Vehicle ${licensePlate} has already been checked out at ${vehicle.checkOutTime}`);
    }

    return vehicle;
  }

  /**
   * Find spot associated with vehicle
   * @param {string} spotId - Spot ID to find
   * @returns {Object} Spot record
   * @throws {Error} If spot not found
   */
  findAssociatedSpot(spotId) {
    const spot = this.spotRepository.findById(spotId);
    
    if (!spot) {
      throw new Error(`Spot ${spotId} not found. Data integrity issue - please contact support.`);
    }

    return spot;
  }

  /**
   * Calculate parking duration
   * @param {string} checkInTime - Check-in timestamp
   * @param {string} checkOutTime - Check-out timestamp
   * @returns {Object} Duration calculation
   */
  calculateDuration(checkInTime, checkOutTime) {
    try {
      return calculateParkingDuration(checkInTime, checkOutTime);
    } catch (error) {
      throw new Error(`Failed to calculate parking duration: ${error.message}`);
    }
  }

  /**
   * Calculate parking fees
   * @param {Object} duration - Duration calculation
   * @param {Object} spot - Spot record
   * @param {Object} vehicle - Vehicle record
   * @param {boolean} applyGracePeriod - Whether to apply grace period
   * @returns {Object} Billing calculation
   */
  calculateFees(duration, spot, vehicle, applyGracePeriod = false) {
    try {
      return this.billingService.calculateParkingFee({
        totalMinutes: duration.totalMinutes,
        spotType: spot.type,
        spotFeatures: spot.features || [],
        rateType: vehicle.rateType || 'hourly',
        applyGrace: applyGracePeriod,
        gracePeriodMinutes: 5
      });
    } catch (error) {
      throw new Error(`Failed to calculate parking fees: ${error.message}`);
    }
  }

  /**
   * Update vehicle record for checkout
   * @param {Object} vehicle - Vehicle record
   * @param {string} checkOutTime - Checkout timestamp
   * @param {number} totalAmount - Total amount owed
   */
  updateVehicleForCheckout(vehicle, checkOutTime, totalAmount) {
    try {
      vehicle.checkOut(0); // Will update checkOutTime and calculate amount
      vehicle.checkOutTime = checkOutTime; // Override with our calculated time
      vehicle.totalAmount = totalAmount; // Override with our calculated amount
      vehicle.updatedAt = getCurrentTimestamp();
    } catch (error) {
      throw new Error(`Failed to update vehicle record: ${error.message}`);
    }
  }

  /**
   * Release spot atomically
   * @param {Object} spot - Spot to release
   * @param {string} expectedVehicle - Expected vehicle license plate
   * @throws {Error} If spot state is inconsistent
   */
  releaseSpot(spot, expectedVehicle) {
    try {
      // Verify spot state before releasing
      if (!spot.isOccupied()) {
        throw new Error(`Spot ${spot.id} is not occupied - data integrity issue`);
      }

      if (spot.currentVehicle !== expectedVehicle) {
        throw new Error(
          `Spot ${spot.id} occupied by different vehicle (${spot.currentVehicle}) than expected (${expectedVehicle})`
        );
      }

      // Release the spot
      const success = this.spotRepository.vacate(spot.id);
      if (!success) {
        throw new Error(`Failed to release spot ${spot.id}`);
      }

    } catch (error) {
      throw new Error(`Failed to release spot: ${error.message}`);
    }
  }

  /**
   * Remove vehicle record from active parking
   * @param {string} licensePlate - License plate
   */
  removeVehicleRecord(licensePlate) {
    try {
      const success = this.vehicleRepository.delete(licensePlate);
      if (!success) {
        // Not critical - log but don't fail checkout
        console.warn(`Could not remove vehicle record for ${licensePlate} - record may not exist`);
      }
    } catch (error) {
      // Not critical - log but don't fail checkout
      console.error(`Failed to remove vehicle record for ${licensePlate}:`, error.message);
    }
  }

  /**
   * Format checkout result response
   * @param {Object} vehicle - Vehicle record
   * @param {Object} spot - Spot record
   * @param {Object} duration - Duration calculation
   * @param {Object} billing - Billing calculation
   * @param {string} checkOutTime - Checkout timestamp
   * @returns {Object} Formatted result
   */
  formatCheckoutResult(vehicle, spot, duration, billing, checkOutTime) {
    return {
      success: true,
      message: 'Vehicle checked out successfully. Thank you for parking with us!',
      licensePlate: vehicle.licensePlate,
      spotId: spot.id,
      location: {
        floor: spot.floor,
        bay: spot.bay,
        spot: spot.spotNumber
      },
      timing: {
        checkInTime: vehicle.checkInTime,
        checkOutTime: checkOutTime,
        duration: {
          hours: duration.breakdown.hours,
          minutes: duration.breakdown.minutes,
          totalMinutes: duration.totalMinutes,
          totalHours: duration.totalHours,
          billableHours: duration.billableHours
        }
      },
      billing: {
        ratePerHour: billing.rates.effectiveRatePerHour,
        totalHours: billing.duration.billableHours,
        subtotal: billing.billing.subtotal,
        discount: billing.billing.rateTypeDiscount,
        totalAmount: billing.billing.totalAmount,
        breakdown: billing.breakdown
      },
      spotDetails: {
        type: spot.type,
        features: spot.features || []
      },
      vehicleInfo: {
        type: vehicle.vehicleType,
        rateType: vehicle.rateType
      }
    };
  }

  /**
   * Rollback checkout operation if something fails
   * @param {Object} vehicle - Vehicle record
   * @param {Object} spot - Spot record
   * @param {Error} originalError - The error that triggered rollback
   */
  rollbackCheckout(vehicle, spot, originalError) {
    console.error('Checkout failed, attempting rollback:', originalError.message);

    try {
      // Rollback vehicle checkout if it was updated
      if (vehicle.isCheckedOut()) {
        vehicle.checkOutTime = null;
        vehicle.totalAmount = 0;
        vehicle.updatedAt = getCurrentTimestamp();
      }
    } catch (error) {
      console.error(`Failed to rollback vehicle ${vehicle.licensePlate}:`, error.message);
    }

    try {
      // Re-occupy spot if it was released
      if (spot.isAvailable() && !spot.currentVehicle) {
        this.spotRepository.occupy(spot.id, vehicle.licensePlate);
      }
    } catch (error) {
      console.error(`Failed to rollback spot ${spot.id}:`, error.message);
    }
  }

  /**
   * Get current checkout statistics
   * @returns {Object} Checkout statistics
   */
  getCheckoutStats() {
    const vehicleStats = this.vehicleRepository.getParkingStats();
    const revenueStats = this.vehicleRepository.getRevenueStats();
    const spotStats = this.spotRepository.getOccupancyStats();

    return {
      vehicles: {
        totalCheckedOut: vehicleStats.checkedOut,
        awaitingPayment: vehicleStats.unpaid,
        completed: vehicleStats.completed,
        stillParked: vehicleStats.parked
      },
      revenue: {
        totalRevenue: revenueStats.totalRevenue,
        pendingRevenue: revenueStats.pendingRevenue,
        averageRevenue: revenueStats.averageRevenue,
        completedSessions: revenueStats.completedSessions
      },
      spots: {
        totalSpots: spotStats.total,
        availableSpots: spotStats.available,
        occupancyRate: spotStats.occupancyRate
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Simulate checkout without actually performing it
   * @param {string} licensePlate - License plate
   * @param {Object} options - Simulation options
   * @returns {Object} Simulation result
   */
  simulateCheckout(licensePlate, options = {}) {
    try {
      const vehicle = this.findAndValidateVehicle(licensePlate);
      const spot = this.findAssociatedSpot(vehicle.spotId);

      const checkOutTime = options.checkOutTime || getCurrentTimestamp();
      const duration = this.calculateDuration(vehicle.checkInTime, checkOutTime);
      const billing = this.calculateFees(duration, spot, vehicle, options.applyGracePeriod);

      return {
        success: true,
        message: 'Checkout simulation successful',
        simulation: {
          licensePlate: vehicle.licensePlate,
          spotId: spot.id,
          estimatedDuration: duration,
          estimatedBilling: billing,
          wouldRelease: spot.id,
          currentStatus: vehicle.getStatus()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: 'SIMULATION_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Get vehicles that are ready for checkout (for management interface)
   * @param {number} minMinutes - Minimum parking time in minutes (default: 0)
   * @returns {Array} Array of vehicles ready for checkout
   */
  getVehiclesReadyForCheckout(minMinutes = 0) {
    const parkedVehicles = this.vehicleRepository.findParked();
    
    return parkedVehicles.filter(vehicle => {
      const duration = calculateParkingDuration(vehicle.checkInTime);
      return duration.totalMinutes >= minMinutes;
    }).map(vehicle => {
      const spot = this.spotRepository.findById(vehicle.spotId);
      const duration = calculateParkingDuration(vehicle.checkInTime);
      const billing = this.calculateFees(duration, spot, vehicle);

      return {
        licensePlate: vehicle.licensePlate,
        spotId: vehicle.spotId,
        checkInTime: vehicle.checkInTime,
        currentDuration: duration,
        currentEstimate: billing,
        vehicleType: vehicle.vehicleType,
        rateType: vehicle.rateType,
        spotType: spot?.type || 'unknown',
        spotFeatures: spot?.features || []
      };
    });
  }

  /**
   * Force checkout for management purposes (with warnings)
   * @param {string} licensePlate - License plate
   * @param {string} reason - Reason for forced checkout
   * @returns {Object} Checkout result
   */
  forceCheckout(licensePlate, reason = 'Administrative action') {
    try {
      const result = this.checkOutVehicle(licensePlate, { removeRecord: true });
      
      return {
        ...result,
        forced: true,
        reason,
        message: `Vehicle ${licensePlate} forcibly checked out. Reason: ${reason}`
      };

    } catch (error) {
      throw new Error(`Forced checkout failed for ${licensePlate}: ${error.message}`);
    }
  }
}

module.exports = CheckoutService;