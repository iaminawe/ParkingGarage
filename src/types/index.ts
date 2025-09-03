/**
 * Central type exports for the Parking Garage API
 * This file provides a single point of entry for all type definitions
 */

// Core model types - primary source
export type * from './models';

// API types - request/response interfaces
export type {
  ApiResponse,
  CheckInRequest,
  CheckInResponse,
  CheckOutRequest,
  CheckOutResponse,
  ReportRequest,
  UpdateSpotRequest,
  BulkSpotUpdateRequest,
  PaymentRequest,
  PaymentResponse,
  StatsResponse,
  ParkingSession,
  Vehicle,
  ParkingSpot,
  PaginatedResponse,
} from './api';

// Database types - schemas and queries
export type {
  DatabaseConfig,
  ConnectionStats,
  DatabaseHealth,
  TransactionOptions,
  DatabaseTransaction,
  QueryOptions,
  QueryResult,
  DatabaseOperationResult,
  BulkOperationResult,
  PaginatedQuery,
} from './database';

// Authentication types
export type {
  UserProfile,
  PublicUserProfile,
  SignupData,
  LoginData,
  AuthResult,
  JWTPayload,
  TokenPair,
  RefreshTokenData,
  UserSession,
  DeviceInfo,
  SecuritySettings,
  UserRole,
  Permission,
} from './auth';

// Validation types - non-conflicting exports
export type {
  DataValidationResult,
  DataValidationError,
  ValidationWarning,
  DataValidationSchema,
  FieldSchema,
  ValidationRule,
  ValidationContext,
  DataValidationOptions,
} from './validation';

// Common utility types - non-conflicting exports
export type {
  PartialExcept,
  RequiredExcept,
  DeepPartial,
  DeepRequired,
  Prettify,
  Merge,
  Override,
  NonEmptyArray,
  ResultType,
  Option,
  UUID,
  EntityId,
  Status,
  ProcessingStatus,
  HealthStatus,
} from './common';

// Re-export utility types from models for backward compatibility
// Note: DeepReadonly and DeepPartial are also defined in common.ts but models.ts versions are used via wildcard export
export type {
  Optional,
  RequiredFields,
} from './models';

// Add commonly referenced types that might be missing
export type Nullable<T> = T | null;

// Server and middleware types
export type * from './server';
export type * from './services';
export type * from './repositories';
export type * from './middleware';

// Additional specialized types
export type * from './javascript-models';

// Legacy utility types
export type StrictExtract<T, U extends T> = T extends U ? T : never;
export type NonNullable<T> = T extends null | undefined ? never : T;
