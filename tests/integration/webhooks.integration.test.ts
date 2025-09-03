/**
 * Integration tests for webhook endpoints
 * Tests Stripe webhook signature verification and payment event processing
 */

import request from 'supertest';
import { app } from '../../src/server';
import { prisma } from '../../src/config/database';
import crypto from 'crypto';

// Mock StripePaymentGateway
jest.mock('../../src/services/StripePaymentGateway', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    verifyWebhookSignature: jest.fn(),
  })),
  StripePaymentGateway: jest.fn().mockImplementation(() => ({
    verifyWebhookSignature: jest.fn(),
  })),
}));

// Mock SecurityAuditService
jest.mock('../../src/services/SecurityAuditService', () => ({
  SecurityAuditService: jest.fn().mockImplementation(() => ({
    logSecurityEvent: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Webhook Integration Tests', () => {
  let mockStripeGateway: any;

  beforeAll(async () => {
    // Set required environment variables
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
  });

  beforeEach(async () => {
    // Clear database
    await prisma.payment.deleteMany();
    await prisma.parkingSession.deleteMany();

    // Reset mocks
    jest.clearAllMocks();

    // Get mock instance
    const StripePaymentGateway = require('../../src/services/StripePaymentGateway').StripePaymentGateway;
    mockStripeGateway = new StripePaymentGateway();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/webhooks/stripe', () => {
    it('should process payment_intent.succeeded webhook', async () => {
      const paymentIntentId = 'pi_test_succeeded_123';
      
      // Create a payment record that the webhook will update
      const payment = await prisma.payment.create({
        data: {
          amount: 25.50,
          currency: 'USD',
          paymentMethod: 'CREDIT_CARD',
          paymentType: 'PARKING',
          status: 'PENDING',
          transactionId: paymentIntentId,
          notes: `Stripe PaymentIntent: ${paymentIntentId}`,
        },
      });

      // Create a parking session
      const session = await prisma.parkingSession.create({
        data: {
          id: 'session_test_123',
          vehicleId: 'vehicle_test_123',
          spotId: 'spot_test_123',
          garageId: 'garage_test_123',
          startTime: new Date(),
          status: 'ACTIVE',
          isPaid: false,
        },
      });

      // Update payment to link to session
      await prisma.payment.update({
        where: { id: payment.id },
        data: { sessionId: session.id },
      });

      const webhookEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            amount: 2550, // In cents
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              sessionId: session.id,
              vehicleId: 'vehicle_test_123',
            },
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
      };

      // Mock successful signature verification
      mockStripeGateway.verifyWebhookSignature.mockReturnValue(webhookEvent);

      const payload = JSON.stringify(webhookEvent);
      const signature = 'test_signature_123';

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Webhook processed successfully',
        eventId: 'evt_test_123',
      });

      // Verify payment was updated
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });

      expect(updatedPayment?.status).toBe('COMPLETED');
      expect(updatedPayment?.processedAt).toBeTruthy();

      // Verify session was updated
      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: session.id },
      });

      expect(updatedSession?.isPaid).toBe(true);
      expect(updatedSession?.amountPaid).toBe(25.50);
      expect(updatedSession?.paymentTime).toBeTruthy();
    });

    it('should process payment_intent.payment_failed webhook', async () => {
      const paymentIntentId = 'pi_test_failed_123';
      
      const payment = await prisma.payment.create({
        data: {
          amount: 15.75,
          currency: 'USD',
          paymentMethod: 'CREDIT_CARD',
          paymentType: 'PARKING',
          status: 'PENDING',
          transactionId: paymentIntentId,
        },
      });

      const webhookEvent = {
        id: 'evt_test_456',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: paymentIntentId,
            amount: 1575,
            currency: 'usd',
            status: 'requires_payment_method',
            last_payment_error: {
              message: 'Your card was declined.',
              code: 'card_declined',
            },
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
      };

      mockStripeGateway.verifyWebhookSignature.mockReturnValue(webhookEvent);

      const payload = JSON.stringify(webhookEvent);
      const signature = 'test_signature_456';

      await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', signature)
        .send(payload)
        .expect(200);

      // Verify payment was updated
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });

      expect(updatedPayment?.status).toBe('FAILED');
      expect(updatedPayment?.failureReason).toBe('Your card was declined.');
      expect(updatedPayment?.processedAt).toBeTruthy();
    });

    it('should process charge.dispute.created webhook', async () => {
      const chargeId = 'ch_test_dispute_123';
      
      const payment = await prisma.payment.create({
        data: {
          amount: 50.00,
          currency: 'USD',
          paymentMethod: 'CREDIT_CARD',
          paymentType: 'PARKING',
          status: 'COMPLETED',
          transactionId: 'pi_test_123',
          gatewayResponse: JSON.stringify({ charge_id: chargeId }),
        },
      });

      const webhookEvent = {
        id: 'evt_test_dispute_123',
        type: 'charge.dispute.created',
        data: {
          object: {
            id: 'dp_test_123',
            charge: chargeId,
            amount: 5000,
            currency: 'usd',
            reason: 'fraudulent',
            status: 'warning_needs_response',
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
      };

      mockStripeGateway.verifyWebhookSignature.mockReturnValue(webhookEvent);

      const payload = JSON.stringify(webhookEvent);
      const signature = 'test_signature_dispute';

      await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', signature)
        .send(payload)
        .expect(200);

      // Verify payment was marked as disputed
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });

      expect(updatedPayment?.status).toBe('DISPUTED');
    });

    it('should handle unhandled webhook events gracefully', async () => {
      const webhookEvent = {
        id: 'evt_test_unhandled',
        type: 'customer.subscription.created', // Unhandled event type
        data: {
          object: {
            id: 'sub_test_123',
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
      };

      mockStripeGateway.verifyWebhookSignature.mockReturnValue(webhookEvent);

      const payload = JSON.stringify(webhookEvent);
      const signature = 'test_signature_unhandled';

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Webhook processed successfully');
    });

    it('should reject webhooks with invalid signatures', async () => {
      const webhookEvent = {
        id: 'evt_test_invalid',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_invalid' } },
      };

      // Mock signature verification failure
      mockStripeGateway.verifyWebhookSignature.mockImplementation(() => {
        throw new Error('Invalid webhook signature');
      });

      const payload = JSON.stringify(webhookEvent);
      const invalidSignature = 'invalid_signature';

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', invalidSignature)
        .send(payload)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid webhook signature',
      });
    });

    it('should reject webhooks without signatures', async () => {
      const webhookEvent = {
        id: 'evt_test_no_sig',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_no_sig' } },
      };

      const payload = JSON.stringify(webhookEvent);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send(payload)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Missing Stripe signature',
      });
    });

    it('should handle webhook processing errors gracefully', async () => {
      const webhookEvent = {
        id: 'evt_test_error',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_error',
            amount: 1000,
            currency: 'usd',
            status: 'succeeded',
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
      };

      mockStripeGateway.verifyWebhookSignature.mockReturnValue(webhookEvent);

      // Mock database error by using invalid data
      jest.spyOn(prisma.payment, 'findFirst').mockRejectedValue(new Error('Database connection failed'));

      const payload = JSON.stringify(webhookEvent);
      const signature = 'test_signature_error';

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', signature)
        .send(payload)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Webhook processing failed',
      });
    });

    it('should handle payment not found scenario', async () => {
      const paymentIntentId = 'pi_test_not_found';
      
      const webhookEvent = {
        id: 'evt_test_not_found',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            amount: 1000,
            currency: 'usd',
            status: 'succeeded',
            metadata: {},
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
      };

      mockStripeGateway.verifyWebhookSignature.mockReturnValue(webhookEvent);

      const payload = JSON.stringify(webhookEvent);
      const signature = 'test_signature_not_found';

      // Should still return success even if payment not found
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should process refund.created webhook', async () => {
      const webhookEvent = {
        id: 'evt_test_refund',
        type: 'refund.created',
        data: {
          object: {
            id: 'ref_test_123',
            payment_intent: 'pi_test_refund',
            amount: 500,
            currency: 'usd',
            reason: 'requested_by_customer',
            status: 'succeeded',
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
      };

      mockStripeGateway.verifyWebhookSignature.mockReturnValue(webhookEvent);

      const payload = JSON.stringify(webhookEvent);
      const signature = 'test_signature_refund';

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/webhooks/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/webhooks/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Webhook endpoints are healthy',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to webhook endpoints', async () => {
      const webhookEvent = {
        id: 'evt_rate_limit_test',
        type: 'ping',
        data: { object: {} },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
      };

      mockStripeGateway.verifyWebhookSignature.mockReturnValue(webhookEvent);

      const payload = JSON.stringify(webhookEvent);
      const signature = 'test_signature_rate_limit';

      // Make multiple requests quickly
      const requests = Array(102).fill(null).map(() =>
        request(app)
          .post('/api/webhooks/stripe')
          .set('Stripe-Signature', signature)
          .send(payload)
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000); // Increase timeout for this test
  });
});