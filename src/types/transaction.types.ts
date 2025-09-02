/**
 * Transaction types and interfaces for comprehensive transaction management
 * 
 * This module defines all transaction-related types, interfaces, and enums
 * used throughout the application for managing database transactions,
 * savepoints, and transaction-scoped operations.
 * 
 * @module TransactionTypes
 */

import { Prisma } from '../generated/prisma';

/**
 * Transaction isolation levels supported by SQLite
 */
export enum TransactionIsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE'
}

/**
 * Transaction status enumeration
 */
export enum TransactionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMMITTED = 'COMMITTED',
  ROLLED_BACK = 'ROLLED_BACK',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT'
}

/**
 * Transaction priority levels
 */
export enum TransactionPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20
}

/**
 * Savepoint interface for nested transactions
 */
export interface ITransactionSavepoint {
  id: string;
  name: string;
  createdAt: Date;
  transactionId: string;
  depth: number;
}

/**
 * Transaction options interface
 */
export interface ITransactionOptions {
  /** Maximum time to wait for transaction to acquire locks (ms) */
  maxWait?: number;
  /** Transaction timeout in milliseconds */
  timeout?: number;
  /** Transaction isolation level */
  isolationLevel?: TransactionIsolationLevel;
  /** Transaction priority for deadlock resolution */
  priority?: TransactionPriority;
  /** Enable automatic retry on deadlock */
  enableRetry?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retry attempts (ms) */
  retryDelay?: number;
  /** Enable logging for this transaction */
  enableLogging?: boolean;
  /** Transaction metadata */
  metadata?: Record<string, any>;
}

/**
 * Transaction context interface
 */
export interface ITransactionContext {
  id: string;
  status: TransactionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  priority: TransactionPriority;
  isolationLevel: TransactionIsolationLevel;
  savepoints: ITransactionSavepoint[];
  metadata: Record<string, any>;
  parentTransactionId?: string;
  depth: number;
  client: Prisma.TransactionClient;
}

/**
 * Transaction callback function type
 */
export type TransactionCallback<T> = (tx: Prisma.TransactionClient, context: ITransactionContext) => Promise<T>;

/**
 * Transaction result interface
 */
export interface ITransactionResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  context: ITransactionContext;
  retryCount?: number;
  totalDuration: number;
}

/**
 * Transaction metrics interface
 */
export interface ITransactionMetrics {
  transactionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: TransactionStatus;
  operationCount: number;
  savePointCount: number;
  retryCount: number;
  priority: TransactionPriority;
  isolationLevel: TransactionIsolationLevel;
  metadata: Record<string, any>;
}

/**
 * Transaction manager interface
 */
export interface ITransactionManager {
  /**
   * Execute a transaction with the given callback
   */
  executeTransaction<T>(
    callback: TransactionCallback<T>,
    options?: ITransactionOptions
  ): Promise<ITransactionResult<T>>;

  /**
   * Create a savepoint within the current transaction
   */
  createSavepoint(name: string, context: ITransactionContext): Promise<ITransactionSavepoint>;

  /**
   * Release a savepoint
   */
  releaseSavepoint(savepointId: string, context: ITransactionContext): Promise<void>;

  /**
   * Rollback to a savepoint
   */
  rollbackToSavepoint(savepointId: string, context: ITransactionContext): Promise<void>;

  /**
   * Get active transaction contexts
   */
  getActiveTransactions(): ITransactionContext[];

  /**
   * Get transaction metrics
   */
  getTransactionMetrics(transactionId: string): Promise<ITransactionMetrics | null>;
}

/**
 * Transaction-specific error types
 */
export class TransactionError extends Error {
  constructor(
    message: string,
    public code: string,
    public transactionId?: string,
    public context?: ITransactionContext
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class TransactionTimeoutError extends TransactionError {
  constructor(transactionId: string, timeout: number, context?: ITransactionContext) {
    super(
      `Transaction ${transactionId} timed out after ${timeout}ms`,
      'TRANSACTION_TIMEOUT',
      transactionId,
      context
    );
    this.name = 'TransactionTimeoutError';
  }
}

export class TransactionDeadlockError extends TransactionError {
  constructor(transactionId: string, message: string, context?: ITransactionContext) {
    super(message, 'TRANSACTION_DEADLOCK', transactionId, context);
    this.name = 'TransactionDeadlockError';
  }
}

export class TransactionConflictError extends TransactionError {
  constructor(transactionId: string, resource: string, context?: ITransactionContext) {
    super(
      `Transaction ${transactionId} conflict on resource: ${resource}`,
      'TRANSACTION_CONFLICT',
      transactionId,
      context
    );
    this.name = 'TransactionConflictError';
  }
}

export class SavepointError extends TransactionError {
  constructor(message: string, savepointId: string, transactionId?: string) {
    super(message, 'SAVEPOINT_ERROR', transactionId);
    this.name = 'SavepointError';
  }
}

/**
 * Transaction operation types for logging and monitoring
 */
export enum TransactionOperationType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  BULK_CREATE = 'BULK_CREATE',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',
  CUSTOM = 'CUSTOM'
}

/**
 * Transaction operation log entry
 */
export interface ITransactionOperation {
  id: string;
  transactionId: string;
  type: TransactionOperationType;
  tableName: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordsAffected?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Request-scoped transaction context for Express middleware
 */
export interface IRequestTransactionContext {
  transactionId: string;
  context: ITransactionContext;
  autoCommit: boolean;
  operations: ITransactionOperation[];
}

/**
 * Declare global Express namespace extension
 */
declare global {
  namespace Express {
    interface Request {
      transaction?: IRequestTransactionContext;
    }
  }
}

export default {
  TransactionIsolationLevel,
  TransactionStatus,
  TransactionPriority,
  TransactionOperationType,
  TransactionError,
  TransactionTimeoutError,
  TransactionDeadlockError,
  TransactionConflictError,
  SavepointError
};
