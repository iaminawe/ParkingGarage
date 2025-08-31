/**
 * Check-in Service
 *
 * This module handles the business logic for vehicle check-in operations,
 * including duplicate prevention, atomic spot assignment, vehicle record
 * creation, and integration with spot assignment algorithms.
 *
 * @module CheckinService
 */

import {
  ICheckinService,
  CheckinResult,
  CheckinStatistics,
  CheckinSimulationResult,
  CheckinLocation,
  CheckinVehicleInfo,
  CheckinSpotDetails,
  LicensePlate,
  VehicleType,
  RateType,
  SpotId,
  ServiceOperationError,
  ServiceValidationError
} from '../types/index.js';

// Import repositories and services (keeping CommonJS imports for now)
const VehicleRepository = require('../repositories/vehicleRepository');
const SpotRepository = require('../repositories/spotRepository');
const SpotAssignmentService = require('./spotAssignmentService');

/**
 * Service for handling vehicle check-in operations
 */
export class CheckinService implements ICheckinService {
  private vehicleRepository: any;
  private spotRepository: any;
  private spotAssignmentService: any;

  constructor() {
    this.vehicleRepository = new VehicleRepository();
    this.spotRepository = new SpotRepository();
    this.spotAssignmentService = new SpotAssignmentService();
  }

  /**
   * Check in a vehicle to the garage
   * Performs atomic operation: finds spot, creates vehicle record, occupies spot
   */
  checkInVehicle(licensePlate: LicensePlate, vehicleType: VehicleType, rateType: RateType = 'hourly'): CheckinResult {
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
   */
  private validateCheckinInputs(licensePlate: LicensePlate, vehicleType: VehicleType, rateType: RateType): void {
    if (!licensePlate || typeof licensePlate !== 'string') {
      throw new ServiceValidationError('License plate is required and must be a string', 'licensePlate', licensePlate);
    }

    const validVehicleTypes: VehicleType[] = ['compact', 'standard', 'oversized'];
    if (!validVehicleTypes.includes(vehicleType)) {
      throw new ServiceValidationError(`Invalid vehicle type: ${vehicleType}. Valid types: ${validVehicleTypes.join(', ')}`, 'vehicleType', vehicleType);
    }

    const validRateTypes: RateType[] = ['hourly', 'daily', 'monthly'];
    if (!validRateTypes.includes(rateType)) {
      throw new ServiceValidationError(`Invalid rate type: ${rateType}. Valid types: ${validRateTypes.join(', ')}`, 'rateType', rateType);
    }
  }

  /**
   * Check if vehicle is already checked in (prevent duplicates)
   */
  private checkForDuplicateVehicle(licensePlate: LicensePlate): void {
    const existingVehicle = this.vehicleRepository.findById(licensePlate);

    if (existingVehicle && !existingVehicle.isCheckedOut()) {
      throw new ServiceOperationError(
        `Vehicle ${licensePlate} is already checked in at spot ${existingVehicle.spotId}. ` +
        `Check-in time: ${existingVehicle.checkInTime}`,
        'checkDuplicate'
      );
    }
  }

  /**
   * Find and reserve the best available spot
   */
  private findAndReserveSpot(vehicleType: VehicleType): any {
    const bestSpot = this.spotAssignmentService.findBestAvailableSpot(vehicleType);

    if (!bestSpot) {
      // Provide helpful error message with availability info
      const availability = this.spotAssignmentService.getAvailabilityByVehicleType(vehicleType);
      const totalAvailable = this.spotRepository.findAvailable().length;

      throw new ServiceOperationError(
        `No available spots for ${vehicleType} vehicles. ` +
        `Compatible spots available: ${availability.total}. ` +
        `Total spots available: ${totalAvailable}`,
        'findSpot'
      );
    }

    return bestSpot;
  }

  /**
   * Create vehicle parking record
   */
  private createVehicleRecord(licensePlate: LicensePlate, spotId: SpotId, vehicleType: VehicleType, rateType: RateType): any {
    try {
      const vehicle = this.vehicleRepository.checkIn(licensePlate, spotId, vehicleType, rateType);
      return vehicle;
    } catch (error) {
      throw new ServiceOperationError(`Failed to create vehicle record: ${(error as Error).message}`, 'createVehicleRecord');
    }
  }

  /**
   * Mark spot as occupied atomically
   */
  private occupySpot(spotId: SpotId, licensePlate: LicensePlate): void {
    try {
      const success = this.spotRepository.occupy(spotId, licensePlate);
      if (!success) {
        throw new ServiceOperationError(`Spot ${spotId} not found`, 'occupySpot');
      }
    } catch (error) {
      if (error instanceof ServiceOperationError) {
        throw error;
      }
      throw new ServiceOperationError(`Failed to occupy spot ${spotId}: ${(error as Error).message}`, 'occupySpot');
    }
  }

  /**
   * Rollback check-in operation if something fails
   */
  private rollbackCheckin(licensePlate: LicensePlate, spotId: SpotId): void {
    try {
      // Remove vehicle record if it was created
      if (this.vehicleRepository.exists(licensePlate)) {
        this.vehicleRepository.delete(licensePlate);
      }
    } catch (error) {
      // Log error but don't throw - we're already in error handling
      console.error(`Failed to rollback vehicle record for ${licensePlate}:`, (error as Error).message);
    }

    try {
      // Free spot if it was occupied
      const spot = this.spotRepository.findById(spotId);
      if (spot && spot.isOccupied() && spot.currentVehicle === licensePlate) {
        this.spotRepository.vacate(spotId);
      }
    } catch (error) {
      // Log error but don't throw - we're already in error handling
      console.error(`Failed to rollback spot occupation for ${spotId}:`, (error as Error).message);
    }
  }

  /**
   * Format check-in result response
   */
  private formatCheckinResult(vehicle: any, spot: any): CheckinResult {
    const location: CheckinLocation = {
      floor: spot.floor,
      bay: spot.bay,
      spot: spot.spotNumber
    };

    const vehicleInfo: CheckinVehicleInfo = {
      licensePlate: vehicle.licensePlate,
      type: vehicle.vehicleType,
      rateType: vehicle.rateType
    };

    const spotDetails: CheckinSpotDetails = {
      type: spot.type,
      features: spot.features
    };

    return {
      success: true,
      message: 'Vehicle checked in successfully',
      spotId: spot.id,
      location,
      checkInTime: vehicle.checkInTime,
      vehicle: vehicleInfo,
      spotDetails,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get current check-in statistics
   */
  getCheckinStats(): CheckinStatistics {
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
   */
  simulateCheckin(licensePlate: LicensePlate, vehicleType: VehicleType): CheckinSimulationResult {
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
        spotLocation: {
          floor: simulation.spotLocation.floor,
          bay: simulation.spotLocation.bay,
          spot: simulation.spotLocation.spot
        },
        compatibility: simulation.compatibility
      };

    } catch (error) {
      return {
        success: false,
        error: 'SIMULATION_ERROR',
        message: (error as Error).message
      };
    }
  }
}

export default CheckinService;