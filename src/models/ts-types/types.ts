/**
 * TypeScript type definitions for Parking Garage models
 * 
 * This module defines all TypeScript interfaces, types, and enums
 * used throughout the parking garage system for strong typing.
 * 
 * @module Types
 */

// ==================== ENUMS ====================

/**
 * Valid parking spot types
 */
export enum SpotType {
  COMPACT = 'compact',
  STANDARD = 'standard',
  OVERSIZED = 'oversized'
}

/**
 * Parking spot status values
 */
export enum SpotStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied'
}

/**
 * Special features available for parking spots
 */
export enum SpotFeature {
  EV_CHARGING = 'ev_charging',
  HANDICAP = 'handicap'
}

/**
 * Vehicle types for classification
 */
export enum VehicleType {
  COMPACT = 'compact',
  STANDARD = 'standard',
  OVERSIZED = 'oversized'
}

/**
 * Rate types for billing
 */
export enum RateType {
  HOURLY = 'hourly',
  DAILY = 'daily',
  MONTHLY = 'monthly'
}

/**
 * Vehicle parking status
 */
export enum VehicleStatus {
  PARKED = 'parked',
  CHECKED_OUT_UNPAID = 'checked_out_unpaid',
  COMPLETED = 'completed'
}

// ==================== GARAGE INTERFACES ====================

/**
 * Floor configuration for a garage
 */
export interface FloorConfig {
  /** Floor number (1-based) */
  number: number;
  /** Number of bays on this floor */
  bays: number;
  /** Number of spots per bay */
  spotsPerBay: number;
}

/**
 * Rate structure by spot type and features
 */
export interface RateStructure {
  /** Rate for standard spots */
  standard: number;
  /** Rate for compact spots */
  compact: number;
  /** Rate for oversized spots */
  oversized: number;
  /** Premium rate for EV charging */
  ev_charging: number;
}

/**
 * Spot type configuration with size constraints
 */
export interface SpotTypeConfig {
  /** Minimum vehicle size for this spot type */
  minSize: number;
  /** Maximum vehicle size for this spot type */
  maxSize: number;
}

/**
 * Collection of spot type configurations
 */
export interface SpotTypeMap {
  compact: SpotTypeConfig;
  standard: SpotTypeConfig;
  oversized: SpotTypeConfig;
}

/**
 * Garage configuration data for construction
 */
export interface GarageData {
  /** Name of the garage */
  name: string;
  /** Array of floor configurations */
  floors: FloorConfig[];
  /** Rate structure for different spot types */
  rates: RateStructure;
  /** Spot type configurations */
  spotTypes: SpotTypeMap;
}

/**
 * Complete garage configuration including metadata
 */
export interface GarageConfig extends GarageData {
  /** ISO timestamp when garage was created */
  createdAt: string;
  /** ISO timestamp when garage was last updated */
  updatedAt: string;
}

/**
 * Floor summary information
 */
export interface FloorSummary {
  /** Floor number */
  floor: number;
  /** Number of bays */
  bays: number;
  /** Spots per bay */
  spotsPerBay: number;
  /** Total capacity */
  capacity: number;
}

/**
 * Garage configuration summary
 */
export interface GarageSummary {
  /** Garage name */
  name: string;
  /** Total number of floors */
  totalFloors: number;
  /** Total parking capacity */
  totalCapacity: number;
  /** Rate structure */
  rates: RateStructure;
  /** Configuration for each floor */
  floorsConfiguration: FloorSummary[];
}

// ==================== SPOT INTERFACES ====================

/**
 * Spot data for construction
 */
export interface SpotData {
  /** Unique spot identifier (F{floor}-B{bay}-S{spot}) */
  id: string;
  /** Floor number (1-based) */
  floor: number;
  /** Bay number within floor (1-based) */
  bay: number;
  /** Spot number within bay (1-based) */
  spotNumber: number;
  /** Spot type */
  type: SpotType;
  /** Current status */
  status: SpotStatus;
  /** Special features */
  features: SpotFeature[];
  /** License plate of current vehicle or null */
  currentVehicle: string | null;
}

/**
 * Complete spot information including metadata
 */
export interface SpotInfo extends SpotData {
  /** ISO timestamp when spot was created */
  createdAt: string;
  /** ISO timestamp when spot was last updated */
  updatedAt: string;
}

// ==================== VEHICLE INTERFACES ====================

/**
 * Vehicle data for construction
 */
export interface VehicleData {
  /** Vehicle license plate */
  licensePlate: string;
  /** ID of the parked spot */
  spotId: string;
  /** ISO timestamp of check-in */
  checkInTime: string;
  /** Vehicle type */
  vehicleType: VehicleType;
  /** Rate type for billing */
  rateType: RateType;
}

/**
 * Complete vehicle parking record including metadata
 */
