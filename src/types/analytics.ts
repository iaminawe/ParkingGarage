/**
 * Analytics and reporting type definitions
 */

import { 
  Timestamp, 
  Currency, 
  SpotType, 
  VehicleType, 
  RateType, 
  Duration,
  OccupancyStats
} from './common.js';

import { FloorConfiguration, GarageCapacity } from './garage.js';

// Time-based analytics types
export interface HourlyUsageData {
  hour: number;
  timestamp: Timestamp;
  checkIns: number;
  checkOuts: number;
  netChange: number;
}

export interface DailyUsageData {
  day: string;
  dayNumber: number;
  sessions: number;
  percentage: number;
}

export interface UsageDistribution {
  hour: number;
  sessions: number;
  percentage: number;
}

// Peak usage information
export interface PeakUsageInfo {
  time: number;
  sessions: number;
}

export interface PeakTimes {
  hour: PeakUsageInfo;
  day: { name: string; sessions: number };
}

// Occupancy trend analysis
export interface OccupancyTrendPeriod {
  hours: number;
  startTime: Timestamp;
  endTime: Timestamp;
}

export interface OccupancyTrendSummary {
  totalCheckIns: number;
  totalCheckOuts: number;
  peakCheckInHour: HourlyUsageData;
  peakCheckOutHour: HourlyUsageData;
}

export interface OccupancyTrends {
  period: OccupancyTrendPeriod;
  trends: HourlyUsageData[];
  summary: OccupancyTrendSummary;
}

// Revenue analytics types
export interface RevenueByType {
  revenue: Currency;
  sessions: number;
  average: Currency;
}

export interface RevenuePeriod {
  days: number;
  startTime: Timestamp;
  endTime: Timestamp;
}

export interface RevenueAnalyticsSummary {
  total: Currency;
  pending: Currency;
  average: Currency;
}

export interface RevenueSessionsSummary {
  completed: number;
  pending: number;
  active: number;
  total: number;
}

export interface RevenueAnalytics {
  period: RevenuePeriod;
  revenue: RevenueAnalyticsSummary;
  sessions: RevenueSessionsSummary;
  byVehicleType: Record<VehicleType, RevenueByType>;
  byRateType: Record<RateType, RevenueByType>;
}

// Usage pattern analysis
export interface UsagePatterns {
  hourlyDistribution: UsageDistribution[];
  dailyDistribution: DailyUsageData[];
  peaks: PeakTimes;
  totalSessions: number;
}

// Floor-specific analytics
export interface FloorSpotStatistics extends OccupancyStats {
  bays: number;
}

export interface FloorAnalytics {
  floor: {
    number: number;
    bays: number;
    spotsPerBay: number;
    totalCapacity: number;
  };
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  occupancyRate: number;
  byType: Record<SpotType, OccupancyStats>;
  byBay: Array<{
    bay: number;
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  }>;
  averageDuration: Duration;
  currentSessions: number;
  peakOccupancy: {
    current: number;
    estimated: number;
    utilizationRate: number;
  };
  timestamp: Timestamp;
}

// Comprehensive garage analytics
export interface GarageAnalytics {
  garage: {
    name: string;
    totalFloors: number;
    totalBays: number;
  };
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  occupancyRate: number;
  byType: Record<SpotType, OccupancyStats>;
  byFloor: Array<{
    floor: number;
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  }>;
  averageDuration: Duration;
  currentSessions: number;
  timestamp: Timestamp;
}

// Analytics service interface
export interface IAnalyticsService {
  getGarageStats(): Promise<GarageAnalytics>;
  getFloorStats(floorId: number): Promise<FloorAnalytics>;
  getOccupancyTrends(options?: { hours?: number }): Promise<OccupancyTrends>;
  getRevenueAnalytics(options?: { days?: number }): Promise<RevenueAnalytics>;
  getUsagePatterns(): Promise<UsagePatterns>;
}