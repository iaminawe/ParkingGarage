/**
 * Check-in validation middleware
 * 
 * This module provides Express middleware functions for validating
 * vehicle check-in requests, including license plate format,
 * vehicle type validation, and request body sanitization.
 * 
 * @module CheckinValidation
 */

import { Request, Response, NextFunction } from 'express';
import { isValidLicensePlate } from '../../utils/validators';

interface CheckinRequestBody {
  licensePlate?: string;
  vehicleType?: string;
  rateType?: string;
}

// Extend Request type to include our custom properties
interface TypedRequest<T = any> extends Request {
  body: T;
}

/**
 * Validate check-in request body
 * Validates license plate and vehicle type from request body
 */
export const validateCheckinRequest = (req: TypedRequest<CheckinRequestBody>, res: Response, next: NextFunction): void => {
  const { licensePlate, vehicleType, rateType } = req.body;
  const errors: string[] = [];

  // Validate required fields
  if (!licensePlate) {
    errors.push('License plate is required');
  } else if (typeof licensePlate !== 'string') {
    errors.push('License plate must be a string');
  } else if (!isValidLicensePlate(licensePlate)) {
    errors.push('License plate must be between 2 and 10 characters');
  }

  if (!vehicleType) {
    errors.push('Vehicle type is required');
  } else {
    const validVehicleTypes = ['compact', 'standard', 'oversized'];
    if (!validVehicleTypes.includes(vehicleType)) {
      errors.push(`Invalid vehicle type: ${vehicleType}. Valid types: ${validVehicleTypes.join(', ')}`);
    }
  }

  // Validate optional rate type
  if (rateType !== undefined) {
    const validRateTypes = ['hourly', 'daily', 'monthly'];
    if (!validRateTypes.includes(rateType)) {
      errors.push(`Invalid rate type: ${rateType}. Valid types: ${validRateTypes.join(', ')}`);
    }
  }

  // Check for extra fields
  const allowedFields = ['licensePlate', 'vehicleType', 'rateType'];
  const providedFields = Object.keys(req.body);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    errors.push(`Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${allowedFields.join(', ')}`);
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid check-in data',
      errors: errors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Sanitize check-in request data
 * Normalize license plate to uppercase and trim whitespace
 */
export const sanitizeCheckinRequest = (req: TypedRequest<CheckinRequestBody>, res: Response, next: NextFunction): void => {
  if (req.body.licensePlate && typeof req.body.licensePlate === 'string') {
    req.body.licensePlate = req.body.licensePlate.trim().toUpperCase();
  }

  if (req.body.vehicleType && typeof req.body.vehicleType === 'string') {
    req.body.vehicleType = req.body.vehicleType.trim().toLowerCase();
  }

  if (req.body.rateType && typeof req.body.rateType === 'string') {
    req.body.rateType = req.body.rateType.trim().toLowerCase();
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
      requiredFields: ['licensePlate', 'vehicleType'],
      optionalFields: ['rateType'],
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