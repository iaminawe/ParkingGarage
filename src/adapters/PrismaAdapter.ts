/**
 * PrismaAdapter base class for database operations
 * 
 * This abstract class provides a foundation for all repository adapters,
 * implementing common CRUD operations, error handling, logging, and
 * transaction support using Prisma ORM.
 * 
 * @module PrismaAdapter
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  IBaseAdapter,
  ITransactionManager,
  IConnectionManager,
  IAdapterLogger,
  PaginationOptions,
  SortOptions,
  QueryOptions,
  PaginatedResult,
  TransactionCallback,
  TransactionOptions,
  AuditFields
} from './interfaces/BaseAdapter';
import { handlePrismaError, withRetry, DEFAULT_RETRY_CONFIG, RetryConfig } from '../utils/prisma-errors';
import { createLogger } from '../utils/logger';

/**
 * Connection manager for Prisma client
 */
export class PrismaConnectionManager implements IConnectionManager {
  private isConnectedFlag: boolean = false;

  constructor(private readonly prisma: PrismaClient, private readonly logger: IAdapterLogger) {}

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.isConnectedFlag = true;
      this.logger.info('Database connection established');
    } catch (error) {
      this.isConnectedFlag = false;
      this.logger.error('Failed to connect to database', error as Error);
      throw handlePrismaError(error, 'database connection');
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnectedFlag = false;
      this.logger.info('Database connection closed');
    } catch (error) {
      this.logger.error('Failed to disconnect from database', error as Error);
      throw handlePrismaError(error, 'database disconnection');
    }
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.warn('Database health check failed', { error: (error as Error).message });
      return false;
    }
  }
}

/**
 * Abstract base adapter class for Prisma operations
 */
