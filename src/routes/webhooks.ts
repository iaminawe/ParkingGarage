/**
 * Webhook endpoints for payment gateway events
 * Secure webhook handlers for Stripe payment confirmations and events
 */

import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import rateLimit from 'express-rate-limit';
import StripePaymentGateway, { StripeWebhookEvent } from '../services/StripePaymentGateway';
import PaymentService from '../services/PaymentService';
import { prisma } from '../config/database';
import { SecurityAuditService } from '../services/SecurityAuditService';
import { createLogger } from '../utils/logger';
import { HTTP_STATUS } from '../config/constants';

const router = Router();
const stripeGateway = process.env.STRIPE_SECRET_KEY ? new StripePaymentGateway() : null;
const paymentService = PaymentService;
const auditService = new SecurityAuditService();
const logger = createLogger('WebhookRoutes');

// Rate limiting for webhooks - more restrictive
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Allow more requests from payment providers
  message: {
    success: false,
    message: 'Too many webhook requests from this IP',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  },
});

// Middleware to capture raw body for signature verification
const captureRawBody = (req: Request, res: Response, next: () => void) => {
  let rawBody = '';
  req.setEncoding('utf8');

  req.on('data', (chunk) => {
    rawBody += chunk;
  });

  req.on('end', () => {
    (req as any).rawBody = rawBody;
    next();
  });
};

/**
 * @route   POST /api/webhooks/stripe
 * @desc    Handle Stripe webhook events
 * @access  Public (with signature verification)
 */
router.post('/stripe', webhookLimiter, captureRawBody, async (req: Request, res: Response): Promise<void> => {
  // Check if Stripe is configured
  if (!stripeGateway) {
    logger.warn('Stripe webhook received but Stripe is not configured');
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'Stripe is not configured',
    });
    return;
  }

  const signature = req.get('Stripe-Signature');
  const rawBody = (req as any).rawBody;

  if (!signature) {
    logger.warn('Stripe webhook received without signature', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Missing Stripe signature',
    });
    return;
  }

  try {
    // Verify webhook signature
    const event = stripeGateway.verifyWebhookSignature(rawBody, signature);

    // Log webhook receipt
    await auditService.logSecurityEvent({
      action: 'WEBHOOK_RECEIVED',
      category: 'PAYMENT',
      severity: 'LOW',
      description: `Stripe webhook received: ${event.type}`,
      metadata: {
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode,
        pendingWebhooks: event.pending_webhooks,
        ip: req.ip,
      },
    });

    logger.info('Stripe webhook received and verified', {
      eventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
    });

    // Process the webhook event
    await processStripeWebhookEvent(event);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Webhook processed successfully',
      eventId: event.id,
    });
  } catch (error) {
    await auditService.logSecurityEvent({
      action: 'WEBHOOK_PROCESSING_FAILED',
      category: 'SECURITY',
      severity: 'HIGH',
      description: `Stripe webhook processing failed: ${(error as Error).message}`,
      metadata: {
        error: (error as Error).message,
        signature: signature.substring(0, 20) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.error('Failed to process Stripe webhook', error as Error, {
      signature: signature.substring(0, 20) + '...',
      ip: req.ip,
    });

    if ((error as Error).message.includes('signature')) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Webhook processing failed',
      });
    }
  }
});

/**
 * Process Stripe webhook events
 */
