/**
 * Transaction Manager Service for comprehensive transaction management
 *
 * This service provides enterprise-grade transaction management with support for:
 * - Nested transactions via savepoints
 * - Transaction timeout and retry mechanisms
 * - Deadlock detection and recovery
 * - Transaction monitoring and metrics
 * - Request-scoped transaction coordination
 *
 * @module TransactionManager
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  ITransactionManager,
  ITransactionContext,
  ITransactionOptions,
  ITransactionResult,
  ITransactionSavepoint,
  ITransactionMetrics,
  TransactionCallback,
  TransactionStatus,
  TransactionPriority,
  TransactionError,
  TransactionTimeoutError,
  TransactionDeadlockError,
  SavepointError,
} from '../types/transaction.types';
import {
  DEFAULT_TRANSACTION_OPTIONS,
  createTransactionContext,
  retryTransaction,
  executeWithTimeout,
  logTransactionOperation,
  validateTransactionOptions,
  createSavepointName,
  canCreateNestedTransaction,
  formatTransactionContext,
  generateSavepointId,
  extractTransactionError,
  withTransactionCleanup,
} from '../utils/transactionHelpers';
import { DatabaseService } from './DatabaseService';
import { createLogger } from '../utils/logger';
import type { IAdapterLogger } from '../adapters/interfaces/BaseAdapter';

/**
 * Transaction metrics store interface
 */
interface ITransactionMetricsStore {
  [transactionId: string]: ITransactionMetrics;
}

/**
 * Comprehensive Transaction Manager Service
 */
export class TransactionManager implements ITransactionManager {
  private static instance: TransactionManager;
  private readonly logger: IAdapterLogger;
  private readonly databaseService: DatabaseService;
  private readonly activeTransactions = new Map<string, ITransactionContext>();
  private readonly transactionMetrics: ITransactionMetricsStore = {};
  private readonly savepointCounter = new Map<string, number>();

  constructor(databaseService?: DatabaseService, logger?: IAdapterLogger) {
    this.databaseService = databaseService || DatabaseService.getInstance();
    this.logger = logger || createLogger('TransactionManager');
  }

