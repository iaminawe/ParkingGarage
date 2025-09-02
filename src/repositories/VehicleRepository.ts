/**
 * Vehicle repository for data access operations
 * 
 * This module provides data access methods for vehicle records
 * using the repository pattern. It handles vehicle CRUD operations,
 * search functionality, and maintains data consistency.
 * 
 * @module VehicleRepository
 */

import MemoryStore from '../storage/memoryStore';
import Vehicle, { ExtendedVehicleData, FullVehicleRecord } from '../models/Vehicle';
import { VehicleStatus, VehicleType, RateType, ValidationResult } from '../types/models';

/**
 * Repository for managing vehicle records
 */
export class VehicleRepository {
  private store: typeof MemoryStore;

  constructor() {
    this.store = MemoryStore.getInstance();
  }

  /**
   * Create a new vehicle record
   * @param vehicleData - Vehicle data to create
   * @returns Created vehicle instance
   * @throws Error if vehicle already exists or data is invalid
   */
  create(vehicleData: ExtendedVehicleData): Vehicle {
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
   * @param additionalData - Additional vehicle information
   * @returns Created vehicle parking record
   */
  checkIn(
    licensePlate: string, 
    spotId: string, 
    vehicleType: VehicleType = 'standard', 
    rateType: RateType = 'hourly',
    additionalData?: Partial<ExtendedVehicleData>
  ): Vehicle {
    const vehicle = Vehicle.checkIn(licensePlate, spotId, vehicleType, rateType, additionalData);
    
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
   * @param status - Status to filter by
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
   * Find vehicles by owner ID
   * @param ownerId - Owner ID to search for
   * @returns Array of vehicles belonging to the owner
   */
  findByOwnerId(ownerId: string): Vehicle[] {
    return this.findAll().filter(vehicle => vehicle.ownerId === ownerId);
  }

  /**
   * Find vehicles by owner name (case-insensitive partial match)
   * @param ownerName - Owner name to search for
   * @returns Array of vehicles matching the owner name
   */
  findByOwnerName(ownerName: string): Vehicle[] {
    const searchTerm = ownerName.toLowerCase();
    return this.findAll().filter(vehicle => 
      vehicle.ownerName && vehicle.ownerName.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Find vehicles by make and/or model (case-insensitive partial match)
   * @param make - Vehicle make to search for
   * @param model - Vehicle model to search for
   * @returns Array of vehicles matching the criteria
   */
  findByMakeModel(make?: string, model?: string): Vehicle[] {
    return this.findAll().filter(vehicle => {
      let matches = true;
      
      if (make && vehicle.make) {
        matches = matches && vehicle.make.toLowerCase().includes(make.toLowerCase());
      } else if (make) {
        matches = false;
      }
      
      if (model && vehicle.model) {
        matches = matches && vehicle.model.toLowerCase().includes(model.toLowerCase());
      } else if (model) {
        matches = false;
      }
      
      return matches;
    });
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
   * Search vehicles by multiple criteria
   * @param criteria - Search criteria
   * @returns Array of vehicles matching all criteria
   */
  search(criteria: {
    licensePlate?: string;
    vehicleType?: VehicleType;
    make?: string;
    model?: string;
    color?: string;
    ownerName?: string;
    ownerEmail?: string;
    status?: VehicleStatus;
    yearFrom?: number;
    yearTo?: number;
  }): Vehicle[] {
    return this.findAll().filter(vehicle => {
      // License plate search (case-insensitive partial match)
      if (criteria.licensePlate) {
        const matches = vehicle.licensePlate.toLowerCase().includes(criteria.licensePlate.toLowerCase());
        if (!matches) return false;
      }

      // Exact vehicle type match
      if (criteria.vehicleType && vehicle.vehicleType !== criteria.vehicleType) {
        return false;
      }

      // Make search (case-insensitive partial match)
      if (criteria.make) {
        if (!vehicle.make || !vehicle.make.toLowerCase().includes(criteria.make.toLowerCase())) {
          return false;
        }
      }

      // Model search (case-insensitive partial match)
      if (criteria.model) {
        if (!vehicle.model || !vehicle.model.toLowerCase().includes(criteria.model.toLowerCase())) {
          return false;
        }
      }

      // Color search (case-insensitive partial match)
      if (criteria.color) {
        if (!vehicle.color || !vehicle.color.toLowerCase().includes(criteria.color.toLowerCase())) {
          return false;
        }
      }

      // Owner name search (case-insensitive partial match)
      if (criteria.ownerName) {
        if (!vehicle.ownerName || !vehicle.ownerName.toLowerCase().includes(criteria.ownerName.toLowerCase())) {
          return false;
        }
      }

      // Owner email search (case-insensitive partial match)
      if (criteria.ownerEmail) {
        if (!vehicle.ownerEmail || !vehicle.ownerEmail.toLowerCase().includes(criteria.ownerEmail.toLowerCase())) {
          return false;
        }
      }

      // Exact status match
      if (criteria.status && vehicle.getStatus() !== criteria.status) {
        return false;
      }

      // Year range filter
      if (criteria.yearFrom && vehicle.year && vehicle.year < criteria.yearFrom) {
        return false;
      }

      if (criteria.yearTo && vehicle.year && vehicle.year > criteria.yearTo) {
        return false;
      }

      return true;
    });
  }

  /**
   * Update a vehicle record
   * @param licensePlate - License plate of vehicle to update
   * @param updates - Fields to update
   * @returns Updated vehicle or null if not found
   * @throws Error if update validation fails
   */
  update(licensePlate: string, updates: Partial<ExtendedVehicleData>): Vehicle | null {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return null;
    }

    const updateResult = vehicle.update(updates);
    if (!updateResult.isValid) {
      throw new Error(`Update validation failed: ${updateResult.errors.join(', ')}`);
    }

    return vehicle;
  }

  /**
   * Check out a vehicle
   * @param licensePlate - License plate of vehicle to check out
   * @param hourlyRate - Rate per hour for billing
   * @returns Checked out vehicle or null if not found
   * @throws Error if vehicle is already checked out
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
   * @throws Error if insufficient payment or already paid
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
   * @throws Error if vehicle is still parked (not checked out)
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
   * Force delete a vehicle record (ignores parking status)
   * @param licensePlate - License plate of vehicle to delete
   * @returns True if deleted, false if not found
   */
  forceDelete(licensePlate: string): boolean {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return false;
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
   * Get count by vehicle type
   * @param vehicleType - Vehicle type to count
   * @returns Count of vehicles with the type
   */
  countByType(vehicleType: VehicleType): number {
    return this.findByVehicleType(vehicleType).length;
  }

  /**
   * Get parking statistics
   * @returns Parking statistics
   */
  getParkingStats() {
    const total = this.count();
    const parked = this.countByStatus('parked');
    const unpaid = this.countByStatus('checked_out_unpaid');
    const completed = this.countByStatus('completed');

    return {
      total,
      parked,
      unpaid,
      completed,
      checkedOut: unpaid + completed,
      byType: {
        compact: this.countByType('compact'),
        standard: this.countByType('standard'),
        oversized: this.countByType('oversized')
      }
    };
  }

  /**
   * Get revenue statistics
   * @returns Revenue statistics
   */
  getRevenueStats() {
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
   * Get vehicles grouped by owner
   * @returns Map of owner ID/name to vehicles
   */
  groupByOwner(): Map<string, Vehicle[]> {
    const ownerGroups = new Map<string, Vehicle[]>();
    
    this.findAll().forEach(vehicle => {
      const ownerKey = vehicle.ownerId || vehicle.ownerName || 'Unknown';
      
      if (!ownerGroups.has(ownerKey)) {
        ownerGroups.set(ownerKey, []);
      }
      
      ownerGroups.get(ownerKey)!.push(vehicle);
    });

    return ownerGroups;
  }

  /**
   * Validate vehicle uniqueness
   * @param licensePlate - License plate to check
   * @param excludeId - ID to exclude from check (for updates)
   * @returns Validation result
   */
  validateUniqueness(licensePlate: string, excludeId?: string): ValidationResult {
    const normalizedPlate = licensePlate.toUpperCase();
    const exists = this.findAll().some(v => 
      v.licensePlate === normalizedPlate && 
      (excludeId ? v.licensePlate !== excludeId.toUpperCase() : true)
    );
    
    if (exists) {
      return {
        isValid: false,
        errors: [`Vehicle with license plate ${normalizedPlate} already exists`]
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Clear all vehicle records (mainly for testing)
   */
  clear(): void {
    this.store.vehicles.clear();
  }

  /**
   * Get all vehicles as plain objects
   * @returns Array of vehicle objects
   */
  toObjectArray(): FullVehicleRecord[] {
    return this.findAll().map(vehicle => vehicle.toObject());
  }

  /**
   * Import vehicles from plain objects
   * @param vehicles - Array of vehicle objects
   * @param overwrite - Whether to overwrite existing vehicles
   */
  fromObjectArray(vehicles: FullVehicleRecord[], overwrite: boolean = false): void {
    vehicles.forEach(vehicleData => {
      const licensePlate = vehicleData.licensePlate.toUpperCase();
      
      if (this.exists(licensePlate) && !overwrite) {
        console.warn(`Vehicle ${licensePlate} already exists, skipping`);
        return;
      }

      const vehicle = Vehicle.fromObject(vehicleData);
      this.store.vehicles.set(licensePlate, vehicle);
    });
  }
}

export default VehicleRepository;