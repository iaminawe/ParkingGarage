/**
 * Billing Service
 * 
 * This module handles fee calculations for parking sessions including
 * base rates, spot-type specific rates, EV charging premiums,
 * rate type multipliers, and promotional discounts.
 * 
 * @module BillingService
 */

import { calculateBillableHours, applyGracePeriod } from '../utils/timeCalculator';
import type { VehicleType, SpotFeature, RateType, VehicleRecord } from '../types/models';

/**
 * Billing calculation parameters interface
 */
export interface BillingParams {
  totalMinutes: number;
  spotType: VehicleType;
  spotFeatures?: SpotFeature[];
  rateType?: RateType;
  customRate?: number;
  applyGrace?: boolean;
  gracePeriodMinutes?: number;
}

/**
 * Feature premium breakdown interface
 */
export interface FeaturePremiumBreakdown {
  [key: string]: number;
}

/**
 * Billing result breakdown interface
 */
export interface BillingBreakdown {
  baseCharge: number;
  featurePremiums: FeaturePremiumBreakdown;
  rateTypeAdjustment: number;
  gracePeriodApplied: boolean;
}

/**
 * Duration information interface
 */
export interface DurationInfo {
  totalMinutes: number;
  totalHours: number;
  billableHours: number;
}

/**
 * Rates information interface
 */
export interface RatesInfo {
  baseRatePerHour: number;
  featurePremiumsPerHour: number;
  effectiveRatePerHour: number;
}

/**
 * Billing information interface
 */
export interface BillingInfo {
  subtotal: number;
  rateTypeDiscount: number;
  totalAmount: number;
}

/**
 * Spot information interface
 */
export interface SpotInfo {
  type: VehicleType;
  features: SpotFeature[];
}

/**
 * Billing calculation result interface
 */
export interface BillingResult {
  duration: DurationInfo;
  rates: RatesInfo;
  billing: BillingInfo;
  spotInfo: SpotInfo;
  rateType: RateType;
  breakdown: BillingBreakdown;
  calculatedAt: string;
}

/**
 * Rate adjustment result interface
 */
export interface RateAdjustmentResult {
  adjustedAmount: number;
  discount: number;
}

/**
 * Premium calculation result interface
 */
export interface PremiumCalculationResult {
  totalPremiums: number;
  premiumBreakdown: FeaturePremiumBreakdown;
}

/**
 * Billing summary interface
 */
export interface BillingSummary {
  totalVehicles: number;
  totalRevenue: number;
  averageCost: number;
  bySpotType: Record<string, unknown>;
  byRateType: Record<string, unknown>;
  byFeatures: Record<string, unknown>;
}

/**
 * Default hourly rates by spot type (in USD)
 */
const DEFAULT_RATES: Record<VehicleType, number> = {
  compact: 4.00,
  standard: 5.00,
  oversized: 7.00
};

/**
 * Feature premiums (per hour)
 */
const FEATURE_PREMIUMS: Record<SpotFeature, number> = {
  ev_charging: 3.00,
  handicap: 0.00 // No premium for handicap spots
};

/**
 * Rate type multipliers for extended parking
 */
const RATE_TYPE_MULTIPLIERS: Record<RateType, number> = {
  hourly: 1.0,
  daily: 0.8,    // 20% discount for daily rate
  monthly: 0.6   // 40% discount for monthly rate
};

/**
 * Maximum hours for rate type calculations
 */
const RATE_TYPE_CAPS: Record<'daily' | 'monthly', number> = {
  daily: 8,      // Daily rate caps at 8 hours
  monthly: 24    // Monthly rate caps at 24 hours per day
};

/**
 * Service for handling parking fee calculations
 */
export class BillingService {
  private rates: Record<VehicleType, number>;
  private featurePremiums: Record<SpotFeature, number>;
  private rateTypeMultipliers: Record<RateType, number>;
  private rateTypeCaps: Record<string, number>;

  constructor() {
    this.rates = { ...DEFAULT_RATES };
    this.featurePremiums = { ...FEATURE_PREMIUMS };
    this.rateTypeMultipliers = { ...RATE_TYPE_MULTIPLIERS };
    this.rateTypeCaps = { ...RATE_TYPE_CAPS };
  }

