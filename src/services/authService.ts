import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User, UserSession } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/environment';
import { 
  SECURITY, 
  TIME_CONSTANTS, 
  API_RESPONSES,
  VALIDATION,
  type UserRole 
} from '../config/constants';

export interface SignupData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: Partial<User>;
  token?: string;
  refreshToken?: string;
  message?: string;
  errors?: string[];
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly JWT_REFRESH_EXPIRES_IN: string;
  private readonly MAX_LOGIN_ATTEMPTS: number;
  private readonly LOCKOUT_TIME: number;
  private readonly PASSWORD_SALT_ROUNDS: number;

  constructor() {
    // Use validated environment configuration - no defaults allowed
    this.JWT_SECRET = env.JWT_SECRET;
    this.JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;
    this.JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;
    this.JWT_REFRESH_EXPIRES_IN = env.JWT_REFRESH_EXPIRES_IN;
    this.MAX_LOGIN_ATTEMPTS = env.MAX_LOGIN_ATTEMPTS;
    this.LOCKOUT_TIME = env.LOCKOUT_TIME;
    this.PASSWORD_SALT_ROUNDS = env.BCRYPT_SALT_ROUNDS;
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.PASSWORD_SALT_ROUNDS);
  }

  /**
   * Compare a password with its hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT tokens (access and refresh)
   */
  generateTokens(user: User): { token: string; refreshToken: string; expiresAt: Date; refreshExpiresAt: Date } {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole
    };

    const token = jwt.sign(payload, this.JWT_SECRET, { 
      expiresIn: this.JWT_EXPIRES_IN as string
    });
    
    const refreshToken = jwt.sign(
      { userId: user.id, type: SECURITY.TOKEN_TYPE_REFRESH }, 
      this.JWT_REFRESH_SECRET, 
      { 
        expiresIn: this.JWT_REFRESH_EXPIRES_IN as string
      }
    );

    // Calculate expiration dates based on actual token expiry
    const expiresAt = new Date(Date.now() + TIME_CONSTANTS.SESSION_DURATION_MS);
    const refreshExpiresAt = new Date(Date.now() + TIME_CONSTANTS.REFRESH_TOKEN_DURATION_MS);

    return { token, refreshToken, expiresAt, refreshExpiresAt };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string, isRefreshToken = false): TokenPayload | null {
    try {
      const secret = isRefreshToken ? this.JWT_REFRESH_SECRET : this.JWT_SECRET;
      return jwt.verify(token, secret, { algorithms: [SECURITY.JWT_ALGORITHM] }) as TokenPayload;
    } catch (error) {
      // Log specific JWT errors for debugging in development
      if (env.NODE_ENV === 'development' && error instanceof jwt.JsonWebTokenError) {
        console.warn('JWT verification failed:', error.message);
      }
      return null;
    }
  }

  /**
   * Check if user account is locked due to too many failed login attempts
   */
  private async isAccountLocked(user: User): Promise<boolean> {
    if (!user.lockoutUntil) return false;
    
    if (user.lockoutUntil > new Date()) {
      return true;
    }

    // Reset lockout if time has passed
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockoutUntil: null
      }
    });

    return false;
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const loginAttempts = user.loginAttempts + 1;
    const updateData: any = { loginAttempts };

    // Lock account if max attempts reached
    if (loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      const lockoutTime = new Date();
      lockoutTime.setMinutes(lockoutTime.getMinutes() + this.LOCKOUT_TIME);
      updateData.lockoutUntil = lockoutTime;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  }

  /**
   * Handle successful login
   */
  private async handleSuccessfulLogin(userId: string, deviceInfo?: string, ipAddress?: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        loginAttempts: 0,
        lockoutUntil: null
      }
    });
  }

  /**
   * Register a new user
   */
  async signup(data: SignupData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      });

      if (existingUser) {
        return {
          success: false,
          message: API_RESPONSES.ERRORS.USER_EXISTS
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'USER'
        }
      });

      // Generate tokens
      const { token, refreshToken, expiresAt, refreshExpiresAt } = this.generateTokens(user);

      // Create user session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          refreshToken,
          expiresAt,
          refreshExpiresAt
        }
      });

      // Return success response (exclude password hash)
      const { passwordHash: _, ...userWithoutPassword } = user;
      
      return {
        success: true,
        user: userWithoutPassword,
        token,
        refreshToken,
        message: API_RESPONSES.SUCCESS.SIGNUP
      };

    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  /**
   * Authenticate user login
   */
  async login(data: LoginData, deviceInfo?: string, ipAddress?: string): Promise<AuthResult> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      });

      if (!user) {
        return {
          success: false,
          message: API_RESPONSES.ERRORS.INVALID_CREDENTIALS
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          message: API_RESPONSES.ERRORS.ACCOUNT_DEACTIVATED
        };
      }

      // Check if account is locked
      if (await this.isAccountLocked(user)) {
        return {
          success: false,
          message: API_RESPONSES.ERRORS.ACCOUNT_LOCKED
        };
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(data.password, user.passwordHash);
      
      if (!isPasswordValid) {
        await this.handleFailedLogin(user.id);
        return {
          success: false,
          message: API_RESPONSES.ERRORS.INVALID_CREDENTIALS
        };
      }

      // Handle successful login
      await this.handleSuccessfulLogin(user.id, deviceInfo, ipAddress);

      // Generate new tokens
      const { token, refreshToken, expiresAt, refreshExpiresAt } = this.generateTokens(user);

      // Create user session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          refreshToken,
          expiresAt,
          refreshExpiresAt,
          deviceInfo,
          ipAddress
        }
      });

      // Return success response (exclude password hash)
      const { passwordHash: _, loginAttempts, lockoutUntil, ...userWithoutSensitiveData } = user;
      
      return {
        success: true,
        user: userWithoutSensitiveData,
        token,
        refreshToken,
        message: API_RESPONSES.SUCCESS.LOGIN
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const payload = this.verifyToken(refreshToken, true);
      if (!payload) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Find user session
      const session = await prisma.userSession.findUnique({
        where: { refreshToken },
        include: { user: true }
      });

      if (!session || session.isRevoked || session.refreshExpiresAt! < new Date()) {
        return {
          success: false,
          message: 'Refresh token expired or invalid'
        };
      }

      const user = session.user;
      
      // Check if user is still active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      // Generate new tokens
      const { token: newToken, refreshToken: newRefreshToken, expiresAt, refreshExpiresAt } = this.generateTokens(user);

      // Update session with new tokens
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          expiresAt,
          refreshExpiresAt
        }
      });

      // Return success response
      const { passwordHash: _, loginAttempts, lockoutUntil, ...userWithoutSensitiveData } = user;
      
      return {
        success: true,
        user: userWithoutSensitiveData,
        token: newToken,
        refreshToken: newRefreshToken,
        message: 'Token refreshed successfully'
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        message: 'Token refresh failed'
      };
    }
  }

  /**
   * Logout user (revoke session)
   */
  async logout(token: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find and revoke session
      await prisma.userSession.updateMany({
        where: { token },
        data: { isRevoked: true }
      });

      return {
        success: true,
        message: 'Logged out successfully'
      };

    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Logout failed'
      };
    }
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < SECURITY.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${SECURITY.MIN_PASSWORD_LENGTH} characters long`);
    }

    if (password.length > SECURITY.MAX_PASSWORD_LENGTH) {
      errors.push(`Password must be no more than ${SECURITY.MAX_PASSWORD_LENGTH} characters long`);
    }

    if (!VALIDATION.PASSWORD_PATTERNS.LOWERCASE.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!VALIDATION.PASSWORD_PATTERNS.UPPERCASE.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!VALIDATION.PASSWORD_PATTERNS.DIGIT.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!VALIDATION.PASSWORD_PATTERNS.SPECIAL_CHAR.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get user by token
   */
  async getUserByToken(token: string): Promise<User | null> {
    try {
      const payload = this.verifyToken(token);
      if (!payload) return null;

      const session = await prisma.userSession.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!session || session.isRevoked || session.expiresAt < new Date()) {
        return null;
      }

      return session.user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean up expired sessions
   * Should be called periodically to prevent database bloat
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - TIME_CONSTANTS.EXPIRED_SESSION_GRACE_PERIOD_MS);
      
      const result = await prisma.userSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: cutoffDate } },
            { refreshExpiresAt: { lt: cutoffDate } },
            { isRevoked: true }
          ]
        }
      });

      if (env.NODE_ENV === 'development' && result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} expired/revoked sessions`);
      }

      return result.count;
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }

  /**
   * Revoke all sessions for a specific user
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    try {
      const result = await prisma.userSession.updateMany({
        where: { 
          userId,
          isRevoked: false 
        },
        data: { isRevoked: true }
      });

      return result.count;
    } catch (error) {
      console.error('Error revoking user sessions:', error);
      return 0;
    }
  }

  /**
   * Get active session count for a user
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    try {
      return await prisma.userSession.count({
        where: {
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() }
        }
      });
    } catch (error) {
      console.error('Error counting active sessions:', error);
      return 0;
    }
  }

  /**
   * Start periodic session cleanup
   * Call this once during application startup
   */
  static startPeriodicCleanup(authService: AuthService): NodeJS.Timeout {
    const cleanup = async () => {
      try {
        await authService.cleanupExpiredSessions();
      } catch (error) {
        console.error('Periodic session cleanup failed:', error);
      }
    };

    // Run cleanup immediately and then periodically
    cleanup();
    return setInterval(cleanup, TIME_CONSTANTS.SESSION_CLEANUP_INTERVAL_MS);
  }
}

// Export the singleton instance as default
export default new AuthService();

// Also export the class for static methods
export { AuthService };