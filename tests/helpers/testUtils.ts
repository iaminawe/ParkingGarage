// Test utilities and helper functions with TypeScript support
import {
  GarageConfiguration,
  ParkingSpot,
  Vehicle,
  CheckInRequest,
  ParkingSession,
  VehicleSearchResult,
  GarageSummary,
  SpotsResponse,
  CheckInResponse,
  CheckOutResponse,
  TestDataOptions
} from '../types';

export class TestDataBuilder {
  static createGarage(overrides: Partial<GarageConfiguration> = {}): GarageConfiguration {
    return {
      floors: 3,
      baysPerFloor: 2,
      spotsPerBay: 25,
      totalSpots: 150,
      ...overrides
    };
  }

  static createSpot(overrides: Partial<ParkingSpot> = {}): ParkingSpot {
    const floor = overrides.floor || 1;
    const bay = overrides.bay || 'A';
    const number = overrides.spotNumber || 1;
    
    return {
      spotId: `F${floor}-${bay}-${String(number).padStart(3, '0')}`,
      floor,
      bay,
      spotNumber: number,
      status: 'available',
      occupiedBy: null,
      since: null,
      ...overrides
    };
  }

  static createVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
    return {
      licensePlate: `TEST-${Math.floor(Math.random() * 9999)}`,
      type: 'standard',
      ...overrides
    };
  }

  static createCheckInRequest(overrides: Partial<CheckInRequest> = {}): CheckInRequest {
    return {
      licensePlate: `TEST-${Math.floor(Math.random() * 9999)}`,
      ...overrides
    };
  }

  static createBulkSpots(floor: number, bay: string, count: number): ParkingSpot[] {
    const spots: ParkingSpot[] = [];
    for (let i = 1; i <= count; i++) {
      spots.push(this.createSpot({
        floor,
        bay,
        spotNumber: i,
        spotId: `F${floor}-${bay}-${String(i).padStart(3, '0')}`
      }));
    }
    return spots;
  }
}

export class GarageStateManager {
  private spots: Map<string, ParkingSpot>;
  private vehicles: Map<string, string>;
  private parkingSessions: Map<string, ParkingSession>;

  constructor() {
    this.spots = new Map();
    this.vehicles = new Map();
    this.parkingSessions = new Map();
    this.reset();
  }

  reset(): void {
    this.spots.clear();
    this.vehicles.clear();
    this.parkingSessions.clear();
    this.initializeDefaultGarage();
  }

  private initializeDefaultGarage(): void {
    // Create default garage structure: 3 floors, 2 bays each, 25 spots per bay
    const floors = [1, 2, 3];
    const bays = ['A', 'B'];
    
    floors.forEach(floor => {
      bays.forEach(bay => {
        // Skip bay B on floor 3 (as per test data spec)
        if (floor === 3 && bay === 'B') return;
        
        for (let spot = 1; spot <= 25; spot++) {
          const spotId = `F${floor}-${bay}-${String(spot).padStart(3, '0')}`;
          this.spots.set(spotId, {
            spotId,
            floor,
            bay,
            spotNumber: spot,
            status: 'available',
            occupiedBy: null,
            since: null
          });
        }
      });
    });
  }

  getAllSpots(): ParkingSpot[] {
    return Array.from(this.spots.values());
  }

  getAvailableSpots(): ParkingSpot[] {
    return this.getAllSpots().filter(spot => spot.status === 'available');
  }

  getOccupiedSpots(): ParkingSpot[] {
    return this.getAllSpots().filter(spot => spot.status === 'occupied');
  }

  findSpotById(spotId: string): ParkingSpot | undefined {
    return this.spots.get(spotId);
  }

  checkInVehicle(licensePlate: string, spotId?: string): ParkingSession {
    // Check if vehicle already parked
    if (this.vehicles.has(licensePlate)) {
      throw new Error('Vehicle already checked in');
    }

    // Find available spot if not specified
    if (!spotId) {
      const availableSpot = this.getAvailableSpots()[0];
      if (!availableSpot) {
        throw new Error('No available spots');
      }
      spotId = availableSpot.spotId;
    }

    const spot = this.spots.get(spotId);
    if (!spot || spot.status !== 'available') {
      throw new Error('Spot not available');
    }

    // Update spot
    const checkInTime = new Date().toISOString();
    spot.status = 'occupied';
    spot.occupiedBy = licensePlate;
    spot.since = checkInTime;

    // Create parking session
    const session: ParkingSession = {
      ticketId: `TKT-${Date.now()}`,
      licensePlate,
      spotId,
      checkInTime,
      checkOutTime: null,
      duration: null
    };

    this.vehicles.set(licensePlate, spotId);
    this.parkingSessions.set(licensePlate, session);

    return session;
  }

