/**
 * Garage service for garage initialization and management operations
 *
 * This service handles the business logic for garage configuration,
 * initialization, and spot creation. It orchestrates between the
 * garage repository and spot repository to ensure proper setup.
 *
 * @module GarageService
 */

import { 
  IGarageService,
  GarageInitializationData,
  GarageInitializationResult,
  GarageConfiguration,
  RateUpdateRequest,
  RateUpdateResult,
  GarageUpdateData,
  ConfigurationUpdateResult,
  GarageStatistics,
  SpotCreationSummary,
  FloorConfiguration,
  GarageRates,
  SpotTypeConfigs,
  Timestamp,
  SpotType,
  SpotFeature,
  ServiceOperationError
} from '../types/index.js';

// Import repositories and models (keeping CommonJS imports for now)
const GarageRepository = require('../repositories/garageRepository');
const SpotRepository = require('../repositories/spotRepository');

/**
 * Service class for garage management operations
 */
export class GarageService implements IGarageService {
  private garageRepository: any;
  private spotRepository: any;

  constructor() {
    this.garageRepository = new GarageRepository();
    this.spotRepository = new SpotRepository();
  }

  /**
   * Initialize a new garage with floors, bays, and spots
   */
  async initializeGarage(garageData: GarageInitializationData): Promise<GarageInitializationResult> {
    try {
      // Check if default garage already exists
      const existingGarage = this.garageRepository.getDefault();
      if (existingGarage) {
        throw new ServiceOperationError('Garage already initialized. Use update endpoints to modify configuration.', 'initialize');
      }

      // Create garage configuration with default rates and spot types
      const garageConfig: GarageConfiguration = {
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
        spots: createdSpots.map((spot: any): SpotCreationSummary => ({
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
      if (error instanceof ServiceOperationError) {
        throw error;
      }
      throw new ServiceOperationError(`Garage initialization failed: ${(error as Error).message}`, 'initialize');
    }
  }

  /**
   * Generate spots for all floors in the garage
   */
  private async generateSpotsForGarage(garage: any): Promise<any[]> {
    const createdSpots: any[] = [];

    for (const floor of garage.floors) {
      const floorSpots = await this.generateSpotsForFloor(floor);
      createdSpots.push(...floorSpots);
    }

    return createdSpots;
  }

  /**
   * Generate spots for a single floor
   */
  private async generateSpotsForFloor(floorConfig: FloorConfiguration): Promise<any[]> {
    const { number: floor, bays, spotsPerBay } = floorConfig;
    const createdSpots: any[] = [];

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
          console.warn(`Failed to create spot F${floor}-B${bay}-S${spotNumber.toString().padStart(3, '0')}: ${(error as Error).message}`);
        }
      }
    }

    return createdSpots;
  }

  /**
   * Determine spot type based on position and distribution
   */
  private determineSpotType(floor: number, bay: number, spotNumber: number, spotsPerBay: number): SpotType {
    // Distribution: 20% compact, 70% standard, 10% oversized
    const position = ((bay - 1) * spotsPerBay + spotNumber - 1) % 10;

    if (position < 2) return 'compact';      // First 20%
    if (position >= 9) return 'oversized';   // Last 10%
    return 'standard';                       // Middle 70%
  }

  /**
   * Determine special features for a spot
   */
  private determineSpotFeatures(floor: number, bay: number, spotNumber: number, spotsPerBay: number): SpotFeature[] {
    const features: SpotFeature[] = [];

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
   */
  async getGarageConfiguration(options: { includeStats?: boolean; includeSpots?: boolean } = {}): Promise<GarageConfiguration & { 
    initializedAt: Timestamp; 
    lastUpdated: Timestamp;
    statistics?: any;
    spots?: any[];
  }> {
    const { includeStats = false, includeSpots = false } = options;

    const garage = this.garageRepository.getDefault();
    if (!garage) {
      throw new ServiceOperationError('Garage not initialized. Please initialize the garage first.', 'getConfiguration');
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
      config.spots = spots.map((spot: any) => spot.toObject());
    }

    return config;
  }

  /**
   * Update garage rates
   */
  async updateGarageRates(rateUpdates: RateUpdateRequest): Promise<RateUpdateResult> {
    const garage = this.garageRepository.getDefault();
    if (!garage) {
      throw new ServiceOperationError('Garage not initialized. Please initialize the garage first.', 'updateRates');
    }

    // Update rates
    const validRateTypes: (keyof GarageRates)[] = ['standard', 'compact', 'oversized', 'ev_charging'];

    for (const [rateType, newRate] of Object.entries(rateUpdates)) {
      if (validRateTypes.includes(rateType as keyof GarageRates) && newRate !== undefined) {
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
   */
  async updateGarageConfiguration(configUpdates: GarageUpdateData): Promise<ConfigurationUpdateResult> {
    const garage = this.garageRepository.getDefault();
    if (!garage) {
      throw new ServiceOperationError('Garage not initialized. Please initialize the garage first.', 'updateConfiguration');
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
   * Get garage statistics including capacity and occupancy
   */
  async getGarageStatistics(): Promise<GarageStatistics> {
    const garage = this.garageRepository.getDefault();
    if (!garage) {
      throw new ServiceOperationError('Garage not initialized. Please initialize the garage first.', 'getStatistics');
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
        floors: garage.floors.map((floor: any) => ({
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
   */
  private getSpotDistributionByType(): Record<SpotType, number> {
    const spots = this.spotRepository.findAll();
    const distribution: Record<SpotType, number> = { compact: 0, standard: 0, oversized: 0 };

    spots.forEach((spot: any) => {
      if (distribution.hasOwnProperty(spot.type)) {
        distribution[spot.type as SpotType]++;
      }
    });

    return distribution;
  }

  /**
   * Get spot distribution by special features
   */
  private getSpotDistributionByFeature(): { ev_charging: number; handicap: number; regular: number } {
    const spots = this.spotRepository.findAll();
    const distribution = { ev_charging: 0, handicap: 0, regular: 0 };

    spots.forEach((spot: any) => {
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
   */
  private getSpotDistributionByFloor(): Record<string, { total: number; available: number; occupied: number }> {
    const spots = this.spotRepository.findAll();
    const distribution: Record<string, { total: number; available: number; occupied: number }> = {};

    spots.forEach((spot: any) => {
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
   */
  isGarageInitialized(): boolean {
    return this.garageRepository.getDefault() !== null;
  }

  /**
   * Reset garage (clear all data - mainly for testing)
   */
  async resetGarage(): Promise<{ message: string; timestamp: Timestamp }> {
    this.garageRepository.clear();
    this.spotRepository.clear();

    return {
      message: 'Garage reset successfully',
      timestamp: new Date().toISOString()
    };
  }
}

export default GarageService;