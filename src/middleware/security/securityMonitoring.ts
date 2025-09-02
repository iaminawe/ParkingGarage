/**
 * Security Monitoring Middleware
 * Real-time security monitoring and threat detection
 */

import { Request, Response, NextFunction } from 'express';
import { SecurityAuditService } from '../../services/SecurityAuditService';
import { circuitBreakerManager } from './circuitBreaker';

// Request tracking for suspicious activity detection
const requestTracker = new Map<string, Array<{ timestamp: number; endpoint: string }>>();
const suspiciousIPs = new Set<string>();

/**
 * Security monitoring configuration
 */
const MONITORING_CONFIG = {
  // Suspicious activity thresholds
  REQUESTS_PER_MINUTE: 60,
  UNIQUE_ENDPOINTS_PER_MINUTE: 20,
  FAILED_AUTH_ATTEMPTS: 5,
  
  // Time windows (in milliseconds)
  TRACKING_WINDOW: 60 * 1000, // 1 minute
  SUSPICIOUS_IP_TIMEOUT: 15 * 60 * 1000, // 15 minutes
  
  // Patterns that indicate potential attacks
  SUSPICIOUS_PATTERNS: [
    /\.\.(\/|\\)/,                    // Path traversal
    /(union|select|insert|delete|drop|create|alter)/i, // SQL injection
    /<script|javascript:|vbscript:/i, // XSS attempts
    /(%27|%22|%3C|%3E|%28|%29)/i,    // URL encoded injection attempts
    /(\||\||&&|;|`)/,                // Command injection
    /(eval|exec|system|shell_exec)/i, // Code execution attempts
  ]
};

/**
 * Clean old tracking data
 */
const cleanOldData = (): void => {
  const now = Date.now();
  const cutoff = now - MONITORING_CONFIG.TRACKING_WINDOW;
  
  // Clean request tracking
  for (const [ip, requests] of requestTracker) {
    const recentRequests = requests.filter(req => req.timestamp > cutoff);
    if (recentRequests.length === 0) {
      requestTracker.delete(ip);
    } else {
      requestTracker.set(ip, recentRequests);
    }
  }
  
  // Clean suspicious IPs (they expire after timeout)
  // This is handled by the timeout mechanism in the detection logic
};

/**
 * Detect suspicious request patterns
 */
const detectSuspiciousActivity = (req: Request): boolean => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Initialize tracking for this IP
  if (!requestTracker.has(clientIP)) {
    requestTracker.set(clientIP, []);
  }
  
  const requests = requestTracker.get(clientIP)!;
  requests.push({
    timestamp: now,
    endpoint: `${req.method} ${req.path}`
  });
  
  // Clean old requests
  const recentRequests = requests.filter(r => r.timestamp > now - MONITORING_CONFIG.TRACKING_WINDOW);
  requestTracker.set(clientIP, recentRequests);
  
  // Check for suspicious patterns
  const requestCount = recentRequests.length;
  const uniqueEndpoints = new Set(recentRequests.map(r => r.endpoint)).size;
  
  // Too many requests
  if (requestCount > MONITORING_CONFIG.REQUESTS_PER_MINUTE) {
    return true;
  }
  
  // Too many unique endpoints (scanning behavior)
  if (uniqueEndpoints > MONITORING_CONFIG.UNIQUE_ENDPOINTS_PER_MINUTE) {
    return true;
  }
  
  // Check URL patterns
  const fullUrl = req.originalUrl || req.url;
  for (const pattern of MONITORING_CONFIG.SUSPICIOUS_PATTERNS) {
    if (pattern.test(fullUrl)) {
      return true;
    }
  }
  
  // Check request body for suspicious patterns
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    for (const pattern of MONITORING_CONFIG.SUSPICIOUS_PATTERNS) {
      if (pattern.test(bodyStr)) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Log suspicious activity
 */
const logSuspiciousActivity = async (req: Request, reason: string): Promise<void> => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  await SecurityAuditService.createSecurityAlert({
    title: 'Suspicious Activity Detected',
    description: `Potential security threat from IP ${clientIP}: ${reason}`,
    severity: 'HIGH',
    userId: (req as any).user?.id,
    ipAddress: clientIP,
    endpoint: `${req.method} ${req.path}`,
    evidence: {
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      url: req.originalUrl,
      method: req.method,
      headers: req.headers,
      body: req.body ? JSON.stringify(req.body).substring(0, 1000) : undefined,
      queryParams: req.query,
      timestamp: new Date().toISOString()
    }
  });
  
  // Mark IP as suspicious
  suspiciousIPs.add(clientIP);
  
  // Remove from suspicious list after timeout
  setTimeout(() => {
    suspiciousIPs.delete(clientIP);
  }, MONITORING_CONFIG.SUSPICIOUS_IP_TIMEOUT);
};

/**
 * Security monitoring middleware
 */
export const securityMonitoring = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    // Clean old data periodically
    if (Math.random() < 0.01) { // 1% chance to clean on each request
      cleanOldData();
    }
    
    // Skip monitoring for health checks and static assets
    if (req.path === '/health' || req.path.startsWith('/api-docs')) {
      return next();
    }
    
    // Check if IP is already flagged as suspicious
    if (suspiciousIPs.has(clientIP)) {
      await SecurityAuditService.logSecurityEvent({
        event: 'REQUEST_FROM_SUSPICIOUS_IP',
        severity: 'MEDIUM',
        ipAddress: clientIP,
        endpoint: `${req.method} ${req.path}`,
        details: {
          userAgent: req.get('User-Agent'),
          url: req.originalUrl,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Detect suspicious activity
    if (detectSuspiciousActivity(req)) {
      const reason = 'Pattern matching detected potential threat';
      await logSuspiciousActivity(req, reason);
    }
    
    // Monitor response for additional security checks
    const originalSend = res.send;
    res.send = function(data: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Log slow responses (potential DoS)
      if (responseTime > 5000) { // 5 seconds
        SecurityAuditService.logSecurityEvent({
          event: 'SLOW_RESPONSE_DETECTED',
          severity: 'MEDIUM',
          ipAddress: clientIP,
          endpoint: `${req.method} ${req.path}`,
          details: {
            responseTime,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Log error responses that might indicate attacks
      if (res.statusCode >= 400) {
        const severity = res.statusCode >= 500 ? 'MEDIUM' : 'LOW';
        
        SecurityAuditService.logSecurityEvent({
          event: `HTTP_${res.statusCode}_RESPONSE`,
          severity,
          userId: (req as any).user?.id,
          ipAddress: clientIP,
          endpoint: `${req.method} ${req.path}`,
          details: {
            statusCode: res.statusCode,
            responseTime,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Security monitoring error:', error);
    next(); // Don't block requests due to monitoring errors
  }
};

/**
 * Request metrics collection
 */
export const collectRequestMetrics = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Add timing to response headers (for monitoring)
  res.on('finish', () => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.setHeader('X-Request-ID', req.headers['x-request-id'] || 'unknown');
  });
  
  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

/**
 * Get security monitoring statistics
 */
export const getMonitoringStats = () => {
  const now = Date.now();
  const cutoff = now - MONITORING_CONFIG.TRACKING_WINDOW;
  
  let totalRequests = 0;
  let activeIPs = 0;
  
  for (const [ip, requests] of requestTracker) {
    const recentRequests = requests.filter(req => req.timestamp > cutoff);
    if (recentRequests.length > 0) {
      totalRequests += recentRequests.length;
      activeIPs++;
    }
  }
  
  return {
    activeIPs,
    totalRequests,
    suspiciousIPs: suspiciousIPs.size,
    circuitBreakerStatus: circuitBreakerManager.getHealthCheck(),
    monitoring: {
      trackingWindow: MONITORING_CONFIG.TRACKING_WINDOW,
      requestThreshold: MONITORING_CONFIG.REQUESTS_PER_MINUTE,
      endpointThreshold: MONITORING_CONFIG.UNIQUE_ENDPOINTS_PER_MINUTE
    },
    timestamp: new Date().toISOString()
  };
};

/**
 * Health check endpoint data
 */
export const getSecurityHealthCheck = async () => {
  const stats = getMonitoringStats();
  const circuitBreakerHealth = circuitBreakerManager.getHealthCheck();
  
  return {
    status: 'healthy',
    security: {
      monitoring: {
        status: stats.suspiciousIPs === 0 ? 'normal' : 'alert',
        activeThreats: stats.suspiciousIPs,
        activeConnections: stats.activeIPs,
        requestsPerMinute: stats.totalRequests
      },
      circuitBreakers: circuitBreakerHealth,
      lastCheck: new Date().toISOString()
    }
  };
};