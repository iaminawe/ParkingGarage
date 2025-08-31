/**
 * Parking Garage Models - TypeScript Exports
 * 
 * This module serves as the main entry point for all TypeScript model classes,
 * interfaces, types, and utilities used throughout the parking garage system.
 * It provides a clean, organized API for importing model-related functionality.
 * 
 * @module Models
 */

// ==================== MODEL CLASSES ====================
export { Garage } from './garage';
export { Spot } from './spot';
export { Vehicle } from './vehicle';

// ==================== TYPE DEFINITIONS ====================
export type {
  // Garage Types
  GarageData,
  GarageConfig,
  GarageSummary,
  FloorConfig,
  FloorSummary,
  RateStructure,
  SpotTypeConfig,
  SpotTypeMap,

  // Spot Types
  SpotData,
  SpotInfo,

  // Vehicle Types
  VehicleData,
  VehicleRecord,
  VehicleSummary,

  // Validation Types
  ValidationResult,
  LicensePlateValidation,

  // Utility Types
  PlainObject,
  ModelConstructorData,
  SpotTypeString,
  SpotStatusString,
  SpotFeatureString,
  VehicleTypeString,
  RateTypeString
} from './ts-types/types';

// ==================== ENUMS ====================
export {
  SpotType,
  SpotStatus,
  SpotFeature,
  VehicleType,
  RateType,
  VehicleStatus
} from './ts-types/types';

// ==================== TYPE GUARDS ====================
export {
  isSpotType,
  isSpotStatus,
  isSpotFeature,
  isVehicleType,
  isRateType,
  isVehicleStatus,
  areSpotFeatures
} from './ts-types/types';

// ==================== CONSTANTS ====================
export {
  VALID_SPOT_FEATURES,
  VALID_SPOT_TYPES,
  VALID_SPOT_STATUSES,
  VALID_VEHICLE_TYPES,
  VALID_RATE_TYPES,
  DEFAULT_GARAGE_CONFIG
} from './ts-types/types';

// ==================== FACTORY FUNCTIONS ====================

import { Garage } from './garage';
import { Spot } from './spot';
import { Vehicle } from './vehicle';
import { SpotType, SpotFeature, VehicleType, RateType } from './ts-types/types';

/**
 * Factory function to create a default garage configuration
 * @param name - Optional garage name
 * @returns New Garage instance with default settings
 */
export function createDefaultGarage(name?: string): Garage {
  return Garage.createDefault(name);
}

/**
 * Factory function to create a parking spot
 * @param floor - Floor number
 * @param bay - Bay number
 * @param spotNumber - Spot number
 * @param type - Optional spot type (defaults to STANDARD)
 * @param features - Optional array of features
 * @returns New Spot instance
 */
export function createSpot(
  floor: number,
  bay: number,
  spotNumber: number,
  type?: SpotType,
  features?: SpotFeature[]
): Spot {
  return Spot.createSpot(floor, bay, spotNumber, type, features);
}

/**
 * Factory function to check in a vehicle
 * @param licensePlate - Vehicle license plate
 * @param spotId - Spot ID where vehicle is parking
 * @param vehicleType - Optional vehicle type (defaults to STANDARD)
 * @param rateType - Optional rate type (defaults to HOURLY)
 * @returns New Vehicle instance
 */
export function checkInVehicle(
  licensePlate: string,
  spotId: string,
  vehicleType?: VehicleType,
  rateType?: RateType
): Vehicle {
  return Vehicle.checkIn(licensePlate, spotId, vehicleType, rateType);
}

// ==================== VERSION INFO ====================

/**
 * Model version information for compatibility tracking
 */
export const MODEL_VERSION = {
  version: '1.0.0',
  apiLevel: 1,
  compatible: ['1.0.x'],
  description: 'TypeScript models for Parking Garage system'
} as const;