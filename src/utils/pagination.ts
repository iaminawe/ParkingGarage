/**
 * Pagination utilities for API responses
 *
 * This module provides utility functions for implementing pagination
 * in API responses, including offset/limit calculations and metadata.
 *
 * @module PaginationUtils
 */

// Additional types for pagination utilities
export interface PaginationQuery {
  limit?: string | number;
  offset?: string | number;
  [key: string]: unknown;
}

export interface PaginationResult {
  limit: number;
  offset: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
  nextOffset: number | null;
  prevOffset: number | null;
  totalCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    currentPage: number;
    totalPages: number;
    nextOffset: number | null;
    prevOffset: number | null;
    total: number;
  };
  metadata: {
    resultCount: number;
    timestamp: string;
    [key: string]: unknown;
  };
}

export interface PaginationLinks {
  self: string;
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
}

export interface FilterMetadata {
  totalAvailable: number;
  totalFiltered: number;
  filtersApplied: Record<string, unknown>;
  hasFilters: boolean;
}

/**
 * Calculate pagination parameters and validate input
 * @param query - Query parameters from request
 * @param totalCount - Total number of items available
 * @returns Pagination parameters and metadata
 */
export function calculatePagination(query: any, totalCount: number): PaginationResult {
  // Parse and validate limit
  let limit = parseInt(String(query.limit)) || 20;
  if (limit < 1) {
    limit = 20;
  }
  if (limit > 100) {
    limit = 100;
  }

  // Parse and validate offset
  let offset = parseInt(String(query.offset)) || 0;
  if (offset < 0) {
    offset = 0;
  }
  if (offset >= totalCount && totalCount > 0) {
    offset = 0;
  }

  // Calculate pagination metadata
  const hasMore = offset + limit < totalCount;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit);
  const nextOffset = hasMore ? offset + limit : null;
  const prevOffset = offset > 0 ? Math.max(0, offset - limit) : null;

  return {
    limit,
    offset,
    hasMore,
    currentPage,
    totalPages,
    nextOffset,
    prevOffset,
    totalCount,
  };
}

/**
 * Apply pagination to an array of items
 * @param items - Array of items to paginate
 * @param pagination - Pagination parameters from calculatePagination
 * @returns Paginated subset of items
 */
export function paginateArray<T>(items: T[], pagination: PaginationResult): T[] {
  const { offset, limit } = pagination;
  return items.slice(offset, offset + limit);
}

/**
 * Create pagination response object
 * @param items - Paginated items
 * @param pagination - Pagination metadata
 * @param metadata - Additional metadata (counts, etc.)
 * @returns Complete API response with pagination
 */
export function createPaginatedResponse<T>(
  items: T[],
  pagination: PaginationResult,
  metadata: Record<string, unknown> = {}
): PaginatedResponse<T> {
  return {
    data: items,
    pagination: {
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: pagination.hasMore,
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      nextOffset: pagination.nextOffset,
      prevOffset: pagination.prevOffset,
      total: pagination.totalCount,
    },
    metadata: {
      ...metadata,
      resultCount: items.length,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create pagination links for hypermedia API
 * @param baseUrl - Base URL for the resource
 * @param pagination - Pagination metadata
 * @param queryParams - Additional query parameters to include
 * @returns Links object with self, next, prev, first, last
 */
export function createPaginationLinks(
  baseUrl: string,
  pagination: PaginationResult,
  queryParams: Record<string, unknown> = {}
): PaginationLinks {
  const { limit, offset, totalPages, nextOffset, prevOffset } = pagination;

  // Create query string helper
  const createQuery = (offsetValue: number): string => {
    const params = new URLSearchParams();

    // Add all query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });

    params.set('limit', limit.toString());
    params.set('offset', offsetValue.toString());

    return params.toString();
  };

  const links: PaginationLinks = {
    self: `${baseUrl}?${createQuery(offset)}`,
  };

  // Add navigation links if applicable
  if (nextOffset !== null) {
    links.next = `${baseUrl}?${createQuery(nextOffset)}`;
  }

  if (prevOffset !== null) {
    links.prev = `${baseUrl}?${createQuery(prevOffset)}`;
  }

  // Add first and last page links
  if (totalPages > 1) {
    links.first = `${baseUrl}?${createQuery(0)}`;
    links.last = `${baseUrl}?${createQuery((totalPages - 1) * limit)}`;
  }

  return links;
}

/**
 * Parse and validate query parameters for filtering
 * @param query - Raw query parameters
 * @param allowedFilters - Array of allowed filter parameter names
 * @returns Parsed and validated filter parameters
 */
export function parseFilters(
  query: Record<string, unknown>,
  allowedFilters: string[] = []
): Record<string, unknown> {
  const filters: Record<string, unknown> = {};

  allowedFilters.forEach(filterName => {
    if (query[filterName] !== undefined && query[filterName] !== '') {
      filters[filterName] = query[filterName];
    }
  });

  return filters;
}

/**
 * Create metadata for filtered results
 * @param allItems - All items before filtering
 * @param filteredItems - Items after filtering
 * @param filters - Applied filters
 * @returns Metadata about filtering results
 */
export function createFilterMetadata<T>(
  allItems: T[],
  filteredItems: T[],
  filters: Record<string, unknown> = {}
): FilterMetadata {
  const hasFilters = Object.keys(filters).length > 0;

  return {
    totalAvailable: allItems.length,
    totalFiltered: filteredItems.length,
    filtersApplied: filters,
    hasFilters,
  };
}

/**
 * Custom error class for pagination validation errors
 */
export class PaginationError extends Error {
  public status: number;
  public errors: string[];

  constructor(message: string, errors: string[] = [], status = 400) {
    super(message);
    this.name = 'PaginationError';
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Validate pagination parameters and throw descriptive errors
 * @param query - Query parameters to validate
 * @throws PaginationError if pagination parameters are invalid
 */
export function validatePaginationParams(query: any): void {
  const errors: string[] = [];

  if (query.limit !== undefined) {
    const limit = parseInt(String(query.limit));
    if (isNaN(limit)) {
      errors.push('Limit must be a valid number');
    } else if (limit < 1) {
      errors.push('Limit must be greater than 0');
    } else if (limit > 100) {
      errors.push('Limit cannot exceed 100');
    }
  }

  if (query.offset !== undefined) {
    const offset = parseInt(String(query.offset));
    if (isNaN(offset)) {
      errors.push('Offset must be a valid number');
    } else if (offset < 0) {
      errors.push('Offset cannot be negative');
    }
  }

  if (errors.length > 0) {
    throw new PaginationError(`Invalid pagination parameters: ${errors.join(', ')}`, errors);
  }
}

/**
 * Type guard to check if pagination query has required parameters
 */
export function isValidPaginationQuery(query: unknown): query is PaginationQuery {
  return typeof query === 'object' && query !== null;
}

/**
 * Get safe pagination defaults
 */
export function getPaginationDefaults(): { limit: number; offset: number } {
  return { limit: 20, offset: 0 };
}

/**
 * Calculate page number from offset and limit
 */
export function getPageFromOffset(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1;
}

/**
 * Calculate offset from page number and limit
 */
export function getOffsetFromPage(page: number, limit: number): number {
  return Math.max(0, (page - 1) * limit);
}
