/**
 * Middleware index
 * 
 * Central export point for all middleware functions in the application.
 * This module re-exports middleware from individual modules for easy
 * importing throughout the application.
 * 
 * @module MiddlewareIndex
 */

// Error handling middleware
export { default as errorHandler, AppError } from './errorHandler';

// All validation middleware
export * from './validation';

// Re-export validation middleware as a namespace for organized imports
export * as validation from './validation';