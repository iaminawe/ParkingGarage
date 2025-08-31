/**
 * Checkout Controller
 *
 * This module handles HTTP requests for vehicle checkout operations,
 * including request processing, error handling, and response formatting
 * for the checkout API endpoints.
 *
 * @module CheckoutController
 */

import { NextFunction } from 'express';
import { 
  TypedRequest, 
  TypedResponse, 
  ApiResponse,
  CheckOutRequest,
  CheckOutResponse,
  Vehicle,
  AsyncControllerMethod
} from '../types/api';

const CheckoutService = require('../services/checkoutService');

interface CheckoutOptions {
  applyGracePeriod?: boolean;
  removeRecord?: boolean;
  checkOutTime?: string;
}

interface CheckoutSimulateRequest {
  licensePlate: string;
  applyGracePeriod?: boolean;
  checkOutTime?: string;
}

interface CheckoutStatsResponse {
  message: string;
  statistics: any;
  timestamp: string;
}

interface VehiclesReadyResponse {
  message: string;
  count: number;
  vehicles: Vehicle[];
  filters: {
    minMinutes: string | number;
  };
  timestamp: string;
}

interface EstimateResponse {
  message: string;
  licensePlate: string;
  estimate: {
    duration: any;
    billing: any;
    spotId: string;
    status: any;
  };
  note: string;
  timestamp: string;
}

interface ForceCheckoutRequest {
  licensePlate: string;
  reason: string;
  adminKey: string;
}

interface HealthCheckResponse {
  service: string;
  status: string;
  summary: {
    availableSpots: number;
    vehiclesParked: number;
    totalRevenue: number;
    pendingRevenue: number;
  };
  timestamp: string;
}

/**
 * Controller for handling checkout related HTTP requests
 */
class CheckoutController {
  private checkoutService: any;

  constructor() {
    this.checkoutService = new CheckoutService();
  }

  /**
   * Handle vehicle checkout request
   * POST /api/v1/checkout
   */
  checkOut(
    req: TypedRequest<CheckOutRequest & CheckoutOptions>, 
    res: TypedResponse<CheckOutResponse>,
    next?: NextFunction
  ): void {
    try {
      const {
        licensePlate,
        applyGracePeriod = false,
        removeRecord = true,
        checkOutTime
      } = req.body;

      const result = this.checkoutService.checkOutVehicle(licensePlate, {
        applyGracePeriod,
        removeRecord,
        checkOutTime
      });

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.handleCheckoutError(error, req, res);
    }
  }

