/**
 * Vehicle validation middleware
 * 
 * This module provides Express middleware functions for validating
 * vehicle CRUD operations, including license plate format validation,
 * owner information validation, and request body sanitization.
 * 
 * @module VehicleValidation
 */

import { Request, Response, NextFunction } from 'express';
import { isValidLicensePlate } from '../../utils/validators';
import { VehicleType, RateType } from '../../types/models';
import { ExtendedVehicleData } from '../../models/Vehicle';

interface VehicleRequestBody extends Partial<ExtendedVehicleData> {
  licensePlate: string;
  vehicleType?: VehicleType;
  rateType?: RateType;
}

interface VehicleUpdateBody extends Partial<Omit<ExtendedVehicleData, 'licensePlate' | 'checkInTime' | 'spotId'>> {
  // Update body excludes immutable fields
}

interface VehicleQueryParams {
  search?: string;
  vehicleType?: VehicleType;
  status?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface TypedRequest<T = any> extends Request {
  body: T;
  query: T;
}

/**
 * Validate vehicle creation request
 * Validates all required and optional fields for creating a new vehicle
 */
export const validateVehicleCreation = (
  req: TypedRequest<VehicleRequestBody>, 
  res: Response, 
  next: NextFunction
): void => {
  const { 
    licensePlate, 
    vehicleType, 
    rateType, 
    make, 
    model, 
    color, 
    year,
    ownerId,
    ownerName,
    ownerEmail,
    ownerPhone,
    notes
  } = req.body;
  
  const errors: string[] = [];

  // Validate required fields
  if (!licensePlate) {
    errors.push('License plate is required');
  } else if (typeof licensePlate !== 'string') {
    errors.push('License plate must be a string');
  } else if (!isValidLicensePlate(licensePlate)) {
    errors.push('License plate must be between 2 and 10 characters');
  }

  // Validate optional vehicle type
  if (vehicleType !== undefined) {
    const validVehicleTypes: VehicleType[] = ['compact', 'standard', 'oversized'];
    if (!validVehicleTypes.includes(vehicleType)) {
      errors.push(`Invalid vehicle type: ${vehicleType}. Valid types: ${validVehicleTypes.join(', ')}`);
    }
  }

  // Validate optional rate type
  if (rateType !== undefined) {
    const validRateTypes: RateType[] = ['hourly', 'daily', 'monthly'];
    if (!validRateTypes.includes(rateType)) {
      errors.push(`Invalid rate type: ${rateType}. Valid types: ${validRateTypes.join(', ')}`);
    }
  }

  // Validate optional string fields
  if (make !== undefined && typeof make !== 'string') {
    errors.push('Make must be a string');
  }

  if (model !== undefined && typeof model !== 'string') {
    errors.push('Model must be a string');
  }

  if (color !== undefined && typeof color !== 'string') {
    errors.push('Color must be a string');
  }

  // Validate year
  if (year !== undefined) {
    if (typeof year !== 'number' || !Number.isInteger(year)) {
      errors.push('Year must be an integer');
    } else {
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear + 1) {
        errors.push(`Year must be between 1900 and ${currentYear + 1}`);
      }
    }
  }

  // Validate owner fields
  if (ownerId !== undefined && typeof ownerId !== 'string') {
    errors.push('Owner ID must be a string');
  }

  if (ownerName !== undefined && typeof ownerName !== 'string') {
    errors.push('Owner name must be a string');
  }

