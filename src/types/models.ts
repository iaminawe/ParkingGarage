/**
 * Core data model type definitions for the parking garage system
 *
 * These interfaces define the structure for vehicles, spots, and garage
 * configuration objects used throughout the application.
 */

// Common types used across multiple models
export type VehicleType = 'compact' | 'standard' | 'oversized';
export type RateType = 'hourly' | 'daily' | 'monthly';
export type SpotStatus = 'available' | 'occupied';
export type VehicleStatus = 'parked' | 'checked_out_unpaid' | 'completed';
export type SpotFeature = 'ev_charging' | 'handicap';

// Vehicle-related interfaces
export interface VehicleData {
  licensePlate: string;
  spotId: string;
  checkInTime: string;
  vehicleType: VehicleType;
  rateType: RateType;
}

export interface VehicleRecord extends VehicleData {
  checkOutTime: string | null;
  totalAmount: number;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleSummary {
  licensePlate: string;
  spotId: string;
  checkInTime: string;
  checkOutTime: string | null;
  durationMinutes: number;
  durationHours: number;
  totalAmount: number;
  isPaid: boolean;
  status: VehicleStatus;
}

// Parking spot interfaces
export interface SpotData {
  id: string;
  floor: number;
  bay: number;
  spotNumber: number;
  type: VehicleType;
  status: SpotStatus;
  features: SpotFeature[];
  currentVehicle: string | null;
}

export interface SpotRecord extends SpotData {
  createdAt: string;
  updatedAt: string;
}

// Garage configuration interfaces
export interface FloorConfig {
  number: number;
  bays: number;
  spotsPerBay: number;
}

export interface RateStructure {
  compact: number;
  standard: number;
  oversized: number;
}

export interface SpotTypeConfig {
  [key: string]: {
    name: string;
    multiplier: number;
    description: string;
  };
}

export interface GarageConfig {
  name: string;
  floors: FloorConfig[];
  rates: RateStructure;
  spotTypes: SpotTypeConfig;
}

export interface GarageRecord extends GarageConfig {
  createdAt: string;
  updatedAt: string;
}

// Search and filter interfaces
export interface SearchCriteria {
  licensePlate?: string;
  spotId?: string;
  floor?: number;
  vehicleType?: VehicleType;
  status?: SpotStatus | VehicleStatus;
  features?: SpotFeature[];
  dateFrom?: string;
  dateTo?: string;
}

export interface FilterOptions {
  available?: boolean;
  vehicleType?: VehicleType;
  features?: SpotFeature[];
  floor?: number;
  bay?: number;
}

// Pagination interfaces
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  totalItems: number; // Kept for backward compatibility
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  hasPrevPage: boolean; // Added for BaseAdapter compatibility
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Service response interfaces
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Statistics and reporting interfaces
export interface GarageStats {
  totalSpots: number;
  availableSpots: number;
  occupiedSpots: number;
  occupancyRate: number;
  spotsByType: Record<VehicleType, number>;
  spotsByFloor: Record<number, number>;
  totalRevenue: number;
  avgParkingDuration: number;
}

export interface ParkingSession {
  id?: string;
  vehicleId?: string;
  licensePlate: string;
  vehicleType?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  spotId: string;
  floor?: number;
  bay?: number;
  spotNumber?: string;
  garageId?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  endTime?: string;
  expectedEndTime?: string;
  checkInTime?: string;
  checkOutTime?: string;
  startTime?: string;
  duration?: number;
  hourlyRate?: number;
  isPaid?: boolean;
  paymentMethod?: string;
  paymentTime?: string;
  cost?: number;
  totalAmount?: number;
  amountPaid?: number;
  amount?: number;
  rateType?: string;
  endReason?: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Error types
export interface ParkingError extends Error {
  code: string;
  details?: unknown;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
