/**
 * Security Configuration Module
 * Centralized security settings following OWASP Top 10 guidelines
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { CorsOptions } from 'cors';

// Security constants
export const SECURITY_CONSTANTS = {
  // Password policies
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_SYMBOLS: true,
  
  // Rate limiting windows (in milliseconds)
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  STRICT_RATE_LIMIT_WINDOW: 5 * 60 * 1000, // 5 minutes
  
  // Session settings
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  JWT_EXPIRY: '1h',
  JWT_REFRESH_EXPIRY: '7d',
  
  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_REQUEST: 5,
  
  // Request limits
  MAX_REQUEST_SIZE: '10mb',
  MAX_URL_LENGTH: 2048,
  MAX_PARAM_LENGTH: 100,
  
  // HSTS settings
  HSTS_MAX_AGE: 31536000, // 1 year
  HSTS_INCLUDE_SUBDOMAINS: true,
  HSTS_PRELOAD: true
} as const;

/**
 * Advanced Helmet Configuration
 * Implements strict security headers
 */
export const getHelmetConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Only in development for Swagger UI
          ...(isDevelopment ? ["'unsafe-eval'"] : []),
          "https://cdn.jsdelivr.net",
          "https://unpkg.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // For Swagger UI
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:"
        ],
        connectSrc: [
          "'self'",
          ...(isDevelopment ? ["http://localhost:*", "ws://localhost:*"] : [])
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
      reportOnly: isDevelopment
    },
    
    // HTTP Strict Transport Security
    hsts: {
      maxAge: SECURITY_CONSTANTS.HSTS_MAX_AGE,
      includeSubDomains: SECURITY_CONSTANTS.HSTS_INCLUDE_SUBDOMAINS,
      preload: SECURITY_CONSTANTS.HSTS_PRELOAD
    },
    
    // X-Frame-Options
    frameguard: {
      action: 'deny'
    },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // X-XSS-Protection
    xssFilter: true,
    
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },
    
    // Hide X-Powered-By header
    hidePoweredBy: true,
    
    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: false, // Can cause issues with Swagger UI
    
    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin'
    },
    
    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    },
    
    // Origin-Agent-Cluster
    originAgentCluster: true,
    
    // Permissions Policy (formerly Feature Policy)
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      notifications: [],
      push: [],
      syncXhr: [],
      fullscreen: ['self'],
      payment: []
    }
  });
};

/**
 * Rate Limiting Configurations
 * Different limits for different endpoint types
 */
export const createRateLimiters = () => {
  // General API rate limiter
  const generalLimiter = rateLimit({
    windowMs: SECURITY_CONSTANTS.RATE_LIMIT_WINDOW,
    max: 100, // 100 requests per 15 minutes
    message: {
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(SECURITY_CONSTANTS.RATE_LIMIT_WINDOW / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(SECURITY_CONSTANTS.RATE_LIMIT_WINDOW / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Strict limiter for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: SECURITY_CONSTANTS.STRICT_RATE_LIMIT_WINDOW,
    max: 5, // 5 requests per 5 minutes
    message: {
      error: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(SECURITY_CONSTANTS.STRICT_RATE_LIMIT_WINDOW / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(SECURITY_CONSTANTS.STRICT_RATE_LIMIT_WINDOW / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Moderate limiter for data modification endpoints
  const mutationLimiter = rateLimit({
    windowMs: SECURITY_CONSTANTS.RATE_LIMIT_WINDOW,
    max: 50, // 50 requests per 15 minutes
    message: {
      error: 'Too many modification requests, please try again later.',
      code: 'MUTATION_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(SECURITY_CONSTANTS.RATE_LIMIT_WINDOW / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  // Lenient limiter for read-only endpoints
  const readLimiter = rateLimit({
    windowMs: SECURITY_CONSTANTS.RATE_LIMIT_WINDOW,
    max: 200, // 200 requests per 15 minutes
    message: {
      error: 'Too many read requests, please try again later.',
      code: 'READ_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(SECURITY_CONSTANTS.RATE_LIMIT_WINDOW / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  return {
    generalLimiter,
    authLimiter,
    mutationLimiter,
    readLimiter
  };
};

/**
 * CORS Configuration
 * Secure cross-origin resource sharing settings
 */
export const getCorsConfig = (): CorsOptions => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:9000',
    'http://localhost:9000'
  ];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS policy'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'Cache-Control',
      'X-Requested-With'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page',
      'X-Limit',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
    optionsSuccessStatus: 200
  };
};

/**
 * Request validation limits
 */
export const getRequestLimits = () => ({
  json: {
    limit: SECURITY_CONSTANTS.MAX_REQUEST_SIZE,
    strict: true,
    type: 'application/json'
  },
  urlencoded: {
    limit: SECURITY_CONSTANTS.MAX_REQUEST_SIZE,
    extended: true,
    parameterLimit: 100,
    type: 'application/x-www-form-urlencoded'
  }
});

/**
 * Security event types for audit logging
 */
export const SECURITY_EVENTS = {
  AUTHENTICATION_SUCCESS: 'AUTH_SUCCESS',
  AUTHENTICATION_FAILURE: 'AUTH_FAILURE',
  AUTHORIZATION_FAILURE: 'AUTHZ_FAILURE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT: 'INVALID_INPUT',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  CSRF_ATTEMPT: 'CSRF_ATTEMPT',
  DATA_EXPOSURE_ATTEMPT: 'DATA_EXPOSURE_ATTEMPT',
  PRIVILEGE_ESCALATION: 'PRIVILEGE_ESCALATION',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  ACCOUNT_LOCKOUT: 'ACCOUNT_LOCKOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  ADMIN_ACTION: 'ADMIN_ACTION'
} as const;

export type SecurityEvent = typeof SECURITY_EVENTS[keyof typeof SECURITY_EVENTS];