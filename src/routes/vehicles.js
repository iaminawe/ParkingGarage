/**
 * Vehicle CRUD routes
 * 
 * This module defines comprehensive routes for vehicle management,
 * including full CRUD operations, bulk operations, search functionality,
 * and vehicle metrics. It follows RESTful conventions and includes
 * proper validation and error handling.
 * 
 * @module VehicleRoutes
 */

const { Router } = require('express');
const { VehicleController } = require('../controllers/VehicleController');
const {
  validateVehicleCreation,
  validateVehicleUpdate,
  validateVehicleId,
  validateVehicleQuery,
  validateBulkRequest,
  sanitizeVehicleRequest,
  validateVehicleRequestBody,
  validateVehicleContentType
} = require('../middleware/validation');

const router = Router();
const vehicleController = new VehicleController();

// Middleware for all routes
router.use(validateVehicleContentType);

/**
 * @route   GET /api/vehicles
 * @desc    Get all vehicles with pagination and filtering
 * @access  Public
 * @query   {number} [page=1] - Page number for pagination
 * @query   {number} [limit=20] - Items per page (max 100)
 * @query   {string} [search] - Search term for license plate, make, model, or owner
 * @query   {string} [vehicleType] - Filter by vehicle type (compact|standard|oversized)
 * @query   {string} [status] - Filter by status (active|inactive|parked|checked_out_unpaid|completed)
 * @query   {string} [sortBy=createdAt] - Sort field
 * @query   {string} [sortOrder=desc] - Sort order (asc|desc)
 * @example GET /api/vehicles?page=1&limit=20&search=ABC&vehicleType=standard&status=active
 */
router.get('/', validateVehicleQuery, vehicleController.getAllVehicles);

/**
 * @route   POST /api/vehicles
 * @desc    Create a new vehicle
 * @access  Public
 * @body    {object} vehicle - Vehicle data to create
 * @body    {string} vehicle.licensePlate - Vehicle license plate (required)
 * @body    {string} [vehicle.vehicleType=standard] - Vehicle type (compact|standard|oversized)
 * @body    {string} [vehicle.rateType=hourly] - Rate type (hourly|daily|monthly)
 * @body    {string} [vehicle.make] - Vehicle make/manufacturer
 * @body    {string} [vehicle.model] - Vehicle model
 * @body    {string} [vehicle.color] - Vehicle color
 * @body    {number} [vehicle.year] - Vehicle year (1900-current+1)
 * @body    {string} [vehicle.ownerId] - Owner ID reference
 * @body    {string} [vehicle.ownerName] - Owner full name
 * @body    {string} [vehicle.ownerEmail] - Owner email address
 * @body    {string} [vehicle.ownerPhone] - Owner phone number
 * @body    {string} [vehicle.notes] - Additional notes
 * @example POST /api/vehicles
 * @example Body: { "licensePlate": "ABC123", "vehicleType": "standard", "make": "Toyota", "model": "Camry", "color": "Blue", "year": 2020, "ownerName": "John Doe", "ownerEmail": "john@example.com", "ownerPhone": "555-0123" }
 */
router.post('/', 
  validateVehicleRequestBody,
  sanitizeVehicleRequest,
  validateVehicleCreation,
  vehicleController.createVehicle
);

/**
 * @route   POST /api/vehicles/bulk-delete
 * @desc    Bulk delete multiple vehicles
 * @access  Public
 * @body    {object} request - Bulk delete request
 * @body    {string[]} request.vehicleIds - Array of vehicle IDs (license plates) to delete
 * @example POST /api/vehicles/bulk-delete
 * @example Body: { "vehicleIds": ["ABC123", "DEF456", "GHI789"] }
 */
router.post('/bulk-delete',
  validateVehicleRequestBody,
  validateBulkRequest,
  vehicleController.bulkDeleteVehicles
);

/**
 * @route   GET /api/vehicles/metrics
 * @desc    Get vehicle metrics and statistics
 * @access  Public
 * @example GET /api/vehicles/metrics
 */
router.get('/metrics', vehicleController.getVehicleMetrics);

/**
 * @route   GET /api/vehicles/search
 * @desc    Search vehicles by license plate (legacy search functionality)
 * @access  Public
 * @query   {string} search - Search term for license plate
 * @query   {string} [mode=all] - Search mode (exact|partial|fuzzy|all)
 * @query   {string} [threshold=0.6] - Fuzzy search threshold (0-1)
 * @query   {string} [maxResults=20] - Maximum results to return (1-100)
 * @example GET /api/vehicles/search?search=ABC&mode=partial&threshold=0.6&maxResults=10
 */
router.get('/search', vehicleController.searchVehicles);

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get a specific vehicle by ID (license plate)
 * @access  Public
 * @param   {string} id - Vehicle ID (license plate)
 * @example GET /api/vehicles/ABC123
 */
router.get('/:id', validateVehicleId, vehicleController.getVehicleById);

/**
 * @route   PUT /api/vehicles/:id
 * @desc    Update a vehicle (partial update allowed)
 * @access  Public
 * @param   {string} id - Vehicle ID (license plate)
 * @body    {object} updates - Vehicle data to update
 * @body    {string} [updates.vehicleType] - Vehicle type (compact|standard|oversized)
 * @body    {string} [updates.rateType] - Rate type (hourly|daily|monthly)
 * @body    {string} [updates.make] - Vehicle make/manufacturer
 * @body    {string} [updates.model] - Vehicle model
 * @body    {string} [updates.color] - Vehicle color
 * @body    {number} [updates.year] - Vehicle year (1900-current+1)
 * @body    {string} [updates.ownerId] - Owner ID reference
 * @body    {string} [updates.ownerName] - Owner full name
 * @body    {string} [updates.ownerEmail] - Owner email address
 * @body    {string} [updates.ownerPhone] - Owner phone number
 * @body    {string} [updates.notes] - Additional notes
 * @example PUT /api/vehicles/ABC123
 * @example Body: { "make": "Honda", "model": "Civic", "ownerPhone": "555-9999" }
 */
router.put('/:id',
  validateVehicleId,
  validateVehicleRequestBody,
  sanitizeVehicleRequest,
  validateVehicleUpdate,
  vehicleController.updateVehicle
);

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    Delete a vehicle
 * @access  Public
 * @param   {string} id - Vehicle ID (license plate)
 * @example DELETE /api/vehicles/ABC123
 * @note    Cannot delete vehicles that are currently parked (not checked out)
 */
router.delete('/:id', validateVehicleId, vehicleController.deleteVehicle);

// Error handling middleware specific to vehicle routes
router.use((error, req, res, next) => {
  console.error('Vehicle route error:', error);
  
  // Handle specific vehicle-related errors
  if (error.message.includes('Vehicle not found')) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found',
      timestamp: new Date().toISOString()
    });
  }
  
  if (error.message.includes('already exists')) {
    return res.status(409).json({
      success: false,
      message: 'Vehicle with this license plate already exists',
      timestamp: new Date().toISOString()
    });
  }
  
  if (error.message.includes('still parked')) {
    return res.status(400).json({
      success: false,
      message: 'Cannot perform this operation on a vehicle that is currently parked',
      timestamp: new Date().toISOString()
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errors: [process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;