/**
 * Vehicle model definition for parking records
 *
 * This module defines the Vehicle class which represents a parking
 * record for a vehicle currently parked in the garage. It tracks
 * the vehicle's information, parking location, and timing data.
 *
 * @module Vehicle
 */

import { 
  VehicleData, 
  VehicleRecord, 
  VehicleSummary, 
  VehicleType, 
  RateType, 
  VehicleStatus,
  ValidationResult,
  PlainObject,
  isVehicleType,
  isRateType
} from './ts-types/types';
import { validateVehicle, isValidLicensePlate } from '../utils/validators';

/**
 * Represents a vehicle parking record with comprehensive type safety
 */
export class Vehicle implements VehicleRecord {
  /** Vehicle license plate (normalized to uppercase) */
  public readonly licensePlate: string;
  
  /** ID of the parked spot */
  public readonly spotId: string;
  
  /** ISO timestamp of check-in */
  public readonly checkInTime: string;
  
  /** Vehicle type for size compatibility */
  public readonly vehicleType: VehicleType;
  
  /** Rate type for billing calculations */
  public readonly rateType: RateType;
  
  /** ISO timestamp of check-out or null if still parked */
  public checkOutTime: string | null;
  
  /** Total amount owed for parking */
  public totalAmount: number;
  
  /** Whether parking fee has been paid */
  public isPaid: boolean;
  
  /** ISO timestamp when record was created */
  public readonly createdAt: string;
  
  /** ISO timestamp when record was last updated */
  public updatedAt: string;

