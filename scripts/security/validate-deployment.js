#!/usr/bin/env node

/**
 * Deployment Validation Script
 * 
 * Comprehensive validation before production deployment.
 * Checks secrets, configuration, and security requirements.
 * 
 * Usage:
 *   node scripts/security/validate-deployment.js [--env .env.production]
 */

const fs = require('fs');
const path = require('path');
const { SecureSecretsGenerator } = require('./generate-secrets');
const { SecretRotationManager } = require('./rotate-secrets');

class DeploymentValidator {
  constructor() {
    this.generator = new SecureSecretsGenerator();
    this.rotationManager = new SecretRotationManager();
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  /**
   * Run complete deployment validation
   */
  async validateDeployment(envFile = '.env.production') {
    console.log('🚀 Production Deployment Validation');
    console.log('━'.repeat(50));
    console.log(`Environment file: ${envFile}`);
    console.log(`Validation time: ${new Date().toISOString()}\n`);

    // 1. Check if environment file exists
    await this.checkEnvironmentFile(envFile);

    // 2. Validate secret strength
    await this.validateSecretStrength(envFile);

    // 3. Check for default/forbidden values
    await this.checkForbiddenValues(envFile);

    // 4. Validate environment configuration
    await this.validateEnvironmentConfig(envFile);

    // 5. Security configuration checks
    await this.validateSecurityConfig(envFile);

    // 6. Network security checks
    await this.validateNetworkConfig(envFile);

    // 7. Check .gitignore configuration
    await this.checkGitIgnoreConfig();

    // 8. Validate file permissions
    await this.checkFilePermissions(envFile);

    // Print final results
    this.printResults();
    
    return {
      success: this.results.failed === 0,
      passed: this.results.passed,
      failed: this.results.failed,
      warnings: this.results.warnings,
      details: this.results.details
    };
  }

  /**
   * Check if environment file exists and is readable
   */
  async checkEnvironmentFile(envFile) {
    console.log('📄 Checking environment file...');
    
    if (!fs.existsSync(envFile)) {
      this.addResult('FAILED', 'Environment file does not exist', envFile);
      return;
    }

    try {
      const stats = fs.statSync(envFile);
      const permissions = (stats.mode & parseInt('777', 8)).toString(8);
      
      if (permissions !== '600') {
        this.addResult('WARNING', 'File permissions should be 600 (owner read/write only)', `${envFile}: ${permissions}`);
      } else {
        this.addResult('PASSED', 'File permissions are secure', `${envFile}: ${permissions}`);
      }
      
      // Check file size (should not be empty)
      if (stats.size === 0) {
        this.addResult('FAILED', 'Environment file is empty', envFile);
      } else {
        this.addResult('PASSED', 'Environment file exists and has content', `${stats.size} bytes`);
      }
    } catch (error) {
      this.addResult('FAILED', 'Cannot read environment file', error.message);
    }
  }

  /**
   * Validate all secrets meet strength requirements
   */
  async validateSecretStrength(envFile) {
    console.log('\n🔐 Validating secret strength...');
    
    try {
      const auditResults = this.rotationManager.auditSecrets(envFile);
      
      for (const result of auditResults) {
        if (result.status === 'VALID') {
          this.addResult('PASSED', `${result.name} strength validation`, result.message);
        } else if (result.status === 'INVALID') {
          this.addResult('FAILED', `${result.name} strength validation`, result.message);
        } else {
          this.addResult('FAILED', `${result.name} is missing`, 'Required secret not found');
        }
      }
    } catch (error) {
      this.addResult('FAILED', 'Secret strength validation failed', error.message);
    }
  }

  /**
   * Check for default or forbidden secret values
   */
  async checkForbiddenValues(envFile) {
    console.log('\n🚫 Checking for forbidden values...');
    
    try {
      const envVars = this.rotationManager.parseEnvFile(envFile);
      const forbiddenPatterns = [
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

      const criticalSecrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET', 'DATABASE_ENCRYPTION_KEY'];
      
      for (const secretName of criticalSecrets) {
        const value = envVars.get(secretName);
        if (!value) continue;

        const hasForbidden = forbiddenPatterns.some(pattern => 
          value.toLowerCase().includes(pattern.toLowerCase())
        );

        if (hasForbidden) {
          this.addResult('FAILED', `${secretName} contains forbidden patterns`, 'Default/example value detected');
        } else {
          this.addResult('PASSED', `${secretName} uses custom value`, 'No forbidden patterns found');
        }
      }
    } catch (error) {
      this.addResult('FAILED', 'Forbidden value check failed', error.message);
    }
  }

  /**
   * Validate environment configuration
   */
  async validateEnvironmentConfig(envFile) {
    console.log('\n⚙️ Validating environment configuration...');
    
    try {
      const envVars = this.rotationManager.parseEnvFile(envFile);
      
      // Check NODE_ENV
      const nodeEnv = envVars.get('NODE_ENV');
      if (nodeEnv === 'production') {
        this.addResult('PASSED', 'NODE_ENV is set to production', nodeEnv);
      } else {
        this.addResult('FAILED', 'NODE_ENV must be set to production', nodeEnv || 'not set');
      }

      // Check required variables
      const requiredVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'FRONTEND_URL',
        'API_URL'
      ];

      for (const varName of requiredVars) {
        if (envVars.has(varName) && envVars.get(varName)) {
          this.addResult('PASSED', `${varName} is configured`, '✓');
        } else {
          this.addResult('FAILED', `${varName} is required`, 'Missing or empty');
        }
      }
    } catch (error) {
      this.addResult('FAILED', 'Environment configuration validation failed', error.message);
    }
  }

  /**
   * Validate security configuration
   */
  async validateSecurityConfig(envFile) {
    console.log('\n🛡️ Validating security configuration...');
    
    try {
      const envVars = this.rotationManager.parseEnvFile(envFile);
      
      // BCRYPT_SALT_ROUNDS
      const saltRounds = parseInt(envVars.get('BCRYPT_SALT_ROUNDS') || '0');
      if (saltRounds >= 12) {
        this.addResult('PASSED', 'BCRYPT_SALT_ROUNDS is secure', `${saltRounds} rounds`);
      } else {
        this.addResult('FAILED', 'BCRYPT_SALT_ROUNDS must be >= 12 for production', `${saltRounds} rounds`);
      }

      // MAX_LOGIN_ATTEMPTS
      const maxAttempts = parseInt(envVars.get('MAX_LOGIN_ATTEMPTS') || '0');
      if (maxAttempts <= 3 && maxAttempts > 0) {
        this.addResult('PASSED', 'MAX_LOGIN_ATTEMPTS is restrictive', `${maxAttempts} attempts`);
      } else {
        this.addResult('WARNING', 'MAX_LOGIN_ATTEMPTS should be 3 or less', `${maxAttempts} attempts`);
      }

      // LOCKOUT_TIME
      const lockoutTime = parseInt(envVars.get('LOCKOUT_TIME') || '0');
      if (lockoutTime >= 30) {
        this.addResult('PASSED', 'LOCKOUT_TIME is secure', `${lockoutTime} minutes`);
      } else {
        this.addResult('WARNING', 'LOCKOUT_TIME should be >= 30 minutes', `${lockoutTime} minutes`);
      }
    } catch (error) {
      this.addResult('FAILED', 'Security configuration validation failed', error.message);
    }
  }

  /**
   * Validate network configuration
   */
  async validateNetworkConfig(envFile) {
    console.log('\n🌐 Validating network configuration...');
    
    try {
      const envVars = this.rotationManager.parseEnvFile(envFile);
      
      // Check HTTPS usage
      const frontendUrl = envVars.get('FRONTEND_URL') || '';
      const apiUrl = envVars.get('API_URL') || '';
      
      if (frontendUrl.startsWith('https://')) {
        this.addResult('PASSED', 'FRONTEND_URL uses HTTPS', frontendUrl);
      } else {
        this.addResult('FAILED', 'FRONTEND_URL must use HTTPS in production', frontendUrl);
      }

      if (apiUrl.startsWith('https://')) {
        this.addResult('PASSED', 'API_URL uses HTTPS', apiUrl);
      } else {
        this.addResult('FAILED', 'API_URL must use HTTPS in production', apiUrl);
      }

      // Check for localhost usage
      if (frontendUrl.includes('localhost') || apiUrl.includes('localhost')) {
        this.addResult('FAILED', 'URLs must not contain localhost in production', 'localhost detected');
      } else {
        this.addResult('PASSED', 'URLs do not contain localhost', 'Production URLs configured');
      }

      // Check CORS configuration
      const corsOrigin = envVars.get('CORS_ORIGIN') || '';
      if (corsOrigin === '*') {
        this.addResult('FAILED', 'CORS_ORIGIN must not be wildcard in production', corsOrigin);
      } else if (corsOrigin && !corsOrigin.includes('localhost')) {
        this.addResult('PASSED', 'CORS_ORIGIN is properly configured', corsOrigin);
      } else {
        this.addResult('WARNING', 'CORS_ORIGIN should be configured for production', corsOrigin || 'not set');
      }
    } catch (error) {
      this.addResult('FAILED', 'Network configuration validation failed', error.message);
    }
  }

  /**
   * Check .gitignore configuration
   */
  async checkGitIgnoreConfig() {
    console.log('\n📋 Checking .gitignore configuration...');
    
    try {
      const gitignorePath = '.gitignore';
      
      if (!fs.existsSync(gitignorePath)) {
        this.addResult('FAILED', '.gitignore file does not exist', 'Create .gitignore file');
        return;
      }

      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      
      // Check if production env files are ignored
      if (gitignoreContent.includes('.env.production')) {
        this.addResult('PASSED', '.env.production is in .gitignore', '✓');
      } else {
        this.addResult('FAILED', '.env.production must be in .gitignore', 'Add .env.production to .gitignore');
      }

      // Check if backup directories are ignored
      if (gitignoreContent.includes('config/backups/') || gitignoreContent.includes('scripts/security/backups/')) {
        this.addResult('PASSED', 'Backup directories are in .gitignore', '✓');
      } else {
        this.addResult('WARNING', 'Consider adding backup directories to .gitignore', 'config/backups/, scripts/security/backups/');
      }
    } catch (error) {
      this.addResult('FAILED', '.gitignore validation failed', error.message);
    }
  }

  /**
   * Check file permissions
   */
  async checkFilePermissions(envFile) {
    console.log('\n🔒 Checking file permissions...');
    
    try {
      if (fs.existsSync(envFile)) {
        const stats = fs.statSync(envFile);
        const permissions = (stats.mode & parseInt('777', 8)).toString(8);
        
        if (permissions === '600') {
          this.addResult('PASSED', 'Environment file permissions are secure', `${permissions} (owner read/write only)`);
        } else {
          this.addResult('WARNING', 'Environment file permissions should be 600', `Current: ${permissions}, run: chmod 600 ${envFile}`);
        }
      }

      // Check script permissions
      const scriptFiles = [
        'scripts/security/generate-secrets.js',
        'scripts/security/rotate-secrets.js'
      ];

      for (const scriptFile of scriptFiles) {
        if (fs.existsSync(scriptFile)) {
          const stats = fs.statSync(scriptFile);
          const permissions = (stats.mode & parseInt('777', 8)).toString(8);
          
          if (permissions === '755' || permissions === '700') {
            this.addResult('PASSED', `${scriptFile} permissions are correct`, permissions);
          } else {
            this.addResult('WARNING', `${scriptFile} should be executable`, `Current: ${permissions}, run: chmod 755 ${scriptFile}`);
          }
        }
      }
    } catch (error) {
      this.addResult('FAILED', 'File permissions check failed', error.message);
    }
  }

  /**
   * Add result to tracking
   */
  addResult(status, test, details) {
    const result = {
      status,
      test,
      details,
      timestamp: new Date().toISOString()
    };

    this.results.details.push(result);

    if (status === 'PASSED') {
      this.results.passed++;
      console.log(`   ✅ ${test}: ${details}`);
    } else if (status === 'FAILED') {
      this.results.failed++;
      console.log(`   ❌ ${test}: ${details}`);
    } else if (status === 'WARNING') {
      this.results.warnings++;
      console.log(`   ⚠️  ${test}: ${details}`);
    }
  }

  /**
   * Print final validation results
   */
  printResults() {
    console.log('\n📊 Deployment Validation Results');
    console.log('━'.repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`📋 Total Checks: ${this.results.details.length}`);
    
    const score = Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100) || 0;
    console.log(`🎯 Success Rate: ${score}%`);
    
    console.log('\n' + this.getDeploymentRecommendation());
    console.log('━'.repeat(50));
  }

