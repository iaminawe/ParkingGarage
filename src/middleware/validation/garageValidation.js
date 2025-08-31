/**
 * Garage validation middleware
 *
 * This module provides validation middleware for garage management endpoints.
 * It validates input data for garage initialization, configuration updates,
 * and rate changes to ensure data integrity before processing.
 *
 * @module GarageValidation
 */

/**
 * Validate garage initialization data
 */
function validateGarageInitialization(req, res, next) {
  const { body } = req;
  const errors = [];

  // Validate required fields
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('Garage name is required and must be a non-empty string');
  }

  if (!Array.isArray(body.floors) || body.floors.length === 0) {
    errors.push('Floors array is required and must not be empty');
  }

  // Validate floors array
  if (Array.isArray(body.floors)) {
    body.floors.forEach((floor, index) => {
      if (typeof floor.number !== 'number' || floor.number < 1) {
        errors.push(`Floor ${index + 1}: number must be a positive integer`);
      }
      if (typeof floor.bays !== 'number' || floor.bays < 1 || floor.bays > 50) {
        errors.push(`Floor ${index + 1}: bays must be between 1 and 50`);
      }
      if (typeof floor.spotsPerBay !== 'number' || floor.spotsPerBay < 1 || floor.spotsPerBay > 100) {
        errors.push(`Floor ${index + 1}: spotsPerBay must be between 1 and 100`);
      }
    });

    // Check for duplicate floor numbers
    const floorNumbers = body.floors.map(f => f.number);
    const duplicates = floorNumbers.filter((num, idx) => floorNumbers.indexOf(num) !== idx);
    if (duplicates.length > 0) {
      errors.push(`Duplicate floor numbers found: ${[...new Set(duplicates)].join(', ')}`);
    }

    // Validate total spots don't exceed reasonable limits
    const totalSpots = body.floors.reduce((sum, floor) => sum + (floor.bays * floor.spotsPerBay), 0);
    if (totalSpots > 10000) {
      errors.push('Total garage capacity cannot exceed 10,000 spots');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Invalid garage initialization data',
      details: errors
    });
  }

  next();
}

/**
 * Validate rate update data
 */
function validateRateUpdate(req, res, next) {
  const { body } = req;
  const errors = [];

  // Check if body has at least one rate field
  const validRateTypes = ['standard', 'compact', 'oversized', 'ev_charging'];
  const providedRates = Object.keys(body).filter(key => validRateTypes.includes(key));

  if (providedRates.length === 0) {
    errors.push(`At least one rate type must be provided: ${validRateTypes.join(', ')}`);
  }

  // Validate each provided rate
  validRateTypes.forEach(rateType => {
    if (body.hasOwnProperty(rateType)) {
      const rate = body[rateType];
      if (typeof rate !== 'number' || rate < 0 || rate > 1000) {
        errors.push(`${rateType} rate must be a number between 0 and 1000`);
      }
    }
  });

  // Check for invalid rate types
  const invalidRates = Object.keys(body).filter(key => !validRateTypes.includes(key));
  if (invalidRates.length > 0) {
    errors.push(`Invalid rate types: ${invalidRates.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Invalid rate update data',
      details: errors
    });
  }

  next();
}

/**
 * Validate garage configuration query parameters
 */
function validateGarageQuery(req, res, next) {
  const { includeStats, includeSpots } = req.query;
  const errors = [];

  // Validate boolean parameters
  if (includeStats !== undefined && !['true', 'false'].includes(includeStats)) {
    errors.push('includeStats parameter must be "true" or "false"');
  }

  if (includeSpots !== undefined && !['true', 'false'].includes(includeSpots)) {
    errors.push('includeSpots parameter must be "true" or "false"');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: errors
    });
  }

  // Convert string booleans to actual booleans
  req.query.includeStats = includeStats === 'true';
  req.query.includeSpots = includeSpots === 'true';

  next();
}

/**
 * Validate garage configuration data for updates
 */
function validateGarageConfigUpdate(req, res, next) {
  const { body } = req;
  const errors = [];

  // Only allow specific fields to be updated
  const allowedFields = ['name'];
  const providedFields = Object.keys(body);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    errors.push(`Invalid fields for update: ${invalidFields.join(', ')}`);
  }

  // Validate name if provided
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      errors.push('Garage name must be a non-empty string');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Invalid garage configuration update',
      details: errors
    });
  }

  next();
}

/**
 * Middleware to validate that a garage exists before operations
 */
function requireGarageExists(req, res, next) {
  // This will be used in the controller to check garage existence
  // We'll pass this through for now and handle it in the controller
  next();
}

/**
 * Sanitize garage name input
 */
function sanitizeGarageName(req, res, next) {
  if (req.body.name && typeof req.body.name === 'string') {
    req.body.name = req.body.name.trim();
  }
  next();
}

module.exports = {
  validateGarageInitialization,
  validateRateUpdate,
  validateGarageQuery,
  validateGarageConfigUpdate,
  requireGarageExists,
  sanitizeGarageName
};
