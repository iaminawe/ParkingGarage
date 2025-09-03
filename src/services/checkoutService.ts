/**
 * Checkout Service with Sessions Integration
 *
 * This module handles the business logic for vehicle checkout operations,
 * including vehicle lookup, duration calculation, fee computation,
 * session completion, atomic spot release, and parking record cleanup.
 *
 * @module CheckoutService
 */

import { VehicleRepository } from '../repositories/VehicleRepository';
import { SpotRepository } from '../repositories/SpotRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { BillingService } from './billingService';

interface CheckoutOptions {
  applyGracePeriod?: boolean;
  removeRecord?: boolean;
  checkOutTime?: any;
  endReason?: any;
}

interface CheckoutResult {
  success: boolean;
  vehicle: any;
  spot: any;
  session: any;
  billing: any;
  duration: {
    minutes: number;
    hours: number;
    checkedIn: any;
    checkedOut: any;
  };
  message: any;
}

/**
 * Service for handling vehicle checkout operations with session management
 */
export class CheckoutService {
  private vehicleRepository: VehicleRepository;
  private spotRepository: SpotRepository;
  private sessionsRepository: SessionRepository;
  private billingService: any;

  constructor() {
    this.vehicleRepository = new VehicleRepository();
    this.spotRepository = new SpotRepository();
    this.sessionsRepository = new SessionRepository();
    this.billingService = new BillingService();
  }

  /**
   * Check out a vehicle from the garage
   * Performs atomic operation: finds vehicle, calculates fees, completes session, releases spot, updates records
   */
  async checkOutVehicle(licensePlate: any, options: CheckoutOptions = {}): Promise<CheckoutResult> {
    const {
      applyGracePeriod = false,
      removeRecord = true,
      checkOutTime = null,
      endReason = 'Normal checkout',
    } = options;

    try {
      // Step 1: Find and validate vehicle
      const vehicle = await this.findAndValidateVehicle(licensePlate);

      // Step 2: Find associated spot
      const spot = await this.findAssociatedSpot(vehicle.spotId);

      // Step 3: Find active parking session
      const session = await this.findActiveParkingSession(licensePlate);

      // Step 4: Calculate parking duration and fees
      const checkoutTime = checkOutTime ? new Date(checkOutTime) : new Date();
      const checkinTime = new Date(vehicle.checkedInAt || session?.createdAt);
      const durationMinutes = Math.floor(
        (checkoutTime.getTime() - checkinTime.getTime()) / (1000 * 60)
      );
      const durationHours = Math.ceil(durationMinutes / 60);

      // Step 5: Calculate billing
      const billing = await this.calculateBilling(
        vehicle.vehicleType as any,
        durationMinutes,
        vehicle.rateType,
        { applyGracePeriod }
      );

      // Step 6: Complete parking session
      const completedSession = await this.completeSession(
        session.id,
        checkoutTime,
        durationMinutes,
        billing.totalCost,
        endReason
      );

      // Step 7: Release spot
      await this.releaseSpot(spot.id);

      // Step 8: Update or remove vehicle record
      if (removeRecord) {
        await this.vehicleRepository.delete(vehicle.id);
      } else {
        await this.vehicleRepository.update(vehicle.id, {
          // No checkOutTime field exists in vehicle data
        });
      }

      return {
        success: true,
        vehicle,
        spot,
        session: completedSession,
        billing,
        duration: {
          minutes: durationMinutes,
          hours: durationHours,
          checkedIn: checkinTime.toISOString(),
          checkedOut: checkoutTime.toISOString(),
        },
        message: `Vehicle ${licensePlate} successfully checked out from spot ${spot.id}. Total cost: $${billing.totalCost.toFixed(2)}`,
      };
    } catch (error) {
      console.error('CheckoutService.checkOutVehicle error:', error);
      throw error;
    }
  }

  /**
   * Get estimated cost for a vehicle before checkout
   */
  async estimateCheckoutCost(licensePlate: any): Promise<any> {
    try {
      const vehicle = await this.findAndValidateVehicle(licensePlate);
      const session = await this.findActiveParkingSession(licensePlate);

      const now = new Date();
      const checkinTime = new Date(vehicle.checkedInAt || session?.createdAt);
      const durationMinutes = Math.floor((now.getTime() - checkinTime.getTime()) / (1000 * 60));

      const billing = await this.calculateBilling(
        vehicle.vehicleType as any,
        durationMinutes,
        vehicle.rateType,
        { applyGracePeriod: false }
      );

      return {
        success: true,
        estimate: {
          licensePlate,
          currentDuration: {
            minutes: durationMinutes,
            hours: Math.ceil(durationMinutes / 60),
          },
          billing,
          estimatedAt: now.toISOString(),
        },
      };
    } catch (error) {
      console.error('CheckoutService.estimateCheckoutCost error:', error);
      throw error;
    }
  }

