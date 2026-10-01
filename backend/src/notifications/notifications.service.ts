import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NOTIFICATION_PUBLISHER,
  type NotificationPublisher,
} from './publishers/notification-publisher.interface.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_PUBLISHER)
    private readonly publisher: NotificationPublisher,
  ) {}

  async dispatchCustomerNotification(orderId: string, templateKey: string): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          customerId: true,
          email: true,
          customer: {
            select: {
              email: true,
            },
          },
        },
      });

      if (!order) {
        this.logger.warn(`[NotificationsService] Order ${orderId} not found when dispatching ${templateKey}`);
        return;
      }

      const recipient = (order.email || order.customer?.email)?.trim() || null;
      const idempotencyKey = `order:${orderId}:${templateKey}`;

      // Check idempotency before publishing
      const existing = await this.prisma.notificationLog.findUnique({
        where: { idempotencyKey },
      });

      if (existing && existing.status === NotificationStatus.sent) {
        this.logger.log(
          `[NotificationsService] Notification ${templateKey} already sent for order ${orderId} (key: ${idempotencyKey}). Skipping.`,
        );
        return;
      }

      // If no recipient email found (e.g. missing guest email)
      if (!recipient) {
        this.logger.warn(
          `[NotificationsService] Order ${orderId} has no recipient email; logging failed with reason 'no_recipient'`,
        );
        if (existing) {
          await this.prisma.notificationLog.update({
            where: { id: existing.id },
            data: {
              status: NotificationStatus.failed,
              error: 'no_recipient',
              recipient: null,
            },
          });
        } else {
          await this.prisma.notificationLog.create({
            data: {
              idempotencyKey,
              orderId,
              userId: order.customerId,
              recipient: null,
              templateKey,
              status: NotificationStatus.failed,
              error: 'no_recipient',
            },
          });
        }
        return;
      }

      await this.publisher.publish({
        orderId,
        templateKey,
        recipient,
        idempotencyKey,
      });
    } catch (err: any) {
      this.logger.error(
        `[NotificationsService] Error dispatching customer notification ${templateKey} for order ${orderId}: ${err?.message || err}`,
        err?.stack,
      );
    }
  }

  async dispatchInternalAlert(orderId: string, templateKey: string): Promise<void> {
    try {
      const rawEmails = process.env.INTERNAL_ALERT_EMAILS || '';
      const emails = rawEmails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      if (emails.length === 0) {
        return;
      }

      for (const email of emails) {
        const idempotencyKey = `order:${orderId}:${templateKey}:internal:${email.toLowerCase()}`;
        const existing = await this.prisma.notificationLog.findUnique({
          where: { idempotencyKey },
        });

        if (existing && existing.status === NotificationStatus.sent) {
          this.logger.log(
            `[NotificationsService] Internal alert ${templateKey} already sent to ${email} for order ${orderId}. Skipping.`,
          );
          continue;
        }

        await this.publisher.publish({
          orderId,
          templateKey,
          recipient: email,
          idempotencyKey,
        });
      }
    } catch (err: any) {
      this.logger.error(
        `[NotificationsService] Error dispatching internal alert ${templateKey} for order ${orderId}: ${err?.message || err}`,
        err?.stack,
      );
    }
  }
}
