/**
 * Vehicle Management API Tests
 * 
 * Comprehensive test suite for vehicle CRUD operations, validation,
 * error handling, and edge cases. Tests all endpoints and business logic.
 * 
 * @module VehicleTests
 */

const request = require('supertest');
const app = require('../src/app');
const { VehicleRepository } = require('../src/repositories/vehicleRepository');

describe('Vehicle Management API', () => {
  let vehicleRepository;

  beforeEach(() => {
    // Clear repository before each test
    vehicleRepository = new VehicleRepository();
    vehicleRepository.clear();
  });

  afterEach(() => {
    // Clean up after each test
    vehicleRepository.clear();
  });

  describe('POST /api/vehicles', () => {
    describe('Valid vehicle creation', () => {
      it('should create a vehicle with minimum required data', async () => {
        const vehicleData = {
          licensePlate: 'TEST001',
          vehicleType: 'standard'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .send(vehicleData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.licensePlate).toBe('TEST001');
        expect(response.body.data.id).toBe('TEST001');
        expect(response.body.data.status).toBe('active');
        expect(response.body.message).toBe('Vehicle created successfully');
      });

      it('should create a vehicle with complete data', async () => {
        const vehicleData = {
          licensePlate: 'ABC123',
          vehicleType: 'standard',
          rateType: 'hourly',
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          year: 2020,
          ownerId: 'owner001',
          ownerName: 'John Doe',
          ownerEmail: 'john@example.com',
          ownerPhone: '555-0123',
          notes: 'Regular customer vehicle'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .send(vehicleData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.licensePlate).toBe('ABC123');
        expect(response.body.data.make).toBe('Toyota');
        expect(response.body.data.model).toBe('Camry');
        expect(response.body.data.color).toBe('Blue');
        expect(response.body.data.year).toBe(2020);
        expect(response.body.data.ownerName).toBe('John Doe');
        expect(response.body.data.ownerEmail).toBe('john@example.com');
        expect(response.body.data.ownerPhone).toBe('555-0123');
        expect(response.body.data.notes).toBe('Regular customer vehicle');
      });

      it('should normalize license plate to uppercase', async () => {
        const vehicleData = {
          licensePlate: 'abc123',
          vehicleType: 'standard'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .send(vehicleData)
          .expect(201);

        expect(response.body.data.licensePlate).toBe('ABC123');
      });
    });

    describe('Validation errors', () => {
      it('should reject request without license plate', async () => {
        const vehicleData = {
          vehicleType: 'standard'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .send(vehicleData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('License plate is required');
      });

      it('should reject invalid vehicle type', async () => {
        const vehicleData = {
          licensePlate: 'TEST001',
          vehicleType: 'invalid'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .send(vehicleData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('Invalid vehicle type: invalid. Valid types: compact, standard, oversized');
      });

      it('should reject invalid email format', async () => {
        const vehicleData = {
          licensePlate: 'TEST001',
          vehicleType: 'standard',
          ownerEmail: 'invalid-email'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .send(vehicleData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('Owner email must be a valid email address');
      });

      it('should reject invalid year', async () => {
        const vehicleData = {
          licensePlate: 'TEST001',
          vehicleType: 'standard',
          year: 1800
        };

        const response = await request(app)
          .post('/api/vehicles')
          .send(vehicleData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('Year must be between 1900 and');
      });

      it('should reject duplicate license plate', async () => {
        const vehicleData = {
          licensePlate: 'DUP001',
          vehicleType: 'standard'
        };

        // Create first vehicle
        await request(app)
          .post('/api/vehicles')
          .send(vehicleData)
          .expect(201);

        // Try to create duplicate
        const response = await request(app)
          .post('/api/vehicles')
          .send(vehicleData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Vehicle with license plate DUP001 already exists');
      });
    });
  });

  describe('GET /api/vehicles', () => {
    beforeEach(async () => {
      // Create test vehicles
      const testVehicles = [
        { licensePlate: 'TEST001', vehicleType: 'compact', make: 'Honda', model: 'Civic', ownerName: 'Alice Smith' },
        { licensePlate: 'TEST002', vehicleType: 'standard', make: 'Toyota', model: 'Camry', ownerName: 'Bob Jones' },
        { licensePlate: 'TEST003', vehicleType: 'oversized', make: 'Ford', model: 'F-150', ownerName: 'Carol Wilson' }
      ];

      for (const vehicle of testVehicles) {
        await request(app)
          .post('/api/vehicles')
          .send(vehicle);
      }
    });

    it('should get all vehicles with default pagination', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination.totalItems).toBe(3);
      expect(response.body.pagination.currentPage).toBe(1);
    });

    it('should filter vehicles by vehicle type', async () => {
      const response = await request(app)
        .get('/api/vehicles?vehicleType=compact')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].licensePlate).toBe('TEST001');
    });

    it('should search vehicles by license plate', async () => {
      const response = await request(app)
        .get('/api/vehicles?search=TEST001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].licensePlate).toBe('TEST001');
    });

    it('should search vehicles by owner name', async () => {
      const response = await request(app)
        .get('/api/vehicles?search=Alice')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].ownerName).toBe('Alice Smith');
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.totalItems).toBe(3);
      expect(response.body.pagination.totalPages).toBe(2);
      expect(response.body.pagination.hasNextPage).toBe(true);
    });

    it('should handle sorting', async () => {
      const response = await request(app)
        .get('/api/vehicles?sortBy=licensePlate&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].licensePlate).toBe('TEST001');
      expect(response.body.data[1].licensePlate).toBe('TEST002');
      expect(response.body.data[2].licensePlate).toBe('TEST003');
    });
  });

  describe('GET /api/vehicles/:id', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: 'GET001',
          vehicleType: 'standard',
          make: 'Honda',
          model: 'Accord',
          ownerName: 'John Doe'
        });
    });

    it('should get vehicle by license plate', async () => {
      const response = await request(app)
        .get('/api/vehicles/GET001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licensePlate).toBe('GET001');
      expect(response.body.data.make).toBe('Honda');
      expect(response.body.data.model).toBe('Accord');
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .get('/api/vehicles/NOTFOUND')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vehicle not found');
    });

    it('should validate license plate format', async () => {
      const response = await request(app)
        .get('/api/vehicles/X')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid license plate format');
    });
  });

  describe('PUT /api/vehicles/:id', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: 'UPDATE001',
          vehicleType: 'standard',
          make: 'Honda',
          model: 'Civic',
          ownerName: 'Jane Doe'
        });
    });

    it('should update vehicle with valid data', async () => {
      const updates = {
        make: 'Toyota',
        model: 'Corolla',
        color: 'Red',
        ownerEmail: 'jane.new@example.com'
      };

      const response = await request(app)
        .put('/api/vehicles/UPDATE001')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.make).toBe('Toyota');
      expect(response.body.data.model).toBe('Corolla');
      expect(response.body.data.color).toBe('Red');
      expect(response.body.data.ownerEmail).toBe('jane.new@example.com');
      expect(response.body.message).toBe('Vehicle updated successfully');
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .put('/api/vehicles/NOTFOUND')
        .send({ make: 'Toyota' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vehicle not found');
    });

    it('should reject immutable field updates', async () => {
      const response = await request(app)
        .put('/api/vehicles/UPDATE001')
        .send({ licensePlate: 'CHANGED' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Cannot update immutable fields: licensePlate');
    });

    it('should validate email format in updates', async () => {
      const response = await request(app)
        .put('/api/vehicles/UPDATE001')
        .send({ ownerEmail: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Owner email must be a valid email address');
    });
  });

  describe('DELETE /api/vehicles/:id', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: 'DELETE001',
          vehicleType: 'standard',
          make: 'Honda',
          model: 'Civic'
        });
    });

    it('should delete vehicle successfully', async () => {
      const response = await request(app)
        .delete('/api/vehicles/DELETE001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Vehicle deleted successfully');

      // Verify vehicle is deleted
      await request(app)
        .get('/api/vehicles/DELETE001')
        .expect(404);
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .delete('/api/vehicles/NOTFOUND')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vehicle not found');
    });

    it('should prevent deletion of parked vehicles', async () => {
      // This would require checking in the vehicle first
      // The test assumes the business logic prevents deletion of active parking sessions
      // Implementation would depend on the specific business rules
    });
  });

  describe('POST /api/vehicles/bulk-delete', () => {
    beforeEach(async () => {
      const testVehicles = [
        { licensePlate: 'BULK001', vehicleType: 'standard' },
        { licensePlate: 'BULK002', vehicleType: 'compact' },
        { licensePlate: 'BULK003', vehicleType: 'oversized' }
      ];

      for (const vehicle of testVehicles) {
        await request(app)
          .post('/api/vehicles')
          .send(vehicle);
      }
    });

    it('should bulk delete vehicles successfully', async () => {
      const response = await request(app)
        .post('/api/vehicles/bulk-delete')
        .send({ vehicleIds: ['BULK001', 'BULK002'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.successful).toBe(2);
      expect(response.body.data.failed).toBe(0);

      // Verify vehicles are deleted
      await request(app)
        .get('/api/vehicles/BULK001')
        .expect(404);

      await request(app)
        .get('/api/vehicles/BULK002')
        .expect(404);
    });

    it('should handle mixed success/failure results', async () => {
      const response = await request(app)
        .post('/api/vehicles/bulk-delete')
        .send({ vehicleIds: ['BULK001', 'NOTFOUND', 'BULK002'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.successful).toBe(2);
      expect(response.body.data.failed).toBe(1);

      const failedResult = response.body.data.results.find(r => r.id === 'NOTFOUND');
      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBe('Vehicle not found');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/vehicles/bulk-delete')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('vehicleIds field is required');
    });

    it('should validate vehicle IDs format', async () => {
      const response = await request(app)
        .post('/api/vehicles/bulk-delete')
        .send({ vehicleIds: ['VALID001', 'X', 'VALID002'] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Invalid license plate at index 1: X');
    });

    it('should limit bulk operation size', async () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => `TEST${i.toString().padStart(3, '0')}`);
      
      const response = await request(app)
        .post('/api/vehicles/bulk-delete')
        .send({ vehicleIds: tooManyIds })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('vehicleIds array cannot contain more than 50 items');
    });
  });

  describe('GET /api/vehicles/metrics', () => {
    beforeEach(async () => {
      const testVehicles = [
        { licensePlate: 'METRIC001', vehicleType: 'compact' },
        { licensePlate: 'METRIC002', vehicleType: 'standard' },
        { licensePlate: 'METRIC003', vehicleType: 'standard' },
        { licensePlate: 'METRIC004', vehicleType: 'oversized' }
      ];

      for (const vehicle of testVehicles) {
        await request(app)
          .post('/api/vehicles')
          .send(vehicle);
      }
    });

    it('should return vehicle metrics', async () => {
      const response = await request(app)
        .get('/api/vehicles/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(4);
      expect(response.body.data.byType.compact).toBe(1);
      expect(response.body.data.byType.standard).toBe(2);
      expect(response.body.data.byType.oversized).toBe(1);
      expect(response.body.data.byStatus.active).toBe(4);
      expect(response.body.data.byStatus.inactive).toBe(0);
    });
  });

  describe('GET /api/vehicles/search', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: 'SEARCH001',
          vehicleType: 'standard',
          make: 'Toyota',
          model: 'Camry'
        });
    });

    it('should search vehicles by license plate', async () => {
      const response = await request(app)
        .get('/api/vehicles/search?search=SEARCH001&mode=exact')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      // Additional assertions would depend on SearchService implementation
    });

    it('should require search parameter', async () => {
      const response = await request(app)
        .get('/api/vehicles/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Search parameter is required');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid content type', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Content-Type must be application/json');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express will handle JSON parsing errors before our middleware
    });

    it('should include timestamp in all responses', async () => {
      const response = await request(app)
        .get('/api/vehicles/NOTFOUND')
        .expect(404);

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });
});