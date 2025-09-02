import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';
import { User } from '@prisma/client';
import { 
  API_RESPONSES, 
  HTTP_STATUS, 
  SECURITY,
  USER_ROLES,
  type UserRole 
} from '../config/constants';

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
 * Authentication middleware to verify JWT tokens
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

    // Add user to request object
    req.user = user;
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
 * Authorization middleware to check user roles
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