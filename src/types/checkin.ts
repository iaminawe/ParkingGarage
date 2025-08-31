/**
 * Check-in operation type definitions
 */

import { 
  LicensePlate, 
  VehicleType, 
  RateType, 
  SpotId, 
  Timestamp, 
  SpotType, 
  SpotFeature,
  OperationResult
} from './common.js';

// Check-in input parameters
export interface CheckinParams {
  licensePlate: LicensePlate;
  vehicleType: VehicleType;
  rateType?: RateType;
}

// Check-in result data
export interface CheckinLocation {
  floor: number;
  bay: number;
  spot: number;
}

export interface CheckinVehicleInfo {
  licensePlate: LicensePlate;
  type: VehicleType;
  rateType: RateType;
}

export interface CheckinSpotDetails {
  type: SpotType;
  features: SpotFeature[];
}

export interface CheckinResult extends OperationResult<void> {
  spotId: SpotId;
  location: CheckinLocation;
  checkInTime: Timestamp;
  vehicle: CheckinVehicleInfo;
  spotDetails: CheckinSpotDetails;
}

// Check-in simulation types
export interface CheckinSimulationResult {
  success: boolean;
  error?: 'DUPLICATE_VEHICLE' | 'NO_AVAILABLE_SPOTS' | 'SIMULATION_ERROR';
  message: string;
  wouldAssignSpot?: SpotId;
  spotLocation?: CheckinLocation;
  compatibility?: {
    vehicleType: VehicleType;
    spotType: SpotType;
    isExactMatch: boolean;
  };
  availableCount?: number;
}

// Check-in statistics
export interface CheckinStatistics {
  vehicles: {
    totalParked: number;
    totalProcessed: number;
  };
  spots: {
    totalSpots: number;
    availableSpots: number;
    occupiedSpots: number;
    occupancyRate: number;
  };
  assignment: Record<VehicleType, any>;
  timestamp: Timestamp;
}

// Check-in service interface
export interface ICheckinService {
  checkInVehicle(licensePlate: LicensePlate, vehicleType: VehicleType, rateType?: RateType): CheckinResult;
  getCheckinStats(): CheckinStatistics;
  simulateCheckin(licensePlate: LicensePlate, vehicleType: VehicleType): CheckinSimulationResult;
}