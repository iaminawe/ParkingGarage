/**
 * Billing Service
 *
 * This module handles fee calculations for parking sessions including
 * base rates, spot-type specific rates, EV charging premiums,
 * rate type multipliers, and promotional discounts.
 *
 * @module BillingService
 */

import {
  IBillingService,
  BillingCalculationParams,
  BillingCalculationResult,
  SpotTypeRates,
  FeaturePremiums,
  RateTypeMultipliers,
  BillingDuration,
  BillingRates,
  BillingAmounts,
  BillingSpotInfo,
  BillingBreakdown,
  SpotType,
  SpotFeature,
  RateType,
  Currency,
  Timestamp,
  ServiceValidationError,
  ServiceOperationError
} from '../types/index.js';

// Import utilities (keeping CommonJS imports for now)
const { calculateBillableHours, applyGracePeriod } = require('../utils/timeCalculator');

/**
 * Default hourly rates by spot type (in USD)
 */
const DEFAULT_RATES: SpotTypeRates = {
  compact: 4.00,
  standard: 5.00,
  oversized: 7.00
};

/**
 * Feature premiums (per hour)
 */
const FEATURE_PREMIUMS: FeaturePremiums = {
  ev_charging: 3.00,
  handicap: 0.00 // No premium for handicap spots
};

/**
 * Rate type multipliers for extended parking
 */
const RATE_TYPE_MULTIPLIERS: RateTypeMultipliers = {
  hourly: 1.0,
  daily: 0.8,    // 20% discount for daily rate
  monthly: 0.6   // 40% discount for monthly rate
};

/**
 * Maximum hours for rate type calculations
 */
const RATE_TYPE_CAPS = {
  daily: 8,      // Daily rate caps at 8 hours
  monthly: 24    // Monthly rate caps at 24 hours per day
};

/**
 * Service for handling parking fee calculations
 */
export class BillingService implements IBillingService {
  private rates: SpotTypeRates;
  private featurePremiums: FeaturePremiums;
  private rateTypeMultipliers: RateTypeMultipliers;
  private rateTypeCaps: typeof RATE_TYPE_CAPS;

  constructor() {
    this.rates = { ...DEFAULT_RATES };
    this.featurePremiums = { ...FEATURE_PREMIUMS };
    this.rateTypeMultipliers = { ...RATE_TYPE_MULTIPLIERS };
    this.rateTypeCaps = { ...RATE_TYPE_CAPS };
  }

