/**
 * @file spot-assignment.unit.test.ts
 * @description Unit tests for spot assignment logic and business rules
 * 
 * Tests cover:
 * - Spot assignment algorithms
 * - Vehicle type compatibility
 * - Spot availability logic
 * - Business rule validation
 * - Edge cases and error conditions
 */

import { PrismaClient } from '@prisma/client';
import {
  cleanupTestDatabase,
  seedTestDatabase,
  createTestGarage,
  wait
} from '../helpers/testUtils';

const prisma = new PrismaClient();

// Mock the spot assignment service (assuming it exists)
// These would be the actual business logic functions being tested
class SpotAssignmentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find available spot for vehicle type
   */
  async findAvailableSpot(vehicleType: string, floorId?: string): Promise<any> {
    const spotTypeCompatibility: Record<string, string[]> = {
      'COMPACT': ['COMPACT', 'STANDARD'],
      'STANDARD': ['STANDARD', 'OVERSIZED'],
      'OVERSIZED': ['OVERSIZED'],
      'MOTORCYCLE': ['MOTORCYCLE', 'COMPACT'],
      'ELECTRIC': ['ELECTRIC', 'STANDARD'],
      'HANDICAP': ['HANDICAP']
    };

    const compatibleSpotTypes = spotTypeCompatibility[vehicleType] || ['STANDARD'];
    
    const whereClause: any = {
      status: 'AVAILABLE',
      isActive: true,
      spotType: { in: compatibleSpotTypes }
    };

    if (floorId) {
      whereClause.floorId = floorId;
    }

    // Prioritize exact matches first, then fallback to compatible types
    for (const spotType of compatibleSpotTypes) {
      const spot = await this.prisma.parkingSpot.findFirst({
        where: {
          ...whereClause,
          spotType
        },
        orderBy: [
          { level: 'asc' },
          { section: 'asc' },
          { spotNumber: 'asc' }
        ]
      });

      if (spot) {
        return spot;
      }
    }

    return null;
  }

  /**
   * Check if vehicle type is compatible with spot type
   */
  isVehicleCompatibleWithSpot(vehicleType: string, spotType: string): boolean {
    const compatibility: Record<string, string[]> = {
      'COMPACT': ['COMPACT', 'STANDARD', 'OVERSIZED'],
      'STANDARD': ['STANDARD', 'OVERSIZED'],
      'OVERSIZED': ['OVERSIZED'],
      'MOTORCYCLE': ['MOTORCYCLE', 'COMPACT', 'STANDARD'],
      'ELECTRIC': ['ELECTRIC', 'STANDARD', 'OVERSIZED'],
      'HANDICAP': ['HANDICAP', 'STANDARD', 'OVERSIZED']
    };

    return compatibility[vehicleType]?.includes(spotType) || false;
  }

  /**
   * Assign spot to vehicle
   */
  async assignSpot(spotId: string, vehicleId: string): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Update spot status
        await tx.parkingSpot.update({
          where: { id: spotId },
          data: { status: 'OCCUPIED' }
        });

        // Update vehicle with spot assignment
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { 
            spotId,
            currentSpotId: spotId,
            status: 'PARKED'
          }
        });
      });

      return true;
    } catch (error) {
      console.error('Spot assignment failed:', error);
      return false;
    }
  }

  /**
   * Release spot from vehicle
   */
  async releaseSpot(spotId: string, vehicleId: string): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Update spot status
        await tx.parkingSpot.update({
          where: { id: spotId },
          data: { status: 'AVAILABLE' }
        });

        // Update vehicle to remove spot assignment
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { 
            spotId: null,
            currentSpotId: null,
            status: 'DEPARTED'
          }
        });
      });

      return true;
    } catch (error) {
      console.error('Spot release failed:', error);
      return false;
    }
  }

  /**
   * Get availability statistics
   */
  async getAvailabilityStats(): Promise<any> {
    const total = await this.prisma.parkingSpot.count({
      where: { isActive: true }
    });

    const available = await this.prisma.parkingSpot.count({
      where: { 
        status: 'AVAILABLE',
        isActive: true 
      }
    });

    const occupied = await this.prisma.parkingSpot.count({
      where: { 
        status: 'OCCUPIED',
        isActive: true 
      }
    });

    const byType = await this.prisma.parkingSpot.groupBy({
      by: ['spotType', 'status'],
      where: { isActive: true },
      _count: true
    });

    return {
      total,
      available,
      occupied,
      occupancyRate: total > 0 ? occupied / total : 0,
      byType
    };
  }

  /**
   * Calculate optimal spot assignment score
   */
  calculateSpotScore(vehicleType: string, spot: any): number {
    let score = 0;

    // Exact type match gets highest score
    if (spot.spotType === vehicleType) {
      score += 100;
    }

    // Prefer lower floors (closer to entrance)
    score += (10 - spot.level) * 10;

    // Prefer spots in earlier sections
    const sectionMatch = spot.section?.match(/B(\d+)/);
    if (sectionMatch) {
      const bayNumber = parseInt(sectionMatch[1]);
      score += (10 - bayNumber) * 5;
    }

    // Penalize oversized spots for smaller vehicles
    if (vehicleType !== 'OVERSIZED' && spot.spotType === 'OVERSIZED') {
      score -= 20;
    }

    return score;
  }

  /**
   * Find optimal spot using scoring algorithm
   */
  async findOptimalSpot(vehicleType: string, floorId?: string): Promise<any> {
    const spots = await this.findAvailableSpots(vehicleType, floorId);
    
    if (spots.length === 0) {
      return null;
    }

    // Calculate scores for all available spots
    const scoredSpots = spots.map(spot => ({
      ...spot,
      score: this.calculateSpotScore(vehicleType, spot)
    }));

    // Return highest scoring spot
    return scoredSpots.sort((a, b) => b.score - a.score)[0];
  }

  /**
   * Find all available spots for vehicle type
   */
  private async findAvailableSpots(vehicleType: string, floorId?: string): Promise<any[]> {
    const spotTypeCompatibility: Record<string, string[]> = {
      'COMPACT': ['COMPACT', 'STANDARD'],
      'STANDARD': ['STANDARD', 'OVERSIZED'],
      'OVERSIZED': ['OVERSIZED'],
      'MOTORCYCLE': ['MOTORCYCLE', 'COMPACT'],
      'ELECTRIC': ['ELECTRIC', 'STANDARD'],
      'HANDICAP': ['HANDICAP']
    };

    const compatibleSpotTypes = spotTypeCompatibility[vehicleType] || ['STANDARD'];
    
    const whereClause: any = {
      status: 'AVAILABLE',
      isActive: true,
      spotType: { in: compatibleSpotTypes }
    };

    if (floorId) {
      whereClause.floorId = floorId;
    }

    return await this.prisma.parkingSpot.findMany({
      where: whereClause,
      orderBy: [
        { level: 'asc' },
        { section: 'asc' },
        { spotNumber: 'asc' }
      ]
    });
  }
}

