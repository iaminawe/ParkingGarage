/**
 * Logger Utility
 * 
 * Provides structured logging with different levels and formatting
 * for the Parking Garage Management System.
 * 
 * @module Logger
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  stack?: string;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.logLevel = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  private formatMessage(level: string, message: string, data?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    if (data) {
      if (data instanceof Error) {
        entry.data = {
          name: data.name,
          message: data.message,
          ...(data as any)
        };
        entry.stack = data.stack;
      } else {
        entry.data = data;
      }
    }

    return entry;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private output(entry: LogEntry): void {
    if (process.env.NODE_ENV === 'test') {
      return; // Skip logging in tests unless explicitly enabled
    }

    const output = JSON.stringify(entry);
    
    if (entry.level === 'ERROR') {
      console.error(output);
    } else if (entry.level === 'WARN') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.formatMessage('ERROR', message, data);
      this.output(entry);
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.formatMessage('WARN', message, data);
      this.output(entry);
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.formatMessage('INFO', message, data);
      this.output(entry);
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.formatMessage('DEBUG', message, data);
      this.output(entry);
    }
  }
}

export const logger = new Logger();
export default logger;