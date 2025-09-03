/**
 * Garage Controller Tests
 * 
 * Comprehensive test suite for the GarageController covering:
 * - Garage initialization
 * - Configuration management
 * - Rate management
 * - Statistics and capacity queries
 * - Garage status and reset operations
 * - Error handling for various scenarios
 * - Input validation
 * - Edge cases and boundary conditions
 */

import request from 'supertest';
import app from '../../../src/app';
import { GarageController } from '../../../src/controllers/garageController';
import { GarageService } from '../../../src/services/garageService';

// Mock the services
jest.mock('../../../src/services/garageService');

const MockedGarageService = GarageService as jest.MockedClass<typeof GarageService>;

describe('GarageController', () => {
  let garageController: GarageController;
  let mockGarageService: jest.Mocked<GarageService>;

  const mockGarageConfiguration = {
    id: 'garage-001',
    name: 'Downtown Parking Garage',
    totalCapacity: 300,
    totalFloors: 3,
    floorsConfiguration: [
      { floor: 1, bays: 5, spotsPerBay: 20, totalSpots: 100 },
      { floor: 2, bays: 5, spotsPerBay: 20, totalSpots: 100 },
      { floor: 3, bays: 5, spotsPerBay: 20, totalSpots: 100 }
    ],
    rates: {
      hourly: 5.00,
      daily: 25.00,
      monthly: 150.00
    },
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    statistics: {
      totalSpots: 300,
      occupiedSpots: 75,
      availableSpots: 225,
      occupancyRate: 25.0
    }
  };

  const mockGarageStatistics = {
    overview: {
      totalSpots: 300,
      occupiedSpots: 75,
      availableSpots: 225,
      occupancyRate: 25.0
    },
    byFloor: [
      { floor: 1, totalSpots: 100, occupied: 25, available: 75, occupancyRate: 25.0 },
      { floor: 2, totalSpots: 100, occupied: 25, available: 75, occupancyRate: 25.0 },
      { floor: 3, totalSpots: 100, occupied: 25, available: 75, occupancyRate: 25.0 }
    ],
    revenue: {
      totalRevenue: 2500.00,
      dailyRevenue: 375.00,
      averageRevenuePerSpot: 8.33
    },
    usage: {
      averageParkingDuration: 150, // minutes
      peakHours: ['9:00-11:00', '17:00-19:00'],
      mostUsedFloor: 1
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    garageController = new GarageController();
    
    // Get mocked instance
    mockGarageService = MockedGarageService.mock.instances[MockedGarageService.mock.instances.length - 1] as jest.Mocked<GarageService>;

    // Set up default mocks
    mockGarageService.getGarageConfiguration = jest.fn().mockResolvedValue(mockGarageConfiguration);
    mockGarageService.initializeGarage = jest.fn().mockResolvedValue(mockGarageConfiguration);
    mockGarageService.updateGarageRates = jest.fn().mockResolvedValue({
      message: 'Rates updated successfully',
      updatedRates: { hourly: 6.00 },
      currentRates: { hourly: 6.00, daily: 25.00, monthly: 150.00 },
      updatedAt: new Date().toISOString()
    });
    mockGarageService.updateGarageConfiguration = jest.fn().mockResolvedValue({
      message: 'Configuration updated successfully',
      configuration: { ...mockGarageConfiguration, name: 'Updated Garage Name' }
    });
    mockGarageService.getGarageStatistics = jest.fn().mockResolvedValue(mockGarageStatistics);
    mockGarageService.isGarageInitialized = jest.fn().mockReturnValue(true);
    mockGarageService.resetGarage = jest.fn().mockResolvedValue({
      message: 'Garage reset successfully',
      timestamp: new Date().toISOString()
    });
  });

  describe('GET /api/v1/garage - getGarageConfiguration', () => {
    it('should get garage configuration without optional data', async () => {
      const response = await request(app)
        .get('/api/v1/garage')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Downtown Parking Garage');
      expect(response.body.data.totalCapacity).toBe(300);
      expect(response.body.data.rates).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({
        includeStats: false,
        includeSpots: false
      });
    });

    it('should get garage configuration with statistics', async () => {
      const response = await request(app)
        .get('/api/v1/garage?includeStats=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();

      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({
        includeStats: true,
        includeSpots: false
      });
    });

    it('should get garage configuration with spots information', async () => {
      const response = await request(app)
        .get('/api/v1/garage?includeSpots=true')
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({
        includeStats: false,
        includeSpots: true
      });
    });

    it('should get garage configuration with both stats and spots', async () => {
      const response = await request(app)
        .get('/api/v1/garage?includeStats=true&includeSpots=true')
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({
        includeStats: true,
        includeSpots: true
      });
    });

    it('should handle garage not initialized error (404)', async () => {
      mockGarageService.getGarageConfiguration.mockRejectedValue(
        new Error('Garage not initialized')
      );

      const response = await request(app)
        .get('/api/v1/garage')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage not initialized');
      expect(response.body.errors).toContain('Please initialize the garage first using POST /api/v1/garage/initialize');
    });

    it('should handle service error (500)', async () => {
      mockGarageService.getGarageConfiguration.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/v1/garage')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve garage configuration');
      expect(response.body.errors).toContain('Database connection failed');
    });
  });

  describe('POST /api/v1/garage/initialize - initializeGarage', () => {
    const validInitData = {
      name: 'New Parking Garage',
      floors: [
        { number: 1, bays: 5, spotsPerBay: 20 },
        { number: 2, bays: 5, spotsPerBay: 20 },
        { number: 3, bays: 4, spotsPerBay: 25 }
      ]
    };

    it('should initialize garage with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/garage/initialize')
        .send(validInitData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Garage initialized successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Downtown Parking Garage');
      expect(response.body.timestamp).toBeDefined();

      expect(mockGarageService.initializeGarage).toHaveBeenCalledWith(validInitData);
    });

    it('should handle garage already initialized error (409)', async () => {
      mockGarageService.initializeGarage.mockRejectedValue(
        new Error('Garage already initialized')
      );

      const response = await request(app)
        .post('/api/v1/garage/initialize')
        .send(validInitData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage already exists');
      expect(response.body.errors).toContain('Garage is already initialized. Use update endpoints to modify configuration.');
    });

    it('should handle validation error (400)', async () => {
      mockGarageService.initializeGarage.mockRejectedValue(
        new Error('Invalid floor configuration: floors must be numbered starting from 1')
      );

      const response = await request(app)
        .post('/api/v1/garage/initialize')
        .send(validInitData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage initialization failed');
      expect(response.body.errors).toContain('Invalid floor configuration: floors must be numbered starting from 1');
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Garage'
        // Missing floors array
      };

      const response = await request(app)
        .post('/api/v1/garage/initialize')
        .send(incompleteData)
        .expect(400);

      expect(mockGarageService.initializeGarage).toHaveBeenCalled();
    });

    it('should handle invalid floor data', async () => {
      const invalidFloorData = {
        name: 'Invalid Floor Garage',
        floors: [
          { number: 1, bays: -1, spotsPerBay: 20 }, // Invalid negative bays
          { number: 2, bays: 5, spotsPerBay: 0 } // Invalid zero spots
        ]
      };

      mockGarageService.initializeGarage.mockRejectedValue(
        new Error('Invalid bay configuration: bays must be positive integers')
      );

      const response = await request(app)
        .post('/api/v1/garage/initialize')
        .send(invalidFloorData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Invalid bay configuration: bays must be positive integers');
    });
  });

  describe('PUT /api/v1/garage/rates - updateGarageRates', () => {
    const validRateUpdates = {
      hourly: 6.00,
      daily: 30.00
    };

    it('should update garage rates successfully', async () => {
      const response = await request(app)
        .put('/api/v1/garage/rates')
        .send(validRateUpdates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rates updated successfully');
      expect(response.body.data.updatedRates).toBeDefined();
      expect(response.body.data.currentRates).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockGarageService.updateGarageRates).toHaveBeenCalledWith(validRateUpdates);
    });

    it('should handle partial rate updates', async () => {
      const partialRateUpdate = {
        monthly: 200.00
      };

      const response = await request(app)
        .put('/api/v1/garage/rates')
        .send(partialRateUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGarageService.updateGarageRates).toHaveBeenCalledWith(partialRateUpdate);
    });

    it('should handle garage not initialized error (404)', async () => {
      mockGarageService.updateGarageRates.mockRejectedValue(
        new Error('Garage not initialized')
      );

      const response = await request(app)
        .put('/api/v1/garage/rates')
        .send(validRateUpdates)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage not initialized');
    });

    it('should handle invalid rate values (400)', async () => {
      mockGarageService.updateGarageRates.mockRejectedValue(
        new Error('Invalid rate value: rates must be positive numbers')
      );

      const invalidRates = {
        hourly: -5.00, // Invalid negative rate
        daily: 'invalid' // Invalid type
      };

      const response = await request(app)
        .put('/api/v1/garage/rates')
        .send(invalidRates)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Rate update failed');
      expect(response.body.errors).toContain('Invalid rate value: rates must be positive numbers');
    });

    it('should handle empty rate updates', async () => {
      const response = await request(app)
        .put('/api/v1/garage/rates')
        .send({})
        .expect(200);

      expect(mockGarageService.updateGarageRates).toHaveBeenCalledWith({});
    });
  });

  describe('PUT /api/v1/garage/config - updateGarageConfiguration', () => {
    const validConfigUpdates = {
      name: 'Updated Garage Name'
    };

    it('should update garage configuration successfully', async () => {
      const response = await request(app)
        .put('/api/v1/garage/config')
        .send(validConfigUpdates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Configuration updated successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Updated Garage Name');
      expect(response.body.timestamp).toBeDefined();

      expect(mockGarageService.updateGarageConfiguration).toHaveBeenCalledWith(validConfigUpdates);
    });

    it('should handle garage not initialized error (404)', async () => {
      mockGarageService.updateGarageConfiguration.mockRejectedValue(
        new Error('Garage not initialized')
      );

      const response = await request(app)
        .put('/api/v1/garage/config')
        .send(validConfigUpdates)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage not initialized');
    });

    it('should handle configuration validation error (400)', async () => {
      mockGarageService.updateGarageConfiguration.mockRejectedValue(
        new Error('Invalid configuration: name cannot be empty')
      );

      const invalidConfig = {
        name: ''
      };

      const response = await request(app)
        .put('/api/v1/garage/config')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Configuration update failed');
      expect(response.body.errors).toContain('Invalid configuration: name cannot be empty');
    });
  });

  describe('GET /api/v1/garage/statistics - getGarageStatistics', () => {
    it('should get garage statistics successfully', async () => {
      const response = await request(app)
        .get('/api/v1/garage/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.byFloor).toBeDefined();
      expect(response.body.data.revenue).toBeDefined();
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockGarageService.getGarageStatistics).toHaveBeenCalled();
    });

    it('should handle garage not initialized error (404)', async () => {
      mockGarageService.getGarageStatistics.mockRejectedValue(
        new Error('Garage not initialized')
      );

      const response = await request(app)
        .get('/api/v1/garage/statistics')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage not initialized');
    });

    it('should handle statistics service error (500)', async () => {
      mockGarageService.getGarageStatistics.mockRejectedValue(
        new Error('Statistics calculation failed')
      );

      const response = await request(app)
        .get('/api/v1/garage/statistics')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve garage statistics');
      expect(response.body.errors).toContain('Statistics calculation failed');
    });
  });

  describe('GET /api/v1/garage/status - getGarageStatus', () => {
    it('should get garage status when initialized', async () => {
      const response = await request(app)
        .get('/api/v1/garage/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.initialized).toBe(true);
      expect(response.body.data.message).toBe('Garage is initialized and ready for operations');
      expect(response.body.timestamp).toBeDefined();

      expect(mockGarageService.isGarageInitialized).toHaveBeenCalled();
    });

    it('should get garage status when not initialized', async () => {
      mockGarageService.isGarageInitialized.mockReturnValue(false);

      const response = await request(app)
        .get('/api/v1/garage/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.initialized).toBe(false);
      expect(response.body.data.message).toBe('Garage is not initialized. Please initialize using POST /api/v1/garage/initialize');
    });

    it('should handle service error (500)', async () => {
      mockGarageService.isGarageInitialized.mockImplementation(() => {
        throw new Error('Status check failed');
      });

      const response = await request(app)
        .get('/api/v1/garage/status')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to check garage status');
      expect(response.body.errors).toContain('Status check failed');
    });
  });

  describe('DELETE /api/v1/garage/reset - resetGarage', () => {
    it('should reset garage successfully', async () => {
      const response = await request(app)
        .delete('/api/v1/garage/reset')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Garage reset successfully');
      expect(response.body.data.resetAt).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockGarageService.resetGarage).toHaveBeenCalled();
    });

    it('should handle reset service error (500)', async () => {
      mockGarageService.resetGarage.mockRejectedValue(
        new Error('Reset operation failed - data corruption detected')
      );

      const response = await request(app)
        .delete('/api/v1/garage/reset')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to reset garage');
      expect(response.body.errors).toContain('Reset operation failed - data corruption detected');
    });
  });

  describe('GET /api/v1/garage/rates - getGarageRates', () => {
    it('should get garage rates successfully', async () => {
      const response = await request(app)
        .get('/api/v1/garage/rates')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rates).toBeDefined();
      expect(response.body.data.rates.hourly).toBe(5.00);
      expect(response.body.data.rates.daily).toBe(25.00);
      expect(response.body.data.rates.monthly).toBe(150.00);
      expect(response.body.data.lastUpdated).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalled();
    });

    it('should handle garage not initialized error (404)', async () => {
      mockGarageService.getGarageConfiguration.mockRejectedValue(
        new Error('Garage not initialized')
      );

      const response = await request(app)
        .get('/api/v1/garage/rates')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage not initialized');
    });

    it('should handle service error (500)', async () => {
      mockGarageService.getGarageConfiguration.mockRejectedValue(
        new Error('Rate retrieval failed')
      );

      const response = await request(app)
        .get('/api/v1/garage/rates')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve garage rates');
      expect(response.body.errors).toContain('Rate retrieval failed');
    });
  });

  describe('GET /api/v1/garage/capacity - getGarageCapacity', () => {
    it('should get garage capacity information successfully', async () => {
      const response = await request(app)
        .get('/api/v1/garage/capacity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Downtown Parking Garage');
      expect(response.body.data.totalCapacity).toBe(300);
      expect(response.body.data.totalFloors).toBe(3);
      expect(response.body.data.floorsConfiguration).toBeDefined();
      expect(response.body.data.occupancy).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({ includeStats: true });
    });

    it('should handle garage not initialized error (404)', async () => {
      mockGarageService.getGarageConfiguration.mockRejectedValue(
        new Error('Garage not initialized')
      );

      const response = await request(app)
        .get('/api/v1/garage/capacity')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage not initialized');
    });

    it('should handle service error (500)', async () => {
      mockGarageService.getGarageConfiguration.mockRejectedValue(
        new Error('Capacity calculation failed')
      );

      const response = await request(app)
        .get('/api/v1/garage/capacity')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve garage capacity');
      expect(response.body.errors).toContain('Capacity calculation failed');
    });
  });

  describe('Input Validation and Edge Cases', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/garage/initialize')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty initialization request', async () => {
      const response = await request(app)
        .post('/api/v1/garage/initialize')
        .send({})
        .expect(400);

      expect(mockGarageService.initializeGarage).toHaveBeenCalledWith({});
    });

    it('should handle very large garage initialization', async () => {
      const largeGarageData = {
        name: 'Mega Parking Complex',
        floors: Array.from({ length: 50 }, (_, i) => ({
          number: i + 1,
          bays: 20,
          spotsPerBay: 50
        }))
      };

      const response = await request(app)
        .post('/api/v1/garage/initialize')
        .send(largeGarageData)
        .expect(201);

      expect(mockGarageService.initializeGarage).toHaveBeenCalledWith(largeGarageData);
    });

    it('should handle special characters in garage name', async () => {
      const specialCharData = {
        name: 'Garage-@-#$%^&*()_+{}|:<>?[]\\;\'\",./',
        floors: [{ number: 1, bays: 1, spotsPerBay: 10 }]
      };

      const response = await request(app)
        .post('/api/v1/garage/initialize')
        .send(specialCharData)
        .expect(201);

      expect(mockGarageService.initializeGarage).toHaveBeenCalledWith(specialCharData);
    });

    it('should handle null values in rate updates', async () => {
      const nullRateData = {
        hourly: null,
        daily: undefined,
        monthly: 0
      };

      const response = await request(app)
        .put('/api/v1/garage/rates')
        .send(nullRateData)
        .expect(200);

      expect(mockGarageService.updateGarageRates).toHaveBeenCalledWith(nullRateData);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent configuration requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/v1/garage')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent rate updates', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .put('/api/v1/garage/rates')
          .send({ hourly: 5.0 + i })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should complete status check quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/garage/status')
        .expect(200);

      const duration = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response format for successful operations', async () => {
      const responses = await Promise.all([
        request(app).get('/api/v1/garage'),
        request(app).get('/api/v1/garage/status'),
        request(app).get('/api/v1/garage/statistics'),
        request(app).get('/api/v1/garage/rates'),
        request(app).get('/api/v1/garage/capacity')
      ]);

      responses.forEach(response => {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
      });
    });

    it('should return consistent error response format', async () => {
      mockGarageService.getGarageConfiguration.mockRejectedValue(
        new Error('Test error for format validation')
      );

      const response = await request(app)
        .get('/api/v1/garage')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should include timestamp in all responses', async () => {
      const response = await request(app)
        .get('/api/v1/garage/status')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
      expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Query Parameter Handling', () => {
    it('should handle invalid query parameter values', async () => {
      const response = await request(app)
        .get('/api/v1/garage?includeStats=invalid&includeSpots=notboolean')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({
        includeStats: false, // invalid converted to false
        includeSpots: false  // invalid converted to false
      });
    });

    it('should handle case variations in query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/garage?includeStats=TRUE&includeSpots=False')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({
        includeStats: false, // "TRUE" !== "true"
        includeSpots: false  // "False" !== "true"
      });
    });

    it('should handle missing query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/garage')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({
        includeStats: false,
        includeSpots: false
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate floor numbering in initialization', async () => {
      const invalidFloorNumbers = {
        name: 'Invalid Floor Garage',
        floors: [
          { number: 0, bays: 5, spotsPerBay: 20 }, // Invalid floor 0
          { number: 2, bays: 5, spotsPerBay: 20 }, // Missing floor 1
          { number: 3, bays: 5, spotsPerBay: 20 }
        ]
      };

      mockGarageService.initializeGarage.mockRejectedValue(
        new Error('Floor numbers must start from 1 and be consecutive')
      );

      const response = await request(app)
        .post('/api/v1/garage/initialize')
        .send(invalidFloorNumbers)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Floor numbers must start from 1 and be consecutive');
    });

    it('should validate rate value ranges', async () => {
      const extremeRates = {
        hourly: 999999.99,
        daily: 0.01,
        monthly: -100.00
      };

      mockGarageService.updateGarageRates.mockRejectedValue(
        new Error('Rate values must be within reasonable ranges')
      );

      const response = await request(app)
        .put('/api/v1/garage/rates')
        .send(extremeRates)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Rate values must be within reasonable ranges');
    });

    it('should validate garage capacity limits', async () => {
      const oversizedGarage = {
        name: 'Oversized Garage',
        floors: Array.from({ length: 200 }, (_, i) => ({
          number: i + 1,
          bays: 100,
          spotsPerBay: 100 // Would create 2,000,000 spots
        }))
      };

      mockGarageService.initializeGarage.mockRejectedValue(
        new Error('Garage exceeds maximum capacity limits')
      );

      const response = await request(app)
        .post('/api/v1/garage/initialize')
        .send(oversizedGarage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Garage exceeds maximum capacity limits');
    });
  });
});