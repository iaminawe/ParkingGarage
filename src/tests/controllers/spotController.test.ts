import { Request, Response } from 'express';
import { SpotController } from '../../controllers/spotController';
import { SpotService } from '../../services/spotService';
import { SpotAssignmentService } from '../../services/SpotAssignmentService';
import {
  createMockRequest,
  createMockResponse,
  mockConsole,
  expectSuccessResponse,
  expectErrorResponse
} from '../helpers/testUtils';

// Mock services
jest.mock('../../services/spotService');
jest.mock('../../services/SpotAssignmentService');

const MockedSpotService = SpotService as jest.MockedClass<typeof SpotService>;
const MockedSpotAssignmentService = SpotAssignmentService as jest.MockedClass<typeof SpotAssignmentService>;

describe('SpotController', () => {
  let spotController: SpotController;
  let mockRequest: ReturnType<typeof createMockRequest>;
  let mockResponse: ReturnType<typeof createMockResponse>;
  let mockSpotService: jest.Mocked<SpotService>;
  let mockSpotAssignmentService: jest.Mocked<SpotAssignmentService>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();

    mockSpotService = {
      getAllSpots: jest.fn(),
      getSpotById: jest.fn(),
      getAvailableSpots: jest.fn(),
      getSpotsByFloor: jest.fn(),
      getSpotsByType: jest.fn(),
      updateSpotStatus: jest.fn(),
      markSpotOutOfService: jest.fn(),
      markSpotInService: jest.fn(),
      getSpotOccupancyHistory: jest.fn(),
    } as any;

    mockSpotAssignmentService = {
      getOptimalSpot: jest.fn(),
      simulateAssignment: jest.fn(),
      getAssignmentStats: jest.fn(),
      validateSpotAssignment: jest.fn(),
    } as any;

    MockedSpotService.mockImplementation(() => mockSpotService);
    MockedSpotAssignmentService.mockImplementation(() => mockSpotAssignmentService);

    spotController = new SpotController();
    jest.clearAllMocks();
  });

  mockConsole();

  describe('getAllSpots', () => {
    it('should return all spots successfully', async () => {
      const mockSpots = [
        {
          id: 'spot-1',
          number: 'A001',
          floor: 1,
          type: 'STANDARD',
          status: 'AVAILABLE',
          isActive: true
        },
        {
          id: 'spot-2',
          number: 'A002',
          floor: 1,
          type: 'COMPACT',
          status: 'OCCUPIED',
          isActive: true
        }
      ];

      mockSpotService.getAllSpots.mockResolvedValue(mockSpots);

      await spotController.getAllSpots(mockRequest as any, mockResponse as any);

      expect(mockSpotService.getAllSpots).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'All spots retrieved successfully',
        data: {
          spots: mockSpots,
          totalSpots: 2,
          availableSpots: 1,
          occupiedSpots: 1
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle empty spots list', async () => {
      mockSpotService.getAllSpots.mockResolvedValue([]);

      await spotController.getAllSpots(mockRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            spots: [],
            totalSpots: 0,
            availableSpots: 0,
            occupiedSpots: 0
          })
        })
      );
    });

    it('should handle service errors', async () => {
      mockSpotService.getAllSpots.mockRejectedValue(
        new Error('Database connection failed')
      );

      await spotController.getAllSpots(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 500, 'Failed to retrieve spots');
    });
  });

  describe('getSpotById', () => {
    it('should return spot by ID successfully', async () => {
      const mockSpot = {
        id: 'spot-123',
        number: 'B015',
        floor: 2,
        type: 'STANDARD',
        status: 'AVAILABLE',
        isActive: true,
        dimensions: { width: 2.5, length: 5.0 },
        lastOccupied: null,
        occupancyHistory: []
      };

      mockRequest.params = { id: 'spot-123' };
      mockSpotService.getSpotById.mockResolvedValue(mockSpot);

      await spotController.getSpotById(mockRequest as any, mockResponse as any);

      expect(mockSpotService.getSpotById).toHaveBeenCalledWith('spot-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Spot retrieved successfully',
        data: mockSpot,
        timestamp: expect.any(String)
      });
    });

    it('should handle spot not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockSpotService.getSpotById.mockResolvedValue(null);

      await spotController.getSpotById(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 404, 'Spot not found');
    });

    it('should handle invalid spot ID format', async () => {
      mockRequest.params = { id: 'invalid-format' };
      mockSpotService.getSpotById.mockRejectedValue(
        new Error('Invalid spot ID format')
      );

      await spotController.getSpotById(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Invalid spot ID format');
    });
  });

  describe('getAvailableSpots', () => {
    it('should return available spots with filters', async () => {
      const mockSpots = [
        {
          id: 'spot-1',
          number: 'A001',
          floor: 1,
          type: 'STANDARD',
          status: 'AVAILABLE'
        },
        {
          id: 'spot-2',
          number: 'B002',
          floor: 2,
          type: 'COMPACT',
          status: 'AVAILABLE'
        }
      ];

      mockRequest.query = { 
        type: 'STANDARD',
        floor: '1'
      };

      mockSpotService.getAvailableSpots.mockResolvedValue(mockSpots);

      await spotController.getAvailableSpots(mockRequest as any, mockResponse as any);

      expect(mockSpotService.getAvailableSpots).toHaveBeenCalledWith({
        type: 'STANDARD',
        floor: 1
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Available spots retrieved successfully',
        data: {
          spots: mockSpots,
          count: 2,
          filters: {
            type: 'STANDARD',
            floor: 1
          }
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle no available spots', async () => {
      mockSpotService.getAvailableSpots.mockResolvedValue([]);

      await spotController.getAvailableSpots(mockRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No available spots found',
          data: expect.objectContaining({
            spots: [],
            count: 0
          })
        })
      );
    });

    it('should handle invalid query parameters', async () => {
      mockRequest.query = { 
        type: 'INVALID_TYPE',
        floor: 'not-a-number'
      };

      mockSpotService.getAvailableSpots.mockRejectedValue(
        new Error('Invalid query parameters')
      );

      await spotController.getAvailableSpots(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Invalid query parameters');
    });
  });

  describe('updateSpotStatus', () => {
    it('should update spot status successfully', async () => {
      const spotId = 'spot-123';
      const newStatus = 'OCCUPIED';
      
      mockRequest.params = { id: spotId };
      mockRequest.body = { 
        status: newStatus,
        vehicleId: 'vehicle-456',
        updatedBy: 'system'
      };

      const mockResult = {
        success: true,
        message: 'Spot status updated successfully',
        spot: {
          id: spotId,
          status: newStatus,
          updatedAt: '2023-06-15T12:00:00.000Z',
          vehicleId: 'vehicle-456'
        }
      };

      mockSpotService.updateSpotStatus.mockResolvedValue(mockResult);

      await spotController.updateSpotStatus(mockRequest as any, mockResponse as any);

      expect(mockSpotService.updateSpotStatus).toHaveBeenCalledWith(spotId, {
        status: newStatus,
        vehicleId: 'vehicle-456',
        updatedBy: 'system'
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Spot status updated successfully',
        data: mockResult.spot,
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid status transition', async () => {
      mockRequest.params = { id: 'spot-123' };
      mockRequest.body = { status: 'INVALID_STATUS' };

      mockSpotService.updateSpotStatus.mockRejectedValue(
        new Error('Invalid status transition: AVAILABLE -> INVALID_STATUS')
      );

      await spotController.updateSpotStatus(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Invalid status transition');
    });

    it('should handle concurrent status updates', async () => {
      mockRequest.params = { id: 'spot-123' };
      mockRequest.body = { status: 'OCCUPIED' };

      mockSpotService.updateSpotStatus.mockRejectedValue(
        new Error('Spot status was changed by another process')
      );

      await spotController.updateSpotStatus(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 409, 'Spot status was changed by another process');
    });
  });

  describe('markSpotOutOfService', () => {
    it('should mark spot out of service successfully', async () => {
      const spotId = 'spot-123';
      mockRequest.params = { id: spotId };
      mockRequest.body = { 
        reason: 'Maintenance required',
        estimatedDuration: '2 hours'
      };

      const mockResult = {
        success: true,
        message: 'Spot marked out of service',
        spot: {
          id: spotId,
          status: 'OUT_OF_SERVICE',
          maintenanceReason: 'Maintenance required',
          estimatedBackInService: '2023-06-15T14:00:00.000Z'
        }
      };

      mockSpotService.markSpotOutOfService.mockResolvedValue(mockResult);

      await spotController.markSpotOutOfService(mockRequest as any, mockResponse as any);

      expect(mockSpotService.markSpotOutOfService).toHaveBeenCalledWith(spotId, {
        reason: 'Maintenance required',
        estimatedDuration: '2 hours'
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expectSuccessResponse(mockResponse);
    });

    it('should handle spot already occupied error', async () => {
      mockRequest.params = { id: 'spot-123' };
      mockRequest.body = { reason: 'Cleaning' };

      mockSpotService.markSpotOutOfService.mockRejectedValue(
        new Error('Cannot mark occupied spot out of service')
      );

      await spotController.markSpotOutOfService(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Cannot mark occupied spot out of service');
    });
  });

  describe('markSpotInService', () => {
    it('should mark spot back in service successfully', async () => {
      const spotId = 'spot-123';
      mockRequest.params = { id: spotId };

      const mockResult = {
        success: true,
        message: 'Spot is back in service',
        spot: {
          id: spotId,
          status: 'AVAILABLE',
          backInServiceAt: '2023-06-15T12:00:00.000Z'
        }
      };

      mockSpotService.markSpotInService.mockResolvedValue(mockResult);

      await spotController.markSpotInService(mockRequest as any, mockResponse as any);

      expect(mockSpotService.markSpotInService).toHaveBeenCalledWith(spotId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expectSuccessResponse(mockResponse);
    });

    it('should handle spot not out of service error', async () => {
      mockRequest.params = { id: 'spot-123' };

      mockSpotService.markSpotInService.mockRejectedValue(
        new Error('Spot is not currently out of service')
      );

      await spotController.markSpotInService(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Spot is not currently out of service');
    });
  });

  describe('getOptimalSpot', () => {
    it('should return optimal spot for vehicle type', async () => {
      mockRequest.params = { vehicleType: 'STANDARD' };

      const mockOptimalSpot = {
        success: true,
        spot: {
          id: 'spot-optimal',
          number: 'C010',
          floor: 3,
          type: 'STANDARD',
          distanceFromEntrance: 50,
          score: 95.5
        },
        reasoning: [
          'Exact vehicle type match',
          'Close to entrance',
          'Recently cleaned'
        ]
      };

      mockSpotAssignmentService.getOptimalSpot.mockResolvedValue(mockOptimalSpot);

      await spotController.getOptimalSpot(mockRequest as any, mockResponse as any);

      expect(mockSpotAssignmentService.getOptimalSpot).toHaveBeenCalledWith('STANDARD');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Optimal spot found',
        data: mockOptimalSpot,
        timestamp: expect.any(String)
      });
    });

    it('should handle no optimal spot available', async () => {
      mockRequest.params = { vehicleType: 'OVERSIZED' };

      const mockResult = {
        success: false,
        message: 'No suitable spots available',
        reason: 'All oversized spots are occupied'
      };

      mockSpotAssignmentService.getOptimalSpot.mockResolvedValue(mockResult);

      await spotController.getOptimalSpot(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'No optimal spot available',
        data: mockResult,
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid vehicle type', async () => {
      mockRequest.params = { vehicleType: 'INVALID_TYPE' };

      mockSpotAssignmentService.getOptimalSpot.mockRejectedValue(
        new Error('Invalid vehicle type: INVALID_TYPE')
      );

      await spotController.getOptimalSpot(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Invalid vehicle type');
    });
  });

  describe('getSpotOccupancyHistory', () => {
    it('should return spot occupancy history', async () => {
      const spotId = 'spot-123';
      mockRequest.params = { id: spotId };
      mockRequest.query = { 
        startDate: '2023-06-01',
        endDate: '2023-06-15',
        limit: '50'
      };

      const mockHistory = [
        {
          id: 'history-1',
          spotId: spotId,
          vehicleId: 'vehicle-1',
          checkinTime: '2023-06-15T09:00:00.000Z',
          checkoutTime: '2023-06-15T11:30:00.000Z',
          duration: 9000000, // 2.5 hours in milliseconds
          cost: 12.50
        },
        {
          id: 'history-2',
          spotId: spotId,
          vehicleId: 'vehicle-2',
          checkinTime: '2023-06-14T14:00:00.000Z',
          checkoutTime: '2023-06-14T16:00:00.000Z',
          duration: 7200000, // 2 hours
          cost: 10.00
        }
      ];

      mockSpotService.getSpotOccupancyHistory.mockResolvedValue({
        history: mockHistory,
        totalSessions: 2,
        averageDuration: 8600000,
        totalRevenue: 22.50,
        utilizationRate: 65.5
      });

      await spotController.getSpotOccupancyHistory(mockRequest as any, mockResponse as any);

      expect(mockSpotService.getSpotOccupancyHistory).toHaveBeenCalledWith(spotId, {
        startDate: '2023-06-01',
        endDate: '2023-06-15',
        limit: 50
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Spot occupancy history retrieved successfully',
        data: {
          spotId: spotId,
          history: mockHistory,
          statistics: {
            totalSessions: 2,
            averageDuration: 8600000,
            totalRevenue: 22.50,
            utilizationRate: 65.5
          },
          filters: {
            startDate: '2023-06-01',
            endDate: '2023-06-15',
            limit: 50
          }
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle empty history', async () => {
      mockRequest.params = { id: 'unused-spot' };

      mockSpotService.getSpotOccupancyHistory.mockResolvedValue({
        history: [],
        totalSessions: 0,
        averageDuration: 0,
        totalRevenue: 0,
        utilizationRate: 0
      });

      await spotController.getSpotOccupancyHistory(mockRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            history: [],
            statistics: expect.objectContaining({
              totalSessions: 0
            })
          })
        })
      );
    });
  });

  describe('getSpotsByFloor', () => {
    it('should return spots filtered by floor', async () => {
      const floor = 2;
      mockRequest.params = { floor: floor.toString() };

      const mockSpots = [
        { id: 'spot-1', number: 'B001', floor: 2, status: 'AVAILABLE' },
        { id: 'spot-2', number: 'B002', floor: 2, status: 'OCCUPIED' }
      ];

      mockSpotService.getSpotsByFloor.mockResolvedValue(mockSpots);

      await spotController.getSpotsByFloor(mockRequest as any, mockResponse as any);

      expect(mockSpotService.getSpotsByFloor).toHaveBeenCalledWith(floor);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expectSuccessResponse(mockResponse);
    });

    it('should handle invalid floor number', async () => {
      mockRequest.params = { floor: 'invalid' };

      await spotController.getSpotsByFloor(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 400, 'Invalid floor number');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection timeouts', async () => {
      mockSpotService.getAllSpots.mockRejectedValue(
        new Error('ETIMEDOUT: Database connection timeout')
      );

      await spotController.getAllSpots(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 500, 'Failed to retrieve spots');
    });

    it('should handle concurrent spot reservations', async () => {
      const spotId = 'high-demand-spot';
      
      // Simulate multiple concurrent requests trying to occupy the same spot
      const requests = Array(3).fill(null).map(() => {
        const req = createMockRequest({
          params: { id: spotId },
          body: { status: 'OCCUPIED', vehicleId: `vehicle-${Math.random()}` }
        });
        const res = createMockResponse();
        return { req, res };
      });

      // First succeeds, others fail
      mockSpotService.updateSpotStatus
        .mockResolvedValueOnce({ success: true, spot: { id: spotId, status: 'OCCUPIED' } })
        .mockRejectedValue(new Error('Spot is no longer available'));

      await Promise.all(
        requests.map(({ req, res }) => 
          spotController.updateSpotStatus(req as any, res as any)
        )
      );

      // First should succeed
      expect(requests[0].res.status).toHaveBeenCalledWith(200);
      // Others should fail
      expect(requests[1].res.status).toHaveBeenCalledWith(500);
      expect(requests[2].res.status).toHaveBeenCalledWith(500);
    });

    it('should handle very large floor numbers', async () => {
      mockRequest.params = { floor: '999999' };

      mockSpotService.getSpotsByFloor.mockResolvedValue([]);

      await spotController.getSpotsByFloor(mockRequest as any, mockResponse as any);

      expect(mockSpotService.getSpotsByFloor).toHaveBeenCalledWith(999999);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle negative floor numbers (basement levels)', async () => {
      mockRequest.params = { floor: '-2' };

      const basementSpots = [
        { id: 'basement-1', number: 'B-001', floor: -2, status: 'AVAILABLE' }
      ];

      mockSpotService.getSpotsByFloor.mockResolvedValue(basementSpots);

      await spotController.getSpotsByFloor(mockRequest as any, mockResponse as any);

      expect(mockSpotService.getSpotsByFloor).toHaveBeenCalledWith(-2);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle malformed request bodies', async () => {
      mockRequest.params = { id: 'spot-123' };
      mockRequest.body = { status: null, vehicleId: undefined };

      mockSpotService.updateSpotStatus.mockRejectedValue(
        new Error('Invalid request body format')
      );

      await spotController.updateSpotStatus(mockRequest as any, mockResponse as any);

      expectErrorResponse(mockResponse, 500);
    });

    it('should validate spot assignment logic', async () => {
      mockRequest.params = { vehicleType: 'COMPACT' };

      const mockValidation = {
        isValid: true,
        compatibleSpots: 15,
        recommendedSpot: 'spot-optimal',
        efficiency: 0.87
      };

      mockSpotAssignmentService.validateSpotAssignment.mockResolvedValue(mockValidation);

      // This would be part of the optimal spot logic
      mockSpotAssignmentService.getOptimalSpot.mockResolvedValue({
        success: true,
        spot: { id: 'spot-optimal', type: 'COMPACT' }
      });

      await spotController.getOptimalSpot(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});