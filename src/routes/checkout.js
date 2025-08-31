/**
 * Checkout Routes
 *
 * This module defines the Express routes for vehicle checkout operations,
 * including the main checkout endpoint, simulation, estimation, statistics,
 * and administrative functions.
 *
 * @module CheckoutRoutes
 */

const express = require('express');
const router = express.Router();
const CheckoutController = require('../controllers/checkoutController');
const {
  validateCheckoutRequest,
  sanitizeCheckoutRequest,
  validateRequestBody,
  validateContentType,
  validateLicensePlateParam,
  validateCheckoutListQuery,
  validateForceCheckoutRequest
} = require('../middleware/validation/checkoutValidation');

const checkoutController = new CheckoutController();

/**
 * @route   POST /api/v1/checkout
 * @desc    Check out a vehicle from the garage
 * @access  Public (will be protected in future with auth)
 * @body    { licensePlate: string, applyGracePeriod?: boolean, removeRecord?: boolean, checkOutTime?: string }
 * @returns { success: boolean, licensePlate: string, spotId: string, timing: object, billing: object }
 */
router.post('/',
  validateContentType,
  validateRequestBody,
  sanitizeCheckoutRequest,
  validateCheckoutRequest,
  (req, res) => checkoutController.checkOut(req, res)
);

/**
 * @route   POST /api/v1/checkout/simulate
 * @desc    Simulate checkout without actually performing it
 * @access  Public
 * @body    { licensePlate: string, applyGracePeriod?: boolean, checkOutTime?: string }
 * @returns { success: boolean, simulation: object }
 */
router.post('/simulate',
  validateContentType,
  validateRequestBody,
  sanitizeCheckoutRequest,
  (req, res) => checkoutController.simulateCheckout(req, res)
);

/**
 * @route   GET /api/v1/checkout/stats
 * @desc    Get checkout statistics and revenue metrics
 * @access  Public (will be restricted to admin in future)
 * @returns { success: boolean, statistics: object }
 */
router.get('/stats',
  (req, res) => checkoutController.getCheckoutStats(req, res)
);

/**
 * @route   GET /api/v1/checkout/ready
 * @desc    Get vehicles that are ready for checkout
 * @access  Public (will be restricted to admin in future)
 * @query   { minMinutes?: number, vehicleType?: string, rateType?: string, status?: string }
 * @returns { success: boolean, count: number, vehicles: array }
 */
router.get('/ready',
  validateCheckoutListQuery,
  (req, res) => checkoutController.getVehiclesReadyForCheckout(req, res)
);

/**
 * @route   GET /api/v1/checkout/estimate/:licensePlate
 * @desc    Get current parking cost estimate for a vehicle
 * @access  Public
 * @param   {string} licensePlate - Vehicle license plate
 * @returns { success: boolean, licensePlate: string, estimate: object }
 */
router.get('/estimate/:licensePlate',
  validateLicensePlateParam,
  (req, res) => checkoutController.getCurrentEstimate(req, res)
);

/**
 * @route   POST /api/v1/checkout/force
 * @desc    Force checkout for administrative purposes
 * @access  Admin (requires admin key)
 * @body    { licensePlate: string, reason: string, adminKey: string }
 * @returns { success: boolean, forced: boolean, reason: string }
 */
router.post('/force',
  validateContentType,
  validateRequestBody,
  sanitizeCheckoutRequest,
  validateForceCheckoutRequest,
  (req, res) => checkoutController.forceCheckout(req, res)
);

/**
 * @route   GET /api/v1/checkout/health
 * @desc    Health check for checkout service
 * @access  Public
 * @returns { success: boolean, service: string, status: string }
 */
router.get('/health',
  (req, res) => checkoutController.healthCheck(req, res)
);

/**
 * Handle 404 for unknown checkout routes
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Checkout endpoint not found',
    availableEndpoints: {
      'POST /checkout': 'Check out a vehicle',
      'POST /checkout/simulate': 'Simulate checkout',
      'GET /checkout/stats': 'Get checkout statistics',
      'GET /checkout/ready': 'Get vehicles ready for checkout',
      'GET /checkout/estimate/:licensePlate': 'Get current cost estimate',
      'POST /checkout/force': 'Force checkout (admin)',
      'GET /checkout/health': 'Service health check'
    },
    examples: {
      basicCheckout: {
        method: 'POST',
        url: '/checkout',
        body: {
          licensePlate: 'ABC123'
        }
      },
      withOptions: {
        method: 'POST',
        url: '/checkout',
        body: {
          licensePlate: 'ABC123',
          applyGracePeriod: false,
          removeRecord: true
        }
      },
      simulation: {
        method: 'POST',
        url: '/checkout/simulate',
        body: {
          licensePlate: 'ABC123'
        }
      },
      estimate: {
        method: 'GET',
        url: '/checkout/estimate/ABC123'
      }
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
