/**
 * Transaction helper utilities for common transaction operations
 *
 * This module provides utility functions for handling transactions,
 * deadlock detection, retry logic, and transaction debugging.
 *
 * @module TransactionHelpers
 */

import { Prisma } from '@prisma/client';
import {
  TransactionError,
  TransactionTimeoutError,
  TransactionDeadlockError,
  TransactionConflictError,
  TransactionStatus,
  TransactionPriority,
  ITransactionContext,
  ITransactionOptions,
  TransactionCallback,
} from '../types/transaction.types';
import { createLogger } from './logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('TransactionHelpers');

/**
 * Default transaction options
 */
export const DEFAULT_TRANSACTION_OPTIONS: Required<ITransactionOptions> = {
  maxWait: 5000,
  timeout: 30000,
  isolationLevel: 'READ_COMMITTED' as any,
  priority: TransactionPriority.NORMAL,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
  metadata: {},
};

/**
 * SQLite error codes that indicate deadlock or conflict
 */
export const DEADLOCK_ERROR_CODES = [
  'SQLITE_BUSY',
  'SQLITE_LOCKED',
  'P2034', // Prisma: Transaction failed due to a write conflict or a deadlock
  'P2002', // Prisma: Unique constraint failed
];

/**
 * Check if error is a deadlock or conflict error
 */
export function isDeadlockError(error: any): boolean {
  if (!error) {
    return false;
  }

  const errorMessage = error.message || '';
  const errorCode = error.code || '';

  return (
    DEADLOCK_ERROR_CODES.some(code => errorCode.includes(code) || errorMessage.includes(code)) ||
    errorMessage.toLowerCase().includes('deadlock') ||
    errorMessage.toLowerCase().includes('database is locked')
  );
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
  if (!error) {
    return false;
  }

  const errorMessage = error.message || '';
  return (
    errorMessage.toLowerCase().includes('timeout') ||
    errorMessage.toLowerCase().includes('timed out')
  );
}

/**
 * Create a transaction context
 */
export function createTransactionContext(
  client: Prisma.TransactionClient,
  options: ITransactionOptions = {},
  parentTransactionId?: string
): ITransactionContext {
  const id = uuidv4();
  const opts = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };

  return {
    id,
    status: TransactionStatus.PENDING,
    startTime: new Date(),
    priority: opts.priority,
    isolationLevel: opts.isolationLevel as any,
    savepoints: [],
    metadata: { ...opts.metadata },
    parentTransactionId,
    depth: parentTransactionId ? 1 : 0,
    client,
  };
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attempt: number, baseDelay = 1000): number {
  const jitter = Math.random() * 0.1; // 10% jitter
  const exponential = Math.pow(2, attempt - 1);
  return Math.floor(baseDelay * exponential * (1 + jitter));
}

/**
 * Retry transaction execution with exponential backoff
 */
export async function retryTransaction<T>(
  operation: () => Promise<T>,
  options: ITransactionOptions = {},
  context?: ITransactionContext
): Promise<T> {
  const opts = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      if (opts.enableLogging && attempt > 1) {
        logger.info('Retrying transaction', {
          transactionId: context?.id,
          attempt,
          maxRetries: opts.maxRetries,
        });
      }

      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isDeadlockError(error) || attempt === opts.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = calculateBackoffDelay(attempt, opts.retryDelay);

      if (opts.enableLogging) {
        logger.warn('Transaction failed, will retry', {
          transactionId: context?.id,
          attempt,
          maxRetries: opts.maxRetries,
          error: (error as Error).message,
          retryDelay: delay,
        });
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Transform retryable errors
  if (lastError && isDeadlockError(lastError)) {
    throw new TransactionDeadlockError(
      context?.id || 'unknown',
      `Transaction failed after ${opts.maxRetries} retries: ${lastError.message}`,
      context
    );
  }

  throw lastError || new Error('Transaction failed with unknown error');
}

/**
 * Execute transaction with timeout
 */
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  context?: ITransactionContext
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(new TransactionTimeoutError(context?.id || 'unknown', timeoutMs, context));
    }, timeoutMs);

    operation()
      .then(result => {
        clearTimeout(timeoutHandle);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
  });
}

/**
 * Log transaction operation
 */
export function logTransactionOperation(
  context: ITransactionContext,
  operation: string,
  details?: Record<string, any>
): void {
  if (!context.metadata.enableLogging) {
    return;
  }

  logger.debug('Transaction operation', {
    transactionId: context.id,
    operation,
    status: context.status,
    duration: context.endTime ? context.endTime.getTime() - context.startTime.getTime() : null,
    savepointCount: context.savepoints.length,
    depth: context.depth,
    ...details,
  });
}

