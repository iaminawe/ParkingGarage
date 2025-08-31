/**
 * Checkout Service
 *
 * This module handles the business logic for vehicle checkout operations,
 * including vehicle lookup, duration calculation, fee computation,
 * atomic spot release, and parking record cleanup.
 *
 * @module CheckoutService
 */

import {
  ICheckoutService,
  CheckoutResult,
  CheckoutOptions,
  CheckoutStatistics,
  CheckoutSimulationResult,
  VehicleReadyForCheckout,
  ForcedCheckoutResult,
  CheckoutTiming,
  CheckoutBilling,
  CheckoutLocation,
  CheckoutSpotDetails,
  CheckoutVehicleInfo,
  LicensePlate,
  SpotId,
  Timestamp,
  ServiceOperationError,
  ServiceNotFoundError,
  DurationBreakdown,
  Currency
} from '../types/index.js';

// Import repositories, services and utilities (keeping CommonJS imports for now)
const VehicleRepository = require('../repositories/vehicleRepository');
const SpotRepository = require('../repositories/spotRepository');
const BillingService = require('./billingService');
const { calculateParkingDuration, getCurrentTimestamp } = require('../utils/timeCalculator');

/**
 * Service for handling vehicle checkout operations
 */
export class CheckoutService implements ICheckoutService {
  private vehicleRepository: any;
  private spotRepository: any;
  private billingService: any;

  constructor() {
    this.vehicleRepository = new VehicleRepository();
    this.spotRepository = new SpotRepository();
    this.billingService = new BillingService();
  }

