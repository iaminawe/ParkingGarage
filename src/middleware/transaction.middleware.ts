/**
 * Express middleware for request-scoped transaction management
 * 
 * This middleware provides automatic transaction management for Express routes,
 * handling transaction lifecycle, error rollback, and request context.
 * 
 * @module TransactionMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '../generated/prisma';
import { TransactionManager } from '../services/TransactionManager';
import {
  ITransactionOptions,
  IRequestTransactionContext,
  ITransactionOperation,
  TransactionOperationType,
  TransactionStatus,
  TransactionError
} from '../types/transaction.types';
import {
  generateTransactionId,
  formatTransactionContext,
  extractTransactionError
} from '../utils/transactionHelpers';
import { createLogger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('TransactionMiddleware');

/**
 * Middleware options for transaction management
 */
export interface ITransactionMiddlewareOptions extends ITransactionOptions {
  /** Automatically commit transaction on successful response */
  autoCommit?: boolean;
  /** Automatically rollback transaction on error */
  autoRollback?: boolean;
  /** Skip transaction for specific HTTP methods */
  skipMethods?: string[];
  /** Skip transaction for specific routes (regex patterns) */
  skipRoutes?: RegExp[];
  /** Enable operation logging */
  enableOperationLogging?: boolean;
  /** Custom error handler */
  errorHandler?: (error: Error, req: Request, res: Response) => void;
}

/**
 * Default middleware options
 */
const DEFAULT_MIDDLEWARE_OPTIONS: Required<ITransactionMiddlewareOptions> = {
  maxWait: 5000,
  timeout: 30000,
  isolationLevel: 'READ_COMMITTED' as any,
  priority: 5,
  enableRetry: false, // Disable retry for HTTP requests
  maxRetries: 0,
  retryDelay: 1000,
  enableLogging: true,
  metadata: {},
  autoCommit: true,
  autoRollback: true,
  skipMethods: ['GET', 'HEAD', 'OPTIONS'],
  skipRoutes: [],
  enableOperationLogging: true,
  errorHandler: () => {}
};

/**
 * Create transaction middleware with options
 */
export function createTransactionMiddleware(
  options: ITransactionMiddlewareOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const opts = { ...DEFAULT_MIDDLEWARE_OPTIONS, ...options };
  const transactionManager = TransactionManager.getInstance();
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip transaction for specific methods or routes
    if (shouldSkipTransaction(req, opts)) {
      return next();
    }
    
    const startTime = new Date();
    const transactionId = generateTransactionId();
    
    try {
      logger.debug('Starting request transaction', {
        transactionId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent')
      });
      
      // Execute request within transaction
      const result = await transactionManager.executeTransaction(
        async (tx, context) => {
          // Attach transaction context to request
          req.transaction = {
            transactionId: context.id,
            context,
            autoCommit: opts.autoCommit,
            operations: []
          };
          
          // Log request start operation
          if (opts.enableOperationLogging) {
            logOperation(req, 'HTTP_REQUEST_START', req.method, {
              url: req.url,
              headers: req.headers,
              body: req.body
            });
          }
          
          // Wrap response methods to capture operations
          wrapResponseMethods(req, res, opts);
          
          // Handle response completion
          await new Promise<void>((resolve, reject) => {
            // Store original next function
            const originalNext = next;
            
            // Override next to capture errors
            const wrappedNext = (error?: any) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            };
            
            // Handle response finish
            res.on('finish', () => {
              if (opts.enableOperationLogging) {
                logOperation(req, 'HTTP_REQUEST_END', req.method, {
                  statusCode: res.statusCode,
                  duration: Date.now() - startTime.getTime()
                });
              }
              resolve();
            });
            
            // Handle response error
            res.on('error', (error) => {
              if (opts.enableOperationLogging) {
                logOperation(req, 'HTTP_REQUEST_ERROR', req.method, {
                  error: error.message,
                  statusCode: res.statusCode
                });
              }
              reject(error);
            });
            
            // Call original next
            originalNext(wrappedNext as any);
          });
          
          // Return operations log for transaction result
          return req.transaction.operations;
        },
        opts
      );
      
      if (result.success) {
        logger.debug('Request transaction completed successfully', {
          transactionId: result.context.id,
          statusCode: res.statusCode,
          operationCount: (result.result as ITransactionOperation[])?.length || 0,
          duration: result.totalDuration
        });
      } else {
        throw result.error || new Error('Transaction failed');
      }
    } catch (error) {
      const transactionError = extractTransactionError(error);
      
      logger.error('Request transaction failed', transactionError, {
        transactionId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: Date.now() - startTime.getTime()
      });
      
      // Handle error with custom handler or default
      if (opts.errorHandler) {
        opts.errorHandler(transactionError, req, res);
      } else {
        handleTransactionError(transactionError, req, res);
      }
    }
  };
}

/**
 * Check if transaction should be skipped for this request
 */
