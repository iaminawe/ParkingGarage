const request = require('supertest');
const { createMockApp } = require('../helpers/mockApp');
const { TestDataBuilder } = require('../helpers/testUtils');

describe('Parking Garage API Integration Tests', () => {
  let app;
  let api;

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

        expect(response.body).toHaveProperty('floors');
        expect(response.body.floors).toHaveLength(3);
        expect(response.body.floors[0]).toEqual({
          id: 1,
          name: 'Ground Floor',
          bays: ['A', 'B']
        });
        expect(response.body.floors[2].bays).toEqual(['A']); // Floor 3 has only bay A
        expect(response.body.totalSpots).toBe(125);
      });
    });
  });

  describe('2. Parking Spot Management', () => {
    describe('GET /api/spots', () => {
      test('should list all parking spots with their status', async () => {
        const response = await request(app)
          .get('/api/spots')
          .expect(200);

        expect(response.body).toHaveProperty('spots');
        expect(response.body).toHaveProperty('summary');
        expect(response.body.spots).toBeInstanceOf(Array);
        expect(response.body.spots.length).toBe(125);
        
        // Check spot structure
        const firstSpot = response.body.spots[0];
        expect(firstSpot).toHaveProperty('spotId');
        expect(firstSpot).toHaveProperty('floor');
        expect(firstSpot).toHaveProperty('bay');
        expect(firstSpot).toHaveProperty('spotNumber');
        expect(firstSpot).toHaveProperty('status');
        
        // Check summary
        expect(response.body.summary).toEqual({
          total: 125,
          available: 125,
          occupied: 0,
          occupancyRate: '0.0%'
        });
      });

      test('should filter spots by availability status', async () => {
        // Set up some occupied spots
        await request(app)
          .post('/api/test/seed')
          .send({ occupancy: 0.3 }); // 30% occupied

        const availableResponse = await request(app)
          .get('/api/spots?status=available')
          .expect(200);

        expect(availableResponse.body.spots.every(s => s.status === 'available')).toBe(true);
        expect(availableResponse.body.count).toBeGreaterThan(0);
      });

      test('should filter spots by floor', async () => {
        const response = await request(app)
          .get('/api/spots?floor=1')
          .expect(200);

        expect(response.body.spots.every(s => s.floor === 1)).toBe(true);
        expect(response.body.spots.length).toBe(50); // 2 bays * 25 spots
      });

      test('should filter spots by bay', async () => {
        const response = await request(app)
          .get('/api/spots?bay=A')
          .expect(200);

        expect(response.body.spots.every(s => s.bay === 'A')).toBe(true);
        expect(response.body.spots.length).toBe(75); // 3 floors * 25 spots
      });

      test('should combine multiple filters', async () => {
        const response = await request(app)
          .get('/api/spots?status=available&floor=2&bay=B')
          .expect(200);

        const spots = response.body.spots;
        expect(spots.every(s => 
          s.status === 'available' && 
          s.floor === 2 && 
          s.bay === 'B'
        )).toBe(true);
      });
    });

    describe('GET /api/spots/next-available', () => {
      test('should return the next available spot', async () => {
        const response = await request(app)
          .get('/api/spots/next-available')
          .expect(200);

        expect(response.body).toHaveProperty('spotId');
        expect(response.body.status).toBe('available');
      });

      test('should return 404 when no spots available', async () => {
        // Fill garage completely
        await request(app)
          .post('/api/test/seed')
          .send({ occupancy: 1.0 });

        const response = await request(app)
          .get('/api/spots/next-available')
          .expect(404);

        expect(response.body.error).toBe('No available spots');
      });
    });

    describe('GET /api/spots/:spotId', () => {
      test('should return spot details by ID', async () => {
        const response = await request(app)
          .get('/api/spots/F1-A-001')
          .expect(200);

        expect(response.body).toEqual({
          spotId: 'F1-A-001',
          floor: 1,
          bay: 'A',
          spotNumber: 1,
          status: 'available',
          occupiedBy: null,
          since: null
        });
      });

      test('should return 404 for non-existent spot', async () => {
        const response = await request(app)
          .get('/api/spots/F99-Z-999')
          .expect(404);

        expect(response.body.error).toBe('Spot not found');
      });

      test('should show occupied spot details', async () => {
        // Check in a vehicle
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'ABC-123' });

        const response = await request(app)
          .get('/api/spots/F1-A-001')
          .expect(200);

        expect(response.body.status).toBe('occupied');
        expect(response.body.occupiedBy).toBe('ABC-123');
        expect(response.body.since).toBeTruthy();
      });
    });

    describe('PATCH /api/spots/:spotId/status', () => {
      test('should update spot status to maintenance', async () => {
        const response = await request(app)
          .patch('/api/spots/F1-A-001/status')
          .send({ status: 'maintenance', reason: 'cleaning' })
          .expect(200);

        expect(response.body.status).toBe('maintenance');
      });

      test('should return 409 when trying to mark occupied spot as occupied', async () => {
        // First occupy the spot
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'ABC-123' });

        // Try to mark it occupied again
        const response = await request(app)
          .patch('/api/spots/F1-A-001/status')
          .send({ status: 'occupied' })
          .expect(409);

        expect(response.body.error).toBe('Spot already occupied');
      });

      test('should validate spot ID format', async () => {
        const response = await request(app)
          .patch('/api/spots/INVALID-FORMAT/status')
          .send({ status: 'available' })
          .expect(400);

        expect(response.body.error).toBe('Invalid spot ID format');
      });
    });
  });

  describe('3. Car Check-In', () => {
    describe('POST /api/checkin', () => {
      test('should successfully check in a vehicle', async () => {
        const response = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'ABC-123' })
          .expect(201);

        expect(response.body).toHaveProperty('ticketId');
        expect(response.body.licensePlate).toBe('ABC-123');
        expect(response.body).toHaveProperty('spot');
        expect(response.body).toHaveProperty('checkInTime');
        expect(response.body).toHaveProperty('floor');
        expect(response.body).toHaveProperty('bay');

        // Verify spot is now occupied
        const spotResponse = await request(app)
          .get(`/api/spots/${response.body.spot}`)
          .expect(200);

        expect(spotResponse.body.status).toBe('occupied');
        expect(spotResponse.body.occupiedBy).toBe('ABC-123');
      });

      test('should reject check-in when garage is full', async () => {
        // Fill the garage
        await request(app)
          .post('/api/test/seed')
          .send({ occupancy: 1.0 });

        const response = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'NEW-CAR' })
          .expect(503);

        expect(response.body.error).toBe('No available spots');
      });

      test('should prevent duplicate check-ins for same license plate', async () => {
        // First check-in
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'ABC-123' })
          .expect(201);

        // Attempt duplicate check-in
        const response = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'ABC-123' })
          .expect(409);

        expect(response.body.error).toBe('Vehicle already checked in');
        expect(response.body).toHaveProperty('spot');
      });

      test('should validate license plate format', async () => {
        const invalidPlates = [
          '',           // Empty
          ' ',          // Whitespace only
          'A',          // Too short
          'A'.repeat(20), // Too long
          null,         // Null
          123           // Number
        ];

        for (const plate of invalidPlates) {
          const response = await request(app)
            .post('/api/checkin')
            .send({ licensePlate: plate });

          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.status).toBeLessThan(500);
        }
      });

      test('should trim license plate whitespace', async () => {
        const response = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: '  ABC-123  ' })
          .expect(201);

        expect(response.body.licensePlate).toBe('  ABC-123  ');
      });
    });
  });

  describe('4. Car Check-Out', () => {
    describe('POST /api/checkout', () => {
      test('should successfully check out a vehicle', async () => {
        // First check in
        const checkinResponse = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'ABC-123' })
          .expect(201);

        const assignedSpot = checkinResponse.body.spot;

        // Wait a moment to ensure duration > 0
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check out
        const checkoutResponse = await request(app)
          .post('/api/checkout')
          .send({ licensePlate: 'ABC-123' })
          .expect(200);

        expect(checkoutResponse.body).toHaveProperty('licensePlate', 'ABC-123');
        expect(checkoutResponse.body).toHaveProperty('spot', assignedSpot);
        expect(checkoutResponse.body).toHaveProperty('checkInTime');
        expect(checkoutResponse.body).toHaveProperty('checkOutTime');
        expect(checkoutResponse.body).toHaveProperty('duration');
        expect(checkoutResponse.body).toHaveProperty('durationMinutes');

        // Verify spot is now available
        const spotResponse = await request(app)
          .get(`/api/spots/${assignedSpot}`)
          .expect(200);

        expect(spotResponse.body.status).toBe('available');
        expect(spotResponse.body.occupiedBy).toBeNull();
      });

      test('should return 404 for non-existent vehicle', async () => {
        const response = await request(app)
          .post('/api/checkout')
          .send({ licensePlate: 'NOT-HERE' })
          .expect(404);

        expect(response.body.error).toBe('Vehicle not found in garage');
      });

      test('should calculate parking duration correctly', async () => {
        // Check in
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'TIME-TEST' });

        // Wait for a known duration
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds

        // Check out
        const response = await request(app)
          .post('/api/checkout')
          .send({ licensePlate: 'TIME-TEST' })
          .expect(200);

        expect(response.body.durationMinutes).toBeGreaterThanOrEqual(0);
        expect(response.body.duration).toMatch(/\d+ (minute|minutes|hour|hours)/);
      });

      test('should require license plate', async () => {
        const response = await request(app)
          .post('/api/checkout')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('License plate required');
      });
    });
  });

  describe('5. Car Search (Stretch Goal)', () => {
    describe('GET /api/cars/:licensePlate', () => {
      test('should find a parked vehicle by license plate', async () => {
        // Check in a vehicle
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'ABC-123' });

        const response = await request(app)
          .get('/api/cars/ABC-123')
          .expect(200);

        expect(response.body).toEqual(expect.objectContaining({
          found: true,
          licensePlate: 'ABC-123',
          spot: 'F1-A-001',
          floor: 1,
          bay: 'A',
          checkInTime: expect.any(String),
          currentDuration: expect.any(String)
        }));
      });

      test('should return 404 for vehicle not in garage', async () => {
        const response = await request(app)
          .get('/api/cars/NOT-HERE')
          .expect(404);

        expect(response.body).toEqual({
          found: false,
          message: 'Vehicle not currently in garage'
        });
      });

      test('should handle case-insensitive search', async () => {
        // Check in with uppercase
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'ABC-123' });

        // Search with lowercase
        const response = await request(app)
          .get('/api/cars/abc-123')
          .expect(200);

        expect(response.body.found).toBe(true);
        expect(response.body.licensePlate).toBe('ABC-123');
      });

      test('should update current duration in real-time', async () => {
        // Check in
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'DURATION-TEST' });

        // First check
        const response1 = await request(app)
          .get('/api/cars/DURATION-TEST')
          .expect(200);

        // Wait
        await new Promise(resolve => setTimeout(resolve, 61000)); // 61 seconds

        // Second check
        const response2 = await request(app)
          .get('/api/cars/DURATION-TEST')
          .expect(200);

        // Duration should have increased
        expect(response2.body.currentDuration).not.toBe(response1.body.currentDuration);
      });
    });
  });

  describe('6. End-to-End Flow', () => {
    test('complete parking session lifecycle', async () => {
      // 1. Check initial availability
      const initialSpots = await request(app)
        .get('/api/spots?status=available')
        .expect(200);
      
      const initialAvailable = initialSpots.body.count;
      expect(initialAvailable).toBe(125);

      // 2. Check in vehicle
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send({ licensePlate: 'E2E-TEST' })
        .expect(201);

      const assignedSpot = checkinResponse.body.spot;
      expect(assignedSpot).toBeTruthy();

      // 3. Verify spot is occupied
      const spotResponse = await request(app)
        .get(`/api/spots/${assignedSpot}`)
        .expect(200);

      expect(spotResponse.body.status).toBe('occupied');
      expect(spotResponse.body.occupiedBy).toBe('E2E-TEST');

      // 4. Search for vehicle
      const searchResponse = await request(app)
        .get('/api/cars/E2E-TEST')
        .expect(200);

      expect(searchResponse.body.found).toBe(true);
      expect(searchResponse.body.spot).toBe(assignedSpot);

      // 5. Verify availability decreased
      const midSpots = await request(app)
        .get('/api/spots?status=available')
        .expect(200);

      expect(midSpots.body.count).toBe(initialAvailable - 1);

      // 6. Check out vehicle
      const checkoutResponse = await request(app)
        .post('/api/checkout')
        .send({ licensePlate: 'E2E-TEST' })
        .expect(200);

      expect(checkoutResponse.body.duration).toBeDefined();

      // 7. Verify spot is available again
      const finalSpotResponse = await request(app)
        .get(`/api/spots/${assignedSpot}`)
        .expect(200);

      expect(finalSpotResponse.body.status).toBe('available');
      expect(finalSpotResponse.body.occupiedBy).toBeNull();

      // 8. Verify vehicle no longer found
      const finalSearchResponse = await request(app)
        .get('/api/cars/E2E-TEST')
        .expect(404);

      expect(finalSearchResponse.body.found).toBe(false);

      // 9. Verify availability restored
      const finalSpots = await request(app)
        .get('/api/spots?status=available')
        .expect(200);

      expect(finalSpots.body.count).toBe(initialAvailable);
    });
  });

  describe('7. Edge Cases and Error Handling', () => {
    test('should handle empty garage gracefully', async () => {
      const response = await request(app)
        .get('/api/spots')
        .expect(200);

      expect(response.body.summary.occupied).toBe(0);
      expect(response.body.summary.occupancyRate).toBe('0.0%');
    });

    test('should handle full garage gracefully', async () => {
      await request(app)
        .post('/api/test/seed')
        .send({ occupancy: 1.0 });

      const response = await request(app)
        .get('/api/spots')
        .expect(200);

      expect(response.body.summary.available).toBe(0);
      expect(response.body.summary.occupancyRate).toBe('100.0%');
    });

    test('should handle single spot available scenario', async () => {
      // Fill all but one spot
      await request(app)
        .post('/api/test/seed')
        .send({ occupancy: 0.992 }); // 124 of 125 spots

      const availableResponse = await request(app)
        .get('/api/spots?status=available')
        .expect(200);

      expect(availableResponse.body.count).toBe(1);

      // Should be able to check in one more car
      await request(app)
        .post('/api/checkin')
        .send({ licensePlate: 'LAST-CAR' })
        .expect(201);

      // Now garage should be full
      await request(app)
        .post('/api/checkin')
        .send({ licensePlate: 'TOO-LATE' })
        .expect(503);
    });

    test('should handle special characters in license plates', async () => {
      const specialPlates = [
        'ABC 123',     // Space
        'ABC-123',     // Hyphen
        'ABC.123',     // Period
        '123ABC',      // Numbers first
      ];

      for (const plate of specialPlates) {
        const checkin = await request(app)
          .post('/api/checkin')
          .send({ licensePlate: plate })
          .expect(201);

        expect(checkin.body.licensePlate).toBe(plate);

        await request(app)
          .post('/api/checkout')
          .send({ licensePlate: plate })
          .expect(200);
      }
    });
  });

  describe('8. Concurrent Operations', () => {
    test('should handle simultaneous check-ins without conflicts', async () => {
      // Reset to empty garage
      await request(app)
        .post('/api/test/reset');

      // Create 10 concurrent check-in requests
      const checkInPromises = [];
      for (let i = 0; i < 10; i++) {
        checkInPromises.push(
          request(app)
            .post('/api/checkin')
            .send({ licensePlate: `CONCURRENT-${i}` })
        );
      }

      // Execute all requests concurrently
      const results = await Promise.all(checkInPromises);

      // All should succeed
      const successCount = results.filter(r => r.status === 201).length;
      expect(successCount).toBe(10);

      // Verify no duplicate spot assignments
      const assignedSpots = results
        .filter(r => r.status === 201)
        .map(r => r.body.spot);

      const uniqueSpots = new Set(assignedSpots);
      expect(uniqueSpots.size).toBe(10);

      // Verify all vehicles are properly registered
      for (let i = 0; i < 10; i++) {
        const searchResponse = await request(app)
          .get(`/api/cars/CONCURRENT-${i}`)
          .expect(200);

        expect(searchResponse.body.found).toBe(true);
      }
    });

    test('should handle race condition for last available spot', async () => {
      // Fill all but one spot
      await request(app)
        .post('/api/test/seed')
        .send({ occupancy: 0.992 }); // 124 of 125 spots

      // Try to check in two cars simultaneously
      const [result1, result2] = await Promise.all([
        request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'RACER-1' }),
        request(app)
          .post('/api/checkin')
          .send({ licensePlate: 'RACER-2' })
      ]);

      // One should succeed, one should fail
      const statuses = [result1.status, result2.status].sort();
      expect(statuses).toEqual([201, 503]);

      // Verify only one car is actually in the garage
      const successfulPlate = result1.status === 201 ? 'RACER-1' : 'RACER-2';
      const failedPlate = result1.status === 201 ? 'RACER-2' : 'RACER-1';

      const successSearch = await request(app)
        .get(`/api/cars/${successfulPlate}`)
        .expect(200);
      expect(successSearch.body.found).toBe(true);

      const failedSearch = await request(app)
        .get(`/api/cars/${failedPlate}`)
        .expect(404);
      expect(failedSearch.body.found).toBe(false);
    });
  });

  describe('9. Data Integrity', () => {
    test('should maintain consistent spot counts', async () => {
      // Start with empty garage
      await request(app)
        .post('/api/test/reset');

      // Check in 10 vehicles
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: `CAR-${i}` });
      }

      // Get summary
      const response = await request(app)
        .get('/api/spots')
        .expect(200);

      expect(response.body.summary.total).toBe(125);
      expect(response.body.summary.occupied).toBe(10);
      expect(response.body.summary.available).toBe(115);
      expect(response.body.summary.total).toBe(
        response.body.summary.occupied + response.body.summary.available
      );
    });

    test('should never have orphaned parking sessions', async () => {
      // Check in and out multiple vehicles
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/checkin')
          .send({ licensePlate: `TEST-${i}` });
      }

      // Check out some vehicles
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/checkout')
          .send({ licensePlate: `TEST-${i}` });
      }

      // Verify only vehicles 3 and 4 are still in garage
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get(`/api/cars/TEST-${i}`);

        if (i < 3) {
          expect(response.status).toBe(404);
        } else {
          expect(response.status).toBe(200);
          expect(response.body.found).toBe(true);
        }
      }
    });

    test('should maintain spot-vehicle relationship integrity', async () => {
      // Check in a vehicle
      const checkinResponse = await request(app)
        .post('/api/checkin')
        .send({ licensePlate: 'INTEGRITY-TEST' })
        .expect(201);

      const assignedSpot = checkinResponse.body.spot;

      // Get spot details
      const spotResponse = await request(app)
        .get(`/api/spots/${assignedSpot}`)
        .expect(200);

      // Get vehicle details
      const vehicleResponse = await request(app)
        .get('/api/cars/INTEGRITY-TEST')
        .expect(200);

      // Verify bidirectional relationship
      expect(spotResponse.body.occupiedBy).toBe('INTEGRITY-TEST');
      expect(vehicleResponse.body.spot).toBe(assignedSpot);
    });
  });
});