  /**
   * Check out a vehicle from the garage
   * Performs atomic operation: finds vehicle, calculates fees, releases spot, removes record
   */
  checkOutVehicle(licensePlate: LicensePlate, options: CheckoutOptions = {}): CheckoutResult {
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
      this.rollbackCheckout(vehicle, spot, error as Error);
      throw error;
    }
  }

  /**
   * Find and validate vehicle for checkout
   */
  private findAndValidateVehicle(licensePlate: LicensePlate): any {
    if (!licensePlate || typeof licensePlate !== 'string') {
      throw new ServiceOperationError('License plate is required and must be a string', 'findVehicle');
    }

    const vehicle = this.vehicleRepository.findById(licensePlate);

    if (!vehicle) {
      throw new ServiceNotFoundError('Vehicle', licensePlate);
    }

    if (vehicle.isCheckedOut()) {
      throw new ServiceOperationError(`Vehicle ${licensePlate} has already been checked out at ${vehicle.checkOutTime}`, 'validateVehicle');
    }

    return vehicle;
  }

  /**
   * Find spot associated with vehicle
   */
  private findAssociatedSpot(spotId: SpotId): any {
    const spot = this.spotRepository.findById(spotId);

    if (!spot) {
      throw new ServiceOperationError(`Spot ${spotId} not found. Data integrity issue - please contact support.`, 'findSpot');
    }

    return spot;
  }

  /**
   * Calculate parking duration
   */
  private calculateDuration(checkInTime: Timestamp, checkOutTime: Timestamp): DurationBreakdown {
    try {
      return calculateParkingDuration(checkInTime, checkOutTime);
    } catch (error) {
      throw new ServiceOperationError(`Failed to calculate parking duration: ${(error as Error).message}`, 'calculateDuration');
    }
  }

  /**
   * Calculate parking fees
   */
  private calculateFees(duration: DurationBreakdown, spot: any, vehicle: any, applyGracePeriod: boolean = false): any {
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
      throw new ServiceOperationError(`Failed to calculate parking fees: ${(error as Error).message}`, 'calculateFees');
    }
  }

  /**
   * Update vehicle record for checkout
   */
  private updateVehicleForCheckout(vehicle: any, checkOutTime: Timestamp, totalAmount: Currency): void {
    try {
      vehicle.checkOut(0); // Will update checkOutTime and calculate amount
      vehicle.checkOutTime = checkOutTime; // Override with our calculated time
      vehicle.totalAmount = totalAmount; // Override with our calculated amount
      vehicle.updatedAt = getCurrentTimestamp();
    } catch (error) {
      throw new ServiceOperationError(`Failed to update vehicle record: ${(error as Error).message}`, 'updateVehicle');
    }
  }

  /**
   * Release spot atomically
   */
  private releaseSpot(spot: any, expectedVehicle: LicensePlate): void {
    try {
      // Verify spot state before releasing
      if (!spot.isOccupied()) {
        throw new ServiceOperationError(`Spot ${spot.id} is not occupied - data integrity issue`, 'releaseSpot');
      }

      if (spot.currentVehicle !== expectedVehicle) {
        throw new ServiceOperationError(
          `Spot ${spot.id} occupied by different vehicle (${spot.currentVehicle}) than expected (${expectedVehicle})`,
          'releaseSpot'
        );
      }

      // Release the spot
      const success = this.spotRepository.vacate(spot.id);
      if (!success) {
        throw new ServiceOperationError(`Failed to release spot ${spot.id}`, 'releaseSpot');
      }

    } catch (error) {
      if (error instanceof ServiceOperationError) {
        throw error;
      }
      throw new ServiceOperationError(`Failed to release spot: ${(error as Error).message}`, 'releaseSpot');
    }
  }

  /**
   * Remove vehicle record from active parking
   */
  private removeVehicleRecord(licensePlate: LicensePlate): void {
    try {
      const success = this.vehicleRepository.delete(licensePlate);
      if (!success) {
        // Not critical - log but don't fail checkout
        console.warn(`Could not remove vehicle record for ${licensePlate} - record may not exist`);
      }
    } catch (error) {
      // Not critical - log but don't fail checkout
      console.error(`Failed to remove vehicle record for ${licensePlate}:`, (error as Error).message);
    }
  }

  /**
   * Format checkout result response
   */
  private formatCheckoutResult(
    vehicle: any, 
    spot: any, 
    duration: DurationBreakdown, 
    billing: any, 
    checkOutTime: Timestamp
  ): CheckoutResult {
    const location: CheckoutLocation = {
      floor: spot.floor,
      bay: spot.bay,
      spot: spot.spotNumber
    };

    const timing: CheckoutTiming = {
      checkInTime: vehicle.checkInTime,
      checkOutTime: checkOutTime,
      duration: duration
    };

    const checkoutBilling: CheckoutBilling = {
      ratePerHour: billing.rates.effectiveRatePerHour,
      totalHours: billing.duration.billableHours,
      subtotal: billing.billing.subtotal,
      discount: billing.billing.rateTypeDiscount,
      totalAmount: billing.billing.totalAmount,
      breakdown: billing.breakdown
    };

    const spotDetails: CheckoutSpotDetails = {
      type: spot.type,
      features: spot.features || []
    };

    const vehicleInfo: CheckoutVehicleInfo = {
      type: vehicle.vehicleType,
      rateType: vehicle.rateType
    };

    return {
      success: true,
      message: 'Vehicle checked out successfully. Thank you for parking with us!',
      licensePlate: vehicle.licensePlate,
      spotId: spot.id,
      location,
      timing,
      billing: checkoutBilling,
      spotDetails,
      vehicleInfo,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Rollback checkout operation if something fails
   */
  private rollbackCheckout(vehicle: any, spot: any, originalError: Error): void {
    console.error('Checkout failed, attempting rollback:', originalError.message);

    try {
      // Rollback vehicle checkout if it was updated
      if (vehicle.isCheckedOut()) {
        vehicle.checkOutTime = null;
        vehicle.totalAmount = 0;
        vehicle.updatedAt = getCurrentTimestamp();
      }
    } catch (error) {
      console.error(`Failed to rollback vehicle ${vehicle.licensePlate}:`, (error as Error).message);
    }

    try {
      // Re-occupy spot if it was released
      if (spot.isAvailable() && !spot.currentVehicle) {
        this.spotRepository.occupy(spot.id, vehicle.licensePlate);
      }
    } catch (error) {
      console.error(`Failed to rollback spot ${spot.id}:`, (error as Error).message);
    }
  }

  /**
   * Get current checkout statistics
   */
  getCheckoutStats(): CheckoutStatistics {
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
   */
  simulateCheckout(licensePlate: LicensePlate, options: CheckoutOptions = {}): CheckoutSimulationResult {
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
        message: (error as Error).message
      };
    }
  }

  /**
   * Get vehicles that are ready for checkout (for management interface)
   */
  getVehiclesReadyForCheckout(minMinutes: number = 0): VehicleReadyForCheckout[] {
    const parkedVehicles = this.vehicleRepository.findParked();

    return parkedVehicles.filter((vehicle: any) => {
      const duration = calculateParkingDuration(vehicle.checkInTime);
      return duration.totalMinutes >= minMinutes;
    }).map((vehicle: any): VehicleReadyForCheckout => {
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
   */
  forceCheckout(licensePlate: LicensePlate, reason: string = 'Administrative action'): ForcedCheckoutResult {
    try {
      const result = this.checkOutVehicle(licensePlate, { removeRecord: true });

      return {
        ...result,
        forced: true,
        reason,
        message: `Vehicle ${licensePlate} forcibly checked out. Reason: ${reason}`
      };

    } catch (error) {
      throw new ServiceOperationError(`Forced checkout failed for ${licensePlate}: ${(error as Error).message}`, 'forceCheckout');
    }
  }
}

export default CheckoutService;