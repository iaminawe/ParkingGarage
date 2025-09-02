/**
 * NotificationService - Comprehensive notification system with email, SMS,
 * in-app notifications, templates, and user preferences
 */

import { prisma } from '../config/database';
import EmailService from './EmailService';
import { SecurityAuditService } from './SecurityAuditService';
import { env } from '../config/environment';

export type NotificationType =
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_REMINDER'
  | 'RESERVATION_CANCELLED'
  | 'PAYMENT_SUCCESSFUL'
  | 'PAYMENT_FAILED'
  | 'SPOT_AVAILABLE'
  | 'OVERTIME_WARNING'
  | 'CHECKOUT_REMINDER'
  | 'SECURITY_ALERT'
  | 'MAINTENANCE_NOTICE'
  | 'PROMOTION_OFFER';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'IN_APP' | 'PUSH';

export interface NotificationRequest {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  data?: Record<string, any>;
  scheduledFor?: Date;
  expiresAt?: Date;
  templateVariables?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  deliveryResults: Array<{
    channel: NotificationChannel;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
  message: string;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string;
  enabledTypes: NotificationType[];
  frequency: 'IMMEDIATE' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST';
  language: string;
}

export interface SMSConfig {
  provider: 'twilio' | 'aws_sns' | 'mock';
  accountSid?: string;
  authToken?: string;
  fromNumber: string;
  region?: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  isArchived: boolean;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  language: string;
  subject?: string; // For email/push
  title: string;
  body: string;
  variables: string[]; // List of variable names
  isActive: boolean;
  version: number;
}

class NotificationService {
  private auditService: SecurityAuditService;
  private smsConfig: SMSConfig;
  private notificationQueue: NotificationRequest[] = [];
  private processing = false;

  constructor() {
    this.auditService = new SecurityAuditService();
    this.smsConfig = this.initializeSMSConfig();
    this.startQueueProcessor();
    this.startScheduledNotificationProcessor();
  }

  /**
   * Send notification through specified channels
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(request.userId);

      // Filter channels based on preferences
      const enabledChannels = this.filterChannelsByPreferences(request.channels, preferences);

      if (enabledChannels.length === 0) {
        return {
          success: false,
          message: 'All notification channels disabled by user preferences',
          deliveryResults: [],
        };
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences) && request.priority !== 'URGENT') {
        // Schedule for later or add to digest
        if (preferences.frequency === 'IMMEDIATE') {
          const scheduledTime = this.getNextAllowedTime(preferences);
          return await this.scheduleNotification({ ...request, scheduledFor: scheduledTime });
        }
        // Add to digest queue (would be implemented)
        return {
          success: true,
          message: 'Added to digest queue due to quiet hours',
          deliveryResults: [],
        };
      }

      // Send through each enabled channel
      const deliveryResults = await Promise.all(
        enabledChannels.map(channel => this.sendThroughChannel(request, channel, preferences))
      );

      // Store in-app notification if channel is enabled
      let notificationId: string | undefined;
      if (enabledChannels.includes('IN_APP')) {
        notificationId = await this.createInAppNotification(request);
      }

      // Log notification sent
      await this.auditService.logSecurityEvent({
        userId: request.userId,
        action: 'NOTIFICATION_SENT',
        category: 'COMMUNICATION',
        severity: 'LOW',
        description: `Notification sent: ${request.type}`,
        metadata: {
          notificationType: request.type,
          channels: enabledChannels,
          priority: request.priority,
          deliveryResults: deliveryResults.map(r => ({ channel: r.channel, success: r.success })),
        },
      });

      const successCount = deliveryResults.filter(r => r.success).length;
      const success = successCount > 0;

      return {
        success,
        notificationId,
        deliveryResults,
        message: success
          ? `Notification sent successfully through ${successCount}/${deliveryResults.length} channels`
          : 'Failed to send notification through any channel',
      };
    } catch (error) {
      console.error('Notification send error:', error);
      return {
        success: false,
        message: 'Failed to send notification',
        deliveryResults: [],
      };
    }
  }

  /**
   * Send notification through specific channel
   */
  private async sendThroughChannel(
    request: NotificationRequest,
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): Promise<{
    channel: NotificationChannel;
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      switch (channel) {
        case 'EMAIL':
          return await this.sendEmailNotification(request, preferences);
        case 'SMS':
          return await this.sendSMSNotification(request, preferences);
        case 'IN_APP':
          return await this.sendInAppNotification(request);
        case 'PUSH':
          return await this.sendPushNotification(request, preferences);
        default:
          return {
            channel,
            success: false,
            error: 'Unsupported notification channel',
          };
      }
    } catch (error) {
      return {
        channel,
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    request: NotificationRequest,
    preferences: NotificationPreferences
  ): Promise<{
    channel: NotificationChannel;
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!user?.email) {
        return {
          channel: 'EMAIL',
          success: false,
          error: 'User email not found',
        };
      }

      const template = await this.getNotificationTemplate(
        request.type,
        'EMAIL',
        preferences.language
      );
      const processedContent = this.processTemplate(template, request.templateVariables || {});

      const success = await EmailService.sendEmail(
        {
          to: user.email,
          subject: processedContent.subject || request.title,
          html: processedContent.body,
          text: request.message,
          priority: this.mapPriorityToEmail(request.priority),
        },
        request.userId
      );

      return {
        channel: 'EMAIL',
        success,
        messageId: success ? `email_${Date.now()}` : undefined,
      };
    } catch (error) {
      return {
        channel: 'EMAIL',
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    request: NotificationRequest,
    preferences: NotificationPreferences
  ): Promise<{
    channel: NotificationChannel;
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { phoneNumber: true, isPhoneVerified: true },
      });

