/**
 * Reservations API routes
 *
 * This module defines the REST API endpoints for parking reservation management.
 * Includes reservation CRUD operations, availability checks, and filtering capabilities.
 *
 * @module ReservationsRoutes
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { User } from '@prisma/client';
import ReservationService, {
  CreateReservationRequest,
  UpdateReservationRequest,
  ReservationFilters,
  AvailabilityRequest,
} from '../services/ReservationService';
import { authenticate, authorize, managerOrAdmin, AuthRequest } from '../middleware/auth';
import { HTTP_STATUS, API_RESPONSES, RATE_LIMITS, USER_ROLES } from '../config/constants';
import { createLogger } from '../utils/logger';
import { SessionStatus } from '@prisma/client';

const router = Router();
const reservationService = new ReservationService();
const logger = createLogger('ReservationsRoutes');

// Rate limiting for reservation operations
const reservationOperationsLimiter = rateLimit({
  windowMs: RATE_LIMITS.DEFAULT_WINDOW_MS,
  max: RATE_LIMITS.DEFAULT_MAX_REQUESTS,
  message: {
    success: false,
    message: API_RESPONSES.ERRORS.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for availability checks (more lenient)
const availabilityLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // More frequent availability checks allowed
  message: {
    success: false,
    message: 'Too many availability check requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   GET /api/reservations
 * @desc    List reservations with optional filters
 * @access  Private (All authenticated users)
 * @query   page, limit, sortBy, sortOrder, vehicleId, spotId, licensePlate, status, etc.
 */
