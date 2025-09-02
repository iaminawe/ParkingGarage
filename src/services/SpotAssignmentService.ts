/**
 * Spot Assignment Service
 * Handles spot assignment logic and availability simulation
 */

import { SpotService } from './spotService';
import { VehicleType, SpotStatus } from '../types/models';

interface AvailabilityInfo {
  total: number;
  hasAvailable: boolean;
  available: number;
  occupied: number;
  bySpotType?: Record<string, number>;
}

interface AssignmentSimulation {
  canAssign: boolean;
  recommendedSpots: any[];
  reason?: string;
  success?: boolean;
  assignedSpot?: any;
  spotLocation?: any;
  compatibility?: any;
}

export class SpotAssignmentService {
  private spotService: SpotService;

  constructor() {
    this.spotService = new SpotService();
  }

  /**
   * Get availability by vehicle type
   */
  getAvailabilityByVehicleType(vehicleType: VehicleType): AvailabilityInfo {
    // For now, return mock data - this would be implemented based on actual business logic
    return {
      total: 100,
      hasAvailable: true,
      available: 25,
      occupied: 75,
      bySpotType: {
        [vehicleType]: 25
      }
    };
  }

  /**
   * Simulate spot assignment for a vehicle type
   */
  simulateAssignment(vehicleType: VehicleType): AssignmentSimulation {
    // Mock implementation - would contain actual assignment logic
    const mockSpot = {
      id: 'spot-1',
      floor: 1,
      section: 'A',
      type: vehicleType
    };

    return {
      canAssign: true,
      success: true,
      recommendedSpots: [mockSpot],
      assignedSpot: mockSpot,
      spotLocation: `Floor ${mockSpot.floor}, Section ${mockSpot.section}`,
      compatibility: 100
    };
  }

  /**
   * Find best available spot for vehicle type
   */
  async findBestSpot(vehicleType: VehicleType): Promise<any | null> {
    try {
      const availableSpots = await this.spotService.findAvailableSpots({
        type: vehicleType
      });

      if (availableSpots.length === 0) {
        return null;
      }

      // Return first available spot (could implement more sophisticated logic)
      return availableSpots[0];
    } catch (error) {
      console.error('Error finding best spot:', error);
      return null;
    }
  }

  /**
   * Get assignment statistics (mock implementation)
   */
  getAssignmentStats(): any {
    return {
      totalAssignments: 150,
      successfulAssignments: 142,
      failedAssignments: 8,
      averageAssignmentTime: 2.5
    };
  }
}