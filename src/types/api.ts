/**
 * API request and response type definitions
 * 
 * These interfaces define the structure for HTTP requests and responses
 * used by the REST API endpoints.
 */

import {
  VehicleRecord,
  SpotRecord,
  GarageRecord,
  VehicleType,
  RateType,
  SpotFeature,
  PaginatedResult,
  ServiceResponse,
  GarageStats,
  ParkingSession,
  SearchCriteria,
  FilterOptions,
  PaginationOptions
} from './models';

// Re-export commonly used types
export { ParkingSession, VehicleRecord, SpotRecord, GarageRecord };
export { VehicleRecord as Vehicle, SpotRecord as ParkingSpot };

// Paginated response structure
export interface PaginatedResponse<T = any> {
  data: T;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Common API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  timestamp: string;
  requestId?: string;
}

// Error response structure
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path?: string;
}

// Vehicle check-in request
export interface CheckInRequest {
  licensePlate: string;
  vehicleType?: VehicleType;
  rateType?: RateType;
  spotId?: string;
}

export interface CheckInResponse {
  vehicle: VehicleRecord;
  spot: SpotRecord;
  message: string;
}

// Vehicle check-out request
export interface CheckOutRequest {
  licensePlate: string;
  paymentAmount?: number;
}

export interface CheckOutResponse {
  vehicle: VehicleRecord;
  spot: SpotRecord;
  receipt: {
    licensePlate: string;
    spotId: string;
    checkInTime: string;
    checkOutTime: string;
    duration: string;
    totalAmount: number;
    amountPaid: number;
    change: number;
  };
  message: string;
}

// Payment request
export interface PaymentRequest {
  licensePlate: string;
  amount: number;
  paymentMethod?: 'cash' | 'card' | 'mobile';
}

export interface PaymentResponse {
  transactionId: string;
  licensePlate: string;
  amount: number;
  change: number;
  paymentMethod: string;
  timestamp: string;
  receipt: {
    licensePlate: string;
    spotId: string;
    totalAmount: number;
    amountPaid: number;
    change: number;
  };
}

// Spot management requests
export interface CreateSpotRequest {
  floor: number;
  bay: number;
  spotNumber: number;
  type: VehicleType;
  features?: SpotFeature[];
}

export interface UpdateSpotRequest {
  type?: VehicleType;
  features?: SpotFeature[];
  status?: 'available' | 'occupied' | 'maintenance';
}

// Garage configuration requests
export interface UpdateGarageConfigRequest {
  name?: string;
  rates?: {
    compact?: number;
    standard?: number;
    oversized?: number;
  };
}

// Search and filter requests
export interface SearchVehiclesRequest extends SearchCriteria {
  pagination?: any;
}

export interface SearchSpotsRequest extends FilterOptions {
  pagination?: any;
}

// Bulk operations
export interface BulkSpotCreateRequest {
  floors: Array<{
    number: number;
    bays: number;
    spotsPerBay: number;
    defaultType?: VehicleType;
    defaultFeatures?: SpotFeature[];
  }>;
}

export interface BulkSpotUpdateRequest {
  spotIds: string[];
  updates: UpdateSpotRequest;
}

// Statistics and reporting requests
export interface ReportRequest {
  dateFrom?: string;
  dateTo?: string;
  floor?: number;
  vehicleType?: VehicleType;
  format?: 'json' | 'csv' | 'pdf';
}

export interface StatsResponse {
  stats: GarageStats;
  period: {
    from: string;
    to: string;
  };
  generatedAt: string;
}

// Real-time updates (WebSocket)
export interface WebSocketMessage<T = any> {
  type: 'spot_status_change' | 'vehicle_checkin' | 'vehicle_checkout' | 'garage_stats_update';
  data: T;
  timestamp: string;
}

export interface SpotStatusUpdateMessage {
  spotId: string;
  oldStatus: 'available' | 'occupied';
  newStatus: 'available' | 'occupied';
  vehicleLicensePlate?: string;
}

export interface VehicleEventMessage {
  event: 'checkin' | 'checkout';
  vehicle: VehicleRecord;
  spot: SpotRecord;
  timestamp: string;
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'connected' | 'disconnected';
    cache: 'connected' | 'disconnected';
    storage: 'available' | 'unavailable';
  };
  stats: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

// API versioning
export interface ApiVersion {
  version: string;
  deprecated: boolean;
  supportedUntil?: string;
  endpoints: string[];
}

// Rate limiting response headers (for middleware)
export interface RateLimitHeaders {
  'X-RateLimit-Limit': number;
  'X-RateLimit-Remaining': number;
  'X-RateLimit-Reset': number;
  'X-RateLimit-RetryAfter'?: number;
}

// Middleware context extensions
export interface RequestMetadata {
  requestId: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  correlationId?: string;
}

// OpenAPI/Swagger schema types
export interface SwaggerDefinition {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    responses: Record<string, any>;
  };
}

// Generic paginated API response
export type PaginatedApiResponse<T> = ApiResponse<PaginatedResult<T>>;

// Service layer response types (internal)
export type VehicleServiceResponse<T = VehicleRecord> = ServiceResponse<T>;
export type SpotServiceResponse<T = SpotRecord> = ServiceResponse<T>;
export type GarageServiceResponse<T = GarageRecord> = ServiceResponse<T>;