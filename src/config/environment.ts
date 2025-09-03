import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define validation schema for all required environment variables
const environmentSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional().default('3000').transform((val) => Number(val)).refine((val) => val >= 1 && val <= 65535, 'PORT must be between 1 and 65535'),
  HOST: z.string().default('0.0.0.0'),

  // Database Configuration
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT Configuration - CRITICAL: No default secrets allowed
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long')
    .refine(
      val =>
        val !== 'your-super-secret-jwt-key' &&
        val !== 'your-super-secure-jwt-secret-minimum-32-characters' &&
        val !== 'your-super-secure-jwt-secret-minimum-64-characters-long' &&
        val !== 'parking-garage-super-secret-jwt-key-change-in-production-2024' &&
        val !== 'development-jwt-secret-minimum-32-chars-long-do-not-use-in-production',
      'JWT_SECRET cannot use default/example values'
    )
    .refine(
      (val) => {
        // In production, JWT_SECRET should be at least 64 characters
        if (process.env.NODE_ENV === 'production') {
          return val.length >= 64;
        }
        return true;
      },
      'JWT_SECRET must be at least 64 characters long in production'
    ),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long')
    .refine(
      val => 
        val !== 'your-super-secret-refresh-key' &&
        val !== 'parking-garage-super-secret-refresh-key-change-in-production-2024' &&
        val !== 'development-refresh-secret-minimum-32-chars-long-do-not-use-in-production',
      'JWT_REFRESH_SECRET cannot use default/example values'
    )
    .refine(
      (val) => {
        // In production, JWT_REFRESH_SECRET should be at least 64 characters
        if (process.env.NODE_ENV === 'production') {
          return val.length >= 64;
        }
        return true;
      },
      'JWT_REFRESH_SECRET must be at least 64 characters long in production'
    ),

  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Security Configuration
  BCRYPT_SALT_ROUNDS: z
    .string()
    .optional()
    .default('12')
    .transform(Number)
    .pipe(z.number().min(10).max(15))
    .refine(
      (val) => {
        // In production, BCRYPT_SALT_ROUNDS should be at least 12
        if (process.env.NODE_ENV === 'production') {
          return val >= 12;
        }
        return true;
      },
      'BCRYPT_SALT_ROUNDS must be at least 12 in production'
    ),
  
  MAX_LOGIN_ATTEMPTS: z
    .string()
    .optional()
    .default('5')
    .transform(Number)
    .pipe(z.number().min(1).max(10))
    .refine(
      (val) => {
        // In production, MAX_LOGIN_ATTEMPTS should be at most 3
        if (process.env.NODE_ENV === 'production') {
          return val <= 3;
        }
        return true;
      },
      'MAX_LOGIN_ATTEMPTS should be 3 or less in production for enhanced security'
    ),
    
  LOCKOUT_TIME: z
    .string()
    .optional()
    .default('15')
    .transform((val) => Number(val))
    .refine(
      (val) => val >= 5 && val <= 120,
      'LOCKOUT_TIME must be between 5 and 120 minutes'
    )
    .refine(
      (val) => {
        // In production, LOCKOUT_TIME should be at least 30 minutes
        if (process.env.NODE_ENV === 'production') {
          return val >= 30;
        }
        return true;
      },
      'LOCKOUT_TIME should be at least 30 minutes in production'
    ),

  // Optional Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  CORS_ORIGIN: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().optional().default('900000').transform((val) => Number(val)),
  RATE_LIMIT_MAX_REQUESTS: z.string().optional().default('100').transform((val) => Number(val)),

  // Email Configuration (optional)
  EMAIL_PROVIDER: z.enum(['smtp', 'gmail', 'sendgrid']).default('smtp'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform((val) => val ? Number(val) : undefined),
  SMTP_SECURE: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_APP_PASSWORD: z.string().optional(), // For Gmail
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),

  // Application URLs
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),

  // OAuth Configuration (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Security Configuration
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters long')
    .optional()
    .refine(
      (val) => {
        if (!val || process.env.NODE_ENV !== 'production') return true;
        return val.length >= 64;
      },
      'SESSION_SECRET must be at least 64 characters long in production'
    ),
  
  CSRF_SECRET: z
    .string()
    .min(32, 'CSRF_SECRET must be at least 32 characters long')
    .optional()
    .refine(
      (val) => {
        if (!val || process.env.NODE_ENV !== 'production') return true;
        return val.length >= 64;
      },
      'CSRF_SECRET must be at least 64 characters long in production'
    ),
    
  DATABASE_ENCRYPTION_KEY: z
    .string()
    .min(32, 'DATABASE_ENCRYPTION_KEY must be at least 32 characters long')
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return /^[a-fA-F0-9]+$/.test(val) && val.length === 64;
      },
      'DATABASE_ENCRYPTION_KEY must be a 64-character hexadecimal string (256-bit key)'
    ),

  // Encryption key for secrets (alias for backward compatibility)
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be at least 32 characters long')
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return /^[a-fA-F0-9]+$/.test(val) && val.length === 64;
      },
      'ENCRYPTION_KEY must be a 64-character hexadecimal string (256-bit key)'
    ),

  // Rate Limiting
  EMAIL_RATE_LIMIT_PER_HOUR: z.string().optional().default('100').transform((val) => Number(val)),
  EMAIL_RATE_LIMIT_PER_RECIPIENT_HOUR: z.string().optional().default('5').transform((val) => Number(val)),

  // Logging Configuration
  LOG_FILE_DATE_PATTERN: z.string().default('YYYY-MM-DD-HH'),
  LOG_FILE_MAX_SIZE: z.string().default('20m'),
  LOG_FILE_MAX_FILES: z.string().default('14d'),
  ENABLE_ERROR_LOGGING: z
    .string()
    .transform(val => val === 'true')
    .default(true),
  ENABLE_REQUEST_LOGGING: z
    .string()
    .transform(val => val === 'true')
    .default(true),

  // Monitoring (optional)
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0).max(1))
    .default(0.1),
  HEALTH_CHECK_TIMEOUT: z.string().optional().default('30000').transform((val) => Number(val)),
  ENABLE_METRICS: z
    .string()
    .transform(val => val === 'true')
    .default(false),
});

