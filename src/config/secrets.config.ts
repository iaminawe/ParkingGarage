/**
 * Secrets management configuration
 * 
 * Features:
 * - Secure secret storage and retrieval
 * - Environment-specific secret management
 * - Encryption for sensitive data
 * - Secret rotation utilities
 * - Development vs production handling
 * 
 * @module SecretsConfig
 */

import crypto from 'crypto';
import { env } from './environment';
import { systemLogger } from './logger.config';

// Secret categories for organization
export enum SecretCategory {
  DATABASE = 'database',
  JWT = 'jwt',
  EMAIL = 'email',
  OAUTH = 'oauth',
  EXTERNAL_API = 'external_api',
  ENCRYPTION = 'encryption',
}

// Secret interface
export interface Secret {
  key: string;
  value: string;
  category: SecretCategory;
  encrypted: boolean;
  createdAt: Date;
  expiresAt?: Date;
  rotationInterval?: number; // in days
}

// Secret storage interface
export interface SecretStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, category: SecretCategory, options?: { expiresAt?: Date; rotationInterval?: number }): Promise<void>;
  delete(key: string): Promise<boolean>;
  list(category?: SecretCategory): Promise<Secret[]>;
  rotate(key: string): Promise<string>;
}

// In-memory secret store for development
class MemorySecretStore implements SecretStore {
  private secrets: Map<string, Secret> = new Map();
  private encryptionKey: string;

  constructor() {
    // Use environment encryption key or generate one for development
    this.encryptionKey = env.ENCRYPTION_KEY || this.generateEncryptionKey();
    
    if (!env.ENCRYPTION_KEY && env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be set in production');
    }
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encrypted = textParts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async get(key: string): Promise<string | null> {
    const secret = this.secrets.get(key);
    if (!secret) {
      return null;
    }

    // Check expiration
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      await this.delete(key);
      return null;
    }

    try {
      return secret.encrypted ? this.decrypt(secret.value) : secret.value;
    } catch (error) {
      systemLogger.error('Failed to decrypt secret', error as Error, { key });
      return null;
    }
  }

  async set(
    key: string,
    value: string,
    category: SecretCategory,
    options?: { expiresAt?: Date; rotationInterval?: number }
  ): Promise<void> {
    const shouldEncrypt = env.NODE_ENV === 'production';
    const secret: Secret = {
      key,
      value: shouldEncrypt ? this.encrypt(value) : value,
      category,
      encrypted: shouldEncrypt,
      createdAt: new Date(),
      expiresAt: options?.expiresAt,
      rotationInterval: options?.rotationInterval,
    };

    this.secrets.set(key, secret);
    systemLogger.debug('Secret stored', { key, category, encrypted: shouldEncrypt });
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.secrets.delete(key);
    if (deleted) {
      systemLogger.debug('Secret deleted', { key });
    }
    return deleted;
  }

  async list(category?: SecretCategory): Promise<Secret[]> {
    const secrets = Array.from(this.secrets.values());
    return category ? secrets.filter(s => s.category === category) : secrets;
  }

  async rotate(key: string): Promise<string> {
    const secret = this.secrets.get(key);
    if (!secret) {
      throw new Error(`Secret ${key} not found`);
    }

    // Generate new value based on secret type
    let newValue: string;
    
    switch (secret.category) {
      case SecretCategory.JWT:
        newValue = this.generateSecureToken(64);
        break;
      case SecretCategory.ENCRYPTION:
        newValue = this.generateEncryptionKey();
        break;
      default:
        newValue = this.generateSecureToken(32);
    }

    await this.set(key, newValue, secret.category, {
      expiresAt: secret.expiresAt,
      rotationInterval: secret.rotationInterval,
    });

    systemLogger.info('Secret rotated', { key, category: secret.category });
    return newValue;
  }

  private generateSecureToken(length: number): string {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }
}

