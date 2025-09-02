/**
 * Advanced logging configuration using Winston
 * 
 * Features:
 * - Structured logging with JSON format
 * - Log rotation with daily rotate file
 * - Multiple log levels and transports
 * - Correlation ID tracking
 * - Environment-specific configuration
 * - Error stack trace capture
 * - Performance-optimized for production
 * 
 * @module LoggerConfig
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from './environment';
import path from 'path';
import { Request } from 'express';

// Custom log levels with colors
const logLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'cyan',
  },
};

// Add colors to winston
winston.addColors(logLevels.colors);

// Log format for development (human-readable)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack, correlationId, ...meta }) => {
    const correlation = correlationId ? `[${correlationId}] ` : '';
    const metaStr = Object.keys(meta).length ? `
Meta: ${JSON.stringify(meta, null, 2)}` : '';
    const stackStr = stack ? `
Stack: ${stack}` : '';
    
    return `${timestamp} ${level}: ${correlation}${message}${metaStr}${stackStr}`;
  })
);

// Log format for production (JSON structured)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    // Ensure consistent structure
    const { timestamp, level, message, correlationId, userId, method, url, ip, userAgent, duration, statusCode, error, stack, ...rest } = info;
    return JSON.stringify({
      timestamp,
      level,
      message,
      correlationId,
      userId,
      method,
      url,
      ip,
      userAgent,
      duration,
      statusCode,
      error,
      stack,
      ...rest
    });
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Console transport configuration
const consoleTransport = new winston.transports.Console({
  level: env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  handleExceptions: true,
  handleRejections: true,
});

// File transport for errors
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: env.LOG_FILE_DATE_PATTERN || 'YYYY-MM-DD',
  level: 'error',
  format: productionFormat,
  maxSize: env.LOG_FILE_MAX_SIZE || '10m',
  maxFiles: env.LOG_FILE_MAX_FILES || 7,
  handleExceptions: true,
  handleRejections: true,
  createSymlink: true,
  symlinkName: 'error-current.log',
});

// File transport for all logs
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: env.LOG_FILE_DATE_PATTERN || 'YYYY-MM-DD',
  format: productionFormat,
  maxSize: env.LOG_FILE_MAX_SIZE || '10m',
  maxFiles: env.LOG_FILE_MAX_FILES || 7,
  createSymlink: true,
  symlinkName: 'combined-current.log',
});

// HTTP request logs
const httpFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'http-%DATE%.log'),
  datePattern: env.LOG_FILE_DATE_PATTERN || 'YYYY-MM-DD',
  level: 'http',
  format: productionFormat,
  maxSize: env.LOG_FILE_MAX_SIZE || '10m',
  maxFiles: env.LOG_FILE_MAX_FILES || 7,
  createSymlink: true,
  symlinkName: 'http-current.log',
});

// Performance logs
const performanceFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'performance-%DATE%.log'),
  datePattern: env.LOG_FILE_DATE_PATTERN || 'YYYY-MM-DD',
  format: productionFormat,
  maxSize: env.LOG_FILE_MAX_SIZE || '10m',
  maxFiles: env.LOG_FILE_MAX_FILES || 7,
  createSymlink: true,
  symlinkName: 'performance-current.log',
});

// Create Winston logger instance
const logger = winston.createLogger({
  levels: logLevels.levels,
  level: env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports: [
    consoleTransport,
    ...(env.ENABLE_ERROR_LOGGING ? [errorFileTransport] : []),
    ...(env.NODE_ENV === 'production' ? [combinedFileTransport] : []),
    ...(env.ENABLE_REQUEST_LOGGING ? [httpFileTransport] : []),
    performanceFileTransport,
  ],
  exitOnError: false,
});

// Correlation ID tracking
export interface CorrelationContext {
  correlationId?: string;
  userId?: string;
  method?: string;
  url?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
}

// Enhanced logger with correlation context
export class StructuredLogger {
  private context: CorrelationContext = {};

  constructor(context?: CorrelationContext) {
    this.context = context || {};
  }

  private formatMessage(level: string, message: string, meta?: any) {
    return {
      level,
      message,
      ...this.context,
      ...meta,
      timestamp: new Date().toISOString(),
    };
  }

  error(message: string, error?: Error, meta?: any) {
    const logData = this.formatMessage('error', message, {
      ...meta,
      error: error?.message,
      stack: error?.stack,
    });
    logger.error(logData);
  }

  warn(message: string, meta?: any) {
    logger.warn(this.formatMessage('warn', message, meta));
  }

  info(message: string, meta?: any) {
    logger.info(this.formatMessage('info', message, meta));
  }

  http(message: string, meta?: any) {
    logger.http(this.formatMessage('http', message, meta));
  }

  debug(message: string, meta?: any) {
    logger.debug(this.formatMessage('debug', message, meta));
  }

  performance(operation: string, duration: number, meta?: any) {
    const logData = this.formatMessage('info', `Performance: ${operation}`, {
      ...meta,
      duration,
      performance: true,
    });
    performanceFileTransport.write(logData);
  }

  // Create child logger with additional context
  child(additionalContext: CorrelationContext): StructuredLogger {
    return new StructuredLogger({
      ...this.context,
      ...additionalContext,
    });
  }

  // Set correlation ID
  setCorrelationId(correlationId: string): StructuredLogger {
    this.context.correlationId = correlationId;
    return this;
  }

  // Set user ID
  setUserId(userId: string): StructuredLogger {
    this.context.userId = userId;
    return this;
  }
}

// Request context extractor
export function extractRequestContext(req: Request): CorrelationContext {
  return {
    correlationId: req.headers['x-correlation-id'] as string || generateCorrelationId(),
    userId: (req as any).user?.id,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  };
}

// Generate correlation ID
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create logger instances
export const systemLogger = new StructuredLogger();
export const requestLogger = new StructuredLogger();
export const errorLogger = new StructuredLogger();
export const performanceLogger = new StructuredLogger();

// Export raw winston logger for advanced use cases
export { logger as rawLogger };

// Log system startup
systemLogger.info('Logger initialized', {
  logLevel: env.LOG_LEVEL,
  nodeEnv: env.NODE_ENV,
  enableRequestLogging: env.ENABLE_REQUEST_LOGGING,
  enableErrorLogging: env.ENABLE_ERROR_LOGGING,
});

export default systemLogger;