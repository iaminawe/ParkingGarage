/**
 * Type definitions for JavaScript model classes
 *
 * These types define the structure and methods of JavaScript model classes
 * that need to be migrated to TypeScript. They serve as contracts for
 * the migration process and provide type safety during the transition.
 */

import { VehicleType, SpotStatus, SpotFeature, RateType } from './models';

// Spot Model Class Types
export interface SpotConstructorData {
  id: string;
  floor: number;
  bay: number;
  spotNumber: number;
  type: VehicleType;
  status: SpotStatus;
  features: SpotFeature[];
  currentVehicle: string | null;
}

export interface SpotModelInterface {
  // Properties
  id: string;
  floor: number;
  bay: number;
  spotNumber: number;
  type: VehicleType;
  status: SpotStatus;
  features: SpotFeature[];
  currentVehicle: string | null;
  createdAt: string;
  updatedAt: string;

  // Methods
  isAvailable(): boolean;
  isOccupied(): boolean;
  occupy(licensePlate: string): void;
  vacate(): void;
  hasFeature(feature: SpotFeature): boolean;
  addFeature(feature: SpotFeature): void;
  removeFeature(feature: SpotFeature): void;
  toObject(): SpotConstructorData & { createdAt: string; updatedAt: string };
  toJSON(): string;

  // Static methods
  createSpot(
    floor: number,
    bay: number,
    spotNumber: number,
    type?: VehicleType,
    features?: SpotFeature[]
  ): SpotModelInterface;
  fromObject(
    obj: SpotConstructorData & { createdAt?: string; updatedAt?: string }
  ): SpotModelInterface;
}

// Vehicle Model Class Types
export interface VehicleConstructorData {
  licensePlate: string;
  spotId: string;
  checkInTime: string;
  vehicleType: VehicleType;
  rateType: RateType;
}

export interface VehicleModelInterface {
  // Properties
  licensePlate: string;
  spotId: string;
  checkInTime: string;
  vehicleType: VehicleType;
  rateType: RateType;
  checkOutTime: string | null;
  totalAmount: number;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;

  // Methods
  checkOut(hourlyRate?: number): void;
  isCheckedOut(): boolean;
  getParkingDurationMinutes(): number;
  getParkingDurationHours(): number;
  calculateTotalAmount(hourlyRate?: number): number;
  markAsPaid(amountPaid: number): void;
  getStatus(): 'parked' | 'checked_out_unpaid' | 'completed';
  getSummary(): {
    licensePlate: string;
    spotId: string;
    checkInTime: string;
    checkOutTime: string | null;
    durationMinutes: number;
    durationHours: number;
    totalAmount: number;
    isPaid: boolean;
    status: 'parked' | 'checked_out_unpaid' | 'completed';
  };
  toObject(): VehicleConstructorData & {
    checkOutTime: string | null;
    totalAmount: number;
    isPaid: boolean;
    createdAt: string;
    updatedAt: string;
  };
  toJSON(): string;

  // Static methods
  checkIn(
    licensePlate: string,
    spotId: string,
    vehicleType?: VehicleType,
    rateType?: RateType
  ): VehicleModelInterface;
  fromObject(
    obj: VehicleConstructorData & {
      checkOutTime?: string | null;
      totalAmount?: number;
      isPaid?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  ): VehicleModelInterface;
}

// Garage Model Class Types (inferred from usage patterns)
export interface GarageFloorConfig {
  number: number;
  bays: number;
  spotsPerBay: number;
}

export interface GarageRateStructure {
  compact: number;
  standard: number;
  oversized: number;
}

export interface GarageSpotTypeConfig {
  [key: string]: {
    name: string;
    multiplier: number;
    description: string;
  };
}

export interface GarageConstructorData {
  name: string;
  floors: GarageFloorConfig[];
  rates: GarageRateStructure;
  spotTypes: GarageSpotTypeConfig;
}

export interface GarageModelInterface {
  // Properties
  name: string;
  floors: GarageFloorConfig[];
  rates: GarageRateStructure;
  spotTypes: GarageSpotTypeConfig;
  createdAt: string;
  updatedAt: string;

  // Methods (inferred from typical usage)
  getTotalSpots(): number;
  getFloorByNumber(floorNumber: number): GarageFloorConfig | null;
  updateRates(newRates: Partial<GarageRateStructure>): void;
  addFloor(floor: GarageFloorConfig): void;
  removeFloor(floorNumber: number): boolean;
  toObject(): GarageConstructorData & { createdAt: string; updatedAt: string };
  toJSON(): string;

  // Static methods
  create(config: GarageConstructorData): GarageModelInterface;
  fromObject(
    obj: GarageConstructorData & { createdAt?: string; updatedAt?: string }
  ): GarageModelInterface;
}

// Validation Result Types (from validators)
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationFunction<T> {
  (data: T): ValidationResult;
}

// Express Route Handler Types for JavaScript files
export interface ExpressRouteHandler {
  (req: any, res: any, next?: any): void | Promise<void>;
}

export interface ExpressMiddleware {
  (req: any, res: any, next: any): void | Promise<void>;
}

export interface ExpressErrorHandler {
  (error: Error, req: any, res: any, next: any): void;
}

// Application Configuration Types
export interface AppConfigurationOptions {
  port?: number;
  host?: string;
  environment?: 'development' | 'production' | 'test';
  corsOrigins?: string[];
  rateLimiting?: {
    windowMs: number;
    max: number;
    message: any;
  };
}

export interface ServerOptions {
  PORT: number;
  HOST: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

// Memory Store Types (singleton pattern)
export interface MemoryStoreType {
  spots: Map<string, any>;
  vehicles: Map<string, any>;
  garageConfig: Map<string, any>;
  spotsByFloorBay: Map<string, Set<string>>;
  occupiedSpots: Set<string>;
  getInstance(): MemoryStoreType;
  clear(): void;
  getStats(): {
    totalSpots: number;
    totalVehicles: number;
    occupiedSpots: number;
    availableSpots: number;
    floorsAndBays: number;
  };
}

// Service Class Constructor Types
export interface ServiceDependencies {
  garageRepository?: any;
  spotRepository?: any;
  vehicleRepository?: any;
  memoryStore?: MemoryStoreType;
}

// Utility Function Types
export interface ValidatorUtilities {
  validateSpot: ValidationFunction<SpotConstructorData>;
  validateVehicle: ValidationFunction<VehicleConstructorData>;
  isValidLicensePlate: (licensePlate: string) => boolean;
  generateSpotId: (floor: number, bay: number, spotNumber: number) => string;
}

export interface TimeCalculatorUtilities {
  calculateBillableHours: (totalMinutes: number) => number;
  applyGracePeriod: (totalMinutes: number, gracePeriodMinutes: number) => number;
}

export interface StringMatcherUtilities {
  fuzzyMatch: (query: string, target: string, threshold?: number) => boolean;
  partialMatch: (query: string, target: string, caseSensitive?: boolean) => boolean;
  exactMatch: (query: string, target: string, caseSensitive?: boolean) => boolean;
}

// Migration Helper Types
export interface MigrationStep {
  order: number;
  description: string;
  dependencies: string[];
  targetFiles: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface TypeScriptMigrationPlan {
  phases: {
    phase: number;
    name: string;
    description: string;
    steps: MigrationStep[];
  }[];
  totalFiles: number;
  estimatedDuration: string;
  riskAssessment: {
    circularDependencies: string[];
    complexMigrations: string[];
    breakingChanges: string[];
  };
}
