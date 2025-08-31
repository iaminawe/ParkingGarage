// Test utilities and helper functions

class TestDataBuilder {
  static createGarage(overrides = {}) {
    return {
      floors: 3,
      baysPerFloor: 2,
      spotsPerBay: 25,
      totalSpots: 150,
      ...overrides
    };
  }

  static createSpot(overrides = {}) {
    return {
      spotId: `F${overrides.floor || 1}-${overrides.bay || 'A'}-${String(overrides.number || 1).padStart(3, '0')}`,
      floor: 1,
      bay: 'A',
      spotNumber: 1,
      status: 'available',
      ...overrides
    };
  }

  static createVehicle(overrides = {}) {
    return {
      licensePlate: `TEST-${Math.floor(Math.random() * 9999)}`,
      type: 'standard',
      ...overrides
    };
  }

  static createCheckInRequest(overrides = {}) {
    return {
      licensePlate: `TEST-${Math.floor(Math.random() * 9999)}`,
      ...overrides
    };
  }

  static createBulkSpots(floor, bay, count) {
    const spots = [];
    for (let i = 1; i <= count; i++) {
      spots.push(this.createSpot({
        floor,
        bay,
        number: i,
        spotId: `F${floor}-${bay}-${String(i).padStart(3, '0')}`
      }));
    }
    return spots;
  }
}

class GarageStateManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.spots = new Map();
    this.vehicles = new Map();
    this.parkingSessions = new Map();
    this.initializeDefaultGarage();
  }

  initializeDefaultGarage() {
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

  getAllSpots() {
    return Array.from(this.spots.values());
  }

  getAvailableSpots() {
    return this.getAllSpots().filter(spot => spot.status === 'available');
  }

  getOccupiedSpots() {
    return this.getAllSpots().filter(spot => spot.status === 'occupied');
  }

  findSpotById(spotId) {
    return this.spots.get(spotId);
  }

  checkInVehicle(licensePlate, spotId = null) {
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
    const session = {
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

  checkOutVehicle(licensePlate) {
    if (!this.vehicles.has(licensePlate)) {
      throw new Error('Vehicle not found');
    }

    const spotId = this.vehicles.get(licensePlate);
    const spot = this.spots.get(spotId);
    const session = this.parkingSessions.get(licensePlate);

    // Calculate duration
    const checkOutTime = new Date().toISOString();
    const checkInTime = new Date(session.checkInTime);
    const checkOut = new Date(checkOutTime);
    const durationMs = checkOut - checkInTime;
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
      durationFormatted: this.formatDuration(durationMinutes)
    };
  }

  findVehicle(licensePlate) {
    if (!this.vehicles.has(licensePlate)) {
      return null;
    }

    const spotId = this.vehicles.get(licensePlate);
    const spot = this.spots.get(spotId);
    const session = this.parkingSessions.get(licensePlate);

    // Calculate current duration
    const now = new Date();
    const checkInTime = new Date(session.checkInTime);
    const durationMs = now - checkInTime;
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

  formatDuration(minutes) {
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

  getSummary() {
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

  setOccupancy(percentage) {
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
class MockGarageAPI {
  constructor() {
    this.state = new GarageStateManager();
  }

  reset() {
    this.state.reset();
  }

  // Spot endpoints
  getAllSpots() {
    return {
      spots: this.state.getAllSpots(),
      summary: this.state.getSummary()
    };
  }

  getAvailableSpots() {
    const spots = this.state.getAvailableSpots();
    return {
      spots,
      count: spots.length
    };
  }

  getSpotById(spotId) {
    const spot = this.state.findSpotById(spotId);
    if (!spot) {
      throw new Error('Spot not found');
    }
    return spot;
  }

  updateSpotStatus(spotId, status) {
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
  checkIn(licensePlate) {
    return this.state.checkInVehicle(licensePlate);
  }

  checkOut(licensePlate) {
    return this.state.checkOutVehicle(licensePlate);
  }

  findVehicle(licensePlate) {
    const result = this.state.findVehicle(licensePlate);
    if (!result) {
      throw new Error('Vehicle not found');
    }
    return result;
  }

  // Test helpers
  setOccupancy(percentage) {
    this.state.setOccupancy(percentage);
  }
}

module.exports = {
  TestDataBuilder,
  GarageStateManager,
  MockGarageAPI
};