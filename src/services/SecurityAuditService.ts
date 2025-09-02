/**
 * SecurityAuditService - Comprehensive security audit logging and monitoring
 * for enterprise authentication system
 */

import { prisma } from '../config/database';
import * as crypto from 'crypto';

export interface SecurityEvent {
  userId?: string;
  sessionId?: string;
  action: string;
  category: 'AUTH' | 'ACCOUNT' | 'SECURITY' | 'DATA_ACCESS' | 'COMMUNICATION' | 'SYSTEM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isAnomaly?: boolean;
}

export interface SecurityAnalytics {
  totalEvents: number;
  criticalEvents: number;
  anomalies: number;
  topRisks: Array<{
    action: string;
    count: number;
    riskLevel: string;
  }>;
  userRisks: Array<{
    userId: string;
    riskScore: number;
    eventCount: number;
  }>;
  ipRisks: Array<{
    ipAddress: string;
    riskScore: number;
    eventCount: number;
  }>;
  timelineSummary: Array<{
    date: string;
    eventCount: number;
    criticalCount: number;
    anomalyCount: number;
  }>;
}

export interface RiskAssessment {
  score: number; // 0-100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: Array<{
    factor: string;
    weight: number;
    value: number;
    description: string;
  }>;
  recommendations: string[];
}