// Environment validation result type
type Environment = z.infer<typeof environmentSchema>;

// Validation class for environment variables
export class EnvironmentValidator {
  private static validated: Environment | null = null;
  private static validationErrors: string[] = [];

  /**
   * Validate all environment variables on startup
   * Fails fast for critical misconfigurations
   */
  static validate(): Environment {
    if (EnvironmentValidator.validated) {
      return EnvironmentValidator.validated;
    }

    try {
      // Parse and validate environment variables
      const parsed = environmentSchema.safeParse(process.env);

      if (!parsed.success) {
        const errors = parsed.error.issues.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });

        EnvironmentValidator.validationErrors = errors;

        console.error('❌ Environment validation failed:');
        errors.forEach(error => console.error(`   - ${error}`));

        if (process.env['NODE_ENV'] === 'production') {
          console.error('\n🔥 CRITICAL: Cannot start in production with invalid configuration');
          process.exit(1);
        } else {
          console.warn('\n⚠️  WARNING: Starting with invalid configuration in development mode');
          console.warn('   Please fix these issues before deploying to production');
        }

        // Return a minimal valid configuration for development
        return EnvironmentValidator.getMinimalValidConfig();
      }

      EnvironmentValidator.validated = parsed.data;

      // Log successful validation in development
      if (parsed.data.NODE_ENV === 'development') {
        console.log('✅ Environment validation successful');
        EnvironmentValidator.logSecurityWarnings(parsed.data);
      }

      return parsed.data;
    } catch (error) {
      console.error('❌ Fatal error during environment validation:', error);
      process.exit(1);
    }
  }

  /**
   * Get validation errors
   */
  static getValidationErrors(): string[] {
    return EnvironmentValidator.validationErrors;
  }

  /**
   * Check if environment is valid
   */
  static isValid(): boolean {
    return (
      EnvironmentValidator.validated !== null && EnvironmentValidator.validationErrors.length === 0
    );
  }

  /**
   * Log security warnings for development
   */
  private static logSecurityWarnings(env: Environment): void {
    const warnings: string[] = [];

    if (env.NODE_ENV === 'development') {
      if (env.JWT_SECRET.length < 64) {
        warnings.push('Consider using a longer JWT_SECRET (64+ characters) for enhanced security');
      }

      if (env.BCRYPT_SALT_ROUNDS < 12) {
        warnings.push('Consider increasing BCRYPT_SALT_ROUNDS to 12+ for production');
      }
    }

    if (warnings.length > 0) {
      console.warn('\n⚠️  Security recommendations:');
      warnings.forEach(warning => console.warn(`   - ${warning}`));
    }
  }

  /**
   * Get minimal valid configuration for development fallback
   */
  private static getMinimalValidConfig(): Environment {
    return {
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '0.0.0.0',
      DATABASE_URL: process.env['DATABASE_URL'] || 'file:./dev.db',
      JWT_SECRET: 'development-jwt-secret-minimum-32-chars-long-do-not-use-in-production',
      JWT_REFRESH_SECRET:
        'development-refresh-secret-minimum-32-chars-long-do-not-use-in-production',
      JWT_EXPIRES_IN: '1h',
      JWT_REFRESH_EXPIRES_IN: '7d',
      BCRYPT_SALT_ROUNDS: 12,
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_TIME: 15,
      LOG_LEVEL: 'info',
      RATE_LIMIT_WINDOW_MS: 900000,
      RATE_LIMIT_MAX_REQUESTS: 100,
      EMAIL_PROVIDER: 'smtp',
      SMTP_PORT: undefined,
      FRONTEND_URL: 'http://localhost:3000',
      API_URL: 'http://localhost:3001',
      EMAIL_RATE_LIMIT_PER_HOUR: 100,
      EMAIL_RATE_LIMIT_PER_RECIPIENT_HOUR: 5,
      // Add missing required logging fields
      LOG_FILE_DATE_PATTERN: 'YYYY-MM-DD-HH',
      LOG_FILE_MAX_SIZE: '20m',
      LOG_FILE_MAX_FILES: '14d',
      ENABLE_ERROR_LOGGING: true,
      ENABLE_REQUEST_LOGGING: true,
      SENTRY_TRACES_SAMPLE_RATE: 0.1,
      HEALTH_CHECK_TIMEOUT: 30000,
      ENABLE_METRICS: false,
    };
  }

  /**
   * Generate secure random secret for development
   */
  static generateSecureSecret(length = 64): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Export validated environment configuration
export const env = EnvironmentValidator.validate();

// Export validation utilities
export const isEnvironmentValid = EnvironmentValidator.isValid;
export const getValidationErrors = EnvironmentValidator.getValidationErrors;
export const generateSecureSecret = EnvironmentValidator.generateSecureSecret;

// Type exports
export type { Environment };
export { environmentSchema };
