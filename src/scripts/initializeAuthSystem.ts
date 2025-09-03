/**
 * Authentication system initialization script
 * Initializes email templates and security settings for production deployment
 */

import { PrismaClient, NotificationType, NotificationChannel } from '@prisma/client';
import { initializeEmailTemplates } from '../utils/emailTemplates';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function initializeSecuritySettings() {
  console.log('🔐 Initializing security settings...');

  const securitySettings = [
    {
      key: 'MAX_LOGIN_ATTEMPTS',
      value: '5',
      dataType: 'NUMBER',
      category: 'AUTH',
      description: 'Maximum number of login attempts before account lockout',
      isEditable: true,
    },
    {
      key: 'LOCKOUT_DURATION_MINUTES',
      value: '15',
      dataType: 'NUMBER',
      category: 'AUTH',
      description: 'Account lockout duration in minutes',
      isEditable: true,
    },
    {
      key: 'PASSWORD_RESET_TOKEN_EXPIRY_HOURS',
      value: '1',
      dataType: 'NUMBER',
      category: 'AUTH',
      description: 'Password reset token expiry time in hours',
      isEditable: true,
    },
    {
      key: 'SESSION_DURATION_HOURS',
      value: '24',
      dataType: 'NUMBER',
      category: 'SESSION',
      description: 'User session duration in hours',
      isEditable: true,
    },
    {
      key: 'REFRESH_TOKEN_DURATION_DAYS',
      value: '7',
      dataType: 'NUMBER',
      category: 'SESSION',
      description: 'Refresh token duration in days',
      isEditable: true,
    },
    {
      key: 'MAX_CONCURRENT_SESSIONS',
      value: '5',
      dataType: 'NUMBER',
      category: 'SESSION',
      description: 'Maximum concurrent sessions per user',
      isEditable: true,
    },
    {
      key: 'PASSWORD_MIN_LENGTH',
      value: '8',
      dataType: 'NUMBER',
      category: 'SECURITY',
      description: 'Minimum password length',
      isEditable: true,
    },
    {
      key: 'PASSWORD_MAX_LENGTH',
      value: '128',
      dataType: 'NUMBER',
      category: 'SECURITY',
      description: 'Maximum password length',
      isEditable: true,
    },
    {
      key: 'REQUIRE_PASSWORD_COMPLEXITY',
      value: 'true',
      dataType: 'BOOLEAN',
      category: 'SECURITY',
      description: 'Require complex passwords (uppercase, lowercase, numbers, special chars)',
      isEditable: true,
    },
    {
      key: 'PASSWORD_HISTORY_COUNT',
      value: '5',
      dataType: 'NUMBER',
      category: 'SECURITY',
      description: 'Number of previous passwords to check against reuse',
      isEditable: true,
    },
    {
      key: 'FORCE_PASSWORD_CHANGE_DAYS',
      value: '90',
      dataType: 'NUMBER',
      category: 'SECURITY',
      description: 'Force password change after this many days (0 to disable)',
      isEditable: true,
    },
    {
      key: 'ENABLE_AUDIT_LOGGING',
      value: 'true',
      dataType: 'BOOLEAN',
      category: 'SECURITY',
      description: 'Enable comprehensive security audit logging',
      isEditable: true,
    },
    {
      key: 'EMAIL_RATE_LIMIT_PER_HOUR',
      value: '5',
      dataType: 'NUMBER',
      category: 'EMAIL',
      description: 'Maximum emails per recipient per hour',
      isEditable: true,
    },
    {
      key: 'GLOBAL_EMAIL_RATE_LIMIT_PER_HOUR',
      value: '100',
      dataType: 'NUMBER',
      category: 'EMAIL',
      description: 'Maximum total emails per hour',
      isEditable: true,
    },
  ];

  for (const setting of securitySettings) {
    try {
      await prisma.security_settings.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          description: setting.description,
        },
        create: {
          ...setting,
          id: randomUUID(),
        },
      });
      console.log(`✓ Security setting '${setting.key}' initialized`);
    } catch (error) {
      console.error(`Failed to initialize security setting '${setting.key}':`, error);
    }
  }
}

