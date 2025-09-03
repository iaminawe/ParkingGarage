/**
 * Central type exports for the Parking Garage API
 * This file provides a single point of entry for all type definitions
 */

// Re-export all types from their respective modules
export type * from './models';
export type * from './server';
export type * from './middleware';
// Export from api last to resolve any export conflicts
export type * from './api';

/**
 * Type utility for creating read-only deep objects
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Type utility for making all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Type utility for strict object keys
 */
export type StrictExtract<T, U extends T> = T extends U ? T : never;

/**
 * Type utility for non-nullable types
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Type utility for promise return types
 */
export type PromiseType<T extends Promise<unknown>> = T extends Promise<infer U> ? U : never;

/**
 * Type utility for function parameters
 */
export type Parameters<T extends (...args: readonly unknown[]) => unknown> = T extends (
  ...args: infer P
) => unknown
  ? P
  : never;

/**
 * Type utility for function return types
 */
export type ReturnType<T extends (...args: readonly unknown[]) => unknown> = T extends (
  ...args: readonly unknown[]
) => infer R
  ? R
  : unknown;
