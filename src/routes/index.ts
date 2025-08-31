/**
 * Main routes index
 * 
 * This module aggregates all API routes and provides a central
 * entry point for the Express application routing configuration.
 */

import { Router, Request, Response } from 'express';

const router = Router();

// API Info endpoint
router.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Parking Garage Management API',
    version: '1.0.0',
    description: 'RESTful API for managing parking garage operations',
    endpoints: {
      health: '/health',
      api: '/api',
      garage: '/api/garage',
      spots: '/api/spots',
      checkin: '/api/checkin',
      checkout: '/api/checkout',
      documentation: '/api-docs'
    },
    timestamp: new Date().toISOString()
  });
});

// Import and use route modules (these will remain as JS for now)
try {
  router.use('/garage', require('./garage'));
  router.use('/spots', require('./spots'));
  router.use('/checkin', require('./checkin'));
  router.use('/checkout', require('./checkout'));
  router.use('/vehicles', require('./vehicles'));
  router.use('/stats', require('./stats'));
} catch (error) {
  console.warn('Warning: Some route modules could not be loaded:', error);
}

// Placeholder for future route modules
// router.use('/auth', require('./auth'));
// router.use('/users', require('./users'));
// router.use('/reservations', require('./reservations'));
// router.use('/payments', require('./payments'));

export default router;