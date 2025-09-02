# Performance Optimization Guide

This document outlines the comprehensive performance optimization strategies implemented in the Parking Garage Management System, including database indexing, caching, query optimization, and monitoring.

## Table of Contents

1. [Overview](#overview)
2. [Database Performance](#database-performance)
3. [Caching Strategy](#caching-strategy)
4. [Query Optimization](#query-optimization)
5. [Performance Monitoring](#performance-monitoring)
6. [Configuration](#configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Overview

The system implements a multi-layered performance optimization approach:

- **Database Layer**: Optimized indexes, connection pooling, and SQLite-specific tuning
- **Caching Layer**: Redis-based caching with cache-aside pattern and intelligent invalidation
- **Application Layer**: Query optimization, batch operations, and performance monitoring
- **Monitoring Layer**: Real-time metrics collection and alerting

### Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Average Response Time | < 200ms | < 500ms |
| Database Query Time | < 100ms | < 1000ms |
| Cache Hit Rate | > 80% | > 50% |
| Error Rate | < 1% | < 5% |
| Memory Usage | < 512MB | < 1GB |

## Database Performance

### Indexing Strategy

The system uses strategically placed indexes to optimize query performance:

#### Primary Indexes

```sql
-- Single column indexes for frequent lookups
CREATE INDEX idx_vehicles_license_plate ON vehicles(licensePlate);
CREATE INDEX idx_vehicles_spot_id ON vehicles(spotId);
CREATE INDEX idx_vehicles_owner_id ON vehicles(ownerId);
CREATE INDEX idx_vehicles_check_in_time ON vehicles(checkInTime);

-- Status and type indexes for filtering
CREATE INDEX idx_vehicles_vehicle_type ON vehicles(vehicleType);
CREATE INDEX idx_vehicles_is_paid ON vehicles(isPaid);
CREATE INDEX idx_parking_spots_status ON parking_spots(status);
CREATE INDEX idx_parking_spots_spot_type ON parking_spots(spotType);
```

#### Composite Indexes

```sql
-- Composite indexes for complex queries
CREATE INDEX idx_vehicles_spot_paid ON vehicles(spotId, isPaid);
CREATE INDEX idx_vehicles_type_checkin ON vehicles(vehicleType, checkInTime);
CREATE INDEX idx_vehicles_owner_checkin ON vehicles(ownerId, checkInTime);
CREATE INDEX idx_sessions_start_end ON parking_sessions(startTime, endTime);
```

### SQLite Optimizations

The system applies SQLite-specific optimizations for better performance:

```typescript
// WAL mode for better concurrent access
PRAGMA journal_mode = WAL;

// Increased cache size (2MB default)
PRAGMA cache_size = 2000;

// Memory-mapped I/O for faster reads
PRAGMA mmap_size = 268435456; // 256MB

// Optimized page size
PRAGMA page_size = 4096;

// Reduced synchronization for better performance
PRAGMA synchronous = NORMAL;

// Use memory for temporary storage
PRAGMA temp_store = memory;
```

### Connection Pool Configuration

```typescript
const databaseConfig = {
  maxConnections: 10,
  connectionTimeout: 5000,
  queryTimeout: 30000,
  poolTimeout: 10000,
  idleTimeout: 300000, // 5 minutes
  maxLifetime: 3600000, // 1 hour
};
```

## Caching Strategy

### Cache-Aside Pattern

The system implements the cache-aside pattern for optimal performance:

1. **Read Path**: Check cache → Database → Update cache
2. **Write Path**: Update database → Invalidate cache
3. **Cache Warming**: Preload frequently accessed data

### Cache Keys Structure

```typescript
const CacheKeys = {
  // Vehicle related
  VEHICLE: (licensePlate: string) => `vehicle:${licensePlate}`,
  VEHICLES_BY_OWNER: (ownerId: string) => `vehicles:owner:${ownerId}`,
  VEHICLES_PARKED: 'vehicles:parked',
  
  // Parking spot related
  SPOTS_AVAILABLE: 'spots:available',
  SPOTS_BY_TYPE: (type: string) => `spots:type:${type}`,
  
  // Analytics
  REVENUE_STATS: 'analytics:revenue',
  USAGE_STATS: 'analytics:usage',
};
```

### TTL Strategy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Vehicle Lookup | 5 minutes | Moderate update frequency |
| Spot Status | 1 minute | High update frequency |
| Analytics | 30 minutes | Low update frequency |
| Configuration | 1 hour | Rarely changes |

### Cache Invalidation

The system uses intelligent cache invalidation strategies:

```typescript
// Pattern-based invalidation
await cache.invalidatePattern('vehicles:*');

// Dependency-based invalidation
const invalidateKeys = [
  CacheKeys.VEHICLE(licensePlate),
  CacheKeys.VEHICLES_PARKED,
  CacheKeys.SPOTS_AVAILABLE
];
```

## Query Optimization

### Optimized Queries

The QueryOptimizer service provides optimized database access patterns:

#### Vehicle Lookup Optimization

```typescript
// Optimized with selective fetching and caching
async findVehicleByLicensePlate(licensePlate: string) {
  // Try cache first
  const cached = await cache.get(CacheKeys.VEHICLE(licensePlate));
  if (cached) return cached;
  
  // Optimized database query
  const vehicle = await prisma.vehicle.findUnique({
    where: { licensePlate: licensePlate.toUpperCase() },
    include: {
      spot: { select: { id: true, spotNumber: true, level: true } },
      sessions: {
        select: { id: true, startTime: true, endTime: true },
        orderBy: { startTime: 'desc' },
        take: 10 // Limit recent sessions
      }
    }
  });
  
  // Cache successful lookups
  if (vehicle) {
    await cache.set(CacheKeys.VEHICLE(licensePlate), vehicle, 300);
  }
  
  return vehicle;
}
```

#### Batch Operations

```typescript
// Efficient batch processing with transactions
async batchVehicleOperations(operations: Operation[]) {
  return await prisma.$transaction(async (tx) => {
    const results = [];
    for (const op of operations) {
      // Process each operation within transaction
      const result = await this.processOperation(tx, op);
      results.push(result);
    }
    return results;
  });
}
```

### Search Optimization

```typescript
// Optimized search with pagination and filtering
async searchVehicles(params: SearchParams) {
  const whereClause = this.buildWhereClause(params);
  
  const [vehicles, totalCount] = await Promise.all([
    prisma.vehicle.findMany({
      where: whereClause,
      include: { spot: { select: { spotNumber: true } } },
      orderBy: { checkInTime: 'desc' },
      take: params.limit,
      skip: params.offset
    }),
    prisma.vehicle.count({ where: whereClause })
  ]);
  
  return { vehicles, totalCount, hasMore: /* ... */ };
}
```

## Performance Monitoring

### Real-Time Metrics

The system collects comprehensive performance metrics:

```typescript
interface RequestMetrics {
  requestId: string;
  method: string;
  path: string;
  responseTime: number;
  statusCode: number;
  dbQueries: number;
  dbTime: number;
  cacheHit: boolean;
  memoryUsage: NodeJS.MemoryUsage;
}
```

### Performance Alerts

Automated alerts are triggered for performance issues:

| Alert Type | Threshold | Action |
|------------|-----------|--------|
| Slow Request | > 2 seconds | Log warning |
| High Error Rate | > 10% | Log error |
| Memory Leak | > 100MB growth | Log error |
| DB Slow Query | > 1 second | Log warning |
| Cache Miss High | > 70% | Log warning |

### Metrics Dashboard

Access performance metrics via the `/metrics` endpoint:

```json
{
  "summary": {
    "totalRequests": 15420,
    "averageResponseTime": 145,
    "errorRate": 0.8,
    "p95ResponseTime": 320,
    "p99ResponseTime": 580
  },
  "database": {
    "totalQueries": 8965,
    "averageQueryTime": 45,
    "slowQueries": 12,
    "connectionPool": {
      "active": 3,
      "idle": 7,
      "total": 10
    }
  },
  "cache": {
    "hitRate": 87.5,
    "operations": 25680,
    "memoryUsed": "45.2MB"
  }
}
```

## Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_URL="file:./parking_garage.db"
DB_MAX_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=5000
DB_QUERY_TIMEOUT=30000
SLOW_QUERY_THRESHOLD=1000

# SQLite Optimizations
SQLITE_WAL=true
SQLITE_CACHE_SIZE=2000
SQLITE_MMAP_SIZE=268435456
SQLITE_SYNCHRONOUS=NORMAL

# Cache Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_DEFAULT_TTL=300
CACHE_MAX_RETRIES=3

# Performance Monitoring
SLOW_REQUEST_THRESHOLD=2000
HIGH_ERROR_RATE=0.1
MEMORY_GROWTH_THRESHOLD=100
```

### Production Configuration

For production environments, use these optimized settings:

```typescript
const productionConfig = {
  database: {
    maxConnections: 20,
    connectionTimeout: 10000,
    queryTimeout: 60000,
    sqliteOptimizations: {
      cacheSize: 4000,
      mmapSize: 536870912, // 512MB
      synchronous: 'NORMAL',
      journalMode: 'WAL'
    }
  },
  cache: {
    defaultTTL: 600,
    maxRetries: 5,
    retryDelayMs: 2000
  },
  monitoring: {
    slowRequestThreshold: 1000,
    enableMetrics: true,
    metricsRetention: 86400000 // 24 hours
  }
};
```

## Testing

### Performance Tests

Run performance tests to validate optimizations:

```bash
# Run all performance tests
npm run test:performance

# Run specific performance test suites
npm test -- tests/performance/database.performance.test.ts
npm test -- tests/performance/cache.performance.test.ts
```

### Benchmarking

The system includes comprehensive benchmarks:

#### Database Performance Benchmarks

- **Single Operations**: < 50ms for indexed lookups
- **Batch Operations**: < 3 seconds for 1000 vehicles
- **Complex Queries**: < 200ms with joins and filtering
- **Concurrent Operations**: < 3 seconds for 50 concurrent reads

#### Cache Performance Benchmarks

- **Single Operations**: < 10ms for get/set operations
- **Batch Operations**: < 500ms for 1000 items
- **Cache Warming**: < 2 seconds for 100 items
- **Pattern Invalidation**: < 1 second for 250 items

### Load Testing

Example load test results:

```
Scenario: High Traffic (1000 req/min)
- Average Response Time: 156ms
- P95 Response Time: 342ms  
- Error Rate: 0.2%
- Cache Hit Rate: 89.3%
- Database Queries/sec: 45

Scenario: Peak Load (5000 req/min)
- Average Response Time: 287ms
- P95 Response Time: 654ms
- Error Rate: 1.1% 
- Cache Hit Rate: 91.7%
- Database Queries/sec: 178
```

## Troubleshooting

### Common Performance Issues

#### Slow Database Queries

**Symptoms**: High response times, database timeout errors

**Diagnosis**:
```typescript
// Check slow query log
const slowQueries = queryOptimizer.getSlowQueryAnalysis();
console.log('Slow queries:', slowQueries.slowQueries);
```

**Solutions**:
- Add missing indexes
- Optimize query structure
- Implement query result caching
- Use batch operations for multiple queries

#### Low Cache Hit Rate

**Symptoms**: High database load, slow response times

**Diagnosis**:
```typescript
const cacheMetrics = cache.getMetrics();
console.log('Cache hit rate:', cacheMetrics.hitRate);
```

**Solutions**:
- Increase cache TTL for stable data
- Implement cache warming for critical paths
- Review cache key strategy
- Monitor cache memory usage

#### High Memory Usage

**Symptoms**: Memory alerts, garbage collection pressure

**Diagnosis**:
```typescript
const metrics = performanceMetrics.getCurrentMetrics();
console.log('Memory usage:', metrics.system.memory);
```

**Solutions**:
- Review large object storage in cache
- Implement memory-efficient data structures
- Add memory usage monitoring
- Configure garbage collection optimization

#### Connection Pool Exhaustion

**Symptoms**: Connection timeout errors, slow database operations

**Diagnosis**:
```typescript
const poolMetrics = connectionPoolMonitor.getMetrics();
console.log('Pool status:', poolMetrics);
```

**Solutions**:
- Increase max connections
- Implement connection health checks
- Add connection retry strategies
- Monitor connection lifecycle

### Performance Monitoring Tools

#### Real-Time Monitoring

```bash
# Monitor performance metrics
curl http://localhost:3000/api/metrics

# Check cache status  
curl http://localhost:3000/api/cache/health

# Database health check
curl http://localhost:3000/api/database/health
```

#### Log Analysis

```bash
# Find slow queries in logs
grep "Slow query" logs/app.log | tail -20

# Monitor error patterns
grep "ERROR" logs/app.log | grep "performance" | tail -10

# Cache hit rate analysis
grep "Cache" logs/app.log | grep -E "(hit|miss)" | tail -50
```

## Best Practices

### Development Guidelines

1. **Always use indexes** for frequently queried columns
2. **Implement caching** for expensive operations
3. **Use batch operations** for multiple database changes
4. **Monitor performance** in development and production
5. **Profile memory usage** for large operations
6. **Test performance** with realistic data volumes

### Code Review Checklist

- [ ] Database queries use appropriate indexes
- [ ] Cache keys follow naming conventions
- [ ] TTL values are appropriate for data volatility
- [ ] Error handling includes performance considerations
- [ ] Batch operations are used for multiple items
- [ ] Memory usage is monitored for large operations
- [ ] Performance tests cover new functionality

### Deployment Checklist

- [ ] Database indexes are created
- [ ] Cache service is configured and running
- [ ] Performance monitoring is enabled
- [ ] Log aggregation is configured
- [ ] Alert thresholds are set
- [ ] Load testing completed
- [ ] Performance baselines established

---

For additional support or questions about performance optimization, please refer to the development team or create an issue in the project repository.