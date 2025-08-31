/**
 * Type definitions index - exports all types for easy importing
 */

// Re-export all common types (excluding conflicting ones)
export type {
  LicensePlate,
  SpotId,
  Timestamp,
  Currency,
  VehicleType,
  SpotType,
  SpotStatus,
  RateType,
  VehicleStatus,
  SpotFeature,
  SpotLocation,
  SpotIdentifier,
  Duration,
  DurationBreakdown,
  PaginationParams,
  PaginationResult,
  SortOptions,
  ServiceError,
  ServiceResponse,
  ResponseMetadata,
  OccupancyStats,
  TypedOccupancyStats,
  FeatureDistribution,
  GenericFilters,
  FilterValue,
  OperationStatus,
  OperationResult
} from './common.js';

// Import and re-export API types
export type {
  ApiResponse,
  ApiErrorResponse as ApiError,
  PaginatedResponse
} from './api.js';

// Re-export all service-specific types
export * from './garage.js';
export * from './vehicle.js';
export * from './billing.js';
export * from './checkin.js';
export * from './analytics.js';
export * from './spotAssignment.js';

// Export legacy interface aliases for backward compatibility
export type {
  IGarageService,
  FloorConfiguration as FloorConfig,
  GarageRates as RateStructure,
  SpotTypeConfigs as SpotTypeConfigurations
} from './garage.js';

export type {
  IVehicleRepository,
  ISearchService,
  VehicleData as IVehicle
} from './vehicle.js';

export type {
  SpotData as ISpot,
  ISpotService
} from './spot.js';

// Export ValidationResult from models
export type { ValidationResult } from '../models/ts-types/types.js';

// Export garage interface for storage
export type IGarage = import('./garage.js').GarageConfiguration;

// Export checkout types selectively to avoid conflicts
export type {
  ICheckoutService,
  CheckoutResult,
  CheckoutStatistics,
  CheckoutSimulationResult,
  VehicleReadyForCheckout,
  ForcedCheckoutResult,
  CheckoutTiming,
  CheckoutBilling,
  CheckoutLocation,
  CheckoutSpotDetails,
  CheckoutVehicleInfo
} from './checkout.js';

// Re-export spot types with specific naming to avoid conflicts
export type {
  SpotData,
  SpotUpdateData,
  SpotFilters,
  SpotQueryOptions,
  SpotSearchResult,
  SpotStatistics,
  SpotTypeStats,
  SpotFeatureStats,
  FloorSpotStats,
  SpotAvailabilityCriteria,
  AvailableSpotInfo,
  SpotCompatibility,
  SpotAssignmentResult
} from './spot.js';

// Service interface collection for dependency injection
export interface ServiceContainer {
  garageService: import('./garage.js').IGarageService;
  spotService: import('./spot.js').ISpotService;
  searchService: import('./vehicle.js').ISearchService;
  checkinService: import('./checkin.js').ICheckinService;
  checkoutService: import('./checkout.js').ICheckoutService;
  billingService: import('./billing.js').IBillingService;
  analyticsService: import('./analytics.js').IAnalyticsService;
  spotAssignmentService: import('./spotAssignment.js').ISpotAssignmentService;
}

// Repository interface collection
export interface RepositoryContainer {
  vehicleRepository: import('./vehicle.js').IVehicleRepository;
  // Add other repository interfaces as needed
}

// Error handling types
export class ServiceValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ServiceValidationError';
  }
}

export class ServiceOperationError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ServiceOperationError';
  }
}

export class ServiceNotFoundError extends Error {
  constructor(
    public resourceType: string,
    public resourceId: string
  ) {
    super(`${resourceType} with ID '${resourceId}' not found`);
    this.name = 'ServiceNotFoundError';
  }
}

// Utility type helpers
export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Partial<T> = { [P in keyof T]?: T[P] };
export type Required<T> = { [P in keyof T]-?: T[P] };

// Type guard helpers
export function isValidSpotType(value: string): value is import('./common.js').SpotType {
  return ['compact', 'standard', 'oversized'].includes(value);
}

export function isValidVehicleType(value: string): value is import('./common.js').VehicleType {
  return ['compact', 'standard', 'oversized'].includes(value);
}

export function isValidRateType(value: string): value is import('./common.js').RateType {
  return ['hourly', 'daily', 'monthly'].includes(value);
}

export function isValidSpotFeature(value: string): value is import('./common.js').SpotFeature {
  return ['ev_charging', 'handicap'].includes(value);
}