  /**
   * Simulate checkout without actually performing it
   * POST /api/v1/checkout/simulate
   */
  simulateCheckout(
    req: TypedRequest<CheckoutSimulateRequest>, 
    res: TypedResponse<any>,
    next?: NextFunction
  ): void {
    try {
      const { licensePlate, applyGracePeriod = false, checkOutTime } = req.body;

      if (!licensePlate) {
        res.status(400).json({
          success: false,
          message: 'License plate is required for simulation',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const simulation = this.checkoutService.simulateCheckout(licensePlate, {
        applyGracePeriod,
        checkOutTime
      });

      res.status(200).json({
        ...simulation,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Checkout simulation failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get checkout statistics and metrics
   * GET /api/v1/checkout/stats
   */
  getCheckoutStats(
    req: TypedRequest<never>, 
    res: TypedResponse<CheckoutStatsResponse>,
    next?: NextFunction
  ): void {
    try {
      const stats = this.checkoutService.getCheckoutStats();

      res.status(200).json({
        success: true,
        message: 'Checkout statistics retrieved successfully',
        statistics: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve checkout statistics',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get vehicles ready for checkout
   * GET /api/v1/checkout/ready
   */
  getVehiclesReadyForCheckout(
    req: TypedRequest<never> & { query: { minMinutes?: string } }, 
    res: TypedResponse<VehiclesReadyResponse>,
    next?: NextFunction
  ): void {
    try {
      const { minMinutes = '0' } = req.query;
      const vehicles = this.checkoutService.getVehiclesReadyForCheckout(minMinutes);

      res.status(200).json({
        success: true,
        message: `Found ${vehicles.length} vehicle(s) ready for checkout`,
        count: vehicles.length,
        vehicles,
        filters: {
          minMinutes: minMinutes
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicles ready for checkout',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get current parking estimate for a vehicle
   * GET /api/v1/checkout/estimate/:licensePlate
   */
  getCurrentEstimate(
    req: TypedRequest<never> & { params: { licensePlate: string } }, 
    res: TypedResponse<EstimateResponse>,
    next?: NextFunction
  ): void {
    try {
      const { licensePlate } = req.params;

      // Use simulation to get current estimate without checking out
      const simulation = this.checkoutService.simulateCheckout(licensePlate, {
        applyGracePeriod: false
      });

      if (!simulation.success) {
        res.status(404).json({
          success: false,
          message: `Cannot get estimate: ${simulation.message}`,
          error: simulation.error,
          licensePlate,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const estimate = simulation.simulation;

      res.status(200).json({
        success: true,
        message: 'Current parking estimate calculated',
        licensePlate,
        estimate: {
          duration: estimate.estimatedDuration,
          billing: estimate.estimatedBilling,
          spotId: estimate.spotId,
          status: estimate.currentStatus
        },
        note: 'This is an estimate. Final amount may vary based on actual checkout time.',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to calculate parking estimate',
        error: error.message,
        licensePlate: req.params.licensePlate,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Force checkout for administrative purposes
   * POST /api/v1/checkout/force
   */
  forceCheckout(
    req: TypedRequest<ForceCheckoutRequest>, 
    res: TypedResponse<any>,
    next?: NextFunction
  ): void {
    try {
      const { licensePlate, reason, adminKey } = req.body;

      // Basic admin key validation (in real app, use proper authentication)
      if (adminKey !== 'admin123') {
        res.status(403).json({
          success: false,
          message: 'Invalid administrative access key',
          errorCode: 'FORBIDDEN',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = this.checkoutService.forceCheckout(licensePlate, reason);

      res.status(200).json({
        ...result,
        warning: 'This was a forced checkout operation. Verify billing manually.',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.handleCheckoutError(error, req, res);
    }
  }

  /**
   * Health check endpoint for checkout service
   * GET /api/v1/checkout/health
   */
  healthCheck(
    req: TypedRequest<never>, 
    res: TypedResponse<HealthCheckResponse>,
    next?: NextFunction
  ): void {
    try {
      const stats = this.checkoutService.getCheckoutStats();

      res.status(200).json({
        success: true,
        service: 'checkout',
        status: 'operational',
        summary: {
          availableSpots: stats.spots.availableSpots,
          vehiclesParked: stats.vehicles.stillParked,
          totalRevenue: stats.revenue.totalRevenue,
          pendingRevenue: stats.revenue.pendingRevenue
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      res.status(503).json({
        success: false,
        service: 'checkout',
        status: 'degraded',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle checkout specific errors with appropriate HTTP status codes
   */
  private handleCheckoutError(error: any, req: TypedRequest<any>, res: TypedResponse<any>): void {
    const errorMessage = error.message?.toLowerCase() || '';

    // Vehicle not found error
    if (errorMessage.includes('not found')) {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found',
        error: error.message,
        errorCode: 'VEHICLE_NOT_FOUND',
        hint: 'Please verify the license plate and ensure the vehicle is currently parked',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Vehicle already checked out error
    if (errorMessage.includes('already been checked out') || errorMessage.includes('already checked out')) {
      res.status(409).json({
        success: false,
        message: 'Vehicle already checked out',
        error: error.message,
        errorCode: 'ALREADY_CHECKED_OUT',
        hint: 'This vehicle has already been processed for checkout',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Duration calculation error
    if (errorMessage.includes('calculate parking duration') || errorMessage.includes('duration')) {
      res.status(400).json({
        success: false,
        message: 'Invalid parking duration',
        error: error.message,
        errorCode: 'INVALID_DURATION',
        hint: 'There may be an issue with the check-in time data',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Billing calculation error
    if (errorMessage.includes('calculate parking fee') || errorMessage.includes('billing')) {
      res.status(500).json({
        success: false,
        message: 'Billing calculation failed',
        error: error.message,
        errorCode: 'BILLING_ERROR',
        hint: 'There was an issue calculating the parking fees',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Spot release error
    if (errorMessage.includes('release spot') || errorMessage.includes('spot')) {
      res.status(500).json({
        success: false,
        message: 'Spot release failed',
        error: error.message,
        errorCode: 'SPOT_RELEASE_ERROR',
        hint: 'The vehicle data has been updated but the spot may still show as occupied',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Data integrity error
    if (errorMessage.includes('integrity') || errorMessage.includes('inconsistent')) {
      res.status(500).json({
        success: false,
        message: 'Data integrity issue',
        error: error.message,
        errorCode: 'DATA_INTEGRITY_ERROR',
        hint: 'Please contact support - there is a data consistency issue',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // License plate validation error
    if (errorMessage.includes('license plate')) {
      res.status(400).json({
        success: false,
        message: 'Invalid license plate',
        error: error.message,
        errorCode: 'INVALID_LICENSE_PLATE',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Forced checkout error
    if (errorMessage.includes('forced checkout failed')) {
      res.status(500).json({
        success: false,
        message: 'Forced checkout operation failed',
        error: error.message,
        errorCode: 'FORCE_CHECKOUT_FAILED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Rollback/atomic operation error
    if (errorMessage.includes('rollback') || errorMessage.includes('atomic')) {
      res.status(500).json({
        success: false,
        message: 'Checkout operation failed',
        error: error.message,
        errorCode: 'CHECKOUT_FAILED',
        hint: 'The operation was rolled back - no changes were made',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Internal server error during checkout',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

export = CheckoutController;