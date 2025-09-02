/**
 * Vehicle model definition for parking records
 *
 * This module defines the Vehicle class which represents a vehicle
 * with parking session information, owner details, and payment status.
 * It includes comprehensive vehicle management for CRUD operations.
 *
 * @module Vehicle
 */

import {
  VehicleData,
  VehicleRecord,
  VehicleStatus,
  VehicleType,
  RateType,
  ValidationResult,
} from '../types/models';
import { validateVehicle, isValidLicensePlate } from '../utils/validators';

// Extended interfaces for full vehicle management
export interface VehicleOwnerData {
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

export interface ExtendedVehicleData extends VehicleData, VehicleOwnerData {
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  notes?: string;
}

export interface FullVehicleRecord extends VehicleRecord, VehicleOwnerData {
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  notes?: string;
}

/**
 * Represents a vehicle with parking record and owner information
 */
export class Vehicle {
  public readonly licensePlate: string;
  public spotId: string;
  public readonly checkInTime: string;
  public vehicleType: VehicleType;
  public rateType: RateType;
  public checkOutTime: string | null = null;
  public totalAmount = 0;
  public isPaid = false;
  public readonly createdAt: string;
  public updatedAt: string;

  // Extended vehicle properties
  public make?: string;
  public model?: string;
  public color?: string;
  public year?: number;

  // Owner information
  public ownerId?: string;
  public ownerName?: string;
  public ownerEmail?: string;
  public ownerPhone?: string;
  public notes?: string;

