import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import routes from './routes';
import errorHandler from './middleware/errorHandler';
import { createSwaggerMiddleware, getOpenApiSpec, downloadOpenApiSpec } from '../docs/swagger';
import {
  helmetSecurity,
  csrfProtection,
  requestSanitization,
  SecurityMiddleware,
} from './middleware/security';
import { sessionManager } from './services/SessionManager';
import authService, { AuthService } from './services/authService';
import { env } from './config/environment';
import { HTTP_STATUS, TIME_CONSTANTS } from './config/constants';

// Import monitoring and logging configurations
import { monitoring } from './config/monitoring.config';
import { systemLogger } from './config/logger.config';
import {
  createMonitoringMiddleware,
  errorTrackingMiddleware,
} from './middleware/monitoring.middleware';
import healthRoutes from './routes/health';

// Load environment variables
dotenv.config();

// Initialize monitoring system
monitoring.initialize().catch(error => {
  console.error('Failed to initialize monitoring:', error);
});

const app: Application = express();

// Add monitoring middleware stack (correlation ID, logging, performance)
app.use(...createMonitoringMiddleware());

// Enhanced security middleware with strict CSP
app.use(helmetSecurity);

// Global rate limiting with suspicious activity detection
const suspiciousActivityDetector = new SecurityMiddleware().suspiciousActivityDetection();
app.use(suspiciousActivityDetector);

// Enhanced CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://127.0.0.1:9000',
        'http://localhost:9000',
      ];

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
    ],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 86400, // 24 hours
  })
);

// Body parsing middleware with security limits
app.use(compression());
app.use(cookieParser()); // Required for CSRF protection
app.use(requestSanitization); // Sanitize all inputs
app.use(
  express.json({
    limit: '1mb', // Reduced from 10mb for security
    strict: true,
    type: 'application/json',
  })
);
app.use(
  express.urlencoded({
    extended: false, // Set to false for security (prevents prototype pollution)
    limit: '1mb',
    parameterLimit: 20, // Limit number of parameters
  })
);

// Enhanced request logging with security context
app.use((req: Request, res: Response, next) => {
  if (env.NODE_ENV === 'development') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  }

  // Add security headers to all responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
});

// CSRF Protection (after cookie parser and before routes)
app.use(csrfProtection);

// Health and monitoring endpoints (before other routes)
app.use('/health', healthRoutes);

// API Documentation (Swagger UI)
const swagger = createSwaggerMiddleware();
app.use('/api-docs', ...swagger.serve, swagger.setup);

// OpenAPI Specification endpoints
app.get('/api-docs/swagger.json', getOpenApiSpec);
app.get('/api-docs/openapi.yaml', downloadOpenApiSpec);

// Routes
app.use('/api', routes);

// Enhanced health check endpoint with system info
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Basic health info
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: process.env['npm_package_version'] || '1.0.0',
    };

    // Add session statistics if available
    try {
      const sessionStats = await sessionManager.getSessionStats();
      (health as any).sessions = sessionStats;
    } catch (error) {
      // Session stats are optional - don't fail health check
    }

    res.status(HTTP_STATUS.OK).json(health);
  } catch (error) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service temporarily unavailable',
    });
  }
});

// Enhanced 404 handler with security logging
app.use('*', (req: Request, res: Response) => {
  // Log potential scanning attempts
  if (env.NODE_ENV === 'production') {
    console.warn(
      `404 - Potential scanning attempt: ${req.method} ${req.originalUrl} from ${req.ip}`
    );
  }

  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: 'Resource not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Error tracking middleware for monitoring
app.use(errorTrackingMiddleware);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Starting graceful shutdown...');
  await gracefulShutdown();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Starting graceful shutdown...');
  await gracefulShutdown();
});

async function gracefulShutdown() {
  try {
    systemLogger.info('Starting graceful shutdown process');

    // Close session manager
    await sessionManager.close();
    systemLogger.info('Session manager closed');

    // Report shutdown event to monitoring
    monitoring.reportEvent('application.shutdown', {
      reason: 'graceful_shutdown',
      uptime: process.uptime(),
    });

    // Clean up any other resources
    systemLogger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    systemLogger.error('Error during graceful shutdown', error as Error);
    monitoring.reportError(error as Error, { context: 'graceful_shutdown' });
    process.exit(1);
  }
}

// Start periodic session cleanup
if (env.NODE_ENV !== 'test') {
  AuthService.startPeriodicCleanup(authService);

  // Also start session cleanup
  setInterval(async () => {
    try {
      await sessionManager.cleanupExpiredSessions();
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }, TIME_CONSTANTS.SESSION_CLEANUP_INTERVAL_MS);
}

export default app;
