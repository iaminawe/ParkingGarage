/**
 * Check-in Service with Sessions Integration
 *
 * This module handles the business logic for vehicle check-in operations,
 * including duplicate prevention, atomic spot assignment, vehicle record
 * creation, session management, and integration with spot assignment algorithms.
 *
 * @module CheckinService
 */

import { VehicleRepository } from '../repositories/VehicleRepository';
import { SpotRepository } from '../repositories/spotRepository';
import { SessionRepository } from '../repositories/SessionRepository';
const SpotAssignmentService = require('./spotAssignmentService');

interface CheckinOptions {
  rateType?: any;
  expectedDurationHours?: number;
  notes?: any;
}

interface CheckinResult {
  success: boolean;
  vehicle: any;
  spot: any;
  session: any;
  message: any;
  duration?: {
    checkedIn: any;
    expectedDuration?: number;
  };
}

/**
 * Service for handling vehicle check-in operations with session management
 */
export class CheckinService {
  private vehicleRepository: VehicleRepository;
  private spotRepository: SpotRepository;
  private sessionsRepository: SessionRepository;
  private spotAssignmentService: any;

  constructor() {
    this.vehicleRepository = new VehicleRepository();
    this.spotRepository = new SpotRepository();
    this.sessionsRepository = new SessionRepository();
    this.spotAssignmentService = new SpotAssignmentService();
  }

  /**
   * Check in a vehicle to the garage
   * Performs atomic operation: finds spot, creates vehicle record, creates session, occupies spot
   */
  async checkInVehicle(
    licensePlate: any,
    vehicleType: any = 'standard',
    options: CheckinOptions = {}
  ): Promise<CheckinResult> {
    const { rateType = 'hourly', expectedDurationHours, notes } = options;

    try {
      // Validate inputs
      this.validateCheckinInputs(licensePlate, vehicleType as any, rateType);

      // Step 1: Check for duplicate check-in
      await this.checkForDuplicateVehicle(licensePlate);

      // Step 2: Find the best available spot
      const assignedSpot = await this.findAndReserveSpot(vehicleType);

      // Step 3: Create vehicle record
      const vehicle = await this.createVehicleRecord(
        licensePlate,
        assignedSpot.id,
        vehicleType as any,
        rateType
      );

      // Step 4: Create parking session
      const session = await this.createParkingSession(vehicle, assignedSpot, options);

      // Step 5: Mark spot as occupied
      await this.occupySpot(assignedSpot.id, licensePlate);

      return {
        success: true,
        vehicle,
        spot: assignedSpot,
        session,
        message: `Vehicle ${licensePlate} successfully checked in to spot ${assignedSpot.id}`,
        duration: {
          checkedIn: new Date().toISOString(),
          expectedDuration: expectedDurationHours,
        },
      };
    } catch (error) {
      console.error('CheckinService.checkInVehicle error:', error);
      throw error;
    }
  }

  /**
   * Simulate check-in without actually performing it
   */
  async simulateCheckin(licensePlate: any, vehicleType: any = 'standard'): Promise<any> {
    try {
      // Validate inputs
      this.validateCheckinInputs(licensePlate, vehicleType as any, 'hourly');

      // Check for duplicate
      await this.checkForDuplicateVehicle(licensePlate);

      // Find available spot without reserving
      const availableSpot = await this.spotAssignmentService.findBestSpot(vehicleType);

      if (!availableSpot) {
        throw new Error(`No available spots for vehicle type: ${vehicleType}`);
      }

      return {
        success: true,
        simulation: true,
        licensePlate,
        vehicleType,
        recommendedSpot: availableSpot,
        message: `Simulation: Vehicle ${licensePlate} would be assigned to spot ${availableSpot.id}`,
      };
    } catch (error) {
      console.error('CheckinService.simulateCheckin error:', error);
      throw error;
    }
  }

