import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditLogsModule } from '../audit/audit-logs.module.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsListener } from './notifications.listener.js';
import { NotificationProcessor } from './notification-processor.js';
import { EMAIL_PROVIDER } from './providers/email-provider.interface.js';
import { ConsoleEmailProvider } from './providers/console-email.provider.js';
import { SmtpEmailProvider } from './providers/smtp-email.provider.js';
import { NOTIFICATION_PUBLISHER } from './publishers/notification-publisher.interface.js';
import { InProcessPublisher } from './publishers/in-process.publisher.js';
import { BullMqPublisher } from './publishers/bullmq.publisher.js';
import { NotificationWorker } from './workers/notification.worker.js';
import { AdminEmailService } from './admin-email.service.js';
import { AdminEmailTemplatesService } from './admin-email-templates.service.js';
import { AdminEmailLogsController } from './admin-email-logs.controller.js';
import { AdminEmailTemplatesController } from './admin-email-templates.controller.js';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [AdminEmailLogsController, AdminEmailTemplatesController],
  providers: [
    NotificationsService,
    NotificationsListener,
    NotificationProcessor,
    ConsoleEmailProvider,
    SmtpEmailProvider,
    InProcessPublisher,
    BullMqPublisher,
    NotificationWorker,
    AdminEmailService,
    AdminEmailTemplatesService,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (smtpProvider: SmtpEmailProvider, consoleProvider: ConsoleEmailProvider) => {
        const configured = process.env.EMAIL_PROVIDER?.toLowerCase().trim();
        return configured === 'smtp' ? smtpProvider : consoleProvider;
      },
      inject: [SmtpEmailProvider, ConsoleEmailProvider],
    },
    {
      provide: NOTIFICATION_PUBLISHER,
      useClass: BullMqPublisher,
    },
  ],
  exports: [NotificationsService, EMAIL_PROVIDER, NOTIFICATION_PUBLISHER],
})
export class NotificationsModule {}
