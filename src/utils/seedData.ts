/**
 * Seed data initialization for development and testing
 * Automatically initializes the garage with sample data on startup
 */

import type { GarageConfig, FloorConfig, VehicleType, RateType } from '../types/models';

// Import services - using both .js and .ts extensions as available
const { GarageService } = require('../services/garageService');
const { SpotService } = require('../services/spotService'); 
const { VehicleRepository } = require('../repositories/vehicleRepository');

// Sample vehicle data interface
interface SampleVehicleData {
  licensePlate: string;
  make: string;
  model: string;
  color: string;
  floor: number;
  bay: number;
}

// Maintenance spot configuration
interface MaintenanceSpotConfig {
  floor: number;
  bay: number;
  spotIndex: number;
  reason: string;
}

// Garage statistics interface for logging
interface GarageStats {
  occupancy: {
    total: number;
    available: number;
    occupied: number;
    occupancyRate: number;
  };
}

/**
 * Seed data initializer class for setting up development and test data
 */
export class SeedDataInitializer {
  private garageService: any;
  private spotService: any;
  private vehicleRepository: any;
  private initialized: boolean;

  constructor() {
    this.garageService = new GarageService();
    this.spotService = new SpotService();
    this.vehicleRepository = new VehicleRepository();
    this.initialized = false;
  }

