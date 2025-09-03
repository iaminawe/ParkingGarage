/**
 * Simple test to verify the schema fix for lastLoginIP field
 * This test doesn't need the full database setup
 */

import { describe, it, expect } from '@jest/globals';

describe('Schema Fix Verification', () => {
  it('should not reference lastLoginIP field in AuthService', () => {
    // Read the AuthService file content to verify the field was removed
    const fs = require('fs');
    const path = require('path');
    
    const authServicePath = path.join(__dirname, '../services/authService.ts');
    const authServiceContent = fs.readFileSync(authServicePath, 'utf8');
    
    // Verify that lastLoginIP is no longer referenced
    expect(authServiceContent).not.toContain('lastLoginIP');
    
    // Verify that lastLoginAt is still used (this is the correct field)
    expect(authServiceContent).toContain('lastLoginAt');
    
    // Verify the handleSuccessfulLogin function doesn't use lastLoginIP
    const handleSuccessfulLoginMatch = authServiceContent.match(
      /private async handleSuccessfulLogin.*?(?=private|async|\$)/s
    );
    
    if (handleSuccessfulLoginMatch) {
      const functionContent = handleSuccessfulLoginMatch[0];
      expect(functionContent).not.toContain('lastLoginIP');
      expect(functionContent).toContain('lastLoginAt');
    }
  });

  it('should have graceful service initialization', () => {
    const fs = require('fs');
    const path = require('path');
    
    const authServicePath = path.join(__dirname, '../services/authService.ts');
    const authServiceContent = fs.readFileSync(authServicePath, 'utf8');
    
    // Verify graceful initialization methods exist
    expect(authServiceContent).toContain('initializeCacheService()');
    expect(authServiceContent).toContain('initializeEmailService()');
    expect(authServiceContent).toContain('initializeAuditService()');
    
    // Verify services are nullable
    expect(authServiceContent).toContain('CacheService | null');
    expect(authServiceContent).toContain('EmailService | null');
    expect(authServiceContent).toContain('SecurityAuditService | null');
  });

  it('should have fallback mechanisms for cache operations', () => {
    const fs = require('fs');
    const path = require('path');
    
    const authServicePath = path.join(__dirname, '../services/authService.ts');
    const authServiceContent = fs.readFileSync(authServicePath, 'utf8');
    
    // Verify blacklistToken has null check
    expect(authServiceContent).toContain('if (!this.cacheService)');
    
    // Verify fallback behavior is implemented
    expect(authServiceContent).toContain('cache service unavailable');
  });
});