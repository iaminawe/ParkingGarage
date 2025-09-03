import { Request, Response } from 'express';
import { GarageController } from '../../controllers/garageController';
import { GarageService } from '../../services/garageService';
import {
  createMockRequest,
  createMockResponse,
  mockConsole,
  expectSuccessResponse,
  expectErrorResponse
} from '../helpers/testUtils';

// Mock services
jest.mock('../../services/garageService');

const MockedGarageService = GarageService as jest.MockedClass<typeof GarageService>;

describe('GarageController', () => {
  let garageController: GarageController;
  let mockRequest: ReturnType<typeof createMockRequest>;
  let mockResponse: ReturnType<typeof createMockResponse>;
  let mockGarageService: jest.Mocked<GarageService>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();

    mockGarageService = {
      getGarageConfiguration: jest.fn(),
      initializeGarage: jest.fn(),
      updateGarageRates: jest.fn(),
      updateGarageConfiguration: jest.fn(),
      getGarageStats: jest.fn(),
      resetGarage: jest.fn(),
    } as any;

    MockedGarageService.mockImplementation(() => mockGarageService);
    garageController = new GarageController();
    jest.clearAllMocks();
  });

  mockConsole();

  describe('getGarageConfiguration', () => {
    const mockConfiguration = {
      id: 'garage-123',
      name: 'Downtown Parking Garage',
      totalSpots: 500,
      availableSpots: 150,
      floors: [
        {
          id: 'floor-1',
          number: 1,
          totalSpots: 100,
          availableSpots: 30
        }
      ]
    };

    it('should return garage configuration without optional data', async () => {
      mockGarageService.getGarageConfiguration.mockResolvedValue(mockConfiguration);

      await garageController.getGarageConfiguration(mockRequest as any, mockResponse as any);

      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({
        includeStats: false,
        includeSpots: false
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockConfiguration,
        timestamp: expect.any(String)
      });
    });

    it('should return garage configuration with stats and spots', async () => {
      const fullConfiguration = {
        ...mockConfiguration,
        stats: {
          occupancyRate: 70,
          avgParkingDuration: '2.5 hours',
          dailyRevenue: 1250.50
        },
        spots: [
          { id: 'spot-1', number: 1, isOccupied: false },
          { id: 'spot-2', number: 2, isOccupied: true }
        ]
      };

      mockRequest.query = {
        includeStats: 'true',
        includeSpots: 'true'
      };

      mockGarageService.getGarageConfiguration.mockResolvedValue(fullConfiguration);

      await garageController.getGarageConfiguration(mockRequest as any, mockResponse as any);

      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({
        includeStats: true,
        includeSpots: true
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: fullConfiguration,
        timestamp: expect.any(String)
      });
    });

    it('should handle garage not initialized error', async () => {
      mockGarageService.getGarageConfiguration.mockRejectedValue(
        new Error('Garage not initialized')
      );

      await garageController.getGarageConfiguration(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Garage not initialized',
        errors: ['Please initialize the garage first using POST /api/v1/garage/initialize'],
        timestamp: expect.any(String)
      });
    });

    it('should handle service errors', async () => {
      mockGarageService.getGarageConfiguration.mockRejectedValue(
        new Error('Database connection failed')
      );

      await garageController.getGarageConfiguration(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve garage configuration',
        errors: ['Database connection failed'],
        timestamp: expect.any(String)
      });
    });

    it('should handle falsy query parameters', async () => {
      mockRequest.query = {
        includeStats: 'false',
        includeSpots: ''
      };

      mockGarageService.getGarageConfiguration.mockResolvedValue(mockConfiguration);

      await garageController.getGarageConfiguration(mockRequest as any, mockResponse as any);

      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({
        includeStats: false,
        includeSpots: false
      });
    });
  });

  describe('initializeGarage', () => {
    const initRequest = {
      name: 'Test Garage',
      floors: [
        { number: 1, bays: 5, spotsPerBay: 10 },
        { number: 2, bays: 4, spotsPerBay: 12 }
      ]
    };

    it('should successfully initialize garage', async () => {
      const mockResult = {
        id: 'garage-new',
        name: 'Test Garage',
        totalSpots: 98,
        floors: initRequest.floors.map(f => ({
          id: `floor-${f.number}`,
          number: f.number,
          totalSpots: f.bays * f.spotsPerBay,
          bays: f.bays
        }))
      };

      mockRequest.body = initRequest;
      mockGarageService.initializeGarage.mockResolvedValue(mockResult);

      await garageController.initializeGarage(mockRequest as any, mockResponse as any);

      expect(mockGarageService.initializeGarage).toHaveBeenCalledWith({
        name: 'Test Garage',
        floors: initRequest.floors
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Garage initialized successfully',
        data: mockResult,
        timestamp: expect.any(String)
      });
    });

    it('should handle already initialized garage', async () => {
      mockRequest.body = initRequest;
      mockGarageService.initializeGarage.mockRejectedValue(
        new Error('Garage already initialized')
      );

      await garageController.initializeGarage(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Garage already exists',
        errors: ['Garage is already initialized. Use update endpoints to modify configuration.'],
        timestamp: expect.any(String)
      });
    });

    it('should handle initialization validation errors', async () => {
      mockRequest.body = {
        name: '',
        floors: []
      };

      mockGarageService.initializeGarage.mockRejectedValue(
        new Error('Invalid garage configuration: name and floors are required')
      );

      await garageController.initializeGarage(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Garage initialization failed',
        errors: ['Invalid garage configuration: name and floors are required'],
        timestamp: expect.any(String)
      });
    });

    it('should handle complex floor configurations', async () => {
      const complexInit = {
        name: 'Multi-Level Garage',
        floors: [
          { number: 1, bays: 2, spotsPerBay: 5 },
          { number: 2, bays: 3, spotsPerBay: 8 },
          { number: 3, bays: 4, spotsPerBay: 10 },
          { number: -1, bays: 1, spotsPerBay: 15 } // Basement
        ]
      };

      const mockResult = {
        id: 'garage-complex',
        name: 'Multi-Level Garage',
        totalSpots: 79,
        floors: complexInit.floors.map(f => ({
          id: `floor-${f.number}`,
          number: f.number,
          totalSpots: f.bays * f.spotsPerBay
        }))
      };

      mockRequest.body = complexInit;
      mockGarageService.initializeGarage.mockResolvedValue(mockResult);

      await garageController.initializeGarage(mockRequest as any, mockResponse as any);

      expect(mockGarageService.initializeGarage).toHaveBeenCalledWith(complexInit);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateGarageRates', () => {
    it('should successfully update garage rates', async () => {
      const rateUpdates = {
        hourlyRate: 5.50,
        dailyRate: 35.00,
        monthlyRate: 150.00
      };

      const mockResult = {
        message: 'Rates updated successfully',
        updatedRates: rateUpdates,
        currentRates: {
          hourlyRate: 5.50,
          dailyRate: 35.00,
          monthlyRate: 150.00,
          weeklyRate: 120.00
        },
        updatedAt: '2023-06-15T12:00:00.000Z'
      };

      mockRequest.body = rateUpdates;
      mockGarageService.updateGarageRates.mockResolvedValue(mockResult);

      await garageController.updateGarageRates(mockRequest as any, mockResponse as any);

      expect(mockGarageService.updateGarageRates).toHaveBeenCalledWith(rateUpdates);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Rates updated successfully',
        data: {
          updatedRates: rateUpdates,
          currentRates: mockResult.currentRates,
          updatedAt: '2023-06-15T12:00:00.000Z'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle garage not initialized for rates update', async () => {
      mockRequest.body = { hourlyRate: 6.00 };
      mockGarageService.updateGarageRates.mockRejectedValue(
        new Error('Garage not initialized')
      );

      await garageController.updateGarageRates(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Garage not initialized',
        errors: ['Please initialize the garage first using POST /api/v1/garage/initialize'],
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid rate values', async () => {
      mockRequest.body = {
        hourlyRate: -5.00,
        dailyRate: 'invalid'
      };

      mockGarageService.updateGarageRates.mockRejectedValue(
        new Error('Invalid rate values provided')
      );

      await garageController.updateGarageRates(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rate update failed',
        errors: ['Invalid rate values provided'],
        timestamp: expect.any(String)
      });
    });

    it('should handle partial rate updates', async () => {
      const partialUpdate = { hourlyRate: 7.25 };
      
      const mockResult = {
        message: 'Partial rates updated',
        updatedRates: partialUpdate,
        currentRates: {
          hourlyRate: 7.25,
          dailyRate: 35.00,
          monthlyRate: 150.00
        },
        updatedAt: '2023-06-15T12:00:00.000Z'
      };

      mockRequest.body = partialUpdate;
      mockGarageService.updateGarageRates.mockResolvedValue(mockResult);

      await garageController.updateGarageRates(mockRequest as any, mockResponse as any);

      expect(mockGarageService.updateGarageRates).toHaveBeenCalledWith(partialUpdate);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            updatedRates: partialUpdate
          })
        })
      );
    });

    it('should handle empty rate updates', async () => {
      mockRequest.body = {};
      
      mockGarageService.updateGarageRates.mockRejectedValue(
        new Error('No rate updates provided')
      );

      await garageController.updateGarageRates(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service unavailability gracefully', async () => {
      mockGarageService.getGarageConfiguration.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      await garageController.getGarageConfiguration(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to retrieve garage configuration'
        })
      );
    });

    it('should handle concurrent initialization attempts', async () => {
      const initRequest = {
        name: 'Concurrent Test',
        floors: [{ number: 1, bays: 2, spotsPerBay: 5 }]
      };

      // First request succeeds
      mockGarageService.initializeGarage.mockResolvedValueOnce({
        id: 'garage-1',
        name: 'Concurrent Test',
        totalSpots: 10
      });

      // Second request fails due to already initialized
      mockGarageService.initializeGarage.mockRejectedValueOnce(
        new Error('Garage already initialized')
      );

      const req1 = createMockRequest({ body: initRequest });
      const res1 = createMockResponse();
      const req2 = createMockRequest({ body: initRequest });
      const res2 = createMockResponse();

      await Promise.all([
        garageController.initializeGarage(req1 as any, res1 as any),
        garageController.initializeGarage(req2 as any, res2 as any)
      ]);

      expect(res1.status).toHaveBeenCalledWith(201);
      expect(res2.status).toHaveBeenCalledWith(409);
    });

    it('should validate floor number constraints', async () => {
      const invalidFloorRequest = {
        name: 'Invalid Floors',
        floors: [
          { number: 0, bays: 1, spotsPerBay: 5 }, // Floor 0 might be invalid
          { number: 1, bays: 0, spotsPerBay: 5 }, // Zero bays
          { number: 2, bays: 5, spotsPerBay: 0 }  // Zero spots per bay
        ]
      };

      mockRequest.body = invalidFloorRequest;
      mockGarageService.initializeGarage.mockRejectedValue(
        new Error('Invalid floor configuration: bays and spotsPerBay must be greater than 0')
      );

      await garageController.initializeGarage(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Garage initialization failed'
        })
      );
    });

    it('should handle large garage configurations', async () => {
      const largeGarageRequest = {
        name: 'Mega Garage',
        floors: Array.from({ length: 10 }, (_, i) => ({
          number: i + 1,
          bays: 20,
          spotsPerBay: 50
        }))
      };

      const mockResult = {
        id: 'garage-mega',
        name: 'Mega Garage',
        totalSpots: 10000,
        floors: largeGarageRequest.floors.map(f => ({
          id: `floor-${f.number}`,
          number: f.number,
          totalSpots: 1000
        }))
      };

      mockRequest.body = largeGarageRequest;
      mockGarageService.initializeGarage.mockResolvedValue(mockResult);

      await garageController.initializeGarage(mockRequest as any, mockResponse as any);

      expect(mockGarageService.initializeGarage).toHaveBeenCalledWith(largeGarageRequest);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should handle malformed request bodies', async () => {
      mockRequest.body = {
        name: null,
        floors: 'invalid'
      };

      mockGarageService.initializeGarage.mockRejectedValue(
        new Error('Malformed request body')
      );

      await garageController.initializeGarage(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle network timeouts gracefully', async () => {
      mockGarageService.getGarageConfiguration.mockRejectedValue(
        new Error('Request timeout')
      );

      await garageController.getGarageConfiguration(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: ['Request timeout']
        })
      );
    });

    it('should handle query parameters with special characters', async () => {
      mockRequest.query = {
        includeStats: 'true&malicious=value',
        includeSpots: '<script>alert("xss")</script>'
      };

      mockGarageService.getGarageConfiguration.mockResolvedValue({
        id: 'garage-1',
        name: 'Test Garage'
      });

      await garageController.getGarageConfiguration(mockRequest as any, mockResponse as any);

      // Should treat non-'true' values as false
      expect(mockGarageService.getGarageConfiguration).toHaveBeenCalledWith({
        includeStats: false, // 'true&malicious=value' !== 'true'
        includeSpots: false  // script tag !== 'true'
      });
    });
  });
});