  if (ownerEmail !== undefined) {
    if (typeof ownerEmail !== 'string') {
      errors.push('Owner email must be a string');
    } else if (ownerEmail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(ownerEmail)) {
        errors.push('Owner email must be a valid email address');
      }
    }
  }

  if (ownerPhone !== undefined) {
    if (typeof ownerPhone !== 'string') {
      errors.push('Owner phone must be a string');
    } else if (ownerPhone.trim() !== '') {
      const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
      if (!phoneRegex.test(ownerPhone)) {
        errors.push('Owner phone must contain only digits, spaces, and phone formatting characters');
      }
    }
  }

  if (notes !== undefined && typeof notes !== 'string') {
    errors.push('Notes must be a string');
  }

  // Check for extra fields
  const allowedFields = [
    'licensePlate', 'vehicleType', 'rateType', 'make', 'model', 'color', 'year',
    'ownerId', 'ownerName', 'ownerEmail', 'ownerPhone', 'notes'
  ];
  const providedFields = Object.keys(req.body);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    errors.push(`Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${allowedFields.join(', ')}`);
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid vehicle data',
      errors: errors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Validate vehicle update request
 * Similar to creation but allows partial updates and excludes immutable fields
 */
export const validateVehicleUpdate = (
  req: TypedRequest<VehicleUpdateBody>, 
  res: Response, 
  next: NextFunction
): void => {
  const body = req.body;
  const errors: string[] = [];

  // Check for immutable fields
  const immutableFields = ['licensePlate', 'checkInTime', 'createdAt', 'spotId'];
  const providedImmutableFields = immutableFields.filter(field => field in body);

  if (providedImmutableFields.length > 0) {
    errors.push(`Cannot update immutable fields: ${providedImmutableFields.join(', ')}`);
  }

  // Validate provided fields using the same logic as creation (excluding required checks)
  if ('vehicleType' in body) {
    const validVehicleTypes: VehicleType[] = ['compact', 'standard', 'oversized'];
    if (!validVehicleTypes.includes(body.vehicleType as VehicleType)) {
      errors.push(`Invalid vehicle type: ${body.vehicleType}. Valid types: ${validVehicleTypes.join(', ')}`);
    }
  }

  if ('rateType' in body) {
    const validRateTypes: RateType[] = ['hourly', 'daily', 'monthly'];
    if (!validRateTypes.includes(body.rateType as RateType)) {
      errors.push(`Invalid rate type: ${body.rateType}. Valid types: ${validRateTypes.join(', ')}`);
    }
  }

  // Validate string fields
  const stringFields = ['make', 'model', 'color', 'ownerName', 'ownerId', 'notes'];
  stringFields.forEach(field => {
    if (field in body && body[field as keyof typeof body] !== undefined && typeof body[field as keyof typeof body] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  });

  // Validate year
  if ('year' in body && body.year !== undefined) {
    if (typeof body.year !== 'number' || !Number.isInteger(body.year)) {
      errors.push('Year must be an integer');
    } else {
      const currentYear = new Date().getFullYear();
      if (body.year < 1900 || body.year > currentYear + 1) {
        errors.push(`Year must be between 1900 and ${currentYear + 1}`);
      }
    }
  }

  // Validate email
  if ('ownerEmail' in body && body.ownerEmail !== undefined && body.ownerEmail !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.ownerEmail as string)) {
      errors.push('Owner email must be a valid email address');
    }
  }

  // Validate phone
  if ('ownerPhone' in body && body.ownerPhone !== undefined && body.ownerPhone !== '') {
    const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
    if (!phoneRegex.test(body.ownerPhone as string)) {
      errors.push('Owner phone must contain only digits, spaces, and phone formatting characters');
    }
  }

  // Check for extra fields
  const allowedFields = [
    'vehicleType', 'rateType', 'make', 'model', 'color', 'year',
    'ownerId', 'ownerName', 'ownerEmail', 'ownerPhone', 'notes'
  ];
  const providedFields = Object.keys(req.body);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    errors.push(`Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${allowedFields.join(', ')}`);
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid vehicle update data',
      errors: errors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Validate vehicle ID parameter (license plate)
 */
