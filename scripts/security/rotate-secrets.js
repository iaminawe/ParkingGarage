#!/usr/bin/env node

/**
 * Secret Rotation Utility
 * 
 * Safely rotates production secrets with validation and backup.
 * Supports graceful rotation with overlap periods.
 * 
 * Usage:
 *   node scripts/security/rotate-secrets.js --secret JWT_SECRET [--backup]
 *   node scripts/security/rotate-secrets.js --all [--backup]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { SecureSecretsGenerator } = require('./generate-secrets');

class SecretRotationManager {
  constructor() {
    this.generator = new SecureSecretsGenerator();
    this.backupDir = path.join(__dirname, '../../config/backups');
    this.rotationHistory = new Map();
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create backup of current environment file
   */
  createBackup(envFile = '.env.production') {
    this.ensureBackupDirectory();
    
    if (!fs.existsSync(envFile)) {
      throw new Error(`Environment file ${envFile} not found`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `${path.basename(envFile)}.${timestamp}.backup`);
    
    fs.copyFileSync(envFile, backupFile);
    console.log(`📋 Backup created: ${backupFile}`);
    
    return backupFile;
  }

  /**
   * Parse environment file
   */
  parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filePath} not found`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const envVars = new Map();
    
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        envVars.set(key, value);
      }
    }
    
    return envVars;
  }

  /**
   * Update environment file with new secret
   */
  updateEnvFile(filePath, updates) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filePath} not found`);
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    for (const [key, newValue] of updates.entries()) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const replacement = `${key}=${newValue}`;
      
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        console.log(`✓ Updated ${key} in ${filePath}`);
      } else {
        // Add new variable if it doesn't exist
        content += `\n${replacement}`;
        console.log(`+ Added ${key} to ${filePath}`);
      }
    }
    
    // Add rotation timestamp comment
    const timestamp = new Date().toISOString();
    content = `# Last secret rotation: ${timestamp}\n${content}`;
    
    fs.writeFileSync(filePath, content);
  }

  /**
   * Rotate specific secret
   */
  rotateSecret(secretName, envFile = '.env.production') {
    console.log(`🔄 Rotating secret: ${secretName}`);
    
    // Create backup
    const backupFile = this.createBackup(envFile);
    
    try {
      // Parse current environment
      const currentEnv = this.parseEnvFile(envFile);
      const oldValue = currentEnv.get(secretName);
      
      if (!oldValue) {
        throw new Error(`Secret ${secretName} not found in ${envFile}`);
      }

      // Generate new secret based on type
      let newSecret;
      switch (secretName) {
        case 'JWT_SECRET':
        case 'JWT_REFRESH_SECRET':
        case 'SESSION_SECRET':
        case 'CSRF_SECRET':
          newSecret = this.generator.generateSecureString(64, 'complex');
          break;
        case 'DATABASE_ENCRYPTION_KEY':
          newSecret = this.generator.generateEncryptionKey();
          break;
        case 'REDIS_PASSWORD':
          newSecret = this.generator.generateSecureString(32, 'alphanumeric');
          break;
        case 'WEBHOOK_SECRET':
          newSecret = this.generator.generateSecureString(32, 'base64url');
          break;
        case 'SENDGRID_API_KEY':
          newSecret = this.generator.generateSecureString(40, 'base64url');
          break;
        default:
          // Default to secure string
          newSecret = this.generator.generateSecureString(64, 'complex');
          break;
      }

      // Validate new secret
      const validation = this.generator.validateSecret(secretName, newSecret);
      if (!validation.valid) {
        throw new Error(`Generated secret failed validation: ${validation.message}`);
      }

      // Update environment file
      const updates = new Map();
      updates.set(secretName, newSecret);
      this.updateEnvFile(envFile, updates);
      
      // Record rotation
      this.recordRotation(secretName, oldValue, newSecret, backupFile);
      
      console.log(`✅ Successfully rotated ${secretName}`);
      console.log(`📋 Backup available at: ${backupFile}`);
      console.log(`\n⚠️  IMPORTANT: Restart your application to use the new secret`);
      
      return {
        success: true,
        secretName,
        backupFile,
        rotationTime: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Error rotating ${secretName}:`, error.message);
      
      // Restore from backup
      if (fs.existsSync(backupFile)) {
        fs.copyFileSync(backupFile, envFile);
        console.log(`🔙 Restored from backup: ${backupFile}`);
      }
      
      throw error;
    }
  }

  /**
   * Rotate all secrets
   */
  rotateAllSecrets(envFile = '.env.production') {
    console.log('🔄 Rotating all secrets...\n');
    
    const secretsToRotate = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SESSION_SECRET',
      'DATABASE_ENCRYPTION_KEY',
      'CSRF_SECRET',
      'REDIS_PASSWORD',
      'WEBHOOK_SECRET',
      'SENDGRID_API_KEY'
    ];

    const results = [];
    let hasErrors = false;

    for (const secretName of secretsToRotate) {
      try {
        const result = this.rotateSecret(secretName, envFile);
        results.push(result);
        console.log(''); // Add spacing
      } catch (error) {
        console.error(`Failed to rotate ${secretName}: ${error.message}\n`);
        hasErrors = true;
        results.push({
          success: false,
          secretName,
          error: error.message
        });
      }
    }

    if (hasErrors) {
      console.error('❌ Some secrets failed to rotate. Check the logs above.');
    } else {
      console.log('✅ All secrets rotated successfully!');
    }

    return results;
  }

  /**
   * Record rotation in history
   */
  recordRotation(secretName, oldValue, newValue, backupFile) {
    const record = {
      secretName,
      rotationTime: new Date().toISOString(),
      oldValueHash: crypto.createHash('sha256').update(oldValue).digest('hex').substring(0, 16),
      newValueHash: crypto.createHash('sha256').update(newValue).digest('hex').substring(0, 16),
      backupFile
    };

    this.rotationHistory.set(secretName, record);
    
    // Save rotation history to file
    const historyFile = path.join(this.backupDir, 'rotation-history.json');
    let history = [];
    
    if (fs.existsSync(historyFile)) {
      try {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      } catch (error) {
        console.warn('Could not read rotation history file, creating new one');
      }
    }
    
    history.push(record);
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  }

  /**
   * Get rotation history
   */
  getRotationHistory() {
    const historyFile = path.join(this.backupDir, 'rotation-history.json');
    
    if (fs.existsSync(historyFile)) {
      try {
        return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      } catch (error) {
        console.warn('Could not read rotation history file');
        return [];
      }
    }
    
    return [];
  }

  /**
   * Clean old backups (keep last 10)
   */
  cleanOldBackups() {
    this.ensureBackupDirectory();
    
    const backupFiles = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.backup'))
      .map(file => ({
        name: file,
        path: path.join(this.backupDir, file),
        mtime: fs.statSync(path.join(this.backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // Keep last 10 backups
    const filesToDelete = backupFiles.slice(10);
    
    for (const file of filesToDelete) {
      fs.unlinkSync(file.path);
      console.log(`🗑️  Deleted old backup: ${file.name}`);
    }

    if (filesToDelete.length > 0) {
      console.log(`✅ Cleaned ${filesToDelete.length} old backup(s)`);
    } else {
      console.log('✅ No old backups to clean');
    }
  }

  /**
   * Verify secret strength across all environment files
   */
  auditSecrets(envFile = '.env.production') {
    console.log(`🔍 Auditing secrets in ${envFile}...\n`);
    
    const envVars = this.parseEnvFile(envFile);
    const criticalSecrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SESSION_SECRET',
      'DATABASE_ENCRYPTION_KEY',
      'CSRF_SECRET'
    ];

    const results = [];
    
    for (const secretName of criticalSecrets) {
      const value = envVars.get(secretName);
      
      if (!value) {
        results.push({
          name: secretName,
          status: 'MISSING',
          message: 'Secret not found in environment file'
        });
        continue;
      }

      const validation = this.generator.validateSecret(secretName, value);
      
      results.push({
        name: secretName,
        status: validation.valid ? 'VALID' : 'INVALID',
        message: validation.message,
        length: value.length
      });
    }

    // Print results
    console.log('Secret Audit Results:');
    console.log('━'.repeat(60));
    
    for (const result of results) {
      const icon = result.status === 'VALID' ? '✅' : result.status === 'MISSING' ? '❌' : '⚠️';
      console.log(`${icon} ${result.name.padEnd(25)} ${result.status.padEnd(10)} ${result.message}`);
      if (result.length) {
        console.log(`   Length: ${result.length} characters`);
      }
      console.log('');
    }

    const validCount = results.filter(r => r.status === 'VALID').length;
    const totalCount = results.length;
    
    console.log(`Summary: ${validCount}/${totalCount} secrets are valid`);
    
    return results;
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Secret Rotation Utility

Usage:
  node rotate-secrets.js --secret <SECRET_NAME> [--backup] [--env <file>]
  node rotate-secrets.js --all [--backup] [--env <file>]
  node rotate-secrets.js --audit [--env <file>]
  node rotate-secrets.js --history
  node rotate-secrets.js --clean-backups

Options:
  --secret <name>    Rotate specific secret
  --all              Rotate all secrets
  --audit            Audit secret strength
  --history          Show rotation history  
  --clean-backups    Clean old backup files
  --backup           Create backup before rotation (default: true)
  --env <file>       Environment file (default: .env.production)

Examples:
  node rotate-secrets.js --secret JWT_SECRET
  node rotate-secrets.js --all --env .env.staging
  node rotate-secrets.js --audit
`);
    return;
  }

  const rotationManager = new SecretRotationManager();
  const envFile = args.includes('--env') 
    ? args[args.indexOf('--env') + 1] 
    : '.env.production';

  try {
    if (args.includes('--audit')) {
      rotationManager.auditSecrets(envFile);
    } else if (args.includes('--history')) {
      const history = rotationManager.getRotationHistory();
      console.log('🕒 Secret Rotation History:\n');
      if (history.length === 0) {
        console.log('No rotation history found.');
      } else {
        for (const record of history.slice(-10)) {
          console.log(`${record.rotationTime}: ${record.secretName}`);
          console.log(`   Old hash: ${record.oldValueHash}...`);
          console.log(`   New hash: ${record.newValueHash}...`);
          console.log(`   Backup: ${record.backupFile}`);
          console.log('');
        }
      }
    } else if (args.includes('--clean-backups')) {
      rotationManager.cleanOldBackups();
    } else if (args.includes('--all')) {
      rotationManager.rotateAllSecrets(envFile);
    } else if (args.includes('--secret')) {
      const secretName = args[args.indexOf('--secret') + 1];
      if (!secretName) {
        console.error('❌ Please specify a secret name with --secret');
        process.exit(1);
      }
      rotationManager.rotateSecret(secretName, envFile);
    } else {
      console.error('❌ Please specify an action. Use --help for usage information.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { SecretRotationManager };