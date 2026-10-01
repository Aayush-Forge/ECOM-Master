import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { EMAIL_PROVIDER, type EmailProvider } from './providers/email-provider.interface.js';
import type { NotificationJob } from './publishers/notification-publisher.interface.js';
import { renderEmailTemplate } from './templates/email-templates.js';

@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
  ) {}

  async process(job: NotificationJob): Promise<void> {
    const { orderId, templateKey, recipient, idempotencyKey } = job;

    try {
      // 1. Idempotency check: skip if already sent
      const existing = await this.prisma.notificationLog.findUnique({
        where: { idempotencyKey },
      });

      if (existing && existing.status === NotificationStatus.sent) {
        this.logger.log(
          `[NotificationProcessor] Skipping job: template "${templateKey}" already sent for order ${orderId} (key: ${idempotencyKey})`,
        );
        return;
      }

      if (!recipient) {
        this.logger.warn(
          `[NotificationProcessor] Order ${orderId} has no recipient for template "${templateKey}"`,
        );
        await this.recordFailure(job, null, 'no_recipient', existing?.id);
        return;
      }

      // 2. Load order details
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          items: true,
          addresses: true,
        },
      });

      if (!order) {
        this.logger.error(`[NotificationProcessor] Order ${orderId} not found for notification`);
        await this.recordFailure(job, null, 'order_not_found', existing?.id);
        return;
      }

      // 3. Render email
      const rendered = renderEmailTemplate(templateKey, order);

      // 4. Send email
      await this.emailProvider.send({
        to: recipient,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        from: process.env.EMAIL_FROM,
      });

      // 5. Record success in NotificationLog (update existing failed retry, or create new)
      if (existing) {
        await this.prisma.notificationLog.update({
          where: { id: existing.id },
          data: {
            status: NotificationStatus.sent,
            sentAt: new Date(),
            recipient,
            error: null,
          },
        });
      } else {
        await this.prisma.notificationLog.create({
          data: {
            idempotencyKey,
            orderId,
            userId: order.customerId,
            recipient,
            templateKey,
            status: NotificationStatus.sent,
            sentAt: new Date(),
          },
        });
      }

      this.logger.log(
        `[NotificationProcessor] Successfully sent "${templateKey}" to "${recipient}" for order ${orderId}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[NotificationProcessor] Error processing notification "${templateKey}" for order ${orderId}: ${err?.message || err}`,
        err?.stack,
      );
      try {
        await this.recordFailure(job, null, err?.message || String(err));
      } catch (recordErr: any) {
        this.logger.error(
          `[NotificationProcessor] Could not record failure log: ${recordErr?.message || recordErr}`,
        );
      }
    }
  }

  private async recordFailure(
    job: NotificationJob,
    userId: string | null,
    errorMessage: string,
    existingId?: string,
  ): Promise<void> {
    const { orderId, templateKey, recipient, idempotencyKey } = job;

    if (existingId) {
      await this.prisma.notificationLog.update({
        where: { id: existingId },
        data: {
          status: NotificationStatus.failed,
          error: errorMessage,
        },
      });
      return;
    }

    const existing = await this.prisma.notificationLog.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      await this.prisma.notificationLog.update({
        where: { id: existing.id },
        data: {
          status: NotificationStatus.failed,
          error: errorMessage,
        },
      });
    } else {
      try {
        await this.prisma.notificationLog.create({
          data: {
            idempotencyKey,
            orderId,
            templateKey,
            recipient,
            userId,
            status: NotificationStatus.failed,
            error: errorMessage,
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          await this.prisma.notificationLog.update({
            where: { idempotencyKey },
            data: {
              status: NotificationStatus.failed,
              error: errorMessage,
            },
          });
        } else {
          throw err;
        }
      }
    }
  }
}
