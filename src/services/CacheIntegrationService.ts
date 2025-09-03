/**
 * Cache Integration Service
 * 
 * Integrates enhanced caching with existing services and provides
 * database-backed fallback mechanisms. Implements cache-aside pattern
 * with write-through and write-behind support for critical operations.
 * 
 * @module CacheIntegrationService
 */

import { EnhancedCacheService, CacheKeys, CacheInvalidationRules } from './EnhancedCacheService';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface DatabaseService {
  getSpotAvailability(): Promise<any[]>;
  getSpotById(id: string): Promise<any>;
  getUserProfile(userId: string): Promise<any>;
  getPricingRules(): Promise<any>;
  getAnalyticsData(type: string, date?: string): Promise<any>;
  getGarageConfiguration(): Promise<any>;
  updateSpotStatus(spotId: string, status: any): Promise<boolean>;
  updateUserProfile(userId: string, profile: any): Promise<boolean>;
  updatePricingRules(rules: any): Promise<boolean>;
}

export interface CacheIntegrationConfig {
  cacheService: EnhancedCacheService;
  databaseService: DatabaseService;
  enableFallback: boolean;
  fallbackTimeout: number;
  writeThrough: boolean;
  writeBehind: boolean;
}

export class CacheIntegrationService extends EventEmitter {
  private cacheService: EnhancedCacheService;
  private databaseService: DatabaseService;
  private config: CacheIntegrationConfig;

  constructor(config: CacheIntegrationConfig) {
    super();
    
    this.cacheService = config.cacheService;
    this.databaseService = config.databaseService;
    this.config = {
      ...config,
      enableFallback: config.enableFallback ?? true,
      fallbackTimeout: config.fallbackTimeout ?? 5000,
      writeThrough: config.writeThrough ?? true,
      writeBehind: config.writeBehind ?? false,
    };

    this.setupCacheEventHandlers();
  }

  private setupCacheEventHandlers(): void {
    // Handle write-through operations
    this.cacheService.on('writeThrough', async (key: string, data: any) => {
      if (this.config.writeThrough) {
        await this.handleWriteThrough(key, data);
      }
    });

    // Handle write-behind operations
    this.cacheService.on('writeBehind', async (key: string, data: any) => {
      if (this.config.writeBehind) {
        await this.handleWriteBehind(key, data);
      }
    });

    // Handle refresh-ahead operations
    this.cacheService.on('refreshAhead', async (key: string, currentData: any) => {
      await this.handleRefreshAhead(key, currentData);
    });

    // Handle background refresh
    this.cacheService.on('backgroundRefresh', async (key: string, currentData: any) => {
      await this.handleBackgroundRefresh(key, currentData);
    });
  }

  // Spot Availability Caching
  async getSpotAvailability(useCache: boolean = true): Promise<any[]> {
    if (!useCache) {
      return this.databaseService.getSpotAvailability();
    }

    const cacheKey = CacheKeys.SPOTS_AVAILABLE;
    
    try {
      // Try cache first
      const cached = await this.cacheService.get<any[]>(cacheKey);
      if (cached !== null) {
        logger.debug('Spot availability served from cache');
        return cached;
      }

      // Cache miss - get from database
      logger.debug('Spot availability cache miss - fetching from database');
      const data = await this.databaseService.getSpotAvailability();
      
      // Cache for 30 seconds (high-frequency data)
      await this.cacheService.set(cacheKey, data, 30);
      
      return data;
    } catch (error) {
      logger.error('Error getting spot availability', error as Error);
      
      if (this.config.enableFallback) {
        return this.databaseService.getSpotAvailability();
      }
      
      throw error;
    }
  }

