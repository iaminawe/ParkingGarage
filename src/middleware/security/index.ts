/**
 * Security Middleware Index
 * Central export point for all security-related middleware
 */

// Input validation and sanitization
export {
  sanitizeInput,
  detectSecurityThreats,
  sanitizeHtml,
  commonValidations,
  handleValidationErrors,
  createValidationChain,
} from './inputSanitization';

// Circuit breaker for external services
export {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitBreakerState,
  CircuitBreakerError,
  withCircuitBreaker,
  circuitBreakerManager,
} from './circuitBreaker';

// Security monitoring and threat detection
export {
  securityMonitoring,
  collectRequestMetrics,
  securityHeaders,
  getMonitoringStats,
  getSecurityHealthCheck,
} from './securityMonitoring';

// Re-export security configuration
export {
  SECURITY_CONSTANTS,
  SECURITY_EVENTS,
  getHelmetConfig,
  createRateLimiters,
  getCorsConfig,
  getRequestLimits,
  type SecurityEvent,
} from '../../config/security.config';
