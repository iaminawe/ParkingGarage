/**
 * Check-in API Integration Tests
 * 
 * Comprehensive tests for the vehicle check-in system including
 * spot assignment, duplicate prevention, error handling, and
 * integration with existing garage management systems.
 */

const request = require('supertest');
const app = require('../../src/app');
const MemoryStore = require('../../src/storage/memoryStore');

describe('Vehicle Check-in System Integration Tests', () => {
  let store;

  beforeEach(() => {
    // Reset memory store before each test
    store = MemoryStore.getInstance();
    store.spots.clear();
    store.vehicles.clear();
    store.spotsByFloorBay.clear();
    store.occupiedSpots.clear();

    // Initialize garage with test data
    initializeTestGarage();
  });

  /**
   * Initialize garage with consistent test data
   */
  function initializeTestGarage() {
    // Create spots across 3 floors, 2 bays each, 5 spots per bay
    const SpotRepository = require('../../src/repositories/spotRepository');
    const spotRepo = new SpotRepository();

    for (let floor = 1; floor <= 3; floor++) {
      for (let bay = 1; bay <= 2; bay++) {
        for (let spot = 1; spot <= 5; spot++) {
          // Create different spot types for testing compatibility
          let spotType = 'standard';
          if (spot === 1) spotType = 'compact';
          if (spot === 5) spotType = 'oversized';

          const features = [];
          if (spot === 2) features.push('ev_charging');
          if (spot === 3 && floor === 1) features.push('handicap');

          spotRepo.createSpot(floor, bay, spot, spotType, features);
        }
      }
    }
  }

  describe('POST /api/checkin - Main Check-in Functionality', () => {
    test('should successfully check in a standard vehicle', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'TEST-001',
          vehicleType: 'standard'
        })
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Vehicle checked in successfully',
        spotId: expect.stringMatching(/^F\d+-B\d+-S\d{3}$/),
        location: {
          floor: expect.any(Number),
          bay: expect.any(Number),
          spot: expect.any(Number)
        },
        checkInTime: expect.any(String),
        vehicle: {
          licensePlate: 'TEST-001',
          type: 'standard',
          rateType: 'hourly'
        },
        spotDetails: {
          type: expect.any(String),
          features: expect.any(Array)
        },
        timestamp: expect.any(String)
      });

      // Verify spot is now occupied
      const spotId = response.body.spotId;
      const SpotRepository = require('../../src/repositories/spotRepository');
      const spotRepo = new SpotRepository();
      const spot = spotRepo.findById(spotId);
      
      expect(spot.status).toBe('occupied');
      expect(spot.currentVehicle).toBe('TEST-001');
    });

    test('should assign best available spot using assignment algorithm', async () => {
      // Check in a standard vehicle - should get spot on floor 1 (lower floors preferred)
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'TEST-002',
          vehicleType: 'standard'
        })
        .expect(201);

      expect(response.body.location.floor).toBe(1);
      expect(['standard', 'oversized']).toContain(response.body.spotDetails.type);
    });

    test('should handle compact vehicle with access to all spot types', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'COMPACT-01',
          vehicleType: 'compact'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.vehicle.type).toBe('compact');
      // Compact vehicles can use any spot type
      expect(['compact', 'standard', 'oversized']).toContain(response.body.spotDetails.type);
    });

    test('should handle oversized vehicle restricted to oversized spots only', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'LARGE-01',
          vehicleType: 'oversized'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.vehicle.type).toBe('oversized');
      expect(response.body.spotDetails.type).toBe('oversized');
    });

    test('should support different rate types', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'DAILY-001',
          vehicleType: 'standard',
          rateType: 'daily'
        })
        .expect(201);

      expect(response.body.vehicle.rateType).toBe('daily');
    });

    test('should normalize license plate to uppercase', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'test-lower',
          vehicleType: 'standard'
        })
        .expect(201);

      expect(response.body.vehicle.licensePlate).toBe('TEST-LOWER');
    });
  });

  describe('Duplicate Prevention', () => {
    test('should prevent duplicate check-ins for same license plate', async () => {
      // First check-in should succeed
      await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'DUPE01',
          vehicleType: 'standard'
        })
        .expect(201);

      // Second check-in should fail with 409 Conflict
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'DUPE01',
          vehicleType: 'standard'
        })
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        message: 'Vehicle already checked in',
        error: expect.stringContaining('DUPE01 is already checked in'),
        errorCode: 'DUPLICATE_CHECKIN',
        timestamp: expect.any(String)
      });
    });

    test('should handle case-insensitive license plate duplicate detection', async () => {
      await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'CASE-TEST',
          vehicleType: 'standard'
        })
        .expect(201);

      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'case-test',
          vehicleType: 'standard'
        })
        .expect(409);

      expect(response.body.errorCode).toBe('DUPLICATE_CHECKIN');
    });
  });

  describe('Error Handling and Validation', () => {
    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Content-Type', 'application/json')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Request body is required');
    });

    test('should validate license plate format', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'A', // Too short
          vehicleType: 'standard'
        })
        .expect(400);

      expect(response.body.errors).toContain('License plate must be between 2 and 10 characters');
    });

    test('should validate vehicle type', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'TEST-001',
          vehicleType: 'invalid-type'
        })
        .expect(400);

      expect(response.body.errors).toContain('Invalid vehicle type: invalid-type. Valid types: compact, standard, oversized');
    });

    test('should validate rate type', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'TEST-001',
          vehicleType: 'standard',
          rateType: 'invalid-rate'
        })
        .expect(400);

      expect(response.body.errors).toContain('Invalid rate type: invalid-rate. Valid types: hourly, daily, monthly');
    });

    test('should reject invalid fields', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'TEST-001',
          vehicleType: 'standard',
          invalidField: 'should not be here'
        })
        .expect(400);

      expect(response.body.errors).toContain('Invalid fields: invalidField. Valid fields: licensePlate, vehicleType, rateType');
    });

    test('should validate content type', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Content-Type', 'text/plain')
        .send('invalid content')
        .expect(400);

      expect(response.body.message).toBe('Content-Type must be application/json');
    });
  });

  describe('Garage Full Scenarios', () => {
    test('should handle garage full scenario', async () => {
      // Fill all spots
      const SpotRepository = require('../../src/repositories/spotRepository');
      const VehicleRepository = require('../../src/repositories/vehicleRepository');
      const spotRepo = new SpotRepository();
      const vehicleRepo = new VehicleRepository();

      const allSpots = spotRepo.findAll();
      for (let i = 0; i < allSpots.length; i++) {
        const licensePlate = `FILL${String(i + 1).padStart(3, '0')}`;
        vehicleRepo.checkIn(licensePlate, allSpots[i].id, 'standard');
        spotRepo.occupy(allSpots[i].id, licensePlate);
      }

      // Try to check in when garage is full
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'LATE01',
          vehicleType: 'standard'
        })
        .expect(503);

      expect(response.body).toEqual({
        success: false,
        message: 'Garage is full',
        error: expect.stringContaining('No available spots'),
        errorCode: 'GARAGE_FULL',
        timestamp: expect.any(String)
      });
    });

    test('should handle no compatible spots for oversized vehicle', async () => {
      // Fill all oversized spots
      const SpotRepository = require('../../src/repositories/spotRepository');
      const VehicleRepository = require('../../src/repositories/vehicleRepository');
      const spotRepo = new SpotRepository();
      const vehicleRepo = new VehicleRepository();

      const oversizedSpots = spotRepo.findByType('oversized');
      for (let i = 0; i < oversizedSpots.length; i++) {
        const licensePlate = `LARGE${String(i + 1).padStart(2, '0')}`;
        vehicleRepo.checkIn(licensePlate, oversizedSpots[i].id, 'oversized');
        spotRepo.occupy(oversizedSpots[i].id, licensePlate);
      }

      // Try to check in another oversized vehicle
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'LATE-01',
          vehicleType: 'oversized'
        })
        .expect(503);

      expect(response.body.errorCode).toBe('GARAGE_FULL');
      expect(response.body.error).toContain('No available spots for oversized vehicles');
    });
  });

  describe('POST /api/checkin/simulate - Check-in Simulation', () => {
    test('should simulate successful check-in', async () => {
      const response = await request(app)
        .post('/api/checkin/simulate')
        .send({
          licensePlate: 'SIM-TEST',
          vehicleType: 'standard'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Check-in simulation successful',
        wouldAssignSpot: expect.stringMatching(/^F\d+-B\d+-S\d{3}$/),
        spotLocation: {
          floor: expect.any(Number),
          bay: expect.any(Number),
          spot: expect.any(Number)
        },
        compatibility: {
          vehicleType: 'standard',
          spotType: expect.any(String),
          isExactMatch: expect.any(Boolean)
        },
        timestamp: expect.any(String)
      });

      // Verify no actual check-in occurred
      const VehicleRepository = require('../../src/repositories/vehicleRepository');
      const vehicleRepo = new VehicleRepository();
      expect(vehicleRepo.exists('SIM-TEST')).toBe(false);
    });

    test('should simulate duplicate vehicle detection', async () => {
      // First check in a vehicle
      await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'EXISTING',
          vehicleType: 'standard'
        })
        .expect(201);

      // Simulate check-in for same vehicle
      const response = await request(app)
        .post('/api/checkin/simulate')
        .send({
          licensePlate: 'EXISTING',
          vehicleType: 'standard'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        error: 'DUPLICATE_VEHICLE',
        message: expect.stringContaining('EXISTING is already checked in'),
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/checkin/availability - Availability Information', () => {
    test('should return general availability information', async () => {
      const response = await request(app)
        .get('/api/checkin/availability')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Current availability information',
        overall: {
          totalSpots: expect.any(Number),
          availableSpots: expect.any(Number),
          occupiedSpots: expect.any(Number),
          occupancyRate: expect.any(Number)
        },
        byVehicleType: {
          compact: {
            totalCompatible: expect.any(Number),
            available: expect.any(Boolean),
            bySpotType: expect.any(Object)
          },
          standard: {
            totalCompatible: expect.any(Number),
            available: expect.any(Boolean),
            bySpotType: expect.any(Object)
          },
          oversized: {
            totalCompatible: expect.any(Number),
            available: expect.any(Boolean),
            bySpotType: expect.any(Object)
          }
        },
        currentlyParked: expect.any(Number),
        timestamp: expect.any(String)
      });
    });

    test('should return availability for specific vehicle type', async () => {
      const response = await request(app)
        .get('/api/checkin/availability/standard')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        vehicleType: 'standard',
        availability: {
          totalCompatibleSpots: expect.any(Number),
          hasAvailable: expect.any(Boolean),
          bySpotType: expect.any(Object)
        },
        assignment: expect.objectContaining({
          wouldAssignTo: expect.any(String),
          location: expect.any(Object),
          spotType: expect.any(String),
          isExactMatch: expect.any(Boolean)
        }),
        message: 'Spots available for this vehicle type',
        timestamp: expect.any(String)
      });
    });

    test('should validate vehicle type for availability check', async () => {
      const response = await request(app)
        .get('/api/checkin/availability/invalid-type')
        .expect(400);

      expect(response.body.message).toContain('Invalid vehicle type: invalid-type');
    });
  });

  describe('GET /api/checkin/stats - Statistics', () => {
    test('should return check-in statistics', async () => {
      // Check in a few vehicles
      await request(app).post('/api/checkin').send({ licensePlate: 'STAT-01', vehicleType: 'compact' });
      await request(app).post('/api/checkin').send({ licensePlate: 'STAT-02', vehicleType: 'standard' });

      const response = await request(app)
        .get('/api/checkin/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Check-in statistics retrieved successfully',
        statistics: {
          vehicles: {
            totalParked: expect.any(Number),
            totalProcessed: expect.any(Number)
          },
          occupancy: {
            totalSpots: expect.any(Number),
            availableSpots: expect.any(Number),
            occupiedSpots: expect.any(Number),
            occupancyRate: expect.any(Number)
          },
          assignment: {
            totalSpots: expect.any(Number),
            availableSpots: expect.any(Number),
            occupancyRate: expect.any(String),
            byVehicleType: expect.any(Object)
          }
        },
        timestamp: expect.any(String)
      });

      expect(response.body.statistics.vehicles.totalParked).toBe(2);
    });
  });

  describe('GET /api/checkin/health - Health Check', () => {
    test('should return service health information', async () => {
      const response = await request(app)
        .get('/api/checkin/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        service: 'checkin',
        status: 'operational',
        summary: {
          totalSpots: expect.any(Number),
          availableSpots: expect.any(Number),
          currentlyParked: expect.any(Number)
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('Integration with Existing Systems', () => {
    test('should integrate with spot repository', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'INTG01',
          vehicleType: 'standard'
        })
        .expect(201);

      // Verify via spot repository
      const SpotRepository = require('../../src/repositories/spotRepository');
      const spotRepo = new SpotRepository();
      const spot = spotRepo.findById(response.body.spotId);
      
      expect(spot.isOccupied()).toBe(true);
      expect(spot.currentVehicle).toBe('INTG01');
    });

    test('should integrate with vehicle repository', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'INTG02',
          vehicleType: 'compact'
        })
        .expect(201);

      // Verify via vehicle repository
      const VehicleRepository = require('../../src/repositories/vehicleRepository');
      const vehicleRepo = new VehicleRepository();
      const vehicle = vehicleRepo.findById('INTG02');
      
      expect(vehicle).toBeTruthy();
      expect(vehicle.licensePlate).toBe('INTG02');
      expect(vehicle.spotId).toBe(response.body.spotId);
      expect(vehicle.vehicleType).toBe('compact');
      expect(vehicle.isCheckedOut()).toBe(false);
    });

    test('should maintain atomic operations', async () => {
      // This test verifies that if any part of check-in fails, 
      // the entire operation is rolled back
      const SpotRepository = require('../../src/repositories/spotRepository');
      const VehicleRepository = require('../../src/repositories/vehicleRepository');
      const spotRepo = new SpotRepository();
      const vehicleRepo = new VehicleRepository();

      const initialSpotCount = spotRepo.findAvailable().length;
      const initialVehicleCount = vehicleRepo.count();

      // Try check-in with very long license plate that will fail validation after processing
      await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'TOOLONGPLATE',
          vehicleType: 'standard'
        })
        .expect(400);

      // Verify no changes were made
      expect(spotRepo.findAvailable().length).toBe(initialSpotCount);
      expect(vehicleRepo.count()).toBe(initialVehicleCount);
    });
  });

  describe('Edge Cases', () => {
    test('should handle simultaneous check-in attempts gracefully', async () => {
      // This is a simplified test for concurrent access
      // In a real-world scenario, you'd need more sophisticated testing
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/checkin')
            .send({
              licensePlate: `CONC${i}`,
              vehicleType: 'standard'
            })
        );
      }

      const results = await Promise.all(promises);
      const successfulCheckins = results.filter(r => r.status === 201);
      
      expect(successfulCheckins.length).toBe(5);
      
      // Verify all got different spots
      const assignedSpots = successfulCheckins.map(r => r.body.spotId);
      const uniqueSpots = new Set(assignedSpots);
      expect(uniqueSpots.size).toBe(assignedSpots.length);
    });

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Content-Type', 'application/json')
        .send('{}')
        .expect(400);

      expect(response.body.message).toBe('Request body is required');
    });

    test('should handle whitespace in license plates', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: '  WHITESPACE  ',
          vehicleType: 'standard'
        })
        .expect(201);

      expect(response.body.vehicle.licensePlate).toBe('WHITESPACE');
    });
  });
});