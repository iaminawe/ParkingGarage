#!/usr/bin/env node

/**
 * Production-Grade Secrets Generator
 * 
 * Generates cryptographically secure secrets for production deployment.
 * Uses Node.js crypto module for secure random generation.
 * 
 * Usage:
 *   node scripts/security/generate-secrets.js [--output .env.production] [--format env|json]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecureSecretsGenerator {
  constructor() {
    this.secrets = new Map();
    this.validationRules = new Map([
      ['JWT_SECRET', { minLength: 64, pattern: /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/ }],
      ['JWT_REFRESH_SECRET', { minLength: 64, pattern: /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/ }],
      ['SESSION_SECRET', { minLength: 64, pattern: /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/ }],
      ['DATABASE_ENCRYPTION_KEY', { minLength: 64, isHex: true }],
      ['API_KEY', { minLength: 32, pattern: /^[A-Za-z0-9_-]+$/ }]
    ]);
  }

  /**
   * Generate cryptographically secure random string
   */
  generateSecureString(length = 64, charset = 'base64url') {
    if (charset === 'hex') {
      return crypto.randomBytes(length / 2).toString('hex');
    } else if (charset === 'base64url') {
      // Base64url safe characters (no padding)
      return crypto.randomBytes(Math.ceil(length * 3 / 4))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
        .substring(0, length);
    } else if (charset === 'alphanumeric') {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      const bytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
      }
      return result;
    } else if (charset === 'complex') {
      // Complex charset with special characters
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
      let result = '';
      const bytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
      }
      return result;
    }
    
    throw new Error(`Unsupported charset: ${charset}`);
  }

  /**
   * Generate 256-bit encryption key as hex string
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex'); // 256 bits
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Generate API key with prefix
   */
  generateAPIKey(prefix = 'pk', length = 32) {
    const key = this.generateSecureString(length, 'alphanumeric');
    return `${prefix}_${key}`;
  }

  /**
   * Validate secret strength
   */
  validateSecret(name, value) {
    const rule = this.validationRules.get(name);
    if (!rule) return { valid: true, message: 'No validation rule defined' };

    if (rule.minLength && value.length < rule.minLength) {
      return {
        valid: false,
        message: `Secret must be at least ${rule.minLength} characters long`
      };
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      return {
        valid: false,
        message: 'Secret contains invalid characters'
      };
    }

    if (rule.isHex && !/^[a-fA-F0-9]+$/.test(value)) {
      return {
        valid: false,
        message: 'Secret must be valid hexadecimal'
      };
    }

    return { valid: true, message: 'Secret is valid' };
  }

  /**
   * Generate all production secrets
   */
  generateAllSecrets() {
    console.log('🔐 Generating production-grade secrets...\n');

    // JWT Secrets (64 chars, complex charset for maximum entropy)
    const jwtSecret = this.generateSecureString(64, 'complex');
    this.secrets.set('JWT_SECRET', jwtSecret);
    console.log('✓ Generated JWT_SECRET (64 chars, high entropy)');

    const jwtRefreshSecret = this.generateSecureString(64, 'complex');
    this.secrets.set('JWT_REFRESH_SECRET', jwtRefreshSecret);
    console.log('✓ Generated JWT_REFRESH_SECRET (64 chars, high entropy)');

    // Session Secret (64 chars, complex charset)
    const sessionSecret = this.generateSecureString(64, 'complex');
    this.secrets.set('SESSION_SECRET', sessionSecret);
    console.log('✓ Generated SESSION_SECRET (64 chars, high entropy)');

    // Database Encryption Key (256-bit hex)
    const dbEncryptionKey = this.generateEncryptionKey();
    this.secrets.set('DATABASE_ENCRYPTION_KEY', dbEncryptionKey);
    console.log('✓ Generated DATABASE_ENCRYPTION_KEY (256-bit hex)');

    // CSRF Secret
    const csrfSecret = this.generateSecureString(64, 'complex');
    this.secrets.set('CSRF_SECRET', csrfSecret);
    console.log('✓ Generated CSRF_SECRET (64 chars, high entropy)');

    // API Keys for external services (placeholders)
    const paymentApiKey = this.generateAPIKey('pk_live', 48);
    this.secrets.set('PAYMENT_API_KEY', paymentApiKey);
    console.log('✓ Generated PAYMENT_API_KEY (secure format)');

    const emailApiKey = this.generateSecureString(40, 'base64url');
    this.secrets.set('SENDGRID_API_KEY', emailApiKey);
    console.log('✓ Generated SENDGRID_API_KEY (40 chars)');

    // Webhook signing secrets
    const webhookSecret = this.generateSecureString(32, 'base64url');
    this.secrets.set('WEBHOOK_SECRET', webhookSecret);
    console.log('✓ Generated WEBHOOK_SECRET (32 chars)');

    // Redis auth token (if using Redis)
    const redisAuth = this.generateSecureString(32, 'alphanumeric');
    this.secrets.set('REDIS_PASSWORD', redisAuth);
    console.log('✓ Generated REDIS_PASSWORD (32 chars)');

    // Monitoring API key
    const monitoringKey = this.generateAPIKey('mon', 32);
    this.secrets.set('MONITORING_API_KEY', monitoringKey);
    console.log('✓ Generated MONITORING_API_KEY (secure format)');

    console.log(`\n✅ Generated ${this.secrets.size} production-grade secrets`);
    return this.secrets;
  }

  /**
   * Validate all generated secrets
   */
  validateAllSecrets() {
    console.log('\n🔍 Validating secret strength...\n');
    let allValid = true;

    for (const [name, value] of this.secrets.entries()) {
      const validation = this.validateSecret(name, value);
      if (validation.valid) {
        console.log(`✓ ${name}: ${validation.message}`);
      } else {
        console.error(`✗ ${name}: ${validation.message}`);
        allValid = false;
      }
    }

    if (allValid) {
      console.log('\n✅ All secrets passed validation');
    } else {
      console.error('\n❌ Some secrets failed validation');
    }

    return allValid;
  }

  /**
   * Generate .env.production file
   */
  generateProductionEnv() {
    const envContent = `# Production Environment Configuration
# Generated on: ${new Date().toISOString()}
# WARNING: Keep this file secure and never commit to version control

# Server Configuration
NODE_ENV=production
PORT=8742
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/parking_garage_prod?sslmode=require

# Security Secrets (CRITICAL - Change these in production)
JWT_SECRET=${this.secrets.get('JWT_SECRET')}
JWT_REFRESH_SECRET=${this.secrets.get('JWT_REFRESH_SECRET')}
SESSION_SECRET=${this.secrets.get('SESSION_SECRET')}
DATABASE_ENCRYPTION_KEY=${this.secrets.get('DATABASE_ENCRYPTION_KEY')}
CSRF_SECRET=${this.secrets.get('CSRF_SECRET')}

# JWT Configuration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security Configuration
BCRYPT_SALT_ROUNDS=14
MAX_LOGIN_ATTEMPTS=3
LOCKOUT_TIME=30

# CORS Configuration
CORS_ORIGIN=https://your-production-domain.com
ALLOWED_ORIGINS=https://your-production-domain.com,https://api.your-production-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis Configuration (if using Redis for sessions/caching)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=${this.secrets.get('REDIS_PASSWORD')}

# Email Configuration (Sendgrid example)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=${this.secrets.get('SENDGRID_API_KEY')}
EMAIL_FROM=noreply@your-production-domain.com
EMAIL_FROM_NAME=Parking Garage System

# Payment Gateway Configuration (Stripe example)
PAYMENT_API_KEY=${this.secrets.get('PAYMENT_API_KEY')}
PAYMENT_WEBHOOK_SECRET=${this.secrets.get('WEBHOOK_SECRET')}

# Application URLs
FRONTEND_URL=https://your-production-domain.com
API_URL=https://api.your-production-domain.com

# Monitoring Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
MONITORING_API_KEY=${this.secrets.get('MONITORING_API_KEY')}

# Logging Configuration
LOG_LEVEL=warn
LOG_FILE_DATE_PATTERN=YYYY-MM-DD-HH
LOG_FILE_MAX_SIZE=50m
LOG_FILE_MAX_FILES=30d
ENABLE_ERROR_LOGGING=true
ENABLE_REQUEST_LOGGING=false

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=10000
ENABLE_METRICS=true

# OAuth Configuration (optional)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret

# Rate Limiting for Email
EMAIL_RATE_LIMIT_PER_HOUR=50
EMAIL_RATE_LIMIT_PER_RECIPIENT_HOUR=3
`;

    return envContent;
  }

  /**
   * Generate .env.example template
   */
  generateEnvExample() {
    return `# Environment Configuration Template
# Copy this file to .env and fill in your actual values

# Server Configuration
NODE_ENV=development
PORT=8742
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=file:./dev.db

# Security Secrets (REQUIRED - Generate secure values)
JWT_SECRET=your-super-secure-jwt-secret-minimum-64-characters-long
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-minimum-64-characters-long
SESSION_SECRET=your-super-secure-session-secret-minimum-64-characters-long
DATABASE_ENCRYPTION_KEY=your-256-bit-database-encryption-key-as-hex-string
CSRF_SECRET=your-super-secure-csrf-secret-minimum-64-characters-long

# JWT Configuration
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Security Configuration
BCRYPT_SALT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=15

# CORS Configuration
CORS_ORIGIN=http://localhost:8742
ALLOWED_ORIGINS=http://localhost:8742,http://127.0.0.1:8742,http://localhost:9000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis Configuration (optional)
# REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=your-redis-password

# Email Configuration (choose one provider)
EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=true
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=your-app-password
# EMAIL_FROM=noreply@yourdomain.com
# EMAIL_FROM_NAME=Your App Name

# Sendgrid Configuration
# SENDGRID_API_KEY=your-sendgrid-api-key

# Payment Gateway Configuration
# PAYMENT_API_KEY=your-payment-api-key
# PAYMENT_WEBHOOK_SECRET=your-webhook-secret

# Application URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:8742

# Monitoring Configuration (optional)
# SENTRY_DSN=your-sentry-dsn
# SENTRY_ENVIRONMENT=development
# SENTRY_TRACES_SAMPLE_RATE=0.1
# MONITORING_API_KEY=your-monitoring-api-key

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_DATE_PATTERN=YYYY-MM-DD-HH
LOG_FILE_MAX_SIZE=20m
LOG_FILE_MAX_FILES=14d
ENABLE_ERROR_LOGGING=true
ENABLE_REQUEST_LOGGING=true

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=30000
ENABLE_METRICS=false

# OAuth Configuration (optional)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret

# Rate Limiting for Email
EMAIL_RATE_LIMIT_PER_HOUR=100
EMAIL_RATE_LIMIT_PER_RECIPIENT_HOUR=5
`;
  }

  /**
   * Export secrets as JSON
   */
  exportAsJSON() {
    const secrets = Object.fromEntries(this.secrets);
    return JSON.stringify(secrets, null, 2);
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const outputFile = args.includes('--output') 
    ? args[args.indexOf('--output') + 1] 
    : '.env.production';
  const format = args.includes('--format') 
    ? args[args.indexOf('--format') + 1] 
    : 'env';

  const generator = new SecureSecretsGenerator();
  
  // Generate all secrets
  generator.generateAllSecrets();
  
  // Validate secrets
  const isValid = generator.validateAllSecrets();
  
  if (!isValid) {
    console.error('\n❌ Secret generation failed validation');
    process.exit(1);
  }

  // Output based on format
  if (format === 'json') {
    const jsonOutput = generator.exportAsJSON();
    console.log('\n📄 Generated secrets (JSON format):');
    console.log(jsonOutput);
    
    if (outputFile) {
      fs.writeFileSync(outputFile, jsonOutput);
      console.log(`\n💾 Secrets saved to: ${outputFile}`);
    }
  } else {
    const envContent = generator.generateProductionEnv();
    const exampleContent = generator.generateEnvExample();
    
    // Write production env file
    fs.writeFileSync(outputFile, envContent);
    console.log(`\n💾 Production environment file created: ${outputFile}`);
    
    // Write example env file
    const examplePath = '.env.example';
    fs.writeFileSync(examplePath, exampleContent);
    console.log(`💾 Environment template created: ${examplePath}`);
  }

  console.log('\n🔒 SECURITY REMINDER:');
  console.log('   - Never commit .env.production to version control');
  console.log('   - Store production secrets in a secure vault');
  console.log('   - Rotate secrets regularly');
  console.log('   - Use different secrets for each environment');
  console.log('\n✅ Secret generation complete!');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { SecureSecretsGenerator };