      if (!user?.phoneNumber || !user.isPhoneVerified) {
        return {
          channel: 'SMS',
          success: false,
          error: 'User phone number not found or not verified',
        };
      }

      const template = await this.getNotificationTemplate(
        request.type,
        'SMS',
        preferences.language
      );
      const processedContent = this.processTemplate(template, request.templateVariables || {});

      const messageId = await this.sendSMS(
        user.phoneNumber,
        processedContent.body || request.message
      );

      return {
        channel: 'SMS',
        success: !!messageId,
        messageId,
      };
    } catch (error) {
      return {
        channel: 'SMS',
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    request: NotificationRequest
  ): Promise<{
    channel: NotificationChannel;
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const notificationId = await this.createInAppNotification(request);
      return {
        channel: 'IN_APP',
        success: !!notificationId,
        messageId: notificationId,
      };
    } catch (error) {
      return {
        channel: 'IN_APP',
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send push notification (stub)
   */
  private async sendPushNotification(
    request: NotificationRequest,
    preferences: NotificationPreferences
  ): Promise<{
    channel: NotificationChannel;
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    // Stub implementation - would integrate with Firebase Cloud Messaging, Apple Push Notification service, etc.
    return {
      channel: 'PUSH',
      success: true, // Mock success
      messageId: `push_${Date.now()}`,
    };
  }

  /**
   * Send SMS through configured provider
   */
  private async sendSMS(phoneNumber: string, message: string): Promise<string | null> {
    if (this.smsConfig.provider === 'mock') {
      // Mock SMS sending
      console.log(`Mock SMS to ${phoneNumber}: ${message}`);
      return `mock_sms_${Date.now()}`;
    }

    if (this.smsConfig.provider === 'twilio') {
      // Twilio integration (stub)
      // const twilio = require('twilio')(this.smsConfig.accountSid, this.smsConfig.authToken);
      // const result = await twilio.messages.create({
      //   body: message,
      //   from: this.smsConfig.fromNumber,
      //   to: phoneNumber
      // });
      // return result.sid;

      // Mock for now
      return `twilio_${Date.now()}`;
    }

    throw new Error(`Unsupported SMS provider: ${this.smsConfig.provider}`);
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(request: NotificationRequest): Promise<string> {
    // This would create a record in a notifications table
    // For now, simulate with a mock ID
    const notificationId = `in_app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In production, this would be:
    // await prisma.notification.create({
    //   data: {
    //     userId: request.userId,
    //     type: request.type,
    //     title: request.title,
    //     message: request.message,
    //     data: request.data ? JSON.stringify(request.data) : null,
    //     expiresAt: request.expiresAt
    //   }
    // });

    return notificationId;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // In production, this would query a user preferences table
    // For now, return default preferences
    return {
      userId,
      emailEnabled: true,
      smsEnabled: true,
      inAppEnabled: true,
      pushEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      enabledTypes: [
        'RESERVATION_CONFIRMED',
        'RESERVATION_REMINDER',
        'PAYMENT_SUCCESSFUL',
        'SPOT_AVAILABLE',
        'OVERTIME_WARNING',
        'SECURITY_ALERT',
      ],
      frequency: 'IMMEDIATE',
      language: 'en',
    };
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      // In production, this would update the user preferences table
      console.log(`Updating notification preferences for user ${userId}:`, preferences);

      await this.auditService.logSecurityEvent({
        userId,
        action: 'NOTIFICATION_PREFERENCES_UPDATED',
        category: 'ACCOUNT',
        severity: 'LOW',
        description: 'User updated notification preferences',
        metadata: { preferences },
      });

      return true;
    } catch (error) {
      console.error('Update preferences error:', error);
      return false;
    }
  }

  /**
   * Get notification template
   */
  private async getNotificationTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    language = 'en'
  ): Promise<NotificationTemplate> {
    // Mock templates - in production, these would be stored in database
    const mockTemplates: Record<string, NotificationTemplate> = {
      [`${type}_${channel}_${language}`]: {
        id: `template_${type}_${channel}`,
        type,
        channel,
        language,
        subject: this.getDefaultSubject(type),
        title: this.getDefaultTitle(type),
        body: this.getDefaultBody(type, channel),
        variables: ['userName', 'spotNumber', 'amount', 'time'],
        isActive: true,
        version: 1,
      },
    };

    const templateKey = `${type}_${channel}_${language}`;
    return mockTemplates[templateKey] || this.getDefaultTemplate(type, channel, language);
  }

  /**
   * Process template with variables
   */
  private processTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>
  ): { subject?: string; body: string } {
    let processedSubject = template.subject;
    let processedBody = template.body;

    // Replace template variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\\\s*${key}\\\\s*}}`, 'g');
      if (processedSubject) {
        processedSubject = processedSubject.replace(regex, String(value));
      }
      processedBody = processedBody.replace(regex, String(value));
    }

    return {
      subject: processedSubject,
      body: processedBody,
    };
  }

  /**
   * Filter channels based on user preferences
   */
  private filterChannelsByPreferences(
    requestedChannels: NotificationChannel[],
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    return requestedChannels.filter(channel => {
      switch (channel) {
        case 'EMAIL':
          return preferences.emailEnabled;
        case 'SMS':
          return preferences.smsEnabled;
        case 'IN_APP':
          return preferences.inAppEnabled;
        case 'PUSH':
          return preferences.pushEnabled;
        default:
          return false;
      }
    });
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return currentTime >= preferences.quietHoursStart || currentTime <= preferences.quietHoursEnd;
  }

  /**
   * Get next allowed time after quiet hours
   */
  private getNextAllowedTime(preferences: NotificationPreferences): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (preferences.quietHoursEnd) {
      const [hours, minutes] = preferences.quietHoursEnd.split(':').map(Number);
      tomorrow.setHours(hours, minutes, 0, 0);
    }

    return tomorrow;
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(request: NotificationRequest): Promise<NotificationResult> {
    // In production, this would store in a scheduled notifications table
    console.log(`Scheduling notification for ${request.scheduledFor}:`, request);

    return {
      success: true,
      message: `Notification scheduled for ${request.scheduledFor?.toISOString()}`,
      deliveryResults: [],
    };
  }

  /**
   * Get user's in-app notifications
   */
  async getInAppNotifications(userId: string, unreadOnly = false): Promise<InAppNotification[]> {
    // Mock implementation - in production, would query notifications table
    return [];
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    // In production, would update notification record
    console.log(`Marking notification ${notificationId} as read for user ${userId}`);
    return true;
  }

  /**
   * Initialize SMS configuration
   */
  private initializeSMSConfig(): SMSConfig {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      return {
        provider: 'twilio',
        accountSid: env.TWILIO_ACCOUNT_SID,
        authToken: env.TWILIO_AUTH_TOKEN,
        fromNumber: env.TWILIO_PHONE_NUMBER || '+1234567890',
      };
    }

    return {
      provider: 'mock',
      fromNumber: '+1234567890',
    };
  }

  /**
   * Start queue processor for notifications
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.processing || this.notificationQueue.length === 0) {
        return;
      }

      this.processing = true;
      try {
        const batch = this.notificationQueue.splice(0, 10); // Process 10 at a time
        await Promise.all(batch.map(notification => this.sendNotification(notification)));
      } catch (error) {
        console.error('Notification queue processing error:', error);
      } finally {
        this.processing = false;
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Start scheduled notification processor
   */
  private startScheduledNotificationProcessor(): void {
    setInterval(async () => {
      // In production, this would query scheduled notifications table
      // and send notifications that are due
      console.log('Processing scheduled notifications...');
    }, 60000); // Check every minute
  }

  /**
   * Helper methods for default templates
   */
  private getDefaultSubject(type: NotificationType): string {
    const subjects = {
      RESERVATION_CONFIRMED: 'Parking Reservation Confirmed',
      RESERVATION_REMINDER: 'Parking Reservation Reminder',
      RESERVATION_CANCELLED: 'Parking Reservation Cancelled',
      PAYMENT_SUCCESSFUL: 'Payment Successful',
      PAYMENT_FAILED: 'Payment Failed',
      SPOT_AVAILABLE: 'Parking Spot Available',
      OVERTIME_WARNING: 'Overtime Parking Warning',
      CHECKOUT_REMINDER: 'Checkout Reminder',
      SECURITY_ALERT: 'Security Alert',
      MAINTENANCE_NOTICE: 'Maintenance Notice',
      PROMOTION_OFFER: 'Special Offer',
    };
    return subjects[type] || 'Notification';
  }

  private getDefaultTitle(type: NotificationType): string {
    return this.getDefaultSubject(type);
  }

  private getDefaultBody(type: NotificationType, channel: NotificationChannel): string {
    const isShort = channel === 'SMS' || channel === 'PUSH';

    const bodies = {
      RESERVATION_CONFIRMED: isShort
        ? 'Your parking reservation for spot {{spotNumber}} is confirmed.'
        : 'Your parking reservation has been confirmed for spot {{spotNumber}} at {{time}}.',
      PAYMENT_SUCCESSFUL: isShort
        ? 'Payment of ${{amount}} processed successfully.'
        : 'Your payment of ${{amount}} has been processed successfully. Thank you!',
    };

    return bodies[type as keyof typeof bodies] || 'You have a new notification.';
  }

  private getDefaultTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    language: string
  ): NotificationTemplate {
    return {
      id: `default_${type}_${channel}`,
      type,
      channel,
      language,
      subject: this.getDefaultSubject(type),
      title: this.getDefaultTitle(type),
      body: this.getDefaultBody(type, channel),
      variables: ['userName', 'spotNumber', 'amount', 'time'],
      isActive: true,
      version: 1,
    };
  }

  private mapPriorityToEmail(priority: string): 'high' | 'normal' | 'low' {
    switch (priority) {
      case 'URGENT':
      case 'HIGH':
        return 'high';
      case 'LOW':
        return 'low';
      default:
        return 'normal';
    }
  }
}

export default new NotificationService();
export { NotificationService };
