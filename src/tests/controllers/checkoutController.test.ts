import { Request, Response } from 'express';
import { CheckoutController } from '../../controllers/checkoutController';
import { CheckoutService } from '../../services/checkoutService';
import {
  createMockRequest,
  createMockResponse,
  mockConsole,
  expectSuccessResponse,
  expectErrorResponse
} from '../helpers/testUtils';

// Mock services
jest.mock('../../services/checkoutService');

const MockedCheckoutService = CheckoutService as jest.MockedClass<typeof CheckoutService>;

describe('CheckoutController', () => {
  let checkoutController: CheckoutController;
  let mockRequest: ReturnType<typeof createMockRequest>;
  let mockResponse: ReturnType<typeof createMockResponse>;
  let mockCheckoutService: jest.Mocked<CheckoutService>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();

    mockCheckoutService = {
      checkOutVehicle: jest.fn(),
      simulateCheckout: jest.fn(),
      getCheckoutStats: jest.fn(),
      getVehiclesReadyForCheckout: jest.fn(),
      forceCheckout: jest.fn(),
    } as any;

    MockedCheckoutService.mockImplementation(() => mockCheckoutService);
    checkoutController = new CheckoutController();
    jest.clearAllMocks();
  });

  mockConsole();

  describe('checkOut', () => {
    const validCheckoutData = {
      licensePlate: 'ABC123',
      applyGracePeriod: false,
      removeRecord: true,
      checkOutTime: '2023-06-15T12:00:00.000Z'
    };

    it('should successfully check out a vehicle', async () => {
      const mockResult = {
        success: true,
        message: 'Vehicle checked out successfully',
        data: {
          sessionId: 'session-123',
          licensePlate: 'ABC123',
          spotId: 'spot-456',
          checkoutTime: '2023-06-15T12:00:00.000Z',
          duration: '02:30:00',
          totalCost: 12.50
        }
      };

      mockRequest.body = validCheckoutData;
      mockCheckoutService.checkOutVehicle.mockReturnValue(mockResult);

      await checkoutController.checkOut(mockRequest as any, mockResponse as any);

      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith('ABC123', {
        applyGracePeriod: false,
        removeRecord: true,
        checkOutTime: '2023-06-15T12:00:00.000Z'
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        ...mockResult,
        timestamp: expect.any(String)
      });
    });

    it('should use default values for optional parameters', async () => {
      const mockResult = {
        success: true,
        message: 'Vehicle checked out successfully',
        data: { sessionId: 'session-123' }
      };

      mockRequest.body = { licensePlate: 'ABC123' };
      mockCheckoutService.checkOutVehicle.mockReturnValue(mockResult);

      await checkoutController.checkOut(mockRequest as any, mockResponse as any);

      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith('ABC123', {
        applyGracePeriod: false,
        removeRecord: true,
        checkOutTime: undefined
      });
    });

    it('should handle vehicle not found error', async () => {
      mockRequest.body = validCheckoutData;
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Vehicle not found in parking garage');
      });

      await checkoutController.checkOut(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Vehicle not found',
        errors: ['Vehicle not found in parking garage'],
        timestamp: expect.any(String)
      });
    });

    it('should handle vehicle already checked out error', async () => {
      mockRequest.body = validCheckoutData;
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Vehicle already checked out');
      });

      await checkoutController.checkOut(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Vehicle already checked out',
        errors: ['Vehicle already checked out'],
        timestamp: expect.any(String)
      });
    });

    it('should handle billing calculation error', async () => {
      mockRequest.body = validCheckoutData;
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Failed to calculate parking fee');
      });

      await checkoutController.checkOut(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Billing calculation failed',
        errors: ['Failed to calculate parking fee'],
        timestamp: expect.any(String)
      });
    });

    it('should handle spot release error', async () => {
      mockRequest.body = validCheckoutData;
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Failed to release spot');
      });

      await checkoutController.checkOut(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Spot release failed',
        errors: ['Failed to release spot'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('simulateCheckout', () => {
    it('should successfully simulate checkout', async () => {
      const mockSimulation = {
        success: true,
        message: 'Checkout simulation completed',
        simulation: {
          wouldSucceed: true,
          estimatedCost: 15.75,
          duration: '03:15:00',
          spotWouldBeFreed: 'spot-123'
        }
      };

      mockRequest.body = {
        licensePlate: 'TEST123',
        applyGracePeriod: true,
        checkOutTime: '2023-06-15T15:00:00.000Z'
      };

      mockCheckoutService.simulateCheckout.mockReturnValue(mockSimulation);

      await checkoutController.simulateCheckout(mockRequest as any, mockResponse as any);

      expect(mockCheckoutService.simulateCheckout).toHaveBeenCalledWith('TEST123', {
        applyGracePeriod: true,
        checkOutTime: '2023-06-15T15:00:00.000Z'
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        ...mockSimulation,
        timestamp: expect.any(String)
      });
    });

    it('should handle missing license plate', async () => {
      mockRequest.body = { applyGracePeriod: true };

      await checkoutController.simulateCheckout(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'License plate is required for simulation',
        timestamp: expect.any(String)
      });
    });

    it('should use default values for optional parameters', async () => {
      const mockSimulation = {
        success: true,
        message: 'Simulation completed',
        simulation: { wouldSucceed: true }
      };

      mockRequest.body = { licensePlate: 'TEST123' };
      mockCheckoutService.simulateCheckout.mockReturnValue(mockSimulation);

      await checkoutController.simulateCheckout(mockRequest as any, mockResponse as any);

      expect(mockCheckoutService.simulateCheckout).toHaveBeenCalledWith('TEST123', {
        applyGracePeriod: false,
        checkOutTime: undefined
      });
    });

    it('should handle simulation errors', async () => {
      mockRequest.body = { licensePlate: 'TEST123' };
      mockCheckoutService.simulateCheckout.mockImplementation(() => {
        throw new Error('Simulation service unavailable');
      });

      await checkoutController.simulateCheckout(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Checkout simulation failed',
        errors: ['Simulation service unavailable'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('getCheckoutStats', () => {
    it('should return checkout statistics', async () => {
      const mockStats = {
        vehicles: {
          totalCheckedOut: 150,
          stillParked: 45,
          averageParkingDuration: '2.5 hours'
        },
        spots: {
          totalSpots: 200,
          availableSpots: 155,
          occupancyRate: 22.5
        },
        revenue: {
          totalRevenue: 3750.50,
          todayRevenue: 275.25,
          pendingRevenue: 125.00
        }
      };

      mockCheckoutService.getCheckoutStats.mockReturnValue(mockStats);

      await checkoutController.getCheckoutStats(mockRequest as any, mockResponse as any);

      expect(mockCheckoutService.getCheckoutStats).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Checkout statistics retrieved successfully',
        data: { statistics: mockStats },
        timestamp: expect.any(String)
      });
    });

    it('should handle statistics retrieval errors', async () => {
      mockCheckoutService.getCheckoutStats.mockImplementation(() => {
        throw new Error('Stats database unavailable');
      });

      await checkoutController.getCheckoutStats(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve checkout statistics',
        errors: ['Stats database unavailable'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('getVehiclesReadyForCheckout', () => {
    it('should return vehicles ready for checkout', async () => {
      const mockVehicles = [
        {
          licensePlate: 'ABC123',
          spotId: 'spot-1',
          checkinTime: '2023-06-15T08:00:00.000Z',
          currentCost: 20.00,
          duration: '04:00:00'
        },
        {
          licensePlate: 'XYZ789',
          spotId: 'spot-2',
          checkinTime: '2023-06-15T07:30:00.000Z',
          currentCost: 22.50,
          duration: '04:30:00'
        }
      ];

      mockRequest.query = { minMinutes: '30' };
      mockCheckoutService.getVehiclesReadyForCheckout.mockReturnValue(mockVehicles);

      await checkoutController.getVehiclesReadyForCheckout(mockRequest as any, mockResponse as any);

      expect(mockCheckoutService.getVehiclesReadyForCheckout).toHaveBeenCalledWith(30);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Found 2 vehicle(s) ready for checkout',
        data: {
          count: 2,
          vehicles: mockVehicles,
          filters: {
            minMinutes: 30
          }
        },
        timestamp: expect.any(String)
      });
    });

    it('should use default minMinutes value', async () => {
      mockCheckoutService.getVehiclesReadyForCheckout.mockReturnValue([]);

      await checkoutController.getVehiclesReadyForCheckout(mockRequest as any, mockResponse as any);

      expect(mockCheckoutService.getVehiclesReadyForCheckout).toHaveBeenCalledWith(0);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filters: { minMinutes: 0 }
          })
        })
      );
    });

    it('should handle service errors', async () => {
      mockCheckoutService.getVehiclesReadyForCheckout.mockImplementation(() => {
        throw new Error('Vehicle service unavailable');
      });

      await checkoutController.getVehiclesReadyForCheckout(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve vehicles ready for checkout',
        errors: ['Vehicle service unavailable'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('getCurrentEstimate', () => {
    it('should return current parking estimate', async () => {
      const mockSimulation = {
        success: true,
        message: 'Estimate calculated',
        simulation: {
          estimatedDuration: '02:45:00',
          estimatedBilling: {
            baseCost: 15.50,
            totalCost: 15.50
          },
          spotId: 'spot-123',
          currentStatus: 'parked'
        }
      };

      mockRequest.params = { licensePlate: 'ABC123' };
      mockCheckoutService.simulateCheckout.mockReturnValue(mockSimulation);

      await checkoutController.getCurrentEstimate(mockRequest as any, mockResponse as any);

      expect(mockCheckoutService.simulateCheckout).toHaveBeenCalledWith('ABC123', {
        applyGracePeriod: false
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Current parking estimate calculated',
        data: {
          licensePlate: 'ABC123',
          estimate: {
            duration: '02:45:00',
            billing: mockSimulation.simulation.estimatedBilling,
            spotId: 'spot-123',
            status: 'parked'
          },
          note: 'This is an estimate. Final amount may vary based on actual checkout time.'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle vehicle not found for estimate', async () => {
      const mockSimulation = {
        success: false,
        message: 'Vehicle not currently parked',
        error: 'No active parking session found'
      };

      mockRequest.params = { licensePlate: 'NOTFOUND' };
      mockCheckoutService.simulateCheckout.mockReturnValue(mockSimulation);

      await checkoutController.getCurrentEstimate(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot get estimate: Vehicle not currently parked',
        errors: ['No active parking session found'],
        timestamp: expect.any(String)
      });
    });

    it('should handle estimation service errors', async () => {
      mockRequest.params = { licensePlate: 'ABC123' };
      mockCheckoutService.simulateCheckout.mockImplementation(() => {
        throw new Error('Estimation service down');
      });

      await checkoutController.getCurrentEstimate(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to calculate parking estimate',
        errors: ['Estimation service down'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('forceCheckout', () => {
    it('should successfully perform force checkout with valid admin key', async () => {
      const mockResult = {
        success: true,
        message: 'Vehicle forcefully checked out',
        data: {
          licensePlate: 'ABC123',
          reason: 'Emergency evacuation',
          forceTimestamp: '2023-06-15T12:00:00.000Z'
        }
      };

      mockRequest.body = {
        licensePlate: 'ABC123',
        reason: 'Emergency evacuation',
        adminKey: 'admin123'
      };

      mockCheckoutService.forceCheckout.mockReturnValue(mockResult);

      await checkoutController.forceCheckout(mockRequest as any, mockResponse as any);

      expect(mockCheckoutService.forceCheckout).toHaveBeenCalledWith('ABC123', 'Emergency evacuation');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        ...mockResult,
        message: 'Vehicle forcefully checked out',
        timestamp: expect.any(String)
      });
    });

    it('should reject invalid admin key', async () => {
      mockRequest.body = {
        licensePlate: 'ABC123',
        reason: 'Test reason',
        adminKey: 'invalid-key'
      };

      await checkoutController.forceCheckout(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid administrative access key',
        timestamp: expect.any(String)
      });

      expect(mockCheckoutService.forceCheckout).not.toHaveBeenCalled();
    });

    it('should handle force checkout errors', async () => {
      mockRequest.body = {
        licensePlate: 'ABC123',
        reason: 'Test reason',
        adminKey: 'admin123'
      };

      mockCheckoutService.forceCheckout.mockImplementation(() => {
        throw new Error('Forced checkout failed due to system lock');
      });

      await checkoutController.forceCheckout(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forced checkout operation failed',
        errors: ['Forced checkout failed due to system lock'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockStats = {
        spots: { availableSpots: 150 },
        vehicles: { stillParked: 50 },
        revenue: {
          totalRevenue: 5000.00,
          pendingRevenue: 250.00
        }
      };

      mockCheckoutService.getCheckoutStats.mockReturnValue(mockStats);

      await checkoutController.healthCheck(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          service: 'checkout',
          status: 'operational',
          summary: {
            availableSpots: 150,
            vehiclesParked: 50,
            totalRevenue: 5000.00,
            pendingRevenue: 250.00
          }
        },
        timestamp: expect.any(String)
      });
    });

    it('should return unhealthy status on service failure', async () => {
      mockCheckoutService.getCheckoutStats.mockImplementation(() => {
        throw new Error('Health check service down');
      });

      await checkoutController.healthCheck(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service health check failed',
        errors: ['Health check service down'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle duration calculation error', async () => {
      mockRequest.body = { licensePlate: 'ABC123' };
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Unable to calculate parking duration');
      });

      await checkoutController.checkOut(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid parking duration',
        errors: ['Unable to calculate parking duration'],
        timestamp: expect.any(String)
      });
    });

    it('should handle data integrity error', async () => {
      mockRequest.body = { licensePlate: 'ABC123' };
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Data integrity violation detected');
      });

      await checkoutController.checkOut(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Data integrity issue',
        errors: ['Data integrity violation detected'],
        timestamp: expect.any(String)
      });
    });

    it('should handle license plate validation error', async () => {
      mockRequest.body = { licensePlate: '' };
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Invalid license plate format');
      });

      await checkoutController.checkOut(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid license plate',
        errors: ['Invalid license plate format'],
        timestamp: expect.any(String)
      });
    });

    it('should handle rollback errors', async () => {
      mockRequest.body = { licensePlate: 'ABC123' };
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Transaction failed, rollback initiated');
      });

      await checkoutController.checkOut(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Checkout operation failed',
        errors: ['Transaction failed, rollback initiated'],
        timestamp: expect.any(String)
      });
    });

    it('should handle generic errors', async () => {
      mockRequest.body = { licensePlate: 'ABC123' };
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Unknown system error');
      });

      await checkoutController.checkOut(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error during checkout',
        errors: ['Unknown system error'],
        timestamp: expect.any(String)
      });
    });

    it('should handle concurrent checkout attempts', async () => {
      const checkoutData = { licensePlate: 'ABC123' };
      
      mockCheckoutService.checkOutVehicle.mockReturnValue({
        success: true,
        message: 'Vehicle checked out',
        data: { sessionId: 'session-123' }
      });

      // Simulate concurrent requests
      const promises = Array(3).fill(null).map(() => {
        const req = createMockRequest({ body: checkoutData });
        const res = createMockResponse();
        return checkoutController.checkOut(req as any, res as any);
      });

      await Promise.all(promises);

      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledTimes(3);
    });

    it('should handle malformed query parameters', async () => {
      mockRequest.query = { minMinutes: 'invalid' };
      mockCheckoutService.getVehiclesReadyForCheckout.mockReturnValue([]);

      await checkoutController.getVehiclesReadyForCheckout(mockRequest as any, mockResponse as any);

      // Should convert 'invalid' to NaN, which parseInt handles as 0
      expect(mockCheckoutService.getVehiclesReadyForCheckout).toHaveBeenCalledWith(0);
    });
  });
});