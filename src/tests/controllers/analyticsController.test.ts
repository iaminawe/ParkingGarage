import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AnalyticsController } from '../../controllers/analyticsController';
import { HTTP_STATUS } from '../../config/constants';
import {
  createMockRequest,
  createMockResponse,
  mockConsole,
  expectSuccessResponse,
  expectErrorResponse
} from '../helpers/testUtils';

// Mock Prisma
jest.mock('@prisma/client');

const MockedPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>;

describe('AnalyticsController', () => {
  let analyticsController: AnalyticsController;
  let mockRequest: ReturnType<typeof createMockRequest>;
  let mockResponse: ReturnType<typeof createMockResponse>;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    analyticsController = new AnalyticsController();
    
    // Create mock Prisma instance
    mockPrisma = {
      garage: {
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      parkingSpot: {
        count: jest.fn(),
      },
      vehicle: {
        count: jest.fn(),
      },
      parkingSession: {
        count: jest.fn(),
      },
      user: {
        count: jest.fn(),
      },
      payment: {
        aggregate: jest.fn(),
      },
    } as any;

    // Mock the constructor to return our mock
    MockedPrismaClient.mockImplementation(() => mockPrisma);
    jest.clearAllMocks();
  });

  mockConsole();

  describe('getSystemAnalytics', () => {
    it('should return comprehensive system analytics', async () => {
      // Mock the database responses
      mockPrisma.garage.count.mockResolvedValue(5);
      mockPrisma.parkingSpot.count
        .mockResolvedValueOnce(500) // total spots
        .mockResolvedValueOnce(150); // available spots
      mockPrisma.vehicle.count.mockResolvedValue(200);
      mockPrisma.parkingSession.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValue(100);
      
      mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: 25000 }
      });

      await analyticsController.getSystemAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.garage.count).toHaveBeenCalledWith({ where: { isActive: true } });
      expect(mockPrisma.parkingSpot.count).toHaveBeenCalledWith({ where: { isActive: true } });
      expect(mockPrisma.parkingSpot.count).toHaveBeenCalledWith({ 
        where: { status: 'AVAILABLE', isActive: true } 
      });
      
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'System analytics retrieved successfully',
        data: {
          overview: {
            totalGarages: 5,
            totalSpots: 500,
            totalVehicles: 200,
            activeSessions: 50,
            totalUsers: 100
          },
          occupancy: {
            totalSpots: 500,
            availableSpots: 150,
            occupiedSpots: 350,
            occupancyRate: 70
          },
          revenue: {
            monthlyRevenue: 25000,
            period: 'last_30_days'
          },
          timestamp: expect.any(String)
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle zero spots correctly', async () => {
      // Mock empty system
      mockPrisma.garage.count.mockResolvedValue(0);
      mockPrisma.parkingSpot.count.mockResolvedValue(0);
      mockPrisma.vehicle.count.mockResolvedValue(0);
      mockPrisma.parkingSession.count.mockResolvedValue(0);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });

      await analyticsController.getSystemAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            occupancy: expect.objectContaining({
              occupancyRate: 0
            }),
            revenue: expect.objectContaining({
              monthlyRevenue: 0
            })
          })
        })
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.garage.count.mockRejectedValue(new Error('Database connection error'));

      await analyticsController.getSystemAnalytics(mockRequest as Request, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    });

    it('should calculate occupancy rate correctly with partial occupancy', async () => {
      mockPrisma.garage.count.mockResolvedValue(3);
      mockPrisma.parkingSpot.count
        .mockResolvedValueOnce(300) // total spots
        .mockResolvedValueOnce(150); // available spots (50% occupancy)
      mockPrisma.vehicle.count.mockResolvedValue(150);
      mockPrisma.parkingSession.count.mockResolvedValue(25);
      mockPrisma.user.count.mockResolvedValue(80);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 12500 } });

      await analyticsController.getSystemAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            occupancy: expect.objectContaining({
              occupancyRate: 50
            })
          })
        })
      );
    });
  });

  describe('getGarageAnalytics', () => {
    const mockGarage = {
      id: 'garage-123',
      name: 'Test Garage',
      description: 'Test garage description',
      floors: [
        {
          id: 'floor-1',
          floorNumber: 1,
          spots: [
            { id: 'spot-1', status: 'AVAILABLE' },
            { id: 'spot-2', status: 'OCCUPIED' },
            { id: 'spot-3', status: 'AVAILABLE' }
          ]
        },
        {
          id: 'floor-2',
          floorNumber: 2,
          spots: [
            { id: 'spot-4', status: 'OCCUPIED' },
            { id: 'spot-5', status: 'OCCUPIED' }
          ]
        }
      ]
    };

    it('should return garage analytics with occupancy data', async () => {
      mockRequest.params = { id: 'garage-123' };
      mockPrisma.garage.findUnique.mockResolvedValue(mockGarage as any);

      await analyticsController.getGarageAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.garage.findUnique).toHaveBeenCalledWith({
        where: { id: 'garage-123' },
        include: {
          floors: {
            include: {
              spots: true
            }
          }
        }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Garage analytics retrieved successfully',
        data: {
          garage: {
            id: 'garage-123',
            name: 'Test Garage',
            description: 'Test garage description'
          },
          occupancy: {
            totalSpots: 5,
            availableSpots: 2,
            occupiedSpots: 3,
            occupancyRate: 60
          },
          floors: [
            {
              id: 'floor-1',
              floorNumber: 1,
              totalSpots: 3,
              availableSpots: 2,
              occupiedSpots: 1
            },
            {
              id: 'floor-2',
              floorNumber: 2,
              totalSpots: 2,
              availableSpots: 0,
              occupiedSpots: 2
            }
          ],
          timestamp: expect.any(String)
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle garage not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockPrisma.garage.findUnique.mockResolvedValue(null);

      await analyticsController.getGarageAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Garage not found',
        timestamp: expect.any(String)
      });
    });

    it('should handle garage with no floors', async () => {
      const emptyGarage = {
        id: 'garage-empty',
        name: 'Empty Garage',
        description: 'Garage with no floors',
        floors: []
      };

      mockRequest.params = { id: 'garage-empty' };
      mockPrisma.garage.findUnique.mockResolvedValue(emptyGarage as any);

      await analyticsController.getGarageAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            occupancy: {
              totalSpots: 0,
              availableSpots: 0,
              occupiedSpots: 0,
              occupancyRate: 0
            }
          })
        })
      );
    });

    it('should handle query parameters', async () => {
      mockRequest.params = { id: 'garage-123' };
      mockRequest.query = { startDate: '2023-01-01', endDate: '2023-12-31' };
      mockPrisma.garage.findUnique.mockResolvedValue(mockGarage as any);

      await analyticsController.getGarageAnalytics(mockRequest as Request, mockResponse as Response);

      // Should still work (query params are extracted but not currently used)
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('should handle database errors', async () => {
      mockRequest.params = { id: 'garage-123' };
      mockPrisma.garage.findUnique.mockRejectedValue(new Error('Database error'));

      await analyticsController.getGarageAnalytics(mockRequest as Request, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getDashboardAnalytics', () => {
    it('should return dashboard analytics with all time periods', async () => {
      // Mock all the database calls
      mockPrisma.parkingSession.count
        .mockResolvedValueOnce(1000) // total sessions
        .mockResolvedValueOnce(50)   // today sessions
        .mockResolvedValueOnce(200)  // week sessions
        .mockResolvedValueOnce(400); // month sessions

      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 50000 } }) // total revenue
        .mockResolvedValueOnce({ _sum: { amount: 1500 } });  // today revenue

      mockPrisma.parkingSpot.count
        .mockResolvedValueOnce(500) // total spots
        .mockResolvedValueOnce(200); // occupied spots

      await analyticsController.getDashboardAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Dashboard analytics retrieved successfully',
        data: {
          sessions: {
            total: 1000,
            today: 50,
            thisWeek: 200,
            thisMonth: 400
          },
          revenue: {
            total: 50000,
            today: 1500
          },
          occupancy: {
            totalSpots: 500,
            availableSpots: 300,
            occupiedSpots: 200,
            occupancyRate: 40
          },
          timestamp: expect.any(String)
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle null revenue values', async () => {
      mockPrisma.parkingSession.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(40);

      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } }) // no total revenue
        .mockResolvedValueOnce({ _sum: { amount: null } }); // no today revenue

      mockPrisma.parkingSpot.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(0);

      await analyticsController.getDashboardAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            revenue: {
              total: 0,
              today: 0
            }
          })
        })
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.parkingSession.count.mockRejectedValue(new Error('Database error'));

      await analyticsController.getDashboardAnalytics(mockRequest as Request, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    it('should calculate date ranges correctly', async () => {
      const fixedDate = new Date('2023-06-15T10:00:00.000Z'); // Thursday
      jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return fixedDate as any;
        }
        return new (Date as any)(...args);
      });

      mockPrisma.parkingSession.count.mockResolvedValue(10);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
      mockPrisma.parkingSpot.count.mockResolvedValue(50);

      await analyticsController.getDashboardAnalytics(mockRequest as Request, mockResponse as Response);

      // Verify that date-based queries were made
      expect(mockPrisma.parkingSession.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { startTime: { gte: expect.any(Date) } }
        })
      );

      (global.Date as any).mockRestore();
    });
  });

  describe('getOccupancyTrends', () => {
    it('should return occupancy trends data', async () => {
      await analyticsController.getOccupancyTrends(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Occupancy trends retrieved successfully',
        data: expect.arrayContaining([
          expect.objectContaining({
            timestamp: expect.any(String),
            occupancyRate: expect.any(Number),
            totalSpots: expect.any(Number)
          })
        ]),
        timestamp: expect.any(String)
      });
    });

    it('should handle errors in occupancy trends', async () => {
      // Force an error by throwing in the try block
      jest.spyOn(Date.prototype, 'toISOString').mockImplementationOnce(() => {
        throw new Error('Date error');
      });

      await analyticsController.getOccupancyTrends(mockRequest as Request, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.INTERNAL_SERVER_ERROR);

      jest.restoreAllMocks();
    });
  });

  describe('Placeholder Methods', () => {
    const placeholderMethods = [
      'getRevenueData',
      'getVehicleTypeDistribution',
      'getDurationDistribution',
      'getPeakHoursData',
      'getSpotUtilization',
      'exportAnalyticsReport'
    ];

    placeholderMethods.forEach(methodName => {
      it(`should return success response for ${methodName}`, async () => {
        await (analyticsController as any)[methodName](mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: expect.stringContaining('successfully'),
          data: expect.anything(),
          timestamp: expect.any(String)
        });
      });
    });

    it('should handle export analytics with proper message', async () => {
      await analyticsController.exportAnalyticsReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Export functionality not implemented yet',
        data: null,
        timestamp: expect.any(String)
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent requests', async () => {
      mockPrisma.garage.count.mockResolvedValue(5);
      mockPrisma.parkingSpot.count.mockResolvedValue(100);
      mockPrisma.vehicle.count.mockResolvedValue(50);
      mockPrisma.parkingSession.count.mockResolvedValue(25);
      mockPrisma.user.count.mockResolvedValue(30);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });

      const promises = Array(5).fill(null).map(() => 
        analyticsController.getSystemAnalytics(mockRequest as Request, mockResponse as Response)
      );

      await Promise.all(promises);

      expect(mockPrisma.garage.count).toHaveBeenCalledTimes(5);
    });

    it('should handle very large numbers correctly', async () => {
      const largeNumber = 999999999;
      
      mockPrisma.garage.count.mockResolvedValue(largeNumber);
      mockPrisma.parkingSpot.count
        .mockResolvedValueOnce(largeNumber)
        .mockResolvedValueOnce(Math.floor(largeNumber / 2));
      mockPrisma.vehicle.count.mockResolvedValue(largeNumber);
      mockPrisma.parkingSession.count.mockResolvedValue(largeNumber);
      mockPrisma.user.count.mockResolvedValue(largeNumber);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: largeNumber } });

      await analyticsController.getSystemAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overview: expect.objectContaining({
              totalGarages: largeNumber,
              totalSpots: largeNumber
            }),
            occupancy: expect.objectContaining({
              occupancyRate: 50
            })
          })
        })
      );
    });

    it('should handle division by zero in occupancy calculation', async () => {
      mockPrisma.garage.count.mockResolvedValue(1);
      mockPrisma.parkingSpot.count
        .mockResolvedValueOnce(0) // total spots = 0
        .mockResolvedValueOnce(0); // available spots = 0
      mockPrisma.vehicle.count.mockResolvedValue(0);
      mockPrisma.parkingSession.count.mockResolvedValue(0);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

      await analyticsController.getSystemAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            occupancy: expect.objectContaining({
              occupancyRate: 0 // Should be 0, not NaN or Infinity
            })
          })
        })
      );
    });

    it('should handle partial database failures gracefully', async () => {
      mockPrisma.garage.count.mockResolvedValue(5);
      mockPrisma.parkingSpot.count.mockResolvedValue(100);
      mockPrisma.vehicle.count.mockResolvedValue(50);
      mockPrisma.parkingSession.count.mockRejectedValue(new Error('Partial failure'));

      await analyticsController.getSystemAnalytics(mockRequest as Request, mockResponse as Response);

      expectErrorResponse(mockResponse, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });
});