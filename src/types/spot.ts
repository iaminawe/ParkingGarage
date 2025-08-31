/**
 * Spot-specific type definitions
 */

import { 
  SpotId, 
  SpotType, 
  SpotStatus, 
  SpotFeature, 
  LicensePlate, 
  Timestamp, 
  PaginationParams, 
  PaginationResult, 
  SortOptions, 
  ResponseMetadata,
  OccupancyStats
} from './common.js';

// Spot data types
export interface SpotData {
  id: SpotId;
  floor: number;
  bay: number;
  spotNumber: number;
  type: SpotType;
  status: SpotStatus;
  features: SpotFeature[];
  currentVehicle?: LicensePlate;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SpotUpdateData {
  status?: SpotStatus;
  type?: SpotType;
  features?: SpotFeature[];
  currentVehicle?: LicensePlate;
}

// Spot filtering types
export interface SpotFilters {
  status?: SpotStatus;
  type?: SpotType;
  floor?: number;
  bay?: number;
  features?: SpotFeature[];
}

// Spot search and query types
export interface SpotQueryOptions {
  filters?: SpotFilters;
  pagination?: PaginationParams;
  sorting?: SortOptions;
}

export interface SpotSearchResult {
  spots: SpotData[];
  pagination: PaginationResult;
  metadata: ResponseMetadata & {
    total: number;
    filtered: number;
    hasFilters: boolean;
    filtersApplied: SpotFilters;
    statusCounts: Record<SpotStatus, number>;
    typeCounts: Record<SpotType, number>;
    featureCounts: Record<SpotFeature, number>;
    floors: number[];
    uniqueBays: number;
    occupancyRate: number;
  };
}

// Spot statistics types
export interface SpotTypeStats extends OccupancyStats {
  // extends basic occupancy stats
}

export interface SpotFeatureStats extends OccupancyStats {
  // extends basic occupancy stats
}

export interface FloorSpotStats extends OccupancyStats {
  bays: number;
}

export interface SpotStatistics extends OccupancyStats {
  floorStats: Record<number, FloorSpotStats>;
  typeStats: Record<SpotType, SpotTypeStats>;
  featureStats: Record<SpotFeature, SpotFeatureStats>;
  metadata: ResponseMetadata;
}

// Spot availability types
export interface SpotAvailabilityCriteria {
  floor?: number;
  bay?: number;
  type?: SpotType;
  features?: SpotFeature[];
}

export interface AvailableSpotInfo {
  spotId: SpotId;
  floor: number;
  bay: number;
  spotNumber: number;
  type: SpotType;
  status: SpotStatus;
  features: SpotFeature[];
}

// Spot assignment compatibility
export interface SpotCompatibility {
  vehicleType: string;
  spotType: SpotType;
  isCompatible: boolean;
  compatibilityScore: number;
}

export interface SpotAssignmentResult {
  assignedSpot: SpotData;
  compatibility: SpotCompatibility;
  alternativeSpots?: SpotData[];
}

// Spot service interface
export interface ISpotService {
  getSpots(filters?: SpotFilters, pagination?: PaginationParams, sorting?: SortOptions): Promise<SpotSearchResult>;
  getSpotById(spotId: SpotId): Promise<SpotData | null>;
  updateSpot(spotId: SpotId, updates: SpotUpdateData): Promise<(SpotData & { metadata: ResponseMetadata }) | null>;
  getSpotStatistics(): Promise<SpotStatistics>;
}