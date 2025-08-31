/**
 * Garage-specific type definitions
 */

import { Currency, SpotType, RateType, Timestamp, SpotId, VehicleType } from './common.js';

// Garage configuration types
export interface FloorConfiguration {
  number: number;
  bays: number;
  spotsPerBay: number;
}

export interface GarageRates {
  standard: Currency;
  compact: Currency;
  oversized: Currency;
  ev_charging: Currency;
}

export interface SpotTypeConfig {
  minSize: number;
  maxSize: number;
}

export interface SpotTypeConfigs {
  compact: SpotTypeConfig;
  standard: SpotTypeConfig;
  oversized: SpotTypeConfig;
}

export interface GarageConfiguration {
  name: string;
  floors: FloorConfiguration[];
  rates: GarageRates;
  spotTypes: SpotTypeConfigs;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface GarageInitializationData {
  name: string;
  floors: FloorConfiguration[];
}

export interface GarageUpdateData {
  name?: string;
}

// Garage statistics types
export interface GarageCapacity {
  totalCapacity: number;
  totalFloors: number;
  floors: Array<{
    floor: number;
    capacity: number;
  }>;
}

export interface GarageStatistics {
  garage: {
    name: string;
  } & GarageCapacity;
  occupancy: {
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  };
  distribution: {
    byType: Record<SpotType, number>;
    byFeature: {
      ev_charging: number;
      handicap: number;
      regular: number;
    };
    byFloor: Record<string, {
      total: number;
      available: number;
      occupied: number;
    }>;
  };
  rates: GarageRates;
  lastUpdated: Timestamp;
}

// Garage initialization result types
export interface SpotCreationSummary {
  id: SpotId;
  floor: number;
  bay: number;
  spotNumber: number;
  type: SpotType;
  status: string;
  features: string[];
}

export interface GarageInitializationResult {
  garage: {
    name: string;
    floors: FloorConfiguration[];
    rates: GarageRates;
    spotTypes: SpotTypeConfigs;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };
  spotsCreated: number;
  spots: SpotCreationSummary[];
}

// Rate update types
export interface RateUpdateRequest {
  standard?: Currency;
  compact?: Currency;
  oversized?: Currency;
  ev_charging?: Currency;
}

export interface RateUpdateResult {
  message: string;
  updatedRates: RateUpdateRequest;
  currentRates: GarageRates;
  updatedAt: Timestamp;
}

// Configuration update result
export interface ConfigurationUpdateResult {
  message: string;
  configuration: {
    name: string;
    floors: FloorConfiguration[];
    rates: GarageRates;
    spotTypes: SpotTypeConfigs;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };
}

// Garage service interface
export interface IGarageService {
  initializeGarage(garageData: GarageInitializationData): Promise<GarageInitializationResult>;
  getGarageConfiguration(options?: { includeStats?: boolean; includeSpots?: boolean }): Promise<GarageConfiguration & { 
    initializedAt: Timestamp; 
    lastUpdated: Timestamp;
    statistics?: any;
    spots?: any[];
  }>;
  updateGarageRates(rateUpdates: RateUpdateRequest): Promise<RateUpdateResult>;
  updateGarageConfiguration(configUpdates: GarageUpdateData): Promise<ConfigurationUpdateResult>;
  getGarageStatistics(): Promise<GarageStatistics>;
  isGarageInitialized(): boolean;
  resetGarage(): Promise<{ message: string; timestamp: Timestamp }>;
}