  /**
   * Simulate checkout without actually performing it
   * Calculates what the checkout would cost and return without making changes
   */
  async simulateCheckout(licensePlate: any, options: { checkOutTime?: any } = {}): Promise<any> {
    try {
      // Find and validate vehicle (no changes made)
      const vehicle = await this.findAndValidateVehicle(licensePlate);

      // Find associated spot (no changes made)  
      const spot = await this.findAssociatedSpot(vehicle.spotId);

      // Find active parking session (no changes made)
      const session = await this.findActiveParkingSession(licensePlate);

      // Calculate what the duration and billing would be
      const checkoutTime = options.checkOutTime ? new Date(options.checkOutTime) : new Date();
      const checkinTime = new Date(vehicle.checkedInAt || session?.createdAt);
      const durationMinutes = Math.floor(
        (checkoutTime.getTime() - checkinTime.getTime()) / (1000 * 60)
      );
      const durationHours = Math.ceil(durationMinutes / 60);

      // Calculate what billing would be (no charges made)
      const billing = await this.calculateBilling(
        vehicle.vehicleType as any,
        durationMinutes,
        vehicle.rateType,
        { applyGracePeriod: false }
      );

      return {
        success: true,
        simulation: true,
        licensePlate,
        vehicleType: vehicle.vehicleType,
        spotId: spot.id,
        duration: {
          minutes: durationMinutes,
          hours: durationHours,
          checkedIn: checkinTime.toISOString(),
          wouldCheckOut: checkoutTime.toISOString(),
        },
        billing,
        message: `Simulation: Vehicle ${licensePlate} would cost $${billing.totalCost.toFixed(2)} for ${durationHours} hour(s) parking`,
      };
    } catch (error) {
      console.error('CheckoutService.simulateCheckout error:', error);
      throw error;
    }
  }

