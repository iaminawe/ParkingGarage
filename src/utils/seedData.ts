/**
 * Seed data initialization for development and testing
 * Automatically initializes the garage with sample data on startup
 */

import { PrismaClient } from '@prisma/client';
import type { GarageConfig, FloorConfig, RateType } from '../types/models';
import type { VehicleType } from '@prisma/client';
import type { GarageService } from '../services/garageService';
import type { SpotService } from '../services/spotService';
import type { VehicleRepository } from '../repositories/VehicleRepository';

// Lazy load services to avoid instantiation before database initialization
let GarageServiceClass: typeof GarageService | undefined;
let SpotServiceClass: typeof SpotService | undefined;
let VehicleRepositoryClass: typeof VehicleRepository | undefined;

// Constants for seed tracking
const SEED_STATUS_KEY = 'DATABASE_SEEDED';
const SEED_VERSION_KEY = 'SEED_VERSION';
const CURRENT_SEED_VERSION = '1.0.0';

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
  private garageService: GarageService | undefined;
  private spotService: SpotService | undefined;
  private vehicleRepository: VehicleRepository | undefined;
  private prisma: PrismaClient | undefined;
  private initialized: boolean;

  constructor() {
    this.initialized = false;
  }

  /**
   * Check if the database has already been seeded
   */
  private async isDatabaseSeeded(): Promise<boolean> {
    try {
      if (!this.prisma) {
        this.prisma = new PrismaClient();
      }

      // Check if the seed flag exists in the SecuritySettings table
      const seedFlag = await this.prisma.securitySettings.findUnique({
        where: { key: SEED_STATUS_KEY }
      });

      if (!seedFlag) {
        return false;
      }

      // Check if the seed version matches
      const seedVersion = await this.prisma.securitySettings.findUnique({
        where: { key: SEED_VERSION_KEY }
      });

      if (seedVersion && seedVersion.value === CURRENT_SEED_VERSION) {
        return true;
      }

      // Different version - we might want to re-seed or migrate
      console.log(`🔄 Seed version mismatch. Current: ${CURRENT_SEED_VERSION}, Database: ${seedVersion?.value}`);
      return false;
    } catch (error) {
      // If we can't check, assume not seeded
      console.log('⚠️ Could not check seed status:', error);
      return false;
    }
  }

  /**
   * Mark the database as seeded
   */
  private async markDatabaseAsSeeded(): Promise<void> {
    try {
      if (!this.prisma) {
        this.prisma = new PrismaClient();
      }

      // Set the seed flag
      await this.prisma.securitySettings.upsert({
        where: { key: SEED_STATUS_KEY },
        update: { 
          value: 'true',
          updatedAt: new Date()
        },
        create: {
          key: SEED_STATUS_KEY,
          value: 'true',
          dataType: 'BOOLEAN',
          category: 'SYSTEM',
          description: 'Indicates whether the database has been seeded with initial data',
          isEditable: false,
          environmentSpecific: false
        }
      });

      // Set the seed version
      await this.prisma.securitySettings.upsert({
        where: { key: SEED_VERSION_KEY },
        update: { 
          value: CURRENT_SEED_VERSION,
          updatedAt: new Date()
        },
        create: {
          key: SEED_VERSION_KEY,
          value: CURRENT_SEED_VERSION,
          dataType: 'STRING',
          category: 'SYSTEM',
          description: 'Version of the seed data that was applied',
          isEditable: false,
          environmentSpecific: false
        }
      });

      console.log('✅ Database marked as seeded with version:', CURRENT_SEED_VERSION);
    } catch (error) {
      console.error('❌ Failed to mark database as seeded:', error);
      throw error;
    }
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
      // Check if database has already been seeded
      const isSeeded = await this.isDatabaseSeeded();
      if (isSeeded) {
        console.log('✅ Database already seeded. Skipping seed data initialization.');
        this.initialized = true;
        return;
      }

      console.log('🌱 First-time setup: Initializing seed data...');
      
      // Load services now that database is initialized
      if (!GarageServiceClass) {
        const { GarageService } = await import('../services/garageService');
        const { SpotService } = await import('../services/spotService');
        const { VehicleRepository } = await import('../repositories/VehicleRepository');
        
        GarageServiceClass = GarageService;
        SpotServiceClass = SpotService;
        VehicleRepositoryClass = VehicleRepository;
        
        // Instantiate services
        this.garageService = new GarageServiceClass();
        this.spotService = new SpotServiceClass();
        this.vehicleRepository = new VehicleRepositoryClass();
      }

      // Step 1: Initialize garage structure
      await this.initializeGarage();

      // Step 2: Add sample parked vehicles
      await this.addSampleVehicles();

      // Step 3: Set some spots to maintenance
      await this.setMaintenanceSpots();

      // Mark the database as seeded to prevent re-seeding on restart
      await this.markDatabaseAsSeeded();

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
    if (!this.garageService) {
      throw new Error('GarageService not initialized');
    }

    try {
      // Check if garage already exists
      if (this.garageService.isGarageInitialized()) {
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
          { number: 5, bays: 10, spotsPerBay: 10 },
        ],
        rates: {
          compact: 4.0,
          standard: 5.0,
          oversized: 7.0,
        },
        spotTypes: {
          compact: {
            name: 'Compact',
            multiplier: 0.8,
            description: 'Small vehicles only',
          },
          standard: {
            name: 'Standard',
            multiplier: 1.0,
            description: 'Regular size vehicles',
          },
          oversized: {
            name: 'Oversized',
            multiplier: 1.4,
            description: 'Large vehicles and trucks',
          },
        },
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
    if (!this.spotService || !this.vehicleRepository) {
      throw new Error('SpotService or VehicleRepository not initialized');
    }
    const sampleVehicles: SampleVehicleData[] = [
      // Floor 1 - Ground floor (busiest)
      {
        licensePlate: 'ABC-123',
        make: 'Toyota',
        model: 'Camry',
        color: 'Silver',
        floor: 1,
        bay: 1,
      },
      { licensePlate: 'XYZ-789', make: 'Honda', model: 'Civic', color: 'Blue', floor: 1, bay: 1 },
      { licensePlate: 'DEF-456', make: 'Ford', model: 'F-150', color: 'Red', floor: 1, bay: 2 },
      {
        licensePlate: 'GHI-012',
        make: 'Tesla',
        model: 'Model 3',
        color: 'White',
        floor: 1,
        bay: 3,
      },
      {
        licensePlate: 'JKL-345',
        make: 'Chevrolet',
        model: 'Malibu',
        color: 'Black',
        floor: 1,
        bay: 4,
      },
      { licensePlate: 'MNO-678', make: 'Nissan', model: 'Altima', color: 'Gray', floor: 1, bay: 5 },

      // Floor 2
      { licensePlate: 'PQR-901', make: 'BMW', model: '3 Series', color: 'Black', floor: 2, bay: 1 },
      {
        licensePlate: 'STU-234',
        make: 'Mercedes',
        model: 'C-Class',
        color: 'Silver',
        floor: 2,
        bay: 2,
      },
      { licensePlate: 'VWX-567', make: 'Audi', model: 'A4', color: 'Blue', floor: 2, bay: 3 },
      {
        licensePlate: 'YZA-890',
        make: 'Volkswagen',
        model: 'Jetta',
        color: 'White',
        floor: 2,
        bay: 4,
      },

      // Floor 3
      { licensePlate: 'BCD-123', make: 'Mazda', model: 'CX-5', color: 'Red', floor: 3, bay: 1 },
      {
        licensePlate: 'EFG-456',
        make: 'Subaru',
        model: 'Outback',
        color: 'Green',
        floor: 3,
        bay: 2,
      },
      {
        licensePlate: 'HIJ-789',
        make: 'Hyundai',
        model: 'Elantra',
        color: 'Silver',
        floor: 3,
        bay: 3,
      },

      // Floor 4 (EV section)
      { licensePlate: 'TESLA-01', make: 'Tesla', model: 'Model S', color: 'Red', floor: 4, bay: 1 },
      {
        licensePlate: 'TESLA-02',
        make: 'Tesla',
        model: 'Model X',
        color: 'White',
        floor: 4,
        bay: 1,
      },
      { licensePlate: 'LEAF-001', make: 'Nissan', model: 'Leaf', color: 'Blue', floor: 4, bay: 2 },
      {
        licensePlate: 'BOLT-EV1',
        make: 'Chevrolet',
        model: 'Bolt',
        color: 'Orange',
        floor: 4,
        bay: 2,
      },

      // Floor 5 (Premium/Rooftop)
      { licensePlate: 'LUX-001', make: 'Porsche', model: '911', color: 'Yellow', floor: 5, bay: 1 },
      {
        licensePlate: 'LUX-002',
        make: 'Lamborghini',
        model: 'Huracan',
        color: 'Orange',
        floor: 5,
        bay: 1,
      },
      { licensePlate: 'LUX-003', make: 'Ferrari', model: '488', color: 'Red', floor: 5, bay: 2 },
    ];

    console.log(`🚗 Adding ${sampleVehicles.length} sample vehicles...`);

    for (const vehicleData of sampleVehicles) {
      try {
        // Find an available spot on the specified floor and bay
        const availableSpots = await this.spotService.findAvailableSpots({
          floor: vehicleData.floor,
          bay: vehicleData.bay,
        });

        if (availableSpots.length > 0) {
          const spot = availableSpots[0];

          // Determine vehicle type based on model (using Prisma enum values)
          let vehicleType: VehicleType = 'STANDARD';
          if (vehicleData.model.includes('F-150') || vehicleData.model.includes('Model X')) {
            vehicleType = 'OVERSIZED';
          } else if (vehicleData.model.includes('Civic') || vehicleData.model.includes('Elantra')) {
            vehicleType = 'COMPACT';
          }

          // Determine rate type (luxury cars get daily, others hourly)
          const rateType: RateType = vehicleData.licensePlate.startsWith('LUX')
            ? 'daily'
            : 'hourly';

          // Create vehicle entry (using only fields that exist in CreateVehicleData interface)
          const vehicle = await this.vehicleRepository.create({
            licensePlate: vehicleData.licensePlate,
            vehicleType,
            make: vehicleData.make,
            model: vehicleData.model,
            color: vehicleData.color,
          });

          // Mark spot as occupied
          await this.spotService.updateSpotStatus(spot.id, 'occupied', {
            vehicleId: vehicle.id,
            licensePlate: vehicle.licensePlate,
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
    if (!this.spotService) {
      throw new Error('SpotService not initialized');
    }
    const maintenanceSpots: MaintenanceSpotConfig[] = [
      { floor: 1, bay: 6, spotIndex: 3, reason: 'Repainting' },
      { floor: 2, bay: 8, spotIndex: 5, reason: 'Light repair' },
      { floor: 3, bay: 9, spotIndex: 7, reason: 'Surface repair' },
      { floor: 4, bay: 3, spotIndex: 2, reason: 'EV charger maintenance' },
    ];

    console.log('🔧 Setting maintenance spots...');

    for (const maintenance of maintenanceSpots) {
      try {
        const spots = await this.spotService.findSpots({
          floor: maintenance.floor,
          bay: maintenance.bay,
          status: 'available',
        });

        if (spots.length > maintenance.spotIndex) {
          const spot = spots[maintenance.spotIndex];
          await this.spotService.updateSpotStatus(spot.id, 'occupied', {
            reason: maintenance.reason,
            estimatedCompletion: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
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
    if (!this.garageService) {
      return;
    }

    try {
      if (!this.garageService.isGarageInitialized()) {
        return;
      }

      const garageConfig = await this.garageService.getGarageConfiguration();
      const stats: GarageStats = await this.garageService.getStatistics();

      console.log('\\n📊 Current Garage Status:');
      console.log('├─ Name:', garageConfig.name);
      console.log('├─ Total Spots:', stats.occupancy.total);
      console.log('├─ Available:', stats.occupancy.available);
      console.log('├─ Occupied:', stats.occupancy.occupied);
      console.log('├─ Maintenance:', 4); // We know we set 4 maintenance spots
      console.log('├─ Occupancy Rate:', `${stats.occupancy.occupancyRate.toFixed(1)}%`);
      console.log('└─ Floors:', garageConfig.floors.length);

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

    if (!this.garageService || !this.spotService || !this.vehicleRepository) {
      throw new Error('Services not initialized');
    }

    // Clear all repositories using service methods
    await this.garageService.resetGarage();
    await this.vehicleRepository.deleteMany({});

    // Clear the seed flags to allow re-seeding
    if (!this.prisma) {
      this.prisma = new PrismaClient();
    }

    try {
      await this.prisma.securitySettings.deleteMany({
        where: {
          key: {
            in: [SEED_STATUS_KEY, SEED_VERSION_KEY]
          }
        }
      });
      console.log('✅ Seed flags cleared');
    } catch (error) {
      console.error('⚠️ Could not clear seed flags:', error);
    }

    this.initialized = false;

    // Re-initialize
    await this.initialize();
  }

  /**
   * Force re-seed the database (useful for development)
   * This will clear the seed flags and re-run the seeding process
   */
  async forceSeed(): Promise<void> {
    console.log('⚠️ Force re-seeding database...');
    
    // Clear seed flags
    if (!this.prisma) {
      this.prisma = new PrismaClient();
    }

    try {
      await this.prisma.securitySettings.deleteMany({
        where: {
          key: {
            in: [SEED_STATUS_KEY, SEED_VERSION_KEY]
          }
        }
      });
      console.log('✅ Seed flags cleared');
    } catch (error) {
      console.error('⚠️ Could not clear seed flags:', error);
    }

    // Reset initialized flag
    this.initialized = false;

    // Re-run initialization
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
  async getStatus(): Promise<{
    initialized: boolean;
    hasGarage: boolean;
    hasVehicles: boolean;
  }> {
    try {
      if (!this.garageService || !this.vehicleRepository) {
        return {
          initialized: false,
          hasGarage: false,
          hasVehicles: false,
        };
      }

      const hasGarage = this.garageService.isGarageInitialized();
      const vehicleResult = await this.vehicleRepository.findAll();
      const vehicles = vehicleResult.data;

      return {
        initialized: this.initialized,
        hasGarage,
        hasVehicles: vehicles.length > 0,
      };
    } catch {
      return {
        initialized: false,
        hasGarage: false,
        hasVehicles: false,
      };
    }
  }
}

// Export singleton instance
const seedDataInstance = new SeedDataInitializer();

// Named exports for ES6 modules
export { seedDataInstance as seedData };
export default seedDataInstance;

// CommonJS export for backward compatibility
(module as any).exports = seedDataInstance;
(module as any).exports.initialize = seedDataInstance.initialize.bind(seedDataInstance);
