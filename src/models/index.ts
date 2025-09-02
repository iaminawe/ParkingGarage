/**
 * Model exports for the parking garage system
 *
 * This module provides centralized exports for all model classes
 * and types, making it easy to import them throughout the application.
 *
 * @module Models
 */

export { Vehicle } from './Vehicle';
export { Spot } from './spot';
export { Garage } from './garage';

// Re-export types for convenience
export type {
  VehicleData,
  VehicleRecord,
  VehicleSummary,
  VehicleType,
  RateType,
  VehicleStatus,
  SpotData,
  SpotRecord,
  SpotStatus,
  SpotFeature,
  GarageConfig,
  GarageRecord,
  FloorConfig,
  RateStructure,
  SpotTypeConfig,
  SearchCriteria,
  FilterOptions,
  PaginationOptions,
  PaginatedResult,
  ValidationResult,
  ServiceResponse,
  GarageStats,
  ParkingSession,
  ParkingError,
  Optional,
  RequiredFields,
  DeepReadonly,
} from '../types/models';

// Default exports for CommonJS compatibility
import Vehicle from './Vehicle';
import Spot from './spot';
import Garage from './garage';

export default {
  Vehicle,
  Spot,
  Garage,
};
