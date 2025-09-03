/**
 * Stripe Payment Gateway Integration
 * Production-ready Stripe payment processing with webhooks, tokenization, and security
 */

import Stripe from 'stripe';
import { createHmac, timingSafeEqual } from 'crypto';
import { SecurityAuditService } from './SecurityAuditService';
import { createLogger } from '../utils/logger';
import { ILogger } from '../utils/logger';

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
  paymentMethodId?: string;
  customerId?: string;
  metadata: Record<string, any>;
  receiptEmail?: string;
}

export interface StripeCustomer {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata: Record<string, any>;
}

export interface StripePaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  customerId?: string;
}

export interface StripeRefund {
  id: string;
  amount: number;
  currency: string;
  paymentIntentId: string;
  status: string;
  reason?: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id?: string;
    idempotency_key?: string;
  };
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  paymentMethodId?: string;
  customerId?: string;
  receiptEmail?: string;
  description?: string;
  metadata?: Record<string, any>;
  applicationFeeAmount?: number;
  transferData?: {
    destination: string;
  };
  captureMethod?: 'automatic' | 'manual';
  confirmationMethod?: 'automatic' | 'manual';
  setupFutureUsage?: 'on_session' | 'off_session';
}

export interface CreateCustomerRequest {
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, any>;
  paymentMethod?: string;
  invoiceSettings?: {
    defaultPaymentMethod?: string;
  };
}

export interface AttachPaymentMethodRequest {
  paymentMethodId: string;
  customerId: string;
}

export interface CreateRefundRequest {
  paymentIntentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, any>;
  refundApplicationFee?: boolean;
  reverseTransfer?: boolean;
}

/**
 * Production-ready Stripe payment gateway service
 */
export class StripePaymentGateway {
  private stripe: Stripe | null;
  private logger: ILogger;
  private auditService: SecurityAuditService;
  private webhookSecret: string;
  private readonly defaultCurrency: string;
  private readonly feePercentage: number;
  private readonly feeFixed: number;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly idempotencyTTL: number;
  private readonly isEnabled: boolean;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    this.isEnabled = !!secretKey;
    
