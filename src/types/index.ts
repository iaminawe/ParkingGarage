/**
 * Type definitions entry point
 * 
 * This module re-exports all type definitions used throughout
 * the parking garage application for easy importing.
 */

// Export all model types
export * from './models';

// Export all API types
export * from './api';

// Express extensions are automatically available globally
// No need to re-export express.d.ts types

// Re-export commonly used types for convenience
export type {
  VehicleType,
  RateType,
  SpotStatus,
  VehicleStatus,
  SpotFeature,
  VehicleRecord,
  SpotRecord,
  GarageRecord,
  ServiceResponse,
  PaginatedResult,
  ValidationResult
} from './models';

export type {
  ApiResponse,
  CheckInRequest,
  CheckInResponse,
  CheckOutRequest,
  CheckOutResponse,
  SearchVehiclesRequest,
  SearchSpotsRequest,
  HealthCheckResponse
} from './api';