/**
 * Billing Service
 *
 * This module handles fee calculations for parking sessions including
 * base rates, spot-type specific rates, EV charging premiums,
 * rate type multipliers, and promotional discounts.
 *
 * @module BillingService
 */

const { calculateBillableHours, applyGracePeriod } = require('../utils/timeCalculator');

/**
 * Default hourly rates by spot type (in USD)
 */
const DEFAULT_RATES = {
  compact: 4.00,
  standard: 5.00,
  oversized: 7.00
};

/**
 * Feature premiums (per hour)
 */
const FEATURE_PREMIUMS = {
  ev_charging: 3.00,
  handicap: 0.00 // No premium for handicap spots
};

/**
 * Rate type multipliers for extended parking
 */
const RATE_TYPE_MULTIPLIERS = {
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
class BillingService {
  constructor() {
    this.rates = { ...DEFAULT_RATES };
    this.featurePremiums = { ...FEATURE_PREMIUMS };
    this.rateTypeMultipliers = { ...RATE_TYPE_MULTIPLIERS };
    this.rateTypeCaps = { ...RATE_TYPE_CAPS };
  }

  /**
   * Calculate total parking fee for a vehicle
   * @param {Object} params - Billing parameters
   * @param {number} params.totalMinutes - Total parking time in minutes
   * @param {string} params.spotType - Spot type ('compact', 'standard', 'oversized')
   * @param {string[]} params.spotFeatures - Array of spot features (['ev_charging', 'handicap'])
   * @param {string} params.rateType - Rate type ('hourly', 'daily', 'monthly')
   * @param {number} params.customRate - Custom hourly rate (optional, overrides default)
   * @param {boolean} params.applyGrace - Whether to apply grace period (default: false)
   * @param {number} params.gracePeriodMinutes - Grace period in minutes (default: 5)
   * @returns {Object} Detailed billing calculation
   */
  calculateParkingFee(params) {
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
    let billableHours;
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
   * @param {string} spotType - Spot type
   * @returns {number} Hourly rate
   */
  getSpotTypeRate(spotType) {
    return this.rates[spotType] || this.rates.standard;
  }

  /**
   * Calculate feature premiums
   * @param {string[]} spotFeatures - Array of spot features
   * @returns {Object} Premium calculation
   */
  calculateFeaturePremiums(spotFeatures) {
    const premiumBreakdown = {};
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
   * @param {number} subtotal - Subtotal before adjustments
   * @param {number} billableHours - Billable hours
   * @param {string} rateType - Rate type
   * @returns {Object} Adjusted amount and discount
   */
  applyRateTypeAdjustment(subtotal, billableHours, rateType) {
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
   * @param {Object} data - Billing calculation data
   * @returns {Object} Standardized billing result
   */
  createBillingResult(data) {
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
   * @param {Object} params - Billing parameters
   * @throws {Error} If inputs are invalid
   */
  validateBillingInputs(params) {
    const { totalMinutes, spotType, spotFeatures, rateType } = params;

    if (typeof totalMinutes !== 'number' || totalMinutes < 0) {
      throw new Error('Total minutes must be a non-negative number');
    }

    const validSpotTypes = Object.keys(this.rates);
    if (!validSpotTypes.includes(spotType)) {
      throw new Error(`Invalid spot type: ${spotType}. Valid types: ${validSpotTypes.join(', ')}`);
    }

    if (spotFeatures && !Array.isArray(spotFeatures)) {
      throw new Error('Spot features must be an array');
    }

    const validRateTypes = Object.keys(this.rateTypeMultipliers);
    if (!validRateTypes.includes(rateType)) {
      throw new Error(`Invalid rate type: ${rateType}. Valid types: ${validRateTypes.join(', ')}`);
    }
  }

  /**
   * Get available spot types and their rates
   * @returns {Object} Spot types and rates
   */
  getSpotTypeRates() {
    return { ...this.rates };
  }

  /**
   * Get available features and their premiums
   * @returns {Object} Features and premiums
   */
  getFeaturePremiums() {
    return { ...this.featurePremiums };
  }

  /**
   * Get rate type multipliers
   * @returns {Object} Rate type multipliers
   */
  getRateTypeMultipliers() {
    return { ...this.rateTypeMultipliers };
  }

  /**
   * Update spot type rate
   * @param {string} spotType - Spot type
   * @param {number} rate - New hourly rate
   */
  updateSpotTypeRate(spotType, rate) {
    if (typeof rate !== 'number' || rate < 0) {
      throw new Error('Rate must be a non-negative number');
    }
    this.rates[spotType] = rate;
  }

  /**
   * Update feature premium
   * @param {string} feature - Feature name
   * @param {number} premium - Premium per hour
   */
  updateFeaturePremium(feature, premium) {
    if (typeof premium !== 'number' || premium < 0) {
      throw new Error('Premium must be a non-negative number');
    }
    this.featurePremiums[feature] = premium;
  }

  /**
   * Calculate estimated cost for ongoing parking session
   * @param {string} checkInTime - ISO timestamp of check-in
   * @param {string} spotType - Spot type
   * @param {string[]} spotFeatures - Spot features
   * @param {string} rateType - Rate type
   * @returns {Object} Current estimated cost
   */
  calculateCurrentEstimate(checkInTime, spotType, spotFeatures = [], rateType = 'hourly') {
    const now = new Date();
    const checkIn = new Date(checkInTime);
    const totalMinutes = Math.floor((now - checkIn) / (1000 * 60));

    return this.calculateParkingFee({
      totalMinutes,
      spotType,
      spotFeatures,
      rateType
    });
  }

  /**
   * Get billing summary for multiple vehicles
   * @param {Array} vehicles - Array of vehicle parking records
   * @returns {Object} Billing summary
   */
  getBillingSummary(vehicles) {
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

module.exports = BillingService;
