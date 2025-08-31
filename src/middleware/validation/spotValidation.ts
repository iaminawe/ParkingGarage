/**
 * Spot validation middleware
 * 
 * This module provides Express middleware functions for validating
 * spot-related requests, including query parameters, route parameters,
 * and request bodies for spot operations.
 */

import { Request, Response, NextFunction } from 'express';
import { validatePaginationParams, parseFilters } from '../../utils/pagination';
import { isValidSpotId } from '../../utils/validators';
import { SpotStatus, SpotType, SpotFeature } from '../../types';

// Extend Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      filters?: Record<string, any>;
      includes?: string[];
      sort?: string;
      order?: 'asc' | 'desc';
    }
  }
}

/**
 * Validate spot query parameters for listing spots
 * Supports filtering by status, type, floor, bay and pagination
 */
export const validateSpotQuery = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Validate pagination parameters
    validatePaginationParams(req.query);
    
    // Define allowed filter parameters
    const allowedFilters = ['status', 'type', 'floor', 'bay'];
    
    // Parse and validate filters
    const filters = parseFilters(req.query, allowedFilters);
    
    // Validate specific filter values
    const errors: string[] = [];
    
    if (filters.status) {
      const validStatuses: SpotStatus[] = ['available', 'occupied'];
      if (!validStatuses.includes(filters.status as SpotStatus)) {
        errors.push(`Invalid status: ${filters.status}. Valid values: ${validStatuses.join(', ')}`);
      }
    }
    
    if (filters.type) {
      const validTypes: SpotType[] = ['compact', 'standard', 'oversized'];
      if (!validTypes.includes(filters.type as SpotType)) {
        errors.push(`Invalid type: ${filters.type}. Valid values: ${validTypes.join(', ')}`);
      }
    }
    
    if (filters.floor) {
      const floor = parseInt(filters.floor as string);
      if (isNaN(floor) || floor < 1) {
        errors.push('Floor must be a positive integer');
      } else {
        filters.floor = floor; // Convert to number
      }
    }
    
    if (filters.bay) {
      const bay = parseInt(filters.bay as string);
      if (isNaN(bay) || bay < 1) {
        errors.push('Bay must be a positive integer');
      } else {
        filters.bay = bay; // Convert to number
      }
    }
    
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: errors,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Store validated filters in request object
    req.filters = filters;
    next();
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      errors: error.errors || [error.message],
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Validate spot ID parameter in route
 */
export const validateSpotId = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;
  
  if (!id) {
    res.status(400).json({
      success: false,
      message: 'Spot ID is required',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  if (!isValidSpotId(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid spot ID format. Expected format: F{floor}-B{bay}-S{spot}',
      examples: ['F1-B2-S003', 'F2-B1-S015'],
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
};

/**
 * Validate spot update request body
 */
export const validateSpotUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const { status, type, features } = req.body;
  const errors: string[] = [];
  
  // Must have at least one field to update
  if (!status && !type && !features) {
    res.status(400).json({
      success: false,
      message: 'At least one field must be provided for update',
      validFields: ['status', 'type', 'features'],
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // Validate status if provided
  if (status !== undefined) {
    const validStatuses: SpotStatus[] = ['available', 'occupied'];
    if (!validStatuses.includes(status as SpotStatus)) {
      errors.push(`Invalid status: ${status}. Valid values: ${validStatuses.join(', ')}`);
    }
  }
  
  // Validate type if provided
  if (type !== undefined) {
    const validTypes: SpotType[] = ['compact', 'standard', 'oversized'];
    if (!validTypes.includes(type as SpotType)) {
      errors.push(`Invalid type: ${type}. Valid values: ${validTypes.join(', ')}`);
    }
  }
  
  // Validate features if provided
  if (features !== undefined) {
    if (!Array.isArray(features)) {
      errors.push('Features must be an array');
    } else {
      const validFeatures: SpotFeature[] = ['ev_charging', 'handicap'];
      const invalidFeatures = features.filter((f: any) => !validFeatures.includes(f));
      if (invalidFeatures.length > 0) {
        errors.push(`Invalid features: ${invalidFeatures.join(', ')}. Valid features: ${validFeatures.join(', ')}`);
      }
      
      // Check for duplicates
      const uniqueFeatures = [...new Set(features)];
      if (uniqueFeatures.length !== features.length) {
        errors.push('Features array cannot contain duplicates');
      }
    }
  }
  
  // Check for invalid fields
  const allowedFields = ['status', 'type', 'features'];
  const providedFields = Object.keys(req.body);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));
  
  if (invalidFields.length > 0) {
    errors.push(`Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${allowedFields.join(', ')}`);
  }
  
  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid update data',
      errors: errors,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
};

/**
 * Sanitize spot update data
 * Remove any undefined or null values and trim strings
 */
export const sanitizeSpotUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const updates: any = {};
  
  if (req.body.status && typeof req.body.status === 'string') {
    updates.status = req.body.status.trim().toLowerCase();
  }
  
  if (req.body.type && typeof req.body.type === 'string') {
    updates.type = req.body.type.trim().toLowerCase();
  }
  
  if (req.body.features && Array.isArray(req.body.features)) {
    updates.features = req.body.features
      .filter((f: any) => f && typeof f === 'string')
      .map((f: string) => f.trim().toLowerCase());
  }
  
  req.body = updates;
  next();
};

/**
 * Validate include parameters for detailed responses
 */
export const validateIncludeParams = (req: Request, res: Response, next: NextFunction): void => {
  const { include } = req.query;
  
  if (include) {
    const validIncludes = ['metadata', 'features', 'occupancy'];
    const includes = (include as string).split(',').map(i => i.trim().toLowerCase());
    const invalidIncludes = includes.filter(i => !validIncludes.includes(i));
    
    if (invalidIncludes.length > 0) {
      res.status(400).json({
        success: false,
        message: `Invalid include parameters: ${invalidIncludes.join(', ')}`,
        validIncludes: validIncludes,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    req.includes = includes;
  } else {
    req.includes = [];
  }
  
  next();
};

/**
 * Validate sort parameters
 */
export const validateSortParams = (req: Request, res: Response, next: NextFunction): void => {
  const { sort, order } = req.query;
  
  if (sort) {
    const validSortFields = ['id', 'floor', 'bay', 'spotNumber', 'type', 'status', 'updatedAt'];
    if (!validSortFields.includes(sort as string)) {
      res.status(400).json({
        success: false,
        message: `Invalid sort field: ${sort}`,
        validSortFields: validSortFields,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    req.sort = sort as string;
  }
  
  if (order) {
    const validOrders = ['asc', 'desc'];
    if (!validOrders.includes((order as string).toLowerCase())) {
      res.status(400).json({
        success: false,
        message: `Invalid sort order: ${order}`,
        validOrders: validOrders,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    req.order = (order as string).toLowerCase() as 'asc' | 'desc';
  } else {
    req.order = 'asc';
  }
  
  next();
};