/**
 * Email templates for authentication operations
 * Contains pre-defined templates for password operations and security notifications
 */

import { prisma } from '../config/database';

export interface EmailTemplateData {
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: Record<string, any>;
  language: string;
  isActive: boolean;
}

export const PASSWORD_RESET_TEMPLATE: EmailTemplateData = {
  name: 'PASSWORD_RESET',
  subject: 'Reset Your Password - Parking Garage System',
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; font-size: 12px; color: #666; text-align: center; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <h2>Hello {{userName}},</h2>
                <p>We received a request to reset your password for your Parking Garage System account.</p>
                
                <p>To reset your password, click the button below:</p>
                <a href="{{resetUrl}}" class="button">Reset Password</a>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">{{resetUrl}}</p>
                
                <div class="warning">
                    <strong>Security Notice:</strong>
                    <ul>
                        <li>This link will expire in {{expirationMinutes}} minutes</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Your password will not be changed unless you click the link above</li>
                    </ul>
                </div>
                
                <p>For security reasons, this link can only be used once and will expire soon.</p>
            </div>
            <div class="footer">
                <p>This email was sent to {{userEmail}}. If you didn't request this, please contact support.</p>
                <p>&copy; 2024 Parking Garage System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `,
  textContent: `
Password Reset Request

Hello {{userName}},

We received a request to reset your password for your Parking Garage System account.

To reset your password, copy and paste this link into your browser:
{{resetUrl}}

SECURITY NOTICE:
- This link will expire in {{expirationMinutes}} minutes
- If you didn't request this reset, please ignore this email
- Your password will not be changed unless you use the link above

For security reasons, this link can only be used once and will expire soon.

This email was sent to {{userEmail}}. If you didn't request this, please contact support.

© 2024 Parking Garage System. All rights reserved.
  `,
  variables: {
    userName: 'string',
    resetUrl: 'string',
    userEmail: 'string',
    expirationMinutes: 'number'
  },
  language: 'en',
  isActive: true
};

export const PASSWORD_CHANGED_TEMPLATE: EmailTemplateData = {
  name: 'PASSWORD_CHANGED',
  subject: 'Password Changed - Parking Garage System',
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Password Changed</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .info-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .warning { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; font-size: 12px; color: #666; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✓ Password Successfully Changed</h1>
            </div>
            <div class="content">
                <h2>Hello {{userName}},</h2>
                <p>Your password for the Parking Garage System has been successfully changed.</p>
                
                <div class="info-box">
                    <strong>Change Details:</strong>
                    <ul>
                        <li><strong>Account:</strong> {{userEmail}}</li>
                        <li><strong>Date & Time:</strong> {{timestamp}}</li>
                        <li><strong>Action:</strong> Password Updated</li>
                    </ul>
                </div>
                
                <p><strong>Security Measures Taken:</strong></p>
                <ul>
                    <li>All existing sessions have been terminated</li>
                    <li>You'll need to log in again on all devices</li>
                    <li>This change has been logged for security purposes</li>
                </ul>
                
                <div class="warning">
                    <strong>Didn't make this change?</strong><br>
                    If you didn't change your password, your account may have been compromised. 
                    Please contact our support team immediately.
                </div>
                
                <a href="{{supportUrl}}" class="button">Contact Support</a>
                
                <p>Thank you for keeping your account secure!</p>
            </div>
            <div class="footer">
                <p>This email was sent to {{userEmail}} for security notification purposes.</p>
                <p>&copy; 2024 Parking Garage System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `,
  textContent: `
Password Successfully Changed

Hello {{userName}},

Your password for the Parking Garage System has been successfully changed.

CHANGE DETAILS:
- Account: {{userEmail}}
- Date & Time: {{timestamp}}
- Action: Password Updated

SECURITY MEASURES TAKEN:
- All existing sessions have been terminated
- You'll need to log in again on all devices
- This change has been logged for security purposes

DIDN'T MAKE THIS CHANGE?
If you didn't change your password, your account may have been compromised. 
Please contact our support team immediately at: {{supportUrl}}

Thank you for keeping your account secure!

This email was sent to {{userEmail}} for security notification purposes.

© 2024 Parking Garage System. All rights reserved.
  `,
  variables: {
    userName: 'string',
    userEmail: 'string',
    timestamp: 'string',
    supportUrl: 'string'
  },
  language: 'en',
  isActive: true
};

