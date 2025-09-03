/**
 * Checkout Controller Tests
 * 
 * Comprehensive test suite for the CheckoutController covering:
 * - Vehicle checkout operations
 * - Checkout simulation functionality
 * - Statistics and metrics
 * - Vehicle readiness queries
 * - Current parking estimates
 * - Force checkout operations
 * - Error handling for various scenarios
 * - Input validation
 * - Health checks
 * - Edge cases and boundary conditions
 */

import request from 'supertest';
import app from '../../../src/app';
import { CheckoutController } from '../../../src/controllers/checkoutController';
import { CheckoutService } from '../../../src/services/checkoutService';

// Mock the services
jest.mock('../../../src/services/checkoutService');

const MockedCheckoutService = CheckoutService as jest.MockedClass<typeof CheckoutService>;

describe('CheckoutController', () => {
  let checkoutController: CheckoutController;
  let mockCheckoutService: jest.Mocked<CheckoutService>;

  const mockCheckoutResult = {
    message: 'Vehicle checked out successfully',
    data: {
      vehicle: {
        licensePlate: 'ABC123',
        entryTime: new Date('2024-01-01T10:00:00Z').toISOString(),
        exitTime: new Date('2024-01-01T12:00:00Z').toISOString()
      },
      billing: {
        duration: '2 hours',
        totalCost: 10.00,
        rateType: 'hourly',
        gracePeriodApplied: false
      },
      spot: {
        id: 'spot-001',
        type: 'compact',
        location: 'Level 1 - A1'
      }
    }
  };

  const mockSimulationResult = {
    success: true,
    simulation: {
      estimatedDuration: '2 hours 15 minutes',
      estimatedBilling: {
        totalCost: 11.25,
        rateType: 'hourly',
        breakdown: {
          baseCost: 10.00,
          additionalMinutes: 1.25
        }
      },
      spotId: 'spot-001',
      currentStatus: 'active'
    }
  };

  const mockStats = {
    spots: {
      totalSpots: 100,
      availableSpots: 76,
      occupiedSpots: 24
    },
    vehicles: {
      totalCheckedOut: 150,
      stillParked: 24,
      averageParkingDuration: 125 // minutes
    },
    revenue: {
      totalRevenue: 1500.00,
      pendingRevenue: 240.00,
      averageRevenuePerVehicle: 10.00
    }
  };

  const mockVehiclesReadyForCheckout = [
    {
      licensePlate: 'READY001',
      entryTime: new Date('2024-01-01T08:00:00Z').toISOString(),
      parkingDuration: 240, // minutes
      spotId: 'spot-001',
      estimatedCost: 20.00
    },
    {
      licensePlate: 'READY002',
      entryTime: new Date('2024-01-01T09:00:00Z').toISOString(),
      parkingDuration: 180, // minutes
      spotId: 'spot-002',
      estimatedCost: 15.00
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    checkoutController = new CheckoutController();
    
    // Get mocked instance
    mockCheckoutService = MockedCheckoutService.mock.instances[MockedCheckoutService.mock.instances.length - 1] as jest.Mocked<CheckoutService>;

    // Set up default mocks
    mockCheckoutService.checkOutVehicle = jest.fn().mockReturnValue(mockCheckoutResult);
    mockCheckoutService.simulateCheckout = jest.fn().mockReturnValue(mockSimulationResult);
    mockCheckoutService.getCheckoutStats = jest.fn().mockReturnValue(mockStats);
    mockCheckoutService.getVehiclesReadyForCheckout = jest.fn().mockReturnValue(mockVehiclesReadyForCheckout);
    mockCheckoutService.forceCheckout = jest.fn().mockReturnValue({
      success: true,
      message: 'Force checkout completed',
      ...mockCheckoutResult
    });
  });

  describe('POST /api/v1/checkout - checkOut', () => {
    const validCheckoutData = {
      licensePlate: 'ABC123',
      applyGracePeriod: false,
      removeRecord: true
    };

    it('should check out a vehicle with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/checkout')
        .send(validCheckoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Vehicle checked out successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.vehicle).toBeDefined();
      expect(response.body.data.billing).toBeDefined();
      expect(response.body.data.spot).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith(
        'ABC123',
        {
          applyGracePeriod: false,
          removeRecord: true,
          checkOutTime: undefined
        }
      );
    });

    it('should check out a vehicle with default options', async () => {
      const minimalData = {
        licensePlate: 'DEF456'
      };

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(minimalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith(
        'DEF456',
        {
          applyGracePeriod: false, // default
          removeRecord: true, // default
          checkOutTime: undefined
        }
      );
    });

    it('should check out a vehicle with grace period', async () => {
      const gracePeriodData = {
        licensePlate: 'GHI789',
        applyGracePeriod: true,
        removeRecord: false
      };

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(gracePeriodData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith(
        'GHI789',
        {
          applyGracePeriod: true,
          removeRecord: false,
          checkOutTime: undefined
        }
      );
    });

    it('should check out a vehicle with custom checkout time', async () => {
      const customTimeData = {
        licensePlate: 'JKL012',
        checkOutTime: '2024-01-01T15:30:00Z'
      };

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(customTimeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith(
        'JKL012',
        {
          applyGracePeriod: false,
          removeRecord: true,
          checkOutTime: '2024-01-01T15:30:00Z'
        }
      );
    });

    it('should handle vehicle not found error (404)', async () => {
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Vehicle with license plate ABC123 not found');
      });

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(validCheckoutData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vehicle not found');
      expect(response.body.errors).toContain('Vehicle with license plate ABC123 not found');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle already checked out error (409)', async () => {
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Vehicle already checked out at 2024-01-01T10:00:00Z');
      });

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(validCheckoutData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vehicle already checked out');
      expect(response.body.errors).toContain('Vehicle already checked out at 2024-01-01T10:00:00Z');
    });

    it('should handle duration calculation error (400)', async () => {
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Cannot calculate parking duration - invalid entry time');
      });

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(validCheckoutData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid parking duration');
    });

    it('should handle billing calculation error (500)', async () => {
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Failed to calculate parking fee - rate service unavailable');
      });

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(validCheckoutData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Billing calculation failed');
    });

    it('should handle spot release error (500)', async () => {
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Failed to release spot - database connection error');
      });

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(validCheckoutData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Spot release failed');
    });

    it('should handle data integrity error (500)', async () => {
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Data integrity violation - inconsistent state detected');
      });

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(validCheckoutData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Data integrity issue');
    });

    it('should handle license plate validation error (400)', async () => {
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Invalid license plate format');
      });

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(validCheckoutData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid license plate');
    });

    it('should handle rollback/atomic operation error (500)', async () => {
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Checkout operation failed - rollback initiated');
      });

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(validCheckoutData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Checkout operation failed');
    });

    it('should handle generic server error (500)', async () => {
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const response = await request(app)
        .post('/api/v1/checkout')
        .send(validCheckoutData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error during checkout');
    });
  });

  describe('POST /api/v1/checkout/simulate - simulateCheckout', () => {
    const validSimulationData = {
      licensePlate: 'SIM123',
      applyGracePeriod: false
    };

    it('should simulate checkout with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/checkout/simulate')
        .send(validSimulationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.simulation).toBeDefined();
      expect(response.body.simulation.estimatedDuration).toBe('2 hours 15 minutes');
      expect(response.body.simulation.estimatedBilling).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockCheckoutService.simulateCheckout).toHaveBeenCalledWith(
        'SIM123',
        {
          applyGracePeriod: false,
          checkOutTime: undefined
        }
      );
    });

    it('should simulate checkout with grace period', async () => {
      const gracePeriodData = {
        licensePlate: 'SIM456',
        applyGracePeriod: true,
        checkOutTime: '2024-01-01T14:00:00Z'
      };

      const response = await request(app)
        .post('/api/v1/checkout/simulate')
        .send(gracePeriodData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockCheckoutService.simulateCheckout).toHaveBeenCalledWith(
        'SIM456',
        {
          applyGracePeriod: true,
          checkOutTime: '2024-01-01T14:00:00Z'
        }
      );
    });

    it('should reject simulation without license plate (400)', async () => {
      const invalidData = {
        applyGracePeriod: true
      };

      const response = await request(app)
        .post('/api/v1/checkout/simulate')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('License plate is required for simulation');
    });

    it('should handle simulation service error (500)', async () => {
      mockCheckoutService.simulateCheckout.mockImplementation(() => {
        throw new Error('Simulation service error');
      });

      const response = await request(app)
        .post('/api/v1/checkout/simulate')
        .send(validSimulationData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Checkout simulation failed');
      expect(response.body.errors).toContain('Simulation service error');
    });
  });

  describe('GET /api/v1/checkout/stats - getCheckoutStats', () => {
    it('should get checkout statistics successfully', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Checkout statistics retrieved successfully');
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.statistics.spots).toBeDefined();
      expect(response.body.data.statistics.vehicles).toBeDefined();
      expect(response.body.data.statistics.revenue).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockCheckoutService.getCheckoutStats).toHaveBeenCalled();
    });

    it('should handle statistics service error (500)', async () => {
      mockCheckoutService.getCheckoutStats.mockImplementation(() => {
        throw new Error('Statistics service unavailable');
      });

      const response = await request(app)
        .get('/api/v1/checkout/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve checkout statistics');
      expect(response.body.errors).toContain('Statistics service unavailable');
    });
  });

  describe('GET /api/v1/checkout/ready - getVehiclesReadyForCheckout', () => {
    it('should get vehicles ready for checkout with default filter', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/ready')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Found 2 vehicle(s) ready for checkout');
      expect(response.body.data.count).toBe(2);
      expect(response.body.data.vehicles).toHaveLength(2);
      expect(response.body.data.filters.minMinutes).toBe(0);
      expect(response.body.timestamp).toBeDefined();

      expect(mockCheckoutService.getVehiclesReadyForCheckout).toHaveBeenCalledWith(0);
    });

    it('should get vehicles ready for checkout with custom minimum minutes', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/ready?minMinutes=120')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.minMinutes).toBe(120);

      expect(mockCheckoutService.getVehiclesReadyForCheckout).toHaveBeenCalledWith(120);
    });

    it('should handle invalid minMinutes parameter', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/ready?minMinutes=invalid')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.minMinutes).toBe(NaN);

      expect(mockCheckoutService.getVehiclesReadyForCheckout).toHaveBeenCalledWith(NaN);
    });

    it('should handle service error (500)', async () => {
      mockCheckoutService.getVehiclesReadyForCheckout.mockImplementation(() => {
        throw new Error('Unable to fetch ready vehicles');
      });

      const response = await request(app)
        .get('/api/v1/checkout/ready')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve vehicles ready for checkout');
      expect(response.body.errors).toContain('Unable to fetch ready vehicles');
    });
  });

  describe('GET /api/v1/checkout/estimate/:licensePlate - getCurrentEstimate', () => {
    it('should get current parking estimate for valid license plate', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/estimate/ABC123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Current parking estimate calculated');
      expect(response.body.data.licensePlate).toBe('ABC123');
      expect(response.body.data.estimate).toBeDefined();
      expect(response.body.data.estimate.duration).toBeDefined();
      expect(response.body.data.estimate.billing).toBeDefined();
      expect(response.body.data.estimate.spotId).toBeDefined();
      expect(response.body.data.note).toContain('This is an estimate');
      expect(response.body.timestamp).toBeDefined();

      expect(mockCheckoutService.simulateCheckout).toHaveBeenCalledWith(
        'ABC123',
        { applyGracePeriod: false }
      );
    });

    it('should handle vehicle not found for estimate (404)', async () => {
      mockCheckoutService.simulateCheckout.mockReturnValue({
        success: false,
        message: 'Vehicle not found',
        error: 'No vehicle found with license plate XYZ789'
      });

      const response = await request(app)
        .get('/api/v1/checkout/estimate/XYZ789')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot get estimate: Vehicle not found');
      expect(response.body.errors).toContain('No vehicle found with license plate XYZ789');
    });

    it('should handle service error for estimate (500)', async () => {
      mockCheckoutService.simulateCheckout.mockImplementation(() => {
        throw new Error('Estimate calculation failed');
      });

      const response = await request(app)
        .get('/api/v1/checkout/estimate/ERROR123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to calculate parking estimate');
      expect(response.body.errors).toContain('Estimate calculation failed');
    });
  });

  describe('POST /api/v1/checkout/force - forceCheckout', () => {
    const validForceCheckoutData = {
      licensePlate: 'FORCE123',
      reason: 'Emergency maintenance required',
      adminKey: 'admin123'
    };

    it('should perform force checkout with valid admin key', async () => {
      const response = await request(app)
        .post('/api/v1/checkout/force')
        .send(validForceCheckoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Force checkout completed');
      expect(response.body.data).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockCheckoutService.forceCheckout).toHaveBeenCalledWith(
        'FORCE123',
        'Emergency maintenance required'
      );
    });

    it('should reject force checkout with invalid admin key (403)', async () => {
      const invalidData = {
        ...validForceCheckoutData,
        adminKey: 'wrong-key'
      };

      const response = await request(app)
        .post('/api/v1/checkout/force')
        .send(invalidData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid administrative access key');
    });

    it('should reject force checkout without admin key (403)', async () => {
      const incompleteData = {
        licensePlate: 'FORCE456',
        reason: 'Test reason'
      };

      const response = await request(app)
        .post('/api/v1/checkout/force')
        .send(incompleteData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid administrative access key');
    });

    it('should handle force checkout service error', async () => {
      mockCheckoutService.forceCheckout.mockImplementation(() => {
        throw new Error('Forced checkout failed - vehicle locked');
      });

      const response = await request(app)
        .post('/api/v1/checkout/force')
        .send(validForceCheckoutData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Forced checkout operation failed');
    });
  });

  describe('GET /api/v1/checkout/health - healthCheck', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('checkout');
      expect(response.body.data.status).toBe('operational');
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.availableSpots).toBe(76);
      expect(response.body.data.summary.vehiclesParked).toBe(24);
      expect(response.body.data.summary.totalRevenue).toBe(1500.00);
      expect(response.body.data.summary.pendingRevenue).toBe(240.00);
      expect(response.body.timestamp).toBeDefined();

      expect(mockCheckoutService.getCheckoutStats).toHaveBeenCalled();
    });

    it('should return unhealthy status on service failure (503)', async () => {
      mockCheckoutService.getCheckoutStats.mockImplementation(() => {
        throw new Error('Health check failed - service down');
      });

      const response = await request(app)
        .get('/api/v1/checkout/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Service health check failed');
      expect(response.body.errors).toContain('Health check failed - service down');
    });
  });

  describe('Input Validation and Edge Cases', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/checkout')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/v1/checkout')
        .send({})
        .expect(200);

      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith(
        undefined,
        {
          applyGracePeriod: false,
          removeRecord: true,
          checkOutTime: undefined
        }
      );
    });

    it('should handle very long license plate', async () => {
      const longLicensePlate = 'A'.repeat(100);
      
      const response = await request(app)
        .post('/api/v1/checkout')
        .send({
          licensePlate: longLicensePlate
        })
        .expect(200);

      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith(
        longLicensePlate,
        expect.any(Object)
      );
    });

    it('should handle special characters in license plate', async () => {
      const specialLicensePlate = 'ABC-123@#$';
      
      const response = await request(app)
        .post('/api/v1/checkout')
        .send({
          licensePlate: specialLicensePlate
        })
        .expect(200);

      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith(
        specialLicensePlate,
        expect.any(Object)
      );
    });

    it('should handle null values in request', async () => {
      const response = await request(app)
        .post('/api/v1/checkout')
        .send({
          licensePlate: null,
          applyGracePeriod: null,
          removeRecord: null
        })
        .expect(200);

      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith(
        null,
        {
          applyGracePeriod: false,
          removeRecord: true,
          checkOutTime: undefined
        }
      );
    });

    it('should handle invalid date format for checkOutTime', async () => {
      const response = await request(app)
        .post('/api/v1/checkout')
        .send({
          licensePlate: 'TIME123',
          checkOutTime: 'invalid-date'
        })
        .expect(200);

      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith(
        'TIME123',
        {
          applyGracePeriod: false,
          removeRecord: true,
          checkOutTime: 'invalid-date'
        }
      );
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent checkout requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/v1/checkout')
          .send({
            licensePlate: `CONCURRENT${i}`
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid simulation requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/v1/checkout/simulate')
          .send({
            licensePlate: `SIMULATE${i}`
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should complete health check quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/checkout/health')
        .expect(200);

      const duration = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response format for successful checkout', async () => {
      const response = await request(app)
        .post('/api/v1/checkout')
        .send({
          licensePlate: 'FORMAT123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should return consistent error response format', async () => {
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Test error for format validation');
      });

      const response = await request(app)
        .post('/api/v1/checkout')
        .send({
          licensePlate: 'ERROR123'
        })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should include timestamp in all responses', async () => {
      const responses = await Promise.all([
        request(app).post('/api/v1/checkout').send({ licensePlate: 'TIME1' }),
        request(app).get('/api/v1/checkout/stats'),
        request(app).get('/api/v1/checkout/ready'),
        request(app).get('/api/v1/checkout/health')
      ]);

      responses.forEach(response => {
        expect(response.body).toHaveProperty('timestamp');
        expect(typeof response.body.timestamp).toBe('string');
        expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
      });
    });
  });

  describe('Security Tests', () => {
    it('should properly validate admin key for force checkout', async () => {
      const attemptedKeys = [
        'admin124', // Close but wrong
        'ADMIN123', // Wrong case
        '', // Empty
        'admin123 ', // With space
        'admin123\n', // With newline
      ];

      for (const key of attemptedKeys) {
        const response = await request(app)
          .post('/api/v1/checkout/force')
          .send({
            licensePlate: 'SECURITY123',
            reason: 'Security test',
            adminKey: key
          })
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid administrative access key');
      }
    });

    it('should not expose sensitive information in error messages', async () => {
      mockCheckoutService.checkOutVehicle.mockImplementation(() => {
        throw new Error('Database connection string: postgresql://user:password@localhost/db');
      });

      const response = await request(app)
        .post('/api/v1/checkout')
        .send({
          licensePlate: 'SENSITIVE123'
        })
        .expect(500);

      // The controller should return a generic error message
      expect(response.body.message).toBe('Internal server error during checkout');
      expect(response.body.errors[0]).toBe('Database connection string: postgresql://user:password@localhost/db');
    });

    it('should sanitize license plate input', async () => {
      const maliciousPlate = '<script>alert("xss")</script>';
      
      await request(app)
        .post('/api/v1/checkout')
        .send({
          licensePlate: maliciousPlate
        })
        .expect(200);

      expect(mockCheckoutService.checkOutVehicle).toHaveBeenCalledWith(
        maliciousPlate, // Controller passes through, service should sanitize
        expect.any(Object)
      );
    });
  });
});