export interface VehicleRecord extends VehicleData {
  /** ISO timestamp of check-out or null */
  checkOutTime: string | null;
  /** Total amount owed */
  totalAmount: number;
  /** Whether parking fee has been paid */
  isPaid: boolean;
  /** ISO timestamp when record was created */
  createdAt: string;
  /** ISO timestamp when record was last updated */
  updatedAt: string;
}

/**
 * Vehicle parking session summary
 */
export interface VehicleSummary {
  /** Vehicle license plate */
  licensePlate: string;
  /** Spot ID */
  spotId: string;
  /** Check-in timestamp */
  checkInTime: string;
  /** Check-out timestamp or null */
  checkOutTime: string | null;
  /** Parking duration in minutes */
  durationMinutes: number;
  /** Parking duration in hours (rounded up) */
  durationHours: number;
  /** Total amount owed */
  totalAmount: number;
  /** Payment status */
  isPaid: boolean;
  /** Current status */
  status: VehicleStatus;
}

// ==================== VALIDATION INTERFACES ====================

/**
 * Validation result structure
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Array of error messages if validation failed */
  errors: string[];
}

/**
 * License plate validation result
 */
export interface LicensePlateValidation {
  /** Whether license plate is valid */
  isValid: boolean;
  /** Normalized license plate (uppercase, no spaces) */
  normalized?: string;
  /** Error message if invalid */
  error?: string;
}

// ==================== UTILITY TYPES ====================

/**
 * Possible values for spot type string validation
 */
export type SpotTypeString = keyof typeof SpotType;

/**
 * Possible values for spot status string validation
 */
export type SpotStatusString = keyof typeof SpotStatus;

/**
 * Possible values for spot feature string validation
 */
export type SpotFeatureString = keyof typeof SpotFeature;

/**
 * Possible values for vehicle type string validation
 */
export type VehicleTypeString = keyof typeof VehicleType;

/**
 * Possible values for rate type string validation
 */
export type RateTypeString = keyof typeof RateType;

/**
 * Constructor parameters for model classes
 */
export type ModelConstructorData<T> = Omit<T, 'createdAt' | 'updatedAt'>;

/**
 * Plain object representation (for serialization)
 */
export type PlainObject<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

// ==================== TYPE GUARDS ====================

/**
 * Type guard to check if a string is a valid SpotType
 */
export function isSpotType(value: string): value is SpotType {
  return Object.values(SpotType).includes(value as SpotType);
}

/**
 * Type guard to check if a string is a valid SpotStatus
 */
export function isSpotStatus(value: string): value is SpotStatus {
  return Object.values(SpotStatus).includes(value as SpotStatus);
}

/**
 * Type guard to check if a string is a valid SpotFeature
 */
export function isSpotFeature(value: string): value is SpotFeature {
  return Object.values(SpotFeature).includes(value as SpotFeature);
}

/**
 * Type guard to check if a string is a valid VehicleType
 */
export function isVehicleType(value: string): value is VehicleType {
  return Object.values(VehicleType).includes(value as VehicleType);
}

/**
 * Type guard to check if a string is a valid RateType
 */
export function isRateType(value: string): value is RateType {
  return Object.values(RateType).includes(value as RateType);
}

/**
 * Type guard to check if a string is a valid VehicleStatus
 */
export function isVehicleStatus(value: string): value is VehicleStatus {
  return Object.values(VehicleStatus).includes(value as VehicleStatus);
}

/**
 * Type guard to check if an array contains only valid SpotFeatures
 */
export function areSpotFeatures(values: string[]): values is SpotFeature[] {
  return values.every(isSpotFeature);
}

// ==================== CONSTANTS ====================

/**
 * Valid spot features array for validation
 */
export const VALID_SPOT_FEATURES: SpotFeature[] = Object.values(SpotFeature);

/**
 * Valid spot types array for validation
 */
export const VALID_SPOT_TYPES: SpotType[] = Object.values(SpotType);

/**
 * Valid spot statuses array for validation
 */
export const VALID_SPOT_STATUSES: SpotStatus[] = Object.values(SpotStatus);

/**
 * Valid vehicle types array for validation
 */
export const VALID_VEHICLE_TYPES: VehicleType[] = Object.values(VehicleType);

/**
 * Valid rate types array for validation
 */
export const VALID_RATE_TYPES: RateType[] = Object.values(RateType);

/**
 * Default garage configuration values
 */
export const DEFAULT_GARAGE_CONFIG: Partial<GarageConfig> = {
  floors: [{ number: 1, bays: 3, spotsPerBay: 20 }],
  rates: {
    standard: 5.00,
    compact: 4.00,
    oversized: 7.00,
    ev_charging: 8.00
  },
  spotTypes: {
    compact: { minSize: 0, maxSize: 1 },
    standard: { minSize: 1, maxSize: 2 },
    oversized: { minSize: 2, maxSize: 3 }
  }
};