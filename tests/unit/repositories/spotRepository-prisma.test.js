/**
 * Unit Tests for SpotRepository (Prisma Integration)
 * 
 * Tests all data access methods in SpotRepository with Prisma ORM.
 * This replaces the memory store version with database persistence.
 */

const SpotRepository = require('../../../src/repositories/spotRepository');
const { SpotFactory, GarageFactory } = require('../../factories');

describe('SpotRepository (Prisma)', () => {
  let spotRepository;
  let testGarage;

  beforeEach(async () => {
    spotRepository = new SpotRepository();
    
    // Create a test garage for spots to belong to
    testGarage = await GarageFactory.createGarage({
      name: 'Test Garage',
      totalSpots: 100
    });
  });

  describe('create', () => {
    test('should create spot with correct data structure', async () => {
      const spotData = {
        floor: 1,
        bay: 2,
        spotNumber: 5,
        type: 'standard',
        features: ['ev_charging'],
        garageId: testGarage.id
      };
      
      const spot = await spotRepository.create(spotData);
      
      expect(spot).toEqual(expect.objectContaining({
        floor: 1,
        bay: 2,
        spotNumber: 5,
        type: 'standard',
        features: ['ev_charging'],
        status: 'available',
        currentVehicle: null,
        garageId: testGarage.id
      }));
      
      expect(spot.id).toBeDefined();
      expect(spot.createdAt).toBeDefined();
      expect(spot.updatedAt).toBeDefined();
    });

    test('should prevent duplicate spots in same location', async () => {
      const spotData = {
        floor: 1,
        bay: 1,
        spotNumber: 1,
        type: 'standard',
        garageId: testGarage.id
      };
      
      await spotRepository.create(spotData);
      
      await expect(spotRepository.create(spotData))
        .rejects.toThrow(/unique constraint|already exists/i);
    });

    test('should validate spot parameters', async () => {
      // Test invalid floor
      await expect(spotRepository.create({
        floor: 0,
        bay: 1,
        spotNumber: 1,
        type: 'standard',
        garageId: testGarage.id
      })).rejects.toThrow(/floor/i);
      
      // Test invalid spot type
      await expect(spotRepository.create({
        floor: 1,
        bay: 1,
        spotNumber: 1,
        type: 'invalid_type',
        garageId: testGarage.id
      })).rejects.toThrow(/type/i);
    });

    test('should handle empty and undefined features', async () => {
      const spotWithEmptyFeatures = await spotRepository.create({
        floor: 1,
        bay: 1,
        spotNumber: 1,
        type: 'standard',
        features: [],
        garageId: testGarage.id
      });
      
      expect(spotWithEmptyFeatures.features).toEqual([]);
      
      const spotWithoutFeatures = await spotRepository.create({
        floor: 1,
        bay: 1,
        spotNumber: 2,
        type: 'standard',
        garageId: testGarage.id
      });
      
      expect(spotWithoutFeatures.features).toEqual([]);
    });
  });

  describe('findById', () => {
    test('should find existing spot by ID', async () => {
      const createdSpot = await SpotFactory.createSpot({ garageId: testGarage.id });
      const foundSpot = await spotRepository.findById(createdSpot.id);
      
      expect(foundSpot).toEqual(createdSpot);
    });

    test('should return null for non-existent spot', async () => {
      const spot = await spotRepository.findById('00000000-0000-0000-0000-000000000000');
      expect(spot).toBeNull();
    });
  });

  describe('findAll', () => {
    test('should return empty array when no spots exist', async () => {
      const spots = await spotRepository.findAll();
      expect(spots).toEqual([]);
    });

    test('should return all spots when spots exist', async () => {
      await SpotFactory.createSpotsForGarage(testGarage.id, 5);
      
      const spots = await spotRepository.findAll();
      
      expect(spots).toHaveLength(5);
      expect(spots.every(spot => spot.garageId === testGarage.id)).toBe(true);
    });
  });

  describe('findByGarage', () => {
    test('should find spots belonging to specific garage', async () => {
      const garage2 = await GarageFactory.createGarage({ name: 'Garage 2' });
      
      await SpotFactory.createSpotsForGarage(testGarage.id, 3);
      await SpotFactory.createSpotsForGarage(garage2.id, 2);
      
      const garage1Spots = await spotRepository.findByGarage(testGarage.id);
      const garage2Spots = await spotRepository.findByGarage(garage2.id);
      
      expect(garage1Spots).toHaveLength(3);
      expect(garage2Spots).toHaveLength(2);
      expect(garage1Spots.every(s => s.garageId === testGarage.id)).toBe(true);
      expect(garage2Spots.every(s => s.garageId === garage2.id)).toBe(true);
    });
  });

  describe('findAvailable', () => {
    test('should return only available spots', async () => {
      const spots = await SpotFactory.createSpotsForGarage(testGarage.id, 5);
      
      // Occupy one spot
      await spotRepository.occupy(spots[1].id, 'TEST-VEHICLE-001');
      
      const availableSpots = await spotRepository.findAvailable();
      
      expect(availableSpots).toHaveLength(4);
      expect(availableSpots.every(s => s.status === 'available')).toBe(true);
      expect(availableSpots.map(s => s.id)).not.toContain(spots[1].id);
    });

    test('should filter by garage when specified', async () => {
      const garage2 = await GarageFactory.createGarage({ name: 'Garage 2' });
      
      await SpotFactory.createSpotsForGarage(testGarage.id, 3);
      await SpotFactory.createSpotsForGarage(garage2.id, 2);
      
      const garage1Available = await spotRepository.findAvailable({ garageId: testGarage.id });
      
      expect(garage1Available).toHaveLength(3);
      expect(garage1Available.every(s => s.garageId === testGarage.id)).toBe(true);
    });
  });

  describe('findByType', () => {
    beforeEach(async () => {
      await SpotFactory.createSpot({ type: 'compact', garageId: testGarage.id });
      await SpotFactory.createSpot({ type: 'standard', garageId: testGarage.id });
      await SpotFactory.createSpot({ type: 'standard', garageId: testGarage.id });
      await SpotFactory.createSpot({ type: 'oversized', garageId: testGarage.id });
    });

    test('should find spots by type', async () => {
      const standardSpots = await spotRepository.findByType('standard');
      
      expect(standardSpots).toHaveLength(2);
      expect(standardSpots.every(spot => spot.type === 'standard')).toBe(true);
    });

    test('should return empty array for non-existent type', async () => {
      const spots = await spotRepository.findByType('motorcycle');
      expect(spots).toEqual([]);
    });

    test('should be case sensitive', async () => {
      const spots = await spotRepository.findByType('STANDARD');
      expect(spots).toEqual([]);
    });
  });

  describe('findByFeature', () => {
    beforeEach(async () => {
      await SpotFactory.createSpot({ features: ['ev_charging'], garageId: testGarage.id });
      await SpotFactory.createSpot({ features: ['handicap'], garageId: testGarage.id });
      await SpotFactory.createSpot({ features: ['ev_charging', 'handicap'], garageId: testGarage.id });
      await SpotFactory.createSpot({ features: [], garageId: testGarage.id });
    });

    test('should find spots with specific feature', async () => {
      const evSpots = await spotRepository.findByFeature('ev_charging');
      
      expect(evSpots).toHaveLength(2);
      expect(evSpots.every(spot => spot.features.includes('ev_charging'))).toBe(true);
    });

    test('should return empty array for non-existent feature', async () => {
      const spots = await spotRepository.findByFeature('valet');
      expect(spots).toEqual([]);
    });
  });

  describe('findByFloor', () => {
    beforeEach(async () => {
      await SpotFactory.createSpot({ floor: 1, bay: 1, spotNumber: 1, garageId: testGarage.id });
      await SpotFactory.createSpot({ floor: 1, bay: 2, spotNumber: 1, garageId: testGarage.id });
      await SpotFactory.createSpot({ floor: 2, bay: 1, spotNumber: 1, garageId: testGarage.id });
      await SpotFactory.createSpot({ floor: 3, bay: 1, spotNumber: 1, garageId: testGarage.id });
    });

    test('should find spots on specific floor', async () => {
      const floor1Spots = await spotRepository.findByFloor(1);
      
      expect(floor1Spots).toHaveLength(2);
      expect(floor1Spots.every(spot => spot.floor === 1)).toBe(true);
    });

    test('should return empty array for non-existent floor', async () => {
      const spots = await spotRepository.findByFloor(99);
      expect(spots).toEqual([]);
    });
  });

  describe('findByFloorAndBay', () => {
    beforeEach(async () => {
      await SpotFactory.createSpot({ floor: 1, bay: 1, spotNumber: 1, garageId: testGarage.id });
      await SpotFactory.createSpot({ floor: 1, bay: 1, spotNumber: 2, garageId: testGarage.id });
      await SpotFactory.createSpot({ floor: 1, bay: 2, spotNumber: 1, garageId: testGarage.id });
      await SpotFactory.createSpot({ floor: 2, bay: 1, spotNumber: 1, garageId: testGarage.id });
    });

    test('should find spots in specific floor and bay', async () => {
      const spots = await spotRepository.findByFloorAndBay(1, 1);
      
      expect(spots).toHaveLength(2);
      expect(spots.every(spot => spot.floor === 1 && spot.bay === 1)).toBe(true);
    });

    test('should return empty array for non-existent floor/bay', async () => {
      const spots = await spotRepository.findByFloorAndBay(99, 99);
      expect(spots).toEqual([]);
    });
  });

  describe('occupy', () => {
    test('should successfully occupy available spot', async () => {
      const spot = await SpotFactory.createSpot({ garageId: testGarage.id });
      
      const success = await spotRepository.occupy(spot.id, 'TEST-VEHICLE-001');
      
      expect(success).toBe(true);
      
      const updatedSpot = await spotRepository.findById(spot.id);
      expect(updatedSpot.status).toBe('occupied');
      expect(updatedSpot.currentVehicle).toBe('TEST-VEHICLE-001');
    });

    test('should fail to occupy non-existent spot', async () => {
      const success = await spotRepository.occupy('00000000-0000-0000-0000-000000000000', 'TEST-VEHICLE-001');
      expect(success).toBe(false);
    });

    test('should fail to occupy already occupied spot', async () => {
      const spot = await SpotFactory.createSpot({ garageId: testGarage.id });
      await spotRepository.occupy(spot.id, 'VEHICLE-001');
      
      await expect(spotRepository.occupy(spot.id, 'VEHICLE-002'))
        .rejects.toThrow(/already occupied/i);
      
      const updatedSpot = await spotRepository.findById(spot.id);
      expect(updatedSpot.currentVehicle).toBe('VEHICLE-001');
    });
  });

  describe('vacate', () => {
    test('should successfully vacate occupied spot', async () => {
      const spot = await SpotFactory.createSpot({ garageId: testGarage.id });
      await spotRepository.occupy(spot.id, 'TEST-VEHICLE-001');
      
      const success = await spotRepository.vacate(spot.id);
      
      expect(success).toBe(true);
      
      const updatedSpot = await spotRepository.findById(spot.id);
      expect(updatedSpot.status).toBe('available');
      expect(updatedSpot.currentVehicle).toBeNull();
    });

    test('should fail to vacate non-existent spot', async () => {
      const success = await spotRepository.vacate('00000000-0000-0000-0000-000000000000');
      expect(success).toBe(false);
    });

    test('should handle vacating already available spot', async () => {
      const spot = await SpotFactory.createSpot({ garageId: testGarage.id });
      
      await expect(spotRepository.vacate(spot.id))
        .rejects.toThrow(/not occupied/i);
    });
  });

  describe('exists', () => {
    test('should return true for existing spot', async () => {
      const spot = await SpotFactory.createSpot({ garageId: testGarage.id });
      
      expect(await spotRepository.exists(spot.id)).toBe(true);
    });

    test('should return false for non-existent spot', async () => {
      expect(await spotRepository.exists('00000000-0000-0000-0000-000000000000')).toBe(false);
    });
  });

  describe('count', () => {
    test('should return 0 when no spots exist', async () => {
      const count = await spotRepository.count();
      expect(count).toBe(0);
    });

    test('should return correct count', async () => {
      await SpotFactory.createSpotsForGarage(testGarage.id, 10);
      
      const count = await spotRepository.count();
      expect(count).toBe(10);
    });

    test('should filter by garage when specified', async () => {
      const garage2 = await GarageFactory.createGarage({ name: 'Garage 2' });
      
      await SpotFactory.createSpotsForGarage(testGarage.id, 5);
      await SpotFactory.createSpotsForGarage(garage2.id, 3);
      
      const garage1Count = await spotRepository.count({ garageId: testGarage.id });
      expect(garage1Count).toBe(5);
    });
  });

  describe('getOccupancyStats', () => {
    test('should return correct stats with no spots', async () => {
      const stats = await spotRepository.getOccupancyStats();
      
      expect(stats).toEqual({
        total: 0,
        available: 0,
        occupied: 0,
        occupancyRate: 0
      });
    });

    test('should return correct stats with spots', async () => {
      const spots = await SpotFactory.createSpotsForGarage(testGarage.id, 10);
      
      // Occupy 3 out of 10 spots
      await spotRepository.occupy(spots[0].id, 'VEHICLE-001');
      await spotRepository.occupy(spots[1].id, 'VEHICLE-002');
      await spotRepository.occupy(spots[2].id, 'VEHICLE-003');
      
      const stats = await spotRepository.getOccupancyStats();
      
      expect(stats).toEqual({
        total: 10,
        available: 7,
        occupied: 3,
        occupancyRate: 30
      });
    });

    test('should filter by garage when specified', async () => {
      const garage2 = await GarageFactory.createGarage({ name: 'Garage 2' });
      
      const garage1Spots = await SpotFactory.createSpotsForGarage(testGarage.id, 5);
      await SpotFactory.createSpotsForGarage(garage2.id, 10);
      
      await spotRepository.occupy(garage1Spots[0].id, 'VEHICLE-001');
      
      const garage1Stats = await spotRepository.getOccupancyStats({ garageId: testGarage.id });
      
      expect(garage1Stats).toEqual({
        total: 5,
        available: 4,
        occupied: 1,
        occupancyRate: 20
      });
    });
  });

  describe('Database Integration', () => {
    test('should handle concurrent spot operations', async () => {
      const spots = await SpotFactory.createSpotsForGarage(testGarage.id, 5);
      
      // Attempt to occupy multiple spots simultaneously
      const promises = spots.map((spot, index) => 
        spotRepository.occupy(spot.id, `VEHICLE-${index + 1}`)
      );
      
      const results = await Promise.all(promises);
      
      expect(results.every(result => result === true)).toBe(true);
      
      const occupiedSpots = await spotRepository.findByGarage(testGarage.id);
      expect(occupiedSpots.filter(s => s.status === 'occupied')).toHaveLength(5);
    });

    test('should maintain referential integrity with garage', async () => {
      // Create spot with valid garage ID
      const spot = await SpotFactory.createSpot({ garageId: testGarage.id });
      expect(spot.garageId).toBe(testGarage.id);
      
      // Attempt to create spot with invalid garage ID should fail
      await expect(SpotFactory.createSpot({ 
        garageId: '00000000-0000-0000-0000-000000000000' 
      })).rejects.toThrow(/foreign key|reference/i);
    });

    test('should support complex queries', async () => {
      // Create spots with various configurations
      await SpotFactory.createSpot({
        type: 'standard',
        features: ['ev_charging'],
        floor: 1,
        garageId: testGarage.id
      });
      
      await SpotFactory.createSpot({
        type: 'standard',
        features: ['handicap'],
        floor: 1,
        garageId: testGarage.id
      });
      
      await SpotFactory.createSpot({
        type: 'compact',
        features: ['ev_charging'],
        floor: 2,
        garageId: testGarage.id
      });
      
      // Complex query: standard spots on floor 1 with EV charging
      const spots = await spotRepository.findComplex({
        type: 'standard',
        floor: 1,
        features: ['ev_charging'],
        status: 'available'
      });
      
      expect(spots).toHaveLength(1);
      expect(spots[0].type).toBe('standard');
      expect(spots[0].floor).toBe(1);
      expect(spots[0].features).toContain('ev_charging');
    });
  });

  describe('Performance', () => {
    test('should handle bulk spot creation efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 spots
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(SpotFactory.createSpot({
          floor: Math.floor(i / 20) + 1,
          bay: Math.floor(i / 5) + 1,
          spotNumber: (i % 5) + 1,
          garageId: testGarage.id
        }));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10000); // 10 seconds
      
      const count = await spotRepository.count();
      expect(count).toBe(100);
    });
  });
});