export const validateVehicleId = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({
      success: false,
      message: 'Vehicle ID (license plate) is required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (!isValidLicensePlate(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid license plate format',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Validate vehicle query parameters for listing/searching
 */
export const validateVehicleQuery = (
  req: TypedRequest<VehicleQueryParams>, 
  res: Response, 
  next: NextFunction
): void => {
  const { vehicleType, status, page, limit, sortBy, sortOrder } = req.query;
  const errors: string[] = [];

  // Validate vehicle type filter
  if (vehicleType !== undefined) {
    const validVehicleTypes: VehicleType[] = ['compact', 'standard', 'oversized'];
    if (!validVehicleTypes.includes(vehicleType)) {
      errors.push(`Invalid vehicle type filter: ${vehicleType}. Valid types: ${validVehicleTypes.join(', ')}`);
    }
  }

  // Validate status filter
  if (status !== undefined) {
    const validStatuses = ['parked', 'checked_out_unpaid', 'completed', 'active', 'inactive'];
    if (!validStatuses.includes(status)) {
      errors.push(`Invalid status filter: ${status}. Valid statuses: ${validStatuses.join(', ')}`);
    }
  }

  // Validate pagination parameters
  if (page !== undefined) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be a positive integer between 1 and 100');
    }
  }

  // Validate sort parameters
  if (sortBy !== undefined) {
    const validSortFields = [
      'licensePlate', 'vehicleType', 'make', 'model', 'color', 'year',
      'ownerName', 'createdAt', 'updatedAt'
    ];
    if (!validSortFields.includes(sortBy)) {
      errors.push(`Invalid sort field: ${sortBy}. Valid fields: ${validSortFields.join(', ')}`);
    }
  }

  if (sortOrder !== undefined && !['asc', 'desc'].includes(sortOrder)) {
    errors.push('Sort order must be "asc" or "desc"');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: errors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Validate bulk operations request body
 */
export const validateBulkRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { vehicleIds } = req.body;
  const errors: string[] = [];

  if (!vehicleIds) {
    errors.push('vehicleIds field is required');
  } else if (!Array.isArray(vehicleIds)) {
    errors.push('vehicleIds must be an array');
  } else if (vehicleIds.length === 0) {
    errors.push('vehicleIds array cannot be empty');
  } else if (vehicleIds.length > 50) {
    errors.push('vehicleIds array cannot contain more than 50 items');
  } else {
    // Validate each vehicle ID
    vehicleIds.forEach((id, index) => {
      if (typeof id !== 'string' || !isValidLicensePlate(id)) {
        errors.push(`Invalid license plate at index ${index}: ${id}`);
      }
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid bulk request',
      errors: errors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Sanitize vehicle request data
 * Normalize and clean input data
 */
export const sanitizeVehicleRequest = (
  req: TypedRequest<VehicleRequestBody>, 
  res: Response, 
  next: NextFunction
): void => {
  const body = req.body;

  // Sanitize license plate
  if (body.licensePlate && typeof body.licensePlate === 'string') {
    body.licensePlate = body.licensePlate.trim().toUpperCase().replace(/\s+/g, '');
  }

  // Sanitize string fields
  const stringFields = ['make', 'model', 'color', 'ownerName', 'ownerId', 'ownerEmail', 'ownerPhone', 'notes'];
  stringFields.forEach(field => {
    if (body[field as keyof typeof body] && typeof body[field as keyof typeof body] === 'string') {
      body[field as keyof typeof body] = (body[field as keyof typeof body] as string).trim();
    }
  });

  // Normalize vehicle type and rate type
  if (body.vehicleType && typeof body.vehicleType === 'string') {
    body.vehicleType = body.vehicleType.trim().toLowerCase() as VehicleType;
  }

  if (body.rateType && typeof body.rateType === 'string') {
    body.rateType = body.rateType.trim().toLowerCase() as RateType;
  }

  // Normalize email
  if (body.ownerEmail && typeof body.ownerEmail === 'string') {
    body.ownerEmail = body.ownerEmail.trim().toLowerCase();
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
      optionalFields: [
        'vehicleType', 'rateType', 'make', 'model', 'color', 'year',
        'ownerId', 'ownerName', 'ownerEmail', 'ownerPhone', 'notes'
      ],
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Validate content type is JSON for POST/PUT requests
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    res.status(400).json({
      success: false,
      message: 'Content-Type must be application/json',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};