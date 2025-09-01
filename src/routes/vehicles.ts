/**
 * Vehicle search routes
 * 
 * This module defines routes for vehicle search functionality,
 * including exact license plate lookups, partial searches,
 * location-based queries, and search suggestions.
 * 
 * @module VehicleRoutes
 */

import { Router, Request, Response } from 'express';
import { AsyncRouteHandler } from '../types/express';
import { VehicleController } from '../controllers/vehicleController';

const router: Router = Router();
const vehicleController = new VehicleController();

/**
 * @route   GET /api/vehicles
 * @desc    Get all vehicles with pagination and filtering
 * @access  Public
 * @query   {number} [page] - Page number for pagination
 * @query   {number} [limit] - Items per page
 * @query   {string} [search] - Search term for license plate
 * @example GET /api/vehicles?page=1&limit=20
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.getAllVehicles(req, res);
});

/**
 * @route   POST /api/vehicles
 * @desc    Create a new vehicle
 * @access  Public
 * @body    {object} vehicle - Vehicle data to create
 * @example POST /api/vehicles
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.createVehicle(req, res);
});

/**
 * @route   POST /api/vehicles/bulk-delete
 * @desc    Bulk delete vehicles
 * @access  Public
 * @body    {string[]} vehicleIds - Array of vehicle IDs to delete
 * @example POST /api/vehicles/bulk-delete
 */
router.post('/bulk-delete', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.bulkDeleteVehicles(req, res);
});

/**
 * @route   GET /api/vehicles/metrics
 * @desc    Get vehicle metrics and statistics
 * @access  Public
 * @example GET /api/vehicles/metrics
 */
router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.getVehicleMetrics(req, res);
});

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get a specific vehicle by ID (license plate)
 * @access  Public
 * @param   {string} id - Vehicle ID (license plate)
 * @example GET /api/vehicles/ABC123
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.getVehicleById(req, res);
});

/**
 * @route   PUT /api/vehicles/:id
 * @desc    Update a vehicle
 * @access  Public
 * @param   {string} id - Vehicle ID (license plate)
 * @body    {object} vehicle - Vehicle data to update
 * @example PUT /api/vehicles/ABC123
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.updateVehicle(req, res);
});

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    Delete a vehicle
 * @access  Public
 * @param   {string} id - Vehicle ID (license plate)
 * @example DELETE /api/vehicles/ABC123
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.deleteVehicle(req, res);
});

// Keep useful legacy search endpoints
/**
 * @route   GET /api/vehicles/search
 * @desc    Search vehicles by license plate (legacy search functionality)
 * @access  Public
 * @query   {string} search - Search term for license plate
 * @query   {string} [mode] - Search mode (exact|partial|fuzzy|all)
 * @example GET /api/vehicles/search?search=ABC&mode=partial
 */
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.searchVehicles(req, res);
});

export default router;
