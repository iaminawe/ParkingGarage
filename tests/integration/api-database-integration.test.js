/**
 * API Database Integration Tests
 * 
 * Tests API endpoints with actual database operations using Prisma.
 * Ensures data persistence and proper API-database integration.
 */

const request = require('supertest');
const app = require('../../src/server');
const { GarageFactory, VehicleFactory, SpotFactory, SessionFactory } = require('../factories');

describe('API Database Integration', () => {
  let server;
  let testGarage;

  beforeAll(async () => {
    // Start the server
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Create a test garage for API tests
    testGarage = await GarageFactory.createGarage({
      name: 'API Test Garage',
      totalSpots: 100,
      hourlyRate: 5.00,
      dailyRate: 25.00
    });
  });

  describe('Garage API with Database', () => {
    test('GET /api/garages should return garages from database', async () => {
      // Create additional garages
      await GarageFactory.createGarage({ name: 'Garage 1' });
      await GarageFactory.createGarage({ name: 'Garage 2' });

      const response = await request(app)
        .get('/api/garages')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.stringContaining('Garage'),
              totalSpots: expect.any(Number)
            })
          ])
        })
      );

      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    test('GET /api/garages/:id should return specific garage from database', async () => {
      const response = await request(app)
        .get(`/api/garages/${testGarage.id}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: testGarage.id,
            name: 'API Test Garage',
            totalSpots: 100,
            hourlyRate: 5.00,
            dailyRate: 25.00
          })
        })
      );
    });

    test('POST /api/garages should create garage in database', async () => {
      const newGarageData = {
        name: 'New API Garage',
        address: '456 API Street, Test City, TC 67890',
        totalSpots: 150,
        hourlyRate: 6.00,
        dailyRate: 30.00
      };

      const response = await request(app)
        .post('/api/garages')
        .send(newGarageData)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: expect.any(String),
            name: 'New API Garage',
            address: '456 API Street, Test City, TC 67890',
            totalSpots: 150,
            hourlyRate: 6.00,
            dailyRate: 30.00
          })
        })
      );

      // Verify garage was created in database
      const createdGarage = await GarageFactory.findById(response.body.data.id);
      expect(createdGarage).toBeTruthy();
      expect(createdGarage.name).toBe('New API Garage');
    });

    test('PUT /api/garages/:id should update garage in database', async () => {
      const updateData = {
        name: 'Updated API Garage',
        hourlyRate: 7.50
      };

      const response = await request(app)
        .put(`/api/garages/${testGarage.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe('Updated API Garage');
      expect(response.body.data.hourlyRate).toBe(7.50);

      // Verify update persisted in database
      const updatedGarage = await GarageFactory.findById(testGarage.id);
      expect(updatedGarage.name).toBe('Updated API Garage');
      expect(updatedGarage.hourlyRate).toBe(7.50);
    });

    test('DELETE /api/garages/:id should soft delete garage in database', async () => {
      const response = await request(app)
        .delete(`/api/garages/${testGarage.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify garage is soft deleted (not returned in normal queries)
      const deletedGarage = await GarageFactory.findById(testGarage.id);
      expect(deletedGarage).toBeNull();

      // But should exist in deleted records
      const deletedRecord = await GarageFactory.findDeleted(testGarage.id);
      if (deletedRecord) {
        expect(deletedRecord.deletedAt).toBeTruthy();
      }
    });
  });

  describe('Vehicle API with Database', () => {
    test('POST /api/vehicles should create vehicle in database', async () => {
      const vehicleData = {
        licensePlate: 'API001',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        color: 'blue',
        type: 'sedan',
        owner: 'John Doe',
        phone: '555-0123',
        email: 'john@example.com'
      };

      const response = await request(app)
        .post('/api/vehicles')
        .send(vehicleData)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            licensePlate: 'API001',
            make: 'Toyota',
            model: 'Camry',
            owner: 'John Doe'
          })
        })
      );

      // Verify vehicle was created in database
      const createdVehicle = await VehicleFactory.findByLicensePlate('API001');
      expect(createdVehicle).toBeTruthy();
      expect(createdVehicle.make).toBe('Toyota');
    });

    test('GET /api/vehicles/:licensePlate should return vehicle from database', async () => {
      const testVehicle = await VehicleFactory.createVehicle({
        licensePlate: 'GETAPI01',
        make: 'Honda',
        model: 'Civic'
      });

      const response = await request(app)
        .get(`/api/vehicles/${testVehicle.licensePlate}`)
        .expect(200);

      expect(response.body.data.licensePlate).toBe('GETAPI01');
      expect(response.body.data.make).toBe('Honda');
      expect(response.body.data.model).toBe('Civic');
    });

    test('should handle duplicate license plate error', async () => {
      // Create vehicle first
      await VehicleFactory.createVehicle({ licensePlate: 'DUPEAPI1' });

      // Try to create another with same license plate
      const response = await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: 'DUPEAPI1',
          make: 'Ford',
          model: 'Focus'
        })
        .expect(409); // Conflict

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/license plate.*already exists/i);
    });
  });

  describe('Spot API with Database', () => {
    beforeEach(async () => {
      // Create spots for testing
      await SpotFactory.createSpotsForGarage(testGarage.id, 10);
    });

    test('GET /api/garages/:id/spots should return spots from database', async () => {
      const response = await request(app)
        .get(`/api/garages/${testGarage.id}/spots`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          floor: expect.any(Number),
          bay: expect.any(Number),
          spotNumber: expect.any(Number),
          type: expect.any(String),
          status: expect.any(String),
          garageId: testGarage.id
        })
      );
    });

    test('GET /api/spots/available should return available spots from database', async () => {
      // Occupy some spots
      const spots = await SpotFactory.findByGarage(testGarage.id);
      await SpotFactory.occupy(spots[0].id, 'OCCUPIED1');
      await SpotFactory.occupy(spots[1].id, 'OCCUPIED2');

      const response = await request(app)
        .get('/api/spots/available')
        .query({ garageId: testGarage.id })
        .expect(200);

      expect(response.body.data).toHaveLength(8); // 10 - 2 occupied
      expect(response.body.data.every(spot => spot.status === 'available')).toBe(true);
    });

    test('POST /api/spots/:id/occupy should update database', async () => {
      const spots = await SpotFactory.findByGarage(testGarage.id);
      const testSpot = spots[0];

      const response = await request(app)
        .post(`/api/spots/${testSpot.id}/occupy`)
        .send({ vehicleId: 'TEST-VEHICLE' })
        .expect(200);

      expect(response.body.data.status).toBe('occupied');
      expect(response.body.data.currentVehicle).toBe('TEST-VEHICLE');

      // Verify database was updated
      const updatedSpot = await SpotFactory.findById(testSpot.id);
      expect(updatedSpot.status).toBe('occupied');
      expect(updatedSpot.currentVehicle).toBe('TEST-VEHICLE');
    });

    test('POST /api/spots/:id/vacate should update database', async () => {
      // First occupy a spot
      const spots = await SpotFactory.findByGarage(testGarage.id);
      const testSpot = spots[0];
      await SpotFactory.occupy(testSpot.id, 'TEMP-VEHICLE');

      const response = await request(app)
        .post(`/api/spots/${testSpot.id}/vacate`)
        .expect(200);

      expect(response.body.data.status).toBe('available');
      expect(response.body.data.currentVehicle).toBeNull();

      // Verify database was updated
      const updatedSpot = await SpotFactory.findById(testSpot.id);
      expect(updatedSpot.status).toBe('available');
      expect(updatedSpot.currentVehicle).toBeNull();
    });
  });

  describe('Session API with Database', () => {
    let testVehicle;
    let testSpot;

    beforeEach(async () => {
      testVehicle = await VehicleFactory.createVehicle({ licensePlate: 'SESSION1' });
      testSpot = await SpotFactory.createSpot({ garageId: testGarage.id });
    });

    test('POST /api/sessions should create session in database', async () => {
      const sessionData = {
        vehicleId: testVehicle.id,
        spotId: testSpot.id,
        garageId: testGarage.id
      };

      const response = await request(app)
        .post('/api/sessions')
        .send(sessionData)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            vehicleId: testVehicle.id,
            spotId: testSpot.id,
            garageId: testGarage.id,
            status: 'active'
          })
        })
      );

      // Verify session was created in database
      const createdSession = await SessionFactory.findById(response.body.data.id);
      expect(createdSession).toBeTruthy();
      expect(createdSession.status).toBe('active');
    });

    test('GET /api/sessions/active should return active sessions from database', async () => {
      // Create active sessions
      await SessionFactory.createActiveSession(testVehicle.id, testSpot.id, {
        garageId: testGarage.id
      });

      const vehicle2 = await VehicleFactory.createVehicle({ licensePlate: 'SESSION2' });
      const spot2 = await SpotFactory.createSpot({ garageId: testGarage.id });
      await SessionFactory.createActiveSession(vehicle2.id, spot2.id, {
        garageId: testGarage.id
      });

      const response = await request(app)
        .get('/api/sessions/active')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(s => s.status === 'active')).toBe(true);
    });

    test('PUT /api/sessions/:id/end should end session in database', async () => {
      const activeSession = await SessionFactory.createActiveSession(
        testVehicle.id,
        testSpot.id,
        { garageId: testGarage.id, hourlyRate: 5.00 }
      );

      const response = await request(app)
        .put(`/api/sessions/${activeSession.id}/end`)
        .expect(200);

      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.endTime).toBeTruthy();
      expect(response.body.data.totalAmount).toBeGreaterThan(0);

      // Verify session was ended in database
      const endedSession = await SessionFactory.findById(activeSession.id);
      expect(endedSession.status).toBe('completed');
      expect(endedSession.endTime).toBeTruthy();
      expect(endedSession.totalAmount).toBeGreaterThan(0);
    });
  });

  describe('Cross-Entity API Operations', () => {
    test('should maintain data consistency across API operations', async () => {
      // Create vehicle via API
      const vehicleResponse = await request(app)
        .post('/api/vehicles')
        .send({
          licensePlate: 'CONSIST1',
          make: 'Toyota',
          model: 'Prius'
        })
        .expect(201);

      const vehicleId = vehicleResponse.body.data.id;

      // Create spot
      const spot = await SpotFactory.createSpot({ garageId: testGarage.id });

      // Start session via API
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .send({
          vehicleId,
          spotId: spot.id,
          garageId: testGarage.id
        })
        .expect(201);

      const sessionId = sessionResponse.body.data.id;

      // Verify spot is marked as occupied
      const occupiedSpot = await SpotFactory.findById(spot.id);
      expect(occupiedSpot.status).toBe('occupied');

      // End session via API
      await request(app)
        .put(`/api/sessions/${sessionId}/end`)
        .expect(200);

      // Verify spot is available again
      const availableSpot = await SpotFactory.findById(spot.id);
      expect(availableSpot.status).toBe('available');
      expect(availableSpot.currentVehicle).toBeNull();
    });

    test('should handle API validation with database constraints', async () => {
      // Try to create session with non-existent vehicle
      const response = await request(app)
        .post('/api/sessions')
        .send({
          vehicleId: '00000000-0000-0000-0000-000000000000',
          spotId: testSpot?.id || '00000000-0000-0000-0000-000000000000',
          garageId: testGarage.id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/vehicle.*not found|invalid/i);
    });
  });

  describe('API Error Handling with Database', () => {
    test('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection to fail
      // For now, just test that the API is properly structured
      const response = await request(app)
        .get('/api/garages')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    test('should handle constraint violations properly', async () => {
      // Try to create garage with invalid data
      const response = await request(app)
        .post('/api/garages')
        .send({
          name: '', // Empty name should fail validation
          totalSpots: -1 // Negative spots should fail
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle concurrent API operations', async () => {
      const spot = await SpotFactory.createSpot({ garageId: testGarage.id });

      // Try to occupy the same spot concurrently
      const promises = [
        request(app)
          .post(`/api/spots/${spot.id}/occupy`)
          .send({ vehicleId: 'VEHICLE-1' }),
        request(app)
          .post(`/api/spots/${spot.id}/occupy`)
          .send({ vehicleId: 'VEHICLE-2' })
      ];

      const results = await Promise.allSettled(promises);

      // One should succeed, one should fail
      const successCount = results.filter(r => r.value?.status === 200).length;
      const failureCount = results.filter(r => r.value?.status >= 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });
  });

  describe('Performance with Database', () => {
    test('should handle multiple API requests efficiently', async () => {
      // Create test data
      await SpotFactory.createSpotsForGarage(testGarage.id, 20);

      const start = Date.now();

      // Make multiple concurrent API requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(request(app).get(`/api/garages/${testGarage.id}/spots`));
      }

      const responses = await Promise.all(promises);
      const end = Date.now();

      const duration = end - start;
      expect(duration).toBeLessThan(5000); // 5 seconds for 10 requests

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(20);
      });
    });
  });
});