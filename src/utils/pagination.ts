/**
 * Pagination utilities for API responses
 *
 * This module provides utility functions for implementing pagination
 * in API responses, including offset/limit calculations and metadata.
 */

import { PaginationParams, PaginatedResponse } from '../types';

export interface PaginationCalculation {
  limit: number;
  offset: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
  nextOffset: number | null;
  prevOffset: number | null;
  totalCount: number;
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
  filtersApplied: Record<string, any>;
  hasFilters: boolean;
}

export interface PaginatedApiResponse<T> {
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
    [key: string]: any;
  };
}

/**
 * Calculate pagination parameters and validate input
 */
export function calculatePagination(query: PaginationParams, totalCount: number): PaginationCalculation {
  // Parse and validate limit
  let limit = parseInt(query.limit?.toString() || '20') || 20;
  if (limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  // Parse and validate offset
  let offset = parseInt(query.offset?.toString() || '0') || 0;
  if (offset < 0) offset = 0;
  if (offset >= totalCount && totalCount > 0) offset = 0;

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
    totalCount
  };
}

/**
 * Apply pagination to an array of items
 */
export function paginateArray<T>(items: T[], pagination: PaginationCalculation): T[] {
  const { offset, limit } = pagination;
  return items.slice(offset, offset + limit);
}

/**
 * Create pagination response object
 */
export function createPaginatedResponse<T>(
  items: T[], 
  pagination: PaginationCalculation, 
  metadata: Record<string, any> = {}
): PaginatedApiResponse<T> {
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
      total: pagination.totalCount
    },
    metadata: {
      ...metadata,
      resultCount: items.length,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Create pagination links for hypermedia API
 */
export function createPaginationLinks(
  baseUrl: string, 
  pagination: PaginationCalculation, 
  queryParams: Record<string, string> = {}
): PaginationLinks {
  const { limit, offset, hasMore, totalPages, nextOffset, prevOffset } = pagination;

  // Create query string helper
  const createQuery = (offsetValue: number): string => {
    const params = new URLSearchParams({
      ...queryParams,
      limit: limit.toString(),
      offset: offsetValue.toString()
    });
    return params.toString();
  };

  const links: PaginationLinks = {
    self: `${baseUrl}?${createQuery(offset)}`
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
 */
export function parseFilters(
  query: Record<string, any>, 
  allowedFilters: string[] = []
): Record<string, any> {
  const filters: Record<string, any> = {};

  allowedFilters.forEach(filterName => {
    if (query[filterName] !== undefined && query[filterName] !== '') {
      filters[filterName] = query[filterName];
    }
  });

  return filters;
}

/**
 * Create metadata for filtered results
 */
export function createFilterMetadata<T>(
  allItems: T[], 
  filteredItems: T[], 
  filters: Record<string, any> = {}
): FilterMetadata {
  const hasFilters = Object.keys(filters).length > 0;

  return {
    totalAvailable: allItems.length,
    totalFiltered: filteredItems.length,
    filtersApplied: filters,
    hasFilters
  };
}

/**
 * Validate pagination parameters and throw descriptive errors
 */
export function validatePaginationParams(query: PaginationParams): void {
  const errors: string[] = [];

  if (query.page !== undefined) {
    const page = parseInt(query.page?.toString() || '1');
    if (isNaN(page)) {
      errors.push('Page must be a valid number');
    } else if (page < 1) {
      errors.push('Page must be greater than 0');
    }
  }

  if (query.limit !== undefined) {
    const limit = parseInt(query.limit?.toString() || '20');
    if (isNaN(limit)) {
      errors.push('Limit must be a valid number');
    } else if (limit < 1) {
      errors.push('Limit must be greater than 0');
    } else if (limit > 100) {
      errors.push('Limit cannot exceed 100');
    }
  }

  if (errors.length > 0) {
    const error = new Error(`Invalid pagination parameters: ${errors.join(', ')}`);
    (error as any).status = 400;
    (error as any).errors = errors;
    throw error;
  }
}