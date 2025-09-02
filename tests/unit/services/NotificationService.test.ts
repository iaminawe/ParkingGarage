import { NotificationService, NotificationType, NotificationChannel } from '@/services/NotificationService';
import { testDb } from '@tests/helpers/test-database';
import { TestDataFactory } from '@tests/helpers/test-factories';
import { TestUtils } from '@tests/helpers/test-utils';

// Mock dependencies
jest.mock('@/services/SecurityAuditService');
jest.mock('@/services/EmailService');

const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue(true)
};

jest.doMock('@/services/EmailService', () => ({
  default: mockEmailService
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let testUser: any;

  beforeAll(async () => {
    await testDb.setupDatabase();
  });

  afterAll(async () => {
    await testDb.teardownDatabase();
  });

  beforeEach(async () => {
    await testDb.setupDatabase();
    
    // Mock intervals to prevent actual timers
    jest.spyOn(global, 'setInterval').mockImplementation(jest.fn());
    
    notificationService = new NotificationService();
    testUser = await testDb.createTestUser({
      email: 'test@example.com',
      phoneNumber: '+1234567890',
      isPhoneVerified: true
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Single Channel Notifications', () => {
    it('should send email notification successfully', async () => {
      const request = {
        userId: testUser.id,
        type: 'PAYMENT_SUCCESSFUL' as NotificationType,
        channels: ['EMAIL' as NotificationChannel],
        priority: 'MEDIUM' as const,
        title: 'Payment Successful',
        message: 'Your payment has been processed',
        templateVariables: {
          userName: 'Test User',
          amount: '25.50'
        }
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
      expect(result.deliveryResults).toHaveLength(1);
      expect(result.deliveryResults[0].channel).toBe('EMAIL');
      expect(result.deliveryResults[0].success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testUser.email,
          subject: expect.any(String),
          html: expect.any(String),
          text: request.message
        }),
        testUser.id
      );
    });

    it('should send SMS notification successfully', async () => {
      const request = {
        userId: testUser.id,
        type: 'RESERVATION_CONFIRMED' as NotificationType,
        channels: ['SMS' as NotificationChannel],
        priority: 'HIGH' as const,
        title: 'Reservation Confirmed',
        message: 'Your parking spot is reserved',
        templateVariables: {
          spotNumber: 'A123'
        }
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
      expect(result.deliveryResults).toHaveLength(1);
      expect(result.deliveryResults[0].channel).toBe('SMS');
      expect(result.deliveryResults[0].success).toBe(true);
      expect(result.deliveryResults[0].messageId).toMatch(/mock_sms_\d+/);
    });

    it('should send in-app notification successfully', async () => {
      const request = {
        userId: testUser.id,
        type: 'SPOT_AVAILABLE' as NotificationType,
        channels: ['IN_APP' as NotificationChannel],
        priority: 'LOW' as const,
        title: 'Spot Available',
        message: 'A parking spot matching your preferences is now available',
        data: {
          spotId: 'spot-123',
          spotNumber: 'A123'
        }
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
      expect(result.deliveryResults).toHaveLength(1);
      expect(result.deliveryResults[0].channel).toBe('IN_APP');
      expect(result.deliveryResults[0].success).toBe(true);
    });

    it('should send push notification successfully', async () => {
      const request = {
        userId: testUser.id,
        type: 'OVERTIME_WARNING' as NotificationType,
        channels: ['PUSH' as NotificationChannel],
        priority: 'URGENT' as const,
        title: 'Overtime Warning',
        message: 'Your parking session is about to expire'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
      expect(result.deliveryResults).toHaveLength(1);
      expect(result.deliveryResults[0].channel).toBe('PUSH');
      expect(result.deliveryResults[0].success).toBe(true);
      expect(result.deliveryResults[0].messageId).toMatch(/push_\d+/);
    });
  });

  describe('Multi-Channel Notifications', () => {
    it('should send notification through multiple channels', async () => {
      const request = {
        userId: testUser.id,
        type: 'SECURITY_ALERT' as NotificationType,
        channels: ['EMAIL', 'SMS', 'IN_APP', 'PUSH'] as NotificationChannel[],
        priority: 'URGENT' as const,
        title: 'Security Alert',
        message: 'Suspicious activity detected on your account'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
      expect(result.deliveryResults).toHaveLength(4);
      
      const channelResults = result.deliveryResults.reduce((acc, r) => {
        acc[r.channel] = r.success;
        return acc;
      }, {} as Record<string, boolean>);

      expect(channelResults.EMAIL).toBe(true);
      expect(channelResults.SMS).toBe(true);
      expect(channelResults.IN_APP).toBe(true);
      expect(channelResults.PUSH).toBe(true);
    });

    it('should succeed if at least one channel works', async () => {
      // Mock email failure
      mockEmailService.sendEmail.mockResolvedValueOnce(false);

      const request = {
        userId: testUser.id,
        type: 'PAYMENT_FAILED' as NotificationType,
        channels: ['EMAIL', 'SMS'] as NotificationChannel[],
        priority: 'HIGH' as const,
        title: 'Payment Failed',
        message: 'Your payment could not be processed'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true); // Should still succeed because SMS works
      expect(result.deliveryResults).toHaveLength(2);
      expect(result.deliveryResults[0].success).toBe(false); // Email failed
      expect(result.deliveryResults[1].success).toBe(true);  // SMS succeeded
    });

    it('should fail if all channels fail', async () => {
      // Create user without email or phone
      const userWithoutContact = await testDb.createTestUser({
        email: null,
        phoneNumber: null
      });

      const request = {
        userId: userWithoutContact.id,
        type: 'RESERVATION_REMINDER' as NotificationType,
        channels: ['EMAIL', 'SMS'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Reservation Reminder',
        message: 'Your reservation starts in 30 minutes'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to send notification through any channel');
    });
  });

  describe('User Preferences', () => {
    it('should get default user preferences', async () => {
      const preferences = await notificationService.getUserPreferences(testUser.id);

      expect(preferences).toMatchObject({
        userId: testUser.id,
        emailEnabled: true,
        smsEnabled: true,
        inAppEnabled: true,
        pushEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        enabledTypes: expect.arrayContaining([
          'RESERVATION_CONFIRMED',
          'PAYMENT_SUCCESSFUL',
          'SPOT_AVAILABLE'
        ]),
        frequency: 'IMMEDIATE',
        language: 'en'
      });
    });

    it('should update user preferences', async () => {
      const updates = {
        emailEnabled: false,
        smsEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00'
      };

      const success = await notificationService.updateUserPreferences(testUser.id, updates);

      expect(success).toBe(true);
    });

    it('should filter channels based on preferences', async () => {
      // Mock preferences with email disabled
      jest.spyOn(notificationService, 'getUserPreferences').mockResolvedValue({
        userId: testUser.id,
        emailEnabled: false, // Email disabled
        smsEnabled: true,
        inAppEnabled: true,
        pushEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        enabledTypes: ['PAYMENT_SUCCESSFUL'],
        frequency: 'IMMEDIATE',
        language: 'en'
      });

      const request = {
        userId: testUser.id,
        type: 'PAYMENT_SUCCESSFUL' as NotificationType,
        channels: ['EMAIL', 'SMS', 'IN_APP'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Payment Successful',
        message: 'Payment processed'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
      expect(result.deliveryResults).toHaveLength(2); // Only SMS and IN_APP
      expect(result.deliveryResults.find(r => r.channel === 'EMAIL')).toBeUndefined();
    });

    it('should respect quiet hours for non-urgent notifications', async () => {
      // Mock current time to be in quiet hours
      const mockDate = new Date();
      mockDate.setHours(23, 0, 0, 0); // 11 PM
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const request = {
        userId: testUser.id,
        type: 'PROMOTION_OFFER' as NotificationType,
        channels: ['EMAIL'] as NotificationChannel[],
        priority: 'LOW' as const,
        title: 'Special Offer',
        message: 'Check out our latest promotions'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('digest queue');

      // Restore Date
      jest.restoreAllMocks();
    });

    it('should bypass quiet hours for urgent notifications', async () => {
      // Mock current time to be in quiet hours
      const mockDate = new Date();
      mockDate.setHours(2, 0, 0, 0); // 2 AM
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const request = {
        userId: testUser.id,
        type: 'SECURITY_ALERT' as NotificationType,
        channels: ['EMAIL', 'SMS'] as NotificationChannel[],
        priority: 'URGENT' as const,
        title: 'Security Alert',
        message: 'Unauthorized access attempt'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
      expect(result.deliveryResults.length).toBeGreaterThan(0);

      // Restore Date
      jest.restoreAllMocks();
    });

    it('should return failure when all channels disabled', async () => {
      // Mock preferences with all channels disabled
      jest.spyOn(notificationService, 'getUserPreferences').mockResolvedValue({
        userId: testUser.id,
        emailEnabled: false,
        smsEnabled: false,
        inAppEnabled: false,
        pushEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        enabledTypes: [],
        frequency: 'IMMEDIATE',
        language: 'en'
      });

      const request = {
        userId: testUser.id,
        type: 'PAYMENT_SUCCESSFUL' as NotificationType,
        channels: ['EMAIL', 'SMS'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Payment Successful',
        message: 'Payment processed'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('All notification channels disabled');
    });
  });

  describe('Template Processing', () => {
    it('should process template variables correctly', async () => {
      const request = {
        userId: testUser.id,
        type: 'RESERVATION_CONFIRMED' as NotificationType,
        channels: ['EMAIL'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Reservation Confirmed',
        message: 'Your reservation is confirmed',
        templateVariables: {
          userName: 'John Doe',
          spotNumber: 'A123',
          amount: '15.50',
          time: '2:00 PM'
        }
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('A123'), // Should contain processed spotNumber
          subject: expect.any(String)
        }),
        testUser.id
      );
    });

    it('should handle missing template variables gracefully', async () => {
      const request = {
        userId: testUser.id,
        type: 'PAYMENT_SUCCESSFUL' as NotificationType,
        channels: ['EMAIL'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Payment Successful',
        message: 'Payment processed',
        templateVariables: {
          // Missing some expected variables
          userName: 'John Doe'
          // amount is missing
        }
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
      // Should not throw error even with missing variables
    });

    it('should use different templates for different channels', async () => {
      const request = {
        userId: testUser.id,
        type: 'OVERTIME_WARNING' as NotificationType,
        channels: ['EMAIL', 'SMS'] as NotificationChannel[],
        priority: 'HIGH' as const,
        title: 'Overtime Warning',
        message: 'Your session is expiring soon'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
      expect(result.deliveryResults).toHaveLength(2);
      
      // Both should succeed but potentially use different message formats
      result.deliveryResults.forEach(delivery => {
        expect(delivery.success).toBe(true);
      });
    });
  });

  describe('Scheduled Notifications', () => {
    it('should schedule notification for future delivery', async () => {
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + 2);

      const request = {
        userId: testUser.id,
        type: 'RESERVATION_REMINDER' as NotificationType,
        channels: ['EMAIL'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Reservation Reminder',
        message: 'Your reservation starts soon',
        scheduledFor: futureTime
      };

      const result = await notificationService.scheduleNotification(request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('scheduled for');
    });
  });

  describe('In-App Notification Management', () => {
    it('should get user in-app notifications', async () => {
      const notifications = await notificationService.getInAppNotifications(testUser.id);

      expect(Array.isArray(notifications)).toBe(true);
      // Mock implementation returns empty array
      expect(notifications).toHaveLength(0);
    });

    it('should mark notification as read', async () => {
      const success = await notificationService.markAsRead('notification-123', testUser.id);

      expect(success).toBe(true);
    });

    it('should get only unread notifications when requested', async () => {
      const notifications = await notificationService.getInAppNotifications(testUser.id, true);

      expect(Array.isArray(notifications)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle email service failure gracefully', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('SMTP server unavailable'));

      const request = {
        userId: testUser.id,
        type: 'PAYMENT_SUCCESSFUL' as NotificationType,
        channels: ['EMAIL'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Payment Successful',
        message: 'Payment processed'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(false);
      expect(result.deliveryResults[0].success).toBe(false);
      expect(result.deliveryResults[0].error).toContain('SMTP server unavailable');
    });

    it('should handle user not found error', async () => {
      const request = {
        userId: 'non-existent-user',
        type: 'PAYMENT_SUCCESSFUL' as NotificationType,
        channels: ['EMAIL'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Payment Successful',
        message: 'Payment processed'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(false);
    });

    it('should handle SMS service failure', async () => {
      // Create user without verified phone
      const userWithoutPhone = await testDb.createTestUser({
        email: 'nophone@example.com',
        phoneNumber: null,
        isPhoneVerified: false
      });

      const request = {
        userId: userWithoutPhone.id,
        type: 'SECURITY_ALERT' as NotificationType,
        channels: ['SMS'] as NotificationChannel[],
        priority: 'URGENT' as const,
        title: 'Security Alert',
        message: 'Suspicious activity detected'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(false);
      expect(result.deliveryResults[0].error).toContain('phone number not found');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalFindUnique = testDb.getPrismaClient().user.findUnique;
      jest.spyOn(testDb.getPrismaClient().user, 'findUnique')
        .mockRejectedValue(new Error('Database connection failed'));

      const request = {
        userId: testUser.id,
        type: 'PAYMENT_SUCCESSFUL' as NotificationType,
        channels: ['EMAIL'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Payment Successful',
        message: 'Payment processed'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send notification');

      // Restore original method
      testDb.getPrismaClient().user.findUnique = originalFindUnique;
    });
  });

  describe('Priority and Channel Selection', () => {
    it('should map priority correctly for email', async () => {
      const urgentRequest = {
        userId: testUser.id,
        type: 'SECURITY_ALERT' as NotificationType,
        channels: ['EMAIL'] as NotificationChannel[],
        priority: 'URGENT' as const,
        title: 'Security Alert',
        message: 'Urgent security alert'
      };

      await notificationService.sendNotification(urgentRequest);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high'
        }),
        testUser.id
      );
    });

    it('should handle unsupported notification channels', async () => {
      const request = {
        userId: testUser.id,
        type: 'PAYMENT_SUCCESSFUL' as NotificationType,
        channels: ['INVALID_CHANNEL' as any] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Payment Successful',
        message: 'Payment processed'
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(false);
    });
  });

  describe('Queue Processing', () => {
    it('should initialize queue processor on service creation', () => {
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        5000 // 5 seconds
      );
    });

    it('should initialize scheduled notification processor', () => {
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        60000 // 60 seconds
      );
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent notification requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        userId: testUser.id,
        type: 'PAYMENT_SUCCESSFUL' as NotificationType,
        channels: ['IN_APP'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: `Payment Successful ${i}`,
        message: `Payment ${i} processed successfully`
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(req => notificationService.sendNotification(req))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      // All should succeed for in-app notifications
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should maintain performance with multiple notification types', async () => {
      const notificationTypes: NotificationType[] = [
        'RESERVATION_CONFIRMED',
        'PAYMENT_SUCCESSFUL', 
        'SPOT_AVAILABLE',
        'OVERTIME_WARNING',
        'SECURITY_ALERT'
      ];

      const requests = notificationTypes.map(type => ({
        userId: testUser.id,
        type,
        channels: ['IN_APP'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: `Test ${type}`,
        message: `Test message for ${type}`
      }));

      const { duration } = await TestUtils.measureExecutionTime(async () => {
        return Promise.all(requests.map(req => notificationService.sendNotification(req)));
      });

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Template System Edge Cases', () => {
    it('should handle empty template variables', async () => {
      const request = {
        userId: testUser.id,
        type: 'PAYMENT_SUCCESSFUL' as NotificationType,
        channels: ['EMAIL'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Payment Successful',
        message: 'Payment processed',
        templateVariables: {} // Empty variables
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
    });

    it('should handle special characters in template variables', async () => {
      const request = {
        userId: testUser.id,
        type: 'RESERVATION_CONFIRMED' as NotificationType,
        channels: ['EMAIL'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Reservation Confirmed',
        message: 'Reservation confirmed',
        templateVariables: {
          spotNumber: 'A-123/B',
          userName: 'O\'Connor, John',
          amount: '$25.50'
        }
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
    });

    it('should handle null and undefined template variables', async () => {
      const request = {
        userId: testUser.id,
        type: 'PAYMENT_SUCCESSFUL' as NotificationType,
        channels: ['EMAIL'] as NotificationChannel[],
        priority: 'MEDIUM' as const,
        title: 'Payment Successful',
        message: 'Payment processed',
        templateVariables: {
          userName: null,
          amount: undefined,
          validField: 'test'
        }
      };

      const result = await notificationService.sendNotification(request);

      expect(result.success).toBe(true);
    });
  });
});