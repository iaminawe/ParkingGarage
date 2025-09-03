/**
 * Floor management routes
 *
 * This module defines the Express routes for floor operations including
 * listing, creating, updating, and deleting floors.
 * All routes include proper error handling.
 *
 * @module FloorRoutes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { FloorController } from '../controllers/FloorController';

const router: Router = Router();

// Initialize controller
const floorController = new FloorController();

/**
 * GET /api/floors
 * List floors with filtering, sorting, and pagination
 *
 * Query Parameters:
 * - garageId: Filter by garage ID
 * - floorNumber: Filter by floor number
 * - isActive: Filter by active status (true/false)
 * - hasAvailableSpots: Filter floors with available spots (true/false)
 * - limit: Items per page (1-100, default: 20)
 * - offset: Skip items (default: 0)
 * - sort: Sort field (floorNumber, totalSpots, createdAt)
 * - order: Sort order (asc, desc, default: asc)
 *
 * Examples:
 * - GET /floors?garageId=garage123&limit=10
 * - GET /floors?floorNumber=2&hasAvailableSpots=true
 * - GET /floors?sort=floorNumber&order=desc
 *
 * Response: 200 OK with floors array, pagination, and metadata
 */
router.get(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    await floorController.getFloors(req, res);
  }
);

/**
 * GET /api/floors/statistics
 * Get comprehensive floor statistics and occupancy data
 *
 * Query Parameters:
 * - garageId: Filter statistics by garage ID (optional)
 *
 * Response: 200 OK with detailed statistics
 */
router.get('/statistics', async (req: Request, res: Response): Promise<void> => {
  await floorController.getFloorStatistics(req, res);
});

/**
 * GET /api/floors/info
 * Route info endpoint for API documentation
 */
