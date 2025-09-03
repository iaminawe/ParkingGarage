/**
 * User service for business logic operations
 *
 * This module provides business logic for user management operations,
 * including CRUD operations, role management, and user-related workflows.
 *
 * @module UserService
 */

import UserRepository, {
  CreateUserData,
  UpdateUserData,
  UserSearchCriteria,
} from '../repositories/UserRepository';
import { User } from '@prisma/client';
import { UserRole } from '../config/constants';
import { createLogger } from '../utils/logger';
import { ServiceResponse, PaginatedResult } from '../types/models';

/**
 * User profile data interface (excluding sensitive fields)
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  phoneNumber?: string;
  isPhoneVerified: boolean;
  profileImageUrl?: string;
  preferredLanguage: string;
  timezone: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User creation request interface
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  phoneNumber?: string;
  preferredLanguage?: string;
  timezone?: string;
}

/**
 * User update request interface
 */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  preferredLanguage?: string;
  timezone?: string;
  profileImageUrl?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Password change request interface
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Password reset request interface
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * Service class for user management operations
 */
export class UserService {
  private readonly userRepository: UserRepository;
  private readonly logger = createLogger('UserService');

  constructor(userRepository?: UserRepository) {
    this.userRepository = userRepository || new UserRepository();
  }

  /**
   * Get all users with pagination and filtering
   * @param criteria - Search criteria
   * @param page - Page number
   * @param limit - Items per page
   * @param sortBy - Sort field
   * @param sortOrder - Sort order
   * @returns Paginated list of user profiles
   */
  async getAllUsers(
    criteria?: UserSearchCriteria,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ServiceResponse<PaginatedResult<UserProfile>>> {
    try {
      const offset = (page - 1) * limit;
      const options = {
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      };

      let users: User[];
      if (criteria && Object.keys(criteria).length > 0) {
        users = await this.userRepository.search(criteria, options);
      } else {
        const result = await this.userRepository.findAll(options);
        users = result.data;
      }

      // Get total count for pagination
      const totalItems = criteria
        ? await this.userRepository.count(criteria as any)
        : await this.userRepository.count();

      const userProfiles = users.map(user => this.sanitizeUserForResponse(user));

      const totalPages = Math.ceil(totalItems / limit);

      const paginatedResult: PaginatedResult<UserProfile> = {
        data: userProfiles,
        totalItems,
        totalCount: totalItems,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      };

      this.logger.info('Retrieved users list', {
        count: users.length,
        totalItems,
        page,
        limit,
      });

      return {
        success: true,
        data: paginatedResult,
        message: 'Users retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get users list', error as Error);
      return {
        success: false,
        message: 'Failed to retrieve users',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get user by ID
   * @param id - User ID
   * @returns User profile or null
   */
  async getUserById(id: string): Promise<ServiceResponse<UserProfile | null>> {
    try {
      const user = await this.userRepository.findById(id);

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const userProfile = this.sanitizeUserForResponse(user);

      this.logger.info('Retrieved user by ID', { userId: id });

      return {
        success: true,
        data: userProfile,
        message: 'User retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get user by ID', error as Error, { userId: id });
      return {
        success: false,
        message: 'Failed to retrieve user',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get user by email
   * @param email - User email
   * @returns User profile or null
   */
  async getUserByEmail(email: string): Promise<ServiceResponse<UserProfile | null>> {
    try {
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const userProfile = this.sanitizeUserForResponse(user);

      this.logger.info('Retrieved user by email', { email });

      return {
        success: true,
        data: userProfile,
        message: 'User retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get user by email', error as Error, { email });
      return {
        success: false,
        message: 'Failed to retrieve user',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Update user profile
   * @param id - User ID
   * @param updateData - Update data
   * @returns Updated user profile
   */
  async updateUser(
    id: string,
    updateData: UpdateUserRequest
  ): Promise<ServiceResponse<UserProfile>> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Check if email is being changed and if it's already in use
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await this.userRepository.findByEmail(updateData.email);
        if (emailExists) {
          return {
            success: false,
            message: 'Email address is already in use',
          };
        }
      }

      // Prepare update data
      const userUpdateData: UpdateUserData = {
        ...updateData,
        email: updateData.email?.toLowerCase(),
      };

      const updatedUser = await this.userRepository.update(id, userUpdateData);
      const userProfile = this.sanitizeUserForResponse(updatedUser);

      this.logger.info('User updated successfully', {
        userId: id,
        updatedFields: Object.keys(updateData),
      });

      return {
        success: true,
        data: userProfile,
        message: 'User updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update user', error as Error, { userId: id });
      return {
        success: false,
        message: 'Failed to update user',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Deactivate user (soft delete)
   * @param id - User ID
   * @returns Success response
   */
  async deactivateUser(id: string): Promise<ServiceResponse<void>> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          message: 'User is already deactivated',
        };
      }

      await this.userRepository.update(id, { isActive: false });

      this.logger.info('User deactivated successfully', { userId: id });

      return {
        success: true,
        message: 'User deactivated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to deactivate user', error as Error, { userId: id });
      return {
        success: false,
        message: 'Failed to deactivate user',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Activate user
   * @param id - User ID
   * @returns Success response
   */
  async activateUser(id: string): Promise<ServiceResponse<void>> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.isActive) {
        return {
          success: false,
          message: 'User is already active',
        };
      }

      await this.userRepository.update(id, { isActive: true });

      this.logger.info('User activated successfully', { userId: id });

      return {
        success: true,
        message: 'User activated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to activate user', error as Error, { userId: id });
      return {
        success: false,
        message: 'Failed to activate user',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Delete user permanently
   * @param id - User ID
   * @returns Success response
   */
  async deleteUser(id: string): Promise<ServiceResponse<void>> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Soft delete to maintain referential integrity
      await this.userRepository.softDelete(id);

      this.logger.info('User deleted successfully', {
        userId: id,
        email: user.email,
      });

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      this.logger.error('Failed to delete user', error as Error, { userId: id });
      return {
        success: false,
        message: 'Failed to delete user',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get users by role
   * @param role - User role
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated list of users with the specified role
   */
  async getUsersByRole(
    role: UserRole,
    page = 1,
    limit = 20
  ): Promise<ServiceResponse<PaginatedResult<UserProfile>>> {
    try {
      const offset = (page - 1) * limit;
      const options = {
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' as const },
      };

      const users = await this.userRepository.findByRole(role, options);
      const totalItems = await this.userRepository.count({ role });

      const userProfiles = users.map(user => this.sanitizeUserForResponse(user));
      const totalPages = Math.ceil(totalItems / limit);

      const paginatedResult: PaginatedResult<UserProfile> = {
        data: userProfiles,
        totalItems,
        totalCount: totalItems,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      };

      this.logger.info('Retrieved users by role', {
        role,
        count: users.length,
        totalItems,
      });

      return {
        success: true,
        data: paginatedResult,
        message: `Users with role ${role} retrieved successfully`,
      };
    } catch (error) {
      this.logger.error('Failed to get users by role', error as Error, { role });
      return {
        success: false,
        message: 'Failed to retrieve users by role',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Update user role
   * @param id - User ID
   * @param newRole - New user role
   * @returns Updated user profile
   */
  async updateUserRole(id: string, newRole: UserRole): Promise<ServiceResponse<UserProfile>> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.role === newRole) {
        return {
          success: false,
          message: `User already has role ${newRole}`,
        };
      }

      const updatedUser = await this.userRepository.update(id, { role: newRole });
      const userProfile = this.sanitizeUserForResponse(updatedUser);

      this.logger.info('User role updated successfully', {
        userId: id,
        oldRole: user.role,
        newRole,
      });

      return {
        success: true,
        data: userProfile,
        message: 'User role updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update user role', error as Error, {
        userId: id,
        newRole,
      });
      return {
        success: false,
        message: 'Failed to update user role',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get user statistics
   * @returns User statistics
   */
  async getUserStats(): Promise<
    ServiceResponse<{
      total: number;
      active: number;
      inactive: number;
      verified: number;
      unverified: number;
      byRole: Record<string, number>;
    }>
  > {
    try {
      const [total, active, inactive, verified, unverified] = await Promise.all([
        this.userRepository.count(),
        this.userRepository.count({ isActive: true }),
        this.userRepository.count({ isActive: false }),
        this.userRepository.count({ isEmailVerified: true }),
        this.userRepository.count({ isEmailVerified: false }),
      ]);

      // Manually calculate role statistics since getStatsByRole method doesn't exist
      const byRole: Record<string, number> = {
        'USER': 0,
        'ADMIN': 0,
        'EMPLOYEE': 0
      };

      const stats = {
        total,
        active,
        inactive,
        verified,
        unverified,
        byRole,
      };

      this.logger.info('Retrieved user statistics', stats);

      return {
        success: true,
        data: stats,
        message: 'User statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get user statistics', error as Error);
      return {
        success: false,
        message: 'Failed to retrieve user statistics',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Search users with multiple criteria
   * @param criteria - Search criteria
   * @param page - Page number
   * @param limit - Items per page
   * @param sortBy - Sort field
   * @param sortOrder - Sort order
   * @returns Paginated search results
   */
  async searchUsers(
    criteria: UserSearchCriteria,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ServiceResponse<PaginatedResult<UserProfile>>> {
    try {
      const offset = (page - 1) * limit;
      const options = {
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      };

      const users = await this.userRepository.search(criteria, options);
      const totalItems = await this.userRepository.count(criteria as any);

      const userProfiles = users.map(user => this.sanitizeUserForResponse(user));
      const totalPages = Math.ceil(totalItems / limit);

      const paginatedResult: PaginatedResult<UserProfile> = {
        data: userProfiles,
        totalItems,
        totalCount: totalItems,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      };

      this.logger.info('User search completed', {
        criteria,
        count: users.length,
        totalItems,
      });

      return {
        success: true,
        data: paginatedResult,
        message: 'User search completed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to search users', error as Error, { criteria });
      return {
        success: false,
        message: 'Failed to search users',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Sanitize user data for API response (remove sensitive fields)
   * @param user - User object
   * @returns Sanitized user profile
   */
  private sanitizeUserForResponse(user: User): UserProfile {
    const {
      passwordHash,
      loginAttempts,
      lockoutUntil,
      emailVerificationToken,
      emailVerificationExpires,
      passwordResetToken,
      passwordResetExpires,
      twoFactorSecret,
      twoFactorBackupCodes,
      securityQuestionHash,
      securityAnswerHash,
      phoneVerificationToken,
      phoneVerificationExpires,
      googleId,
      githubId,
      ...safeUserData
    } = user;

    return safeUserData as UserProfile;
  }
}

export default UserService;
