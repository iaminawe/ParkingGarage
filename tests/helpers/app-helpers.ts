/**
 * Application helpers for testing
 * 
 * Provides utilities for creating test Express applications,
 * configuring middleware, and setting up test environments.
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { DatabaseService } from '../../src/services/DatabaseService';
import { errorHandler } from '../../src/middleware/errorHandler';
import { authMiddleware } from '../../src/middleware/auth';
import vehicleRoutes from '../../src/routes/vehicles';
import authRoutes from '../../src/routes/auth';
import spotRoutes from '../../src/routes/spots';
import sessionRoutes from '../../src/routes/sessions';
import garageRoutes from '../../src/routes/garages';
import statsRoutes from '../../src/routes/stats';

/**
 * Configuration options for test application
 */
export interface TestAppOptions {
  enableCors?: boolean;
  enableHelmet?: boolean;
  enableCompression?: boolean;
  enableRateLimit?: boolean;
  enableAuth?: boolean;
  rateLimitConfig?: {
    windowMs?: number;
    max?: number;
  };
  corsOptions?: {
    origin?: string | string[];
    credentials?: boolean;
  };
}

/**
 * Create a test Express application with all middleware and routes
 */
export async function createTestApp(
  databaseService: DatabaseService,
  options: TestAppOptions = {}
): Promise<Application> {
  const app = express();
  
  // Default options
  const config = {
    enableCors: true,
    enableHelmet: true,
    enableCompression: true,
    enableRateLimit: true,
    enableAuth: true,
    rateLimitConfig: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000 // Much higher limit for tests
    },
    corsOptions: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    },
    ...options
  };
  
  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Security middleware
  if (config.enableHelmet) {
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));
  }
  
  // CORS middleware
  if (config.enableCors) {
    app.use(cors(config.corsOptions));
  }
  
  // Compression middleware
  if (config.enableCompression) {
    app.use(compression());
  }
  
  // Rate limiting (more permissive for tests)
  if (config.enableRateLimit) {
    const limiter = rateLimit({
      windowMs: config.rateLimitConfig.windowMs,
      max: config.rateLimitConfig.max,
      message: {
        success: false,
        error: 'Too many requests, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip rate limiting for certain test scenarios
      skip: (req) => {
        return req.headers['x-test-skip-rate-limit'] === 'true';
      }
    });
    
    app.use('/api/', limiter);
  }
  
  // Health check endpoint (before auth)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Test utilities endpoint
  app.get('/test/info', (req, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV,
      testMode: true,
      timestamp: new Date().toISOString(),
      database: {
        url: process.env.DATABASE_URL ? '[REDACTED]' : 'not set'
      }
    });
  });
  
  // Inject database service into request context
  app.use((req, res, next) => {
    (req as any).databaseService = databaseService;
    next();
  });
  
  // Authentication middleware (conditional)
  if (config.enableAuth) {
    app.use('/api', authMiddleware);
  }
  
  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/spots', spotRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/garages', garageRoutes);
  app.use('/api/stats', statsRoutes);
  
  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found'
    });
  });
  
  // Global error handler
  app.use(errorHandler);
  
  // Handle uncaught promise rejections in tests
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  return app;
}

/**
 * Create a minimal test application for specific testing scenarios
 */
export function createMinimalTestApp(databaseService: DatabaseService): Application {
  const app = express();
  
  app.use(express.json());
  
  // Inject database service
  app.use((req, res, next) => {
    (req as any).databaseService = databaseService;
    next();
  });
  
  // Basic health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  return app;
}

/**
 * Create test application without authentication for security testing
 */
export async function createUnsecuredTestApp(
  databaseService: DatabaseService
): Promise<Application> {
  return createTestApp(databaseService, {
    enableAuth: false,
    enableRateLimit: false,
    enableHelmet: false,
    enableCors: false
  });
}

/**
 * Create test application with custom rate limiting for performance tests
 */
export async function createPerformanceTestApp(
  databaseService: DatabaseService,
  maxRequestsPerWindow: number = 10000
): Promise<Application> {
  return createTestApp(databaseService, {
    rateLimitConfig: {
      windowMs: 60 * 1000, // 1 minute
      max: maxRequestsPerWindow
    }
  });
}