router.get('/info', (req: Request, res: Response): void => {
  res.json({
    name: 'Floor Management API',
    version: '1.0.0',
    description: 'RESTful API for parking garage floor operations',
    endpoints: {
      'GET /floors': 'List floors with filtering and pagination',
      'GET /floors/:id': 'Get individual floor details with spots',
      'GET /floors/:id/bays': 'Get bay information for a specific floor',
      'GET /floors/:id/bays/:bayNumber': 'Get specific bay details with spots',
      'POST /floors': 'Create a new floor',
      'PUT /floors/:id': 'Update floor information',
      'DELETE /floors/:id': 'Delete a floor (soft delete)',
      'GET /floors/statistics': 'Get floor statistics and occupancy',
      'PUT /floors/:id/update-spot-count': 'Update floor spot count',
    },
    filters: {
      garageId: 'string (UUID)',
      floorNumber: 'integer',
      isActive: 'boolean (true/false)',
      hasAvailableSpots: 'boolean (true/false)',
    },
    pagination: {
      limit: 'integer (1-100, default: 20)',
      offset: 'integer (0+, default: 0)',
    },
    sorting: {
      sort: ['floorNumber', 'totalSpots', 'createdAt', 'updatedAt'],
      order: ['asc', 'desc'],
    },
    examples: {
      'List floors for a garage': '/floors?garageId=cmf45jwvy00024oipsn2sxozy',
      'Get floors with available spots': '/floors?hasAvailableSpots=true',
      'Get specific floor': '/floors/cmf45jwvy00024oipsn2sxozy',
      'Create floor': 'POST /floors {"garageId": "uuid", "floorNumber": 2}',
      'Update floor': 'PUT /floors/uuid {"description": "Ground Floor"}',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/floors/:id/bays
 * Get bay information for a specific floor
 *
 * Path Parameters:
 * - id: Floor ID (UUID format)
 *
 * Query Parameters:
 * - includeSpots: Include spots in each bay (true/false, default: false)
 * - status: Filter bays by spot status (available/occupied/all, default: all)
 *
 * Response:
 * - 200 OK with bay information grouped by bay number
 * - 404 Not Found if floor doesn't exist
 * - 500 Internal Server Error
 */
router.get(
  '/:id/bays',
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await floorController.getFloorBays(req, res);
  }
);

/**
 * GET /api/floors/:id/bays/:bayNumber
 * Get specific bay information with spots
 *
 * Path Parameters:
 * - id: Floor ID (UUID format)
 * - bayNumber: Bay number within the floor
 *
 * Query Parameters:
 * - includeSpots: Include spot details (true/false, default: true)
 * - status: Filter spots by status (available/occupied/all, default: all)
 *
 * Response:
 * - 200 OK with bay details and spots
 * - 404 Not Found if floor or bay doesn't exist
 * - 500 Internal Server Error
 */
router.get(
  '/:id/bays/:bayNumber',
  async (req: Request<{ id: string; bayNumber: string }>, res: Response): Promise<void> => {
    await floorController.getBayDetails(req, res);
  }
);

/**
 * PUT /api/floors/:id/update-spot-count
 * Update the total spot count for a floor based on actual spots
 *
 * Path Parameters:
 * - id: Floor ID (UUID format)
 *
 * Notes:
 * - Recalculates and updates the totalSpots field based on active parking spots
 * - Useful after adding or removing spots from a floor
 *
 * Response:
 * - 200 OK with updated floor details
 * - 404 Not Found if floor doesn't exist
 * - 500 Internal Server Error
 */
router.put(
  '/:id/update-spot-count',
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await floorController.updateFloorSpotCount(req, res);
  }
);

/**
 * GET /api/floors/:id
 * Get individual floor details by ID with spots information
 *
 * Path Parameters:
 * - id: Floor ID (UUID format)
 *
 * Response:
 * - 200 OK with floor details including spots and garage info
 * - 404 Not Found if floor doesn't exist
 */
router.get(
  '/:id',
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await floorController.getFloorById(req, res);
  }
);

/**
 * POST /api/floors
 * Create a new floor
 *
 * Request Body (JSON):
 * {
 *   "garageId": "string",              // Required: Garage ID
 *   "floorNumber": number,             // Required: Floor number (unique per garage)
 *   "description": "string",           // Optional: Floor description
 *   "totalSpots": number,              // Optional: Initial spot count (default: 0)
 *   "isActive": boolean                // Optional: Active status (default: true)
 * }
 *
 * Response:
 * - 201 Created with floor details
 * - 400 Bad Request for invalid data or conflicts
 * - 500 Internal Server Error
 */
router.post(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    await floorController.createFloor(req, res);
  }
);

/**
 * PUT /api/floors/:id
 * Update floor information
 *
 * Path Parameters:
 * - id: Floor ID (UUID format)
 *
 * Request Body (JSON):
 * {
 *   "garageId": "string",              // Optional: Garage ID
 *   "floorNumber": number,             // Optional: Floor number
 *   "description": "string",           // Optional: Floor description
 *   "totalSpots": number,              // Optional: Total spot count
 *   "isActive": boolean                // Optional: Active status
 * }
 *
 * Notes:
 * - At least one field must be provided
 * - Updates are atomic - either all succeed or none
 * - Floor number must be unique within the garage
 *
 * Response:
 * - 200 OK with updated floor details
 * - 400 Bad Request for invalid data or conflicts
 * - 404 Not Found if floor doesn't exist
 * - 500 Internal Server Error
 */
router.put(
  '/:id',
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await floorController.updateFloor(req, res);
  }
);

/**
 * DELETE /api/floors/:id
 * Delete a floor (soft delete - sets isActive to false)
 *
 * Path Parameters:
 * - id: Floor ID (UUID format)
 *
 * Notes:
 * - Cannot delete floors with active parking spots
 * - This is a soft delete operation (sets isActive to false)
 *
 * Response:
 * - 200 OK with success message
 * - 400 Bad Request if floor has active spots
 * - 404 Not Found if floor doesn't exist
 * - 500 Internal Server Error
 */
router.delete(
  '/:id',
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await floorController.deleteFloor(req, res);
  }
);

/**
 * Error handling middleware for floor routes
 * Catches any unhandled errors and returns consistent error responses
 */
router.use((error: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Floor routes error:', error);

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
    message: 'Internal server error in floor operations',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString(),
  });
});

export default router;