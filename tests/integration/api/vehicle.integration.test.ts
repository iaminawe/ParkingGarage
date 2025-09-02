/**
 * Integration tests for Vehicle API endpoints
 * 
 * Tests complete request-response cycle including authentication,
 * validation, database operations, and error handling.
 */

import request from 'supertest';
import { Application } from 'express';
import { DatabaseService } from '../../../src/services/DatabaseService';
import { VehicleType, VehicleStatus } from '@prisma/client';
import { setupTestDatabase, cleanupTestDatabase } from '../../helpers/database-helpers';
import { createTestApp } from '../../helpers/app-helpers';
import { generateAuthToken, createTestUser } from '../../helpers/auth-helpers';
import { TestDataFactory } from '../../factories/TestDataFactory';

describe('Vehicle API Integration Tests', () => {
  let app: Application;
  let databaseService: DatabaseService;
  let authToken: string;
  let testUserId: string;
  let testDataFactory: TestDataFactory;

  beforeAll(async () => {
    databaseService = await setupTestDatabase();
    app = await createTestApp(databaseService);
    testDataFactory = new TestDataFactory(databaseService);
    
    // Create test user and get auth token
    const testUser = await createTestUser(databaseService, {
      email: 'test@example.com',
      role: 'ADMIN'
    });
    testUserId = testUser.id;
    authToken = generateAuthToken(testUser);
  }, 30000);

  afterAll(async () => {
    await cleanupTestDatabase(databaseService);
  }, 30000);

  beforeEach(async () => {
    // Clear test data before each test
    await testDataFactory.cleanup();
  });

  describe('POST /api/vehicles', () => {
    const validVehicleData = {
      licensePlate: 'ABC123',
      vehicleType: VehicleType.STANDARD,
      make: 'Toyota',
      model: 'Camry',
      color: 'Blue',
      year: 2020,
      ownerName: 'John Doe',
      ownerEmail: 'john@example.com',
      ownerPhone: '+1234567890'
    };

    it('should create a new vehicle with valid data', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validVehicleData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          licensePlate: 'ABC123',
          vehicleType: VehicleType.STANDARD,
          make: 'Toyota',
          model: 'Camry',
          color: 'Blue',
          year: 2020,
          ownerName: 'John Doe',
          ownerEmail: 'john@example.com',
          status: VehicleStatus.ACTIVE
        }
      });

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('should normalize license plate to uppercase', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validVehicleData,
          licensePlate: 'xyz789'
        })
        .expect(201);

      expect(response.body.data.licensePlate).toBe('XYZ789');
    });

    it('should reject duplicate license plates', async () => {
      // Create first vehicle
      await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validVehicleData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validVehicleData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('already exists')
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('required')
      });
    });

    it('should validate license plate format', async () => {
      const invalidLicensePlates = [
        'A',           // Too short
        'ABCDEFGHIJK', // Too long
        'ABC-123',     // Invalid character
        'ABC 123',     // Space
        '12345678',    // Only numbers
        'ABCDEFGH'     // Only letters
      ];

      for (const licensePlate of invalidLicensePlates) {
        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...validVehicleData,
            licensePlate
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validVehicleData,
          ownerEmail: 'invalid-email'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('email')
      });
    });

    it('should validate phone format', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validVehicleData,
          ownerPhone: 'invalid-phone'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('phone')
      });
    });

    it('should validate vehicle type enum', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validVehicleData,
          vehicleType: 'INVALID_TYPE'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate year range', async () => {
      const invalidYears = [1800, 2050, -2020, 0];
      
      for (const year of invalidYears) {
        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...validVehicleData,
            year
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/vehicles')
        .send(validVehicleData)
        .expect(401);
    });

    it('should reject invalid authentication token', async () => {
      await request(app)
        .post('/api/vehicles')
        .set('Authorization', 'Bearer invalid-token')
        .send(validVehicleData)
        .expect(401);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database service to throw error
      const originalCreate = databaseService.getClient().vehicle.create;
      databaseService.getClient().vehicle.create = jest.fn()
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validVehicleData)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Internal server error')
      });

      // Restore original method
      databaseService.getClient().vehicle.create = originalCreate;
    });
  });

  describe('GET /api/vehicles', () => {
    beforeEach(async () => {
      // Create test vehicles
      await testDataFactory.createVehicles([
        {
          licensePlate: 'ABC123',
          vehicleType: VehicleType.STANDARD,
          make: 'Toyota',
          model: 'Camry',
          ownerName: 'John Doe',
          status: VehicleStatus.ACTIVE
        },
        {
          licensePlate: 'XYZ789',
          vehicleType: VehicleType.COMPACT,
          make: 'Honda',
          model: 'Civic',
          ownerName: 'Jane Smith',
          status: VehicleStatus.ACTIVE
        },
        {
          licensePlate: 'DEF456',
          vehicleType: VehicleType.SUV,
          make: 'Ford',
          model: 'Explorer',
          ownerName: 'Bob Johnson',
          status: VehicleStatus.INACTIVE
        }
      ]);
    });

    it('should return all vehicles with pagination', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          vehicles: expect.arrayContaining([
            expect.objectContaining({ licensePlate: 'ABC123' }),
            expect.objectContaining({ licensePlate: 'XYZ789' }),
            expect.objectContaining({ licensePlate: 'DEF456' })
          ]),
          pagination: {
            page: 1,
            limit: 20,
            total: 3,
            totalPages: 1
          }
        }
      });
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.vehicles).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2
      });
    });

    it('should filter by vehicle type', async () => {
      const response = await request(app)
        .get(`/api/vehicles?vehicleType=${VehicleType.COMPACT}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.vehicles).toHaveLength(1);
      expect(response.body.data.vehicles[0].vehicleType).toBe(VehicleType.COMPACT);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get(`/api/vehicles?status=${VehicleStatus.INACTIVE}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.vehicles).toHaveLength(1);
      expect(response.body.data.vehicles[0].status).toBe(VehicleStatus.INACTIVE);
    });

    it('should search by license plate', async () => {
      const response = await request(app)
        .get('/api/vehicles?licensePlate=ABC')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.vehicles).toHaveLength(1);
      expect(response.body.data.vehicles[0].licensePlate).toBe('ABC123');
    });

    it('should search by make', async () => {
      const response = await request(app)
        .get('/api/vehicles?make=Toyota')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.vehicles).toHaveLength(1);
      expect(response.body.data.vehicles[0].make).toBe('Toyota');
    });

    it('should search by owner name', async () => {
      const response = await request(app)
        .get('/api/vehicles?ownerName=John')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.vehicles).toHaveLength(1);
      expect(response.body.data.vehicles[0].ownerName).toBe('John Doe');
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get(`/api/vehicles?vehicleType=${VehicleType.STANDARD}&make=Toyota`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.vehicles).toHaveLength(1);
      expect(response.body.data.vehicles[0]).toMatchObject({
        vehicleType: VehicleType.STANDARD,
        make: 'Toyota'
      });
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=0&limit=1001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/vehicles')
        .expect(401);
    });
  });

  describe('GET /api/vehicles/:licensePlate', () => {
    let testVehicle: any;

    beforeEach(async () => {
      testVehicle = await testDataFactory.createVehicle({
        licensePlate: 'ABC123',
        vehicleType: VehicleType.STANDARD,
        make: 'Toyota',
        model: 'Camry',
        ownerName: 'John Doe'
      });
    });

    it('should return vehicle by license plate', async () => {
      const response = await request(app)
        .get('/api/vehicles/ABC123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          licensePlate: 'ABC123',
          vehicleType: VehicleType.STANDARD,
          make: 'Toyota',
          model: 'Camry',
          ownerName: 'John Doe'
        }
      });
    });

    it('should normalize license plate in URL', async () => {
      const response = await request(app)
        .get('/api/vehicles/abc123')  // lowercase
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.licensePlate).toBe('ABC123');
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .get('/api/vehicles/NOTFOUND')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('not found')
      });
    });

    it('should include related session data', async () => {
      // Create a parking session for the vehicle
      await testDataFactory.createParkingSession({
        vehicleId: testVehicle.id,
        spotId: await testDataFactory.createSpot().then(s => s.id),
        status: 'ACTIVE'
      });

      const response = await request(app)
        .get('/api/vehicles/ABC123?include=sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.sessions).toBeDefined();
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/vehicles/ABC123')
        .expect(401);
    });
  });

  describe('PUT /api/vehicles/:licensePlate', () => {
    let testVehicle: any;

    beforeEach(async () => {
      testVehicle = await testDataFactory.createVehicle({
        licensePlate: 'ABC123',
        vehicleType: VehicleType.STANDARD,
        make: 'Toyota',
        model: 'Camry',
        color: 'Blue',
        ownerName: 'John Doe'
      });
    });

    it('should update vehicle with valid data', async () => {
      const updateData = {
        color: 'Red',
        ownerName: 'John Smith',
        ownerPhone: '+1987654321'
      };

      const response = await request(app)
        .put('/api/vehicles/ABC123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          licensePlate: 'ABC123',
          color: 'Red',
          ownerName: 'John Smith',
          ownerPhone: '+1987654321'
        }
      });
    });

    it('should validate license plate uniqueness when updating', async () => {
      // Create another vehicle
      await testDataFactory.createVehicle({
        licensePlate: 'XYZ789',
        vehicleType: VehicleType.COMPACT
      });

      const response = await request(app)
        .put('/api/vehicles/ABC123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ licensePlate: 'XYZ789' })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('already exists')
      });
    });

    it('should allow same license plate when not changing', async () => {
      const response = await request(app)
        .put('/api/vehicles/ABC123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          licensePlate: 'ABC123',  // Same license plate
          color: 'Green'
        })
        .expect(200);

      expect(response.body.data.color).toBe('Green');
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .put('/api/vehicles/NOTFOUND')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ color: 'Red' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put('/api/vehicles/ABC123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ownerEmail: 'invalid-email',
          year: 1800
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/vehicles/ABC123')
        .send({ color: 'Red' })
        .expect(401);
    });
  });

  describe('DELETE /api/vehicles/:licensePlate', () => {
    let testVehicle: any;

    beforeEach(async () => {
      testVehicle = await testDataFactory.createVehicle({
        licensePlate: 'ABC123',
        vehicleType: VehicleType.STANDARD
      });
    });

    it('should soft delete vehicle', async () => {
      const response = await request(app)
        .delete('/api/vehicles/ABC123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted')
      });

      // Verify vehicle is soft deleted
      const getResponse = await request(app)
        .get('/api/vehicles/ABC123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .delete('/api/vehicles/NOTFOUND')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent deletion of vehicle with active session', async () => {
      // Create active parking session
      await testDataFactory.createParkingSession({
        vehicleId: testVehicle.id,
        spotId: await testDataFactory.createSpot().then(s => s.id),
        status: 'ACTIVE'
      });

      const response = await request(app)
        .delete('/api/vehicles/ABC123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('active session')
      });
    });

    it('should require admin role for deletion', async () => {
      // Create regular user token
      const regularUser = await createTestUser(databaseService, {
        email: 'regular@example.com',
        role: 'USER'
      });
      const regularUserToken = generateAuthToken(regularUser);

      await request(app)
        .delete('/api/vehicles/ABC123')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });
  });

  describe('GET /api/vehicles/stats', () => {
    beforeEach(async () => {
      await testDataFactory.createVehicles([
        { licensePlate: 'ABC123', vehicleType: VehicleType.STANDARD, status: VehicleStatus.ACTIVE },
        { licensePlate: 'DEF456', vehicleType: VehicleType.COMPACT, status: VehicleStatus.ACTIVE },
        { licensePlate: 'GHI789', vehicleType: VehicleType.SUV, status: VehicleStatus.INACTIVE }
      ]);
    });

    it('should return vehicle statistics', async () => {
      const response = await request(app)
        .get('/api/vehicles/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          total: 3,
          byStatus: {
            [VehicleStatus.ACTIVE]: 2,
            [VehicleStatus.INACTIVE]: 1
          },
          byType: {
            [VehicleType.STANDARD]: 1,
            [VehicleType.COMPACT]: 1,
            [VehicleType.SUV]: 1
          },
          totalRevenue: expect.any(Number),
          averageSessionDuration: expect.any(Number)
        }
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/vehicles/stats')
        .expect(401);
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits on vehicle creation', async () => {
      const requests = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/vehicles')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              licensePlate: `TEST${i}`,
              vehicleType: VehicleType.STANDARD
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing content-type', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send('not json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize error messages', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licensePlate: '<script>alert("xss")</script>'
        })
        .expect(400);

      expect(response.body.error).not.toContain('<script>');
    });

    it('should handle concurrent requests gracefully', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            licensePlate: `CONCURRENT${i}`,
            vehicleType: VehicleType.STANDARD
          })
      );

      const responses = await Promise.allSettled(concurrentRequests);
      
      // All requests should complete (either success or controlled failure)
      responses.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });
});
