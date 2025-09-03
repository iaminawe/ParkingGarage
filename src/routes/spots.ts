/**
 * Spot management routes
 *
 * This module defines the Express routes for spot operations including
 * listing, filtering, retrieving individual spots, and updating spot status.
 * All routes include proper validation, error handling, and performance monitoring.
 *
 * @module SpotRoutes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AsyncRouteHandler } from '../types/express';
import { SpotController } from '../controllers/spotController';
import {
  validateSpotQuery,
  validateSpotId,
  validateSpotUpdate,
  sanitizeSpotUpdate,
  validateIncludeParams,
  validateSortParams,
} from '../middleware/validation/spotValidation';

const router: Router = Router();

// Initialize controller
const spotController = new SpotController();

/**
 * GET /api/v1/spots
 * List spots with filtering, sorting, and pagination
 *
 * Query Parameters:
 * - status: Filter by status (available, occupied)
 * - type: Filter by type (compact, standard, oversized)
 * - floor: Filter by floor number
 * - bay: Filter by bay number
 * - limit: Items per page (1-100, default: 20)
 * - offset: Skip items (default: 0)
 * - sort: Sort field (id, floor, bay, type, status, updatedAt)
 * - order: Sort order (asc, desc, default: asc)
 * - include: Additional data (metadata, features, occupancy)
 *
 * Examples:
 * - GET /spots?status=available&type=compact&limit=10
 * - GET /spots?floor=2&bay=3&sort=id&order=desc
 * - GET /spots?status=occupied&include=metadata,features
 *
 * Response: 200 OK with spots array, pagination, and metadata
 */
router.get(
  '/',
  validateSpotQuery,
  validateIncludeParams,
  validateSortParams,
  async (req: Request, res: Response): Promise<void> => {
    await spotController.getSpots(req, res);
  }
);

/**
 * GET /api/v1/spots/statistics
 * Get comprehensive spot statistics and occupancy data
 *
 * Response: 200 OK with detailed statistics
 */
router.get('/statistics', async (req: Request, res: Response): Promise<void> => {
  await spotController.getSpotStatistics(req, res);
});

/**
 * GET /api/v1/spots/available
 * Convenience endpoint to get only available spots
 * Supports same query parameters as main spots endpoint except status
 *
 * Response: 200 OK with available spots
 */
router.get(
  '/available',
  validateSpotQuery,
  validateIncludeParams,
  validateSortParams,
  async (req: Request, res: Response): Promise<void> => {
    await spotController.getAvailableSpots(req, res);
  }
);

/**
 * GET /api/v1/spots/occupied
 * Convenience endpoint to get only occupied spots
 * Supports same query parameters as main spots endpoint except status
 *
 * Response: 200 OK with occupied spots
 */
router.get(
  '/occupied',
  validateSpotQuery,
  validateIncludeParams,
  validateSortParams,
  async (req: Request, res: Response): Promise<void> => {
    await spotController.getOccupiedSpots(req, res);
  }
);

/**
 * GET /api/v1/spots/search
 * Advanced search endpoint with query parsing
 *
 * Query Parameters:
 * - query: Search string (e.g., "floor:2 compact", "F1-B3", "available ev_charging")
 * - All other parameters from main spots endpoint
 *
 * Search formats supported:
 * - Field:value (floor:1, type:compact, status:available)
 * - Simple terms (available, compact, F1-B2)
 * - Combined searches (floor:2 compact available)
 *
 * Response: 200 OK with matching spots
 */
router.get(
  '/search',
  validateSpotQuery,
  validateIncludeParams,
  validateSortParams,
  async (req: Request, res: Response): Promise<void> => {
    await spotController.searchSpots(req, res);
  }
);

/**
 * GET /api/v1/spots/info
 * Route info endpoint for API documentation
 */
