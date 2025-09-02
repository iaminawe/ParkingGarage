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

// Export all service interface types
export * from './services';

// Export all repository interface types
export * from './repositories';

// Export all middleware and validation types
export * from './middleware';

// Export JavaScript model class types
export * from './javascript-models';

// Export migration plan and analysis
export * from './migration-plan';

// Express extensions are automatically available globally
// No need to re-export express.d.ts types

// Re-export commonly used model types for convenience
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
  ValidationResult,
  ParkingSession,
  GarageStats
} from './models';

// Re-export commonly used API types for convenience
export type {
  ApiResponse,
  CheckInRequest,
  CheckInResponse,
  CheckOutRequest,
  CheckOutResponse,
  SearchVehiclesRequest,
  SearchSpotsRequest,
  HealthCheckResponse,
  PaginatedResponse
} from './api';

// Re-export commonly used service types for convenience
export type {
  ISpotAssignmentService,
  IBillingService,
  IAnalyticsService,
  SpotAssignmentResult,
  BillingResult,
  AnalyticsGarageStats
} from './services';

// Re-export commonly used repository types for convenience
export type {
  ISpotRepository,
  IVehicleRepository,
  IGarageRepository,
  IBaseRepository,
  RepositoryResult
} from './repositories';

// Re-export commonly used middleware types for convenience
export type {
  MiddlewareFunction,
  CustomRequest,
  ValidationSchema,
  ParkingGarageError,
  ErrorResponse
} from './middleware';

// Re-export JavaScript model interfaces for migration
export type {
  SpotModelInterface,
  VehicleModelInterface,
  GarageModelInterface,
  SpotConstructorData,
  VehicleConstructorData,
  GarageConstructorData
} from './javascript-models';