/**
 * Check-in Routes
 *
 * This module defines the Express routes for vehicle check-in operations,
 * including the main check-in endpoint, simulation, availability checking,
 * and statistics endpoints.
 *
 * @module CheckinRoutes
 */

const express = require('express');
const router = express.Router();
const CheckinController = require('../controllers/checkinController');
const {
  validateCheckinRequest,
  sanitizeCheckinRequest,
  validateRequestBody,
  validateContentType
} = require('../middleware/validation/checkinValidation');

const checkinController = new CheckinController();

/**
 * @route   POST /api/v1/checkin
 * @desc    Check in a vehicle to the garage
 * @access  Public (will be protected in future with auth)
 * @body    { licensePlate: string, vehicleType: string, rateType?: string }
 * @returns { success: boolean, spotId: string, location: object, checkInTime: string }
 */
router.post('/',
  validateContentType,
  validateRequestBody,
  sanitizeCheckinRequest,
  validateCheckinRequest,
  (req, res) => checkinController.checkIn(req, res)
);

/**
 * @route   POST /api/v1/checkin/simulate
 * @desc    Simulate check-in without actually performing it
 * @access  Public
 * @body    { licensePlate: string, vehicleType: string }
 * @returns { success: boolean, wouldAssignSpot?: string, spotLocation?: object }
 */
router.post('/simulate',
  validateContentType,
  validateRequestBody,
  sanitizeCheckinRequest,
  (req, res) => checkinController.simulateCheckin(req, res)
);

/**
 * @route   GET /api/v1/checkin/availability
 * @desc    Get general availability information for all vehicle types
 * @access  Public
 * @returns { success: boolean, overall: object, byVehicleType: object }
 */
router.get('/availability',
  (req, res) => checkinController.getGeneralAvailability(req, res)
);

/**
 * @route   GET /api/v1/checkin/availability/:vehicleType
 * @desc    Get availability information for specific vehicle type
 * @access  Public
 * @param   {string} vehicleType - Vehicle type (compact, standard, oversized)
 * @returns { success: boolean, availability: object, assignment: object }
 */
router.get('/availability/:vehicleType',
  (req, res) => checkinController.getAvailabilityByVehicleType(req, res)
);

/**
 * @route   GET /api/v1/checkin/stats
 * @desc    Get check-in statistics and metrics
 * @access  Public (will be restricted to admin in future)
 * @returns { success: boolean, statistics: object }
 */
router.get('/stats',
  (req, res) => checkinController.getCheckinStats(req, res)
);

/**
 * @route   GET /api/v1/checkin/health
 * @desc    Health check for check-in service
 * @access  Public
 * @returns { success: boolean, service: string, status: string }
 */
router.get('/health',
  (req, res) => checkinController.healthCheck(req, res)
);

/**
 * Handle 404 for unknown check-in routes
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Check-in endpoint not found',
    availableEndpoints: {
      'POST /checkin': 'Check in a vehicle',
      'POST /checkin/simulate': 'Simulate check-in',
      'GET /checkin/availability': 'Get general availability',
      'GET /checkin/availability/:vehicleType': 'Get availability by vehicle type',
      'GET /checkin/stats': 'Get check-in statistics',
      'GET /checkin/health': 'Service health check'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