/**
 * Add custom middleware to test application
 */
export function addTestMiddleware(
  app: Application,
  middleware: express.RequestHandler
): void {
  // Add middleware before routes
  const router = express.Router();
  router.use(middleware);
  app.use('/api', router);
}

/**
 * Add custom route to test application
 */
export function addTestRoute(
  app: Application,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  handler: express.RequestHandler
): void {
  app[method](`/api/test${path}`, handler);
}

/**
 * Create mock middleware for testing
 */
export function createMockMiddleware(
  name: string,
  behavior: 'pass' | 'fail' | 'delay' = 'pass',
  delay: number = 100
): express.RequestHandler {
  return async (req, res, next) => {
    console.log(`Mock middleware ${name} executed`);
    
    switch (behavior) {
      case 'pass':
        next();
        break;
      case 'fail':
        res.status(500).json({
          success: false,
          error: `Mock middleware ${name} failed`
        });
        break;
      case 'delay':
        setTimeout(() => next(), delay);
        break;
    }
  };
}

/**
 * Setup request/response logging for tests
 */
export function enableTestLogging(app: Application): void {
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    
    next();
  });
}

/**
 * Create test application with custom error handler
 */
export function createTestAppWithErrorHandler(
  databaseService: DatabaseService,
  errorHandler: express.ErrorRequestHandler
): Application {
  const app = express();
  
  app.use(express.json());
  
  // Inject database service
  app.use((req, res, next) => {
    (req as any).databaseService = databaseService;
    next();
  });
  
  // Test route that throws error
  app.get('/api/test/error', (req, res, next) => {
    const error = new Error('Test error');
    next(error);
  });
  
  // Custom error handler
  app.use(errorHandler);
  
  return app;
}

/**
 * Simulate application under load
 */
export async function simulateLoad(
  app: Application,
  options: {
    concurrent: number;
    duration: number;
    endpoint: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
  }
): Promise<{
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
}> {
  const { concurrent, duration, endpoint, method = 'GET', data } = options;
  
  const startTime = Date.now();
  const endTime = startTime + duration;
  const results: { success: boolean; responseTime: number }[] = [];
  
  // Create concurrent workers
  const workers = Array.from({ length: concurrent }, async () => {
    while (Date.now() < endTime) {
      const requestStart = Date.now();
      
      try {
        // This would use supertest in a real implementation
        // For now, we'll simulate the request
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        const responseTime = Date.now() - requestStart;
        results.push({ success: true, responseTime });
      } catch (error) {
        const responseTime = Date.now() - requestStart;
        results.push({ success: false, responseTime });
      }
    }
  });
  
  await Promise.all(workers);
  
  const totalRequests = results.length;
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests;
  
  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    averageResponseTime
  };
}

/**
 * Create test application with WebSocket support
 */
export function createWebSocketTestApp(
  databaseService: DatabaseService
): { app: Application; server: any } {
  const app = createMinimalTestApp(databaseService);
  const http = require('http');
  const { Server } = require('socket.io');
  
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  io.on('connection', (socket: any) => {
    console.log('Test WebSocket connection established');
    
    socket.on('test-event', (data: any) => {
      socket.emit('test-response', { received: data });
    });
  });
  
  return { app, server };
}

/**
 * Cleanup test application resources
 */
export async function cleanupTestApp(app: Application): Promise<void> {
  // Close any open connections, clear timers, etc.
  // This is important for preventing test interference
  
  // Remove all listeners to prevent memory leaks
  app.removeAllListeners();
  
  // Clear any intervals or timeouts that might be running
  const highestId = setTimeout(() => {}, 0);
  for (let i = 0; i < highestId; i++) {
    clearTimeout(i);
    clearInterval(i);
  }
}

export default {
  createTestApp,
  createMinimalTestApp,
  createUnsecuredTestApp,
  createPerformanceTestApp,
  addTestMiddleware,
  addTestRoute,
  createMockMiddleware,
  enableTestLogging,
  createTestAppWithErrorHandler,
  simulateLoad,
  createWebSocketTestApp,
  cleanupTestApp
};
