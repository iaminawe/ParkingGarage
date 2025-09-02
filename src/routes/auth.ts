import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import {
  signup,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  validatePasswordStrength,
  requestPasswordReset,
  confirmPasswordReset,
  logoutAllDevices,
  getUserSessions
} from '../controllers/authController';

import {
  signupValidation,
  loginValidation,
  refreshTokenValidation,
  profileUpdateValidation,
  changePasswordValidation
} from '../middleware/validation/authValidation';

import { authenticate, enforceSessionLimit } from '../middleware/auth';
import { 
  authRateLimit, 
  signupRateLimit, 
  passwordValidationLimit,
  securityLogger,
  validateContentType
} from '../middleware/security';
import { RATE_LIMITS, API_RESPONSES, HTTP_STATUS } from '../config/constants';

const router = Router();

// Use enhanced security middleware instead of basic rate limiters
// Enhanced security middleware provides better protection with suspicious activity detection

// Rate limiting for profile updates (keep this as it's specific)
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: RATE_LIMITS.PROFILE_UPDATE_MAX_ATTEMPTS,
  message: {
    success: false,
    message: 'Too many profile update attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply security middleware to all routes
router.use(securityLogger);
router.use(validateContentType);

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', signupRateLimit, signupValidation, signup);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', authRateLimit, loginValidation, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', authRateLimit, refreshTokenValidation, refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token and blacklist)
 * @access  Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, getProfile as any);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, profileLimiter, profileUpdateValidation, updateProfile as any);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticate, enforceSessionLimit(5), authRateLimit, changePasswordValidation, changePassword as any);

/**
 * @route   POST /api/auth/validate-password
 * @desc    Validate password strength
 * @access  Public
 */
router.post('/validate-password', passwordValidationLimit, validatePasswordStrength);

/**
 * @route   POST /api/auth/password-reset
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/password-reset', authRateLimit, requestPasswordReset);

/**
 * @route   POST /api/auth/password-reset/confirm
 * @desc    Confirm password reset with token
 * @access  Public
 */
router.post('/password-reset/confirm', authRateLimit, confirmPasswordReset);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticate, enforceSessionLimit(5), logoutAllDevices as any);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get user's active sessions
 * @access  Private
 */
router.get('/sessions', authenticate, getUserSessions as any);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify if user is authenticated (for client-side checks)
 * @access  Private
 */
router.get('/verify', authenticate, (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Token is valid',
    data: {
      authenticated: true,
      user: {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        firstName: req.user!.firstName,
        lastName: req.user!.lastName
      }
    }
  });
});

export default router;