  checkOutVehicle(licensePlate: string): CheckOutResponse {
    if (!this.vehicles.has(licensePlate)) {
      throw new Error('Vehicle not found');
    }

    const spotId = this.vehicles.get(licensePlate)!;
    const spot = this.spots.get(spotId)!;
    const session = this.parkingSessions.get(licensePlate)!;

    // Calculate duration
    const checkOutTime = new Date().toISOString();
    const checkInTime = new Date(session.checkInTime);
    const checkOut = new Date(checkOutTime);
    const durationMs = checkOut.getTime() - checkInTime.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);

    // Update spot
    spot.status = 'available';
    spot.occupiedBy = null;
    spot.since = null;

    // Update session
    session.checkOutTime = checkOutTime;
    session.duration = durationMinutes;

    // Clean up
    this.vehicles.delete(licensePlate);

    return {
      ...session,
      spot: spotId,
      spotId,
      duration: this.formatDuration(durationMinutes),
      durationFormatted: this.formatDuration(durationMinutes),
      durationMinutes
    };
  }

  findVehicle(licensePlate: string): VehicleSearchResult | null {
    if (!this.vehicles.has(licensePlate)) {
      return null;
    }

    const spotId = this.vehicles.get(licensePlate)!;
    const spot = this.spots.get(spotId)!;
    const session = this.parkingSessions.get(licensePlate)!;

    // Calculate current duration
    const now = new Date();
    const checkInTime = new Date(session.checkInTime);
    const durationMs = now.getTime() - checkInTime.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);

    return {
      found: true,
      licensePlate,
      spot: spot.spotId,
      floor: spot.floor,
      bay: spot.bay,
      checkInTime: session.checkInTime,
      currentDuration: this.formatDuration(durationMinutes)
    };
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} minute${mins !== 1 ? 's' : ''}`;
    } else if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
    }
  }

  getSummary(): GarageSummary {
    const spots = this.getAllSpots();
    const available = spots.filter(s => s.status === 'available').length;
    const occupied = spots.filter(s => s.status === 'occupied').length;

    return {
      total: spots.length,
      available,
      occupied,
      occupancyRate: ((occupied / spots.length) * 100).toFixed(1) + '%'
    };
  }

  setOccupancy(percentage: number): void {
    const totalSpots = this.getAllSpots().length;
    const targetOccupied = Math.floor(totalSpots * percentage);
    
    // Reset all spots first
    this.getAllSpots().forEach(spot => {
      spot.status = 'available';
      spot.occupiedBy = null;
      spot.since = null;
    });
    this.vehicles.clear();
    this.parkingSessions.clear();

    // Occupy spots up to target
    const spots = this.getAllSpots();
    for (let i = 0; i < targetOccupied && i < spots.length; i++) {
      const licensePlate = `AUTO-${String(i + 1).padStart(3, '0')}`;
      this.checkInVehicle(licensePlate, spots[i].spotId);
    }
  }
}

// Mock implementations for testing without actual API
export class MockGarageAPI {
  public state: GarageStateManager;

  constructor() {
    this.state = new GarageStateManager();
  }

  reset(): void {
    this.state.reset();
  }

  // Spot endpoints
  getAllSpots(): SpotsResponse {
    return {
      spots: this.state.getAllSpots(),
      summary: this.state.getSummary()
    };
  }

  getAvailableSpots(): SpotsResponse {
    const spots = this.state.getAvailableSpots();
    return {
      spots,
      count: spots.length
    };
  }

  getSpotById(spotId: string): ParkingSpot {
    const spot = this.state.findSpotById(spotId);
    if (!spot) {
      throw new Error('Spot not found');
    }
    return spot;
  }

  updateSpotStatus(spotId: string, status: ParkingSpot['status']): ParkingSpot {
    const spot = this.state.findSpotById(spotId);
    if (!spot) {
      throw new Error('Spot not found');
    }
    
    if (spot.status === 'occupied' && status === 'occupied') {
      throw new Error('Spot already occupied');
    }

    spot.status = status;
    if (status === 'available') {
      spot.occupiedBy = null;
      spot.since = null;
    }
    
    return spot;
  }

  // Vehicle endpoints
  checkIn(licensePlate: string): ParkingSession {
    return this.state.checkInVehicle(licensePlate);
  }

  checkOut(licensePlate: string): CheckOutResponse {
    return this.state.checkOutVehicle(licensePlate);
  }

  findVehicle(licensePlate: string): VehicleSearchResult {
    const result = this.state.findVehicle(licensePlate);
    if (!result) {
      throw new Error('Vehicle not found');
    }
    return result;
  }

  // Test helpers
  setOccupancy(percentage: number): void {
    this.state.setOccupancy(percentage);
  }
}