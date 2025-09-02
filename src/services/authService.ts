import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { User, UserSession } from '@prisma/client';

const prisma = new PrismaClient();

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
  role: string;
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
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
    this.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
    this.LOCKOUT_TIME = parseInt(process.env.LOCKOUT_TIME || '15'); // minutes
    this.PASSWORD_SALT_ROUNDS = parseInt(process.env.PASSWORD_SALT_ROUNDS || '12');

    if (this.JWT_SECRET === 'your-super-secret-jwt-key') {
      console.warn('⚠️  WARNING: Using default JWT secret in development. Set JWT_SECRET environment variable for production.');
    }
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
      role: user.role
    };

    const token = jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ userId: user.id }, this.JWT_REFRESH_SECRET, { 
      expiresIn: this.JWT_REFRESH_EXPIRES_IN
    });

    // Calculate expiration dates
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour from now

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days from now

    return { token, refreshToken, expiresAt, refreshExpiresAt };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string, isRefreshToken = false): TokenPayload | null {
    try {
      const secret = isRefreshToken ? this.JWT_REFRESH_SECRET : this.JWT_SECRET;
      return jwt.verify(token, secret) as TokenPayload;
    } catch (error) {
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
          message: 'User with this email already exists'
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
        message: 'User registered successfully'
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
          message: 'Invalid email or password'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated. Please contact support.'
        };
      }

      // Check if account is locked
      if (await this.isAccountLocked(user)) {
        return {
          success: false,
          message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.'
        };
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(data.password, user.passwordHash);
      
      if (!isPasswordValid) {
        await this.handleFailedLogin(user.id);
        return {
          success: false,
          message: 'Invalid email or password'
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
        message: 'Login successful'
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

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
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
}

export default new AuthService();