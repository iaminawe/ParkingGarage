import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';
import { User } from '@prisma/client';
import { 
  API_RESPONSES, 
  HTTP_STATUS, 
  SECURITY,
  USER_ROLES,
  UTILS,
  type UserRole 
} from '../config/constants';
import { prisma } from '../config/database';
import { CacheService } from '../services/CacheService';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuthRequest extends Request {
  user: User;
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

/**
 * Authentication middleware to verify JWT tokens with token blacklisting support
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: API_RESPONSES.ERRORS.TOKEN_REQUIRED
      });
      return;
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith(SECURITY.BEARER_PREFIX) 
      ? authHeader.slice(SECURITY.BEARER_PREFIX.length) 
      : authHeader;

    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: API_RESPONSES.ERRORS.TOKEN_REQUIRED
      });
      return;
    }

    // Check token blacklist first for performance
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: API_RESPONSES.ERRORS.INVALID_TOKEN
      });
      return;
    }

    // Get user by token
    const user = await authService.getUserByToken(token);
    
    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: API_RESPONSES.ERRORS.INVALID_TOKEN
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: API_RESPONSES.ERRORS.ACCOUNT_DEACTIVATED
      });
      return;
    }

    // Add user and token to request object for potential blacklisting on logout
    req.user = user;
    (req as any).token = token;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: API_RESPONSES.ERRORS.INTERNAL_ERROR
    });
  }
};

/**
 * Authorization middleware to check user roles with enhanced permission system
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: API_RESPONSES.ERRORS.TOKEN_REQUIRED
        });
        return;
      }

      if (!allowedRoles.includes(user.role as UserRole)) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: API_RESPONSES.ERRORS.TOKEN_REQUIRED
        });
        return;
      }

      if (!UTILS.hasPermission(user.role as UserRole, permission)) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  };
};

/**
 * Role hierarchy middleware - checks if user has at least the required role level
 */
export const requireRoleLevel = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: API_RESPONSES.ERRORS.TOKEN_REQUIRED
        });
        return;
      }

      if (!UTILS.hasRoleLevel(user.role as UserRole, requiredRole)) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role level check error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR
      });
    }
  };
};

/**
 * Session limit middleware - prevents too many concurrent sessions per user
 */
export const enforceSessionLimit = (maxSessions = 5) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next();
        return;
      }

      const activeSessionCount = await authService.getActiveSessionCount(req.user.id);
      
      if (activeSessionCount > maxSessions) {
        // Revoke oldest session if limit exceeded
        await authService.revokeOldestSession(req.user.id);
      }

      next();
    } catch (error) {
      console.error('Session limit check error:', error);
      // Don't block request on session limit error - log and continue
      next();
    }
  };
};

/**
 * Optional authentication middleware - adds user to request if token is valid, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (token) {
        const user = await authService.getUserByToken(token);
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without authentication
  }
};

// Common role combinations with type safety
export const adminOnly = authorize([USER_ROLES.ADMIN]);
export const managerOrAdmin = authorize([USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
export const operatorOrHigher = authorize([USER_ROLES.OPERATOR, USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
export const authenticatedUsers = authorize([USER_ROLES.USER, USER_ROLES.OPERATOR, USER_ROLES.MANAGER, USER_ROLES.ADMIN]);

// Permission-based authorization shortcuts
export const canManageUsers = requirePermission('users:manage');
export const canViewReports = requirePermission('reports:read');
export const canManageGarage = requirePermission('garage:manage');
export const canManageVehicles = requirePermission('vehicles:manage');

// Role hierarchy shortcuts
export const requireManager = requireRoleLevel(USER_ROLES.MANAGER);
export const requireOperator = requireRoleLevel(USER_ROLES.OPERATOR);

// Role checking utilities
export const hasRole = (user: User | undefined, role: UserRole): boolean => {
  return user?.role === role;
};

export const hasAnyRole = (user: User | undefined, roles: UserRole[]): boolean => {
  return user ? roles.includes(user.role as UserRole) : false;
};

export const isAdmin = (user: User | undefined): boolean => {
  return hasRole(user, USER_ROLES.ADMIN);
};

export const isManagerOrHigher = (user: User | undefined): boolean => {
  return hasAnyRole(user, [USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
};

/**
 * Check if user has specific permission
 */
export const userHasPermission = (user: User | undefined, permission: string): boolean => {
  if (!user) return false;
  return UTILS.hasPermission(user.role as UserRole, permission);
};

/**
 * Get user's role level for comparison
 */
export const getUserRoleLevel = (user: User | undefined): number => {
  if (!user) return 0;
  return UTILS.hasRoleLevel(user.role as UserRole, USER_ROLES.USER) ? 
    (user.role === USER_ROLES.ADMIN ? 4 : 
     user.role === USER_ROLES.MANAGER ? 3 : 
     user.role === USER_ROLES.OPERATOR ? 2 : 1) : 0;
};