function shouldSkipTransaction(
  req: Request,
  options: Required<ITransactionMiddlewareOptions>
): boolean {
  // Skip for specific methods
  if (options.skipMethods.includes(req.method.toUpperCase())) {
    return true;
  }
  
  // Skip for specific routes
  for (const pattern of options.skipRoutes) {
    if (pattern.test(req.path)) {
      return true;
    }
  }
  
  // Skip if transaction already exists (nested request)
  if (req.transaction) {
    return true;
  }
  
  return false;
}

/**
 * Wrap response methods to capture database operations
 */
function wrapResponseMethods(
  req: Request,
  res: Response,
  options: Required<ITransactionMiddlewareOptions>
): void {
  // Store original methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;
  
  // Wrap send method
  res.send = function(body?: any) {
    if (options.enableOperationLogging) {
      logOperation(req, 'HTTP_RESPONSE_SEND', 'SEND', {
        statusCode: res.statusCode,
        contentLength: typeof body === 'string' ? body.length : 0
      });
    }
    return originalSend.call(this, body);
  };
  
  // Wrap json method
  res.json = function(obj?: any) {
    if (options.enableOperationLogging) {
      logOperation(req, 'HTTP_RESPONSE_JSON', 'JSON', {
        statusCode: res.statusCode,
        objectKeys: obj && typeof obj === 'object' ? Object.keys(obj).length : 0
      });
    }
    return originalJson.call(this, obj);
  };
  
  // Wrap end method
  res.end = function(chunk?: any, encoding?: any) {
    if (options.enableOperationLogging) {
      logOperation(req, 'HTTP_RESPONSE_END', 'END', {
        statusCode: res.statusCode,
        hasChunk: !!chunk
      });
    }
    return originalEnd.call(this, chunk, encoding);
  };
}

/**
 * Log operation for transaction tracking
 */
function logOperation(
  req: Request,
  operationType: string,
  operationName: string,
  metadata?: Record<string, any>
): void {
  if (!req.transaction) return;
  
  const operation: ITransactionOperation = {
    id: uuidv4(),
    transactionId: req.transaction.transactionId,
    type: operationType as TransactionOperationType,
    tableName: 'http_request',
    operationName,
    startTime: new Date(),
    metadata
  };
  
  req.transaction.operations.push(operation);
}

/**
 * Handle transaction errors
 */
function handleTransactionError(
  error: TransactionError,
  req: Request,
  res: Response
): void {
  // Set appropriate status code
  let statusCode = 500;
  
  switch (error.code) {
    case 'TRANSACTION_TIMEOUT':
      statusCode = 408; // Request Timeout
      break;
    case 'TRANSACTION_DEADLOCK':
      statusCode = 409; // Conflict
      break;
    case 'TRANSACTION_CONFLICT':
      statusCode = 409; // Conflict
      break;
    default:
      statusCode = 500; // Internal Server Error
  }
  
  // Send error response if not already sent
  if (!res.headersSent) {
    res.status(statusCode).json({
      error: {
        message: error.message,
        code: error.code,
        transactionId: error.transactionId,
        type: 'TransactionError'
      }
    });
  }
}

/**
 * Middleware to ensure transaction cleanup
 */
export function transactionCleanupMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Clean up transaction context on response finish
    res.on('finish', () => {
      if (req.transaction) {
        logger.debug('Cleaning up transaction context', {
          transactionId: req.transaction.transactionId,
          operationCount: req.transaction.operations.length
        });
        
        // Clear transaction context
        delete req.transaction;
      }
    });
    
    next();
  };
}

/**
 * Get transaction context from request
 */
export function getTransactionContext(req: Request): IRequestTransactionContext | null {
  return req.transaction || null;
}

/**
 * Check if request has active transaction
 */
export function hasActiveTransaction(req: Request): boolean {
  return !!req.transaction && req.transaction.context.status === TransactionStatus.ACTIVE;
}

/**
 * Add operation to current request transaction
 */
export function addTransactionOperation(
  req: Request,
  type: TransactionOperationType,
  tableName: string,
  operationName: string,
  metadata?: Record<string, any>
): void {
  if (!req.transaction) return;
  
  const operation: ITransactionOperation = {
    id: uuidv4(),
    transactionId: req.transaction.transactionId,
    type,
    tableName,
    operationName,
    startTime: new Date(),
    metadata
  };
  
  req.transaction.operations.push(operation);
  
  logger.debug('Added transaction operation', {
    transactionId: req.transaction.transactionId,
    operationType: type,
    tableName,
    operationName
  });
}

/**
 * Complete operation in current request transaction
 */
export function completeTransactionOperation(
  req: Request,
  operationId: string,
  recordsAffected?: number,
  error?: string
): void {
  if (!req.transaction) return;
  
  const operation = req.transaction.operations.find(op => op.id === operationId);
  if (operation) {
    operation.endTime = new Date();
    operation.duration = operation.endTime.getTime() - operation.startTime.getTime();
    operation.recordsAffected = recordsAffected;
    operation.error = error;
  }
}

export default {
  createTransactionMiddleware,
  transactionCleanupMiddleware,
  getTransactionContext,
  hasActiveTransaction,
  addTransactionOperation,
  completeTransactionOperation
};
