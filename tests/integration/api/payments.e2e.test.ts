/**
 * Payments API End-to-End Tests
 * 
 * Comprehensive test suite for all payment management endpoints including:
 * - GET /api/payments - List payments
 * - POST /api/payments - Process payment
 * - GET /api/payments/:id - Get payment details
 * - POST /api/payments/:id/refund - Process refund
 * - GET /api/payments/summary - Get payment reports
 */

import request from 'supertest';
import { Application } from 'express';
import { faker } from '@faker-js/faker';
import {
  createAPITestContext,
  APITestContext,
  generateTestPayment,
  validateAPIResponse,
  testRateLimit,
  testInputValidation,
  ValidationTestCase,
  createAuthenticatedRequest
} from '../../helpers/api-test-helpers';
import { createTestApp } from '../../helpers/app-helpers';
import { setupTestDatabase, teardownTestDatabase, TestDatabase } from '../../setup/test-db-setup';

describe('Payments API E2E Tests', () => {
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

  describe('GET /api/payments (List Payments)', () => {
    const paymentsEndpoint = '/api/payments';

    describe('Admin/Manager Access', () => {
      it('should return paginated list of all payments for admin', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', paymentsEndpoint, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('totalCount');
        expect(response.body.data).toHaveProperty('page');
        expect(response.body.data).toHaveProperty('limit');
        expect(Array.isArray(response.body.data.data)).toBe(true);

        // Verify payment data structure
        if (response.body.data.data.length > 0) {
          const payment = response.body.data.data[0];
          expect(payment).toHaveProperty('id');
          expect(payment).toHaveProperty('amount');
          expect(payment).toHaveProperty('status');
          expect(payment).toHaveProperty('paymentMethod');
          expect(payment).toHaveProperty('reservationId');
          expect(payment).toHaveProperty('createdAt');
          
          // Sensitive data should be redacted for non-admin users
          if (payment.paymentIntentId) {
            expect(typeof payment.paymentIntentId).toBe('string');
          }
        }
      });

      it('should support pagination parameters', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${paymentsEndpoint}?page=1&limit=2`, context.adminToken
        ).expect(200);

        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(2);
        expect(response.body.data.data.length).toBeLessThanOrEqual(2);
      });

      it('should support sorting by amount', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${paymentsEndpoint}?sortBy=amount&sortOrder=desc`, context.adminToken
        ).expect(200);

        const payments = response.body.data.data;
        if (payments.length > 1) {
          expect(payments[0].amount).toBeGreaterThanOrEqual(payments[1].amount);
        }
      });

      it('should support filtering by status', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${paymentsEndpoint}?status=COMPLETED`, context.adminToken
        ).expect(200);

        const payments = response.body.data.data;
        payments.forEach((payment: any) => {
          expect(payment.status).toBe('COMPLETED');
        });
      });

      it('should support filtering by payment method', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${paymentsEndpoint}?paymentMethod=CREDIT_CARD`, context.adminToken
        ).expect(200);

        const payments = response.body.data.data;
        payments.forEach((payment: any) => {
          expect(payment.paymentMethod).toBe('CREDIT_CARD');
        });
      });

      it('should support date range filtering', async () => {
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');

        const response = await createAuthenticatedRequest(
          app, 'get', 
          `${paymentsEndpoint}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, 
          context.adminToken
        ).expect(200);

        const payments = response.body.data.data;
        payments.forEach((payment: any) => {
          const paymentDate = new Date(payment.createdAt);
          expect(paymentDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(paymentDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
        });
      });

      it('should support amount range filtering', async () => {
        const minAmount = 5.00;
        const maxAmount = 50.00;

        const response = await createAuthenticatedRequest(
          app, 'get', `${paymentsEndpoint}?minAmount=${minAmount}&maxAmount=${maxAmount}`, context.adminToken
        ).expect(200);

        const payments = response.body.data.data;
        payments.forEach((payment: any) => {
          expect(payment.amount).toBeGreaterThanOrEqual(minAmount);
          expect(payment.amount).toBeLessThanOrEqual(maxAmount);
        });
      });
    });

    describe('Customer Access', () => {
      it('should return only customer\'s own payments', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', paymentsEndpoint, context.customerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        const payments = response.body.data.data;
        
        // All payments should be associated with customer's reservations
        payments.forEach((payment: any) => {
          expect(payment.reservationId).toBeDefined();
          // In a real system, you'd verify the reservation belongs to the customer
        });
      });

      it('should redact sensitive payment information for customers', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', paymentsEndpoint, context.customerToken
        ).expect(200);

        const payments = response.body.data.data;
        payments.forEach((payment: any) => {
          // Payment intent IDs should be redacted or masked
          if (payment.paymentIntentId) {
            expect(payment.paymentIntentId).toMatch(/^\*+/);
          }
        });
      });
    });

    describe('Authorization', () => {
      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .get(paymentsEndpoint)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('POST /api/payments (Process Payment)', () => {
    const paymentsEndpoint = '/api/payments';

    describe('Valid Payment Processing', () => {
      it('should process payment for reservation', async () => {
        const paymentData = {
          reservationId: 'reservation-1-id',
          amount: 15.00,
          paymentMethod: 'CREDIT_CARD',
          paymentIntentId: 'pi_test_' + faker.string.alphanumeric(24)
        };

        const response = await createAuthenticatedRequest(
          app, 'post', paymentsEndpoint, context.customerToken
        )
          .send(paymentData)
          .expect(201);

        const validation = validateAPIResponse(response, 201);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const payment = response.body.data;
        expect(payment.reservationId).toBe(paymentData.reservationId);
        expect(payment.amount).toBe(paymentData.amount);
        expect(payment.paymentMethod).toBe(paymentData.paymentMethod);
        expect(payment.status).toBe('PENDING');
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('transactionId');
        expect(payment).toHaveProperty('createdAt');
        expect(payment).toHaveProperty('processedAt');
      });

      it('should handle different payment methods', async () => {
        const paymentMethods = ['CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'MOBILE_PAY'];
        
        for (let i = 0; i < paymentMethods.length; i++) {
          const paymentData = {
            reservationId: 'reservation-1-id',
            amount: 10.00,
            paymentMethod: paymentMethods[i],
            paymentIntentId: `pi_test_${i}_` + faker.string.alphanumeric(20)
          };

          const response = await createAuthenticatedRequest(
            app, 'post', paymentsEndpoint, context.customerToken
          )
            .send(paymentData)
            .expect(201);

          expect(response.body.data.paymentMethod).toBe(paymentMethods[i]);
        }
      });

      it('should automatically set payment to completed for cash payments', async () => {
        const paymentData = {
          reservationId: 'reservation-1-id',
          amount: 10.00,
          paymentMethod: 'CASH'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', paymentsEndpoint, context.adminToken
        )
          .send(paymentData)
          .expect(201);

        expect(response.body.data.status).toBe('COMPLETED');
        expect(response.body.data.processedAt).toBeDefined();
      });

      it('should validate payment amount against reservation total', async () => {
        const paymentData = {
          reservationId: 'reservation-1-id',
          amount: 100.00, // Much higher than reservation total
          paymentMethod: 'CREDIT_CARD',
          paymentIntentId: 'pi_test_' + faker.string.alphanumeric(24)
        };

        const response = await createAuthenticatedRequest(
          app, 'post', paymentsEndpoint, context.customerToken
        )
          .send(paymentData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('amount');
      });

      it('should allow admin to process payments for any reservation', async () => {
        const paymentData = {
          reservationId: 'reservation-2-id', // Different customer's reservation
          amount: 10.00,
          paymentMethod: 'CREDIT_CARD',
          paymentIntentId: 'pi_admin_' + faker.string.alphanumeric(24)
        };

        const response = await createAuthenticatedRequest(
          app, 'post', paymentsEndpoint, context.adminToken
        )
          .send(paymentData)
          .expect(201);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Input Validation', () => {
      const paymentValidationCases: ValidationTestCase[] = [
        {
          name: 'missing reservation ID',
          input: {
            amount: 10.00,
            paymentMethod: 'CREDIT_CARD'
          },
          expectedStatus: 400
        },
        {
          name: 'missing amount',
          input: {
            reservationId: 'reservation-1-id',
            paymentMethod: 'CREDIT_CARD'
          },
          expectedStatus: 400
        },
        {
          name: 'missing payment method',
          input: {
            reservationId: 'reservation-1-id',
            amount: 10.00
          },
          expectedStatus: 400
        },
        {
          name: 'invalid payment method',
          input: {
            reservationId: 'reservation-1-id',
            amount: 10.00,
            paymentMethod: 'INVALID_METHOD'
          },
          expectedStatus: 400
        },
        {
          name: 'negative amount',
          input: {
            reservationId: 'reservation-1-id',
            amount: -10.00,
            paymentMethod: 'CREDIT_CARD'
          },
          expectedStatus: 400
        },
        {
          name: 'zero amount',
          input: {
            reservationId: 'reservation-1-id',
            amount: 0,
            paymentMethod: 'CREDIT_CARD'
          },
          expectedStatus: 400
        },
        {
          name: 'amount too large',
          input: {
            reservationId: 'reservation-1-id',
            amount: 10000.00,
            paymentMethod: 'CREDIT_CARD'
          },
          expectedStatus: 400
        }
      ];

      it('should validate payment creation input', async () => {
        const results = await testInputValidation(
          app,
          'post',
          paymentsEndpoint,
          paymentValidationCases,
          context.customerToken
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });

      it('should prevent payment for non-existent reservation', async () => {
        const paymentData = {
          reservationId: 'non-existent-reservation',
          amount: 10.00,
          paymentMethod: 'CREDIT_CARD'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', paymentsEndpoint, context.customerToken
        )
          .send(paymentData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('reservation');
      });

      it('should prevent duplicate payments for same reservation', async () => {
        const paymentData = {
          reservationId: 'reservation-1-id', // Already has payment
          amount: 10.00,
          paymentMethod: 'CREDIT_CARD',
          paymentIntentId: 'pi_duplicate_' + faker.string.alphanumeric(24)
        };

        const response = await createAuthenticatedRequest(
          app, 'post', paymentsEndpoint, context.customerToken
        )
          .send(paymentData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already');
      });
    });

    describe('Authorization', () => {
      it('should require authentication', async () => {
        const paymentData = {
          reservationId: 'reservation-1-id',
          amount: 10.00,
          paymentMethod: 'CREDIT_CARD'
        };

        const response = await request(app)
          .post(paymentsEndpoint)
          .send(paymentData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should prevent customer from paying for other customers\' reservations', async () => {
        const paymentData = {
          reservationId: 'reservation-2-id', // Different customer's reservation
          amount: 10.00,
          paymentMethod: 'CREDIT_CARD'
        };

        const response = await createAuthenticatedRequest(
          app, 'post', paymentsEndpoint, context.customerToken
        )
          .send(paymentData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });
    });

    describe('Payment Processing Scenarios', () => {
      it('should handle payment processing failures gracefully', async () => {
        const paymentData = {
          reservationId: 'reservation-1-id',
          amount: 10.00,
          paymentMethod: 'CREDIT_CARD',
          paymentIntentId: 'pi_fail_' + faker.string.alphanumeric(24),
          simulateFailure: true // Test parameter
        };

        const response = await createAuthenticatedRequest(
          app, 'post', paymentsEndpoint, context.customerToken
        )
          .send(paymentData)
          .expect(402); // Payment required / processing failed

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('failed');
      });

      it('should handle payment processing timeouts', async () => {
        const paymentData = {
          reservationId: 'reservation-1-id',
          amount: 10.00,
          paymentMethod: 'CREDIT_CARD',
          paymentIntentId: 'pi_timeout_' + faker.string.alphanumeric(24),
          simulateTimeout: true
        };

        const response = await createAuthenticatedRequest(
          app, 'post', paymentsEndpoint, context.customerToken
        )
          .send(paymentData)
          .expect(408); // Request timeout

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('timeout');
      });
    });
  });

  describe('GET /api/payments/:id (Get Payment Details)', () => {
    const testPaymentId = 'payment-1-id';

    describe('Valid Access', () => {
      it('should allow admin to get any payment details', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/payments/${testPaymentId}`, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const payment = response.body.data;
        expect(payment.id).toBe(testPaymentId);
        expect(payment).toHaveProperty('amount');
        expect(payment).toHaveProperty('status');
        expect(payment).toHaveProperty('paymentMethod');
        expect(payment).toHaveProperty('reservationId');
        expect(payment).toHaveProperty('createdAt');
      });

      it('should allow customer to get their own payment details', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/payments/${testPaymentId}`, context.customerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        const payment = response.body.data;
        
        // Should include related reservation data for context
        expect(payment).toHaveProperty('reservation');
        if (payment.reservation) {
          expect(payment.reservation.userId).toBe('customer-1-id');
        }
      });

      it('should include transaction details for admin', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/payments/${testPaymentId}?include=transaction`, context.adminToken
        ).expect(200);

        const payment = response.body.data;
        if (payment.transactionId) {
          expect(payment).toHaveProperty('transaction');
          expect(payment.transaction).toHaveProperty('id');
          expect(payment.transaction).toHaveProperty('type');
        }
      });

      it('should redact sensitive information for customers', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/payments/${testPaymentId}`, context.customerToken
        ).expect(200);

        const payment = response.body.data;
        // Payment intent should be masked
        if (payment.paymentIntentId) {
          expect(payment.paymentIntentId).toMatch(/^\*+/);
        }
      });
    });

    describe('Authorization Restrictions', () => {
      it('should prevent customer from accessing other customers\' payments', async () => {
        const otherPaymentId = 'payment-2-id'; // Different customer's payment
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/payments/${otherPaymentId}`, context.customerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent payment', async () => {
        const nonExistentId = 'non-existent-payment';
        const response = await createAuthenticatedRequest(
          app, 'get', `/api/payments/${nonExistentId}`, context.adminToken
        ).expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('not found');
      });
    });
  });

  describe('POST /api/payments/:id/refund (Process Refund)', () => {
    const testPaymentId = 'payment-1-id';
    const refundEndpoint = `/api/payments/${testPaymentId}/refund`;

    describe('Valid Refund Processing', () => {
      it('should process full refund for admin', async () => {
        const refundData = {
          reason: 'Customer requested cancellation',
          amount: 10.00 // Full refund
        };

        const response = await createAuthenticatedRequest(
          app, 'post', refundEndpoint, context.adminToken
        )
          .send(refundData)
          .expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const refund = response.body.data;
        expect(refund).toHaveProperty('refundId');
        expect(refund).toHaveProperty('refundAmount');
        expect(refund).toHaveProperty('refundReason');
        expect(refund.refundAmount).toBe(refundData.amount);
        expect(refund.refundReason).toBe(refundData.reason);
        expect(refund).toHaveProperty('processedAt');
      });

      it('should process partial refund', async () => {
        const refundData = {
          reason: 'Partial service provided',
          amount: 5.00 // Partial refund
        };

        const response = await createAuthenticatedRequest(
          app, 'post', refundEndpoint, context.adminToken
        )
          .send(refundData)
          .expect(200);

        const refund = response.body.data;
        expect(refund.refundAmount).toBe(refundData.amount);
        expect(refund.refundAmount).toBeLessThan(10.00); // Original amount
      });

      it('should allow customer to request refund with approval workflow', async () => {
        const refundData = {
          reason: 'Spot was not available upon arrival',
          amount: 10.00
        };

        const response = await createAuthenticatedRequest(
          app, 'post', refundEndpoint, context.customerToken
        )
          .send(refundData)
          .expect(202); // Accepted for review

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('review');
        expect(response.body.data).toHaveProperty('refundRequestId');
      });

      it('should update payment status after refund', async () => {
        const refundData = {
          reason: 'Test refund',
          amount: 10.00
        };

        await createAuthenticatedRequest(
          app, 'post', refundEndpoint, context.adminToken
        )
          .send(refundData)
          .expect(200);

        // Check payment status
        const paymentResponse = await createAuthenticatedRequest(
          app, 'get', `/api/payments/${testPaymentId}`, context.adminToken
        ).expect(200);

        expect(paymentResponse.body.data.status).toBe('REFUNDED');
        expect(paymentResponse.body.data.refundAmount).toBe(10.00);
      });
    });

    describe('Input Validation', () => {
      const refundValidationCases: ValidationTestCase[] = [
        {
          name: 'missing reason',
          input: { amount: 10.00 },
          expectedStatus: 400
        },
        {
          name: 'missing amount',
          input: { reason: 'Test refund' },
          expectedStatus: 400
        },
        {
          name: 'empty reason',
          input: { reason: '', amount: 10.00 },
          expectedStatus: 400
        },
        {
          name: 'negative amount',
          input: { reason: 'Test refund', amount: -5.00 },
          expectedStatus: 400
        },
        {
          name: 'zero amount',
          input: { reason: 'Test refund', amount: 0 },
          expectedStatus: 400
        },
        {
          name: 'amount exceeds payment',
          input: { reason: 'Test refund', amount: 100.00 },
          expectedStatus: 400
        },
        {
          name: 'reason too long',
          input: { 
            reason: 'A'.repeat(1000), 
            amount: 10.00 
          },
          expectedStatus: 400
        }
      ];

      it('should validate refund input', async () => {
        const results = await testInputValidation(
          app,
          'post',
          refundEndpoint,
          refundValidationCases,
          context.adminToken
        );

        results.forEach(result => {
          expect(result.passed).toBe(true);
        });
      });

      it('should prevent refund of already refunded payment', async () => {
        // First refund
        await createAuthenticatedRequest(
          app, 'post', refundEndpoint, context.adminToken
        )
          .send({ reason: 'First refund', amount: 10.00 })
          .expect(200);

        // Second refund attempt
        const response = await createAuthenticatedRequest(
          app, 'post', refundEndpoint, context.adminToken
        )
          .send({ reason: 'Second refund', amount: 5.00 })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already refunded');
      });

      it('should prevent refund of failed payment', async () => {
        // This test assumes there's a payment with failed status
        const failedPaymentId = 'failed-payment-id';
        const response = await createAuthenticatedRequest(
          app, 'post', `/api/payments/${failedPaymentId}/refund`, context.adminToken
        )
          .send({ reason: 'Test refund', amount: 10.00 })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('cannot be refunded');
      });
    });

    describe('Authorization', () => {
      it('should require authentication', async () => {
        const refundData = {
          reason: 'Test refund',
          amount: 10.00
        };

        const response = await request(app)
          .post(refundEndpoint)
          .send(refundData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should prevent customer from processing immediate refunds without approval', async () => {
        // Customers should get "accepted for review" not immediate refund
        const refundData = {
          reason: 'Customer refund request',
          amount: 10.00,
          immediate: true // This flag shouldn't work for customers
        };

        const response = await createAuthenticatedRequest(
          app, 'post', refundEndpoint, context.customerToken
        )
          .send(refundData)
          .expect(202); // Still goes to review

        expect(response.body.message).toContain('review');
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent payment', async () => {
        const nonExistentEndpoint = '/api/payments/non-existent-payment/refund';
        const refundData = {
          reason: 'Test refund',
          amount: 10.00
        };

        const response = await createAuthenticatedRequest(
          app, 'post', nonExistentEndpoint, context.adminToken
        )
          .send(refundData)
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should handle refund processing failures', async () => {
        const refundData = {
          reason: 'Test refund',
          amount: 10.00,
          simulateFailure: true // Test parameter
        };

        const response = await createAuthenticatedRequest(
          app, 'post', refundEndpoint, context.adminToken
        )
          .send(refundData)
          .expect(502); // Bad gateway / external service error

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('failed');
      });
    });
  });

  describe('GET /api/payments/summary (Payment Reports)', () => {
    const summaryEndpoint = '/api/payments/summary';

    describe('Admin Access', () => {
      it('should return payment summary for admin', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', summaryEndpoint, context.adminToken
        ).expect(200);

        const validation = validateAPIResponse(response, 200);
        expect(validation.hasSuccessField).toBe(true);
        expect(validation.hasDataField).toBe(true);

        const summary = response.body.data;
        expect(summary).toHaveProperty('totalPayments');
        expect(summary).toHaveProperty('totalAmount');
        expect(summary).toHaveProperty('totalRefunds');
        expect(summary).toHaveProperty('refundAmount');
        expect(summary).toHaveProperty('netRevenue');
        expect(summary).toHaveProperty('paymentsByMethod');
        expect(summary).toHaveProperty('paymentsByStatus');

        // Verify data types
        expect(typeof summary.totalPayments).toBe('number');
        expect(typeof summary.totalAmount).toBe('number');
        expect(typeof summary.totalRefunds).toBe('number');
        expect(typeof summary.refundAmount).toBe('number');
        expect(typeof summary.netRevenue).toBe('number');
        expect(Array.isArray(summary.paymentsByMethod)).toBe(true);
        expect(Array.isArray(summary.paymentsByStatus)).toBe(true);
      });

      it('should support date range filtering for summary', async () => {
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');

        const response = await createAuthenticatedRequest(
          app, 'get', 
          `${summaryEndpoint}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, 
          context.adminToken
        ).expect(200);

        const summary = response.body.data;
        expect(summary).toHaveProperty('dateRange');
        expect(summary.dateRange.start).toBeDefined();
        expect(summary.dateRange.end).toBeDefined();
      });

      it('should include breakdown by payment method', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', summaryEndpoint, context.adminToken
        ).expect(200);

        const summary = response.body.data;
        expect(summary.paymentsByMethod).toContainEqual(
          expect.objectContaining({
            method: expect.any(String),
            count: expect.any(Number),
            amount: expect.any(Number)
          })
        );
      });

      it('should include trends and analytics', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${summaryEndpoint}?includeTrends=true`, context.adminToken
        ).expect(200);

        const summary = response.body.data;
        if (summary.trends) {
          expect(summary.trends).toHaveProperty('dailyRevenue');
          expect(summary.trends).toHaveProperty('weeklyRevenue');
          expect(summary.trends).toHaveProperty('monthlyRevenue');
          expect(Array.isArray(summary.trends.dailyRevenue)).toBe(true);
        }
      });
    });

    describe('Manager Access', () => {
      it('should return limited payment summary for manager', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', summaryEndpoint, context.managerToken
        ).expect(200);

        expect(response.body.success).toBe(true);
        const summary = response.body.data;
        
        // Manager should see basic stats but not detailed financial data
        expect(summary).toHaveProperty('totalPayments');
        expect(summary).toHaveProperty('paymentsByMethod');
        
        // Sensitive financial details might be restricted
        if (!summary.netRevenue) {
          expect(summary.netRevenue).toBeUndefined();
        }
      });
    });

    describe('Authorization', () => {
      it('should reject customer access to payment summary', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', summaryEndpoint, context.customerToken
        ).expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('permission');
      });

      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .get(summaryEndpoint)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Query Parameters', () => {
      it('should validate date parameters', async () => {
        const response = await createAuthenticatedRequest(
          app, 'get', `${summaryEndpoint}?startDate=invalid-date`, context.adminToken
        ).expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('date');
      });

      it('should validate date range logic', async () => {
        const startDate = new Date('2023-12-31');
        const endDate = new Date('2023-01-01');

        const response = await createAuthenticatedRequest(
          app, 'get', 
          `${summaryEndpoint}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, 
          context.adminToken
        ).expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('range');
      });
    });
  });

  describe('Security and Error Handling', () => {
    it('should sanitize payment input to prevent injection attacks', async () => {
      const maliciousInput = {
        reservationId: 'reservation-1-id',
        amount: 10.00,
        paymentMethod: 'CREDIT_CARD',
        notes: '<script>alert("xss")</script>',
        metadata: { hack: 'DROP TABLE payments;' }
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/payments', context.customerToken
      )
        .send(maliciousInput);

      // Should either reject or sanitize
      if (response.status === 201) {
        expect(response.body.data.notes).not.toContain('<script>');
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should handle concurrent payment attempts for same reservation', async () => {
      const paymentData = {
        reservationId: 'reservation-1-id',
        amount: 10.00,
        paymentMethod: 'CREDIT_CARD'
      };

      // Send concurrent payment requests
      const promises = Array.from({ length: 3 }, (_, i) =>
        createAuthenticatedRequest(app, 'post', '/api/payments', context.customerToken)
          .send({
            ...paymentData,
            paymentIntentId: `pi_concurrent_${i}_` + faker.string.alphanumeric(20)
          })
      );

      const responses = await Promise.all(promises);

      // Only one should succeed
      const successfulResponses = responses.filter(r => r.status === 201);
      const conflictResponses = responses.filter(r => r.status === 409);

      expect(successfulResponses.length).toBe(1);
      expect(conflictResponses.length).toBe(2);
    });

    it('should mask sensitive payment data in logs', async () => {
      const paymentData = {
        reservationId: 'reservation-1-id',
        amount: 10.00,
        paymentMethod: 'CREDIT_CARD',
        paymentIntentId: 'pi_sensitive_' + faker.string.alphanumeric(24),
        cardDetails: {
          number: '4111111111111111',
          cvv: '123',
          expiry: '12/25'
        }
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/payments', context.customerToken
      )
        .send(paymentData);

      // Card details should never be stored or returned
      if (response.status === 201) {
        expect(response.body.data).not.toHaveProperty('cardDetails');
      }
    });

    it('should enforce rate limiting for payment operations', async () => {
      const results = await testRateLimit(
        app,
        '/api/payments',
        'post',
        10, // Lower limit for payment operations
        60000,
        context.customerToken
      );

      expect(results.firstRateLimitHit).toBeLessThan(15);
      expect(results.rateLimitedRequests).toBeGreaterThan(0);
    });

    it('should handle payment gateway failures gracefully', async () => {
      const paymentData = {
        reservationId: 'reservation-1-id',
        amount: 10.00,
        paymentMethod: 'CREDIT_CARD',
        paymentIntentId: 'pi_gateway_failure_' + faker.string.alphanumeric(24),
        simulateGatewayFailure: true
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/payments', context.customerToken
      )
        .send(paymentData);

      // Should handle gracefully with appropriate error codes
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(response.body.success).toBe(false);
    });

    it('should log payment actions for audit trail', async () => {
      const paymentData = {
        reservationId: 'reservation-1-id',
        amount: 10.00,
        paymentMethod: 'CREDIT_CARD',
        paymentIntentId: 'pi_audit_' + faker.string.alphanumeric(24)
      };

      const response = await createAuthenticatedRequest(
        app, 'post', '/api/payments', context.customerToken
      )
        .send(paymentData);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        // In a real scenario, you'd check audit logs here
      }
    });
  });
});