/**
 * Database-related type definitions
 *
 * This module provides type definitions for database connections,
 * query results, transactions, and database service configurations.
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Database connection and configuration types
export interface DatabaseConfig {
  connectionTimeout?: number;
  queryTimeout?: number;
  maxConnections?: number;
  enableLogging?: boolean;
  logLevel?: 'query' | 'info' | 'warn' | 'error';
}

export interface ConnectionStats {
  isConnected: boolean;
  connectionCount: number;
  maxConnections: number;
  uptime: number;
  lastHealthCheck: Date | null;
  queryCount: number;
}

export interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'degraded';
  connectionCount: number;
  maxConnections: number;
  uptime: number;
  lastQuery: Date | null;
  queryCount: number;
  errorCount: number;
  version: string;
}

// Transaction types
export interface TransactionOptions {
  isolationLevel?: Prisma.TransactionIsolationLevel;
  maxWait?: number;
  timeout?: number;
}

export type DatabaseTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

// Query-related types
export interface QueryOptions {
  skip?: number;
  take?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
  where?: Record<string, any>;
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean>;
}

export interface PaginatedQuery extends QueryOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface QueryResult<T> {
  data: T;
  totalCount?: number;
  hasMore?: boolean;
  nextCursor?: string;
}

// Note: PaginatedResult is defined in models.ts

// Database operation result types
export interface DatabaseOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  affectedRows?: number;
  executionTime?: number;
}

export interface BulkOperationResult<T = any> {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    index: number;
    error: Error;
    data?: T;
  }>;
  results: T[];
}

// Connection pool types
export interface PoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
}

export interface PoolStats {
  size: number;
  available: number;
  borrowed: number;
  invalid: number;
  pending: number;
}

// Database migration types
export interface MigrationStatus {
  id: string;
  checksum: string;
  finished_at: Date | null;
  migration_name: string;
  logs: string | null;
  rolled_back_at: Date | null;
  started_at: Date;
  applied_steps_count: number;
}

export interface MigrationSummary {
  pending: MigrationStatus[];
  applied: MigrationStatus[];
  total: number;
  lastApplied: Date | null;
}

// Database backup types
export interface BackupConfig {
  path: string;
  format: 'sql' | 'json';
  compression: boolean;
  includeSchema: boolean;
  includeData: boolean;
  tables?: string[];
}

export interface BackupResult {
  success: boolean;
  path: string;
  size: number;
  duration: number;
  timestamp: Date;
  checksum?: string;
}

// Database monitoring types
export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
    max: number;
  };
  queries: {
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
  };
  performance: {
    slowQueries: number;
    lockWaits: number;
    deadlocks: number;
  };
  timestamp: Date;
}

// Error types
export interface DatabaseError extends Error {
  code: string;
  constraint?: string;
  table?: string;
  column?: string;
  detail?: string;
  hint?: string;
  query?: string;
  parameters?: any[];
}

export interface ConnectionError extends Error {
  code: 'CONNECTION_TIMEOUT' | 'CONNECTION_REFUSED' | 'CONNECTION_LOST' | 'AUTH_FAILED';
  host?: string;
  port?: number;
  database?: string;
}

// Raw query types
export type RawQueryResult = {
  [key: string]: any;
}[];

export interface RawQueryOptions {
  parameters?: any[];
  timeout?: number;
}

// Database event types for monitoring
export interface DatabaseEvent {
  type: 'query' | 'transaction' | 'connection' | 'error' | 'slow_query';
  timestamp: Date;
  duration?: number;
  query?: string;
  parameters?: any[];
  error?: Error;
  metadata?: Record<string, any>;
}

// Prisma-specific types
export type PrismaTransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
export type PrismaDelegate = PrismaClient[keyof PrismaClient] & {
  findMany: Function;
  findUnique: Function;
  create: Function;
  update: Function;
  delete: Function;
};

// Default export for namespace-style imports  
const DatabaseTypes = {
  // Type placeholders for namespace organization
} as const;

export default DatabaseTypes;
