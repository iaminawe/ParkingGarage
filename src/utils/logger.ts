/**
 * Enhanced logger utility with structured logging
 *
 * This module provides a comprehensive logging interface for the parking garage system
 * with structured logging, performance tracking, and production-ready features.
 *
 * @module Logger
 */

import { IAdapterLogger } from '../adapters/interfaces/BaseAdapter';
import { systemLogger, StructuredLogger, CorrelationContext } from '../config/logger.config';

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  error?: Error;
}

/**
 * Enhanced logger implementation with structured logging
 */
export class EnhancedLogger implements IAdapterLogger {
  private readonly structuredLogger: StructuredLogger;
  private readonly name: string;

  constructor(name = 'Application', context?: CorrelationContext) {
    this.name = name;
    this.structuredLogger = new StructuredLogger(context);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.structuredLogger.debug(`[${this.name}] ${message}`, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.structuredLogger.info(`[${this.name}] ${message}`, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.structuredLogger.warn(`[${this.name}] ${message}`, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.structuredLogger.error(`[${this.name}] ${message}`, error, meta);
  }

  http(message: string, meta?: Record<string, unknown>): void {
    this.structuredLogger.http(`[${this.name}] ${message}`, meta);
  }

  performance(operation: string, duration: number, meta?: Record<string, unknown>): void {
    this.structuredLogger.performance(`[${this.name}] ${operation}`, duration, meta);
  }

  child(additionalContext: CorrelationContext): EnhancedLogger {
    return new EnhancedLogger(this.name, additionalContext);
  }
}

/**
 * No-op logger for testing or when logging is disabled
 */
export class NoopLogger implements IAdapterLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

/**
 * Create logger instance based on environment
 */
export function createLogger(name?: string, context?: CorrelationContext): IAdapterLogger {
  if (process.env.NODE_ENV === 'test') {
    return new NoopLogger();
  }

  return new EnhancedLogger(name || 'Application', context);
}

/**
 * Production-ready logger instances for different use cases
 */
export const logger = systemLogger; // Main system logger
export const apiLogger = new EnhancedLogger('API');
export const dbLogger = new EnhancedLogger('Database');
export const authLogger = new EnhancedLogger('Auth');
export const paymentLogger = new EnhancedLogger('Payment');
export const emailLogger = new EnhancedLogger('Email');
export const socketLogger = new EnhancedLogger('Socket');
export const cacheLogger = new EnhancedLogger('Cache');

/**
 * Convenience functions for quick logging (replaces console statements)
 */
export const log = {
  debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta),
  info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
  error: (message: string, error?: Error | string, meta?: Record<string, unknown>) => {
    if (typeof error === 'string') {
      logger.error(message, new Error(error), meta);
    } else {
      logger.error(message, error, meta);
    }
  },
  http: (message: string, meta?: Record<string, unknown>) => logger.http(message, meta),
};

/**
 * Legacy compatibility - maps old console usage patterns
 */
export const console_replacement = {
  log: (message: any, ...args: any[]) => {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    const meta = args.length > 0 ? { args } : undefined;
    logger.info(msg, meta);
  },
  error: (message: any, ...args: any[]) => {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    const meta = args.length > 0 ? { args } : undefined;
    logger.error(msg, undefined, meta);
  },
  warn: (message: any, ...args: any[]) => {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    const meta = args.length > 0 ? { args } : undefined;
    logger.warn(msg, meta);
  },
  info: (message: any, ...args: any[]) => {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    const meta = args.length > 0 ? { args } : undefined;
    logger.info(msg, meta);
  },
};