// Secrets manager class
export class SecretsManager {
  private static instance: SecretsManager;
  private store: SecretStore;
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    // In production, you might want to use AWS Secrets Manager, HashiCorp Vault, etc.
    this.store = new MemorySecretStore();
    this.initializeSecrets();
    this.startRotationScheduler();
  }

  static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  // Initialize secrets from environment
  private async initializeSecrets(): Promise<void> {
    try {
      // JWT secrets
      await this.store.set('jwt.secret', env.JWT_SECRET, SecretCategory.JWT, {
        rotationInterval: env.NODE_ENV === 'production' ? 30 : undefined,
      });
      
      if (env.JWT_REFRESH_SECRET) {
        await this.store.set('jwt.refresh_secret', env.JWT_REFRESH_SECRET, SecretCategory.JWT, {
          rotationInterval: env.NODE_ENV === 'production' ? 60 : undefined,
        });
      }

      // Database secrets
      await this.store.set('database.url', env.DATABASE_URL, SecretCategory.DATABASE);

      // Email secrets
      if (env.EMAIL_PASSWORD) {
        await this.store.set('email.password', env.EMAIL_PASSWORD, SecretCategory.EMAIL);
      }
      
      if (env.SENDGRID_API_KEY) {
        await this.store.set('email.sendgrid_api_key', env.SENDGRID_API_KEY, SecretCategory.EMAIL);
      }

      // OAuth secrets
      if (env.GOOGLE_CLIENT_SECRET) {
        await this.store.set('oauth.google_client_secret', env.GOOGLE_CLIENT_SECRET, SecretCategory.OAUTH);
      }
      
      if (env.GITHUB_CLIENT_SECRET) {
        await this.store.set('oauth.github_client_secret', env.GITHUB_CLIENT_SECRET, SecretCategory.OAUTH);
      }

      // External API secrets
      if (env.SENTRY_DSN) {
        await this.store.set('external.sentry_dsn', env.SENTRY_DSN, SecretCategory.EXTERNAL_API);
      }

      systemLogger.info('Secrets initialized from environment');
    } catch (error) {
      systemLogger.error('Failed to initialize secrets', error as Error);
      throw error;
    }
  }

  // Start automatic secret rotation scheduler
  private startRotationScheduler(): void {
    if (env.NODE_ENV !== 'production') {
      return; // Only rotate in production
    }

    setInterval(async () => {
      try {
        await this.checkAndRotateExpiredSecrets();
      } catch (error) {
        systemLogger.error('Secret rotation check failed', error as Error);
      }
    }, 24 * 60 * 60 * 1000); // Check daily
  }

  // Check and rotate expired secrets
  private async checkAndRotateExpiredSecrets(): Promise<void> {
    const secrets = await this.store.list();
    const now = new Date();

    for (const secret of secrets) {
      if (secret.rotationInterval) {
        const rotationDue = new Date(secret.createdAt);
        rotationDue.setDate(rotationDue.getDate() + secret.rotationInterval);

        if (now >= rotationDue) {
          try {
            await this.rotateSecret(secret.key);
            systemLogger.info('Auto-rotated secret', { key: secret.key });
          } catch (error) {
            systemLogger.error('Auto-rotation failed', error as Error, { key: secret.key });
          }
        }
      }
    }
  }

  // Public methods
  async getSecret(key: string): Promise<string | null> {
    return this.store.get(key);
  }

  async setSecret(
    key: string,
    value: string,
    category: SecretCategory,
    options?: { expiresAt?: Date; rotationInterval?: number }
  ): Promise<void> {
    return this.store.set(key, value, category, options);
  }

  async deleteSecret(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async listSecrets(category?: SecretCategory): Promise<Secret[]> {
    return this.store.list(category);
  }

  async rotateSecret(key: string): Promise<string> {
    return this.store.rotate(key);
  }

  // Convenience methods for common secrets
  async getJWTSecret(): Promise<string> {
    const secret = await this.getSecret('jwt.secret');
    if (!secret) {
      throw new Error('JWT secret not found');
    }
    return secret;
  }

  async getDatabaseURL(): Promise<string> {
    const secret = await this.getSecret('database.url');
    if (!secret) {
      throw new Error('Database URL not found');
    }
    return secret;
  }

  async getEmailSecret(provider: 'password' | 'sendgrid'): Promise<string | null> {
    return this.getSecret(`email.${provider === 'password' ? 'password' : 'sendgrid_api_key'}`);
  }

  async getOAuthSecret(provider: 'google' | 'github'): Promise<string | null> {
    return this.getSecret(`oauth.${provider}_client_secret`);
  }

  // Generate secure secrets
  generateSecureSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }

  generateJWTSecret(): string {
    return crypto.randomBytes(64).toString('base64');
  }

  generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Export singleton instance
export const secretsManager = SecretsManager.getInstance();

// Utility functions
export async function getSecret(key: string): Promise<string | null> {
  return secretsManager.getSecret(key);
}

export async function setSecret(
  key: string,
  value: string,
  category: SecretCategory,
  options?: { expiresAt?: Date; rotationInterval?: number }
): Promise<void> {
  return secretsManager.setSecret(key, value, category, options);
}

export async function rotateSecret(key: string): Promise<string> {
  return secretsManager.rotateSecret(key);
}

export default secretsManager;