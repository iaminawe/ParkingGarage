/**
 * Vehicle repository for data access operations
 * 
 * This module provides data access methods for vehicle parking records
 * using the repository pattern. It handles parking sessions, billing,
 * and vehicle tracking operations.
 * 
 * @module VehicleRepository
 */

import { MemoryStore } from '../storage/memoryStore';
import { 
  VehicleData, 
  VehicleRecord, 
  VehicleSummary, 
  VehicleStatus, 
  VehicleType, 
  RateType 
} from '../types/models';

/**
 * Vehicle implementation class for parking records
 */
class Vehicle implements VehicleRecord {
  licensePlate: string;
  spotId: string;
  checkInTime: string;
  vehicleType: VehicleType;
  rateType: RateType;
  checkOutTime: string | null;
  totalAmount: number;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;

  constructor(data: VehicleData) {
    this.licensePlate = data.licensePlate.toUpperCase();
    this.spotId = data.spotId;
    this.checkInTime = data.checkInTime;
    this.vehicleType = data.vehicleType;
    this.rateType = data.rateType;
    this.checkOutTime = null;
    this.totalAmount = 0;
    this.isPaid = false;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  static checkIn(licensePlate: string, spotId: string, vehicleType: VehicleType = 'standard', rateType: RateType = 'hourly'): Vehicle {
    return new Vehicle({
      licensePlate,
      spotId,
      checkInTime: new Date().toISOString(),
      vehicleType,
      rateType
    });
  }

  checkOut(hourlyRate: number = 5.00): void {
    if (this.checkOutTime) {
      throw new Error(`Vehicle ${this.licensePlate} is already checked out`);
    }

    this.checkOutTime = new Date().toISOString();
    
    const checkInTime = new Date(this.checkInTime);
    const checkOutTime = new Date(this.checkOutTime);
    const durationHours = Math.ceil((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60));
    
    this.totalAmount = Math.round(durationHours * hourlyRate * 100) / 100;
    this.updatedAt = new Date().toISOString();
  }

  markAsPaid(amountPaid: number): void {
    if (this.isPaid) {
      throw new Error(`Vehicle ${this.licensePlate} has already been paid`);
    }

    if (!this.checkOutTime) {
      throw new Error(`Vehicle ${this.licensePlate} must be checked out before payment`);
    }

    if (amountPaid < this.totalAmount) {
      throw new Error(`Insufficient payment. Required: $${this.totalAmount}, Provided: $${amountPaid}`);
    }

    this.isPaid = true;
    this.updatedAt = new Date().toISOString();
  }

  isCheckedOut(): boolean {
    return this.checkOutTime !== null;
  }

  getStatus(): VehicleStatus {
    if (!this.isCheckedOut()) {
      return 'parked';
    }
    if (!this.isPaid) {
      return 'checked_out_unpaid';
    }
    return 'completed';
  }

  getSummary(): VehicleSummary {
    const checkInTime = new Date(this.checkInTime);
    const checkOutTime = this.checkOutTime ? new Date(this.checkOutTime) : new Date();
    const durationMilliseconds = checkOutTime.getTime() - checkInTime.getTime();
    const durationMinutes = Math.floor(durationMilliseconds / (1000 * 60));
    const durationHours = Math.round((durationMilliseconds / (1000 * 60 * 60)) * 100) / 100;

    return {
      licensePlate: this.licensePlate,
      spotId: this.spotId,
      checkInTime: this.checkInTime,
      checkOutTime: this.checkOutTime,
      durationMinutes,
      durationHours,
      totalAmount: this.totalAmount,
      isPaid: this.isPaid,
      status: this.getStatus()
    };
  }
}

/**
 * Repository for managing vehicle parking records
 */
export class VehicleRepository {
  private store: MemoryStore;

  constructor() {
    this.store = MemoryStore.getInstance();
  }

