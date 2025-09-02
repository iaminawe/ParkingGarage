import { Request, Response } from 'express';
import authService, { DeviceInfo } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { sessionManager } from '../services/SessionManager';
import { HTTP_STATUS, API_RESPONSES } from '../config/constants';
import * as crypto from 'crypto';

/**
 * User registration controller
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const result = await authService.signup({
      email,
      password,
      firstName,
      lastName,
    });

    if (!result.success) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      return;
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    console.error('Signup controller error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
    });
  }
};

/**
 * User login controller with enhanced security
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Enhanced device fingerprinting
    const deviceInfo: DeviceInfo = {
      userAgent: req.get('User-Agent') || 'Unknown',
      ipAddress: req.ip,
      deviceFingerprint: generateDeviceFingerprint(req),
    };

    const result = await authService.login({ email, password }, deviceInfo);

    if (!result.success) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(result);
      return;
    }

    // Create enhanced session
    if (result.token && result.user) {
      await sessionManager.createSession(
        result.token,
        {
          userId: result.user.id as string,
          userRole: result.user.role as string,
          userEmail: result.user.email as string,
          deviceInfo: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress,
          deviceFingerprint: deviceInfo.deviceFingerprint,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          isActive: true,
        },
        {
          maxConcurrentSessions: 5,
          requireDeviceConsistency: true,
        }
      );
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    console.error('Login controller error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
    });
  }
};

/**
 * Token refresh controller
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    const result = await authService.refreshToken(refreshToken);

    if (!result.success) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(result);
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    console.error('Refresh token controller error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
    });
  }
};

/**
 * User logout controller with session cleanup
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req as any).token; // Set by auth middleware

    if (!token) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    // Logout from auth service (revokes session and blacklists token)
    const result = await authService.logout(token);

    // Clean up session data
    await sessionManager.deleteSession(token);

    res.status(HTTP_STATUS.OK).json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error('Logout controller error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
    });
  }
};

/**
 * Get current user profile controller
 */
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Remove sensitive data
    const {
      passwordHash,
      loginAttempts,
      lockoutUntil,
      emailVerificationToken,
      passwordResetToken,
      passwordResetExpires,
      twoFactorSecret,
      ...safeUser
    } = user;

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user: safeUser },
    });
  } catch (error) {
    console.error('Get profile controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update user profile controller
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { firstName, lastName, email } = req.body;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Update user profile
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(email !== undefined && { email: email.toLowerCase() }),
        },
      });

      // Remove sensitive data
      const {
        passwordHash,
        loginAttempts,
        lockoutUntil,
        emailVerificationToken,
        passwordResetToken,
        passwordResetExpires,
        twoFactorSecret,
        ...safeUser
      } = updatedUser;

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: safeUser },
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Update profile controller error:', error);

    // Handle unique constraint violation (email already exists)
    if ((error as any).code === 'P2002' && (error as any).meta?.target?.includes('email')) {
      res.status(400).json({
        success: false,
        message: 'Email address is already in use',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Change password controller with enhanced security
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: API_RESPONSES.ERRORS.TOKEN_REQUIRED,
      });
      return;
    }

    // Use the enhanced change password method
    const result = await authService.changePassword({
      userId: user.id,
      currentPassword,
      newPassword,
    });

    if (!result.success) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      return;
    }

    // Revoke all other sessions for security (user will need to re-login everywhere)
    await authService.logoutAllDevices(user.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Change password controller error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
    });
  }
};

/**
 * Validate password strength controller
 */
export const validatePasswordStrength = (req: Request, res: Response): void => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Password is required',
      });
      return;
    }

    const validation = authService.validatePassword(password);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password validation completed',
      data: {
        isValid: validation.isValid,
        errors: validation.errors,
      },
    });
  } catch (error) {
    console.error('Password validation controller error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
    });
  }
};

/**
 * Password reset request controller
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    const result = await authService.requestPasswordReset({ email });

    // Always return success to prevent email enumeration
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Password reset request controller error:', error);
    res.status(HTTP_STATUS.OK).json({
      // Still return success for security
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
    });
  }
};

/**
 * Password reset confirmation controller
 */
export const confirmPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Token and new password are required',
      });
      return;
    }

    const result = await authService.confirmPasswordReset({ token, newPassword });

    const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('Password reset confirmation controller error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
    });
  }
};

/**
 * Logout from all devices controller
 */
export const logoutAllDevices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: API_RESPONSES.ERRORS.TOKEN_REQUIRED,
      });
      return;
    }

    const result = await authService.logoutAllDevices(user.id);

    // Clean up all sessions
    await sessionManager.revokeAllUserSessions(user.id);

    res.status(HTTP_STATUS.OK).json({
      success: result.success,
      message: result.message,
      data: {
        devicesLoggedOut: result.count,
      },
    });
  } catch (error) {
    console.error('Logout all devices controller error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
    });
  }
};

/**
 * Get user sessions controller
 */
export const getUserSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: API_RESPONSES.ERRORS.TOKEN_REQUIRED,
      });
      return;
    }

    const sessions = await sessionManager.getUserSessions(user.id);
    const activeSessionCount = await authService.getActiveSessionCount(user.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Sessions retrieved successfully',
      data: {
        sessions: sessions.map(session => ({
          deviceInfo: session.deviceInfo,
          ipAddress: session.ipAddress,
          createdAt: new Date(session.createdAt).toISOString(),
          lastAccessedAt: new Date(session.lastAccessedAt).toISOString(),
          isActive: session.isActive,
        })),
        totalActiveSessions: activeSessionCount,
      },
    });
  } catch (error) {
    console.error('Get user sessions controller error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: API_RESPONSES.ERRORS.INTERNAL_ERROR,
    });
  }
};

/**
 * Generate device fingerprint helper
 */
function generateDeviceFingerprint(req: Request): string {
  const components = [
    req.get('User-Agent') || '',
    req.get('Accept-Language') || '',
    req.get('Accept-Encoding') || '',
    req.ip || '',
  ];

  return crypto.createHash('sha256').update(components.join('|')).digest('hex').substring(0, 16); // First 16 chars for brevity
}
