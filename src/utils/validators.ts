/**
 * Data validation utilities for the parking garage system
 *
 * This module provides validation functions for all data models including
 * spots, vehicles, and garage configuration. It ensures data integrity
 * and provides meaningful error messages for invalid data.
 *
 * @module Validators
 */

import type {
  SpotData,
  VehicleData,
  GarageConfig,
  ValidationResult,
  VehicleType,
  SpotStatus,
  SpotFeature,
  RateType,
} from '../types/models';

/**
 * Type guard to check if a value is a valid VehicleType
 */
export function isValidVehicleType(value: unknown): value is VehicleType {
  return typeof value === 'string' && ['compact', 'standard', 'oversized'].includes(value);
}

/**
 * Type guard to check if a value is a valid SpotStatus
 */
export function isValidSpotStatus(value: unknown): value is SpotStatus {
  return typeof value === 'string' && ['available', 'occupied'].includes(value);
}

/**
 * Type guard to check if a value is a valid SpotFeature
 */
export function isValidSpotFeature(value: unknown): value is SpotFeature {
  return typeof value === 'string' && ['ev_charging', 'handicap'].includes(value);
}

/**
 * Type guard to check if a value is a valid RateType
 */
export function isValidRateType(value: unknown): value is RateType {
  return typeof value === 'string' && ['hourly', 'daily', 'monthly'].includes(value);
}

/**
 * Validate spot data structure
 * @param spot - The spot object to validate
 * @returns Validation result with isValid and errors properties
 */
