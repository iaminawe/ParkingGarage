/**
 * Query Optimizer Service for database performance optimization
 *
 * Analyzes query patterns, implements caching strategies, and provides
 * performance monitoring for database operations.
 *
 * @module QueryOptimizer
 */

import { PrismaClient } from '@prisma/client';
import { CacheService, CacheKeys } from './CacheService';
import { logger } from '../utils/logger';

export interface QueryMetrics {
  queryType: string;
  tableName: string;
  executionTime: number;
  rowsAffected: number;
  cacheHit: boolean;
  timestamp: number;
}

export interface SlowQuery {
  query: string;
  executionTime: number;
  timestamp: number;
  stackTrace?: string;
  parameters?: any;
}

export interface OptimizationSuggestion {
  type: 'INDEX' | 'CACHE' | 'QUERY_REWRITE' | 'BATCH_OPERATION';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  impact: string;
  implementation: string;
}

export class QueryOptimizer {
  private prisma: PrismaClient;
  private cache: CacheService;
  private queryMetrics: QueryMetrics[] = [];
  private slowQueries: SlowQuery[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly MAX_METRICS_RETENTION = 10000;
  private readonly CACHE_TTL = {
    VEHICLE_LOOKUP: 300, // 5 minutes
    SPOT_STATUS: 60, // 1 minute
    ANALYTICS: 1800, // 30 minutes
    CONFIG: 3600, // 1 hour
  };

  constructor(prisma: PrismaClient, cache: CacheService) {
    this.prisma = prisma;
    this.cache = cache;
    this.setupQueryLogging();
  }

  /**
   * Optimized vehicle lookup with multi-level caching
   */
  async findVehicleByLicensePlate(licensePlate: string, useCache = true) {
    const startTime = Date.now();
    const cacheKey = CacheKeys.VEHICLE(licensePlate);

    // Try cache first
    if (useCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.recordMetrics('SELECT', 'vehicles', Date.now() - startTime, 1, true);
        return cached;
      }
    }

    // Database lookup with optimized query
    const vehicle = await this.prisma.vehicle.findUnique({
      where: {
        licensePlate: licensePlate.toUpperCase(),
      },
      include: {
        spot: {
          select: {
            id: true,
            spotNumber: true,
            level: true,
            section: true,
            spotType: true,
          },
        },
        sessions: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            totalAmount: true,
          },
          orderBy: {
            startTime: 'desc',
          },
          take: 10, // Limit to recent sessions
        },
      },
    });

    const executionTime = Date.now() - startTime;
    this.recordMetrics('SELECT', 'vehicles', executionTime, vehicle ? 1 : 0, false);

    // Cache successful lookups
    if (vehicle && useCache) {
      await this.cache.set(cacheKey, vehicle, this.CACHE_TTL.VEHICLE_LOOKUP);
    }

    return vehicle;
  }

  /**
   * Optimized spot availability lookup
   */
  async findAvailableSpots(spotType?: string, level?: number, useCache = true) {
    const startTime = Date.now();
    const cacheKey = `spots:available:${spotType || 'all'}:${level || 'all'}`;

    // Try cache first
    if (useCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.recordMetrics(
          'SELECT',
          'parking_spots',
          Date.now() - startTime,
          Array.isArray(cached) ? cached.length : 0,
          true
        );
        return cached;
      }
    }

    // Optimized query with selective fetching
    const whereClause: any = {
      status: 'AVAILABLE',
      isActive: true,
    };

    if (spotType) {
      whereClause.spotType = spotType.toUpperCase();
    }

    if (level !== undefined) {
      whereClause.level = level;
    }

    const spots = await this.prisma.parkingSpot.findMany({
      where: whereClause,
      select: {
        id: true,
        spotNumber: true,
        level: true,
        section: true,
        spotType: true,
        width: true,
        length: true,
        height: true,
      },
      orderBy: [{ level: 'asc' }, { section: 'asc' }, { spotNumber: 'asc' }],
    });

    const executionTime = Date.now() - startTime;
    this.recordMetrics('SELECT', 'parking_spots', executionTime, spots.length, false);

    // Cache with shorter TTL since availability changes frequently
    if (useCache) {
      await this.cache.set(cacheKey, spots, this.CACHE_TTL.SPOT_STATUS);
    }

    return spots;
  }

  /**
   * Optimized parking statistics with caching
   */
  async getParkingStatistics(useCache = true) {
    const startTime = Date.now();
    const cacheKey = CacheKeys.VEHICLES_STATS;

    if (useCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.recordMetrics('AGGREGATE', 'vehicles', Date.now() - startTime, 1, true);
        return cached;
      }
    }

    // Optimized aggregation queries
    const [totalSpots, availableSpots, occupiedSpots, vehiclesByType, revenueStats] =
      await Promise.all([
        this.prisma.parkingSpot.count({
          where: { isActive: true },
        }),
        this.prisma.parkingSpot.count({
          where: {
            status: 'AVAILABLE',
            isActive: true,
          },
        }),
        this.prisma.parkingSpot.count({
          where: {
            status: 'OCCUPIED',
            isActive: true,
          },
        }),
        this.prisma.vehicle.groupBy({
          by: ['vehicleType'],
          where: {
            checkOutTime: null, // Currently parked
          },
          _count: {
            id: true,
          },
        }),
        this.prisma.parkingSession.aggregate({
          where: {
            isPaid: true,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          _sum: {
            totalAmount: true,
          },
          _count: {
            id: true,
          },
          _avg: {
            duration: true,
          },
        }),
      ]);

    const stats = {
      totalSpots,
      availableSpots,
      occupiedSpots,
      occupancyRate: totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 10000) / 100 : 0,
      vehiclesByType: vehiclesByType.reduce(
        (acc, item) => {
          acc[item.vehicleType.toLowerCase()] = item._count.id;
          return acc;
        },
        {} as Record<string, number>
      ),
      todayRevenue: revenueStats._sum.totalAmount || 0,
      todayTransactions: revenueStats._count.id || 0,
      avgSessionDuration: Math.round((revenueStats._avg.duration || 0) / 60), // Convert to hours
      lastUpdated: new Date().toISOString(),
    };

    const executionTime = Date.now() - startTime;
    this.recordMetrics('AGGREGATE', 'multiple', executionTime, 1, false);

    // Cache with moderate TTL
    if (useCache) {
      await this.cache.set(cacheKey, stats, this.CACHE_TTL.ANALYTICS);
    }

    return stats;
  }

  /**
   * Batch vehicle check-in operation
   */
  async batchVehicleOperations(
    operations: Array<{
      type: 'CHECK_IN' | 'CHECK_OUT' | 'UPDATE';
      vehicleData: any;
    }>
  ) {
    const startTime = Date.now();

    try {
      const result = await this.prisma.$transaction(async tx => {
        const results = [];

        for (const op of operations) {
          switch (op.type) {
            case 'CHECK_IN':
              const checkedIn = await tx.vehicle.create({
                data: {
                  ...op.vehicleData,
                  licensePlate: op.vehicleData.licensePlate.toUpperCase(),
                },
              });
              results.push({ type: 'CHECK_IN', result: checkedIn });

              // Update spot status
              if (op.vehicleData.spotId) {
                await tx.parkingSpot.update({
                  where: { id: op.vehicleData.spotId },
                  data: { status: 'OCCUPIED' },
                });
              }
              break;

            case 'CHECK_OUT':
              const checkedOut = await tx.vehicle.update({
                where: { id: op.vehicleData.id },
                data: {
                  checkOutTime: new Date(),
                  ...op.vehicleData.updates,
                },
              });
              results.push({ type: 'CHECK_OUT', result: checkedOut });

              // Update spot status
              if (checkedOut.spotId) {
                await tx.parkingSpot.update({
                  where: { id: checkedOut.spotId },
                  data: { status: 'AVAILABLE' },
                });
              }
              break;

            case 'UPDATE':
              const updated = await tx.vehicle.update({
                where: { id: op.vehicleData.id },
                data: op.vehicleData.updates,
              });
              results.push({ type: 'UPDATE', result: updated });
              break;
          }
        }

        return results;
      });

      const executionTime = Date.now() - startTime;
      this.recordMetrics('TRANSACTION', 'vehicles', executionTime, operations.length, false);

      // Invalidate relevant cache entries
      await this.invalidateVehicleCaches(operations);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordSlowQuery(
        'BATCH_TRANSACTION',
        executionTime,
        error instanceof Error ? error.stack : undefined,
        operations
      );
      throw error;
    }
  }

  /**
   * Optimized search with pagination and filtering
   */
  async searchVehicles(params: {
    licensePlate?: string;
    vehicleType?: string;
    ownerId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    const startTime = Date.now();
    const { limit = 50, offset = 0, ...filters } = params;

    // Build optimized where clause
    const whereClause: any = {};

    if (filters.licensePlate) {
      whereClause.licensePlate = {
        contains: filters.licensePlate.toUpperCase(),
      };
    }

    if (filters.vehicleType) {
      whereClause.vehicleType = filters.vehicleType.toUpperCase();
    }

    if (filters.ownerId) {
      whereClause.ownerId = filters.ownerId;
    }

    if (filters.dateFrom || filters.dateTo) {
      whereClause.checkInTime = {};
      if (filters.dateFrom) {
        whereClause.checkInTime.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        whereClause.checkInTime.lte = filters.dateTo;
      }
    }

    // Add status filter logic
    if (filters.status) {
      switch (filters.status.toLowerCase()) {
        case 'parked':
          whereClause.checkOutTime = null;
          break;
        case 'checked_out':
          whereClause.checkOutTime = { not: null };
          break;
        case 'unpaid':
          whereClause.checkOutTime = { not: null };
          whereClause.isPaid = false;
          break;
        case 'paid':
          whereClause.isPaid = true;
          break;
      }
    }

    const [vehicles, totalCount] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: whereClause,
        include: {
          spot: {
            select: {
              spotNumber: true,
              level: true,
              section: true,
            },
          },
        },
        orderBy: {
          checkInTime: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.vehicle.count({
        where: whereClause,
      }),
    ]);

    const executionTime = Date.now() - startTime;
    this.recordMetrics('SELECT', 'vehicles', executionTime, vehicles.length, false);

    return {
      vehicles,
      totalCount,
      hasMore: offset + limit < totalCount,
      pagination: {
        limit,
        offset,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: Math.floor(offset / limit) + 1,
      },
    };
  }

  /**
   * Get slow query analysis
   */
  getSlowQueryAnalysis(): {
    slowQueries: SlowQuery[];
    averageExecutionTime: number;
    slowestQuery: SlowQuery | null;
    suggestions: OptimizationSuggestion[];
  } {
    if (this.slowQueries.length === 0) {
      return {
        slowQueries: [],
        averageExecutionTime: 0,
        slowestQuery: null,
        suggestions: [],
      };
    }

    const avgTime =
      this.slowQueries.reduce((sum, q) => sum + q.executionTime, 0) / this.slowQueries.length;
    const slowest = this.slowQueries.reduce((slowest, current) =>
      current.executionTime > slowest.executionTime ? current : slowest
    );

    const suggestions = this.generateOptimizationSuggestions();

    return {
      slowQueries: this.slowQueries.slice(-20), // Recent 20
      averageExecutionTime: Math.round(avgTime),
      slowestQuery: slowest,
      suggestions,
    };
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(): {
    totalQueries: number;
    cacheHitRate: number;
    averageExecutionTime: number;
    metricsByTable: Record<
      string,
      {
        queryCount: number;
        avgExecutionTime: number;
        cacheHitRate: number;
      }
    >;
  } {
    if (this.queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        cacheHitRate: 0,
        averageExecutionTime: 0,
        metricsByTable: {},
      };
    }

    const totalQueries = this.queryMetrics.length;
    const cacheHits = this.queryMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalQueries) * 100;
    const avgExecutionTime =
      this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;

    // Group by table
    const byTable = this.queryMetrics.reduce(
      (acc, metric) => {
        if (!acc[metric.tableName]) {
          acc[metric.tableName] = {
            queries: [],
            cacheHits: 0,
          };
        }
        acc[metric.tableName].queries.push(metric);
        if (metric.cacheHit) {
          acc[metric.tableName].cacheHits++;
        }
        return acc;
      },
      {} as Record<string, { queries: QueryMetrics[]; cacheHits: number }>
    );

    const metricsByTable = Object.entries(byTable).reduce(
      (acc, [table, data]) => {
        const queries = data.queries;
        acc[table] = {
          queryCount: queries.length,
          avgExecutionTime: Math.round(
            queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length
          ),
          cacheHitRate: Math.round((data.cacheHits / queries.length) * 10000) / 100,
        };
        return acc;
      },
      {} as Record<string, any>
    );

    return {
      totalQueries,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      averageExecutionTime: Math.round(avgExecutionTime),
      metricsByTable,
    };
  }

  private setupQueryLogging(): void {
    // This would typically integrate with Prisma's query logging
    // For now, we'll rely on manual recording in our methods
  }

  private recordMetrics(
    queryType: string,
    tableName: string,
    executionTime: number,
    rowsAffected: number,
    cacheHit: boolean
  ): void {
    const metric: QueryMetrics = {
      queryType,
      tableName,
      executionTime,
      rowsAffected,
      cacheHit,
      timestamp: Date.now(),
    };

    this.queryMetrics.push(metric);

    // Keep metrics within limits
    if (this.queryMetrics.length > this.MAX_METRICS_RETENTION) {
      this.queryMetrics = this.queryMetrics.slice(-this.MAX_METRICS_RETENTION);
    }

    // Record slow queries
    if (executionTime > this.SLOW_QUERY_THRESHOLD) {
      this.recordSlowQuery(`${queryType}_${tableName}`, executionTime);
    }
  }

  private recordSlowQuery(
    query: string,
    executionTime: number,
    stackTrace?: string,
    parameters?: any
  ): void {
    const slowQuery: SlowQuery = {
      query,
      executionTime,
      timestamp: Date.now(),
      stackTrace,
      parameters,
    };

    this.slowQueries.push(slowQuery);

    // Keep only recent slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries = this.slowQueries.slice(-100);
    }

    logger.warn('Slow query detected', slowQuery);
  }

  private async invalidateVehicleCaches(
    operations: Array<{ type: string; vehicleData: any }>
  ): Promise<void> {
    const cacheKeysToInvalidate = new Set<string>();

    operations.forEach(op => {
      if (op.vehicleData.licensePlate) {
        cacheKeysToInvalidate.add(CacheKeys.VEHICLE(op.vehicleData.licensePlate));
      }
      if (op.vehicleData.ownerId) {
        cacheKeysToInvalidate.add(CacheKeys.VEHICLES_BY_OWNER(op.vehicleData.ownerId));
      }
    });

    // Also invalidate aggregate statistics
    cacheKeysToInvalidate.add(CacheKeys.VEHICLES_STATS);
    cacheKeysToInvalidate.add(CacheKeys.SPOTS_AVAILABLE);

    for (const key of cacheKeysToInvalidate) {
      await this.cache.delete(key);
    }
  }

  private generateOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze slow queries for suggestions
    const slowQueryTypes = this.slowQueries.reduce(
      (acc, query) => {
        acc[query.query] = (acc[query.query] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    Object.entries(slowQueryTypes).forEach(([queryType, count]) => {
      if (count > 5) {
        // Frequently slow query
        suggestions.push({
          type: 'INDEX',
          priority: 'HIGH',
          description: `Frequent slow query detected: ${queryType}`,
          impact: `${count} slow queries could be optimized`,
          implementation: 'Consider adding database indexes for frequently queried columns',
        });
      }
    });

    // Analyze cache hit rates
    const cacheHitRate = this.getQueryMetrics().cacheHitRate;
    if (cacheHitRate < 50) {
      suggestions.push({
        type: 'CACHE',
        priority: 'MEDIUM',
        description: `Low cache hit rate: ${cacheHitRate.toFixed(1)}%`,
        impact: 'Improving cache hit rate could reduce database load',
        implementation: 'Review caching strategy and increase TTL for stable data',
      });
    }

    return suggestions;
  }
}

export default QueryOptimizer;
