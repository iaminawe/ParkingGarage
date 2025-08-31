/**
 * Vehicle search routes
 * 
 * This module defines routes for vehicle search functionality,
 * including exact license plate lookups, partial searches,
 * location-based queries, and search suggestions.
 * 
 * @module VehicleRoutes
 */

import express, { Request, Response, Router } from 'express';
import { TypedRequest, TypedResponse } from '../types/api';

const router: Router = express.Router();
const VehicleController = require('../controllers/vehicleController');

const vehicleController = new VehicleController();

/**
 * @route   GET /api/v1/vehicles
 * @desc    Search vehicles by partial license plate
 * @access  Public
 * @query   {string} search - Search term for license plate
 * @query   {string} [mode=all] - Search mode (exact|partial|fuzzy|all)
 * @query   {number} [threshold=0.6] - Fuzzy match threshold (0-1)
 * @query   {number} [maxResults=20] - Maximum results to return (1-100)
 * @example GET /api/v1/vehicles?search=ABC&mode=partial&maxResults=10
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.searchVehicles(req, res);
});

/**
 * @route   GET /api/v1/vehicles/location
 * @desc    Get vehicles by location (floor, bay, or spot)
 * @access  Public
 * @query   {number} [floor] - Floor number
 * @query   {number} [bay] - Bay number (requires floor)
 * @query   {string} [spotId] - Specific spot ID
 * @example GET /api/v1/vehicles/location?floor=1&bay=2
 * @example GET /api/v1/vehicles/location?spotId=F1-B2-S001
 */
router.get('/location', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.getVehiclesByLocation(req, res);
});

/**
 * @route   GET /api/v1/vehicles/suggestions
 * @desc    Get search suggestions for auto-complete
 * @access  Public
 * @query   {string} partial - Partial license plate for suggestions
 * @query   {number} [limit=10] - Maximum suggestions (1-50)
 * @example GET /api/v1/vehicles/suggestions?partial=AB&limit=5
 */
router.get('/suggestions', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.getSearchSuggestions(req, res);
});

/**
 * @route   GET /api/v1/vehicles/spots/available
 * @desc    Find available parking spots with optional filtering
 * @access  Public
 * @query   {number} [floor] - Filter by floor number
 * @query   {number} [bay] - Filter by bay number (requires floor)
 * @query   {string} [type] - Filter by spot type (compact|standard|oversized)
 * @query   {string} [features] - Filter by features (comma-separated: ev_charging,handicap)
 * @example GET /api/v1/vehicles/spots/available?floor=1&type=standard
 * @example GET /api/v1/vehicles/spots/available?features=ev_charging
 */
router.get('/spots/available', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.getAvailableSpots(req, res);
});

/**
 * @route   GET /api/v1/vehicles/cache/stats
 * @desc    Get search cache statistics
 * @access  Public
 */
router.get('/cache/stats', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.getCacheStats(req, res);
});

/**
 * @route   POST /api/v1/vehicles/cache/clear
 * @desc    Clear search cache
 * @access  Public
 */
router.post('/cache/clear', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.clearCache(req, res);
});

/**
 * @route   GET /api/v1/vehicles/:licensePlate
 * @desc    Find vehicle by exact license plate match
 * @access  Public
 * @param   {string} licensePlate - License plate to search for
 * @example GET /api/v1/vehicles/ABC123
 */
router.get('/:licensePlate', async (req: Request, res: Response): Promise<void> => {
  await vehicleController.findVehicle(req, res);
});

export = router;