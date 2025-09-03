/**
 * PricingEngine - Dynamic pricing system with surge pricing, discount codes,
 * membership tiers, and demand-based rate adjustments
 */

import { prisma } from '../config/database';
import { BillingService, type BillingParams } from './billingService';
import type { VehicleType, RateType, SpotFeature } from '../types/models';

export interface PricingContext {
  spotType: VehicleType;
  spotFeatures: SpotFeature[];
  rateType: RateType;
  checkInTime: Date;
  expectedDuration?: number; // minutes
  userId?: string;
  discountCode?: string;
  membershipTier?: MembershipTier;
}

export interface PricingResult {
  baseRate: number;
  surgeMultiplier: number;
  surgeRate: number;
  membershipDiscount: number;
  discountCodeDiscount: number;
  finalRate: number;
  totalEstimate: number;
  breakdown: PricingBreakdown;
  validUntil: Date;
}

export interface PricingBreakdown {
  baseHourlyRate: number;
  surgeMultiplier: number;
  membershipDiscountPercent: number;
  discountCodePercent: number;
  finalHourlyRate: number;
  estimatedDuration: number;
  subtotal: number;
  discounts: number;
  total: number;
}

export interface SurgeZone {
  id: string;
  name: string;
  floors: number[];
  spotTypes: VehicleType[];
  currentMultiplier: number;
  maxMultiplier: number;
  occupancyThreshold: number; // percentage
  peakHours: { start: string; end: string }[];
  isActive: boolean;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  minAmount?: number;
  maxDiscount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usedCount: number;
  applicableSpotTypes?: VehicleType[];
  membershipTiersOnly?: MembershipTier[];
  isActive: boolean;
}

export type MembershipTier = 'BASIC' | 'PREMIUM' | 'VIP' | 'CORPORATE';

export interface MembershipBenefits {
  tier: MembershipTier;
  discountPercent: number;
  priorityBooking: boolean;
  extendedGracePeriod: number; // minutes
  freeHours: number; // per month
  specialRates: Partial<Record<VehicleType, number>>;
  features: string[];
}

export interface DemandForecast {
  hour: number;
  day: number; // 0-6 (Sunday-Saturday)
  expectedOccupancy: number; // percentage
  surgeMultiplier: number;
  confidence: number; // 0-1
}

export interface PricingRule {
  id: string;
  name: string;
  condition: string; // JSON condition
  action: string; // JSON action
  priority: number;
  isActive: boolean;
  validFrom?: Date;
  validUntil?: Date;
}

class PricingEngine {
  private billingService: BillingService;
  private membershipBenefits: Map<MembershipTier, MembershipBenefits>;
  private surgeZones: Map<string, SurgeZone>;
  private activePricingRules: PricingRule[];
  private demandForecasts: DemandForecast[];

  constructor() {
    this.billingService = new BillingService();
    this.membershipBenefits = new Map();
    this.surgeZones = new Map();
    this.activePricingRules = [];
    this.demandForecasts = [];
    this.initializeMembershipBenefits();
    this.initializeSurgeZones();
    this.loadDemandForecasts();
  }

  /**
   * Calculate dynamic pricing based on context
   */
  async calculatePricing(context: PricingContext): Promise<PricingResult> {
    try {
      // Get base rate
      const baseRate = this.billingService.getSpotTypeRate(context.spotType);

      // Calculate surge pricing
      const surgeMultiplier = await this.calculateSurgeMultiplier(context);
      const surgeRate = baseRate * surgeMultiplier;

      // Apply membership benefits
      const membershipDiscount = await this.calculateMembershipDiscount(
        context.userId,
        context.membershipTier,
        surgeRate
      );

      // Apply discount code
      const discountCodeDiscount = await this.calculateDiscountCodeDiscount(
        context.discountCode,
        surgeRate,
        context
      );

      // Calculate final rate
      const totalDiscount = membershipDiscount + discountCodeDiscount;
      const finalRate = Math.max(0, surgeRate - totalDiscount);

      // Estimate total cost
      const estimatedDuration = context.expectedDuration || 120; // default 2 hours
      const totalEstimate = (estimatedDuration / 60) * finalRate;

      // Create breakdown
      const breakdown: PricingBreakdown = {
        baseHourlyRate: baseRate,
        surgeMultiplier,
        membershipDiscountPercent: baseRate > 0 ? (membershipDiscount / baseRate) * 100 : 0,
        discountCodePercent: baseRate > 0 ? (discountCodeDiscount / baseRate) * 100 : 0,
        finalHourlyRate: finalRate,
        estimatedDuration,
        subtotal: (estimatedDuration / 60) * surgeRate,
        discounts: totalDiscount * (estimatedDuration / 60),
        total: totalEstimate,
      };

      return {
        baseRate,
        surgeMultiplier,
        surgeRate,
        membershipDiscount,
        discountCodeDiscount,
        finalRate,
        totalEstimate: Math.round(totalEstimate * 100) / 100,
        breakdown,
        validUntil: new Date(Date.now() + 15 * 60 * 1000), // Valid for 15 minutes
      };
    } catch (error) {
      console.error('Pricing calculation error:', error);
      throw new Error('Failed to calculate pricing');
    }
  }

