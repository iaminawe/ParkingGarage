import express, { Request, Response, NextFunction, Application } from 'express';
import { MockGarageAPI } from './testUtils';
import {
  CheckInRequest,
  CheckOutRequest,
  TestSeedRequest,
  APIError,
  GarageStructure,
  SpotsResponse
} from '../types';

// Extend Express Application interface to include locals
interface MockAppLocals {
  api: MockGarageAPI;
}

interface MockApp extends Application {
  locals: MockAppLocals;
}

// Create a mock Express app for testing
export function createMockApp(): MockApp {
  const app = express() as MockApp;
  const api = new MockGarageAPI();

  // Middleware
  app.use(express.json());

  // Test utilities endpoint
  app.post('/api/test/reset', (req: Request, res: Response) => {
    api.reset();
    res.json({ message: 'Test data reset' });
  });

  app.post('/api/test/seed', (req: Request<{}, any, TestSeedRequest>, res: Response) => {
    const { occupancy = 0 } = req.body;
    api.reset();
    api.setOccupancy(occupancy);
    res.json({ message: 'Test data seeded', occupancy });
  });

  // Garage structure endpoints
  app.get('/api/garage/structure', (req: Request, res: Response<GarageStructure>) => {
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
  app.get('/api/spots', (req: Request, res: Response<SpotsResponse>) => {
    try {
      const { status, floor, bay } = req.query;
      let result = api.getAllSpots();

      if (status === 'available') {
        result = api.getAvailableSpots();
      } else if (status === 'occupied') {
        result.spots = result.spots.filter(s => s.status === 'occupied');
      }

      if (floor && typeof floor === 'string') {
        result.spots = result.spots.filter(s => s.floor === parseInt(floor));
      }

      if (bay && typeof bay === 'string') {
        result.spots = result.spots.filter(s => s.bay === bay);
      }

      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get('/api/spots/next-available', (req: Request, res: Response) => {
    try {
      const available = api.getAvailableSpots();
      if (available.spots.length === 0) {
        return res.status(404).json({ error: 'No available spots' });
      }
      res.json(available.spots[0]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get('/api/spots/:spotId', (req: Request<{ spotId: string }>, res: Response) => {
    try {
      const spot = api.getSpotById(req.params.spotId);
      res.json(spot);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(404).json({ error: errorMessage });
    }
  });

  app.patch('/api/spots/:spotId/status', (req: Request<{ spotId: string }, any, { status: string; reason?: string }>, res: Response) => {
    try {
      const { status } = req.body;
      
      // Validate spot ID format
      if (!req.params.spotId.match(/^F\d+-[A-Z]-\d{3}$/)) {
        return res.status(400).json({ error: 'Invalid spot ID format' });
      }

      const spot = api.updateSpotStatus(req.params.spotId, status as any);
      res.json(spot);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === 'Spot already occupied') {
        return res.status(409).json({ error: errorMessage });
      }
      res.status(404).json({ error: errorMessage });
    }
  });

  // Vehicle check-in/check-out endpoints
  app.post('/api/checkin', (req: Request<{}, any, CheckInRequest>, res: Response) => {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === 'No available spots') {
        return res.status(503).json({ error: errorMessage });
      }
      if (errorMessage === 'Vehicle already checked in') {
        const vehicle = api.state.findVehicle(req.body.licensePlate);
        return res.status(409).json({ 
          error: errorMessage,
          spot: vehicle?.spot
        });
      }
      res.status(400).json({ error: errorMessage });
    }
  });

  app.post('/api/checkout', (req: Request<{}, any, CheckOutRequest>, res: Response) => {
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
        durationMinutes: result.durationMinutes
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === 'Vehicle not found') {
        return res.status(404).json({ error: 'Vehicle not found in garage' });
      }
      res.status(400).json({ error: errorMessage });
    }
  });

  // Vehicle search endpoint
  app.get('/api/cars/:licensePlate', (req: Request<{ licensePlate: string }>, res: Response) => {
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
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Attach API instance for direct testing
  app.locals.api = api;

  return app;
}