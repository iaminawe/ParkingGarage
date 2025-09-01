/**
 * Utility functions export index
 * 
 * This module re-exports all utility functions from their respective modules
 * providing a central import point for all utility functions.
 * 
 * @module UtilsIndex
 */

// Export all validation utilities and type guards
export {
  validateSpot,
  validateVehicle,
  validateGarageConfig,
  isValidSpotId,
  generateSpotId,
  isValidLicensePlate,
  isValidVehicleType,
  isValidSpotStatus,
  isValidSpotFeature,
  isValidRateType
} from './validators';

// Export all pagination utilities and types
export {
  calculatePagination,
  paginateArray,
  createPaginatedResponse,
  createPaginationLinks,
  parseFilters,
  createFilterMetadata,
  validatePaginationParams,
  PaginationError,
  isValidPaginationQuery,
  getPaginationDefaults,
  getPageFromOffset,
  getOffsetFromPage
} from './pagination';

// Export pagination types
export type {
  PaginationQuery,
  PaginationResult,
  PaginatedResponse,
  PaginationLinks,
  FilterMetadata
} from './pagination';

// Export string matching utilities and types
export {
  levenshteinDistance,
  calculateSimilarity,
  containsPartial,
  startsWith,
  endsWith,
  findFuzzyMatches,
  searchLicensePlates,
  normalizeLicensePlate,
  validateSearchTerm,
  isValidSearchMode,
  createSearchSuggestions,
  highlightMatches,
  getSearchStatistics
} from './stringMatcher';

// Export string matching types
export type {
  FuzzyMatch,
  FuzzyMatchOptions,
  LicensePlateSearchOptions,
  LicensePlateMatch,
  SearchMode
} from './stringMatcher';

// Export time calculation utilities and types
export {
  calculateParkingDuration,
  calculateBillableHours,
  minutesToHoursAndMinutes,
  millisecondsToMinutes,
  hoursToMinutes,
  formatDuration,
  isWithinGracePeriod,
  applyGracePeriod,
  getCurrentTimestamp,
  isValidTimestamp,
  getCurrentParkingDuration,
  calculateEstimatedCost,
  TimeCalculationError,
  convertDuration,
  safeDurationCalculation,
  parseTimeString,
  getTimezoneOffset,
  isSameDay
} from './timeCalculator';

// Export time calculation types
export type {
  ParkingDuration,
  HoursMinutesBreakdown,
  CostEstimation
} from './timeCalculator';

// Export seed data initializer
export { SeedDataInitializer } from './seedData';
export { default as seedDataInitializer } from './seedData';

// Common utility functions that could be useful across the application

/**
 * Sleep for a specified number of milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique ID using timestamp and random number
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${timestamp}-${randomPart}` : `${timestamp}-${randomPart}`;
}

/**
 * Deep clone an object using JSON parse/stringify
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param value - Value to check
 * @returns True if empty, false otherwise
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Capitalize the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert a string to title case
 * @param str - String to convert
 * @returns Title case string
 */
export function toTitleCase(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(/[\s\-_]+/)
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Truncate a string to a specified length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Round a number to a specified number of decimal places
 * @param num - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
export function roundToDecimals(num: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(num * multiplier) / multiplier;
}

/**
 * Clamp a number between min and max values
 * @param num - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped number
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Format a number as currency
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number, 
  currency: string = 'USD', 
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Debounce a function to prevent excessive calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle a function to limit execution frequency
 * @param func - Function to throttle
 * @param limit - Limit time in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T, 
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Retry a function with exponential backoff
 * @param func - Async function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise that resolves with the function result
 */
export async function retryWithBackoff<T>(
  func: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await func();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  
  throw new Error('Max attempts reached');
}