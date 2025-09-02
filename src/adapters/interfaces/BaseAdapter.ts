/**
 * Base adapter interface definitions
 * 
 * These interfaces define the contract for database adapters,
 * providing standardized CRUD operations with proper typing.
 * 
 * @module BaseAdapter
 */

import { Prisma } from '@prisma/client';

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  skip?: number;
  take?: number;
  cursor?: Record<string, unknown>;
}

/**
 * Sorting options for queries
 */
export interface SortOptions {
  orderBy?: Record<string, 'asc' | 'desc'>;
}

/**
 * Query options combining pagination and sorting
 */
export interface QueryOptions extends PaginationOptions, SortOptions {
  include?: Record<string, boolean | Record<string, unknown>>;
  select?: Record<string, boolean>;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
  totalPages: number;
}

/**
 * Base adapter interface for all database operations
 */
export interface IBaseAdapter<T, CreateData, UpdateData> {
  /**
   * Create a new record
   */
  create(data: CreateData, tx?: Prisma.TransactionClient): Promise<T>;

  /**
   * Find a record by ID
   */
  findById(id: string, options?: QueryOptions, tx?: Prisma.TransactionClient): Promise<T | null>;

  /**
   * Find multiple records with optional filtering
   */
  findMany(
    filter?: Record<string, unknown>,
    options?: QueryOptions,
    tx?: Prisma.TransactionClient
  ): Promise<T[]>;

  /**
   * Find all records with pagination
   */
  findAll(options?: QueryOptions, tx?: Prisma.TransactionClient): Promise<PaginatedResult<T>>;

  /**
   * Update a record by ID
   */
  update(
    id: string,
    data: UpdateData,
    options?: QueryOptions,
    tx?: Prisma.TransactionClient
  ): Promise<T>;

  /**
   * Delete a record by ID
   */
  delete(id: string, tx?: Prisma.TransactionClient): Promise<T>;

  /**
   * Soft delete a record by ID (sets deletedAt)
   */
  softDelete(id: string, tx?: Prisma.TransactionClient): Promise<T>;

  /**
   * Count records matching filter
   */
  count(filter?: Record<string, unknown>, tx?: Prisma.TransactionClient): Promise<number>;

  /**
   * Check if record exists by ID
   */
  exists(id: string, tx?: Prisma.TransactionClient): Promise<boolean>;

  /**
   * Bulk create records
   */
  createMany(data: CreateData[], tx?: Prisma.TransactionClient): Promise<Prisma.BatchPayload>;

  /**
   * Bulk update records
   */
  updateMany(
    filter: Record<string, unknown>,
    data: Partial<UpdateData>,
    tx?: Prisma.TransactionClient
  ): Promise<Prisma.BatchPayload>;

  /**
   * Bulk delete records
   */
  deleteMany(
    filter: Record<string, unknown>,
    tx?: Prisma.TransactionClient
  ): Promise<Prisma.BatchPayload>;

  /**
   * Execute raw SQL query
   */
  executeRaw(sql: string, values?: unknown[], tx?: Prisma.TransactionClient): Promise<number>;

  /**
   * Execute raw SQL query and return results
   */
  queryRaw<R = unknown>(sql: string, values?: unknown[], tx?: Prisma.TransactionClient): Promise<R>;
}

/**
 * Transaction callback type
 */
export type TransactionCallback<T> = (tx: Prisma.TransactionClient) => Promise<T>;

/**
 * Transaction options
 */
export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
}

/**
 * Base transaction interface
 */
export interface ITransactionManager {
  /**
   * Execute operations within a transaction
   */
  executeTransaction<T>(
    callback: TransactionCallback<T>,
    options?: TransactionOptions
  ): Promise<T>;
}

/**
 * Logger interface for adapter operations
 */
export interface IAdapterLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

/**
 * Connection manager interface
 */
export interface IConnectionManager {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  healthCheck(): Promise<boolean>;
}

/**
 * Audit fields interface
 */
export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}