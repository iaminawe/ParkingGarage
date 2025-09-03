import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from '../config/environment';
import { RATE_LIMITS, HTTP_STATUS, API_RESPONSES, TIME_CONSTANTS } from '../config/constants';
import { CacheService } from '../services/CacheService';
import * as crypto from 'crypto';

/**
 * Enhanced security middleware collection
 */
export class SecurityMiddleware {
  private cacheService: CacheService | null = null;

  constructor() {
    // Get or create CacheService singleton with security-specific configuration
    try {
      this.cacheService = CacheService.getInstance({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        keyPrefix: 'security:',
        defaultTTL: 3600,
        maxRetries: 3,
        retryDelayMs: 1000,
      });
      
      if (!this.cacheService) {
        console.warn('CacheService singleton not available, using in-memory fallback');
      }
    } catch (error) {
      console.warn('CacheService initialization failed, using in-memory fallback:', error);
      this.cacheService = null;
    }
  }

  /**
   * Enhanced Helmet configuration with strict security headers
   */
  static getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          scriptSrc: ["'self'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // Set to true if needed for SharedArrayBuffer
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Adjust based on needs
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true,
    });
  }

  /**
   * CSRF Protection middleware using double submit cookies
   */
  static csrfProtection() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Skip CSRF for safe methods and API documentation
      if (
        req.method === 'GET' ||
        req.method === 'HEAD' ||
        req.method === 'OPTIONS' ||
        req.path.startsWith('/api-docs') ||
        req.path === '/health'
      ) {
        next();
        return;
      }

      const token = req.headers['x-csrf-token'] as string;
      const cookie = req.cookies?.['csrf-token'];

      // Generate and set CSRF token for new sessions
      if (!cookie) {
        const csrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie('csrf-token', csrfToken, {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: TIME_CONSTANTS.SESSION_DURATION_MS,
        });

        // Allow first request without token (token was just generated)
        next();
        return;
      }

      // Validate CSRF token
      if (!token || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(cookie))) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: 'Invalid CSRF token',
        });
        return;
      }

      next();
    };
  }

  /**
   * Rate limiting configuration for different endpoints
   */
  static createAuthRateLimit() {
    return rateLimit({
      windowMs: RATE_LIMITS.DEFAULT_WINDOW_MS,
      max: RATE_LIMITS.AUTH_MAX_ATTEMPTS,
      standardHeaders: true,
      legacyHeaders: false,
      // Custom key generator based on IP and endpoint
      keyGenerator: (req: Request): string => {
        return `auth_${req.ip}_${req.path}`;
      },
      // Skip successful requests for some endpoints
      skipSuccessfulRequests: true,
      // Skip failed requests only for non-critical endpoints
      skipFailedRequests: false,
      handler: (req: Request, res: Response): void => {
        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          message: API_RESPONSES.ERRORS.RATE_LIMIT_EXCEEDED,
          retryAfter: Math.ceil(RATE_LIMITS.DEFAULT_WINDOW_MS / 1000 / 60), // minutes
        });
      },
    });
  }

  /**
   * Signup specific rate limiting (more restrictive)
   */
  static createSignupRateLimit() {
    return rateLimit({
      windowMs: RATE_LIMITS.DEFAULT_WINDOW_MS * 4, // 1 hour
      max: RATE_LIMITS.SIGNUP_MAX_ATTEMPTS,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request): string => {
        // Use both IP and email to prevent abuse
        const email = req.body?.email || 'unknown';
        return `signup_${req.ip}_${email}`;
      },
      handler: (req: Request, res: Response): void => {
        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Too many signup attempts. Please try again later.',
          retryAfter: Math.ceil((RATE_LIMITS.DEFAULT_WINDOW_MS * 4) / 1000 / 60), // minutes
        });
      },
    });
  }

  /**
   * Password validation rate limiting
   */
  static createPasswordValidationLimit() {
    return rateLimit({
      windowMs: TIME_CONSTANTS.PASSWORD_VALIDATION_WINDOW_MS,
      max: RATE_LIMITS.PASSWORD_VALIDATION_MAX_ATTEMPTS,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request): string => {
        return `pwd_val_${req.ip}`;
      },
      handler: (req: Request, res: Response): void => {
        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Too many password validation attempts',
        });
      },
    });
  }

  /**
   * IP-based suspicious activity detection
   */
  suspiciousActivityDetection() {
    // In-memory fallback when CacheService is not available
    const inMemoryScores = new Map<string, { score: number; expires: number }>();

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = req.ip;
        const key = `suspicious_${ip}`;

        let score = 0;

        if (this.cacheService) {
          try {
            // Use CacheService if available
            const currentScore = await this.cacheService.get(key);
            
            // If cache returns null due to connection issues, disable cache
            if (currentScore === null) {
              // Check if this is a connection error by trying to set a test value
              const testResult = await this.cacheService.set('_test_connection', '1', 1);
              if (!testResult) {
                // Connection failed, disable cache and fall back to in-memory
                console.warn('Cache service connection failed, falling back to in-memory');
                this.cacheService = null;
                
                // Use in-memory fallback for this request
                const now = Date.now();
                const entry = inMemoryScores.get(key);
                
                if (entry && entry.expires > now) {
                  score = entry.score;
                } else {
                  score = 0;
                }
                
                if (this.isSuspiciousRequest(req)) {
                  score += 1;
                  inMemoryScores.set(key, { score, expires: now + 3600000 }); // 1 hour TTL
                }
              } else {
                // Cache is working, key just doesn't exist yet
                score = 0;
                if (this.isSuspiciousRequest(req)) {
                  score += 1;
                  await this.cacheService.set(key, score.toString(), 3600); // 1 hour TTL
                }
              }
            } else {
              // Cache returned a value
              score = parseInt(String(currentScore), 10);
              
              // Increase score for suspicious patterns
              if (this.isSuspiciousRequest(req)) {
                score += 1;
                await this.cacheService.set(key, score.toString(), 3600); // 1 hour TTL
              }
            }
          } catch (cacheError) {
            // If cache fails, fall back to in-memory tracking for this request
            console.warn('Cache operation failed, falling back to in-memory:', cacheError);
            this.cacheService = null; // Disable cache for future requests
            
            // Use in-memory fallback for this request
            const now = Date.now();
            const entry = inMemoryScores.get(key);
            
            if (entry && entry.expires > now) {
              score = entry.score;
            } else {
              score = 0;
            }
            
            if (this.isSuspiciousRequest(req)) {
              score += 1;
              inMemoryScores.set(key, { score, expires: now + 3600000 }); // 1 hour TTL
            }
          }
        } else {
          // Use in-memory fallback
          const now = Date.now();
          const entry = inMemoryScores.get(key);

          if (entry && entry.expires > now) {
            score = entry.score;
          } else {
            score = 0;
          }

          // Increase score for suspicious patterns
          if (this.isSuspiciousRequest(req)) {
            score += 1;
            inMemoryScores.set(key, { score, expires: now + 3600000 }); // 1 hour TTL
          }

          // Clean up expired entries
          for (const [k, v] of inMemoryScores.entries()) {
            if (v.expires <= now) {
              inMemoryScores.delete(k);
            }
          }
        }

        // Block if score is too high
        if (score > 10) {
          res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
            success: false,
            message: 'Suspicious activity detected. Access temporarily restricted.',
          });
          return;
        }

        next();
      } catch (error) {
        console.error('Suspicious activity detection error:', error);
        next(); // Continue on error to avoid blocking legitimate traffic
      }
    };
  }

  /**
   * Check if request looks suspicious
   */
  private isSuspiciousRequest(req: Request): boolean {
    const suspiciousPatterns = [
      // SQL injection patterns
      /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\btruncate\b)/i,
      // XSS patterns
      /<script|javascript:|vbscript:|onload=|onerror=/i,
      // Path traversal
      /\.\.\//,
      // Common attack patterns
      /(\beval\b|\bexec\b|\bsystem\b)/i,
    ];

    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers.referer || '';
    const queryString = req.url;

    // Check for suspicious patterns in various parts of the request
    const textToCheck = `${userAgent} ${referer} ${queryString}`;

    return (
      suspiciousPatterns.some(pattern => pattern.test(textToCheck)) ||
      userAgent === '' || // Empty user agent is suspicious
      userAgent.length > 1000 || // Extremely long user agent
      Object.keys(req.query).length > 20
    ); // Too many query parameters
  }

  /**
   * Request sanitization middleware
   */
  static requestSanitization() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Sanitize request body
      if (req.body) {
        req.body = SecurityMiddleware.sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = SecurityMiddleware.sanitizeObject(req.query);
      }

      // Sanitize URL parameters
      if (req.params) {
        req.params = SecurityMiddleware.sanitizeObject(req.params);
      }

      next();
    };
  }

  /**
   * Recursively sanitize object properties
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return SecurityMiddleware.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => SecurityMiddleware.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = SecurityMiddleware.sanitizeObject(obj[key]);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string values
   */
  private static sanitizeString(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove potentially dangerous characters but preserve functionality
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/vbscript:/gi, '') // Remove vbscript: protocols
      .replace(/onload\s*=/gi, '') // Remove onload events
      .replace(/onerror\s*=/gi, '') // Remove onerror events
      .trim();
  }

  /**
   * Security logging middleware
   */
  static securityLogger() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Log security-relevant events
      const securityEvents = [
        'login',
        'logout',
        'signup',
        'password-reset',
        'failed-auth',
        'token-refresh',
        'admin-action',
      ];

      const path = req.path.toLowerCase();
      const isSecurityEvent = securityEvents.some(event => path.includes(event));

      if (isSecurityEvent && env.NODE_ENV === 'production') {
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            type: 'security_event',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            method: req.method,
            path: req.path,
            userId: (req as any).user?.id,
          })
        );
      }

      next();
    };
  }

  /**
   * Content type validation middleware
   */
  static validateContentType() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Skip for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
      }

      const contentType = req.headers['content-type'];
      const allowedTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
      ];

      if (contentType && !allowedTypes.some(type => contentType.includes(type))) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Invalid content type',
        });
        return;
      }

      next();
    };
  }
}

// Export configured middleware instances
export const helmetSecurity = SecurityMiddleware.getHelmetConfig();
export const csrfProtection = SecurityMiddleware.csrfProtection();
export const authRateLimit = SecurityMiddleware.createAuthRateLimit();
export const signupRateLimit = SecurityMiddleware.createSignupRateLimit();
export const passwordValidationLimit = SecurityMiddleware.createPasswordValidationLimit();
export const requestSanitization = SecurityMiddleware.requestSanitization();
export const securityLogger = SecurityMiddleware.securityLogger();
export const validateContentType = SecurityMiddleware.validateContentType();
