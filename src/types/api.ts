/**
 * TypeScript type definitions for Parking Garage API
 * 
 * This module defines all the request and response interfaces used
 * throughout the API controllers and routes for type safety.
 */

import { Request, Response, NextFunction } from 'express';

// Base interfaces for all API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
  [key: string]: any; // Allow additional properties
}

export interface ApiErrorResponse extends ApiResponse {
  success: false;
  error: string;
  message: string;
  suggestion?: string;
  examples?: string[];
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
    nextOffset?: number;
  };
  metadata?: Record<string, any>;
  links?: {
    next?: string;
  };
}

// Express Request Extensions
export interface TypedRequest<T = any> extends Request {
  body: T;
  filters?: Record<string, any>;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface TypedResponse<T = any> extends Response {
  json(body: ApiResponse<T>): this;
  status(code: number): this;
}

// Garage-related interfaces
export interface GarageFloorConfig {
  number: number;
  bays: number;
  spotsPerBay: number;
}

export interface GarageInitializationRequest {
  name: string;
  floors: GarageFloorConfig[];
}

export interface GarageRates {
  standard: number;
  compact: number;
  oversized: number;
  ev_charging: number;
}

export interface GarageConfigUpdateRequest {
  name?: string;
}

export interface GarageConfiguration {
  name: string;
  totalCapacity: number;
  totalFloors: number;
  floorsConfiguration: GarageFloorConfig[];
  rates: GarageRates;
  lastUpdated: string;
  statistics?: GarageStatistics;
  spots?: Spot[];
}

export interface GarageStatistics {
  totalSpots: number;
  availableSpots: number;
  occupiedSpots: number;
  occupancyRate: number;
  spotsByType: Record<SpotType, number>;
  spotsByStatus: Record<SpotStatus, number>;
  floorStatistics: Record<number, FloorStatistics>;
}

export interface FloorStatistics {
  floor: number;
  totalSpots: number;
  availableSpots: number;
  occupiedSpots: number;
  occupancyRate: number;
}

// Spot-related interfaces
export type SpotType = 'compact' | 'standard' | 'oversized';
export type SpotStatus = 'available' | 'occupied';
export type SpotFeature = 'ev_charging' | 'handicap';

export interface Spot {
  id: string;
  floor: number;
  bay: number;
  spotNumber: number;
  type: SpotType;
  status: SpotStatus;
  features?: SpotFeature[];
  metadata?: Record<string, any>;
  occupiedBy?: string;
  occupiedAt?: string;
  updatedAt: string;
}

export interface SpotUpdateRequest {
  status?: SpotStatus;
  type?: SpotType;
  features?: SpotFeature[];
}

export interface SpotFilters {
  status?: SpotStatus;
  type?: SpotType;
  floor?: number;
  bay?: number;
  features?: SpotFeature | SpotFeature[];
}

export interface SpotQueryParams extends SpotFilters {
  limit?: string;
  offset?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  include?: string;
  query?: string;
}

// Vehicle-related interfaces
export type VehicleType = 'sedan' | 'suv' | 'truck' | 'motorcycle' | 'compact' | 'other';

export interface Vehicle {
  id: string;
  licensePlate: string;
  type: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  isElectric?: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleRegistrationRequest {
  licensePlate: string;
  type: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  isElectric?: boolean;
}

export interface VehicleUpdateRequest {
  type?: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  isElectric?: boolean;
}

// Check-in/Check-out interfaces
export interface CheckInRequest {
  licensePlate: string;
  vehicleType?: VehicleType;
  spotId?: string;
  spotPreference?: SpotType;
  isElectric?: boolean;
}

export interface CheckInResponse {
  transactionId: string;
  vehicle: Vehicle;
  spot: Spot;
  checkInTime: string;
  estimatedRate: number;
  message: string;
}

export interface CheckOutRequest {
  licensePlate?: string;
  spotId?: string;
  transactionId?: string;
}

export interface CheckOutResponse {
  transactionId: string;
  vehicle: Vehicle;
  spot: Spot;
  checkInTime: string;
  checkOutTime: string;
  duration: {
    hours: number;
    minutes: number;
    totalMinutes: number;
  };
  charges: {
    rate: number;
    amount: number;
    breakdown: Record<string, number>;
  };
  message: string;
}

// Transaction interfaces
export interface ParkingTransaction {
  id: string;
  vehicle: Vehicle;
  spot: Spot;
  checkInTime: string;
  checkOutTime?: string;
  duration?: {
    hours: number;
    minutes: number;
    totalMinutes: number;
  };
  charges?: {
    rate: number;
    amount: number;
    breakdown: Record<string, number>;
  };
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// Statistics interfaces
export interface StatsFilters {
  startDate?: string;
  endDate?: string;
  floor?: number;
  spotType?: SpotType;
}

export interface DetailedStatistics {
  overview: {
    totalTransactions: number;
    totalRevenue: number;
    averageDuration: number;
    occupancyRate: number;
  };
  timeRange: {
    from: string;
    to: string;
    duration: string;
  };
  transactions: ParkingTransaction[];
  spotUtilization: Record<string, number>;
  revenueBreakdown: Record<string, number>;
  peakHours: Array<{
    hour: number;
    transactions: number;
    revenue: number;
  }>;
}

// Middleware interfaces
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidatedRequest<T = any> extends TypedRequest<T> {
  validationErrors?: ValidationError[];
}

// Controller method signature types
export type ControllerMethod<TReq = any, TRes = any> = (
  req: TypedRequest<TReq>, 
  res: TypedResponse<TRes>, 
  next?: NextFunction
) => Promise<void> | void;

export type AsyncControllerMethod<TReq = any, TRes = any> = (
  req: TypedRequest<TReq>, 
  res: TypedResponse<TRes>, 
  next?: NextFunction
) => Promise<void>;