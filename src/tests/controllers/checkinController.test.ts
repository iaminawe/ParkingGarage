import { Request, Response } from 'express';
import { CheckinController } from '../../controllers/checkinController';
import { CheckinService } from '../../services/checkinService';
import { SpotService } from '../../services/spotService';
import { SpotAssignmentService } from '../../services/SpotAssignmentService';
import { VehicleType } from '../../types/models';
import {
  createMockRequest,
  createMockResponse,
  mockConsole,
  expectSuccessResponse,
  expectErrorResponse
} from '../helpers/testUtils';

// Mock services
jest.mock('../../services/checkinService');
jest.mock('../../services/spotService');
jest.mock('../../services/SpotAssignmentService');

const MockedCheckinService = CheckinService as jest.MockedClass<typeof CheckinService>;
const MockedSpotService = SpotService as jest.MockedClass<typeof SpotService>;
const MockedSpotAssignmentService = SpotAssignmentService as jest.MockedClass<typeof SpotAssignmentService>;

describe('CheckinController', () => {
  let checkinController: CheckinController;
  let mockRequest: ReturnType<typeof createMockRequest>;
  let mockResponse: ReturnType<typeof createMockResponse>;
  let mockCheckinService: jest.Mocked<CheckinService>;
  let mockSpotService: jest.Mocked<SpotService>;
  let mockSpotAssignmentService: jest.Mocked<SpotAssignmentService>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();

    // Create mock service instances
    mockCheckinService = {
      checkInVehicle: jest.fn(),
      simulateCheckin: jest.fn(),
      getCheckinStats: jest.fn(),
    } as any;

    mockSpotService = {
      getAvailableSpots: jest.fn(),
    } as any;

    mockSpotAssignmentService = {
      getAvailabilityByVehicleType: jest.fn(),
      simulateAssignment: jest.fn(),
      getAssignmentStats: jest.fn(),
    } as any;

    // Mock the constructors to return our mock instances
    MockedCheckinService.mockImplementation(() => mockCheckinService);
    MockedSpotService.mockImplementation(() => mockSpotService);
    MockedSpotAssignmentService.mockImplementation(() => mockSpotAssignmentService);

    checkinController = new CheckinController();
    jest.clearAllMocks();
  });

  mockConsole();

  describe('checkIn', () => {
    const validCheckInData = {
      licensePlate: 'ABC123',
      vehicleType: 'standard' as VehicleType,
      rateType: 'hourly'
    };

    it('should successfully check in a vehicle', async () => {
      const mockResult = {
        success: true,
        message: 'Vehicle checked in successfully',
        data: {
          sessionId: 'session-123',
          spotId: 'spot-456',
          checkinTime: '2023-06-15T10:00:00.000Z',
          estimatedCost: 5.00
        }
      };

      mockRequest.body = validCheckInData;
      mockCheckinService.checkInVehicle.mockReturnValue(mockResult);

      await checkinController.checkIn(mockRequest as any, mockResponse as any);

      expect(mockCheckinService.checkInVehicle).toHaveBeenCalledWith(
        'ABC123',
        'standard',
        'hourly'
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        ...mockResult,
        timestamp: expect.any(String)
      });
    });

    it('should use default rate type when not provided', async () => {
      const mockResult = {
        success: true,
        message: 'Vehicle checked in successfully',
        data: { sessionId: 'session-123' }
      };

      mockRequest.body = {
        licensePlate: 'ABC123',
        vehicleType: 'standard' as VehicleType
        // rateType not provided
      };

      mockCheckinService.checkInVehicle.mockReturnValue(mockResult);

      await checkinController.checkIn(mockRequest as any, mockResponse as any);

      expect(mockCheckinService.checkInVehicle).toHaveBeenCalledWith(
        'ABC123',
        'standard',
        'hourly' // default value
      );
    });

    it('should handle duplicate vehicle error', async () => {
      mockRequest.body = validCheckInData;
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Vehicle already checked in');
      });

      await checkinController.checkIn(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Vehicle already checked in',
        errors: ['Vehicle already checked in'],
        timestamp: expect.any(String)
      });
    });

    it('should handle no available spots error', async () => {
      mockRequest.body = validCheckInData;
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('No available spots for this vehicle type');
      });

      await checkinController.checkIn(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Garage is full',
        errors: ['No available spots for this vehicle type'],
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid vehicle type error', async () => {
      mockRequest.body = validCheckInData;
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Invalid vehicle type provided');
      });

      await checkinController.checkIn(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid vehicle type',
        errors: ['Invalid vehicle type provided'],
        timestamp: expect.any(String)
      });
    });

    it('should handle license plate validation error', async () => {
      mockRequest.body = validCheckInData;
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Invalid license plate format');
      });

      await checkinController.checkIn(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid license plate',
        errors: ['Invalid license plate format'],
        timestamp: expect.any(String)
      });
    });

    it('should handle generic errors', async () => {
      mockRequest.body = validCheckInData;
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await checkinController.checkIn(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error during check-in',
        errors: ['Database connection failed'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('simulateCheckin', () => {
    it('should successfully simulate check-in', async () => {
      const mockSimulation = {
        success: true,
        message: 'Simulation completed',
        data: {
          wouldSucceed: true,
          assignedSpot: 'spot-123',
          estimatedCost: 8.50
        }
      };

      mockRequest.body = {
        licensePlate: 'TEST123',
        vehicleType: 'compact' as VehicleType
      };

      mockCheckinService.simulateCheckin.mockReturnValue(mockSimulation);

      await checkinController.simulateCheckin(mockRequest as any, mockResponse as any);

      expect(mockCheckinService.simulateCheckin).toHaveBeenCalledWith('TEST123', 'compact');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        ...mockSimulation,
        timestamp: expect.any(String)
      });
    });

    it('should handle missing license plate', async () => {
      mockRequest.body = {
        vehicleType: 'standard' as VehicleType
        // licensePlate missing
      };

      await checkinController.simulateCheckin(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'License plate and vehicle type are required for simulation',
        timestamp: expect.any(String)
      });
    });

    it('should handle missing vehicle type', async () => {
      mockRequest.body = {
        licensePlate: 'TEST123'
        // vehicleType missing
      };

      await checkinController.simulateCheckin(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'License plate and vehicle type are required for simulation',
        timestamp: expect.any(String)
      });
    });

    it('should handle simulation errors', async () => {
      mockRequest.body = {
        licensePlate: 'TEST123',
        vehicleType: 'compact' as VehicleType
      };

      mockCheckinService.simulateCheckin.mockImplementation(() => {
        throw new Error('Simulation service unavailable');
      });

      await checkinController.simulateCheckin(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Simulation failed',
        errors: ['Simulation service unavailable'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('getAvailabilityByVehicleType', () => {
    it('should return availability for valid vehicle type', async () => {
      const mockAvailability = {
        total: 50,
        hasAvailable: true,
        bySpotType: {
          compact: 10,
          standard: 25,
          oversized: 15
        }
      };

      const mockSimulation = {
        success: true,
        assignedSpot: { id: 'spot-123', type: 'standard' },
        spotLocation: 'Level 1, Section A',
        compatibility: { isExactMatch: true }
      };

      mockRequest.params = { vehicleType: 'standard' };
      mockSpotAssignmentService.getAvailabilityByVehicleType.mockReturnValue(mockAvailability);
      mockSpotAssignmentService.simulateAssignment.mockReturnValue(mockSimulation);

      await checkinController.getAvailabilityByVehicleType(mockRequest as any, mockResponse as any);

      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledWith('standard');
      expect(mockSpotAssignmentService.simulateAssignment).toHaveBeenCalledWith('standard');

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          vehicleType: 'standard',
          availability: {
            totalCompatibleSpots: 50,
            hasAvailable: true,
            bySpotType: mockAvailability.bySpotType
          },
          assignment: {
            wouldAssignTo: 'spot-123',
            location: 'Level 1, Section A',
            spotType: 'standard',
            isExactMatch: true
          },
          message: 'Spots available for this vehicle type'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid vehicle type', async () => {
      mockRequest.params = { vehicleType: 'invalid' };

      await checkinController.getAvailabilityByVehicleType(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid vehicle type: invalid. Valid types: compact, standard, oversized',
        timestamp: expect.any(String)
      });
    });

    it('should handle no available spots scenario', async () => {
      const mockAvailability = {
        total: 0,
        hasAvailable: false,
        bySpotType: {}
      };

      const mockSimulation = {
        success: false,
        error: 'No spots available'
      };

      mockRequest.params = { vehicleType: 'oversized' };
      mockSpotAssignmentService.getAvailabilityByVehicleType.mockReturnValue(mockAvailability);
      mockSpotAssignmentService.simulateAssignment.mockReturnValue(mockSimulation);

      await checkinController.getAvailabilityByVehicleType(mockRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignment: null,
            message: 'No spots available for this vehicle type'
          })
        })
      );
    });

    it('should handle service errors', async () => {
      mockRequest.params = { vehicleType: 'compact' };
      mockSpotAssignmentService.getAvailabilityByVehicleType.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      await checkinController.getAvailabilityByVehicleType(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to get availability information',
        errors: ['Service unavailable'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('getGeneralAvailability', () => {
    it('should return availability for all vehicle types', async () => {
      const mockAvailabilityCompact = {
        total: 20,
        hasAvailable: true,
        bySpotType: { compact: 20 }
      };

      const mockAvailabilityStandard = {
        total: 50,
        hasAvailable: true,
        bySpotType: { standard: 50 }
      };

      const mockAvailabilityOversized = {
        total: 10,
        hasAvailable: false,
        bySpotType: { oversized: 10 }
      };

      const mockStats = {
        spots: {
          totalSpots: 100,
          availableSpots: 70,
          occupiedSpots: 30,
          occupancyRate: 30
        },
        vehicles: {
          totalParked: 30
        }
      };

      mockSpotAssignmentService.getAvailabilityByVehicleType
        .mockReturnValueOnce(mockAvailabilityCompact)
        .mockReturnValueOnce(mockAvailabilityStandard)
        .mockReturnValueOnce(mockAvailabilityOversized);

      mockCheckinService.getCheckinStats.mockReturnValue(mockStats);

      await checkinController.getGeneralAvailability(mockRequest as any, mockResponse as any);

      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledTimes(3);
      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledWith('compact');
      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledWith('standard');
      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledWith('oversized');

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Current availability information',
        data: {
          overall: {
            totalSpots: 100,
            availableSpots: 70,
            occupiedSpots: 30,
            occupancyRate: 30
          },
          byVehicleType: {
            compact: {
              totalCompatible: 20,
              available: true,
              bySpotType: { compact: 20 }
            },
            standard: {
              totalCompatible: 50,
              available: true,
              bySpotType: { standard: 50 }
            },
            oversized: {
              totalCompatible: 10,
              available: false,
              bySpotType: { oversized: 10 }
            }
          },
          currentlyParked: 30
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle service errors', async () => {
      mockSpotAssignmentService.getAvailabilityByVehicleType.mockImplementation(() => {
        throw new Error('Assignment service error');
      });

      await checkinController.getGeneralAvailability(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to get availability information',
        errors: ['Assignment service error'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('getCheckinStats', () => {
    it('should return comprehensive check-in statistics', async () => {
      const mockCheckinStats = {
        vehicles: {
          totalParked: 45,
          byVehicleType: {
            compact: 15,
            standard: 25,
            oversized: 5
          }
        },
        spots: {
          totalSpots: 100,
          availableSpots: 55,
          occupiedSpots: 45,
          occupancyRate: 45
        }
      };

      const mockAssignmentStats = {
        totalSpots: 100,
        availableSpots: 55,
        occupancyRate: 45,
        byVehicleType: {
          compact: { total: 30, available: 15 },
          standard: { total: 50, available: 25 },
          oversized: { total: 20, available: 15 }
        }
      };

      mockCheckinService.getCheckinStats.mockReturnValue(mockCheckinStats);
      mockSpotAssignmentService.getAssignmentStats.mockReturnValue(mockAssignmentStats);

      await checkinController.getCheckinStats(mockRequest as any, mockResponse as any);

      expect(mockCheckinService.getCheckinStats).toHaveBeenCalled();
      expect(mockSpotAssignmentService.getAssignmentStats).toHaveBeenCalled();

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Check-in statistics retrieved successfully',
        data: {
          statistics: {
            vehicles: mockCheckinStats.vehicles,
            occupancy: mockCheckinStats.spots,
            assignment: {
              totalSpots: 100,
              availableSpots: 55,
              occupancyRate: '45%',
              byVehicleType: mockAssignmentStats.byVehicleType
            }
          }
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle statistics service errors', async () => {
      mockCheckinService.getCheckinStats.mockImplementation(() => {
        throw new Error('Stats service unavailable');
      });

      await checkinController.getCheckinStats(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve statistics',
        errors: ['Stats service unavailable'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockStats = {
        spots: {
          totalSpots: 100,
          availableSpots: 60,
          occupiedSpots: 40,
          occupancyRate: 40
        },
        vehicles: {
          totalParked: 40
        }
      };

      mockCheckinService.getCheckinStats.mockReturnValue(mockStats);

      await checkinController.healthCheck(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          service: 'checkin',
          status: 'operational',
          summary: {
            totalSpots: 100,
            availableSpots: 60,
            currentlyParked: 40
          }
        },
        timestamp: expect.any(String)
      });
    });

    it('should return unhealthy status on service failure', async () => {
      mockCheckinService.getCheckinStats.mockImplementation(() => {
        throw new Error('Health check failed');
      });

      await checkinController.healthCheck(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service health check failed',
        errors: ['Health check failed'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle rate type validation error', async () => {
      mockRequest.body = {
        licensePlate: 'ABC123',
        vehicleType: 'standard',
        rateType: 'invalid'
      };

      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Invalid rate type specified');
      });

      await checkinController.checkIn(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid rate type'
        })
      );
    });

    it('should handle rollback errors', async () => {
      mockRequest.body = {
        licensePlate: 'ABC123',
        vehicleType: 'standard'
      };

      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Failed to complete transaction, rollback initiated');
      });

      await checkinController.checkIn(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Check-in operation failed'
        })
      );
    });

    it('should handle different no spots error messages', async () => {
      mockRequest.body = {
        licensePlate: 'ABC123',
        vehicleType: 'standard'
      };

      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('No spots available at this time');
      });

      await checkinController.checkIn(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Garage is full'
        })
      );
    });

    it('should handle all valid vehicle types correctly', async () => {
      const validTypes: VehicleType[] = ['compact', 'standard', 'oversized'];
      
      for (const vehicleType of validTypes) {
        mockRequest.params = { vehicleType };
        
        mockSpotAssignmentService.getAvailabilityByVehicleType.mockReturnValue({
          total: 10,
          hasAvailable: true,
          bySpotType: {}
        });
        
        mockSpotAssignmentService.simulateAssignment.mockReturnValue({
          success: true,
          assignedSpot: { id: 'spot-1', type: vehicleType },
          spotLocation: 'Level 1',
          compatibility: { isExactMatch: true }
        });

        await checkinController.getAvailabilityByVehicleType(mockRequest as any, mockResponse as any);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        jest.clearAllMocks();
        mockResponse = createMockResponse();
      }
    });
  });
});