const express = require('express');
const router = express.Router();

// API Info endpoint
router.get('/', (req, res) => {
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

// API route modules
router.use('/garage', require('./garage'));
router.use('/spots', require('./spots'));
router.use('/checkin', require('./checkin'));
router.use('/checkout', require('./checkout'));

// Placeholder for future route modules
// router.use('/auth', require('./auth'));
// router.use('/users', require('./users'));
// router.use('/reservations', require('./reservations'));
// router.use('/payments', require('./payments'));

module.exports = router;
