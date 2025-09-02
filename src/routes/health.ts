/**
 * Health Check and Monitoring Routes
 * Provides comprehensive health status including security monitoring
 */

import { Router, Request, Response } from 'express';
import { getSecurityHealthCheck, getMonitoringStats } from '../middleware/security/securityMonitoring';
import { circuitBreakerManager } from '../middleware/security/circuitBreaker';
import { SecurityAuditService } from '../services/SecurityAuditService';
import { prisma } from '../config/database';

const router: Router = Router();

/**
 * Basic health check endpoint
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - startTime;
    
    // Get security monitoring status
    const securityHealth = await getSecurityHealthCheck();
    const monitoringStats = getMonitoringStats();
    const circuitBreakers = circuitBreakerManager.getHealthCheck();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: {
        status: 'connected',
        responseTime: dbResponseTime
      },
      security: securityHealth.security,
      monitoring: {
        activeIPs: monitoringStats.activeIPs,
        requestsPerMinute: monitoringStats.totalRequests,
        suspiciousActivity: monitoringStats.suspiciousIPs > 0 ? 'detected' : 'none'
      },
      circuitBreakers: {
        status: circuitBreakers.overallHealthy ? 'healthy' : 'degraded',
        healthy: circuitBreakers.healthyBreakers,
        total: circuitBreakers.totalBreakers
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    };
    
    res.json(healthData);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * Detailed health check for monitoring systems
 */
router.get('/detailed', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Test database with multiple queries
    const dbStartTime = Date.now();
    const [vehicleCount, sessionCount, userCount] = await Promise.all([
      prisma.vehicle.count(),
      prisma.parkingSession.count(),
      prisma.user.count()
    ]);
    const dbResponseTime = Date.now() - dbStartTime;
    
    // Get security analytics
    const securityAnalytics = await SecurityAuditService.getSecurityAnalytics('day');
    
    // System metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      system: {
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      database: {
        status: 'connected',
        responseTime: dbResponseTime,
        entities: {
          vehicles: vehicleCount,
          sessions: sessionCount,
          users: userCount
        }
      },
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      },
      security: {
        analytics: securityAnalytics,
        monitoring: getMonitoringStats(),
        circuitBreakers: circuitBreakerManager.getAllStatuses()
      },
      services: {
        email: {
          status: 'unknown', // Would check email service here
          lastCheck: new Date().toISOString()
        },
        cache: {
          status: 'unknown', // Would check Redis here
          lastCheck: new Date().toISOString()
        }
      }
    };
    
    res.json(detailedHealth);
  } catch (error) {
    console.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * Liveness probe for Kubernetes
 */
router.get('/live', (req: Request, res: Response): void => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe for Kubernetes
 */
router.get('/ready', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check critical dependencies
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Database not available'
    });
  }
});

/**
 * Security monitoring dashboard data
 */
router.get('/security', async (req: Request, res: Response): Promise<void> => {
  try {
    const timeframe = (req.query.timeframe as 'day' | 'week' | 'month') || 'day';
    
    const [analytics, monitoring, circuitBreakers] = await Promise.all([
      SecurityAuditService.getSecurityAnalytics(timeframe),
      Promise.resolve(getMonitoringStats()),
      Promise.resolve(circuitBreakerManager.getHealthCheck())
    ]);
    
    res.json({
      timeframe,
      analytics,
      monitoring,
      circuitBreakers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Security health check failed:', error);
    res.status(500).json({
      error: 'Security monitoring unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Performance metrics endpoint
 */
router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      security: getMonitoringStats(),
      circuitBreakers: circuitBreakerManager.getAllStatuses()
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Metrics collection failed:', error);
    res.status(500).json({
      error: 'Metrics collection failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;