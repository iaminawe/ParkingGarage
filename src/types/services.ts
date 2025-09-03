/**
 * Service interface definitions for the parking garage system
 *
 * These interfaces define the contracts for service layer classes,
 * supporting both existing TypeScript services and JavaScript services
 * that will be migrated to TypeScript.
 */

import {
  VehicleRecord,
  SpotRecord,
  GarageRecord,
  ServiceResponse,
  SearchCriteria,
  FilterOptions,
  VehicleType,
  SpotFeature,
  ParkingSession,
  GarageStats,
} from './models';

// Spot Assignment Service Types
export interface VehicleSpotCompatibility {
  compact: VehicleType[];
  standard: VehicleType[];
  oversized: VehicleType[];
}

export interface SpotScore {
  spot: SpotRecord;
  score: number;
}

export interface SpotAssignmentResult {
  success: boolean;
  assignedSpot?: SpotRecord;
  spotLocation?: {
    floor: number;
    bay: number;
    spot: number;
  };
  compatibility?: {
    vehicleType: VehicleType;
    spotType: VehicleType;
    isExactMatch: boolean;
  };
  availability?: {
    total: number;
    bySpotType: Record<VehicleType, number>;
    hasAvailable: boolean;
  };
  message?: string;
  availableCount?: number;
}

export interface SpotAssignmentStats {
  totalSpots: number;
  availableSpots: number;
  occupancyRate: string;
  byVehicleType: Record<
    VehicleType,
    {
      availableSpots: number;
      hasAvailableSpot: boolean;
      wouldAssignTo: {
        spotId: string;
        spotType: VehicleType;
        floor: number;
      } | null;
    }
  >;
  timestamp: string;
}

export interface ISpotAssignmentService {
  findBestAvailableSpot(vehicleType: VehicleType): SpotRecord | null;
  applyAssignmentAlgorithm(compatibleSpots: SpotRecord[], vehicleType: VehicleType): SpotRecord;
  calculateSpotScore(spot: SpotRecord, vehicleType: VehicleType): number;
  isCompatible(vehicleType: VehicleType, spotType: VehicleType): boolean;
  getCompatibleSpotTypes(vehicleType: VehicleType): VehicleType[];
  getAvailabilityByVehicleType(vehicleType: VehicleType): SpotAssignmentResult['availability'];
  simulateAssignment(vehicleType: VehicleType): SpotAssignmentResult;
  getAssignmentStats(): SpotAssignmentStats;
}

// Billing Service Types
export interface BillingRates {
  compact: number;
  standard: number;
  oversized: number;
}

export interface FeaturePremiums {
  ev_charging: number;
  handicap: number;
}

export interface RateTypeMultipliers {
  hourly: number;
  daily: number;
  monthly: number;
}

export interface RateTypeCaps {
  daily: number;
  monthly: number;
}

export interface BillingParams {
  totalMinutes: number;
  spotType: VehicleType;
  spotFeatures?: SpotFeature[];
  rateType?: 'hourly' | 'daily' | 'monthly';
  customRate?: number;
  applyGrace?: boolean;
  gracePeriodMinutes?: number;
}

export interface BillingBreakdown {
  baseCharge: number;
  featurePremiums: Record<string, number>;
  rateTypeAdjustment: number;
  gracePeriodApplied: boolean;
}

export interface BillingResult {
  duration: {
    totalMinutes: number;
    totalHours: number;
    billableHours: number;
  };
  rates: {
    baseRatePerHour: number;
    featurePremiumsPerHour: number;
    effectiveRatePerHour: number;
  };
  billing: {
    subtotal: number;
    rateTypeDiscount: number;
    totalAmount: number;
  };
  spotInfo: {
    type: VehicleType;
    features: SpotFeature[];
  };
  rateType: string;
  breakdown: BillingBreakdown;
  calculatedAt: string;
}

export interface BillingSummary {
  totalVehicles: number;
  totalRevenue: number;
  averageCost: number;
  bySpotType: Record<string, unknown>;
  byRateType: Record<string, unknown>;
  byFeatures: Record<string, unknown>;
}

export interface IBillingService {
  calculateParkingFee(params: BillingParams): BillingResult;
  getSpotTypeRate(spotType: VehicleType): number;
  calculateFeaturePremiums(spotFeatures: SpotFeature[]): {
    totalPremiums: number;
    premiumBreakdown: Record<string, number>;
  };
  getSpotTypeRates(): BillingRates;
  getFeaturePremiums(): FeaturePremiums;
  getRateTypeMultipliers(): RateTypeMultipliers;
  updateSpotTypeRate(spotType: VehicleType, rate: number): void;
  updateFeaturePremium(feature: SpotFeature, premium: number): void;
  calculateCurrentEstimate(
    checkInTime: string,
    spotType: VehicleType,
    spotFeatures?: SpotFeature[],
    rateType?: string
  ): BillingResult;
  getBillingSummary(vehicles: VehicleRecord[]): BillingSummary;
}

// Analytics Service Types
export interface AnalyticsGarageInfo {
  name: string;
  totalFloors: number;
  totalBays: number;
}

export interface AnalyticsFloorInfo {
  number: number;
  bays: number;
  spotsPerBay: number;
  totalCapacity: number;
}

export interface StatsByType {
  [key: string]: {
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  };
}

