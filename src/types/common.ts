/**
 * Common utility type definitions
 *
 * This module provides shared utility types, helper types, and common patterns
 * used throughout the application for type safety and consistency.
 */

// Utility types for making properties optional/required
// Note: Optional and RequiredFields are defined in models.ts
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type RequiredExcept<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>;

// Deep utility types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// Object manipulation types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Merge<T, U> = Prettify<T & U>;

export type Override<T, U> = Prettify<Omit<T, keyof U> & U>;

export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

// Array and tuple utilities
export type NonEmptyArray<T> = [T, ...T[]];
export type ArrayElement<T extends readonly unknown[]> = T extends readonly (infer E)[] ? E : never;
export type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer T] ? T : never;

// Function utilities
export type Parameters<T extends (...args: readonly unknown[]) => unknown> = T extends (
  ...args: infer P
) => unknown
  ? P
  : never;

export type ReturnType<T extends (...args: readonly unknown[]) => unknown> = T extends (
  ...args: readonly unknown[]
) => infer R
  ? R
  : unknown;

export type AsyncReturnType<T extends (...args: any[]) => Promise<any>> = T extends (
  ...args: any[]
) => Promise<infer R>
  ? R
  : never;

// Promise utilities
export type PromiseType<T extends Promise<unknown>> = T extends Promise<infer U> ? U : never;
export type MaybePromise<T> = T | Promise<T>;
export type Awaitable<T> = T | PromiseLike<T>;

// String utilities
export type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;
export type Split<S extends string, D extends string> = S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S];

export type Join<T extends readonly string[], D extends string> = T extends readonly [infer F, ...infer R]
  ? F extends string
    ? R extends readonly string[]
      ? R['length'] extends 0
        ? F
        : `${F}${D}${Join<R, D>}`
      : never
    : never
  : '';

// Type guards and predicates
export type TypeGuard<T, U extends T> = (value: T) => value is U;
export type Predicate<T> = (value: T) => boolean;
export type AsyncPredicate<T> = (value: T) => Promise<boolean>;

// Error handling types
export interface Result<T, E = Error> {
  success: true;
  data: T;
  error?: never;
}

export interface ErrorResult<T, E = Error> {
  success: false;
  data?: never;
  error: E;
}

export type ResultType<T, E = Error> = Result<T, E> | ErrorResult<T, E>;

export interface Option<T> {
  value?: T;
  hasValue: boolean;
}

// Event and callback types
export type EventCallback<T = any> = (event: T) => void;
export type AsyncEventCallback<T = any> = (event: T) => Promise<void>;
export type ErrorCallback = (error: Error) => void;

// Configuration and options types
export interface BaseConfig {
  enabled: boolean;
  debug?: boolean;
  timeout?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoff?: 'linear' | 'exponential';
  maxDelay?: number;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize?: number;
  cleanupInterval?: number;
}

// HTTP and API related types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type HttpStatusCode = number;
export type ContentType = 'application/json' | 'application/xml' | 'text/plain' | 'text/html' | string;

export interface RequestHeaders {
  [key: string]: string | string[] | undefined;
}

export interface ResponseMetadata {
  statusCode: HttpStatusCode;
  headers: RequestHeaders;
  timestamp: Date;
  requestId?: string;
  duration?: number;
}

// Pagination and sorting
export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  firstItem: number;
  lastItem: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortingQuery {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sortFields?: Array<{
    field: string;
    order: 'asc' | 'desc';
  }>;
}

export interface FilterQuery {
  [key: string]: any;
}

export interface SearchQuery extends PaginationQuery, SortingQuery {
  q?: string; // Search term
  filters?: FilterQuery;
}

// Date and time utilities
export type DateInput = string | number | Date;
export type TimeZone = string;
export type DateFormat = 'ISO' | 'UTC' | 'local' | string;

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeSpan {
  milliseconds: number;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
}

// ID and identifier types
export type UUID = string;
export type EntityId = string | number;
export type Slug = string;
export type Handle = string;

// Status and state types
export type Status = 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

// Generic service response types
// Note: ServiceResponse is defined in models.ts

// Note: PaginatedResponse is defined in api.ts

export interface BatchResponse<T = any> {
  successful: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Logging and monitoring types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
  requestId?: string;
  userId?: string;
}

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

// Environment and configuration
export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface EnvironmentConfig {
  name: Environment;
  debug: boolean;
  version: string;
  buildTime: Date;
}

// Generic factory and builder patterns
export interface Factory<T, Args extends any[] = []> {
  create(...args: Args): T;
}

export interface AsyncFactory<T, Args extends any[] = []> {
  create(...args: Args): Promise<T>;
}

export interface Builder<T> {
  build(): T;
}

// Event sourcing and CQRS patterns
export interface Event<T = any> {
  id: string;
  type: string;
  data: T;
  timestamp: Date;
  version: number;
  aggregateId?: string;
  userId?: string;
}

export interface Command<T = any> {
  id: string;
  type: string;
  data: T;
  timestamp: Date;
  userId?: string;
}

export interface Query<T = any> {
  id: string;
  type: string;
  parameters: T;
  timestamp: Date;
  userId?: string;
}

// Type-safe key-value stores
export interface KeyValueStore<K extends string | number | symbol = string, V = any> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  keys(): K[];
  values(): V[];
  entries(): Array<[K, V]>;
  size: number;
}

// Observer pattern types
export interface Observer<T = any> {
  update(data: T): void;
}

export interface Observable<T = any> {
  subscribe(observer: Observer<T>): () => void;
  unsubscribe(observer: Observer<T>): void;
  notify(data: T): void;
}

// State management types
export interface State<T = any> {
  current: T;
  previous?: T;
  timestamp: Date;
}

export interface StateTransition<T = any> {
  from: T;
  to: T;
  timestamp: Date;
  trigger?: string;
}

// Resource management
export interface Resource {
  id: string;
  type: string;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceManager<T extends Resource> {
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  get(id: string): Promise<T | null>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  list(query?: SearchQuery): Promise<BatchResponse<T>>;
}

// Type-safe dictionary/map types
export type Dictionary<T = any> = Record<string, T>;
export type NumericDictionary<T = any> = Record<number, T>;
export type ReadonlyDictionary<T = any> = Readonly<Record<string, T>>;

// Branded types for type safety
export type Brand<T, B> = T & { __brand: B };
export type Email = Brand<string, 'Email'>;
export type PhoneNumber = Brand<string, 'PhoneNumber'>;
export type URL = Brand<string, 'URL'>;
export type Base64 = Brand<string, 'Base64'>;

// Conditional types utilities
export type If<C extends boolean, T, F> = C extends true ? T : F;
export type IsNever<T> = [T] extends [never] ? true : false;
export type IsAny<T> = 0 extends 1 & T ? true : false;
export type IsUnknown<T> = IsNever<T> extends false ? T extends unknown ? unknown extends T ? true : false : false : false;

// Type assertion helpers
export interface TypeAssertion<T> {
  is: (value: unknown) => value is T;
  assert: (value: unknown) => T;
}

// Default export for namespace-style imports
const CommonTypes = {
  // Type placeholders for namespace organization
} as const;

export default CommonTypes;
