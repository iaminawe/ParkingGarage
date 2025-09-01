/**
 * Garage management routes
 * 
 * This module defines the Express routes for garage configuration and
 * management operations. It includes endpoints for garage initialization,
 * configuration updates, rate management, and statistics retrieval.
 * 
 * @module GarageRoutes
 */

import { Router, Request, Response } from 'express';
import { AsyncRouteHandler } from '../types/express';
import { GarageController } from '../controllers/garageController';
import {
  validateGarageInitialization,
  validateRateUpdate,
  validateGarageQuery,
  validateGarageConfigUpdate,
  sanitizeGarageName
} from '../middleware/validation/garageValidation';

const router: Router = Router();

// Initialize controller
const garageController = new GarageController();

/**
 * GET /api/v1/garage
 * Get current garage configuration
 * 
 * Query Parameters:
 * - includeStats: boolean - Include occupancy statistics
 * - includeSpots: boolean - Include detailed spot information
 * 
 * Responses:
 * - 200: Garage configuration retrieved successfully
 * - 404: Garage not initialized
 * - 500: Server error
 */
router.get('/', 
  validateGarageQuery,
  async (req: Request, res: Response): Promise<void> => {
    await garageController.getGarageConfiguration(req, res);
  }
);

/**
 * POST /api/v1/garage/initialize
 * Initialize garage with floors, bays, and spots
 * 
 * Request Body:
 * {
 *   "name": "Main Street Garage",
 *   "floors": [
 *     { "number": 1, "bays": 3, "spotsPerBay": 20 },
 *     { "number": 2, "bays": 4, "spotsPerBay": 25 }
 *   ]
 * }
 * 
 * Responses:
 * - 201: Garage initialized successfully
 * - 400: Invalid initialization data
 * - 409: Garage already exists
 * - 500: Server error
 */
router.post('/initialize',
  sanitizeGarageName,
  validateGarageInitialization,
  async (req: Request, res: Response): Promise<void> => {
    await garageController.initializeGarage(req, res);
  }
);

/**
 * PUT /api/v1/garage/rates
 * Update garage pricing rates
 * 
 * Request Body:
 * {
 *   "standard": 5.00,
 *   "compact": 4.00,
 *   "oversized": 7.00,
 *   "ev_charging": 8.00
 * }
 * 
 * Responses:
 * - 200: Rates updated successfully
 * - 400: Invalid rate data
 * - 404: Garage not initialized
 * - 500: Server error
 */
router.put('/rates',
  validateRateUpdate,
  async (req: Request, res: Response): Promise<void> => {
    await garageController.updateGarageRates(req, res);
  }
);

/**
 * GET /api/v1/garage/rates
 * Get current garage rates
 * 
 * Responses:
 * - 200: Current rates retrieved successfully
 * - 404: Garage not initialized
 * - 500: Server error
 */
router.get('/rates',
  async (req: Request, res: Response): Promise<void> => {
    await garageController.getGarageRates(req, res);
  }
);

/**
 * PUT /api/v1/garage/config
 * Update garage configuration (name, etc.)
 * 
 * Request Body:
 * {
 *   "name": "Updated Garage Name"
 * }
 * 
 * Responses:
 * - 200: Configuration updated successfully
 * - 400: Invalid configuration data
 * - 404: Garage not initialized
 * - 500: Server error
 */
router.put('/config',
  sanitizeGarageName,
  validateGarageConfigUpdate,
  async (req: Request, res: Response): Promise<void> => {
    await garageController.updateGarageConfiguration(req, res);
  }
);

/**
 * GET /api/v1/garage/statistics
 * Get comprehensive garage statistics
 * 
 * Responses:
 * - 200: Statistics retrieved successfully
 * - 404: Garage not initialized
 * - 500: Server error
 */
router.get('/statistics',
  async (req: Request, res: Response): Promise<void> => {
    await garageController.getGarageStatistics(req, res);
  }
);

/**
 * GET /api/v1/garage/status
 * Get garage initialization status
 * 
 * Responses:
 * - 200: Status retrieved successfully
 * - 500: Server error
 */
router.get('/status',
  async (req: Request, res: Response): Promise<void> => {
    await garageController.getGarageStatus(req, res);
  }
);

/**
 * GET /api/v1/garage/capacity
 * Get garage capacity information
 * 
 * Responses:
 * - 200: Capacity information retrieved successfully
 * - 404: Garage not initialized
 * - 500: Server error
 */
router.get('/capacity',
  async (req: Request, res: Response): Promise<void> => {
    await garageController.getGarageCapacity(req, res);
  }
);

/**
 * DELETE /api/v1/garage/reset
 * Reset garage (clear all data) - mainly for development/testing
 * 
 * Responses:
 * - 200: Garage reset successfully
 * - 500: Server error
 */
router.delete('/reset',
  async (req: Request, res: Response): Promise<void> => {
    await garageController.resetGarage(req, res);
  }
);

export default router;
