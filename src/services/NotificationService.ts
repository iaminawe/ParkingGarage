/**
 * NotificationService - Comprehensive notification system with email, SMS,
 * in-app notifications, templates, and user preferences
 */

import { prisma } from '../config/database';
import EmailService from './EmailService';
import { SecurityAuditService } from './SecurityAuditService';
import { env } from '../config/environment';

import type { 
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationStatus as PrismaNotificationStatus,
  NotificationPriority as PrismaNotificationPriority,
  NotificationFrequency as PrismaNotificationFrequency
} from '@prisma/client';

export type NotificationType = PrismaNotificationType;
export type NotificationChannel = PrismaNotificationChannel;

export interface NotificationRequest {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  priority: PrismaNotificationPriority;
  subject: string;
  content: string;
  metadata?: Record<string, any>;
  scheduleAt?: Date;
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
  channels: {
    [key in NotificationChannel]: {
      enabled: boolean;
      frequency: PrismaNotificationFrequency;
    };
  };
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string;
  timezone: string;
  categories?: NotificationType[];
  doNotDisturbUntil?: Date;
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
  channel: NotificationChannel;
  status: PrismaNotificationStatus;
  priority: PrismaNotificationPriority;
  subject: string;
  content: string;
  metadata?: Record<string, any>;
  readAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
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
        // Check if any channel is set to immediate frequency
        const hasImmediateChannel = Object.values(preferences.channels).some(
          channel => channel.frequency === 'IMMEDIATE'
        );
        
        if (hasImmediateChannel) {
          const scheduledTime = this.getNextAllowedTime(preferences);
          return await this.scheduleNotification({ ...request, scheduleAt: scheduledTime });
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
        'en' // Default to English for now
      );
      const processedContent = this.processTemplate(template, request.templateVariables || {});

      const success = await EmailService.sendEmail(
        {
          to: user.email,
          subject: processedContent.subject || request.subject,
          html: processedContent.body,
          text: request.content,
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
        'en' // Default to English for now
      );
      const processedContent = this.processTemplate(template, request.templateVariables || {});

      const messageId = await this.sendSMS(
        user.phoneNumber,
        processedContent.body || request.content
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
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: request.userId,
          type: request.type,
          channel: 'IN_APP',
          status: 'SENT',
          priority: request.priority,
          subject: request.subject,
          content: request.content,
          metadata: request.metadata ? JSON.stringify(request.metadata) : null,
          scheduleAt: request.scheduleAt,
          expiresAt: request.expiresAt,
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      });

      // Create log entry
      await prisma.notificationLog.create({
        data: {
          notificationId: notification.id,
          status: 'SENT',
          details: JSON.stringify({ channel: 'IN_APP', action: 'created' }),
        },
      });

