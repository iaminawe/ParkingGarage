import request from 'supertest';
import { Application } from 'express';
import { createMockApp } from '../helpers/mockApp';
import { TestDataBuilder, MockGarageAPI } from '../helpers/testUtils';
import {
  GarageStructure,
  SpotsResponse,
  CheckInRequest,
  CheckInResponse,
  CheckOutRequest,
  CheckOutResponse,
  VehicleSearchResult,
  ParkingSpot,
  APIError
} from '../types';

interface MockAppWithAPI extends Application {
  locals: {
    api: MockGarageAPI;
  };
}

describe('Parking Garage API Integration Tests', () => {
  let app: MockAppWithAPI;
  let api: MockGarageAPI;

  beforeEach(() => {
    app = createMockApp();
    api = app.locals.api;
  });

  describe('1. Garage Layout Management', () => {
    describe('GET /api/garage/structure', () => {
      test('should return the complete garage structure', async () => {
        const response = await request(app)
          .get('/api/garage/structure')
          .expect(200);

        const structure: GarageStructure = response.body;
        expect(structure).toHaveProperty('floors');
        expect(structure.floors).toHaveLength(3);
        expect(structure.floors[0]).toEqual({
          id: 1,
          name: 'Ground Floor',
          bays: ['A', 'B']
        });
        expect(structure.floors[2].bays).toEqual(['A']); // Floor 3 has only bay A
        expect(structure.totalSpots).toBe(125);
      });
    });
  });

  describe('2. Parking Spot Management', () => {
    describe('GET /api/spots', () => {
      test('should list all parking spots with their status', async () => {
        const response = await request(app)
          .get('/api/spots')
          .expect(200);

        const spotsResponse: SpotsResponse = response.body;
        expect(spotsResponse).toHaveProperty('spots');
        expect(spotsResponse).toHaveProperty('summary');
        expect(spotsResponse.spots).toBeInstanceOf(Array);
        expect(spotsResponse.spots.length).toBe(125);
        
        // Check spot structure
        const firstSpot: ParkingSpot = spotsResponse.spots[0];
        expect(firstSpot).toHaveProperty('spotId');
        expect(firstSpot).toHaveProperty('floor');
        expect(firstSpot).toHaveProperty('bay');
        expect(firstSpot).toHaveProperty('spotNumber');
        expect(firstSpot).toHaveProperty('status');
        expect(['available', 'occupied', 'maintenance', 'reserved']).toContain(firstSpot.status);
        
        // Verify spot ID format
        expect(firstSpot.spotId).toMatch(/^F\d+-[A-Z]-\d{3}$/);
        
        // Check summary structure
        if (spotsResponse.summary) {
          expect(spotsResponse.summary).toHaveProperty('total');
          expect(spotsResponse.summary).toHaveProperty('available');
          expect(spotsResponse.summary).toHaveProperty('occupied');
          expect(spotsResponse.summary).toHaveProperty('occupancyRate');
          expect(spotsResponse.summary.total).toBe(125);
        }
      });

      test('should filter spots by status (available)', async () => {
        // First seed some occupied spots
        await request(app)
          .post('/api/test/seed')
          .send({ occupancy: 0.2 });

        const response = await request(app)
          .get('/api/spots?status=available')
          .expect(200);

        const spotsResponse: SpotsResponse = response.body;
        expect(spotsResponse.spots).toBeInstanceOf(Array);
        spotsResponse.spots.forEach((spot: ParkingSpot) => {
          expect(spot.status).toBe('available');
        });
      });

      test('should filter spots by status (occupied)', async () => {
        // First seed some occupied spots
        await request(app)
          .post('/api/test/seed')
          .send({ occupancy: 0.3 });

        const response = await request(app)
          .get('/api/spots?status=occupied')
          .expect(200);

        const spotsResponse: SpotsResponse = response.body;
        expect(spotsResponse.spots).toBeInstanceOf(Array);
        spotsResponse.spots.forEach((spot: ParkingSpot) => {
          expect(spot.status).toBe('occupied');
        });
      });

      test('should filter spots by floor', async () => {
        const response = await request(app)
          .get('/api/spots?floor=2')
          .expect(200);

        const spotsResponse: SpotsResponse = response.body;
        spotsResponse.spots.forEach((spot: ParkingSpot) => {
          expect(spot.floor).toBe(2);
        });
      });

      test('should filter spots by bay', async () => {
        const response = await request(app)
          .get('/api/spots?bay=B')
          .expect(200);

        const spotsResponse: SpotsResponse = response.body;
        spotsResponse.spots.forEach((spot: ParkingSpot) => {
          expect(spot.bay).toBe('B');
        });
      });

      test('should combine filters (floor and bay)', async () => {
        const response = await request(app)
          .get('/api/spots?floor=1&bay=A')
          .expect(200);

        const spotsResponse: SpotsResponse = response.body;
        expect(spotsResponse.spots).toBeInstanceOf(Array);
        spotsResponse.spots.forEach((spot: ParkingSpot) => {
          expect(spot.floor).toBe(1);
          expect(spot.bay).toBe('A');
        });
      });
    });

    describe('GET /api/spots/next-available', () => {
      test('should return the next available parking spot', async () => {
        const response = await request(app)
          .get('/api/spots/next-available')
          .expect(200);

        const spot: ParkingSpot = response.body;
        expect(spot).toHaveProperty('spotId');
        expect(spot).toHaveProperty('status');
        expect(spot.status).toBe('available');
        expect(spot.spotId).toMatch(/^F\d+-[A-Z]-\d{3}$/);
      });

      test('should return 404 when no spots available', async () => {
        // Fill all spots
        await request(app)
          .post('/api/test/seed')
          .send({ occupancy: 1.0 });

        const response = await request(app)
          .get('/api/spots/next-available')
          .expect(404);

        const error: APIError = response.body;
        expect(error.error).toBe('No available spots');
      });
    });

    describe('GET /api/spots/:spotId', () => {
      test('should return details for a specific spot', async () => {
        const response = await request(app)
          .get('/api/spots/F1-A-001')
          .expect(200);

        const spot: ParkingSpot = response.body;
        expect(spot.spotId).toBe('F1-A-001');
        expect(spot.floor).toBe(1);
        expect(spot.bay).toBe('A');
        expect(spot.spotNumber).toBe(1);
        expect(['available', 'occupied', 'maintenance', 'reserved']).toContain(spot.status);
      });

      test('should return 404 for non-existent spot', async () => {
        const response = await request(app)
          .get('/api/spots/INVALID-SPOT')
          .expect(404);

        const error: APIError = response.body;
        expect(error.error).toBe('Spot not found');
      });
    });

    describe('PATCH /api/spots/:spotId/status', () => {
      test('should update spot status to maintenance', async () => {
        const response = await request(app)
          .patch('/api/spots/F1-A-001/status')
          .send({ status: 'maintenance', reason: 'Cleaning' })
          .expect(200);

        const spot: ParkingSpot = response.body;
        expect(spot.spotId).toBe('F1-A-001');
        expect(spot.status).toBe('maintenance');
      });

      test('should prevent updating occupied spot to occupied', async () => {
        // First occupy the spot
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'TEST-123' });

        // Try to set it to occupied again
        const response = await request(app)
          .patch('/api/spots/F1-A-001/status')
          .send({ status: 'occupied' })
          .expect(409);

        const error: APIError = response.body;
        expect(error.error).toBe('Spot already occupied');
      });

      test('should validate spot ID format', async () => {
        const response = await request(app)
          .patch('/api/spots/INVALID-FORMAT/status')
          .send({ status: 'maintenance' })
          .expect(400);

        const error: APIError = response.body;
        expect(error.error).toBe('Invalid spot ID format');
      });
    });
  });

  describe('3. Vehicle Check-in Management', () => {
    describe('POST /api/checkin', () => {
      test('should check in a vehicle successfully', async () => {
        const checkInData: CheckInRequest = { licensePlate: 'ABC-123' };
        
        const response = await request(app)
          .post('/api/checkin')
          .send(checkInData)
          .expect(201);

        const result: CheckInResponse = response.body;
        expect(result).toHaveProperty('ticketId');
        expect(result.licensePlate).toBe('ABC-123');
        expect(result).toHaveProperty('spot');
        expect(result).toHaveProperty('checkInTime');
        expect(result).toHaveProperty('floor');
        expect(result).toHaveProperty('bay');
        expect(result.spot).toMatch(/^F\d+-[A-Z]-\d{3}$/);
        
        // Validate the spot is now occupied
        const spotResponse = await request(app)
          .get(`/api/spots/${result.spot}`)
          .expect(200);
        
        const spot: ParkingSpot = spotResponse.body;
        expect(spot.status).toBe('occupied');
        expect(spot.occupiedBy).toBe('ABC-123');
      });

      test('should prevent duplicate check-in', async () => {
        // First check-in
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'DUP-123' })
          .expect(201);

        // Attempt duplicate check-in
        const response = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'DUP-123' })
          .expect(409);

        const error: APIError = response.body;
        expect(error.error).toBe('Vehicle already checked in');
        expect(error).toHaveProperty('spot');
      });

      test('should handle garage full scenario', async () => {
        // Fill all spots
        await request(app)
          .post('/api/test/seed')
          .send({ occupancy: 1.0 });

        const response = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'FULL-123' })
          .expect(503);

        const error: APIError = response.body;
        expect(error.error).toBe('No available spots');
      });

      test('should validate license plate format', async () => {
        const invalidPlates = ['', 'A', 'THIS-IS-TOO-LONG-PLATE-NUMBER'];

        for (const plate of invalidPlates) {
          const response = await request(app)
            .post('/api/checkin')
            .send({ licensePlate: plate })
            .expect(400);

          const error: APIError = response.body;
          expect(error.error).toBe('Invalid license plate');
        }
      });

      test('should trim whitespace from license plate', async () => {
        const response = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: '  TRIM-123  ' })
          .expect(201);

        const result: CheckInResponse = response.body;
        expect(result.licensePlate).toBe('TRIM-123');
      });
    });
  });

  describe('4. Vehicle Check-out Management', () => {
    describe('POST /api/checkout', () => {
      test('should check out a vehicle successfully', async () => {
        // First check in
        const checkInResponse = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'OUT-123' });

        const checkInResult: CheckInResponse = checkInResponse.body;

        // Wait a moment for duration calculation
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check out
        const checkOutData: CheckOutRequest = { licensePlate: 'OUT-123' };
        const response = await request(app)
          .post('/api/checkout')
          .send(checkOutData)
          .expect(200);

        const result: CheckOutResponse = response.body;
        expect(result.licensePlate).toBe('OUT-123');
        expect(result.spot).toBe(checkInResult.spot);
        expect(result).toHaveProperty('checkInTime');
        expect(result).toHaveProperty('checkOutTime');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('durationMinutes');
        
        // Validate the spot is now available
        const spotResponse = await request(app)
          .get(`/api/spots/${result.spot}`)
          .expect(200);
        
        const spot: ParkingSpot = spotResponse.body;
        expect(spot.status).toBe('available');
        expect(spot.occupiedBy).toBeNull();
      });

      test('should return 404 for non-existent vehicle', async () => {
        const response = await request(app)
          .post('/api/checkout')
          .send({ licensePlate: 'NOT-FOUND' })
          .expect(404);

        const error: APIError = response.body;
        expect(error.error).toBe('Vehicle not found in garage');
      });

      test('should require license plate', async () => {
        const response = await request(app)
          .post('/api/checkout')
          .send({})
          .expect(400);

        const error: APIError = response.body;
        expect(error.error).toBe('License plate required');
      });
    });
  });

  describe('5. Vehicle Search', () => {
    describe('GET /api/cars/:licensePlate', () => {
      test('should find a parked vehicle', async () => {
        // Check in a vehicle
        const checkInResponse = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'FIND-123' });

        const checkInResult: CheckInResponse = checkInResponse.body;

        // Search for the vehicle
        const response = await request(app)
          .get('/api/cars/FIND-123')
          .expect(200);

        const result: VehicleSearchResult = response.body;
        expect(result.found).toBe(true);
        expect(result.licensePlate).toBe('FIND-123');
        expect(result.spot).toBe(checkInResult.spot);
        expect(result.floor).toBe(checkInResult.floor);
        expect(result.bay).toBe(checkInResult.bay);
        expect(result).toHaveProperty('checkInTime');
        expect(result).toHaveProperty('currentDuration');
      });

      test('should handle case-insensitive search', async () => {
        // Check in with uppercase
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'CASE-123' });

        // Search with lowercase
        const response = await request(app)
          .get('/api/cars/case-123')
          .expect(200);

        const result: VehicleSearchResult = response.body;
        expect(result.found).toBe(true);
        expect(result.licensePlate).toBe('CASE-123');
      });

      test('should return 404 for vehicle not in garage', async () => {
        const response = await request(app)
          .get('/api/cars/NOT-PARKED')
          .expect(404);

        const result: VehicleSearchResult = response.body;
        expect(result.found).toBe(false);
        expect(result.message).toBe('Vehicle not currently in garage');
      });
    });
  });

  describe('6. Complete Workflow Tests', () => {
    test('should handle complete park-and-leave workflow', async () => {
      const licensePlate = 'WORKFLOW-123';

      // 1. Check garage has available spots
      const availableResponse = await request(app)
        .get('/api/spots/next-available')
        .expect(200);
      expect(availableResponse.body).toHaveProperty('spotId');

      // 2. Check in vehicle
      const checkInResponse = await request(app)
        .post('/api/checkin')
        .send({ licensePlate })
        .expect(201);

      const checkInResult: CheckInResponse = checkInResponse.body;
      expect(checkInResult.licensePlate).toBe(licensePlate);

      // 3. Verify vehicle can be found
      const searchResponse = await request(app)
        .get(`/api/cars/${licensePlate}`)
        .expect(200);

      const searchResult: VehicleSearchResult = searchResponse.body;
      expect(searchResult.found).toBe(true);
      expect(searchResult.spot).toBe(checkInResult.spot);

      // 4. Check out vehicle
      const checkOutResponse = await request(app)
        .post('/api/checkout')
        .send({ licensePlate })
        .expect(200);

      const checkOutResult: CheckOutResponse = checkOutResponse.body;
      expect(checkOutResult.licensePlate).toBe(licensePlate);
      expect(checkOutResult.spot).toBe(checkInResult.spot);

      // 5. Verify vehicle is no longer found
      await request(app)
        .get(`/api/cars/${licensePlate}`)
        .expect(404);

      // 6. Verify spot is available again
      const spotResponse = await request(app)
        .get(`/api/spots/${checkInResult.spot}`)
        .expect(200);

      const spot: ParkingSpot = spotResponse.body;
      expect(spot.status).toBe('available');
    });

    test('should handle concurrent check-ins', async () => {
      const vehicles = ['CONC-001', 'CONC-002', 'CONC-003'];
      
      // Attempt concurrent check-ins
      const checkInPromises = vehicles.map(licensePlate =>
        request(app)
          .post('/api/checkin')
          .send({ licensePlate })
      );

      const results = await Promise.all(checkInPromises);
      
      // All should succeed with different spots
      results.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.licensePlate).toBe(vehicles[index]);
      });

      // Verify all got different spots
      const spots = results.map(r => r.body.spot);
      const uniqueSpots = new Set(spots);
      expect(uniqueSpots.size).toBe(vehicles.length);
    });
  });

  describe('7. Test Utilities', () => {
    test('should reset test data', async () => {
      // Create some test data
      await request(app)
        .post('/api/checkin')
        .send({ licensePlate: 'RESET-TEST' });

      // Reset
      await request(app)
        .post('/api/test/reset')
        .expect(200);

      // Verify reset
      const spotsResponse = await request(app)
        .get('/api/spots')
        .expect(200);

      const spots: SpotsResponse = spotsResponse.body;
      const occupiedSpots = spots.spots.filter(s => s.status === 'occupied');
      expect(occupiedSpots).toHaveLength(0);
    });

    test('should seed test data with specified occupancy', async () => {
      const occupancy = 0.4; // 40% occupancy
      
      await request(app)
        .post('/api/test/seed')
        .send({ occupancy })
        .expect(200);

      const spotsResponse = await request(app)
        .get('/api/spots')
        .expect(200);

      const spots: SpotsResponse = spotsResponse.body;
      const occupiedCount = spots.spots.filter(s => s.status === 'occupied').length;
      const expectedOccupied = Math.floor(spots.spots.length * occupancy);
      
      expect(occupiedCount).toBe(expectedOccupied);
    });
  });
});