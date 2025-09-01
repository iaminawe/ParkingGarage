/**
 * Checkout Controller
 * 
 * This module handles HTTP requests for vehicle checkout operations,
 * including request processing, error handling, and response formatting
 * for the checkout API endpoints.
 * 
 * @module CheckoutController
 */

import { Request, Response } from 'express';
const CheckoutService = require('../services/checkoutService');
import { 
  CheckOutRequest, 
  CheckOutResponse, 
  ApiResponse 
} from '../types/api';

interface CheckoutOptions {
  applyGracePeriod?: boolean;
  removeRecord?: boolean;
  checkOutTime?: string;
}

interface ForceCheckoutRequest {
  licensePlate: string;
  reason: string;
  adminKey: string;
}

/**
 * Controller for handling checkout related HTTP requests
 */
export class CheckoutController {
  private checkoutService: CheckoutService;

  constructor() {
    this.checkoutService = new CheckoutService();
  }

  /**
   * Handle vehicle checkout request
   * POST /api/v1/checkout
   */
  checkOut = async (req: Request<{}, ApiResponse<CheckOutResponse>, CheckOutRequest & CheckoutOptions>, res: Response<ApiResponse<CheckOutResponse>>): Promise<void> => {
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
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.handleCheckoutError(error as Error, req, res);
    }
  };

  /**
   * Simulate checkout without actually performing it
   * POST /api/v1/checkout/simulate
   */
  simulateCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { licensePlate, applyGracePeriod = false, checkOutTime }: { licensePlate: string; applyGracePeriod?: boolean; checkOutTime?: string } = req.body;

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
        success: true,
        ...simulation,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Checkout simulation failed',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get checkout statistics and metrics
   * GET /api/v1/checkout/stats
   */
  getCheckoutStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.checkoutService.getCheckoutStats();

      res.status(200).json({
        success: true,
        message: 'Checkout statistics retrieved successfully',
        data: { statistics: stats },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve checkout statistics',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get vehicles ready for checkout
   * GET /api/v1/checkout/ready
   */
  getVehiclesReadyForCheckout = async (req: Request<{}, {}, {}, { minMinutes?: string }>, res: Response): Promise<void> => {
    try {
      const { minMinutes = '0' } = req.query;
      const vehicles = this.checkoutService.getVehiclesReadyForCheckout(parseInt(minMinutes, 10));

      res.status(200).json({
        success: true,
        message: `Found ${vehicles.length} vehicle(s) ready for checkout`,
        data: {
          count: vehicles.length,
          vehicles,
          filters: {
            minMinutes: parseInt(minMinutes, 10)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicles ready for checkout',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get current parking estimate for a vehicle
   * GET /api/v1/checkout/estimate/:licensePlate
   */
  getCurrentEstimate = async (req: Request<{ licensePlate: string }>, res: Response): Promise<void> => {
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
          errors: [simulation.error || 'Unknown error'],
          timestamp: new Date().toISOString()
        });
        return;
      }

      const estimate = simulation.simulation;

      res.status(200).json({
        success: true,
        message: 'Current parking estimate calculated',
        data: {
          licensePlate,
          estimate: {
            duration: estimate.estimatedDuration,
            billing: estimate.estimatedBilling,
            spotId: estimate.spotId,
            status: estimate.currentStatus
          },
          note: 'This is an estimate. Final amount may vary based on actual checkout time.'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to calculate parking estimate',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Force checkout for administrative purposes
   * POST /api/v1/checkout/force
   */
  forceCheckout = async (req: Request<{}, ApiResponse, ForceCheckoutRequest>, res: Response<ApiResponse>): Promise<void> => {
    try {
      const { licensePlate, reason, adminKey } = req.body;

      // Basic admin key validation (in real app, use proper authentication)
      if (adminKey !== 'admin123') {
        res.status(403).json({
          success: false,
          message: 'Invalid administrative access key',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = this.checkoutService.forceCheckout(licensePlate, reason);

      res.status(200).json({
        success: true,
        ...result,
        message: result.message || 'Force checkout completed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.handleCheckoutError(error as Error, req, res);
    }
  };

  /**
   * Health check endpoint for checkout service
   * GET /api/v1/checkout/health
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.checkoutService.getCheckoutStats();
      
      res.status(200).json({
        success: true,
        data: {
          service: 'checkout',
          status: 'operational',
          summary: {
            availableSpots: stats.spots.availableSpots,
            vehiclesParked: stats.vehicles.stillParked,
            totalRevenue: stats.revenue.totalRevenue,
            pendingRevenue: stats.revenue.pendingRevenue
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(503).json({
        success: false,
        message: 'Service health check failed',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Handle checkout specific errors with appropriate HTTP status codes
   */
  private handleCheckoutError(error: Error, req: Request, res: Response): void {
    const errorMessage = error.message.toLowerCase();

    // Vehicle not found error
    if (errorMessage.includes('not found')) {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found',
        errors: [error.message],
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Vehicle already checked out error
    if (errorMessage.includes('already been checked out') || errorMessage.includes('already checked out')) {
      res.status(409).json({
        success: false,
        message: 'Vehicle already checked out',
        errors: [error.message],
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Duration calculation error
    if (errorMessage.includes('calculate parking duration') || errorMessage.includes('duration')) {
      res.status(400).json({
        success: false,
        message: 'Invalid parking duration',
        errors: [error.message],
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Billing calculation error
    if (errorMessage.includes('calculate parking fee') || errorMessage.includes('billing')) {
      res.status(500).json({
        success: false,
        message: 'Billing calculation failed',
        errors: [error.message],
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Spot release error
    if (errorMessage.includes('release spot') || errorMessage.includes('spot')) {
      res.status(500).json({
        success: false,
        message: 'Spot release failed',
        errors: [error.message],
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Data integrity error
    if (errorMessage.includes('integrity') || errorMessage.includes('inconsistent')) {
      res.status(500).json({
        success: false,
        message: 'Data integrity issue',
        errors: [error.message],
        timestamp: new Date().toISOString()
      });
      return;
    }

    // License plate validation error
    if (errorMessage.includes('license plate')) {
      res.status(400).json({
        success: false,
        message: 'Invalid license plate',
        errors: [error.message],
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Forced checkout error
    if (errorMessage.includes('forced checkout failed')) {
      res.status(500).json({
        success: false,
        message: 'Forced checkout operation failed',
        errors: [error.message],
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Rollback/atomic operation error
    if (errorMessage.includes('rollback') || errorMessage.includes('atomic')) {
      res.status(500).json({
        success: false,
        message: 'Checkout operation failed',
        errors: [error.message],
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Internal server error during checkout',
      errors: [error.message],
      timestamp: new Date().toISOString()
    });
  }
}