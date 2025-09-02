/**
 * Data Validation Utility
 * 
 * Provides comprehensive data validation for migration integrity checking.
 * Ensures data consistency between MemoryStore and SQLite database.
 */

import { PrismaClient } from '@prisma/client';
import { MemoryStore } from '../storage/memoryStore';

export interface ValidationError {
  type: 'missing' | 'mismatch' | 'corrupt' | 'constraint';
  table: string;
  field?: string;
  recordId?: string;
  expected?: any;
  actual?: any;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  statistics: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    missingRecords: number;
  };
  tableResults: Record<string, {
    memoryCount: number;
    sqliteCount: number;
    matched: number;
    errors: ValidationError[];
  }>;
}

export class DataValidator {
  private prisma: PrismaClient;
  private memoryStore: MemoryStore;

  constructor() {
    this.prisma = new PrismaClient();
    this.memoryStore = MemoryStore.getInstance();
  }

  /**
   * Validate complete data integrity between MemoryStore and SQLite
   */
  async validateDataIntegrity(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const tableResults: Record<string, any> = {};
    
    try {
      // Validate each table
      const vehicleValidation = await this.validateVehicles();
      const spotValidation = await this.validateSpots();
      const sessionValidation = await this.validateSessions();
      const garageValidation = await this.validateGarageConfig();

      tableResults.vehicles = vehicleValidation;
      tableResults.spots = spotValidation;
      tableResults.sessions = sessionValidation;
      tableResults.garage = garageValidation;

      // Collect all errors
      errors.push(
        ...vehicleValidation.errors,
        ...spotValidation.errors,
        ...sessionValidation.errors,
        ...garageValidation.errors
      );

      // Calculate statistics
      const totalRecords = Object.values(tableResults).reduce((sum, result) => sum + result.memoryCount, 0);
      const validRecords = Object.values(tableResults).reduce((sum, result) => sum + result.matched, 0);
      const invalidRecords = errors.length;
      const missingRecords = totalRecords - validRecords;

      return {
        success: errors.length === 0,
        errors,
        statistics: {
          totalRecords,
          validRecords,
          invalidRecords,
          missingRecords
        },
        tableResults
      };

    } catch (error) {
      errors.push({
        type: 'corrupt',
        table: 'global',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      return {
        success: false,
        errors,
        statistics: { totalRecords: 0, validRecords: 0, invalidRecords: 1, missingRecords: 0 },
        tableResults
      };
    }
  }

  /**
   * Validate vehicles data
   */
  private async validateVehicles(): Promise<{
    memoryCount: number;
    sqliteCount: number;
    matched: number;
    errors: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    
    // Get data from both sources
    const memoryVehicles = Array.from(this.memoryStore.vehicles.entries());
    const sqliteVehicles = await this.prisma.vehicle.findMany();
    
    const memoryCount = memoryVehicles.length;
    const sqliteCount = sqliteVehicles.length;
    let matched = 0;

    // Create lookup map for SQLite vehicles
    const sqliteVehicleMap = new Map(
      sqliteVehicles.map(v => [v.licensePlate, v])
    );

    // Validate each memory vehicle
    for (const [licensePlate, memoryVehicle] of memoryVehicles) {
      const sqliteVehicle = sqliteVehicleMap.get(licensePlate);
      
      if (!sqliteVehicle) {
        errors.push({
          type: 'missing',
          table: 'vehicles',
          recordId: licensePlate,
          message: `Vehicle with license plate ${licensePlate} not found in SQLite database`
        });
        continue;
      }

      // Validate field consistency
      const fieldErrors = this.validateVehicleFields(memoryVehicle, sqliteVehicle);
      errors.push(...fieldErrors);
      
      if (fieldErrors.length === 0) {
        matched++;
      }
    }

    // Check for extra vehicles in SQLite
    for (const sqliteVehicle of sqliteVehicles) {
      if (!this.memoryStore.vehicles.has(sqliteVehicle.licensePlate)) {
        errors.push({
          type: 'mismatch',
          table: 'vehicles',
          recordId: sqliteVehicle.licensePlate,
          message: `Vehicle ${sqliteVehicle.licensePlate} exists in SQLite but not in MemoryStore`
        });
      }
    }

    return { memoryCount, sqliteCount, matched, errors };
  }

  /**
   * Validate spots data
   */
  private async validateSpots(): Promise<{
    memoryCount: number;
    sqliteCount: number;
    matched: number;
    errors: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    
    const memorySpots = Array.from(this.memoryStore.spots.entries());
    const sqliteSpots = await this.prisma.parkingSpot.findMany();
    
    const memoryCount = memorySpots.length;
    const sqliteCount = sqliteSpots.length;
    let matched = 0;

    const sqliteSpotMap = new Map(
      sqliteSpots.map((s: any) => [s.spotNumber, s])
    );

    for (const [spotId, memorySpot] of memorySpots) {
      const sqliteSpot = sqliteSpotMap.get(memorySpot.spotNumber || spotId);
      
      if (!sqliteSpot) {
        errors.push({
          type: 'missing',
          table: 'spots',
          recordId: spotId,
          message: `Spot ${spotId} not found in SQLite database`
        });
        continue;
      }

      const fieldErrors = this.validateSpotFields(memorySpot, sqliteSpot);
      errors.push(...fieldErrors);
      
      if (fieldErrors.length === 0) {
        matched++;
      }
    }

    return { memoryCount, sqliteCount, matched, errors };
  }

  /**
   * Validate sessions data
   */
  private async validateSessions(): Promise<{
    memoryCount: number;
    sqliteCount: number;
    matched: number;
    errors: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    
    // Memory store doesn't have sessions, using empty array as placeholder
    const memorySessions: [string, any][] = [];
    const sqliteSessions = await this.prisma.parkingSession.findMany();
    
    const memoryCount = memorySessions.length;
    const sqliteCount = sqliteSessions.length;
    let matched = 0;

    const sqliteSessionMap = new Map(
      sqliteSessions.map(s => [s.id, s])
    );

    for (const [sessionId, memorySession] of memorySessions) {
      const sqliteSession = sqliteSessionMap.get(sessionId);
      
      if (!sqliteSession) {
        errors.push({
          type: 'missing',
          table: 'sessions',
          recordId: sessionId,
          message: `Session ${sessionId} not found in SQLite database`
        });
        continue;
      }

      const fieldErrors = this.validateSessionFields(memorySession, sqliteSession);
      errors.push(...fieldErrors);
      
      if (fieldErrors.length === 0) {
        matched++;
      }
    }

    return { memoryCount, sqliteCount, matched, errors };
  }

  /**
   * Validate garage configuration
   */
  private async validateGarageConfig(): Promise<{
    memoryCount: number;
    sqliteCount: number;
    matched: number;
    errors: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    
    const memoryGarages = Array.from(this.memoryStore.garageConfig.entries());
    const sqliteGarages = await this.prisma.garage.findMany();
    
    const memoryCount = memoryGarages.length;
    const sqliteCount = sqliteGarages.length;
    let matched = 0;

    const sqliteGarageMap = new Map(
      sqliteGarages.map(g => [g.name, g])
    );

    for (const [garageId, memoryGarage] of memoryGarages) {
      const sqliteGarage = sqliteGarageMap.get(memoryGarage.name || garageId);
      
      if (!sqliteGarage) {
        errors.push({
          type: 'missing',
          table: 'garage',
          recordId: garageId,
          message: `Garage ${garageId} not found in SQLite database`
        });
        continue;
      }

      const fieldErrors = this.validateGarageFields(memoryGarage, sqliteGarage);
      errors.push(...fieldErrors);
      
      if (fieldErrors.length === 0) {
        matched++;
      }
    }

    return { memoryCount, sqliteCount, matched, errors };
  }

  /**
   * Validate vehicle field consistency
   */
  private validateVehicleFields(memoryVehicle: any, sqliteVehicle: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check license plate
    if (memoryVehicle.licensePlate !== sqliteVehicle.licensePlate) {
      errors.push({
        type: 'mismatch',
        table: 'vehicles',
        field: 'licensePlate',
        recordId: memoryVehicle.licensePlate,
        expected: memoryVehicle.licensePlate,
        actual: sqliteVehicle.licensePlate,
        message: 'License plate mismatch'
      });
    }

    // Check vehicle type
    if (memoryVehicle.type && memoryVehicle.type !== sqliteVehicle.vehicleType) {
      errors.push({
        type: 'mismatch',
        table: 'vehicles',
        field: 'vehicleType',
        recordId: memoryVehicle.licensePlate,
        expected: memoryVehicle.type,
        actual: sqliteVehicle.vehicleType,
        message: 'Vehicle type mismatch'
      });
    }

    return errors;
  }

  /**
   * Validate spot field consistency
   */
  private validateSpotFields(memorySpot: any, sqliteSpot: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check floor
    if (memorySpot.floor !== undefined && memorySpot.floor !== sqliteSpot.floor) {
      errors.push({
        type: 'mismatch',
        table: 'spots',
        field: 'floor',
        recordId: memorySpot.spotNumber,
        expected: memorySpot.floor,
        actual: sqliteSpot.floor,
        message: 'Floor mismatch'
      });
    }

    // Check bay
    if (memorySpot.bay !== undefined && memorySpot.bay !== sqliteSpot.bay) {
      errors.push({
        type: 'mismatch',
        table: 'spots',
        field: 'bay',
        recordId: memorySpot.spotNumber,
        expected: memorySpot.bay,
        actual: sqliteSpot.bay,
        message: 'Bay mismatch'
      });
    }

    return errors;
  }

  /**
   * Validate session field consistency
   */
  private validateSessionFields(memorySession: any, sqliteSession: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check vehicle ID
    if (memorySession.vehicleId !== sqliteSession.vehicleId) {
      errors.push({
        type: 'mismatch',
        table: 'sessions',
        field: 'vehicleId',
        recordId: sqliteSession.id,
        expected: memorySession.vehicleId,
        actual: sqliteSession.vehicleId,
        message: 'Vehicle ID mismatch'
      });
    }

    // Check spot ID
    if (memorySession.spotId !== sqliteSession.spotId) {
      errors.push({
        type: 'mismatch',
        table: 'sessions',
        field: 'spotId',
        recordId: sqliteSession.id,
        expected: memorySession.spotId,
        actual: sqliteSession.spotId,
        message: 'Spot ID mismatch'
      });
    }

    return errors;
  }

  /**
   * Validate garage field consistency
   */
  private validateGarageFields(memoryGarage: any, sqliteGarage: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check name
    if (memoryGarage.name !== sqliteGarage.name) {
      errors.push({
        type: 'mismatch',
        table: 'garage',
        field: 'name',
        recordId: sqliteGarage.id,
        expected: memoryGarage.name,
        actual: sqliteGarage.name,
        message: 'Garage name mismatch'
      });
    }

    return errors;
  }

  /**
   * Validate foreign key relationships
   */
  async validateRelationships(): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      // Check vehicle-spot relationships
      const vehiclesWithSpots = await this.prisma.vehicle.findMany({
        where: { currentSpotId: { not: null } },
        include: { currentSpot: true }
      });

      for (const vehicle of vehiclesWithSpots) {
        if (vehicle.currentSpotId && !vehicle.currentSpot) {
          errors.push({
            type: 'constraint',
            table: 'vehicles',
            field: 'currentSpotId',
            recordId: vehicle.id,
            message: `Vehicle ${vehicle.licensePlate} references non-existent spot ${vehicle.currentSpotId}`
          });
        }
      }

      // Check session relationships
      const sessions = await this.prisma.parkingSession.findMany({
        include: { vehicle: true, spot: true }
      });

      for (const session of sessions) {
        if (!session.vehicle) {
          errors.push({
            type: 'constraint',
            table: 'sessions',
            field: 'vehicleId',
            recordId: session.id,
            message: `Session ${session.id} references non-existent vehicle`
          });
        }

        if (!session.spot) {
          errors.push({
            type: 'constraint',
            table: 'sessions',
            field: 'spotId',
            recordId: session.id,
            message: `Session ${session.id} references non-existent spot`
          });
        }

        // Note: garage relationship removed as it's not available in the schema
      }

    } catch (error) {
      errors.push({
        type: 'corrupt',
        table: 'relationships',
        message: `Relationship validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return errors;
  }

  /**
   * Close database connection
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}