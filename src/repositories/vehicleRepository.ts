/**
 * Vehicle repository for data access operations
 * 
 * This module provides data access methods for vehicle parking records
 * using the repository pattern. It handles parking sessions, billing,
 * and vehicle tracking operations.
 */

import MemoryStore from '../storage/memoryStore';
import { IVehicle, VehicleType, RateType, VehicleStatus } from '../types';

export interface ParkingStatistics {
  total: number;
  parked: number;
  unpaid: number;
  completed: number;
  checkedOut: number;
}

export interface RevenueStatistics {
  totalRevenue: number;
  pendingRevenue: number;
  completedSessions: number;
  averageRevenue: number;
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
   */
  create(vehicleData: Omit<IVehicle, 'createdAt' | 'updatedAt'>): IVehicle {
    const vehicle: IVehicle = {
      ...vehicleData,
      licensePlate: vehicleData.licensePlate.toUpperCase(),
      checkOutTime: undefined,
      totalAmount: 0,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (this.store.vehicles.has(vehicle.licensePlate)) {
      throw new Error(`Vehicle with license plate ${vehicle.licensePlate} already exists`);
    }

    this.store.vehicles.set(vehicle.licensePlate, vehicle);
    return { ...vehicle };
  }

  /**
   * Check in a vehicle to a parking spot
   */
  checkIn(
    licensePlate: string, 
    spotId: string, 
    vehicleType: VehicleType = 'standard', 
    rateType: RateType = 'hourly'
  ): IVehicle {
    const upperLicensePlate = licensePlate.toUpperCase();
    
    if (this.store.vehicles.has(upperLicensePlate)) {
      throw new Error(`Vehicle ${upperLicensePlate} is already parked`);
    }

    const vehicleData: Omit<IVehicle, 'createdAt' | 'updatedAt'> = {
      licensePlate: upperLicensePlate,
      spotId,
      checkInTime: new Date().toISOString(),
      vehicleType,
      rateType,
      checkOutTime: undefined,
      totalAmount: 0,
      isPaid: false,
      status: 'parked'
    };

    return this.create(vehicleData);
  }

  /**
   * Find a vehicle by license plate
   */
  findById(licensePlate: string): IVehicle | null {
    const vehicle = this.store.vehicles.get(licensePlate.toUpperCase());
    return vehicle ? { ...vehicle } : null;
  }

  /**
   * Find all vehicle records
   */
  findAll(): IVehicle[] {
    return Array.from(this.store.vehicles.values()).map(vehicle => ({ ...vehicle }));
  }

  /**
   * Find vehicles by spot ID
   */
  findBySpotId(spotId: string): IVehicle[] {
    return this.findAll().filter(vehicle => vehicle.spotId === spotId);
  }

  /**
   * Find current vehicle in a spot (not checked out)
   */
  findCurrentInSpot(spotId: string): IVehicle | null {
    const vehicle = this.findAll().find(vehicle => 
      vehicle.spotId === spotId && !vehicle.checkOutTime
    );
    return vehicle || null;
  }

  /**
   * Find vehicles by status
   */
  findByStatus(status: VehicleStatus): IVehicle[] {
    return this.findAll().filter(vehicle => this.getVehicleStatus(vehicle) === status);
  }

  /**
   * Find currently parked vehicles
   */
  findParked(): IVehicle[] {
    return this.findByStatus('parked');
  }

  /**
   * Find checked out but unpaid vehicles
   */
  findUnpaid(): IVehicle[] {
    return this.findByStatus('checked_out_unpaid');
  }

  /**
   * Find completed parking sessions
   */
  findCompleted(): IVehicle[] {
    return this.findByStatus('completed');
  }

  /**
   * Find vehicles by vehicle type
   */
  findByVehicleType(vehicleType: VehicleType): IVehicle[] {
    return this.findAll().filter(vehicle => vehicle.vehicleType === vehicleType);
  }

  /**
   * Find vehicles by rate type
   */
  findByRateType(rateType: RateType): IVehicle[] {
    return this.findAll().filter(vehicle => vehicle.rateType === rateType);
  }

  /**
   * Find vehicles by date range
   */
  findByDateRange(startDate: Date, endDate: Date): IVehicle[] {
    return this.findAll().filter(vehicle => {
      const checkInDate = new Date(vehicle.checkInTime);
      return checkInDate >= startDate && checkInDate <= endDate;
    });
  }

  /**
   * Update a vehicle record
   */
  update(licensePlate: string, updates: Partial<Omit<IVehicle, 'licensePlate' | 'checkInTime' | 'createdAt'>>): IVehicle | null {
    const vehicle = this.store.vehicles.get(licensePlate.toUpperCase());
    if (!vehicle) {
      return null;
    }

    const updatedVehicle: IVehicle = {
      ...vehicle,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.store.vehicles.set(licensePlate.toUpperCase(), updatedVehicle);
    return { ...updatedVehicle };
  }

  /**
   * Check out a vehicle
   */
  checkOut(licensePlate: string, hourlyRate: number = 5.00): IVehicle | null {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return null;
    }

    if (vehicle.checkOutTime) {
      throw new Error(`Vehicle ${licensePlate} is already checked out`);
    }

    const checkOutTime = new Date().toISOString();
    const totalAmount = this.calculateTotalAmount(vehicle, hourlyRate, checkOutTime);

    return this.update(licensePlate, {
      checkOutTime,
      totalAmount
    });
  }

  /**
   * Mark a vehicle's parking fee as paid
   */
  markAsPaid(licensePlate: string, amountPaid: number): IVehicle | null {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return null;
    }

    if (vehicle.isPaid) {
      throw new Error(`Vehicle ${licensePlate} parking fee is already paid`);
    }

    if (amountPaid < vehicle.totalAmount) {
      throw new Error(`Insufficient payment. Required: $${vehicle.totalAmount}, Paid: $${amountPaid}`);
    }

    return this.update(licensePlate, { isPaid: true });
  }

