/**
 * Integration tests for Stripe payment endpoints
 * Tests payment intent creation, confirmation, and Stripe integration
 */

import request from 'supertest';
import { app } from '../../src/server';
import { prisma } from '../../src/config/database';
import { generateTestToken } from '../helpers/auth-helper';

// Mock StripePaymentGateway
jest.mock('../../src/services/StripePaymentGateway', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    createPaymentIntent: jest.fn(),
    retrievePaymentIntent: jest.fn(),
    createCustomer: jest.fn(),
    attachPaymentMethod: jest.fn(),
    listCustomerPaymentMethods: jest.fn(),
    healthCheck: jest.fn(),
    calculateProcessingFees: jest.fn(),
  })),
  StripePaymentGateway: jest.fn().mockImplementation(() => ({
    createPaymentIntent: jest.fn(),
    retrievePaymentIntent: jest.fn(),
    createCustomer: jest.fn(),
    attachPaymentMethod: jest.fn(),
    listCustomerPaymentMethods: jest.fn(),
    healthCheck: jest.fn(),
    calculateProcessingFees: jest.fn(),
  })),
}));

// Mock SecurityAuditService
jest.mock('../../src/services/SecurityAuditService', () => ({
  SecurityAuditService: jest.fn().mockImplementation(() => ({
    logSecurityEvent: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Stripe Payment Integration Tests', () => {
  let authToken: string;
  let adminToken: string;
  let mockStripeGateway: any;

  beforeAll(async () => {
    // Set required environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

    // Generate test tokens
    authToken = generateTestToken({ 
      id: 'user_test_123', 
      email: 'test@example.com',
      role: 'USER' 
    });
    
    adminToken = generateTestToken({ 
      id: 'admin_test_123', 
      email: 'admin@example.com',
      role: 'ADMIN' 
    });
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

  describe('POST /api/payments/intent', () => {
    it('should create payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_intent_123',
        clientSecret: 'pi_test_intent_123_secret_abc123',
        amount: 25.50,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      mockStripeGateway.createPaymentIntent.mockResolvedValue(mockPaymentIntent);
      mockStripeGateway.calculateProcessingFees.mockReturnValue({
        feeAmount: 1.04,
        netAmount: 24.46,
      });

      const requestBody = {
        amount: 25.50,
        currency: 'USD',
        description: 'Test parking payment',
        customerData: {
          email: 'test@example.com',
          name: 'Test User',
        },
        sessionId: 'session_test_123',
        vehicleId: 'vehicle_test_123',
      };

      const response = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          clientSecret: 'pi_test_intent_123_secret_abc123',
          paymentIntentId: 'pi_test_intent_123',
          amount: 25.50,
        },
        message: 'Payment intent created successfully',
      });

      // Verify payment record was created
      const payment = await prisma.payment.findFirst({
        where: { transactionId: 'pi_test_intent_123' },
      });

      expect(payment).toBeTruthy();
      expect(payment?.amount).toBe(25.50);
      expect(payment?.status).toBe('PENDING');
      expect(payment?.sessionId).toBe('session_test_123');

      // Verify Stripe service was called correctly
      expect(mockStripeGateway.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 25.50,
          currency: 'USD',
          description: 'Test parking payment',
          confirmationMethod: 'manual',
          metadata: expect.objectContaining({
            sessionId: 'session_test_123',
            vehicleId: 'vehicle_test_123',
            userId: 'user_test_123',
          }),
        }),
        expect.any(String) // Idempotency key
      );
    });

    it('should validate payment amount', async () => {
      const requestBody = {
        amount: 0, // Invalid amount
        currency: 'USD',
      };

      const response = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Payment amount must be greater than zero',
      });
    });

    it('should handle Stripe errors', async () => {
      mockStripeGateway.createPaymentIntent.mockRejectedValue(
        new Error('Your card was declined. Please try a different payment method.')
      );

      const requestBody = {
        amount: 25.50,
        currency: 'USD',
      };

      const response = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Your card was declined. Please try a different payment method.',
      });
    });

    it('should require authentication', async () => {
      const requestBody = {
        amount: 25.50,
        currency: 'USD',
      };

      const response = await request(app)
        .post('/api/payments/intent')
        .send(requestBody)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle customer creation failure gracefully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_intent_456',
        clientSecret: 'pi_test_intent_456_secret_def456',
        amount: 10.00,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      mockStripeGateway.createCustomer.mockRejectedValue(new Error('Customer creation failed'));
      mockStripeGateway.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const requestBody = {
        amount: 10.00,
        currency: 'USD',
        customerData: {
          email: 'test@example.com',
        },
      };

      const response = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Should proceed with payment intent creation even if customer creation fails
      expect(mockStripeGateway.createPaymentIntent).toHaveBeenCalled();
    });
  });

  describe('POST /api/payments/confirm/:paymentIntentId', () => {
    it('should confirm payment intent successfully', async () => {
      const paymentIntentId = 'pi_test_confirm_123';

      // Create a pending payment record
      await prisma.payment.create({
        data: {
          amount: 15.75,
          currency: 'USD',
          paymentMethod: 'CREDIT_CARD',
          paymentType: 'PARKING',
          status: 'PENDING',
          transactionId: paymentIntentId,
        },
      });

      const mockPaymentIntent = {
        id: paymentIntentId,
        status: 'succeeded',
        amount: 1575,
        currency: 'usd',
        clientSecret: 'pi_test_confirm_123_secret',
      };

      mockStripeGateway.retrievePaymentIntent.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post(`/api/payments/confirm/${paymentIntentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          success: true,
          transactionId: paymentIntentId,
          status: 'COMPLETED',
          amount: 15.75,
          message: 'Payment completed successfully',
        }),
        message: 'Payment completed successfully',
      });

      // Verify payment was updated
      const updatedPayment = await prisma.payment.findFirst({
        where: { transactionId: paymentIntentId },
      });

      expect(updatedPayment?.status).toBe('COMPLETED');
      expect(updatedPayment?.processedAt).toBeTruthy();
    });

    it('should handle payment intent requiring action', async () => {
      const paymentIntentId = 'pi_test_requires_action';

      await prisma.payment.create({
        data: {
          amount: 20.00,
          currency: 'USD',
          paymentMethod: 'CREDIT_CARD',
          paymentType: 'PARKING',
          status: 'PENDING',
          transactionId: paymentIntentId,
        },
      });

      const mockPaymentIntent = {
        id: paymentIntentId,
        status: 'requires_action',
        amount: 2000,
        currency: 'usd',
      };

      mockStripeGateway.retrievePaymentIntent.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post(`/api/payments/confirm/${paymentIntentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.success).toBe(false);
      expect(response.body.data.status).toBe('PENDING');

      const updatedPayment = await prisma.payment.findFirst({
        where: { transactionId: paymentIntentId },
      });

      expect(updatedPayment?.status).toBe('PENDING');
    });

    it('should handle failed payment intent', async () => {
      const paymentIntentId = 'pi_test_failed_confirm';

      await prisma.payment.create({
        data: {
          amount: 30.00,
          currency: 'USD',
          paymentMethod: 'CREDIT_CARD',
          paymentType: 'PARKING',
          status: 'PENDING',
          transactionId: paymentIntentId,
        },
      });

      const mockPaymentIntent = {
        id: paymentIntentId,
        status: 'payment_failed',
        amount: 3000,
        currency: 'usd',
      };

      mockStripeGateway.retrievePaymentIntent.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post(`/api/payments/confirm/${paymentIntentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.success).toBe(false);
      expect(response.body.data.status).toBe('FAILED');

      const updatedPayment = await prisma.payment.findFirst({
        where: { transactionId: paymentIntentId },
      });

      expect(updatedPayment?.status).toBe('FAILED');
      expect(updatedPayment?.failureReason).toBe('Payment failed');
    });

    it('should return error for non-existent payment', async () => {
      const paymentIntentId = 'pi_test_nonexistent';

      mockStripeGateway.retrievePaymentIntent.mockResolvedValue({
        id: paymentIntentId,
        status: 'succeeded',
      });

      const response = await request(app)
        .post(`/api/payments/confirm/${paymentIntentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Payment not found or already processed');
    });

    it('should validate payment intent ID', async () => {
      const response = await request(app)
        .post('/api/payments/confirm/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // Route not found

      // Or test with empty ID
      const response2 = await request(app)
        .post('/api/payments/confirm/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should update parking session when payment completed', async () => {
      const paymentIntentId = 'pi_test_session_update';
      
      // Create session
      const session = await prisma.parkingSession.create({
        data: {
          id: 'session_update_test',
          vehicleId: 'vehicle_test_123',
          spotId: 'spot_test_123',
          garageId: 'garage_test_123',
          startTime: new Date(),
          status: 'ACTIVE',
          isPaid: false,
        },
      });

      // Create payment linked to session
      await prisma.payment.create({
        data: {
          amount: 12.50,
          currency: 'USD',
          paymentMethod: 'CREDIT_CARD',
          paymentType: 'PARKING',
          status: 'PENDING',
          transactionId: paymentIntentId,
          sessionId: session.id,
        },
      });

      const mockPaymentIntent = {
        id: paymentIntentId,
        status: 'succeeded',
        amount: 1250,
        currency: 'usd',
      };

      mockStripeGateway.retrievePaymentIntent.mockResolvedValue(mockPaymentIntent);

      await request(app)
        .post(`/api/payments/confirm/${paymentIntentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify session was updated
      const updatedSession = await prisma.parkingSession.findUnique({
        where: { id: session.id },
      });

      expect(updatedSession?.isPaid).toBe(true);
      expect(updatedSession?.amountPaid).toBe(12.50);
      expect(updatedSession?.paymentTime).toBeTruthy();
    });
  });

  describe('GET /api/payments/health', () => {
    it('should return payment gateway health status for admin', async () => {
      mockStripeGateway.healthCheck.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/payments/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          stripe: true,
          overall: true,
        },
        message: 'Payment gateway health check completed',
      });

      expect(mockStripeGateway.healthCheck).toHaveBeenCalled();
    });

    it('should return unhealthy status when Stripe is down', async () => {
      mockStripeGateway.healthCheck.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/payments/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toEqual({
        stripe: false,
        overall: false,
      });
    });

    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/payments/health')
        .set('Authorization', `Bearer ${authToken}`) // Regular user token
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should handle health check errors', async () => {
      mockStripeGateway.healthCheck.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .get('/api/payments/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Health check failed',
        data: {
          stripe: false,
          overall: false,
        },
      });
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to payment intent creation', async () => {
      mockStripeGateway.createPaymentIntent.mockResolvedValue({
        id: 'pi_rate_limit_test',
        clientSecret: 'secret',
        amount: 10.00,
      });

      const requestBody = {
        amount: 10.00,
        currency: 'USD',
      };

      // Make multiple requests quickly (more than the limit of 10 in 15 minutes)
      const requests = Array(12).fill(null).map(() =>
        request(app)
          .post('/api/payments/intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send(requestBody)
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000); // Increase timeout for this test

    it('should apply rate limiting to payment confirmation', async () => {
      // Create multiple payment records
      const paymentIds = [];
      for (let i = 0; i < 12; i++) {
        const payment = await prisma.payment.create({
          data: {
            amount: 10.00,
            currency: 'USD',
            paymentMethod: 'CREDIT_CARD',
            paymentType: 'PARKING',
            status: 'PENDING',
            transactionId: `pi_rate_limit_confirm_${i}`,
          },
        });
        paymentIds.push(payment.transactionId);
      }

      mockStripeGateway.retrievePaymentIntent.mockResolvedValue({
        id: 'pi_test',
        status: 'succeeded',
        amount: 1000,
      });

      // Make multiple confirmation requests
      const requests = paymentIds.map(id =>
        request(app)
          .post(`/api/payments/confirm/${id}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 15000); // Increase timeout for this test
  });

  describe('Error scenarios', () => {
    it('should handle Stripe service unavailable', async () => {
      mockStripeGateway.createPaymentIntent.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      const requestBody = {
        amount: 25.50,
        currency: 'USD',
      };

      const response = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Service temporarily unavailable');
    });

    it('should handle database errors during payment creation', async () => {
      mockStripeGateway.createPaymentIntent.mockResolvedValue({
        id: 'pi_test_db_error',
        clientSecret: 'secret',
        amount: 10.00,
      });

      // Mock database error
      jest.spyOn(prisma.payment, 'create').mockRejectedValue(
        new Error('Database connection failed')
      );

      const requestBody = {
        amount: 10.00,
        currency: 'USD',
      };

      const response = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});