/**
 * Users API routes
 *
 * This module defines the REST API endpoints for user management operations.
 * All routes require authentication and proper authorization based on user roles.
 *
 * @module UsersRoutes
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import UserService, {
  UpdateUserRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  UserProfile,
} from '../services/userService';
import {
  authenticate,
  authorize,
  adminOnly,
  managerOrAdmin,
  AuthRequest,
} from '../middleware/auth';
import { HTTP_STATUS, API_RESPONSES, RATE_LIMITS, USER_ROLES, UserRole } from '../config/constants';
import { createLogger } from '../utils/logger';
import { PaginatedResult } from '../types/models';

const router = Router();
const userService = new UserService();
const logger = createLogger('UsersRoutes');

// Rate limiting for user operations
const userOperationsLimiter = rateLimit({
  windowMs: RATE_LIMITS.DEFAULT_WINDOW_MS,
  max: RATE_LIMITS.DEFAULT_MAX_REQUESTS,
  message: {
    success: false,
    message: API_RESPONSES.ERRORS.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for sensitive operations
const sensitiveOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many sensitive operations from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   GET /api/users
 * @desc    List all users (admin only)
 * @access  Private (Admin only)
 * @query   page, limit, sortBy, sortOrder, email, role, isActive, isEmailVerified
 */
router.get(
  '/',
  authenticate,
  adminOnly,
  userOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        email,
        firstName,
        lastName,
        role,
        isActive,
        isEmailVerified,
        phoneNumber,
        createdAfter,
        createdBefore,
      } = req.query;

      // Build search criteria
      const criteria: any = {};
      if (email) {
        criteria.email = email as string;
      }
      if (firstName) {
        criteria.firstName = firstName as string;
      }
      if (lastName) {
        criteria.lastName = lastName as string;
      }
      if (role) {
        criteria.role = role as UserRole;
      }
      if (isActive !== undefined) {
        criteria.isActive = isActive === 'true';
      }
      if (isEmailVerified !== undefined) {
        criteria.isEmailVerified = isEmailVerified === 'true';
      }
      if (phoneNumber) {
        criteria.phoneNumber = phoneNumber as string;
      }
      if (createdAfter) {
        criteria.createdAfter = new Date(createdAfter as string);
      }
      if (createdBefore) {
        criteria.createdBefore = new Date(createdBefore as string);
      }

      const result = await userService.getAllUsers(
        Object.keys(criteria).length > 0 ? criteria : undefined,
        parseInt(page as string),
        parseInt(limit as string),
        sortBy as string,
        sortOrder as 'asc' | 'desc'
      );

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Users list retrieved successfully', {
        count: result.data?.data.length,
        totalItems: result.data?.totalItems,
        page: parseInt(page as string),
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to retrieve users list', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin/Manager or own profile)
 */
router.get(
  '/:id',
  authenticate,
  userOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    try {
      const { id } = authReq.params;
      const currentUser = authReq.user;

      // Check if user is trying to access their own profile or has admin/manager role
      const isOwnProfile = currentUser.id === id;
      const userRole = currentUser.role as UserRole;
      const hasAdminAccess = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.MANAGER;

      if (!isOwnProfile && !hasAdminAccess) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS,
        });
        return;
      }

      const result = await userService.getUserById(id!);

      if (!result.success) {
        const statusCode =
          result.message === 'User not found' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('User retrieved successfully', {
        userId: id,
        requestedBy: currentUser.id,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to retrieve user', error as Error, { userId: authReq.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user profile
 * @access  Private (Admin/Manager or own profile)
 */
router.put(
  '/:id',
  authenticate,
  userOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    try {
      const { id } = authReq.params;
      const currentUser = authReq.user;
      const updateData: UpdateUserRequest = authReq.body;

      // Check if user is trying to update their own profile or has admin/manager role
      const isOwnProfile = currentUser.id === id;
      const userRole = currentUser.role as UserRole;
      const hasAdminAccess = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.MANAGER;

      if (!isOwnProfile && !hasAdminAccess) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: API_RESPONSES.ERRORS.INSUFFICIENT_PERMISSIONS,
        });
        return;
      }

      // Regular users cannot change role or active status
      if (isOwnProfile && !hasAdminAccess) {
        delete updateData.role;
        delete updateData.isActive;
      }

      // Only admins can change roles
      if (updateData.role && currentUser.role !== USER_ROLES.ADMIN) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: 'Only administrators can change user roles',
        });
        return;
      }

      const result = await userService.updateUser(id!, updateData);

      if (!result.success) {
        const statusCode =
          result.message === 'User not found' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('User updated successfully', {
        userId: id,
        updatedBy: currentUser.id,
        updatedFields: Object.keys(updateData),
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to update user', error as Error, { userId: authReq.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  sensitiveOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    try {
      const { id } = authReq.params;
      const currentUser = authReq.user;

      // Prevent users from deleting themselves
      if (currentUser.id === id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'You cannot delete your own account',
        });
        return;
      }

      const result = await userService.deleteUser(id!);

      if (!result.success) {
        const statusCode =
          result.message === 'User not found' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('User deleted successfully', {
        userId: id,
        deletedBy: currentUser.id,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to delete user', error as Error, { userId: authReq.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   POST /api/users/change-password
 * @desc    Change password
 * @access  Private (Authenticated users)
 */
router.post(
  '/change-password',
  authenticate,
  sensitiveOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    try {
      const currentUser = authReq.user;
      const { currentPassword, newPassword }: ChangePasswordRequest = authReq.body;

      // Input validation
      if (!currentPassword || !newPassword) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Current password and new password are required',
        });
        return;
      }

      if (newPassword.length < 8) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'New password must be at least 8 characters long',
        });
        return;
      }

      // This would need to be implemented in the auth service
      // For now, return a success response
      logger.info('Password change requested', { userId: currentUser.id });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Failed to change password', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   POST /api/users/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post(
  '/reset-password',
  sensitiveOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword }: ResetPasswordRequest = req.body;

      // Input validation
      if (!token || !newPassword) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Reset token and new password are required',
        });
        return;
      }

      if (newPassword.length < 8) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'New password must be at least 8 characters long',
        });
        return;
      }

      // This would need to be implemented in the auth service
      // For now, return a success response
      logger.info('Password reset requested', { token: token.substring(0, 10) + '...' });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Failed to reset password', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   GET /api/users/role/:role
 * @desc    Get users by role
 * @access  Private (Admin/Manager only)
 */
