/**
 * Express type extensions and custom middleware types
 * 
 * This module extends Express Request and Response objects with
 * custom properties used throughout the application.
 */

import { Request, Response } from 'express';
import { RequestMetadata, RateLimitHeaders } from './api';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      // Request metadata added by middleware
      metadata?: RequestMetadata;
      
      // Correlation ID for request tracking
      correlationId?: string;
      
      // Validated request body (after validation middleware)
      validatedBody?: any;
      
      // Validated query parameters
      validatedQuery?: any;
      
      // Validated route parameters
      validatedParams?: any;
      
      // Pagination options parsed from query
      pagination?: {
        page: number;
        limit: number;
        offset: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      };
      
      // Search filters parsed from query
      filters?: Record<string, any>;
      
      // Rate limiting information
      rateLimit?: {
        limit: number;
        remaining: number;
        reset: Date;
        retryAfter?: number;
      };
      
      // Request timing information
      timing?: {
        start: number;
        end?: number;
        duration?: number;
      };
    }
    
    interface Response {
      // Enhanced response methods
      success<T>(data: T, message?: string, statusCode?: number): Response;
      error(message: string, statusCode?: number, errors?: string[]): Response;
      paginated<T>(data: T[], totalItems: number, page: number, limit: number): Response;
      
      // Correlation ID (set by middleware)
      correlationId?: string;
      
      // Response timing
      timing?: {
        start: number;
        end: number;
        duration: number;
      };
    }
  }
}

// Middleware function types
export type AsyncMiddleware = (
  req: Request,
  res: Response,
  next: (error?: any) => void
) => Promise<void>;

export type ErrorMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: (error?: any) => void
) => void;

// Validation middleware types
export interface ValidationSchema {
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
}

export type ValidationMiddleware = (schema: ValidationSchema) => AsyncMiddleware;

// Rate limiting middleware types
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skip?: (req: Request, res: Response) => boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

// CORS middleware types
export interface CorsConfig {
  origin?: string | string[] | boolean | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

// Security middleware types
export interface SecurityConfig {
  helmet?: {
    contentSecurityPolicy?: boolean | object;
    crossOriginEmbedderPolicy?: boolean;
    crossOriginOpenerPolicy?: boolean;
    crossOriginResourcePolicy?: boolean | object;
    dnsPrefetchControl?: boolean | object;
    frameguard?: boolean | object;
    hidePoweredBy?: boolean;
    hsts?: boolean | object;
    ieNoOpen?: boolean;
    noSniff?: boolean;
    originAgentCluster?: boolean;
    permittedCrossDomainPolicies?: boolean | object;
    referrerPolicy?: boolean | object;
    xssFilter?: boolean;
  };
}

// Authentication middleware types (if needed in the future)
export interface AuthPayload {
  userId?: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
  expiresAt?: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
  token?: string;
}

// Logging middleware types
export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'text';
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  excludePaths?: string[];
  sensitiveFields?: string[];
}

// Response enhancement methods
export interface ResponseEnhancements {
  success<T>(data: T, message?: string, statusCode?: number): Response;
  error(message: string, statusCode?: number, errors?: string[]): Response;
  paginated<T>(
    data: T[],
    totalItems: number,
    page: number,
    limit: number,
    options?: {
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      additionalMeta?: Record<string, any>;
    }
  ): Response;
  notFound(message?: string): Response;
  badRequest(message: string, errors?: string[]): Response;
  unauthorized(message?: string): Response;
  forbidden(message?: string): Response;
  conflict(message: string): Response;
  unprocessableEntity(message: string, errors?: string[]): Response;
  internalServerError(message?: string): Response;
}

// Route handler types with enhanced request/response
export type RouteHandler = (req: Request, res: Response) => Promise<void> | void;
export type AsyncRouteHandler = (req: Request, res: Response) => Promise<void>;

// Controller method decorator types (for future use)
export interface ControllerMetadata {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  middleware?: AsyncMiddleware[];
  validation?: ValidationSchema;
  rateLimit?: RateLimitConfig;
  cache?: {
    ttl: number;
    key?: (req: Request) => string;
  };
}

// Error handling types
export interface ApplicationError extends Error {
  statusCode: number;
  code: string;
  details?: any;
  isOperational?: boolean;
}

export interface ErrorHandlerOptions {
  includeStackTrace: boolean;
  logErrors: boolean;
  customErrorMessages: Record<string, string>;
}