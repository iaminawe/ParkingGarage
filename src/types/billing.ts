/**
 * Billing and payment type definitions
 */

import { Currency, SpotType, SpotFeature, RateType, Timestamp } from './common.js';

// Billing calculation parameters
export interface BillingCalculationParams {
  totalMinutes: number;
  spotType: SpotType;
  spotFeatures?: SpotFeature[];
  rateType?: RateType;
  customRate?: Currency;
  applyGrace?: boolean;
  gracePeriodMinutes?: number;
}

// Rate structures
export interface SpotTypeRates {
  compact: Currency;
  standard: Currency;
  oversized: Currency;
}

export interface FeaturePremiums {
  ev_charging: Currency;
  handicap: Currency;
}

export interface RateTypeMultipliers {
  hourly: number;
  daily: number;
  monthly: number;
}

export interface RateTypeCaps {
  daily: number;
  monthly: number;
}

// Billing calculation components
export interface BillingDuration {
  totalMinutes: number;
  totalHours: number;
  billableHours: number;
}

export interface BillingRates {
  baseRatePerHour: Currency;
  featurePremiumsPerHour: Currency;
  effectiveRatePerHour: Currency;
}

export interface BillingAmounts {
  subtotal: Currency;
  rateTypeDiscount: Currency;
  totalAmount: Currency;
}

export interface BillingSpotInfo {
  type: SpotType;
  features: SpotFeature[];
}

export interface BillingBreakdown {
  baseCharge: Currency;
  featurePremiums: Record<SpotFeature, Currency>;
  rateTypeAdjustment: Currency;
  gracePeriodApplied: boolean;
}

// Complete billing result
export interface BillingCalculationResult {
  duration: BillingDuration;
  rates: BillingRates;
  billing: BillingAmounts;
  spotInfo: BillingSpotInfo;
  rateType: RateType;
  breakdown: BillingBreakdown;
  calculatedAt: Timestamp;
}

// Billing service interface
export interface IBillingService {
  calculateParkingFee(params: BillingCalculationParams): BillingCalculationResult;
  getSpotTypeRate(spotType: SpotType): Currency;
  calculateFeaturePremiums(spotFeatures: SpotFeature[]): {
    totalPremiums: Currency;
    premiumBreakdown: Record<SpotFeature, Currency>;
  };
  applyRateTypeAdjustment(subtotal: Currency, billableHours: number, rateType: RateType): {
    adjustedAmount: Currency;
    discount: Currency;
  };
  getSpotTypeRates(): SpotTypeRates;
  getFeaturePremiums(): FeaturePremiums;
  getRateTypeMultipliers(): RateTypeMultipliers;
  updateSpotTypeRate(spotType: SpotType, rate: Currency): void;
  updateFeaturePremium(feature: SpotFeature, premium: Currency): void;
  calculateCurrentEstimate(checkInTime: Timestamp, spotType: SpotType, spotFeatures?: SpotFeature[], rateType?: RateType): BillingCalculationResult;
  getBillingSummary(vehicles: any[]): {
    totalVehicles: number;
    totalRevenue: Currency;
    averageCost: Currency;
    bySpotType: Record<string, any>;
    byRateType: Record<string, any>;
    byFeatures: Record<string, any>;
  };
}

// Payment and checkout types
export interface PaymentInfo {
  amount: Currency;
  method?: 'cash' | 'card' | 'digital';
  transactionId?: string;
  paidAt?: Timestamp;
}

export interface CheckoutOptions {
  applyGracePeriod?: boolean;
  removeRecord?: boolean;
  checkOutTime?: Timestamp;
}

// Current parking session estimate
export interface ParkingSessionEstimate {
  currentDuration: BillingDuration;
  estimatedCost: BillingCalculationResult;
  projectedCost?: BillingCalculationResult;
  lastCalculated: Timestamp;
}