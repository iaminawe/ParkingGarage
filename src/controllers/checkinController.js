/**
 * Check-in Controller
 *
 * This module handles HTTP requests for vehicle check-in operations,
 * including request processing, error handling, and response formatting
 * for the check-in API endpoints.
 *
 * @module CheckinController
 */

const CheckinService = require('../services/checkinService');
const SpotAssignmentService = require('../services/spotAssignmentService');

/**
 * Controller for handling check-in related HTTP requests
 */
class CheckinController {
  constructor() {
    this.checkinService = new CheckinService();
    this.spotAssignmentService = new SpotAssignmentService();
  }

  /**
   * Handle vehicle check-in request
   * POST /api/v1/checkin
   */
  checkIn(req, res) {
    try {
      const { licensePlate, vehicleType, rateType = 'hourly' } = req.body;

      const result = this.checkinService.checkInVehicle(
        licensePlate,
        vehicleType,
        rateType
      );

      res.status(201).json({
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.handleCheckinError(error, req, res);
    }
  }

  /**
   * Simulate check-in without actually performing it
   * POST /api/v1/checkin/simulate
   */
  simulateCheckin(req, res) {
    try {
      const { licensePlate, vehicleType } = req.body;

      if (!licensePlate || !vehicleType) {
        return res.status(400).json({
          success: false,
          message: 'License plate and vehicle type are required for simulation',
          timestamp: new Date().toISOString()
        });
      }

      const simulation = this.checkinService.simulateCheckin(licensePlate, vehicleType);

      res.status(200).json({
        ...simulation,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Simulation failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get availability information by vehicle type
   * GET /api/v1/checkin/availability/:vehicleType
   */
  getAvailabilityByVehicleType(req, res) {
    try {
      const { vehicleType } = req.params;

      const validVehicleTypes = ['compact', 'standard', 'oversized'];
      if (!validVehicleTypes.includes(vehicleType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid vehicle type: ${vehicleType}. Valid types: ${validVehicleTypes.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      }

      const availability = this.spotAssignmentService.getAvailabilityByVehicleType(vehicleType);
      const simulation = this.spotAssignmentService.simulateAssignment(vehicleType);

      res.status(200).json({
        success: true,
        vehicleType,
        availability: {
          totalCompatibleSpots: availability.total,
          hasAvailable: availability.hasAvailable,
          bySpotType: availability.bySpotType
        },
        assignment: simulation.success ? {
          wouldAssignTo: simulation.assignedSpot.id,
          location: simulation.spotLocation,
          spotType: simulation.assignedSpot.type,
          isExactMatch: simulation.compatibility.isExactMatch
        } : null,
        message: simulation.success ?
          'Spots available for this vehicle type' :
          'No spots available for this vehicle type',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get availability information',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get general availability information for all vehicle types
   * GET /api/v1/checkin/availability
   */
  getGeneralAvailability(req, res) {
    try {
      const availabilityByType = {};
      const vehicleTypes = ['compact', 'standard', 'oversized'];

      for (const vehicleType of vehicleTypes) {
        const availability = this.spotAssignmentService.getAvailabilityByVehicleType(vehicleType);
        availabilityByType[vehicleType] = {
          totalCompatible: availability.total,
          available: availability.hasAvailable,
          bySpotType: availability.bySpotType
        };
      }

      const stats = this.checkinService.getCheckinStats();

      res.status(200).json({
        success: true,
        message: 'Current availability information',
        overall: {
          totalSpots: stats.spots.totalSpots,
          availableSpots: stats.spots.availableSpots,
          occupiedSpots: stats.spots.occupiedSpots,
          occupancyRate: stats.spots.occupancyRate
        },
        byVehicleType: availabilityByType,
        currentlyParked: stats.vehicles.totalParked,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get availability information',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get check-in statistics and metrics
   * GET /api/v1/checkin/stats
   */
  getCheckinStats(req, res) {
    try {
      const stats = this.checkinService.getCheckinStats();
      const assignmentStats = this.spotAssignmentService.getAssignmentStats();

      res.status(200).json({
        success: true,
        message: 'Check-in statistics retrieved successfully',
        statistics: {
          vehicles: stats.vehicles,
          occupancy: stats.spots,
          assignment: {
            totalSpots: assignmentStats.totalSpots,
            availableSpots: assignmentStats.availableSpots,
            occupancyRate: `${assignmentStats.occupancyRate}%`,
            byVehicleType: assignmentStats.byVehicleType
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle check-in specific errors with appropriate HTTP status codes
   */
  handleCheckinError(error, req, res) {
    const errorMessage = error.message.toLowerCase();

    // Duplicate vehicle error
    if (errorMessage.includes('already checked in')) {
      return res.status(409).json({
        success: false,
        message: 'Vehicle already checked in',
        error: error.message,
        errorCode: 'DUPLICATE_CHECKIN',
        timestamp: new Date().toISOString()
      });
    }

    // No spots available error
    if (errorMessage.includes('no available spots') || errorMessage.includes('no spots available')) {
      return res.status(503).json({
        success: false,
        message: 'Garage is full',
        error: error.message,
        errorCode: 'GARAGE_FULL',
        timestamp: new Date().toISOString()
      });
    }

    // Invalid vehicle type error
    if (errorMessage.includes('invalid vehicle type')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vehicle type',
        error: error.message,
        errorCode: 'INVALID_VEHICLE_TYPE',
        validTypes: ['compact', 'standard', 'oversized'],
        timestamp: new Date().toISOString()
      });
    }

    // Invalid rate type error
    if (errorMessage.includes('invalid rate type')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rate type',
        error: error.message,
        errorCode: 'INVALID_RATE_TYPE',
        validTypes: ['hourly', 'daily', 'monthly'],
        timestamp: new Date().toISOString()
      });
    }

    // License plate validation error
    if (errorMessage.includes('license plate')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid license plate',
        error: error.message,
        errorCode: 'INVALID_LICENSE_PLATE',
        timestamp: new Date().toISOString()
      });
    }

    // Rollback/atomic operation error
    if (errorMessage.includes('failed to') || errorMessage.includes('rollback')) {
      return res.status(500).json({
        success: false,
        message: 'Check-in operation failed',
        error: error.message,
        errorCode: 'CHECKIN_FAILED',
        timestamp: new Date().toISOString()
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Internal server error during check-in',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Health check endpoint for check-in service
   * GET /api/v1/checkin/health
   */
  healthCheck(req, res) {
    try {
      const stats = this.checkinService.getCheckinStats();

      res.status(200).json({
        success: true,
        service: 'checkin',
        status: 'operational',
        summary: {
          totalSpots: stats.spots.totalSpots,
          availableSpots: stats.spots.availableSpots,
          currentlyParked: stats.vehicles.totalParked
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(503).json({
        success: false,
        service: 'checkin',
        status: 'degraded',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = CheckinController;