router.get('/info', (req: Request, res: Response): void => {
  res.json({
    name: 'Spot Management API',
    version: '1.0.0',
    description: 'RESTful API for parking spot operations',
    endpoints: {
      'GET /spots': 'List spots with filtering and pagination',
      'GET /spots/:id': 'Get individual spot details',
      'PATCH /spots/:id': 'Update spot status/type/features',
      'PUT /spots/:id/occupy': 'Mark specific spot as occupied',
      'PUT /spots/:id/free': 'Mark specific spot as available',
      'GET /spots/statistics': 'Get spot statistics',
      'GET /spots/available': 'Get only available spots',
      'GET /spots/occupied': 'Get only occupied spots',
      'GET /spots/search': 'Advanced spot search',
    },
    filters: {
      status: ['available', 'occupied'],
      type: ['compact', 'standard', 'oversized'],
      floor: 'integer (1+)',
      bay: 'integer (1+)',
    },
    pagination: {
      limit: 'integer (1-100, default: 20)',
      offset: 'integer (0+, default: 0)',
    },
    sorting: {
      sort: ['id', 'floor', 'bay', 'type', 'status', 'updatedAt'],
      order: ['asc', 'desc'],
    },
    examples: {
      'List first 10 available compact spots': '/spots?status=available&type=compact&limit=10',
      'Get spots on floor 2, bay 3': '/spots?floor=2&bay=3',
      'Search for available EV charging spots': '/spots/search?query=available ev_charging',
      'Get specific spot': '/spots/F1-B2-S3',
      'Update spot status': 'PATCH /spots/F1-B2-S3 {"status": "occupied"}',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/v1/spots/:id
 * Get individual spot details by ID
 *
 * Path Parameters:
 * - id: Spot ID in format F{floor}-B{bay}-S{spot} (e.g., F1-B2-S3)
 *
 * Response:
 * - 200 OK with spot details
 * - 404 Not Found if spot doesn't exist
 */
router.get(
  '/:id',
  validateSpotId,
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await spotController.getSpotById(req, res);
  }
);

/**
 * PUT /api/v1/spots/:id/occupy
 * Mark specific spot as occupied
 *
 * Path Parameters:
 * - id: Spot ID in format F{floor}-B{bay}-S{spot}
 *
 * Request Body (JSON, Optional):
 * {
 *   "vehicleId": "string",       // Optional: Vehicle ID occupying the spot
 *   "licensePlate": "string",    // Optional: License plate of occupying vehicle
 *   "notes": "string"            // Optional: Additional notes
 * }
 *
 * Response:
 * - 200 OK with updated spot details
 * - 400 Bad Request if spot is already occupied
 * - 404 Not Found if spot doesn't exist
 */
router.put(
  '/:id/occupy',
  validateSpotId,
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await spotController.occupySpot(req, res);
  }
);

/**
 * PUT /api/v1/spots/:id/free
 * Mark specific spot as available
 *
 * Path Parameters:
 * - id: Spot ID in format F{floor}-B{bay}-S{spot}
 *
 * Request Body (JSON, Optional):
 * {
 *   "notes": "string"    // Optional: Additional notes about freeing the spot
 * }
 *
 * Response:
 * - 200 OK with updated spot details
 * - 400 Bad Request if spot is already available
 * - 404 Not Found if spot doesn't exist
 */
router.put(
  '/:id/free',
  validateSpotId,
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await spotController.freeSpot(req, res);
  }
);

/**
 * PATCH /api/v1/spots/:id
 * Update spot status, type, or features
 *
 * Path Parameters:
 * - id: Spot ID in format F{floor}-B{bay}-S{spot}
 *
 * Request Body (JSON):
 * {
 *   "status": "available|occupied",        // Optional
 *   "type": "compact|standard|oversized",  // Optional
 *   "features": ["ev_charging", "handicap"] // Optional array
 * }
 *
 * Notes:
 * - At least one field must be provided
 * - Updates are atomic - either all succeed or none
 * - Immutable fields (id, floor, bay, spotNumber) cannot be updated
 *
 * Response:
 * - 200 OK with updated spot details
 * - 400 Bad Request for invalid data
 * - 404 Not Found if spot doesn't exist
 */
router.patch(
  '/:id',
  validateSpotId,
  sanitizeSpotUpdate,
  validateSpotUpdate,
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await spotController.updateSpot(req, res);
  }
);

/**
 * Error handling middleware for spot routes
 * Catches any unhandled errors and returns consistent error responses
 */
router.use((error: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Spot routes error:', error);

  // Handle validation errors
  if (error.status === 400) {
    res.status(400).json({
      success: false,
      message: error.message,
      errors: error.errors || [error.message],
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle generic errors
  res.status(500).json({
    success: false,
    message: 'Internal server error in spot operations',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString(),
  });
});

export default router;
