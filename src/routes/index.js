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
      documentation: '/api/docs (coming soon)'
    },
    timestamp: new Date().toISOString()
  });
});

// API route modules
router.use('/garage', require('./garage'));

// Placeholder for future route modules
// router.use('/auth', require('./auth'));
// router.use('/users', require('./users'));
// router.use('/spaces', require('./spaces'));
// router.use('/reservations', require('./reservations'));
// router.use('/payments', require('./payments'));

module.exports = router;
