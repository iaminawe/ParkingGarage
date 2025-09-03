import { Request, Response } from 'express';
import { VehicleController } from '../../controllers/VehicleController';
import { VehicleService } from '../../services/vehicleService';
import { AuthRequest } from '../../middleware/auth';
import {
  createMockRequest,
  createMockResponse,
  createTestUser,
  createAuthenticatedRequest,
  createTestVehicle,
  mockConsole,
  expectSuccessResponse,
  expectErrorResponse
} from '../helpers/testUtils';

// Mock services
jest.mock('../../services/vehicleService');

const MockedVehicleService = VehicleService as jest.MockedClass<typeof VehicleService>;

describe('VehicleController', () => {
  let vehicleController: VehicleController;
  let mockRequest: ReturnType<typeof createMockRequest>;
  let mockResponse: ReturnType<typeof createMockResponse>;
  let mockVehicleService: jest.Mocked<VehicleService>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();

    mockVehicleService = {
      createVehicle: jest.fn(),
      getVehiclesByUserId: jest.fn(),
      getVehicleById: jest.fn(),
      updateVehicle: jest.fn(),
      deleteVehicle: jest.fn(),
      getVehicleByLicensePlate: jest.fn(),
      validateVehicleOwnership: jest.fn(),
      getVehicleHistory: jest.fn(),
      searchVehicles: jest.fn(),
      getVehicleStatistics: jest.fn(),
      bulkCreateVehicles: jest.fn(),
      exportVehicleData: jest.fn(),
    } as any;

    MockedVehicleService.mockImplementation(() => mockVehicleService);
    vehicleController = new VehicleController();
    jest.clearAllMocks();
  });

  mockConsole();

  describe('createVehicle', () => {
    const validVehicleData = {
      licensePlate: 'ABC123',
      make: 'Toyota',
      model: 'Camry',
      color: 'Blue',
      vehicleType: 'STANDARD',
      year: 2020
    };

    it('should create a new vehicle successfully', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: validVehicleData
      });

      const mockCreatedVehicle = {
        id: 'vehicle-123',
        userId: testUser.id,
        ...validVehicleData,
        createdAt: '2023-06-15T12:00:00.000Z',
        updatedAt: '2023-06-15T12:00:00.000Z'
      };

      mockVehicleService.createVehicle.mockResolvedValue(mockCreatedVehicle);

      await vehicleController.createVehicle(authenticatedRequest as any, mockResponse as any);

      expect(mockVehicleService.createVehicle).toHaveBeenCalledWith({
        ...validVehicleData,
        userId: testUser.id
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Vehicle created successfully',
        data: mockCreatedVehicle,
        timestamp: expect.any(String)
      });
    });

    it('should handle duplicate license plate error', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: validVehicleData
      });

      mockVehicleService.createVehicle.mockRejectedValue(
        new Error('Vehicle with this license plate already exists')
      );

      await vehicleController.createVehicle(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 409, 'Vehicle with this license plate already exists');
    });

    it('should handle validation errors', async () => {
      const testUser = createTestUser();
      const invalidData = { ...validVehicleData, licensePlate: '' };
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: invalidData
      });

      mockVehicleService.createVehicle.mockRejectedValue(
        new Error('License plate is required')
      );

      await vehicleController.createVehicle(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'License plate is required');
    });

    it('should handle unauthenticated requests', async () => {
      mockRequest.body = validVehicleData;
      mockRequest.user = undefined;

      await vehicleController.createVehicle(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 401, 'Authentication required');
      expect(mockVehicleService.createVehicle).not.toHaveBeenCalled();
    });
  });

  describe('getUserVehicles', () => {
    it('should return user vehicles successfully', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      const mockVehicles = [
        createTestVehicle(testUser.id, { licensePlate: 'ABC123' }),
        createTestVehicle(testUser.id, { licensePlate: 'XYZ789' })
      ];

      mockVehicleService.getVehiclesByUserId.mockResolvedValue(mockVehicles);

      await vehicleController.getUserVehicles(authenticatedRequest as any, mockResponse as any);

      expect(mockVehicleService.getVehiclesByUserId).toHaveBeenCalledWith(testUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User vehicles retrieved successfully',
        data: {
          vehicles: mockVehicles,
          totalVehicles: 2
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle empty vehicle list', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      mockVehicleService.getVehiclesByUserId.mockResolvedValue([]);

      await vehicleController.getUserVehicles(authenticatedRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicles: [],
            totalVehicles: 0
          })
        })
      );
    });

    it('should handle service errors', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      mockVehicleService.getVehiclesByUserId.mockRejectedValue(
        new Error('Database connection failed')
      );

      await vehicleController.getUserVehicles(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 500, 'Failed to retrieve user vehicles');
    });
  });

  describe('getVehicleById', () => {
    it('should return vehicle by ID successfully', async () => {
      const testUser = createTestUser();
      const vehicleId = 'vehicle-123';
      const mockVehicle = createTestVehicle(testUser.id, { id: vehicleId });

      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { id: vehicleId }
      });

      mockVehicleService.getVehicleById.mockResolvedValue(mockVehicle);
      mockVehicleService.validateVehicleOwnership.mockResolvedValue(true);

      await vehicleController.getVehicleById(authenticatedRequest as any, mockResponse as any);

      expect(mockVehicleService.getVehicleById).toHaveBeenCalledWith(vehicleId);
      expect(mockVehicleService.validateVehicleOwnership).toHaveBeenCalledWith(vehicleId, testUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expectSuccessResponse(mockResponse);
    });

    it('should handle vehicle not found', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { id: 'nonexistent' }
      });

      mockVehicleService.getVehicleById.mockResolvedValue(null);

      await vehicleController.getVehicleById(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 404, 'Vehicle not found');
    });

    it('should handle unauthorized access to vehicle', async () => {
      const testUser = createTestUser();
      const otherUserVehicle = createTestVehicle('other-user-id');

      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { id: otherUserVehicle.id }
      });

      mockVehicleService.getVehicleById.mockResolvedValue(otherUserVehicle);
      mockVehicleService.validateVehicleOwnership.mockResolvedValue(false);

      await vehicleController.getVehicleById(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 403, 'Access denied to this vehicle');
    });
  });

  describe('updateVehicle', () => {
    it('should update vehicle successfully', async () => {
      const testUser = createTestUser();
      const vehicleId = 'vehicle-123';
      const updateData = {
        color: 'Red',
        make: 'Honda',
        model: 'Accord'
      };

      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { id: vehicleId },
        body: updateData
      });

      const mockUpdatedVehicle = {
        id: vehicleId,
        userId: testUser.id,
        licensePlate: 'ABC123',
        ...updateData,
        updatedAt: '2023-06-15T12:30:00.000Z'
      };

      mockVehicleService.validateVehicleOwnership.mockResolvedValue(true);
      mockVehicleService.updateVehicle.mockResolvedValue(mockUpdatedVehicle);

      await vehicleController.updateVehicle(authenticatedRequest as any, mockResponse as any);

      expect(mockVehicleService.validateVehicleOwnership).toHaveBeenCalledWith(vehicleId, testUser.id);
      expect(mockVehicleService.updateVehicle).toHaveBeenCalledWith(vehicleId, updateData);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Vehicle updated successfully',
        data: mockUpdatedVehicle,
        timestamp: expect.any(String)
      });
    });

    it('should handle unauthorized vehicle update', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { id: 'other-vehicle' },
        body: { color: 'Blue' }
      });

      mockVehicleService.validateVehicleOwnership.mockResolvedValue(false);

      await vehicleController.updateVehicle(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 403, 'Access denied to this vehicle');
      expect(mockVehicleService.updateVehicle).not.toHaveBeenCalled();
    });

    it('should handle duplicate license plate on update', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { id: 'vehicle-123' },
        body: { licensePlate: 'EXISTING123' }
      });

      mockVehicleService.validateVehicleOwnership.mockResolvedValue(true);
      mockVehicleService.updateVehicle.mockRejectedValue(
        new Error('License plate already in use by another vehicle')
      );

      await vehicleController.updateVehicle(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 409, 'License plate already in use');
    });
  });

  describe('deleteVehicle', () => {
    it('should delete vehicle successfully', async () => {
      const testUser = createTestUser();
      const vehicleId = 'vehicle-to-delete';

      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { id: vehicleId }
      });

      mockVehicleService.validateVehicleOwnership.mockResolvedValue(true);
      mockVehicleService.deleteVehicle.mockResolvedValue({
        success: true,
        message: 'Vehicle deleted successfully',
        deletedAt: '2023-06-15T12:00:00.000Z'
      });

      await vehicleController.deleteVehicle(authenticatedRequest as any, mockResponse as any);

      expect(mockVehicleService.validateVehicleOwnership).toHaveBeenCalledWith(vehicleId, testUser.id);
      expect(mockVehicleService.deleteVehicle).toHaveBeenCalledWith(vehicleId);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expectSuccessResponse(mockResponse);
    });

    it('should handle vehicle with active parking sessions', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { id: 'active-vehicle' }
      });

      mockVehicleService.validateVehicleOwnership.mockResolvedValue(true);
      mockVehicleService.deleteVehicle.mockRejectedValue(
        new Error('Cannot delete vehicle with active parking sessions')
      );

      await vehicleController.deleteVehicle(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Cannot delete vehicle with active parking sessions');
    });

    it('should handle unauthorized vehicle deletion', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { id: 'unauthorized-vehicle' }
      });

      mockVehicleService.validateVehicleOwnership.mockResolvedValue(false);

      await vehicleController.deleteVehicle(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 403, 'Access denied to this vehicle');
      expect(mockVehicleService.deleteVehicle).not.toHaveBeenCalled();
    });
  });

  describe('getVehicleByLicensePlate', () => {
    it('should find vehicle by license plate successfully', async () => {
      const licensePlate = 'SEARCH123';
      const mockVehicle = createTestVehicle('user-123', { licensePlate });

      mockRequest.params = { licensePlate };
      mockVehicleService.getVehicleByLicensePlate.mockResolvedValue(mockVehicle);

      await vehicleController.getVehicleByLicensePlate(mockRequest as any, mockResponse as any);

      expect(mockVehicleService.getVehicleByLicensePlate).toHaveBeenCalledWith(licensePlate);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expectSuccessResponse(mockResponse);
    });

    it('should handle vehicle not found by license plate', async () => {
      mockRequest.params = { licensePlate: 'NOTFOUND' };
      mockVehicleService.getVehicleByLicensePlate.mockResolvedValue(null);

      await vehicleController.getVehicleByLicensePlate(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 404, 'Vehicle not found');
    });

    it('should handle invalid license plate format', async () => {
      mockRequest.params = { licensePlate: '' };

      await vehicleController.getVehicleByLicensePlate(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'License plate is required');
    });
  });

  describe('getVehicleHistory', () => {
    it('should return vehicle parking history', async () => {
      const testUser = createTestUser();
      const vehicleId = 'vehicle-with-history';

      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { id: vehicleId },
        query: { limit: '10', offset: '0' }
      });

      const mockHistory = {
        vehicleId: vehicleId,
        sessions: [
          {
            id: 'session-1',
            spotId: 'spot-A001',
            checkinTime: '2023-06-15T09:00:00.000Z',
            checkoutTime: '2023-06-15T11:30:00.000Z',
            duration: 9000000,
            cost: 15.50,
            location: 'Level 1, Spot A001'
          },
          {
            id: 'session-2',
            spotId: 'spot-B015',
            checkinTime: '2023-06-14T14:00:00.000Z',
            checkoutTime: '2023-06-14T16:45:00.000Z',
            duration: 9900000,
            cost: 18.25,
            location: 'Level 2, Spot B015'
          }
        ],
        totalSessions: 25,
        totalSpent: 287.50,
        averageDuration: 8100000,
        favoriteSpot: 'spot-A001'
      };

      mockVehicleService.validateVehicleOwnership.mockResolvedValue(true);
      mockVehicleService.getVehicleHistory.mockResolvedValue(mockHistory);

      await vehicleController.getVehicleHistory(authenticatedRequest as any, mockResponse as any);

      expect(mockVehicleService.validateVehicleOwnership).toHaveBeenCalledWith(vehicleId, testUser.id);
      expect(mockVehicleService.getVehicleHistory).toHaveBeenCalledWith(vehicleId, {
        limit: 10,
        offset: 0
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Vehicle history retrieved successfully',
        data: mockHistory,
        timestamp: expect.any(String)
      });
    });

    it('should handle empty vehicle history', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        params: { id: 'new-vehicle' }
      });

      const emptyHistory = {
        vehicleId: 'new-vehicle',
        sessions: [],
        totalSessions: 0,
        totalSpent: 0,
        averageDuration: 0,
        favoriteSpot: null
      };

      mockVehicleService.validateVehicleOwnership.mockResolvedValue(true);
      mockVehicleService.getVehicleHistory.mockResolvedValue(emptyHistory);

      await vehicleController.getVehicleHistory(authenticatedRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessions: [],
            totalSessions: 0
          })
        })
      );
    });
  });

  describe('searchVehicles', () => {
    it('should search vehicles with filters', async () => {
      mockRequest.query = {
        make: 'Toyota',
        model: 'Camry',
        color: 'Blue',
        vehicleType: 'STANDARD',
        limit: '20'
      };

      const mockResults = [
        createTestVehicle('user-1', { make: 'Toyota', model: 'Camry', color: 'Blue' }),
        createTestVehicle('user-2', { make: 'Toyota', model: 'Camry', color: 'Blue' })
      ];

      mockVehicleService.searchVehicles.mockResolvedValue({
        vehicles: mockResults,
        totalResults: 2,
        filters: {
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          vehicleType: 'STANDARD'
        }
      });

      await vehicleController.searchVehicles(mockRequest as any, mockResponse as any);

      expect(mockVehicleService.searchVehicles).toHaveBeenCalledWith({
        make: 'Toyota',
        model: 'Camry',
        color: 'Blue',
        vehicleType: 'STANDARD',
        limit: 20,
        offset: 0
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expectSuccessResponse(mockResponse);
    });

    it('should handle search with no results', async () => {
      mockRequest.query = { make: 'NonexistentMake' };

      mockVehicleService.searchVehicles.mockResolvedValue({
        vehicles: [],
        totalResults: 0,
        filters: { make: 'NonexistentMake' }
      });

      await vehicleController.searchVehicles(mockRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No vehicles found matching the criteria'
        })
      );
    });
  });

  describe('bulkCreateVehicles', () => {
    it('should create multiple vehicles successfully', async () => {
      const testUser = createTestUser();
      const vehiclesData = [
        {
          licensePlate: 'BULK001',
          make: 'Toyota',
          model: 'Prius',
          color: 'White',
          vehicleType: 'COMPACT'
        },
        {
          licensePlate: 'BULK002',
          make: 'Honda',
          model: 'Civic',
          color: 'Black',
          vehicleType: 'COMPACT'
        }
      ];

      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: { vehicles: vehiclesData }
      });

      const mockResult = {
        created: [
          { id: 'vehicle-1', licensePlate: 'BULK001', userId: testUser.id },
          { id: 'vehicle-2', licensePlate: 'BULK002', userId: testUser.id }
        ],
        failed: [],
        totalProcessed: 2,
        successCount: 2,
        failureCount: 0
      };

      mockVehicleService.bulkCreateVehicles.mockResolvedValue(mockResult);

      await vehicleController.bulkCreateVehicles(authenticatedRequest as any, mockResponse as any);

      expect(mockVehicleService.bulkCreateVehicles).toHaveBeenCalledWith(
        vehiclesData.map(v => ({ ...v, userId: testUser.id }))
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expectSuccessResponse(mockResponse);
    });

    it('should handle partial bulk creation failures', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: {
          vehicles: [
            { licensePlate: 'VALID001', make: 'Toyota', model: 'Camry' },
            { licensePlate: 'DUPLICATE', make: 'Honda', model: 'Civic' }
          ]
        }
      });

      const mockResult = {
        created: [{ id: 'vehicle-1', licensePlate: 'VALID001' }],
        failed: [
          {
            licensePlate: 'DUPLICATE',
            error: 'License plate already exists'
          }
        ],
        totalProcessed: 2,
        successCount: 1,
        failureCount: 1
      };

      mockVehicleService.bulkCreateVehicles.mockResolvedValue(mockResult);

      await vehicleController.bulkCreateVehicles(authenticatedRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(207); // Multi-status
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely long license plates', async () => {
      const testUser = createTestUser();
      const longLicensePlate = 'A'.repeat(50);

      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: {
          licensePlate: longLicensePlate,
          make: 'Test',
          model: 'Vehicle'
        }
      });

      mockVehicleService.createVehicle.mockRejectedValue(
        new Error('License plate exceeds maximum length')
      );

      await vehicleController.createVehicle(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'License plate exceeds maximum length');
    });

    it('should handle special characters in license plates', async () => {
      const testUser = createTestUser();
      const specialPlate = 'ABC-123!@#';

      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: {
          licensePlate: specialPlate,
          make: 'Test',
          model: 'Vehicle'
        }
      });

      mockVehicleService.createVehicle.mockRejectedValue(
        new Error('Invalid characters in license plate')
      );

      await vehicleController.createVehicle(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Invalid characters in license plate');
    });

    it('should handle concurrent vehicle operations', async () => {
      const testUser = createTestUser();
      const vehicleId = 'concurrent-vehicle';

      // Simulate concurrent update and delete
      const updateReq = createAuthenticatedRequest(testUser, {
        params: { id: vehicleId },
        body: { color: 'Red' }
      });
      const deleteReq = createAuthenticatedRequest(testUser, {
        params: { id: vehicleId }
      });

      mockVehicleService.validateVehicleOwnership.mockResolvedValue(true);
      mockVehicleService.updateVehicle.mockResolvedValue({
        id: vehicleId,
        color: 'Red'
      });
      mockVehicleService.deleteVehicle.mockRejectedValue(
        new Error('Vehicle was modified by another operation')
      );

      const updateRes = createMockResponse();
      const deleteRes = createMockResponse();

      await Promise.all([
        vehicleController.updateVehicle(updateReq as any, updateRes as any),
        vehicleController.deleteVehicle(deleteReq as any, deleteRes as any)
      ]);

      expect(updateRes.status).toHaveBeenCalledWith(200);
      expect(deleteRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle database connection failures', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser);

      mockVehicleService.getVehiclesByUserId.mockRejectedValue(
        new Error('ECONNREFUSED: Database connection refused')
      );

      await vehicleController.getUserVehicles(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 500, 'Failed to retrieve user vehicles');
    });

    it('should handle malformed JSON in request body', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: { make: null, model: undefined, color: { invalid: 'object' } }
      });

      mockVehicleService.createVehicle.mockRejectedValue(
        new Error('Invalid request body format')
      );

      await vehicleController.createVehicle(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Invalid request body format');
    });

    it('should validate vehicle type constraints', async () => {
      const testUser = createTestUser();
      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: {
          licensePlate: 'TEST123',
          make: 'Test',
          model: 'Vehicle',
          vehicleType: 'INVALID_TYPE'
        }
      });

      mockVehicleService.createVehicle.mockRejectedValue(
        new Error('Invalid vehicle type: INVALID_TYPE')
      );

      await vehicleController.createVehicle(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Invalid vehicle type');
    });

    it('should handle very large bulk operations', async () => {
      const testUser = createTestUser();
      const manyVehicles = Array(1000).fill(null).map((_, i) => ({
        licensePlate: `BULK${i.toString().padStart(4, '0')}`,
        make: 'Test',
        model: 'Vehicle'
      }));

      const authenticatedRequest = createAuthenticatedRequest(testUser, {
        body: { vehicles: manyVehicles }
      });

      mockVehicleService.bulkCreateVehicles.mockRejectedValue(
        new Error('Bulk operation exceeds maximum limit')
      );

      await vehicleController.bulkCreateVehicles(authenticatedRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Bulk operation exceeds maximum limit');
    });
  });
});