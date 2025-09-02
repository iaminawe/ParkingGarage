/**
 * Transactions API routes
 * 
 * This module defines the REST API endpoints for transaction management.
 * Includes transaction CRUD operations, status management, and reporting.
 * 
 * @module TransactionsRoutes
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import TransactionService, { 
  CreateTransactionRequest, 
  UpdateTransactionRequest, 
  TransactionFilters,
  ProcessTransactionRequest 
} from '../services/transactionService';
import { authenticate, authorize, managerOrAdmin, AuthRequest } from '../middleware/auth';
import { 
  HTTP_STATUS, 
  API_RESPONSES, 
  RATE_LIMITS,
  USER_ROLES 
} from '../config/constants';
import { createLogger } from '../utils/logger';

const router = Router();
const transactionService = new TransactionService();
const logger = createLogger('TransactionsRoutes');

// Rate limiting for transaction operations
const transactionOperationsLimiter = rateLimit({
  windowMs: RATE_LIMITS.DEFAULT_WINDOW_MS,
  max: RATE_LIMITS.DEFAULT_MAX_REQUESTS,
  message: {
    success: false,
    message: API_RESPONSES.ERRORS.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for sensitive transaction operations
const sensitiveTransactionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many transaction processing attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route   GET /api/transactions
 * @desc    List transactions with optional filters
 * @access  Private (Staff only)
 * @query   page, limit, sortBy, sortOrder, garageId, status, transactionType, etc.
 */
