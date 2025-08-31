const express = require('express');
const { MockGarageAPI } = require('./testUtils');

// Create a mock Express app for testing
function createMockApp() {
  const app = express();
  const api = new MockGarageAPI();

  // Middleware
  app.use(express.json());

  // Test utilities endpoint
  app.post('/api/test/reset', (req, res) => {
    api.reset();
    res.json({ message: 'Test data reset' });
  });

  app.post('/api/test/seed', (req, res) => {
    const { occupancy = 0 } = req.body;
    api.reset();
    api.setOccupancy(occupancy);
    res.json({ message: 'Test data seeded', occupancy });
  });

  // Garage structure endpoints
  app.get('/api/garage/structure', (req, res) => {
    res.json({
      floors: [
        { id: 1, name: 'Ground Floor', bays: ['A', 'B'] },
        { id: 2, name: 'Level 2', bays: ['A', 'B'] },
        { id: 3, name: 'Level 3', bays: ['A'] }
      ],
      totalSpots: 125
    });
  });

  // Spot management endpoints
  app.get('/api/spots', (req, res) => {
    try {
      const { status, floor, bay } = req.query;
      let result = api.getAllSpots();

      if (status === 'available') {
        result = api.getAvailableSpots();
      } else if (status === 'occupied') {
        result.spots = result.spots.filter(s => s.status === 'occupied');
      }

      if (floor) {
        result.spots = result.spots.filter(s => s.floor === parseInt(floor));
      }

      if (bay) {
        result.spots = result.spots.filter(s => s.bay === bay);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/spots/next-available', (req, res) => {
    try {
      const available = api.getAvailableSpots();
      if (available.spots.length === 0) {
        return res.status(404).json({ error: 'No available spots' });
      }
      res.json(available.spots[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/spots/:spotId', (req, res) => {
    try {
      const spot = api.getSpotById(req.params.spotId);
      res.json(spot);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  app.patch('/api/spots/:spotId/status', (req, res) => {
    try {
      const { status, reason } = req.body;
      
      // Validate spot ID format
      if (!req.params.spotId.match(/^F\d+-[A-Z]-\d{3}$/)) {
        return res.status(400).json({ error: 'Invalid spot ID format' });
      }

      const spot = api.updateSpotStatus(req.params.spotId, status);
      res.json(spot);
    } catch (error) {
      if (error.message === 'Spot already occupied') {
        return res.status(409).json({ error: error.message });
      }
      res.status(404).json({ error: error.message });
    }
  });

  // Vehicle check-in/check-out endpoints
  app.post('/api/checkin', (req, res) => {
    try {
      const { licensePlate } = req.body;

      // Validate license plate
      if (!licensePlate || typeof licensePlate !== 'string' || 
          licensePlate.trim().length < 2 || licensePlate.length > 15) {
        return res.status(400).json({ error: 'Invalid license plate' });
      }

      const result = api.checkIn(licensePlate.trim());
      res.status(201).json({
        ticketId: result.ticketId,
        licensePlate: result.licensePlate,
        spot: result.spotId,
        checkInTime: result.checkInTime,
        floor: parseInt(result.spotId.charAt(1)),
        bay: result.spotId.split('-')[1]
      });
    } catch (error) {
      if (error.message === 'No available spots') {
        return res.status(503).json({ error: error.message });
      }
      if (error.message === 'Vehicle already checked in') {
        const vehicle = api.state.findVehicle(req.body.licensePlate);
        return res.status(409).json({ 
          error: error.message,
          spot: vehicle.spot
        });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/checkout', (req, res) => {
    try {
      const { licensePlate } = req.body;

      if (!licensePlate) {
        return res.status(400).json({ error: 'License plate required' });
      }

      const result = api.checkOut(licensePlate.trim());
      res.json({
        licensePlate: result.licensePlate,
        spot: result.spotId,
        checkInTime: result.checkInTime,
        checkOutTime: result.checkOutTime,
        duration: result.durationFormatted,
        durationMinutes: result.duration
      });
    } catch (error) {
      if (error.message === 'Vehicle not found') {
        return res.status(404).json({ error: 'Vehicle not found in garage' });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // Vehicle search endpoint
  app.get('/api/cars/:licensePlate', (req, res) => {
    try {
      const licensePlate = req.params.licensePlate.toUpperCase();
      const result = api.findVehicle(licensePlate);
      res.json(result);
    } catch (error) {
      res.status(404).json({ 
        found: false,
        message: 'Vehicle not currently in garage'
      });
    }
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Attach API instance for direct testing
  app.locals.api = api;

  return app;
}

module.exports = { createMockApp };