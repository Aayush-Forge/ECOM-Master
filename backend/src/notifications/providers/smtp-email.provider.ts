import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { EmailProvider, SendEmailOptions } from './email-provider.interface.js';
import { ConsoleEmailProvider } from './console-email.provider.js';

@Injectable()
export class SmtpEmailProvider implements EmailProvider, OnModuleInit {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private transporter: Transporter | null = null;
  private readonly fallbackProvider = new ConsoleEmailProvider();
  private isUsingFallback = false;

  onModuleInit(): void {
    const host = process.env.SMTP_HOST;
    const portStr = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true';

    if (!host || !portStr || !user || !pass) {
      this.logger.warn(
        '[SmtpEmailProvider] Missing required SMTP environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS). Falling back to console email provider.',
      );
      this.isUsingFallback = true;
      return;
    }

    const port = Number(portStr);
    if (isNaN(port)) {
      this.logger.warn(
        `[SmtpEmailProvider] Invalid SMTP_PORT: "${portStr}". Falling back to console email provider.`,
      );
      this.isUsingFallback = true;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

      // Verify connection asynchronously on startup without throwing/crashing
      this.transporter.verify((error) => {
        if (error) {
          this.logger.warn(
            `[SmtpEmailProvider] SMTP connection verification failed: ${error.message}. Provider will still attempt to send or fail gracefully.`,
          );
        } else {
          this.logger.log(`[SmtpEmailProvider] SMTP transport successfully verified for host: ${host}:${port}`);
        }
      });
    } catch (err: any) {
      this.logger.warn(
        `[SmtpEmailProvider] Failed to initialize SMTP transporter: ${err?.message || err}. Falling back to console email provider.`,
      );
      this.isUsingFallback = true;
      this.transporter = null;
    }
  }

  async send(options: SendEmailOptions): Promise<void> {
    if (this.isUsingFallback || !this.transporter) {
      await this.fallbackProvider.send(options);
      return;
    }

    const fromAddress =
      options.from ||
      process.env.EMAIL_FROM ||
      (process.env.SMTP_USER ? `"Sridattam" <${process.env.SMTP_USER}>` : 'noreply@sridattam.com');

    try {
      this.logger.log(`[SmtpEmailProvider] Sending email to ${options.to} | Subject: "${options.subject}"`);
      await this.transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`[SmtpEmailProvider] Successfully sent email to ${options.to}`);
    } catch (error: any) {
      this.logger.error(
        `[SmtpEmailProvider] Failed to deliver email to ${options.to} (subject: "${options.subject}"): ${error?.message || error}`,
      );
      throw error;
    }
  }
}