  /**
   * Calculate total parking fee for a vehicle
   */
  calculateParkingFee(params: BillingCalculationParams): BillingCalculationResult {
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
          featurePremiums: { ev_charging: 0, handicap: 0 },
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
   */
  getSpotTypeRate(spotType: SpotType): Currency {
    return this.rates[spotType] || this.rates.standard;
  }

  /**
   * Calculate feature premiums
   */
  calculateFeaturePremiums(spotFeatures: SpotFeature[]): {
    totalPremiums: Currency;
    premiumBreakdown: Record<SpotFeature, Currency>;
  } {
    const premiumBreakdown: Partial<Record<SpotFeature, Currency>> = {};
    let totalPremiums = 0;

    for (const feature of spotFeatures) {
      const premium = this.featurePremiums[feature] || 0;
      premiumBreakdown[feature] = premium;
      totalPremiums += premium;
    }

    // Ensure all features have a value
    const fullBreakdown: Record<SpotFeature, Currency> = {
      ev_charging: premiumBreakdown.ev_charging || 0,
      handicap: premiumBreakdown.handicap || 0
    };

    return {
      totalPremiums: Math.round(totalPremiums * 100) / 100,
      premiumBreakdown: fullBreakdown
    };
  }

  /**
   * Apply rate type adjustments (daily/monthly discounts)
   */
  applyRateTypeAdjustment(subtotal: Currency, billableHours: number, rateType: RateType): {
    adjustedAmount: Currency;
    discount: Currency;
  } {
    if (rateType === 'hourly') {
      return { adjustedAmount: subtotal, discount: 0 };
    }

    const multiplier = this.rateTypeMultipliers[rateType] || 1.0;
    const cap = this.rateTypeCaps[rateType as keyof typeof RATE_TYPE_CAPS];

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
   */
  private createBillingResult(data: {
    totalMinutes: number;
    billableHours: number;
    baseRate: Currency;
    premiums: Currency;
    subtotal: Currency;
    rateTypeDiscount: Currency;
    totalAmount: Currency;
    spotType: SpotType;
    spotFeatures: SpotFeature[];
    rateType: RateType;
    breakdown: BillingBreakdown;
  }): BillingCalculationResult {
    const duration: BillingDuration = {
      totalMinutes: data.totalMinutes,
      totalHours: Math.round((data.totalMinutes / 60) * 100) / 100,
      billableHours: data.billableHours
    };

    const rates: BillingRates = {
      baseRatePerHour: data.baseRate,
      featurePremiumsPerHour: data.premiums,
      effectiveRatePerHour: data.baseRate + data.premiums
    };

    const billing: BillingAmounts = {
      subtotal: data.subtotal,
      rateTypeDiscount: data.rateTypeDiscount,
      totalAmount: data.totalAmount
    };

    const spotInfo: BillingSpotInfo = {
      type: data.spotType,
      features: data.spotFeatures
    };

    return {
      duration,
      rates,
      billing,
      spotInfo,
      rateType: data.rateType,
      breakdown: data.breakdown,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Validate billing calculation inputs
   */
  private validateBillingInputs(params: BillingCalculationParams): void {
    const { totalMinutes, spotType, spotFeatures, rateType } = params;

    if (typeof totalMinutes !== 'number' || totalMinutes < 0) {
      throw new ServiceValidationError('Total minutes must be a non-negative number', 'totalMinutes', totalMinutes);
    }

    const validSpotTypes = Object.keys(this.rates) as SpotType[];
    if (!validSpotTypes.includes(spotType)) {
      throw new ServiceValidationError(`Invalid spot type: ${spotType}. Valid types: ${validSpotTypes.join(', ')}`, 'spotType', spotType);
    }

    if (spotFeatures && !Array.isArray(spotFeatures)) {
      throw new ServiceValidationError('Spot features must be an array', 'spotFeatures', spotFeatures);
    }

    const validRateTypes = Object.keys(this.rateTypeMultipliers) as RateType[];
    if (!validRateTypes.includes(rateType!)) {
      throw new ServiceValidationError(`Invalid rate type: ${rateType}. Valid types: ${validRateTypes.join(', ')}`, 'rateType', rateType);
    }
  }

  /**
   * Get available spot types and their rates
   */
  getSpotTypeRates(): SpotTypeRates {
    return { ...this.rates };
  }

  /**
   * Get available features and their premiums
   */
  getFeaturePremiums(): FeaturePremiums {
    return { ...this.featurePremiums };
  }

  /**
   * Get rate type multipliers
   */
  getRateTypeMultipliers(): RateTypeMultipliers {
    return { ...this.rateTypeMultipliers };
  }

  /**
   * Update spot type rate
   */
  updateSpotTypeRate(spotType: SpotType, rate: Currency): void {
    if (typeof rate !== 'number' || rate < 0) {
      throw new ServiceValidationError('Rate must be a non-negative number', 'rate', rate);
    }
    this.rates[spotType] = rate;
  }

  /**
   * Update feature premium
   */
  updateFeaturePremium(feature: SpotFeature, premium: Currency): void {
    if (typeof premium !== 'number' || premium < 0) {
      throw new ServiceValidationError('Premium must be a non-negative number', 'premium', premium);
    }
    this.featurePremiums[feature] = premium;
  }

  /**
   * Calculate estimated cost for ongoing parking session
   */
  calculateCurrentEstimate(checkInTime: Timestamp, spotType: SpotType, spotFeatures: SpotFeature[] = [], rateType: RateType = 'hourly'): BillingCalculationResult {
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
   */
  getBillingSummary(vehicles: any[]): {
    totalVehicles: number;
    totalRevenue: Currency;
    averageCost: Currency;
    bySpotType: Record<string, any>;
    byRateType: Record<string, any>;
    byFeatures: Record<string, any>;
  } {
    const summary = {
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