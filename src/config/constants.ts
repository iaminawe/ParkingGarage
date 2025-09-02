/**
 * Application constants and configuration values
 * Centralized configuration to avoid magic numbers and improve maintainability
 */

// Time constants (in milliseconds unless specified)
export const TIME_CONSTANTS = {
  // Session and token durations
  SESSION_DURATION_MS: 60 * 60 * 1000, // 1 hour
  REFRESH_TOKEN_DURATION_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  PASSWORD_RESET_EXPIRY_MS: 60 * 60 * 1000, // 1 hour
  EMAIL_VERIFICATION_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  
  // Rate limiting windows
  AUTH_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  SIGNUP_RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  PASSWORD_VALIDATION_WINDOW_MS: 60 * 1000, // 1 minute
  PROFILE_UPDATE_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  
  // Database and cleanup
  SESSION_CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
  EXPIRED_SESSION_GRACE_PERIOD_MS: 24 * 60 * 60 * 1000, // 24 hours
  
  // Connection timeouts
  DATABASE_QUERY_TIMEOUT_MS: 5000, // 5 seconds
  DATABASE_CONNECTION_TIMEOUT_MS: 10000, // 10 seconds
} as const;

// Rate limiting constants
export const RATE_LIMITS = {
  // Authentication endpoints
  AUTH_MAX_ATTEMPTS: 5,
  SIGNUP_MAX_ATTEMPTS: 3,
  PASSWORD_VALIDATION_MAX_ATTEMPTS: 20,
  PROFILE_UPDATE_MAX_ATTEMPTS: 10,
  
  // General API rate limits
  DEFAULT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  DEFAULT_MAX_REQUESTS: 100,
  
  // Specific endpoint limits
  LOGIN_MAX_ATTEMPTS: 5,
  REFRESH_TOKEN_MAX_ATTEMPTS: 10,
} as const;

// Security constants
export const SECURITY = {
  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_JWT_SECRET_LENGTH: 32,
  RECOMMENDED_JWT_SECRET_LENGTH: 64,
  
  // Bcrypt settings
  MIN_SALT_ROUNDS: 10,
  MAX_SALT_ROUNDS: 15,
  DEFAULT_SALT_ROUNDS: 12,
  
  // Account lockout
  MAX_LOGIN_ATTEMPTS: 5,
  MIN_LOCKOUT_TIME_MINUTES: 5,
  MAX_LOCKOUT_TIME_MINUTES: 60,
  DEFAULT_LOCKOUT_TIME_MINUTES: 15,
  
  // Token settings
  JWT_ALGORITHM: 'HS256' as const,
  TOKEN_TYPE_ACCESS: 'access' as const,
  TOKEN_TYPE_REFRESH: 'refresh' as const,
  
  // Headers
  AUTH_HEADER_NAME: 'Authorization',
  BEARER_PREFIX: 'Bearer ',
} as const;

