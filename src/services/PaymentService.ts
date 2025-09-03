/**
 * PaymentService - Comprehensive payment processing service with gateway integration,
 * fraud detection, refund processing, and receipt generation
 */

import { prisma } from '../config/database';
import { SecurityAuditService } from './SecurityAuditService';
import { BillingService } from './billingService';
import StripePaymentGateway from './StripePaymentGateway';
import type { PaymentMethod, PaymentStatus, PaymentType } from '@prisma/client';
import { createHmac } from 'crypto';

export interface PaymentGatewayConfig {
  provider: 'stripe' | 'paypal' | 'square' | 'mock';
  apiKey: string;
  secretKey: string;
  webhookSecret?: string;
  environment: 'sandbox' | 'production';
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  sessionId?: string;
  vehicleId?: string;
  description?: string;
  customerData?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  status: PaymentStatus;
  amount: number;
  fees?: number;
  message?: string;
  receiptUrl?: string;
  errorCode?: string;
  fraudScore?: number;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // Partial refund if specified
  reason: string;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number;
  status: string;
  message?: string;
}

export interface FraudCheckResult {
  isValid: boolean;
  riskScore: number; // 0-1, 1 being highest risk
  reasons: string[];
  recommendedAction: 'approve' | 'review' | 'decline';
}

export interface Receipt {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  timestamp: string;
  description: string;
  customerInfo?: {
    name?: string;
    email?: string;
  };
  breakdown?: {
    subtotal: number;
    taxes: number;
    fees: number;
    total: number;
  };
}

class PaymentService {
  private auditService: SecurityAuditService;
  private billingService: BillingService;
  private stripeGateway: StripePaymentGateway;
  private gatewayConfigs: Map<string, PaymentGatewayConfig>;
  private fraudThreshold = 0.7;
  private idempotencyKeys: Map<string, { result: any; timestamp: number }> = new Map();
  private readonly idempotencyTTL: number;

  constructor() {
    this.auditService = new SecurityAuditService();
    this.billingService = new BillingService();
    this.stripeGateway = new StripePaymentGateway();
    this.gatewayConfigs = new Map();
    this.idempotencyTTL = parseInt(process.env.PAYMENT_IDEMPOTENCY_TTL || '86400') * 1000; // Convert to milliseconds
    this.initializeGateways();
    this.startIdempotencyCleanup();
  }

  /**
   * Initialize payment gateways with configuration
   */
  private initializeGateways(): void {
    // Stripe configuration
    if (process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY) {
      this.gatewayConfigs.set('stripe', {
        provider: 'stripe',
        apiKey: process.env.STRIPE_PUBLISHABLE_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      });
    }

    // PayPal configuration
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      this.gatewayConfigs.set('paypal', {
        provider: 'paypal',
        apiKey: process.env.PAYPAL_CLIENT_ID,
        secretKey: process.env.PAYPAL_CLIENT_SECRET,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      });
    }