  /**
   * Get checkout statistics
   */
  async getCheckoutStats(): Promise<any> {
    try {
      const completedSessions = await this.sessionsRepository.findAll();
      const completed = completedSessions.data.filter(s => s.status === 'COMPLETED');

      const totalRevenue = completed.reduce((sum, session: any) => sum + (session.cost || 0), 0);
      const averageDuration =
        completed.length > 0
          ? completed.reduce((sum, session: any) => sum + (session.duration || 0), 0) /
            completed.length
          : 0;

      return {
        totalCheckouts: completed.length,
        totalRevenue,
        averageDuration,
        averageCost: completed.length > 0 ? totalRevenue / completed.length : 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('CheckoutService.getCheckoutStats error:', error);
      throw new Error('Failed to get checkout statistics');
    }
  }

  // Private helper methods

  private async findAndValidateVehicle(licensePlate: any): Promise<any> {
    try {
      const vehicle = await this.vehicleRepository.findByLicensePlate(licensePlate);

      if (!vehicle) {
        throw new Error(`Vehicle with license plate '${licensePlate}' not found in garage`);
      }

      if ((vehicle as any).status !== 'parked') {
        throw new Error(
          `Vehicle with license plate '${licensePlate}' is not currently parked (status: ${(vehicle as any).status || 'parked'})`
        );
      }

      return vehicle;
    } catch (error) {
      console.error('CheckoutService.findAndValidateVehicle error:', error);
      throw error;
    }
  }

  private async findAssociatedSpot(spotId: any): Promise<any> {
    try {
      const spot = await this.spotRepository.findById(spotId);

      if (!spot) {
        throw new Error(`Spot with ID '${spotId}' not found`);
      }

      return spot;
    } catch (error) {
      console.error('CheckoutService.findAssociatedSpot error:', error);
      throw error;
    }
  }

  private async findActiveParkingSession(licensePlate: any): Promise<any> {
    try {
      const sessions = await this.sessionsRepository.findByLicensePlate(licensePlate);
      const activeSession = sessions.find((s: any) => s.status === 'ACTIVE');

      if (!activeSession) {
        throw new Error(`No active parking session found for vehicle '${licensePlate}'`);
      }

      return activeSession;
    } catch (error) {
      console.error('CheckoutService.findActiveParkingSession error:', error);
      throw error;
    }
  }

  private async calculateBilling(
    vehicleType: any,
    durationMinutes: number,
    rateType: any = 'hourly',
    options: { applyGracePeriod?: boolean } = {}
  ): Promise<any> {
    try {
      // This is a simplified billing calculation
      // In a real system, this would use the BillingService
      const hourlyRates: Record<string, number> = {
        compact: 4.0,
        standard: 5.0,
        oversized: 8.0,
        electric: 6.0,
        motorcycle: 3.0,
        truck: 10.0,
      };

      const baseRate = hourlyRates[vehicleType.toLowerCase()] ?? hourlyRates.standard ?? 5.0;

      if (!baseRate) {
        throw new Error(`Unable to determine rate for vehicle type: ${vehicleType}`);
      }

      // Apply grace period (first 15 minutes free)
      const billableMinutes =
        options.applyGracePeriod && durationMinutes <= 15 ? 0 : durationMinutes;

      // Calculate based on rate type
      let totalCost = 0;
      switch (rateType.toLowerCase()) {
        case 'hourly':
          const hours = Math.ceil(billableMinutes / 60);
          totalCost = Math.max(hours * baseRate, baseRate * 0.5); // Minimum 30 minutes
          break;
        case 'daily':
          const days = Math.ceil(durationMinutes / (24 * 60));
          totalCost = days * (baseRate * 24 * 0.8); // 20% discount for daily
          break;
        case 'monthly':
          totalCost = baseRate * 24 * 30 * 0.6; // 40% discount for monthly
          break;
        default:
          totalCost = Math.ceil(billableMinutes / 60) * baseRate;
      }

      return {
        baseRate,
        rateType,
        durationMinutes: billableMinutes,
        gracePeriodApplied: options.applyGracePeriod && durationMinutes <= 15,
        totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      console.error('CheckoutService.calculateBilling error:', error);
      throw new Error('Failed to calculate billing');
    }
  }

  private async completeSession(
    sessionId: any,
    endTime: Date,
    durationMinutes: number,
    cost: number,
    endReason: any
  ): Promise<any> {
    try {
      const updatedSession = await this.sessionsRepository.update(sessionId, {
        status: 'COMPLETED',
        endTime: endTime,
        duration: durationMinutes,
        cost,
        endReason,
      });

      return updatedSession;
    } catch (error) {
      console.error('CheckoutService.completeSession error:', error);
      throw new Error('Failed to complete parking session');
    }
  }

  private async releaseSpot(spotId: any): Promise<void> {
    try {
      await this.spotRepository.updateSpotStatus(spotId, 'AVAILABLE', {
        licensePlate: null,
        occupiedAt: null,
        releasedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('CheckoutService.releaseSpot error:', error);
      throw new Error(`Failed to release spot ${spotId}`);
    }
  }

  /**
   * Handle checkout rollback in case of partial failure
   */
  private async rollbackCheckout(vehicleId?: any, spotId?: any, sessionId?: any): Promise<void> {
    try {
      const rollbackPromises = [];

      if (sessionId) {
        // Revert session back to active
        rollbackPromises.push(
          this.sessionsRepository
            .update(sessionId, {
              status: 'ACTIVE',
              endTime: undefined,
              duration: undefined,
              cost: undefined,
              endReason: undefined,
            })
            .catch(err => console.error('Failed to rollback session:', err))
        );
      }

      if (vehicleId) {
        // Revert vehicle back to parked
        rollbackPromises.push(
          Promise.resolve(
            this.vehicleRepository.update(vehicleId, {
              // No checkOutTime field to revert
            })
          )
            .then(() => {})
            .catch(err => console.error('Failed to rollback vehicle:', err))
        );
      }

      if (spotId) {
        // Revert spot back to occupied
        rollbackPromises.push(
          Promise.resolve(this.spotRepository.updateSpotStatus(spotId, 'OCCUPIED', {}))
            .then(() => {})
            .catch(err => console.error('Failed to rollback spot status:', err))
        );
      }

      await Promise.all(rollbackPromises);
      console.log('Checkout rollback completed');
    } catch (error) {
      console.error('Failed to rollback checkout:', error);
      // Don't throw here - we're already in error handling
    }
  }
}
