/**
 * TypeScript infrastructure test
 * 
 * This test verifies that TypeScript types are working correctly
 * and that Jest can run TypeScript tests.
 */

import {
  VehicleType,
  RateType,
  VehicleData,
  SpotData,
  ApiResponse,
  ValidationResult
} from '../../src/types';

describe('TypeScript Infrastructure', () => {
  describe('Type Definitions', () => {
    test('should have correct VehicleType union type', () => {
      const validTypes: VehicleType[] = ['compact', 'standard', 'oversized'];
      
      expect(validTypes).toHaveLength(3);
      expect(validTypes).toContain('compact');
      expect(validTypes).toContain('standard');
      expect(validTypes).toContain('oversized');
    });

    test('should have correct RateType union type', () => {
      const validRates: RateType[] = ['hourly', 'daily', 'monthly'];
      
      expect(validRates).toHaveLength(3);
      expect(validRates).toContain('hourly');
      expect(validRates).toContain('daily');
      expect(validRates).toContain('monthly');
    });

    test('should create valid VehicleData object', () => {
      const vehicleData: VehicleData = {
        licensePlate: 'ABC123',
        spotId: 'F1-B2-S3',
        checkInTime: '2025-09-01T10:00:00.000Z',
        vehicleType: 'standard',
        rateType: 'hourly'
      };

      expect(vehicleData.licensePlate).toBe('ABC123');
      expect(vehicleData.spotId).toBe('F1-B2-S3');
      expect(vehicleData.vehicleType).toBe('standard');
      expect(vehicleData.rateType).toBe('hourly');
      expect(vehicleData.checkInTime).toBeTruthy();
    });

    test('should create valid SpotData object', () => {
      const spotData: SpotData = {
        id: 'F1-B2-S3',
        floor: 1,
        bay: 2,
        spotNumber: 3,
        type: 'standard',
        status: 'available',
        features: ['ev_charging'],
        currentVehicle: null
      };

      expect(spotData.id).toBe('F1-B2-S3');
      expect(spotData.floor).toBe(1);
      expect(spotData.bay).toBe(2);
      expect(spotData.spotNumber).toBe(3);
      expect(spotData.type).toBe('standard');
      expect(spotData.status).toBe('available');
      expect(spotData.features).toEqual(['ev_charging']);
      expect(spotData.currentVehicle).toBeNull();
    });

    test('should create valid ApiResponse object', () => {
      const apiResponse: ApiResponse<string> = {
        success: true,
        data: 'test data',
        message: 'Operation successful',
        timestamp: '2025-09-01T10:00:00.000Z'
      };

      expect(apiResponse.success).toBe(true);
      expect(apiResponse.data).toBe('test data');
      expect(apiResponse.message).toBe('Operation successful');
      expect(apiResponse.timestamp).toBeTruthy();
    });

    test('should create valid ValidationResult object', () => {
      const validResult: ValidationResult = {
        isValid: true,
        errors: []
      };

      const invalidResult: ValidationResult = {
        isValid: false,
        errors: ['Invalid license plate', 'Missing spot ID']
      };

      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toEqual([]);
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(2);
      expect(invalidResult.errors).toContain('Invalid license plate');
      expect(invalidResult.errors).toContain('Missing spot ID');
    });
  });

  describe('Type Safety', () => {
    test('should enforce type constraints at compile time', () => {
      // These should compile without errors because they follow the type definitions
      const vehicle: VehicleData = {
        licensePlate: 'XYZ789',
        spotId: 'F2-B1-S5',
        checkInTime: new Date().toISOString(),
        vehicleType: 'compact', // Must be one of the valid types
        rateType: 'daily' // Must be one of the valid types
      };

      // Type checking ensures these values are correct
      expect(['compact', 'standard', 'oversized']).toContain(vehicle.vehicleType);
      expect(['hourly', 'daily', 'monthly']).toContain(vehicle.rateType);
    });

    test('should work with generic types', () => {
      // Test generic ApiResponse type
      const stringResponse: ApiResponse<string> = {
        success: true,
        data: 'Hello World',
        timestamp: new Date().toISOString()
      };

      const numberResponse: ApiResponse<number> = {
        success: true,
        data: 42,
        timestamp: new Date().toISOString()
      };

      const arrayResponse: ApiResponse<string[]> = {
        success: true,
        data: ['item1', 'item2', 'item3'],
        timestamp: new Date().toISOString()
      };

      expect(typeof stringResponse.data).toBe('string');
      expect(typeof numberResponse.data).toBe('number');
      expect(Array.isArray(arrayResponse.data)).toBe(true);
    });
  });

  describe('Import/Export System', () => {
    test('should successfully import types from index', () => {
      // This test verifies that the type export/import system works correctly
      // If this test runs without compilation errors, the import system is working
      expect(true).toBe(true);
    });
  });
});