router.get('/', 
  authenticate, 
  managerOrAdmin, 
  transactionOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        garageId,
        ticketId,
        transactionType,
        status,
        paymentMethod,
        paymentReference,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        description
      } = req.query;

      const currentUser = req.user;

      // Build filters
      const filters: TransactionFilters = {};
      if (garageId) filters.garageId = garageId as string;
      if (ticketId) filters.ticketId = ticketId as string;
      if (transactionType) filters.transactionType = transactionType as string;
      if (status) filters.status = status as string;
      if (paymentMethod) filters.paymentMethod = paymentMethod as string;
      if (paymentReference) filters.paymentReference = paymentReference as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (minAmount) filters.minAmount = parseFloat(minAmount as string);
      if (maxAmount) filters.maxAmount = parseFloat(maxAmount as string);
      if (description) filters.description = description as string;

      const result = await transactionService.getAllTransactions(
        Object.keys(filters).length > 0 ? filters : undefined,
        parseInt(page as string),
        parseInt(limit as string),
        sortBy as string,
        sortOrder as 'asc' | 'desc'
      );

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Transactions list retrieved successfully', {
        count: result.data?.data.length,
        totalItems: result.data?.totalCount,
        page: parseInt(page as string),
        userId: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      logger.error('Failed to retrieve transactions list', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get transaction details by ID
 * @access  Private (Staff only)
 */
router.get('/:id', 
  authenticate, 
  managerOrAdmin, 
  transactionOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      const result = await transactionService.getTransactionById(id);

      if (!result.success) {
        const statusCode = result.message === 'Transaction not found' 
          ? HTTP_STATUS.NOT_FOUND 
          : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('Transaction retrieved successfully', { 
        transactionId: id, 
        requestedBy: currentUser.id 
      });

      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      logger.error('Failed to retrieve transaction', error as Error, { transactionId: req.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   POST /api/transactions
 * @desc    Create new transaction
 * @access  Private (Staff only)
 */
router.post('/', 
  authenticate, 
  managerOrAdmin, 
  sensitiveTransactionLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const transactionData: CreateTransactionRequest = req.body;
      const currentUser = req.user;

      // Input validation
      if (!transactionData.garageId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Garage ID is required'
        });
        return;
      }

      if (!transactionData.transactionType) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Transaction type is required'
        });
        return;
      }

      if (!transactionData.amount || transactionData.amount <= 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Transaction amount must be greater than zero'
        });
        return;
      }

      const result = await transactionService.createTransaction(transactionData);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Transaction created successfully', {
        transactionId: result.data?.id,
        garageId: transactionData.garageId,
        type: transactionData.transactionType,
        amount: transactionData.amount,
        createdBy: currentUser.id
      });

      res.status(HTTP_STATUS.CREATED).json(result);

    } catch (error) {
      logger.error('Failed to create transaction', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   PUT /api/transactions/:id/status
 * @desc    Update transaction status
 * @access  Private (Staff only)
 */
router.put('/:id/status', 
  authenticate, 
  managerOrAdmin, 
  sensitiveTransactionLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const currentUser = req.user;

      // Input validation
      if (!status) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Status is required'
        });
        return;
      }

      // Validate status values
      const validStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
        });
        return;
      }

      const result = await transactionService.updateTransactionStatus(id, status);

      if (!result.success) {
        const statusCode = result.message === 'Transaction not found' 
          ? HTTP_STATUS.NOT_FOUND 
          : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('Transaction status updated successfully', {
        transactionId: id,
        newStatus: status,
        updatedBy: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      logger.error('Failed to update transaction status', error as Error, { transactionId: req.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   PUT /api/transactions/:id/process
 * @desc    Process transaction (mark as completed)
 * @access  Private (Staff only)
 */
router.put('/:id/process', 
  authenticate, 
  managerOrAdmin, 
  sensitiveTransactionLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const processData: ProcessTransactionRequest = req.body;
      const currentUser = req.user;

      const result = await transactionService.processTransaction(id, processData);

      if (!result.success) {
        const statusCode = result.message === 'Transaction not found' 
          ? HTTP_STATUS.NOT_FOUND 
          : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('Transaction processed successfully', {
        transactionId: id,
        paymentReference: processData.paymentReference,
        processedBy: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      logger.error('Failed to process transaction', error as Error, { transactionId: req.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   PUT /api/transactions/:id/fail
 * @desc    Mark transaction as failed
 * @access  Private (Staff only)
 */
router.put('/:id/fail', 
  authenticate, 
  managerOrAdmin, 
  sensitiveTransactionLimiter,
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

      const result = await transactionService.failTransaction(id, reason);

      if (!result.success) {
        const statusCode = result.message === 'Transaction not found' 
          ? HTTP_STATUS.NOT_FOUND 
          : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('Transaction failed', {
        transactionId: id,
        reason,
        processedBy: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      logger.error('Failed to fail transaction', error as Error, { transactionId: req.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   PUT /api/transactions/:id/cancel
 * @desc    Cancel transaction
 * @access  Private (Admin only)
 */
router.put('/:id/cancel', 
  authenticate, 
  authorize([USER_ROLES.ADMIN]), 
  sensitiveTransactionLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const currentUser = req.user;

      if (!reason || reason.trim().length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Cancellation reason is required'
        });
        return;
      }

      const result = await transactionService.cancelTransaction(id, reason);

      if (!result.success) {
        const statusCode = result.message === 'Transaction not found' 
          ? HTTP_STATUS.NOT_FOUND 
          : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('Transaction cancelled', {
        transactionId: id,
        reason,
        cancelledBy: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      logger.error('Failed to cancel transaction', error as Error, { transactionId: req.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   GET /api/transactions/garage/:garageId
 * @desc    Get transactions by garage ID
 * @access  Private (Staff only)
 */
router.get('/garage/:garageId', 
  authenticate, 
  managerOrAdmin, 
  transactionOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { garageId } = req.params;
      const { page = '1', limit = '20' } = req.query;
      const currentUser = req.user;

      const result = await transactionService.getTransactionsByGarage(
        garageId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Garage transactions retrieved successfully', {
        garageId,
        count: result.data?.data.length,
        totalItems: result.data?.totalCount,
        requestedBy: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      logger.error('Failed to retrieve garage transactions', error as Error, { garageId: req.params.garageId });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   GET /api/transactions/status/:status
 * @desc    Get transactions by status
 * @access  Private (Staff only)
 */
router.get('/status/:status', 
  authenticate, 
  managerOrAdmin, 
  transactionOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.params;
      const { page = '1', limit = '20' } = req.query;
      const currentUser = req.user;

      // Validate status
      const validStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'];
      if (!validStatuses.includes(status.toUpperCase())) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
        });
        return;
      }

      const result = await transactionService.getTransactionsByStatus(
        status.toUpperCase(),
        parseInt(page as string),
        parseInt(limit as string)
      );

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Status transactions retrieved successfully', {
        status,
        count: result.data?.data.length,
        totalItems: result.data?.totalCount,
        requestedBy: currentUser.id
      });

      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      logger.error('Failed to retrieve status transactions', error as Error, { status: req.params.status });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   GET /api/transactions/stats
 * @desc    Get transaction statistics
 * @access  Private (Staff only)
 */
router.get('/stats', 
  authenticate, 
  managerOrAdmin, 
  transactionOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { garageId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const garage = garageId as string | undefined;

      const result = await transactionService.getTransactionStats(garage, start, end);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Transaction statistics retrieved successfully', {
        garageId: garage,
        startDate: start,
        endDate: end,
        totalTransactions: result.data?.total
      });

      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      logger.error('Failed to retrieve transaction statistics', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   GET /api/transactions/volume/daily
 * @desc    Get daily transaction volume
 * @access  Private (Staff only)
 */
router.get('/volume/daily', 
  authenticate, 
  managerOrAdmin, 
  transactionOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, garageId } = req.query;

      if (!startDate || !endDate) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Start date and end date are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (start >= end) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'End date must be after start date'
        });
        return;
      }

      const garage = garageId as string | undefined;

      const result = await transactionService.getDailyVolume(start, end, garage);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Daily transaction volume retrieved successfully', {
        startDate: start,
        endDate: end,
        garageId: garage,
        daysCount: result.data?.length
      });

      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      logger.error('Failed to retrieve daily transaction volume', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

/**
 * @route   GET /api/transactions/summary
 * @desc    Get transaction summary for reporting
 * @access  Private (Staff only)
 */
router.get('/summary', 
  authenticate, 
  managerOrAdmin, 
  transactionOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { garageId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const garage = garageId as string | undefined;

      const result = await transactionService.getTransactionSummary(garage, start, end);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Transaction summary retrieved successfully', {
        garageId: garage,
        startDate: start,
        endDate: end,
        totalTransactions: result.data?.totalTransactions
      });

      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      logger.error('Failed to retrieve transaction summary', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  }
);

export default router;