/**
 * PaymentService - Comprehensive payment processing service with gateway integration,
 * fraud detection, refund processing, and receipt generation
 */

import { prisma } from '../config/database';
import { SecurityAuditService } from './SecurityAuditService';
import { BillingService } from './billingService';
import type { PaymentMethod, PaymentStatus, PaymentType } from '@prisma/client';

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
  private gatewayConfigs: Map<string, PaymentGatewayConfig>;
  private fraudThreshold: number = 0.7;

  constructor() {
    this.auditService = new SecurityAuditService();
    this.billingService = new BillingService();
    this.gatewayConfigs = new Map();
    this.initializeGateways();
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
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
      });
    }

    // PayPal configuration
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      this.gatewayConfigs.set('paypal', {
        provider: 'paypal',
        apiKey: process.env.PAYPAL_CLIENT_ID,
        secretKey: process.env.PAYPAL_CLIENT_SECRET,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
      });
    }

    // Mock gateway for testing
    this.gatewayConfigs.set('mock', {
      provider: 'mock',
      apiKey: 'mock_key',
      secretKey: 'mock_secret',
      environment: 'sandbox'
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
          errorCode: 'VALIDATION_FAILED'
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
          metadata: { request, fraudScore: fraudCheck.riskScore }
        });

        return {
          success: false,
          status: 'FAILED',
          amount: request.amount,
          message: 'Payment declined due to security concerns',
          errorCode: 'FRAUD_DETECTED',
          fraudScore: fraudCheck.riskScore
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
          notes: request.description
        }
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
              paymentTime: new Date()
            }
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
          fraudScore: fraudCheck.riskScore
        }
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
        fraudScore: fraudCheck.riskScore
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      
      await this.auditService.logSecurityEvent({
        userId,
        action: 'PAYMENT_ERROR',
        category: 'TRANSACTION',
        severity: 'HIGH',
        description: `Payment processing error: ${(error as Error).message}`,
        metadata: { request, error: (error as Error).message }
      });

      return {
        success: false,
        status: 'FAILED',
        amount: request.amount,
        message: 'Payment processing failed',
        errorCode: 'PROCESSING_ERROR'
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
        include: { session: true, vehicle: true }
      });

      if (!payment) {
        return {
          success: false,
          amount: 0,
          status: 'FAILED',
          message: 'Payment not found'
        };
      }

      if (payment.status !== 'COMPLETED') {
        return {
          success: false,
          amount: 0,
          status: 'FAILED',
          message: 'Cannot refund incomplete payment'
        };
      }

      const refundAmount = refundRequest.amount || payment.amount;
      const maxRefundable = payment.amount - (payment.refundAmount || 0);

      if (refundAmount > maxRefundable) {
        return {
          success: false,
          amount: 0,
          status: 'FAILED',
          message: `Refund amount exceeds refundable balance ($${maxRefundable})`
        };
      }

      // Process refund through gateway
      const gatewayResult = await this.processRefundGateway(payment, refundAmount);

      // Update payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundAmount: (payment.refundAmount || 0) + refundAmount,
          refundedAt: new Date(),
          status: refundAmount === payment.amount ? 'REFUNDED' : 'COMPLETED'
        }
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
          reason: refundRequest.reason
        }
      });

      return {
        success: gatewayResult.success,
        refundId: gatewayResult.refundId,
        amount: refundAmount,
        status: gatewayResult.status,
        message: gatewayResult.message
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        amount: 0,
        status: 'FAILED',
        message: 'Refund processing failed'
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

    if (request.amount > 10000) { // $10,000 limit
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
        where: { id: request.sessionId }
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
      recommendedAction
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
          status: { in: ['PENDING', 'COMPLETED'] }
        }
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
      recommendedAction
    };
  }

  /**
   * Process payment through gateway (stub implementation)
   */
  private async processPaymentGateway(
    request: PaymentRequest, 
    fraudCheck: FraudCheckResult
  ): Promise<Omit<PaymentResult, 'paymentId'>> {
    // This is a stub implementation - in production, integrate with actual payment gateways
    const gateway = this.gatewayConfigs.get('mock') || this.gatewayConfigs.get('stripe');
    
    if (!gateway) {
      throw new Error('No payment gateway configured');
    }

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock success/failure based on fraud score
    const shouldSucceed = fraudCheck.riskScore < 0.8 && Math.random() > 0.05; // 5% random failure rate

    if (shouldSucceed) {
      return {
        success: true,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'COMPLETED',
        amount: request.amount,
        fees: Math.round(request.amount * 0.029 * 100) / 100, // 2.9% fee
        message: 'Payment processed successfully'
      };
    } else {
      return {
        success: false,
        status: 'FAILED',
        amount: request.amount,
        message: 'Payment declined by processor',
        errorCode: 'DECLINED_BY_PROCESSOR'
      };
    }
  }

  /**
   * Process refund through gateway (stub implementation)
   */
  private async processRefundGateway(
    originalPayment: any, 
    refundAmount: number
  ): Promise<{ success: boolean; refundId?: string; status: string; message?: string }> {
    // Simulate refund processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock refund success (95% success rate)
    const shouldSucceed = Math.random() > 0.05;

    if (shouldSucceed) {
      return {
        success: true,
        refundId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'COMPLETED',
        message: 'Refund processed successfully'
      };
    } else {
      return {
        success: false,
        status: 'FAILED',
        message: 'Refund processing failed'
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
              spot: true
            }
          }
        }
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
          name: request.customerData?.name
        },
        breakdown: {
          subtotal,
          taxes,
          fees,
          total: payment.amount
        }
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
            spot: true
          }
        }
      }
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
        where: { createdAt: { gte: startDate } }
      }),
      prisma.payment.count({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED'
        }
      }),
      prisma.payment.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED'
        },
        _avg: { amount: true }
      })
    ]);

    return {
      totalPayments,
      successfulPayments,
      failedPayments: totalPayments - successfulPayments,
      successRate: totalPayments > 0 ? (successfulPayments / totalPayments * 100) : 0,
      totalRevenue: totalRevenue._sum.amount || 0,
      averageAmount: avgAmount._avg.amount || 0,
      timeframe
    };
  }
}

export default new PaymentService();
export { PaymentService };
