import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, SendEmailOptions } from './email-provider.interface.js';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async send(options: SendEmailOptions): Promise<void> {
    const isDebug = process.env.EMAIL_DEBUG === 'true';
    this.logger.log(`[ConsoleEmailProvider] To: ${options.to} | Subject: "${options.subject}"`);
    if (isDebug) {
      this.logger.debug(`[ConsoleEmailProvider] Text Body:\n${options.text}`);
      this.logger.debug(`[ConsoleEmailProvider] HTML Body:\n${options.html}`);
    }
  }
}
