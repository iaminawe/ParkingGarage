const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { SecureSecretsGenerator } = require('../../scripts/security/generate-secrets');
const { SecretRotationManager } = require('../../scripts/security/rotate-secrets');
const { ProductionValidator } = require('../../src/config/production-validator.ts');

describe('Secrets Management System', () => {
  let generator;
  let rotationManager;
  const testEnvFile = path.join(__dirname, 'test.env');
  const testBackupDir = path.join(__dirname, 'test-backups');

  beforeAll(() => {
    generator = new SecureSecretsGenerator();
    rotationManager = new SecretRotationManager();
    
    // Create test backup directory
    if (!fs.existsSync(testBackupDir)) {
      fs.mkdirSync(testBackupDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    [testEnvFile].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    // Clean up test backup directory
    if (fs.existsSync(testBackupDir)) {
      const files = fs.readdirSync(testBackupDir);
      files.forEach(file => fs.unlinkSync(path.join(testBackupDir, file)));
      fs.rmdirSync(testBackupDir);
    }
  });

  describe('SecureSecretsGenerator', () => {
    test('should generate cryptographically secure strings', () => {
      const secret1 = generator.generateSecureString(64, 'complex');
      const secret2 = generator.generateSecureString(64, 'complex');
      
      expect(secret1).toHaveLength(64);
      expect(secret2).toHaveLength(64);
      expect(secret1).not.toBe(secret2); // Should be different
      expect(secret1).toMatch(/^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/);
    });

    test('should generate proper hex encryption keys', () => {
      const key = generator.generateEncryptionKey();
      
      expect(key).toHaveLength(64); // 256 bits = 64 hex chars
      expect(key).toMatch(/^[a-fA-F0-9]+$/);
    });

    test('should generate valid API keys with prefixes', () => {
      const apiKey = generator.generateAPIKey('pk_test', 32);
      
      expect(apiKey).toMatch(/^pk_test_[A-Za-z0-9]{32}$/);
    });

    test('should validate secret strength correctly', () => {
      // Test strong secret
      const strongSecret = 'Tr0ub4dor&3$ComplexP@ssw0rd!WithManyCharacters2024';
      const strongValidation = generator.validateSecret('JWT_SECRET', strongSecret);
      expect(strongValidation.valid).toBe(true);

      // Test weak secret
      const weakSecret = 'password123';
      const weakValidation = generator.validateSecret('JWT_SECRET', weakSecret);
      expect(weakValidation.valid).toBe(false);
      expect(weakValidation.message).toContain('at least 64 characters');
    });

    test('should generate all required production secrets', () => {
      const secrets = generator.generateAllSecrets();
      
      const expectedSecrets = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'SESSION_SECRET',
        'DATABASE_ENCRYPTION_KEY',
        'CSRF_SECRET',
        'PAYMENT_API_KEY',
        'SENDGRID_API_KEY',
        'WEBHOOK_SECRET',
        'REDIS_PASSWORD',
        'MONITORING_API_KEY'
      ];

      expectedSecrets.forEach(secretName => {
        expect(secrets.has(secretName)).toBe(true);
        expect(secrets.get(secretName)).toBeTruthy();
      });
    });

    test('should validate all generated secrets pass strength requirements', () => {
      const secrets = generator.generateAllSecrets();
      const isValid = generator.validateAllSecrets();
      
      expect(isValid).toBe(true);
      
      // Check specific requirements
      expect(secrets.get('JWT_SECRET').length).toBeGreaterThanOrEqual(64);
      expect(secrets.get('DATABASE_ENCRYPTION_KEY')).toMatch(/^[a-fA-F0-9]{64}$/);
      expect(secrets.get('PAYMENT_API_KEY')).toMatch(/^pk_live_/);
    });

    test('should generate production env file with correct format', () => {
      generator.generateAllSecrets();
      const envContent = generator.generateProductionEnv();
      
      expect(envContent).toContain('NODE_ENV=production');
      expect(envContent).toContain('JWT_SECRET=');
      expect(envContent).toContain('DATABASE_ENCRYPTION_KEY=');
      expect(envContent).toContain('# WARNING: Keep this file secure');
      expect(envContent).not.toContain('localhost');
    });

    test('should generate env example with placeholder values', () => {
      const exampleContent = generator.generateEnvExample();
      
      expect(exampleContent).toContain('NODE_ENV=development');
      expect(exampleContent).toContain('JWT_SECRET=your-super-secure-jwt-secret');
      expect(exampleContent).toContain('# Environment Configuration Template');
      expect(exampleContent).toContain('DATABASE_URL=file:./dev.db');
    });
  });

  describe('SecretRotationManager', () => {
    beforeAll(() => {
      // Create a test environment file
      const testEnvContent = `NODE_ENV=production
JWT_SECRET=old-jwt-secret-that-needs-rotation-for-testing-purposes-64chars
JWT_REFRESH_SECRET=old-refresh-secret-that-needs-rotation-testing-64chars
DATABASE_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
`;
      fs.writeFileSync(testEnvFile, testEnvContent);
    });

    test('should create backup before rotation', () => {
      expect(() => {
        rotationManager.createBackup(testEnvFile);
      }).not.toThrow();

      // Check backup was created
      const backupFiles = fs.readdirSync(path.dirname(testEnvFile))
        .filter(file => file.includes('.backup'));
      
      expect(backupFiles.length).toBeGreaterThan(0);
    });

    test('should parse environment file correctly', () => {
      const envVars = rotationManager.parseEnvFile(testEnvFile);
      
      expect(envVars.get('NODE_ENV')).toBe('production');
      expect(envVars.get('JWT_SECRET')).toBe('old-jwt-secret-that-needs-rotation-for-testing-purposes-64chars');
      expect(envVars.get('DATABASE_ENCRYPTION_KEY')).toBe('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    });

    test('should maintain rotation history', () => {
      const history = rotationManager.getRotationHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    test('should validate rotation requirements', () => {
      const oldValue = 'old-secret-value';
      const newValue = 'new-secret-value-that-is-much-longer-and-more-secure-for-testing';
      
      const validation = generator.validateSecret('JWT_SECRET', newValue);
      expect(validation.valid).toBe(true);
    });

    test('should audit secrets strength in environment file', () => {
      const results = rotationManager.auditSecrets(testEnvFile);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      const jwtResult = results.find(r => r.name === 'JWT_SECRET');
      expect(jwtResult).toBeDefined();
      expect(jwtResult.status).toMatch(/VALID|INVALID/);
    });

    test('should handle cleanup of old backups', () => {
      expect(() => {
        rotationManager.cleanOldBackups();
      }).not.toThrow();
    });
  });

  describe('ProductionValidator', () => {
    test('should analyze secret strength accurately', () => {
      const weakSecret = 'password123';
      const strongSecret = 'Tr0ub4dor&3$2024!ComplexP@ssw0rdWithManyCharactersAndSymbols';
      
      const weakAnalysis = ProductionValidator.analyzeSecretStrength(weakSecret);
      const strongAnalysis = ProductionValidator.analyzeSecretStrength(strongSecret);
      
      expect(weakAnalysis.strength).toBe('weak');
      expect(weakAnalysis.length).toBe(11);
      expect(weakAnalysis.hasNumbers).toBe(true);
      expect(weakAnalysis.hasSpecialChars).toBe(false);
      
      expect(strongAnalysis.strength).toMatch(/strong|very-strong/);
      expect(strongAnalysis.length).toBeGreaterThan(50);
      expect(strongAnalysis.hasUpperCase).toBe(true);
      expect(strongAnalysis.hasLowerCase).toBe(true);
      expect(strongAnalysis.hasNumbers).toBe(true);
      expect(strongAnalysis.hasSpecialChars).toBe(true);
      expect(strongAnalysis.entropy).toBeGreaterThan(4);
    });

    test('should validate production environment requirements', () => {
      const productionEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'ProductionJWTSecret2024!ComplexAndSecureWithManyCharacters',
        JWT_REFRESH_SECRET: 'ProductionRefreshSecret2024!ComplexAndSecureWithManyChars',
        SESSION_SECRET: 'ProductionSessionSecret2024!ComplexAndSecureWithManyChars',
        DATABASE_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        BCRYPT_SALT_ROUNDS: 14,
        MAX_LOGIN_ATTEMPTS: 3,
        LOCKOUT_TIME: 30,
        DATABASE_URL: 'postgresql://user:pass@host:5432/db?sslmode=require',
        FRONTEND_URL: 'https://secure-app.com',
        API_URL: 'https://api.secure-app.com',
        CORS_ORIGIN: 'https://secure-app.com',
        LOG_LEVEL: 'warn',
        ENABLE_REQUEST_LOGGING: false,
        RATE_LIMIT_MAX_REQUESTS: 100,
        HEALTH_CHECK_TIMEOUT: 10000,
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
        RATE_LIMIT_WINDOW_MS: 900000,
        EMAIL_RATE_LIMIT_PER_HOUR: 100,
        EMAIL_RATE_LIMIT_PER_RECIPIENT_HOUR: 5,
        LOG_FILE_DATE_PATTERN: 'YYYY-MM-DD-HH',
        LOG_FILE_MAX_SIZE: '20m',
        LOG_FILE_MAX_FILES: '14d',
        ENABLE_ERROR_LOGGING: true,
        SENTRY_TRACES_SAMPLE_RATE: 0.1,
        ENABLE_METRICS: false,
        PORT: 8742,
        HOST: '0.0.0.0'
      };
      
      const result = ProductionValidator.validateProductionConfig(productionEnv);
      
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(85);
      expect(result.errors.length).toBe(0);
    });

    test('should identify security issues in configuration', () => {
      const insecureEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'password123', // Too weak
        JWT_REFRESH_SECRET: 'short', // Too short
        SESSION_SECRET: undefined,
        DATABASE_ENCRYPTION_KEY: 'not-hex-string',
        BCRYPT_SALT_ROUNDS: 8, // Too low
        MAX_LOGIN_ATTEMPTS: 10, // Too high
        LOCKOUT_TIME: 5, // Too short
        DATABASE_URL: 'postgresql://user:password123@host:5432/db', // No SSL
        FRONTEND_URL: 'http://localhost:3000', // HTTP + localhost
        API_URL: 'http://localhost:8742', // HTTP + localhost
        CORS_ORIGIN: '*', // Wildcard
        LOG_LEVEL: 'debug', // Too verbose
        ENABLE_REQUEST_LOGGING: true,
        RATE_LIMIT_MAX_REQUESTS: 2000, // Too high
        HEALTH_CHECK_TIMEOUT: 60000, // Too long
        JWT_EXPIRES_IN: '24h', // Too long
        JWT_REFRESH_EXPIRES_IN: '30d',
        RATE_LIMIT_WINDOW_MS: 900000,
        EMAIL_RATE_LIMIT_PER_HOUR: 100,
        EMAIL_RATE_LIMIT_PER_RECIPIENT_HOUR: 5,
        LOG_FILE_DATE_PATTERN: 'YYYY-MM-DD-HH',
        LOG_FILE_MAX_SIZE: '20m',
        LOG_FILE_MAX_FILES: '14d',
        ENABLE_ERROR_LOGGING: true,
        SENTRY_TRACES_SAMPLE_RATE: 0.1,
        ENABLE_METRICS: false,
        PORT: 8742,
        HOST: '0.0.0.0'
      };
      
      const result = ProductionValidator.validateProductionConfig(insecureEnv);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);
      expect(result.warnings.length).toBeGreaterThan(3);
      expect(result.score).toBeLessThan(50);
      
      // Check specific error messages
      expect(result.errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
      expect(result.errors.some(e => e.includes('CORS_ORIGIN'))).toBe(true);
      expect(result.errors.some(e => e.includes('HTTPS'))).toBe(true);
      expect(result.errors.some(e => e.includes('BCRYPT_SALT_ROUNDS'))).toBe(true);
    });

    test('should handle forbidden secret values', () => {
      const envWithForbiddenValues = {
        NODE_ENV: 'production',
        JWT_SECRET: 'parking-garage-super-secret-jwt-key-change-in-production-2024',
        JWT_REFRESH_SECRET: 'development-refresh-secret-minimum-32-chars-long-do-not-use-in-production'
      };
      
      const result = ProductionValidator.validateProductionConfig(envWithForbiddenValues);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('forbidden values'))).toBe(true);
    });

    test('should score configuration appropriately', () => {
      // Test different score ranges
      const perfectConfig = {
        NODE_ENV: 'production',
        JWT_SECRET: 'VeryComplexProductionSecret2024!WithManyCharactersAndSymbols$',
        JWT_REFRESH_SECRET: 'VeryComplexRefreshSecret2024!WithManyCharactersAndSymbols$',
        SESSION_SECRET: 'VeryComplexSessionSecret2024!WithManyCharactersAndSymbols$',
        CSRF_SECRET: 'VeryComplexCSRFSecret2024!WithManyCharactersAndSymbols$',
        DATABASE_ENCRYPTION_KEY: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
        BCRYPT_SALT_ROUNDS: 14,
        MAX_LOGIN_ATTEMPTS: 3,
        LOCKOUT_TIME: 60,
        DATABASE_URL: 'postgresql://user:complex@host:5432/db?sslmode=require',
        FRONTEND_URL: 'https://secure-production-app.com',
        API_URL: 'https://api.secure-production-app.com',
        CORS_ORIGIN: 'https://secure-production-app.com',
        LOG_LEVEL: 'error',
        ENABLE_REQUEST_LOGGING: false,
        RATE_LIMIT_MAX_REQUESTS: 50,
        HEALTH_CHECK_TIMEOUT: 5000,
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
        RATE_LIMIT_WINDOW_MS: 900000,
        EMAIL_RATE_LIMIT_PER_HOUR: 50,
        EMAIL_RATE_LIMIT_PER_RECIPIENT_HOUR: 3,
        LOG_FILE_DATE_PATTERN: 'YYYY-MM-DD-HH',
        LOG_FILE_MAX_SIZE: '20m',
        LOG_FILE_MAX_FILES: '14d',
        ENABLE_ERROR_LOGGING: true,
        SENTRY_TRACES_SAMPLE_RATE: 0.1,
        ENABLE_METRICS: true,
        PORT: 8742,
        HOST: '0.0.0.0'
      };
      
      const result = ProductionValidator.validateProductionConfig(perfectConfig);
      
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(90);
    });
  });

  describe('Integration Tests', () => {
    test('should complete full secret lifecycle', () => {
      // 1. Generate secrets
      const secrets = generator.generateAllSecrets();
      expect(secrets.size).toBeGreaterThan(5);
      
      // 2. Validate all secrets
      const validationResult = generator.validateAllSecrets();
      expect(validationResult).toBe(true);
      
      // 3. Create production env
      const envContent = generator.generateProductionEnv();
      expect(envContent).toContain('NODE_ENV=production');
      
      // 4. Test secret strength analysis
      const jwtSecret = secrets.get('JWT_SECRET');
      const strength = ProductionValidator.analyzeSecretStrength(jwtSecret);
      expect(strength.strength).toMatch(/strong|very-strong/);
      expect(strength.length).toBeGreaterThanOrEqual(64);
    });

    test('should handle environment file operations safely', () => {
      // Create test environment
      const testContent = `NODE_ENV=test
JWT_SECRET=test-jwt-secret-for-integration-testing-purposes-64chars
DATABASE_URL=file:./test.db
`;
      fs.writeFileSync(testEnvFile, testContent);
      
      // Parse and validate
      const envVars = rotationManager.parseEnvFile(testEnvFile);
      expect(envVars.get('NODE_ENV')).toBe('test');
      
      // Audit secrets
      const auditResults = rotationManager.auditSecrets(testEnvFile);
      expect(auditResults.length).toBeGreaterThan(0);
      
      // Cleanup
      fs.unlinkSync(testEnvFile);
    });

    test('should prevent production startup with invalid secrets', () => {
      // Mock process.exit to avoid actually exiting during tests
      const originalExit = process.exit;
      const originalConsoleError = console.error;
      const exitCalls = [];
      const errorLogs = [];
      
      process.exit = (code) => exitCalls.push(code);
      console.error = (msg) => errorLogs.push(msg);
      
      try {
        // Set invalid production environment
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'weak';
        
        // This should attempt to exit with code 1
        expect(() => {
          ProductionValidator.validateAndFailFast();
        }).toThrow();
        
        // Restore original environment
        process.env.NODE_ENV = originalEnv;
        
      } finally {
        // Restore original functions
        process.exit = originalExit;
        console.error = originalConsoleError;
      }
    });
  });
});