export abstract class PrismaAdapter<T, CreateData, UpdateData> 
  implements IBaseAdapter<T, CreateData, UpdateData>, ITransactionManager {
  
  protected readonly prisma: PrismaClient;
  protected readonly logger: IAdapterLogger;
  protected readonly connectionManager: PrismaConnectionManager;
  protected readonly retryConfig: RetryConfig;

  // Abstract properties to be implemented by subclasses
  protected abstract readonly modelName: string;
  protected abstract readonly delegate: any; // Prisma delegate (e.g., prisma.user, prisma.post)

  constructor(
    prisma?: PrismaClient,
    logger?: IAdapterLogger,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.prisma = prisma || new PrismaClient();
    this.logger = logger || createLogger(this.constructor.name);
    this.connectionManager = new PrismaConnectionManager(this.prisma, this.logger);
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Get connection manager instance
   */
  getConnectionManager(): IConnectionManager {
    return this.connectionManager;
  }

  /**
   * Execute operation with error handling and retry logic
   */
  protected async executeWithRetry<R>(
    operation: () => Promise<R>,
    operationName: string
  ): Promise<R> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Starting ${operationName}`, {
        model: this.modelName,
        timestamp: new Date().toISOString()
      });

      const result = await withRetry(operation, this.retryConfig, operationName);
      
      const duration = Date.now() - startTime;
      this.logger.debug(`Completed ${operationName}`, {
        model: this.modelName,
        duration,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed ${operationName}`, error as Error, {
        model: this.modelName,
        duration,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Create a new record
   */
  async create(data: CreateData, tx?: Prisma.TransactionClient): Promise<T> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client[this.modelName].create({
        data: this.addAuditFields(data, 'create')
      });
      
      this.logger.info(`Created ${this.modelName}`, {
        id: result.id,
        model: this.modelName
      });
      
      return result as T;
    }, `create ${this.modelName}`);
  }

  /**
   * Find a record by ID
   */
  async findById(id: string, options?: QueryOptions, tx?: Prisma.TransactionClient): Promise<T | null> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client[this.modelName].findFirst({
        where: { 
          id,
          deletedAt: null // Exclude soft-deleted records
        },
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug(`Found ${this.modelName} by ID`, {
        id,
        found: !!result,
        model: this.modelName
      });
      
      return result as T | null;
    }, `find ${this.modelName} by ID`);
  }

  /**
   * Find multiple records with optional filtering
   */
  async findMany(
    filter?: Record<string, unknown>,
    options?: QueryOptions,
    tx?: Prisma.TransactionClient
  ): Promise<T[]> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const where = {
        ...filter,
        deletedAt: null // Exclude soft-deleted records
      };

      const result = await client[this.modelName].findMany({
        where,
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug(`Found ${this.modelName} records`, {
        count: result.length,
        filter,
        model: this.modelName
      });
      
      return result as T[];
    }, `find many ${this.modelName}`);
  }

  /**
   * Find all records with pagination
   */
  async findAll(options?: QueryOptions, tx?: Prisma.TransactionClient): Promise<PaginatedResult<T>> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const where = { deletedAt: null }; // Exclude soft-deleted records
      
      // Get total count
      const totalCount = await client[this.modelName].count({ where });
      
      // Build pagination
      const take = options?.take || 10;
      const skip = options?.skip || 0;
      const currentPage = Math.floor(skip / take) + 1;
      const totalPages = Math.ceil(totalCount / take);
      
      // Get paginated data
      const data = await client[this.modelName].findMany({
        where,
        ...this.buildQueryOptions(options)
      });
      
      this.logger.debug(`Found all ${this.modelName} records`, {
        totalCount,
        currentPage,
        totalPages,
        take,
        skip,
        model: this.modelName
      });
      
      return {
        data: data as T[],
        totalCount,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        currentPage,
        totalPages
      };
    }, `find all ${this.modelName}`);
  }

  /**
   * Update a record by ID
   */
  async update(
    id: string,
    data: UpdateData,
    options?: QueryOptions,
    tx?: Prisma.TransactionClient
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client[this.modelName].update({
        where: { 
          id,
          deletedAt: null // Only update non-deleted records
        },
        data: this.addAuditFields(data, 'update'),
        ...this.buildQueryOptions(options)
      });
      
      this.logger.info(`Updated ${this.modelName}`, {
        id,
        model: this.modelName
      });
      
      return result as T;
    }, `update ${this.modelName}`);
  }

  /**
   * Delete a record by ID (hard delete)
   */
  async delete(id: string, tx?: Prisma.TransactionClient): Promise<T> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client[this.modelName].delete({
        where: { id }
      });
      
      this.logger.info(`Deleted ${this.modelName}`, {
        id,
        model: this.modelName
      });
      
      return result as T;
    }, `delete ${this.modelName}`);
  }

  /**
   * Soft delete a record by ID (sets deletedAt)
   */
  async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<T> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client[this.modelName].update({
        where: { 
          id,
          deletedAt: null // Only soft-delete non-deleted records
        },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      this.logger.info(`Soft deleted ${this.modelName}`, {
        id,
        model: this.modelName
      });
      
      return result as T;
    }, `soft delete ${this.modelName}`);
  }

  /**
   * Count records matching filter
   */
  async count(filter?: Record<string, unknown>, tx?: Prisma.TransactionClient): Promise<number> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const where = {
        ...filter,
        deletedAt: null // Exclude soft-deleted records
      };

      const count = await client[this.modelName].count({ where });
      
      this.logger.debug(`Counted ${this.modelName} records`, {
        count,
        filter,
        model: this.modelName
      });
      
      return count;
    }, `count ${this.modelName}`);
  }

  /**
   * Check if record exists by ID
   */
  async exists(id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client[this.modelName].findFirst({
        where: { 
          id,
          deletedAt: null // Exclude soft-deleted records
        },
        select: { id: true }
      });
      
      const exists = !!result;
      this.logger.debug(`Checked existence of ${this.modelName}`, {
        id,
        exists,
        model: this.modelName
      });
      
      return exists;
    }, `check existence of ${this.modelName}`);
  }

  /**
   * Bulk create records
   */
  async createMany(data: CreateData[], tx?: Prisma.TransactionClient): Promise<Prisma.BatchPayload> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const dataWithAudit = data.map(item => this.addAuditFields(item, 'create'));
      
      const result = await client[this.modelName].createMany({
        data: dataWithAudit,
        skipDuplicates: true
      });
      
      this.logger.info(`Bulk created ${this.modelName}`, {
        count: result.count,
        model: this.modelName
      });
      
      return result;
    }, `bulk create ${this.modelName}`);
  }

  /**
   * Bulk update records
   */
  async updateMany(
    filter: Record<string, unknown>,
    data: Partial<UpdateData>,
    tx?: Prisma.TransactionClient
  ): Promise<Prisma.BatchPayload> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const where = {
        ...filter,
        deletedAt: null // Only update non-deleted records
      };

      const result = await client[this.modelName].updateMany({
        where,
        data: this.addAuditFields(data, 'update')
      });
      
      this.logger.info(`Bulk updated ${this.modelName}`, {
        count: result.count,
        filter,
        model: this.modelName
      });
      
      return result;
    }, `bulk update ${this.modelName}`);
  }

  /**
   * Bulk delete records
   */
  async deleteMany(
    filter: Record<string, unknown>,
    tx?: Prisma.TransactionClient
  ): Promise<Prisma.BatchPayload> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client[this.modelName].deleteMany({
        where: filter
      });
      
      this.logger.info(`Bulk deleted ${this.modelName}`, {
        count: result.count,
        filter,
        model: this.modelName
      });
      
      return result;
    }, `bulk delete ${this.modelName}`);
  }

  /**
   * Execute raw SQL query
   */
  async executeRaw(sql: string, values?: unknown[], tx?: Prisma.TransactionClient): Promise<number> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      let result: number;
      
      if (values && values.length > 0) {
        // Create template literal array manually for parameterized queries
        const sqlParts = sql.split('?');
        const templateStrings = sqlParts;
        result = await client.$executeRaw(Prisma.sql(templateStrings, ...values));
      } else {
        // For non-parameterized queries, use executeRawUnsafe
        result = await client.$executeRawUnsafe(sql);
      }
      
      this.logger.debug('Executed raw SQL', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        valuesCount: values?.length || 0,
        affectedRows: result,
        model: this.modelName
      });
      
      return result;
    }, 'execute raw SQL');
  }

  /**
   * Execute raw SQL query and return results
   */
  async queryRaw<R = unknown>(sql: string, values?: unknown[], tx?: Prisma.TransactionClient): Promise<R> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      let result: unknown;
      
      if (values && values.length > 0) {
        // Create template literal array manually for parameterized queries
        const sqlParts = sql.split('?');
        const templateStrings = sqlParts;
        result = await client.$queryRaw(Prisma.sql(templateStrings, ...values));
      } else {
        // For non-parameterized queries, use queryRawUnsafe
        result = await client.$queryRawUnsafe(sql);
      }
      
      this.logger.debug('Executed raw SQL query', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        valuesCount: values?.length || 0,
        resultCount: Array.isArray(result) ? result.length : 1,
        model: this.modelName
      });
      
      return result as R;
    }, 'query raw SQL');
  }

  /**
   * Execute operations within a transaction
   */
  async executeTransaction<R>(
    callback: TransactionCallback<R>,
    options?: TransactionOptions
  ): Promise<R> {
    return this.executeWithRetry(async () => {
      const result = await this.prisma.$transaction(callback, {
        maxWait: options?.maxWait || 5000,
        timeout: options?.timeout || 10000
      });
      
      this.logger.info('Transaction completed successfully', {
        model: this.modelName
      });
      
      return result;
    }, 'transaction');
  }

  /**
   * Add audit fields to data based on operation
   */
  protected addAuditFields(data: any, operation: 'create' | 'update'): any {
    const now = new Date();
    
    if (operation === 'create') {
      return {
        ...data,
        createdAt: now,
        updatedAt: now
      };
    } else {
      return {
        ...data,
        updatedAt: now
      };
    }
  }

  /**
   * Build query options for Prisma operations
   */
  protected buildQueryOptions(options?: QueryOptions): any {
    if (!options) return {};
    
    const queryOptions: any = {};
    
    if (options.skip !== undefined) queryOptions.skip = options.skip;
    if (options.take !== undefined) queryOptions.take = options.take;
    if (options.cursor) queryOptions.cursor = options.cursor;
    if (options.orderBy) queryOptions.orderBy = options.orderBy;
    if (options.include) queryOptions.include = options.include;
    if (options.select) queryOptions.select = options.select;
    
    return queryOptions;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.connectionManager.disconnect();
  }
}