  /**
   * Delete a vehicle record
   */
  delete(licensePlate: string): boolean {
    const vehicle = this.findById(licensePlate);
    if (!vehicle) {
      return false;
    }

    if (!vehicle.checkOutTime) {
      throw new Error(`Cannot delete vehicle ${licensePlate} that is still parked`);
    }

    this.store.vehicles.delete(licensePlate.toUpperCase());
    return true;
  }

  /**
   * Check if a vehicle exists
   */
  exists(licensePlate: string): boolean {
    return this.store.vehicles.has(licensePlate.toUpperCase());
  }

  /**
   * Get total count of vehicle records
   */
  count(): number {
    return this.store.vehicles.size;
  }

  /**
   * Get count by status
   */
  countByStatus(status: VehicleStatus): number {
    return this.findByStatus(status).length;
  }

  /**
   * Get parking statistics
   */
  getParkingStats(): ParkingStatistics {
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
   */
  getRevenueStats(): RevenueStatistics {
    const vehicles = this.findAll();
    const totalRevenue = vehicles
      .filter(v => v.isPaid)
      .reduce((sum, v) => sum + v.totalAmount, 0);
    
    const pendingRevenue = vehicles
      .filter(v => v.checkOutTime && !v.isPaid)
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
   */
  findOverstayed(maxHours: number = 24): IVehicle[] {
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

  /**
   * Get vehicle status based on checkout and payment status
   */
  private getVehicleStatus(vehicle: IVehicle): VehicleStatus {
    if (!vehicle.checkOutTime) {
      return 'parked';
    }
    
    if (!vehicle.isPaid) {
      return 'checked_out_unpaid';
    }
    
    return 'completed';
  }

  /**
   * Calculate total amount owed based on parking duration and rate
   */
  private calculateTotalAmount(vehicle: IVehicle, hourlyRate: number, checkOutTime: string): number {
    const checkIn = new Date(vehicle.checkInTime);
    const checkOut = new Date(checkOutTime);
    const totalMinutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
    const hours = Math.ceil(totalMinutes / 60);
    let amount = hours * hourlyRate;

    // Apply rate type multipliers
    switch (vehicle.rateType) {
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
}