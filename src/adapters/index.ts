/**
 * Adapter exports
 * 
 * This module exports all adapter classes and interfaces
 * for use throughout the application.
 * 
 * @module Adapters
 */

// Base adapter and interfaces
export { PrismaAdapter, PrismaConnectionManager } from './PrismaAdapter';
export * from './interfaces/BaseAdapter';

// Concrete adapter implementations
export { VehicleAdapter } from './VehicleAdapter';
export type { VehicleCreateData, VehicleUpdateData } from './VehicleAdapter';

// Utility exports
export * from '../utils/prisma-errors';
export * from '../utils/logger';