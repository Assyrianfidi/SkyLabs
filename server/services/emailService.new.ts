import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';
import { templateService } from './templateService.js';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string;
  replyTo?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
}

interface EmailResponse {
  success: boolean;
  message: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig;
  private isEnabled: boolean;

  private constructor() {
    // Initialize with default config that will be overridden
    this.config = {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      from: process.env.SMTP_FROM || 'noreply@example.com',
      to: process.env.SMTP_TO || 'admin@example.com',
    };

    // Check if email is enabled
    this.isEnabled = process.env.EMAIL_ENABLED !== 'false';
    
    if (!this.isEnabled) {
      logger.warn('Email service is disabled. Set EMAIL_ENABLED=true to enable.');
      return;
    }

    // Validate required configuration
    if (!this.config.host || !this.config.auth.user || !this.config.auth.pass) {
      logger.warn('SMTP configuration is incomplete. Email service will not work properly.');
      this.isEnabled = false;
      return;
    }

    try {
      // Create reusable transporter object using the default SMTP transport
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.port === 465, // true for 465, false for other ports
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
        pool: true,
        maxConnections: 1,
        maxMessages: 5,
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      });

      // Verify connection configuration
      this.verifyConnection().catch((error) => {
        logger.error('Failed to verify SMTP connection:', error);
      });
    } catch (error) {
      logger.error('Failed to create email transporter:', error);
      this.isEnabled = false;
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async verifyConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      return false;
    }
    
    try {
      const success = await this.transporter.verify();
      if (success) {
        logger.info('SMTP connection verified successfully');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to verify SMTP connection:', error);
      this.isEnabled = false;
      return false;
    }
  }

  public async sendContactFormEmail(formData: ContactFormData): Promise<EmailResponse> {
    if (!this.isEnabled || !this.transporter) {
      logger.warn('Email service is disabled. Contact form submission not sent.');
      return {
        success: false,
        message: 'Email service is not configured',
      };
    }

    try {
      // Add timestamp if not provided
      const emailData = {
        ...formData,
        timestamp: formData.timestamp || new Date().toISOString(),
        ipAddress: formData.ipAddress || 'Not available',
        userAgent: formData.userAgent || 'Not available',
      };

      // Render email template with form data
      const { html, text } = await templateService.renderEmail('contact-email', emailData);

      const mailOptions = {
        from: this.config.from,
        to: this.config.to,
        replyTo: `"${formData.name}" <${formData.email}>`,
        subject: `New Contact: ${formData.name} - ${formData.email}`,
        text,
        html,
        headers: {
          'X-Contact-Form': 'true',
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
        },
        priority: 'high' as const,
      };

      // Send the email
      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Contact form email sent to ${this.config.to}`, {
        messageId: info.messageId,
        envelope: info.envelope,
      });

      return {
        success: true,
        message: 'Contact form submitted successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send contact form email:', error);
      
      return {
        success: false,
        message: `Failed to send email: ${errorMessage}`,
      };
    }
  }

  public async sendTestEmail(to: string): Promise<EmailResponse> {
    if (!this.isEnabled || !this.transporter) {
      return {
        success: false,
        message: 'Email service is not enabled or configured',
      };
    }

    try {
      const mailOptions = {
        from: this.config.from,
        to,
        subject: 'Test Email from SkyLabs',
        text: 'This is a test email to verify the SMTP configuration.',
        html: '<h1>Test Email</h1><p>This is a test email to verify the SMTP configuration.</p>',
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Test email sent to ${to}`, { messageId: info.messageId });
      
      return {
        success: true,
        message: `Test email sent successfully to ${to}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send test email:', error);
      return {
        success: false,
        message: `Failed to send test email: ${errorMessage}`,
      };
    }
  }
}

// Export a singleton instance
export const emailService = EmailService.getInstance();
export default emailService;
