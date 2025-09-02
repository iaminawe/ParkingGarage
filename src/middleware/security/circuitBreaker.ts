/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures by monitoring external service calls
 */

import { SecurityAuditUtils } from '../../services/SecurityAuditService';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  monitorTimeout: number;
  name: string;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Blocking requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

export class CircuitBreakerError extends Error {
  constructor(service: string) {
    super(`Circuit breaker is OPEN for service: ${service}`);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      recoveryTimeout: options.recoveryTimeout || 30000, // 30 seconds
      monitorTimeout: options.monitorTimeout || 5000, // 5 seconds
      name: options.name || 'unknown-service',
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitBreakerError(this.options.name);
      }

      // Try to close circuit (half-open state)
      this.state = CircuitBreakerState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    const wasHalfOpen = this.state === CircuitBreakerState.HALF_OPEN;

    this.failureCount = 0;
    this.state = CircuitBreakerState.CLOSED;

    // Log recovery if we were in half-open state
    if (wasHalfOpen) {
      SecurityAuditUtils.logSecurityEvent({
        event: 'CIRCUIT_BREAKER_CLOSED',
        severity: 'LOW',
        details: {
          service: this.options.name,
          previousState: 'HALF_OPEN',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;

      // Log circuit breaker opening
      SecurityAuditUtils.logSecurityEvent({
        event: 'CIRCUIT_BREAKER_OPENED',
        severity: 'MEDIUM',
        details: {
          service: this.options.name,
          failureCount: this.failureCount,
          lastError: error?.message,
          recoveryTime: new Date(this.nextAttemptTime).toISOString(),
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      options: this.options,
    };
  }

  /**
   * Force circuit to open (for testing or maintenance)
   */
  forceOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;

    SecurityAuditUtils.logSecurityEvent({
      event: 'CIRCUIT_BREAKER_FORCE_OPEN',
      severity: 'MEDIUM',
      details: {
        service: this.options.name,
        reason: 'Manual intervention',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Force circuit to close (for testing or maintenance)
   */
  forceClose(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.nextAttemptTime = 0;

    SecurityAuditUtils.logSecurityEvent({
      event: 'CIRCUIT_BREAKER_FORCE_CLOSE',
      severity: 'LOW',
      details: {
        service: this.options.name,
        reason: 'Manual intervention',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : null,
      isHealthy: this.state === CircuitBreakerState.CLOSED,
      timeSinceLastFailure: this.lastFailureTime ? Date.now() - this.lastFailureTime : null,
    };
  }
}

/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Get or create a circuit breaker for a service
   */
  getCircuitBreaker(serviceName: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker({ ...options, name: serviceName }));
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async executeWithBreaker<T>(
    serviceName: string,
    fn: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(serviceName, options);
    return circuitBreaker.execute(fn);
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllStatuses() {
    const statuses: Record<string, any> = {};

    Array.from(this.circuitBreakers.entries()).forEach(([name, breaker]) => {
      statuses[name] = breaker.getMetrics();
    });

    return statuses;
  }

  /**
   * Get health check for all circuit breakers
   */
  getHealthCheck() {
    const statuses = this.getAllStatuses();
    const totalBreakers = Object.keys(statuses).length;
    const healthyBreakers = Object.values(statuses).filter(s => s.isHealthy).length;
    const unhealthyBreakers = totalBreakers - healthyBreakers;

    return {
      totalBreakers,
      healthyBreakers,
      unhealthyBreakers,
      overallHealthy: unhealthyBreakers === 0,
      services: statuses,
    };
  }

  /**
   * Reset all circuit breakers (for testing)
   */
  resetAll(): void {
    Array.from(this.circuitBreakers.values()).forEach(breaker => {
      breaker.forceClose();
    });

    SecurityAuditUtils.logSecurityEvent({
      event: 'ALL_CIRCUIT_BREAKERS_RESET',
      severity: 'MEDIUM',
      details: {
        count: this.circuitBreakers.size,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Decorator for automatic circuit breaker protection
 */
export function withCircuitBreaker(serviceName: string, options?: Partial<CircuitBreakerOptions>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const manager = CircuitBreakerManager.getInstance();

    descriptor.value = async function (...args: any[]) {
      return manager.executeWithBreaker(serviceName, () => method.apply(this, args), options);
    };
  };
}

// Export singleton instance for easy access
export const circuitBreakerManager = CircuitBreakerManager.getInstance();
