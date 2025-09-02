import { PricingEngine, MembershipTier } from '@/services/PricingEngine';
import { testDb } from '@tests/helpers/test-database';
import { TestDataFactory } from '@tests/helpers/test-factories';
import { TestUtils } from '@tests/helpers/test-utils';
import { VehicleType } from '@prisma/client';

// Mock dependencies
jest.mock('@/services/billingService');

// Mock BillingService
const mockBillingService = {
  getSpotTypeRate: jest.fn().mockImplementation((spotType: string) => {
    const rates: Record<string, number> = {
      'compact': 4.00,
      'standard': 5.00,
      'oversized': 7.50,
      'handicap': 5.00
    };
    return rates[spotType.toLowerCase()] || 5.00;
  })
};

jest.doMock('@/services/billingService', () => ({
  BillingService: jest.fn().mockImplementation(() => mockBillingService)
}));

describe('PricingEngine', () => {
  let pricingEngine: PricingEngine;
  let testUser: any;
  let testGarage: any;

  beforeAll(async () => {
    await testDb.setupDatabase();
  });

  afterAll(async () => {
    await testDb.teardownDatabase();
  });

  beforeEach(async () => {
    await testDb.setupDatabase();
    pricingEngine = new PricingEngine();
    
    // Create test data
    testUser = await testDb.createTestUser();
    testGarage = await testDb.createTestGarage();
  });

  describe('Basic Pricing Calculations', () => {
    it('should calculate basic pricing without any modifiers', async () => {
      const context = {
        spotType: 'standard' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'), // Friday morning, off-peak
        expectedDuration: 120 // 2 hours
      };

      const result = await pricingEngine.calculatePricing(context);

      expect(result.baseRate).toBe(5.00);
      expect(result.surgeMultiplier).toBe(1.0); // No surge off-peak
      expect(result.surgeRate).toBe(5.00);
      expect(result.membershipDiscount).toBe(0);
      expect(result.discountCodeDiscount).toBe(0);
      expect(result.finalRate).toBe(5.00);
      expect(result.totalEstimate).toBe(10.00); // 2 hours * $5/hour
      expect(result.validUntil).toBeInstanceOf(Date);
    });

    it('should calculate pricing for different spot types', async () => {
      const spotTypes: Array<{ type: VehicleType; expectedRate: number }> = [
        { type: 'COMPACT', expectedRate: 4.00 },
        { type: 'REGULAR', expectedRate: 5.00 },
        { type: 'LARGE', expectedRate: 7.50 },
        { type: 'HANDICAP', expectedRate: 5.00 }
      ];

      for (const { type, expectedRate } of spotTypes) {
        const context = {
          spotType: type,
          spotFeatures: [],
          rateType: 'hourly' as any,
          checkInTime: new Date('2024-03-15T10:00:00Z'),
          expectedDuration: 60
        };

        const result = await pricingEngine.calculatePricing(context);

        expect(result.baseRate).toBe(expectedRate);
        expect(result.totalEstimate).toBe(expectedRate); // 1 hour
      }
    });

    it('should calculate correct pricing breakdown', async () => {
      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 180 // 3 hours
      };

      const result = await pricingEngine.calculatePricing(context);

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.baseHourlyRate).toBe(5.00);
      expect(result.breakdown.surgeMultiplier).toBe(1.0);
      expect(result.breakdown.estimatedDuration).toBe(180);
      expect(result.breakdown.subtotal).toBe(15.00); // 3 hours * $5/hour
      expect(result.breakdown.discounts).toBe(0);
      expect(result.breakdown.total).toBe(15.00);
    });
  });

  describe('Surge Pricing', () => {
    it('should apply peak hour surge pricing on weekdays', async () => {
      // Morning peak: 7-9 AM
      const morningPeakContext = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T08:00:00Z'), // Friday 8 AM
        expectedDuration: 120
      };

      const morningResult = await pricingEngine.calculatePricing(morningPeakContext);

      expect(morningResult.surgeMultiplier).toBe(1.5);
      expect(morningResult.surgeRate).toBe(7.50); // $5 * 1.5

      // Evening peak: 5-7 PM
      const eveningPeakContext = {
        ...morningPeakContext,
        checkInTime: new Date('2024-03-15T18:00:00Z') // Friday 6 PM
      };

      const eveningResult = await pricingEngine.calculatePricing(eveningPeakContext);

      expect(eveningResult.surgeMultiplier).toBe(1.5);
      expect(eveningResult.surgeRate).toBe(7.50);
    });

    it('should apply weekend surge pricing', async () => {
      const weekendContext = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-16T14:00:00Z'), // Saturday 2 PM
        expectedDuration: 120
      };

      const result = await pricingEngine.calculatePricing(weekendContext);

      expect(result.surgeMultiplier).toBeGreaterThanOrEqual(1.2); // At least weekend surge
    });

    it('should apply event-based surge on weekend evenings', async () => {
      const weekendEveningContext = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-16T20:00:00Z'), // Saturday 8 PM
        expectedDuration: 120
      };

      const result = await pricingEngine.calculatePricing(weekendEveningContext);

      // Should have both weekend and event surge
      expect(result.surgeMultiplier).toBeGreaterThanOrEqual(1.4);
    });

    it('should apply EV charging premium', async () => {
      const evContext = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: ['ev_charging' as any],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 120
      };

      const result = await pricingEngine.calculatePricing(evContext);

      expect(result.surgeMultiplier).toBeGreaterThanOrEqual(1.2); // 20% EV premium
    });

    it('should cap surge multiplier at maximum', async () => {
      // Create high occupancy scenario (mocked)
      jest.spyOn(pricingEngine as any, 'getCurrentOccupancy').mockResolvedValue(0.95); // 95% occupancy

      const highDemandContext = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: ['ev_charging' as any],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T18:00:00Z'), // Peak hour + high occupancy + EV
        expectedDuration: 120
      };

      const result = await pricingEngine.calculatePricing(highDemandContext);

      expect(result.surgeMultiplier).toBeLessThanOrEqual(3.0); // Maximum 3x surge
    });
  });

  describe('Membership Discounts', () => {
    it('should apply no discount for BASIC membership', async () => {
      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 120,
        userId: testUser.id,
        membershipTier: 'BASIC' as MembershipTier
      };

      const result = await pricingEngine.calculatePricing(context);

      expect(result.membershipDiscount).toBe(0);
      expect(result.breakdown.membershipDiscountPercent).toBe(0);
    });

    it('should apply PREMIUM membership discount', async () => {
      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 120,
        userId: testUser.id,
        membershipTier: 'PREMIUM' as MembershipTier
      };

      const result = await pricingEngine.calculatePricing(context);

      expect(result.membershipDiscount).toBe(0.5); // 10% of $5
      expect(result.finalRate).toBe(4.5); // $5 - $0.5
      expect(result.breakdown.membershipDiscountPercent).toBe(10);
    });

    it('should apply VIP membership discount', async () => {
      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 120,
        userId: testUser.id,
        membershipTier: 'VIP' as MembershipTier
      };

      const result = await pricingEngine.calculatePricing(context);

      expect(result.membershipDiscount).toBe(1.0); // 20% of $5
      expect(result.finalRate).toBe(4.0); // $5 - $1
      expect(result.breakdown.membershipDiscountPercent).toBe(20);
    });

    it('should apply CORPORATE membership discount', async () => {
      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 120,
        userId: testUser.id,
        membershipTier: 'CORPORATE' as MembershipTier
      };

      const result = await pricingEngine.calculatePricing(context);

      expect(result.membershipDiscount).toBe(1.25); // 25% of $5
      expect(result.finalRate).toBe(3.75); // $5 - $1.25
      expect(result.breakdown.membershipDiscountPercent).toBe(25);
    });

    it('should retrieve membership benefits correctly', () => {
      const premiumBenefits = pricingEngine.getMembershipBenefits('PREMIUM');
      const vipBenefits = pricingEngine.getMembershipBenefits('VIP');

      expect(premiumBenefits).toBeTruthy();
      expect(premiumBenefits!.discountPercent).toBe(10);
      expect(premiumBenefits!.priorityBooking).toBe(true);
      expect(premiumBenefits!.freeHours).toBe(2);

      expect(vipBenefits).toBeTruthy();
      expect(vipBenefits!.discountPercent).toBe(20);
      expect(vipBenefits!.freeHours).toBe(5);
      expect(vipBenefits!.features).toContain('valet_service');
    });
  });

  describe('Discount Codes', () => {
    it('should apply percentage discount code', async () => {
      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 120,
        discountCode: 'WELCOME10'
      };

      const result = await pricingEngine.calculatePricing(context);

      expect(result.discountCodeDiscount).toBe(0.5); // 10% of $5
      expect(result.finalRate).toBe(4.5);
      expect(result.breakdown.discountCodePercent).toBe(10);
    });

    it('should apply fixed amount discount code', async () => {
      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 120,
        discountCode: 'PREMIUM5',
        membershipTier: 'PREMIUM' as MembershipTier
      };

      const result = await pricingEngine.calculatePricing(context);

      expect(result.discountCodeDiscount).toBe(5); // Fixed $5 discount
      expect(result.finalRate).toBe(0); // Can't go below 0
    });

    it('should apply maximum discount limit', async () => {
      // Use SAVE20 discount with maxDiscount of $50
      const context = {
        spotType: 'LARGE' as VehicleType, // $7.50 base rate
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T08:00:00Z'), // Peak hour (1.5x surge)
        expectedDuration: 120,
        discountCode: 'SAVE20'
      };

      const result = await pricingEngine.calculatePricing(context);

      // Base: $7.50, Surge: $11.25, 20% discount = $2.25 (well under $50 max)
      expect(result.discountCodeDiscount).toBe(2.25);
    });

    it('should reject invalid discount codes', async () => {
      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 120,
        discountCode: 'INVALID_CODE'
      };

      const result = await pricingEngine.calculatePricing(context);

      expect(result.discountCodeDiscount).toBe(0);
      expect(result.finalRate).toBe(result.surgeRate);
    });

    it('should validate discount codes correctly', async () => {
      // Valid code
      const validResult = await pricingEngine.validateDiscountCode('WELCOME10');
      expect(validResult.valid).toBe(true);
      expect(validResult.discount).toBeTruthy();

      // Invalid code
      const invalidResult = await pricingEngine.validateDiscountCode('INVALID');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toContain('not found');
    });
  });

  describe('Combined Discounts', () => {
    it('should apply both membership and discount code discounts', async () => {
      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 120,
        userId: testUser.id,
        membershipTier: 'PREMIUM' as MembershipTier,
        discountCode: 'WELCOME10'
      };

      const result = await pricingEngine.calculatePricing(context);

      expect(result.membershipDiscount).toBe(0.5); // 10% of $5
      expect(result.discountCodeDiscount).toBe(0.5); // 10% of $5
      expect(result.finalRate).toBe(4.0); // $5 - $0.5 - $0.5
      expect(result.totalEstimate).toBe(8.0); // 2 hours * $4
    });

    it('should never allow negative final rates', async () => {
      const context = {
        spotType: 'COMPACT' as VehicleType, // $4 base rate
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 60,
        membershipTier: 'CORPORATE' as MembershipTier, // 25% discount
        discountCode: 'PREMIUM5' // $5 fixed discount
      };

      const result = await pricingEngine.calculatePricing(context);

      expect(result.finalRate).toBeGreaterThanOrEqual(0);
      expect(result.totalEstimate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Pricing Options', () => {
    it('should provide pricing for multiple durations', async () => {
      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z')
      };

      const options = await pricingEngine.getPricingOptions(context);

      expect(options).toHaveLength(5); // 1h, 2h, 4h, 8h, 24h
      expect(options[0].duration).toBe(60);
      expect(options[1].duration).toBe(120);
      expect(options[2].duration).toBe(240);
      expect(options[3].duration).toBe(480);
      expect(options[4].duration).toBe(1440);

      // Each option should have increasing total estimates
      expect(options[1].pricing.totalEstimate).toBeGreaterThan(options[0].pricing.totalEstimate);
      expect(options[4].pricing.totalEstimate).toBeGreaterThan(options[3].pricing.totalEstimate);
    });

    it('should maintain consistent hourly rates across durations', async () => {
      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z')
      };

      const options = await pricingEngine.getPricingOptions(context);

      // All options should have the same final hourly rate
      const firstRate = options[0].pricing.finalRate;
      options.forEach(option => {
        expect(option.pricing.finalRate).toBe(firstRate);
      });
    });
  });

  describe('Surge Information', () => {
    it('should provide current surge information', async () => {
      const surgeInfo = await pricingEngine.getCurrentSurgeInfo();

      expect(Array.isArray(surgeInfo)).toBe(true);
      expect(surgeInfo.length).toBeGreaterThan(0);

      surgeInfo.forEach(info => {
        expect(info.zone).toBeDefined();
        expect(info.multiplier).toBeGreaterThanOrEqual(1.0);
        expect(info.reason).toBeDefined();
      });
    });

    it('should reflect occupancy-based surge', async () => {
      // Mock high occupancy
      jest.spyOn(pricingEngine as any, 'getCurrentOccupancy').mockResolvedValue(0.85);

      const surgeInfo = await pricingEngine.getCurrentSurgeInfo();

      // At least one zone should have surge due to high occupancy
      const surgedZones = surgeInfo.filter(info => info.multiplier > 1.0);
      expect(surgedZones.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(pricingEngine as any, 'getCurrentOccupancy').mockRejectedValue(new Error('Database error'));

      const context = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 120
      };

      await expect(pricingEngine.calculatePricing(context)).rejects.toThrow('Failed to calculate pricing');
    });

    it('should handle invalid membership tiers', () => {
      const benefits = pricingEngine.getMembershipBenefits('INVALID_TIER' as any);
      expect(benefits).toBeNull();
    });

    it('should handle edge case pricing scenarios', async () => {
      const edgeCases = [
        { expectedDuration: 0 },
        { expectedDuration: 1 }, // 1 minute
        { expectedDuration: 10080 }, // 1 week
        { spotType: undefined as any },
        { checkInTime: new Date('2030-01-01') } // Far future
      ];

      const baseContext = {
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date('2024-03-15T10:00:00Z'),
        expectedDuration: 120
      };

      for (const edgeCase of edgeCases) {
        const context = { ...baseContext, ...edgeCase };

        try {
          const result = await pricingEngine.calculatePricing(context);
          expect(result.totalEstimate).toBeGreaterThanOrEqual(0);
          expect(result.finalRate).toBeGreaterThanOrEqual(0);
        } catch (error) {
          // Some edge cases may throw errors, which is acceptable
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent pricing calculations', async () => {
      const contexts = Array.from({ length: 20 }, (_, i) => ({
        spotType: 'REGULAR' as VehicleType,
        spotFeatures: [],
        rateType: 'hourly' as any,
        checkInTime: new Date(`2024-03-15T${10 + (i % 12)}:00:00Z`),
        expectedDuration: 60 + (i * 10),
        membershipTier: (['BASIC', 'PREMIUM', 'VIP', 'CORPORATE'] as MembershipTier[])[i % 4]
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        contexts.map(context => pricingEngine.calculatePricing(context))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      // All results should be valid
      results.forEach(result => {
        expect(result.finalRate).toBeGreaterThanOrEqual(0);
        expect(result.totalEstimate).toBeGreaterThanOrEqual(0);
        expect(result.validUntil).toBeInstanceOf(Date);
      });
    });

    it('should maintain consistent performance under load', async () => {
      const measurements = [];

      for (let i = 0; i < 5; i++) {
        const context = {
          spotType: 'REGULAR' as VehicleType,
          spotFeatures: [],
          rateType: 'hourly' as any,
          checkInTime: new Date('2024-03-15T10:00:00Z'),
          expectedDuration: 120
        };

        const { duration } = await TestUtils.measureExecutionTime(() =>
          pricingEngine.calculatePricing(context)
        );

        measurements.push(duration);
      }

      // Performance should be consistent
      const avgTime = measurements.reduce((a, b) => a + b) / measurements.length;
      const maxTime = Math.max(...measurements);

      expect(avgTime).toBeLessThan(100); // Average under 100ms
      expect(maxTime).toBeLessThan(200); // Max under 200ms
    });
  });
});