    if (this.isEnabled && secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: process.env.STRIPE_API_VERSION as any || '2024-12-18.acacia',
        typescript: true,
        timeout: parseInt(process.env.PAYMENT_TIMEOUT_SECONDS || '300') * 1000,
        maxNetworkRetries: parseInt(process.env.PAYMENT_RETRY_ATTEMPTS || '3'),
        telemetry: false, // Disable telemetry for privacy
      });
    } else {
      this.stripe = null;
    }

    this.logger = createLogger('StripePaymentGateway');
    this.auditService = new SecurityAuditService();
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    this.defaultCurrency = process.env.PAYMENT_CURRENCY || 'USD';
    this.feePercentage = parseFloat(process.env.PAYMENT_PROCESSING_FEE_PERCENTAGE || '2.9');
    this.feeFixed = parseInt(process.env.PAYMENT_PROCESSING_FEE_FIXED || '30');
    this.timeout = parseInt(process.env.PAYMENT_TIMEOUT_SECONDS || '300');
    this.retryAttempts = parseInt(process.env.PAYMENT_RETRY_ATTEMPTS || '3');
    this.idempotencyTTL = parseInt(process.env.PAYMENT_IDEMPOTENCY_TTL || '86400');
    
    if (!this.isEnabled) {
      this.logger.warn('Stripe is disabled - STRIPE_SECRET_KEY not configured');
    }
  }

  /**
   * Check if Stripe is enabled
   */
  public isStripeEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Ensure Stripe is configured before making API calls
   */
  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(request: CreatePaymentIntentRequest, idempotencyKey?: string): Promise<StripePaymentIntent> {
    this.ensureStripeConfigured();
    
    try {
      const requestOptions: Stripe.RequestOptions = {};
      if (idempotencyKey) {
        requestOptions.idempotencyKey = idempotencyKey;
      }

      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency || this.defaultCurrency,
        description: request.description,
        receipt_email: request.receiptEmail,
        metadata: {
          ...request.metadata,
          created_by_system: 'parking-garage-api',
          timestamp: new Date().toISOString(),
        },
        capture_method: request.captureMethod || 'automatic',
        confirmation_method: request.confirmationMethod || 'automatic',
        setup_future_usage: request.setupFutureUsage,
      };

      if (request.paymentMethodId) {
        paymentIntentParams.payment_method = request.paymentMethodId;
        paymentIntentParams.confirm = true;
      }

      if (request.customerId) {
        paymentIntentParams.customer = request.customerId;
      }

      if (request.applicationFeeAmount) {
        paymentIntentParams.application_fee_amount = Math.round(request.applicationFeeAmount * 100);
      }

      if (request.transferData) {
        paymentIntentParams.transfer_data = {
          destination: request.transferData.destination,
        };
      }

      const paymentIntent = await this.stripe!.paymentIntents.create(
        paymentIntentParams,
        requestOptions
      );

      await this.auditService.logSecurityEvent({
        action: 'PAYMENT_INTENT_CREATED',
        category: 'PAYMENT',
        severity: 'LOW',
        description: `Payment intent created: ${paymentIntent.id}`,
        metadata: {
          paymentIntentId: paymentIntent.id,
          amount: request.amount,
          currency: request.currency || this.defaultCurrency,
          customerId: request.customerId,
        },
      });

      this.logger.info('Payment intent created successfully', {
        paymentIntentId: paymentIntent.id,
        amount: request.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret!,
        paymentMethodId: paymentIntent.payment_method as string,
        customerId: paymentIntent.customer as string,
        metadata: paymentIntent.metadata,
        receiptEmail: paymentIntent.receipt_email,
      };
    } catch (error) {
      await this.auditService.logSecurityEvent({
        action: 'PAYMENT_INTENT_CREATION_FAILED',
        category: 'PAYMENT',
        severity: 'HIGH',
        description: `Payment intent creation failed: ${(error as Error).message}`,
        metadata: { request, error: (error as Error).message },
      });

      this.logger.error('Failed to create payment intent', error as Error, { request });
      throw this.handleStripeError(error as Stripe.StripeError);
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
    returnUrl?: string
  ): Promise<StripePaymentIntent> {
    this.ensureStripeConfigured();
    
    try {
      const params: Stripe.PaymentIntentConfirmParams = {};
      
      if (paymentMethodId) {
        params.payment_method = paymentMethodId;
      }
      
      if (returnUrl) {
        params.return_url = returnUrl;
      }

      const paymentIntent = await this.stripe!.paymentIntents.confirm(paymentIntentId, params);

      await this.auditService.logSecurityEvent({
        action: 'PAYMENT_INTENT_CONFIRMED',
        category: 'PAYMENT',
        severity: 'MEDIUM',
        description: `Payment intent confirmed: ${paymentIntentId}`,
        metadata: {
          paymentIntentId,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
        },
      });

      this.logger.info('Payment intent confirmed successfully', {
        paymentIntentId,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret!,
        paymentMethodId: paymentIntent.payment_method as string,
        customerId: paymentIntent.customer as string,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      await this.auditService.logSecurityEvent({
        action: 'PAYMENT_INTENT_CONFIRMATION_FAILED',
        category: 'PAYMENT',
        severity: 'HIGH',
        description: `Payment intent confirmation failed: ${(error as Error).message}`,
        metadata: { paymentIntentId, error: (error as Error).message },
      });

      this.logger.error('Failed to confirm payment intent', error as Error, { paymentIntentId });
      throw this.handleStripeError(error as Stripe.StripeError);
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
    this.ensureStripeConfigured();
    
    try {
      const paymentIntent = await this.stripe!.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret!,
        paymentMethodId: paymentIntent.payment_method as string,
        customerId: paymentIntent.customer as string,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve payment intent', error as Error, { paymentIntentId });
      throw this.handleStripeError(error as Stripe.StripeError);
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(
    paymentIntentId: string,
    cancellationReason?: string
  ): Promise<StripePaymentIntent> {
    this.ensureStripeConfigured();
    
    try {
      const params: Stripe.PaymentIntentCancelParams = {};
      if (cancellationReason) {
        params.cancellation_reason = cancellationReason as any;
      }

      const paymentIntent = await this.stripe!.paymentIntents.cancel(paymentIntentId, params);

      await this.auditService.logSecurityEvent({
        action: 'PAYMENT_INTENT_CANCELLED',
        category: 'PAYMENT',
        severity: 'MEDIUM',
        description: `Payment intent cancelled: ${paymentIntentId}`,
        metadata: {
          paymentIntentId,
          cancellationReason,
        },
      });

      this.logger.info('Payment intent cancelled successfully', {
        paymentIntentId,
        cancellationReason,
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret!,
        paymentMethodId: paymentIntent.payment_method as string,
        customerId: paymentIntent.customer as string,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      this.logger.error('Failed to cancel payment intent', error as Error, { paymentIntentId });
      throw this.handleStripeError(error as Stripe.StripeError);
    }
  }

  /**
   * Create a customer
   */
  async createCustomer(request: CreateCustomerRequest, idempotencyKey?: string): Promise<StripeCustomer> {
    this.ensureStripeConfigured();
    
    try {
      const requestOptions: Stripe.RequestOptions = {};
      if (idempotencyKey) {
        requestOptions.idempotencyKey = idempotencyKey;
      }

      const customerParams: Stripe.CustomerCreateParams = {
        email: request.email,
        name: request.name,
        phone: request.phone,
        description: request.description,
        metadata: {
          ...request.metadata,
          created_by_system: 'parking-garage-api',
          timestamp: new Date().toISOString(),
        },
      };

      if (request.paymentMethod) {
        customerParams.payment_method = request.paymentMethod;
      }

      if (request.invoiceSettings) {
        customerParams.invoice_settings = request.invoiceSettings;
      }

      const customer = await this.stripe!.customers.create(customerParams, requestOptions);

      await this.auditService.logSecurityEvent({
        action: 'CUSTOMER_CREATED',
        category: 'PAYMENT',
        severity: 'LOW',
        description: `Stripe customer created: ${customer.id}`,
        metadata: {
          customerId: customer.id,
          email: request.email,
        },
      });

      this.logger.info('Customer created successfully', {
        customerId: customer.id,
        email: request.email,
      });

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        metadata: customer.metadata,
      };
    } catch (error) {
      await this.auditService.logSecurityEvent({
        action: 'CUSTOMER_CREATION_FAILED',
        category: 'PAYMENT',
        severity: 'HIGH',
        description: `Customer creation failed: ${(error as Error).message}`,
        metadata: { request, error: (error as Error).message },
      });

      this.logger.error('Failed to create customer', error as Error, { request });
      throw this.handleStripeError(error as Stripe.StripeError);
    }
  }

  /**
   * Retrieve a customer
   */
  async retrieveCustomer(customerId: string): Promise<StripeCustomer> {
    this.ensureStripeConfigured();
    
    try {
      const customer = await this.stripe!.customers.retrieve(customerId);
      
      if (customer.deleted) {
        throw new Error('Customer has been deleted');
      }

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        metadata: customer.metadata,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve customer', error as Error, { customerId });
      throw this.handleStripeError(error as Stripe.StripeError);
    }
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(request: AttachPaymentMethodRequest): Promise<StripePaymentMethod> {
    this.ensureStripeConfigured();
    
    try {
      const paymentMethod = await this.stripe!.paymentMethods.attach(request.paymentMethodId, {
        customer: request.customerId,
      });

      await this.auditService.logSecurityEvent({
        action: 'PAYMENT_METHOD_ATTACHED',
        category: 'PAYMENT',
        severity: 'LOW',
        description: `Payment method attached to customer: ${request.customerId}`,
        metadata: {
          paymentMethodId: request.paymentMethodId,
          customerId: request.customerId,
        },
      });

      this.logger.info('Payment method attached successfully', {
        paymentMethodId: request.paymentMethodId,
        customerId: request.customerId,
      });

      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        } : undefined,
        customerId: paymentMethod.customer as string,
      };
    } catch (error) {
      this.logger.error('Failed to attach payment method', error as Error, { request });
      throw this.handleStripeError(error as Stripe.StripeError);
    }
  }

  /**
   * Detach payment method from customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<StripePaymentMethod> {
    this.ensureStripeConfigured();
    
    try {
      const paymentMethod = await this.stripe!.paymentMethods.detach(paymentMethodId);

      await this.auditService.logSecurityEvent({
        action: 'PAYMENT_METHOD_DETACHED',
        category: 'PAYMENT',
        severity: 'LOW',
        description: `Payment method detached: ${paymentMethodId}`,
        metadata: { paymentMethodId },
      });

      this.logger.info('Payment method detached successfully', { paymentMethodId });

      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        } : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to detach payment method', error as Error, { paymentMethodId });
      throw this.handleStripeError(error as Stripe.StripeError);
    }
  }

  /**
   * List customer payment methods
   */
  async listCustomerPaymentMethods(customerId: string, type?: string): Promise<StripePaymentMethod[]> {
    this.ensureStripeConfigured();
    
    try {
      const params: Stripe.PaymentMethodListParams = {
        customer: customerId,
        type: (type as any) || 'card',
      };

      const paymentMethods = await this.stripe!.paymentMethods.list(params);

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        } : undefined,
        customerId: pm.customer as string,
      }));
    } catch (error) {
      this.logger.error('Failed to list customer payment methods', error as Error, { customerId });
      throw this.handleStripeError(error as Stripe.StripeError);
    }
  }

  /**
   * Create a refund
   */
  async createRefund(request: CreateRefundRequest, idempotencyKey?: string): Promise<StripeRefund> {
    this.ensureStripeConfigured();
    
    try {
      const requestOptions: Stripe.RequestOptions = {};
      if (idempotencyKey) {
        requestOptions.idempotencyKey = idempotencyKey;
      }

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: request.paymentIntentId,
        reason: request.reason,
        metadata: {
          ...request.metadata,
          created_by_system: 'parking-garage-api',
          timestamp: new Date().toISOString(),
        },
        refund_application_fee: request.refundApplicationFee,
        reverse_transfer: request.reverseTransfer,
      };

      if (request.amount) {
        refundParams.amount = Math.round(request.amount * 100); // Convert to cents
      }

      const refund = await this.stripe!.refunds.create(refundParams, requestOptions);

      await this.auditService.logSecurityEvent({
        action: 'REFUND_CREATED',
        category: 'PAYMENT',
        severity: 'MEDIUM',
        description: `Refund created: ${refund.id}`,
        metadata: {
          refundId: refund.id,
          paymentIntentId: request.paymentIntentId,
          amount: refund.amount / 100,
          reason: request.reason,
        },
      });

      this.logger.info('Refund created successfully', {
        refundId: refund.id,
        paymentIntentId: request.paymentIntentId,
        amount: refund.amount / 100,
        status: refund.status,
      });

      return {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        paymentIntentId: refund.payment_intent as string,
        status: refund.status,
        reason: refund.reason,
      };
    } catch (error) {
      await this.auditService.logSecurityEvent({
        action: 'REFUND_CREATION_FAILED',
        category: 'PAYMENT',
        severity: 'HIGH',
        description: `Refund creation failed: ${(error as Error).message}`,
        metadata: { request, error: (error as Error).message },
      });

      this.logger.error('Failed to create refund', error as Error, { request });
      throw this.handleStripeError(error as Stripe.StripeError);
    }
  }

  /**
   * Calculate processing fees
   */
  calculateProcessingFees(amount: number): { feeAmount: number; netAmount: number } {
    const feeAmount = Math.round((amount * (this.feePercentage / 100) + (this.feeFixed / 100)) * 100) / 100;
    const netAmount = Math.round((amount - feeAmount) * 100) / 100;
    
    return { feeAmount, netAmount };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): StripeWebhookEvent {
    this.ensureStripeConfigured();
    
    try {
      if (!this.webhookSecret) {
        throw new Error('Webhook secret not configured');
      }

      const event = this.stripe!.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      ) as StripeWebhookEvent;

      this.logger.debug('Webhook signature verified successfully', {
        eventId: event.id,
        eventType: event.type,
      });

      return event;
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error as Error, {
        signature: signature.substring(0, 20) + '...',
      });
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Handle Stripe errors and convert to application errors
   */
  private handleStripeError(error: Stripe.StripeError): Error {
    const errorMap: Record<string, string> = {
      card_declined: 'Your card was declined. Please try a different payment method.',
      expired_card: 'Your card has expired. Please use a different payment method.',
      incorrect_cvc: 'Your card security code is incorrect.',
      processing_error: 'An error occurred while processing your card. Please try again.',
      incorrect_number: 'Your card number is incorrect.',
      invalid_expiry_month: 'Your card expiration month is invalid.',
      invalid_expiry_year: 'Your card expiration year is invalid.',
      invalid_cvc: 'Your card security code is invalid.',
      insufficient_funds: 'Your card has insufficient funds.',
      withdrawal_count_limit_exceeded: 'You have exceeded the balance or credit limit on your card.',
      charge_already_captured: 'This payment has already been captured.',
      charge_already_refunded: 'This payment has already been refunded.',
      charge_disputed: 'This payment is disputed.',
      payment_intent_authentication_failure: 'Authentication failed for this payment method.',
      payment_method_unactivated: 'This payment method has not been activated.',
      payment_method_unexpected_state: 'This payment method is in an unexpected state.',
      rate_limit: 'Too many requests made to the API too quickly.',
    };

    const userMessage = errorMap[error.code || ''] || error.message || 'An unexpected error occurred';
    
    const appError = new Error(userMessage);
    (appError as any).code = error.code;
    (appError as any).type = error.type;
    (appError as any).statusCode = error.statusCode;
    (appError as any).stripeError = error;

    return appError;
  }

  /**
   * Health check - verify Stripe connection
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.info('Stripe is disabled - skipping health check');
      return false;
    }
    
    this.ensureStripeConfigured();
    
    try {
      await this.stripe!.accounts.retrieve();
      return true;
    } catch (error) {
      this.logger.error('Stripe health check failed', error as Error);
      return false;
    }
  }
}

export default StripePaymentGateway;