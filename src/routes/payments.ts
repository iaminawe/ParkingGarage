/**
 * Payments API routes
 * 
 * This module defines the REST API endpoints for payment processing and management.
 * Includes payment CRUD operations, refund processing, and financial reporting.
 * 
 * @module PaymentsRoutes
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import PaymentRepository, { 
  CreatePaymentData, 
  UpdatePaymentData, 
  PaymentSearchCriteria 
} from '../repositories/PaymentRepository';
import { authenticate, authorize, managerOrAdmin, AuthRequest } from '../middleware/auth';
import { 
  HTTP_STATUS, 
  API_RESPONSES, 
  RATE_LIMITS,
  USER_ROLES 
} from '../config/constants';
import { createLogger } from '../utils/logger';
import { PaymentType, PaymentMethod, PaymentStatus } from '@prisma/client';

const router = Router();
const paymentRepository = new PaymentRepository();
const logger = createLogger('PaymentsRoutes');

// Rate limiting for payment operations
const paymentOperationsLimiter = rateLimit({
  windowMs: RATE_LIMITS.DEFAULT_WINDOW_MS,
  max: RATE_LIMITS.DEFAULT_MAX_REQUESTS,
  message: {
    success: false,
    message: API_RESPONSES.ERRORS.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for sensitive payment operations
const sensitivePaymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many payment processing attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route   GET /api/payments
 * @desc    List payments with optional filters
 * @access  Private (Staff only for all payments, Users for their own payments)
 * @query   page, limit, sortBy, sortOrder, vehicleId, sessionId, status, type, method, etc.
 */
