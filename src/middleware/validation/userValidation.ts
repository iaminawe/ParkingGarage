/**
 * User validation middleware
 *
 * This module provides validation middleware for user-related API endpoints.
 * Validates input data, enforces business rules, and ensures data integrity.
 *
 * @module UserValidation
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  HTTP_STATUS,
  API_RESPONSES,
  VALIDATION,
  USER_ROLES,
  UserRole,
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
        value: error.type === 'field' ? error.value : undefined,
      })),
    });
    return;
  }

  next();
};

/**
 * Validation for user update requests
 */
export const validateUserUpdate = [
  body('firstName')
    .optional()
    .isLength({ min: VALIDATION.MIN_NAME_LENGTH, max: VALIDATION.MAX_NAME_LENGTH })
    .withMessage(
      `First name must be between ${VALIDATION.MIN_NAME_LENGTH} and ${VALIDATION.MAX_NAME_LENGTH} characters`
    )
    .matches(VALIDATION.NAME_REGEX)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .optional()
    .isLength({ min: VALIDATION.MIN_NAME_LENGTH, max: VALIDATION.MAX_NAME_LENGTH })
    .withMessage(
      `Last name must be between ${VALIDATION.MIN_NAME_LENGTH} and ${VALIDATION.MAX_NAME_LENGTH} characters`
    )
    .matches(VALIDATION.NAME_REGEX)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email address cannot exceed 255 characters'),

  body('phoneNumber')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),

  body('preferredLanguage')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Preferred language must be a valid language code (e.g., en, es, fr)'),

  body('timezone')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Timezone must be a valid timezone identifier'),

  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean value'),

  handleValidationErrors,
];

/**
 * Validation for user ID parameter
 */
export const validateUserId = [
  param('id').isUUID().withMessage('User ID must be a valid UUID'),

  handleValidationErrors,
];

/**
 * Validation for role parameter
 */
export const validateRoleParam = [
  param('role')
    .isIn(Object.values(USER_ROLES))
    .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`),

  handleValidationErrors,
];

/**
 * Validation for role update requests
 */
export const validateRoleUpdate = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(Object.values(USER_ROLES))
    .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`),

  handleValidationErrors,
];

/**
 * Validation for user search/filter parameters
 */
export const validateUserFilters = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'email', 'firstName', 'lastName', 'lastLoginAt'])
    .withMessage(
      'Sort field must be one of: createdAt, updatedAt, email, firstName, lastName, lastLoginAt'
    ),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),

  query('email').optional().isEmail().withMessage('Email filter must be a valid email address'),

  query('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage(`Role filter must be one of: ${Object.values(USER_ROLES).join(', ')}`),

  query('isActive').optional().isBoolean().withMessage('isActive filter must be a boolean value'),

  query('isEmailVerified')
    .optional()
    .isBoolean()
    .withMessage('isEmailVerified filter must be a boolean value'),

  query('createdAfter')
    .optional()
    .isISO8601()
    .withMessage('createdAfter must be a valid ISO 8601 date'),

  query('createdBefore')
    .optional()
    .isISO8601()
    .withMessage('createdBefore must be a valid ISO 8601 date'),

  handleValidationErrors,
];

/**
 * Validation for password change requests
 */
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required')
    .isLength({ min: 1 })
    .withMessage('Current password cannot be empty'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'New password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),

  handleValidationErrors,
];

/**
 * Validation for password reset requests
 */
export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 10 })
    .withMessage('Reset token must be valid'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'New password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),

  handleValidationErrors,
];

export default {
  validateUserUpdate,
  validateUserId,
  validateRoleParam,
  validateRoleUpdate,
  validateUserFilters,
  validatePasswordChange,
  validatePasswordReset,
};
