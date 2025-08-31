/**
 * Unit Tests for GarageService
 * 
 * Tests all business logic in GarageService with mocked dependencies.
 */

const GarageService = require('../../../src/services/garageService');
const TestDataFactory = require('../../fixtures/testData');
const { MockGarageRepository, MockSpotRepository } = require('../../fixtures/mockRepositories');

describe('GarageService', () => {
  let garageService;
  let mockGarageRepo;
  let mockSpotRepo;

  beforeEach(() => {
    // Create service with mocked dependencies
    garageService = new GarageService();
    
    // Replace repositories with mocks
    mockGarageRepo = new MockGarageRepository();
    mockSpotRepo = new MockSpotRepository();
    
    garageService.garageRepository = mockGarageRepo;
    garageService.spotRepository = mockSpotRepo;
  });

  describe('initializeGarage', () => {
    test('should successfully initialize garage with valid data', async () => {
      const garageData = TestDataFactory.createGarageData();
      
      const result = await garageService.initializeGarage(garageData);
      
      expect(result).toEqual({
        garage: expect.objectContaining({
          name: garageData.name,
          totalCapacity: expect.any(Number)
        }),
        spotsCreated: expect.any(Number),
        spots: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^F\d+-B\d+-S\d{3}$/),
            floor: expect.any(Number),
            bay: expect.any(Number),
            spotNumber: expect.any(Number),
            type: expect.stringMatching(/^(compact|standard|oversized)$/),
            status: 'available',
            features: expect.any(Array)
          })
        ])
      });
    });

    test('should throw error if garage already exists', async () => {
      const garageData = TestDataFactory.createGarageData();
      
      // Initialize garage first time
      await garageService.initializeGarage(garageData);
      
      // Try to initialize again
      await expect(garageService.initializeGarage(garageData))
        .rejects
        .toThrow('Garage already initialized. Use update endpoints to modify configuration.');
    });

    test('should create spots with correct distribution', async () => {
      const garageData = TestDataFactory.createGarageData();
      
      const result = await garageService.initializeGarage(garageData);
      
      // Check spot type distribution (20% compact, 70% standard, 10% oversized)
      const spotTypes = result.spots.map(spot => spot.type);
      const compactCount = spotTypes.filter(type => type === 'compact').length;
      const standardCount = spotTypes.filter(type => type === 'standard').length;
      const oversizedCount = spotTypes.filter(type => type === 'oversized').length;
      const total = result.spotsCreated;
      
      // Allow for some variance due to rounding
      expect(compactCount / total).toBeCloseTo(0.2, 1);
      expect(standardCount / total).toBeCloseTo(0.7, 1);
      expect(oversizedCount / total).toBeCloseTo(0.1, 1);
    });

    test('should assign special features correctly', async () => {
      const garageData = TestDataFactory.createGarageData();
      
      const result = await garageService.initializeGarage(garageData);
      
      // Check for EV charging spots (first spot in each bay)
      const evChargingSpots = result.spots.filter(spot => 
        spot.features.includes('ev_charging')
      );
      expect(evChargingSpots.length).toBeGreaterThan(0);
      
      // Check for handicap spots (first 2 spots on ground floor, bay 1)
      const handicapSpots = result.spots.filter(spot => 
        spot.features.includes('handicap')
      );
      expect(handicapSpots.length).toBe(2);
      expect(handicapSpots.every(spot => spot.floor === 1)).toBe(true);
    });
  });

  describe('getGarageConfiguration', () => {
    test('should return garage configuration without optional data', async () => {
      const garageData = TestDataFactory.createGarageData();
      await garageService.initializeGarage(garageData);
      
      const config = await garageService.getGarageConfiguration();
      
      expect(config).toEqual({
        id: 'test-garage',
        name: garageData.name,
        totalCapacity: 100,
        floors: garageData.floors,
        initializedAt: expect.any(String),
        lastUpdated: expect.any(String)
      });
    });

    test('should include statistics when requested', async () => {
      const garageData = TestDataFactory.createGarageData();
      await garageService.initializeGarage(garageData);
      
      const config = await garageService.getGarageConfiguration({ includeStats: true });
      
      expect(config.statistics).toEqual({
        total: expect.any(Number),
        available: expect.any(Number),
        occupied: expect.any(Number),
        occupancyRate: expect.any(Number)
      });
    });

    test('should include spots when requested', async () => {
      const garageData = TestDataFactory.createGarageData();
      await garageService.initializeGarage(garageData);
      
      const config = await garageService.getGarageConfiguration({ includeSpots: true });
      
      expect(config.spots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            floor: expect.any(Number),
            bay: expect.any(Number),
            spotNumber: expect.any(Number),
            type: expect.any(String),
            status: expect.any(String)
          })
        ])
      );
    });

    test('should throw error if garage not initialized', async () => {
      await expect(garageService.getGarageConfiguration())
        .rejects
        .toThrow('Garage not initialized. Please initialize the garage first.');
    });
  });

  describe('updateGarageRates', () => {
    beforeEach(async () => {
      const garageData = TestDataFactory.createGarageData();
      await garageService.initializeGarage(garageData);
    });

    test('should update valid rate types', async () => {
      const rateUpdates = TestDataFactory.createRateUpdates({
        standard: 7.50,
        compact: 6.00
      });
      
      const result = await garageService.updateGarageRates(rateUpdates);
      
      expect(result).toEqual({
        message: 'Garage rates updated successfully',
        updatedRates: rateUpdates,
        currentRates: expect.objectContaining(rateUpdates),
        updatedAt: expect.any(String)
      });
    });

    test('should ignore invalid rate types', async () => {
      const rateUpdates = {
        standard: 7.50,
        invalid_type: 10.00
      };
      
      const result = await garageService.updateGarageRates(rateUpdates);
      
      expect(result.currentRates.standard).toBe(7.50);
      expect(result.currentRates.invalid_type).toBeUndefined();
    });

    test('should throw error if garage not initialized', async () => {
      garageService.garageRepository.clear();
      
      await expect(garageService.updateGarageRates({ standard: 7.50 }))
        .rejects
        .toThrow('Garage not initialized. Please initialize the garage first.');
    });
  });

  describe('updateGarageConfiguration', () => {
    beforeEach(async () => {
      const garageData = TestDataFactory.createGarageData();
      await garageService.initializeGarage(garageData);
    });

    test('should update garage name', async () => {
      const configUpdates = { name: 'Updated Garage Name' };
      
      const result = await garageService.updateGarageConfiguration(configUpdates);
      
      expect(result).toEqual({
        message: 'Garage configuration updated successfully',
        configuration: expect.objectContaining({
          name: 'Updated Garage Name'
        })
      });
    });

    test('should ignore invalid configuration fields', async () => {
      const configUpdates = { 
        name: 'Updated Name',
        invalidField: 'should be ignored'
      };
      
      const result = await garageService.updateGarageConfiguration(configUpdates);
      
      expect(result.configuration.name).toBe('Updated Name');
      expect(result.configuration.invalidField).toBeUndefined();
    });
  });

  describe('getGarageStatistics', () => {
    beforeEach(async () => {
      const garageData = TestDataFactory.createGarageData();
      await garageService.initializeGarage(garageData);
      
      // Create some occupied spots for testing
      mockSpotRepo.occupy('F1-B1-S001', 'TEST001');
      mockSpotRepo.occupy('F1-B1-S002', 'TEST002');
    });

    test('should return comprehensive statistics', async () => {
      const stats = await garageService.getGarageStatistics();
      
      expect(stats).toEqual({
        garage: expect.objectContaining({
          name: expect.any(String),
          totalCapacity: expect.any(Number),
          totalFloors: expect.any(Number),
          floors: expect.any(Array)
        }),
        occupancy: expect.objectContaining({
          total: expect.any(Number),
          available: expect.any(Number),
          occupied: expect.any(Number),
          occupancyRate: expect.any(Number)
        }),
        distribution: {
          byType: expect.objectContaining({
            compact: expect.any(Number),
            standard: expect.any(Number),
            oversized: expect.any(Number)
          }),
          byFeature: expect.objectContaining({
            ev_charging: expect.any(Number),
            handicap: expect.any(Number),
            regular: expect.any(Number)
          }),
          byFloor: expect.any(Object)
        },
        rates: expect.any(Object),
        lastUpdated: expect.any(String)
      });
    });
  });

  describe('determineSpotType', () => {
    test('should distribute spot types correctly', () => {
      const results = [];
      for (let position = 0; position < 10; position++) {
        const floor = 1, bay = 1, spotNumber = position + 1, spotsPerBay = 10;
        const type = garageService.determineSpotType(floor, bay, spotNumber, spotsPerBay);
        results.push(type);
      }
      
      const compactCount = results.filter(type => type === 'compact').length;
      const oversizedCount = results.filter(type => type === 'oversized').length;
      const standardCount = results.filter(type => type === 'standard').length;
      
      expect(compactCount).toBe(2); // First 20%
      expect(oversizedCount).toBe(1); // Last 10%
      expect(standardCount).toBe(7); // Middle 70%
    });
  });

  describe('determineSpotFeatures', () => {
    test('should assign EV charging to first spot in bay', () => {
      const features = garageService.determineSpotFeatures(1, 1, 1, 10);
      expect(features).toContain('ev_charging');
    });

    test('should assign handicap features to first 2 spots on ground floor', () => {
      const features1 = garageService.determineSpotFeatures(1, 1, 1, 10);
      const features2 = garageService.determineSpotFeatures(1, 1, 2, 10);
      const features3 = garageService.determineSpotFeatures(1, 1, 3, 10);
      
      expect(features1).toContain('handicap');
      expect(features2).toContain('handicap');
      expect(features3).not.toContain('handicap');
    });

    test('should not assign handicap features to upper floors', () => {
      const features = garageService.determineSpotFeatures(2, 1, 1, 10);
      expect(features).not.toContain('handicap');
    });
  });

  describe('isGarageInitialized', () => {
    test('should return false when garage not initialized', () => {
      expect(garageService.isGarageInitialized()).toBe(false);
    });

    test('should return true when garage is initialized', async () => {
      const garageData = TestDataFactory.createGarageData();
      await garageService.initializeGarage(garageData);
      
      expect(garageService.isGarageInitialized()).toBe(true);
    });
  });

  describe('resetGarage', () => {
    test('should clear all garage data', async () => {
      const garageData = TestDataFactory.createGarageData();
      await garageService.initializeGarage(garageData);
      
      const result = await garageService.resetGarage();
      
      expect(result).toEqual({
        message: 'Garage reset successfully',
        timestamp: expect.any(String)
      });
      
      expect(garageService.isGarageInitialized()).toBe(false);
    });
  });

  describe('error handling', () => {
    test('should handle spot creation errors gracefully', async () => {
      // Mock spot creation to fail for specific spots
      const originalCreateSpot = mockSpotRepo.createSpot;
      mockSpotRepo.createSpot = jest.fn((floor, bay, spotNumber) => {
        if (spotNumber === 5) {
          throw new Error('Test spot creation error');
        }
        return originalCreateSpot.call(mockSpotRepo, floor, bay, spotNumber, 'standard', []);
      });

      const garageData = TestDataFactory.createGarageData();
      
      // Should still complete initialization despite some spot failures
      const result = await garageService.initializeGarage(garageData);
      
      expect(result.spotsCreated).toBeLessThan(
        garageData.floors.reduce((total, floor) => 
          total + (floor.bays * floor.spotsPerBay), 0
        )
      );
    });

    test('should handle repository errors in initialization', async () => {
      // Mock garage repository to fail
      mockGarageRepo.create = jest.fn(() => {
        throw new Error('Database connection failed');
      });

      const garageData = TestDataFactory.createGarageData();
      
      await expect(garageService.initializeGarage(garageData))
        .rejects
        .toThrow('Garage initialization failed: Database connection failed');
    });
  });
});