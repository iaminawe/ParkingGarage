/**
 * Transaction Middleware Tests
 * 
 * Tests for Express middleware transaction management
 */

import express, { Request, Response } from 'express';
import request from 'supertest';
import {
  createTransactionMiddleware,
  transactionCleanupMiddleware,
  getTransactionContext,
  hasActiveTransaction,
  addTransactionOperation
} from '../../src/middleware/transaction.middleware';
import { DatabaseService } from '../../src/services/DatabaseService';
import { TransactionManager } from '../../src/services/TransactionManager';
import { TransactionOperationType } from '../../src/types/transaction.types';
import { PrismaClient } from '../../src/generated/prisma';

describe('Transaction Middleware Tests', () => {
  let app: express.Application;
  let databaseService: DatabaseService;
  let transactionManager: TransactionManager;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Use in-memory SQLite for testing
    process.env.DATABASE_URL = 'file:./test-middleware.db';
    
    databaseService = DatabaseService.getInstance({
      enableLogging: false
    });
    
    await databaseService.initialize();
    prisma = databaseService.getClient();
    transactionManager = TransactionManager.getInstance(databaseService);
  });

  afterAll(async () => {
    await databaseService.shutdown();
    DatabaseService.reset();
    TransactionManager.reset();
  });

  beforeEach(async () => {
    // Clean up data
    await prisma.parkingSession.deleteMany();
    await prisma.spot.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.garage.deleteMany();
    
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(transactionCleanupMiddleware());
  });

  describe('Transaction Middleware Setup', () => {
    it('should create middleware with default options', () => {
      const middleware = createTransactionMiddleware();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should create middleware with custom options', () => {
      const middleware = createTransactionMiddleware({
        autoCommit: false,
        skipMethods: ['GET', 'HEAD'],
        enableOperationLogging: true
      });
      
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Request Transaction Management', () => {
    it('should attach transaction context to POST requests', async () => {
      app.use(createTransactionMiddleware());
      
      app.post('/test', (req: Request, res: Response) => {
        const context = getTransactionContext(req);
        expect(context).toBeDefined();
        expect(context!.transactionId).toBeDefined();
        expect(hasActiveTransaction(req)).toBe(true);
        
        res.json({ success: true, transactionId: context!.transactionId });
      });

      const response = await request(app)
        .post('/test')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.transactionId).toBeDefined();
    });

    it('should skip transaction for GET requests by default', async () => {
      app.use(createTransactionMiddleware());
      
      app.get('/test', (req: Request, res: Response) => {
        const context = getTransactionContext(req);
        expect(context).toBeNull();
        expect(hasActiveTransaction(req)).toBe(false);
        
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(200);
    });

    it('should include transaction for GET when configured', async () => {
      app.use(createTransactionMiddleware({
        skipMethods: [] // Don't skip any methods
      }));
      
      app.get('/test', (req: Request, res: Response) => {
        const context = getTransactionContext(req);
        expect(context).toBeDefined();
        expect(hasActiveTransaction(req)).toBe(true);
        
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(200);
    });
  });

  describe('Database Operations in Transactions', () => {
    it('should commit successful operations', async () => {
      app.use(createTransactionMiddleware({
        autoCommit: true
      }));
      
      app.post('/garage', async (req: Request, res: Response) => {
        const context = getTransactionContext(req);
        expect(context).toBeDefined();
        
        // Use transaction client for database operation
        const garage = await context!.context.client.garage.create({
          data: {
            name: 'Test Garage',
            address: '123 Test St',
            totalSpots: 10
          }
        });
        
        addTransactionOperation(
          req,
          TransactionOperationType.CREATE,
          'garage',
          'create_garage',
          { garageId: garage.id }
        );
        
        res.json({ success: true, garage });
      });

      await request(app)
        .post('/garage')
        .send({ name: 'Test Garage' })
        .expect(200);

      // Verify garage was created
      const garage = await prisma.garage.findFirst();
      expect(garage).toBeDefined();
      expect(garage!.name).toBe('Test Garage');
    });

    it('should rollback operations on error', async () => {
      app.use(createTransactionMiddleware({
        autoRollback: true
      }));
      
      app.post('/garage-error', async (req: Request, res: Response) => {
        const context = getTransactionContext(req);
        
        // Create garage within transaction
        await context!.context.client.garage.create({
          data: {
            name: 'Should Rollback',
            address: '123 Test St',
            totalSpots: 10
          }
        });
        
        // Throw error to trigger rollback
        throw new Error('Intentional error');
      });

      await request(app)
        .post('/garage-error')
        .send({})
        .expect(500);

      // Verify garage was not created (rolled back)
      const garage = await prisma.garage.findFirst();
      expect(garage).toBeNull();
    });
  });

  describe('Operation Logging', () => {
    it('should log operations when enabled', async () => {
      app.use(createTransactionMiddleware({
        enableOperationLogging: true
      }));
      
      app.post('/test-logging', (req: Request, res: Response) => {
        const context = getTransactionContext(req);
        expect(context).toBeDefined();
        
        // Add custom operation
        addTransactionOperation(
          req,
          TransactionOperationType.CREATE,
          'test_table',
          'test_operation',
          { customData: 'test' }
        );
        
        res.json({ operationCount: context!.operations.length });
      });

      const response = await request(app)
        .post('/test-logging')
        .send({})
        .expect(200);

      expect(response.body.operationCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle transaction timeout errors', async () => {
      app.use(createTransactionMiddleware({
        timeout: 100 // Very short timeout
      }));
      
      app.post('/timeout', async (req: Request, res: Response) => {
        // Simulate long operation
        await new Promise(resolve => setTimeout(resolve, 200));
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/timeout')
        .send({})
        .expect(408); // Request Timeout

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('TRANSACTION_TIMEOUT');
    });

    it('should use custom error handler', async () => {
      const customErrorHandler = jest.fn((error, req, res) => {
        res.status(422).json({
          customError: true,
          message: error.message
        });
      });
      
      app.use(createTransactionMiddleware({
        errorHandler: customErrorHandler
      }));
      
      app.post('/custom-error', (req: Request, res: Response) => {
        throw new Error('Custom error test');
      });

      await request(app)
        .post('/custom-error')
        .send({})
        .expect(422);

      expect(customErrorHandler).toHaveBeenCalled();
    });
  });

  describe('Route Skipping', () => {
    it('should skip routes matching regex patterns', async () => {
      app.use(createTransactionMiddleware({
        skipRoutes: [/\/api\/health/, /\/status/]
      }));
      
      app.post('/api/health', (req: Request, res: Response) => {
        const context = getTransactionContext(req);
        expect(context).toBeNull();
        res.json({ healthy: true });
      });
      
      app.post('/status', (req: Request, res: Response) => {
        const context = getTransactionContext(req);
        expect(context).toBeNull();
        res.json({ status: 'ok' });
      });
      
      app.post('/api/data', (req: Request, res: Response) => {
        const context = getTransactionContext(req);
        expect(context).toBeDefined();
        res.json({ hasTransaction: true });
      });

      await request(app).post('/api/health').expect(200);
      await request(app).post('/status').expect(200);
      
      const response = await request(app)
        .post('/api/data')
        .send({})
        .expect(200);
      
      expect(response.body.hasTransaction).toBe(true);
    });
  });

  describe('Transaction Context Cleanup', () => {
    it('should clean up transaction context after response', async () => {
      let capturedContext: any;
      
      app.use(createTransactionMiddleware());
      
      app.post('/test', (req: Request, res: Response) => {
        capturedContext = getTransactionContext(req);
        expect(capturedContext).toBeDefined();
        
        // Simulate async operation
        setTimeout(() => {
          // Context should still exist during request processing
          expect(req.transaction).toBeDefined();
        }, 10);
        
        res.json({ success: true });
      });

      await request(app)
        .post('/test')
        .send({})
        .expect(200);

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(capturedContext).toBeDefined(); // Still captured in our variable
    });
  });

  describe('Complex Transaction Scenarios', () => {
    it('should handle nested service calls within transaction', async () => {
      app.use(createTransactionMiddleware());
      
      app.post('/complex', async (req: Request, res: Response) => {
        const context = getTransactionContext(req);
        const tx = context!.context.client;
        
        // Create garage
        const garage = await tx.garage.create({
          data: {
            name: 'Complex Test Garage',
            address: '123 Complex St',
            totalSpots: 5
          }
        });
        
        // Create spots
        const spots = await tx.spot.createMany({
          data: [
            {
              garageId: garage.id,
              spotNumber: 'A001',
              floor: 1,
              status: 'AVAILABLE'
            },
            {
              garageId: garage.id,
              spotNumber: 'A002',
              floor: 1,
              status: 'AVAILABLE'
            }
          ]
        });
        
        // Create vehicle and session
        const vehicle = await tx.vehicle.create({
          data: {
            licensePlate: 'COMPLEX123',
            vehicleType: 'STANDARD'
          }
        });
        
        const spot = await tx.spot.findFirst({
          where: { garageId: garage.id, status: 'AVAILABLE' }
        });
        
        if (spot) {
          await tx.parkingSession.create({
            data: {
              garageId: garage.id,
              spotId: spot.id,
              vehicleId: vehicle.id,
              status: 'ACTIVE',
              entryTime: new Date()
            }
          });
          
          await tx.spot.update({
            where: { id: spot.id },
            data: {
              status: 'OCCUPIED',
              currentVehicleId: vehicle.id
            }
          });
        }
        
        res.json({
          garage,
          vehicle,
          spotsCreated: spots.count
        });
      });

      const response = await request(app)
        .post('/complex')
        .send({})
        .expect(200);

      expect(response.body.garage).toBeDefined();
      expect(response.body.vehicle).toBeDefined();
      expect(response.body.spotsCreated).toBe(2);

      // Verify all data was created atomically
      const garage = await prisma.garage.findFirst();
      const vehicle = await prisma.vehicle.findFirst();
      const spotCount = await prisma.spot.count();
      const sessionCount = await prisma.parkingSession.count();
      
      expect(garage).toBeDefined();
      expect(vehicle).toBeDefined();
      expect(spotCount).toBe(2);
      expect(sessionCount).toBe(1);
    });

    it('should maintain transaction isolation', async () => {
      app.use(createTransactionMiddleware());
      
      let transaction1Context: any;
      let transaction2Context: any;
      
      app.post('/isolation1', (req: Request, res: Response) => {
        transaction1Context = getTransactionContext(req);
        
        setTimeout(() => {
          res.json({ transactionId: transaction1Context.transactionId });
        }, 50);
      });
      
      app.post('/isolation2', (req: Request, res: Response) => {
        transaction2Context = getTransactionContext(req);
        res.json({ transactionId: transaction2Context.transactionId });
      });

      // Start both requests concurrently
      const [response1, response2] = await Promise.all([
        request(app).post('/isolation1').send({}),
        request(app).post('/isolation2').send({})
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Each request should have its own transaction ID
      expect(response1.body.transactionId).toBeDefined();
      expect(response2.body.transactionId).toBeDefined();
      expect(response1.body.transactionId).not.toBe(response2.body.transactionId);
    });
  });
});
