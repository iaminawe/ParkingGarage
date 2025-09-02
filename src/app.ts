import { Application, Request, Response, NextFunction } from 'express';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

import routes from './routes';
import errorHandler from './middleware/errorHandler';
import { env } from './config/environment';
import { testDatabaseConnection } from './config/database';
import authService from './services/authService';
import { RATE_LIMITS } from './config/constants';

const { createSwaggerMiddleware, getOpenApiSpec, downloadOpenApiSpec } = require('../docs/swagger.js');

// Validate environment and test database connection on startup
console.log('🔧 Validating environment and database connection...');
testDatabaseConnection().catch(error => {
  console.error('❌ Database connection failed during startup:', error);
  process.exit(1);
});

// Start periodic session cleanup
console.log('🧹 Starting periodic session cleanup...');
import { AuthService } from './services/authService';
const cleanupInterval = AuthService.startPeriodicCleanup(authService);

const app: Application = express();

// Security middleware
app.use(helmet());

// Rate limiting using constants
const limiter = rateLimit({
  windowMs: RATE_LIMITS.DEFAULT_WINDOW_MS,
  max: RATE_LIMITS.DEFAULT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://127.0.0.1:9000',
      'http://localhost:9000'
    ],
    credentials: true
  })
);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Documentation (Swagger UI)
const swagger = createSwaggerMiddleware();
app.use('/api-docs', ...swagger.serve, swagger.setup);

// OpenAPI Specification endpoints
app.get('/api-docs/swagger.json', getOpenApiSpec);
app.get('/api-docs/openapi.yaml', downloadOpenApiSpec);

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Resource not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;