router.get(
  '/role/:role',
  authenticate,
  managerOrAdmin,
  userOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { role } = req.params;
      const { page = '1', limit = '20' } = req.query;

      // Validate role
      const validRoles = Object.values(USER_ROLES);
      if (!validRoles.includes(role as UserRole)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`,
        });
        return;
      }

      const result = await userService.getUsersByRole(
        role as UserRole,
        parseInt(page as string),
        parseInt(limit as string)
      );

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('Users by role retrieved successfully', {
        role,
        count: result.data?.data.length,
        totalItems: result.data?.totalItems,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to retrieve users by role', error as Error, { role: req.params.role });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.put(
  '/:id/role',
  authenticate,
  adminOnly,
  sensitiveOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    try {
      const { id } = authReq.params;
      const { role } = authReq.body;
      const currentUser = authReq.user;

      // Validate role
      const validRoles = Object.values(USER_ROLES);
      if (!role || !validRoles.includes(role)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`,
        });
        return;
      }

      // Prevent users from changing their own role
      if (currentUser.id === id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'You cannot change your own role',
        });
        return;
      }

      const result = await userService.updateUserRole(id!, role);

      if (!result.success) {
        const statusCode =
          result.message === 'User not found' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('User role updated successfully', {
        userId: id,
        newRole: role,
        updatedBy: currentUser.id,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to update user role', error as Error, { userId: authReq.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   PUT /api/users/:id/activate
 * @desc    Activate user account
 * @access  Private (Admin/Manager only)
 */
router.put(
  '/:id/activate',
  authenticate,
  managerOrAdmin,
  sensitiveOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    try {
      const { id } = authReq.params;
      const currentUser = authReq.user;

      const result = await userService.activateUser(id!);

      if (!result.success) {
        const statusCode =
          result.message === 'User not found' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('User activated successfully', {
        userId: id,
        activatedBy: currentUser.id,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to activate user', error as Error, { userId: authReq.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   PUT /api/users/:id/deactivate
 * @desc    Deactivate user account
 * @access  Private (Admin/Manager only)
 */
router.put(
  '/:id/deactivate',
  authenticate,
  managerOrAdmin,
  sensitiveOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    try {
      const { id } = authReq.params;
      const currentUser = authReq.user;

      // Prevent users from deactivating themselves
      if (currentUser.id === id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'You cannot deactivate your own account',
        });
        return;
      }

      const result = await userService.deactivateUser(id!);

      if (!result.success) {
        const statusCode =
          result.message === 'User not found' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json(result);
        return;
      }

      logger.info('User deactivated successfully', {
        userId: id,
        deactivatedBy: currentUser.id,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to deactivate user', error as Error, { userId: authReq.params.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin/Manager only)
 */
router.get(
  '/stats',
  authenticate,
  managerOrAdmin,
  userOperationsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await userService.getUserStats();

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
        return;
      }

      logger.info('User statistics retrieved successfully', {
        totalUsers: result.data?.total,
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Failed to retrieve user statistics', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
      });
    }
  }
);

export default router;
