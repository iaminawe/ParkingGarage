/**
 * Spot Controller Tests
 * 
 * Comprehensive test suite for the SpotController covering:
 * - Spot listing with filtering and pagination
 * - Individual spot retrieval
 * - Spot updates
 * - Spot statistics
 * - Available/occupied spot convenience endpoints
 * - Advanced spot search
 * - Input validation
 * - Error handling
 * - Edge cases
 */

import request from 'supertest';
import app from '../../../src/app';
import { SpotController } from '../../../src/controllers/spotController';
import { SpotService } from '../../../src/services/spotService';

// Mock the services
jest.mock('../../../src/services/spotService');

const MockedSpotService = SpotService as jest.MockedClass<typeof SpotService>;

describe('SpotController', () => {
  let spotController: SpotController;
  let mockSpotService: jest.Mocked<SpotService>;

  const mockSpotsData = {
    spots: [
      {
        id: 'spot-001',
        number: 'A1',
        type: 'compact',
        status: 'available',
        floor: 1,
        bay: 1,
        features: ['covered'],
        location: 'Level 1 - Bay A - Spot 1'
      },
      {
        id: 'spot-002',
        number: 'A2',
        type: 'standard',
        status: 'occupied',
        floor: 1,
        bay: 1,
        features: ['covered', 'electric'],
        location: 'Level 1 - Bay A - Spot 2',
        occupant: {
          licensePlate: 'ABC123',
          entryTime: '2024-01-01T10:00:00Z'
        }
      }
    ],
    pagination: {
      total: 100,
      limit: 20,
      offset: 0,
      hasMore: true,
      nextOffset: 20
    }
  };

  const mockSpot = {
    id: 'spot-001',
    number: 'A1',
    type: 'compact',
    status: 'available',
    floor: 1,
    bay: 1,
    features: ['covered'],
    location: 'Level 1 - Bay A - Spot 1',
    dimensions: {
      width: 8.5,
      length: 18.0,
      height: 7.0
    },
    accessibility: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z'
  };

  const mockSpotStatistics = {
    total: 300,
    available: 225,
    occupied: 60,
    maintenance: 15,
    occupancyRate: 20.0,
    byType: {
      compact: { total: 120, available: 90, occupied: 25, maintenance: 5 },
      standard: { total: 120, available: 90, occupied: 25, maintenance: 5 },
      oversized: { total: 60, available: 45, occupied: 10, maintenance: 5 }
    },
    byFloor: {
      1: { total: 100, available: 75, occupied: 20, maintenance: 5 },
      2: { total: 100, available: 75, occupied: 20, maintenance: 5 },
      3: { total: 100, available: 75, occupied: 20, maintenance: 5 }
    },
    utilization: {
      averageOccupancyTime: 145, // minutes
      peakOccupancy: 85.5,
      peakHours: ['09:00-11:00', '17:00-19:00']
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    spotController = new SpotController();
    
    // Get mocked instance
    mockSpotService = MockedSpotService.mock.instances[MockedSpotService.mock.instances.length - 1] as jest.Mocked<SpotService>;

    // Set up default mocks
    mockSpotService.getSpots = jest.fn().mockResolvedValue(mockSpotsData);
    mockSpotService.getSpotById = jest.fn().mockResolvedValue(mockSpot);
    mockSpotService.updateSpot = jest.fn().mockResolvedValue({
      ...mockSpot,
      status: 'maintenance',
      updatedAt: new Date().toISOString()
    });
    mockSpotService.getSpotStatistics = jest.fn().mockResolvedValue(mockSpotStatistics);
  });

  describe('GET /api/v1/spots - getSpots', () => {
    it('should get spots with default parameters', async () => {
      const response = await request(app)
        .get('/api/v1/spots')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveLength(2);
      expect(response.body.timestamp).toBeDefined();

      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        {}, // filters
        { limit: 20 }, // pagination
        { sort: undefined, order: undefined } // sorting
      );
    });

    it('should get spots with custom limit', async () => {
      const response = await request(app)
        .get('/api/v1/spots?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        {},
        { limit: 10 },
        expect.any(Object)
      );
    });

    it('should include navigation links when hasMore is true', async () => {
      const response = await request(app)
        .get('/api/v1/spots')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.links).toBeDefined();
      expect(response.body.links.next).toBeDefined();
    });

    it('should handle service error', async () => {
      mockSpotService.getSpots.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/spots')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while retrieving spots');
    });
  });

  describe('GET /api/v1/spots/:id - getSpotById', () => {
    it('should get spot by valid ID', async () => {
      const response = await request(app)
        .get('/api/v1/spots/spot-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('spot-001');
      expect(response.body.data.number).toBe('A1');
      expect(response.body.data.dimensions).toBeDefined();

      expect(mockSpotService.getSpotById).toHaveBeenCalledWith('spot-001');
    });

    it('should handle spot not found (404)', async () => {
      mockSpotService.getSpotById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/spots/nonexistent-spot')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Spot with ID 'nonexistent-spot' not found");
    });

    it('should handle service error', async () => {
      mockSpotService.getSpotById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/spots/spot-001')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while retrieving spot');
    });

    it('should show different error messages in development vs production', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Test development mode
      process.env.NODE_ENV = 'development';
      mockSpotService.getSpotById.mockRejectedValue(new Error('Detailed error'));

      const devResponse = await request(app)
        .get('/api/v1/spots/error-spot')
        .expect(500);

      expect(devResponse.body.errors[0]).toBe('Detailed error');

      // Test production mode
      process.env.NODE_ENV = 'production';
      mockSpotService.getSpotById.mockRejectedValue(new Error('Detailed error'));

      const prodResponse = await request(app)
        .get('/api/v1/spots/error-spot')
        .expect(500);

      expect(prodResponse.body.errors[0]).toBe('Internal server error');

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('PATCH /api/v1/spots/:id - updateSpot', () => {
    const validUpdateData = {
      status: 'maintenance' as const,
      type: 'standard' as const
    };

    it('should update spot successfully', async () => {
      const response = await request(app)
        .patch('/api/v1/spots/spot-001')
        .send(validUpdateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Spot updated successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('maintenance');

      expect(mockSpotService.updateSpot).toHaveBeenCalledWith('spot-001', validUpdateData);
    });

    it('should handle spot not found during update (404)', async () => {
      mockSpotService.updateSpot.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/v1/spots/nonexistent-spot')
        .send(validUpdateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Spot with ID 'nonexistent-spot' not found");
    });

    it('should handle validation errors (400)', async () => {
      mockSpotService.updateSpot.mockRejectedValue(
        new Error('Invalid status transition from available to occupied')
      );

      const response = await request(app)
        .patch('/api/v1/spots/spot-001')
        .send({ status: 'occupied' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid status transition from available to occupied');
    });

    it('should handle update restriction errors (400)', async () => {
      mockSpotService.updateSpot.mockRejectedValue(
        new Error('Cannot update occupied spot without proper checkout')
      );

      const response = await request(app)
        .patch('/api/v1/spots/spot-001')
        .send(validUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot update occupied spot without proper checkout');
    });

    it('should handle service error', async () => {
      mockSpotService.updateSpot.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .patch('/api/v1/spots/spot-001')
        .send(validUpdateData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while updating spot');
    });
  });

  describe('GET /api/v1/spots/statistics - getSpotStatistics', () => {
    it('should get spot statistics successfully', async () => {
      const response = await request(app)
        .get('/api/v1/spots/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.total).toBe(300);
      expect(response.body.data.occupancyRate).toBe(20.0);
      expect(response.body.data.byType).toBeDefined();
      expect(response.body.data.byFloor).toBeDefined();
      expect(response.body.data.utilization).toBeDefined();

      expect(mockSpotService.getSpotStatistics).toHaveBeenCalled();
    });

    it('should handle statistics service error', async () => {
      mockSpotService.getSpotStatistics.mockRejectedValue(new Error('Statistics calculation failed'));

      const response = await request(app)
        .get('/api/v1/spots/statistics')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while retrieving spot statistics');
    });
  });

  describe('GET /api/v1/spots/available - getAvailableSpots', () => {
    it('should get only available spots', async () => {
      const availableSpotsData = {
        ...mockSpotsData,
        spots: mockSpotsData.spots.filter(spot => spot.status === 'available')
      };
      mockSpotService.getSpots.mockResolvedValue(availableSpotsData);

      const response = await request(app)
        .get('/api/v1/spots/available')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { status: 'available' },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle service error for available spots', async () => {
      mockSpotService.getSpots.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/v1/spots/available')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while retrieving available spots');
    });
  });

  describe('GET /api/v1/spots/occupied - getOccupiedSpots', () => {
    it('should get only occupied spots', async () => {
      const occupiedSpotsData = {
        ...mockSpotsData,
        spots: mockSpotsData.spots.filter(spot => spot.status === 'occupied')
      };
      mockSpotService.getSpots.mockResolvedValue(occupiedSpotsData);

      const response = await request(app)
        .get('/api/v1/spots/occupied')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { status: 'occupied' },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle service error for occupied spots', async () => {
      mockSpotService.getSpots.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/v1/spots/occupied')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while retrieving occupied spots');
    });
  });

  describe('GET /api/v1/spots/search - searchSpots', () => {
    it('should search spots with simple status query', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=available')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { status: 'available' },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should search spots with simple type query', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=compact')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { type: 'compact' },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should search spots with field:value format', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=floor:2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { floor: 2 },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should search spots with abbreviated field format', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=f:1%20b:3')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { floor: 1, bay: 3 },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should search spots with F1-B2 format', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=f2-b4')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { floor: 2, bay: 4 },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should search spots with complex query', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=available%20compact%20floor:1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { status: 'available', type: 'compact', floor: 1 },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should reject search without query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Search query is required');
    });

    it('should handle empty query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Search query is required');
    });

    it('should ignore invalid terms in search query', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=available%20invalidterm%20compact')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { status: 'available', type: 'compact' }, // invalidterm ignored
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle search service error', async () => {
      mockSpotService.getSpots.mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .get('/api/v1/spots/search?query=available')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error while searching spots');
    });
  });

  describe('Search Query Parsing', () => {
    let controller: SpotController;

    beforeEach(() => {
      controller = new SpotController();
    });

    it('should parse valid floor numbers', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=floor:5')
        .expect(200);

      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { floor: 5 },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should ignore invalid floor numbers', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=floor:abc')
        .expect(200);

      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        {}, // Invalid floor number ignored
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should parse valid bay numbers', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=bay:3')
        .expect(200);

      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { bay: 3 },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle valid vehicle types only', async () => {
      const validTypes = ['compact', 'standard', 'oversized'];
      const invalidTypes = ['small', 'large', 'huge', 'tiny'];

      for (const type of validTypes) {
        const response = await request(app)
          .get(`/api/v1/spots/search?query=type:${type}`)
          .expect(200);

        expect(mockSpotService.getSpots).toHaveBeenCalledWith(
          { type },
          expect.any(Object),
          expect.any(Object)
        );
      }

      for (const type of invalidTypes) {
        const response = await request(app)
          .get(`/api/v1/spots/search?query=type:${type}`)
          .expect(200);

        expect(mockSpotService.getSpots).toHaveBeenCalledWith(
          {}, // Invalid types ignored
          expect.any(Object),
          expect.any(Object)
        );
      }
    });

    it('should handle valid statuses only', async () => {
      const validStatuses = ['available', 'occupied', 'maintenance'];
      const invalidStatuses = ['free', 'busy', 'broken'];

      for (const status of validStatuses) {
        const response = await request(app)
          .get(`/api/v1/spots/search?query=status:${status}`)
          .expect(200);

        expect(mockSpotService.getSpots).toHaveBeenCalledWith(
          { status },
          expect.any(Object),
          expect.any(Object)
        );
      }

      for (const status of invalidStatuses) {
        const response = await request(app)
          .get(`/api/v1/spots/search?query=status:${status}`)
          .expect(200);

        expect(mockSpotService.getSpots).toHaveBeenCalledWith(
          {}, // Invalid statuses ignored
          expect.any(Object),
          expect.any(Object)
        );
      }
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle very large limit values', async () => {
      const response = await request(app)
        .get('/api/v1/spots?limit=999999')
        .expect(200);

      // Assuming service handles limit validation
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        {},
        { limit: 999999 },
        expect.any(Object)
      );
    });

    it('should handle zero and negative limit values', async () => {
      const response1 = await request(app)
        .get('/api/v1/spots?limit=0')
        .expect(200);

      const response2 = await request(app)
        .get('/api/v1/spots?limit=-5')
        .expect(200);

      expect(mockSpotService.getSpots).toHaveBeenCalledTimes(2);
    });

    it('should handle non-numeric limit values', async () => {
      const response = await request(app)
        .get('/api/v1/spots?limit=abc')
        .expect(200);

      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        {},
        { limit: 20 }, // Default limit when parsing fails
        expect.any(Object)
      );
    });

    it('should handle very long spot IDs', async () => {
      const longId = 'a'.repeat(1000);
      
      const response = await request(app)
        .get(`/api/v1/spots/${longId}`)
        .expect(404);

      expect(mockSpotService.getSpotById).toHaveBeenCalledWith(longId);
    });

    it('should handle special characters in spot IDs', async () => {
      const specialId = 'spot-@#$%^&*()';
      
      const response = await request(app)
        .get(`/api/v1/spots/${encodeURIComponent(specialId)}`)
        .expect(404);

      expect(mockSpotService.getSpotById).toHaveBeenCalledWith(specialId);
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/v1/spots')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(mockSpotService.getSpots).toHaveBeenCalledTimes(10);
    });

    it('should handle malformed JSON in update requests', async () => {
      const response = await request(app)
        .patch('/api/v1/spots/spot-001')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty update requests', async () => {
      const response = await request(app)
        .patch('/api/v1/spots/spot-001')
        .send({})
        .expect(200);

      expect(mockSpotService.updateSpot).toHaveBeenCalledWith('spot-001', {});
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response format for successful operations', async () => {
      const responses = await Promise.all([
        request(app).get('/api/v1/spots'),
        request(app).get('/api/v1/spots/spot-001'),
        request(app).get('/api/v1/spots/statistics'),
        request(app).get('/api/v1/spots/available'),
        request(app).get('/api/v1/spots/occupied')
      ]);

      responses.forEach(response => {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
      });
    });

    it('should return consistent error response format', async () => {
      mockSpotService.getSpots.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/v1/spots')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should include message field for update operations', async () => {
      const response = await request(app)
        .patch('/api/v1/spots/spot-001')
        .send({ status: 'maintenance' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Spot updated successfully');
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('URL Encoding and Special Cases', () => {
    it('should handle URL encoded search queries', async () => {
      const encodedQuery = encodeURIComponent('floor:1 type:compact status:available');
      
      const response = await request(app)
        .get(`/api/v1/spots/search?query=${encodedQuery}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { floor: 1, type: 'compact', status: 'available' },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle case sensitivity in search terms', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=AVAILABLE%20COMPACT')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { status: 'available', type: 'compact' }, // Should be lowercase
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle extra whitespace in search queries', async () => {
      const response = await request(app)
        .get('/api/v1/spots/search?query=%20%20available%20%20compact%20%20')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockSpotService.getSpots).toHaveBeenCalledWith(
        { status: 'available', type: 'compact' },
        expect.any(Object),
        expect.any(Object)
      );
    });
  });
});