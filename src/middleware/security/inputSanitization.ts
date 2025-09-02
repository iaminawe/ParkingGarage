/**
 * Advanced Input Sanitization Middleware
 * Prevents XSS, SQL injection, and other input-based attacks
 */

import { Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult, ValidationChain } from 'express-validator';
import { AppError } from '../errorHandler';
import { SecurityAuditUtils } from '../../services/SecurityAuditService';
import { SECURITY_EVENTS } from '../../config/security.config';

// DOMPurify alternative for server-side HTML sanitization
const createDOMPurify = require('isomorphic-dompurify');
const DOMPurify = createDOMPurify();

/**
 * HTML sanitization function
 */
export const sanitizeHtml = (input: string): string => {
  if (typeof input !== 'string') {
    return input;
  }
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

/**
 * SQL injection pattern detection
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|OR|AND)\b)/i,
  /(--|\/\*|\*\/|;)/,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
  /(\b(OR|AND)\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?)/i,
  /(UNION\s+(ALL\s+)?SELECT)/i,
  /(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)/i,
  /(DROP\s+(TABLE|DATABASE|SCHEMA))/i,
  /(\bSCRIPT\b|javascript:|vbscript:|onload=|onerror=)/i,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /expression\s*\(/gi,
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.(\/|\\)/g,
  /\~(\/|\\)/g,
  /(\/|\\)\.\.(\/|\\)/g,
  /\%2e\%2e(\/|\\|%2f|%5c)/gi,
  /\%252e\%252e(\/|\\|%2f|%5c)/gi,
];

/**
 * Detects potential security threats in input
 */
export const detectSecurityThreats = (input: string, fieldName: string): string[] => {
  const threats: string[] = [];

  if (typeof input !== 'string') {
    return threats;
  }

  // SQL Injection detection
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push('SQL_INJECTION');
      break;
    }
  }

  // XSS detection
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      threats.push('XSS');
      break;
    }
  }

  // Path traversal detection
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      threats.push('PATH_TRAVERSAL');
      break;
    }
  }

  return threats;
};

/**
 * Advanced input sanitizer middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeValue = (value: any, fieldPath: string): any => {
    if (typeof value === 'string') {
      // Detect threats before sanitization
      const threats = detectSecurityThreats(value, fieldPath);

      if (threats.length > 0) {
        // Log security event
        SecurityAuditUtils.logSecurityEvent({
          event: threats.includes('SQL_INJECTION')
            ? SECURITY_EVENTS.SQL_INJECTION_ATTEMPT
            : threats.includes('XSS')
              ? SECURITY_EVENTS.XSS_ATTEMPT
              : SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          severity: 'HIGH',
          userId: (req as any).user?.id,
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          endpoint: `${req.method} ${req.path}`,
          details: {
            fieldPath,
            threats,
            originalValue: value.substring(0, 100), // Log first 100 chars
            timestamp: new Date().toISOString(),
          },
        });

        // In strict mode, reject the request
        if (process.env.SECURITY_STRICT_MODE === 'true') {
          throw new AppError(
            `Security threat detected in field ${fieldPath}. Request rejected.`,
            400
          );
        }
      }

      // Sanitize the string
      let sanitized = value;

      // HTML sanitization
      sanitized = sanitizeHtml(sanitized);

      // Remove null bytes
      sanitized = sanitized.replace(/\0/g, '');

      // Normalize whitespace
      sanitized = sanitized.replace(/\s+/g, ' ').trim();

      // Limit length to prevent DoS
      if (sanitized.length > 10000) {
        sanitized = sanitized.substring(0, 10000);
      }

      return sanitized;
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => sanitizeValue(item, `${fieldPath}[${index}]`));
    }

    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val, `${fieldPath}.${key}`);
      }
      return sanitized;
    }

    return value;
  };

  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeValue(req.body, 'body');
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeValue(req.query, 'query');
    }

    // Sanitize route parameters
    if (req.params) {
      req.params = sanitizeValue(req.params, 'params');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Common validation chains
 */
export const commonValidations = {
  licensePlate: body('licensePlate')
    .isString()
    .trim()
    .isLength({ min: 2, max: 20 })
    .matches(/^[A-Z0-9\-\s]{2,20}$/i)
    .withMessage(
      'License plate must be 2-20 characters, alphanumeric with hyphens and spaces only'
    ),

  email: body('email')
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Valid email address required'),

  password: body('password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must be 8-128 characters with uppercase, lowercase, number, and special character'
    ),

  id: param('id')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('ID must be alphanumeric with hyphens and underscores only'),

  spotId: body('spotId')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[A-Z0-9\-_]+$/i)
    .withMessage('Spot ID must be alphanumeric with hyphens and underscores only'),

  vehicleType: body('vehicleType')
    .isIn(['car', 'motorcycle', 'truck', 'van', 'suv', 'electric'])
    .withMessage('Vehicle type must be one of: car, motorcycle, truck, van, suv, electric'),

  status: query('status')
    .optional()
    .isIn(['available', 'occupied', 'reserved', 'maintenance'])
    .withMessage('Status must be one of: available, occupied, reserved, maintenance'),

  floor: query('floor')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Floor must be a positive integer between 1 and 100'),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .toInt()
    .withMessage('Limit must be between 1 and 1000'),

  offset: query('offset')
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .withMessage('Offset must be a non-negative integer'),

  name: body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage(
      'Name must be 1-100 characters, alphanumeric with spaces, hyphens, underscores, and periods'
    ),

  phoneNumber: body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
    .withMessage('Phone number must be 10-15 digits with optional formatting'),

  amount: body('amount')
    .optional()
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Amount must be a positive number up to 999999.99'),
};

/**
 * Validation result handler
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    // Log invalid input attempt
    SecurityAuditUtils.logSecurityEvent({
      event: SECURITY_EVENTS.INVALID_INPUT,
      severity: 'MEDIUM',
      userId: (req as any).user?.id,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      endpoint: `${req.method} ${req.path}`,
      details: {
        validationErrors: errorDetails,
        timestamp: new Date().toISOString(),
      },
    });

    throw new AppError('Validation failed. Please check your input.', 400, true);
  }

  next();
};

/**
 * Create validation chain with common error handling
 */
export const createValidationChain = (...validations: ValidationChain[]) => [
  ...validations,
  handleValidationErrors,
];
