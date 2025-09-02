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
// VehicleAdapter removed - using VehicleRepository with PrismaAdapter directly
// VehicleAdapter types removed - using direct Prisma types

// Utility exports
export * from '../utils/prisma-errors';
export * from '../utils/logger';