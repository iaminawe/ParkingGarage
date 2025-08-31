/**
 * Vehicle and parking session type definitions
 */

import { 
  LicensePlate, 
  SpotId, 
  VehicleType, 
  RateType, 
  VehicleStatus, 
  Timestamp, 
  Currency,
  Duration,
  DurationBreakdown
} from './common.js';

// Vehicle data types
export interface VehicleData {
  licensePlate: LicensePlate;
  spotId: SpotId;
  vehicleType: VehicleType;
  rateType: RateType;
  checkInTime: Timestamp;
  checkOutTime?: Timestamp;
  totalAmount: Currency;
  isPaid: boolean;
  status: VehicleStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VehicleCreateData {
  licensePlate: LicensePlate;
  spotId: SpotId;
  vehicleType: VehicleType;
  rateType: RateType;
}

export interface VehicleUpdateData {
  checkOutTime?: Timestamp;
  totalAmount?: Currency;
  isPaid?: boolean;
  status?: VehicleStatus;
}

// Vehicle location and spot information
export interface VehicleLocationInfo {
  licensePlate: LicensePlate;
  spotId: SpotId;
  checkInTime: Timestamp;
  vehicleType: VehicleType;
  rateType: RateType;
  currentDuration: Duration;
  totalAmount: Currency;
  isPaid: boolean;
  status: VehicleStatus;
  spot: {
    floor: number;
    bay: number;
    spotNumber: number;
    type: string;
    features: string[];
  } | null;
}

// Vehicle search and lookup types
export interface VehicleLookupResult {
  found: boolean;
  vehicle: VehicleLocationInfo | null;
  message?: string;
}

export interface VehicleSearchOptions {
  maxResults?: number;
  threshold?: number;
  mode?: 'partial' | 'fuzzy' | 'all';
}

export interface VehicleSearchMatch {
  licensePlate: LicensePlate;
  score: number;
  matchType: 'exact' | 'partial' | 'fuzzy';
  vehicle: {
    spotId: SpotId;
    checkInTime: Timestamp;
    vehicleType: VehicleType;
    currentDuration: Duration;
    status: VehicleStatus;
  };
  spot: {
    floor: number;
    bay: number;
    spotNumber: number;
    type: string;
  } | null;
}

export interface VehicleSearchResult {
  matches: VehicleSearchMatch[];
  count: number;
  searchTerm: string;
  mode: string;
  errors?: string[];
}

// Vehicle location search types
export interface LocationSearchCriteria {
  floor?: number;
  bay?: number;
  spotId?: SpotId;
}

// Parking statistics types
export interface ParkingStats {
  parked: number;
  checkedOut: number;
  unpaid: number;
  completed: number;
  total: number;
}

export interface RevenueStats {
  totalRevenue: Currency;
  pendingRevenue: Currency;
  averageRevenue: Currency;
  completedSessions: number;
}

// Vehicle repository interface
export interface IVehicleRepository {
  findById(licensePlate: LicensePlate): VehicleData | null;
  findBySpotId(spotId: SpotId): VehicleData | null;
  findParked(): VehicleData[];
  findAll(): VehicleData[];
  checkIn(licensePlate: LicensePlate, spotId: SpotId, vehicleType: VehicleType, rateType: RateType): VehicleData;
  update(licensePlate: LicensePlate, updates: VehicleUpdateData): VehicleData | null;
  delete(licensePlate: LicensePlate): boolean;
  exists(licensePlate: LicensePlate): boolean;
  getParkingStats(): ParkingStats;
  getRevenueStats(): RevenueStats;
  clear(): void;
}

// Search service interface
export interface ISearchService {
  findVehicleByLicensePlate(licensePlate: LicensePlate): Promise<VehicleLookupResult>;
  searchVehicles(searchTerm: string, options?: VehicleSearchOptions): Promise<VehicleSearchResult>;
  findVehiclesByLocation(location?: LocationSearchCriteria): Promise<VehicleLocationInfo[]>;
  findAvailableSpots(criteria?: any): Promise<any[]>;
  getSearchSuggestions(partial: string, limit?: number): Promise<LicensePlate[]>;
  clearCache(): void;
}