  /**
   * Calculate total parking fee for a vehicle
   * @param params - Billing parameters
   * @returns Detailed billing calculation
   */
  public calculateParkingFee(params: BillingParams): BillingResult {
    const {
      totalMinutes,
      spotType,
      spotFeatures = [],
      rateType = 'hourly',
      customRate = null,
      applyGrace = false,
      gracePeriodMinutes = 5
    } = params;

    // Input validation
    this.validateBillingInputs(params);

    // Apply grace period if enabled
    let billableHours: number;
    if (applyGrace) {
      billableHours = applyGracePeriod(totalMinutes, gracePeriodMinutes);
    } else {
      billableHours = calculateBillableHours(totalMinutes);
    }

    // If within grace period, return zero charge
    if (billableHours === 0) {
      return this.createBillingResult({
        totalMinutes,
        billableHours: 0,
        baseRate: 0,
        premiums: 0,
        subtotal: 0,
        rateTypeDiscount: 0,
        totalAmount: 0,
        spotType,
        spotFeatures,
        rateType,
        breakdown: {
          baseCharge: 0,
          featurePremiums: {},
          rateTypeAdjustment: 0,
          gracePeriodApplied: true
        }
      });
    }

    // Get base hourly rate
    const baseRate = customRate || this.getSpotTypeRate(spotType);

    // Calculate feature premiums
    const { totalPremiums, premiumBreakdown } = this.calculateFeaturePremiums(spotFeatures);

    // Calculate effective hourly rate (base + premiums)
    const effectiveRate = baseRate + totalPremiums;

    // Calculate subtotal before rate type adjustments
    const subtotal = billableHours * effectiveRate;

    // Apply rate type adjustments
    const { adjustedAmount, discount } = this.applyRateTypeAdjustment(
      subtotal, 
      billableHours, 
      rateType
    );

    const totalAmount = Math.round(adjustedAmount * 100) / 100;

    return this.createBillingResult({
      totalMinutes,
      billableHours,
      baseRate,
      premiums: totalPremiums,
      subtotal: Math.round(subtotal * 100) / 100,
      rateTypeDiscount: Math.round(discount * 100) / 100,
      totalAmount,
      spotType,
      spotFeatures,
      rateType,
      breakdown: {
        baseCharge: Math.round((billableHours * baseRate) * 100) / 100,
        featurePremiums: premiumBreakdown,
        rateTypeAdjustment: Math.round((adjustedAmount - subtotal) * 100) / 100,
        gracePeriodApplied: false
      }
    });
  }

  /**
   * Get hourly rate for spot type
   * @param spotType - Spot type
   * @returns Hourly rate
   */
  public getSpotTypeRate(spotType: VehicleType): number {
    return this.rates[spotType] || this.rates.standard;
  }

  /**
   * Calculate feature premiums
   * @param spotFeatures - Array of spot features
   * @returns Premium calculation
   */
  public calculateFeaturePremiums(spotFeatures: SpotFeature[]): PremiumCalculationResult {
    const premiumBreakdown: FeaturePremiumBreakdown = {};
    let totalPremiums = 0;

    for (const feature of spotFeatures) {
      const premium = this.featurePremiums[feature] || 0;
      premiumBreakdown[feature] = premium;
      totalPremiums += premium;
    }

    return {
      totalPremiums: Math.round(totalPremiums * 100) / 100,
      premiumBreakdown
    };
  }

  /**
   * Apply rate type adjustments (daily/monthly discounts)
   * @param subtotal - Subtotal before adjustments
   * @param billableHours - Billable hours
   * @param rateType - Rate type
   * @returns Adjusted amount and discount
   */
  public applyRateTypeAdjustment(
    subtotal: number, 
    billableHours: number, 
    rateType: RateType
  ): RateAdjustmentResult {
    if (rateType === 'hourly') {
      return { adjustedAmount: subtotal, discount: 0 };
    }

    const multiplier = this.rateTypeMultipliers[rateType] || 1.0;
    const cap = this.rateTypeCaps[rateType];

    let adjustedAmount = subtotal;
    let discount = 0;

    if (cap && billableHours > cap) {
      // For daily/monthly rates, cap the maximum charge
      const cappedSubtotal = (subtotal / billableHours) * cap;
      adjustedAmount = cappedSubtotal * multiplier;
      discount = subtotal - adjustedAmount;
    } else {
      // Apply multiplier discount
      adjustedAmount = subtotal * multiplier;
      discount = subtotal - adjustedAmount;
    }

    return {
      adjustedAmount: Math.max(0, adjustedAmount),
      discount: Math.max(0, discount)
    };
  }

