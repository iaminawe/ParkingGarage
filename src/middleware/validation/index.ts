/**
 * Validation middleware index
 *
 * Central export point for all validation middleware functions.
 * This module re-exports validation functions from individual modules
 * for easy importing throughout the application.
 *
 * @module ValidationIndex
 */

// Checkout validation exports
export {
  validateCheckoutRequest,
  sanitizeCheckoutRequest,
  validateRequestBody as validateCheckoutRequestBody,
  validateContentType as validateCheckoutContentType,
  validateLicensePlateParam,
  validateCheckoutListQuery,
  validateForceCheckoutRequest,
} from './checkoutValidation';

// Check-in validation exports
export {
  validateCheckinRequest,
  sanitizeCheckinRequest,
  validateRequestBody as validateCheckinRequestBody,
  validateContentType as validateCheckinContentType,
} from './checkinValidation';

// Spot validation exports
export {
  validateSpotQuery,
  validateSpotId,
  validateSpotUpdate,
  sanitizeSpotUpdate,
  validateIncludeParams,
  validateSortParams,
} from './spotValidation';

// Garage validation exports
export {
  validateGarageInitialization,
  validateRateUpdate,
  validateGarageQuery,
  validateGarageConfigUpdate,
  requireGarageExists,
  sanitizeGarageName,
} from './garageValidation';

// Vehicle validation exports
export {
  validateVehicleCreation,
  validateVehicleUpdate,
  validateVehicleId,
  validateVehicleQuery,
  validateBulkRequest,
  sanitizeVehicleRequest,
  validateRequestBody as validateVehicleRequestBody,
  validateContentType as validateVehicleContentType,
} from './vehicleValidation';

// Session validation exports
export {
  validateSessionId,
  validateSessionQuery,
  validateEndSessionRequest,
  validateCancelSessionRequest,
  validateExtendSessionRequest,
  validateContentType as validateSessionContentType,
  validateRequestBody as validateSessionRequestBody,
  sanitizeSessionRequest,
} from './sessionValidation';
