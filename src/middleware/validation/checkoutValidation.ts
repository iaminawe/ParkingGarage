/**
 * Checkout validation middleware
 * 
 * This module provides Express middleware functions for validating
 * vehicle checkout requests, including license plate format validation,
 * request body sanitization, and optional parameter validation.
 * 
 * @module CheckoutValidation
 */

import { Request, Response, NextFunction } from 'express';
import { isValidLicensePlate } from '../../utils/validators';

interface CheckoutRequestBody {
  licensePlate?: string;
  applyGracePeriod?: boolean;
  removeRecord?: boolean;
  checkOutTime?: string;
}

interface CheckoutQueryParams {
  minMinutes?: string | number;
  vehicleType?: string;
  rateType?: string;
  status?: string;
}

interface ForceCheckoutRequestBody {
  licensePlate?: string;
  reason?: string;
  adminKey?: string;
}

// Extend Request type to include our custom properties
interface TypedRequest<T = any, U = any> extends Request {
  body: T;
  query: U;
}

/**
 * Validate checkout request body
 * Validates license plate and optional parameters from request body
 */
export const validateCheckoutRequest = (req: TypedRequest<CheckoutRequestBody>, res: Response, next: NextFunction): void => {
  const { licensePlate, applyGracePeriod, removeRecord, checkOutTime } = req.body;
  const errors: string[] = [];

  // Validate required fields
  if (!licensePlate) {
    errors.push('License plate is required');
  } else if (typeof licensePlate !== 'string') {
    errors.push('License plate must be a string');
  } else if (!isValidLicensePlate(licensePlate)) {
    errors.push('License plate must be between 2 and 10 characters');
  }

  // Validate optional boolean fields
  if (applyGracePeriod !== undefined && typeof applyGracePeriod !== 'boolean') {
    errors.push('applyGracePeriod must be a boolean value (true or false)');
  }

  if (removeRecord !== undefined && typeof removeRecord !== 'boolean') {
    errors.push('removeRecord must be a boolean value (true or false)');
  }

  // Validate optional checkout time override
  if (checkOutTime !== undefined) {
    if (typeof checkOutTime !== 'string') {
      errors.push('checkOutTime must be a valid ISO timestamp string');
    } else {
      const date = new Date(checkOutTime);
      if (isNaN(date.getTime())) {
        errors.push('checkOutTime must be a valid ISO timestamp string');
      }
    }
  }

  // Check for extra fields
  const allowedFields = ['licensePlate', 'applyGracePeriod', 'removeRecord', 'checkOutTime'];
  const providedFields = Object.keys(req.body);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    errors.push(`Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${allowedFields.join(', ')}`);
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid checkout data',
      errors: errors,
      validationHelp: {
        licensePlate: 'Required string, 2-10 characters',
        applyGracePeriod: 'Optional boolean, applies 5-minute grace period',
        removeRecord: 'Optional boolean, removes record after checkout (default: true)',
        checkOutTime: 'Optional ISO timestamp string, overrides current time'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Sanitize checkout request data
 * Normalize license plate to uppercase and trim whitespace
 */
export const sanitizeCheckoutRequest = (req: TypedRequest<CheckoutRequestBody>, res: Response, next: NextFunction): void => {
  if (req.body.licensePlate && typeof req.body.licensePlate === 'string') {
    req.body.licensePlate = req.body.licensePlate.trim().toUpperCase();
  }

  // Ensure boolean values are properly typed
  if (req.body.applyGracePeriod !== undefined) {
    req.body.applyGracePeriod = Boolean(req.body.applyGracePeriod);
  }

  if (req.body.removeRecord !== undefined) {
    req.body.removeRecord = Boolean(req.body.removeRecord);
  }

  // Trim and validate timestamp format
  if (req.body.checkOutTime && typeof req.body.checkOutTime === 'string') {
    req.body.checkOutTime = req.body.checkOutTime.trim();
  }

  next();
};

/**
 * Validate that request body is not empty
 */
export const validateRequestBody = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).json({
      success: false,
      message: 'Request body is required',
      requiredFields: ['licensePlate'],
      optionalFields: ['applyGracePeriod', 'removeRecord', 'checkOutTime'],
      example: {
        licensePlate: 'ABC123',
        applyGracePeriod: false,
        removeRecord: true
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Validate content type is JSON
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' && !req.is('application/json')) {
    res.status(400).json({
      success: false,
      message: 'Content-Type must be application/json',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Validate license plate parameter in URL
 * Used for GET endpoints that take license plate as path parameter
 */
export const validateLicensePlateParam = (req: Request, res: Response, next: NextFunction): void => {
  const { licensePlate } = req.params;
  const errors: string[] = [];

  if (!licensePlate) {
    errors.push('License plate parameter is required');
  } else if (typeof licensePlate !== 'string') {
    errors.push('License plate must be a string');
  } else if (!isValidLicensePlate(licensePlate)) {
    errors.push('License plate must be between 2 and 10 characters');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid license plate parameter',
      errors: errors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Normalize license plate
  req.params.licensePlate = licensePlate.trim().toUpperCase();
  next();
};

/**
 * Validate query parameters for checkout listing endpoints
 */
export const validateCheckoutListQuery = (req: TypedRequest<any, CheckoutQueryParams>, res: Response, next: NextFunction): void => {
  const { minMinutes, vehicleType, rateType, status } = req.query;
  const errors: string[] = [];

  // Validate minMinutes parameter
  if (minMinutes !== undefined) {
    const minMinutesNum = parseInt(minMinutes as string);
    if (isNaN(minMinutesNum) || minMinutesNum < 0) {
      errors.push('minMinutes must be a non-negative integer');
    } else {
      req.query.minMinutes = minMinutesNum;
    }
  }

  // Validate vehicleType parameter
  if (vehicleType !== undefined) {
    const validVehicleTypes = ['compact', 'standard', 'oversized'];
    if (!validVehicleTypes.includes((vehicleType as string).toLowerCase())) {
      errors.push(`Invalid vehicle type: ${vehicleType}. Valid types: ${validVehicleTypes.join(', ')}`);
    } else {
      req.query.vehicleType = (vehicleType as string).toLowerCase();
    }
  }

  // Validate rateType parameter
  if (rateType !== undefined) {
    const validRateTypes = ['hourly', 'daily', 'monthly'];
    if (!validRateTypes.includes((rateType as string).toLowerCase())) {
      errors.push(`Invalid rate type: ${rateType}. Valid types: ${validRateTypes.join(', ')}`);
    } else {
      req.query.rateType = (rateType as string).toLowerCase();
    }
  }

  // Validate status parameter
  if (status !== undefined) {
    const validStatuses = ['parked', 'checked_out_unpaid', 'completed'];
    if (!validStatuses.includes((status as string).toLowerCase())) {
      errors.push(`Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`);
    } else {
      req.query.status = (status as string).toLowerCase();
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: errors,
      validParameters: {
        minMinutes: 'Non-negative integer, minimum parking time filter',
        vehicleType: 'String, filter by vehicle type (compact, standard, oversized)',
        rateType: 'String, filter by rate type (hourly, daily, monthly)',
        status: 'String, filter by status (parked, checked_out_unpaid, completed)'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Validate force checkout request (admin endpoints)
 */
export const validateForceCheckoutRequest = (req: TypedRequest<ForceCheckoutRequestBody>, res: Response, next: NextFunction): void => {
  const { licensePlate, reason, adminKey } = req.body;
  const errors: string[] = [];

  // Validate license plate (same as regular checkout)
  if (!licensePlate) {
    errors.push('License plate is required');
  } else if (typeof licensePlate !== 'string') {
    errors.push('License plate must be a string');
  } else if (!isValidLicensePlate(licensePlate)) {
    errors.push('License plate must be between 2 and 10 characters');
  }

  // Validate reason
  if (!reason) {
    errors.push('Reason is required for forced checkout');
  } else if (typeof reason !== 'string') {
    errors.push('Reason must be a string');
  } else if (reason.trim().length < 5) {
    errors.push('Reason must be at least 5 characters long');
  }

  // Validate admin key (basic security)
  if (!adminKey) {
    errors.push('Admin key is required for forced operations');
  } else if (typeof adminKey !== 'string') {
    errors.push('Admin key must be a string');
  }

  // Check for extra fields
  const allowedFields = ['licensePlate', 'reason', 'adminKey'];
  const providedFields = Object.keys(req.body);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    errors.push(`Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${allowedFields.join(', ')}`);
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid force checkout data',
      errors: errors,
      requiredFields: {
        licensePlate: 'Vehicle license plate to force checkout',
        reason: 'Reason for forced checkout (minimum 5 characters)',
        adminKey: 'Administrative access key'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};