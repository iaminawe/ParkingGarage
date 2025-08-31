/**
 * Check-out operation type definitions
 */

import { 
  LicensePlate, 
  VehicleType, 
  RateType, 
  SpotId, 
  SpotType,
  SpotFeature,
  Timestamp, 
  Currency,
  DurationBreakdown,
  OperationResult
} from './common.js';

import { BillingCalculationResult } from './billing.js';

// Check-out input parameters
export interface CheckoutOptions {
  applyGracePeriod?: boolean;
  removeRecord?: boolean;
  checkOutTime?: Timestamp;
}

// Check-out timing information
export interface CheckoutTiming {
  checkInTime: Timestamp;
  checkOutTime: Timestamp;
  duration: DurationBreakdown;
}

// Check-out billing information
export interface CheckoutBilling {
  ratePerHour: Currency;
  totalHours: number;
  subtotal: Currency;
  discount: Currency;
  totalAmount: Currency;
  breakdown: any;
}

// Check-out location information
export interface CheckoutLocation {
  floor: number;
  bay: number;
  spot: number;
}

// Check-out spot information
export interface CheckoutSpotDetails {
  type: SpotType;
  features: SpotFeature[];
}

// Check-out vehicle information
export interface CheckoutVehicleInfo {
  type: VehicleType;
  rateType: RateType;
}

// Complete check-out result
export interface CheckoutResult extends OperationResult<void> {
  licensePlate: LicensePlate;
  spotId: SpotId;
  location: CheckoutLocation;
  timing: CheckoutTiming;
  billing: CheckoutBilling;
  spotDetails: CheckoutSpotDetails;
  vehicleInfo: CheckoutVehicleInfo;
}

// Check-out simulation types
export interface CheckoutSimulation {
  licensePlate: LicensePlate;
  spotId: SpotId;
  estimatedDuration: DurationBreakdown;
  estimatedBilling: BillingCalculationResult;
  wouldRelease: SpotId;
  currentStatus: string;
}

export interface CheckoutSimulationResult {
  success: boolean;
  error?: 'SIMULATION_ERROR';
  message: string;
  simulation?: CheckoutSimulation;
}

// Check-out statistics
export interface CheckoutStatistics {
  vehicles: {
    totalCheckedOut: number;
    awaitingPayment: number;
    completed: number;
    stillParked: number;
  };
  revenue: {
    totalRevenue: Currency;
    pendingRevenue: Currency;
    averageRevenue: Currency;
    completedSessions: number;
  };
  spots: {
    totalSpots: number;
    availableSpots: number;
    occupancyRate: number;
  };
  timestamp: Timestamp;
}

// Ready for checkout information
export interface VehicleReadyForCheckout {
  licensePlate: LicensePlate;
  spotId: SpotId;
  checkInTime: Timestamp;
  currentDuration: DurationBreakdown;
  currentEstimate: BillingCalculationResult;
  vehicleType: VehicleType;
  rateType: RateType;
  spotType: SpotType;
  spotFeatures: SpotFeature[];
}

// Forced checkout result
export interface ForcedCheckoutResult extends CheckoutResult {
  forced: true;
  reason: string;
}

// Check-out service interface
export interface ICheckoutService {
  checkOutVehicle(licensePlate: LicensePlate, options?: CheckoutOptions): CheckoutResult;
  getCheckoutStats(): CheckoutStatistics;
  simulateCheckout(licensePlate: LicensePlate, options?: CheckoutOptions): CheckoutSimulationResult;
  getVehiclesReadyForCheckout(minMinutes?: number): VehicleReadyForCheckout[];
  forceCheckout(licensePlate: LicensePlate, reason?: string): ForcedCheckoutResult;
}