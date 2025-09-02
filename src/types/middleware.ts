/**
 * Middleware and validation type definitions
 *
 * These types define the structure for Express middleware, validation functions,
 * error handling, and request/response transformations used throughout the application.
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationResult } from './models';
import { User } from '@prisma/client';

// Extended Express Request Types
export interface CustomRequest extends Request {
  startTime?: number;
  requestId?: string;
  correlationId?: string;
  user?: User;
  validated?: {
    params?: Record<string, any>;
    query?: Record<string, any>;
    body?: Record<string, any>;
  };
  sanitized?: {
    params?: Record<string, any>;
    query?: Record<string, any>;
    body?: Record<string, any>;
  };
  pagination?: {
    page: number;
    limit: number;
    offset: number;
  };
  filters?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Middleware Function Types
export type MiddlewareFunction = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type ErrorMiddleware = (
  error: Error,
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type AsyncMiddleware = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

// Validation Middleware Types
export interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean | string;
  };
}

export interface ValidationOptions {
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  abortEarly?: boolean;
  skipMissing?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code: string;
}

export interface ValidationMiddlewareConfig {
  body?: ValidationSchema;
  query?: ValidationSchema;
  params?: ValidationSchema;
  options?: ValidationOptions;
}

// Vehicle Validation Types
export interface VehicleValidationRules {
  licensePlate: {
    required: boolean;
    pattern: RegExp;
    transform: (value: string) => string;
  };
  vehicleType: {
    required: boolean;
    enum: string[];
    default: string;
  };
  rateType: {
    required: boolean;
    enum: string[];
    default: string;
  };
  make?: {
    required: boolean;
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  model?: {
    required: boolean;
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  color?: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  year?: {
    required: boolean;
    min: number;
    max: number;
  };
  ownerName?: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  ownerEmail?: {
    required: boolean;
    pattern: RegExp;
  };
  ownerPhone?: {
    required: boolean;
    pattern: RegExp;
  };
}

// Spot Validation Types
export interface SpotValidationRules {
  floor: {
    required: boolean;
    min: number;
    max: number;
  };
  bay: {
    required: boolean;
    min: number;
    max: number;
  };
  spotNumber: {
    required: boolean;
    min: number;
    max: number;
  };
  type: {
    required: boolean;
    enum: string[];
    default: string;
  };
  features: {
    required: boolean;
    type: 'array';
    items: {
      enum: string[];
    };
  };
}

// Garage Validation Types
export interface GarageValidationRules {
  name: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  rates: {
    required: boolean;
    type: 'object';
    properties: {
      compact: { required: boolean; min: number; max: number };
      standard: { required: boolean; min: number; max: number };
      oversized: { required: boolean; min: number; max: number };
    };
  };
}

// Sanitization Types
export interface SanitizationRule {
  field: string;
  transform: (value: any) => any;
  condition?: (value: any) => boolean;
}

export interface SanitizationConfig {
  body?: SanitizationRule[];
  query?: SanitizationRule[];
  params?: SanitizationRule[];
}

// Error Handling Types
export interface ParkingGarageError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  timestamp?: string;
  path?: string;
  method?: string;
  correlationId?: string;
  stack?: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: string[] | ValidationError[];
  timestamp: string;
  path?: string;
  method?: string;
  requestId?: string;
  correlationId?: string;
  stack?: string; // Only in development
}

export interface ErrorHandlerOptions {
  includeStack?: boolean;
  includeDetails?: boolean;
  logErrors?: boolean;
  trustProxy?: boolean;
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string | object;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  store?: any;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  onLimitReached?: (req: Request, res: Response, options: RateLimitConfig) => void;
}

// CORS Types
export interface CorsOptions {
  origin?:
    | string
    | string[]
    | boolean
    | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

// Authentication Types
export interface AuthenticationConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  sessionTimeout: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  permissions: string[];
  lastLogin: string;
}

// Logging Types
export interface RequestLog {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  timestamp: string;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  userId?: string;
  correlationId?: string;
}

export interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'text';
  includeMetadata: boolean;
  includeStack: boolean;
  maxSize: string;
  maxFiles: number;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  requestId: string;
  duration: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  timestamp: string;
}

export interface PerformanceMiddlewareOptions {
  threshold?: number; // Log slow requests above this threshold (ms)
  includeMetrics?: boolean;
  includeMemory?: boolean;
  includeCpu?: boolean;
}

// Security Types
export interface SecurityConfig {
  helmet: {
    contentSecurityPolicy?: boolean;
    crossOriginEmbedderPolicy?: boolean;
    crossOriginOpenerPolicy?: boolean;
    crossOriginResourcePolicy?: boolean;
    dnsPrefetchControl?: boolean;
    frameguard?: boolean;
    hidePoweredBy?: boolean;
    hsts?: boolean;
    ieNoOpen?: boolean;
    noSniff?: boolean;
    originAgentCluster?: boolean;
    permittedCrossDomainPolicies?: boolean;
    referrerPolicy?: boolean;
    xssFilter?: boolean;
  };
  rateLimit: RateLimitConfig;
  cors: CorsOptions;
}

// Validation Function Interfaces
export interface IVehicleValidator {
  validateVehicleCreation: MiddlewareFunction;
  validateVehicleUpdate: MiddlewareFunction;
  validateVehicleId: MiddlewareFunction;
  validateVehicleQuery: MiddlewareFunction;
  validateBulkRequest: MiddlewareFunction;
  sanitizeVehicleRequest: MiddlewareFunction;
  validateVehicleRequestBody: MiddlewareFunction;
  validateVehicleContentType: MiddlewareFunction;
}

export interface ISpotValidator {
  validateSpotCreation: MiddlewareFunction;
  validateSpotUpdate: MiddlewareFunction;
  validateSpotId: MiddlewareFunction;
  validateSpotQuery: MiddlewareFunction;
  validateSpotFilters: MiddlewareFunction;
}

export interface IGarageValidator {
  validateGarageCreation: MiddlewareFunction;
  validateGarageUpdate: MiddlewareFunction;
  validateGarageId: MiddlewareFunction;
  validateGarageConfig: MiddlewareFunction;
}

export interface ICheckinValidator {
  validateCheckinRequest: MiddlewareFunction;
  validateLicensePlate: MiddlewareFunction;
  validateSpotId: MiddlewareFunction;
}

export interface ICheckoutValidator {
  validateCheckoutRequest: MiddlewareFunction;
  validatePaymentAmount: MiddlewareFunction;
}

export interface ISessionValidator {
  validateSessionCreation: MiddlewareFunction;
  validateSessionUpdate: MiddlewareFunction;
  validateSessionId: MiddlewareFunction;
}

export interface IAuthValidator {
  validateLogin: MiddlewareFunction;
  validateRegistration: MiddlewareFunction;
  validatePasswordReset: MiddlewareFunction;
  validateEmailVerification: MiddlewareFunction;
}

// Content Type Validation
export interface ContentTypeConfig {
  allowedTypes: string[];
  requireContentType: boolean;
  defaultType?: string;
}

// File Upload Types (if needed)
export interface FileUploadConfig {
  maxSize: number;
  allowedMimeTypes: string[];
  uploadDir: string;
  preserveOriginalName: boolean;
}

// API Response Types
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Middleware Chain Types
export type MiddlewareChain = MiddlewareFunction[];

export interface MiddlewareConfig {
  order: number;
  middleware: MiddlewareFunction;
  condition?: (req: CustomRequest) => boolean;
  description?: string;
}