  /**
   * Get availability status
   */
  async getAvailability(vehicleType?: any): Promise<any> {
    try {
      const stats = await this.spotRepository.getAvailabilityStats(vehicleType);
      return {
        success: true,
        availability: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('CheckinService.getAvailability error:', error);
      throw new Error('Failed to get availability information');
    }
  }

  /**
   * Get checkin statistics
   */
  async getCheckinStats(): Promise<any> {
    try {
      const vehicleStats = await this.vehicleRepository.getStats();
      const spotStats = await this.spotRepository.getStats();
      const sessionStats = await this.sessionsRepository.getStats();

      return {
        vehicles: vehicleStats,
        spots: spotStats,
        sessions: sessionStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('CheckinService.getCheckinStats error:', error);
      throw new Error('Failed to get checkin statistics');
    }
  }

  // Private helper methods

  private validateCheckinInputs(licensePlate: any, vehicleType: any, rateType: any): void {
    if (!licensePlate || typeof licensePlate !== 'string' || licensePlate.trim().length === 0) {
      throw new Error('License plate is required and must be a non-empty string');
    }

    if (!vehicleType || typeof vehicleType !== 'string') {
      throw new Error('Vehicle type is required and must be a string');
    }

    const validVehicleTypes = [
      'compact',
      'standard',
      'oversized',
      'electric',
      'motorcycle',
      'truck',
    ];
    if (!validVehicleTypes.includes(vehicleType.toLowerCase())) {
      throw new Error(`Invalid vehicle type. Must be one of: ${validVehicleTypes.join(', ')}`);
    }

    const validRateTypes = ['hourly', 'daily', 'monthly'];
    if (!validRateTypes.includes(rateType.toLowerCase())) {
      throw new Error(`Invalid rate type. Must be one of: ${validRateTypes.join(', ')}`);
    }
  }

  private async checkForDuplicateVehicle(licensePlate: any): Promise<void> {
    try {
      const existingVehicle = await this.vehicleRepository.findByLicensePlate(licensePlate);

      if (existingVehicle && (existingVehicle as any).status === 'parked') {
        throw new Error(
          `Vehicle with license plate '${licensePlate}' is already checked in to spot ${existingVehicle.spotId}`
        );
      }
    } catch (error) {
      if (error.message.includes('already checked in')) {
        throw error;
      }
      // Vehicle not found is okay
    }
  }

  private async findAndReserveSpot(vehicleType: any): Promise<any> {
    try {
      const assignedSpot = await this.spotAssignmentService.findBestSpot(vehicleType);

      if (!assignedSpot) {
        const stats = await this.spotRepository.getAvailabilityStats();
        throw new Error(
          `No available spots for vehicle type '${vehicleType}'. Available spots: ${stats.available}, Occupied: ${stats.occupied}`
        );
      }

      return assignedSpot;
    } catch (error) {
      console.error('CheckinService.findAndReserveSpot error:', error);
      throw error;
    }
  }

  private async createVehicleRecord(
    licensePlate: any,
    spotId: any,
    vehicleType: any,
    rateType: any
  ): Promise<any> {
    try {
      const vehicleData = {
        licensePlate,
        spotId,
        vehicleType,
        rateType,
        checkInTime: new Date().toISOString(),
      };

      return await this.vehicleRepository.create(vehicleData);
    } catch (error) {
      console.error('CheckinService.createVehicleRecord error:', error);
      throw new Error('Failed to create vehicle record');
    }
  }

  private async createParkingSession(
    vehicle: any,
    spot: any,
    options: CheckinOptions
  ): Promise<any> {
    try {
      const now = new Date();
      const expectedEndTime = options.expectedDurationHours
        ? new Date(now.getTime() + options.expectedDurationHours * 60 * 60 * 1000)
        : undefined;

      const sessionData = {
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
        vehicleType: vehicle.vehicleType as any,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleColor: vehicle.color,
        spotId: spot.id,
        floor: spot.floor,
        bay: spot.bay,
        spotNumber: spot.spotNumber,
        garageId: 'main-garage', // Default garage ID
        status: 'active' as const,
        createdAt: now.toISOString(),
        expectedEndTime: expectedEndTime?.toISOString(),
        rateType: options.rateType || 'hourly',
        notes: options.notes,
        tags: ['checkin', vehicle.vehicleType],
        metadata: {
          checkinMethod: 'api',
          assignedBy: 'system',
        },
      };

      return await this.sessionsRepository.create(sessionData);
    } catch (error) {
      console.error('CheckinService.createParkingSession error:', error);
      throw new Error('Failed to create parking session');
    }
  }

  private async occupySpot(spotId: any, licensePlate: any): Promise<void> {
    try {
      await this.spotRepository.updateSpotStatus(spotId, 'occupied', {
        licensePlate,
        occupiedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('CheckinService.occupySpot error:', error);
      throw new Error(`Failed to mark spot ${spotId} as occupied`);
    }
  }

  /**
   * Rollback checkin in case of partial failure
   */
  private async rollbackCheckin(vehicleId?: any, spotId?: any, sessionId?: any): Promise<void> {
    try {
      const rollbackPromises = [];

      if (sessionId) {
        rollbackPromises.push(
          this.sessionsRepository
            .delete(sessionId)
            .then(() => {})
            .catch(err => console.error('Failed to rollback session:', err))
        );
      }

      if (vehicleId) {
        rollbackPromises.push(
          Promise.resolve(this.vehicleRepository.delete(vehicleId))
            .then(() => {})
            .catch(err => console.error('Failed to rollback vehicle:', err))
        );
      }

      if (spotId) {
        rollbackPromises.push(
          Promise.resolve(this.spotRepository.updateSpotStatus(spotId, 'available', {}))
            .then(() => {})
            .catch(err => console.error('Failed to rollback spot status:', err))
        );
      }

      await Promise.all(rollbackPromises);
      console.log('Checkin rollback completed');
    } catch (error) {
      console.error('Failed to rollback checkin:', error);
      // Don't throw here - we're already in error handling
    }
  }
}
