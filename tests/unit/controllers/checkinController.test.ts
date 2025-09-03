/**
 * Checkin Controller Tests
 * 
 * Comprehensive test suite for the CheckinController covering:
 * - Vehicle check-in operations
 * - Availability queries by vehicle type
 * - General availability information
 * - Check-in statistics and metrics
 * - Simulation functionality
 * - Error handling for various scenarios
 * - Input validation
 * - Health checks
 * - Edge cases and boundary conditions
 */

import request from 'supertest';
import app from '../../../src/app';
import { CheckinController } from '../../../src/controllers/checkinController';
import { CheckinService } from '../../../src/services/checkinService';
import { SpotService } from '../../../src/services/spotService';
import { SpotAssignmentService } from '../../../src/services/SpotAssignmentService';
import { VehicleType } from '../../../src/types/models';

// Mock the services
jest.mock('../../../src/services/checkinService');
jest.mock('../../../src/services/spotService');
jest.mock('../../../src/services/SpotAssignmentService');

const MockedCheckinService = CheckinService as jest.MockedClass<typeof CheckinService>;
const MockedSpotService = SpotService as jest.MockedClass<typeof SpotService>;
const MockedSpotAssignmentService = SpotAssignmentService as jest.MockedClass<typeof SpotAssignmentService>;

