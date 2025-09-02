/**
 * Prisma error handling utilities
 * 
 * This module provides utilities for handling Prisma-specific errors
 * and converting them to domain-appropriate error messages.
 * 
 * @module PrismaErrors
 */

import { Prisma } from '../generated/prisma';

/**
 * Domain error types
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Domain error class
 */
export class DomainError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly originalError?: Error;

  constructor(message: string, code: ErrorCode, details?: unknown, originalError?: Error) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
    this.originalError = originalError;
  }
}

/**
 * Check if error is a Prisma error
 */
export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

/**
 * Check if error is a Prisma validation error
 */
export function isPrismaValidationError(error: unknown): error is Prisma.PrismaClientValidationError {
  return error instanceof Prisma.PrismaClientValidationError;
}

/**
 * Check if error is a Prisma initialization error
 */
export function isPrismaInitializationError(error: unknown): error is Prisma.PrismaClientInitializationError {
  return error instanceof Prisma.PrismaClientInitializationError;
}

/**
 * Check if error is a Prisma rust panic error
 */
export function isPrismaRustPanicError(error: unknown): error is Prisma.PrismaClientRustPanicError {
  return error instanceof Prisma.PrismaClientRustPanicError;
}

/**
 * Convert Prisma error to domain error
 */
export function handlePrismaError(error: unknown, operation: string = 'database operation'): DomainError {
  // Handle known Prisma request errors
  if (isPrismaError(error)) {
    switch (error.code) {
      case 'P2002': // Unique constraint failed
        return new DomainError(
          `Duplicate entry: ${extractUniqueConstraintInfo(error)}`,
          ErrorCode.DUPLICATE_KEY,
          { constraintInfo: error.meta },
          error
        );
      
      case 'P2003': // Foreign key constraint failed
        return new DomainError(
          `Foreign key constraint failed on field: ${error.meta?.field_name || 'unknown'}`,
          ErrorCode.FOREIGN_KEY_CONSTRAINT,
          error.meta,
          error
        );
      
      case 'P2025': // Record not found
        return new DomainError(
          `Record not found for ${operation}`,
          ErrorCode.NOT_FOUND,
          error.meta,
          error
        );
      
      case 'P2014': // Required relation violation
        return new DomainError(
          `Required relation missing: ${error.meta?.relation_name || 'unknown'}`,
          ErrorCode.VALIDATION_ERROR,
          error.meta,
          error
        );
      
      case 'P2016': // Query interpretation error
        return new DomainError(
          `Invalid query parameters for ${operation}`,
          ErrorCode.VALIDATION_ERROR,
          error.meta,
          error
        );
      
      case 'P1001': // Can't reach database server
      case 'P1002': // Database server timeout
      case 'P1008': // Operations timed out
        return new DomainError(
          `Database connection error during ${operation}`,
          ErrorCode.CONNECTION_ERROR,
          { code: error.code },
          error
        );
      
      case 'P2034': // Transaction failed due to conflict
        return new DomainError(
          `Transaction conflict during ${operation}`,
          ErrorCode.TRANSACTION_ERROR,
          error.meta,
          error
        );
      
      default:
        return new DomainError(
          `Database error during ${operation}: ${error.message}`,
          ErrorCode.UNKNOWN_ERROR,
          { prismaCode: error.code, meta: error.meta },
          error
        );
    }
  }
  
  // Handle validation errors
  if (isPrismaValidationError(error)) {
    return new DomainError(
      `Validation error during ${operation}: ${error.message}`,
      ErrorCode.VALIDATION_ERROR,
      { validationError: error.message },
      error
    );
  }
  
  // Handle initialization errors
  if (isPrismaInitializationError(error)) {
    return new DomainError(
      `Database initialization error: ${error.message}`,
      ErrorCode.CONNECTION_ERROR,
      { errorCode: error.errorCode },
      error
    );
  }
  
  // Handle rust panic errors
  if (isPrismaRustPanicError(error)) {
    return new DomainError(
      `Critical database error during ${operation}`,
      ErrorCode.UNKNOWN_ERROR,
      { message: error.message },
      error
    );
  }
  
  // Handle generic errors
  if (error instanceof Error) {
    return new DomainError(
      `Unexpected error during ${operation}: ${error.message}`,
      ErrorCode.UNKNOWN_ERROR,
      undefined,
      error
    );
  }
  
  // Handle unknown error types
  return new DomainError(
    `Unknown error during ${operation}`,
    ErrorCode.UNKNOWN_ERROR,
    { error }
  );
}

/**
 * Extract unique constraint information from Prisma error
 */
function extractUniqueConstraintInfo(error: Prisma.PrismaClientKnownRequestError): string {
  if (error.meta?.target) {
    if (Array.isArray(error.meta.target)) {
      return `constraint on fields (${error.meta.target.join(', ')})`;
    }
    return `constraint on field ${error.meta.target}`;
  }
  return 'unique constraint violation';
}

/**
 * Check if error indicates a transient failure that can be retried
 */
export function isTransientError(error: unknown): boolean {
  if (isPrismaError(error)) {
    const transientCodes = ['P1001', 'P1002', 'P1008', 'P2034'];
    return transientCodes.includes(error.code);
  }
  
  if (isPrismaInitializationError(error)) {
    // Connection-related initialization errors might be transient
    return error.errorCode === 'P1001' || error.errorCode === 'P1002';
  }
  
  return false;
}

/**
 * Retry configuration for transient errors
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
  backoffFactor: 2
};

/**
 * Execute operation with retry logic for transient errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'database operation'
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a transient error
      if (!isTransientError(error)) {
        throw handlePrismaError(error, operationName);
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelayMs
      );
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
  
  throw handlePrismaError(lastError, operationName);
}