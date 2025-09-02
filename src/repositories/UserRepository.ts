/**
 * User repository for data access operations using Prisma
 *
 * This module provides data access methods for user authentication
 * and management using the PrismaAdapter pattern. It handles user CRUD
 * operations, session management, and security features.
 *
 * @module UserRepository
 */

import { PrismaAdapter } from '../adapters/PrismaAdapter';
import { User, Prisma } from '@prisma/client';
import type {
  QueryOptions,
  PaginatedResult,
  IAdapterLogger,
} from '../adapters/interfaces/BaseAdapter';
import { DatabaseService } from '../services/DatabaseService';
import { createLogger } from '../utils/logger';

/**
 * User creation data interface
 */
export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  phoneNumber?: string;
  preferredLanguage?: string;
  timezone?: string;
  googleId?: string;
  githubId?: string;
  profileImageUrl?: string;
}

/**
 * User update data interface
 */
export interface UpdateUserData {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  loginAttempts?: number;
  lockoutUntil?: Date;
  twoFactorSecret?: string;
  isTwoFactorEnabled?: boolean;
  twoFactorBackupCodes?: string;
  lastPasswordChange?: Date;
  passwordChangeRequired?: boolean;
  securityQuestionHash?: string;
  securityAnswerHash?: string;
  preferredLanguage?: string;
  timezone?: string;
  phoneNumber?: string;
  isPhoneVerified?: boolean;
  phoneVerificationToken?: string;
  phoneVerificationExpires?: Date;
  googleId?: string;
  githubId?: string;
  profileImageUrl?: string;
}

/**
 * User search criteria interface
 */
export interface UserSearchCriteria {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  isTwoFactorEnabled?: boolean;
  phoneNumber?: string;
  registeredFrom?: Date;
  registeredTo?: Date;
  lastLoginFrom?: Date;
  lastLoginTo?: Date;
}

/**
 * User statistics interface
 */
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  verified: number;
  unverified: number;
  byRole: Record<string, number>;
  withTwoFactor: number;
  locked: number;
  recentLogins: number; // Last 30 days
}

/**
 * Repository for managing users using Prisma
 */
export class UserRepository extends PrismaAdapter<User, CreateUserData, UpdateUserData> {
  protected readonly modelName = 'user';
  protected readonly delegate: Prisma.UserDelegate;

  constructor(databaseService?: DatabaseService, logger?: IAdapterLogger) {
    const dbService = databaseService || DatabaseService.getInstance();
    const prismaClient = dbService.getClient();

    super(prismaClient, logger || createLogger('UserRepository'));
    this.delegate = prismaClient.user;
  }

  /**
   * Find user by email
   * @param email - User email address
   * @param options - Query options
   * @param tx - Optional transaction client
   * @returns Found user or null
   */
  async findByEmail(
    email: string,
    options?: QueryOptions,
    tx?: Prisma.TransactionClient
  ): Promise<User | null> {
    return this.executeWithRetry(async () => {
      const client = tx || this.prisma;
      const result = await client.user.findFirst({
        where: {
          email: email.toLowerCase(),
          // Removed deletedAt filter - model doesn't support soft delete
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found user by email', {
        email,
        found: !!result,
      });

      return result;
    }, `find user by email: ${email}`);
  }

  /**
   * Find user by Google ID
   * @param googleId - Google OAuth ID
   * @param options - Query options
   * @returns Found user or null
   */
  async findByGoogleId(googleId: string, options?: QueryOptions): Promise<User | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: {
          googleId,
          // Removed deletedAt filter - model doesn't support soft delete
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found user by Google ID', {
        googleId,
        found: !!result,
      });

