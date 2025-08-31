/**
 * Common type definitions used across the parking garage system
 */

// Basic value types
export type LicensePlate = string;
export type SpotId = string;
export type Timestamp = string;
export type Currency = number;

// Enumeration types
export type VehicleType = 'compact' | 'standard' | 'oversized';
export type SpotType = 'compact' | 'standard' | 'oversized';
export type SpotStatus = 'available' | 'occupied';
export type RateType = 'hourly' | 'daily' | 'monthly';
export type VehicleStatus = 'parked' | 'checked_out' | 'payment_pending' | 'checked_out_unpaid' | 'completed';
export type SpotFeature = 'ev_charging' | 'handicap';

// Location and identification types
export interface SpotLocation {
  floor: number;
  bay: number;
  spot: number;
}

export interface SpotIdentifier extends SpotLocation {
  spotId: SpotId;
}

// Duration and time types
export interface Duration {
  hours: number;
  minutes: number;
  totalMinutes: number;
}

export interface DurationBreakdown extends Duration {
  totalHours: number;
  billableHours: number;
}

// Pagination types
export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface PaginationResult {
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Filter and search types
export interface SpotFilters {
  status?: SpotStatus;
  type?: SpotType;
  floor?: number;
  bay?: number;
  features?: SpotFeature[];
}

export interface SortOptions {
  sort?: string;
  order?: 'asc' | 'desc';
}

// Error types
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

// Response wrapper types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  timestamp: Timestamp;
  processingTimeMs?: number;
  requestId?: string;
}

// Occupancy and statistics types
export interface OccupancyStats {
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number;
}

export interface TypedOccupancyStats {
  compact: OccupancyStats;
  standard: OccupancyStats;
  oversized: OccupancyStats;
}

// Feature distribution types
export interface FeatureDistribution {
  ev_charging: number;
  handicap: number;
  regular: number;
}

// Revenue types
export interface RevenueStats {
  totalRevenue: Currency;
  pendingRevenue: Currency;
  averageRevenue: Currency;
  completedSessions: number;
}

// Generic filter type for dynamic filtering
export type FilterValue = string | number | boolean | string[] | number[];
export interface GenericFilters {
  [key: string]: FilterValue;
}

// Status types for various operations
export interface OperationStatus {
  success: boolean;
  message: string;
  timestamp: Timestamp;
}

export interface OperationResult<T> extends OperationStatus {
  data?: T;
}