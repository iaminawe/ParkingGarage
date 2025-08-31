/**
 * Unit Tests for SpotRepository
 * 
 * Tests all data access methods in SpotRepository.
 */

const SpotRepository = require('../../../src/repositories/spotRepository');
const MemoryStore = require('../../../src/storage/memoryStore');
const TestDataFactory = require('../../fixtures/testData');

describe('SpotRepository', () => {
  let spotRepository;
  let store;

  beforeEach(() => {
    // Reset memory store
    store = MemoryStore.getInstance();
    store.spots.clear();
    store.spotsByFloorBay.clear();
    store.occupiedSpots.clear();
    
    spotRepository = new SpotRepository();
  });

  describe('createSpot', () => {
    test('should create a spot with correct ID format', () => {
      const spot = spotRepository.createSpot(1, 2, 5, 'standard', ['ev_charging']);
      
      expect(spot).toEqual(expect.objectContaining({
        id: 'F1-B2-S005',
        floor: 1,
        bay: 2,
        spotNumber: 5,
        type: 'standard',
        features: ['ev_charging'],
        status: 'available',
        currentVehicle: null,
        createdAt: expect.any(String)
      }));
      
      expect(typeof spot.isAvailable).toBe('function');
      expect(typeof spot.isOccupied).toBe('function');
      expect(typeof spot.toObject).toBe('function');
    });

    test('should prevent duplicate spot creation', () => {
      spotRepository.createSpot(1, 1, 1, 'standard');
      
      expect(() => {
        spotRepository.createSpot(1, 1, 1, 'compact');
      }).toThrow('Spot with ID F1-B1-S001 already exists');
    });

    test('should validate spot parameters', () => {
      expect(() => {
        spotRepository.createSpot(0, 1, 1, 'standard');
      }).toThrow('Floor must be a positive number');
      
      expect(() => {
        spotRepository.createSpot(1, 0, 1, 'standard');
      }).toThrow('Bay must be a positive number');
      
      expect(() => {
        spotRepository.createSpot(1, 1, 0, 'standard');
      }).toThrow('Spot number must be a positive number');
      
      expect(() => {
        spotRepository.createSpot(1, 1, 1, 'invalid');
      }).toThrow('Invalid spot type: invalid');
    });

    test('should handle empty features array', () => {
      const spot = spotRepository.createSpot(1, 1, 1, 'standard', []);
      expect(spot.features).toEqual([]);
    });

    test('should handle undefined features', () => {
      const spot = spotRepository.createSpot(1, 1, 1, 'standard');
      expect(spot.features).toEqual([]);
    });
  });

  describe('findById', () => {
    test('should find existing spot by ID', () => {
      const createdSpot = spotRepository.createSpot(2, 3, 7, 'compact');
      const foundSpot = spotRepository.findById('F2-B3-S007');
      
      expect(foundSpot).toEqual(createdSpot);
    });

    test('should return null for non-existent spot', () => {
      const spot = spotRepository.findById('NONEXISTENT');
      expect(spot).toBeNull();
    });

    test('should handle invalid ID formats', () => {
      const spot = spotRepository.findById('invalid-id');
      expect(spot).toBeNull();
    });
  });

  describe('findAll', () => {
    test('should return empty array when no spots exist', () => {
      const spots = spotRepository.findAll();
      expect(spots).toEqual([]);
    });

    test('should return all spots when spots exist', () => {
      spotRepository.createSpot(1, 1, 1, 'compact');
      spotRepository.createSpot(1, 1, 2, 'standard');
      spotRepository.createSpot(2, 1, 1, 'oversized');
      
      const spots = spotRepository.findAll();
      
      expect(spots).toHaveLength(3);
      expect(spots[0].id).toBe('F1-B1-S001');
      expect(spots[1].id).toBe('F1-B1-S002');
      expect(spots[2].id).toBe('F2-B1-S001');
    });
  });

  describe('findAvailable', () => {
    test('should return only available spots', () => {
      const spot1 = spotRepository.createSpot(1, 1, 1, 'standard');
      const spot2 = spotRepository.createSpot(1, 1, 2, 'standard');
      const spot3 = spotRepository.createSpot(1, 1, 3, 'standard');
      
      // Occupy one spot
      spotRepository.occupy(spot2.id, 'TEST001');
      
      const availableSpots = spotRepository.findAvailable();
      
      expect(availableSpots).toHaveLength(2);
      expect(availableSpots.map(s => s.id)).toEqual(['F1-B1-S001', 'F1-B1-S003']);
    });

    test('should return empty array when all spots occupied', () => {
      const spot = spotRepository.createSpot(1, 1, 1, 'standard');
      spotRepository.occupy(spot.id, 'TEST001');
      
      const availableSpots = spotRepository.findAvailable();
      expect(availableSpots).toEqual([]);
    });
  });

  describe('findByType', () => {
    beforeEach(() => {
      spotRepository.createSpot(1, 1, 1, 'compact');
      spotRepository.createSpot(1, 1, 2, 'standard');
      spotRepository.createSpot(1, 1, 3, 'standard');
      spotRepository.createSpot(1, 1, 4, 'oversized');
    });

    test('should find spots by type', () => {
      const standardSpots = spotRepository.findByType('standard');
      
      expect(standardSpots).toHaveLength(2);
      expect(standardSpots.every(spot => spot.type === 'standard')).toBe(true);
    });

    test('should return empty array for non-existent type', () => {
      const spots = spotRepository.findByType('nonexistent');
      expect(spots).toEqual([]);
    });

    test('should handle case sensitivity', () => {
      const spots = spotRepository.findByType('STANDARD');
      expect(spots).toEqual([]);
    });
  });

  describe('findByFeature', () => {
    beforeEach(() => {
      spotRepository.createSpot(1, 1, 1, 'standard', ['ev_charging']);
      spotRepository.createSpot(1, 1, 2, 'standard', ['handicap']);
      spotRepository.createSpot(1, 1, 3, 'standard', ['ev_charging', 'handicap']);
      spotRepository.createSpot(1, 1, 4, 'standard', []);
    });

    test('should find spots with specific feature', () => {
      const evSpots = spotRepository.findByFeature('ev_charging');
      
      expect(evSpots).toHaveLength(2);
      expect(evSpots.every(spot => spot.features.includes('ev_charging'))).toBe(true);
    });

    test('should return empty array for non-existent feature', () => {
      const spots = spotRepository.findByFeature('nonexistent');
      expect(spots).toEqual([]);
    });
  });

  describe('findByFloor', () => {
    beforeEach(() => {
      spotRepository.createSpot(1, 1, 1, 'standard');
      spotRepository.createSpot(1, 2, 1, 'standard');
      spotRepository.createSpot(2, 1, 1, 'standard');
      spotRepository.createSpot(3, 1, 1, 'standard');
    });

    test('should find spots on specific floor', () => {
      const floor1Spots = spotRepository.findByFloor(1);
      
      expect(floor1Spots).toHaveLength(2);
      expect(floor1Spots.every(spot => spot.floor === 1)).toBe(true);
    });

    test('should return empty array for non-existent floor', () => {
      const spots = spotRepository.findByFloor(99);
      expect(spots).toEqual([]);
    });
  });

  describe('findByFloorAndBay', () => {
    beforeEach(() => {
      spotRepository.createSpot(1, 1, 1, 'standard');
      spotRepository.createSpot(1, 1, 2, 'standard');
      spotRepository.createSpot(1, 2, 1, 'standard');
      spotRepository.createSpot(2, 1, 1, 'standard');
    });

    test('should find spots in specific floor and bay', () => {
      const spots = spotRepository.findByFloorAndBay(1, 1);
      
      expect(spots).toHaveLength(2);
      expect(spots.every(spot => spot.floor === 1 && spot.bay === 1)).toBe(true);
    });

    test('should return empty array for non-existent floor/bay', () => {
      const spots = spotRepository.findByFloorAndBay(99, 99);
      expect(spots).toEqual([]);
    });
  });

  describe('occupy', () => {
    test('should successfully occupy available spot', () => {
      const spot = spotRepository.createSpot(1, 1, 1, 'standard');
      
      const success = spotRepository.occupy(spot.id, 'TEST001');
      
      expect(success).toBe(true);
      expect(spot.status).toBe('occupied');
      expect(spot.currentVehicle).toBe('TEST001');
    });

    test('should fail to occupy non-existent spot', () => {
      const success = spotRepository.occupy('NONEXISTENT', 'TEST001');
      
      expect(success).toBe(false);
    });

    test('should fail to occupy already occupied spot', () => {
      const spot = spotRepository.createSpot(1, 1, 1, 'standard');
      spotRepository.occupy(spot.id, 'FIRST');
      
      expect(() => {
        spotRepository.occupy(spot.id, 'SECOND');
      }).toThrow('already occupied');
      
      expect(spot.currentVehicle).toBe('FIRST');
    });
  });

  describe('vacate', () => {
    test('should successfully vacate occupied spot', () => {
      const spot = spotRepository.createSpot(1, 1, 1, 'standard');
      spotRepository.occupy(spot.id, 'TEST001');
      
      const success = spotRepository.vacate(spot.id);
      
      expect(success).toBe(true);
      expect(spot.status).toBe('available');
      expect(spot.currentVehicle).toBeNull();
    });

    test('should fail to vacate non-existent spot', () => {
      const success = spotRepository.vacate('NONEXISTENT');
      expect(success).toBe(false);
    });

    test('should handle vacating already available spot', () => {
      const spot = spotRepository.createSpot(1, 1, 1, 'standard');
      
      expect(() => {
        spotRepository.vacate(spot.id);
      }).toThrow('not occupied');
      
      expect(spot.status).toBe('available');
    });
  });

  describe('exists', () => {
    test('should return true for existing spot', () => {
      const spot = spotRepository.createSpot(1, 1, 1, 'standard');
      
      expect(spotRepository.exists(spot.id)).toBe(true);
    });

    test('should return false for non-existent spot', () => {
      expect(spotRepository.exists('NONEXISTENT')).toBe(false);
    });
  });

  describe('count', () => {
    test('should return 0 when no spots exist', () => {
      expect(spotRepository.count()).toBe(0);
    });

    test('should return correct count', () => {
      spotRepository.createSpot(1, 1, 1, 'standard');
      spotRepository.createSpot(1, 1, 2, 'standard');
      spotRepository.createSpot(1, 1, 3, 'standard');
      
      expect(spotRepository.count()).toBe(3);
    });
  });

  describe('getOccupancyStats', () => {
    test('should return correct stats with no spots', () => {
      const stats = spotRepository.getOccupancyStats();
      
      expect(stats).toEqual({
        total: 0,
        available: 0,
        occupied: 0,
        occupancyRate: 0
      });
    });

    test('should return correct stats with spots', () => {
      spotRepository.createSpot(1, 1, 1, 'standard');
      spotRepository.createSpot(1, 1, 2, 'standard');
      const spot3 = spotRepository.createSpot(1, 1, 3, 'standard');
      const spot4 = spotRepository.createSpot(1, 1, 4, 'standard');
      
      // Occupy 2 out of 4 spots
      spotRepository.occupy(spot3.id, 'TEST001');
      spotRepository.occupy(spot4.id, 'TEST002');
      
      const stats = spotRepository.getOccupancyStats();
      
      expect(stats).toEqual({
        total: 4,
        available: 2,
        occupied: 2,
        occupancyRate: 50
      });
    });
  });

  describe('clear', () => {
    test('should clear all spots', () => {
      spotRepository.createSpot(1, 1, 1, 'standard');
      spotRepository.createSpot(1, 1, 2, 'standard');
      
      spotRepository.clear();
      
      expect(spotRepository.count()).toBe(0);
      expect(spotRepository.findAll()).toEqual([]);
    });
  });

  describe('spot object methods', () => {
    let spot;

    beforeEach(() => {
      spot = spotRepository.createSpot(1, 1, 1, 'standard', ['ev_charging']);
    });

    test('isAvailable should return correct status', () => {
      expect(spot.isAvailable()).toBe(true);
      
      spotRepository.occupy(spot.id, 'TEST001');
      expect(spot.isAvailable()).toBe(false);
    });

    test('isOccupied should return correct status', () => {
      expect(spot.isOccupied()).toBe(false);
      
      spotRepository.occupy(spot.id, 'TEST001');
      expect(spot.isOccupied()).toBe(true);
    });

    test('toObject should return plain object', () => {
      const obj = spot.toObject();
      
      expect(obj).toEqual({
        id: 'F1-B1-S001',
        floor: 1,
        bay: 1,
        spotNumber: 1,
        type: 'standard',
        features: ['ev_charging'],
        status: 'available',
        currentVehicle: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
      
      // Should not have methods
      expect(obj.isAvailable).toBeUndefined();
      expect(obj.isOccupied).toBeUndefined();
      expect(obj.toObject).toBeUndefined();
    });
  });
});