  /**
   * Calculate surge multiplier based on demand and time
   */
  private async calculateSurgeMultiplier(context: PricingContext): Promise<number> {
    let multiplier = 1.0;

    // Time-based surge (peak hours)
    const hour = context.checkInTime.getHours();
    const isWeekend = context.checkInTime.getDay() === 0 || context.checkInTime.getDay() === 6;

    // Peak hours: 7-9 AM, 5-7 PM on weekdays
    if (!isWeekend && ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19))) {
      multiplier = Math.max(multiplier, 1.5);
    }

    // Weekend surge (moderate)
    if (isWeekend && hour >= 10 && hour <= 22) {
      multiplier = Math.max(multiplier, 1.2);
    }

    // Demand-based surge
    const currentOccupancy = await this.getCurrentOccupancy(context.spotType);
    if (currentOccupancy > 0.8) {
      // 80% occupancy
      multiplier = Math.max(multiplier, 1.8);
    } else if (currentOccupancy > 0.6) {
      // 60% occupancy
      multiplier = Math.max(multiplier, 1.3);
    }

    // Event-based surge (check for nearby events)
    const eventMultiplier = await this.getEventSurgeMultiplier(context.checkInTime);
    multiplier = Math.max(multiplier, eventMultiplier);

    // Special spot type surge
    if (context.spotFeatures.includes('ev_charging')) {
      multiplier = Math.max(multiplier, 1.2); // 20% premium for EV charging
    }

    // Cap the maximum surge
    return Math.min(multiplier, 3.0); // Max 3x surge
  }

  /**
   * Calculate membership discount
   */
  private async calculateMembershipDiscount(
    userId?: string,
    membershipTier?: MembershipTier,
    rate = 0
  ): Promise<number> {
    if (!userId && !membershipTier) {
      return 0;
    }

    let tier = membershipTier;

    // Get user's membership tier if not provided
    if (!tier && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // Map role to membership tier
      switch (user?.role) {
        case 'VIP':
          tier = 'VIP';
          break;
        case 'PREMIUM':
          tier = 'PREMIUM';
          break;
        case 'CORPORATE':
          tier = 'CORPORATE';
          break;
        default:
          tier = 'BASIC';
      }
    }

    if (!tier) {
      return 0;
    }

    const benefits = this.membershipBenefits.get(tier);
    if (!benefits) {
      return 0;
    }

    return rate * (benefits.discountPercent / 100);
  }

  /**
   * Calculate discount code discount
   */
  private async calculateDiscountCodeDiscount(
    discountCode?: string,
    rate = 0,
    context?: PricingContext
  ): Promise<number> {
    if (!discountCode) {
      return 0;
    }

    // In a real implementation, this would query a database
    // For now, simulate some discount codes
    const mockDiscountCodes: Record<string, DiscountCode> = {
      WELCOME10: {
        id: 'dc1',
        code: 'WELCOME10',
        type: 'PERCENTAGE',
        value: 10,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
        usageLimit: 1000,
        usedCount: 150,
        isActive: true,
      },
      SAVE20: {
        id: 'dc2',
        code: 'SAVE20',
        type: 'PERCENTAGE',
        value: 20,
        minAmount: 10,
        maxDiscount: 50,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
        usageLimit: 500,
        usedCount: 200,
        applicableSpotTypes: ['standard', 'oversized'],
        isActive: true,
      },
      PREMIUM5: {
        id: 'dc3',
        code: 'PREMIUM5',
        type: 'FIXED_AMOUNT',
        value: 5,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
        usageLimit: 100,
        usedCount: 25,
        membershipTiersOnly: ['PREMIUM', 'VIP'],
        isActive: true,
      },
    };

    const discount = mockDiscountCodes[discountCode.toUpperCase()];
    if (!discount || !discount.isActive) {
      return 0;
    }

    // Check validity
    const now = new Date();
    if (now < discount.validFrom || now > discount.validUntil) {
      return 0;
    }

    // Check usage limit
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return 0;
    }

    // Check spot type applicability
    if (
      discount.applicableSpotTypes &&
      context?.spotType &&
      !discount.applicableSpotTypes.includes(context.spotType)
    ) {
      return 0;
    }

    // Check membership tier requirement
    if (
      discount.membershipTiersOnly &&
      context?.membershipTier &&
      !discount.membershipTiersOnly.includes(context.membershipTier)
    ) {
      return 0;
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === 'PERCENTAGE') {
      discountAmount = rate * (discount.value / 100);
      if (discount.maxDiscount) {
        discountAmount = Math.min(discountAmount, discount.maxDiscount);
      }
    } else {
      discountAmount = discount.value;
    }

    // Check minimum amount requirement
    if (discount.minAmount && rate < discount.minAmount) {
      return 0;
    }

    return discountAmount;
  }

  /**
   * Get current occupancy rate for spot type
   */
  private async getCurrentOccupancy(spotType: VehicleType): Promise<number> {
    const [totalSpots, occupiedSpots] = await Promise.all([
      prisma.parkingSpot.count({
        where: {
          spotType: spotType.toUpperCase() as any,
          isActive: true,
        },
      }),
      prisma.parkingSpot.count({
        where: {
          spotType: spotType.toUpperCase() as any,
          status: 'OCCUPIED',
          isActive: true,
        },
      }),
    ]);

    return totalSpots > 0 ? occupiedSpots / totalSpots : 0;
  }

  /**
   * Get event-based surge multiplier
   */
  private async getEventSurgeMultiplier(checkInTime: Date): Promise<number> {
    // In a real implementation, this would check for nearby events
    // from an events database or external API

    // Mock implementation: special events on Friday/Saturday nights
    const day = checkInTime.getDay();
    const hour = checkInTime.getHours();

    if ((day === 5 || day === 6) && hour >= 18 && hour <= 23) {
      return 1.4; // 40% surge for weekend evenings
    }

    return 1.0;
  }

  /**
   * Initialize membership benefits
   */
  private initializeMembershipBenefits(): void {
    this.membershipBenefits.set('BASIC', {
      tier: 'BASIC',
      discountPercent: 0,
      priorityBooking: false,
      extendedGracePeriod: 5,
      freeHours: 0,
      specialRates: {},
      features: [],
    });

    this.membershipBenefits.set('PREMIUM', {
      tier: 'PREMIUM',
      discountPercent: 10,
      priorityBooking: true,
      extendedGracePeriod: 15,
      freeHours: 2,
      specialRates: {
        compact: 3.5,
        standard: 4.0,
        oversized: 5.5,
      },
      features: ['priority_support', 'monthly_reports'],
    });

    this.membershipBenefits.set('VIP', {
      tier: 'VIP',
      discountPercent: 20,
      priorityBooking: true,
      extendedGracePeriod: 30,
      freeHours: 5,
      specialRates: {
        compact: 3.0,
        standard: 3.5,
        oversized: 5.0,
      },
      features: ['priority_support', 'monthly_reports', 'valet_service', 'reserved_spots'],
    });

    this.membershipBenefits.set('CORPORATE', {
      tier: 'CORPORATE',
      discountPercent: 25,
      priorityBooking: true,
      extendedGracePeriod: 30,
      freeHours: 10,
      specialRates: {
        compact: 2.5,
        standard: 3.0,
        oversized: 4.5,
      },
      features: [
        'priority_support',
        'monthly_reports',
        'bulk_billing',
        'dedicated_account_manager',
      ],
    });
  }

  /**
   * Initialize surge zones
   */
  private initializeSurgeZones(): void {
    this.surgeZones.set('premium', {
      id: 'premium',
      name: 'Premium Level',
      floors: [1],
      spotTypes: ['standard', 'oversized'],
      currentMultiplier: 1.2,
      maxMultiplier: 2.0,
      occupancyThreshold: 70,
      peakHours: [
        { start: '07:00', end: '09:00' },
        { start: '17:00', end: '19:00' },
      ],
      isActive: true,
    });

    this.surgeZones.set('ev_zone', {
      id: 'ev_zone',
      name: 'EV Charging Zone',
      floors: [1, 2],
      spotTypes: ['compact', 'standard'],
      currentMultiplier: 1.3,
      maxMultiplier: 2.5,
      occupancyThreshold: 60,
      peakHours: [{ start: '08:00', end: '18:00' }],
      isActive: true,
    });
  }

  /**
   * Load demand forecasts (mock implementation)
   */
  private loadDemandForecasts(): void {
    // Generate mock demand forecasts
    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        let expectedOccupancy = 0.3; // Base 30% occupancy
        let surgeMultiplier = 1.0;

        // Business hours patterns
        if (hour >= 8 && hour <= 17) {
          expectedOccupancy += 0.4;
          surgeMultiplier = 1.2;
        }

        // Peak hours
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
          expectedOccupancy += 0.3;
          surgeMultiplier = 1.5;
        }

        // Weekend patterns
        if (day === 0 || day === 6) {
          if (hour >= 10 && hour <= 22) {
            expectedOccupancy += 0.2;
            surgeMultiplier = 1.2;
          }
        }

        this.demandForecasts.push({
          hour,
          day,
          expectedOccupancy: Math.min(expectedOccupancy, 1.0),
          surgeMultiplier,
          confidence: 0.8,
        });
      }
    }
  }

  /**
   * Get pricing for multiple durations
   */
  async getPricingOptions(
    context: PricingContext
  ): Promise<Array<{ duration: number; pricing: PricingResult }>> {
    const durations = [60, 120, 240, 480, 1440]; // 1h, 2h, 4h, 8h, 24h
    const options = [];

    for (const duration of durations) {
      const contextWithDuration = { ...context, expectedDuration: duration };
      const pricing = await this.calculatePricing(contextWithDuration);
      options.push({ duration, pricing });
    }

    return options;
  }

  /**
   * Get membership benefits
   */
  getMembershipBenefits(tier: MembershipTier): MembershipBenefits | null {
    return this.membershipBenefits.get(tier) || null;
  }

  /**
   * Validate discount code
   */
  async validateDiscountCode(
    code: string,
    context?: PricingContext
  ): Promise<{
    valid: boolean;
    discount?: DiscountCode;
    reason?: string;
  }> {
    // Mock implementation - in production, this would query the database
    const mockDiscountCodes: Record<string, DiscountCode> = {
      WELCOME10: {
        id: 'dc1',
        code: 'WELCOME10',
        type: 'PERCENTAGE',
        value: 10,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2025-12-31'),
        usageLimit: 1000,
        usedCount: 150,
        isActive: true,
      },
    };

    const discount = mockDiscountCodes[code.toUpperCase()];
    if (!discount) {
      return { valid: false, reason: 'Discount code not found' };
    }

    if (!discount.isActive) {
      return { valid: false, reason: 'Discount code is inactive' };
    }

    const now = new Date();
    if (now < discount.validFrom || now > discount.validUntil) {
      return { valid: false, reason: 'Discount code has expired' };
    }

    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return { valid: false, reason: 'Discount code usage limit reached' };
    }

    return { valid: true, discount };
  }

  /**
   * Get current surge information
   */
  async getCurrentSurgeInfo(): Promise<
    Array<{ zone: string; multiplier: number; reason: string }>
  > {
    const surgeInfo = [];

    for (const [zoneId, zone] of this.surgeZones) {
      if (zone.isActive) {
        const occupancy = await this.getCurrentOccupancy('standard'); // Use standard as representative
        let multiplier = 1.0;
        let reason = 'Normal pricing';

        if (occupancy > zone.occupancyThreshold / 100) {
          multiplier = zone.currentMultiplier;
          reason = `High demand (${Math.round(occupancy * 100)}% occupancy)`;
        }

        surgeInfo.push({
          zone: zone.name,
          multiplier,
          reason,
        });
      }
    }

    return surgeInfo;
  }
}

export default new PricingEngine();
export { PricingEngine };