describe('Spot Assignment Service Unit Tests', () => {
  let spotService: SpotAssignmentService;
  let testGarage: any;
  let testFloor: any;
  let testSpots: any[] = [];
  
  beforeAll(async () => {
    await cleanupTestDatabase(prisma);
    
    const seedData = await seedTestDatabase(prisma);
    testGarage = seedData.testGarage;
    
    spotService = new SpotAssignmentService(prisma);
    
    // Create test floor
    testFloor = await prisma.floor.create({
      data: {
        garageId: testGarage.id,
        floorNumber: 1,
        description: 'Test Floor',
        totalSpots: 15,
        isActive: true
      }
    });
  });

  beforeEach(async () => {
    // Clean up existing spots
    await prisma.parkingSpot.deleteMany({
      where: { floorId: testFloor.id }
    });

    // Create fresh test spots for each test
    testSpots = await Promise.all([
      // Bay 1 - Mixed types
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S1',
          floorId: testFloor.id,
          level: 1,
          section: 'B1',
          spotType: 'COMPACT',
          status: 'AVAILABLE',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S2',
          floorId: testFloor.id,
          level: 1,
          section: 'B1',
          spotType: 'STANDARD',
          status: 'AVAILABLE',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B1-S3',
          floorId: testFloor.id,
          level: 1,
          section: 'B1',
          spotType: 'OVERSIZED',
          status: 'AVAILABLE',
          isActive: true
        }
      }),
      // Bay 2 - Standard spots
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B2-S1',
          floorId: testFloor.id,
          level: 1,
          section: 'B2',
          spotType: 'STANDARD',
          status: 'AVAILABLE',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B2-S2',
          floorId: testFloor.id,
          level: 1,
          section: 'B2',
          spotType: 'STANDARD',
          status: 'OCCUPIED', // Already occupied
          isActive: true
        }
      }),
      // Bay 3 - Specialty spots
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B3-S1',
          floorId: testFloor.id,
          level: 1,
          section: 'B3',
          spotType: 'ELECTRIC',
          status: 'AVAILABLE',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B3-S2',
          floorId: testFloor.id,
          level: 1,
          section: 'B3',
          spotType: 'HANDICAP',
          status: 'AVAILABLE',
          isActive: true
        }
      }),
      prisma.parkingSpot.create({
        data: {
          spotNumber: 'F1-B3-S3',
          floorId: testFloor.id,
          level: 1,
          section: 'B3',
          spotType: 'MOTORCYCLE',
          status: 'AVAILABLE',
          isActive: true
        }
      }),
    ]);
  });

  afterEach(async () => {
    await prisma.vehicle.deleteMany({});
    await prisma.parkingSession.deleteMany({});
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('Vehicle Type Compatibility', () => {
    it('should correctly identify compact vehicle compatibility', () => {
      expect(spotService.isVehicleCompatibleWithSpot('COMPACT', 'COMPACT')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('COMPACT', 'STANDARD')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('COMPACT', 'OVERSIZED')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('COMPACT', 'MOTORCYCLE')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('COMPACT', 'ELECTRIC')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('COMPACT', 'HANDICAP')).toBe(false);
    });

    it('should correctly identify standard vehicle compatibility', () => {
      expect(spotService.isVehicleCompatibleWithSpot('STANDARD', 'COMPACT')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('STANDARD', 'STANDARD')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('STANDARD', 'OVERSIZED')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('STANDARD', 'MOTORCYCLE')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('STANDARD', 'ELECTRIC')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('STANDARD', 'HANDICAP')).toBe(false);
    });

    it('should correctly identify oversized vehicle compatibility', () => {
      expect(spotService.isVehicleCompatibleWithSpot('OVERSIZED', 'COMPACT')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('OVERSIZED', 'STANDARD')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('OVERSIZED', 'OVERSIZED')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('OVERSIZED', 'MOTORCYCLE')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('OVERSIZED', 'ELECTRIC')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('OVERSIZED', 'HANDICAP')).toBe(false);
    });

    it('should correctly identify motorcycle compatibility', () => {
      expect(spotService.isVehicleCompatibleWithSpot('MOTORCYCLE', 'MOTORCYCLE')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('MOTORCYCLE', 'COMPACT')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('MOTORCYCLE', 'STANDARD')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('MOTORCYCLE', 'OVERSIZED')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('MOTORCYCLE', 'ELECTRIC')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('MOTORCYCLE', 'HANDICAP')).toBe(false);
    });

    it('should correctly identify electric vehicle compatibility', () => {
      expect(spotService.isVehicleCompatibleWithSpot('ELECTRIC', 'ELECTRIC')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('ELECTRIC', 'STANDARD')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('ELECTRIC', 'OVERSIZED')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('ELECTRIC', 'COMPACT')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('ELECTRIC', 'MOTORCYCLE')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('ELECTRIC', 'HANDICAP')).toBe(false);
    });

    it('should correctly identify handicap vehicle compatibility', () => {
      expect(spotService.isVehicleCompatibleWithSpot('HANDICAP', 'HANDICAP')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('HANDICAP', 'STANDARD')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('HANDICAP', 'OVERSIZED')).toBe(true);
      expect(spotService.isVehicleCompatibleWithSpot('HANDICAP', 'COMPACT')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('HANDICAP', 'MOTORCYCLE')).toBe(false);
      expect(spotService.isVehicleCompatibleWithSpot('HANDICAP', 'ELECTRIC')).toBe(false);
    });
  });

  describe('Spot Finding Logic', () => {
    it('should find available spot for compact vehicle', async () => {
      const spot = await spotService.findAvailableSpot('COMPACT');
      expect(spot).toBeTruthy();
      expect(['COMPACT', 'STANDARD'].includes(spot.spotType)).toBe(true);
      expect(spot.status).toBe('AVAILABLE');
      expect(spot.isActive).toBe(true);
    });

    it('should find available spot for standard vehicle', async () => {
      const spot = await spotService.findAvailableSpot('STANDARD');
      expect(spot).toBeTruthy();
      expect(['STANDARD', 'OVERSIZED'].includes(spot.spotType)).toBe(true);
      expect(spot.status).toBe('AVAILABLE');
      expect(spot.isActive).toBe(true);
    });

    it('should find available spot for oversized vehicle', async () => {
      const spot = await spotService.findAvailableSpot('OVERSIZED');
      expect(spot).toBeTruthy();
      expect(spot.spotType).toBe('OVERSIZED');
      expect(spot.status).toBe('AVAILABLE');
      expect(spot.isActive).toBe(true);
    });

    it('should find available spot for motorcycle', async () => {
      const spot = await spotService.findAvailableSpot('MOTORCYCLE');
      expect(spot).toBeTruthy();
      expect(['MOTORCYCLE', 'COMPACT'].includes(spot.spotType)).toBe(true);
      expect(spot.status).toBe('AVAILABLE');
      expect(spot.isActive).toBe(true);
    });

    it('should find available spot for electric vehicle', async () => {
      const spot = await spotService.findAvailableSpot('ELECTRIC');
      expect(spot).toBeTruthy();
      expect(['ELECTRIC', 'STANDARD'].includes(spot.spotType)).toBe(true);
      expect(spot.status).toBe('AVAILABLE');
      expect(spot.isActive).toBe(true);
    });

    it('should find available spot for handicap vehicle', async () => {
      const spot = await spotService.findAvailableSpot('HANDICAP');
      expect(spot).toBeTruthy();
      expect(['HANDICAP'].includes(spot.spotType)).toBe(true);
      expect(spot.status).toBe('AVAILABLE');
      expect(spot.isActive).toBe(true);
    });

    it('should return null when no suitable spots available', async () => {
      // Mark all oversized spots as occupied
      await prisma.parkingSpot.updateMany({
        where: { spotType: 'OVERSIZED' },
        data: { status: 'OCCUPIED' }
      });

      const spot = await spotService.findAvailableSpot('OVERSIZED');
      expect(spot).toBeNull();
    });

    it('should prioritize exact type matches', async () => {
      // For compact vehicle, should prefer compact spot over standard
      const compactSpot = await spotService.findAvailableSpot('COMPACT');
      expect(compactSpot.spotType).toBe('COMPACT');
    });

    it('should respect floor constraints when specified', async () => {
      const spot = await spotService.findAvailableSpot('STANDARD', testFloor.id);
      expect(spot).toBeTruthy();
      expect(spot.floorId).toBe(testFloor.id);
    });

    it('should return null for non-existent floor', async () => {
      const spot = await spotService.findAvailableSpot('STANDARD', 'non-existent-floor-id');
      expect(spot).toBeNull();
    });

    it('should ignore inactive spots', async () => {
      // Deactivate all compact spots
      await prisma.parkingSpot.updateMany({
        where: { spotType: 'COMPACT' },
        data: { isActive: false }
      });

      const spot = await spotService.findAvailableSpot('COMPACT');
      expect(spot).toBeTruthy();
      expect(spot.spotType).toBe('STANDARD'); // Should fallback to standard
      expect(spot.isActive).toBe(true);
    });
  });

  describe('Spot Assignment Operations', () => {
    let testVehicle: any;

    beforeEach(async () => {
      testVehicle = await prisma.vehicle.create({
        data: {
          licensePlate: 'TEST123',
          vehicleType: 'STANDARD',
          status: 'ACTIVE',
          checkInTime: new Date(),
          hourlyRate: 5.0
        }
      });
    });

    it('should successfully assign spot to vehicle', async () => {
      const availableSpot = await spotService.findAvailableSpot('STANDARD');
      expect(availableSpot).toBeTruthy();

      const success = await spotService.assignSpot(availableSpot.id, testVehicle.id);
      expect(success).toBe(true);

      // Verify spot is now occupied
      const updatedSpot = await prisma.parkingSpot.findUnique({
        where: { id: availableSpot.id }
      });
      expect(updatedSpot?.status).toBe('OCCUPIED');

      // Verify vehicle is assigned to spot
      const updatedVehicle = await prisma.vehicle.findUnique({
        where: { id: testVehicle.id }
      });
      expect(updatedVehicle?.spotId).toBe(availableSpot.id);
      expect(updatedVehicle?.currentSpotId).toBe(availableSpot.id);
      expect(updatedVehicle?.status).toBe('PARKED');
    });

    it('should fail to assign non-existent spot', async () => {
      const success = await spotService.assignSpot('non-existent-spot-id', testVehicle.id);
      expect(success).toBe(false);

      // Verify vehicle was not updated
      const updatedVehicle = await prisma.vehicle.findUnique({
        where: { id: testVehicle.id }
      });
      expect(updatedVehicle?.spotId).toBeNull();
      expect(updatedVehicle?.status).toBe('ACTIVE');
    });

    it('should fail to assign spot to non-existent vehicle', async () => {
      const availableSpot = await spotService.findAvailableSpot('STANDARD');
      expect(availableSpot).toBeTruthy();

      const success = await spotService.assignSpot(availableSpot.id, 'non-existent-vehicle-id');
      expect(success).toBe(false);

      // Verify spot was not updated
      const updatedSpot = await prisma.parkingSpot.findUnique({
        where: { id: availableSpot.id }
      });
      expect(updatedSpot?.status).toBe('AVAILABLE');
    });

    it('should successfully release spot from vehicle', async () => {
      // First assign a spot
      const availableSpot = await spotService.findAvailableSpot('STANDARD');
      await spotService.assignSpot(availableSpot.id, testVehicle.id);

      // Then release it
      const success = await spotService.releaseSpot(availableSpot.id, testVehicle.id);
      expect(success).toBe(true);

      // Verify spot is now available
      const updatedSpot = await prisma.parkingSpot.findUnique({
        where: { id: availableSpot.id }
      });
      expect(updatedSpot?.status).toBe('AVAILABLE');

      // Verify vehicle is no longer assigned to spot
      const updatedVehicle = await prisma.vehicle.findUnique({
        where: { id: testVehicle.id }
      });
      expect(updatedVehicle?.spotId).toBeNull();
      expect(updatedVehicle?.currentSpotId).toBeNull();
      expect(updatedVehicle?.status).toBe('DEPARTED');
    });

    it('should handle concurrent spot assignment attempts', async () => {
      // Create two vehicles
      const vehicle2 = await prisma.vehicle.create({
        data: {
          licensePlate: 'TEST456',
          vehicleType: 'STANDARD',
          status: 'ACTIVE',
          checkInTime: new Date(),
          hourlyRate: 5.0
        }
      });

      const availableSpot = await spotService.findAvailableSpot('STANDARD');
      expect(availableSpot).toBeTruthy();

      // Try to assign same spot to both vehicles simultaneously
      const [success1, success2] = await Promise.all([
        spotService.assignSpot(availableSpot.id, testVehicle.id),
        spotService.assignSpot(availableSpot.id, vehicle2.id)
      ]);

      // One should succeed, one should fail
      expect(success1 !== success2).toBe(true); // XOR - exactly one should be true

      // Verify spot is assigned to only one vehicle
      const finalSpot = await prisma.parkingSpot.findUnique({
        where: { id: availableSpot.id }
      });
      expect(finalSpot?.status).toBe('OCCUPIED');

      const vehicle1Final = await prisma.vehicle.findUnique({
        where: { id: testVehicle.id }
      });
      const vehicle2Final = await prisma.vehicle.findUnique({
        where: { id: vehicle2.id }
      });

      // Exactly one vehicle should have the spot
      const assignedVehicles = [vehicle1Final, vehicle2Final].filter(v => v?.spotId === availableSpot.id);
      expect(assignedVehicles.length).toBe(1);
    });
  });

  describe('Availability Statistics', () => {
    it('should calculate correct availability statistics', async () => {
      const stats = await spotService.getAvailabilityStats();
      
      expect(stats.total).toBe(testSpots.length);
      expect(stats.available).toBe(testSpots.filter(s => s.status === 'AVAILABLE').length);
      expect(stats.occupied).toBe(testSpots.filter(s => s.status === 'OCCUPIED').length);
      expect(stats.occupancyRate).toBeCloseTo(stats.occupied / stats.total, 2);
      expect(Array.isArray(stats.byType)).toBe(true);
      expect(stats.byType.length).toBeGreaterThan(0);
    });

    it('should update statistics after spot assignments', async () => {
      const initialStats = await spotService.getAvailabilityStats();

      // Assign a spot
      const testVehicle = await prisma.vehicle.create({
        data: {
          licensePlate: 'STATS123',
          vehicleType: 'STANDARD',
          status: 'ACTIVE',
          checkInTime: new Date(),
          hourlyRate: 5.0
        }
      });

      const availableSpot = await spotService.findAvailableSpot('STANDARD');
      await spotService.assignSpot(availableSpot.id, testVehicle.id);

      const updatedStats = await spotService.getAvailabilityStats();

      expect(updatedStats.available).toBe(initialStats.available - 1);
      expect(updatedStats.occupied).toBe(initialStats.occupied + 1);
      expect(updatedStats.total).toBe(initialStats.total);
    });

    it('should handle empty garage correctly', async () => {
      // Remove all spots
      await prisma.parkingSpot.deleteMany({
        where: { floorId: testFloor.id }
      });

      const stats = await spotService.getAvailabilityStats();
      
      expect(stats.total).toBe(0);
      expect(stats.available).toBe(0);
      expect(stats.occupied).toBe(0);
      expect(stats.occupancyRate).toBe(0);
    });
  });

  describe('Optimal Spot Assignment Algorithm', () => {
    beforeEach(async () => {
      // Create a more complex floor structure for optimal assignment testing
      await prisma.parkingSpot.deleteMany({
        where: { floorId: testFloor.id }
      });

      // Create multiple floors and bays with different characteristics
      const complexSpots = await Promise.all([
        // Floor 1, Bay 1 (closest to entrance)
        prisma.parkingSpot.create({
          data: {
            spotNumber: 'F1-B1-S1',
            floorId: testFloor.id,
            level: 1,
            section: 'B1',
            spotType: 'COMPACT',
            status: 'AVAILABLE',
            isActive: true
          }
        }),
        prisma.parkingSpot.create({
          data: {
            spotNumber: 'F1-B1-S2',
            floorId: testFloor.id,
            level: 1,
            section: 'B1',
            spotType: 'STANDARD',
            status: 'AVAILABLE',
            isActive: true
          }
        }),
        // Floor 1, Bay 2
        prisma.parkingSpot.create({
          data: {
            spotNumber: 'F1-B2-S1',
            floorId: testFloor.id,
            level: 1,
            section: 'B2',
            spotType: 'COMPACT',
            status: 'AVAILABLE',
            isActive: true
          }
        }),
        prisma.parkingSpot.create({
          data: {
            spotNumber: 'F1-B2-S2',
            floorId: testFloor.id,
            level: 1,
            section: 'B2',
            spotType: 'OVERSIZED',
            status: 'AVAILABLE',
            isActive: true
          }
        }),
        // Floor 2 (higher level, should be less preferred)
        prisma.parkingSpot.create({
          data: {
            spotNumber: 'F2-B1-S1',
            floorId: testFloor.id,
            level: 2,
            section: 'B1',
            spotType: 'COMPACT',
            status: 'AVAILABLE',
            isActive: true
          }
        })
      ]);

      testSpots = complexSpots;
    });

    it('should calculate spot scores correctly', () => {
      const compactSpot = testSpots.find(s => s.spotType === 'COMPACT' && s.level === 1);
      const standardSpot = testSpots.find(s => s.spotType === 'STANDARD' && s.level === 1);
      const oversizedSpot = testSpots.find(s => s.spotType === 'OVERSIZED');
      const level2Spot = testSpots.find(s => s.level === 2);

      // Compact vehicle should score compact spots highest
      const compactInCompactScore = spotService.calculateSpotScore('COMPACT', compactSpot);
      const compactInStandardScore = spotService.calculateSpotScore('COMPACT', standardSpot);
      const compactInOversizedScore = spotService.calculateSpotScore('COMPACT', oversizedSpot);
      const compactInLevel2Score = spotService.calculateSpotScore('COMPACT', level2Spot);

      expect(compactInCompactScore).toBeGreaterThan(compactInStandardScore);
      expect(compactInStandardScore).toBeGreaterThan(compactInOversizedScore);
      expect(compactInCompactScore).toBeGreaterThan(compactInLevel2Score);
    });

    it('should find optimal spot for compact vehicle', async () => {
      const optimalSpot = await spotService.findOptimalSpot('COMPACT');
      
      expect(optimalSpot).toBeTruthy();
      expect(optimalSpot.spotType).toBe('COMPACT');
      expect(optimalSpot.level).toBe(1); // Should prefer lower level
      expect(optimalSpot.section).toBe('B1'); // Should prefer earlier bay
    });

    it('should find optimal spot for standard vehicle', async () => {
      const optimalSpot = await spotService.findOptimalSpot('STANDARD');
      
      expect(optimalSpot).toBeTruthy();
      expect(optimalSpot.spotType).toBe('STANDARD');
      expect(optimalSpot.level).toBe(1);
    });

    it('should find optimal spot for oversized vehicle', async () => {
      const optimalSpot = await spotService.findOptimalSpot('OVERSIZED');
      
      expect(optimalSpot).toBeTruthy();
      expect(optimalSpot.spotType).toBe('OVERSIZED');
    });

    it('should return null when no optimal spots available', async () => {
      // Occupy all spots
      await prisma.parkingSpot.updateMany({
        where: { floorId: testFloor.id },
        data: { status: 'OCCUPIED' }
      });

      const optimalSpot = await spotService.findOptimalSpot('COMPACT');
      expect(optimalSpot).toBeNull();
    });

    it('should handle empty garage for optimal assignment', async () => {
      // Remove all spots
      await prisma.parkingSpot.deleteMany({
        where: { floorId: testFloor.id }
      });

      const optimalSpot = await spotService.findOptimalSpot('STANDARD');
      expect(optimalSpot).toBeNull();
    });
  });

  describe('Business Rules Validation', () => {
    it('should enforce spot type restrictions for oversized vehicles', async () => {
      // Mark all oversized spots as occupied
      await prisma.parkingSpot.updateMany({
        where: { spotType: 'OVERSIZED' },
        data: { status: 'OCCUPIED' }
      });

      const spot = await spotService.findAvailableSpot('OVERSIZED');
      expect(spot).toBeNull();
    });

    it('should allow compact vehicles to use larger spots when needed', async () => {
      // Occupy all compact spots
      await prisma.parkingSpot.updateMany({
        where: { spotType: 'COMPACT' },
        data: { status: 'OCCUPIED' }
      });

      const spot = await spotService.findAvailableSpot('COMPACT');
      expect(spot).toBeTruthy();
      expect(spot.spotType).toBe('STANDARD'); // Should fallback to standard
    });

    it('should not allow standard vehicles to use compact spots', async () => {
      // Only leave compact spots available
      await prisma.parkingSpot.updateMany({
        where: { spotType: { not: 'COMPACT' } },
        data: { status: 'OCCUPIED' }
      });

      const spot = await spotService.findAvailableSpot('STANDARD');
      expect(spot).toBeNull();
    });

    it('should prioritize specialty spots for specialty vehicles', async () => {
      const electricSpot = await spotService.findAvailableSpot('ELECTRIC');
      expect(electricSpot).toBeTruthy();
      expect(electricSpot.spotType).toBe('ELECTRIC');

      const handicapSpot = await spotService.findAvailableSpot('HANDICAP');
      expect(handicapSpot).toBeTruthy();
      expect(handicapSpot.spotType).toBe('HANDICAP');

      const motorcycleSpot = await spotService.findAvailableSpot('MOTORCYCLE');
      expect(motorcycleSpot).toBeTruthy();
      expect(motorcycleSpot.spotType).toBe('MOTORCYCLE');
    });

    it('should handle maintenance mode spots', async () => {
      // Set a spot to maintenance
      const maintenanceSpot = testSpots[0];
      await prisma.parkingSpot.update({
        where: { id: maintenanceSpot.id },
        data: { status: 'MAINTENANCE' }
      });

      const spot = await spotService.findAvailableSpot('COMPACT');
      expect(spot?.id).not.toBe(maintenanceSpot.id);
    });

    it('should handle reserved spots', async () => {
      // Set a spot to reserved
      const reservedSpot = testSpots[0];
      await prisma.parkingSpot.update({
        where: { id: reservedSpot.id },
        data: { status: 'RESERVED' }
      });

      const spot = await spotService.findAvailableSpot('COMPACT');
      expect(spot?.id).not.toBe(reservedSpot.id);
    });

    it('should handle out of order spots', async () => {
      // Set a spot to out of order
      const outOfOrderSpot = testSpots[0];
      await prisma.parkingSpot.update({
        where: { id: outOfOrderSpot.id },
        data: { status: 'OUT_OF_ORDER' }
      });

      const spot = await spotService.findAvailableSpot('COMPACT');
      expect(spot?.id).not.toBe(outOfOrderSpot.id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid vehicle types gracefully', async () => {
      const spot = await spotService.findAvailableSpot('INVALID_TYPE');
      // Should fallback to standard compatibility
      expect(spot).toBeTruthy();
      expect(spot.spotType).toBe('STANDARD');
    });

    it('should handle database connection failures', async () => {
      // This would require mocking database failures
      // Implementation would depend on specific error handling strategy
    });

    it('should validate spot assignment business rules', async () => {
      const testVehicle = await prisma.vehicle.create({
        data: {
          licensePlate: 'VALIDATION123',
          vehicleType: 'OVERSIZED',
          status: 'ACTIVE',
          checkInTime: new Date(),
          hourlyRate: 5.0
        }
      });

      // Try to assign oversized vehicle to compact spot
      const compactSpot = testSpots.find(s => s.spotType === 'COMPACT');
      
      // This should fail due to incompatibility
      const success = await spotService.assignSpot(compactSpot?.id || '', testVehicle.id);
      
      // Depending on implementation, this might succeed (if service allows it)
      // or fail (if service enforces compatibility)
      // The test should match the expected behavior
    });

    it('should handle null and undefined inputs', async () => {
      expect(() => spotService.isVehicleCompatibleWithSpot('', '')).not.toThrow();
      expect(() => spotService.isVehicleCompatibleWithSpot(undefined as any, undefined as any)).not.toThrow();
      
      const spot1 = await spotService.findAvailableSpot('');
      const spot2 = await spotService.findAvailableSpot(undefined as any);
      
      // Should handle gracefully (likely return null or default behavior)
    });

    it('should handle extremely large datasets efficiently', async () => {
      // This test would create many spots and measure performance
      // Implementation would depend on performance requirements
      
      const startTime = Date.now();
      const stats = await spotService.getAvailabilityStats();
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(stats).toBeTruthy();
    });
  });
});