/**
 * Simple logger utility for adapter operations
 *
 * This module provides a basic logging interface for database operations
 * with different log levels and structured logging support.
 *
 * @module Logger
 */

import { IAdapterLogger } from '../adapters/interfaces/BaseAdapter';

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
 * Simple console logger implementation
 */
export class ConsoleLogger implements IAdapterLogger {
  private readonly minLevel: LogLevel;
  private readonly name: string;

  constructor(name = 'PrismaAdapter', minLevel: LogLevel = LogLevel.INFO) {
    this.name = name;
    this.minLevel = minLevel;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, message, meta);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.INFO) {
      this.log(LogLevel.INFO, message, meta);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.WARN) {
      this.log(LogLevel.WARN, message, meta);
    }
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.ERROR) {
      this.log(LogLevel.ERROR, message, meta, error);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
    error?: Error
  ): void {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    let logMessage = `[${timestamp}] ${levelName} [${this.name}] ${message}`;

    if (meta && Object.keys(meta).length > 0) {
      logMessage += ` | Meta: ${JSON.stringify(meta)}`;
    }

    if (error) {
      logMessage += ` | Error: ${error.message}`;
      if (error.stack) {
        logMessage += `\nStack: ${error.stack}`;
      }
    }

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }
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
export function createLogger(name?: string): IAdapterLogger {
  // In production, you might want to use a more sophisticated logger
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL;

  if (process.env.NODE_ENV === 'test') {
    return new NoopLogger();
  }

  let minLevel = LogLevel.INFO;
  if (logLevel) {
    switch (logLevel.toUpperCase()) {
      case 'DEBUG':
        minLevel = LogLevel.DEBUG;
        break;
      case 'INFO':
        minLevel = LogLevel.INFO;
        break;
      case 'WARN':
        minLevel = LogLevel.WARN;
        break;
      case 'ERROR':
        minLevel = LogLevel.ERROR;
        break;
    }
  } else if (isDevelopment) {
    minLevel = LogLevel.DEBUG;
  }

  return new ConsoleLogger(name, minLevel);
}

/**
 * Default logger instance
 */
export const logger = createLogger();
