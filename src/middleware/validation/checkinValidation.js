/**
 * Check-in validation middleware
 * 
 * This module provides Express middleware functions for validating
 * vehicle check-in requests, including license plate format,
 * vehicle type validation, and request body sanitization.
 * 
 * @module CheckinValidation
 */

const { isValidLicensePlate } = require('../../utils/validators');

/**
 * Validate check-in request body
 * Validates license plate and vehicle type from request body
 */
const validateCheckinRequest = (req, res, next) => {
  const { licensePlate, vehicleType, rateType } = req.body;
  const errors = [];

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
    return res.status(400).json({
      success: false,
      message: 'Invalid check-in data',
      errors: errors,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Sanitize check-in request data
 * Normalize license plate to uppercase and trim whitespace
 */
const sanitizeCheckinRequest = (req, res, next) => {
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
const validateRequestBody = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Request body is required',
      requiredFields: ['licensePlate', 'vehicleType'],
      optionalFields: ['rateType'],
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Validate content type is JSON
 */
const validateContentType = (req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(400).json({
      success: false,
      message: 'Content-Type must be application/json',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

module.exports = {
  validateCheckinRequest,
  sanitizeCheckinRequest,
  validateRequestBody,
  validateContentType
};