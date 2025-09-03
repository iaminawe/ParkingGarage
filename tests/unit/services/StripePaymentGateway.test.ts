/**
 * Unit tests for StripePaymentGateway service
 * Tests payment intent creation, refunds, customer management, and webhook verification
 */

import { StripePaymentGateway } from '../../../src/services/StripePaymentGateway';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

// Mock SecurityAuditService
jest.mock('../../../src/services/SecurityAuditService', () => ({
  SecurityAuditService: jest.fn().mockImplementation(() => ({
    logSecurityEvent: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  }),
}));

describe('StripePaymentGateway', () => {
  let stripeGateway: StripePaymentGateway;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    // Set required environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    process.env.PAYMENT_CURRENCY = 'USD';
    process.env.PAYMENT_PROCESSING_FEE_PERCENTAGE = '2.9';
    process.env.PAYMENT_PROCESSING_FEE_FIXED = '30';

    // Create mock Stripe instance
    mockStripe = {
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn(),
        confirm: jest.fn(),
        cancel: jest.fn(),
      },
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
      paymentMethods: {
        attach: jest.fn(),
        detach: jest.fn(),
        list: jest.fn(),
      },
      refunds: {
        create: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
      accounts: {
        retrieve: jest.fn(),
      },
    } as any;

    // Mock Stripe constructor
    (Stripe as jest.MockedClass<typeof Stripe>).mockReturnValue(mockStripe);

    stripeGateway = new StripePaymentGateway();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  describe('constructor', () => {
    it('should throw error if STRIPE_SECRET_KEY is not provided', () => {
      delete process.env.STRIPE_SECRET_KEY;
      expect(() => new StripePaymentGateway()).toThrow('STRIPE_SECRET_KEY environment variable is required');
    });

    it('should initialize with correct Stripe configuration', () => {
      expect(Stripe).toHaveBeenCalledWith('sk_test_123', expect.objectContaining({
        apiVersion: '2024-12-18.acacia',
        typescript: true,
        telemetry: false,
      }));
    });
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test_123_secret',
        payment_method: null,
        customer: null,
        metadata: {},
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any);

      const request = {
        amount: 10.00,
        currency: 'USD',
        description: 'Test payment',
        metadata: { test: 'data' },
      };

      const result = await stripeGateway.createPaymentIntent(request);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000, // Converted to cents
          currency: 'USD',
          description: 'Test payment',
          metadata: expect.objectContaining({
            test: 'data',
            created_by_system: 'parking-garage-api',
          }),
          capture_method: 'automatic',
          confirmation_method: 'automatic',
        }),
        {}
      );

      expect(result).toEqual({
        id: 'pi_test_123',
        amount: 10.00, // Converted back to dollars
        currency: 'usd',
        status: 'requires_payment_method',
        clientSecret: 'pi_test_123_secret',
        paymentMethodId: null,
        customerId: null,
        metadata: {},
      });
    });

    it('should create payment intent with idempotency key', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test_123_secret',
        metadata: {},
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any);

      const request = {
        amount: 10.00,
        currency: 'USD',
        description: 'Test payment',
      };

      await stripeGateway.createPaymentIntent(request, 'test_idempotency_key');

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.any(Object),
        { idempotencyKey: 'test_idempotency_key' }
      );
    });

    it('should handle Stripe errors', async () => {
      const stripeError = new Error('Card declined') as any;
      stripeError.code = 'card_declined';
      stripeError.type = 'card_error';
      stripeError.statusCode = 402;

      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      const request = {
        amount: 10.00,
        currency: 'USD',
        description: 'Test payment',
      };

      await expect(stripeGateway.createPaymentIntent(request)).rejects.toThrow(
        'Your card was declined. Please try a different payment method.'
      );
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should confirm payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        client_secret: 'pi_test_123_secret',
        metadata: {},
      };

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent as any);

      const result = await stripeGateway.confirmPaymentIntent('pi_test_123', 'pm_test_card');

      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test_123', {
        payment_method: 'pm_test_card',
      });

      expect(result.status).toBe('succeeded');
    });
  });

  describe('createCustomer', () => {
    it('should create customer successfully', async () => {
      const mockCustomer = {
        id: 'cus_test_123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        metadata: {},
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer as any);

      const request = {
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        metadata: { test: 'data' },
      };

      const result = await stripeGateway.createCustomer(request);

      expect(mockStripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User',
          phone: '+1234567890',
          metadata: expect.objectContaining({
            test: 'data',
            created_by_system: 'parking-garage-api',
          }),
        }),
        {}
      );

      expect(result).toEqual({
        id: 'cus_test_123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        metadata: {},
      });
    });
  });

  describe('attachPaymentMethod', () => {
    it('should attach payment method to customer successfully', async () => {
      const mockPaymentMethod = {
        id: 'pm_test_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
        },
        customer: 'cus_test_123',
      };

      mockStripe.paymentMethods.attach.mockResolvedValue(mockPaymentMethod as any);

      const request = {
        paymentMethodId: 'pm_test_123',
        customerId: 'cus_test_123',
      };

      const result = await stripeGateway.attachPaymentMethod(request);

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_test_123', {
        customer: 'cus_test_123',
      });

      expect(result).toEqual({
        id: 'pm_test_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025,
        },
        customerId: 'cus_test_123',
      });
    });
  });

  describe('createRefund', () => {
    it('should create refund successfully', async () => {
      const mockRefund = {
        id: 'ref_test_123',
        amount: 500,
        currency: 'usd',
        payment_intent: 'pi_test_123',
        status: 'succeeded',
        reason: 'requested_by_customer',
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund as any);

      const request = {
        paymentIntentId: 'pi_test_123',
        amount: 5.00,
        reason: 'requested_by_customer' as const,
        metadata: { test: 'data' },
      };

      const result = await stripeGateway.createRefund(request);

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: 'pi_test_123',
          amount: 500, // Converted to cents
          reason: 'requested_by_customer',
          metadata: expect.objectContaining({
            test: 'data',
            created_by_system: 'parking-garage-api',
          }),
        }),
        {}
      );

      expect(result).toEqual({
        id: 'ref_test_123',
        amount: 5.00, // Converted back to dollars
        currency: 'usd',
        paymentIntentId: 'pi_test_123',
        status: 'succeeded',
        reason: 'requested_by_customer',
      });
    });

    it('should create partial refund', async () => {
      const mockRefund = {
        id: 'ref_test_123',
        amount: 250,
        currency: 'usd',
        payment_intent: 'pi_test_123',
        status: 'succeeded',
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund as any);

      const request = {
        paymentIntentId: 'pi_test_123',
        amount: 2.50, // Partial refund
      };

      const result = await stripeGateway.createRefund(request);

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 250, // Converted to cents
        }),
        {}
      );

      expect(result.amount).toBe(2.50);
    });
  });

  describe('calculateProcessingFees', () => {
    it('should calculate processing fees correctly', () => {
      const result = stripeGateway.calculateProcessingFees(100.00);

      // 100 * 0.029 + 0.30 = 2.90 + 0.30 = 3.20
      expect(result.feeAmount).toBe(3.20);
      expect(result.netAmount).toBe(96.80);
    });

    it('should handle small amounts correctly', () => {
      const result = stripeGateway.calculateProcessingFees(1.00);

      // 1 * 0.029 + 0.30 = 0.029 + 0.30 = 0.329, rounded to 0.33
      expect(result.feeAmount).toBe(0.33);
      expect(result.netAmount).toBe(0.67);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify webhook signature successfully', () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
        created: Date.now(),
        livemode: false,
        pending_webhooks: 1,
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const payload = JSON.stringify(mockEvent);
      const signature = 'test_signature';

      const result = stripeGateway.verifyWebhookSignature(payload, signature);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_123'
      );

      expect(result).toEqual(mockEvent);
    });

    it('should throw error for invalid signature', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const payload = '{"test": "data"}';
      const signature = 'invalid_signature';

      expect(() => stripeGateway.verifyWebhookSignature(payload, signature)).toThrow(
        'Invalid webhook signature'
      );
    });

    it('should throw error when webhook secret is not configured', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const newGateway = new StripePaymentGateway();

      const payload = '{"test": "data"}';
      const signature = 'test_signature';

      expect(() => newGateway.verifyWebhookSignature(payload, signature)).toThrow(
        'Webhook secret not configured'
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when Stripe is healthy', async () => {
      mockStripe.accounts.retrieve.mockResolvedValue({} as any);

      const result = await stripeGateway.healthCheck();

      expect(result).toBe(true);
      expect(mockStripe.accounts.retrieve).toHaveBeenCalled();
    });

    it('should return false when Stripe is unhealthy', async () => {
      mockStripe.accounts.retrieve.mockRejectedValue(new Error('Connection failed'));

      const result = await stripeGateway.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should map common Stripe error codes to user-friendly messages', async () => {
      const testCases = [
        { code: 'card_declined', expected: 'Your card was declined. Please try a different payment method.' },
        { code: 'expired_card', expected: 'Your card has expired. Please use a different payment method.' },
        { code: 'insufficient_funds', expected: 'Your card has insufficient funds.' },
        { code: 'invalid_cvc', expected: 'Your card security code is invalid.' },
      ];

      for (const testCase of testCases) {
        const stripeError = new Error('Stripe error') as any;
        stripeError.code = testCase.code;
        stripeError.type = 'card_error';

        mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

        const request = { amount: 10.00, currency: 'USD' };

        await expect(stripeGateway.createPaymentIntent(request)).rejects.toThrow(testCase.expected);
      }
    });
  });
});