export interface StatsByFloor {
  floor: number;
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number;
}

export interface AverageDuration {
  hours: number;
  minutes: number;
  totalMinutes: number;
}

export interface PeakOccupancy {
  current: number;
  estimated: number;
  utilizationRate?: number;
}

export interface AnalyticsGarageStats {
  garage: AnalyticsGarageInfo;
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  occupancyRate: number;
  byType: StatsByType;
  byFloor: StatsByFloor[];
  averageDuration: AverageDuration;
  currentSessions: number;
  timestamp: string;
}

export interface AnalyticsFloorStats {
  floor: AnalyticsFloorInfo;
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  occupancyRate: number;
  byType: StatsByType;
  byBay: Array<{
    bay: number;
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  }>;
  averageDuration: AverageDuration;
  currentSessions: number;
  peakOccupancy: PeakOccupancy;
  timestamp: string;
}

export interface OccupancyTrendData {
  hour: number;
  timestamp: string;
  checkIns: number;
  checkOuts: number;
  netChange: number;
}

export interface OccupancyTrends {
  period: {
    hours: number;
    startTime: string;
    endTime: string;
  };
  trends: OccupancyTrendData[];
  summary: {
    totalCheckIns: number;
    totalCheckOuts: number;
    peakCheckInHour: OccupancyTrendData;
    peakCheckOutHour: OccupancyTrendData;
  };
}

export interface RevenueAnalytics {
  period: {
    days: number;
    startTime: string;
    endTime: string;
  };
  revenue: {
    total: number;
    pending: number;
    average: number;
  };
  sessions: {
    completed: number;
    pending: number;
    active: number;
    total: number;
  };
  byVehicleType: Record<
    string,
    {
      revenue: number;
      sessions: number;
      average: number;
    }
  >;
  byRateType: Record<
    string,
    {
      revenue: number;
      sessions: number;
      average: number;
    }
  >;
}

export interface UsagePatterns {
  hourlyDistribution: Array<{
    hour: number;
    sessions: number;
    percentage: number;
  }>;
  dailyDistribution: Array<{
    day: string;
    dayNumber: number;
    sessions: number;
    percentage: number;
  }>;
  peaks: {
    hour: { time: number; sessions: number };
    day: { name: string; sessions: number };
  };
  totalSessions: number;
}

export interface IAnalyticsService {
  getGarageStats(): Promise<AnalyticsGarageStats>;
  getFloorStats(floorId: number): Promise<AnalyticsFloorStats>;
  getOccupancyTrends(options?: { hours?: number }): Promise<OccupancyTrends>;
  getRevenueAnalytics(options?: { days?: number }): Promise<RevenueAnalytics>;
  getUsagePatterns(): Promise<UsagePatterns>;
}

// Memory Store Types
export interface MemoryStoreStats {
  totalSpots: number;
  totalVehicles: number;
  occupiedSpots: number;
  availableSpots: number;
  floorsAndBays: number;
}

export interface IMemoryStore {
  spots: Map<string, SpotRecord>;
  vehicles: Map<string, VehicleRecord>;
  garageConfig: Map<string, GarageRecord>;
  spotsByFloorBay: Map<string, Set<string>>;
  occupiedSpots: Set<string>;
  clear(): void;
  getStats(): MemoryStoreStats;
}

// Search Service Types
export interface SearchOptions {
  mode?: 'exact' | 'partial' | 'fuzzy' | 'all';
  threshold?: number;
  maxResults?: number;
  caseSensitive?: boolean;
}

export interface SearchResult<T> {
  item: T;
  score?: number;
  matchType?: 'exact' | 'partial' | 'fuzzy';
}

export interface ISearchService {
  searchVehicles(query: string, options?: SearchOptions): SearchResult<VehicleRecord>[];
  searchSpots(criteria: FilterOptions): SpotRecord[];
  fuzzySearch<T>(
    items: T[],
    query: string,
    getSearchableText: (item: T) => string,
    threshold?: number
  ): SearchResult<T>[];
}

// Common service response types
export type VehicleServiceResult<T = VehicleRecord> = ServiceResponse<T>;
export type SpotServiceResult<T = SpotRecord> = ServiceResponse<T>;
export type GarageServiceResult<T = GarageRecord> = ServiceResponse<T>;
export type AnalyticsServiceResult<T> = ServiceResponse<T>;

// Service-specific repository interface types (simplified for services)
export interface IServiceRepository<T, K = string> {
  findAll(): T[];
  findById(id: K): T | null;
  create(data: Partial<T>): T;
  update(id: K, updates: Partial<T>): T | null;
  delete(id: K): boolean;
}

export interface ISpotServiceRepository extends IServiceRepository<SpotRecord> {
  findAvailable(): SpotRecord[];
  findByFloor(floor: number): SpotRecord[];
  findByType(type: VehicleType): SpotRecord[];
  findByFeatures(features: SpotFeature[]): SpotRecord[];
}

export interface IVehicleServiceRepository extends IServiceRepository<VehicleRecord> {
  findByLicensePlate(licensePlate: string): VehicleRecord | null;
  findParked(): VehicleRecord[];
  findByStatus(status: string): VehicleRecord[];
}

export interface IGarageServiceRepository extends IServiceRepository<GarageRecord> {
  getDefault(): GarageRecord | null;
}
