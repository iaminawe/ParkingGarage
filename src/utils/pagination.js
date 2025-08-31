/**
 * Pagination utilities for API responses
 *
 * This module provides utility functions for implementing pagination
 * in API responses, including offset/limit calculations and metadata.
 *
 * @module PaginationUtils
 */

/**
 * Calculate pagination parameters and validate input
 * @param {Object} query - Query parameters from request
 * @param {number} query.limit - Items per page (default: 20, max: 100)
 * @param {number} query.offset - Number of items to skip (default: 0)
 * @param {number} totalCount - Total number of items available
 * @returns {Object} Pagination parameters and metadata
 */
function calculatePagination(query, totalCount) {
  // Parse and validate limit
  let limit = parseInt(query.limit) || 20;
  if (limit < 1) {limit = 20;}
  if (limit > 100) {limit = 100;}

  // Parse and validate offset
  let offset = parseInt(query.offset) || 0;
  if (offset < 0) {offset = 0;}
  if (offset >= totalCount && totalCount > 0) {offset = 0;}

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
 * @param {Array} items - Array of items to paginate
 * @param {Object} pagination - Pagination parameters from calculatePagination
 * @returns {Array} Paginated subset of items
 */
function paginateArray(items, pagination) {
  const { offset, limit } = pagination;
  return items.slice(offset, offset + limit);
}

/**
 * Create pagination response object
 * @param {Array} items - Paginated items
 * @param {Object} pagination - Pagination metadata
 * @param {Object} metadata - Additional metadata (counts, etc.)
 * @returns {Object} Complete API response with pagination
 */
function createPaginatedResponse(items, pagination, metadata = {}) {
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
 * @param {string} baseUrl - Base URL for the resource
 * @param {Object} pagination - Pagination metadata
 * @param {Object} queryParams - Additional query parameters to include
 * @returns {Object} Links object with self, next, prev, first, last
 */
function createPaginationLinks(baseUrl, pagination, queryParams = {}) {
  const { limit, offset, hasMore, totalPages, nextOffset, prevOffset } = pagination;

  // Create query string helper
  const createQuery = (offsetValue) => {
    const params = new URLSearchParams({
      ...queryParams,
      limit: limit.toString(),
      offset: offsetValue.toString()
    });
    return params.toString();
  };

  const links = {
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
 * @param {Object} query - Raw query parameters
 * @param {string[]} allowedFilters - Array of allowed filter parameter names
 * @returns {Object} Parsed and validated filter parameters
 */
function parseFilters(query, allowedFilters = []) {
  const filters = {};

  allowedFilters.forEach(filterName => {
    if (query[filterName] !== undefined && query[filterName] !== '') {
      filters[filterName] = query[filterName];
    }
  });

  return filters;
}

/**
 * Create metadata for filtered results
 * @param {Array} allItems - All items before filtering
 * @param {Array} filteredItems - Items after filtering
 * @param {Object} filters - Applied filters
 * @returns {Object} Metadata about filtering results
 */
function createFilterMetadata(allItems, filteredItems, filters = {}) {
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
 * @param {Object} query - Query parameters to validate
 * @throws {Error} If pagination parameters are invalid
 */
function validatePaginationParams(query) {
  const errors = [];

  if (query.limit !== undefined) {
    const limit = parseInt(query.limit);
    if (isNaN(limit)) {
      errors.push('Limit must be a valid number');
    } else if (limit < 1) {
      errors.push('Limit must be greater than 0');
    } else if (limit > 100) {
      errors.push('Limit cannot exceed 100');
    }
  }

  if (query.offset !== undefined) {
    const offset = parseInt(query.offset);
    if (isNaN(offset)) {
      errors.push('Offset must be a valid number');
    } else if (offset < 0) {
      errors.push('Offset cannot be negative');
    }
  }

  if (errors.length > 0) {
    const error = new Error(`Invalid pagination parameters: ${errors.join(', ')}`);
    error.status = 400;
    error.errors = errors;
    throw error;
  }
}

module.exports = {
  calculatePagination,
  paginateArray,
  createPaginatedResponse,
  createPaginationLinks,
  parseFilters,
  createFilterMetadata,
  validatePaginationParams
};