/**
 * Validate transaction options
 */
export function validateTransactionOptions(options: ITransactionOptions): void {
  if (options.maxWait && options.maxWait < 0) {
    throw new Error('maxWait must be a positive number');
  }

  if (options.timeout && options.timeout < 0) {
    throw new Error('timeout must be a positive number');
  }

  if (options.maxRetries && options.maxRetries < 0) {
    throw new Error('maxRetries must be a positive number');
  }

  if (options.retryDelay && options.retryDelay < 0) {
    throw new Error('retryDelay must be a positive number');
  }

  if (options.priority && !Object.values(TransactionPriority).includes(options.priority)) {
    throw new Error('Invalid transaction priority');
  }
}

/**
 * Create a nested transaction name for savepoints
 */
export function createSavepointName(context: ITransactionContext, name?: string): string {
  const baseName = name || `sp_${context.savepoints.length + 1}`;
  return `${context.id}_${baseName}`;
}

/**
 * Check if transaction can be nested (SQLite limitations)
 */
export function canCreateNestedTransaction(context: ITransactionContext): boolean {
  // SQLite supports savepoints for nested transactions
  return context.depth < 10; // Reasonable limit for savepoint depth
}

/**
 * Format transaction context for logging
 */
export function formatTransactionContext(context: ITransactionContext): Record<string, any> {
  return {
    id: context.id,
    status: context.status,
    startTime: context.startTime.toISOString(),
    endTime: context.endTime?.toISOString(),
    duration: context.endTime ? context.endTime.getTime() - context.startTime.getTime() : null,
    priority: context.priority,
    isolationLevel: context.isolationLevel,
    savepointCount: context.savepoints.length,
    depth: context.depth,
    parentTransactionId: context.parentTransactionId,
    metadata: context.metadata,
  };
}

/**
 * Create a transaction-safe UUID generator
 */
export function generateTransactionId(): string {
  return `tx_${uuidv4()}`;
}

/**
 * Create a savepoint-safe ID generator
 */
export function generateSavepointId(): string {
  return `sp_${uuidv4()}`;
}

/**
 * Check if current environment supports transactions
 */
export function supportsTransactions(): boolean {
  // Always true for SQLite with Prisma
  return true;
}

/**
 * Get optimal batch size for bulk operations within transactions
 */
export function getOptimalBatchSize(operationType: string, recordCount: number): number {
  // SQLite performs well with moderate batch sizes
  switch (operationType.toLowerCase()) {
    case 'insert':
    case 'create':
      return Math.min(1000, Math.max(50, recordCount / 10));
    case 'update':
      return Math.min(500, Math.max(25, recordCount / 20));
    case 'delete':
      return Math.min(200, Math.max(10, recordCount / 50));
    default:
      return Math.min(100, Math.max(10, recordCount / 100));
  }
}

/**
 * Extract meaningful error information from Prisma errors
 */
export function extractTransactionError(
  error: any,
  context?: ITransactionContext
): TransactionError {
  if (error instanceof TransactionError) {
    return error;
  }

  const message = error.message || 'Unknown transaction error';
  let code = 'UNKNOWN_ERROR';

  if (isDeadlockError(error)) {
    return new TransactionDeadlockError(context?.id || 'unknown', message, context);
  }

  if (isTimeoutError(error)) {
    return new TransactionTimeoutError(
      context?.id || 'unknown',
      context?.metadata.timeout || 30000,
      context
    );
  }

  // Extract Prisma error codes
  if (error.code) {
    code = error.code;
  } else if (error.message.includes('P2')) {
    const match = error.message.match(/P\d{4}/);
    if (match) {
      code = match[0];
    }
  }

  return new TransactionError(message, code, context?.id, context);
}

/**
 * Helper to ensure cleanup on transaction failure
 */
export async function withTransactionCleanup<T>(
  operation: () => Promise<T>,
  cleanup: () => Promise<void>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    try {
      await cleanup();
    } catch (cleanupError) {
      logger.error('Transaction cleanup failed', cleanupError as Error);
    }
    throw error;
  }
}

export default {
  DEFAULT_TRANSACTION_OPTIONS,
  DEADLOCK_ERROR_CODES,
  isDeadlockError,
  isTimeoutError,
  createTransactionContext,
  calculateBackoffDelay,
  retryTransaction,
  executeWithTimeout,
  logTransactionOperation,
  validateTransactionOptions,
  createSavepointName,
  canCreateNestedTransaction,
  formatTransactionContext,
  generateTransactionId,
  generateSavepointId,
  supportsTransactions,
  getOptimalBatchSize,
  extractTransactionError,
  withTransactionCleanup,
};