      return result;
    }, `find user by Google ID: ${googleId}`);
  }

  /**
   * Find user by GitHub ID
   * @param githubId - GitHub OAuth ID
   * @param options - Query options
   * @returns Found user or null
   */
  async findByGithubId(githubId: string, options?: QueryOptions): Promise<User | null> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findFirst({
        where: {
          githubId,
          // Removed deletedAt filter - model doesn't support soft delete
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found user by GitHub ID', {
        githubId,
        found: !!result,
      });

      return result;
    }, `find user by GitHub ID: ${githubId}`);
  }

  /**
   * Find users by role
   * @param role - User role
   * @param options - Query options
   * @returns Array of users with the specified role
   */
  async findByRole(role: string, options?: QueryOptions): Promise<User[]> {
    return this.findMany({ role }, options);
  }

  /**
   * Find active users
   * @param options - Query options
   * @returns Array of active users
   */
  async findActiveUsers(options?: QueryOptions): Promise<User[]> {
    return this.findMany({ isActive: true }, options);
  }

  /**
   * Find users with active sessions
   * @param options - Query options
   * @returns Array of users with active sessions
   */
  async findUsersWithActiveSessions(options?: QueryOptions): Promise<User[]> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findMany({
        where: {
          sessions: {
            some: {
              isRevoked: false,
              expiresAt: {
                gt: new Date(),
              },
            },
          },
          // Removed deletedAt filter - model doesn't support soft delete
        },
        include: {
          sessions: {
            where: {
              isRevoked: false,
              expiresAt: {
                gt: new Date(),
              },
            },
            orderBy: {
              lastActivityAt: 'desc',
            },
            take: 5,
          },
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found users with active sessions', {
        count: result.length,
      });

      return result;
    }, 'find users with active sessions');
  }

  /**
   * Search users with multiple criteria
   * @param criteria - Search criteria
   * @param options - Query options
   * @returns Array of users matching all criteria
   */
  async search(criteria: UserSearchCriteria, options?: QueryOptions): Promise<User[]> {
    return this.executeWithRetry(async () => {
      const whereClause: Prisma.UserWhereInput = {
        // Removed deletedAt filter - model doesn't support soft delete
      };

      // Email search
      if (criteria.email) {
        whereClause.email = {
          contains: criteria.email.toLowerCase(),
        };
      }

      // Name searches
      if (criteria.firstName) {
        whereClause.firstName = {
          contains: criteria.firstName,
        };
      }

      if (criteria.lastName) {
        whereClause.lastName = {
          contains: criteria.lastName,
        };
      }

      // Exact matches
      if (criteria.role) {
        whereClause.role = criteria.role;
      }

      if (criteria.isActive !== undefined) {
        whereClause.isActive = criteria.isActive;
      }

      if (criteria.isEmailVerified !== undefined) {
        whereClause.isEmailVerified = criteria.isEmailVerified;
      }

      if (criteria.isTwoFactorEnabled !== undefined) {
        whereClause.isTwoFactorEnabled = criteria.isTwoFactorEnabled;
      }

      if (criteria.phoneNumber) {
        whereClause.phoneNumber = {
          contains: criteria.phoneNumber,
        };
      }

      // Date range searches
      if (criteria.registeredFrom || criteria.registeredTo) {
        whereClause.createdAt = {};
        if (criteria.registeredFrom) {
          whereClause.createdAt.gte = criteria.registeredFrom;
        }
        if (criteria.registeredTo) {
          whereClause.createdAt.lte = criteria.registeredTo;
        }
      }

      if (criteria.lastLoginFrom || criteria.lastLoginTo) {
        whereClause.lastLoginAt = {};
        if (criteria.lastLoginFrom) {
          whereClause.lastLoginAt.gte = criteria.lastLoginFrom;
        }
        if (criteria.lastLoginTo) {
          whereClause.lastLoginAt.lte = criteria.lastLoginTo;
        }
      }

      const result = await this.delegate.findMany({
        where: whereClause,
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('User search completed', {
        criteria,
        count: result.length,
      });

      return result;
    }, 'search users');
  }

  /**
   * Create user with email normalization
   * @param userData - User creation data
   * @returns Created user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    return this.executeWithRetry(async () => {
      // Normalize email
      const normalizedEmail = userData.email.toLowerCase();

      // Check for existing user
      const existing = await this.delegate.findFirst({
        where: {
          email: normalizedEmail,
          // Removed deletedAt filter - model doesn't support soft delete
        },
      });

      if (existing) {
        throw new Error(`User with email ${normalizedEmail} already exists`);
      }

      return this.create({
        ...userData,
        email: normalizedEmail,
        role: userData.role || 'USER',
        isActive: userData.isActive !== false,
        preferredLanguage: userData.preferredLanguage || 'en',
        timezone: userData.timezone || 'UTC',
      });
    }, 'create user');
  }

  /**
   * Update user login information
   * @param userId - User ID
   * @param loginData - Login data to update
   * @returns Updated user
   */
  async updateLoginInfo(
    userId: string,
    loginData: {
      lastLoginAt?: Date;
      loginAttempts?: number;
      lockoutUntil?: Date;
    }
  ): Promise<User> {
    return this.update(userId, loginData);
  }

  /**
   * Lock user account
   * @param userId - User ID
   * @param lockoutDuration - Lockout duration in minutes
   * @returns Updated user
   */
  async lockAccount(userId: string, lockoutDuration = 30): Promise<User> {
    const lockoutUntil = new Date();
    lockoutUntil.setMinutes(lockoutUntil.getMinutes() + lockoutDuration);

    return this.update(userId, {
      lockoutUntil,
      loginAttempts: 0,
    });
  }

  /**
   * Unlock user account
   * @param userId - User ID
   * @returns Updated user
   */
  async unlockAccount(userId: string): Promise<User> {
    return this.update(userId, {
      lockoutUntil: undefined,
      loginAttempts: 0,
    });
  }

  /**
   * Set email verification token
   * @param userId - User ID
   * @param token - Verification token
   * @param expiresAt - Token expiration
   * @returns Updated user
   */
  async setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<User> {
    return this.update(userId, {
      emailVerificationToken: token,
      emailVerificationExpires: expiresAt,
    });
  }

  /**
   * Verify user email
   * @param token - Verification token
   * @returns Updated user or null if token invalid
   */
  async verifyEmail(token: string): Promise<User | null> {
    return this.executeWithRetry(async () => {
      const user = await this.delegate.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: {
            gt: new Date(),
          },
          // Removed deletedAt filter - model doesn't support soft delete
        },
      });

      if (!user) {
        return null;
      }

      return this.update(user.id, {
        isEmailVerified: true,
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
      });
    }, 'verify email');
  }

  /**
   * Set password reset token
   * @param userId - User ID
   * @param token - Reset token
   * @param expiresAt - Token expiration
   * @returns Updated user
   */
  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<User> {
    return this.update(userId, {
      passwordResetToken: token,
      passwordResetExpires: expiresAt,
    });
  }

  /**
   * Reset user password
   * @param token - Reset token
   * @param newPasswordHash - New password hash
   * @returns Updated user or null if token invalid
   */
  async resetPassword(token: string, newPasswordHash: string): Promise<User | null> {
    return this.executeWithRetry(async () => {
      const user = await this.delegate.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            gt: new Date(),
          },
          // Removed deletedAt filter - model doesn't support soft delete
        },
      });

      if (!user) {
        return null;
      }

      return this.update(user.id, {
        passwordHash: newPasswordHash,
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
        lastPasswordChange: new Date(),
        loginAttempts: 0,
        lockoutUntil: undefined,
      });
    }, 'reset password');
  }

  /**
   * Enable two-factor authentication
   * @param userId - User ID
   * @param secret - 2FA secret
   * @param backupCodes - Backup codes
   * @returns Updated user
   */
  async enableTwoFactor(userId: string, secret: string, backupCodes: string[]): Promise<User> {
    return this.update(userId, {
      twoFactorSecret: secret,
      isTwoFactorEnabled: true,
      twoFactorBackupCodes: JSON.stringify(backupCodes),
    });
  }

  /**
   * Disable two-factor authentication
   * @param userId - User ID
   * @returns Updated user
   */
  async disableTwoFactor(userId: string): Promise<User> {
    return this.update(userId, {
      twoFactorSecret: undefined,
      isTwoFactorEnabled: false,
      twoFactorBackupCodes: undefined,
    });
  }

  /**
   * Get user statistics
   * @returns User statistics
   */
  async getStats(): Promise<UserStats> {
    return this.executeWithRetry(async () => {
      const totalCount = await this.count();
      const activeCount = await this.count({ isActive: true });
      const inactiveCount = totalCount - activeCount;
      const verifiedCount = await this.count({ isEmailVerified: true });
      const unverifiedCount = totalCount - verifiedCount;
      const withTwoFactorCount = await this.count({ isTwoFactorEnabled: true });

      // Count locked accounts
      const lockedCount = await this.count({
        lockoutUntil: {
          gt: new Date(),
        },
      });

      // Count recent logins (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentLoginsCount = await this.count({
        lastLoginAt: {
          gte: thirtyDaysAgo,
        },
      });

      // Count by role
      const roleCounts = await this.groupBy(
        ['role'],
        {},
        {
          _count: { role: true },
        }
      );

      const byRole = {} as Record<string, number>;
      roleCounts.forEach((item: any) => {
        byRole[item.role] = item._count.role;
      });

      const stats: UserStats = {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        verified: verifiedCount,
        unverified: unverifiedCount,
        byRole,
        withTwoFactor: withTwoFactorCount,
        locked: lockedCount,
        recentLogins: recentLoginsCount,
      };

      this.logger.debug('User statistics calculated', stats as any);

      return stats;
    }, 'get user statistics');
  }

  /**
   * Find users requiring password change
   * @param options - Query options
   * @returns Array of users requiring password change
   */
  async findUsersRequiringPasswordChange(options?: QueryOptions): Promise<User[]> {
    return this.findMany({ passwordChangeRequired: true }, options);
  }

  /**
   * Find locked users
   * @param options - Query options
   * @returns Array of locked users
   */
  async findLockedUsers(options?: QueryOptions): Promise<User[]> {
    return this.executeWithRetry(async () => {
      const result = await this.delegate.findMany({
        where: {
          lockoutUntil: {
            gt: new Date(),
          },
          // Removed deletedAt filter - model doesn't support soft delete
        },
        ...this.buildQueryOptions(options),
      });

      this.logger.debug('Found locked users', {
        count: result.length,
      });

      return result;
    }, 'find locked users');
  }
}

export default UserRepository;
