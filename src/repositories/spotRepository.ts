/**
 * Spot repository for data access operations
 * 
 * This module provides data access methods for parking spots using
 * the repository pattern. It abstracts the underlying storage mechanism
 * and provides a clean interface for CRUD operations.
 * 
 * @module SpotRepository
 */

import { MemoryStore } from '../storage/memoryStore';
import { 
  SpotData, 
  SpotRecord, 
  SpotStatus, 
  VehicleType, 
  SpotFeature 
} from '../types/models';
import { generateSpotId, isValidSpotId } from '../utils/validators';

/**
 * Spot implementation class for parking spots
 */
class Spot implements SpotRecord {
  id: string;
  floor: number;
  bay: number;
  spotNumber: number;
  type: VehicleType;
  status: SpotStatus;
  features: SpotFeature[];
  currentVehicle: string | null;
  createdAt: string;
  updatedAt: string;

  constructor(data: SpotData) {
    this.id = data.id;
    this.floor = data.floor;
    this.bay = data.bay;
    this.spotNumber = data.spotNumber;
    this.type = data.type;
    this.status = data.status;
    this.features = [...data.features];
    this.currentVehicle = data.currentVehicle;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  static createSpot(floor: number, bay: number, spotNumber: number, type: VehicleType = 'standard', features: SpotFeature[] = []): Spot {
    const id = generateSpotId(floor, bay, spotNumber);
    return new Spot({
      id,
      floor,
      bay,
      spotNumber,
      type,
      status: 'available',
      features,
      currentVehicle: null
    });
  }

  occupy(licensePlate: string): void {
    if (this.status === 'occupied') {
      throw new Error(`Spot ${this.id} is already occupied`);
    }

    this.status = 'occupied';
    this.currentVehicle = licensePlate.toUpperCase();
    this.updatedAt = new Date().toISOString();
  }

  vacate(): void {
    if (this.status !== 'occupied') {
      throw new Error(`Spot ${this.id} is not occupied`);
    }

    this.status = 'available';
    this.currentVehicle = null;
    this.updatedAt = new Date().toISOString();
  }

  isOccupied(): boolean {
    return this.status === 'occupied';
  }

  isAvailable(): boolean {
    return this.status === 'available';
  }

  hasFeature(feature: SpotFeature): boolean {
    return this.features.includes(feature);
  }

  addFeature(feature: SpotFeature): void {
    if (!this.hasFeature(feature)) {
      this.features.push(feature);
      this.updatedAt = new Date().toISOString();
    }
  }

  removeFeature(feature: SpotFeature): boolean {
    const index = this.features.indexOf(feature);
    if (index > -1) {
      this.features.splice(index, 1);
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  toObject(): SpotData {
    return {
      id: this.id,
      floor: this.floor,
      bay: this.bay,
      spotNumber: this.spotNumber,
      type: this.type,
      status: this.status,
      features: [...this.features],
      currentVehicle: this.currentVehicle
    };
  }
}

/**
 * Repository for managing parking spots
 */
export class SpotRepository {
  private store: MemoryStore;

  constructor() {
    this.store = MemoryStore.getInstance();
  }

  /**
   * Create a new parking spot
   * @param spotData - Spot data to create
   * @returns Created spot instance
   * @throws Error If spot already exists or data is invalid
   */
  create(spotData: SpotData): Spot {
    const spot = new Spot(spotData);
    
    if (this.store.spots.has(spot.id)) {
      throw new Error(`Spot with ID ${spot.id} already exists`);
    }

    this.store.spots.set(spot.id, spot);
    
    // Update floor/bay index
    const floorBayKey = `F${spot.floor}-B${spot.bay}`;
    if (!this.store.spotsByFloorBay.has(floorBayKey)) {
      this.store.spotsByFloorBay.set(floorBayKey, new Set());
    }
    this.store.spotsByFloorBay.get(floorBayKey)!.add(spot.id);
    
    return spot;
  }

  /**
   * Create a spot from floor, bay, and spot number
   * @param floor - Floor number
   * @param bay - Bay number
   * @param spotNumber - Spot number
   * @param type - Spot type
   * @param features - Optional features
   * @returns Created spot instance
   */
  createSpot(floor: number, bay: number, spotNumber: number, type: VehicleType = 'standard', features: SpotFeature[] = []): Spot {
    const spot = Spot.createSpot(floor, bay, spotNumber, type, features);
    return this.create(spot.toObject());
  }

  /**
   * Find a spot by ID
   * @param spotId - Spot ID to find
   * @returns Found spot or null if not found
   */
  findById(spotId: string): Spot | null {
    return this.store.spots.get(spotId) || null;
  }

  /**
   * Find all spots
   * @returns Array of all spots
   */
  findAll(): Spot[] {
    return Array.from(this.store.spots.values());
  }

  /**
   * Find spots by status
   * @param status - Status to filter by ('available' or 'occupied')
   * @returns Array of spots matching the status
   */
  findByStatus(status: SpotStatus): Spot[] {
    return this.findAll().filter(spot => spot.status === status);
  }

  /**
   * Find available spots
   * @returns Array of available spots
   */
  findAvailable(): Spot[] {
    return this.findByStatus('available');
  }

  /**
   * Find occupied spots
   * @returns Array of occupied spots
   */
  findOccupied(): Spot[] {
    return this.findByStatus('occupied');
  }

  /**
   * Find spots by type
   * @param type - Spot type to filter by
   * @returns Array of spots matching the type
   */
  findByType(type: VehicleType): Spot[] {
    return this.findAll().filter(spot => spot.type === type);
  }

  /**
   * Find spots by floor
   * @param floor - Floor number
   * @returns Array of spots on the specified floor
   */
  findByFloor(floor: number): Spot[] {
    return this.findAll().filter(spot => spot.floor === floor);
  }

  /**
   * Find spots by floor and bay
   * @param floor - Floor number
   * @param bay - Bay number
   * @returns Array of spots in the specified floor and bay
   */
  findByFloorAndBay(floor: number, bay: number): Spot[] {
    const floorBayKey = `F${floor}-B${bay}`;
    const spotIds = this.store.spotsByFloorBay.get(floorBayKey);
    
    if (!spotIds) {
      return [];
    }
    
    return Array.from(spotIds)
      .map(spotId => this.store.spots.get(spotId))
      .filter((spot): spot is Spot => spot !== undefined);
  }

  /**
   * Find spots with a specific feature
   * @param feature - Feature to search for
   * @returns Array of spots with the feature
   */
  findByFeature(feature: SpotFeature): Spot[] {
    return this.findAll().filter(spot => spot.hasFeature(feature));
  }

  /**
   * Find spots by vehicle license plate
   * @param licensePlate - License plate to search for
   * @returns Spot occupied by the vehicle or null
   */
  findByVehicle(licensePlate: string): Spot | null {
    return this.findAll().find(spot => spot.currentVehicle === licensePlate.toUpperCase()) || null;
  }

  /**
   * Update a spot
   * @param spotId - ID of spot to update
   * @param updates - Fields to update
   * @returns Updated spot or null if not found
   * @throws Error If trying to update immutable fields
   */
  update(spotId: string, updates: Partial<SpotRecord>): Spot | null {
    const spot = this.findById(spotId);
    if (!spot) {
      return null;
    }

    // Prevent updating immutable fields
    const immutableFields: (keyof SpotRecord)[] = ['id', 'floor', 'bay', 'spotNumber', 'createdAt'];
    const invalidFields = Object.keys(updates).filter(field => 
      immutableFields.includes(field as keyof SpotRecord)
    );
    
    if (invalidFields.length > 0) {
      throw new Error(`Cannot update immutable fields: ${invalidFields.join(', ')}`);
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key === 'features' && updates.features) {
        spot.features = [...updates.features];
      } else if (updates[key as keyof SpotRecord] !== undefined) {
        (spot as any)[key] = updates[key as keyof SpotRecord];
      }
    });

    spot.updatedAt = new Date().toISOString();
    
    // Update occupied spots tracking
    if (updates.status === 'occupied' && !this.store.occupiedSpots.has(spotId)) {
      this.store.occupiedSpots.add(spotId);
    } else if (updates.status === 'available' && this.store.occupiedSpots.has(spotId)) {
      this.store.occupiedSpots.delete(spotId);
    }
    
    return spot;
  }

  /**
   * Occupy a spot with a vehicle
   * @param spotId - ID of spot to occupy
   * @param licensePlate - License plate of vehicle
   * @returns True if successful, false if spot not found
   * @throws Error If spot is already occupied
   */
  occupy(spotId: string, licensePlate: string): boolean {
    const spot = this.findById(spotId);
    if (!spot) {
      return false;
    }

    spot.occupy(licensePlate);
    this.store.occupiedSpots.add(spotId);
    return true;
  }

  /**
   * Vacate a spot
   * @param spotId - ID of spot to vacate
   * @returns True if successful, false if spot not found
   * @throws Error If spot is not occupied
   */
  vacate(spotId: string): boolean {
    const spot = this.findById(spotId);
    if (!spot) {
      return false;
    }

    spot.vacate();
    this.store.occupiedSpots.delete(spotId);
    return true;
  }

  /**
   * Delete a spot
   * @param spotId - ID of spot to delete
   * @returns True if deleted, false if not found
   * @throws Error If spot is currently occupied
   */
  delete(spotId: string): boolean {
    const spot = this.findById(spotId);
    if (!spot) {
      return false;
    }

    if (spot.isOccupied()) {
      throw new Error(`Cannot delete occupied spot ${spotId}`);
    }

    // Remove from main storage
    this.store.spots.delete(spotId);
    
    // Remove from floor/bay index
    const floorBayKey = `F${spot.floor}-B${spot.bay}`;
    const spotSet = this.store.spotsByFloorBay.get(floorBayKey);
    if (spotSet) {
      spotSet.delete(spotId);
      if (spotSet.size === 0) {
        this.store.spotsByFloorBay.delete(floorBayKey);
      }
    }
    
    // Remove from occupied spots
    this.store.occupiedSpots.delete(spotId);
    
    return true;
  }

  /**
   * Check if a spot exists
   * @param spotId - Spot ID to check
   * @returns True if spot exists
   */
  exists(spotId: string): boolean {
    return this.store.spots.has(spotId);
  }

  /**
   * Get total count of spots
   * @returns Total number of spots
   */
  count(): number {
    return this.store.spots.size;
  }

  /**
   * Get count by status
   * @param status - Status to count
   * @returns Count of spots with the status
   */
  countByStatus(status: SpotStatus): number {
    return this.findByStatus(status).length;
  }

  /**
   * Get garage occupancy statistics
   * @returns Occupancy statistics
   */
  getOccupancyStats(): {
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  } {
    const total = this.count();
    const occupied = this.countByStatus('occupied');
    const available = total - occupied;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;

    return {
      total,
      occupied,
      available,
      occupancyRate: Math.round(occupancyRate * 100) / 100
    };
  }

  /**
   * Bulk create spots for a floor
   * @param floor - Floor number
   * @param bays - Number of bays
   * @param spotsPerBay - Spots per bay
   * @param defaultType - Default spot type
   * @returns Array of created spots
   */
  createFloorSpots(floor: number, bays: number, spotsPerBay: number, defaultType: VehicleType = 'standard'): Spot[] {
    const createdSpots: Spot[] = [];
    
    for (let bay = 1; bay <= bays; bay++) {
      for (let spotNumber = 1; spotNumber <= spotsPerBay; spotNumber++) {
        const spot = this.createSpot(floor, bay, spotNumber, defaultType);
        createdSpots.push(spot);
      }
    }
    
    return createdSpots;
  }

  /**
   * Update spot status
   */
  updateSpotStatus(spotId: string, status: SpotStatus, metadata?: any): Spot | null {
    const spot = this.findById(spotId);
    if (!spot) return null;
    
    spot.status = status;
    if (metadata?.licensePlate) {
      spot.currentVehicle = metadata.licensePlate;
    }
    if (metadata?.licensePlate === null) {
      spot.currentVehicle = null;
    }
    spot.updatedAt = new Date().toISOString();
    
    return spot;
  }

  /**
   * Get availability statistics
   */
  getAvailabilityStats(vehicleType?: string): any {
    const spots = vehicleType 
      ? this.findByType(vehicleType as VehicleType)
      : this.findAll();
    
    const total = spots.length;
    const occupied = spots.filter(spot => spot.status === 'occupied').length;
    const available = total - occupied;
    
    return { total, occupied, available };
  }

  /**
   * Get spot statistics
   */
  getStats(): any {
    const total = this.count();
    const occupied = this.countByStatus('occupied');
    const available = total - occupied;
    
    return { total, occupied, available };
  }

  /**
   * Clear all spots (mainly for testing)
   */
  clear(): void {
    this.store.spots.clear();
    this.store.spotsByFloorBay.clear();
    this.store.occupiedSpots.clear();
  }
}