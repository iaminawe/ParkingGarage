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
  isValidPaginationQuery,
  getPaginationDefaults,
  getPageFromOffset,
  getOffsetFromPage
} from './pagination';

export type {
  PaginationQuery,
  PaginationResult,
  PaginatedResponse,
  PaginationLinks,
  FilterMetadata
} from './pagination';

// Export all string matching utilities and types
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

export type {
  FuzzyMatch,
  FuzzyMatchOptions,
  LicensePlateSearchOptions,
  LicensePlateMatch,
  SearchMode
} from './stringMatcher';

// Export all time calculation utilities and types
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
  getCurrentParkingDuration,
  calculateEstimatedCost,
  convertDuration,
  safeDurationCalculation,
  parseTimeString,
  getTimezoneOffset,
  isSameDay,
  isValidTimestamp,
  TimeCalculationError
} from './timeCalculator';

export type {
  ParkingDuration,
  HoursMinutesBreakdown,
  CostEstimation
} from './timeCalculator';

// Note: All utility functions have been removed from this index as they were unused.
// The project uses direct imports from specific modules (e.g., './validators', './pagination')
// rather than importing from this index file.