  /**
   * Create a new vehicle parking record
   * @param vehicleData - The vehicle data including owner information
   */
  constructor(vehicleData: ExtendedVehicleData) {
    // Validate the vehicle data
    const validation = validateVehicle(vehicleData);
    if (!validation.isValid) {
      throw new Error(`Invalid vehicle data: ${validation.errors.join(', ')}`);
    }

    // Core parking data
    this.licensePlate = vehicleData.licensePlate.toUpperCase();
    this.spotId = vehicleData.spotId;
    this.checkInTime = vehicleData.checkInTime;
    this.vehicleType = vehicleData.vehicleType;
    this.rateType = vehicleData.rateType;

    // Extended vehicle information
    this.make = vehicleData.make;
    this.model = vehicleData.model;
    this.color = vehicleData.color;
    this.year = vehicleData.year;

    // Owner information
    this.ownerId = vehicleData.ownerId;
    this.ownerName = vehicleData.ownerName;
    this.ownerEmail = vehicleData.ownerEmail;
    this.ownerPhone = vehicleData.ownerPhone;
    this.notes = vehicleData.notes;

    // Timestamps
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Create a new parking record for a vehicle checking in
   * @param licensePlate - Vehicle license plate
   * @param spotId - ID of the spot being occupied
   * @param vehicleType - Type of vehicle
   * @param rateType - Rate type for billing
   * @param additionalData - Additional vehicle and owner data
   * @returns New vehicle parking record
   */
  static checkIn(
    licensePlate: string,
    spotId: string,
    vehicleType: VehicleType = 'standard',
    rateType: RateType = 'hourly',
    additionalData?: Partial<ExtendedVehicleData>
  ): Vehicle {
    if (!isValidLicensePlate(licensePlate)) {
      throw new Error('Invalid license plate format');
    }

    return new Vehicle({
      licensePlate,
      spotId,
      checkInTime: new Date().toISOString(),
      vehicleType,
      rateType,
      ...additionalData,
    });
  }

  /**
   * Update vehicle information (non-immutable fields only)
   * @param updates - Fields to update
   * @returns Validation result
   */
  update(
    updates: Partial<Omit<ExtendedVehicleData, 'licensePlate' | 'checkInTime'>>
  ): ValidationResult {
    const errors: string[] = [];

    // Validate vehicle type if provided
    if (updates.vehicleType !== undefined) {
      const validTypes: VehicleType[] = ['compact', 'standard', 'oversized'];
      if (!validTypes.includes(updates.vehicleType)) {
        errors.push(`Invalid vehicle type: ${updates.vehicleType}`);
      }
    }

    // Validate rate type if provided
    if (updates.rateType !== undefined) {
      const validRates: RateType[] = ['hourly', 'daily', 'monthly'];
      if (!validRates.includes(updates.rateType)) {
        errors.push(`Invalid rate type: ${updates.rateType}`);
      }
    }

    // Validate email format if provided
    if (updates.ownerEmail !== undefined && updates.ownerEmail !== null) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (updates.ownerEmail.trim() !== '' && !emailRegex.test(updates.ownerEmail)) {
        errors.push('Invalid email format');
      }
    }

    // Validate phone format if provided
    if (updates.ownerPhone !== undefined && updates.ownerPhone !== null) {
      const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
      if (updates.ownerPhone.trim() !== '' && !phoneRegex.test(updates.ownerPhone)) {
        errors.push('Invalid phone format');
      }
    }

    // Validate year if provided
    if (updates.year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (updates.year < 1900 || updates.year > currentYear + 1) {
        errors.push('Vehicle year must be between 1900 and current year + 1');
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Apply valid updates
    Object.keys(updates).forEach(key => {
      if (key in this && updates[key as keyof typeof updates] !== undefined) {
        (this as any)[key] = updates[key as keyof typeof updates];
      }
    });

    this.updatedAt = new Date().toISOString();
    return { isValid: true, errors: [] };
  }

  /**
   * Check out the vehicle and calculate total time parked
   * @param hourlyRate - Rate per hour for billing
   */
  checkOut(hourlyRate = 5.0): void {
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
   * @returns Duration in minutes, or current duration if not checked out
   */
  getParkingDurationMinutes(): number {
    const endTime = this.checkOutTime ? new Date(this.checkOutTime) : new Date();
    const startTime = new Date(this.checkInTime);
    return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
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
  calculateTotalAmount(hourlyRate = 5.0): number {
    const hours = this.getParkingDurationHours();
    let amount = hours * hourlyRate;

    // Apply rate type multipliers
    switch (this.rateType) {
      case 'daily':
        // Daily rate is typically 8 hours worth, capped
        amount = Math.min(amount, hourlyRate * 8);
        break;
      case 'monthly':
        // Monthly rate calculation with discount
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
  getSummary() {
    return {
      licensePlate: this.licensePlate,
      spotId: this.spotId,
      checkInTime: this.checkInTime,
      checkOutTime: this.checkOutTime,
      durationMinutes: this.getParkingDurationMinutes(),
      durationHours: this.getParkingDurationHours(),
      totalAmount: this.totalAmount,
      isPaid: this.isPaid,
      status: this.getStatus(),
    };
  }

  /**
   * Get vehicle owner information
   * @returns Owner details
   */
  getOwnerInfo() {
    return {
      ownerId: this.ownerId,
      ownerName: this.ownerName,
      ownerEmail: this.ownerEmail,
      ownerPhone: this.ownerPhone,
    };
  }

  /**
   * Get vehicle details (make, model, color, year)
   * @returns Vehicle details
   */
  getVehicleDetails() {
    return {
      make: this.make,
      model: this.model,
      color: this.color,
      year: this.year,
      vehicleType: this.vehicleType,
    };
  }

  /**
   * Get a plain object representation of the vehicle record
   * @returns Plain object with all vehicle data
   */
  toObject(): FullVehicleRecord {
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
      updatedAt: this.updatedAt,
      make: this.make,
      model: this.model,
      color: this.color,
      year: this.year,
      ownerId: this.ownerId,
      ownerName: this.ownerName,
      ownerEmail: this.ownerEmail,
      ownerPhone: this.ownerPhone,
      notes: this.notes,
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
  static fromObject(obj: FullVehicleRecord): Vehicle {
    const vehicle = new Vehicle(obj);
    if (obj.checkOutTime) {
      vehicle.checkOutTime = obj.checkOutTime;
    }
    if (obj.totalAmount) {
      vehicle.totalAmount = obj.totalAmount;
    }
    if (obj.isPaid) {
      vehicle.isPaid = obj.isPaid;
    }
    if (obj.createdAt) {
      Object.defineProperty(vehicle, 'createdAt', { value: obj.createdAt, writable: false });
    }
    if (obj.updatedAt) {
      vehicle.updatedAt = obj.updatedAt;
    }
    return vehicle;
  }

  /**
   * Validate vehicle uniqueness by license plate
   * @param licensePlate - License plate to check
   * @param existingVehicles - Array of existing vehicles
   * @returns Validation result
   */
  static validateUniqueness(licensePlate: string, existingVehicles: Vehicle[]): ValidationResult {
    const normalizedPlate = licensePlate.toUpperCase();
    const exists = existingVehicles.some(v => v.licensePlate === normalizedPlate);

    if (exists) {
      return {
        isValid: false,
        errors: [`Vehicle with license plate ${normalizedPlate} already exists`],
      };
    }

    return { isValid: true, errors: [] };
  }
}

export default Vehicle;
