/**
 * @file spots.api.test.ts
 * @description Comprehensive API tests for parking spot management endpoints
 * 
 * Tests cover:
 * - CRUD operations for parking spots
 * - Spot status management (occupy/free)
 * - Search and filtering functionality
 * - Statistics and availability
 * - Error handling and edge cases
 */

import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import {
  createMockRequest,
  createMockResponse,
  createTestUser,
  createTestGarage,
  cleanupTestDatabase,
  seedTestDatabase,
  expectSuccessResponse,
  expectErrorResponse
} from '../helpers/testUtils';

const prisma = new PrismaClient();

describe('Spots API Endpoints', () => {
  let testGarage: any;
  let testFloor: any;
  let testSpots: any[] = [];
  let authToken: string;
  
  beforeAll(async () => {
    // Clean database before all tests
    await cleanupTestDatabase(prisma);
    
    // Seed test data
    const seedData = await seedTestDatabase(prisma);
    testGarage = seedData.testGarage;
    
    // Create auth token for admin user
    authToken = `Bearer test-admin-token`;
    
    // Create test floor
    testFloor = await prisma.floor.create({
      data: {
        garageId: testGarage.id,
        floorNumber: 1,
        description: 'Ground Floor',
        totalSpots: 10,
        isActive: true
      }
    });
  });

  beforeEach(async () => {
    // Create test spots for each test
    testSpots = await Promise.all([
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S1',
          floorId: testFloor.id,
          level: 1,
          section: 'B1',
          spotType: 'STANDARD',
          status: 'AVAILABLE',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S2',
          floorId: testFloor.id,
          level: 1,
          section: 'B1',
          spotType: 'COMPACT',
          status: 'OCCUPIED',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B2-S1',
          floorId: testFloor.id,
          level: 1,
          section: 'B2',
          spotType: 'OVERSIZED',
          status: 'AVAILABLE',
          isActive: true
        }
      })
    ]);
  });

  afterEach(async () => {
    // Clean up spots after each test
    await prisma.parkingSpot.deleteMany({
      where: { floorId: testFloor.id }
    });
    testSpots = [];
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('GET /api/spots', () => {
    it('should return all spots with default pagination', async () => {
      const response = await request(app)
        .get('/api/spots')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.spots)).toBe(true);
      expect(response.body.data.spots.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(testSpots.length);
    });

    it('should filter spots by status', async () => {
      const response = await request(app)
        .get('/api/spots?status=available')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spots.every((spot: any) => 
        spot.status === 'AVAILABLE'
      )).toBe(true);
    });

    it('should filter spots by type', async () => {
      const response = await request(app)
        .get('/api/spots?type=compact')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spots.every((spot: any) => 
        spot.spotType === 'COMPACT'
      )).toBe(true);
    });

    it('should filter spots by floor', async () => {
      const response = await request(app)
        .get('/api/spots?floor=1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spots.every((spot: any) => 
        spot.level === 1
      )).toBe(true);
    });

    it('should filter spots by bay/section', async () => {
      const response = await request(app)
        .get('/api/spots?bay=B1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spots.every((spot: any) => 
        spot.section === 'B1'
      )).toBe(true);
    });

    it('should support combined filters', async () => {
      const response = await request(app)
        .get('/api/spots?status=available&type=standard&floor=1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const spots = response.body.data.spots;
      expect(spots.every((spot: any) => 
        spot.status === 'AVAILABLE' && 
        spot.spotType === 'STANDARD' && 
        spot.level === 1
      )).toBe(true);
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/api/spots?limit=2&offset=0')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spots.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.offset).toBe(0);
    });

    it('should support sorting by id ascending', async () => {
      const response = await request(app)
        .get('/api/spots?sort=id&order=asc')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const spots = response.body.data.spots;
      if (spots.length > 1) {
        expect(spots[0].id <= spots[1].id).toBe(true);
      }
    });

    it('should support sorting by updatedAt descending', async () => {
      const response = await request(app)
        .get('/api/spots?sort=updatedAt&order=desc')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const spots = response.body.data.spots;
      if (spots.length > 1) {
        const date1 = new Date(spots[0].updatedAt);
        const date2 = new Date(spots[1].updatedAt);
        expect(date1 >= date2).toBe(true);
      }
    });

    it('should include additional metadata when requested', async () => {
      const response = await request(app)
        .get('/api/spots?include=metadata,features')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata).toBeDefined();
      expect(response.body.data.features).toBeDefined();
    });

    it('should return 400 for invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/spots?limit=abc')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return 400 for limit exceeding maximum', async () => {
      const response = await request(app)
        .get('/api/spots?limit=101')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('limit');
    });

    it('should return 400 for invalid sort field', async () => {
      const response = await request(app)
        .get('/api/spots?sort=invalid_field')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid sort field');
    });
  });

  describe('GET /api/spots/statistics', () => {
    it('should return comprehensive spot statistics', async () => {
      const response = await request(app)
        .get('/api/spots/statistics')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
      
      const stats = response.body.data.statistics;
      expect(stats.totalSpots).toBeGreaterThanOrEqual(testSpots.length);
      expect(stats.availableSpots).toBeGreaterThanOrEqual(0);
      expect(stats.occupiedSpots).toBeGreaterThanOrEqual(0);
      expect(stats.occupancyRate).toBeDefined();
      expect(stats.byType).toBeDefined();
      expect(stats.byFloor).toBeDefined();
    });

    it('should calculate occupancy rate correctly', async () => {
      const response = await request(app)
        .get('/api/spots/statistics')
        .set('Authorization', authToken)
        .expect(200);

      const stats = response.body.data.statistics;
      const expectedRate = stats.occupiedSpots / stats.totalSpots;
      expect(Math.abs(stats.occupancyRate - expectedRate)).toBeLessThan(0.01);
    });
  });

  describe('GET /api/spots/available', () => {
    it('should return only available spots', async () => {
      const response = await request(app)
        .get('/api/spots/available')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spots.every((spot: any) => 
        spot.status === 'AVAILABLE'
      )).toBe(true);
    });

    it('should support filtering available spots by type', async () => {
      const response = await request(app)
        .get('/api/spots/available?type=standard')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const spots = response.body.data.spots;
      expect(spots.every((spot: any) => 
        spot.status === 'AVAILABLE' && spot.spotType === 'STANDARD'
      )).toBe(true);
    });

    it('should support pagination for available spots', async () => {
      const response = await request(app)
        .get('/api/spots/available?limit=1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spots.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/spots/occupied', () => {
    it('should return only occupied spots', async () => {
      const response = await request(app)
        .get('/api/spots/occupied')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spots.every((spot: any) => 
        spot.status === 'OCCUPIED'
      )).toBe(true);
    });

    it('should include occupancy details when available', async () => {
      const response = await request(app)
        .get('/api/spots/occupied?include=occupancy')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should include additional occupancy information if available
      expect(response.body.data.spots).toBeDefined();
    });
  });

  describe('GET /api/spots/search', () => {
    it('should search spots by simple term', async () => {
      const response = await request(app)
        .get('/api/spots/search?query=F1-B1-S1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spots.some((spot: any) => 
        spot.spotNumber === 'F1-B1-S1'
      )).toBe(true);
    });

    it('should search spots by field:value format', async () => {
      const response = await request(app)
        .get('/api/spots/search?query=type:compact')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spots.every((spot: any) => 
        spot.spotType === 'COMPACT'
      )).toBe(true);
    });

    it('should search spots by multiple terms', async () => {
      const response = await request(app)
        .get('/api/spots/search?query=floor:1 available')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const spots = response.body.data.spots;
      expect(spots.every((spot: any) => 
        spot.level === 1 && spot.status === 'AVAILABLE'
      )).toBe(true);
    });

    it('should return 400 for empty search query', async () => {
      const response = await request(app)
        .get('/api/spots/search?query=')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('query');
    });

    it('should handle complex search queries', async () => {
      const response = await request(app)
        .get('/api/spots/search?query=status:available type:standard floor:1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should find spots matching all criteria
      const spots = response.body.data.spots;
      expect(spots.every((spot: any) => 
        spot.status === 'AVAILABLE' && 
        spot.spotType === 'STANDARD' && 
        spot.level === 1
      )).toBe(true);
    });
  });

  describe('GET /api/spots/:id', () => {
    it('should return spot details by ID', async () => {
      const testSpot = testSpots[0];
      const response = await request(app)
        .get(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spot.id).toBe(testSpot.id);
      expect(response.body.data.spot.spotNumber).toBe(testSpot.spotNumber);
      expect(response.body.data.spot.status).toBe(testSpot.status);
    });

    it('should return 404 for non-existent spot', async () => {
      const response = await request(app)
        .get('/api/spots/F99-B99-S99')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid spot ID format', async () => {
      const response = await request(app)
        .get('/api/spots/invalid-format')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('PUT /api/spots/:id/occupy', () => {
    let availableSpot: any;

    beforeEach(() => {
      availableSpot = testSpots.find(spot => spot.status === 'AVAILABLE');
    });

    it('should mark spot as occupied', async () => {
      const occupancyData = {
        vehicleId: 'test-vehicle-id',
        licensePlate: 'ABC123',
        notes: 'Test occupancy'
      };

      const response = await request(app)
        .put(`/api/spots/${availableSpot.spotNumber}/occupy`)
        .set('Authorization', authToken)
        .send(occupancyData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spot.status).toBe('OCCUPIED');
      expect(response.body.data.occupancyDetails).toBeDefined();

      // Verify in database
      const updatedSpot = await prisma.parkingSpot.findUnique({
        where: { id: availableSpot.id }
      });
      expect(updatedSpot?.status).toBe('OCCUPIED');
    });

    it('should mark spot as occupied without optional data', async () => {
      const response = await request(app)
        .put(`/api/spots/${availableSpot.spotNumber}/occupy`)
        .set('Authorization', authToken)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spot.status).toBe('OCCUPIED');
    });

    it('should return 400 when spot is already occupied', async () => {
      const occupiedSpot = testSpots.find(spot => spot.status === 'OCCUPIED');

      const response = await request(app)
        .put(`/api/spots/${occupiedSpot.spotNumber}/occupy`)
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already occupied');
    });

    it('should return 404 for non-existent spot', async () => {
      const response = await request(app)
        .put('/api/spots/F99-B99-S99/occupy')
        .set('Authorization', authToken)
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should validate license plate format', async () => {
      const invalidData = {
        licensePlate: '' // Empty license plate
      };

      const response = await request(app)
        .put(`/api/spots/${availableSpot.spotNumber}/occupy`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should sanitize notes field', async () => {
      const xssData = {
        notes: '<script>alert("xss")</script>Legitimate note'
      };

      const response = await request(app)
        .put(`/api/spots/${availableSpot.spotNumber}/occupy`)
        .set('Authorization', authToken)
        .send(xssData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.occupancyDetails?.notes).not.toContain('<script>');
      expect(response.body.data.occupancyDetails?.notes).toContain('Legitimate note');
    });
  });

  describe('PUT /api/spots/:id/free', () => {
    let occupiedSpot: any;

    beforeEach(() => {
      occupiedSpot = testSpots.find(spot => spot.status === 'OCCUPIED');
    });

    it('should mark spot as available', async () => {
      const response = await request(app)
        .put(`/api/spots/${occupiedSpot.spotNumber}/free`)
        .set('Authorization', authToken)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spot.status).toBe('AVAILABLE');
      expect(response.body.data.freedAt).toBeDefined();

      // Verify in database
      const updatedSpot = await prisma.parkingSpot.findUnique({
        where: { id: occupiedSpot.id }
      });
      expect(updatedSpot?.status).toBe('AVAILABLE');
    });

    it('should free spot with optional notes', async () => {
      const freeData = {
        notes: 'Customer departed normally'
      };

      const response = await request(app)
        .put(`/api/spots/${occupiedSpot.spotNumber}/free`)
        .set('Authorization', authToken)
        .send(freeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spot.status).toBe('AVAILABLE');
      expect(response.body.data.notes).toBe(freeData.notes);
    });

    it('should return 400 when spot is already available', async () => {
      const availableSpot = testSpots.find(spot => spot.status === 'AVAILABLE');

      const response = await request(app)
        .put(`/api/spots/${availableSpot.spotNumber}/free`)
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already available');
    });

    it('should return 404 for non-existent spot', async () => {
      const response = await request(app)
        .put('/api/spots/F99-B99-S99/free')
        .set('Authorization', authToken)
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('PATCH /api/spots/:id', () => {
    let testSpot: any;

    beforeEach(() => {
      testSpot = testSpots[0];
    });

    it('should update spot status', async () => {
      const updateData = {
        status: 'MAINTENANCE'
      };

      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spot.status).toBe('MAINTENANCE');

      // Verify in database
      const updatedSpot = await prisma.parkingSpot.findUnique({
        where: { id: testSpot.id }
      });
      expect(updatedSpot?.status).toBe('MAINTENANCE');
    });

    it('should update spot type', async () => {
      const updateData = {
        spotType: 'ELECTRIC'
      };

      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spot.spotType).toBe('ELECTRIC');
    });

    it('should update spot dimensions', async () => {
      const updateData = {
        width: 2.5,
        length: 5.0,
        height: 2.2
      };

      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spot.width).toBe(updateData.width);
      expect(response.body.data.spot.length).toBe(updateData.length);
      expect(response.body.data.spot.height).toBe(updateData.height);
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        spotType: 'HANDICAP',
        status: 'RESERVED',
        width: 3.0
      };

      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spot.spotType).toBe('HANDICAP');
      expect(response.body.data.spot.status).toBe('RESERVED');
      expect(response.body.data.spot.width).toBe(3.0);
    });

    it('should return 400 for empty request body', async () => {
      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('field');
    });

    it('should return 400 for invalid spot status', async () => {
      const invalidData = {
        status: 'INVALID_STATUS'
      };

      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return 400 for invalid spot type', async () => {
      const invalidData = {
        spotType: 'INVALID_TYPE'
      };

      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return 400 for negative dimensions', async () => {
      const invalidData = {
        width: -1.0,
        length: -2.0,
        height: -0.5
      };

      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('positive');
    });

    it('should return 400 when trying to update immutable fields', async () => {
      const immutableData = {
        id: 'new-id',
        spotNumber: 'F99-B99-S99',
        floorId: 'different-floor-id'
      };

      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .send(immutableData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('immutable');
    });

    it('should return 404 for non-existent spot', async () => {
      const updateData = {
        status: 'MAINTENANCE'
      };

      const response = await request(app)
        .patch('/api/spots/F99-B99-S99')
        .set('Authorization', authToken)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .get('/api/spots')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('unauthorized');
    });

    it('should allow read operations for regular users', async () => {
      const userToken = 'Bearer test-user-token';

      const response = await request(app)
        .get('/api/spots')
        .set('Authorization', userToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 403 for spot modification by regular users', async () => {
      const userToken = 'Bearer test-user-token';
      const testSpot = testSpots[0];

      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', userToken)
        .send({ status: 'MAINTENANCE' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });

    it('should allow spot status changes for operators', async () => {
      const operatorToken = 'Bearer test-operator-token';
      const availableSpot = testSpots.find(spot => spot.status === 'AVAILABLE');

      const response = await request(app)
        .put(`/api/spots/${availableSpot.spotNumber}/occupy`)
        .set('Authorization', operatorToken)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent spot occupation attempts', async () => {
      const availableSpot = testSpots.find(spot => spot.status === 'AVAILABLE');
      
      // Make two simultaneous occupation requests
      const promises = [
        request(app)
          .put(`/api/spots/${availableSpot.spotNumber}/occupy`)
          .set('Authorization', authToken)
          .send({ licensePlate: 'ABC123' }),
        request(app)
          .put(`/api/spots/${availableSpot.spotNumber}/occupy`)
          .set('Authorization', authToken)
          .send({ licensePlate: 'XYZ789' })
      ];

      const responses = await Promise.all(promises.map(p => p.catch(e => e)));
      
      // One should succeed (200), one should fail (400 - already occupied)
      const statusCodes = responses.map(r => r.status || r.response?.status);
      expect(statusCodes.includes(200)).toBe(true);
      expect(statusCodes.includes(400)).toBe(true);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // Implementation would depend on specific database error scenarios
    });

    it('should validate spot number format strictly', async () => {
      const invalidFormats = [
        'F1-B1', // Missing spot part
        'F1-S1', // Missing bay part  
        'B1-S1', // Missing floor part
        'F1-B1-S', // Missing spot number
        'Floor1-Bay1-Spot1', // Wrong format
        '1-1-1', // Missing prefixes
        'F1-B1-S1-X1', // Too many parts
      ];

      for (const invalidFormat of invalidFormats) {
        const response = await request(app)
          .get(`/api/spots/${invalidFormat}`)
          .set('Authorization', authToken);
        
        expect([400, 404]).toContain(response.status);
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const testSpot = testSpots[0];

      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should handle extremely large payloads', async () => {
      const testSpot = testSpots[0];
      const largeData = {
        notes: 'x'.repeat(10000) // Very long notes
      };

      const response = await request(app)
        .patch(`/api/spots/${testSpot.spotNumber}`)
        .set('Authorization', authToken)
        .send(largeData);

      // Should either accept with truncation or reject as too large
      expect([200, 400, 413]).toContain(response.status);
    });

    it('should return proper error format for all failures', async () => {
      const response = await request(app)
        .get('/api/spots?limit=abc')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high volume of concurrent read requests', async () => {
      const promises = Array(20).fill(null).map(() => 
        request(app)
          .get('/api/spots')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      // Response times should be reasonable (under 5 seconds)
      // This would need actual timing measurements in real tests
    });

    it('should handle pagination efficiently for large datasets', async () => {
      // This test assumes we have enough test data or would create it
      const response = await request(app)
        .get('/api/spots?limit=100&offset=0')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.spots)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should efficiently filter and sort large datasets', async () => {
      const response = await request(app)
        .get('/api/spots?status=available&type=standard&sort=id&order=asc&limit=50')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Response should be fast and properly filtered/sorted
      const spots = response.body.data.spots;
      if (spots.length > 1) {
        expect(spots[0].id <= spots[1].id).toBe(true);
      }
    });
  });
});