export function validateSpot(spot: unknown): ValidationResult {
  const errors: string[] = [];

  if (!spot || typeof spot !== 'object') {
    return { isValid: false, errors: ['Spot must be an object'] };
  }

  const spotData = spot as Record<string, unknown>;

  // Validate required fields
  if (!spotData.id || typeof spotData.id !== 'string') {
    errors.push('Spot ID is required and must be a string');
  }

  if (typeof spotData.floor !== 'number' || spotData.floor < 1) {
    errors.push('Floor must be a positive number');
  }

  if (typeof spotData.bay !== 'number' || spotData.bay < 1) {
    errors.push('Bay must be a positive number');
  }

  if (typeof spotData.spotNumber !== 'number' || spotData.spotNumber < 1) {
    errors.push('Spot number must be a positive number');
  }

  // Validate spot type
  if (!isValidVehicleType(spotData.type)) {
    errors.push('Spot type must be one of: compact, standard, oversized');
  }

  // Validate status
  if (!isValidSpotStatus(spotData.status)) {
    errors.push('Spot status must be one of: available, occupied');
  }

  // Validate features array
  if (!Array.isArray(spotData.features)) {
    errors.push('Features must be an array');
  } else {
    const invalidFeatures = spotData.features.filter((f: unknown) => !isValidSpotFeature(f));
    if (invalidFeatures.length > 0) {
      errors.push(`Invalid features: ${invalidFeatures.join(', ')}`);
    }
  }

  // Validate spot ID format
  if (spotData.id && !isValidSpotId(spotData.id)) {
    errors.push('Spot ID must follow format F{floor}-B{bay}-S{spot}');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate vehicle/parking record data structure
 * @param vehicle - The vehicle object to validate
 * @returns Validation result with isValid and errors properties
 */
export function validateVehicle(vehicle: unknown): ValidationResult {
  const errors: string[] = [];

  if (!vehicle || typeof vehicle !== 'object') {
    return { isValid: false, errors: ['Vehicle must be an object'] };
  }

  const vehicleData = vehicle as Record<string, unknown>;

  // Validate license plate
  if (!vehicleData.licensePlate || typeof vehicleData.licensePlate !== 'string') {
    errors.push('License plate is required and must be a string');
  } else if (vehicleData.licensePlate.length < 2 || vehicleData.licensePlate.length > 10) {
    errors.push('License plate must be between 2 and 10 characters');
  }

  // Validate spot ID
  if (!vehicleData.spotId || typeof vehicleData.spotId !== 'string') {
    errors.push('Spot ID is required and must be a string');
  } else if (!isValidSpotId(vehicleData.spotId)) {
    errors.push('Spot ID must follow format F{floor}-B{bay}-S{spot}');
  }

  // Validate check-in time
  if (!vehicleData.checkInTime) {
    errors.push('Check-in time is required');
  } else {
    const checkInDate = new Date(vehicleData.checkInTime as string);
    if (isNaN(checkInDate.getTime())) {
      errors.push('Check-in time must be a valid ISO date string');
    }
  }

  // Validate vehicle type
  if (!isValidVehicleType(vehicleData.vehicleType)) {
    errors.push('Vehicle type must be one of: compact, standard, oversized');
  }

  // Validate rate type
  if (!isValidRateType(vehicleData.rateType)) {
    errors.push('Rate type must be one of: hourly, daily, monthly');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate garage configuration data structure
 * @param garageConfig - The garage configuration object to validate
 * @returns Validation result with isValid and errors properties
 */
export function validateGarageConfig(garageConfig: unknown): ValidationResult {
  const errors: string[] = [];

  if (!garageConfig || typeof garageConfig !== 'object') {
    return { isValid: false, errors: ['Garage config must be an object'] };
  }

  const config = garageConfig as Record<string, unknown>;

  // Validate name
  if (!config.name || typeof config.name !== 'string') {
    errors.push('Garage name is required and must be a string');
  }

  // Validate floors array
  if (!Array.isArray(config.floors)) {
    errors.push('Floors must be an array');
  } else {
    config.floors.forEach((floor: unknown, index: number) => {
      if (!floor || typeof floor !== 'object') {
        errors.push(`Floor ${index + 1}: must be an object`);
        return;
      }

      const floorData = floor as Record<string, unknown>;

      if (typeof floorData.number !== 'number' || floorData.number < 1) {
        errors.push(`Floor ${index + 1}: number must be a positive number`);
      }
      if (typeof floorData.bays !== 'number' || floorData.bays < 1) {
        errors.push(`Floor ${index + 1}: bays must be a positive number`);
      }
      if (typeof floorData.spotsPerBay !== 'number' || floorData.spotsPerBay < 1) {
        errors.push(`Floor ${index + 1}: spotsPerBay must be a positive number`);
      }
    });
  }

  // Validate rates
  if (!config.rates || typeof config.rates !== 'object') {
    errors.push('Rates must be an object');
  } else {
    const rates = config.rates as Record<string, unknown>;
    const requiredRates = ['standard', 'compact', 'oversized'];
    requiredRates.forEach(rateType => {
      if (typeof rates[rateType] !== 'number' || (rates[rateType] as number) < 0) {
        errors.push(`Rate for ${rateType} must be a non-negative number`);
      }
    });
  }

  // Validate spot types
  if (!config.spotTypes || typeof config.spotTypes !== 'object') {
    errors.push('Spot types must be an object');
  } else {
    const spotTypes = config.spotTypes as Record<string, unknown>;
    const requiredSpotTypes = ['compact', 'standard', 'oversized'];
    requiredSpotTypes.forEach(spotType => {
      const typeConfig = spotTypes[spotType];
      if (!typeConfig || typeof typeConfig !== 'object') {
        errors.push(`Spot type ${spotType} configuration is required`);
      } else {
        const typeData = typeConfig as Record<string, unknown>;
        if (typeof typeData.multiplier !== 'number' || typeData.multiplier < 0) {
          errors.push(`${spotType} multiplier must be a non-negative number`);
        }
        if (!typeData.name || typeof typeData.name !== 'string') {
          errors.push(`${spotType} name must be a string`);
        }
        if (!typeData.description || typeof typeData.description !== 'string') {
          errors.push(`${spotType} description must be a string`);
        }
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate spot ID format (F{floor}-B{bay}-S{spot})
 * @param spotId - The spot ID to validate
 * @returns True if valid format, false otherwise
 */
export function isValidSpotId(spotId: unknown): spotId is string {
  if (typeof spotId !== 'string') {
    return false;
  }

  const spotIdRegex = /^F(\d+)-B(\d+)-S(\d{3})$/;
  return spotIdRegex.test(spotId);
}

/**
 * Generate a spot ID from floor, bay, and spot number
 * @param floor - Floor number
 * @param bay - Bay number
 * @param spotNumber - Spot number
 * @returns Generated spot ID in format F{floor}-B{bay}-S{spot}
 */
export function generateSpotId(floor: number, bay: number, spotNumber: number): string {
  if (typeof floor !== 'number' || floor < 1) {
    throw new Error('Floor must be a positive number');
  }
  if (typeof bay !== 'number' || bay < 1) {
    throw new Error('Bay must be a positive number');
  }
  if (typeof spotNumber !== 'number' || spotNumber < 1) {
    throw new Error('Spot number must be a positive number');
  }

  const spotPadded = spotNumber.toString().padStart(3, '0');
  return `F${floor}-B${bay}-S${spotPadded}`;
}

/**
 * Validate license plate format (basic validation)
 * @param licensePlate - The license plate to validate
 * @returns True if valid, false otherwise
 */
export function isValidLicensePlate(licensePlate: unknown): licensePlate is string {
  if (typeof licensePlate !== 'string') {
    return false;
  }
  return licensePlate.length >= 2 && licensePlate.length <= 10;
}
