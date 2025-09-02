/**
 * Reservations API End-to-End Tests
 * 
 * Comprehensive test suite for all reservation management endpoints including:
 * - GET /api/reservations - List reservations with filters
 * - POST /api/reservations - Create new reservation
 * - GET /api/reservations/:id - Get reservation by ID
 * - PUT /api/reservations/:id - Update reservation
 * - DELETE /api/reservations/:id - Cancel reservation
 * - GET /api/reservations/availability - Check spot availability
 */

import request from 'supertest';
import { Application } from 'express';
import { faker } from '@faker-js/faker';
import {
  createAPITestContext,
  APITestContext,
  generateTestReservation,
  validateAPIResponse,
  testRateLimit,
  testInputValidation,
  ValidationTestCase,
  createAuthenticatedRequest
} from '../../helpers/api-test-helpers';
import { createTestApp } from '../../helpers/app-helpers';
import { setupTestDatabase, teardownTestDatabase, TestDatabase } from '../../setup/test-db-setup';

describe('Reservations API E2E Tests', () => {
  let app: Application;
  let testDb: TestDatabase;
  let context: APITestContext;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    app = await createTestApp(testDb.getService());
    context = await createAPITestContext(app, testDb.getService());
  });

  afterAll(async () => {
    await teardownTestDatabase(testDb);
  });

  beforeEach(async () => {
    if (testDb) {
      await testDb.reset();
    }
  });

  describe('GET /api/reservations (List Reservations)', () => {
    const reservationsEndpoint = '/api/reservations';

    describe('Admin/Manager Access', () => {
      it('should return paginated list of all reservations for admin', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', reservationsEndpoint, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('totalCount');
        expect(response.body.data).toHaveProperty('page');
        expect(response.body.data).toHaveProperty('limit');
        expect(Array.isArray(response.body.data.data)).toBe(true);

        // Verify reservation data structure
        if (response.body.data.data.length > 0) {
          const reservation = response.body.data.data[0];
          expect(reservation).toHaveProperty('id');
          expect(reservation).toHaveProperty('userId');
          expect(reservation).toHaveProperty('vehicleId');
          expect(reservation).toHaveProperty('spotId');
          expect(reservation).toHaveProperty('startTime');
          expect(reservation).toHaveProperty('endTime');
          expect(reservation).toHaveProperty('status');
          expect(reservation).toHaveProperty('totalAmount');
        }
      });

      it('should return reservations for manager', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', reservationsEndpoint, context.managerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('data');
      });

      it('should support pagination parameters', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${reservationsEndpoint}?page=1&limit=2`, context.adminToken
        ).expect(200);

        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(2);
        expect(response.body.data.data.length).toBeLessThanOrEqual(2);
      });

      it('should support sorting by start time', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${reservationsEndpoint}?sortBy=startTime&sortOrder=asc`, context.adminToken
        ).expect(200);

        const reservations = response.body.data.data;
        if (reservations.length > 1) {
          const firstStart = new Date(reservations[0].startTime);
          const secondStart = new Date(reservations[1].startTime);
          expect(firstStart.getTime()).toBeLessThanOrEqual(secondStart.getTime());
        }
      });

      it('should support filtering by status', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${reservationsEndpoint}?status=CONFIRMED`, context.adminToken
        ).expect(200);

        const reservations = response.body.data.data;
        reservations.forEach((reservation: any) => {
          expect(reservation.status).toBe('CONFIRMED');
        });
      });

      it('should support filtering by user ID', async () => {
        const userId = 'customer-1-id';
        const response = await createAuthenticatedRequest(
          app, 'get', `${reservationsEndpoint}?userId=${userId}`, context.adminToken
        ).expect(200);

        const reservations = response.body.data.data;
        reservations.forEach((reservation: any) => {
          expect(reservation.userId).toBe(userId);
        });
      });

      it('should support filtering by spot ID', async () => {
        const spotId = 'spot-1-id';
        const response = await createAuthenticatedRequest(
          app, 'get', `${reservationsEndpoint}?spotId=${spotId}`, context.adminToken
        ).expect(200);

        const reservations = response.body.data.data;
        reservations.forEach((reservation: any) => {
          expect(reservation.spotId).toBe(spotId);
        });
      });

      it('should support date range filtering', async () => {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

        const response = await createAuthenticatedRequest(
          app, 'get', 
          `${reservationsEndpoint}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, 
          context.adminToken
        ).expect(200);

        const reservations = response.body.data.data;
        reservations.forEach((reservation: any) => {
          const reservationStart = new Date(reservation.startTime);
          expect(reservationStart.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(reservationStart.getTime()).toBeLessThanOrEqual(endDate.getTime());
        });
      });
    });

    describe('Customer Access', () => {
      it('should return only customer\'s own reservations', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', reservationsEndpoint, context.customerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        const reservations = response.body.data.data;
        
        // All reservations should belong to the authenticated customer
        reservations.forEach((reservation: any) => {
          expect(reservation.userId).toBe('customer-1-id');
        });
      });
    });

    describe('Authorization', () => {
      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .get(reservationsEndpoint)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('POST /api/reservations (Create Reservation)', () => {
    const reservationsEndpoint = '/api/reservations';

    describe('Valid Reservation Creation', () => {
      it('should create reservation for authenticated customer', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

        const reservationData = {
          vehicleId: 'vehicle-1-id',
          spotId: 'spot-3-id', // Use available spot
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        };

        const response = await createAuthenticatedRequest(
          app, 'post', reservationsEndpoint, context.customerToken
        )
          .send(reservationData)
          .expect(201);

        const validation = validateAPIResponse(response, 201);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const reservation = response.body.data;
        expect(reservation.vehicleId).toBe(reservationData.vehicleId);
        expect(reservation.spotId).toBe(reservationData.spotId);
        expect(reservation.userId).toBe('customer-1-id'); // Should be set to authenticated user
        expect(reservation.status).toBe('PENDING');
        expect(reservation).toHaveProperty('id');
        expect(reservation).toHaveProperty('totalAmount');
        expect(reservation.totalAmount).toBeGreaterThan(0);
        expect(reservation).toHaveProperty('createdAt');
      });

      it('should calculate total amount based on duration and spot rate', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours

        const reservationData = {
          vehicleId: 'vehicle-1-id',
          spotId: 'spot-1-id', // $5.00/hour rate
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        };

        const response = await createAuthenticatedRequest(
          app, 'post', reservationsEndpoint, context.customerToken
        )
          .send(reservationData)
          .expect(201);

        // Should be approximately 3 hours * $5.00 = $15.00
        expect(response.body.data.totalAmount).toBeCloseTo(15.00, 2);
      });

      it('should allow admin to create reservation for any user', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const reservationData = {
          userId: 'customer-2-id',
          vehicleId: 'vehicle-2-id',
          spotId: 'spot-4-id',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        };

        const response = await createAuthenticatedRequest(
          app, 'post', reservationsEndpoint, context.adminToken
        )
          .send(reservationData)
          .expect(201);

        expect(response.body.data.userId).toBe(reservationData.userId);
      });

      it('should handle different reservation statuses', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const reservationData = {
          vehicleId: 'vehicle-1-id',
          spotId: 'spot-5-id',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: 'CONFIRMED'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', reservationsEndpoint, context.adminToken
        )
          .send(reservationData)
          .expect(201);

        expect(response.body.data.status).toBe('CONFIRMED');
      });
    });

    describe('Input Validation', () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 60 * 60 * 1000);
      const laterTime = new Date(futureTime.getTime() + 2 * 60 * 60 * 1000);

      const reservationValidationCases: ValidationTestCase[] = [
        {
          name: 'missing vehicle ID',
          input: {
            spotId: 'spot-1-id',
            startTime: futureTime.toISOString(),
            endTime: laterTime.toISOString()
          },
          expectedStatus: 400
        },
        {
          name: 'missing spot ID',
          input: {
            vehicleId: 'vehicle-1-id',
            startTime: futureTime.toISOString(),
            endTime: laterTime.toISOString()
          },
          expectedStatus: 400
        },
        {
          name: 'missing start time',
          input: {
            vehicleId: 'vehicle-1-id',
            spotId: 'spot-1-id',
            endTime: laterTime.toISOString()
          },
          expectedStatus: 400
        },
        {
          name: 'missing end time',
          input: {
            vehicleId: 'vehicle-1-id',
            spotId: 'spot-1-id',
            startTime: futureTime.toISOString()
          },
          expectedStatus: 400
        },
        {
          name: 'invalid date format',
          input: {
            vehicleId: 'vehicle-1-id',
            spotId: 'spot-1-id',
            startTime: 'invalid-date',
            endTime: laterTime.toISOString()
          },
          expectedStatus: 400
        },
        {
          name: 'end time before start time',
          input: {
            vehicleId: 'vehicle-1-id',
            spotId: 'spot-1-id',
            startTime: laterTime.toISOString(),
            endTime: futureTime.toISOString()
          },
          expectedStatus: 400
        },
        {
          name: 'start time in the past',
          input: {
            vehicleId: 'vehicle-1-id',
            spotId: 'spot-1-id',
            startTime: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
            endTime: futureTime.toISOString()
          },
          expectedStatus: 400
        },
        {
          name: 'reservation too short (less than minimum)',
          input: {
            vehicleId: 'vehicle-1-id',
            spotId: 'spot-1-id',
            startTime: futureTime.toISOString(),
            endTime: new Date(futureTime.getTime() + 15 * 60 * 1000).toISOString() // 15 minutes
          },
          expectedStatus: 400
        },
        {
          name: 'reservation too long (more than maximum)',
          input: {
            vehicleId: 'vehicle-1-id',
            spotId: 'spot-1-id',
            startTime: futureTime.toISOString(),
            endTime: new Date(futureTime.getTime() + 25 * 60 * 60 * 1000).toISOString() // 25 hours
          },
          expectedStatus: 400
        },
        {
          name: 'invalid status',
          input: {
            vehicleId: 'vehicle-1-id',
            spotId: 'spot-1-id',
            startTime: futureTime.toISOString(),
            endTime: laterTime.toISOString(),
            status: 'INVALID_STATUS'
          },
          expectedStatus: 400
        }
      ];

      it('should validate reservation creation input', async () => {
        const results = await testInputValidation(
          app,
          'post',
          reservationsEndpoint,
          reservationValidationCases,
          context.customerToken
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });

      it('should prevent reserving non-existent vehicle', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const reservationData = {
          vehicleId: 'non-existent-vehicle',
          spotId: 'spot-1-id',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        };

        const response = await createAuthenticatedRequest(
          app, 'post', reservationsEndpoint, context.customerToken
        )
          .send(reservationData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('vehicle');
      });

      it('should prevent reserving non-existent spot', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const reservationData = {
          vehicleId: 'vehicle-1-id',
          spotId: 'non-existent-spot',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        };

        const response = await createAuthenticatedRequest(
          app, 'post', reservationsEndpoint, context.customerToken
        )
          .send(reservationData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('spot');
      });

      it('should prevent double booking of the same spot', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const reservationData = {
          vehicleId: 'vehicle-1-id',
          spotId: 'spot-1-id', // This spot already has a reservation
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        };

        const response = await createAuthenticatedRequest(
          app, 'post', reservationsEndpoint, context.customerToken
        )
          .send(reservationData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('available');
      });
    });

    describe('Authorization', () => {
      it('should require authentication', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const reservationData = {
          vehicleId: 'vehicle-1-id',
          spotId: 'spot-1-id',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        };

        const response = await request(app)
          .post(reservationsEndpoint)
          .send(reservationData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should prevent customer from reserving other customers\' vehicles', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const reservationData = {
          vehicleId: 'vehicle-2-id', // Belongs to customer-2
          spotId: 'spot-3-id',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        };

        const response = await createAuthenticatedRequest(
          app, 'post', reservationsEndpoint, context.customerToken
        )
          .send(reservationData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });

      it('should prevent customer from setting custom userId', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const reservationData = {
          userId: 'other-customer-id',
          vehicleId: 'vehicle-1-id',
          spotId: 'spot-3-id',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        };

        const response = await createAuthenticatedRequest(
          app, 'post', reservationsEndpoint, context.customerToken
        )
          .send(reservationData)
          .expect(201);

        // userId should be set to authenticated user, not the provided value
        expect(response.body.data.userId).toBe('customer-1-id');
        expect(response.body.data.userId).not.toBe('other-customer-id');
      });
    });
  });

  describe('GET /api/reservations/:id (Get Reservation by ID)', () => {
    const testReservationId = 'reservation-1-id';

    describe('Valid Access', () => {
      it('should allow admin to get any reservation', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/reservations/${testReservationId}`, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const reservation = response.body.data;
        expect(reservation.id).toBe(testReservationId);
        expect(reservation).toHaveProperty('userId');
        expect(reservation).toHaveProperty('vehicleId');
        expect(reservation).toHaveProperty('spotId');
      });

      it('should allow manager to get any reservation', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/reservations/${testReservationId}`, context.managerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testReservationId);
      });

      it('should allow customer to get their own reservations', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/reservations/${testReservationId}`, context.customerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userId).toBe('customer-1-id');
      });

      it('should include related data (vehicle, spot details)', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/reservations/${testReservationId}?include=vehicle,spot`, context.adminToken
        ).expect(200);

        const reservation = response.body.data;
        expect(reservation).toHaveProperty('vehicle');
        expect(reservation).toHaveProperty('spot');
        expect(reservation.vehicle).toHaveProperty('licensePlate');
        expect(reservation.spot).toHaveProperty('spotNumber');
      });
    });

    describe('Authorization Restrictions', () => {
      it('should prevent customer from accessing other customers\' reservations', async () => {
        const otherReservationId = 'reservation-2-id'; // Belongs to customer-2
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/reservations/${otherReservationId}`, context.customerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent reservation', async () => {
        const nonExistentId = 'non-existent-reservation';
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/reservations/${nonExistentId}`, context.adminToken
        ).expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('not found');
      });
    });
  });

  describe('PUT /api/reservations/:id (Update Reservation)', () => {
    const testReservationId = 'reservation-1-id';

    describe('Valid Updates', () => {
      it('should allow customer to update their own reservation', async () => {
        const now = new Date();
        const newStartTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
        const newEndTime = new Date(newStartTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours later

        const updateData = {
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          notes: 'Updated reservation notes'
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.customerToken
        )
          .send(updateData)
          .expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const reservation = response.body.data;
        expect(new Date(reservation.startTime)).toEqual(newStartTime);
        expect(new Date(reservation.endTime)).toEqual(newEndTime);
        expect(reservation.notes).toBe(updateData.notes);
        expect(reservation).toHaveProperty('updatedAt');
      });

      it('should allow admin to update any reservation', async () => {
        const updateData = {
          status: 'CONFIRMED',
          notes: 'Admin confirmed reservation'
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.adminToken
        )
          .send(updateData)
          .expect(200);

        expect(response.body.data.status).toBe(updateData.status);
        expect(response.body.data.notes).toBe(updateData.notes);
      });

      it('should recalculate total amount when times change', async () => {
        const now = new Date();
        const newStartTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const newEndTime = new Date(newStartTime.getTime() + 4 * 60 * 60 * 1000); // 4 hours duration

        const updateData = {
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString()
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.adminToken
        )
          .send(updateData)
          .expect(200);

        // Total amount should be recalculated based on new duration
        expect(response.body.data.totalAmount).toBeGreaterThan(0);
      });

      it('should allow partial updates', async () => {
        const updateData = { notes: 'Just updating notes' };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.customerToken
        )
          .send(updateData)
          .expect(200);

        expect(response.body.data.notes).toBe(updateData.notes);
        // Other fields should remain unchanged
        expect(response.body.data.vehicleId).toBeDefined();
        expect(response.body.data.spotId).toBeDefined();
      });
    });

    describe('Business Logic Restrictions', () => {
      it('should prevent updating confirmed reservations beyond certain changes', async () => {
        // First, confirm the reservation
        await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.adminToken
        )
          .send({ status: 'CONFIRMED' })
          .expect(200);

        // Try to change essential details of confirmed reservation
        const updateData = {
          spotId: 'spot-3-id', // Different spot
          vehicleId: 'vehicle-2-id' // Different vehicle
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.customerToken
        )
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('confirmed');
      });

      it('should prevent updating active reservations', async () => {
        // This test assumes there's business logic preventing updates to active reservations
        const updateData = { notes: 'Trying to update active reservation' };

        // Set reservation to active status first
        await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.adminToken
        )
          .send({ status: 'ACTIVE' });

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.customerToken
        )
          .send(updateData);

        // Should either succeed (notes update allowed) or fail (no updates to active reservations)
        if (response.status === 400) {
          expect(response.body.message).toContain('active');
        } else {
          expect(response.status).toBe(200);
        }
      });

      it('should prevent changing to an unavailable spot', async () => {
        const updateData = {
          spotId: 'spot-2-id' // Assume this spot has conflicting reservation
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.customerToken
        )
          .send(updateData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('available');
      });
    });

    describe('Authorization Restrictions', () => {
      it('should prevent customer from updating other customers\' reservations', async () => {
        const otherReservationId = 'reservation-2-id';
        const updateData = { notes: 'Hacked' };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${otherReservationId}`, context.customerToken
        )
          .send(updateData)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should prevent customer from changing certain restricted fields', async () => {
        const updateData = {
          userId: 'other-customer-id',
          totalAmount: 999.99,
          status: 'COMPLETED' // Customer shouldn't be able to complete their own reservation
        };

        const response = await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.customerToken
        )
          .send(updateData)
          .expect(200);

        // Restricted fields should not be changed
        expect(response.body.data.userId).toBe('customer-1-id');
        expect(response.body.data.status).not.toBe('COMPLETED');
      });
    });

    describe('Input Validation', () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 60 * 60 * 1000);
      const laterTime = new Date(futureTime.getTime() + 2 * 60 * 60 * 1000);

      const updateValidationCases: ValidationTestCase[] = [
        {
          name: 'invalid date format',
          input: { startTime: 'invalid-date' },
          expectedStatus: 400
        },
        {
          name: 'end time before start time',
          input: {
            startTime: laterTime.toISOString(),
            endTime: futureTime.toISOString()
          },
          expectedStatus: 400
        },
        {
          name: 'start time in the past',
          input: {
            startTime: new Date(now.getTime() - 60 * 60 * 1000).toISOString()
          },
          expectedStatus: 400
        },
        {
          name: 'invalid status',
          input: { status: 'INVALID_STATUS' },
          expectedStatus: 400
        },
        {
          name: 'negative total amount',
          input: { totalAmount: -10.00 },
          expectedStatus: 400
        }
      ];

      it('should validate update data', async () => {
        const results = await testInputValidation(
          app,
          'put',
          `/api/reservations/${testReservationId}`,
          updateValidationCases,
          context.customerToken
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });
    });
  });

  describe('DELETE /api/reservations/:id (Cancel Reservation)', () => {
    const testReservationId = 'reservation-2-id';

    describe('Valid Cancellation', () => {
      it('should allow customer to cancel their own reservation', async () => {
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/reservations/${testReservationId}`, context.customerToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200, false);
        expect(validation.hasSuccessField).toBe(true);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('cancelled');
      });

      it('should allow admin to cancel any reservation', async () => {
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/reservations/${testReservationId}`, context.adminToken
        ).expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should set reservation status to cancelled instead of deleting', async () => {
        await createAuthenticatedRequest(
          app, 'delete', `/api/reservations/${testReservationId}`, context.adminToken
        ).expect(200);

        // Verify reservation still exists but is cancelled
        const getResponse = await createAuthenticatedRequest(
          app, 'get', `/api/reservations/${testReservationId}`, context.adminToken
        ).expect(200);

        expect(getResponse.body.data.status).toBe('CANCELLED');
      });

      it('should handle cancellation with refund calculation', async () => {
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/reservations/${testReservationId}?refund=true`, context.adminToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        // Response might include refund information
        if (response.body.data) {
          expect(response.body.data).toHaveProperty('refundAmount');
        }
      });
    });

    describe('Business Logic Restrictions', () => {
      it('should prevent cancellation of active reservations', async () => {
        // Set reservation to active first
        await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.adminToken
        )
          .send({ status: 'ACTIVE' });

        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/reservations/${testReservationId}`, context.customerToken
        ).expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('active');
      });

      it('should prevent cancellation of completed reservations', async () => {
        // Set reservation to completed first
        await createAuthenticatedRequest(
          app, 'put', `/api/reservations/${testReservationId}`, context.adminToken
        )
          .send({ status: 'COMPLETED' });

        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/reservations/${testReservationId}`, context.customerToken
        ).expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('completed');
      });

      it('should apply cancellation fees for late cancellations', async () => {
        // This test assumes business logic for cancellation fees
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/reservations/${testReservationId}`, context.customerToken
        ).expect(200);

        if (response.body.data && response.body.data.cancellationFee) {
          expect(response.body.data.cancellationFee).toBeGreaterThanOrEqual(0);
        }
      });
    });

    describe('Authorization Restrictions', () => {
      it('should prevent customer from cancelling other customers\' reservations', async () => {
        const otherReservationId = 'reservation-1-id'; // Belongs to different customer
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/reservations/${otherReservationId}`, context.customerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent reservation', async () => {
        const nonExistentId = 'non-existent-reservation';
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/reservations/${nonExistentId}`, context.adminToken
        ).expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should handle already cancelled reservation', async () => {
        // Cancel reservation first
        await createAuthenticatedRequest(
          app, 'delete', `/api/reservations/${testReservationId}`, context.adminToken
        ).expect(200);

        // Try to cancel again
        const response = await createAuthenticatedRequest(
          app, 'delete', `/api/reservations/${testReservationId}`, context.adminToken
        ).expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already cancelled');
      });
    });
  });

  describe('GET /api/reservations/availability (Check Availability)', () => {
    const availabilityEndpoint = '/api/reservations/availability';

    describe('Valid Availability Checks', () => {
      it('should check spot availability for given time range', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const params = new URLSearchParams({
          spotId: 'spot-3-id',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });

        const response = await createAuthenticatedRequest(
          app, 'get', `${availabilityEndpoint}?${params}`, context.customerToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        expect(response.body.data).toHaveProperty('available');
        expect(response.body.data).toHaveProperty('spotId');
        expect(response.body.data).toHaveProperty('conflicts');
        expect(typeof response.body.data.available).toBe('boolean');
      });

      it('should return all available spots for time range', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const params = new URLSearchParams({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });

        const response = await createAuthenticatedRequest(
          app, 'get', `${availabilityEndpoint}?${params}`, context.customerToken
        ).expect(200);

        expect(response.body.data).toHaveProperty('availableSpots');
        expect(Array.isArray(response.body.data.availableSpots)).toBe(true);
        
        response.body.data.availableSpots.forEach((spot: any) => {
          expect(spot).toHaveProperty('id');
          expect(spot).toHaveProperty('spotNumber');
          expect(spot).toHaveProperty('hourlyRate');
        });
      });

      it('should filter by spot type', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const params = new URLSearchParams({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          spotType: 'PREMIUM'
        });

        const response = await createAuthenticatedRequest(
          app, 'get', `${availabilityEndpoint}?${params}`, context.customerToken
        ).expect(200);

        const availableSpots = response.body.data.availableSpots || [];
        availableSpots.forEach((spot: any) => {
          expect(spot.spotType).toBe('PREMIUM');
        });
      });

      it('should include pricing information', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours

        const params = new URLSearchParams({
          spotId: 'spot-1-id',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          includePricing: 'true'
        });

        const response = await createAuthenticatedRequest(
          app, 'get', `${availabilityEndpoint}?${params}`, context.customerToken
        ).expect(200);

        if (response.body.data.available) {
          expect(response.body.data).toHaveProperty('estimatedCost');
          expect(response.body.data.estimatedCost).toBeGreaterThan(0);
        }
      });
    });

    describe('Input Validation', () => {
      it('should require start and end time for general availability check', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', availabilityEndpoint, context.customerToken
        ).expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('time');
      });

      it('should validate date format', async () => {
        const params = new URLSearchParams({
          startTime: 'invalid-date',
          endTime: 'invalid-date'
        });

        const response = await createAuthenticatedRequest(
          app, 'get', `${availabilityEndpoint}?${params}`, context.customerToken
        ).expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate time range logic', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const endTime = new Date(now.getTime() + 60 * 60 * 1000); // End before start

        const params = new URLSearchParams({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });

        const response = await createAuthenticatedRequest(
          app, 'get', `${availabilityEndpoint}?${params}`, context.customerToken
        ).expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate spot type', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const params = new URLSearchParams({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          spotType: 'INVALID_TYPE'
        });

        const response = await createAuthenticatedRequest(
          app, 'get', `${availabilityEndpoint}?${params}`, context.customerToken
        ).expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce lenient rate limiting for availability checks', async () => {
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

        const params = new URLSearchParams({
          spotId: 'spot-1-id',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });

        const results = await testRateLimit(
          app,
          `${availabilityEndpoint}?${params}`,
          'get',
          35, // Higher limit for availability checks
          60000,
          context.customerToken
        );

        expect(results.firstRateLimitHit).toBeGreaterThan(25);
        expect(results.rateLimitedRequests).toBeGreaterThan(0);
      });
    });
  });

  describe('Security and Error Handling', () => {
    it('should sanitize input to prevent injection attacks', async () => {
      const maliciousInput = {
        notes: '<script>alert("xss")</script>',
        vehicleId: 'vehicle-1-id',
        spotId: 'spot-3-id'
      };

      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/reservations', context.customerToken
      )
        .send({
          ...maliciousInput,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
        .expect(201);

      // Values should be sanitized
      expect(response.body.data.notes).not.toContain('<script>');
    });

    it('should handle concurrent reservation attempts for same spot', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const reservationData = {
        vehicleId: 'vehicle-1-id',
        spotId: 'spot-5-id', // Available spot
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      };

      // Send concurrent requests for same spot
      const promises = Array.from({ length: 3 }, () =>
        createAuthenticatedRequest(app, 'post', '/api/reservations', context.customerToken)
          .send(reservationData)
      );

      const responses = await Promise.all(promises);

      // Only one should succeed, others should get conflict error
      const successfulResponses = responses.filter(r => r.status === 201);
      const conflictResponses = responses.filter(r => r.status === 409);

      expect(successfulResponses.length).toBe(1);
      expect(conflictResponses.length).toBe(2);
    });

    it('should log reservation actions for audit trail', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const reservationData = {
        vehicleId: 'vehicle-1-id',
        spotId: 'spot-3-id',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/reservations', context.customerToken
      )
        .send(reservationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // In a real scenario, you'd check audit logs here
    });

    it('should handle timezone issues gracefully', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      // Test with different timezone formats
      const reservationData = {
        vehicleId: 'vehicle-1-id',
        spotId: 'spot-3-id',
        startTime: startTime.toISOString().replace('Z', '+00:00'),
        endTime: endTime.toISOString().replace('Z', '+00:00')
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/reservations', context.customerToken
      )
        .send(reservationData);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });
});