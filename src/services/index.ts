/**
 * Services module index
 *
 * Centralized exports for all service classes in the parking garage system.
 * This module provides easy access to all business logic services.
 *
 * @module Services
 */

export { GarageService } from './garageService';
export { SpotService } from './spotService';
export { SearchService } from './searchService';
export { SocketService } from './SocketService';
export { socketIORegistry } from './SocketIORegistry';

// Re-export types that services commonly use for convenience
export type {
  VehicleType,
  RateType,
  SpotStatus,
  VehicleStatus,
  SpotFeature,
  VehicleData,
  VehicleRecord,
  VehicleSummary,
  SpotData,
  SpotRecord,
  FloorConfig,
  RateStructure,
  SpotTypeConfig,
  GarageConfig,
  GarageRecord,
  SearchCriteria,
  FilterOptions,
  PaginationOptions,
  PaginatedResult,
  ValidationResult,
  ServiceResponse,
  GarageStats,
  ParkingSession,
  ParkingError,
} from '../types/models';
