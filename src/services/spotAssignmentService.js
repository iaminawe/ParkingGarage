/**
 * Spot Assignment Service
 *
 * This module handles the logic for automatically assigning the best
 * available parking spot based on vehicle type compatibility and
 * preference algorithms (lower floors, closer to entrance/elevator).
 *
 * @module SpotAssignmentService
 */

const SpotRepository = require('../repositories/spotRepository');

/**
 * Service for automatically assigning optimal parking spots
 */
class SpotAssignmentService {
  constructor() {
    this.spotRepository = new SpotRepository();
  }

  /**
   * Vehicle type compatibility mapping
   * Defines which vehicle types can park in which spot types
   */
  static VEHICLE_SPOT_COMPATIBILITY = {
    compact: ['compact', 'standard', 'oversized'],     // Compact cars can use any spot
    standard: ['standard', 'oversized'],               // Standard cars cannot use compact spots
    oversized: ['oversized']                           // Oversized vehicles need oversized spots only
  };

  /**
   * Find the best available spot for a vehicle
   * @param {string} vehicleType - Vehicle type ('compact', 'standard', 'oversized')
   * @returns {Object|null} Best available spot or null if none available
   */
  findBestAvailableSpot(vehicleType) {
    // Validate vehicle type
    const validVehicleTypes = ['compact', 'standard', 'oversized'];
    if (!validVehicleTypes.includes(vehicleType)) {
      throw new Error(`Invalid vehicle type: ${vehicleType}. Valid types: ${validVehicleTypes.join(', ')}`);
    }

    // Get compatible spot types for this vehicle
    const compatibleSpotTypes = SpotAssignmentService.VEHICLE_SPOT_COMPATIBILITY[vehicleType];

    // Find all available spots that are compatible
    const availableSpots = this.spotRepository.findAvailable();
    const compatibleSpots = availableSpots.filter(spot =>
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
   * @param {Array} compatibleSpots - Array of compatible available spots
   * @param {string} vehicleType - Vehicle type for preference scoring
   * @returns {Object} Best spot based on algorithm
   */
  applyAssignmentAlgorithm(compatibleSpots, vehicleType) {
    // Score each spot based on assignment criteria
    const scoredSpots = compatibleSpots.map(spot => ({
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
   * @param {Object} spot - Spot to score
   * @param {string} vehicleType - Vehicle type for type matching bonus
   * @returns {number} Spot preference score
   */
  calculateSpotScore(spot, vehicleType) {
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
    if (spot.hasFeature('ev_charging')) {
      score += 10;
    }

    // 6. Handicap spots get lower score unless specifically requested
    if (spot.hasFeature('handicap')) {
      score -= 5; // Slight penalty to preserve for those who need them
    }

    return score;
  }

  /**
   * Calculate bay preference score
   * Bays closer to entrances/elevators get higher scores
   * @param {number} bayNumber - Bay number
   * @returns {number} Bay preference score
   */
  calculateBayPreferenceScore(bayNumber) {
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
   * @param {string} vehicleType - Vehicle type
   * @param {string} spotType - Spot type
   * @returns {boolean} True if compatible
   */
  isCompatible(vehicleType, spotType) {
    const compatibleSpotTypes = SpotAssignmentService.VEHICLE_SPOT_COMPATIBILITY[vehicleType];
    return compatibleSpotTypes && compatibleSpotTypes.includes(spotType);
  }

  /**
   * Get all compatible spot types for a vehicle type
   * @param {string} vehicleType - Vehicle type
   * @returns {string[]} Array of compatible spot types
   */
  getCompatibleSpotTypes(vehicleType) {
    return SpotAssignmentService.VEHICLE_SPOT_COMPATIBILITY[vehicleType] || [];
  }

  /**
   * Get available spots count by vehicle type compatibility
   * @param {string} vehicleType - Vehicle type
   * @returns {Object} Count statistics
   */
  getAvailabilityByVehicleType(vehicleType) {
    const compatibleSpotTypes = this.getCompatibleSpotTypes(vehicleType);
    const availableSpots = this.spotRepository.findAvailable();

    const compatibleSpots = availableSpots.filter(spot =>
      compatibleSpotTypes.includes(spot.type)
    );

    // Group by spot type
    const bySpotType = {};
    compatibleSpotTypes.forEach(type => {
      bySpotType[type] = compatibleSpots.filter(spot => spot.type === type).length;
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
   * @param {string} vehicleType - Vehicle type
   * @returns {Object|null} Simulation result
   */
  simulateAssignment(vehicleType) {
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
   * @returns {Object} Assignment algorithm statistics
   */
  getAssignmentStats() {
    const allSpots = this.spotRepository.findAll();
    const availableSpots = this.spotRepository.findAvailable();

    const statsByType = {};
    ['compact', 'standard', 'oversized'].forEach(vehicleType => {
      const availability = this.getAvailabilityByVehicleType(vehicleType);
      const simulation = this.simulateAssignment(vehicleType);

      statsByType[vehicleType] = {
        availableSpots: availability.total,
        hasAvailableSpot: availability.hasAvailable,
        wouldAssignTo: simulation.success ? {
          spotId: simulation.assignedSpot.id,
          spotType: simulation.assignedSpot.type,
          floor: simulation.assignedSpot.floor
        } : null
      };
    });

    return {
      totalSpots: allSpots.length,
      availableSpots: availableSpots.length,
      occupancyRate: allSpots.length > 0 ? ((allSpots.length - availableSpots.length) / allSpots.length * 100).toFixed(2) : 0,
      byVehicleType: statsByType,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SpotAssignmentService;
