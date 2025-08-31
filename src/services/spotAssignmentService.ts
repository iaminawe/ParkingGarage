/**
 * Spot Assignment Service
 *
 * This module handles the logic for automatically assigning the best
 * available parking spot based on vehicle type compatibility and
 * preference algorithms (lower floors, closer to entrance/elevator).
 *
 * @module SpotAssignmentService
 */

import {
  ISpotAssignmentService,
  SpotData,
  VehicleSpotCompatibilityMap,
  ScoredSpot,
  AssignmentSimulationResult,
  SpotAvailabilityByType,
  AssignmentStatistics,
  VehicleTypeAssignmentStats,
  VehicleType,
  SpotType,
  SpotId,
  ServiceOperationError,
  ServiceValidationError
} from '../types/index.js';

// Import repository (keeping CommonJS imports for now)
const SpotRepository = require('../repositories/spotRepository');

/**
 * Service for automatically assigning optimal parking spots
 */
export class SpotAssignmentService implements ISpotAssignmentService {
  private spotRepository: any;

  /**
   * Vehicle type compatibility mapping
   * Defines which vehicle types can park in which spot types
   */
  private static readonly VEHICLE_SPOT_COMPATIBILITY: VehicleSpotCompatibilityMap = {
    compact: ['compact', 'standard', 'oversized'],     // Compact cars can use any spot
    standard: ['standard', 'oversized'],               // Standard cars cannot use compact spots
    oversized: ['oversized']                           // Oversized vehicles need oversized spots only
  };

  constructor() {
    this.spotRepository = new SpotRepository();
  }

  /**
   * Find the best available spot for a vehicle
   */
  findBestAvailableSpot(vehicleType: VehicleType): SpotData | null {
    // Validate vehicle type
    const validVehicleTypes: VehicleType[] = ['compact', 'standard', 'oversized'];
    if (!validVehicleTypes.includes(vehicleType)) {
      throw new ServiceValidationError(`Invalid vehicle type: ${vehicleType}. Valid types: ${validVehicleTypes.join(', ')}`, 'vehicleType', vehicleType);
    }

    // Get compatible spot types for this vehicle
    const compatibleSpotTypes = SpotAssignmentService.VEHICLE_SPOT_COMPATIBILITY[vehicleType];

    // Find all available spots that are compatible
    const availableSpots = this.spotRepository.findAvailable();
    const compatibleSpots = availableSpots.filter((spot: any) =>
      compatibleSpotTypes.includes(spot.type)
    );

    if (compatibleSpots.length === 0) {
      return null;
    }

    // Apply assignment algorithm to find the best spot
    const bestSpot = this.applyAssignmentAlgorithm(compatibleSpots, vehicleType);
    return bestSpot;
  }

  /**
   * Apply the spot assignment algorithm
   * Priority: 1. Lower floors, 2. Closer to entrance/elevator, 3. Exact type match
   */
  applyAssignmentAlgorithm(compatibleSpots: SpotData[], vehicleType: VehicleType): SpotData {
    // Score each spot based on assignment criteria
    const scoredSpots: ScoredSpot[] = compatibleSpots.map((spot: any) => ({
      spot,
      score: this.calculateSpotScore(spot, vehicleType)
    }));

    // Sort by score (higher is better)
    scoredSpots.sort((a, b) => b.score - a.score);

    return scoredSpots[0].spot;
  }

  /**
   * Calculate a preference score for a spot
   * Higher score = more preferred spot
   */
  calculateSpotScore(spot: SpotData, vehicleType: VehicleType): number {
    let score = 0;

    // 1. Floor preference (lower floors preferred)
    // Ground floor gets highest score, each floor up reduces score
    const floorScore = Math.max(0, 100 - (spot.floor - 1) * 10);
    score += floorScore;

    // 2. Bay preference (closer to entrance/elevator)
    // Assume bay 1 and middle bays are closer to entrance/elevator
    const bayPreferenceScore = this.calculateBayPreferenceScore(spot.bay);
    score += bayPreferenceScore;

    // 3. Spot number preference (lower spot numbers closer to bay entrance)
    const spotNumberScore = Math.max(0, 50 - spot.spotNumber);
    score += spotNumberScore;

    // 4. Exact type match bonus
    if (spot.type === vehicleType) {
      score += 25;
    }

    // 5. Special features (EV charging gets bonus for any vehicle)
    if (spot.features.includes('ev_charging')) {
      score += 10;
    }

    // 6. Handicap spots get lower score unless specifically requested
    if (spot.features.includes('handicap')) {
      score -= 5; // Slight penalty to preserve for those who need them
    }

    return score;
  }