async function processStripeWebhookEvent(event: StripeWebhookEvent): Promise<void> {
  const { type, data } = event;

  try {
    switch (type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(data.object);
        break;

      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(data.object);
        break;

      case 'payment_intent.processing':
        await handlePaymentIntentProcessing(data.object);
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(data.object);
        break;

      case 'charge.failed':
        await handleChargeFailed(data.object);
        break;

      case 'charge.dispute.created':
        await handleChargeDisputeCreated(data.object);
        break;

      case 'refund.created':
        await handleRefundCreated(data.object);
        break;

      case 'refund.updated':
        await handleRefundUpdated(data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(data.object);
        break;

      case 'customer.created':
        await handleCustomerCreated(data.object);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(data.object);
        break;

      case 'customer.deleted':
        await handleCustomerDeleted(data.object);
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(data.object);
        break;

      case 'payment_method.detached':
        await handlePaymentMethodDetached(data.object);
        break;

      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(data.object);
        break;

      case 'setup_intent.setup_failed':
        await handleSetupIntentFailed(data.object);
        break;

      default:
        logger.info('Unhandled Stripe webhook event', {
          eventType: type,
          eventId: event.id,
        });
        break;
    }
  } catch (error) {
    logger.error(`Failed to process webhook event: ${type}`, error as Error, {
      eventId: event.id,
      eventType: type,
    });
    throw error;
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
  const { id: stripePaymentIntentId, amount, currency, metadata } = paymentIntent;

  try {
    // Find the corresponding payment record by transaction ID or metadata
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { transactionId: stripePaymentIntentId },
          { 
            notes: { contains: stripePaymentIntentId } 
          }
        ],
        status: { in: ['PENDING'] },
      },
      include: {
        session: true,
      },
    });

    if (payment) {
      // Update payment status to completed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          notes: `${payment?.notes || ''}\nStripe Response: ${JSON.stringify(paymentIntent)}`.trim(),
        },
      });

      // Update parking session if applicable
      if (payment.sessionId) {
        await prisma.parkingSession.update({
          where: { id: payment.sessionId },
          data: {
            isPaid: true,
            amountPaid: amount / 100, // Convert from cents
            paymentTime: new Date(),
          },
        });
      }

      // Send payment confirmation notification
      await sendPaymentConfirmationNotification(payment, paymentIntent);

      logger.info('Payment intent succeeded - payment updated', {
        paymentId: payment.id,
        stripePaymentIntentId,
        amount: amount / 100,
      });
    } else {
      logger.warn('Payment intent succeeded but no matching payment found', {
        stripePaymentIntentId,
        amount: amount / 100,
        metadata,
      });
    }

    // Log successful payment
    await auditService.logSecurityEvent({
      action: 'PAYMENT_COMPLETED',
      category: 'PAYMENT',
      severity: 'LOW',
      description: `Payment completed via webhook: ${stripePaymentIntentId}`,
      metadata: {
        stripePaymentIntentId,
        amount: amount / 100,
        currency,
        paymentId: payment?.id,
      },
    });
  } catch (error) {
    logger.error('Failed to handle payment intent succeeded', error as Error, {
      stripePaymentIntentId,
    });
    throw error;
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
  const { id: stripePaymentIntentId, amount, last_payment_error } = paymentIntent;

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { transactionId: stripePaymentIntentId },
          { notes: { contains: stripePaymentIntentId } }
        ],
        status: { in: ['PENDING'] },
      },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          processedAt: new Date(),
          failureReason: last_payment_error?.message || 'Payment failed',
          notes: `${payment?.notes || ''}\nStripe Response: ${JSON.stringify(paymentIntent)}`.trim(),
        },
      });

      logger.info('Payment intent failed - payment updated', {
        paymentId: payment.id,
        stripePaymentIntentId,
        failureReason: last_payment_error?.message,
      });
    }

    await auditService.logSecurityEvent({
      action: 'PAYMENT_FAILED',
      category: 'PAYMENT',
      severity: 'MEDIUM',
      description: `Payment failed via webhook: ${stripePaymentIntentId}`,
      metadata: {
        stripePaymentIntentId,
        amount: amount / 100,
        failureReason: last_payment_error?.message,
        paymentId: payment?.id,
      },
    });
  } catch (error) {
    logger.error('Failed to handle payment intent failed', error as Error, {
      stripePaymentIntentId,
    });
    throw error;
  }
}

/**
 * Handle canceled payment intent
 */
