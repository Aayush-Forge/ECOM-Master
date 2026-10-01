import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsListener } from './notifications.listener.js';
import { NotificationProcessor } from './notification-processor.js';
import { EMAIL_PROVIDER } from './providers/email-provider.interface.js';
import { ConsoleEmailProvider } from './providers/console-email.provider.js';
import { NOTIFICATION_PUBLISHER } from './publishers/notification-publisher.interface.js';
import { InProcessPublisher } from './publishers/in-process.publisher.js';

@Module({
  imports: [PrismaModule],
  providers: [
    NotificationsService,
    NotificationsListener,
    NotificationProcessor,
    {
      provide: EMAIL_PROVIDER,
      useClass: ConsoleEmailProvider,
    },
    {
      provide: NOTIFICATION_PUBLISHER,
      useClass: InProcessPublisher,
    },
  ],
  exports: [NotificationsService, EMAIL_PROVIDER, NOTIFICATION_PUBLISHER],
})
export class NotificationsModule {}
