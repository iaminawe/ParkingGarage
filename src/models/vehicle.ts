/**
 * Vehicle model definition for parking records
 * 
 * This module defines the Vehicle class which represents a parking
 * record for a vehicle currently parked in the garage. It tracks
 * the vehicle's information, parking location, and timing data.
 * 
 * @module Vehicle
 */

import { validateVehicle, isValidLicensePlate } from '../utils/validators';
import type { 
  VehicleData, 
  VehicleRecord, 
  VehicleSummary, 
  VehicleType, 
  RateType, 
  VehicleStatus 
} from '../types/models';

/**
 * Represents a vehicle parking record
 */
export class Vehicle implements VehicleRecord {
  public licensePlate: string;
  public spotId: string;
  public checkInTime: string;
  public vehicleType: VehicleType;
  public rateType: RateType;
  public checkOutTime: string | null;
  public totalAmount: number;
  public isPaid: boolean;
  public createdAt: string;
  public updatedAt: string;

  /**
   * Create a new vehicle parking record
   * @param vehicleData - The vehicle data
   */
  constructor(vehicleData: VehicleData) {
    // Validate the vehicle data
    const validation = validateVehicle(vehicleData);
    if (!validation.isValid) {
      throw new Error(`Invalid vehicle data: ${validation.errors.join(', ')}`);
    }

    this.licensePlate = vehicleData.licensePlate.toUpperCase();
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
   */
  static checkIn(
    licensePlate: string, 
    spotId: string, 
    vehicleType: VehicleType = 'standard', 
    rateType: RateType = 'hourly'
  ): Vehicle {
    if (!isValidLicensePlate(licensePlate)) {
      throw new Error('Invalid license plate format');
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
   * @throws If vehicle is already checked out
   */
  checkOut(hourlyRate: number = 5.00): void {
    if (this.isCheckedOut()) {
      throw new Error(`Vehicle ${this.licensePlate} is already checked out`);
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
   * Calculate parking duration in minutes
   * @returns Duration in minutes, or 0 if not checked out
   */
  getParkingDurationMinutes(): number {
    if (!this.checkOutTime) {
      return Math.floor((new Date().getTime() - new Date(this.checkInTime).getTime()) / (1000 * 60));
    }
    
    return Math.floor((new Date(this.checkOutTime).getTime() - new Date(this.checkInTime).getTime()) / (1000 * 60));
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
      case 'daily':
        // Daily rate is typically 8 hours worth
        amount = Math.min(amount, hourlyRate * 8);
        break;
      case 'monthly':
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
   * Mark the parking fee as paid
   * @param amountPaid - Amount paid by customer
   * @throws If amount is insufficient or already paid
   */
  markAsPaid(amountPaid: number): void {
    if (this.isPaid) {
      throw new Error(`Vehicle ${this.licensePlate} parking fee is already paid`);
    }

    if (amountPaid < this.totalAmount) {
      throw new Error(`Insufficient payment. Required: $${this.totalAmount}, Paid: $${amountPaid}`);
    }

    this.isPaid = true;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get the current parking status
   * @returns Status: 'parked', 'checked_out_unpaid', 'completed'
   */
  getStatus(): VehicleStatus {
    if (!this.checkOutTime) {
      return 'parked';
    }
    
    if (!this.isPaid) {
      return 'checked_out_unpaid';
    }
    
    return 'completed';
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
   * Get a plain object representation of the vehicle record
   * @returns Plain object with vehicle data
   */
  toObject(): VehicleRecord {
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
  static fromObject(obj: Partial<VehicleRecord> & VehicleData): Vehicle {
    const vehicle = new Vehicle(obj);
    if (obj.checkOutTime) vehicle.checkOutTime = obj.checkOutTime;
    if (obj.totalAmount) vehicle.totalAmount = obj.totalAmount;
    if (obj.isPaid) vehicle.isPaid = obj.isPaid;
    if (obj.createdAt) vehicle.createdAt = obj.createdAt;
    if (obj.updatedAt) vehicle.updatedAt = obj.updatedAt;
    return vehicle;
  }
}

export default Vehicle;