// User roles and permissions
export const USER_ROLES = {
  USER: 'USER',
  OPERATOR: 'OPERATOR',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Role hierarchy for permissions (higher number = more permissions)
export const ROLE_HIERARCHY = {
  [USER_ROLES.USER]: 1,
  [USER_ROLES.OPERATOR]: 2,
  [USER_ROLES.MANAGER]: 3,
  [USER_ROLES.ADMIN]: 4,
} as const;

// Permission sets by role
export const ROLE_PERMISSIONS = {
  [USER_ROLES.USER]: ['profile:read', 'profile:update', 'vehicle:read', 'vehicle:create'],
  [USER_ROLES.OPERATOR]: [
    'profile:read', 'profile:update',
    'vehicle:read', 'vehicle:create', 'vehicle:update',
    'parking:read', 'parking:create', 'parking:update',
  ],
  [USER_ROLES.MANAGER]: [
    'profile:read', 'profile:update',
    'vehicle:*', 'parking:*', 'garage:*',
    'reports:read', 'users:read',
  ],
  [USER_ROLES.ADMIN]: ['*'], // All permissions
} as const;

// Database constants
export const DATABASE = {
  // Connection pool settings
  DEFAULT_CONNECTION_POOL_SIZE: 10,
  MAX_CONNECTION_POOL_SIZE: 50,
  CONNECTION_TIMEOUT_MS: TIME_CONSTANTS.DATABASE_CONNECTION_TIMEOUT_MS,
  QUERY_TIMEOUT_MS: TIME_CONSTANTS.DATABASE_QUERY_TIMEOUT_MS,
  
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
} as const;

// API Response constants
export const API_RESPONSES = {
  // Success messages
  SUCCESS: {
    LOGIN: 'Login successful',
    LOGOUT: 'Logged out successfully',
    SIGNUP: 'User registered successfully',
    TOKEN_REFRESHED: 'Token refreshed successfully',
    PROFILE_UPDATED: 'Profile updated successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    EMAIL_VERIFIED: 'Email verified successfully',
  },
  
  // Error messages
  ERRORS: {
    // Authentication errors
    INVALID_CREDENTIALS: 'Invalid email or password',
    INVALID_TOKEN: 'Invalid or expired token',
    TOKEN_REQUIRED: 'Access token required',
    REFRESH_TOKEN_EXPIRED: 'Refresh token expired or invalid',
    
    // Authorization errors
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
    ACCOUNT_DEACTIVATED: 'Account is deactivated. Please contact support.',
    ACCOUNT_LOCKED: 'Account is temporarily locked due to too many failed login attempts. Please try again later.',
    
    // User errors
    USER_EXISTS: 'User with this email already exists',
    USER_NOT_FOUND: 'User not found',
    
    // Password errors
    WEAK_PASSWORD: 'Password does not meet security requirements',
    INVALID_PASSWORD: 'Invalid password format',
    
    // General errors
    VALIDATION_ERROR: 'Validation error',
    INTERNAL_ERROR: 'Internal server error',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  },
} as const;

// Validation constants
export const VALIDATION = {
  // Email validation
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Password validation patterns
  PASSWORD_PATTERNS: {
    LOWERCASE: /[a-z]/,
    UPPERCASE: /[A-Z]/,
    DIGIT: /\d/,
    SPECIAL_CHAR: /[!@#$%^&*(),.?":{}|<>]/,
  },
  
  // Name validation
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 50,
  NAME_REGEX: /^[a-zA-Z\s'-]+$/,
  
  // License plate validation (flexible for different formats)
  LICENSE_PLATE_REGEX: /^[A-Z0-9\s-]{2,10}$/i,
  
} as const;

// HTTP Status codes commonly used
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Parking garage constants
export const PARKING = {
  // Spot types
  SPOT_TYPES: {
    COMPACT: 'COMPACT',
    STANDARD: 'STANDARD',
    OVERSIZED: 'OVERSIZED',
    HANDICAP: 'HANDICAP',
    ELECTRIC: 'ELECTRIC',
  },
  
  // Spot status
  SPOT_STATUS: {
    AVAILABLE: 'AVAILABLE',
    OCCUPIED: 'OCCUPIED',
    RESERVED: 'RESERVED',
    MAINTENANCE: 'MAINTENANCE',
    OUT_OF_ORDER: 'OUT_OF_ORDER',
  },
  
  // Vehicle types
  VEHICLE_TYPES: {
    COMPACT: 'COMPACT',
    STANDARD: 'STANDARD',
    OVERSIZED: 'OVERSIZED',
  },
  
  // Rate types
  RATE_TYPES: {
    HOURLY: 'HOURLY',
    DAILY: 'DAILY',
    MONTHLY: 'MONTHLY',
    SPECIAL: 'SPECIAL',
  },
  
  // Session status
  SESSION_STATUS: {
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    OVERSTAYED: 'OVERSTAYED',
  },
  
  // Payment methods
  PAYMENT_METHODS: {
    CASH: 'CASH',
    CREDIT_CARD: 'CREDIT_CARD',
    DEBIT_CARD: 'DEBIT_CARD',
    MOBILE_PAY: 'MOBILE_PAY',
    APP_PAYMENT: 'APP_PAYMENT',
  },
  
  // Default rates
  DEFAULT_HOURLY_RATE: 5.0,
  DEFAULT_DAILY_RATE: 25.0,
  DEFAULT_MONTHLY_RATE: 150.0,
} as const;

// Export all types
export type SecurityConstant = typeof SECURITY[keyof typeof SECURITY];
export type RateLimit = typeof RATE_LIMITS[keyof typeof RATE_LIMITS];
export type TimeConstant = typeof TIME_CONSTANTS[keyof typeof TIME_CONSTANTS];
export type DatabaseConstant = typeof DATABASE[keyof typeof DATABASE];
export type ValidationConstant = typeof VALIDATION[keyof typeof VALIDATION];
export type ParkingConstant = typeof PARKING[keyof typeof PARKING];

// Utility functions for working with constants
export const UTILS = {
  /**
   * Check if user has permission
   */
  hasPermission: (userRole: UserRole, permission: string): boolean => {
    const rolePermissions = ROLE_PERMISSIONS[userRole] as readonly string[];
    return rolePermissions.includes('*') || rolePermissions.includes(permission);
  },
  
  /**
   * Check if role has higher or equal permissions than another role
   */
  hasRoleLevel: (userRole: UserRole, requiredRole: UserRole): boolean => {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  },
  
  /**
   * Get all roles with equal or lower permissions
   */
  getRolesAtOrBelow: (role: UserRole): UserRole[] => {
    const userLevel = ROLE_HIERARCHY[role];
    return Object.entries(ROLE_HIERARCHY)
      .filter(([_, level]) => level <= userLevel)
      .map(([roleName]) => roleName as UserRole);
  },
} as const;