export const SECURITY_ALERT_PASSWORD_TEMPLATE: EmailTemplateData = {
  name: 'SECURITY_ALERT_PASSWORD',
  subject: 'Security Alert: Password Changed - Parking Garage System',
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Security Alert</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .alert { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; font-size: 12px; color: #666; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 Security Alert</h1>
            </div>
            <div class="content">
                <h2>Account Security Notification</h2>
                <p>We're writing to inform you of important security activity on your account.</p>
                
                <div class="alert">
                    <strong>Security Event:</strong> {{alertType}}<br>
                    <strong>Date & Time:</strong> {{timestamp}}<br>
                    <strong>Account:</strong> {{userEmail}}
                </div>
                
                <p><strong>What happened?</strong></p>
                <p>Your account password was recently changed. If this was you, no further action is needed.</p>
                
                <p><strong>What if this wasn't you?</strong></p>
                <ul>
                    <li>Your account may have been compromised</li>
                    <li>Contact our support team immediately</li>
                    <li>Consider enabling two-factor authentication</li>
                    <li>Review your recent account activity</li>
                </ul>
                
                <a href="{{supportUrl}}" class="button">Report Suspicious Activity</a>
                
                <p>We take your account security seriously and monitor for suspicious activity.</p>
            </div>
            <div class="footer">
                <p>This security alert was sent to {{userEmail}}.</p>
                <p>&copy; 2024 Parking Garage System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `,
  textContent: `
SECURITY ALERT

Account Security Notification

We're writing to inform you of important security activity on your account.

SECURITY EVENT: {{alertType}}
DATE & TIME: {{timestamp}}
ACCOUNT: {{userEmail}}

WHAT HAPPENED?
Your account password was recently changed. If this was you, no further action is needed.

WHAT IF THIS WASN'T YOU?
- Your account may have been compromised
- Contact our support team immediately
- Consider enabling two-factor authentication
- Review your recent account activity

Report suspicious activity: {{supportUrl}}

We take your account security seriously and monitor for suspicious activity.

This security alert was sent to {{userEmail}}.

© 2024 Parking Garage System. All rights reserved.
  `,
  variables: {
    userEmail: 'string',
    alertType: 'string',
    timestamp: 'string',
    supportUrl: 'string'
  },
  language: 'en',
  isActive: true
};

/**
 * Initialize email templates in database
 */
export async function initializeEmailTemplates(): Promise<void> {
  const templates = [
    PASSWORD_RESET_TEMPLATE,
    PASSWORD_CHANGED_TEMPLATE,
    SECURITY_ALERT_PASSWORD_TEMPLATE,
  ];

  for (const template of templates) {
    try {
      await prisma.emailTemplate.upsert({
        where: { name: template.name },
        update: {
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: JSON.stringify(template.variables),
          isActive: template.isActive,
          language: template.language,
        },
        create: {
          name: template.name,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: JSON.stringify(template.variables),
          isActive: template.isActive,
          language: template.language,
          version: 1,
        },
      });
      
      console.log(`✓ Email template '${template.name}' initialized`);
    } catch (error) {
      console.error(`Failed to initialize email template '${template.name}':`, error);
    }
  }
}

/**
 * Get all available email templates
 */
export async function getEmailTemplates(): Promise<EmailTemplateData[]> {
  const templates = await prisma.emailTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return templates.map(template => ({
    name: template.name,
    subject: template.subject,
    htmlContent: template.htmlContent,
    textContent: template.textContent,
    variables: template.variables ? JSON.parse(template.variables) : {},
    language: template.language,
    isActive: template.isActive,
  }));
}