router.get('/', 
  authenticate, 
  paymentOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '20',
        sortBy = 'paymentDate',
        sortOrder = 'desc',
        vehicleId,
        sessionId,
        status,
        type,
        method,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        licensePlate,
        transactionId,
        paymentNumber
      } = req.query;

      const currentUser = req.user;

      // Build search criteria
      const criteria: PaymentSearchCriteria = {};
      if (vehicleId) criteria.vehicleId = vehicleId as string;
      if (sessionId) criteria.sessionId = sessionId as string;
      if (status) criteria.status = status as PaymentStatus;
      if (type) criteria.type = type as PaymentType;
      if (method) criteria.method = method as PaymentMethod;
      if (startDate) criteria.startDate = new Date(startDate as string);
      if (endDate) criteria.endDate = new Date(endDate as string);
      if (minAmount) criteria.minAmount = parseFloat(minAmount as string);
      if (maxAmount) criteria.maxAmount = parseFloat(maxAmount as string);
      if (licensePlate) criteria.licensePlate = licensePlate as string;
      if (transactionId) criteria.transactionId = transactionId as string;
      if (paymentNumber) criteria.paymentNumber = paymentNumber as string;

      // Regular users can only see payments for their own vehicles
      if (currentUser.role === USER_ROLES.USER) {
        // This would need to be enhanced to filter by user's vehicles
        // For now, we'll allow staff to see all payments
        if (!managerOrAdmin) {
          res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS
          });
          return;
        }
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      const options = {
        skip: offset,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder }
      };

      let payments;
      if (Object.keys(criteria).length > 0) {
        payments = await paymentRepository.search(criteria, options);
      } else {
        const result = await paymentRepository.findAll(options);
        payments = result.data;
      }

      // Get total count for pagination (simplified)
      const totalItems = payments.length;
      const totalPages = Math.ceil(totalItems / parseInt(limit as string));

      logger.info('Payments list retrieved successfully', {
        count: payments.length,
        totalItems,
        page: parseInt(page as string),
        userId: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          data: payments,
          totalCount: totalItems,
          hasNextPage: parseInt(page as string) < totalPages,
          hasPrevPage: parseInt(page as string) > 1,
          currentPage: parseInt(page as string),
          totalPages
        },
        message: 'Payments retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to retrieve payments list', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment details by ID
 * @access  Private (Staff only)
 */
router.get('/:id', 
  authenticate, 
  managerOrAdmin, 
  paymentOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      const payment = await paymentRepository.findById(id, {
        include: {
          vehicle: true,
          session: true
        }
      });
      
      if (!payment) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Payment not found'
        });
        return;
      }

      logger.info('Payment retrieved successfully', { 
        paymentId: id, 
        requestedBy: currentUser.id 
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: payment,
        message: 'Payment retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to retrieve payment', error as Error, { paymentId: req.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   POST /api/payments
 * @desc    Process new payment
 * @access  Private (Staff only)
 */
router.post('/', 
  authenticate, 
  managerOrAdmin, 
  sensitivePaymentLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const paymentData: CreatePaymentData = req.body;
      const currentUser = req.user;

      // Input validation
      if (!paymentData.amount || paymentData.amount <= 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Payment amount must be greater than zero'
        });
        return;
      }

      if (!paymentData.type || !paymentData.method) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Payment type and method are required'
        });
        return;
      }

      // Set defaults and process payment
      const processedPaymentData = {
        ...paymentData,
        status: 'PENDING' as PaymentStatus,
        currency: paymentData.currency || 'USD',
        paymentDate: new Date()
      };

      const payment = await paymentRepository.createPayment(processedPaymentData);

      logger.info('Payment created successfully', {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        type: payment.paymentType,
        method: payment.paymentMethod,
        createdBy: currentUser.id
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: payment,
        message: 'Payment created successfully'
      });

    } catch (error) {
      logger.error('Failed to create payment', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   PUT /api/payments/:id/process
 * @desc    Process a pending payment (mark as completed)
 * @access  Private (Staff only)
 */
router.put('/:id/process', 
  authenticate, 
  managerOrAdmin, 
  sensitivePaymentLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { transactionId, gatewayResponse } = req.body;
      const currentUser = req.user;

      if (!transactionId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Transaction ID is required to process payment'
        });
        return;
      }

      const payment = await paymentRepository.processPayment(
        id,
        transactionId,
        gatewayResponse
      );

      logger.info('Payment processed successfully', {
        paymentId: id,
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        transactionId,
        processedBy: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: payment,
        message: 'Payment processed successfully'
      });

    } catch (error) {
      logger.error('Failed to process payment', error as Error, { paymentId: req.params.id });
      
      if ((error as Error).message.includes('not found')) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Payment not found or not in pending status'
        });
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: API_RESPONSES.ERRORS.INTERNAL_ERROR
        });
      }
    }
  }
);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Process refund for a completed payment
 * @access  Private (Admin only)
 */
router.post('/:id/refund', 
  authenticate, 
  authorize([USER_ROLES.ADMIN]), 
  sensitivePaymentLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { refundAmount, refundReason } = req.body;
      const currentUser = req.user;

      // Input validation
      if (!refundAmount || refundAmount <= 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Refund amount must be greater than zero'
        });
        return;
      }

      if (!refundReason || refundReason.trim().length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Refund reason is required'
        });
        return;
      }

      const payment = await paymentRepository.refundPayment(
        id,
        refundAmount,
        refundReason
      );

      logger.info('Payment refunded successfully', {
        paymentId: id,
        paymentNumber: payment.paymentNumber,
        originalAmount: payment.amount,
        refundAmount,
        refundReason,
        processedBy: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: payment,
        message: 'Payment refunded successfully'
      });

    } catch (error) {
      logger.error('Failed to refund payment', error as Error, { paymentId: req.params.id });
      
      if ((error as Error).message.includes('not found')) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Payment not found or not eligible for refund'
        });
      } else if ((error as Error).message.includes('cannot exceed')) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: (error as Error).message
        });
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: API_RESPONSES.ERRORS.INTERNAL_ERROR
        });
      }
    }
  }
);

/**
 * @route   GET /api/payments/summary
 * @desc    Get payment summary/reports
 * @access  Private (Staff only)
 */
