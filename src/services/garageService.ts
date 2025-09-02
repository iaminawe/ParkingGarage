/**
 * Garage service for garage initialization and management operations
 *
 * This service handles the business logic for garage configuration,
 * initialization, and spot creation. It orchestrates between the
 * garage repository and spot repository to ensure proper setup.
 *
 * @module GarageService
 */

import { GarageRepository } from '../repositories/garageRepository';
import { SpotRepository } from '../repositories/SpotRepository';
import {
  GarageConfig,
  FloorConfig,
  VehicleType,
  SpotFeature,
  ServiceResponse,
} from '../types/models';

interface SpotCreationResult {
  id: string;
  floor: number;
  bay: number;
  spotNumber: number;
  type: VehicleType;
  status: string;
  features: SpotFeature[];
}

interface GarageInitializationResult {
  garage: any;
  spotsCreated: number;
  spots: SpotCreationResult[];
}

interface GarageStatistics {
  garage: {
    name: string;
    totalCapacity: number;
    totalFloors: number;
    floors: Array<{
      floor: number;
      capacity: number;
    }>;
  };
  occupancy: any;
  distribution: {
    byType: Record<string, number>;
    byFeature: Record<string, number>;
    byFloor: Record<string, any>;
  };
  rates: Record<string, number>;
  lastUpdated: string;
}

interface ConfigurationOptions {
  includeStats?: boolean;
  includeSpots?: boolean;
}

/**
 * Service class for garage management operations
 */
class GarageService {
  private garageRepository: GarageRepository;
  private spotRepository: SpotRepository;

  constructor() {
    this.garageRepository = new GarageRepository();
    this.spotRepository = new SpotRepository();
  }