  /**
   * Calculate bay preference score
   * Bays closer to entrances/elevators get higher scores
   */
  calculateBayPreferenceScore(bayNumber: number): number {
    // Assume bay 1 and bay 5 are closest to entrances/elevators
    // This is a simple heuristic - in real implementation, this would
    // be based on actual garage layout
    const preferredBays = [1, 5, 6]; // Entrance and elevator locations

    if (preferredBays.includes(bayNumber)) {
      return 30;
    }

    // Bays 2-4 are somewhat close
    if (bayNumber >= 2 && bayNumber <= 4) {
      return 20;
    }

    // Other bays get lower score
    return 10;
  }

  /**
   * Check if a vehicle type is compatible with a spot type
   */
  isCompatible(vehicleType: VehicleType, spotType: SpotType): boolean {
    const compatibleSpotTypes = SpotAssignmentService.VEHICLE_SPOT_COMPATIBILITY[vehicleType];
    return compatibleSpotTypes && compatibleSpotTypes.includes(spotType);
  }

  /**
   * Get all compatible spot types for a vehicle type
   */
  getCompatibleSpotTypes(vehicleType: VehicleType): SpotType[] {
    return SpotAssignmentService.VEHICLE_SPOT_COMPATIBILITY[vehicleType] || [];
  }

  /**
   * Get available spots count by vehicle type compatibility
   */
  getAvailabilityByVehicleType(vehicleType: VehicleType): SpotAvailabilityByType {
    const compatibleSpotTypes = this.getCompatibleSpotTypes(vehicleType);
    const availableSpots = this.spotRepository.findAvailable();

    const compatibleSpots = availableSpots.filter((spot: any) =>
      compatibleSpotTypes.includes(spot.type)
    );

    // Group by spot type
    const bySpotType: Record<SpotType, number> = {} as Record<SpotType, number>;
    compatibleSpotTypes.forEach(type => {
      bySpotType[type] = compatibleSpots.filter((spot: any) => spot.type === type).length;
    });

    return {
      total: compatibleSpots.length,
      bySpotType,
      hasAvailable: compatibleSpots.length > 0
    };
  }

  /**
   * Simulate the assignment process without actually assigning
   * Useful for showing users what spot they would get
   */
  simulateAssignment(vehicleType: VehicleType): AssignmentSimulationResult {
    const bestSpot = this.findBestAvailableSpot(vehicleType);

    if (!bestSpot) {
      return {
        success: false,
        message: 'No compatible spots available',
        availableCount: 0
      };
    }

    const availability = this.getAvailabilityByVehicleType(vehicleType);

    return {
      success: true,
      assignedSpot: bestSpot,
      spotLocation: {
        floor: bestSpot.floor,
        bay: bestSpot.bay,
        spot: bestSpot.spotNumber
      },
      compatibility: {
        vehicleType,
        spotType: bestSpot.type,
        isExactMatch: bestSpot.type === vehicleType
      },
      availability: availability
    };
  }

  /**
   * Get assignment statistics for debugging/monitoring
   */
  getAssignmentStats(): AssignmentStatistics {
    const allSpots = this.spotRepository.findAll();
    const availableSpots = this.spotRepository.findAvailable();

    const statsByType: Record<VehicleType, VehicleTypeAssignmentStats> = {} as Record<VehicleType, VehicleTypeAssignmentStats>;
    
    (['compact', 'standard', 'oversized'] as VehicleType[]).forEach(vehicleType => {
      const availability = this.getAvailabilityByVehicleType(vehicleType);
      const simulation = this.simulateAssignment(vehicleType);

      statsByType[vehicleType] = {
        availableSpots: availability.total,
        hasAvailableSpot: availability.hasAvailable,
        wouldAssignTo: simulation.success ? {
          spotId: simulation.assignedSpot!.id,
          spotType: simulation.assignedSpot!.type,
          floor: simulation.assignedSpot!.floor
        } : null
      };
    });

    return {
      totalSpots: allSpots.length,
      availableSpots: availableSpots.length,
      occupancyRate: allSpots.length > 0 ? ((allSpots.length - availableSpots.length) / allSpots.length * 100).toFixed(2) : '0',
      byVehicleType: statsByType,
      timestamp: new Date().toISOString()
    };
  }
}

export default SpotAssignmentService;