/**
 * Production Configuration Validator
 * 
 * Comprehensive validation for production deployment readiness.
 * Ensures all security requirements are met before starting the application.
 */

import { z } from 'zod';
import * as crypto from 'crypto';
import { env, Environment } from './environment';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // Security score 0-100
}

export interface SecretStrengthResult {
  entropy: number;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  length: number;
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
}

export class ProductionValidator {
  private static readonly PRODUCTION_REQUIREMENTS = {
    JWT_SECRET: { minLength: 64, minEntropy: 4.0 },
    JWT_REFRESH_SECRET: { minLength: 64, minEntropy: 4.0 },
    SESSION_SECRET: { minLength: 64, minEntropy: 4.0 },
    CSRF_SECRET: { minLength: 64, minEntropy: 4.0 },
    DATABASE_ENCRYPTION_KEY: { minLength: 64, format: 'hex' },
  };

  private static readonly FORBIDDEN_VALUES = [
    'password',
    '123456',
    'secret',
    'default',
    'example',
    'test',
    'development',
    'change-me',
    'your-secret',
    'super-secret',
    'parking-garage-super-secret'
  ];

  /**
   * Validate complete production configuration
   */
  static validateProductionConfig(environment: Environment): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    console.log('🔍 Validating production configuration...\n');

    // 1. Environment checks
    if (environment.NODE_ENV !== 'production') {
      errors.push('NODE_ENV must be set to "production"');
      score -= 20;
    }

    // 2. Critical secret validation
    const secretResults = this.validateCriticalSecrets(environment);
    errors.push(...secretResults.errors);
    warnings.push(...secretResults.warnings);
    score -= secretResults.scoreDeduction;

    // 3. Security configuration validation
    const securityResults = this.validateSecurityConfig(environment);
    errors.push(...securityResults.errors);
    warnings.push(...securityResults.warnings);
    score -= securityResults.scoreDeduction;

    // 4. Database security validation
    const dbResults = this.validateDatabaseSecurity(environment);
    errors.push(...dbResults.errors);
    warnings.push(...dbResults.warnings);
    score -= dbResults.scoreDeduction;

    // 5. Network security validation
    const networkResults = this.validateNetworkSecurity(environment);
    errors.push(...networkResults.errors);
    warnings.push(...networkResults.warnings);
    score -= networkResults.scoreDeduction;