  /**
   * Get deployment recommendation based on results
   */
  getDeploymentRecommendation() {
    if (this.results.failed === 0 && this.results.warnings === 0) {
      return '🎉 READY FOR DEPLOYMENT: All checks passed with no issues!';
    } else if (this.results.failed === 0) {
      return '✅ READY FOR DEPLOYMENT: All critical checks passed (warnings noted above)';
    } else if (this.results.failed <= 2) {
      return '⚠️  DEPLOYMENT ISSUES: Fix the failed checks above before deploying';
    } else {
      return '🚨 DEPLOYMENT BLOCKED: Multiple critical issues must be resolved';
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Deployment Validation Script

Usage:
  node validate-deployment.js [--env <file>] [--json]

Options:
  --env <file>    Environment file to validate (default: .env.production)
  --json          Output results in JSON format
  --help          Show this help message

Examples:
  node validate-deployment.js
  node validate-deployment.js --env .env.staging
  node validate-deployment.js --json > validation-report.json
`);
    return;
  }

  const envFile = args.includes('--env') 
    ? args[args.indexOf('--env') + 1] 
    : '.env.production';
  
  const jsonOutput = args.includes('--json');

  const validator = new DeploymentValidator();
  
  try {
    const results = await validator.validateDeployment(envFile);
    
    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2));
    }
    
    // Exit with error code if validation failed
    if (!results.success) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Deployment validation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DeploymentValidator };