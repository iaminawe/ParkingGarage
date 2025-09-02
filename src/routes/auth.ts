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
  validatePasswordStrength
} from '../controllers/authController';

import {
  signupValidation,
  loginValidation,
  refreshTokenValidation,
  profileUpdateValidation,
  changePasswordValidation
} from '../middleware/validation/authValidation';

import { authenticate } from '../middleware/auth';
import { RATE_LIMITS, API_RESPONSES } from '../config/constants';

const router = Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH_MAX_ATTEMPTS * 60 * 1000, // 15 minutes
  max: RATE_LIMITS.AUTH_MAX_ATTEMPTS,
  message: {
    success: false,
    message: API_RESPONSES.ERRORS.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Rate limiting for signup (more lenient)
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: RATE_LIMITS.SIGNUP_MAX_ATTEMPTS,
  message: {
    success: false,
    message: 'Too many signup attempts from this IP, please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for password validation (more lenient for UX)
const passwordValidationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: RATE_LIMITS.PASSWORD_VALIDATION_MAX_ATTEMPTS,
  message: {
    success: false,
    message: 'Too many password validation requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for profile updates
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

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', signupLimiter, signupValidation, signup);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', authLimiter, loginValidation, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', authLimiter, refreshTokenValidation, refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, profileLimiter, profileUpdateValidation, updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticate, authLimiter, changePasswordValidation, changePassword);

/**
 * @route   POST /api/auth/validate-password
 * @desc    Validate password strength
 * @access  Public
 */
router.post('/validate-password', passwordValidationLimiter, validatePasswordStrength);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify if user is authenticated (for client-side checks)
 * @access  Private
 */
router.get('/verify', authenticate, (req, res) => {
  res.status(200).json({
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