/**
 * Spot repository for data access operations
 * 
 * This module provides data access methods for parking spots using
 * the repository pattern. It abstracts the underlying storage mechanism
 * and provides a clean interface for CRUD operations.
 */

import MemoryStore from '../storage/memoryStore';
import { ISpot, SpotType, SpotStatus, SpotFeature } from '../types';
import { generateSpotId, isValidSpotId } from '../utils/validators';

export interface OccupancyStatistics {
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number;
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
   */
  create(spotData: Omit<ISpot, 'createdAt' | 'updatedAt'>): ISpot {
    const spot: ISpot = {
      ...spotData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
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
    
    return { ...spot };
  }

  /**
   * Create a spot from floor, bay, and spot number
   */
  createSpot(
    floor: number, 
    bay: number, 
    spotNumber: number, 
    type: SpotType = 'standard', 
    features: SpotFeature[] = []
  ): ISpot {
    const id = generateSpotId(floor, bay, spotNumber);
    
    const spotData: Omit<ISpot, 'createdAt' | 'updatedAt'> = {
      id,
      floor,
      bay,
      spotNumber,
      type,
      status: 'available',
      features,
      currentVehicle: undefined
    };

    return this.create(spotData);
  }

  /**
   * Find a spot by ID
   */
  findById(spotId: string): ISpot | null {
    const spot = this.store.spots.get(spotId);
    return spot ? { ...spot } : null;
  }

  /**
   * Find all spots
   */
  findAll(): ISpot[] {
    return Array.from(this.store.spots.values()).map(spot => ({ ...spot }));
  }

  /**
   * Find spots by status
   */
  findByStatus(status: SpotStatus): ISpot[] {
    return this.findAll().filter(spot => spot.status === status);
  }

  /**
   * Find available spots
   */
  findAvailable(): ISpot[] {
    return this.findByStatus('available');
  }

  /**
   * Find occupied spots
   */
  findOccupied(): ISpot[] {
    return this.findByStatus('occupied');
  }

  /**
   * Find spots by type
   */
  findByType(type: SpotType): ISpot[] {
    return this.findAll().filter(spot => spot.type === type);
  }

  /**
   * Find spots by floor
   */
  findByFloor(floor: number): ISpot[] {
    return this.findAll().filter(spot => spot.floor === floor);
  }

  /**
   * Find spots by floor and bay
   */
  findByFloorAndBay(floor: number, bay: number): ISpot[] {
    const floorBayKey = `F${floor}-B${bay}`;
    const spotIds = this.store.spotsByFloorBay.get(floorBayKey);
    
    if (!spotIds) {
      return [];
    }
    
    return Array.from(spotIds)
      .map(spotId => this.store.spots.get(spotId))
      .filter((spot): spot is ISpot => spot !== undefined)
      .map(spot => ({ ...spot }));
  }

  /**
   * Find spots with a specific feature
   */
  findByFeature(feature: SpotFeature): ISpot[] {
    return this.findAll().filter(spot => spot.features.includes(feature));
  }

  /**
   * Find spots by vehicle license plate
   */
  findByVehicle(licensePlate: string): ISpot | null {
    const spot = this.findAll().find(spot => 
      spot.currentVehicle === licensePlate.toUpperCase()
    );
    return spot || null;
  }

  /**
   * Update a spot
   */
  update(spotId: string, updates: Partial<Omit<ISpot, 'id' | 'createdAt'>>): ISpot | null {
    const spot = this.store.spots.get(spotId);
    if (!spot) {
      return null;
    }

    // Prevent updating immutable fields
    const immutableFields = ['floor', 'bay', 'spotNumber'];
    const invalidFields = Object.keys(updates).filter(field => 
      immutableFields.includes(field)
    );
    
    if (invalidFields.length > 0) {
      throw new Error(`Cannot update immutable fields: ${invalidFields.join(', ')}`);
    }

    // Apply updates
    const updatedSpot: ISpot = {
      ...spot,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.store.spots.set(spotId, updatedSpot);
    
    // Update occupied spots tracking
    if (updates.status === 'occupied' && !this.store.occupiedSpots.has(spotId)) {
      this.store.occupiedSpots.add(spotId);
    } else if (updates.status === 'available' && this.store.occupiedSpots.has(spotId)) {
      this.store.occupiedSpots.delete(spotId);
    }
    
    return { ...updatedSpot };
  }

  /**
   * Occupy a spot with a vehicle
   */
  occupy(spotId: string, licensePlate: string): boolean {
    const spot = this.findById(spotId);
    if (!spot) {
      return false;
    }

    if (spot.status === 'occupied') {
      throw new Error(`Spot ${spotId} is already occupied by ${spot.currentVehicle}`);
    }

    this.update(spotId, {
      status: 'occupied',
      currentVehicle: licensePlate.toUpperCase()
    });

    this.store.occupiedSpots.add(spotId);
    return true;
  }

  /**
   * Vacate a spot
   */
  vacate(spotId: string): boolean {
    const spot = this.findById(spotId);
    if (!spot) {
      return false;
    }

    if (spot.status !== 'occupied') {
      throw new Error(`Spot ${spotId} is not occupied`);
    }

    this.update(spotId, {
      status: 'available',
      currentVehicle: undefined
    });

    this.store.occupiedSpots.delete(spotId);
    return true;
  }

  /**
   * Delete a spot
   */
  delete(spotId: string): boolean {
    const spot = this.findById(spotId);
    if (!spot) {
      return false;
    }

    if (spot.status === 'occupied') {
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
   */
  exists(spotId: string): boolean {
    return this.store.spots.has(spotId);
  }

  /**
   * Get total count of spots
   */
  count(): number {
    return this.store.spots.size;
  }

  /**
   * Get count by status
   */
  countByStatus(status: SpotStatus): number {
    return this.findByStatus(status).length;
  }

  /**
   * Get garage occupancy statistics
   */
  getOccupancyStats(): OccupancyStatistics {
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
   */
  createFloorSpots(
    floor: number, 
    bays: number, 
    spotsPerBay: number, 
    defaultType: SpotType = 'standard'
  ): ISpot[] {
    const createdSpots: ISpot[] = [];
    
    for (let bay = 1; bay <= bays; bay++) {
      for (let spotNumber = 1; spotNumber <= spotsPerBay; spotNumber++) {
        const spot = this.createSpot(floor, bay, spotNumber, defaultType);
        createdSpots.push(spot);
      }
    }
    
    return createdSpots;
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