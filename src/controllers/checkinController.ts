/**
 * Check-in Controller
 *
 * This module handles HTTP requests for vehicle check-in operations,
 * including request processing, error handling, and response formatting
 * for the check-in API endpoints.
 *
 * @module CheckinController
 */

import { Request, Response } from 'express';
import { CheckinService } from '../services/checkinService';
import { SpotService } from '../services/spotService';
import { CheckInRequest, CheckInResponse, ApiResponse } from '../types/api';
import { VehicleType } from '../types/models';

/**
 * Controller for handling check-in related HTTP requests
 */
export class CheckinController {
  private checkinService: any;
  private spotService: any;

  constructor() {
    this.checkinService = new CheckinService();
    this.spotService = new SpotService();
  }

  /**
   * Handle vehicle check-in request
   * POST /api/v1/checkin
   */
  checkIn = async (
    req: Request<{}, ApiResponse<CheckInResponse>, CheckInRequest>,
    res: Response<ApiResponse<CheckInResponse>>
  ): Promise<void> => {
    try {
      const { licensePlate, vehicleType, rateType = 'hourly' } = req.body;

      const result = this.checkinService.checkInVehicle(licensePlate, vehicleType, rateType);

      res.status(201).json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleCheckinError(error as Error, req, res);
    }
  };

  /**
   * Simulate check-in without actually performing it
   * POST /api/v1/checkin/simulate
   */
  simulateCheckin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { licensePlate, vehicleType }: { licensePlate: string; vehicleType: VehicleType } =
        req.body;

      if (!licensePlate || !vehicleType) {
        res.status(400).json({
          success: false,
          message: 'License plate and vehicle type are required for simulation',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const simulation = this.checkinService.simulateCheckin(licensePlate, vehicleType);

      res.status(200).json({
        success: true,
        ...simulation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Simulation failed',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get availability information by vehicle type
   * GET /api/v1/checkin/availability/:vehicleType
   */
  getAvailabilityByVehicleType = async (
    req: Request<{ vehicleType: string }>,
    res: Response
  ): Promise<void> => {
    try {
      const { vehicleType } = req.params;

      const validVehicleTypes: VehicleType[] = ['compact', 'standard', 'oversized'];
      if (!validVehicleTypes.includes(vehicleType as VehicleType)) {
        res.status(400).json({
          success: false,
          message: `Invalid vehicle type: ${vehicleType}. Valid types: ${validVehicleTypes.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const availability = this.spotAssignmentService.getAvailabilityByVehicleType(
        vehicleType as VehicleType
      );
      const simulation = this.spotAssignmentService.simulateAssignment(vehicleType as VehicleType);

      res.status(200).json({
        success: true,
        data: {
          vehicleType,
          availability: {
            totalCompatibleSpots: availability.total,
            hasAvailable: availability.hasAvailable,
            bySpotType: availability.bySpotType,
          },
          assignment: simulation.success
            ? {
                wouldAssignTo: simulation.assignedSpot.id,
                location: simulation.spotLocation,
                spotType: simulation.assignedSpot.type,
                isExactMatch: simulation.compatibility.isExactMatch,
              }
            : null,
          message: simulation.success
            ? 'Spots available for this vehicle type'
            : 'No spots available for this vehicle type',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get availability information',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get general availability information for all vehicle types
   * GET /api/v1/checkin/availability
   */
  getGeneralAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const availabilityByType: Record<string, any> = {};
      const vehicleTypes: VehicleType[] = ['compact', 'standard', 'oversized'];

      for (const vehicleType of vehicleTypes) {
        const availability = this.spotAssignmentService.getAvailabilityByVehicleType(vehicleType);
        availabilityByType[vehicleType] = {
          totalCompatible: availability.total,
          available: availability.hasAvailable,
          bySpotType: availability.bySpotType,
        };
      }

      const stats = this.checkinService.getCheckinStats();

      res.status(200).json({
        success: true,
        message: 'Current availability information',
        data: {
          overall: {
            totalSpots: stats.spots.totalSpots,
            availableSpots: stats.spots.availableSpots,
            occupiedSpots: stats.spots.occupiedSpots,
            occupancyRate: stats.spots.occupancyRate,
          },
          byVehicleType: availabilityByType,
          currentlyParked: stats.vehicles.totalParked,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get availability information',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get check-in statistics and metrics
   * GET /api/v1/checkin/stats
   */
  getCheckinStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.checkinService.getCheckinStats();
      const assignmentStats = this.spotAssignmentService.getAssignmentStats();

      res.status(200).json({
        success: true,
        message: 'Check-in statistics retrieved successfully',
        data: {
          statistics: {
            vehicles: stats.vehicles,
            occupancy: stats.spots,
            assignment: {
              totalSpots: assignmentStats.totalSpots,
              availableSpots: assignmentStats.availableSpots,
              occupancyRate: `${assignmentStats.occupancyRate}%`,
              byVehicleType: assignmentStats.byVehicleType,
            },
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Handle check-in specific errors with appropriate HTTP status codes
   */
  private handleCheckinError(error: Error, req: Request, res: Response): void {
    const errorMessage = error.message.toLowerCase();

    // Duplicate vehicle error
    if (errorMessage.includes('already checked in')) {
      res.status(409).json({
        success: false,
        message: 'Vehicle already checked in',
        errors: [error.message],
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // No spots available error
    if (
      errorMessage.includes('no available spots') ||
      errorMessage.includes('no spots available')
    ) {
      res.status(503).json({
        success: false,
        message: 'Garage is full',
        errors: [error.message],
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Invalid vehicle type error
    if (errorMessage.includes('invalid vehicle type')) {
      res.status(400).json({
        success: false,
        message: 'Invalid vehicle type',
        errors: [error.message],
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Invalid rate type error
    if (errorMessage.includes('invalid rate type')) {
      res.status(400).json({
        success: false,
        message: 'Invalid rate type',
        errors: [error.message],
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // License plate validation error
    if (errorMessage.includes('license plate')) {
      res.status(400).json({
        success: false,
        message: 'Invalid license plate',
        errors: [error.message],
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Rollback/atomic operation error
    if (errorMessage.includes('failed to') || errorMessage.includes('rollback')) {
      res.status(500).json({
        success: false,
        message: 'Check-in operation failed',
        errors: [error.message],
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Internal server error during check-in',
      errors: [error.message],
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Health check endpoint for check-in service
   * GET /api/v1/checkin/health
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.checkinService.getCheckinStats();

      res.status(200).json({
        success: true,
        data: {
          service: 'checkin',
          status: 'operational',
          summary: {
            totalSpots: stats.spots.totalSpots,
            availableSpots: stats.spots.availableSpots,
            currentlyParked: stats.vehicles.totalParked,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        message: 'Service health check failed',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString(),
      });
    }
  };
}
