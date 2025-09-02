/**
 * Session validation middleware
 *
 * This module provides Express middleware functions for validating
 * parking session management requests, including session parameters,
 * request bodies, query parameters, and session lifecycle operations.
 *
 * @module SessionValidation
 */

import { Request, Response, NextFunction } from 'express';
import { ParsedQs } from 'qs';
import { isValidLicensePlate } from '../../utils/validators';

// Request body interfaces
interface EndSessionRequestBody {
  reason?: string;
}

interface CancelSessionRequestBody {
  reason?: string;
}

interface ExtendSessionRequestBody {
  additionalHours: number;
}

interface SessionQueryParams extends ParsedQs {
  status?: string;
  dateRange?: string;
  search?: string;
  limit?: string;
  offset?: string;
  sort?: string;
  order?: string;
  period?: string;
  type?: string;
}

// Extend Request type to include our custom properties
interface TypedRequest<T = any, Q extends ParsedQs = ParsedQs> extends Request {
  body: T;
  query: Q;
}

/**
 * Validate session ID parameter
 * Ensures session ID is a valid string
 */
export const validateSessionId = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;
  const errors: string[] = [];

  if (!id) {
    errors.push('Session ID is required');
  } else if (typeof id !== 'string') {
    errors.push('Session ID must be a string');
  } else if (id.trim().length === 0) {
    errors.push('Session ID cannot be empty');
  } else if (id.length > 50) {
    errors.push('Session ID cannot exceed 50 characters');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    errors.push('Session ID can only contain letters, numbers, underscores, and hyphens');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid session ID',
      errors: errors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Validate session query parameters
 * Validates filtering, sorting, and pagination parameters for session listing
 */
export const validateSessionQuery = (
  req: TypedRequest<any, SessionQueryParams>,
  res: Response,
  next: NextFunction
): void => {
  const { status, dateRange, search, limit, offset, sort, order, period, type } = req.query;
  const errors: string[] = [];

  // Validate status filter
  if (status !== undefined) {
    const validStatuses = ['all', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      errors.push(`Invalid status filter. Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  // Validate dateRange filter
  if (dateRange !== undefined) {
    const validDateRanges = ['all', 'today', 'week', 'month', 'year'];
    if (!validDateRanges.includes(dateRange)) {
      errors.push(`Invalid dateRange filter. Must be one of: ${validDateRanges.join(', ')}`);
    }
  }

  // Validate search parameter
  if (search !== undefined) {
    if (typeof search !== 'string') {
      errors.push('Search parameter must be a string');
    } else if (search.length > 100) {
      errors.push('Search parameter cannot exceed 100 characters');
    }
  }

  // Validate limit parameter
  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be a number between 1 and 100');
    }
  }

  // Validate offset parameter
  if (offset !== undefined) {
    const offsetNum = parseInt(offset, 10);
    if (isNaN(offsetNum) || offsetNum < 0) {
      errors.push('Offset must be a non-negative number');
    }
  }

  // Validate sort parameter
  if (sort !== undefined) {
    const validSortFields = ['createdAt', 'endTime', 'duration', 'cost', 'licensePlate'];
    if (!validSortFields.includes(sort)) {
      errors.push(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`);
    }
  }

  // Validate order parameter
  if (order !== undefined) {
    const validOrders = ['asc', 'desc'];
    if (!validOrders.includes(order)) {
      errors.push(`Invalid order. Must be one of: ${validOrders.join(', ')}`);
    }
  }

  // Validate period parameter (for stats and analytics)
  if (period !== undefined) {
    const validPeriods = ['today', 'week', 'month', 'year', 'all', 'day'];
    if (!validPeriods.includes(period)) {
      errors.push(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
    }
  }

  // Validate analytics type parameter
  if (type !== undefined) {
    const validTypes = ['revenue', 'duration', 'peak', 'trends'];
    if (!validTypes.includes(type)) {
      errors.push(`Invalid analytics type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: errors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Validate end session request body
 * Validates optional reason parameter
 */
export const validateEndSessionRequest = (
  req: TypedRequest<EndSessionRequestBody>,
  res: Response,
  next: NextFunction
): void => {
  const { reason } = req.body;
  const errors: string[] = [];

  // Validate optional reason field
  if (reason !== undefined) {
    if (typeof reason !== 'string') {
      errors.push('Reason must be a string');
    } else if (reason.length > 500) {
      errors.push('Reason cannot exceed 500 characters');
    } else if (reason.trim().length === 0) {
      errors.push('Reason cannot be empty if provided');
    }
  }

  // Check for extra fields
  const allowedFields = ['reason'];
  const providedFields = Object.keys(req.body);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    errors.push(
      `Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${allowedFields.join(', ')}`
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid end session request',
      errors: errors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Validate cancel session request body
 * Validates optional reason parameter
 */
export const validateCancelSessionRequest = (
  req: TypedRequest<CancelSessionRequestBody>,
  res: Response,
  next: NextFunction
): void => {
  const { reason } = req.body;
  const errors: string[] = [];

  // Validate optional reason field
  if (reason !== undefined) {
    if (typeof reason !== 'string') {
      errors.push('Reason must be a string');
    } else if (reason.length > 500) {
      errors.push('Reason cannot exceed 500 characters');
    } else if (reason.trim().length === 0) {
      errors.push('Reason cannot be empty if provided');
    }
  }

  // Check for extra fields
  const allowedFields = ['reason'];
  const providedFields = Object.keys(req.body);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    errors.push(
      `Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${allowedFields.join(', ')}`
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid cancel session request',
      errors: errors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Validate extend session request body
 * Validates required additionalHours parameter
 */
export const validateExtendSessionRequest = (
  req: TypedRequest<ExtendSessionRequestBody>,
  res: Response,
  next: NextFunction
): void => {
  const { additionalHours } = req.body;
  const errors: string[] = [];

  // Validate required additionalHours field
  if (additionalHours === undefined || additionalHours === null) {
    errors.push('additionalHours is required');
  } else if (typeof additionalHours !== 'number') {
    errors.push('additionalHours must be a number');
  } else if (!Number.isFinite(additionalHours)) {
    errors.push('additionalHours must be a finite number');
  } else if (additionalHours <= 0) {
    errors.push('additionalHours must be a positive number');
  } else if (additionalHours > 48) {
    errors.push('additionalHours cannot exceed 48 hours');
  } else if (additionalHours !== Math.floor(additionalHours * 4) / 4) {
    errors.push('additionalHours must be in increments of 0.25 (15 minutes)');
  }

  // Check for extra fields
  const allowedFields = ['additionalHours'];
  const providedFields = Object.keys(req.body);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    errors.push(
      `Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${allowedFields.join(', ')}`
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid extend session request',
      errors: errors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Validate request body for JSON content type
 * Ensures the request has valid JSON content type header
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  const contentType = req.get('Content-Type');

  if (!contentType || !contentType.includes('application/json')) {
    res.status(400).json({
      success: false,
      message: 'Content-Type must be application/json',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Validate request body exists and is not empty
 * Ensures request body is present for POST requests
 */
export const validateRequestBody = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).json({
      success: false,
      message: 'Request body is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Sanitize session request data
 * Trims string values and normalizes data
 */
export const sanitizeSessionRequest = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    // Sanitize string fields
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string).trim();
      }
    });
  }

  next();
};