  /**
   * Initialize seed data for the application
   * This creates a default garage structure and adds sample vehicles
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🌱 Seed data already initialized');
      return;
    }

    try {
      console.log('🌱 Initializing seed data...');

      // Step 1: Initialize garage structure
      await this.initializeGarage();

      // Step 2: Add sample parked vehicles
      await this.addSampleVehicles();

      // Step 3: Set some spots to maintenance
      await this.setMaintenanceSpots();

      this.initialized = true;
      console.log('✅ Seed data initialization complete!');
      
      // Log current status
      await this.logCurrentStatus();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Seed data initialization failed:', errorMessage);
      // Don't throw - allow app to continue even if seed fails
    }
  }

  /**
   * Initialize the garage with default structure
   */
  private async initializeGarage(): Promise<void> {
    try {
      // Check if garage already exists
      const existingGarage = this.garageService.garageRepository.getDefault();
      if (existingGarage) {
        console.log('🏢 Garage already initialized');
        return;
      }

      // Create a 5-floor garage with 10 bays per floor, 10 spots per bay
      const garageConfig: GarageConfig = {
        name: 'Central Parking Garage',
        floors: [
          { number: 1, bays: 10, spotsPerBay: 10 },
          { number: 2, bays: 10, spotsPerBay: 10 },
          { number: 3, bays: 10, spotsPerBay: 10 },
          { number: 4, bays: 10, spotsPerBay: 10 },
          { number: 5, bays: 10, spotsPerBay: 10 }
        ],
        rates: {
          compact: 4.00,
          standard: 5.00,
          oversized: 7.00
        },
        spotTypes: {
          compact: { 
            name: 'Compact',
            multiplier: 0.8,
            description: 'Small vehicles only'
          },
          standard: { 
            name: 'Standard',
            multiplier: 1.0,
            description: 'Regular size vehicles'
          },
          oversized: { 
            name: 'Oversized',
            multiplier: 1.4,
            description: 'Large vehicles and trucks'
          }
        }
      };

      const result = await this.garageService.initializeGarage(garageConfig);
      console.log(`🏢 Garage initialized with ${result.spotsCreated} parking spots`);

      // Set default rates (commented out - updateRates method not implemented)
      // await this.garageService.updateRates({
      //   hourly: 5.00,
      //   daily: 30.00,
      //   overnight: 15.00,
      //   weekend: 35.00
      // });

      console.log('💰 Default parking rates would be set (feature pending)');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('already initialized')) {
        console.log('🏢 Garage already exists, skipping initialization');
      } else {
        throw error;
      }
    }
  }

  /**
   * Add sample vehicles to simulate a partially occupied garage
   */
  private async addSampleVehicles(): Promise<void> {
    const sampleVehicles: SampleVehicleData[] = [
      // Floor 1 - Ground floor (busiest)
      { licensePlate: 'ABC-123', make: 'Toyota', model: 'Camry', color: 'Silver', floor: 1, bay: 1 },
      { licensePlate: 'XYZ-789', make: 'Honda', model: 'Civic', color: 'Blue', floor: 1, bay: 1 },
      { licensePlate: 'DEF-456', make: 'Ford', model: 'F-150', color: 'Red', floor: 1, bay: 2 },
      { licensePlate: 'GHI-012', make: 'Tesla', model: 'Model 3', color: 'White', floor: 1, bay: 3 },
      { licensePlate: 'JKL-345', make: 'Chevrolet', model: 'Malibu', color: 'Black', floor: 1, bay: 4 },
      { licensePlate: 'MNO-678', make: 'Nissan', model: 'Altima', color: 'Gray', floor: 1, bay: 5 },
      
      // Floor 2
      { licensePlate: 'PQR-901', make: 'BMW', model: '3 Series', color: 'Black', floor: 2, bay: 1 },
      { licensePlate: 'STU-234', make: 'Mercedes', model: 'C-Class', color: 'Silver', floor: 2, bay: 2 },
      { licensePlate: 'VWX-567', make: 'Audi', model: 'A4', color: 'Blue', floor: 2, bay: 3 },
      { licensePlate: 'YZA-890', make: 'Volkswagen', model: 'Jetta', color: 'White', floor: 2, bay: 4 },
      
      // Floor 3
      { licensePlate: 'BCD-123', make: 'Mazda', model: 'CX-5', color: 'Red', floor: 3, bay: 1 },
      { licensePlate: 'EFG-456', make: 'Subaru', model: 'Outback', color: 'Green', floor: 3, bay: 2 },
      { licensePlate: 'HIJ-789', make: 'Hyundai', model: 'Elantra', color: 'Silver', floor: 3, bay: 3 },
      
      // Floor 4 (EV section)
      { licensePlate: 'TESLA-01', make: 'Tesla', model: 'Model S', color: 'Red', floor: 4, bay: 1 },
      { licensePlate: 'TESLA-02', make: 'Tesla', model: 'Model X', color: 'White', floor: 4, bay: 1 },
      { licensePlate: 'LEAF-001', make: 'Nissan', model: 'Leaf', color: 'Blue', floor: 4, bay: 2 },
      { licensePlate: 'BOLT-EV1', make: 'Chevrolet', model: 'Bolt', color: 'Orange', floor: 4, bay: 2 },
      
      // Floor 5 (Premium/Rooftop)
      { licensePlate: 'LUX-001', make: 'Porsche', model: '911', color: 'Yellow', floor: 5, bay: 1 },
      { licensePlate: 'LUX-002', make: 'Lamborghini', model: 'Huracan', color: 'Orange', floor: 5, bay: 1 },
      { licensePlate: 'LUX-003', make: 'Ferrari', model: '488', color: 'Red', floor: 5, bay: 2 }
    ];

    console.log(`🚗 Adding ${sampleVehicles.length} sample vehicles...`);

    for (const vehicleData of sampleVehicles) {
      try {
        // Find an available spot on the specified floor and bay
        const availableSpots = await this.spotService.findAvailableSpots({
          floor: vehicleData.floor,
          bay: vehicleData.bay
        });

        if (availableSpots.length > 0) {
          const spot = availableSpots[0];
          
          // Determine vehicle type based on model
          let vehicleType: VehicleType = 'standard';
          if (vehicleData.model.includes('F-150') || vehicleData.model.includes('Model X')) {
            vehicleType = 'oversized';
          } else if (vehicleData.model.includes('Civic') || vehicleData.model.includes('Elantra')) {
            vehicleType = 'compact';
          }
          
          // Determine rate type (luxury cars get daily, others hourly)
          const rateType: RateType = vehicleData.licensePlate.startsWith('LUX') ? 'daily' : 'hourly';
          
          // Create vehicle entry
          const vehicle = this.vehicleRepository.create({
            licensePlate: vehicleData.licensePlate,
            spotId: spot.id,
            checkInTime: new Date(Date.now() - Math.random() * 7200000).toISOString(), // Random time in last 2 hours
            vehicleType: vehicleType,
            rateType: rateType
          });

          // Mark spot as occupied
          await this.spotService.updateSpotStatus(spot.id, 'occupied', {
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate
          });

          console.log(`  ✓ Parked ${vehicleData.licensePlate} in spot ${spot.id}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ⚠️ Could not park ${vehicleData.licensePlate}: ${errorMessage}`);
      }
    }
  }

  /**
   * Set some spots to maintenance status for realism
   */
  private async setMaintenanceSpots(): Promise<void> {
    const maintenanceSpots: MaintenanceSpotConfig[] = [
      { floor: 1, bay: 6, spotIndex: 3, reason: 'Repainting' },
      { floor: 2, bay: 8, spotIndex: 5, reason: 'Light repair' },
      { floor: 3, bay: 9, spotIndex: 7, reason: 'Surface repair' },
      { floor: 4, bay: 3, spotIndex: 2, reason: 'EV charger maintenance' }
    ];

    console.log('🔧 Setting maintenance spots...');

    for (const maintenance of maintenanceSpots) {
      try {
        const spots = await this.spotService.findSpots({
          floor: maintenance.floor,
          bay: maintenance.bay,
          status: 'available'
        });

        if (spots.length > maintenance.spotIndex) {
          const spot = spots[maintenance.spotIndex];
          await this.spotService.updateSpotStatus(spot.id, 'maintenance', {
            reason: maintenance.reason,
            estimatedCompletion: new Date(Date.now() + 86400000) // 24 hours from now
          });
          console.log(`  ✓ Set spot ${spot.id} to maintenance: ${maintenance.reason}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ⚠️ Could not set maintenance spot: ${errorMessage}`);
      }
    }
  }

  /**
   * Log the current garage status after initialization
   */
  private async logCurrentStatus(): Promise<void> {
    try {
      const garage = this.garageService.garageRepository.getDefault();
      if (!garage) return;

      const stats: GarageStats = await this.garageService.getStatistics();
      
      console.log('\\n📊 Current Garage Status:');
      console.log('├─ Name:', garage.name);
      console.log('├─ Total Spots:', stats.occupancy.total);
      console.log('├─ Available:', stats.occupancy.available);
      console.log('├─ Occupied:', stats.occupancy.occupied);
      console.log('├─ Maintenance:', 4); // We know we set 4 maintenance spots
      console.log('├─ Occupancy Rate:', `${stats.occupancy.occupancyRate.toFixed(1)}%`);
      console.log('└─ Floors:', garage.floors.length);

      // Show sample API calls
      console.log('\\n🔗 Sample API Endpoints:');
      console.log('├─ GET /api/garage/status');
      console.log('├─ GET /api/spots?status=available');
      console.log('├─ GET /api/spots?floor=1&bay=1');
      console.log('├─ POST /api/checkin { "licensePlate": "TEST-123" }');
      console.log('└─ GET /health');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Could not log status:', errorMessage);
    }
  }

  /**
   * Reset all data (useful for testing)
   */
  async reset(): Promise<void> {
    console.log('🔄 Resetting all seed data...');
    
    // Clear all repositories
    this.garageService.garageRepository.clear();
    this.spotService.spotRepository.clear();
    this.vehicleRepository.clear();
    
    this.initialized = false;
    
    // Re-initialize
    await this.initialize();
  }

  /**
   * Check if seed data has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get initialization status
   */
  getStatus(): {
    initialized: boolean;
    hasGarage: boolean;
    hasVehicles: boolean;
  } {
    try {
      const garage = this.garageService.garageRepository.getDefault();
      const vehicles = this.vehicleRepository.findAll();
      
      return {
        initialized: this.initialized,
        hasGarage: !!garage,
        hasVehicles: vehicles.length > 0
      };
    } catch {
      return {
        initialized: false,
        hasGarage: false,
        hasVehicles: false
      };
    }
  }
}

// Export singleton instance
export default new SeedDataInitializer();

// CommonJS export for backward compatibility
(module as any).exports = new SeedDataInitializer();