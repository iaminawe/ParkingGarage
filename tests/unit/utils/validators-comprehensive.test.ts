/**
 * Comprehensive tests for validation utilities
 * Tests all validation functions with 100% coverage of edge cases
 */

import {
  isValidVehicleType,
  isValidSpotStatus,
  isValidSpotFeature,
  isValidRateType,
  validateSpot,
  validateVehicle,
  validateGarageConfig,
  isValidSpotId,
  generateSpotId,
  isValidLicensePlate
} from '../../../src/utils/validators';

describe('validators', () => {
  describe('isValidVehicleType', () => {
    it('should return true for valid vehicle types', () => {
      expect(isValidVehicleType('compact')).toBe(true);
      expect(isValidVehicleType('standard')).toBe(true);
      expect(isValidVehicleType('oversized')).toBe(true);
    });

    it('should return false for invalid vehicle types', () => {
      expect(isValidVehicleType('invalid')).toBe(false);
      expect(isValidVehicleType('')).toBe(false);
      expect(isValidVehicleType(null)).toBe(false);
      expect(isValidVehicleType(undefined)).toBe(false);
      expect(isValidVehicleType(123)).toBe(false);
      expect(isValidVehicleType({})).toBe(false);
      expect(isValidVehicleType([])).toBe(false);
    });
  });

  describe('isValidSpotStatus', () => {
    it('should return true for valid spot statuses', () => {
      expect(isValidSpotStatus('available')).toBe(true);
      expect(isValidSpotStatus('occupied')).toBe(true);
    });

    it('should return false for invalid spot statuses', () => {
      expect(isValidSpotStatus('invalid')).toBe(false);
      expect(isValidSpotStatus('')).toBe(false);
      expect(isValidSpotStatus(null)).toBe(false);
      expect(isValidSpotStatus(undefined)).toBe(false);
      expect(isValidSpotStatus(123)).toBe(false);
      expect(isValidSpotStatus({})).toBe(false);
    });
  });

  describe('isValidSpotFeature', () => {
    it('should return true for valid spot features', () => {
      expect(isValidSpotFeature('ev_charging')).toBe(true);
      expect(isValidSpotFeature('handicap')).toBe(true);
    });

    it('should return false for invalid spot features', () => {
      expect(isValidSpotFeature('invalid')).toBe(false);
      expect(isValidSpotFeature('')).toBe(false);
      expect(isValidSpotFeature(null)).toBe(false);
      expect(isValidSpotFeature(undefined)).toBe(false);
      expect(isValidSpotFeature(123)).toBe(false);
    });
  });

  describe('isValidRateType', () => {
    it('should return true for valid rate types', () => {
      expect(isValidRateType('hourly')).toBe(true);
      expect(isValidRateType('daily')).toBe(true);
      expect(isValidRateType('monthly')).toBe(true);
    });

    it('should return false for invalid rate types', () => {
      expect(isValidRateType('invalid')).toBe(false);
      expect(isValidRateType('')).toBe(false);
      expect(isValidRateType(null)).toBe(false);
      expect(isValidRateType(undefined)).toBe(false);
      expect(isValidRateType(123)).toBe(false);
    });
  });

  describe('validateSpot', () => {
    const validSpot = {
      id: 'F1-B2-S001',
      floor: 1,
      bay: 2,
      spotNumber: 1,
      type: 'standard',
      status: 'available',
      features: ['ev_charging']
    };

    it('should validate a valid spot', () => {
      const result = validateSpot(validSpot);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for non-object input', () => {
      expect(validateSpot(null).errors).toContain('Spot must be an object');
      expect(validateSpot(undefined).errors).toContain('Spot must be an object');
      expect(validateSpot('string').errors).toContain('Spot must be an object');
      expect(validateSpot(123).errors).toContain('Spot must be an object');
    });

    it('should validate required fields', () => {
      const invalidSpot = { ...validSpot };
      delete (invalidSpot as any).id;
      const result = validateSpot(invalidSpot);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Spot ID is required and must be a string');
    });

    it('should validate floor field', () => {
      const tests = [
        { floor: 0, error: 'Floor must be a positive number' },
        { floor: -1, error: 'Floor must be a positive number' },
        { floor: '1', error: 'Floor must be a positive number' },
        { floor: null, error: 'Floor must be a positive number' },
        { floor: undefined, error: 'Floor must be a positive number' }
      ];

      tests.forEach(test => {
        const invalidSpot = { ...validSpot, floor: test.floor };
        const result = validateSpot(invalidSpot);
        expect(result.errors).toContain(test.error);
      });
    });

    it('should validate bay field', () => {
      const tests = [
        { bay: 0, error: 'Bay must be a positive number' },
        { bay: -1, error: 'Bay must be a positive number' },
        { bay: '1', error: 'Bay must be a positive number' },
        { bay: null, error: 'Bay must be a positive number' }
      ];

      tests.forEach(test => {
        const invalidSpot = { ...validSpot, bay: test.bay };
        const result = validateSpot(invalidSpot);
        expect(result.errors).toContain(test.error);
      });
    });

    it('should validate spotNumber field', () => {
      const tests = [
        { spotNumber: 0, error: 'Spot number must be a positive number' },
        { spotNumber: -1, error: 'Spot number must be a positive number' },
        { spotNumber: '1', error: 'Spot number must be a positive number' }
      ];

      tests.forEach(test => {
        const invalidSpot = { ...validSpot, spotNumber: test.spotNumber };
        const result = validateSpot(invalidSpot);
        expect(result.errors).toContain(test.error);
      });
    });

    it('should validate spot type', () => {
      const invalidSpot = { ...validSpot, type: 'invalid' };
      const result = validateSpot(invalidSpot);
      expect(result.errors).toContain('Spot type must be one of: compact, standard, oversized');
    });

    it('should validate spot status', () => {
      const invalidSpot = { ...validSpot, status: 'invalid' };
      const result = validateSpot(invalidSpot);
      expect(result.errors).toContain('Spot status must be one of: available, occupied');
    });

    it('should validate features array', () => {
      const invalidSpot1 = { ...validSpot, features: 'not-array' };
      expect(validateSpot(invalidSpot1).errors).toContain('Features must be an array');

      const invalidSpot2 = { ...validSpot, features: ['invalid_feature'] };
      expect(validateSpot(invalidSpot2).errors).toContain('Invalid features: invalid_feature');

      const invalidSpot3 = { ...validSpot, features: ['ev_charging', 'invalid'] };
      expect(validateSpot(invalidSpot3).errors).toContain('Invalid features: invalid');
    });

    it('should validate spot ID format', () => {
      const invalidSpot = { ...validSpot, id: 'invalid-format' };
      const result = validateSpot(invalidSpot);
      expect(result.errors).toContain('Spot ID must follow format F{floor}-B{bay}-S{spot}');
    });
  });

  describe('validateVehicle', () => {
    const validVehicle = {
      licensePlate: 'ABC123',
      spotId: 'F1-B2-S001',
      checkInTime: '2023-01-01T10:00:00.000Z',
      vehicleType: 'standard',
      rateType: 'hourly'
    };

    it('should validate a valid vehicle', () => {
      const result = validateVehicle(validVehicle);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for non-object input', () => {
      expect(validateVehicle(null).errors).toContain('Vehicle must be an object');
      expect(validateVehicle(undefined).errors).toContain('Vehicle must be an object');
      expect(validateVehicle('string').errors).toContain('Vehicle must be an object');
    });

    it('should validate license plate', () => {
      const tests = [
        { licensePlate: null, error: 'License plate is required and must be a string' },
        { licensePlate: undefined, error: 'License plate is required and must be a string' },
        { licensePlate: 123, error: 'License plate is required and must be a string' },
        { licensePlate: 'A', error: 'License plate must be between 2 and 10 characters' },
        { licensePlate: 'A'.repeat(11), error: 'License plate must be between 2 and 10 characters' }
      ];

      tests.forEach(test => {
        const invalidVehicle = { ...validVehicle, licensePlate: test.licensePlate };
        const result = validateVehicle(invalidVehicle);
        expect(result.errors).toContain(test.error);
      });
    });

    it('should validate spot ID', () => {
      const tests = [
        { spotId: null, error: 'Spot ID is required and must be a string' },
        { spotId: 123, error: 'Spot ID is required and must be a string' },
        { spotId: 'invalid', error: 'Spot ID must follow format F{floor}-B{bay}-S{spot}' }
      ];

      tests.forEach(test => {
        const invalidVehicle = { ...validVehicle, spotId: test.spotId };
        const result = validateVehicle(invalidVehicle);
        expect(result.errors).toContain(test.error);
      });
    });

    it('should validate check-in time', () => {
      const tests = [
        { checkInTime: null, error: 'Check-in time is required' },
        { checkInTime: undefined, error: 'Check-in time is required' },
        { checkInTime: 'invalid-date', error: 'Check-in time must be a valid ISO date string' },
        { checkInTime: 123, error: 'Check-in time must be a valid ISO date string' }
      ];

      tests.forEach(test => {
        const invalidVehicle = { ...validVehicle, checkInTime: test.checkInTime };
        const result = validateVehicle(invalidVehicle);
        expect(result.errors).toContain(test.error);
      });
    });

    it('should validate vehicle type', () => {
      const invalidVehicle = { ...validVehicle, vehicleType: 'invalid' };
      const result = validateVehicle(invalidVehicle);
      expect(result.errors).toContain('Vehicle type must be one of: compact, standard, oversized');
    });

    it('should validate rate type', () => {
      const invalidVehicle = { ...validVehicle, rateType: 'invalid' };
      const result = validateVehicle(invalidVehicle);
      expect(result.errors).toContain('Rate type must be one of: hourly, daily, monthly');
    });
  });

  describe('validateGarageConfig', () => {
    const validConfig = {
      name: 'Test Garage',
      floors: [
        { number: 1, bays: 5, spotsPerBay: 10 },
        { number: 2, bays: 3, spotsPerBay: 8 }
      ],
      rates: {
        standard: 5.0,
        compact: 4.0,
        oversized: 7.0
      },
      spotTypes: {
        compact: { multiplier: 0.8, name: 'Compact', description: 'Small vehicles' },
        standard: { multiplier: 1.0, name: 'Standard', description: 'Regular vehicles' },
        oversized: { multiplier: 1.5, name: 'Oversized', description: 'Large vehicles' }
      }
    };

    it('should validate a valid garage config', () => {
      const result = validateGarageConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for non-object input', () => {
      expect(validateGarageConfig(null).errors).toContain('Garage config must be an object');
      expect(validateGarageConfig(undefined).errors).toContain('Garage config must be an object');
      expect(validateGarageConfig('string').errors).toContain('Garage config must be an object');
    });

    it('should validate name field', () => {
      const tests = [
        { name: null, error: 'Garage name is required and must be a string' },
        { name: undefined, error: 'Garage name is required and must be a string' },
        { name: 123, error: 'Garage name is required and must be a string' }
      ];

      tests.forEach(test => {
        const invalidConfig = { ...validConfig, name: test.name };
        const result = validateGarageConfig(invalidConfig);
        expect(result.errors).toContain(test.error);
      });
    });

    it('should validate floors array', () => {
      const invalidConfig1 = { ...validConfig, floors: 'not-array' };
      expect(validateGarageConfig(invalidConfig1).errors).toContain('Floors must be an array');

      const invalidConfig2 = { ...validConfig, floors: [null] };
      expect(validateGarageConfig(invalidConfig2).errors).toContain('Floor 1: must be an object');

      const invalidConfig3 = { ...validConfig, floors: [{ number: 0, bays: 5, spotsPerBay: 10 }] };
      expect(validateGarageConfig(invalidConfig3).errors).toContain('Floor 1: number must be a positive number');

      const invalidConfig4 = { ...validConfig, floors: [{ number: 1, bays: 0, spotsPerBay: 10 }] };
      expect(validateGarageConfig(invalidConfig4).errors).toContain('Floor 1: bays must be a positive number');

      const invalidConfig5 = { ...validConfig, floors: [{ number: 1, bays: 5, spotsPerBay: 0 }] };
      expect(validateGarageConfig(invalidConfig5).errors).toContain('Floor 1: spotsPerBay must be a positive number');
    });

    it('should validate rates object', () => {
      const invalidConfig1 = { ...validConfig, rates: 'not-object' };
      expect(validateGarageConfig(invalidConfig1).errors).toContain('Rates must be an object');

      const invalidConfig2 = { ...validConfig, rates: { standard: -1, compact: 4.0, oversized: 7.0 } };
      expect(validateGarageConfig(invalidConfig2).errors).toContain('Rate for standard must be a non-negative number');

      const invalidConfig3 = { ...validConfig, rates: { standard: 'invalid', compact: 4.0, oversized: 7.0 } };
      expect(validateGarageConfig(invalidConfig3).errors).toContain('Rate for standard must be a non-negative number');
    });

    it('should validate spot types object', () => {
      const invalidConfig1 = { ...validConfig, spotTypes: 'not-object' };
      expect(validateGarageConfig(invalidConfig1).errors).toContain('Spot types must be an object');

      const invalidConfig2 = { ...validConfig, spotTypes: { compact: null, standard: {}, oversized: {} } };
      expect(validateGarageConfig(invalidConfig2).errors).toContain('Spot type compact configuration is required');

      const invalidSpotType = { multiplier: -1, name: 'Test', description: 'Test desc' };
      const invalidConfig3 = { ...validConfig, spotTypes: { ...validConfig.spotTypes, compact: invalidSpotType } };
      expect(validateGarageConfig(invalidConfig3).errors).toContain('compact multiplier must be a non-negative number');

      const invalidSpotType2 = { multiplier: 1.0, name: null, description: 'Test desc' };
      const invalidConfig4 = { ...validConfig, spotTypes: { ...validConfig.spotTypes, compact: invalidSpotType2 } };
      expect(validateGarageConfig(invalidConfig4).errors).toContain('compact name must be a string');

      const invalidSpotType3 = { multiplier: 1.0, name: 'Test', description: null };
      const invalidConfig5 = { ...validConfig, spotTypes: { ...validConfig.spotTypes, compact: invalidSpotType3 } };
      expect(validateGarageConfig(invalidConfig5).errors).toContain('compact description must be a string');
    });
  });

  describe('isValidSpotId', () => {
    it('should return true for valid spot IDs', () => {
      expect(isValidSpotId('F1-B2-S001')).toBe(true);
      expect(isValidSpotId('F10-B25-S999')).toBe(true);
      expect(isValidSpotId('F999-B1-S001')).toBe(true);
    });

    it('should return false for invalid spot IDs', () => {
      expect(isValidSpotId('invalid')).toBe(false);
      expect(isValidSpotId('F1-B2-S1')).toBe(false); // Spot number not padded
      expect(isValidSpotId('F1-B2')).toBe(false); // Missing spot
      expect(isValidSpotId('1-B2-S001')).toBe(false); // Missing F prefix
      expect(isValidSpotId('F1-2-S001')).toBe(false); // Missing B prefix
      expect(isValidSpotId('F1-B2-001')).toBe(false); // Missing S prefix
      expect(isValidSpotId(null)).toBe(false);
      expect(isValidSpotId(undefined)).toBe(false);
      expect(isValidSpotId(123)).toBe(false);
    });
  });

  describe('generateSpotId', () => {
    it('should generate valid spot IDs', () => {
      expect(generateSpotId(1, 2, 1)).toBe('F1-B2-S001');
      expect(generateSpotId(10, 25, 999)).toBe('F10-B25-S999');
      expect(generateSpotId(1, 1, 5)).toBe('F1-B1-S005');
    });

    it('should throw errors for invalid inputs', () => {
      expect(() => generateSpotId(0, 1, 1)).toThrow('Floor must be a positive number');
      expect(() => generateSpotId(-1, 1, 1)).toThrow('Floor must be a positive number');
      expect(() => generateSpotId('1' as any, 1, 1)).toThrow('Floor must be a positive number');

      expect(() => generateSpotId(1, 0, 1)).toThrow('Bay must be a positive number');
      expect(() => generateSpotId(1, -1, 1)).toThrow('Bay must be a positive number');
      expect(() => generateSpotId(1, '1' as any, 1)).toThrow('Bay must be a positive number');

      expect(() => generateSpotId(1, 1, 0)).toThrow('Spot number must be a positive number');
      expect(() => generateSpotId(1, 1, -1)).toThrow('Spot number must be a positive number');
      expect(() => generateSpotId(1, 1, '1' as any)).toThrow('Spot number must be a positive number');
    });
  });

  describe('isValidLicensePlate', () => {
    it('should return true for valid license plates', () => {
      expect(isValidLicensePlate('AB')).toBe(true);
      expect(isValidLicensePlate('ABC123')).toBe(true);
      expect(isValidLicensePlate('1234567890')).toBe(true);
    });

    it('should return false for invalid license plates', () => {
      expect(isValidLicensePlate('A')).toBe(false); // Too short
      expect(isValidLicensePlate('12345678901')).toBe(false); // Too long
      expect(isValidLicensePlate(null)).toBe(false);
      expect(isValidLicensePlate(undefined)).toBe(false);
      expect(isValidLicensePlate(123)).toBe(false);
      expect(isValidLicensePlate('')).toBe(false);
    });
  });
});