  /**
   * Initialize a new garage with floors, bays, and spots
   * @param garageData - Garage initialization data
   * @returns Initialization result with garage config and created spots
   * @throws Error If garage already exists or initialization fails
   */
  async initializeGarage(garageData: {
    name: string;
    floors: FloorConfig[];
  }): Promise<GarageInitializationResult> {
    try {
      // Check if default garage already exists
      const existingGarage = this.garageRepository.getDefault();
      if (existingGarage) {
        throw new Error(
          'Garage already initialized. Use update endpoints to modify configuration.'
        );
      }

      // Create garage configuration with default rates and spot types
      const garageConfig: GarageConfig = {
        name: garageData.name,
        floors: garageData.floors,
        rates: {
          standard: 5.0,
          compact: 4.0,
          oversized: 7.0,
        },
        spotTypes: {
          compact: {
            name: 'Compact',
            multiplier: 0.8,
            description: 'For smaller vehicles',
          },
          standard: {
            name: 'Standard',
            multiplier: 1.0,
            description: 'Standard size parking spot',
          },
          oversized: {
            name: 'Oversized',
            multiplier: 1.4,
            description: 'For larger vehicles',
          },
        },
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
          features: spot.features,
        })),
      };
    } catch (error) {
      throw new Error(`Garage initialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate spots for all floors in the garage
   * @param garage - Garage configuration object
   * @returns Array of created spots
   */
  async generateSpotsForGarage(garage: any): Promise<any[]> {
    const createdSpots: any[] = [];

    for (const floor of garage.floors) {
      const floorSpots = await this.generateSpotsForFloor(floor);
      createdSpots.push(...floorSpots);
    }

    return createdSpots;
  }

  /**
   * Generate spots for a single floor
   * @param floorConfig - Floor configuration
   * @returns Array of created spots for the floor
   */
  async generateSpotsForFloor(floorConfig: FloorConfig): Promise<any[]> {
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
          console.warn(
            `Failed to create spot F${floor}-B${bay}-S${spotNumber.toString().padStart(3, '0')}: ${(error as Error).message}`
          );
        }
      }
    }

    return createdSpots;
  }

  /**
   * Determine spot type based on position and distribution
   * @param floor - Floor number
   * @param bay - Bay number
   * @param spotNumber - Spot number
   * @param spotsPerBay - Total spots per bay
   * @returns Spot type ('compact', 'standard', 'oversized')
   */
  determineSpotType(
    floor: number,
    bay: number,
    spotNumber: number,
    spotsPerBay: number
  ): VehicleType {
    // Distribution: 20% compact, 70% standard, 10% oversized
    const position = ((bay - 1) * spotsPerBay + spotNumber - 1) % 10;

    if (position < 2) {
      return 'compact';
    } // First 20%
    if (position >= 9) {
      return 'oversized';
    } // Last 10%
    return 'standard'; // Middle 70%
  }

  /**
   * Determine special features for a spot
   * @param floor - Floor number
   * @param bay - Bay number
   * @param spotNumber - Spot number
   * @param spotsPerBay - Total spots per bay
   * @returns Array of features
   */
  determineSpotFeatures(
    floor: number,
    bay: number,
    spotNumber: number,
    spotsPerBay: number
  ): SpotFeature[] {
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
   * @param options - Query options
   * @returns Garage configuration with optional statistics and spots
   */
  async getGarageConfiguration(options: ConfigurationOptions = {}): Promise<any> {
    const { includeStats = false, includeSpots = false } = options;

    const garage = this.garageRepository.getDefault();
    if (!garage) {
      throw new Error('Garage not initialized. Please initialize the garage first.');
    }

    const config = {
      ...garage.getSummary(),
      initializedAt: garage.createdAt,
      lastUpdated: garage.updatedAt,
    };

    if (includeStats) {
      (config as any).statistics = this.spotRepository.getOccupancyStats();
    }

    if (includeSpots) {
      const spots = this.spotRepository.findAll();
      (config as any).spots = spots.map(spot => spot.toObject());
    }

    return config;
  }

  /**
   * Update garage rates
   * @param rateUpdates - Rate updates object
   * @returns Updated garage configuration
   * @throws Error If garage not found or update fails
   */
  async updateGarageRates(rateUpdates: Record<string, number>): Promise<any> {
    const garage = this.garageRepository.getDefault();
    if (!garage) {
      throw new Error('Garage not initialized. Please initialize the garage first.');
    }

    // Update rates
    const validRateTypes = ['standard', 'compact', 'oversized', 'ev_charging'];

    for (const [rateType, newRate] of Object.entries(rateUpdates)) {
      if (validRateTypes.includes(rateType)) {
        garage.updateRate(rateType as VehicleType, newRate);
      }
    }

    return {
      message: 'Garage rates updated successfully',
      updatedRates: rateUpdates,
      currentRates: garage.rates,
      updatedAt: garage.updatedAt,
    };
  }

  /**
   * Update garage configuration (name only for now)
   * @param configUpdates - Configuration updates
   * @returns Updated garage configuration
   * @throws Error If garage not found or update fails
   */
  async updateGarageConfiguration(configUpdates: { name?: string }): Promise<any> {
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
      configuration: garage.getSummary(),
    };
  }

  /**
   * Get garage statistics (alias for getGarageStatistics)
   * @returns Comprehensive garage statistics
   */
  async getStatistics(): Promise<GarageStatistics> {
    return this.getGarageStatistics();
  }

  /**
   * Get garage statistics including capacity and occupancy
   * @returns Comprehensive garage statistics
   */
  async getGarageStatistics(): Promise<GarageStatistics> {
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
        totalFloors: garage.floors.length,
        floors: garage.floors.map((floor: FloorConfig) => ({
          floor: floor.number,
          capacity: floor.bays * floor.spotsPerBay,
        })),
      },
      occupancy: occupancyStats,
      distribution: {
        byType: spotsByType,
        byFeature: spotsByFeature,
        byFloor: spotsByFloor,
      },
      rates: garage.rates as unknown as Record<string, number>,
      lastUpdated: garage.updatedAt,
    };
  }

  /**
   * Get spot distribution by type
   * @returns Distribution of spots by type
   */
  getSpotDistributionByType(): Record<string, number> {
    const spots = this.spotRepository.findAll();
    const distribution: Record<string, number> = { compact: 0, standard: 0, oversized: 0 };

    spots.forEach(spot => {
      if (distribution.hasOwnProperty(spot.type)) {
        distribution[spot.type]++;
      }
    });

    return distribution;
  }

  /**
   * Get spot distribution by special features
   * @returns Distribution of spots by features
   */
  getSpotDistributionByFeature(): Record<string, number> {
    const spots = this.spotRepository.findAll();
    const distribution: Record<string, number> = { ev_charging: 0, handicap: 0, regular: 0 };

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
   * @returns Distribution of spots by floor
   */
  getSpotDistributionByFloor(): Record<string, any> {
    const spots = this.spotRepository.findAll();
    const distribution: Record<string, any> = {};

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
   * @returns True if garage exists
   */
  isGarageInitialized(): boolean {
    return this.garageRepository.getDefault() !== null;
  }

  /**
   * Reset garage (clear all data - mainly for testing)
   * @returns Reset confirmation
   */
  async resetGarage(): Promise<{ message: string; timestamp: string }> {
    this.garageRepository.clear();
    this.spotRepository.clear();

    return {
      message: 'Garage reset successfully',
      timestamp: new Date().toISOString(),
    };
  }
}

export { GarageService };