  async getSpotById(spotId: string, useCache: boolean = true): Promise<any> {
    if (!useCache) {
      return this.databaseService.getSpotById(spotId);
    }

    const cacheKey = CacheKeys.SPOT(spotId);
    
    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const data = await this.databaseService.getSpotById(spotId);
      await this.cacheService.set(cacheKey, data, 30); // 30 seconds TTL
      
      return data;
    } catch (error) {
      logger.error(`Error getting spot ${spotId}`, error as Error);
      
      if (this.config.enableFallback) {
        return this.databaseService.getSpotById(spotId);
      }
      
      throw error;
    }
  }

  async updateSpotStatus(spotId: string, status: any): Promise<boolean> {
    try {
      // Write to database first (write-through pattern)
      const success = await this.databaseService.updateSpotStatus(spotId, status);
      
      if (success) {
        // Invalidate related cache entries with cascading
        await this.cacheService.invalidatePattern(
          CacheKeys.SPOT(spotId),
          CacheInvalidationRules.SPOT_STATUS_CHANGE
        );
        
        // Update cache immediately for this specific spot
        await this.cacheService.set(CacheKeys.SPOT(spotId), { id: spotId, ...status }, 30);
        
        this.emit('spotStatusUpdated', spotId, status);
      }
      
      return success;
    } catch (error) {
      logger.error(`Error updating spot status ${spotId}`, error as Error);
      throw error;
    }
  }

  // Pricing Caching
  async getPricingRate(type: string, duration: number, useCache: boolean = true): Promise<number> {
    if (!useCache) {
      return this.calculatePricingRate(type, duration);
    }

    const cacheKey = CacheKeys.PRICING_RATE(type, duration);
    
    try {
      const cached = await this.cacheService.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const rate = await this.calculatePricingRate(type, duration);
      await this.cacheService.set(cacheKey, rate, 300); // 5 minutes TTL
      
      return rate;
    } catch (error) {
      logger.error(`Error getting pricing rate for ${type}:${duration}`, error as Error);
      
      if (this.config.enableFallback) {
        return this.calculatePricingRate(type, duration);
      }
      
      throw error;
    }
  }

  async getPricingRules(useCache: boolean = true): Promise<any> {
    if (!useCache) {
      return this.databaseService.getPricingRules();
    }

    const cacheKey = CacheKeys.RATES_CONFIG;
    
    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const rules = await this.databaseService.getPricingRules();
      await this.cacheService.set(cacheKey, rules, 3600); // 1 hour TTL
      
      return rules;
    } catch (error) {
      logger.error('Error getting pricing rules', error as Error);
      
      if (this.config.enableFallback) {
        return this.databaseService.getPricingRules();
      }
      
      throw error;
    }
  }

  async updatePricingRules(rules: any): Promise<boolean> {
    try {
      const success = await this.databaseService.updatePricingRules(rules);
      
      if (success) {
        // Invalidate all pricing-related caches with cascading
        await this.cacheService.invalidatePattern(
          'pricing:*',
          CacheInvalidationRules.PRICING_RULES_CHANGE
        );
        
        this.emit('pricingRulesUpdated', rules);
      }
      
      return success;
    } catch (error) {
      logger.error('Error updating pricing rules', error as Error);
      throw error;
    }
  }

  // Analytics Caching
  async getRevenueStats(useCache: boolean = true): Promise<any> {
    if (!useCache) {
      return this.databaseService.getAnalyticsData('revenue');
    }

    const cacheKey = CacheKeys.REVENUE_STATS;
    
    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const stats = await this.databaseService.getAnalyticsData('revenue');
      await this.cacheService.set(cacheKey, stats, 1800); // 30 minutes TTL
      
      return stats;
    } catch (error) {
      logger.error('Error getting revenue stats', error as Error);
      
      if (this.config.enableFallback) {
        return this.databaseService.getAnalyticsData('revenue');
      }
      
      throw error;
    }
  }

  async getDailyStats(date: string, useCache: boolean = true): Promise<any> {
    if (!useCache) {
      return this.databaseService.getAnalyticsData('daily', date);
    }

    const cacheKey = CacheKeys.DAILY_STATS(date);
    
    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const stats = await this.databaseService.getAnalyticsData('daily', date);
      
      // Cache for longer periods for historical data
      const isHistorical = new Date(date) < new Date(Date.now() - 24 * 60 * 60 * 1000);
      const ttl = isHistorical ? 86400 : 3600; // 24 hours for historical, 1 hour for recent
      
      await this.cacheService.set(cacheKey, stats, ttl);
      
      return stats;
    } catch (error) {
      logger.error(`Error getting daily stats for ${date}`, error as Error);
      
      if (this.config.enableFallback) {
        return this.databaseService.getAnalyticsData('daily', date);
      }
      
      throw error;
    }
  }

  // User Profile Caching
  async getUserProfile(userId: string, useCache: boolean = true): Promise<any> {
    if (!useCache) {
      return this.databaseService.getUserProfile(userId);
    }

    const cacheKey = CacheKeys.USER_PROFILE(userId);
    
    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const profile = await this.databaseService.getUserProfile(userId);
      await this.cacheService.set(cacheKey, profile, 3600); // 1 hour TTL
      
      return profile;
    } catch (error) {
      logger.error(`Error getting user profile ${userId}`, error as Error);
      
      if (this.config.enableFallback) {
        return this.databaseService.getUserProfile(userId);
      }
      
      throw error;
    }
  }

  async updateUserProfile(userId: string, profile: any): Promise<boolean> {
    try {
      const success = await this.databaseService.updateUserProfile(userId, profile);
      
      if (success) {
        // Invalidate user-related caches with cascading
        const cascadeRules = CacheInvalidationRules.USER_PROFILE_UPDATE(userId);
        for (const rule of cascadeRules) {
          await this.cacheService.invalidatePattern(rule);
        }
        
        this.emit('userProfileUpdated', userId, profile);
      }
      
      return success;
    } catch (error) {
      logger.error(`Error updating user profile ${userId}`, error as Error);
      throw error;
    }
  }

  // Configuration Caching
  async getGarageConfiguration(useCache: boolean = true): Promise<any> {
    if (!useCache) {
      return this.databaseService.getGarageConfiguration();
    }

    const cacheKey = CacheKeys.GARAGE_CONFIG;
    
    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const config = await this.databaseService.getGarageConfiguration();
      await this.cacheService.set(cacheKey, config, 3600); // 1 hour TTL
      
      return config;
    } catch (error) {
      logger.error('Error getting garage configuration', error as Error);
      
      if (this.config.enableFallback) {
        return this.databaseService.getGarageConfiguration();
      }
      
      throw error;
    }
  }

  // Cache warming operations
  async warmCriticalCaches(): Promise<void> {
    logger.info('Starting critical cache warming');

    const warmingTasks = [
      {
        key: CacheKeys.SPOTS_AVAILABLE,
        dataLoader: () => this.databaseService.getSpotAvailability(),
        ttl: 30,
      },
      {
        key: CacheKeys.GARAGE_CONFIG,
        dataLoader: () => this.databaseService.getGarageConfiguration(),
        ttl: 3600,
      },
      {
        key: CacheKeys.RATES_CONFIG,
        dataLoader: () => this.databaseService.getPricingRules(),
        ttl: 3600,
      },
      {
        key: CacheKeys.REVENUE_STATS,
        dataLoader: () => this.databaseService.getAnalyticsData('revenue'),
        ttl: 1800,
      },
    ];

    const warmedCount = await this.cacheService.warmCache(warmingTasks);
    logger.info(`Critical cache warming completed: ${warmedCount} items warmed`);

    this.emit('cacheWarmed', { warmedCount, totalTasks: warmingTasks.length });
  }

  // Batch operations for performance
  async batchGetSpots(spotIds: string[]): Promise<Map<string, any>> {
    const cacheKeys = spotIds.map(id => CacheKeys.SPOT(id));
    const cached = await this.cacheService.getMany<any>(cacheKeys);
    
    // Find missing keys
    const missingSpotIds = spotIds.filter((id, index) => {
      const key = cacheKeys[index];
      return key && !cached.has(key);
    });
    
    if (missingSpotIds.length > 0) {
      // Fetch missing data from database
      const missingData = new Map<string, any>();
      
      for (const spotId of missingSpotIds) {
        try {
          const data = await this.databaseService.getSpotById(spotId);
          missingData.set(CacheKeys.SPOT(spotId), data);
          cached.set(CacheKeys.SPOT(spotId), data);
        } catch (error) {
          logger.error(`Error fetching spot ${spotId} in batch operation`, error as Error);
        }
      }
      
      // Cache the missing data
      if (missingData.size > 0) {
        await this.cacheService.setMany(missingData, 30);
      }
    }
    
    return cached;
  }

  // Event handlers
  private async handleWriteThrough(key: string, data: any): Promise<void> {
    try {
      const keyType = key.split(':')[0];
      
      switch (keyType) {
        case 'spots':
          if (key.includes(':') && key.split(':').length === 2) {
            const spotId = key.split(':')[1];
            if (spotId) {
              await this.databaseService.updateSpotStatus(spotId, data);
            }
          }
          break;
        
        case 'user':
          if (key.includes('profile')) {
            const userId = key.split(':')[2];
            if (userId) {
              await this.databaseService.updateUserProfile(userId, data);
            }
          }
          break;
        
        case 'pricing':
          await this.databaseService.updatePricingRules(data);
          break;
        
        default:
          logger.debug(`No write-through handler for key type: ${keyType}`);
      }
    } catch (error) {
      logger.error(`Write-through error for key ${key}`, error as Error);
    }
  }

  private async handleWriteBehind(key: string, data: any): Promise<void> {
    // Similar to write-through but asynchronous and batched
    await this.handleWriteThrough(key, data);
  }

  private async handleRefreshAhead(key: string, currentData: any): Promise<void> {
    try {
      const freshData = await this.getFreshDataForKey(key);
      if (JSON.stringify(freshData) !== JSON.stringify(currentData)) {
        await this.cacheService.set(key, freshData);
        logger.debug(`Refresh-ahead completed for key: ${key}`);
      }
    } catch (error) {
      logger.error(`Refresh-ahead error for key ${key}`, error as Error);
    }
  }

  private async handleBackgroundRefresh(key: string, currentData: any): Promise<void> {
    await this.handleRefreshAhead(key, currentData);
  }

  private async getFreshDataForKey(key: string): Promise<any> {
    const keyType = key.split(':')[0];
    
    switch (keyType) {
      case 'spots':
        if (key === CacheKeys.SPOTS_AVAILABLE) {
          return this.databaseService.getSpotAvailability();
        } else {
          const spotId = key.split(':')[1];
          if (!spotId) {
            throw new Error(`Invalid spot key format: ${key}`);
          }
          return this.databaseService.getSpotById(spotId);
        }
      
      case 'config':
        if (key === CacheKeys.GARAGE_CONFIG) {
          return this.databaseService.getGarageConfiguration();
        } else if (key === CacheKeys.RATES_CONFIG) {
          return this.databaseService.getPricingRules();
        }
        break;
      
      case 'analytics':
        if (key === CacheKeys.REVENUE_STATS) {
          return this.databaseService.getAnalyticsData('revenue');
        }
        break;
      
      default:
        logger.warn(`No refresh handler for key type: ${keyType}`);
        return null;
    }
  }

  private async calculatePricingRate(type: string, duration: number): Promise<number> {
    // Get pricing rules from cache or database
    const rules = await this.getPricingRules();
    
    // Calculate rate based on rules (simplified implementation)
    const baseRate = rules[type]?.baseRate || 5.0;
    const hourlyMultiplier = Math.ceil(duration / 60); // Convert minutes to hours
    
    return baseRate * hourlyMultiplier;
  }

  // Health and metrics
  async getHealthStatus(): Promise<any> {
    const cacheHealth = await this.cacheService.healthCheck();
    const metrics = this.cacheService.getMetrics();
    
    return {
      cache: cacheHealth,
      integration: {
        fallbackEnabled: this.config.enableFallback,
        writeThroughEnabled: this.config.writeThrough,
        writeBehindEnabled: this.config.writeBehind,
      },
      performance: {
        hitRate: metrics.hitRate,
        avgResponseTime: metrics.avgResponseTime,
      },
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down cache integration service');
    await this.cacheService.shutdown();
    this.removeAllListeners();
    logger.info('Cache integration service shutdown completed');
  }
}

export default CacheIntegrationService;