  /**
   * Create a new vehicle parking record
   * @param vehicleData - Vehicle data to create
   * @returns Created vehicle instance
   * @throws Error If vehicle already exists or data is invalid
   */
  create(vehicleData: VehicleData): Vehicle {
    const vehicle = new Vehicle(vehicleData);
    
    if (this.store.vehicles.has(vehicle.licensePlate)) {
      throw new Error(`Vehicle with license plate ${vehicle.licensePlate} already exists`);
    }

    this.store.vehicles.set(vehicle.licensePlate, vehicle);
    return vehicle;
  }

  /**
   * Check in a vehicle to a parking spot
   * @param licensePlate - Vehicle license plate
   * @param spotId - ID of the spot being occupied
   * @param vehicleType - Type of vehicle
   * @param rateType - Rate type for billing
   * @returns Created vehicle parking record
   */
  checkIn(licensePlate: string, spotId: string, vehicleType: VehicleType = 'standard', rateType: RateType = 'hourly'): Vehicle {
    const vehicle = Vehicle.checkIn(licensePlate, spotId, vehicleType, rateType);
    
    if (this.store.vehicles.has(vehicle.licensePlate)) {
      throw new Error(`Vehicle ${vehicle.licensePlate} is already parked`);
    }

    this.store.vehicles.set(vehicle.licensePlate, vehicle);
    return vehicle;
  }

  /**
   * Find a vehicle by license plate
   * @param licensePlate - License plate to find
   * @returns Found vehicle or null if not found
   */
  findById(licensePlate: string): Vehicle | null {
    return this.store.vehicles.get(licensePlate.toUpperCase()) || null;
  }

  /**
   * Find all vehicle records
   * @returns Array of all vehicles
   */
  findAll(): Vehicle[] {
    return Array.from(this.store.vehicles.values());
  }

  /**
   * Find vehicles by spot ID
   * @param spotId - Spot ID to search for
   * @returns Array of vehicles in the spot
   */
  findBySpotId(spotId: string): Vehicle[] {
    return this.findAll().filter(vehicle => vehicle.spotId === spotId);
  }

  /**
   * Find current vehicle in a spot (not checked out)
   * @param spotId - Spot ID to search for
   * @returns Current vehicle or null
   */
  findCurrentInSpot(spotId: string): Vehicle | null {
    return this.findAll().find(vehicle => 
      vehicle.spotId === spotId && !vehicle.isCheckedOut()
    ) || null;
  }

  /**
   * Find vehicles by status
   * @param status - Status to filter by ('parked', 'checked_out_unpaid', 'completed')
   * @returns Array of vehicles matching the status
   */
  findByStatus(status: VehicleStatus): Vehicle[] {
    return this.findAll().filter(vehicle => vehicle.getStatus() === status);
  }

  /**
   * Find currently parked vehicles
   * @returns Array of parked vehicles
   */
  findParked(): Vehicle[] {
    return this.findByStatus('parked');
  }

  /**
   * Find checked out but unpaid vehicles
   * @returns Array of unpaid vehicles
   */
  findUnpaid(): Vehicle[] {
    return this.findByStatus('checked_out_unpaid');
  }

  /**
   * Find completed parking sessions
   * @returns Array of completed sessions
   */
  findCompleted(): Vehicle[] {
    return this.findByStatus('completed');
  }

  /**
   * Find vehicles by vehicle type
   * @param vehicleType - Vehicle type to filter by
   * @returns Array of vehicles matching the type
   */
  findByVehicleType(vehicleType: VehicleType): Vehicle[] {
    return this.findAll().filter(vehicle => vehicle.vehicleType === vehicleType);
  }

  /**
   * Find vehicles by rate type
   * @param rateType - Rate type to filter by
   * @returns Array of vehicles matching the rate type
   */
  findByRateType(rateType: RateType): Vehicle[] {
    return this.findAll().filter(vehicle => vehicle.rateType === rateType);
  }

