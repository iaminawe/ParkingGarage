/**
 * Mock Repositories for Unit Testing
 * 
 * Provides mock implementations of repositories for isolated unit testing.
 */

class MockGarageRepository {
  constructor() {
    this.garage = null;
  }

  create(garageConfig) {
    this.garage = {
      ...garageConfig,
      id: 'test-garage',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      getSummary: () => ({
        id: 'test-garage',
        name: this.garage.name, // Use current garage name, not original
        totalCapacity: 100,
        floors: this.garage.floors
      }),
      getTotalCapacity: () => 100,
      getTotalFloors: () => this.garage.floors.length,
      updateRate: (type, rate) => {
        this.garage.rates[type] = rate;
        this.garage.updatedAt = new Date().toISOString();
      }
    };
    return this.garage;
  }

  getDefault() {
    return this.garage;
  }

  clear() {
    this.garage = null;
  }
}

class MockSpotRepository {
  constructor() {
    this.spots = new Map();
    this.nextId = 1;
  }

  createSpot(floor, bay, spotNumber, type, features = []) {
    const id = `F${floor}-B${bay}-S${spotNumber.toString().padStart(3, '0')}`;
    const spot = {
      id,
      floor,
      bay,
      spotNumber,
      type,
      features,
      status: 'available',
      currentVehicle: null,
      isAvailable: () => spot.status === 'available',
      isOccupied: () => spot.status === 'occupied',
      toObject: () => ({ ...spot })
    };
    this.spots.set(id, spot);
    return spot;
  }

  findById(id) {
    return this.spots.get(id) || null;
  }

  findAll() {
    return Array.from(this.spots.values());
  }

  findAvailable() {
    return this.findAll().filter(spot => spot.isAvailable());
  }

  findByType(type) {
    return this.findAll().filter(spot => spot.type === type);
  }

  occupy(spotId, licensePlate) {
    const spot = this.spots.get(spotId);
    if (!spot || spot.status === 'occupied') return false;
    
    spot.status = 'occupied';
    spot.currentVehicle = licensePlate;
    return true;
  }

  vacate(spotId) {
    const spot = this.spots.get(spotId);
    if (!spot) return false;
    
    spot.status = 'available';
    spot.currentVehicle = null;
    return true;
  }

  getOccupancyStats() {
    const total = this.spots.size;
    const available = this.findAvailable().length;
    const occupied = total - available;
    
    return {
      total,
      available,
      occupied,
      occupancyRate: total > 0 ? (occupied / total) * 100 : 0
    };
  }

  clear() {
    this.spots.clear();
  }
}

class MockVehicleRepository {
  constructor() {
    this.vehicles = new Map();
  }

  checkIn(licensePlate, spotId, vehicleType, rateType = 'hourly') {
    const vehicle = {
      licensePlate,
      spotId,
      vehicleType,
      rateType,
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      isCheckedOut: () => vehicle.checkOutTime !== null
    };
    // Store with uppercase key for case-insensitive lookup, but preserve original case
    this.vehicles.set(licensePlate.toUpperCase(), vehicle);
    return vehicle;
  }

  checkOut(licensePlate, totalAmount = 0, paymentMethod = 'cash') {
    const vehicle = this.vehicles.get(licensePlate.toUpperCase());
    if (!vehicle || vehicle.checkOutTime) return null;
    
    vehicle.checkOutTime = new Date().toISOString();
    vehicle.totalAmount = totalAmount;
    vehicle.paymentMethod = paymentMethod;
    return vehicle;
  }

  findById(licensePlate) {
    return this.vehicles.get(licensePlate.toUpperCase()) || null;
  }

  exists(licensePlate) {
    return this.vehicles.has(licensePlate.toUpperCase());
  }

  delete(licensePlate) {
    return this.vehicles.delete(licensePlate.toUpperCase());
  }

  findAll() {
    return Array.from(this.vehicles.values());
  }

  findParked() {
    return this.findAll().filter(vehicle => !vehicle.isCheckedOut());
  }

  count() {
    return this.vehicles.size;
  }

  getParkingStats() {
    const total = this.count();
    const parked = this.findParked().length;
    const checkedOut = total - parked;
    
    return { total, parked, checkedOut };
  }

  clear() {
    this.vehicles.clear();
  }
}

module.exports = {
  MockGarageRepository,
  MockSpotRepository,
  MockVehicleRepository
};