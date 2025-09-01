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
        garage: '/api/garage',
        spots: '/api/spots',
        checkin: '/api/checkin',
        checkout: '/api/checkout',
        documentation: '/api-docs'
      },
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(response.data);
});

// API route modules
import garageRoutes from './garage';
import spotsRoutes from './spots';
import checkinRoutes from './checkin';
import checkoutRoutes from './checkout';
import vehiclesRoutes from './vehicles';
import statsRoutes from './stats';

router.use('/garage', garageRoutes);
router.use('/spots', spotsRoutes);
router.use('/checkin', checkinRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/stats', statsRoutes);

// Placeholder for future route modules
// router.use('/auth', require('./auth'));
// router.use('/users', require('./users'));
// router.use('/reservations', require('./reservations'));
// router.use('/payments', require('./payments'));

export default router;
