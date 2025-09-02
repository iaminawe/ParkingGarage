import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../factories/TestDataFactory';

const prisma = new PrismaClient();

describe('Business Logic Edge Cases Testing', () => {
  let testFactory: TestDataFactory;
  let authToken: string;
  let garage: any;

  beforeEach(async () => {
    testFactory = new TestDataFactory();
    
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

  describe('Pricing Calculations with Extreme Values', () => {
    it('should handle zero-duration parking sessions', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();
      
      const now = new Date();
      
      // Create session with immediate checkout (0 duration)
      const session = await testFactory.createSession({
        spotId: spot.id,
        vehicleId: vehicle.id,
        checkInTime: now,
        checkOutTime: now, // Same time = 0 duration
        status: 'COMPLETED'
      });

      const response = await request(app)
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Should have minimum charge or zero charge based on business rules
      expect(response.body.totalAmount).toBeGreaterThanOrEqual(0);
      expect(response.body.duration).toBe(0);
    });

    it('should handle extremely long parking sessions', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();
      
      const checkIn = new Date('2024-01-01T09:00:00Z');
      const checkOut = new Date('2024-12-31T18:00:00Z'); // ~1 year duration
      
      const session = await testFactory.createSession({
        spotId: spot.id,
        vehicleId: vehicle.id,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        status: 'COMPLETED'
      });

      const response = await request(app)
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Should handle extreme duration without overflow
      expect(response.body.totalAmount).toBeGreaterThan(0);
      expect(response.body.totalAmount).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(response.body.duration).toBeGreaterThan(365 * 24 * 60); // > 1 year in minutes
    });

    it('should handle fractional hour calculations correctly', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();
      
      const checkIn = new Date('2024-01-01T09:00:00Z');
      const checkOut = new Date('2024-01-01T09:33:17Z'); // 33 minutes, 17 seconds
      
      const session = await testFactory.createSession({
        spotId: spot.id,
        vehicleId: vehicle.id,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        status: 'COMPLETED'
      });

      const response = await request(app)
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Verify precise time calculation
      const expectedDuration = 33; // minutes
      expect(response.body.duration).toBeCloseTo(expectedDuration, 0);
      
      // Amount should reflect fractional hour pricing
      expect(response.body.totalAmount).toBeGreaterThan(0);
    });

    it('should handle pricing with discounts and surcharges', async () => {
      const spot = await testFactory.createSpot({ 
        garageId: garage.id,
        type: 'PREMIUM' // Premium spot with surcharge
      });
      const vehicle = await testFactory.createVehicle();
      
      // Create session during peak hours
      const peakCheckIn = new Date('2024-01-01T17:00:00Z'); // 5 PM
      const peakCheckOut = new Date('2024-01-01T19:00:00Z'); // 7 PM
      
      const session = await testFactory.createSession({
        spotId: spot.id,
        vehicleId: vehicle.id,
        checkInTime: peakCheckIn,
        checkOutTime: peakCheckOut,
        status: 'COMPLETED'
      });

      const response = await request(app)
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Should include premium spot surcharge
      expect(response.body.totalAmount).toBeGreaterThan(garage.hourlyRate * 2);
      expect(response.body.surcharges).toBeDefined();
    });

    it('should handle negative time zones and DST transitions', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();
      
      // Test daylight saving time transition
      const checkIn = new Date('2024-03-10T06:00:00Z'); // Before DST
      const checkOut = new Date('2024-03-10T08:00:00Z'); // After DST transition
      
      const session = await testFactory.createSession({
        spotId: spot.id,
        vehicleId: vehicle.id,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        status: 'COMPLETED'
      });

      const response = await request(app)
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Duration should account for time zone changes
      expect(response.body.duration).toBeGreaterThan(0);
      expect(response.body.totalAmount).toBeGreaterThan(0);
    });
  });

  describe('Reservation Conflicts and Resolution', () => {
    it('should handle overlapping reservation attempts', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle1 = await testFactory.createVehicle();
      const vehicle2 = await testFactory.createVehicle();
      
      const startTime = new Date(Date.now() + 60000); // 1 minute from now
      const endTime = new Date(Date.now() + 120000); // 2 minutes from now
      
      // Create first reservation
      const firstReservation = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle1.id,
          spotId: spot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });

      expect(firstReservation.status).toBe(201);

      // Attempt overlapping reservation
      const overlappingStart = new Date(Date.now() + 90000); // 1.5 minutes from now
      const overlappingEnd = new Date(Date.now() + 180000); // 3 minutes from now
      
      const secondReservation = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle2.id,
          spotId: spot.id,
          startTime: overlappingStart.toISOString(),
          endTime: overlappingEnd.toISOString()
        });

      expect(secondReservation.status).toBe(409); // Conflict
      expect(secondReservation.body.error).toMatch(/overlap|conflict|reserved/i);
    });

    it('should handle reservation cancellation and re-availability', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();
      
      const startTime = new Date(Date.now() + 60000);
      const endTime = new Date(Date.now() + 120000);
      
      // Create reservation
      const reservation = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });

      const reservationId = reservation.body.id;

      // Cancel reservation
      const cancellation = await request(app)
        .delete(`/api/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(cancellation.status).toBe(200);

      // Verify spot is available again for same time slot
      const newReservation = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });

      expect(newReservation.status).toBe(201);
    });

    it('should handle expired reservation cleanup', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();
      
      // Create reservation in the past (expired)
      const pastStart = new Date(Date.now() - 120000); // 2 minutes ago
      const pastEnd = new Date(Date.now() - 60000); // 1 minute ago
      
      const expiredReservation = await testFactory.createReservation({
        vehicleId: vehicle.id,
        spotId: spot.id,
        startTime: pastStart,
        endTime: pastEnd,
        status: 'ACTIVE'
      });

      // Attempt to create new reservation for same spot
      const newReservation = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id,
          startTime: new Date(Date.now() + 60000).toISOString(),
          endTime: new Date(Date.now() + 120000).toISOString()
        });

      // Should succeed because expired reservations should be cleaned up
      expect(newReservation.status).toBe(201);
    });

    it('should handle reservation no-shows', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();
      
      // Create reservation that has started but vehicle hasn't checked in
      const startTime = new Date(Date.now() - 60000); // 1 minute ago
      const endTime = new Date(Date.now() + 60000); // 1 minute from now
      
      const reservation = await testFactory.createReservation({
        vehicleId: vehicle.id,
        spotId: spot.id,
        startTime: startTime,
        endTime: endTime,
        status: 'ACTIVE'
      });

      // Check spot availability (should handle no-show)
      const availability = await request(app)
        .get(`/api/spots/${spot.id}/availability`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          checkTime: new Date().toISOString()
        });

      expect(availability.status).toBe(200);
      
      // May show as available due to no-show policy
      if (!availability.body.available) {
        expect(availability.body.reason).toMatch(/reserved|no.*show/i);
      }
    });
  });

  describe('Payment Processing Failures', () => {
    it('should handle payment gateway timeouts', async () => {
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

      // Simulate payment gateway timeout
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId,
          amount: 25.50,
          paymentMethod: 'CREDIT_CARD',
          cardToken: 'timeout_test_token', // Special token to simulate timeout
          timeout: 1000 // Short timeout
        });

      // Should handle timeout gracefully
      expect([200, 202, 408, 503]).toContain(paymentResponse.status);
      
      if (paymentResponse.status === 408) {
        expect(paymentResponse.body.error).toMatch(/timeout|gateway/i);
        expect(paymentResponse.body.retryable).toBe(true);
      }
    });

    it('should handle partial payment amounts', async () => {
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

      const checkoutResponse = await request(app)
        .post('/api/checkouts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId
        });

      const totalAmount = checkoutResponse.body.totalAmount;
      const partialAmount = totalAmount * 0.5; // 50% of total

      // Attempt partial payment
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId,
          amount: partialAmount,
          paymentMethod: 'CREDIT_CARD',
          cardToken: 'test_token'
        });

      expect(paymentResponse.status).toBe(400);
      expect(paymentResponse.body.error).toMatch(/partial.*payment|amount.*mismatch/i);
    });

    it('should handle currency precision issues', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();
      
      // Create session with pricing that results in fractional cents
      const session = await testFactory.createSession({
        spotId: spot.id,
        vehicleId: vehicle.id,
        checkInTime: new Date('2024-01-01T09:00:00Z'),
        checkOutTime: new Date('2024-01-01T09:17:33Z'), // Odd duration
        status: 'COMPLETED'
      });

      const response = await request(app)
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Amount should be properly rounded to 2 decimal places
      const amount = response.body.totalAmount;
      expect(Number.isInteger(amount * 100)).toBe(true); // Should have max 2 decimal places
      expect(amount).toBeGreaterThan(0);
    });

    it('should handle payment method validation edge cases', async () => {
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
        .send({ sessionId });

      const invalidPaymentMethods = [
        { paymentMethod: '', cardToken: 'test_token' },
        { paymentMethod: 'INVALID_METHOD', cardToken: 'test_token' },
        { paymentMethod: 'CREDIT_CARD', cardToken: '' },
        { paymentMethod: 'CREDIT_CARD', cardToken: null },
        { paymentMethod: 'CASH', cardToken: 'test_token' }, // Inconsistent
        { paymentMethod: 'CREDIT_CARD', cardToken: 'expired_card_token' }
      ];

      for (const method of invalidPaymentMethods) {
        const paymentResponse = await request(app)
          .post('/api/payments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId: sessionId,
            amount: 25.50,
            ...method
          });

        expect(paymentResponse.status).toBe(400);
        expect(paymentResponse.body.error).toBeDefined();
      }
    });
  });

  describe('Notification Delivery Failures', () => {
    it('should handle email service unavailability', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();

      // Checkin with email notification requested
      const response = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id,
          notifications: {
            email: true,
            emailAddress: 'test@example.com'
          }
        });

      // Core functionality should work even if email fails
      expect([200, 201, 202]).toContain(response.status);
      
      if (response.status === 202) {
        // Partial success - checkin worked but notification failed
        expect(response.body.warnings).toBeDefined();
        expect(response.body.warnings.some(w => w.includes('email'))).toBe(true);
      }
    });

    it('should handle SMS service failures gracefully', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();

      const response = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id,
          notifications: {
            sms: true,
            phoneNumber: '+1234567890'
          }
        });

      // Should complete checkin even if SMS fails
      expect([200, 201, 202]).toContain(response.status);
      expect(response.body.sessionId).toBeDefined();
    });

    it('should queue notifications for retry on failure', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();

      const checkinResponse = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id,
          notifications: {
            email: true,
            sms: true,
            emailAddress: 'test@example.com',
            phoneNumber: '+1234567890'
          }
        });

      const sessionId = checkinResponse.body.sessionId;

      // Check notification queue status
      const queueStatus = await request(app)
        .get(`/api/sessions/${sessionId}/notifications`)
        .set('Authorization', `Bearer ${authToken}`);

      if (queueStatus.status === 200) {
        expect(queueStatus.body.notifications).toBeDefined();
        expect(Array.isArray(queueStatus.body.notifications)).toBe(true);
      }
    });
  });

  describe('Report Generation with No Data', () => {
    it('should generate reports for empty date ranges', async () => {
      // Request report for future date range (no data)
      const futureStart = new Date(Date.now() + 86400000); // Tomorrow
      const futureEnd = new Date(Date.now() + 172800000); // Day after tomorrow

      const response = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'REVENUE',
          format: 'JSON',
          garageId: garage.id,
          dateRange: {
            start: futureStart.toISOString(),
            end: futureEnd.toISOString()
          }
        });

      expect([200, 204]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.data).toBeDefined();
        expect(response.body.summary.totalRevenue).toBe(0);
        expect(response.body.summary.totalSessions).toBe(0);
      }
    });

    it('should handle reports with invalid date ranges', async () => {
      const invalidDateRanges = [
        {
          start: '2024-12-31T23:59:59Z',
          end: '2024-01-01T00:00:00Z' // End before start
        },
        {
          start: 'invalid-date',
          end: '2024-12-31T23:59:59Z'
        },
        {
          start: '2024-01-01T00:00:00Z',
          end: 'not-a-date'
        },
        {
          start: '2020-01-01T00:00:00Z',
          end: '2030-12-31T23:59:59Z' // Too wide range
        }
      ];

      for (const dateRange of invalidDateRanges) {
        const response = await request(app)
          .post('/api/reports/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'REVENUE',
            format: 'JSON',
            garageId: garage.id,
            dateRange
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/date.*range|invalid.*date/i);
      }
    });

    it('should handle report generation for non-existent garages', async () => {
      const nonExistentGarageId = 'non-existent-garage-id';

      const response = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'OCCUPANCY',
          format: 'CSV',
          garageId: nonExistentGarageId,
          dateRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-31T23:59:59Z'
          }
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/garage.*not.*found/i);
    });

    it('should handle memory-intensive report generation', async () => {
      // Create large dataset for memory test
      const sessions = [];
      for (let i = 0; i < 100; i++) {
        const spot = await testFactory.createSpot({ garageId: garage.id });
        const vehicle = await testFactory.createVehicle();
        
        sessions.push(await testFactory.createSession({
          spotId: spot.id,
          vehicleId: vehicle.id,
          status: 'COMPLETED'
        }));
      }

      const response = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'DETAILED',
          format: 'JSON',
          garageId: garage.id,
          includeTransactions: true,
          includeVehicleDetails: true,
          dateRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-12-31T23:59:59Z'
          }
        })
        .timeout(30000);

      // Should either complete or timeout gracefully
      expect([200, 408]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.data.length).toBe(100);
        expect(response.body.summary).toBeDefined();
      }
    });
  });

  describe('Edge Cases in Session State Transitions', () => {
    it('should handle rapid state transitions', async () => {
      const spot = await testFactory.createSpot({ garageId: garage.id });
      const vehicle = await testFactory.createVehicle();

      // Rapid sequence: checkin -> extend -> checkout -> payment
      const checkinResponse = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id
        });

      const sessionId = checkinResponse.body.sessionId;

      // Immediate extension
      const extendResponse = await request(app)
        .post(`/api/sessions/${sessionId}/extend`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          additionalHours: 2
        });

      expect(extendResponse.status).toBe(200);

      // Immediate checkout
      const checkoutResponse = await request(app)
        .post('/api/checkouts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId
        });

      expect(checkoutResponse.status).toBe(200);

      // Verify final state is consistent
      const finalSession = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalSession.status).toBe(200);
      expect(finalSession.body.status).toBe('COMPLETED');
      expect(finalSession.body.totalAmount).toBeGreaterThan(0);
    });

    it('should handle session state conflicts', async () => {
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

      // Concurrent conflicting operations
      const conflictingOperations = [
        request(app)
          .post('/api/checkouts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ sessionId }),
        
        request(app)
          .post(`/api/sessions/${sessionId}/cancel`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ reason: 'User request' }),
        
        request(app)
          .post(`/api/sessions/${sessionId}/extend`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ additionalHours: 1 })
      ];

      const results = await Promise.allSettled(conflictingOperations);
      
      // Only one should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful).toHaveLength(1);

      // Verify final state is consistent
      const finalSession = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalSession.status).toBe(200);
      expect(['COMPLETED', 'CANCELLED', 'ACTIVE']).toContain(finalSession.body.status);
    });

    it('should handle session without proper checkin', async () => {
      // Attempt to checkout non-existent session
      const fakeSessionId = 'fake-session-id';

      const checkoutResponse = await request(app)
        .post('/api/checkouts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: fakeSessionId
        });

      expect(checkoutResponse.status).toBe(404);
      expect(checkoutResponse.body.error).toMatch(/session.*not.*found/i);
    });

    it('should handle session time manipulation attempts', async () => {
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

      // Attempt to manipulate checkout time
      const maliciousCheckout = await request(app)
        .post('/api/checkouts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId,
          checkOutTime: new Date(Date.now() - 86400000).toISOString() // Yesterday (before checkin)
        });

      // Should either ignore the provided time or reject
      if (maliciousCheckout.status === 200) {
        // If accepted, verify time wasn't manipulated
        const session = await request(app)
          .get(`/api/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${authToken}`);

        const checkIn = new Date(session.body.checkInTime);
        const checkOut = new Date(session.body.checkOutTime);
        
        expect(checkOut.getTime()).toBeGreaterThan(checkIn.getTime());
      } else {
        expect(maliciousCheckout.status).toBe(400);
        expect(maliciousCheckout.body.error).toMatch(/invalid.*time|checkout.*before/i);
      }
    });
  });

  describe('Capacity Management Edge Cases', () => {
    it('should handle garage over-capacity scenarios', async () => {
      // Create garage with 2 spots
      const spots = await Promise.all([
        testFactory.createSpot({ garageId: garage.id }),
        testFactory.createSpot({ garageId: garage.id })
      ]);

      // Occupy both spots
      const vehicles = await Promise.all([
        testFactory.createVehicle(),
        testFactory.createVehicle(),
        testFactory.createVehicle() // Third vehicle should fail
      ]);

      const checkinResults = await Promise.all([
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
          }),
        
        request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vehicleId: vehicles[2].id,
            garageId: garage.id // No specific spot - should auto-assign
          })
      ]);

      // First two should succeed
      expect(checkinResults[0].status).toBe(201);
      expect(checkinResults[1].status).toBe(201);

      // Third should fail - garage at capacity
      expect(checkinResults[2].status).toBe(409);
      expect(checkinResults[2].body.error).toMatch(/capacity|no.*available.*spots/i);
    });

    it('should handle spot type mismatches', async () => {
      const regularSpot = await testFactory.createSpot({ 
        garageId: garage.id, 
        type: 'REGULAR' 
      });
      
      const disabledSpot = await testFactory.createSpot({ 
        garageId: garage.id, 
        type: 'DISABLED' 
      });

      const vehicle = await testFactory.createVehicle({
        hasDisabledPermit: false
      });

      // Attempt to park in disabled spot without permit
      const response = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: disabledSpot.id
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/disabled.*permit|not.*eligible/i);

      // Regular spot should work
      const validResponse = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: regularSpot.id
        });

      expect(validResponse.status).toBe(201);
    });

    it('should handle dynamic capacity changes', async () => {
      const spot = await testFactory.createSpot({ 
        garageId: garage.id,
        status: 'AVAILABLE'
      });

      // Mark spot as maintenance while available
      const maintenanceResponse = await request(app)
        .put(`/api/spots/${spot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'MAINTENANCE',
          reason: 'Emergency repair'
        });

      expect(maintenanceResponse.status).toBe(200);

      // Attempt to checkin to maintenance spot
      const vehicle = await testFactory.createVehicle();
      const checkinResponse = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicle.id,
          spotId: spot.id
        });

      expect(checkinResponse.status).toBe(400);
      expect(checkinResponse.body.error).toMatch(/maintenance|unavailable/i);
    });
  });
});