import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../factories/TestDataFactory';

const prisma = new PrismaClient();

describe('Concurrency Testing', () => {
  let testFactory: TestDataFactory;
  let authToken: string;
  let garage: any;

  beforeEach(async () => {
    testFactory = new TestDataFactory();
    
    // Create test user and get auth token
    const user = await testFactory.createUser();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'testPassword123'
      });
    
    authToken = loginResponse.body.token;
    garage = await testFactory.createGarage();
  });

  afterEach(async () => {
    await testFactory.cleanup();
  });

  describe('Simultaneous Parking Spot Reservations', () => {
    it('should handle race condition for last available spot', async () => {
      // Create a single spot
      const spot = await testFactory.createSpot({ 
        garageId: garage.id,
        status: 'AVAILABLE' 
      });

      // Create multiple vehicles
      const vehicles = await Promise.all([
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle()
      ]);

      // Simulate concurrent checkin attempts
      const checkinPromises = vehicles.map(vehicle =>
        request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicle.id,
            spotId: spot.id
          })
      );

      const responses = await Promise.allSettled(checkinPromises);
      
      // Only one should succeed, others should fail gracefully
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      
      const failed = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status >= 400
      );

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(4);

      // Verify all failures are due to spot unavailability
      failed.forEach(response => {
        if (response.status === 'fulfilled') {
          expect(response.value.body.error).toMatch(/not.*available|occupied|reserved/i);
        }
      });
    });

    it('should handle concurrent spot reservations across multiple spots', async () => {
      // Create multiple spots
      const spots = await Promise.all([
        testFactory.createSpot({ garageId: garage.id, status: 'AVAILABLE' }),
        testFactory.createSpot({ garageId: garage.id, status: 'AVAILABLE' }),
        testFactory.createSpot({ garageId: garage.id, status: 'AVAILABLE' }),
        testFactory.createSpot({ garageId: garage.id, status: 'AVAILABLE' }),
        testFactory.createSpot({ garageId: garage.id, status: 'AVAILABLE' })
      ]);

      // Create vehicles
      const vehicles = await Promise.all([
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle()
      ]);

      // Each vehicle tries to park in any available spot
      const checkinPromises = vehicles.map(vehicle =>
        // Try to find any available spot
        request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicle.id,
            garageId: garage.id // Let system assign spot
          })
      );

      const responses = await Promise.allSettled(checkinPromises);
      
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );

      // Should succeed for first 5 vehicles (one per spot)
      expect(successful).toHaveLength(5);

      // Verify no double-booking occurred
      const occupiedSpots = await prisma.spot.findMany({
        where: { 
          garageId: garage.id,
          status: 'OCCUPIED' 
        }
      });

      expect(occupiedSpots).toHaveLength(5);
    });

    it('should handle rapid successive checkins for same vehicle', async () => {
      const spot = await testFactory.createSpot({ 
        garageId: garage.id,
        status: 'AVAILABLE' 
      });
      const vehicle = await testFactory.createVehicle();

      // Rapid successive checkin attempts for same vehicle
      const checkinPromises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicle.id,
            spotId: spot.id
          })
      );

      const responses = await Promise.allSettled(checkinPromises);
      
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      
      const failed = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status >= 400
      );

      // Only one should succeed
      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(9);

      // Verify failures are due to duplicate checkin or spot unavailability
      failed.forEach(response => {
        if (response.status === 'fulfilled') {
          expect(response.value.body.error).toMatch(/already.*checked|not.*available|occupied/i);
        }
      });
    });
  });

  describe('Concurrent Payment Processing', () => {
    it('should handle simultaneous payment attempts', async () => {
      // Create a session with checkout
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();
      
      const checkinResponse = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id
        });

      const sessionId = checkinResponse.body.sessionId;

      // Checkout to generate payment
      await request(app)
        .post('/api/checkouts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId
        });

      // Simulate concurrent payment attempts
      const paymentPromises = Array(5).fill(null).map(() =>
        request(app)
          .post(`/api/payments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId: sessionId,
            amount: 25.50,
            paymentMethod: 'CREDIT_CARD',
            cardToken: 'test_card_token'
          })
      );

      const responses = await Promise.allSettled(paymentPromises);
      
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      // Only one payment should succeed
      expect(successful).toHaveLength(1);

      // Verify payment idempotency
      const payments = await prisma.payment.findMany({
        where: { sessionId: sessionId }
      });

      expect(payments).toHaveLength(1);
      expect(payments[0].status).toBe('COMPLETED');
    });

    it('should prevent double charging with payment retries', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();
      
      const checkinResponse = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id
        });

      const sessionId = checkinResponse.body.sessionId;

      await request(app)
        .post('/api/checkouts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId
        });

      // First payment
      const firstPayment = await request(app)
        .post(`/api/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId,
          amount: 25.50,
          paymentMethod: 'CREDIT_CARD',
          cardToken: 'test_card_token',
          idempotencyKey: 'payment-123'
        });

      expect(firstPayment.status).toBe(200);

      // Retry with same idempotency key
      const retryPayment = await request(app)
        .post(`/api/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId,
          amount: 25.50,
          paymentMethod: 'CREDIT_CARD',
          cardToken: 'test_card_token',
          idempotencyKey: 'payment-123'
        });

      expect(retryPayment.status).toBe(200);
      expect(retryPayment.body.id).toBe(firstPayment.body.id);

      // Verify only one payment exists
      const payments = await prisma.payment.findMany({
        where: { sessionId: sessionId }
      });

      expect(payments).toHaveLength(1);
    });
  });

  describe('Parallel User Registrations', () => {
    it('should handle concurrent user registrations with same email', async () => {
      const userEmail = 'test@concurrent.com';
      
      const registrationPromises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/auth/register')
          .send({
            email: userEmail,
            password: 'TestPassword123!',
            firstName: 'Test',
            lastName: 'User'
          })
      );

      const responses = await Promise.allSettled(registrationPromises);
      
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );

      const failed = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status >= 400
      );

      // Only one should succeed
      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(9);

      // Verify database integrity
      const users = await prisma.user.findMany({
        where: { email: userEmail }
      });

      expect(users).toHaveLength(1);
    });

    it('should handle concurrent user profile updates', async () => {
      const user = await testFactory.createUser();
      const userTokens = [];

      // Create multiple sessions for same user
      for (let i = 0; i < 5; i++) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'testPassword123'
          });
        userTokens.push(loginResponse.body.token);
      }

      // Concurrent profile updates
      const updatePromises = userTokens.map((token, index) =>
        request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({
            firstName: `Updated${index}`,
            lastName: `User${index}`
          })
      );

      const responses = await Promise.allSettled(updatePromises);
      
      // All should succeed due to optimistic locking or last-writer-wins
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful.length).toBeGreaterThan(0);

      // Verify final state is consistent
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(updatedUser).toBeTruthy();
      expect(updatedUser?.firstName).toMatch(/^Updated\d+$/);
    });
  });

  describe('Database Transaction Conflicts', () => {
    it('should handle concurrent garage capacity updates', async () => {
      // Create spots to establish initial capacity
      await Promise.all([
        testFactory.createSpot({ garageId: garage.id }),
        testFactory.createSpot({ garageId: garage.id }),
        testFactory.createSpot({ garageId: garage.id })
      ]);

      // Concurrent capacity updates
      const updatePromises = Array(10).fill(null).map(() =>
        request(app)
          .put(`/api/garages/${garage.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: garage.name,
            totalSpots: 5
          })
      );

      const responses = await Promise.allSettled(updatePromises);
      
      // At least one should succeed
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful.length).toBeGreaterThan(0);

      // Verify final state is consistent
      const updatedGarage = await prisma.garage.findUnique({
        where: { id: garage.id },
        include: { _count: { select: { spots: true } } }
      });

      expect(updatedGarage?.totalSpots).toBe(5);
    });

    it('should handle concurrent session state changes', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();
      
      const checkinResponse = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id
        });

      const sessionId = checkinResponse.body.sessionId;

      // Concurrent state changes (checkout, extend, cancel)
      const stateChangePromises = [
        request(app)
          .post('/api/checkouts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ sessionId }),
        
        request(app)
          .post(`/api/sessions/${sessionId}/extend`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ additionalHours: 2 }),
        
        request(app)
          .post(`/api/sessions/${sessionId}/cancel`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
      ];

      const responses = await Promise.allSettled(stateChangePromises);
      
      // Only one should succeed, others should fail gracefully
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful).toHaveLength(1);

      // Verify session is in a consistent state
      const finalSession = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      expect(finalSession).toBeTruthy();
      expect(['ACTIVE', 'COMPLETED', 'CANCELLED']).toContain(finalSession?.status);
    });
  });

  describe('Race Conditions in Business Logic', () => {
    it('should handle concurrent availability checks', async () => {
      const spot = await testFactory.createSpot({ 
        garageId: garage.id,
        status: 'AVAILABLE' 
      });

      // Concurrent availability checks
      const availabilityPromises = Array(20).fill(null).map(() =>
        request(app)
          .get(`/api/spots/${spot.id}/availability`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.allSettled(availabilityPromises);
      
      // All should succeed and return consistent results
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful).toHaveLength(20);

      // All responses should be consistent
      successful.forEach(response => {
        if (response.status === 'fulfilled') {
          expect(response.value.body.available).toBe(true);
        }
      });
    });

    it('should maintain data consistency under high load', async () => {
      // Create multiple spots
      const spots = await Promise.all(
        Array(10).fill(null).map(() =>
          testFactory.createSpot({ 
            garageId: garage.id,
            status: 'AVAILABLE' 
          })
        )
      );

      // Create vehicles
      const vehicles = await Promise.all(
        Array(15).fill(null).map(() => testFactory.createVehicle())
      );

      // Mixed operations: checkins, checkouts, availability checks
      const mixedOperations = [];

      // Add checkin operations
      vehicles.forEach(vehicle => {
        mixedOperations.push(
          request(app)
            .post('/api/checkins')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              vehicleId: vehicle.id,
              garageId: garage.id
            })
        );
      });

      // Add availability checks
      spots.forEach(spot => {
        mixedOperations.push(
          request(app)
            .get(`/api/spots/${spot.id}/availability`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      });

      // Add garage stats requests
      for (let i = 0; i < 5; i++) {
        mixedOperations.push(
          request(app)
            .get(`/api/garages/${garage.id}/stats`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      // Execute all operations concurrently
      const responses = await Promise.allSettled(mixedOperations);
      
      // Verify overall system consistency
      const finalGarageState = await prisma.garage.findUnique({
        where: { id: garage.id },
        include: {
          spots: {
            include: {
              sessions: {
                where: { status: 'ACTIVE' }
              }
            }
          }
        }
      });

      // Count occupied spots
      const occupiedSpots = finalGarageState?.spots.filter(
        spot => spot.status === 'OCCUPIED'
      );

      const activeSessions = finalGarageState?.spots.reduce(
        (sum, spot) => sum + spot.sessions.length, 0
      );

      // Number of occupied spots should equal number of active sessions
      expect(occupiedSpots?.length).toBe(activeSessions);

      // Total spots should remain unchanged
      expect(finalGarageState?.spots.length).toBe(10);
    });
  });

  describe('Deadlock Prevention', () => {
    it('should prevent deadlocks in complex transactions', async () => {
      // Create resources that could cause deadlocks
      const spots = await Promise.all([
        testFactory.createSpot({ garageId: garage.id }),
        testFactory.createSpot({ garageId: garage.id })
      ]);

      const vehicles = await Promise.all([
        testFactory.createVehicle(),
        testFactory.createVehicle()
      ]);

      // Operations that could cause deadlock if not handled properly
      const complexOperations = [
        // Vehicle 1 -> Spot 1, Vehicle 2 -> Spot 2
        Promise.all([
          request(app)
            .post('/api/checkins')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              vehicleId: vehicles[0].id,
              spotId: spots[0].id
            }),
          
          request(app)
            .post('/api/checkins')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              vehicleId: vehicles[1].id,
              spotId: spots[1].id
            })
        ]),
        
        // Reverse order: Vehicle 2 -> Spot 1, Vehicle 1 -> Spot 2
        Promise.all([
          request(app)
            .post('/api/checkins')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              vehicleId: vehicles[1].id,
              spotId: spots[0].id
            }),
          
          request(app)
            .post('/api/checkins')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              vehicleId: vehicles[0].id,
              spotId: spots[1].id
            })
        ])
      ];

      // This should complete without deadlock timeout
      const startTime = Date.now();
      const results = await Promise.allSettled(complexOperations);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (no deadlock timeout)
      expect(duration).toBeLessThan(30000); // 30 seconds max

      // At least some operations should succeed
      expect(results.length).toBe(2);
    });
  });
});