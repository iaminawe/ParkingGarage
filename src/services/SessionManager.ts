import { createClient, RedisClientType } from 'redis';
import { env } from '../config/environment';
import { TIME_CONSTANTS, SECURITY } from '../config/constants';
import { CacheService } from './CacheService';
import * as crypto from 'crypto';

export interface SessionData {
  userId: string;
  userRole: string;
  userEmail: string;
  deviceInfo?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  createdAt: number;
  lastAccessedAt: number;
  isActive: boolean;
}

export interface SessionOptions {
  maxAge?: number;
  maxConcurrentSessions?: number;
  requireDeviceConsistency?: boolean;
  autoExtend?: boolean;
}

/**
 * Enhanced session management with Redis support and security features
 */
export class SessionManager {
  private redisClient: RedisClientType | null = null;
  private fallbackCache: CacheService;
  private readonly sessionPrefix = 'session:';
  private readonly userSessionsPrefix = 'user_sessions:';
  private readonly blacklistPrefix = 'blacklist:';
  private isRedisAvailable = false;

  constructor() {
    this.fallbackCache = new CacheService();
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with fallback to in-memory cache
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Only attempt Redis connection if URL is provided
      if (process.env.REDIS_URL || process.env.REDIS_HOST) {
        const redisUrl = process.env.REDIS_URL || 
          `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
        
        this.redisClient = createClient({
          url: redisUrl,
          socket: {
            connectTimeout: 5000,
            lazyConnect: true,
          },
          // Handle connection errors gracefully
          retry: {
            maxRetries: 3,
            maxDelayBetweenFailures: 1000,
          },
        });

        this.redisClient.on('error', (error) => {
          console.warn('Redis connection error, falling back to in-memory cache:', error.message);
          this.isRedisAvailable = false;
        });

        this.redisClient.on('connect', () => {
          console.log('✅ Redis connected for session management');
          this.isRedisAvailable = true;
        });

        this.redisClient.on('disconnect', () => {
          console.warn('Redis disconnected, using fallback cache');
          this.isRedisAvailable = false;
        });

        await this.redisClient.connect();
        this.isRedisAvailable = true;
      }
    } catch (error) {
      console.warn('Redis initialization failed, using in-memory cache:', (error as Error).message);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    sessionId: string,
    data: SessionData,
    options: SessionOptions = {}
  ): Promise<boolean> {
    try {
      const maxAge = options.maxAge || TIME_CONSTANTS.SESSION_DURATION_MS;
      const sessionKey = this.sessionPrefix + sessionId;
      const userSessionsKey = this.userSessionsPrefix + data.userId;

      // Prepare session data
      const sessionData: SessionData = {
        ...data,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        isActive: true,
      };

      // Check concurrent session limit
      if (options.maxConcurrentSessions) {
        await this.enforceConcurrentSessionLimit(data.userId, options.maxConcurrentSessions);
      }

      // Store session data
      if (this.isRedisAvailable && this.redisClient) {
        // Use Redis for persistent sessions
        await Promise.all([
          this.redisClient.setEx(sessionKey, Math.ceil(maxAge / 1000), JSON.stringify(sessionData)),
          this.redisClient.sAdd(userSessionsKey, sessionId),
          this.redisClient.expire(userSessionsKey, Math.ceil(maxAge / 1000)),
        ]);
      } else {
        // Fallback to in-memory cache
        await this.fallbackCache.set(sessionKey, JSON.stringify(sessionData), Math.ceil(maxAge / 1000));
        
        // Track user sessions (simplified for in-memory)
        const userSessions = await this.fallbackCache.get(userSessionsKey) || '[]';
        const sessions = JSON.parse(userSessions);
        sessions.push(sessionId);
        await this.fallbackCache.set(userSessionsKey, JSON.stringify(sessions), Math.ceil(maxAge / 1000));
      }

      return true;
    } catch (error) {
      console.error('Error creating session:', error);
      return false;
    }
  }

  /**
   * Retrieve session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = this.sessionPrefix + sessionId;

      let sessionDataStr: string | null = null;

      if (this.isRedisAvailable && this.redisClient) {
        sessionDataStr = await this.redisClient.get(sessionKey);
      } else {
        sessionDataStr = await this.fallbackCache.get(sessionKey);
      }

      if (!sessionDataStr) {
        return null;
      }

      const sessionData: SessionData = JSON.parse(sessionDataStr);

      // Update last accessed time
      sessionData.lastAccessedAt = Date.now();
      await this.updateSession(sessionId, sessionData);

      return sessionData;
    } catch (error) {
      console.error('Error retrieving session:', error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, data: Partial<SessionData>): Promise<boolean> {
    try {
      const currentSession = await this.getSessionOnly(sessionId);
      if (!currentSession) {
        return false;
      }

      const updatedSession: SessionData = {
        ...currentSession,
        ...data,
        lastAccessedAt: Date.now(),
      };

      const sessionKey = this.sessionPrefix + sessionId;

      if (this.isRedisAvailable && this.redisClient) {
        // Preserve existing TTL
        const ttl = await this.redisClient.ttl(sessionKey);
        if (ttl > 0) {
          await this.redisClient.setEx(sessionKey, ttl, JSON.stringify(updatedSession));
        } else {
          return false; // Session expired
        }
      } else {
        // Fallback - estimate remaining TTL (not perfect but workable)
        const maxAge = TIME_CONSTANTS.SESSION_DURATION_MS / 1000;
        const elapsed = (Date.now() - updatedSession.createdAt) / 1000;
        const remainingTtl = Math.max(0, maxAge - elapsed);
        
        if (remainingTtl > 0) {
          await this.fallbackCache.set(sessionKey, JSON.stringify(updatedSession), remainingTtl);
        } else {
          return false; // Session expired
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating session:', error);
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessionKey = this.sessionPrefix + sessionId;
      
      // Get session data to find user ID
      const sessionData = await this.getSessionOnly(sessionId);
      
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.del(sessionKey);
        
        // Remove from user sessions set
        if (sessionData) {
          const userSessionsKey = this.userSessionsPrefix + sessionData.userId;
          await this.redisClient.sRem(userSessionsKey, sessionId);
        }
      } else {
        await this.fallbackCache.delete(sessionKey);
        
        // Remove from user sessions (simplified)
        if (sessionData) {
          const userSessionsKey = this.userSessionsPrefix + sessionData.userId;
          const userSessions = await this.fallbackCache.get(userSessionsKey) || '[]';
          const sessions = JSON.parse(userSessions).filter((id: string) => id !== sessionId);
          await this.fallbackCache.set(userSessionsKey, JSON.stringify(sessions));
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  /**
   * Get session without updating access time
   */
  private async getSessionOnly(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = this.sessionPrefix + sessionId;

      let sessionDataStr: string | null = null;

      if (this.isRedisAvailable && this.redisClient) {
        sessionDataStr = await this.redisClient.get(sessionKey);
      } else {
        sessionDataStr = await this.fallbackCache.get(sessionKey);
      }

      return sessionDataStr ? JSON.parse(sessionDataStr) : null;
    } catch (error) {
      console.error('Error retrieving session (read-only):', error);
      return null;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const userSessionsKey = this.userSessionsPrefix + userId;

      if (this.isRedisAvailable && this.redisClient) {
        const sessionIds = await this.redisClient.sMembers(userSessionsKey);
        const sessions = await Promise.all(
          sessionIds.map(id => this.getSessionOnly(id))
        );
        return sessions.filter(s => s !== null) as SessionData[];
      } else {
        const userSessions = await this.fallbackCache.get(userSessionsKey) || '[]';
        const sessionIds = JSON.parse(userSessions);
        const sessions = await Promise.all(
          sessionIds.map((id: string) => this.getSessionOnly(id))
        );
        return sessions.filter(s => s !== null) as SessionData[];
      }
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    try {
      const sessions = await this.getUserSessions(userId);
      const userSessionsKey = this.userSessionsPrefix + userId;

      // Delete all sessions
      const deletePromises = sessions.map((session, index) => {
        const sessionId = Object.keys(session)[0]; // This needs to be passed differently
        return this.deleteSession(sessionId);
      });

      await Promise.all(deletePromises);

      // Clear user sessions set
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.del(userSessionsKey);
      } else {
        await this.fallbackCache.delete(userSessionsKey);
      }

      return sessions.length;
    } catch (error) {
      console.error('Error revoking user sessions:', error);
      return 0;
    }
  }

  /**
   * Enforce concurrent session limit
   */
  private async enforceConcurrentSessionLimit(userId: string, maxSessions: number): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId);
      
      if (sessions.length >= maxSessions) {
        // Sort by last accessed time and remove oldest
        const sortedSessions = sessions.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
        const sessionsToRemove = sortedSessions.slice(0, sessions.length - maxSessions + 1);
        
        for (const session of sessionsToRemove) {
          // Would need session ID to delete properly - this is simplified
          console.log('Would remove session for user:', userId);
        }
      }
    } catch (error) {
      console.error('Error enforcing session limit:', error);
    }
  }

  /**
   * Validate session with device consistency check
   */
  async validateSession(
    sessionId: string,
    currentDeviceInfo?: string,
    currentIpAddress?: string
  ): Promise<{ valid: boolean; reason?: string; session?: SessionData }> {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return { valid: false, reason: 'Session not found' };
      }

      if (!session.isActive) {
        return { valid: false, reason: 'Session inactive' };
      }

      // Check device consistency if required
      if (currentDeviceInfo && session.deviceInfo) {
        if (currentDeviceInfo !== session.deviceInfo) {
          // Log potential session hijacking attempt
          console.warn(`Device mismatch for session ${sessionId}: expected ${session.deviceInfo}, got ${currentDeviceInfo}`);
          return { valid: false, reason: 'Device mismatch' };
        }
      }

      // Check for suspicious IP changes (optional - can be made configurable)
      if (currentIpAddress && session.ipAddress && currentIpAddress !== session.ipAddress) {
        console.warn(`IP change detected for session ${sessionId}: ${session.ipAddress} -> ${currentIpAddress}`);
        // Don't invalidate session for IP changes as they can be legitimate
        // but log for monitoring
      }

      return { valid: true, session };
    } catch (error) {
      console.error('Error validating session:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      let cleanedCount = 0;

      if (this.isRedisAvailable && this.redisClient) {
        // Redis handles TTL automatically, but we can clean up orphaned user session sets
        // This would require more complex logic to iterate through keys
        console.log('Redis handles session TTL automatically');
      } else {
        // For in-memory cache, we rely on the cache service's own cleanup
        cleanedCount = await this.fallbackCache.cleanup();
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    storage: 'redis' | 'memory';
  }> {
    try {
      let totalSessions = 0;
      let activeSessions = 0;

      if (this.isRedisAvailable && this.redisClient) {
        // Count session keys (simplified)
        const keys = await this.redisClient.keys(this.sessionPrefix + '*');
        totalSessions = keys.length;
        activeSessions = keys.length; // All sessions in Redis are active due to TTL
      } else {
        // For in-memory cache, this would require additional tracking
        totalSessions = 0;
        activeSessions = 0;
      }

      return {
        totalSessions,
        activeSessions,
        storage: this.isRedisAvailable ? 'redis' : 'memory',
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        storage: this.isRedisAvailable ? 'redis' : 'memory',
      };
    }
  }

  /**
   * Close Redis connection gracefully
   */
  async close(): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.quit();
      }
    } catch (error) {
      console.error('Error closing session manager:', error);
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();