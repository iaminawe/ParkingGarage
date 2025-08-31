// TypeScript type definitions for test fixtures and utilities

export interface GarageConfiguration {
  floors: number;
  baysPerFloor: number;
  spotsPerBay: number;
  totalSpots: number;
}

export interface ParkingSpot {
  spotId: string;
  floor: number;
  bay: string;
  spotNumber: number;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  occupiedBy?: string | null;
  since?: string | null;
}

export interface Vehicle {
  licensePlate: string;
  type: 'standard' | 'compact' | 'oversized';
}

export interface CheckInRequest {
  licensePlate: string;
  vehicleType?: string;
}

export interface CheckInResponse {
  ticketId: string;
  licensePlate: string;
  spot: string;
  spotId: string;
  checkInTime: string;
  floor: number;
  bay: string;
}

export interface CheckOutRequest {
  licensePlate: string;
}

export interface CheckOutResponse {
  licensePlate: string;
  spot: string;
  spotId: string;
  checkInTime: string;
  checkOutTime: string;
  duration: string;
  durationFormatted: string;
  durationMinutes: number;
}

export interface ParkingSession {
  ticketId: string;
  licensePlate: string;
  spotId: string;
  checkInTime: string;
  checkOutTime: string | null;
  duration: number | null;
}

export interface VehicleSearchResult {
  found: boolean;
  licensePlate?: string;
  spot?: string;
  floor?: number;
  bay?: string;
  checkInTime?: string;
  currentDuration?: string;
  message?: string;
}

export interface GarageSummary {
  total: number;
  available: number;
  occupied: number;
  occupancyRate: string;
}

export interface SpotsResponse {
  spots: ParkingSpot[];
  summary?: GarageSummary;
  count?: number;
}

export interface FloorInfo {
  id: number;
  name: string;
  bays: string[];
}

export interface GarageStructure {
  floors: FloorInfo[];
  totalSpots: number;
}

export interface TestSeedRequest {
  occupancy?: number;
}

export interface TestSeedResponse {
  message: string;
  occupancy?: number;
}

export interface APIError {
  error: string;
  spot?: string;
}

// Mock API Response types
export interface MockRequest {
  body: any;
  params: { [key: string]: string };
  query: { [key: string]: string | undefined };
}

export interface MockResponse {
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
}

// Test utility types
export type SpotStatusFilter = 'available' | 'occupied';
export type TestDataOptions = Partial<GarageConfiguration> | Partial<ParkingSpot> | Partial<Vehicle>;

// Performance test types
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestsPerSecond: number;
}