async function initializeNotificationTemplates() {
  console.log('📧 Initializing notification templates...');

  const notificationTemplates = [
    {
      name: 'PASSWORD_CHANGED_NOTIFICATION',
      type: NotificationType.PASSWORD_CHANGED,
      channel: NotificationChannel.EMAIL,
      subject: 'Password Changed - Security Notification',
      body: `Your password has been successfully changed.
      
Details:
- Account: {{userEmail}}
- Time: {{timestamp}}

If you didn't make this change, please contact support immediately.`,
      variables: JSON.stringify({
        userEmail: 'string',
        timestamp: 'string',
        supportUrl: 'string'
      }),
      language: 'en',
      isActive: true,
    },
    {
      name: 'SUSPICIOUS_LOGIN_ALERT',
      type: NotificationType.SECURITY_ALERT,
      channel: NotificationChannel.EMAIL,
      subject: 'Suspicious Login Attempt - Security Alert',
      body: `We detected a suspicious login attempt on your account.

Details:
- IP Address: {{ipAddress}}
- Location: {{location}}
- Time: {{timestamp}}
- User Agent: {{userAgent}}

If this was you, no action is needed. Otherwise, please secure your account immediately.`,
      variables: JSON.stringify({
        ipAddress: 'string',
        location: 'string',
        timestamp: 'string',
        userAgent: 'string'
      }),
      language: 'en',
      isActive: true,
    },
    {
      name: 'ACCOUNT_LOCKED_NOTIFICATION',
      type: NotificationType.ACCOUNT_LOCKED,
      channel: NotificationChannel.EMAIL,
      subject: 'Account Temporarily Locked - Security Notice',
      body: `Your account has been temporarily locked due to multiple failed login attempts.

Details:
- Account: {{userEmail}}
- Lock Duration: {{lockDurationMinutes}} minutes
- Time: {{timestamp}}

Your account will be automatically unlocked after the specified duration, or you can reset your password to unlock it immediately.`,
      variables: JSON.stringify({
        userEmail: 'string',
        lockDurationMinutes: 'number',
        timestamp: 'string'
      }),
      language: 'en',
      isActive: true,
    },
  ];

  for (const template of notificationTemplates) {
    try {
      await prisma.notification_templates.upsert({
        where: { name: template.name },
        update: {
          subject: template.subject,
          body: template.body,
          variables: template.variables,
          isActive: template.isActive,
        },
        create: {
          ...template,
          id: randomUUID(),
        },
      });
      console.log(`✓ Notification template '${template.name}' initialized`);
    } catch (error) {
      console.error(`Failed to initialize notification template '${template.name}':`, error);
    }
  }
}

async function validateDatabaseSchema() {
  console.log('🔍 Validating database schema for authentication system...');

  try {
    // Check if required tables exist and have necessary fields
    const userCount = await prisma.users.count();
    const sessionCount = await prisma.user_sessions.count();
    const auditLogCount = await prisma.security_audit_logs.count();
    
    console.log(`✓ Database validation passed:`);
    console.log(`  - Users table: ${userCount} records`);
    console.log(`  - User sessions table: ${sessionCount} records`);
    console.log(`  - Security audit logs table: ${auditLogCount} records`);

    // Check for required indexes (this is informational)
    console.log(`✓ Database indexes should be optimized for:`);
    console.log(`  - users.email, users.passwordResetToken`);
    console.log(`  - user_sessions.token, user_sessions.userId`);
    console.log(`  - security_audit_logs.userId, security_audit_logs.createdAt`);

  } catch (error) {
    console.error('❌ Database schema validation failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Initializing Authentication System...');
  console.log('=====================================');

  try {
    // Validate database schema first
    await validateDatabaseSchema();

    // Initialize security settings
    await initializeSecuritySettings();

    // Initialize email templates
    await initializeEmailTemplates();

    // Initialize notification templates
    await initializeNotificationTemplates();

    console.log('\n✅ Authentication system initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Configure environment variables for email service');
    console.log('2. Set up monitoring for security audit logs');
    console.log('3. Test password reset and change functionality');
    console.log('4. Review and adjust security settings as needed');
    
  } catch (error) {
    console.error('\n❌ Authentication system initialization failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as initializeAuthSystem };