  /**
   * Create a new vehicle parking record
   * @param vehicleData - The vehicle data
   * @throws {Error} If vehicle data is invalid
   */
  constructor(vehicleData: VehicleData) {
    // Validate the vehicle data
    const validation: ValidationResult = validateVehicle(vehicleData);
    if (!validation.isValid) {
      throw new Error(`Invalid vehicle data: ${validation.errors.join(', ')}`);
    }

    this.licensePlate = vehicleData.licensePlate.toUpperCase().trim();
    this.spotId = vehicleData.spotId;
    this.checkInTime = vehicleData.checkInTime;
    this.vehicleType = vehicleData.vehicleType;
    this.rateType = vehicleData.rateType;
    this.checkOutTime = null;
    this.totalAmount = 0;
    this.isPaid = false;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Create a new parking record for a vehicle checking in
   * @param licensePlate - Vehicle license plate
   * @param spotId - ID of the spot being occupied
   * @param vehicleType - Type of vehicle
   * @param rateType - Rate type for billing
   * @returns New vehicle parking record
   * @throws {Error} If license plate format is invalid
   */
  static checkIn(
    licensePlate: string, 
    spotId: string, 
    vehicleType: VehicleType = VehicleType.STANDARD, 
    rateType: RateType = RateType.HOURLY
  ): Vehicle {
    if (!isValidLicensePlate(licensePlate)) {
      throw new Error('Invalid license plate format');
    }

    if (!spotId || typeof spotId !== 'string') {
      throw new Error('Valid spot ID is required');
    }

    return new Vehicle({
      licensePlate,
      spotId,
      checkInTime: new Date().toISOString(),
      vehicleType,
      rateType
    });
  }

  /**
   * Check out the vehicle and calculate total time parked
   * @param hourlyRate - Rate per hour for billing
   * @throws {Error} If vehicle is already checked out
   */
  checkOut(hourlyRate: number = 5.00): void {
    if (this.isCheckedOut()) {
      throw new Error(`Vehicle ${this.licensePlate} is already checked out`);
    }

    if (typeof hourlyRate !== 'number' || hourlyRate < 0) {
      throw new Error('Hourly rate must be a non-negative number');
    }

    this.checkOutTime = new Date().toISOString();
    this.totalAmount = this.calculateTotalAmount(hourlyRate);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Check if vehicle is currently checked out
   * @returns True if vehicle is checked out
   */
  isCheckedOut(): boolean {
    return this.checkOutTime !== null;
  }

  /**
   * Check if vehicle is currently parked (not checked out)
   * @returns True if vehicle is still parked
   */
  isParked(): boolean {
    return this.checkOutTime === null;
  }

  /**
   * Calculate parking duration in milliseconds
   * @param endTime - Optional end time, defaults to now for current duration
   * @returns Duration in milliseconds
   */
  private getParkingDurationMs(endTime?: Date): number {
    const startTime = new Date(this.checkInTime);
    const actualEndTime = endTime || (this.checkOutTime ? new Date(this.checkOutTime) : new Date());
    
    return actualEndTime.getTime() - startTime.getTime();
  }

  /**
   * Calculate parking duration in minutes
   * @returns Duration in minutes, current time if not checked out
   */
  getParkingDurationMinutes(): number {
    const durationMs = this.getParkingDurationMs();
    return Math.floor(durationMs / (1000 * 60));
  }

  /**
   * Calculate parking duration in hours (rounded up)
   * @returns Duration in hours
   */
  getParkingDurationHours(): number {
    const minutes = this.getParkingDurationMinutes();
    return Math.ceil(minutes / 60);
  }

  /**
   * Calculate total amount owed based on parking duration and rate
   * @param hourlyRate - Rate per hour
   * @returns Total amount owed
   */
  calculateTotalAmount(hourlyRate: number = 5.00): number {
    const hours = this.getParkingDurationHours();
    let amount = hours * hourlyRate;

    // Apply rate type multipliers
    switch (this.rateType) {
      case RateType.DAILY:
        // Daily rate is typically 8 hours worth, cap at daily max
        amount = Math.min(amount, hourlyRate * 8);
        break;
      case RateType.MONTHLY:
        // Monthly rate calculation (simplified)
        const days = Math.ceil(hours / 24);
        amount = Math.min(amount, hourlyRate * 8 * days * 0.8); // 20% discount
        break;
      default:
        // Hourly rate - no modification needed
        break;
    }

    return Math.round(amount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get current amount owed (live calculation)
   * @param hourlyRate - Rate per hour
   * @returns Current amount owed
   */
  getCurrentAmountOwed(hourlyRate: number = 5.00): number {
    if (this.isCheckedOut()) {
      return this.totalAmount;
    }
    
    // Calculate current amount for vehicles still parked
    return this.calculateTotalAmount(hourlyRate);
  }

  /**
   * Mark the parking fee as paid
   * @param amountPaid - Amount paid by customer
   * @throws {Error} If amount is insufficient or already paid
   */
  markAsPaid(amountPaid: number): void {
    if (this.isPaid) {
      throw new Error(`Vehicle ${this.licensePlate} parking fee is already paid`);
    }

    if (!this.isCheckedOut()) {
      throw new Error(`Vehicle ${this.licensePlate} must be checked out before payment`);
    }

    if (typeof amountPaid !== 'number' || amountPaid < 0) {
      throw new Error('Amount paid must be a non-negative number');
    }

    if (amountPaid < this.totalAmount) {
      const shortfall = Math.round((this.totalAmount - amountPaid) * 100) / 100;
      throw new Error(`Insufficient payment. Required: $${this.totalAmount.toFixed(2)}, Paid: $${amountPaid.toFixed(2)}, Shortfall: $${shortfall.toFixed(2)}`);
    }

    this.isPaid = true;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get the current parking status
   * @returns Status enum value
   */
  getStatus(): VehicleStatus {
    if (!this.checkOutTime) {
      return VehicleStatus.PARKED;
    }

    if (!this.isPaid) {
      return VehicleStatus.CHECKED_OUT_UNPAID;
    }

    return VehicleStatus.COMPLETED;
  }

  /**
   * Get a summary of the parking session
   * @returns Summary with key information
   */
  getSummary(): VehicleSummary {
    return {
      licensePlate: this.licensePlate,
      spotId: this.spotId,
      checkInTime: this.checkInTime,
      checkOutTime: this.checkOutTime,
      durationMinutes: this.getParkingDurationMinutes(),
      durationHours: this.getParkingDurationHours(),
      totalAmount: this.totalAmount,
      isPaid: this.isPaid,
      status: this.getStatus()
    };
  }

  /**
   * Get formatted duration string
   * @returns Human-readable duration string
   */
  getFormattedDuration(): string {
    const totalMinutes = this.getParkingDurationMinutes();
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Check if the vehicle has overstayed (for notifications)
   * @param maxHours - Maximum allowed hours before considered overstay
   * @returns True if vehicle has overstayed
   */
  isOverstayed(maxHours: number = 24): boolean {
    if (this.isCheckedOut()) {
      return false; // Already checked out
    }
    
    const hoursParked = this.getParkingDurationHours();
    return hoursParked > maxHours;
  }

  /**
   * Get a plain object representation of the vehicle record
   * @returns Plain object with vehicle data
   */
  toObject(): PlainObject<VehicleRecord> {
    return {
      licensePlate: this.licensePlate,
      spotId: this.spotId,
      checkInTime: this.checkInTime,
      vehicleType: this.vehicleType,
      rateType: this.rateType,
      checkOutTime: this.checkOutTime,
      totalAmount: this.totalAmount,
      isPaid: this.isPaid,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Get JSON representation of the vehicle record
   * @returns JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  /**
   * Create a vehicle record from a plain object
   * @param obj - Plain object with vehicle data
   * @returns New vehicle record instance
   */
  static fromObject(obj: Partial<VehicleRecord>): Vehicle {
    if (!obj.licensePlate || !obj.spotId || !obj.checkInTime || 
        !obj.vehicleType || !obj.rateType) {
      throw new Error('Missing required vehicle properties');
    }

    // Validate enum values
    if (!isVehicleType(obj.vehicleType)) {
      throw new Error(`Invalid vehicle type: ${obj.vehicleType}`);
    }

    if (!isRateType(obj.rateType)) {
      throw new Error(`Invalid rate type: ${obj.rateType}`);
    }

    const vehicle = new Vehicle({
      licensePlate: obj.licensePlate,
      spotId: obj.spotId,
      checkInTime: obj.checkInTime,
      vehicleType: obj.vehicleType,
      rateType: obj.rateType
    });
    
    // Restore additional properties
    if (obj.checkOutTime !== undefined) {
      vehicle.checkOutTime = obj.checkOutTime;
    }
    if (typeof obj.totalAmount === 'number') {
      vehicle.totalAmount = obj.totalAmount;
    }
    if (typeof obj.isPaid === 'boolean') {
      vehicle.isPaid = obj.isPaid;
    }
    if (obj.createdAt) {
      (vehicle as any).createdAt = obj.createdAt;
    }
    if (obj.updatedAt) {
      vehicle.updatedAt = obj.updatedAt;
    }
    
    return vehicle;
  }
}