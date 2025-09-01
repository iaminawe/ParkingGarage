/**
 * Garage service for garage initialization and management operations
 * 
 * This service handles the business logic for garage configuration,
 * initialization, and spot creation. It orchestrates between the
 * garage repository and spot repository to ensure proper setup.
 * 
 * @module GarageService
 */

const GarageRepository = require('../repositories/garageRepository');
const SpotRepository = require('../repositories/spotRepository');

/**
 * Service class for garage management operations
 */
class GarageService {
  constructor() {
    this.garageRepository = new GarageRepository();
    this.spotRepository = new SpotRepository();
  }

  /**
   * Initialize a new garage with floors, bays, and spots
   * @param {Object} garageData - Garage initialization data
   * @param {string} garageData.name - Garage name
   * @param {Array} garageData.floors - Array of floor configurations
   * @returns {Object} Initialization result with garage config and created spots
   * @throws {Error} If garage already exists or initialization fails
   */
  async initializeGarage(garageData) {
    try {
      // Check if default garage already exists
      const existingGarage = this.garageRepository.getDefault();
      if (existingGarage) {
        throw new Error('Garage already initialized. Use update endpoints to modify configuration.');
      }

      // Create garage configuration with default rates and spot types
      const garageConfig = {
        name: garageData.name,
        floors: garageData.floors,
        rates: {
          standard: 5.00,
          compact: 4.00,
          oversized: 7.00,
          ev_charging: 8.00
        },
        spotTypes: {
          compact: { minSize: 0, maxSize: 1 },
          standard: { minSize: 1, maxSize: 2 },
          oversized: { minSize: 2, maxSize: 3 }
        }
      };

      // Create the garage configuration
      const garage = this.garageRepository.create(garageConfig);

      // Generate all spots for the garage
      const createdSpots = await this.generateSpotsForGarage(garage);

      return {
        garage: garage.getSummary(),
        spotsCreated: createdSpots.length,
        spots: createdSpots.map(spot => ({
          id: spot.id,
          floor: spot.floor,
          bay: spot.bay,
          spotNumber: spot.spotNumber,
          type: spot.type,
          status: spot.status,
          features: spot.features
        }))
      };
    } catch (error) {
      throw new Error(`Garage initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate spots for all floors in the garage
   * @param {Garage} garage - Garage configuration object
   * @returns {Array} Array of created spots
   */
  async generateSpotsForGarage(garage) {
    const createdSpots = [];

    for (const floor of garage.floors) {
      const floorSpots = await this.generateSpotsForFloor(floor);
      createdSpots.push(...floorSpots);
    }

    return createdSpots;
  }

  /**
   * Generate spots for a single floor
   * @param {Object} floorConfig - Floor configuration
   * @param {number} floorConfig.number - Floor number
   * @param {number} floorConfig.bays - Number of bays
   * @param {number} floorConfig.spotsPerBay - Spots per bay
   * @returns {Array} Array of created spots for the floor
   */
  async generateSpotsForFloor(floorConfig) {
    const { number: floor, bays, spotsPerBay } = floorConfig;
    const createdSpots = [];

    for (let bay = 1; bay <= bays; bay++) {
      for (let spotNumber = 1; spotNumber <= spotsPerBay; spotNumber++) {
        // Determine spot type based on position (simple distribution)
        const spotType = this.determineSpotType(floor, bay, spotNumber, spotsPerBay);
        
        // Determine special features
        const features = this.determineSpotFeatures(floor, bay, spotNumber, spotsPerBay);

        try {
          const spot = this.spotRepository.createSpot(floor, bay, spotNumber, spotType, features);
          createdSpots.push(spot);
        } catch (error) {
          // Log but don't fail entire initialization for individual spot errors
          console.warn(`Failed to create spot F${floor}-B${bay}-S${spotNumber.toString().padStart(3, '0')}: ${error.message}`);
        }
      }
    }

    return createdSpots;
  }

  /**
   * Determine spot type based on position and distribution
   * @param {number} floor - Floor number
   * @param {number} bay - Bay number
   * @param {number} spotNumber - Spot number
   * @param {number} spotsPerBay - Total spots per bay
   * @returns {string} Spot type ('compact', 'standard', 'oversized')
   */
  determineSpotType(floor, bay, spotNumber, spotsPerBay) {
    // Distribution: 20% compact, 70% standard, 10% oversized
    const position = ((bay - 1) * spotsPerBay + spotNumber - 1) % 10;
    
    if (position < 2) return 'compact';      // First 20%
    if (position >= 9) return 'oversized';   // Last 10%
    return 'standard';                       // Middle 70%
  }

  /**
   * Determine special features for a spot
   * @param {number} floor - Floor number
   * @param {number} bay - Bay number
   * @param {number} spotNumber - Spot number
   * @param {number} spotsPerBay - Total spots per bay
   * @returns {Array} Array of features
   */
  determineSpotFeatures(floor, bay, spotNumber, spotsPerBay) {
    const features = [];
    
    // Add EV charging to first spot in each bay (roughly 1 in 20 spots)
    if (spotNumber === 1) {
      features.push('ev_charging');
    }

    // Add handicap accessibility to first 2 spots on ground floor
    if (floor === 1 && bay === 1 && spotNumber <= 2) {
      features.push('handicap');
    }

    return features;
  }

  /**
   * Get current garage configuration
   * @param {Object} options - Query options
   * @param {boolean} options.includeStats - Include occupancy statistics
   * @param {boolean} options.includeSpots - Include spot details
   * @returns {Object} Garage configuration with optional statistics and spots
   */
  async getGarageConfiguration(options = {}) {
    const { includeStats = false, includeSpots = false } = options;

    const garage = this.garageRepository.getDefault();
    if (!garage) {
      throw new Error('Garage not initialized. Please initialize the garage first.');
    }

    const config = {
      ...garage.getSummary(),
      initializedAt: garage.createdAt,
      lastUpdated: garage.updatedAt
    };

    if (includeStats) {
      config.statistics = this.spotRepository.getOccupancyStats();
    }

    if (includeSpots) {
      const spots = this.spotRepository.findAll();
      config.spots = spots.map(spot => spot.toObject());
    }

    return config;
  }

  /**
   * Update garage rates
   * @param {Object} rateUpdates - Rate updates object
   * @returns {Object} Updated garage configuration
   * @throws {Error} If garage not found or update fails
   */
  async updateGarageRates(rateUpdates) {
    const garage = this.garageRepository.getDefault();
    if (!garage) {
      throw new Error('Garage not initialized. Please initialize the garage first.');
    }

    // Update rates
    const validRateTypes = ['standard', 'compact', 'oversized', 'ev_charging'];
    
    for (const [rateType, newRate] of Object.entries(rateUpdates)) {
      if (validRateTypes.includes(rateType)) {
        garage.updateRate(rateType, newRate);
      }
    }

    return {
      message: 'Garage rates updated successfully',
      updatedRates: rateUpdates,
      currentRates: garage.rates,
      updatedAt: garage.updatedAt
    };
  }

  /**
   * Update garage configuration (name only for now)
   * @param {Object} configUpdates - Configuration updates
   * @returns {Object} Updated garage configuration
   * @throws {Error} If garage not found or update fails
   */
  async updateGarageConfiguration(configUpdates) {
    const garage = this.garageRepository.getDefault();
    if (!garage) {
      throw new Error('Garage not initialized. Please initialize the garage first.');
    }

    // Update allowed fields
    if (configUpdates.name) {
      garage.name = configUpdates.name;
      garage.updatedAt = new Date().toISOString();
    }

    return {
      message: 'Garage configuration updated successfully',
      configuration: garage.getSummary()
    };
  }

  /**
   * Get garage statistics (alias for getGarageStatistics)
   * @returns {Object} Comprehensive garage statistics
   */
  async getStatistics() {
    return this.getGarageStatistics();
  }

  /**
   * Get garage statistics including capacity and occupancy
   * @returns {Object} Comprehensive garage statistics
   */
  async getGarageStatistics() {
    const garage = this.garageRepository.getDefault();
    if (!garage) {
      throw new Error('Garage not initialized. Please initialize the garage first.');
    }

    const occupancyStats = this.spotRepository.getOccupancyStats();
    const spotsByType = this.getSpotDistributionByType();
    const spotsByFeature = this.getSpotDistributionByFeature();
    const spotsByFloor = this.getSpotDistributionByFloor();

    return {
      garage: {
        name: garage.name,
        totalCapacity: garage.getTotalCapacity(),
        totalFloors: garage.getTotalFloors(),
        floors: garage.floors.map(floor => ({
          floor: floor.number,
          capacity: floor.bays * floor.spotsPerBay
        }))
      },
      occupancy: occupancyStats,
      distribution: {
        byType: spotsByType,
        byFeature: spotsByFeature,
        byFloor: spotsByFloor
      },
      rates: garage.rates,
      lastUpdated: garage.updatedAt
    };
  }

  /**
   * Get spot distribution by type
   * @returns {Object} Distribution of spots by type
   */
  getSpotDistributionByType() {
    const spots = this.spotRepository.findAll();
    const distribution = { compact: 0, standard: 0, oversized: 0 };
    
    spots.forEach(spot => {
      if (distribution.hasOwnProperty(spot.type)) {
        distribution[spot.type]++;
      }
    });

    return distribution;
  }

  /**
   * Get spot distribution by special features
   * @returns {Object} Distribution of spots by features
   */
  getSpotDistributionByFeature() {
    const spots = this.spotRepository.findAll();
    const distribution = { ev_charging: 0, handicap: 0, regular: 0 };
    
    spots.forEach(spot => {
      if (spot.features.includes('ev_charging')) {
        distribution.ev_charging++;
      } else if (spot.features.includes('handicap')) {
        distribution.handicap++;
      } else {
        distribution.regular++;
      }
    });

    return distribution;
  }

  /**
   * Get spot distribution by floor
   * @returns {Object} Distribution of spots by floor
   */
  getSpotDistributionByFloor() {
    const spots = this.spotRepository.findAll();
    const distribution = {};
    
    spots.forEach(spot => {
      const floor = `Floor ${spot.floor}`;
      if (!distribution[floor]) {
        distribution[floor] = { total: 0, available: 0, occupied: 0 };
      }
      distribution[floor].total++;
      if (spot.status === 'available') {
        distribution[floor].available++;
      } else {
        distribution[floor].occupied++;
      }
    });

    return distribution;
  }

  /**
   * Check if garage is initialized
   * @returns {boolean} True if garage exists
   */
  isGarageInitialized() {
    return this.garageRepository.getDefault() !== null;
  }

  /**
   * Reset garage (clear all data - mainly for testing)
   * @returns {Object} Reset confirmation
   */
  async resetGarage() {
    this.garageRepository.clear();
    this.spotRepository.clear();
    
    return {
      message: 'Garage reset successfully',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = GarageService;