async function handlePaymentIntentCanceled(paymentIntent: any): Promise<void> {
  const { id: stripePaymentIntentId, amount, cancellation_reason } = paymentIntent;

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { transactionId: stripePaymentIntentId },
          { notes: { contains: stripePaymentIntentId } }
        ],
        status: { in: ['PENDING'] },
      },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CANCELLED',
          processedAt: new Date(),
          failureReason: `Payment cancelled: ${cancellation_reason || 'Unknown reason'}`,
          notes: `${payment?.notes || ''}\nStripe Response: ${JSON.stringify(paymentIntent)}`.trim(),
        },
      });

      logger.info('Payment intent canceled - payment updated', {
        paymentId: payment.id,
        stripePaymentIntentId,
        cancellationReason: cancellation_reason,
      });
    }

    await auditService.logSecurityEvent({
      action: 'PAYMENT_CANCELLED',
      category: 'PAYMENT',
      severity: 'LOW',
      description: `Payment cancelled via webhook: ${stripePaymentIntentId}`,
      metadata: {
        stripePaymentIntentId,
        amount: amount / 100,
        cancellationReason: cancellation_reason,
        paymentId: payment?.id,
      },
    });
  } catch (error) {
    logger.error('Failed to handle payment intent canceled', error as Error, {
      stripePaymentIntentId,
    });
    throw error;
  }
}

/**
 * Handle payment intent requires action
 */
async function handlePaymentIntentRequiresAction(paymentIntent: any): Promise<void> {
  const { id: stripePaymentIntentId } = paymentIntent;

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { transactionId: stripePaymentIntentId },
          { notes: { contains: stripePaymentIntentId } }
        ],
        status: 'PENDING',
      },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PENDING',
          notes: `${payment?.notes || ''}\nStripe Response: ${JSON.stringify(paymentIntent)}`.trim(),
          // Could add a flag here to indicate additional authentication required
        },
      });

      logger.info('Payment intent requires action', {
        paymentId: payment.id,
        stripePaymentIntentId,
      });
    }
  } catch (error) {
    logger.error('Failed to handle payment intent requires action', error as Error, {
      stripePaymentIntentId,
    });
    throw error;
  }
}

/**
 * Handle payment intent processing
 */
async function handlePaymentIntentProcessing(paymentIntent: any): Promise<void> {
  const { id: stripePaymentIntentId } = paymentIntent;

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { transactionId: stripePaymentIntentId },
          { notes: { contains: stripePaymentIntentId } }
        ],
        status: 'PENDING',
      },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PENDING',
          notes: `${payment?.notes || ''}\nStripe Response: ${JSON.stringify(paymentIntent)}`.trim(),
        },
      });

      logger.info('Payment intent processing', {
        paymentId: payment.id,
        stripePaymentIntentId,
      });
    }
  } catch (error) {
    logger.error('Failed to handle payment intent processing', error as Error, {
      stripePaymentIntentId,
    });
    throw error;
  }
}

/**
 * Handle successful charge (for compatibility)
 */
async function handleChargeSucceeded(charge: any): Promise<void> {
  // This is often duplicated with payment_intent.succeeded
  // Log for audit purposes but don't duplicate updates
  logger.info('Charge succeeded webhook received', {
    chargeId: charge.id,
    paymentIntentId: charge.payment_intent,
    amount: charge.amount / 100,
  });
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(charge: any): Promise<void> {
  logger.warn('Charge failed webhook received', {
    chargeId: charge.id,
    paymentIntentId: charge.payment_intent,
    amount: charge.amount / 100,
    failureReason: charge.failure_message,
  });
}

/**
 * Handle charge dispute created
 */
async function handleChargeDisputeCreated(dispute: any): Promise<void> {
  const { id: disputeId, charge: chargeId, amount, reason } = dispute;

  try {
    // Find payment by charge ID and mark as disputed
    const payment = await prisma.payment.findFirst({
      where: {
        notes: { contains: chargeId },
        status: 'COMPLETED',
      },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'DISPUTED',
          notes: `${payment?.notes || ''}\nDispute: ${JSON.stringify(dispute)}`.trim(),
        },
      });

      logger.warn('Payment disputed', {
        paymentId: payment.id,
        disputeId,
        chargeId,
        amount: amount / 100,
        reason,
      });
    }

    await auditService.logSecurityEvent({
      action: 'PAYMENT_DISPUTED',
      category: 'PAYMENT',
      severity: 'HIGH',
      description: `Payment dispute created: ${disputeId}`,
      metadata: {
        disputeId,
        chargeId,
        amount: amount / 100,
        reason,
        paymentId: payment?.id,
      },
    });
  } catch (error) {
    logger.error('Failed to handle charge dispute created', error as Error, {
      disputeId,
      chargeId,
    });
    throw error;
  }
}