router.get(
  '/',
  authenticate,
  reservationOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '20',
        sortBy = 'startTime',
        sortOrder = 'desc',
        vehicleId,
        spotId,
        licensePlate,
        status,
        startAfter,
        startBefore,
        endAfter,
        endBefore,
        isPaid,
        floor,
        spotType,
        createdAfter,
        createdBefore,
      } = req.query;

      const currentUser = req.user as User;

      // Build filters
      const filters: ReservationFilters = {};
      if (vehicleId) {
        filters.vehicleId = vehicleId as string;
      }
      if (spotId) {
        filters.spotId = spotId as string;
      }
      if (licensePlate) {
        filters.licensePlate = licensePlate as string;
      }
      if (status) {
        filters.status = status as SessionStatus;
      }
      if (startAfter) {
        filters.startAfter = new Date(startAfter as string);
      }
      if (startBefore) {
        filters.startBefore = new Date(startBefore as string);
      }
      if (endAfter) {
        filters.endAfter = new Date(endAfter as string);
      }
      if (endBefore) {
        filters.endBefore = new Date(endBefore as string);
      }
      if (isPaid !== undefined) {
        filters.isPaid = isPaid === 'true';
      }
      if (floor) {
        filters.floor = parseInt(floor as string);
      }
      if (spotType) {
        filters.spotType = spotType as string;
      }
      if (createdAfter) {
        filters.createdAfter = new Date(createdAfter as string);
      }
      if (createdBefore) {
        filters.createdBefore = new Date(createdBefore as string);
      }

      // Regular users can only see their own reservations
      if (currentUser.role === USER_ROLES.USER) {
        // This would need to be enhanced to filter by user's vehicles
        // For now, we'll allow all users to see all reservations if they're authenticated
      }

      const result = await reservationService.getAllReservations(
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

      logger.info('Reservations list retrieved successfully', {
        count: result.data?.data.length,
        totalItems: result.data?.totalCount,
        page: parseInt(page as string),
        userId: currentUser.id,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to retrieve reservations list', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   GET /api/reservations/:id
 * @desc    Get reservation details by ID
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id',
  authenticate,
  reservationOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const currentUser = req.user as User;

      const result = await reservationService.getReservationById(id);

      if (!result.success) {
        const statusCode =
          result.message === 'Reservation not found'
            ? HTTP_STATUS.NOT_FOUND
            : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      // Check if user can access this reservation
      const reservation = result.data;
      const canAccess =
        currentUser.role !== USER_ROLES.USER || reservation?.vehicle?.ownerId === currentUser.id;

      if (!canAccess) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS,
        });
        return;
      }

      logger.info('Reservation retrieved successfully', {
        reservationId: id,
        requestedBy: currentUser.id,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to retrieve reservation', error as Error, {
        reservationId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   POST /api/reservations
 * @desc    Create new reservation
 * @access  Private (All authenticated users)
 */
router.post(
  '/',
  authenticate,
  reservationOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const reservationData: CreateReservationRequest = req.body;
      const currentUser = req.user as User;

      // Input validation
      if (!reservationData.vehicleId || !reservationData.spotId || !reservationData.startTime) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Vehicle ID, spot ID, and start time are required',
        });
        return;
      }

      // Validate dates
      const startTime = new Date(reservationData.startTime);
      if (startTime < new Date()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Start time cannot be in the past',
        });
        return;
      }

      if (reservationData.endTime) {
        const endTime = new Date(reservationData.endTime);
        if (endTime <= startTime) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: 'End time must be after start time',
          });
          return;
        }
      }

      const result = await reservationService.createReservation({
        ...reservationData,
        startTime,
        endTime: reservationData.endTime ? new Date(reservationData.endTime) : undefined,
        expectedEndTime: reservationData.expectedEndTime
          ? new Date(reservationData.expectedEndTime)
          : undefined,
      });

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Reservation created successfully', {
        reservationId: result.data?.id,
        vehicleId: reservationData.vehicleId,
        spotId: reservationData.spotId,
        createdBy: currentUser.id,
      });

      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error('Failed to create reservation', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   PUT /api/reservations/:id
 * @desc    Update reservation
 * @access  Private (All authenticated users - own reservations, Staff - all reservations)
 */
router.put(
  '/:id',
  authenticate,
  reservationOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: UpdateReservationRequest = req.body;
      const currentUser = req.user as User;

      // Check if reservation exists and user has permission
      const existingReservationResult = await reservationService.getReservationById(id);
      if (!existingReservationResult.success) {
        const statusCode =
          existingReservationResult.message === 'Reservation not found'
            ? HTTP_STATUS.NOT_FOUND
            : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(existingReservationResult);
        return;
      }

      const existingReservation = existingReservationResult.data;
      const canUpdate =
        currentUser.role !== USER_ROLES.USER ||
        existingReservation?.vehicle?.ownerId === currentUser.id;

      if (!canUpdate) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS,
        });
        return;
      }

      // Validate date updates
      if (updateData.startTime && updateData.endTime) {
        const startTime = new Date(updateData.startTime);
        const endTime = new Date(updateData.endTime);
        if (endTime <= startTime) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: 'End time must be after start time',
          });
          return;
        }
      }

      // Convert date strings to Date objects
      const processedUpdateData = {
        ...updateData,
        startTime: updateData.startTime ? new Date(updateData.startTime) : undefined,
        endTime: updateData.endTime ? new Date(updateData.endTime) : undefined,
        expectedEndTime: updateData.expectedEndTime
          ? new Date(updateData.expectedEndTime)
          : undefined,
      };

      const result = await reservationService.updateReservation(id, processedUpdateData);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Reservation updated successfully', {
        reservationId: id,
        updatedBy: currentUser.id,
        updatedFields: Object.keys(updateData),
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to update reservation', error as Error, {
        reservationId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   DELETE /api/reservations/:id
 * @desc    Cancel reservation
 * @access  Private (All authenticated users - own reservations, Staff - all reservations)
 */
router.delete(
  '/:id',
  authenticate,
  reservationOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const currentUser = req.user as User;

      // Check if reservation exists and user has permission
      const existingReservationResult = await reservationService.getReservationById(id);
      if (!existingReservationResult.success) {
        const statusCode =
          existingReservationResult.message === 'Reservation not found'
            ? HTTP_STATUS.NOT_FOUND
            : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(existingReservationResult);
        return;
      }

      const existingReservation = existingReservationResult.data;
      const canCancel =
        currentUser.role !== USER_ROLES.USER ||
        existingReservation?.vehicle?.ownerId === currentUser.id;

      if (!canCancel) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS,
        });
        return;
      }

      const result = await reservationService.cancelReservation(id, reason);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Reservation cancelled successfully', {
        reservationId: id,
        cancelledBy: currentUser.id,
        reason,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to cancel reservation', error as Error, {
        reservationId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   PUT /api/reservations/:id/complete
 * @desc    Complete reservation (checkout)
 * @access  Private (Staff only)
 */