router.get('/summary', 
  authenticate, 
  managerOrAdmin, 
  paymentOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { garageId, startDate, endDate, reportType = 'summary' } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const garage = garageId as string | undefined;

      let reportData;

      switch (reportType) {
        case 'stats':
          reportData = await paymentRepository.getStats(garage);
          break;
        case 'daily':
          if (!start || !end) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              message: 'Start date and end date are required for daily reports'
            });
            return;
          }
          reportData = await paymentRepository.getDailyRevenue(start, end, garage);
          break;
        default:
          reportData = await paymentRepository.getStats(garage);
      }

      logger.info('Payment summary retrieved successfully', {
        reportType,
        garageId: garage,
        startDate: start,
        endDate: end
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: reportData,
        message: 'Payment summary retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to retrieve payment summary', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   GET /api/payments/license/:licensePlate
 * @desc    Get payments by license plate
 * @access  Private (Staff only)
 */
router.get('/license/:licensePlate', 
  authenticate, 
  managerOrAdmin, 
  paymentOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { licensePlate } = req.params;
      const { page = '1', limit = '20' } = req.query;
      const currentUser = req.user;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      const options = {
        skip: offset,
        take: parseInt(limit as string),
        orderBy: { paymentDate: 'desc' as const }
      };

      const payments = await paymentRepository.findByLicensePlate(licensePlate, options);
      const totalItems = payments.length; // Simplified pagination
      const totalPages = Math.ceil(totalItems / parseInt(limit as string));

      logger.info('License plate payments retrieved successfully', {
        licensePlate,
        count: payments.length,
        totalItems,
        requestedBy: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          data: payments,
          totalCount: totalItems,
          hasNextPage: parseInt(page as string) < totalPages,
          hasPrevPage: parseInt(page as string) > 1,
          currentPage: parseInt(page as string),
          totalPages
        },
        message: 'License plate payments retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to retrieve license plate payments', error as Error, { 
        licensePlate: req.params.licensePlate 
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   GET /api/payments/session/:sessionId
 * @desc    Get payments by session ID
 * @access  Private (All authenticated users - own sessions, Staff - all sessions)
 */
router.get('/session/:sessionId', 
  authenticate, 
  paymentOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { page = '1', limit = '20' } = req.query;
      const currentUser = req.user;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      const options = {
        skip: offset,
        take: parseInt(limit as string),
        orderBy: { paymentDate: 'desc' as const }
      };

      const payments = await paymentRepository.findBySessionId(sessionId, options);

      // Check if user can access these payments
      const canAccess = currentUser.role !== USER_ROLES.USER || 
        payments.some(payment => payment.vehicle?.ownerId === currentUser.id);

      if (!canAccess && payments.length > 0) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS
        });
        return;
      }

      const totalItems = payments.length; // Simplified pagination
      const totalPages = Math.ceil(totalItems / parseInt(limit as string));

      logger.info('Session payments retrieved successfully', {
        sessionId,
        count: payments.length,
        totalItems,
        requestedBy: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          data: payments,
          totalCount: totalItems,
          hasNextPage: parseInt(page as string) < totalPages,
          hasPrevPage: parseInt(page as string) > 1,
          currentPage: parseInt(page as string),
          totalPages
        },
        message: 'Session payments retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to retrieve session payments', error as Error, { 
        sessionId: req.params.sessionId 
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   PUT /api/payments/:id/fail
 * @desc    Mark payment as failed
 * @access  Private (Staff only)
 */
router.put('/:id/fail', 
  authenticate, 
  managerOrAdmin, 
  sensitivePaymentLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const currentUser = req.user;

      if (!reason || reason.trim().length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Failure reason is required'
        });
        return;
      }

      const payment = await paymentRepository.failPayment(id, reason);

      logger.info('Payment failed', {
        paymentId: id,
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        reason,
        processedBy: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: payment,
        message: 'Payment marked as failed'
      });

    } catch (error) {
      logger.error('Failed to fail payment', error as Error, { paymentId: req.params.id });
      
      if ((error as Error).message.includes('not found')) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Payment not found or not in pending status'
        });
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: API_RESPONSES.ERRORS.INTERNAL_ERROR
        });
      }
    }
  }
);

export default router;