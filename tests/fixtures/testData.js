/**
 * Test Data Factory
 * 
 * Provides consistent test data across all test suites.
 * Includes factories for creating test objects with realistic data.
 */

class TestDataFactory {
  /**
   * Create test garage configuration
   */
  static createGarageData(overrides = {}) {
    return {
      name: 'Test Parking Garage',
      floors: [
        { number: 1, bays: 3, spotsPerBay: 10 },
        { number: 2, bays: 3, spotsPerBay: 10 },
        { number: 3, bays: 2, spotsPerBay: 8 }
      ],
      ...overrides
    };
  }

  /**
   * Create test spot data
   */
  static createSpotData(floor = 1, bay = 1, spotNumber = 1, type = 'standard', features = []) {
    return {
      floor,
      bay,
      spotNumber,
      type,
      features,
      id: `F${floor}-B${bay}-S${spotNumber.toString().padStart(3, '0')}`
    };
  }

  /**
   * Create test vehicle data
   */
  static createVehicleData(overrides = {}) {
    return {
      licensePlate: 'TEST001',
      vehicleType: 'standard',
      rateType: 'hourly',
      spotId: 'F1-B1-S001',
      ...overrides
    };
  }

  /**
   * Create multiple test vehicles
   */
  static createMultipleVehicles(count, baseOverrides = {}) {
    return Array.from({ length: count }, (_, index) => {
      return this.createVehicleData({
        licensePlate: `TEST${String(index + 1).padStart(3, '0')}`,
        spotId: `F1-B1-S${String(index + 1).padStart(3, '0')}`,
        ...baseOverrides
      });
    });
  }

  /**
   * Create test spots for a floor
   */
  static createFloorSpots(floor, bays, spotsPerBay) {
    const spots = [];
    for (let bay = 1; bay <= bays; bay++) {
      for (let spot = 1; spot <= spotsPerBay; spot++) {
        // Distribute spot types
        let type = 'standard';
        const position = ((bay - 1) * spotsPerBay + spot - 1) % 10;
        if (position < 2) type = 'compact';
        if (position >= 9) type = 'oversized';

        // Add features
        const features = [];
        if (spot === 1) features.push('ev_charging');
        if (floor === 1 && bay === 1 && spot <= 2) features.push('handicap');

        spots.push(this.createSpotData(floor, bay, spot, type, features));
      }
    }
    return spots;
  }

  /**
   * Create complete test garage with spots
   */
  static createTestGarage() {
    const garageData = this.createGarageData();
    const spots = [];

    garageData.floors.forEach(floorConfig => {
      const floorSpots = this.createFloorSpots(
        floorConfig.number,
        floorConfig.bays,
        floorConfig.spotsPerBay
      );
      spots.push(...floorSpots);
    });

    return { garageData, spots };
  }

  /**
   * Create rate update test data
   */
  static createRateUpdates(overrides = {}) {
    return {
      standard: 6.00,
      compact: 5.00,
      oversized: 8.00,
      ev_charging: 9.00,
      ...overrides
    };
  }

  /**
   * Create check-in request data
   */
  static createCheckinRequest(overrides = {}) {
    return {
      licensePlate: 'TEST001',
      vehicleType: 'standard',
      rateType: 'hourly',
      ...overrides
    };
  }

  /**
   * Create checkout request data
   */
  static createCheckoutRequest(overrides = {}) {
    return {
      licensePlate: 'TEST001',
      paymentMethod: 'credit_card',
      ...overrides
    };
  }

  /**
   * Create mock date for consistent testing
   */
  static createMockDate() {
    return new Date('2024-01-15T10:00:00.000Z');
  }

  /**
   * Create billing test scenarios
   */
  static createBillingScenarios() {
    return {
      shortStay: {
        checkInTime: '2024-01-15T10:00:00.000Z',
        checkOutTime: '2024-01-15T11:30:00.000Z', // 1.5 hours
        expectedHours: 2, // Rounded up
        expectedAmount: 10.00 // 2 * 5.00
      },
      dayStay: {
        checkInTime: '2024-01-15T10:00:00.000Z',
        checkOutTime: '2024-01-15T18:30:00.000Z', // 8.5 hours
        expectedHours: 9, // Rounded up
        expectedAmount: 45.00 // 9 * 5.00
      },
      overnightStay: {
        checkInTime: '2024-01-15T22:00:00.000Z',
        checkOutTime: '2024-01-16T08:00:00.000Z', // 10 hours
        expectedHours: 10,
        expectedAmount: 50.00 // 10 * 5.00
      }
    };
  }

  /**
   * Create performance test data
   */
  static createPerformanceTestData(vehicleCount = 100) {
    return Array.from({ length: vehicleCount }, (_, index) => ({
      licensePlate: `PERF${String(index + 1).padStart(3, '0')}`,
      vehicleType: ['compact', 'standard', 'oversized'][index % 3],
      rateType: ['hourly', 'daily'][index % 2]
    }));
  }

  /**
   * Create error test cases
   */
  static createErrorTestCases() {
    return {
      invalidVehicleType: {
        licensePlate: 'TEST001',
        vehicleType: 'invalid',
        rateType: 'hourly'
      },
      invalidRateType: {
        licensePlate: 'TEST001',
        vehicleType: 'standard',
        rateType: 'invalid'
      },
      missingLicensePlate: {
        vehicleType: 'standard',
        rateType: 'hourly'
      },
      invalidLicensePlate: {
        licensePlate: '',
        vehicleType: 'standard',
        rateType: 'hourly'
      },
      tooLongLicensePlate: {
        licensePlate: 'TOOLONGPLATE12345',
        vehicleType: 'standard',
        rateType: 'hourly'
      }
    };
  }
}

module.exports = TestDataFactory;