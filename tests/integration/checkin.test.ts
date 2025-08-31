/**
 * Check-in API Integration Tests
 * 
 * Comprehensive tests for the vehicle check-in system including
 * spot assignment, duplicate prevention, error handling, and
 * integration with garage management systems.
 */

import request from 'supertest';
import { Application } from 'express';
import { createMockApp } from '../helpers/mockApp';
import { TestDataBuilder, MockGarageAPI } from '../helpers/testUtils';
import {
  CheckInRequest,
  CheckInResponse,
  CheckOutResponse,
  ParkingSpot,
  APIError,
  SpotsResponse,
  VehicleSearchResult,
  TestSeedRequest
} from '../types';

interface MockAppWithAPI extends Application {
  locals: {
    api: MockGarageAPI;
  };
}

interface CheckInTestRequest extends CheckInRequest {
  vehicleType?: string;
  rateType?: string;
}

interface CheckInTestResponse extends CheckInResponse {
  success?: boolean;
  message?: string;
  location?: {
    floor: number;
    bay: string;
  };
  spotDetails?: {
    type: string;
    features: string[];
  };
  vehicle?: {
    licensePlate: string;
    type: string;
    rateType: string;
  };
  timestamp?: string;
  error?: string;
  errorCode?: string;
}

describe('Vehicle Check-in System Integration Tests', () => {
  let app: MockAppWithAPI;
  let api: MockGarageAPI;

  beforeEach(() => {
    app = createMockApp();
    api = app.locals.api;
  });

  describe('POST /api/checkin - Main Check-in Functionality', () => {
    test('should successfully check in a standard vehicle', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'TEST-001'
        })
        .expect(201);

      const result: CheckInResponse = response.body;
      expect(result.ticketId).toMatch(/^TKT-\d+$/);
      expect(result.licensePlate).toBe('TEST-001');
      expect(result.spot).toMatch(/^F\d+-[A-Z]-\d{3}$/);
      expect(result.checkInTime).toBeDefined();
      expect(result.floor).toBeGreaterThan(0);
      expect(result.bay).toMatch(/^[A-Z]$/);

      // Verify spot is now occupied
      const spotResponse = await request(app)
        .get(`/api/spots/${result.spot}`)
        .expect(200);
      
      const spot: ParkingSpot = spotResponse.body;
      expect(spot.status).toBe('occupied');
      expect(spot.occupiedBy).toBe('TEST-001');
    });

    test('should assign spot from lower floors first (assignment algorithm)', async () => {
      // Check in multiple vehicles - should get Floor 1 spots first
      const checkIns: CheckInResponse[] = [];
      
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/checkin')
          .send({
            licensePlate: `FLOOR-${i}`
          })
          .expect(201);
        
        checkIns.push(response.body);
      }

      // First vehicles should get Floor 1
      expect(checkIns[0].floor).toBe(1);
      expect(checkIns[1].floor).toBe(1);
    });

    test('should normalize license plate to uppercase', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'test-lower'
        })
        .expect(201);

      const result: CheckInResponse = response.body;
      expect(result.licensePlate).toBe('TEST-LOWER');
    });

    test('should trim whitespace from license plate', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: '  TRIM-TEST  '
        })
        .expect(201);

      const result: CheckInResponse = response.body;
      expect(result.licensePlate).toBe('TRIM-TEST');
    });
  });

  describe('Duplicate Prevention', () => {
    test('should prevent duplicate check-ins for same license plate', async () => {
      // First check-in should succeed
      await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'DUPE01'
        })
        .expect(201);

      // Second check-in should fail with 409 Conflict
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'DUPE01'
        })
        .expect(409);

      const error: APIError = response.body;
      expect(error.error).toBe('Vehicle already checked in');
      expect(error.spot).toBeDefined();
    });

    test('should handle case-insensitive license plate duplicate detection', async () => {
      await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'CASE-TEST'
        })
        .expect(201);

      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'case-test'
        })
        .expect(409);

      const error: APIError = response.body;
      expect(error.error).toBe('Vehicle already checked in');
    });
  });

  describe('Error Handling and Validation', () => {
    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Content-Type', 'application/json')
        .send({})
        .expect(400);

      const error: APIError = response.body;
      expect(error.error).toBe('Invalid license plate');
    });

    test('should validate license plate format', async () => {
      const invalidPlates = ['', 'A', 'THIS-IS-REALLY-TOO-LONG-PLATE-NUMBER-THAT-EXCEEDS-LIMITS'];

      for (const plate of invalidPlates) {
        const response = await request(app)
          .post('/api/checkin')
          .send({
            licensePlate: plate
          })
          .expect(400);

        const error: APIError = response.body;
        expect(error.error).toBe('Invalid license plate');
      }
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Content-Type', 'application/json')
        .send('{ invalid json')
        .expect(400);

      // Express should handle malformed JSON with 400 status
      expect(response.status).toBe(400);
    });
  });

  describe('Garage Full Scenarios', () => {
    test('should handle garage full scenario', async () => {
      // Fill all spots
      await request(app)
        .post('/api/test/seed')
        .send({ occupancy: 1.0 });

      // Try to check in when garage is full
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'LATE01'
        })
        .expect(503);

      const error: APIError = response.body;
      expect(error.error).toBe('No available spots');
    });

    test('should handle partial garage full with specific availability', async () => {
      // Fill 95% of spots
      await request(app)
        .post('/api/test/seed')
        .send({ occupancy: 0.95 });

      // Should still be able to check in
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'ALMOST-FULL'
        })
        .expect(201);

      const result: CheckInResponse = response.body;
      expect(result.licensePlate).toBe('ALMOST-FULL');
      expect(result.spot).toBeDefined();
    });
  });

  describe('Availability and Capacity Management', () => {
    test('should provide accurate availability information', async () => {
      // Check in some vehicles
      await request(app).post('/api/checkin').send({ licensePlate: 'AVAIL-01' });
      await request(app).post('/api/checkin').send({ licensePlate: 'AVAIL-02' });

      const response = await request(app)
        .get('/api/spots')
        .expect(200);

      const spots: SpotsResponse = response.body;
      expect(spots.summary).toBeDefined();
      expect(spots.summary!.total).toBe(125);
      expect(spots.summary!.occupied).toBe(2);
      expect(spots.summary!.available).toBe(123);
      expect(spots.summary!.occupancyRate).toMatch(/^\d+\.\d%$/);
    });

    test('should track capacity efficiently during high turnover', async () => {
      const operations: Promise<request.Response>[] = [];
      
      // Simulate rapid check-ins and check-outs
      for (let i = 0; i < 20; i++) {
        if (i % 4 === 0 && i > 0) {
          // Every 4th operation, check out a previous vehicle
          operations.push(
            request(app)
              .post('/api/checkout')
              .send({ licensePlate: `TURNOVER-${i - 4}` })
          );
        } else {
          operations.push(
            request(app)
              .post('/api/checkin')
              .send({ licensePlate: `TURNOVER-${i}` })
          );
        }
      }

      const results = await Promise.all(operations);
      
      // Most operations should succeed
      const successful = results.filter(r => r.status < 400);
      expect(successful.length).toBeGreaterThan(15);

      // Final state should be consistent
      const finalState = await request(app)
        .get('/api/spots')
        .expect(200);

      const spots: SpotsResponse = finalState.body;
      expect(spots.summary!.available + spots.summary!.occupied).toBe(spots.summary!.total);
    });
  });

  describe('Integration with Existing Systems', () => {
    test('should integrate with spot management', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'INTG01'
        })
        .expect(201);

      const result: CheckInResponse = response.body;

      // Verify via spot lookup
      const spotResponse = await request(app)
        .get(`/api/spots/${result.spot}`)
        .expect(200);
      
      const spot: ParkingSpot = spotResponse.body;
      expect(spot.status).toBe('occupied');
      expect(spot.occupiedBy).toBe('INTG01');
    });

    test('should integrate with vehicle search', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({
          licensePlate: 'INTG02'
        })
        .expect(201);

      const result: CheckInResponse = response.body;

      // Verify via vehicle search
      const searchResponse = await request(app)
        .get(`/api/cars/INTG02`)
        .expect(200);
      
      const vehicle: VehicleSearchResult = searchResponse.body;
      expect(vehicle.found).toBe(true);
      expect(vehicle.licensePlate).toBe('INTG02');
      expect(vehicle.spot).toBe(result.spot);
      expect(vehicle.floor).toBe(result.floor);
      expect(vehicle.bay).toBe(result.bay);
    });

    test('should maintain data consistency across operations', async () => {
      const initialState = await request(app)
        .get('/api/spots')
        .expect(200);

      const initialSpots: SpotsResponse = initialState.body;
      const initialAvailable = initialSpots.summary!.available;

      // Perform check-in
      await request(app)
        .post('/api/checkin')
        .send({ licensePlate: 'CONSISTENCY-TEST' })
        .expect(201);

      // Verify state change
      const afterCheckIn = await request(app)
        .get('/api/spots')
        .expect(200);

      const afterSpots: SpotsResponse = afterCheckIn.body;
      expect(afterSpots.summary!.available).toBe(initialAvailable - 1);
      expect(afterSpots.summary!.occupied).toBe(initialSpots.summary!.occupied + 1);

      // Perform check-out
      await request(app)
        .post('/api/checkout')
        .send({ licensePlate: 'CONSISTENCY-TEST' })
        .expect(200);

      // Verify state restored
      const finalState = await request(app)
        .get('/api/spots')
        .expect(200);

      const finalSpots: SpotsResponse = finalState.body;
      expect(finalSpots.summary!.available).toBe(initialAvailable);
      expect(finalSpots.summary!.occupied).toBe(initialSpots.summary!.occupied);
    });
  });

  describe('Edge Cases and Stress Testing', () => {
    test('should handle simultaneous check-in attempts gracefully', async () => {
      const promises: Promise<request.Response>[] = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/checkin')
            .send({
              licensePlate: `CONC-${i}`
            })
        );
      }

      const results = await Promise.all(promises);
      const successfulCheckins = results.filter(r => r.status === 201);
      
      expect(successfulCheckins.length).toBe(10);
      
      // Verify all got different spots
      const assignedSpots = successfulCheckins.map(r => (r.body as CheckInResponse).spot);
      const uniqueSpots = new Set(assignedSpots);
      expect(uniqueSpots.size).toBe(assignedSpots.length);
    });

    test('should handle rapid sequence of check-ins and check-outs', async () => {
      const licensePlates: string[] = [];
      
      // Rapid check-ins
      for (let i = 0; i < 50; i++) {
        const licensePlate = `RAPID-${i}`;
        licensePlates.push(licensePlate);
        
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate })
          .expect(201);
      }

      // Rapid check-outs
      for (const licensePlate of licensePlates) {
        await request(app)
          .post('/api/checkout')
          .send({ licensePlate })
          .expect(200);
      }

      // Verify clean final state
      const finalState = await request(app)
        .get('/api/spots')
        .expect(200);

      const spots: SpotsResponse = finalState.body;
      expect(spots.summary!.occupied).toBe(0);
      expect(spots.summary!.available).toBe(125);
    });

    test('should handle empty and null values gracefully', async () => {
      const invalidInputs = [
        {},
        { licensePlate: '' },
        { licensePlate: null },
        { licensePlate: undefined },
        { licensePlate: '   ' },
      ];

      for (const input of invalidInputs) {
        const response = await request(app)
          .post('/api/checkin')
          .send(input)
          .expect(400);

        const error: APIError = response.body;
        expect(error.error).toBe('Invalid license plate');
      }
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      const operations: Promise<request.Response>[] = [];
      
      // 100 rapid operations
      for (let i = 0; i < 100; i++) {
        operations.push(
          request(app)
            .post('/api/checkin')
            .send({ licensePlate: `LOAD-${i}` })
        );
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const successfulOperations = results.filter(r => r.status === 201);
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 100 operations
      expect(successfulOperations.length).toBeGreaterThan(90); // At least 90% success
      
      const throughput = successfulOperations.length / (totalTime / 1000);
      console.log(`Check-in throughput: ${throughput.toFixed(2)} operations/second`);
      expect(throughput).toBeGreaterThan(10); // At least 10 ops/sec
    });
  });

  describe('Complete Workflow Integration', () => {
    test('should handle complete parking lifecycle', async () => {
      const licensePlate = 'LIFECYCLE-TEST';

      // 1. Check initial availability
      const initialAvailability = await request(app)
        .get('/api/spots/next-available')
        .expect(200);

      expect(initialAvailability.body).toHaveProperty('spotId');

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
      expect(spot.occupiedBy).toBeNull();
    });
  });
});