  /**
   * Get singleton instance
   */
  static getInstance(databaseService?: DatabaseService): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager(databaseService);
    }
    return TransactionManager.instance;
  }

  /**
   * Execute a transaction with comprehensive error handling and retry logic
   */
  async executeTransaction<T>(
    callback: TransactionCallback<T>,
    options: ITransactionOptions = {}
  ): Promise<ITransactionResult<T>> {
    // Validate options
    validateTransactionOptions(options);

    const opts = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };
    let retryCount = 0;
    let result: ITransactionResult<T>;

    // Create initial metrics entry
    const startTime = new Date();
    let transactionId: string;

    const executeAttempt = async (): Promise<ITransactionResult<T>> => {
      const prismaClient = this.databaseService.getClient();

      return await prismaClient.$transaction(
        async tx => {
          // Create transaction context
          const context = createTransactionContext(tx, opts);
          transactionId = context.id;
          context.status = TransactionStatus.ACTIVE;

          // Store active transaction
          this.activeTransactions.set(context.id, context);

          // Initialize metrics
          this.initializeTransactionMetrics(context, startTime);

          try {
            logTransactionOperation(context, 'TRANSACTION_START');

            // Execute callback with timeout
            const callbackResult = await executeWithTimeout(
              () => callback(tx, context),
              opts.timeout,
              context
            );

            // Mark as successful
            context.status = TransactionStatus.COMMITTED;
            context.endTime = new Date();

            logTransactionOperation(context, 'TRANSACTION_COMMIT');

            return {
              success: true,
              result: callbackResult,
              context,
              retryCount,
              totalDuration: context.endTime.getTime() - startTime.getTime(),
            };
          } catch (error) {
            context.status = TransactionStatus.FAILED;
            context.endTime = new Date();

            const transactionError = extractTransactionError(error, context);

            logTransactionOperation(context, 'TRANSACTION_ERROR', {
              error: transactionError.message,
              code: transactionError.code,
            });

            return {
              success: false,
              error: transactionError,
              context,
              retryCount,
              totalDuration: context.endTime.getTime() - startTime.getTime(),
            };
          } finally {
            // Update metrics
            this.updateTransactionMetrics(context);

            // Clean up active transaction
            this.activeTransactions.delete(context.id);
          }
        },
        {
          maxWait: opts.maxWait,
          timeout: opts.timeout,
        }
      );
    };

    // Execute with retry logic if enabled
    if (opts.enableRetry) {
      result = await retryTransaction(async () => {
        retryCount++;
        const attempt = await executeAttempt();

        if (!attempt.success && attempt.error) {
          throw attempt.error;
        }

        return attempt;
      }, opts);
    } else {
      retryCount = 1;
      result = await executeAttempt();
    }

    // Log final result
    this.logger.info('Transaction completed', {
      transactionId: result.context.id,
      success: result.success,
      retryCount,
      totalDuration: result.totalDuration,
      status: result.context.status,
    });

    return result;
  }

  /**
   * Create a savepoint within the current transaction
   */
  async createSavepoint(
    name: string,
    context: ITransactionContext
  ): Promise<ITransactionSavepoint> {
    if (!canCreateNestedTransaction(context)) {
      throw new SavepointError(
        `Maximum savepoint depth exceeded for transaction ${context.id}`,
        'depth_exceeded',
        context.id
      );
    }

    const savepointId = generateSavepointId();
    const savepointName = createSavepointName(context, name);

    try {
      // SQLite savepoint creation
      await context.client.$executeRaw`SAVEPOINT ${Prisma.raw(savepointName)}`;

      const savepoint: ITransactionSavepoint = {
        id: savepointId,
        name: savepointName,
        createdAt: new Date(),
        transactionId: context.id,
        depth: context.depth + 1,
      };

      context.savepoints.push(savepoint);

      logTransactionOperation(context, 'SAVEPOINT_CREATE', {
        savepointId,
        savepointName,
        depth: savepoint.depth,
      });

      return savepoint;
    } catch (error) {
      throw new SavepointError(
        `Failed to create savepoint ${savepointName}: ${(error as Error).message}`,
        savepointId,
        context.id
      );
    }
  }

  /**
   * Release a savepoint
   */
  async releaseSavepoint(savepointId: string, context: ITransactionContext): Promise<void> {
    const savepoint = context.savepoints.find(sp => sp.id === savepointId);
    if (!savepoint) {
      throw new SavepointError(
        `Savepoint ${savepointId} not found in transaction ${context.id}`,
        savepointId,
        context.id
      );
    }

    try {
      // SQLite savepoint release
      await context.client.$executeRaw`RELEASE SAVEPOINT ${Prisma.raw(savepoint.name)}`;

      // Remove from context
      context.savepoints = context.savepoints.filter(sp => sp.id !== savepointId);

      logTransactionOperation(context, 'SAVEPOINT_RELEASE', {
        savepointId,
        savepointName: savepoint.name,
      });
    } catch (error) {
      throw new SavepointError(
        `Failed to release savepoint ${savepoint.name}: ${(error as Error).message}`,
        savepointId,
        context.id
      );
    }
  }

  /**
   * Rollback to a savepoint
   */
  async rollbackToSavepoint(savepointId: string, context: ITransactionContext): Promise<void> {
    const savepoint = context.savepoints.find(sp => sp.id === savepointId);
    if (!savepoint) {
      throw new SavepointError(
        `Savepoint ${savepointId} not found in transaction ${context.id}`,
        savepointId,
        context.id
      );
    }

    try {
      // SQLite rollback to savepoint
      await context.client.$executeRaw`ROLLBACK TO SAVEPOINT ${Prisma.raw(savepoint.name)}`;

      // Remove all savepoints created after this one
      context.savepoints = context.savepoints.filter(sp => sp.createdAt <= savepoint.createdAt);

      logTransactionOperation(context, 'SAVEPOINT_ROLLBACK', {
        savepointId,
        savepointName: savepoint.name,
      });
    } catch (error) {
      throw new SavepointError(
        `Failed to rollback to savepoint ${savepoint.name}: ${(error as Error).message}`,
        savepointId,
        context.id
      );
    }
  }

  /**
   * Get active transaction contexts
   */
  getActiveTransactions(): ITransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * Get transaction metrics
   */
  async getTransactionMetrics(transactionId: string): Promise<ITransactionMetrics | null> {
    return this.transactionMetrics[transactionId] || null;
  }

  /**
   * Get all transaction metrics
   */
  getAllTransactionMetrics(): ITransactionMetricsStore {
    return { ...this.transactionMetrics };
  }

  /**
   * Clear old transaction metrics (cleanup)
   */
  clearOldMetrics(olderThanHours = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    Object.keys(this.transactionMetrics).forEach(transactionId => {
      const metrics = this.transactionMetrics[transactionId];
      if (metrics && metrics.startTime < cutoffTime) {
        delete this.transactionMetrics[transactionId];
      }
    });

    this.logger.debug('Cleared old transaction metrics', {
      cutoffTime: cutoffTime.toISOString(),
      remainingMetrics: Object.keys(this.transactionMetrics).length,
    });
  }

  /**
   * Execute multiple operations within a single transaction
   */
  async executeMultipleOperations<T>(
    operations: Array<(tx: Prisma.TransactionClient, context: ITransactionContext) => Promise<any>>,
    options: ITransactionOptions = {}
  ): Promise<ITransactionResult<T[]>> {
    return this.executeTransaction(async (tx, context) => {
      const results: any[] = [];

      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        if (!operation) {
          throw new Error(`Operation at index ${i} is undefined`);
        }

        // Create savepoint before each operation for selective rollback
        const savepoint = await this.createSavepoint(`operation_${i}`, context);

        try {
          const result = await operation!(tx, context);
          results.push(result);

          // Release savepoint on success
          await this.releaseSavepoint(savepoint.id, context);
        } catch (error) {
          // Rollback to savepoint on error
          await this.rollbackToSavepoint(savepoint.id, context);
          throw error;
        }
      }

      return results;
    }, options);
  }

  /**
   * Execute operations in parallel within a transaction (careful with SQLite)
   */
  async executeParallelOperations<T>(
    operations: Array<(tx: Prisma.TransactionClient, context: ITransactionContext) => Promise<any>>,
    options: ITransactionOptions = {}
  ): Promise<ITransactionResult<T[]>> {
    return this.executeTransaction(async (tx, context) => {
      // SQLite doesn't support true parallel operations within a transaction
      // We execute them sequentially but track them as "parallel" for metrics
      const results = await Promise.all(
        operations.map(async (operation, index) => {
          logTransactionOperation(context, 'PARALLEL_OPERATION_START', { index });

          try {
            const result = await operation(tx, context);
            logTransactionOperation(context, 'PARALLEL_OPERATION_SUCCESS', { index });
            return result;
          } catch (error) {
            logTransactionOperation(context, 'PARALLEL_OPERATION_ERROR', {
              index,
              error: (error as Error).message,
            });
            throw error;
          }
        })
      );

      return results;
    }, options);
  }

  /**
   * Initialize transaction metrics
   */
  private initializeTransactionMetrics(context: ITransactionContext, startTime: Date): void {
    this.transactionMetrics[context.id] = {
      transactionId: context.id,
      startTime,
      status: context.status,
      operationCount: 0,
      savePointCount: 0,
      retryCount: 0,
      priority: context.priority,
      isolationLevel: context.isolationLevel,
      metadata: context.metadata,
    };
  }

  /**
   * Update transaction metrics
   */
  private updateTransactionMetrics(context: ITransactionContext): void {
    const metrics = this.transactionMetrics[context.id];
    if (metrics) {
      metrics.endTime = context.endTime;
      metrics.duration = context.endTime
        ? context.endTime.getTime() - metrics.startTime.getTime()
        : undefined;
      metrics.status = context.status;
      metrics.savePointCount = context.savepoints.length;
    }
  }

  /**
   * Get transaction statistics
   */
  getTransactionStatistics(): {
    active: number;
    total: number;
    success: number;
    failed: number;
    averageDuration: number;
  } {
    const metrics = Object.values(this.transactionMetrics);
    const active = this.activeTransactions.size;
    const total = metrics.length;
    const success = metrics.filter(m => m.status === TransactionStatus.COMMITTED).length;
    const failed = metrics.filter(m => m.status === TransactionStatus.FAILED).length;

    const completedMetrics = metrics.filter(m => m.duration !== undefined);
    const averageDuration =
      completedMetrics.length > 0
        ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / completedMetrics.length
        : 0;

    return {
      active,
      total,
      success,
      failed,
      averageDuration: Math.round(averageDuration),
    };
  }

  /**
   * Reset singleton instance (for testing)
   */
  static reset(): void {
    TransactionManager.instance = null as any;
  }
}

export default TransactionManager;