class SecurityAuditService {
  private riskScoreCache = new Map<string, { score: number; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Log a security event with automatic risk assessment
   */
  async logSecurityEvent(event: SecurityEvent): Promise<string> {
    try {
      // Calculate risk level if not provided
      if (!event.riskLevel) {
        event.riskLevel = this.calculateEventRiskLevel(event);
      }

      // Detect if this is an anomaly
      if (event.isAnomaly === undefined) {
        event.isAnomaly = await this.detectAnomaly(event);
      }

      // Create audit log entry
      const auditLog = await prisma.securityAuditLog.create({
        data: {
          userId: event.userId || null,
          sessionId: event.sessionId || null,
          action: event.action,
          category: event.category,
          severity: event.severity,
          description: event.description,
          ipAddress: event.ipAddress || null,
          userAgent: event.userAgent || null,
          metadata: event.metadata ? JSON.stringify(event.metadata) : null,
          riskLevel: event.riskLevel,
          isAnomaly: event.isAnomaly,
        },
      });

      // Trigger alerts for critical events
      if (event.severity === 'CRITICAL' || event.isAnomaly) {
        await this.triggerSecurityAlert(event, auditLog.id);
      }

      // Update user risk score if user-specific event
      if (event.userId) {
        await this.updateUserRiskScore(event.userId, event);
      }

      // Update IP risk score if IP address available
      if (event.ipAddress) {
        await this.updateIpRiskScore(event.ipAddress, event);
      }

      return auditLog.id;
    } catch (error) {
      console.error('Log security event error:', error);
      throw error;
    }
  }

  /**
   * Get security analytics for dashboard
   */
  async getSecurityAnalytics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<SecurityAnalytics> {
    try {
      const startDate = this.getTimeframeStartDate(timeframe);

      // Get total events and critical events
      const [totalEvents, criticalEvents, anomalies] = await Promise.all([
        prisma.securityAuditLog.count({
          where: { createdAt: { gte: startDate } },
        }),
        prisma.securityAuditLog.count({
          where: {
            createdAt: { gte: startDate },
            severity: 'CRITICAL',
          },
        }),
        prisma.securityAuditLog.count({
          where: {
            createdAt: { gte: startDate },
            isAnomaly: true,
          },
        }),
      ]);

      // Get top risk actions
      const topRisks = await prisma.securityAuditLog.groupBy({
        by: ['action', 'riskLevel'],
        _count: { _all: true },
        where: { createdAt: { gte: startDate } },
        orderBy: { _count: { _all: 'desc' } },
        take: 10,
      });

      // Get user risk scores
      const userRisks = await prisma.securityAuditLog.groupBy({
        by: ['userId'],
        _count: { _all: true },
        where: {
          createdAt: { gte: startDate },
          userId: { not: null },
        },
        orderBy: { _count: { _all: 'desc' } },
        take: 10,
      });

      // Get IP risk scores
      const ipRisks = await prisma.securityAuditLog.groupBy({
        by: ['ipAddress'],
        _count: { _all: true },
        where: {
          createdAt: { gte: startDate },
          ipAddress: { not: null },
        },
        orderBy: { _count: { _all: 'desc' } },
        take: 10,
      });

      // Generate timeline summary
      const timelineSummary = await this.generateTimelineSummary(startDate, timeframe);

      return {
        totalEvents,
        criticalEvents,
        anomalies,
        topRisks: topRisks.map(risk => ({
          action: risk.action,
          count: risk._count._all,
          riskLevel: risk.riskLevel || 'LOW',
        })),
        userRisks: await Promise.all(
          userRisks.map(async risk => ({
            userId: risk.userId!,
            riskScore: await this.getUserRiskScore(risk.userId!),
            eventCount: risk._count._all,
          }))
        ),
        ipRisks: await Promise.all(
          ipRisks.map(async risk => ({
            ipAddress: risk.ipAddress!,
            riskScore: await this.getIpRiskScore(risk.ipAddress!),
            eventCount: risk._count._all,
          }))
        ),
        timelineSummary,
      };
    } catch (error) {
      console.error('Get security analytics error:', error);
      throw error;
    }
  }

  /**
   * Assess risk for a user based on their activity patterns
   */
  async assessUserRisk(userId: string): Promise<RiskAssessment> {
    try {
      const factors = [];
      let totalScore = 0;

      // Recent failed login attempts
      const failedLogins = await prisma.loginHistory.count({
        where: {
          userId,
          attemptType: { in: ['FAILED_PASSWORD', 'FAILED_2FA'] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      const failedLoginScore = Math.min(failedLogins * 10, 30);
      factors.push({
        factor: 'Failed Login Attempts (24h)',
        weight: 0.3,
        value: failedLoginScore,
        description: `${failedLogins} failed login attempts in the last 24 hours`,
      });
      totalScore += failedLoginScore * 0.3;

      // Suspicious activities
      const suspiciousEvents = await prisma.securityAuditLog.count({
        where: {
          userId,
          isAnomaly: true,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      const suspiciousScore = Math.min(suspiciousEvents * 15, 40);
      factors.push({
        factor: 'Suspicious Activities (7d)',
        weight: 0.4,
        value: suspiciousScore,
        description: `${suspiciousEvents} suspicious activities detected in the last 7 days`,
      });
      totalScore += suspiciousScore * 0.4;

      // Account security features
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          isTwoFactorEnabled: true,
          isEmailVerified: true,
          lastPasswordChange: true,
        },
      });

      let securityScore = 0;
      if (!user?.isTwoFactorEnabled) securityScore += 15;
      if (!user?.isEmailVerified) securityScore += 10;
      if (user?.lastPasswordChange && 
          user.lastPasswordChange < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
        securityScore += 10;
      }

      factors.push({
        factor: 'Account Security Configuration',
        weight: 0.2,
        value: securityScore,
        description: 'Missing security features or outdated credentials',
      });
      totalScore += securityScore * 0.2;

      // Geographic anomalies
      const geoScore = await this.calculateGeographicRisk(userId);
      factors.push({
        factor: 'Geographic Risk',
        weight: 0.1,
        value: geoScore,
        description: 'Risk based on login location patterns',
      });
      totalScore += geoScore * 0.1;

      // Calculate final risk level
      const finalScore = Math.min(Math.round(totalScore), 100);
      let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      
      if (finalScore < 25) level = 'LOW';
      else if (finalScore < 50) level = 'MEDIUM';
      else if (finalScore < 75) level = 'HIGH';
      else level = 'CRITICAL';

      // Generate recommendations
      const recommendations = this.generateRecommendations(factors, user);

      return {
        score: finalScore,
        level,
        factors,
        recommendations,
      };
    } catch (error) {
      console.error('Assess user risk error:', error);
      throw error;
    }
  }

  /**
   * Calculate event risk level based on action and context
   */
  private calculateEventRiskLevel(event: SecurityEvent): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const riskMatrix = {
      // Authentication events
      LOGIN: 'LOW',
      LOGOUT: 'LOW',
      FAILED_LOGIN: 'MEDIUM',
      ACCOUNT_LOCKED: 'HIGH',
      PASSWORD_CHANGE: 'MEDIUM',
      PASSWORD_RESET_REQUESTED: 'MEDIUM',
      EMAIL_VERIFIED: 'LOW',
      
      // Security events
      TWO_FA_ENABLED: 'LOW',
      TWO_FA_DISABLED: 'HIGH',
      SUSPICIOUS_LOGIN: 'HIGH',
      MULTIPLE_FAILED_ATTEMPTS: 'HIGH',
      BRUTE_FORCE_DETECTED: 'CRITICAL',
      
      // System events
      RATE_LIMIT_EXCEEDED: 'MEDIUM',
      EMAIL_RATE_LIMIT_EXCEEDED: 'MEDIUM',
      UNAUTHORIZED_ACCESS_ATTEMPT: 'CRITICAL',
      DATA_BREACH_ATTEMPT: 'CRITICAL',
      
      // Communication events
      EMAIL_SENT: 'LOW',
      EMAIL_SEND_FAILED: 'LOW',
    };

    let baseRisk = riskMatrix[event.action as keyof typeof riskMatrix] || 'LOW';

    // Elevate risk based on context
    if (event.severity === 'CRITICAL') baseRisk = 'CRITICAL';
    else if (event.severity === 'HIGH') baseRisk = 'HIGH';

    return baseRisk as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }

  /**
   * Detect if an event is anomalous based on historical patterns
   */
  private async detectAnomaly(event: SecurityEvent): Promise<boolean> {
    try {
      // Simple anomaly detection based on frequency and patterns
      if (!event.userId && !event.ipAddress) return false;

      const lookbackHours = 24;
      const lookbackDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

      // Check for unusual frequency of similar events
      const similarEvents = await prisma.securityAuditLog.count({
        where: {
          ...(event.userId && { userId: event.userId }),
          ...(event.ipAddress && { ipAddress: event.ipAddress }),
          action: event.action,
          createdAt: { gte: lookbackDate },
        },
      });

      // Define thresholds for different actions
      const thresholds = {
        FAILED_LOGIN: 5,
        LOGIN: 10,
        PASSWORD_RESET_REQUESTED: 3,
        EMAIL_SENT: 20,
        default: 15,
      };

      const threshold = thresholds[event.action as keyof typeof thresholds] || thresholds.default;

      return similarEvents > threshold;
    } catch (error) {
      console.error('Detect anomaly error:', error);
      return false;
    }
  }

  /**
   * Trigger security alert for critical events
   */
  private async triggerSecurityAlert(event: SecurityEvent, auditLogId: string): Promise<void> {
    try {
      // This would integrate with alerting systems (email, Slack, PagerDuty, etc.)
      console.warn('🚨 SECURITY ALERT:', {
        auditLogId,
        action: event.action,
        severity: event.severity,
        description: event.description,
        userId: event.userId,
        ipAddress: event.ipAddress,
        isAnomaly: event.isAnomaly,
      });

      // Could implement integrations here:
      // - Send email to security team
      // - Post to Slack channel
      // - Create PagerDuty incident
      // - Log to SIEM system
    } catch (error) {
      console.error('Trigger security alert error:', error);
    }
  }

  /**
   * Update user risk score based on recent activity
   */
  private async updateUserRiskScore(userId: string, event: SecurityEvent): Promise<void> {
    try {
      const cacheKey = `user:${userId}`;
      const cached = this.riskScoreCache.get(cacheKey);

      // Return cached score if still valid
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return;
      }

      // Calculate new risk score
      const riskAssessment = await this.assessUserRisk(userId);
      
      // Cache the result
      this.riskScoreCache.set(cacheKey, {
        score: riskAssessment.score,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Update user risk score error:', error);
    }
  }

  /**
   * Update IP address risk score
   */
  private async updateIpRiskScore(ipAddress: string, event: SecurityEvent): Promise<void> {
    // Similar to user risk score but for IP addresses
    // This would track malicious IPs, failed attempts, etc.
  }

  /**
   * Get user risk score from cache or calculate
   */
  private async getUserRiskScore(userId: string): Promise<number> {
    const cacheKey = `user:${userId}`;
    const cached = this.riskScoreCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.score;
    }

    const riskAssessment = await this.assessUserRisk(userId);
    this.riskScoreCache.set(cacheKey, {
      score: riskAssessment.score,
      timestamp: Date.now(),
    });

    return riskAssessment.score;
  }

  /**
   * Get IP address risk score
   */
  private async getIpRiskScore(ipAddress: string): Promise<number> {
    // This would implement IP risk scoring based on:
    // - Failed login attempts
    // - Geographic anomalies
    // - Known malicious IP databases
    // - Rate limiting violations
    return 0; // Placeholder
  }

  /**
   * Calculate geographic risk based on login patterns
   */
  private async calculateGeographicRisk(userId: string): Promise<number> {
    try {
      const recentLogins = await prisma.loginHistory.findMany({
        where: {
          userId,
          attemptType: 'SUCCESS',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          geoLocation: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      if (recentLogins.length < 2) return 0;

      // Analyze geographic patterns
      const locations = recentLogins.map(login => login.geoLocation).filter(Boolean);
      const uniqueLocations = new Set(locations);
      
      // Risk increases with number of different locations
      if (uniqueLocations.size > 5) return 20;
      if (uniqueLocations.size > 3) return 10;
      if (uniqueLocations.size > 1) return 5;
      
      return 0;
    } catch (error) {
      console.error('Calculate geographic risk error:', error);
      return 0;
    }
  }

  /**
   * Generate security recommendations based on risk factors
   */
  private generateRecommendations(factors: any[], user: any): string[] {
    const recommendations: string[] = [];

    if (!user?.isTwoFactorEnabled) {
      recommendations.push('Enable Two-Factor Authentication (2FA) to secure your account');
    }

    if (!user?.isEmailVerified) {
      recommendations.push('Verify your email address to improve account security');
    }

    if (user?.lastPasswordChange && 
        user.lastPasswordChange < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
      recommendations.push('Change your password regularly (last change was over 90 days ago)');
    }

    const failedLoginFactor = factors.find(f => f.factor.includes('Failed Login'));
    if (failedLoginFactor && failedLoginFactor.value > 10) {
      recommendations.push('Review recent login attempts and secure your account if unauthorized access is suspected');
    }

    const suspiciousFactor = factors.find(f => f.factor.includes('Suspicious'));
    if (suspiciousFactor && suspiciousFactor.value > 15) {
      recommendations.push('Review recent account activity and contact support if you notice unauthorized actions');
    }

    const geoFactor = factors.find(f => f.factor.includes('Geographic'));
    if (geoFactor && geoFactor.value > 10) {
      recommendations.push('Review login locations and enable login notifications for enhanced security');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your account security is good. Continue following security best practices.');
    }

    return recommendations;
  }

  /**
   * Get timeframe start date
   */
  private getTimeframeStartDate(timeframe: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Generate timeline summary for analytics
   */
  private async generateTimelineSummary(startDate: Date, timeframe: string): Promise<Array<{
    date: string;
    eventCount: number;
    criticalCount: number;
    anomalyCount: number;
  }>> {
    // This would generate daily/hourly summaries based on timeframe
    // For now, return empty array
    return [];
  }
}

export default new SecurityAuditService();
export { SecurityAuditService };