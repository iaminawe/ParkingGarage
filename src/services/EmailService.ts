/**
 * EmailService - Comprehensive email service with template support, SMTP configuration,
 * and security features for enterprise authentication system
 */

import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/environment';
import { SecurityAuditService } from './SecurityAuditService';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateName?: string;
  templateVariables?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables?: Record<string, any>;
  isActive: boolean;
  language: string;
  version: number;
}

export interface EmailVerificationResult {
  success: boolean;
  message: string;
  token?: string;
  expiresAt?: Date;
}

export interface EmailStats {
  sent: number;
  failed: number;
  pending: number;
  ratePerHour: number;
  lastError?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private auditService: SecurityAuditService;
  private emailQueue: EmailOptions[] = [];
  private processing = false;
  private rateLimiter = new Map<string, { count: number; resetTime: number }>();
  private readonly MAX_EMAILS_PER_HOUR = 100;
  private readonly MAX_EMAILS_PER_RECIPIENT_HOUR = 5;

  constructor() {
    this.auditService = new SecurityAuditService();
    this.initializeTransporter();
    this.startQueueProcessor();
  }

  /**
   * Initialize SMTP transporter with environment configuration
   */
  private async initializeTransporter(): Promise<void> {
    try {
      // Check if email configuration is provided
      if (!env.EMAIL_USER && !env.SENDGRID_API_KEY && env.NODE_ENV === 'development') {
        console.log('📧 Email service disabled - no email configuration provided (development mode)');
        return;
      }

      // Support multiple email providers
      const emailProvider = env.EMAIL_PROVIDER || 'smtp';

      let transportConfig: any;

      switch (emailProvider.toLowerCase()) {
        case 'gmail':
          transportConfig = {
            service: 'Gmail',
            auth: {
              user: env.EMAIL_USER,
              pass: env.EMAIL_APP_PASSWORD, // App-specific password for Gmail
            },
          };
          break;

        case 'sendgrid':
          transportConfig = {
            service: 'SendGrid',
            auth: {
              user: 'apikey',
              pass: env.SENDGRID_API_KEY,
            },
          };
          break;

        case 'smtp':
        default:
          transportConfig = {
            host: env.SMTP_HOST,
            port: parseInt(String(env.SMTP_PORT || '587')),
            secure: env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
              user: env.EMAIL_USER,
              pass: env.EMAIL_PASSWORD,
            },
            tls: {
              rejectUnauthorized: env.NODE_ENV === 'production',
            },
          };
          break;
      }

      this.transporter = nodemailer.createTransport(transportConfig);

      // Verify connection
      if (env.NODE_ENV !== 'test') {
        await this.transporter.verify();
        console.log('✅ Email service initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      if (env.NODE_ENV === 'production') {
        throw new Error('Email service initialization failed');
      }
    }
  }

  /**
   * Send email with template support and security logging
   */
  async sendEmail(options: EmailOptions, userId?: string): Promise<boolean> {
    try {
      // Check if email service is available
      if (!this.transporter) {
        if (env.NODE_ENV === 'development') {
          console.log(`📧 Email simulation (service disabled): To: ${options.to}, Subject: ${options.subject}`);
          return true; // Return success in development for testing
        } else {
          console.error('Email service not available - transporter not initialized');
          return false;
        }
      }

      // Rate limiting check
      if (!this.checkRateLimit(options.to as string)) {
        await this.auditService.logSecurityEvent({
          userId,
          action: 'EMAIL_RATE_LIMIT_EXCEEDED',
          category: 'SECURITY',
          severity: 'MEDIUM',
          description: `Email rate limit exceeded for ${options.to}`,
          metadata: { recipient: options.to },
        });
        return false;
      }

      let emailContent = options;

      // Process template if specified
      if (options.templateName) {
        emailContent = await this.processTemplate(options);
      }

      // Add to queue for processing
      this.emailQueue.push({
        ...emailContent,
        priority: options.priority || 'normal',
      });

      // Log email sending attempt
      await this.auditService.logSecurityEvent({
        userId,
        action: 'EMAIL_SENT',
        category: 'COMMUNICATION',
        severity: 'LOW',
        description: `Email sent to ${options.to} with subject: ${options.subject}`,
        metadata: {
          recipient: options.to,
          templateName: options.templateName,
          priority: options.priority,
        },
      });

      return true;
    } catch (error) {
      console.error('Send email error:', error);
      await this.auditService.logSecurityEvent({
        userId,
        action: 'EMAIL_SEND_FAILED',
        category: 'COMMUNICATION',
        severity: 'HIGH',
        description: `Failed to send email to ${options.to}`,
        metadata: { error: (error as Error).message, recipient: options.to },
      });
      return false;
    }
  }

