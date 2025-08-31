/**
 * Data validation utilities for the parking garage system
 *
 * This module provides validation functions for all data models including
 * spots, vehicles, and garage configuration. It ensures data integrity
 * and provides meaningful error messages for invalid data.
 */

import { 
  ISpot, 
  IVehicle, 
  IGarage, 
  SpotType, 
  SpotStatus, 
  SpotFeature,
  VehicleType,
  RateType,
  ValidationResult,
  FloorConfig,
  RateStructure,
  SpotTypeConfigurations 
} from '../types';

/**
 * Validate spot data structure
 */
export function validateSpot(spot: Partial<ISpot>): ValidationResult {
  const errors: string[] = [];

  if (!spot || typeof spot !== 'object') {
    return { isValid: false, errors: ['Spot must be an object'] };
  }

  // Validate required fields
  if (!spot.id || typeof spot.id !== 'string') {
    errors.push('Spot ID is required and must be a string');
  }

  if (typeof spot.floor !== 'number' || spot.floor < 1) {
    errors.push('Floor must be a positive number');
  }

  if (typeof spot.bay !== 'number' || spot.bay < 1) {
    errors.push('Bay must be a positive number');
  }

  if (typeof spot.spotNumber !== 'number' || spot.spotNumber < 1) {
    errors.push('Spot number must be a positive number');
  }

  // Validate spot type
  const validTypes: SpotType[] = ['compact', 'standard', 'oversized'];
  if (!spot.type || !validTypes.includes(spot.type)) {
    errors.push(`Spot type must be one of: ${validTypes.join(', ')}`);
  }

  // Validate status
  const validStatuses: SpotStatus[] = ['available', 'occupied'];
  if (!spot.status || !validStatuses.includes(spot.status)) {
    errors.push(`Spot status must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate features array
  if (!Array.isArray(spot.features)) {
    errors.push('Features must be an array');
  } else {
    const validFeatures: SpotFeature[] = ['ev_charging', 'handicap'];
    const invalidFeatures = spot.features.filter((f: any) => !validFeatures.includes(f));
    if (invalidFeatures.length > 0) {
      errors.push(`Invalid features: ${invalidFeatures.join(', ')}`);
    }
  }

  // Validate spot ID format
  if (spot.id && !isValidSpotId(spot.id)) {
    errors.push('Spot ID must follow format F{floor}-B{bay}-S{spot}');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate vehicle/parking record data structure
 */
export function validateVehicle(vehicle: Partial<IVehicle>): ValidationResult {
  const errors: string[] = [];

  if (!vehicle || typeof vehicle !== 'object') {
    return { isValid: false, errors: ['Vehicle must be an object'] };
  }

  // Validate license plate
  if (!vehicle.licensePlate || typeof vehicle.licensePlate !== 'string') {
    errors.push('License plate is required and must be a string');
  } else if (vehicle.licensePlate.length < 2 || vehicle.licensePlate.length > 10) {
    errors.push('License plate must be between 2 and 10 characters');
  }

  // Validate spot ID
  if (!vehicle.spotId || typeof vehicle.spotId !== 'string') {
    errors.push('Spot ID is required and must be a string');
  } else if (!isValidSpotId(vehicle.spotId)) {
    errors.push('Spot ID must follow format F{floor}-B{bay}-S{spot}');
  }

  // Validate check-in time
  if (!vehicle.checkInTime) {
    errors.push('Check-in time is required');
  } else {
    const checkInDate = new Date(vehicle.checkInTime);
    if (isNaN(checkInDate.getTime())) {
      errors.push('Check-in time must be a valid ISO date string');
    }
  }

  // Validate vehicle type
  const validVehicleTypes: VehicleType[] = ['compact', 'standard', 'oversized'];
  if (!vehicle.vehicleType || !validVehicleTypes.includes(vehicle.vehicleType)) {
    errors.push(`Vehicle type must be one of: ${validVehicleTypes.join(', ')}`);
  }

  // Validate rate type
  const validRateTypes: RateType[] = ['hourly', 'daily', 'monthly'];
  if (!vehicle.rateType || !validRateTypes.includes(vehicle.rateType)) {
    errors.push(`Rate type must be one of: ${validRateTypes.join(', ')}`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate garage configuration data structure
 */
export function validateGarageConfig(garageConfig: Partial<IGarage>): ValidationResult {
  const errors: string[] = [];

  if (!garageConfig || typeof garageConfig !== 'object') {
    return { isValid: false, errors: ['Garage config must be an object'] };
  }

  // Validate name
  if (!garageConfig.name || typeof garageConfig.name !== 'string') {
    errors.push('Garage name is required and must be a string');
  }

  // Validate floors array
  if (!Array.isArray(garageConfig.floors)) {
    errors.push('Floors must be an array');
  } else {
    garageConfig.floors.forEach((floor: FloorConfig, index: number) => {
      if (typeof floor.number !== 'number' || floor.number < 1) {
        errors.push(`Floor ${index + 1}: number must be a positive number`);
      }
      if (typeof floor.bays !== 'number' || floor.bays < 1) {
        errors.push(`Floor ${index + 1}: bays must be a positive number`);
      }
      if (typeof floor.spotsPerBay !== 'number' || floor.spotsPerBay < 1) {
        errors.push(`Floor ${index + 1}: spotsPerBay must be a positive number`);
      }
    });
  }

  // Validate rates
  if (!garageConfig.rates || typeof garageConfig.rates !== 'object') {
    errors.push('Rates must be an object');
  } else {
    const requiredRates: (keyof RateStructure)[] = ['standard', 'compact', 'oversized', 'ev_charging'];
    requiredRates.forEach(rateType => {
      const rate = (garageConfig.rates as RateStructure)[rateType];
      if (typeof rate !== 'number' || rate < 0) {
        errors.push(`Rate for ${String(rateType)} must be a non-negative number`);
      }
    });
  }

  // Validate spot types
  if (!garageConfig.spotTypes || typeof garageConfig.spotTypes !== 'object') {
    errors.push('Spot types must be an object');
  } else {
    const requiredSpotTypes: (keyof SpotTypeConfigurations)[] = ['compact', 'standard', 'oversized'];
    requiredSpotTypes.forEach(spotType => {
      const typeConfig = (garageConfig.spotTypes as SpotTypeConfigurations)[spotType];
      if (!typeConfig || typeof typeConfig !== 'object') {
        errors.push(`Spot type ${String(spotType)} configuration is required`);
      } else {
        if (typeof typeConfig.minSize !== 'number' || typeConfig.minSize < 0) {
          errors.push(`${String(spotType)} minSize must be a non-negative number`);
        }
        if (typeof typeConfig.maxSize !== 'number' || typeConfig.maxSize < 0) {
          errors.push(`${String(spotType)} maxSize must be a non-negative number`);
        }
        if (typeConfig.minSize >= typeConfig.maxSize) {
          errors.push(`${String(spotType)} maxSize must be greater than minSize`);
        }
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate spot ID format (F{floor}-B{bay}-S{spot})
 */
export function isValidSpotId(spotId: string): boolean {
  if (typeof spotId !== 'string') {
    return false;
  }

  const spotIdRegex = /^F(\d+)-B(\d+)-S(\d{3})$/;
  return spotIdRegex.test(spotId);
}

/**
 * Generate a spot ID from floor, bay, and spot number
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
 */
export function isValidLicensePlate(licensePlate: string): boolean {
  if (typeof licensePlate !== 'string') {
    return false;
  }
  return licensePlate.length >= 2 && licensePlate.length <= 10;
}