    // 6. Production-specific settings
    const settingsResults = this.validateProductionSettings(environment);
    errors.push(...settingsResults.errors);
    warnings.push(...settingsResults.warnings);
    score -= settingsResults.scoreDeduction;

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score)
    };

    this.printValidationReport(result);
    return result;
  }

  /**
   * Validate critical secrets (JWT, session, etc.)
   */
  private static validateCriticalSecrets(env: Environment) {
    const errors: string[] = [];
    const warnings: string[] = [];
    let scoreDeduction = 0;

    console.log('🔐 Checking critical secrets...');

    const secrets = [
      { name: 'JWT_SECRET', value: env.JWT_SECRET },
      { name: 'JWT_REFRESH_SECRET', value: env.JWT_REFRESH_SECRET },
      { name: 'SESSION_SECRET', value: env.SESSION_SECRET },
      { name: 'CSRF_SECRET', value: env.CSRF_SECRET },
      { name: 'DATABASE_ENCRYPTION_KEY', value: env.DATABASE_ENCRYPTION_KEY }
    ];

    for (const secret of secrets) {
      if (!secret.value) continue;

      const requirements = this.PRODUCTION_REQUIREMENTS[secret.name as keyof typeof this.PRODUCTION_REQUIREMENTS];
      if (!requirements) continue;

      // Check forbidden values
      const hasForbiddenValue = this.FORBIDDEN_VALUES.some(forbidden => 
        secret.value!.toLowerCase().includes(forbidden.toLowerCase())
      );

      if (hasForbiddenValue) {
        errors.push(`${secret.name} contains forbidden values (example/default patterns)`);
        scoreDeduction += 15;
        continue;
      }

      // Check length requirements
      if (secret.value.length < requirements.minLength) {
        errors.push(`${secret.name} must be at least ${requirements.minLength} characters in production`);
        scoreDeduction += 10;
        continue;
      }

      // Check format requirements
      if (requirements.format === 'hex' && !/^[a-fA-F0-9]+$/.test(secret.value)) {
        errors.push(`${secret.name} must be a valid hexadecimal string`);
        scoreDeduction += 10;
        continue;
      }

      // Analyze secret strength
      const strength = this.analyzeSecretStrength(secret.value);
      
      if (requirements.minEntropy && strength.entropy < requirements.minEntropy) {
        warnings.push(`${secret.name} has low entropy (${strength.entropy.toFixed(2)}, recommended: ${requirements.minEntropy})`);
        scoreDeduction += 5;
      }

      if (strength.strength === 'weak' || strength.strength === 'medium') {
        warnings.push(`${secret.name} strength is ${strength.strength}, consider using stronger secret`);
        scoreDeduction += 3;
      }

      console.log(`  ✓ ${secret.name}: ${strength.strength} (${secret.value.length} chars, entropy: ${strength.entropy.toFixed(2)})`);
    }

    return { errors, warnings, scoreDeduction };
  }

  /**
   * Validate security configuration settings
   */
  private static validateSecurityConfig(env: Environment) {
    const errors: string[] = [];
    const warnings: string[] = [];
    let scoreDeduction = 0;

    console.log('\n🛡️ Checking security configuration...');

    // BCRYPT salt rounds
    if (env.BCRYPT_SALT_ROUNDS < 12) {
      errors.push('BCRYPT_SALT_ROUNDS must be at least 12 in production');
      scoreDeduction += 10;
    } else {
      console.log(`  ✓ BCRYPT_SALT_ROUNDS: ${env.BCRYPT_SALT_ROUNDS} (secure)`);
    }

    // Login attempt limits
    if (env.MAX_LOGIN_ATTEMPTS > 3) {
      warnings.push('MAX_LOGIN_ATTEMPTS should be 3 or less in production');
      scoreDeduction += 5;
    } else {
      console.log(`  ✓ MAX_LOGIN_ATTEMPTS: ${env.MAX_LOGIN_ATTEMPTS} (secure)`);
    }

    // Lockout time
    if (env.LOCKOUT_TIME < 30) {
      warnings.push('LOCKOUT_TIME should be at least 30 minutes in production');
      scoreDeduction += 3;
    } else {
      console.log(`  ✓ LOCKOUT_TIME: ${env.LOCKOUT_TIME} minutes (secure)`);
    }

    // JWT expiration
    if (env.JWT_EXPIRES_IN && this.parseTimeToMinutes(env.JWT_EXPIRES_IN) > 60) {
      warnings.push('JWT_EXPIRES_IN is longer than 1 hour, consider shorter expiration for production');
      scoreDeduction += 2;
    }

    return { errors, warnings, scoreDeduction };
  }

  /**
   * Validate database security settings
   */
  private static validateDatabaseSecurity(env: Environment) {
    const errors: string[] = [];
    const warnings: string[] = [];
    let scoreDeduction = 0;

    console.log('\n🗄️ Checking database security...');

    // Database URL security
    if (env.DATABASE_URL.includes('://') && !env.DATABASE_URL.includes('sslmode=require')) {
      if (env.DATABASE_URL.startsWith('postgresql://') || env.DATABASE_URL.startsWith('postgres://')) {
        warnings.push('DATABASE_URL should include sslmode=require for production');
        scoreDeduction += 5;
      }
    }

    // Check for weak database credentials
    if (env.DATABASE_URL.includes('password') || env.DATABASE_URL.includes('123456')) {
      errors.push('DATABASE_URL appears to contain weak credentials');
      scoreDeduction += 15;
    }

    // File-based databases in production warning
    if (env.DATABASE_URL.startsWith('file:')) {
      warnings.push('File-based database detected - consider using a proper database server in production');
      scoreDeduction += 10;
    } else {
      console.log('  ✓ Database URL appears properly configured');
    }

    return { errors, warnings, scoreDeduction };
  }

  /**
   * Validate network security settings
   */
  private static validateNetworkSecurity(env: Environment) {
    const errors: string[] = [];
    const warnings: string[] = [];
    let scoreDeduction = 0;

    console.log('\n🌐 Checking network security...');

    // CORS origins
    if (env.CORS_ORIGIN && (env.CORS_ORIGIN === '*' || env.CORS_ORIGIN.includes('localhost'))) {
      errors.push('CORS_ORIGIN must not be wildcard (*) or include localhost in production');
      scoreDeduction += 10;
    }

    // Application URLs
    if (env.FRONTEND_URL.includes('localhost') || env.API_URL.includes('localhost')) {
      errors.push('Application URLs must not include localhost in production');
      scoreDeduction += 5;
    }

    // HTTPS requirement
    if (!env.FRONTEND_URL.startsWith('https://') || !env.API_URL.startsWith('https://')) {
      errors.push('Application URLs must use HTTPS in production');
      scoreDeduction += 15;
    } else {
      console.log('  ✓ Application URLs use HTTPS');
    }

    return { errors, warnings, scoreDeduction };
  }

  /**
   * Validate production-specific settings
   */
  private static validateProductionSettings(env: Environment) {
    const errors: string[] = [];
    const warnings: string[] = [];
    let scoreDeduction = 0;

    console.log('\n⚙️ Checking production settings...');

    // Logging levels
    if (env.LOG_LEVEL === 'debug') {
      warnings.push('LOG_LEVEL should not be "debug" in production');
      scoreDeduction += 3;
    }

    // Request logging
    if (env.ENABLE_REQUEST_LOGGING === true) {
      warnings.push('Consider disabling request logging in production for performance');
      scoreDeduction += 2;
    }

    // Rate limiting
    if (env.RATE_LIMIT_MAX_REQUESTS > 1000) {
      warnings.push('RATE_LIMIT_MAX_REQUESTS is very high, consider lowering for production');
      scoreDeduction += 2;
    }

    // Health check timeout
    if (env.HEALTH_CHECK_TIMEOUT > 30000) {
      warnings.push('HEALTH_CHECK_TIMEOUT is high, consider lowering for faster failure detection');
      scoreDeduction += 1;
    }

    console.log('  ✓ Production settings reviewed');

    return { errors, warnings, scoreDeduction };
  }

  /**
   * Analyze secret strength using various metrics
   */
  static analyzeSecretStrength(secret: string): SecretStrengthResult {
    const length = secret.length;
    const hasUpperCase = /[A-Z]/.test(secret);
    const hasLowerCase = /[a-z]/.test(secret);
    const hasNumbers = /[0-9]/.test(secret);
    const hasSpecialChars = /[^A-Za-z0-9]/.test(secret);

    // Calculate character set size
    let charsetSize = 0;
    if (hasLowerCase) charsetSize += 26;
    if (hasUpperCase) charsetSize += 26;
    if (hasNumbers) charsetSize += 10;
    if (hasSpecialChars) charsetSize += 32; // Approximate special chars

    // Calculate entropy (bits)
    const entropy = length * Math.log2(charsetSize);

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
    if (entropy < 40 || length < 12) {
      strength = 'weak';
    } else if (entropy < 60 || length < 16) {
      strength = 'medium';
    } else if (entropy < 80 || length < 32) {
      strength = 'strong';
    } else {
      strength = 'very-strong';
    }

    return {
      entropy: entropy / 8, // Convert to bytes for easier reading
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChars,
      length,
      strength
    };
  }

  /**
   * Parse time string to minutes
   */
  private static parseTimeToMinutes(timeString: string): number {
    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value / 60;
      case 'm': return value;
      case 'h': return value * 60;
      case 'd': return value * 60 * 24;
      default: return 0;
    }
  }

  /**
   * Print detailed validation report
   */
  private static printValidationReport(result: ValidationResult): void {
    console.log('\n📊 Production Validation Report');
    console.log('━'.repeat(50));
    console.log(`Security Score: ${result.score}/100`);
    console.log(`Status: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Critical Issues:');
      result.errors.forEach(error => console.log(`   • ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    console.log('\n' + this.getScoreInterpretation(result.score));
    
    if (!result.valid) {
      console.log('\n🚨 DEPLOYMENT BLOCKED: Fix critical issues before proceeding to production');
    } else if (result.warnings.length > 0) {
      console.log('\n✅ Ready for production (with warnings noted above)');
    } else {
      console.log('\n🎉 Excellent! Configuration is production-ready with no issues');
    }

    console.log('━'.repeat(50));
  }

  /**
   * Get score interpretation message
   */
  private static getScoreInterpretation(score: number): string {
    if (score >= 95) return '🌟 Exceptional security configuration';
    if (score >= 85) return '🏆 Excellent security configuration';
    if (score >= 75) return '✅ Good security configuration';
    if (score >= 65) return '⚠️ Acceptable security configuration with room for improvement';
    if (score >= 50) return '⚠️ Below average security configuration - improvements recommended';
    return '🚨 Poor security configuration - immediate action required';
  }

  /**
   * Validate production readiness and fail fast if critical issues exist
   */
  static validateAndFailFast(): Environment {
    const environment = env; // Get validated environment
    
    if (environment.NODE_ENV === 'production') {
      const result = this.validateProductionConfig(environment);
      
      if (!result.valid) {
        console.error('\n🛑 CRITICAL: Production validation failed!');
        console.error('Application cannot start in production with current configuration.');
        console.error('Fix the issues above and try again.\n');
        process.exit(1);
      }
    }

    return environment;
  }
}

// Export for use in application startup
export const validatedEnv = ProductionValidator.validateAndFailFast();