describe('CheckinController', () => {
  let checkinController: CheckinController;
  let mockCheckinService: jest.Mocked<CheckinService>;
  let mockSpotService: jest.Mocked<SpotService>;
  let mockSpotAssignmentService: jest.Mocked<SpotAssignmentService>;

  const mockCheckInResult = {
    message: 'Vehicle checked in successfully',
    data: {
      vehicle: {
        licensePlate: 'ABC123',
        vehicleType: 'compact',
        entryTime: new Date().toISOString()
      },
      spot: {
        id: 'spot-001',
        type: 'compact',
        location: 'Level 1 - A1'
      },
      billing: {
        rateType: 'hourly',
        estimatedCost: 5.00
      }
    }
  };

  const mockAvailabilityResult = {
    total: 10,
    hasAvailable: true,
    bySpotType: {
      compact: { total: 5, available: 3 },
      standard: { total: 3, available: 2 },
      oversized: { total: 2, available: 1 }
    }
  };

  const mockAssignmentSimulation = {
    success: true,
    assignedSpot: {
      id: 'spot-001',
      type: 'compact'
    },
    spotLocation: 'Level 1 - A1',
    compatibility: {
      isExactMatch: true
    }
  };

  const mockStats = {
    spots: {
      totalSpots: 100,
      availableSpots: 75,
      occupiedSpots: 25,
      occupancyRate: 25.0
    },
    vehicles: {
      totalParked: 25,
      byType: {
        compact: 10,
        standard: 10,
        oversized: 5
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    checkinController = new CheckinController();
    
    // Get mocked instances
    mockCheckinService = MockedCheckinService.mock.instances[MockedCheckinService.mock.instances.length - 1] as jest.Mocked<CheckinService>;
    mockSpotService = MockedSpotService.mock.instances[MockedSpotService.mock.instances.length - 1] as jest.Mocked<SpotService>;
    mockSpotAssignmentService = MockedSpotAssignmentService.mock.instances[MockedSpotAssignmentService.mock.instances.length - 1] as jest.Mocked<SpotAssignmentService>;

    // Set up default mocks
    mockCheckinService.checkInVehicle = jest.fn().mockReturnValue(mockCheckInResult);
    mockCheckinService.simulateCheckin = jest.fn().mockReturnValue({
      success: true,
      ...mockCheckInResult
    });
    mockCheckinService.getCheckinStats = jest.fn().mockReturnValue(mockStats);

    mockSpotAssignmentService.getAvailabilityByVehicleType = jest.fn().mockReturnValue(mockAvailabilityResult);
    mockSpotAssignmentService.simulateAssignment = jest.fn().mockReturnValue(mockAssignmentSimulation);
    mockSpotAssignmentService.getAssignmentStats = jest.fn().mockReturnValue({
      totalSpots: 100,
      availableSpots: 75,
      occupancyRate: 25,
      byVehicleType: {
        compact: { total: 40, available: 30 },
        standard: { total: 40, available: 30 },
        oversized: { total: 20, available: 15 }
      }
    });
  });

  describe('POST /api/v1/checkin - checkIn', () => {
    const validCheckInData = {
      licensePlate: 'ABC123',
      vehicleType: 'compact' as VehicleType,
      rateType: 'hourly'
    };

    it('should check in a vehicle with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/checkin')
        .send(validCheckInData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Vehicle checked in successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.vehicle).toBeDefined();
      expect(response.body.data.spot).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockCheckinService.checkInVehicle).toHaveBeenCalledWith(
        'ABC123',
        'compact',
        'hourly'
      );
    });

    it('should check in a vehicle with default rate type', async () => {
      const dataWithoutRateType = {
        licensePlate: 'ABC123',
        vehicleType: 'standard' as VehicleType
      };

      const response = await request(app)
        .post('/api/v1/checkin')
        .send(dataWithoutRateType)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockCheckinService.checkInVehicle).toHaveBeenCalledWith(
        'ABC123',
        'standard',
        'hourly' // default rate type
      );
    });

    it('should handle duplicate vehicle error (409)', async () => {
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Vehicle already checked in to spot-001');
      });

      const response = await request(app)
        .post('/api/v1/checkin')
        .send(validCheckInData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vehicle already checked in');
      expect(response.body.errors).toContain('Vehicle already checked in to spot-001');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle no available spots error (503)', async () => {
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('No available spots for this vehicle type');
      });

      const response = await request(app)
        .post('/api/v1/checkin')
        .send(validCheckInData)
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Garage is full');
      expect(response.body.errors).toContain('No available spots for this vehicle type');
    });

    it('should handle invalid vehicle type error (400)', async () => {
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Invalid vehicle type: invalid-type');
      });

      const response = await request(app)
        .post('/api/v1/checkin')
        .send(validCheckInData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid vehicle type');
    });

    it('should handle invalid rate type error (400)', async () => {
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Invalid rate type: invalid-rate');
      });

      const response = await request(app)
        .post('/api/v1/checkin')
        .send(validCheckInData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid rate type');
    });

    it('should handle license plate validation error (400)', async () => {
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Invalid license plate format');
      });

      const response = await request(app)
        .post('/api/v1/checkin')
        .send(validCheckInData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid license plate');
    });

    it('should handle rollback/atomic operation error (500)', async () => {
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Failed to complete check-in operation - rollback initiated');
      });

      const response = await request(app)
        .post('/api/v1/checkin')
        .send(validCheckInData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Check-in operation failed');
    });

    it('should handle generic server error (500)', async () => {
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const response = await request(app)
        .post('/api/v1/checkin')
        .send(validCheckInData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error during check-in');
    });
  });

  describe('POST /api/v1/checkin/simulate - simulateCheckin', () => {
    const validSimulationData = {
      licensePlate: 'SIM123',
      vehicleType: 'standard' as VehicleType
    };

    it('should simulate check-in with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/checkin/simulate')
        .send(validSimulationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Vehicle checked in successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      expect(mockCheckinService.simulateCheckin).toHaveBeenCalledWith(
        'SIM123',
        'standard'
      );
    });

    it('should reject simulation without license plate (400)', async () => {
      const invalidData = {
        vehicleType: 'compact' as VehicleType
      };

      const response = await request(app)
        .post('/api/v1/checkin/simulate')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('License plate and vehicle type are required for simulation');
    });

    it('should reject simulation without vehicle type (400)', async () => {
      const invalidData = {
        licensePlate: 'ABC123'
      };

      const response = await request(app)
        .post('/api/v1/checkin/simulate')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('License plate and vehicle type are required for simulation');
    });

    it('should handle simulation service error (500)', async () => {
      mockCheckinService.simulateCheckin.mockImplementation(() => {
        throw new Error('Simulation failed due to service error');
      });

      const response = await request(app)
        .post('/api/v1/checkin/simulate')
        .send(validSimulationData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Simulation failed');
      expect(response.body.errors).toContain('Simulation failed due to service error');
    });
  });

  describe('GET /api/v1/checkin/availability/:vehicleType - getAvailabilityByVehicleType', () => {
    it('should get availability for compact vehicles', async () => {
      const response = await request(app)
        .get('/api/v1/checkin/availability/compact')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicleType).toBe('compact');
      expect(response.body.data.availability).toBeDefined();
      expect(response.body.data.availability.totalCompatibleSpots).toBe(10);
      expect(response.body.data.availability.hasAvailable).toBe(true);
      expect(response.body.data.assignment).toBeDefined();
      expect(response.body.data.assignment.wouldAssignTo).toBe('spot-001');

      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledWith('compact');
      expect(mockSpotAssignmentService.simulateAssignment).toHaveBeenCalledWith('compact');
    });

    it('should get availability for standard vehicles', async () => {
      const response = await request(app)
        .get('/api/v1/checkin/availability/standard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicleType).toBe('standard');
      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledWith('standard');
    });

    it('should get availability for oversized vehicles', async () => {
      const response = await request(app)
        .get('/api/v1/checkin/availability/oversized')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicleType).toBe('oversized');
      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledWith('oversized');
    });

    it('should reject invalid vehicle type (400)', async () => {
      const response = await request(app)
        .get('/api/v1/checkin/availability/invalid-type')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid vehicle type: invalid-type');
      expect(response.body.message).toContain('Valid types: compact, standard, oversized');
    });

    it('should handle no spots available scenario', async () => {
      mockSpotAssignmentService.simulateAssignment.mockReturnValue({
        success: false,
        assignedSpot: null,
        spotLocation: null,
        compatibility: null
      });

      const response = await request(app)
        .get('/api/v1/checkin/availability/compact')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignment).toBeNull();
      expect(response.body.data.message).toBe('No spots available for this vehicle type');
    });

    it('should handle service error (500)', async () => {
      mockSpotAssignmentService.getAvailabilityByVehicleType.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/v1/checkin/availability/compact')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get availability information');
      expect(response.body.errors).toContain('Database connection failed');
    });
  });

  describe('GET /api/v1/checkin/availability - getGeneralAvailability', () => {
    it('should get general availability for all vehicle types', async () => {
      const response = await request(app)
        .get('/api/v1/checkin/availability')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Current availability information');
      expect(response.body.data.overall).toBeDefined();
      expect(response.body.data.overall.totalSpots).toBe(100);
      expect(response.body.data.overall.availableSpots).toBe(75);
      expect(response.body.data.overall.occupiedSpots).toBe(25);
      expect(response.body.data.overall.occupancyRate).toBe(25.0);

      expect(response.body.data.byVehicleType).toBeDefined();
      expect(response.body.data.byVehicleType.compact).toBeDefined();
      expect(response.body.data.byVehicleType.standard).toBeDefined();
      expect(response.body.data.byVehicleType.oversized).toBeDefined();

      expect(response.body.data.currentlyParked).toBe(25);

      // Should call service methods for all vehicle types
      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledTimes(3);
      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledWith('compact');
      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledWith('standard');
      expect(mockSpotAssignmentService.getAvailabilityByVehicleType).toHaveBeenCalledWith('oversized');
      expect(mockCheckinService.getCheckinStats).toHaveBeenCalled();
    });

    it('should handle service error during general availability check (500)', async () => {
      mockCheckinService.getCheckinStats.mockImplementation(() => {
        throw new Error('Stats service unavailable');
      });

      const response = await request(app)
        .get('/api/v1/checkin/availability')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get availability information');
      expect(response.body.errors).toContain('Stats service unavailable');
    });
  });

  describe('GET /api/v1/checkin/stats - getCheckinStats', () => {
    it('should get check-in statistics successfully', async () => {
      const response = await request(app)
        .get('/api/v1/checkin/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Check-in statistics retrieved successfully');
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.statistics.vehicles).toBeDefined();
      expect(response.body.data.statistics.occupancy).toBeDefined();
      expect(response.body.data.statistics.assignment).toBeDefined();
      expect(response.body.data.statistics.assignment.occupancyRate).toBe('25%');

      expect(mockCheckinService.getCheckinStats).toHaveBeenCalled();
      expect(mockSpotAssignmentService.getAssignmentStats).toHaveBeenCalled();
    });

    it('should handle statistics service error (500)', async () => {
      mockCheckinService.getCheckinStats.mockImplementation(() => {
        throw new Error('Stats calculation failed');
      });

      const response = await request(app)
        .get('/api/v1/checkin/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve statistics');
      expect(response.body.errors).toContain('Stats calculation failed');
    });
  });

  describe('GET /api/v1/checkin/health - healthCheck', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/v1/checkin/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('checkin');
      expect(response.body.data.status).toBe('operational');
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.totalSpots).toBe(100);
      expect(response.body.data.summary.availableSpots).toBe(75);
      expect(response.body.data.summary.currentlyParked).toBe(25);

      expect(mockCheckinService.getCheckinStats).toHaveBeenCalled();
    });

    it('should return unhealthy status on service failure (503)', async () => {
      mockCheckinService.getCheckinStats.mockImplementation(() => {
        throw new Error('Health check failed - service unavailable');
      });

      const response = await request(app)
        .get('/api/v1/checkin/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Service health check failed');
      expect(response.body.errors).toContain('Health check failed - service unavailable');
    });
  });

  describe('Input Validation and Edge Cases', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/checkin')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/v1/checkin')
        .send({})
        .expect(201); // Controller doesn't validate required fields, service does

      expect(mockCheckinService.checkInVehicle).toHaveBeenCalledWith(
        undefined,
        undefined,
        'hourly'
      );
    });

    it('should handle very long license plate', async () => {
      const longLicensePlate = 'A'.repeat(100);
      
      const response = await request(app)
        .post('/api/v1/checkin')
        .send({
          licensePlate: longLicensePlate,
          vehicleType: 'compact'
        })
        .expect(201);

      expect(mockCheckinService.checkInVehicle).toHaveBeenCalledWith(
        longLicensePlate,
        'compact',
        'hourly'
      );
    });

    it('should handle special characters in license plate', async () => {
      const specialLicensePlate = 'ABC-123@#$';
      
      const response = await request(app)
        .post('/api/v1/checkin')
        .send({
          licensePlate: specialLicensePlate,
          vehicleType: 'standard'
        })
        .expect(201);

      expect(mockCheckinService.checkInVehicle).toHaveBeenCalledWith(
        specialLicensePlate,
        'standard',
        'hourly'
      );
    });

    it('should handle null values in request', async () => {
      const response = await request(app)
        .post('/api/v1/checkin')
        .send({
          licensePlate: null,
          vehicleType: null,
          rateType: null
        })
        .expect(201);

      expect(mockCheckinService.checkInVehicle).toHaveBeenCalledWith(
        null,
        null,
        'hourly' // default value when null
      );
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent check-in requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/v1/checkin')
          .send({
            licensePlate: `CONCURRENT${i}`,
            vehicleType: 'compact'
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      expect(mockCheckinService.checkInVehicle).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid availability queries', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/api/v1/checkin/availability/compact')
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
        .get('/api/v1/checkin/health')
        .expect(200);

      const duration = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response format for successful check-in', async () => {
      const response = await request(app)
        .post('/api/v1/checkin')
        .send({
          licensePlate: 'FORMAT123',
          vehicleType: 'compact'
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should return consistent error response format', async () => {
      mockCheckinService.checkInVehicle.mockImplementation(() => {
        throw new Error('Test error for format validation');
      });

      const response = await request(app)
        .post('/api/v1/checkin')
        .send({
          licensePlate: 'ERROR123',
          vehicleType: 'compact'
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
        request(app).post('/api/v1/checkin').send({ licensePlate: 'TIME1', vehicleType: 'compact' }),
        request(app).get('/api/v1/checkin/availability'),
        request(app).get('/api/v1/checkin/stats'),
        request(app).get('/api/v1/checkin/health')
      ]);

      responses.forEach(response => {
        expect(response.body).toHaveProperty('timestamp');
        expect(typeof response.body.timestamp).toBe('string');
        expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
      });
    });
  });
});