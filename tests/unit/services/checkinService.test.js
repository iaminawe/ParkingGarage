/**
 * Unit Tests for CheckinService
 * 
 * Tests all business logic in CheckinService with mocked dependencies.
 */

const CheckinService = require('../../../src/services/checkinService');
const TestDataFactory = require('../../fixtures/testData');
const { MockVehicleRepository, MockSpotRepository } = require('../../fixtures/mockRepositories');

// Mock SpotAssignmentService
const mockSpotAssignmentService = {
  findBestAvailableSpot: jest.fn(),
  getAvailabilityByVehicleType: jest.fn(),
  simulateAssignment: jest.fn(),
  getAssignmentStats: jest.fn()
};

jest.mock('../../../src/services/spotAssignmentService', () => {
  return jest.fn().mockImplementation(() => mockSpotAssignmentService);
});

describe('CheckinService', () => {
  let checkinService;
  let mockVehicleRepo;
  let mockSpotRepo;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service with mocked dependencies
    checkinService = new CheckinService();
    
    // Replace repositories with mocks
    mockVehicleRepo = new MockVehicleRepository();
    mockSpotRepo = new MockSpotRepository();
    
    checkinService.vehicleRepository = mockVehicleRepo;
    checkinService.spotRepository = mockSpotRepo;
    checkinService.spotAssignmentService = mockSpotAssignmentService;

    // Setup default mock behaviors
    mockSpotAssignmentService.findBestAvailableSpot.mockReturnValue({
      id: 'F1-B1-S001',
      floor: 1,
      bay: 1,
      spotNumber: 1,
      type: 'standard',
      features: []
    });
    
    mockSpotAssignmentService.getAvailabilityByVehicleType.mockReturnValue({
      total: 10,
      available: 5
    });
    
    mockSpotAssignmentService.getAssignmentStats.mockReturnValue({
      byVehicleType: { compact: 10, standard: 20, oversized: 5 }
    });
  });

  describe('checkInVehicle', () => {
    test('should successfully check in a valid vehicle', () => {
      // Create the spot first to ensure it exists
      const spot = mockSpotRepo.createSpot(1, 1, 1, 'standard', []);
      
      const result = checkinService.checkInVehicle('TEST001', 'standard', 'hourly');
      
      expect(result).toEqual({
        success: true,
        message: 'Vehicle checked in successfully',
        spotId: 'F1-B1-S001',
        location: {
          floor: 1,
          bay: 1,
          spot: 1
        },
        checkInTime: expect.any(String),
        vehicle: {
          licensePlate: 'TEST001',
          type: 'standard',
          rateType: 'hourly'
        },
        spotDetails: {
          type: 'standard',
          features: []
        }
      });
      
      // Verify vehicle was created
      expect(mockVehicleRepo.exists('TEST001')).toBe(true);
      
      // Verify spot assignment service was called
      expect(mockSpotAssignmentService.findBestAvailableSpot).toHaveBeenCalledWith('standard');
    });

    test('should use default rate type when not provided', () => {
      const spot = mockSpotRepo.createSpot(1, 1, 2, 'standard', []);
      mockSpotAssignmentService.findBestAvailableSpot.mockReturnValue({
        id: 'F1-B1-S002',
        floor: 1, bay: 1, spotNumber: 2, type: 'standard', features: []
      });
      
      const result = checkinService.checkInVehicle('TEST002', 'standard');
      
      expect(result.vehicle.rateType).toBe('hourly');
    });

    test('should prevent duplicate check-ins', () => {
      const spot = mockSpotRepo.createSpot(1, 1, 3, 'standard', []);
      mockSpotAssignmentService.findBestAvailableSpot.mockReturnValue({
        id: 'F1-B1-S003',
        floor: 1, bay: 1, spotNumber: 3, type: 'standard', features: []
      });
      
      // First check-in
      checkinService.checkInVehicle('DUPLICATE', 'standard');
      
      // Second check-in should fail
      expect(() => {
        checkinService.checkInVehicle('DUPLICATE', 'standard');
      }).toThrow('Vehicle DUPLICATE is already checked in');
    });

    test('should allow check-in after vehicle is checked out', () => {
      const spot1 = mockSpotRepo.createSpot(1, 1, 4, 'standard', []);
      const spot2 = mockSpotRepo.createSpot(1, 1, 5, 'standard', []);
      
      mockSpotAssignmentService.findBestAvailableSpot
        .mockReturnValueOnce({
          id: 'F1-B1-S004',
          floor: 1, bay: 1, spotNumber: 4, type: 'standard', features: []
        })
        .mockReturnValueOnce({
          id: 'F1-B1-S005', 
          floor: 1, bay: 1, spotNumber: 5, type: 'standard', features: []
        });
      
      // Check in and then check out
      checkinService.checkInVehicle('CHECKOUT', 'standard');
      mockVehicleRepo.checkOut('CHECKOUT', 25.00, 'credit_card');
      
      // Should allow another check-in
      expect(() => {
        checkinService.checkInVehicle('CHECKOUT', 'standard');
      }).not.toThrow();
    });

    test('should handle no available spots', () => {
      mockSpotAssignmentService.findBestAvailableSpot.mockReturnValue(null);
      mockSpotAssignmentService.getAvailabilityByVehicleType.mockReturnValue({
        total: 0
      });
      mockSpotRepo.findAvailable = jest.fn().mockReturnValue([]);
      
      expect(() => {
        checkinService.checkInVehicle('TEST001', 'oversized');
      }).toThrow('No available spots for oversized vehicles');
    });

    test('should rollback on spot occupation failure', () => {
      // Mock spot occupation to fail
      const originalOccupy = mockSpotRepo.occupy;
      mockSpotRepo.occupy = jest.fn().mockReturnValue(false);
      
      expect(() => {
        checkinService.checkInVehicle('TEST001', 'standard');
      }).toThrow('Failed to occupy spot F1-B1-S001: Spot F1-B1-S001 not found');
      
      // Verify vehicle was not created (rollback worked)
      expect(mockVehicleRepo.exists('TEST001')).toBe(false);
      
      // Restore original function
      mockSpotRepo.occupy = originalOccupy;
    });
  });

  describe('validateCheckinInputs', () => {
    test('should validate license plate is required', () => {
      expect(() => {
        checkinService.validateCheckinInputs(null, 'standard', 'hourly');
      }).toThrow('License plate is required and must be a string');
    });

    test('should validate license plate is string', () => {
      expect(() => {
        checkinService.validateCheckinInputs(123, 'standard', 'hourly');
      }).toThrow('License plate is required and must be a string');
    });

    test('should validate vehicle type', () => {
      expect(() => {
        checkinService.validateCheckinInputs('TEST001', 'invalid', 'hourly');
      }).toThrow('Invalid vehicle type: invalid. Valid types: compact, standard, oversized');
    });

    test('should validate rate type', () => {
      expect(() => {
        checkinService.validateCheckinInputs('TEST001', 'standard', 'invalid');
      }).toThrow('Invalid rate type: invalid. Valid types: hourly, daily, monthly');
    });

    test('should pass valid inputs', () => {
      expect(() => {
        checkinService.validateCheckinInputs('TEST001', 'standard', 'hourly');
      }).not.toThrow();
    });
  });

  describe('checkForDuplicateVehicle', () => {
    test('should pass if vehicle not found', () => {
      expect(() => {
        checkinService.checkForDuplicateVehicle('NOTFOUND');
      }).not.toThrow();
    });

    test('should pass if vehicle is checked out', () => {
      const vehicle = mockVehicleRepo.checkIn('CHECKEDOUT', 'F1-B1-S001', 'standard');
      mockVehicleRepo.checkOut('CHECKEDOUT');
      
      expect(() => {
        checkinService.checkForDuplicateVehicle('CHECKEDOUT');
      }).not.toThrow();
    });

    test('should throw error if vehicle is still parked', () => {
      mockVehicleRepo.checkIn('PARKED', 'F1-B1-S001', 'standard');
      
      expect(() => {
        checkinService.checkForDuplicateVehicle('PARKED');
      }).toThrow('Vehicle PARKED is already checked in at spot F1-B1-S001');
    });
  });

  describe('findAndReserveSpot', () => {
    test('should return best available spot', () => {
      const mockSpot = {
        id: 'F2-B1-S005',
        floor: 2,
        bay: 1,
        spotNumber: 5,
        type: 'compact',
        features: ['ev_charging']
      };
      mockSpotAssignmentService.findBestAvailableSpot.mockReturnValue(mockSpot);
      
      const result = checkinService.findAndReserveSpot('compact');
      
      expect(result).toEqual(mockSpot);
      expect(mockSpotAssignmentService.findBestAvailableSpot).toHaveBeenCalledWith('compact');
    });

    test('should throw detailed error when no spots available', () => {
      mockSpotAssignmentService.findBestAvailableSpot.mockReturnValue(null);
      mockSpotAssignmentService.getAvailabilityByVehicleType.mockReturnValue({
        total: 0
      });
      mockSpotRepo.findAvailable = jest.fn().mockReturnValue([]);
      
      expect(() => {
        checkinService.findAndReserveSpot('oversized');
      }).toThrow('No available spots for oversized vehicles. Compatible spots available: 0. Total spots available: 0');
    });
  });

  describe('createVehicleRecord', () => {
    test('should create vehicle record with correct data', () => {
      const vehicle = checkinService.createVehicleRecord('TEST001', 'F1-B1-S001', 'standard', 'daily');
      
      expect(vehicle).toEqual(expect.objectContaining({
        licensePlate: 'TEST001',
        spotId: 'F1-B1-S001',
        vehicleType: 'standard',
        rateType: 'daily',
        checkInTime: expect.any(String)
      }));
    });

    test('should handle repository errors', () => {
      const originalCheckIn = mockVehicleRepo.checkIn;
      mockVehicleRepo.checkIn = jest.fn(() => {
        throw new Error('Database error');
      });
      
      expect(() => {
        checkinService.createVehicleRecord('TEST001', 'F1-B1-S001', 'standard', 'hourly');
      }).toThrow('Failed to create vehicle record: Database error');
      
      mockVehicleRepo.checkIn = originalCheckIn;
    });
  });

  describe('occupySpot', () => {
    test('should successfully occupy available spot', () => {
      // Create a spot first
      const spot = mockSpotRepo.createSpot(1, 1, 1, 'standard', []);
      
      expect(() => {
        checkinService.occupySpot(spot.id, 'TEST001');
      }).not.toThrow();
      
      expect(spot.status).toBe('occupied');
      expect(spot.currentVehicle).toBe('TEST001');
    });

    test('should throw error if spot not found', () => {
      expect(() => {
        checkinService.occupySpot('NONEXISTENT', 'TEST001');
      }).toThrow('Failed to occupy spot NONEXISTENT: Spot NONEXISTENT not found');
    });
  });

  describe('rollbackCheckin', () => {
    test('should remove vehicle and free spot on rollback', () => {
      const spot = mockSpotRepo.createSpot(1, 1, 1, 'standard', []);
      mockVehicleRepo.checkIn('ROLLBACK', spot.id, 'standard');
      mockSpotRepo.occupy(spot.id, 'ROLLBACK');
      
      checkinService.rollbackCheckin('ROLLBACK', spot.id);
      
      expect(mockVehicleRepo.exists('ROLLBACK')).toBe(false);
      expect(spot.status).toBe('available');
      expect(spot.currentVehicle).toBe(null);
    });

    test('should handle errors during rollback gracefully', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create vehicle and spot that exists in mock repo
      const spot = mockSpotRepo.createSpot(3, 1, 1, 'standard', []);
      mockVehicleRepo.checkIn('ROLLBACK_ERROR', spot.id, 'standard');
      
      // Mock the vehicle repository to throw error on delete
      const originalDelete = mockVehicleRepo.delete;
      mockVehicleRepo.delete = jest.fn(() => { throw new Error('Delete error'); });
      
      // This should not throw despite internal errors
      checkinService.rollbackCheckin('ROLLBACK_ERROR', spot.id);
      
      // Should have logged error
      expect(consoleSpy).toHaveBeenCalled();
      
      // Restore mocks
      mockVehicleRepo.delete = originalDelete;
      consoleSpy.mockRestore();
    });
  });

  describe('getCheckinStats', () => {
    test('should return comprehensive statistics', () => {
      // Setup some test data
      mockVehicleRepo.checkIn('TEST001', 'F1-B1-S001', 'standard');
      mockVehicleRepo.checkIn('TEST002', 'F1-B1-S002', 'compact');
      
      const stats = checkinService.getCheckinStats();
      
      expect(stats).toEqual({
        vehicles: {
          totalParked: expect.any(Number),
          totalProcessed: expect.any(Number)
        },
        spots: {
          totalSpots: expect.any(Number),
          availableSpots: expect.any(Number),
          occupiedSpots: expect.any(Number),
          occupancyRate: expect.any(Number)
        },
        assignment: { compact: 10, standard: 20, oversized: 5 },
        timestamp: expect.any(String)
      });
    });
  });

  describe('simulateCheckin', () => {
    test('should simulate successful check-in', () => {
      mockSpotAssignmentService.simulateAssignment.mockReturnValue({
        success: true,
        assignedSpot: { id: 'F1-B1-S001' },
        spotLocation: { floor: 1, bay: 1, spot: 1 },
        compatibility: { isExactMatch: true }
      });
      
      const result = checkinService.simulateCheckin('SIM001', 'standard');
      
      expect(result).toEqual({
        success: true,
        message: 'Check-in simulation successful',
        wouldAssignSpot: 'F1-B1-S001',
        spotLocation: { floor: 1, bay: 1, spot: 1 },
        compatibility: { isExactMatch: true }
      });
      
      // Verify no actual check-in occurred
      expect(mockVehicleRepo.exists('SIM001')).toBe(false);
    });

    test('should detect duplicate vehicle in simulation', () => {
      mockVehicleRepo.checkIn('EXISTING', 'F1-B1-S001', 'standard');
      
      const result = checkinService.simulateCheckin('EXISTING', 'standard');
      
      expect(result).toEqual({
        success: false,
        error: 'DUPLICATE_VEHICLE',
        message: expect.stringContaining('EXISTING is already checked in')
      });
    });

    test('should handle no available spots in simulation', () => {
      mockSpotAssignmentService.simulateAssignment.mockReturnValue({
        success: false,
        message: 'No compatible spots available',
        availableCount: 0
      });
      
      const result = checkinService.simulateCheckin('TEST001', 'oversized');
      
      expect(result).toEqual({
        success: false,
        error: 'NO_AVAILABLE_SPOTS',
        message: 'No compatible spots available',
        availableCount: 0
      });
    });

    test('should handle simulation errors', () => {
      mockSpotAssignmentService.simulateAssignment.mockImplementation(() => {
        throw new Error('Simulation service error');
      });
      
      const result = checkinService.simulateCheckin('TEST001', 'standard');
      
      expect(result).toEqual({
        success: false,
        error: 'SIMULATION_ERROR',
        message: 'Simulation service error'
      });
    });
  });

  describe('edge cases', () => {
    test('should handle empty string license plate', () => {
      expect(() => {
        checkinService.checkInVehicle('', 'standard', 'hourly');
      }).toThrow('License plate is required and must be a string');
    });

    test('should handle case sensitivity in license plates', () => {
      const spot1 = mockSpotRepo.createSpot(2, 1, 1, 'standard', []);
      const spot2 = mockSpotRepo.createSpot(2, 1, 2, 'standard', []);
      
      mockSpotAssignmentService.findBestAvailableSpot
        .mockReturnValueOnce({
          id: 'F2-B1-S001',
          floor: 2, bay: 1, spotNumber: 1, type: 'standard', features: []
        })
        .mockReturnValueOnce({
          id: 'F2-B1-S002', 
          floor: 2, bay: 1, spotNumber: 2, type: 'standard', features: []
        });
      
      checkinService.checkInVehicle('test001', 'standard');
      
      expect(() => {
        checkinService.checkInVehicle('TEST001', 'standard');
      }).toThrow('Vehicle test001 is already checked in');
    });

    test('should handle vehicle type case sensitivity', () => {
      expect(() => {
        checkinService.checkInVehicle('TEST001', 'STANDARD', 'hourly');
      }).toThrow('Invalid vehicle type: STANDARD');
    });
  });
});