/**
 * Spot assignment algorithm type definitions
 */

import { 
  SpotId, 
  SpotType, 
  VehicleType, 
  SpotFeature, 
  Timestamp
} from './common.js';

import { SpotData } from './spot.js';

// Vehicle-spot compatibility types
export type VehicleSpotCompatibilityMap = {
  [K in VehicleType]: SpotType[];
};

export interface SpotCompatibilityInfo {
  vehicleType: VehicleType;
  spotType: SpotType;
  isCompatible: boolean;
  compatibilityScore: number;
}

// Spot scoring and assignment types
export interface ScoredSpot {
  spot: SpotData;
  score: number;
}

export interface SpotScoreComponents {
  floorScore: number;
  bayPreferenceScore: number;
  spotNumberScore: number;
  exactTypeMatchBonus: number;
  featureBonuses: number;
  featurePenalties: number;
}

// Assignment simulation types
export interface AssignmentSimulationLocation {
  floor: number;
  bay: number;
  spot: number;
}

export interface AssignmentCompatibility {
  vehicleType: VehicleType;
  spotType: SpotType;
  isExactMatch: boolean;
}

export interface SpotAvailabilityByType {
  total: number;
  bySpotType: Record<SpotType, number>;
  hasAvailable: boolean;
}

export interface AssignmentSimulationResult {
  success: boolean;
  message?: string;
  availableCount?: number;
  assignedSpot?: SpotData;
  spotLocation?: AssignmentSimulationLocation;
  compatibility?: AssignmentCompatibility;
  availability?: SpotAvailabilityByType;
}

// Assignment statistics types
export interface VehicleTypeAssignmentStats {
  availableSpots: number;
  hasAvailableSpot: boolean;
  wouldAssignTo: {
    spotId: SpotId;
    spotType: SpotType;
    floor: number;
  } | null;
}

export interface AssignmentStatistics {
  totalSpots: number;
  availableSpots: number;
  occupancyRate: string;
  byVehicleType: Record<VehicleType, VehicleTypeAssignmentStats>;
  timestamp: Timestamp;
}

// Spot assignment service interface
export interface ISpotAssignmentService {
  findBestAvailableSpot(vehicleType: VehicleType): SpotData | null;
  applyAssignmentAlgorithm(compatibleSpots: SpotData[], vehicleType: VehicleType): SpotData;
  calculateSpotScore(spot: SpotData, vehicleType: VehicleType): number;
  calculateBayPreferenceScore(bayNumber: number): number;
  isCompatible(vehicleType: VehicleType, spotType: SpotType): boolean;
  getCompatibleSpotTypes(vehicleType: VehicleType): SpotType[];
  getAvailabilityByVehicleType(vehicleType: VehicleType): SpotAvailabilityByType;
  simulateAssignment(vehicleType: VehicleType): AssignmentSimulationResult;
  getAssignmentStats(): AssignmentStatistics;
}

// Assignment algorithm preferences
export interface AssignmentPreferences {
  preferLowerFloors: boolean;
  preferCloseToBays: number[];
  preferExactTypeMatch: boolean;
  evChargingBonus: number;
  handicapPenalty: number;
  maxFloorPenalty: number;
  bayPreferenceBonuses: Record<number, number>;
}