/**
 * Handle refund created
 */
async function handleRefundCreated(refund: any): Promise<void> {
  const { id: refundId, payment_intent: paymentIntentId, amount, reason } = refund;

  logger.info('Refund created webhook received', {
    refundId,
    paymentIntentId,
    amount: amount / 100,
    reason,
  });

  await auditService.logSecurityEvent({
    action: 'REFUND_WEBHOOK_RECEIVED',
    category: 'PAYMENT',
    severity: 'MEDIUM',
    description: `Refund created webhook: ${refundId}`,
    metadata: {
      refundId,
      paymentIntentId,
      amount: amount / 100,
      reason,
    },
  });
}

/**
 * Handle refund updated
 */
async function handleRefundUpdated(refund: any): Promise<void> {
  const { id: refundId, status } = refund;

  logger.info('Refund updated webhook received', {
    refundId,
    status,
  });
}

/**
 * Handle other webhook events (customer, payment methods, etc.)
 */
async function handleCustomerCreated(customer: any): Promise<void> {
  logger.info('Customer created webhook received', {
    customerId: customer.id,
    email: customer.email,
  });
}

async function handleCustomerUpdated(customer: any): Promise<void> {
  logger.info('Customer updated webhook received', {
    customerId: customer.id,
    email: customer.email,
  });
}

async function handleCustomerDeleted(customer: any): Promise<void> {
  logger.info('Customer deleted webhook received', {
    customerId: customer.id,
  });
}

async function handlePaymentMethodAttached(paymentMethod: any): Promise<void> {
  logger.info('Payment method attached webhook received', {
    paymentMethodId: paymentMethod.id,
    customerId: paymentMethod.customer,
    type: paymentMethod.type,
  });
}

async function handlePaymentMethodDetached(paymentMethod: any): Promise<void> {
  logger.info('Payment method detached webhook received', {
    paymentMethodId: paymentMethod.id,
    type: paymentMethod.type,
  });
}

async function handleSetupIntentSucceeded(setupIntent: any): Promise<void> {
  logger.info('Setup intent succeeded webhook received', {
    setupIntentId: setupIntent.id,
    customerId: setupIntent.customer,
  });
}

async function handleSetupIntentFailed(setupIntent: any): Promise<void> {
  logger.warn('Setup intent failed webhook received', {
    setupIntentId: setupIntent.id,
    customerId: setupIntent.customer,
    error: setupIntent.last_setup_error?.message,
  });
}

async function handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
  logger.info('Invoice payment succeeded webhook received', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid / 100,
  });
}

async function handleInvoicePaymentFailed(invoice: any): Promise<void> {
  logger.warn('Invoice payment failed webhook received', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_due / 100,
  });
}

/**
 * Send payment confirmation notification
 */
async function sendPaymentConfirmationNotification(payment: any, paymentIntent: any): Promise<void> {
  try {
    // This could be integrated with an email service or notification system
    logger.info('Payment confirmation notification would be sent', {
      paymentId: payment.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    });

    // Example: Send email confirmation
    // await emailService.sendPaymentConfirmation({
    //   to: payment.customerEmail,
    //   paymentId: payment.id,
    //   amount: paymentIntent.amount / 100,
    //   currency: paymentIntent.currency,
    // });
  } catch (error) {
    logger.error('Failed to send payment confirmation notification', error as Error, {
      paymentId: payment.id,
    });
  }
}

/**
 * @route   GET /api/webhooks/health
 * @desc    Health check endpoint for webhooks
 * @access  Public
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Webhook endpoints are healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;