      return notification.id;
    } catch (error) {
      console.error('Failed to create in-app notification:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const preferences = await prisma.notificationPreference.findMany({
        where: { userId },
      });

      // Create default preferences if none exist
      if (preferences.length === 0) {
        const defaultChannels: NotificationChannel[] = ['EMAIL', 'SMS', 'IN_APP', 'PUSH'];
        
        await prisma.$transaction(
          defaultChannels.map(channel => 
            prisma.notificationPreference.create({
              data: {
                userId,
                channel,
                enabled: true,
                frequency: 'IMMEDIATE',
                timezone: 'UTC',
              },
            })
          )
        );

        // Return default preferences
        return {
          userId,
          channels: {
            EMAIL: { enabled: true, frequency: 'IMMEDIATE' },
            SMS: { enabled: true, frequency: 'IMMEDIATE' },
            IN_APP: { enabled: true, frequency: 'IMMEDIATE' },
            PUSH: { enabled: true, frequency: 'IMMEDIATE' },
          },
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          timezone: 'UTC',
        };
      }

      // Convert database preferences to interface
      const channelPrefs = preferences.reduce((acc, pref) => {
        acc[pref.channel] = {
          enabled: pref.enabled,
          frequency: pref.frequency,
        };
        return acc;
      }, {} as NotificationPreferences['channels']);

      const firstPref = preferences[0];
      return {
        userId,
        channels: channelPrefs,
        quietHoursStart: firstPref.quietHoursStart || undefined,
        quietHoursEnd: firstPref.quietHoursEnd || undefined,
        timezone: firstPref.timezone,
        categories: firstPref.categories ? JSON.parse(firstPref.categories) : undefined,
        doNotDisturbUntil: firstPref.doNotDisturbUntil || undefined,
      };
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      // Return default preferences on error
      return {
        userId,
        channels: {
          EMAIL: { enabled: true, frequency: 'IMMEDIATE' },
          SMS: { enabled: true, frequency: 'IMMEDIATE' },
          IN_APP: { enabled: true, frequency: 'IMMEDIATE' },
          PUSH: { enabled: true, frequency: 'IMMEDIATE' },
        },
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
      };
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      const updates: any[] = [];

      // Update channel preferences
      if (preferences.channels) {
        for (const [channel, settings] of Object.entries(preferences.channels)) {
          updates.push(
            prisma.notificationPreference.upsert({
              where: {
                userId_channel: { userId, channel: channel as NotificationChannel },
              },
              create: {
                userId,
                channel: channel as NotificationChannel,
                enabled: settings.enabled,
                frequency: settings.frequency,
                quietHoursStart: preferences.quietHoursStart,
                quietHoursEnd: preferences.quietHoursEnd,
                timezone: preferences.timezone || 'UTC',
                categories: preferences.categories ? JSON.stringify(preferences.categories) : null,
                doNotDisturbUntil: preferences.doNotDisturbUntil,
              },
              update: {
                enabled: settings.enabled,
                frequency: settings.frequency,
                quietHoursStart: preferences.quietHoursStart,
                quietHoursEnd: preferences.quietHoursEnd,
                timezone: preferences.timezone || 'UTC',
                categories: preferences.categories ? JSON.stringify(preferences.categories) : null,
                doNotDisturbUntil: preferences.doNotDisturbUntil,
              },
            })
          );
        }
      }

      // Update global settings for all channels if no specific channel updates
      if (!preferences.channels && (preferences.quietHoursStart || preferences.quietHoursEnd || preferences.timezone)) {
        updates.push(
          prisma.notificationPreference.updateMany({
            where: { userId },
            data: {
              quietHoursStart: preferences.quietHoursStart,
              quietHoursEnd: preferences.quietHoursEnd,
              timezone: preferences.timezone,
              categories: preferences.categories ? JSON.stringify(preferences.categories) : undefined,
              doNotDisturbUntil: preferences.doNotDisturbUntil,
            },
          })
        );
      }

      await prisma.$transaction(updates);

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
    try {
      // Try to find existing template
      const template = await prisma.notificationTemplate.findFirst({
        where: {
          type,
          channel,
          language,
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });

      if (template) {
        return {
          id: template.id,
          type: template.type,
          channel: template.channel,
          language: template.language,
          subject: template.subject,
          title: template.subject, // Use subject as title for consistency
          body: template.body,
          variables: template.variables ? JSON.parse(template.variables) : [],
          isActive: template.isActive,
          version: template.version,
        };
      }

      // Create default template if none exists
      const defaultTemplate = this.getDefaultTemplate(type, channel, language);
      
      const createdTemplate = await prisma.notificationTemplate.create({
        data: {
          name: `${type}_${channel}_${language}`,
          type,
          channel,
          subject: defaultTemplate.subject || defaultTemplate.title,
          body: defaultTemplate.body,
          variables: JSON.stringify(defaultTemplate.variables),
          isActive: true,
          language,
          version: 1,
          description: `Auto-generated template for ${type} notifications via ${channel}`,
        },
      });

      return {
        ...defaultTemplate,
        id: createdTemplate.id,
      };
    } catch (error) {
      console.error('Failed to get notification template:', error);
      return this.getDefaultTemplate(type, channel, language);
    }
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
      const channelSettings = preferences.channels[channel];
      return channelSettings?.enabled ?? false;
    });
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    // Get current time in user's timezone
    const now = new Date();
    const userTime = new Date(now.toLocaleString("en-US", { timeZone: preferences.timezone }));
    const currentTime = `${userTime.getHours().toString().padStart(2, '0')}:${userTime.getMinutes().toString().padStart(2, '0')}`;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (preferences.quietHoursStart > preferences.quietHoursEnd) {
      return currentTime >= preferences.quietHoursStart || currentTime <= preferences.quietHoursEnd;
    }
    
    // Handle same-day quiet hours (e.g., 12:00 to 14:00)
    return currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd;
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
    try {
      const scheduledNotifications = await Promise.all(
        request.channels.map(async (channel) => {
          const notification = await prisma.notification.create({
            data: {
              userId: request.userId,
              type: request.type,
              channel,
              status: 'PENDING',
              priority: request.priority,
              subject: request.subject,
              content: request.content,
              metadata: request.metadata ? JSON.stringify(request.metadata) : null,
              scheduleAt: request.scheduleAt,
              expiresAt: request.expiresAt,
            },
          });

          // Create log entry
          await prisma.notificationLog.create({
            data: {
              notificationId: notification.id,
              status: 'PENDING',
              details: JSON.stringify({ 
                channel,
                action: 'scheduled',
                scheduleAt: request.scheduleAt?.toISOString(),
              }),
            },
          });

          return notification.id;
        })
      );

      return {
        success: true,
        notificationId: scheduledNotifications[0], // Return first notification ID
        message: `${scheduledNotifications.length} notifications scheduled for ${request.scheduleAt?.toISOString()}`,
        deliveryResults: [],
      };
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return {
        success: false,
        message: 'Failed to schedule notification',
        deliveryResults: [],
      };
    }
  }

  /**
   * Get user's in-app notifications
   */
  async getInAppNotifications(userId: string, unreadOnly = false): Promise<InAppNotification[]> {
    try {
      const whereClause: any = {
        userId,
        channel: 'IN_APP',
        ...(unreadOnly && { readAt: null }),
      };

      const notifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50, // Limit to last 50 notifications
      });

      return notifications.map(notification => ({
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        channel: notification.channel,
        status: notification.status,
        priority: notification.priority,
        subject: notification.subject,
        content: notification.content,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : undefined,
        readAt: notification.readAt,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        createdAt: notification.createdAt,
        expiresAt: notification.expiresAt,
      }));
    } catch (error) {
      console.error('Failed to get in-app notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const updatedNotification = await prisma.notification.update({
        where: { 
          id: notificationId,
          userId, // Ensure user can only mark their own notifications as read
        },
        data: {
          readAt: new Date(),
          status: 'READ',
        },
      });

      // Create log entry
      await prisma.notificationLog.create({
        data: {
          notificationId: notificationId,
          status: 'READ',
          details: JSON.stringify({ 
            action: 'marked_as_read',
            readAt: updatedNotification.readAt?.toISOString(),
          }),
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
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
      try {
        // Query scheduled notifications that are due
        const dueNotifications = await prisma.notification.findMany({
          where: {
            status: 'PENDING',
            scheduleAt: {
              lte: new Date(),
            },
          },
          take: 50, // Process 50 at a time
        });

        if (dueNotifications.length === 0) {
          return;
        }

        console.log(`Processing ${dueNotifications.length} scheduled notifications...`);

        // Process each scheduled notification
        for (const notification of dueNotifications) {
          try {
            // Convert database notification back to NotificationRequest
            const request: NotificationRequest = {
              userId: notification.userId,
              type: notification.type,
              channels: [notification.channel],
              priority: notification.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
              title: notification.subject,
              message: notification.content,
              data: notification.metadata ? JSON.parse(notification.metadata) : undefined,
            };

            // Send the notification
            const result = await this.sendNotification(request);

            // Update notification status
            await prisma.notification.update({
              where: { id: notification.id },
              data: {
                status: result.success ? 'SENT' : 'FAILED',
                sentAt: result.success ? new Date() : undefined,
                errorMessage: result.success ? undefined : result.message,
              },
            });

            // Log the processing
            await prisma.notificationLog.create({
              data: {
                notificationId: notification.id,
                status: result.success ? 'SENT' : 'FAILED',
                details: JSON.stringify({
                  action: 'scheduled_processing',
                  result: result.message,
                }),
                error: result.success ? undefined : result.message,
              },
            });
          } catch (error) {
            console.error(`Failed to process scheduled notification ${notification.id}:`, error);

            // Mark as failed
            await prisma.notification.update({
              where: { id: notification.id },
              data: {
                status: 'FAILED',
                errorMessage: (error as Error).message,
              },
            });

            // Log the error
            await prisma.notificationLog.create({
              data: {
                notificationId: notification.id,
                status: 'FAILED',
                details: JSON.stringify({ action: 'scheduled_processing_error' }),
                error: (error as Error).message,
              },
            });
          }
        }
      } catch (error) {
        console.error('Scheduled notification processing error:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Helper methods for default templates
   */
  private getDefaultSubject(type: NotificationType): string {
    const subjects: Record<NotificationType, string> = {
      PARKING_SESSION_STARTED: 'Parking Session Started',
      PARKING_SESSION_ENDED: 'Parking Session Ended',
      PAYMENT_CONFIRMATION: 'Payment Confirmed',
      PAYMENT_FAILED: 'Payment Failed',
      ACCOUNT_CREATED: 'Welcome! Account Created',
      EMAIL_VERIFICATION: 'Verify Your Email Address',
      PASSWORD_RESET: 'Password Reset Request',
      LOGIN_SECURITY_ALERT: 'Security Alert - New Login',
      SPOT_AVAILABILITY: 'Parking Spot Available',
      RESERVATION_REMINDER: 'Parking Reservation Reminder',
      MAINTENANCE_ALERT: 'Maintenance Notice',
      SYSTEM_ANNOUNCEMENT: 'System Announcement',
      BILLING_REMINDER: 'Billing Reminder',
      SUBSCRIPTION_EXPIRY: 'Subscription Expiring Soon',
    };
    return subjects[type] || 'Notification';
  }

  private getDefaultTitle(type: NotificationType): string {
    return this.getDefaultSubject(type);
  }

  private getDefaultBody(type: NotificationType, channel: NotificationChannel): string {
    const isShort = channel === 'SMS' || channel === 'PUSH';

    const bodies: Record<NotificationType, string> = {
      PARKING_SESSION_STARTED: isShort
        ? 'Parking session started at spot {{spotNumber}}.'
        : 'Your parking session has started at spot {{spotNumber}} on {{time}}. Remember to pay before leaving!',
      PARKING_SESSION_ENDED: isShort
        ? 'Parking session ended. Total: ${{amount}}.'
        : 'Your parking session has ended. Total amount: ${{amount}}. Thank you for using our service!',
      PAYMENT_CONFIRMATION: isShort
        ? 'Payment of ${{amount}} confirmed.'
        : 'Your payment of ${{amount}} has been confirmed. Receipt has been sent to your email.',
      PAYMENT_FAILED: isShort
        ? 'Payment of ${{amount}} failed. Please try again.'
        : 'Your payment of ${{amount}} could not be processed. Please update your payment method and try again.',
      ACCOUNT_CREATED: isShort
        ? 'Welcome {{userName}}! Your account has been created.'
        : 'Welcome {{userName}}! Your parking account has been successfully created. You can now make reservations and manage your parking sessions.',
      EMAIL_VERIFICATION: isShort
        ? 'Please verify your email address.'
        : 'Hi {{userName}}, please verify your email address by clicking the verification link sent to your inbox.',
      PASSWORD_RESET: isShort
        ? 'Password reset requested. Check your email.'
        : 'A password reset has been requested for your account. Check your email for instructions.',
      LOGIN_SECURITY_ALERT: isShort
        ? 'New login detected from {{location}}.'
        : 'We detected a new login to your account from {{location}} at {{time}}. If this wasn\'t you, please secure your account immediately.',
      SPOT_AVAILABILITY: isShort
        ? 'Parking spot {{spotNumber}} is now available.'
        : 'Good news! Parking spot {{spotNumber}} is now available for reservation. Reserve now to guarantee your spot.',
      RESERVATION_REMINDER: isShort
        ? 'Reservation reminder: {{time}} at spot {{spotNumber}}.'
        : 'Reminder: You have a parking reservation today at {{time}} for spot {{spotNumber}}. See you there!',
      MAINTENANCE_ALERT: isShort
        ? 'Maintenance scheduled for {{time}}.'
        : 'Scheduled maintenance will take place on {{time}}. Some areas may be temporarily unavailable.',
      SYSTEM_ANNOUNCEMENT: isShort
        ? 'System announcement: {{message}}'
        : 'Important announcement: {{message}}. Thank you for your attention.',
      BILLING_REMINDER: isShort
        ? 'Bill of ${{amount}} due on {{dueDate}}.'
        : 'Your bill of ${{amount}} is due on {{dueDate}}. Please make payment to avoid late fees.',
      SUBSCRIPTION_EXPIRY: isShort
        ? 'Your subscription expires on {{expiryDate}}.'
        : 'Your subscription will expire on {{expiryDate}}. Renew now to continue enjoying premium features.',
    };

    return bodies[type] || 'You have a new notification.';
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