  /**
   * Find vehicles by date range
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of vehicles checked in within the range
   */
  findByDateRange(startDate: Date, endDate: Date): Vehicle[] {
    return this.findAll().filter(vehicle => {
      const checkInDate = new Date(vehicle.checkInTime);
      return checkInDate >= startDate && checkInDate <= endDate;
    });
  }

  /**
   * Update a vehicle record
   * @param licensePlate - License plate of vehicle to update
   * @param updates - Fields to update
   * @returns Updated vehicle or null if not found
   * @throws Error If trying to update immutable fields
   */
  update(licensePlate: string, updates: Partial<VehicleRecord>): Vehicle | null {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return null;
    }

    // Prevent updating immutable fields
    const immutableFields: (keyof VehicleRecord)[] = ['licensePlate', 'checkInTime', 'createdAt'];
    const invalidFields = Object.keys(updates).filter(field => 
      immutableFields.includes(field as keyof VehicleRecord)
    );
    
    if (invalidFields.length > 0) {
      throw new Error(`Cannot update immutable fields: ${invalidFields.join(', ')}`);
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof VehicleRecord] !== undefined) {
        (vehicle as any)[key] = updates[key as keyof VehicleRecord];
      }
    });

    vehicle.updatedAt = new Date().toISOString();
    return vehicle;
  }

  /**
   * Check out a vehicle
   * @param licensePlate - License plate of vehicle to check out
   * @param hourlyRate - Rate per hour for billing
   * @returns Checked out vehicle or null if not found
   * @throws Error If vehicle is already checked out
   */
  checkOut(licensePlate: string, hourlyRate: number = 5.00): Vehicle | null {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return null;
    }

    vehicle.checkOut(hourlyRate);
    return vehicle;
  }

  /**
   * Mark a vehicle's parking fee as paid
   * @param licensePlate - License plate of vehicle
   * @param amountPaid - Amount paid by customer
   * @returns Updated vehicle or null if not found
   * @throws Error If insufficient payment or already paid
   */
  markAsPaid(licensePlate: string, amountPaid: number): Vehicle | null {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return null;
    }

    vehicle.markAsPaid(amountPaid);
    return vehicle;
  }

  /**
   * Delete a vehicle record
   * @param licensePlate - License plate of vehicle to delete
   * @returns True if deleted, false if not found
   * @throws Error If vehicle is still parked (not checked out)
   */
  delete(licensePlate: string): boolean {
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
   * @param licensePlate - License plate to check
   * @returns True if vehicle exists
   */
  exists(licensePlate: string): boolean {
    return this.store.vehicles.has(licensePlate.toUpperCase());
  }

  /**
   * Get total count of vehicle records
   * @returns Total number of vehicles
   */
  count(): number {
    return this.store.vehicles.size;
  }

  /**
   * Get count by status
   * @param status - Status to count
   * @returns Count of vehicles with the status
   */
  countByStatus(status: VehicleStatus): number {
    return this.findByStatus(status).length;
  }

  /**
   * Get parking statistics
   * @returns Parking statistics
   */
  getParkingStats(): {
    total: number;
    parked: number;
    unpaid: number;
    completed: number;
    checkedOut: number;
  } {
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
   * @returns Revenue statistics
   */
  getRevenueStats(): {
    totalRevenue: number;
    pendingRevenue: number;
    completedSessions: number;
    averageRevenue: number;
  } {
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
   * @param maxHours - Maximum allowed parking hours
   * @returns Array of overstaying vehicles
   */
  findOverstayed(maxHours: number = 24): Vehicle[] {
    const maxMilliseconds = maxHours * 60 * 60 * 1000;
    const now = new Date();

    return this.findParked().filter(vehicle => {
      const checkInTime = new Date(vehicle.checkInTime);
      return (now.getTime() - checkInTime.getTime()) > maxMilliseconds;
    });
  }

  /**
   * Clear all vehicle records (mainly for testing)
   */
  clear(): void {
    this.store.vehicles.clear();
  }
}