    // Mock gateway for testing
    this.gatewayConfigs.set('mock', {
      provider: 'mock',
      apiKey: 'mock_key',
      secretKey: 'mock_secret',
      environment: 'sandbox',
    });
  }

  /**
   * Process payment with fraud detection and validation
   */
  async processPayment(request: PaymentRequest, userId?: string): Promise<PaymentResult> {
    try {
      // Validate payment request
      const validation = await this.validatePaymentRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          status: 'FAILED',
          amount: request.amount,
          message: validation.reasons.join(', '),
          errorCode: 'VALIDATION_FAILED',
        };
      }

      // Fraud detection
      const fraudCheck = await this.performFraudCheck(request);
      if (!fraudCheck.isValid || fraudCheck.recommendedAction === 'decline') {
        await this.auditService.logSecurityEvent({
          userId,
          action: 'PAYMENT_FRAUD_DETECTED',
          category: 'SECURITY',
          severity: 'HIGH',
          description: `Fraud detected in payment: ${fraudCheck.reasons.join(', ')}`,
          metadata: { request, fraudScore: fraudCheck.riskScore },
        });

        return {
          success: false,
          status: 'FAILED',
          amount: request.amount,
          message: 'Payment declined due to security concerns',
          errorCode: 'FRAUD_DETECTED',
          fraudScore: fraudCheck.riskScore,
        };
      }

      // Process payment through gateway
      const gatewayResult = await this.processPaymentGateway(request, fraudCheck);

      // Save payment record
      const payment = await prisma.payment.create({
        data: {
          amount: request.amount,
          currency: request.currency,
          paymentMethod: request.paymentMethod,
          paymentType: 'PARKING',
          status: gatewayResult.status,
          transactionId: gatewayResult.transactionId,
          sessionId: request.sessionId,
          vehicleId: request.vehicleId,
          processedAt: gatewayResult.success ? new Date() : null,
          failureReason: gatewayResult.success ? null : gatewayResult.message,
          notes: request.description,
        },
      });

      // Generate receipt if payment successful
      let receiptUrl: string | undefined;
      if (gatewayResult.success) {
        const receipt = await this.generateReceipt(payment.id, request);
        receiptUrl = receipt ? `/receipts/${receipt.id}` : undefined;

        // Update session if provided
        if (request.sessionId) {
          await prisma.parkingSession.update({
            where: { id: request.sessionId },
            data: {
              isPaid: true,
              amountPaid: request.amount,
              paymentMethod: request.paymentMethod,
              paymentTime: new Date(),
            },
          });
        }
      }

      // Log payment attempt
      await this.auditService.logSecurityEvent({
        userId,
        action: gatewayResult.success ? 'PAYMENT_SUCCESSFUL' : 'PAYMENT_FAILED',
        category: 'TRANSACTION',
        severity: gatewayResult.success ? 'LOW' : 'MEDIUM',
        description: `Payment ${gatewayResult.success ? 'processed' : 'failed'} - Amount: $${request.amount}`,
        metadata: {
          paymentId: payment.id,
          amount: request.amount,
          paymentMethod: request.paymentMethod,
          fraudScore: fraudCheck.riskScore,
        },
      });

      return {
        success: gatewayResult.success,
        paymentId: payment.id,
        transactionId: gatewayResult.transactionId,
        status: gatewayResult.status,
        amount: request.amount,
        fees: gatewayResult.fees,
        message: gatewayResult.message,
        receiptUrl,
        fraudScore: fraudCheck.riskScore,
      };
    } catch (error) {
      console.error('Payment processing error:', error);

      await this.auditService.logSecurityEvent({
        userId,
        action: 'PAYMENT_ERROR',
        category: 'TRANSACTION',
        severity: 'HIGH',
        description: `Payment processing error: ${(error as Error).message}`,
        metadata: { request, error: (error as Error).message },
      });

      return {
        success: false,
        status: 'FAILED',
        amount: request.amount,
        message: 'Payment processing failed',
        errorCode: 'PROCESSING_ERROR',
      };
    }
  }

  /**
   * Process refund
   */
  async processRefund(refundRequest: RefundRequest, userId?: string): Promise<RefundResult> {
    try {
      // Get original payment
      const payment = await prisma.payment.findUnique({
        where: { id: refundRequest.paymentId },
        include: { session: true, vehicle: true },
      });

      if (!payment) {
        return {
          success: false,
          amount: 0,
          status: 'FAILED',
          message: 'Payment not found',
        };
      }

      if (payment.status !== 'COMPLETED') {
        return {
          success: false,
          amount: 0,
          status: 'FAILED',
          message: 'Cannot refund incomplete payment',
        };
      }

      const refundAmount = refundRequest.amount || payment.amount;
      const maxRefundable = payment.amount - (payment.refundAmount || 0);

      if (refundAmount > maxRefundable) {
        return {
          success: false,
          amount: 0,
          status: 'FAILED',
          message: `Refund amount exceeds refundable balance ($${maxRefundable})`,
        };
      }

      // Process refund through gateway
      const gatewayResult = await this.processRefundGateway(payment, refundAmount, refundRequest.reason);

      // Update payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundAmount: (payment.refundAmount || 0) + refundAmount,
          refundedAt: new Date(),
          status: refundAmount === payment.amount ? 'REFUNDED' : 'COMPLETED',
        },
      });

      // Log refund
      await this.auditService.logSecurityEvent({
        userId,
        action: 'PAYMENT_REFUNDED',
        category: 'TRANSACTION',
        severity: 'MEDIUM',
        description: `Refund processed - Amount: $${refundAmount}, Reason: ${refundRequest.reason}`,
        metadata: {
          paymentId: payment.id,
          refundAmount,
          reason: refundRequest.reason,
        },
      });

      return {
        success: gatewayResult.success,
        refundId: gatewayResult.refundId,
        amount: refundAmount,
        status: gatewayResult.status,
        message: gatewayResult.message,
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        amount: 0,
        status: 'FAILED',
        message: 'Refund processing failed',
      };
    }
  }

  /**
   * Validate payment request
   */
  private async validatePaymentRequest(request: PaymentRequest): Promise<FraudCheckResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Amount validation
    if (request.amount <= 0) {
      reasons.push('Invalid payment amount');
      riskScore += 0.5;
    }

    if (request.amount > 10000) {
      // $10,000 limit
      reasons.push('Payment amount exceeds maximum limit');
      riskScore += 0.3;
    }

    // Currency validation
    if (!['USD', 'CAD', 'EUR', 'GBP'].includes(request.currency)) {
      reasons.push('Unsupported currency');
      riskScore += 0.2;
    }

    // Session validation if provided
    if (request.sessionId) {
      const session = await prisma.parkingSession.findUnique({
        where: { id: request.sessionId },
      });

      if (!session) {
        reasons.push('Invalid session ID');
        riskScore += 0.4;
      } else if (session.isPaid) {
        reasons.push('Session already paid');
        riskScore += 0.6;
      }
    }

    const isValid = reasons.length === 0 && riskScore < this.fraudThreshold;
    const recommendedAction: 'approve' | 'review' | 'decline' =
      riskScore < 0.3 ? 'approve' : riskScore < 0.7 ? 'review' : 'decline';

    return {
      isValid,
      riskScore: Math.min(riskScore, 1),
      reasons,
      recommendedAction,
    };
  }

  /**
   * Perform fraud detection checks
   */
  private async performFraudCheck(request: PaymentRequest): Promise<FraudCheckResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for rapid repeated payments
    if (request.vehicleId) {
      const recentPayments = await prisma.payment.count({
        where: {
          vehicleId: request.vehicleId,
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
          status: { in: ['PENDING', 'COMPLETED'] },
        },
      });

      if (recentPayments > 3) {
        reasons.push('Multiple rapid payment attempts detected');
        riskScore += 0.4;
      }
    }

    // Unusual amount patterns
    if (request.amount % 1 !== 0 && request.amount > 100) {
      // Large payments with odd cents might be suspicious
      riskScore += 0.1;
    }

    // Very large amounts
    if (request.amount > 1000) {
      reasons.push('Large payment amount requires review');
      riskScore += 0.3;
    }

    // Payment method risk assessment
    if (request.paymentMethod === 'MOBILE_PAY' && request.amount > 500) {
      reasons.push('High-value mobile payment requires verification');
      riskScore += 0.2;
    }

    const isValid = riskScore < this.fraudThreshold;
    const recommendedAction: 'approve' | 'review' | 'decline' =
      riskScore < 0.3 ? 'approve' : riskScore < 0.7 ? 'review' : 'decline';

    return {
      isValid,
      riskScore: Math.min(riskScore, 1),
      reasons,
      recommendedAction,
    };
  }

  /**
   * Process payment through Stripe gateway
   */
  private async processPaymentGateway(
    request: PaymentRequest,
    fraudCheck: FraudCheckResult
  ): Promise<Omit<PaymentResult, 'paymentId'>> {
    try {
      // Generate idempotency key for this payment
      const idempotencyKey = this.generateIdempotencyKey(request);

      // Check for existing idempotent request
      const existingResult = this.getIdempotentResult(idempotencyKey);
      if (existingResult) {
        return existingResult;
      }

      // Create or retrieve customer if customer data provided
      let customerId: string | undefined;
      if (request.customerData?.email) {
        try {
          const customer = await this.stripeGateway.createCustomer({
            email: request.customerData.email,
            name: request.customerData.name,
            phone: request.customerData.phone,
            description: `Customer for payment: ${idempotencyKey}`,
            metadata: {
              sessionId: request.sessionId || '',
              vehicleId: request.vehicleId || '',
            },
          }, `customer_${idempotencyKey}`);
          customerId = customer.id;
        } catch (error) {
          // If customer creation fails, continue without customer
          console.warn('Failed to create customer, proceeding without customer ID:', error);
        }
      }

      // Create payment intent
      const paymentIntent = await this.stripeGateway.createPaymentIntent({
        amount: request.amount,
        currency: request.currency,
        customerId,
        receiptEmail: request.customerData?.email,
        description: request.description || 'Parking fee payment',
        metadata: {
          sessionId: request.sessionId || '',
          vehicleId: request.vehicleId || '',
          fraudScore: fraudCheck.riskScore.toString(),
          ...request.metadata,
        },
        captureMethod: 'automatic',
        confirmationMethod: 'automatic',
      }, idempotencyKey);

      // Calculate fees
      const feeCalculation = this.stripeGateway.calculateProcessingFees(request.amount);

      let result: Omit<PaymentResult, 'paymentId'>;

      // For successful payment intent creation
      if (paymentIntent.status === 'succeeded') {
        result = {
          success: true,
          transactionId: paymentIntent.id,
          status: 'COMPLETED',
          amount: request.amount,
          fees: feeCalculation.feeAmount,
          message: 'Payment processed successfully',
        };
      } else if (paymentIntent.status === 'requires_payment_method' || 
                 paymentIntent.status === 'requires_confirmation' ||
                 paymentIntent.status === 'requires_action') {
        result = {
          success: false,
          transactionId: paymentIntent.id,
          status: 'PENDING',
          amount: request.amount,
          fees: feeCalculation.feeAmount,
          message: 'Payment requires additional action',
        };
      } else if (paymentIntent.status === 'processing') {
        result = {
          success: false,
          transactionId: paymentIntent.id,
          status: 'PROCESSING',
          amount: request.amount,
          fees: feeCalculation.feeAmount,
          message: 'Payment is being processed',
        };
      } else {
        result = {
          success: false,
          transactionId: paymentIntent.id,
          status: 'FAILED',
          amount: request.amount,
          message: 'Payment failed',
          errorCode: 'PAYMENT_FAILED',
        };
      }

      // Store result for idempotency
      this.storeIdempotentResult(idempotencyKey, result);

      return result;
    } catch (error) {
      console.error('Stripe payment processing error:', error);
      
      // Handle specific Stripe errors
      if ((error as any).code) {
        return {
          success: false,
          status: 'FAILED',
          amount: request.amount,
          message: (error as Error).message,
          errorCode: (error as any).code,
        };
      }

      return {
        success: false,
        status: 'FAILED',
        amount: request.amount,
        message: 'Payment gateway error',
        errorCode: 'GATEWAY_ERROR',
      };
    }
  }

  /**
   * Process refund through Stripe gateway
   */
  private async processRefundGateway(
    originalPayment: any,
    refundAmount: number,
    reason?: string
  ): Promise<{ success: boolean; refundId?: string; status: string; message?: string }> {
    try {
      // Generate idempotency key for this refund
      const idempotencyKey = `refund_${originalPayment.id}_${refundAmount}_${Date.now()}`;

      // Create refund through Stripe
      const refund = await this.stripeGateway.createRefund({
        paymentIntentId: originalPayment.transactionId,
        amount: refundAmount,
        reason: (reason as any) || 'requested_by_customer',
        metadata: {
          originalPaymentId: originalPayment.id,
          refundReason: reason || 'Customer requested refund',
        },
      }, idempotencyKey);

      await this.auditService.logSecurityEvent({
        action: 'STRIPE_REFUND_CREATED',
        category: 'PAYMENT',
        severity: 'MEDIUM',
        description: `Stripe refund created: ${refund.id}`,
        metadata: {
          refundId: refund.id,
          originalPaymentId: originalPayment.id,
          paymentIntentId: originalPayment.transactionId,
          refundAmount,
          reason,
        },
      });

      return {
        success: true,
        refundId: refund.id,
        status: refund.status.toUpperCase(),
        message: 'Refund processed successfully',
      };
    } catch (error) {
      console.error('Stripe refund processing error:', error);

      await this.auditService.logSecurityEvent({
        action: 'STRIPE_REFUND_FAILED',
        category: 'PAYMENT',
        severity: 'HIGH',
        description: `Stripe refund failed: ${(error as Error).message}`,
        metadata: {
          originalPaymentId: originalPayment.id,
          paymentIntentId: originalPayment.transactionId,
          refundAmount,
          error: (error as Error).message,
        },
      });

      return {
        success: false,
        status: 'FAILED',
        message: (error as Error).message || 'Refund processing failed',
      };
    }
  }

  /**
   * Generate payment receipt
   */
  async generateReceipt(paymentId: string, request: PaymentRequest): Promise<Receipt | null> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          session: {
            include: {
              vehicle: true,
              spot: true,
            },
          },
        },
      });

      if (!payment) {
        return null;
      }

      const fees = Math.round(payment.amount * 0.029 * 100) / 100;
      const taxes = Math.round(payment.amount * 0.0875 * 100) / 100; // 8.75% tax rate
      const subtotal = payment.amount - fees - taxes;

      const receipt: Receipt = {
        id: `rcpt_${payment.id}`,
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        timestamp: payment.createdAt.toISOString(),
        description: payment.notes || 'Parking fee payment',
        customerInfo: {
          email: request.customerData?.email,
          name: request.customerData?.name,
        },
        breakdown: {
          subtotal,
          taxes,
          fees,
          total: payment.amount,
        },
      };

      return receipt;
    } catch (error) {
      console.error('Receipt generation error:', error);
      return null;
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<any> {
    return await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        session: {
          include: {
            vehicle: true,
            spot: true,
          },
        },
      },
    });
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(timeframe: 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const [totalPayments, successfulPayments, totalRevenue, avgAmount] = await Promise.all([
      prisma.payment.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.payment.count({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED',
        },
      }),
      prisma.payment.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED',
        },
        _avg: { amount: true },
      }),
    ]);

    return {
      totalPayments,
      successfulPayments,
      failedPayments: totalPayments - successfulPayments,
      successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
      totalRevenue: totalRevenue._sum.amount || 0,
      averageAmount: avgAmount._avg.amount || 0,
      timeframe,
    };
  }

  /**
   * Generate idempotency key for payment request
   */
  private generateIdempotencyKey(request: PaymentRequest): string {
    const keyData = {
      amount: request.amount,
      currency: request.currency,
      sessionId: request.sessionId,
      vehicleId: request.vehicleId,
      paymentMethod: request.paymentMethod,
      timestamp: Math.floor(Date.now() / 60000), // Round to minute for some tolerance
    };

    const keyString = JSON.stringify(keyData);
    return createHmac('sha256', process.env.ENCRYPTION_KEY || 'default-key')
      .update(keyString)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Get cached idempotent result
   */
  private getIdempotentResult(idempotencyKey: string): any | null {
    const cached = this.idempotencyKeys.get(idempotencyKey);
    if (cached && Date.now() - cached.timestamp < this.idempotencyTTL) {
      return cached.result;
    }
    return null;
  }

  /**
   * Store idempotent result
   */
  private storeIdempotentResult(idempotencyKey: string, result: any): void {
    this.idempotencyKeys.set(idempotencyKey, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Start periodic cleanup of expired idempotency keys
   */
  private startIdempotencyCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.idempotencyKeys.entries()) {
        if (now - value.timestamp > this.idempotencyTTL) {
          this.idempotencyKeys.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Create payment intent for frontend integration
   */
  async createPaymentIntent(request: PaymentRequest, userId?: string): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
  }> {
    try {
      // Validate payment request
      const validation = await this.validatePaymentRequest(request);
      if (!validation.isValid) {
        throw new Error(`Invalid payment request: ${validation.reasons.join(', ')}`);
      }

      // Fraud detection
      const fraudCheck = await this.performFraudCheck(request);
      if (!fraudCheck.isValid || fraudCheck.recommendedAction === 'decline') {
        throw new Error('Payment declined due to security concerns');
      }

      // Generate idempotency key
      const idempotencyKey = this.generateIdempotencyKey(request);

      // Create customer if needed
      let customerId: string | undefined;
      if (request.customerData?.email) {
        try {
          const customer = await this.stripeGateway.createCustomer({
            email: request.customerData.email,
            name: request.customerData.name,
            phone: request.customerData.phone,
            metadata: {
              sessionId: request.sessionId || '',
              vehicleId: request.vehicleId || '',
            },
          }, `customer_${idempotencyKey}`);
          customerId = customer.id;
        } catch (error) {
          // Continue without customer if creation fails
        }
      }

      // Create payment intent
      const paymentIntent = await this.stripeGateway.createPaymentIntent({
        amount: request.amount,
        currency: request.currency,
        customerId,
        receiptEmail: request.customerData?.email,
        description: request.description || 'Parking fee payment',
        metadata: {
          sessionId: request.sessionId || '',
          vehicleId: request.vehicleId || '',
          userId: userId || '',
          ...request.metadata,
        },
        confirmationMethod: 'manual', // Client will confirm
      }, idempotencyKey);

      // Create preliminary payment record
      const payment = await prisma.payment.create({
        data: {
          amount: request.amount,
          currency: request.currency,
          paymentMethod: request.paymentMethod,
          paymentType: 'PARKING',
          status: 'PENDING',
          transactionId: paymentIntent.id,
          sessionId: request.sessionId,
          vehicleId: request.vehicleId,
          notes: `Stripe PaymentIntent: ${paymentIntent.id}`,
        },
      });

      await this.auditService.logSecurityEvent({
        userId,
        action: 'PAYMENT_INTENT_CREATED_FOR_CLIENT',
        category: 'PAYMENT',
        severity: 'LOW',
        description: `Payment intent created for client integration: ${paymentIntent.id}`,
        metadata: {
          paymentIntentId: paymentIntent.id,
          paymentId: payment.id,
          amount: request.amount,
          currency: request.currency,
        },
      });

      return {
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.id,
        amount: request.amount,
      };
    } catch (error) {
      await this.auditService.logSecurityEvent({
        userId,
        action: 'PAYMENT_INTENT_CREATION_FAILED',
        category: 'PAYMENT',
        severity: 'HIGH',
        description: `Payment intent creation failed: ${(error as Error).message}`,
        metadata: { request, error: (error as Error).message },
      });

      throw error;
    }
  }

  /**
   * Confirm payment intent (called after client-side confirmation)
   */
  async confirmPaymentIntent(paymentIntentId: string, userId?: string): Promise<PaymentResult> {
    try {
      // Retrieve payment intent from Stripe
      const paymentIntent = await this.stripeGateway.retrievePaymentIntent(paymentIntentId);

      // Find corresponding payment record
      const payment = await prisma.payment.findFirst({
        where: {
          transactionId: paymentIntentId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
        include: { session: true },
      });

      if (!payment) {
        throw new Error('Payment not found or already processed');
      }

      // Update payment based on Stripe status
      let status: PaymentStatus;
      let processedAt: Date | null = null;
      let failureReason: string | null = null;

      switch (paymentIntent.status) {
        case 'succeeded':
          status = 'COMPLETED';
          processedAt = new Date();
          break;
        case 'processing':
          status = 'PROCESSING';
          break;
        case 'requires_action':
        case 'requires_confirmation':
        case 'requires_payment_method':
          status = 'PENDING';
          break;
        case 'canceled':
          status = 'CANCELLED';
          processedAt = new Date();
          failureReason = 'Payment was cancelled';
          break;
        default:
          status = 'FAILED';
          processedAt = new Date();
          failureReason = 'Payment failed';
      }

      // Update payment record
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status,
          processedAt,
          failureReason,
          gatewayResponse: JSON.stringify(paymentIntent),
        },
      });

      // Update session if payment completed
      if (status === 'COMPLETED' && payment.sessionId) {
        await prisma.parkingSession.update({
          where: { id: payment.sessionId },
          data: {
            isPaid: true,
            amountPaid: payment.amount,
            paymentMethod: payment.paymentMethod,
            paymentTime: new Date(),
          },
        });
      }

      const result: PaymentResult = {
        success: status === 'COMPLETED',
        paymentId: payment.id,
        transactionId: paymentIntentId,
        status,
        amount: payment.amount,
        message: status === 'COMPLETED' ? 'Payment completed successfully' : failureReason || 'Payment processing',
      };

      await this.auditService.logSecurityEvent({
        userId,
        action: status === 'COMPLETED' ? 'PAYMENT_CONFIRMED_SUCCESS' : 'PAYMENT_CONFIRMED_PENDING',
        category: 'PAYMENT',
        severity: 'LOW',
        description: `Payment confirmation processed: ${status}`,
        metadata: {
          paymentIntentId,
          paymentId: payment.id,
          status,
          amount: payment.amount,
        },
      });

      return result;
    } catch (error) {
      await this.auditService.logSecurityEvent({
        userId,
        action: 'PAYMENT_CONFIRMATION_FAILED',
        category: 'PAYMENT',
        severity: 'HIGH',
        description: `Payment confirmation failed: ${(error as Error).message}`,
        metadata: { paymentIntentId, error: (error as Error).message },
      });

      throw error;
    }
  }

  /**
   * Create and attach payment method to customer
   */
  async savePaymentMethod(customerId: string, paymentMethodId: string, userId?: string): Promise<{
    success: boolean;
    paymentMethod?: any;
    message: string;
  }> {
    try {
      const paymentMethod = await this.stripeGateway.attachPaymentMethod({
        paymentMethodId,
        customerId,
      });

      await this.auditService.logSecurityEvent({
        userId,
        action: 'PAYMENT_METHOD_SAVED',
        category: 'PAYMENT',
        severity: 'LOW',
        description: `Payment method saved for customer: ${customerId}`,
        metadata: {
          paymentMethodId,
          customerId,
          paymentMethodType: paymentMethod.type,
        },
      });

      return {
        success: true,
        paymentMethod,
        message: 'Payment method saved successfully',
      };
    } catch (error) {
      await this.auditService.logSecurityEvent({
        userId,
        action: 'PAYMENT_METHOD_SAVE_FAILED',
        category: 'PAYMENT',
        severity: 'MEDIUM',
        description: `Payment method save failed: ${(error as Error).message}`,
        metadata: {
          paymentMethodId,
          customerId,
          error: (error as Error).message,
        },
      });

      return {
        success: false,
        message: (error as Error).message || 'Failed to save payment method',
      };
    }
  }

  /**
   * List customer payment methods
   */
  async getCustomerPaymentMethods(customerId: string): Promise<any[]> {
    try {
      return await this.stripeGateway.listCustomerPaymentMethods(customerId);
    } catch (error) {
      console.error('Failed to retrieve customer payment methods:', error);
      return [];
    }
  }

  /**
   * Health check for payment gateway
   */
  async healthCheck(): Promise<{ stripe: boolean; overall: boolean }> {
    const stripeHealthy = await this.stripeGateway.healthCheck();
    
    return {
      stripe: stripeHealthy,
      overall: stripeHealthy, // Can expand this for other gateways
    };
  }
}

export default new PaymentService();
export { PaymentService };
