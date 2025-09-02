import { Request, Response } from 'express';
import authService from '../services/authService';
import { AuthRequest } from '../middleware/auth';

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
      lastName
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
      }
    });

  } catch (error) {
    console.error('Signup controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * User login controller
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const deviceInfo = req.get('User-Agent');
    const ipAddress = req.ip;

    const result = await authService.login(
      { email, password },
      deviceInfo,
      ipAddress
    );

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
      }
    });

  } catch (error) {
    console.error('Login controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
      res.status(401).json(result);
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
      }
    });

  } catch (error) {
    console.error('Refresh token controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * User logout controller
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    const result = await authService.logout(token);

    res.status(200).json({
      success: result.success,
      message: result.message
    });

  } catch (error) {
    console.error('Logout controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
        message: 'User not authenticated'
      });
      return;
    }

    // Remove sensitive data
    const { passwordHash, loginAttempts, lockoutUntil, emailVerificationToken, 
            passwordResetToken, passwordResetExpires, twoFactorSecret, ...safeUser } = user;

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user: safeUser }
    });

  } catch (error) {
    console.error('Get profile controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
        message: 'User not authenticated'
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
          ...(email !== undefined && { email: email.toLowerCase() })
        }
      });

      // Remove sensitive data
      const { passwordHash, loginAttempts, lockoutUntil, emailVerificationToken, 
              passwordResetToken, passwordResetExpires, twoFactorSecret, ...safeUser } = updatedUser;

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: safeUser }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Update profile controller error:', error);
    
    // Handle unique constraint violation (email already exists)
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      res.status(400).json({
        success: false,
        message: 'Email address is already in use'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Change password controller
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await authService.comparePassword(currentPassword, user.passwordHash);
    
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await authService.hashPassword(newPassword);

    // Update password in database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash }
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Change password controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
      res.status(400).json({
        success: false,
        message: 'Password is required'
      });
      return;
    }

    const validation = authService.validatePassword(password);

    res.status(200).json({
      success: true,
      message: 'Password validation completed',
      data: {
        isValid: validation.isValid,
        errors: validation.errors
      }
    });

  } catch (error) {
    console.error('Password validation controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};