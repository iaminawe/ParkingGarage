/**
 * Authentication and user-related type definitions
 *
 * This module provides comprehensive type definitions for user authentication,
 * authorization, JWT tokens, sessions, and security-related operations.
 */

import { User } from '@prisma/client';
import { USER_ROLES, SECURITY } from '../config/constants';

// User role types
export type UserRole = keyof typeof USER_ROLES;
export type Permission = string;

// Core user types
export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  profileImageUrl?: string;
  phoneNumber?: string;
  isPhoneVerified?: boolean;
  preferredLanguage?: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface PublicUserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profileImageUrl?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

// Authentication request/response types
export interface SignupData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  preferredLanguage?: string;
  timezone?: string;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: DeviceInfo;
}

export interface AuthResult {
  success: boolean;
  user?: Partial<User>;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
  message?: string;
  errors?: string[];
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface LoginAttempt {
  email: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  failureReason?: string;
}

// Password and security types
export interface PasswordResetData {
  email: string;
}

export interface PasswordResetConfirmData {
  token: string;
  newPassword: string;
}

export interface ChangePasswordData {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-4 (weak to strong)
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
    notCommon: boolean;
  };
}

// JWT and token types
export interface JWTPayload {
  sub: string; // Subject (user ID)
  email: string;
  role: UserRole;
  permissions: Permission[];
  iat: number; // Issued at
  exp: number; // Expires at
  aud: string; // Audience
  iss: string; // Issuer
  jti: string; // JWT ID
  type: typeof SECURITY.TOKEN_TYPE_ACCESS | typeof SECURITY.TOKEN_TYPE_REFRESH;
  sessionId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

export interface RefreshTokenData {
  refreshToken: string;
  deviceInfo?: DeviceInfo;
}

// Session management types
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  lastAccessedAt: Date;
  createdAt: Date;
}

export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  os?: string;
  browser?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
}

export interface SessionSummary {
  id: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress: string;
  location?: string;
  isCurrentSession: boolean;
  lastAccessedAt: Date;
  createdAt: Date;
}

// Two-factor authentication types
export interface TwoFactorSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyData {
  userId: string;
  code: string;
  backupCode?: boolean;
}

export interface TwoFactorConfig {
  isEnabled: boolean;
  secret?: string;
  backupCodes: string[];
  lastUsedAt?: Date;
}

// Account security types
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
  sessionTimeout: number;
  allowMultipleSessions: boolean;
  requirePasswordChange: boolean;
  lastPasswordChange?: Date;
  accountLocked: boolean;
  lockoutUntil?: Date;
  loginAttempts: number;
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'password_change' | 'profile_update' | 'suspicious_activity' | 'account_locked' | 'two_factor_enabled' | 'two_factor_disabled';
  userId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
}

// User creation and updates
export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  phoneNumber?: string;
  preferredLanguage?: string;
  timezone?: string;
  googleId?: string;
  githubId?: string;
  profileImageUrl?: string;
}

export interface UpdateUserData {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
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

// User search and filtering
export interface UserSearchCriteria {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  isEmailVerified?: boolean;
  isTwoFactorEnabled?: boolean;
  phoneNumber?: string;
  registeredFrom?: Date;
  registeredTo?: Date;
  lastLoginFrom?: Date;
  lastLoginTo?: Date;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  verified: number;
  unverified: number;
  byRole: Record<UserRole, number>;
  twoFactorEnabled: number;
  lockedAccounts: number;
  recentLogins: number; // Last 24 hours
  newRegistrations: number; // Last 24 hours
}

// OAuth and external authentication
export interface OAuthProvider {
  name: 'google' | 'github' | 'facebook' | 'twitter';
  clientId: string;
  clientSecret: string;
  scope: string[];
  redirectUri: string;
}

export interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  provider: string;
}

export interface LinkedAccount {
  provider: string;
  providerId: string;
  email?: string;
  name?: string;
  linkedAt: Date;
}

// Email verification types
export interface EmailVerificationData {
  email: string;
  token: string;
  expiresAt: Date;
}

export interface EmailVerificationResult {
  success: boolean;
  message: string;
  user?: PublicUserProfile;
}

// Account recovery types
export interface AccountRecoveryOptions {
  email: string;
  securityQuestion?: string;
  phoneNumber?: string;
}

export interface RecoveryChallenge {
  type: 'email' | 'security_question' | 'phone';
  challenge: string;
  expiresAt: Date;
}

// Permission and authorization types
export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  inherits?: UserRole[];
}

export interface AuthorizationContext {
  user: UserProfile;
  resource?: string;
  action?: string;
  conditions?: Record<string, any>;
}

export interface AccessControlResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
  missingPermissions?: Permission[];
}

// API key types (for service-to-service auth)
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  userId: string;
  permissions: Permission[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  ipWhitelist?: string[];
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
}

export interface CreateApiKeyData {
  name: string;
  permissions: Permission[];
  expiresAt?: Date;
  ipWhitelist?: string[];
  rateLimit?: {
    requests: number;
    window: number;
  };
}

// Default export for namespace-style imports
const AuthTypes = {
  // Type placeholders for namespace organization
} as const;

export default AuthTypes;
