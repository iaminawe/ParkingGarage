/**
 * @file floors.api.test.ts
 * @description Comprehensive API tests for floor management endpoints
 * 
 * Tests cover:
 * - CRUD operations for floors
 * - Bay management within floors  
 * - Error handling and edge cases
 * - Authentication and authorization
 * - Data validation
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

describe('Floors API Endpoints', () => {
  let testGarage: any;
  let testFloor: any;
  let authToken: string;
  
  beforeAll(async () => {
    // Clean database before all tests
    await cleanupTestDatabase(prisma);
    
    // Seed test data
    const seedData = await seedTestDatabase(prisma);
    testGarage = seedData.testGarage;
    
    // Create auth token for admin user
    authToken = `Bearer test-admin-token`;
  });

  beforeEach(async () => {
    // Create a test floor for each test
    testFloor = await prisma.floor.create({
      data: {
        garageId: testGarage.id,
        floorNumber: 1,
        description: 'Ground Floor',
        totalSpots: 50,
        isActive: true
      }
    });
  });

  afterEach(async () => {
    // Clean up floors after each test
    await prisma.floor.deleteMany({
      where: { garageId: testGarage.id }
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('GET /api/floors', () => {
    it('should return all floors with default pagination', async () => {
      const response = await request(app)
        .get('/api/floors')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.floors)).toBe(true);
      expect(response.body.data.floors.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter floors by garage ID', async () => {
      const response = await request(app)
        .get(`/api/floors?garageId=${testGarage.id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floors.every((floor: any) => 
        floor.garageId === testGarage.id
      )).toBe(true);
    });

    it('should filter floors by floor number', async () => {
      const response = await request(app)
        .get('/api/floors?floorNumber=1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floors.every((floor: any) => 
        floor.floorNumber === 1
      )).toBe(true);
    });

    it('should filter floors by active status', async () => {
      const response = await request(app)
        .get('/api/floors?isActive=true')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floors.every((floor: any) => 
        floor.isActive === true
      )).toBe(true);
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/api/floors?limit=5&offset=0')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floors.length).toBeLessThanOrEqual(5);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.offset).toBe(0);
    });

    it('should support sorting by floor number ascending', async () => {
      // Create additional floors for sorting test
      await prisma.floor.create({
        data: {
          garageId: testGarage.id,
          floorNumber: 2,
          description: 'Second Floor',
          totalSpots: 40
        }
      });

      const response = await request(app)
        .get('/api/floors?sort=floorNumber&order=asc')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const floors = response.body.data.floors;
      expect(floors[0].floorNumber).toBeLessThanOrEqual(floors[1]?.floorNumber || 999);
    });

    it('should support sorting by floor number descending', async () => {
      await prisma.floor.create({
        data: {
          garageId: testGarage.id,
          floorNumber: 3,
          description: 'Third Floor',
          totalSpots: 30
        }
      });

      const response = await request(app)
        .get('/api/floors?sort=floorNumber&order=desc')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const floors = response.body.data.floors;
      if (floors.length > 1) {
        expect(floors[0].floorNumber).toBeGreaterThanOrEqual(floors[1].floorNumber);
      }
    });

    it('should return 400 for invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/floors?limit=abc')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return 400 for limit exceeding maximum', async () => {
      const response = await request(app)
        .get('/api/floors?limit=101')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('limit');
    });
  });

  describe('GET /api/floors/statistics', () => {
    beforeEach(async () => {
      // Create some parking spots for statistics
      await prisma.parkingSpot.createMany({
        data: [
          {
            spotNumber: 'F1-B1-S1',
            floorId: testFloor.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'AVAILABLE'
          },
          {
            spotNumber: 'F1-B1-S2', 
            floorId: testFloor.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'OCCUPIED'
          }
        ]
      });
    });

    it('should return comprehensive floor statistics', async () => {
      const response = await request(app)
        .get('/api/floors/statistics')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.statistics.totalFloors).toBeGreaterThanOrEqual(1);
      expect(response.body.data.statistics.totalSpots).toBeGreaterThanOrEqual(0);
      expect(response.body.data.statistics.occupancyRate).toBeDefined();
    });

    it('should filter statistics by garage ID', async () => {
      const response = await request(app)
        .get(`/api/floors/statistics?garageId=${testGarage.id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.garageId).toBe(testGarage.id);
    });
  });

  describe('GET /api/floors/:id', () => {
    it('should return floor details with spots information', async () => {
      const response = await request(app)
        .get(`/api/floors/${testFloor.id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floor.id).toBe(testFloor.id);
      expect(response.body.data.floor.floorNumber).toBe(testFloor.floorNumber);
      expect(response.body.data.floor.garage).toBeDefined();
      expect(response.body.data.floor.spots).toBeDefined();
    });

    it('should return 404 for non-existent floor', async () => {
      const fakeId = 'non-existent-floor-id';
      const response = await request(app)
        .get(`/api/floors/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/floors/invalid-uuid')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('POST /api/floors', () => {
    it('should create a new floor with valid data', async () => {
      const newFloorData = {
        garageId: testGarage.id,
        floorNumber: 5,
        description: 'Fifth Floor',
        totalSpots: 60,
        isActive: true
      };

      const response = await request(app)
        .post('/api/floors')
        .set('Authorization', authToken)
        .send(newFloorData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floor.floorNumber).toBe(newFloorData.floorNumber);
      expect(response.body.data.floor.garageId).toBe(newFloorData.garageId);
      expect(response.body.data.floor.description).toBe(newFloorData.description);

      // Verify floor was created in database
      const createdFloor = await prisma.floor.findUnique({
        where: { id: response.body.data.floor.id }
      });
      expect(createdFloor).toBeTruthy();
    });

    it('should create floor with minimum required fields', async () => {
      const minimalFloorData = {
        garageId: testGarage.id,
        floorNumber: 6
      };

      const response = await request(app)
        .post('/api/floors')
        .set('Authorization', authToken)
        .send(minimalFloorData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floor.floorNumber).toBe(6);
      expect(response.body.data.floor.totalSpots).toBe(0); // default value
      expect(response.body.data.floor.isActive).toBe(true); // default value
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        floorNumber: 7
        // missing garageId
      };

      const response = await request(app)
        .post('/api/floors')
        .set('Authorization', authToken)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should return 400 for duplicate floor number in same garage', async () => {
      const duplicateFloorData = {
        garageId: testGarage.id,
        floorNumber: 1, // Same as testFloor
        description: 'Duplicate Floor'
      };

      const response = await request(app)
        .post('/api/floors')
        .set('Authorization', authToken)
        .send(duplicateFloorData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for invalid garage ID', async () => {
      const invalidGarageData = {
        garageId: 'non-existent-garage-id',
        floorNumber: 8
      };

      const response = await request(app)
        .post('/api/floors')
        .set('Authorization', authToken)
        .send(invalidGarageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('invalid');
    });

    it('should return 400 for negative floor number', async () => {
      const negativeFloorData = {
        garageId: testGarage.id,
        floorNumber: -1
      };

      const response = await request(app)
        .post('/api/floors')
        .set('Authorization', authToken)
        .send(negativeFloorData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('positive');
    });

    it('should return 400 for negative total spots', async () => {
      const negativeSpotsData = {
        garageId: testGarage.id,
        floorNumber: 9,
        totalSpots: -10
      };

      const response = await request(app)
        .post('/api/floors')
        .set('Authorization', authToken)
        .send(negativeSpotsData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('non-negative');
    });

    it('should sanitize HTML in description field', async () => {
      const xssFloorData = {
        garageId: testGarage.id,
        floorNumber: 10,
        description: '<script>alert("xss")</script>Safe Description'
      };

      const response = await request(app)
        .post('/api/floors')
        .set('Authorization', authToken)
        .send(xssFloorData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floor.description).not.toContain('<script>');
      expect(response.body.data.floor.description).toContain('Safe Description');
    });
  });

  describe('PUT /api/floors/:id', () => {
    it('should update floor information', async () => {
      const updateData = {
        description: 'Updated Ground Floor',
        totalSpots: 75,
        isActive: false
      };

      const response = await request(app)
        .put(`/api/floors/${testFloor.id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floor.description).toBe(updateData.description);
      expect(response.body.data.floor.totalSpots).toBe(updateData.totalSpots);
      expect(response.body.data.floor.isActive).toBe(updateData.isActive);

      // Verify update in database
      const updatedFloor = await prisma.floor.findUnique({
        where: { id: testFloor.id }
      });
      expect(updatedFloor?.description).toBe(updateData.description);
    });

    it('should update only provided fields (partial update)', async () => {
      const partialUpdate = {
        description: 'Partially Updated Floor'
      };

      const response = await request(app)
        .put(`/api/floors/${testFloor.id}`)
        .set('Authorization', authToken)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floor.description).toBe(partialUpdate.description);
      expect(response.body.data.floor.floorNumber).toBe(testFloor.floorNumber); // unchanged
    });

    it('should return 404 for non-existent floor', async () => {
      const updateData = { description: 'Updated Description' };
      const fakeId = 'non-existent-floor-id';

      const response = await request(app)
        .put(`/api/floors/${fakeId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for empty request body', async () => {
      const response = await request(app)
        .put(`/api/floors/${testFloor.id}`)
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('field');
    });

    it('should return 400 for invalid data types', async () => {
      const invalidData = {
        totalSpots: 'not-a-number',
        isActive: 'not-a-boolean'
      };

      const response = await request(app)
        .put(`/api/floors/${testFloor.id}`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should prevent updating floor number to create duplicate', async () => {
      // Create another floor
      const anotherFloor = await prisma.floor.create({
        data: {
          garageId: testGarage.id,
          floorNumber: 2,
          description: 'Second Floor'
        }
      });

      // Try to update first floor to have same number as second
      const duplicateUpdate = {
        floorNumber: 2
      };

      const response = await request(app)
        .put(`/api/floors/${testFloor.id}`)
        .set('Authorization', authToken)
        .send(duplicateUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('DELETE /api/floors/:id', () => {
    it('should soft delete floor with no active spots', async () => {
      const response = await request(app)
        .delete(`/api/floors/${testFloor.id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify floor is soft deleted (isActive = false)
      const deletedFloor = await prisma.floor.findUnique({
        where: { id: testFloor.id }
      });
      expect(deletedFloor?.isActive).toBe(false);
    });

    it('should return 400 when trying to delete floor with active spots', async () => {
      // Create an active parking spot
      await prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S1',
          floorId: testFloor.id,
          level: 1,
          spotType: 'STANDARD',
          status: 'OCCUPIED', // Active spot
          isActive: true
        }
      });

      const response = await request(app)
        .delete(`/api/floors/${testFloor.id}`)
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('active spots');
    });

    it('should return 404 for non-existent floor', async () => {
      const fakeId = 'non-existent-floor-id';

      const response = await request(app)
        .delete(`/api/floors/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/floors/:id/bays', () => {
    beforeEach(async () => {
      // Create parking spots in different bays for testing
      await prisma.parkingSpot.createMany({
        data: [
          {
            spotNumber: 'F1-B1-S1',
            floorId: testFloor.id,
            level: 1,
            section: 'B1',
            spotType: 'STANDARD',
            status: 'AVAILABLE'
          },
          {
            spotNumber: 'F1-B1-S2',
            floorId: testFloor.id,
            level: 1,
            section: 'B1',
            spotType: 'STANDARD',
            status: 'OCCUPIED'
          },
          {
            spotNumber: 'F1-B2-S1',
            floorId: testFloor.id,
            level: 1,
            section: 'B2',
            spotType: 'COMPACT',
            status: 'AVAILABLE'
          }
        ]
      });
    });

    it('should return bay information grouped by bay number', async () => {
      const response = await request(app)
        .get(`/api/floors/${testFloor.id}/bays`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bays).toBeDefined();
      expect(Array.isArray(response.body.data.bays)).toBe(true);
      expect(response.body.data.bays.length).toBeGreaterThan(0);
    });

    it('should include spots when includeSpots parameter is true', async () => {
      const response = await request(app)
        .get(`/api/floors/${testFloor.id}/bays?includeSpots=true`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const bays = response.body.data.bays;
      expect(bays.some((bay: any) => bay.spots && bay.spots.length > 0)).toBe(true);
    });

    it('should filter bays by spot status', async () => {
      const response = await request(app)
        .get(`/api/floors/${testFloor.id}/bays?status=available`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should only return bays that have available spots
      expect(response.body.data.bays.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent floor', async () => {
      const fakeId = 'non-existent-floor-id';

      const response = await request(app)
        .get(`/api/floors/${fakeId}/bays`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/floors/:id/bays/:bayNumber', () => {
    let testBayNumber: string;

    beforeEach(async () => {
      testBayNumber = 'B1';
      // Create spots in specific bay
      await prisma.parkingSpot.createMany({
        data: [
          {
            spotNumber: 'F1-B1-S1',
            floorId: testFloor.id,
            level: 1,
            section: testBayNumber,
            spotType: 'STANDARD',
            status: 'AVAILABLE'
          },
          {
            spotNumber: 'F1-B1-S2',
            floorId: testFloor.id,
            level: 1,
            section: testBayNumber,
            spotType: 'STANDARD',
            status: 'OCCUPIED'
          }
        ]
      });
    });

    it('should return specific bay details with spots', async () => {
      const response = await request(app)
        .get(`/api/floors/${testFloor.id}/bays/${testBayNumber}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bay).toBeDefined();
      expect(response.body.data.bay.bayNumber).toBe(testBayNumber);
      expect(response.body.data.bay.spots).toBeDefined();
      expect(Array.isArray(response.body.data.bay.spots)).toBe(true);
    });

    it('should filter spots by status within bay', async () => {
      const response = await request(app)
        .get(`/api/floors/${testFloor.id}/bays/${testBayNumber}?status=available`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      const bay = response.body.data.bay;
      expect(bay.spots.every((spot: any) => spot.status === 'AVAILABLE')).toBe(true);
    });

    it('should return 404 for non-existent floor', async () => {
      const fakeId = 'non-existent-floor-id';

      const response = await request(app)
        .get(`/api/floors/${fakeId}/bays/${testBayNumber}`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 404 for non-existent bay', async () => {
      const response = await request(app)
        .get(`/api/floors/${testFloor.id}/bays/B99`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('PUT /api/floors/:id/update-spot-count', () => {
    beforeEach(async () => {
      // Create some parking spots
      await prisma.parkingSpot.createMany({
        data: [
          {
            spotNumber: 'F1-B1-S1',
            floorId: testFloor.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'AVAILABLE',
            isActive: true
          },
          {
            spotNumber: 'F1-B1-S2',
            floorId: testFloor.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'AVAILABLE',
            isActive: true
          },
          {
            spotNumber: 'F1-B1-S3',
            floorId: testFloor.id,
            level: 1,
            spotType: 'STANDARD',
            status: 'AVAILABLE',
            isActive: false // Inactive spot shouldn't be counted
          }
        ]
      });
    });

    it('should recalculate and update total spot count', async () => {
      const response = await request(app)
        .put(`/api/floors/${testFloor.id}/update-spot-count`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.floor.totalSpots).toBe(2); // Only active spots
      expect(response.body.data.previousCount).toBeDefined();
      expect(response.body.data.updatedCount).toBe(2);

      // Verify in database
      const updatedFloor = await prisma.floor.findUnique({
        where: { id: testFloor.id }
      });
      expect(updatedFloor?.totalSpots).toBe(2);
    });

    it('should return 404 for non-existent floor', async () => {
      const fakeId = 'non-existent-floor-id';

      const response = await request(app)
        .put(`/api/floors/${fakeId}/update-spot-count`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .get('/api/floors')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('unauthorized');
    });

    it('should return 403 for insufficient permissions on admin endpoints', async () => {
      const userToken = 'Bearer test-user-token';

      const response = await request(app)
        .post('/api/floors')
        .set('Authorization', userToken)
        .send({
          garageId: testGarage.id,
          floorNumber: 99
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // Implementation would depend on specific database error scenarios
    });

    it('should return proper error format for validation failures', async () => {
      const response = await request(app)
        .post('/api/floors')
        .set('Authorization', authToken)
        .send({
          garageId: 'invalid-uuid',
          floorNumber: 'not-a-number'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/floors')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle concurrent requests properly', async () => {
      const promises = Array(5).fill(null).map((_, index) => 
        request(app)
          .post('/api/floors')
          .set('Authorization', authToken)
          .send({
            garageId: testGarage.id,
            floorNumber: 100 + index,
            description: `Concurrent Floor ${index}`
          })
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      expect(responses.every(r => r.status === 201)).toBe(true);
      
      // All should have unique floor numbers
      const floorNumbers = responses.map(r => r.body.data.floor.floorNumber);
      const uniqueNumbers = [...new Set(floorNumbers)];
      expect(uniqueNumbers.length).toBe(floorNumbers.length);
    });

    it('should respect rate limiting', async () => {
      // Make many rapid requests
      const promises = Array(50).fill(null).map(() => 
        request(app)
          .get('/api/floors')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(promises.map(p => p.catch(e => e)));
      
      // Some requests might be rate limited (429) but most should succeed (200)
      const statusCodes = responses.map(r => r.status || r.response?.status);
      expect(statusCodes.some(code => code === 200)).toBe(true);
      // Note: Actual rate limiting behavior depends on configuration
    });
  });
});