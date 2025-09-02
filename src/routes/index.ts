import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types';

const router: Router = Router();

// API Info endpoint
router.get('/', (req: Request, res: Response): void => {
  const response: ApiResponse<{
    name: string;
    version: string;
    description: string;
    endpoints: Record<string, string>;
    timestamp: string;
  }> = {
    success: true,
    data: {
      name: 'Parking Garage Management API',
      version: '1.0.0',
      description: 'RESTful API for managing parking garage operations',
      endpoints: {
        health: '/health',
        api: '/api',
        auth: '/api/auth',
        garage: '/api/garage',
        spots: '/api/spots',
        checkin: '/api/checkin',
        checkout: '/api/checkout',
        vehicles: '/api/vehicles',
        sessions: '/api/sessions',
        stats: '/api/stats',
        documentation: '/api-docs'
      },
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(response.data);
});

// API route modules
import authRoutes from './auth';
import garageRoutes from './garage';
import spotsRoutes from './spots';
import checkinRoutes from './checkin';
import checkoutRoutes from './checkout';
import vehiclesRoutes from './vehicles';
import statsRoutes from './stats';
import sessionsRoutes from './sessions';

// Mount authentication routes first
router.use('/auth', authRoutes);

// Mount other route modules
router.use('/garage', garageRoutes);
router.use('/spots', spotsRoutes);
router.use('/checkin', checkinRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/stats', statsRoutes);

// Placeholder for future route modules
// router.use('/users', require('./users'));
// router.use('/reservations', require('./reservations'));
// router.use('/payments', require('./payments'));

export default router;