  /**
   * Send email verification with secure token
   */
  async sendEmailVerification(
    userId: string,
    email: string,
    language = 'en'
  ): Promise<EmailVerificationResult> {
    try {
      // Generate secure verification token
      const token = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with verification token
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: token,
          emailVerificationExpires: expiresAt,
        },
      });

      // Send verification email
      const success = await this.sendEmail(
        {
          to: email,
          subject: 'Verify Your Email Address',
          templateName: 'EMAIL_VERIFICATION',
          templateVariables: {
            verificationUrl: `${env.FRONTEND_URL}/verify-email?token=${token}`,
            userEmail: email,
            expirationHours: 24,
          },
          priority: 'high',
        },
        userId
      );

      if (success) {
        return {
          success: true,
          message: 'Verification email sent successfully',
          token,
          expiresAt,
        };
      } else {
        return {
          success: false,
          message: 'Failed to send verification email',
        };
      }
    } catch (error) {
      console.error('Send email verification error:', error);
      return {
        success: false,
        message: 'Failed to send verification email',
      };
    }
  }

  /**
   * Send password reset email with secure token
   */
  async sendPasswordReset(
    userId: string,
    email: string,
    language = 'en'
  ): Promise<EmailVerificationResult> {
    try {
      // Generate secure reset token
      const token = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordResetToken: token,
          passwordResetExpires: expiresAt,
        },
      });

      // Send reset email
      const success = await this.sendEmail(
        {
          to: email,
          subject: 'Password Reset Request',
          templateName: 'PASSWORD_RESET',
          templateVariables: {
            resetUrl: `${env.FRONTEND_URL}/reset-password?token=${token}`,
            userEmail: email,
            expirationMinutes: 60,
          },
          priority: 'high',
        },
        userId
      );

      if (success) {
        await this.auditService.logSecurityEvent({
          userId,
          action: 'PASSWORD_RESET_REQUESTED',
          category: 'AUTH',
          severity: 'MEDIUM',
          description: 'Password reset email sent',
          metadata: { email },
        });

        return {
          success: true,
          message: 'Password reset email sent successfully',
          token,
          expiresAt,
        };
      } else {
        return {
          success: false,
          message: 'Failed to send password reset email',
        };
      }
    } catch (error) {
      console.error('Send password reset error:', error);
      return {
        success: false,
        message: 'Failed to send password reset email',
      };
    }
  }

  /**
   * Send security alert notification
   */
  async sendSecurityAlert(
    userId: string,
    email: string,
    alertType: string,
    details: any
  ): Promise<boolean> {
    try {
      const alertTemplates = {
        SUSPICIOUS_LOGIN: 'SECURITY_ALERT_LOGIN',
        PASSWORD_CHANGED: 'SECURITY_ALERT_PASSWORD',
        TWO_FA_ENABLED: 'SECURITY_ALERT_2FA_ENABLED',
        TWO_FA_DISABLED: 'SECURITY_ALERT_2FA_DISABLED',
        ACCOUNT_LOCKED: 'SECURITY_ALERT_LOCKED',
        NEW_DEVICE_LOGIN: 'SECURITY_ALERT_NEW_DEVICE',
      };

      return await this.sendEmail(
        {
          to: email,
          subject: `Security Alert: ${alertType.replace('_', ' ')}`,
          templateName:
            alertTemplates[alertType as keyof typeof alertTemplates] || 'SECURITY_ALERT_GENERIC',
          templateVariables: {
            userEmail: email,
            alertType,
            timestamp: new Date().toISOString(),
            ...details,
          },
          priority: 'high',
        },
        userId
      );
    } catch (error) {
      console.error('Send security alert error:', error);
      return false;
    }
  }

  /**
   * Process email template with variables
   */
  private async processTemplate(options: EmailOptions): Promise<EmailOptions> {
    try {
      const template = await this.getEmailTemplate(
        options.templateName!,
        options.templateVariables?.language || 'en'
      );

      if (!template) {
        throw new Error(`Template not found: ${options.templateName}`);
      }

      let processedHtml = template.htmlContent;
      let processedText = template.textContent;
      let processedSubject = template.subject;

      // Replace template variables
      if (options.templateVariables) {
        for (const [key, value] of Object.entries(options.templateVariables)) {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          processedHtml = processedHtml.replace(regex, String(value));
          processedText = processedText.replace(regex, String(value));
          processedSubject = processedSubject.replace(regex, String(value));
        }
      }

      return {
        ...options,
        subject: processedSubject,
        html: processedHtml,
        text: processedText,
      };
    } catch (error) {
      console.error('Process template error:', error);
      throw error;
    }
  }

  /**
   * Get email template from database
   */
  private async getEmailTemplate(name: string, language = 'en'): Promise<EmailTemplate | null> {
    try {
      const template = await prisma.emailTemplate.findFirst({
        where: {
          name,
          language,
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });

      if (!template) {
        // Fallback to English if requested language not found
        const fallback = await prisma.emailTemplate.findFirst({
          where: {
            name,
            language: 'en',
            isActive: true,
          },
          orderBy: { version: 'desc' },
        });

        if (fallback) {
          return {
            id: fallback.id,
            name: fallback.name,
            subject: fallback.subject,
            htmlContent: fallback.htmlContent,
            textContent: fallback.textContent,
            variables: fallback.variables ? JSON.parse(fallback.variables) : undefined,
            isActive: fallback.isActive,
            language: fallback.language,
            version: fallback.version,
          };
        }
      }

      if (template) {
        return {
          id: template.id,
          name: template.name,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: template.variables ? JSON.parse(template.variables) : undefined,
          isActive: template.isActive,
          language: template.language,
          version: template.version,
        };
      }

      return null;
    } catch (error) {
      console.error('Get email template error:', error);
      return null;
    }
  }

  /**
   * Create or update email template
   */
  async createEmailTemplate(template: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate | null> {
    try {
      const created = await prisma.emailTemplate.create({
        data: {
          name: template.name,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: template.variables ? JSON.stringify(template.variables) : null,
          isActive: template.isActive,
          language: template.language,
          version: template.version,
        },
      });

      return {
        id: created.id,
        name: created.name,
        subject: created.subject,
        htmlContent: created.htmlContent,
        textContent: created.textContent,
        variables: created.variables ? JSON.parse(created.variables) : undefined,
        isActive: created.isActive,
        language: created.language,
        version: created.version,
      };
    } catch (error) {
      console.error('Create email template error:', error);
      return null;
    }
  }

  /**
   * Generate cryptographically secure token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check email rate limiting
   */
  private checkRateLimit(email: string): boolean {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;

    // Check per-recipient rate limit
    const recipientKey = `recipient:${email}`;
    const recipientLimit = this.rateLimiter.get(recipientKey);

    if (recipientLimit) {
      if (now < recipientLimit.resetTime) {
        if (recipientLimit.count >= this.MAX_EMAILS_PER_RECIPIENT_HOUR) {
          return false;
        }
        recipientLimit.count++;
      } else {
        // Reset counter
        this.rateLimiter.set(recipientKey, { count: 1, resetTime: now + hourMs });
      }
    } else {
      this.rateLimiter.set(recipientKey, { count: 1, resetTime: now + hourMs });
    }

    // Check global rate limit
    const globalKey = 'global';
    const globalLimit = this.rateLimiter.get(globalKey);

    if (globalLimit) {
      if (now < globalLimit.resetTime) {
        if (globalLimit.count >= this.MAX_EMAILS_PER_HOUR) {
          return false;
        }
        globalLimit.count++;
      } else {
        // Reset counter
        this.rateLimiter.set(globalKey, { count: 1, resetTime: now + hourMs });
      }
    } else {
      this.rateLimiter.set(globalKey, { count: 1, resetTime: now + hourMs });
    }

    return true;
  }

  /**
   * Process email queue
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.processing || this.emailQueue.length === 0 || !this.transporter) {
        return;
      }

      this.processing = true;

      try {
        // Sort by priority
        this.emailQueue.sort((a, b) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          return (
            (priorityOrder[b.priority || 'normal'] || 2) -
            (priorityOrder[a.priority || 'normal'] || 2)
          );
        });

        // Process up to 10 emails per batch
        const batch = this.emailQueue.splice(0, 10);

        for (const email of batch) {
          try {
            await this.transporter.sendMail({
              from: `"${env.EMAIL_FROM_NAME || 'Parking Garage'}" <${env.EMAIL_FROM || env.EMAIL_USER}>`,
              to: email.to,
              subject: email.subject,
              html: email.html,
              text: email.text,
              attachments: email.attachments,
            });
          } catch (error) {
            console.error('Email send error:', error);
            // Could implement retry logic here
          }
        }
      } catch (error) {
        console.error('Email queue processing error:', error);
      } finally {
        this.processing = false;
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Get email statistics
   */
  async getEmailStats(): Promise<EmailStats> {
    // This would be implemented with proper tracking
    return {
      sent: 0,
      failed: 0,
      pending: this.emailQueue.length,
      ratePerHour: 0,
    };
  }

  /**
   * Verify email token
   */
  async verifyEmailToken(
    token: string
  ): Promise<{ success: boolean; userId?: string; message: string }> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: { gt: new Date() },
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired verification token',
        };
      }

      // Mark email as verified
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });

      await this.auditService.logSecurityEvent({
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        category: 'AUTH',
        severity: 'LOW',
        description: 'Email address verified successfully',
        metadata: { email: user.email },
      });

      return {
        success: true,
        userId: user.id,
        message: 'Email verified successfully',
      };
    } catch (error) {
      console.error('Verify email token error:', error);
      return {
        success: false,
        message: 'Email verification failed',
      };
    }
  }

  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(
    token: string
  ): Promise<{ success: boolean; userId?: string; message: string }> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: { gt: new Date() },
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired reset token',
        };
      }

      return {
        success: true,
        userId: user.id,
        message: 'Reset token is valid',
      };
    } catch (error) {
      console.error('Verify reset token error:', error);
      return {
        success: false,
        message: 'Token verification failed',
      };
    }
  }
}

// Export singleton instance
export default new EmailService();
export { EmailService };