  /**
   * Create standardized billing result object
   * @param data - Billing calculation data
   * @returns Standardized billing result
   */
  private createBillingResult(data: {
    totalMinutes: number;
    billableHours: number;
    baseRate: number;
    premiums: number;
    subtotal: number;
    rateTypeDiscount: number;
    totalAmount: number;
    spotType: VehicleType;
    spotFeatures: SpotFeature[];
    rateType: RateType;
    breakdown: BillingBreakdown;
  }): BillingResult {
    return {
      duration: {
        totalMinutes: data.totalMinutes,
        totalHours: Math.round((data.totalMinutes / 60) * 100) / 100,
        billableHours: data.billableHours
      },
      rates: {
        baseRatePerHour: data.baseRate,
        featurePremiumsPerHour: data.premiums,
        effectiveRatePerHour: data.baseRate + data.premiums
      },
      billing: {
        subtotal: data.subtotal,
        rateTypeDiscount: data.rateTypeDiscount,
        totalAmount: data.totalAmount
      },
      spotInfo: {
        type: data.spotType,
        features: data.spotFeatures
      },
      rateType: data.rateType,
      breakdown: data.breakdown,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Validate billing calculation inputs
   * @param params - Billing parameters
   * @throws {Error} If inputs are invalid
   */
  public validateBillingInputs(params: BillingParams): void {
    const { totalMinutes, spotType, spotFeatures, rateType } = params;

    if (typeof totalMinutes !== 'number' || totalMinutes < 0) {
      throw new Error('Total minutes must be a non-negative number');
    }

    const validSpotTypes = Object.keys(this.rates) as VehicleType[];
    if (!validSpotTypes.includes(spotType)) {
      throw new Error(`Invalid spot type: ${spotType}. Valid types: ${validSpotTypes.join(', ')}`);
    }

    if (spotFeatures && !Array.isArray(spotFeatures)) {
      throw new Error('Spot features must be an array');
    }

    const validRateTypes = Object.keys(this.rateTypeMultipliers) as RateType[];
    if (rateType && !validRateTypes.includes(rateType)) {
      throw new Error(`Invalid rate type: ${rateType}. Valid types: ${validRateTypes.join(', ')}`);
    }
  }

  /**
   * Get available spot types and their rates
   * @returns Spot types and rates
   */
  public getSpotTypeRates(): Record<VehicleType, number> {
    return { ...this.rates };
  }

  /**
   * Get available features and their premiums
   * @returns Features and premiums
   */
  public getFeaturePremiums(): Record<SpotFeature, number> {
    return { ...this.featurePremiums };
  }

  /**
   * Get rate type multipliers
   * @returns Rate type multipliers
   */
  public getRateTypeMultipliers(): Record<RateType, number> {
    return { ...this.rateTypeMultipliers };
  }

  /**
   * Update spot type rate
   * @param spotType - Spot type
   * @param rate - New hourly rate
   */
  public updateSpotTypeRate(spotType: VehicleType, rate: number): void {
    if (typeof rate !== 'number' || rate < 0) {
      throw new Error('Rate must be a non-negative number');
    }
    this.rates[spotType] = rate;
  }

  /**
   * Update feature premium
   * @param feature - Feature name
   * @param premium - Premium per hour
   */
  public updateFeaturePremium(feature: SpotFeature, premium: number): void {
    if (typeof premium !== 'number' || premium < 0) {
      throw new Error('Premium must be a non-negative number');
    }
    this.featurePremiums[feature] = premium;
  }

  /**
   * Calculate estimated cost for ongoing parking session
   * @param checkInTime - ISO timestamp of check-in
   * @param spotType - Spot type
   * @param spotFeatures - Spot features
   * @param rateType - Rate type
   * @returns Current estimated cost
   */
  public calculateCurrentEstimate(
    checkInTime: string, 
    spotType: VehicleType, 
    spotFeatures: SpotFeature[] = [], 
    rateType: RateType = 'hourly'
  ): BillingResult {
    const now = new Date();
    const checkIn = new Date(checkInTime);
    const totalMinutes = Math.floor((now.getTime() - checkIn.getTime()) / (1000 * 60));

    return this.calculateParkingFee({
      totalMinutes,
      spotType,
      spotFeatures,
      rateType
    });
  }

  /**
   * Get billing summary for multiple vehicles
   * @param vehicles - Array of vehicle parking records
   * @returns Billing summary
   */
  public getBillingSummary(vehicles: VehicleRecord[]): BillingSummary {
    const summary: BillingSummary = {
      totalVehicles: vehicles.length,
      totalRevenue: 0,
      averageCost: 0,
      bySpotType: {},
      byRateType: {},
      byFeatures: {}
    };

    vehicles.forEach(vehicle => {
      if (vehicle.totalAmount) {
        summary.totalRevenue += vehicle.totalAmount;
      }
    });

    summary.averageCost = vehicles.length > 0 ? 
      Math.round((summary.totalRevenue / vehicles.length) * 100) / 100 : 0;
    
    summary.totalRevenue = Math.round(summary.totalRevenue * 100) / 100;

    return summary;
  }
}

export default BillingService;