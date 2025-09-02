/**
 * Reservation validation middleware
 * 
 * This module provides validation middleware for reservation-related API endpoints.
 * Validates input data, enforces business rules, and ensures data integrity.
 * 
 * @module ReservationValidation
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { 
  HTTP_STATUS, 
  API_RESPONSES,
  PARKING 
} from '../../config/constants';

/**
 * Handle validation errors and return appropriate response
 */
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: API_RESPONSES.ERRORS.VALIDATION_ERROR,
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined
      }))
    });
    return;
  }
  
  next();
};

/**
 * Validation for reservation creation requests
 */
export const validateReservationCreate = [
  body('vehicleId')
    .notEmpty()
    .withMessage('Vehicle ID is required')
    .isUUID()
    .withMessage('Vehicle ID must be a valid UUID'),

  body('spotId')
    .notEmpty()
    .withMessage('Spot ID is required')
    .isUUID()
    .withMessage('Spot ID must be a valid UUID'),

  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date')
    .custom((value) => {
      const startTime = new Date(value);
      const now = new Date();
      if (startTime < now) {
        throw new Error('Start time cannot be in the past');
      }
      return true;
    }),

  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && req.body.startTime) {
        const endTime = new Date(value);
        const startTime = new Date(req.body.startTime);
        if (endTime <= startTime) {
          throw new Error('End time must be after start time');
        }
      }
      return true;
    }),

  body('expectedEndTime')
    .optional()
    .isISO8601()
    .withMessage('Expected end time must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && req.body.startTime) {
        const expectedEndTime = new Date(value);
        const startTime = new Date(req.body.startTime);
        if (expectedEndTime <= startTime) {
          throw new Error('Expected end time must be after start time');
        }
      }
      return true;
    }),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  handleValidationErrors
];

/**
 * Validation for reservation update requests
 */
export const validateReservationUpdate = [
  body('spotId')
    .optional()
    .isUUID()
    .withMessage('Spot ID must be a valid UUID'),

  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date'),

  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date'),

  body('expectedEndTime')
    .optional()
    .isISO8601()
    .withMessage('Expected end time must be a valid ISO 8601 date'),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'])
    .withMessage('Status must be one of: ACTIVE, COMPLETED, CANCELLED, EXPIRED'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  // Custom validation for date consistency
  body().custom((body) => {
    if (body.startTime && body.endTime) {
      const startTime = new Date(body.startTime);
      const endTime = new Date(body.endTime);
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }
    }
    return true;
  }),

  handleValidationErrors
];

/**
 * Validation for reservation ID parameter
 */
export const validateReservationId = [
  param('id')
    .isUUID()
    .withMessage('Reservation ID must be a valid UUID'),

  handleValidationErrors
];

/**
 * Validation for vehicle ID parameter
 */
export const validateVehicleId = [
  param('vehicleId')
    .isUUID()
    .withMessage('Vehicle ID must be a valid UUID'),

  handleValidationErrors
];

/**
 * Validation for license plate parameter
 */
export const validateLicensePlate = [
  param('licensePlate')
    .notEmpty()
    .withMessage('License plate is required')
    .matches(/^[A-Z0-9\s-]{2,10}$/i)
    .withMessage('License plate format is invalid'),

  handleValidationErrors
];

/**
 * Validation for reservation filters/search parameters
 */
export const validateReservationFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['startTime', 'endTime', 'createdAt', 'updatedAt', 'status'])
    .withMessage('Sort field must be one of: startTime, endTime, createdAt, updatedAt, status'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),

  query('vehicleId')
    .optional()
    .isUUID()
    .withMessage('Vehicle ID must be a valid UUID'),

  query('spotId')
    .optional()
    .isUUID()
    .withMessage('Spot ID must be a valid UUID'),

  query('licensePlate')
    .optional()
    .matches(/^[A-Z0-9\s-]{2,10}$/i)
    .withMessage('License plate format is invalid'),

  query('status')
    .optional()
    .isIn(['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'])
    .withMessage('Status must be one of: ACTIVE, COMPLETED, CANCELLED, EXPIRED'),

  query('startAfter')
    .optional()
    .isISO8601()
    .withMessage('startAfter must be a valid ISO 8601 date'),

  query('startBefore')
    .optional()
    .isISO8601()
    .withMessage('startBefore must be a valid ISO 8601 date'),

  query('endAfter')
    .optional()
    .isISO8601()
    .withMessage('endAfter must be a valid ISO 8601 date'),

  query('endBefore')
    .optional()
    .isISO8601()
    .withMessage('endBefore must be a valid ISO 8601 date'),

  query('isPaid')
    .optional()
    .isBoolean()
    .withMessage('isPaid must be a boolean value'),

  query('floor')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Floor must be a positive integer'),

  query('spotType')
    .optional()
    .isIn(Object.values(PARKING.SPOT_TYPES))
    .withMessage(`Spot type must be one of: ${Object.values(PARKING.SPOT_TYPES).join(', ')}`),

  query('createdAfter')
    .optional()
    .isISO8601()
    .withMessage('createdAfter must be a valid ISO 8601 date'),

  query('createdBefore')
    .optional()
    .isISO8601()
    .withMessage('createdBefore must be a valid ISO 8601 date'),

  handleValidationErrors
];

/**
 * Validation for availability check requests
 */
export const validateAvailabilityCheck = [
  query('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date')
    .custom((value) => {
      const startTime = new Date(value);
      const now = new Date();
      if (startTime < now) {
        throw new Error('Start time cannot be in the past');
      }
      return true;
    }),

  query('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && req.query.startTime) {
        const endTime = new Date(value);
        const startTime = new Date(req.query.startTime as string);
        if (endTime <= startTime) {
          throw new Error('End time must be after start time');
        }
        // Check if the duration is reasonable (not more than 30 days)
        const durationMs = endTime.getTime() - startTime.getTime();
        const maxDurationMs = 30 * 24 * 60 * 60 * 1000; // 30 days
        if (durationMs > maxDurationMs) {
          throw new Error('Reservation duration cannot exceed 30 days');
        }
      }
      return true;
    }),

  query('spotType')
    .optional()
    .isIn(Object.values(PARKING.SPOT_TYPES))
    .withMessage(`Spot type must be one of: ${Object.values(PARKING.SPOT_TYPES).join(', ')}`),

  query('floor')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Floor must be a positive integer'),

  handleValidationErrors
];

/**
 * Validation for reservation completion requests
 */
export const validateReservationComplete = [
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date')
    .custom((value) => {
      if (value) {
        const endTime = new Date(value);
        const now = new Date();
        if (endTime > now) {
          throw new Error('End time cannot be in the future');
        }
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validation for reservation cancellation requests
 */
export const validateReservationCancel = [
  body('reason')
    .optional()
    .isString()
    .withMessage('Cancellation reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Cancellation reason cannot exceed 500 characters'),

  handleValidationErrors
];

/**
 * Validation for date range queries (statistics, reports, etc.)
 */
export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && req.query.startDate) {
        const endDate = new Date(value);
        const startDate = new Date(req.query.startDate as string);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),

  handleValidationErrors
];

export default {
  validateReservationCreate,
  validateReservationUpdate,
  validateReservationId,
  validateVehicleId,
  validateLicensePlate,
  validateReservationFilters,
  validateAvailabilityCheck,
  validateReservationComplete,
  validateReservationCancel,
  validateDateRange
};