router.put(
  '/:id/complete',
  authenticate,
  managerOrAdmin,
  reservationOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { endTime } = req.body;
      const currentUser = req.user as User;

      const completionTime = endTime ? new Date(endTime) : new Date();
      const result = await reservationService.completeReservation(id, completionTime);

      if (!result.success) {
        const statusCode =
          result.message === 'Reservation not found'
            ? HTTP_STATUS.NOT_FOUND
            : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('Reservation completed successfully', {
        reservationId: id,
        completedBy: currentUser.id,
        endTime: completionTime,
        totalAmount: result.data?.totalAmount,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to complete reservation', error as Error, {
        reservationId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   GET /api/reservations/availability
 * @desc    Check spot availability
 * @access  Private (All authenticated users)
 */
router.get(
  '/availability',
  authenticate,
  availabilityLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { startTime, endTime, spotType, floor } = req.query;

      // Input validation
      if (!startTime || !endTime) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Start time and end time are required',
        });
        return;
      }

      const start = new Date(startTime as string);
      const end = new Date(endTime as string);

      if (start >= end) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'End time must be after start time',
        });
        return;
      }

      if (start < new Date()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Start time cannot be in the past',
        });
        return;
      }

      const availabilityRequest: AvailabilityRequest = {
        startTime: start,
        endTime: end,
        spotType: spotType as string,
        floor: floor ? parseInt(floor as string) : undefined,
      };

      const result = await reservationService.checkAvailability(availabilityRequest);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Availability check completed', {
        startTime: start,
        endTime: end,
        spotType,
        floor,
        availableCount: result.data?.availableCount,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to check availability', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   GET /api/reservations/vehicle/:vehicleId
 * @desc    Get reservations by vehicle ID
 * @access  Private (All authenticated users - own vehicles, Staff - all vehicles)
 */
router.get(
  '/vehicle/:vehicleId',
  authenticate,
  reservationOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { vehicleId } = req.params;
      const { page = '1', limit = '20' } = req.query;
      const currentUser = req.user as User;

      // This would need vehicle ownership validation in a real implementation
      const result = await reservationService.getReservationsByVehicle(
        vehicleId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Vehicle reservations retrieved successfully', {
        vehicleId,
        count: result.data?.data.length,
        totalItems: result.data?.totalCount,
        requestedBy: currentUser.id,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to retrieve vehicle reservations', error as Error, {
        vehicleId: req.params.vehicleId,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   GET /api/reservations/license/:licensePlate
 * @desc    Get reservations by license plate
 * @access  Private (Staff only)
 */
router.get(
  '/license/:licensePlate',
  authenticate,
  managerOrAdmin,
  reservationOperationsLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { licensePlate } = req.params;
      const { page = '1', limit = '20' } = req.query;
      const currentUser = req.user as User;

      const result = await reservationService.getReservationsByLicensePlate(
        licensePlate,
        parseInt(page as string),
        parseInt(limit as string)
      );

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('License plate reservations retrieved successfully', {
        licensePlate,
        count: result.data?.data.length,
        totalItems: result.data?.totalCount,
        requestedBy: currentUser.id,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to retrieve license plate reservations', error as Error, {
        licensePlate: req.params.licensePlate,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   GET /api/reservations/stats
 * @desc    Get reservation statistics
 * @access  Private (Staff only)
 */
router.get(
  '/stats',
  authenticate,
  managerOrAdmin,
  reservationOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const result = await reservationService.getReservationStats(start, end);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Reservation statistics retrieved successfully', {
        startDate: start,
        endDate: end,
        totalReservations: result.data?.total,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to retrieve reservation statistics', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

export default router;
