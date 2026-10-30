import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { EMAIL_PROVIDER, type EmailProvider } from './providers/email-provider.interface.js';
import { renderEmailTemplate } from './templates/email-templates.js';
import { AuditLogsService } from '../audit/audit-logs.service.js';
import { GetEmailLogsQueryDto } from './dto/get-email-logs-query.dto.js';

@Injectable()
export class AdminEmailService {
  private readonly logger = new Logger(AdminEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private escapeLike(str: string): string {
    return str.replace(/([%_\\])/g, '\\$1');
  }

  async getEmailLogs(query: GetEmailLogsQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(query.perPage) || 20));
    const skip = (page - 1) * perPage;

    const where: any = {};

    if (query.status === 'sent') {
      where.status = NotificationStatus.sent;
    } else if (query.status === 'failed') {
      where.status = NotificationStatus.failed;
    }

    if (query.templateKey && query.templateKey.trim()) {
      where.templateKey = query.templateKey.trim();
    }

    const rawSearch = (query.search || '').trim().slice(0, 100);
    if (rawSearch) {
      where.OR = [
        { recipient: { contains: rawSearch, mode: 'insensitive' } },
        { order: { orderNumber: { contains: rawSearch, mode: 'insensitive' } } },
      ];
    }

    const sortDirection = query.sort === 'oldest' ? 'asc' : 'desc';

    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
        orderBy: { sentAt: sortDirection },
        skip,
        take: perPage,
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    const data = logs.map((log) => ({
      id: log.id,
      recipient: log.recipient,
      templateKey: log.templateKey,
      status: log.status,
      sentAt: log.sentAt,
      orderId: log.orderId,
      orderNumber: log.order?.orderNumber || null,
      error: log.error ? (log.error.length > 200 ? `${log.error.slice(0, 200)}...` : log.error) : null,
    }));

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getEmailStats() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalSent, totalFailed, sentLast24h] = await Promise.all([
      this.prisma.notificationLog.count({
        where: { status: NotificationStatus.sent },
      }),
      this.prisma.notificationLog.count({
        where: { status: NotificationStatus.failed },
      }),
      this.prisma.notificationLog.count({
        where: {
          status: NotificationStatus.sent,
          sentAt: { gte: since24h },
        },
      }),
    ]);

    const totalAll = totalSent + totalFailed;
    const failureRatePercent = totalAll > 0 ? Number(((totalFailed / totalAll) * 100).toFixed(2)) : 0;

    return {
      totalSent,
      totalFailed,
      sentLast24h,
      failureRatePercent,
    };
  }

  async retryNotification(id: string, user?: any, ipAddress?: string) {
    const log = await this.prisma.notificationLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException(`Notification log with ID "${id}" not found`);
    }

    if (log.status === NotificationStatus.sent) {
      throw new ConflictException('Notification has already been successfully sent');
    }

    if (!log.orderId) {
      throw new BadRequestException('Cannot retry notification: missing associated order ID');
    }

    // Guard double clicks: conditionally claim the row
    const claim = await this.prisma.notificationLog.updateMany({
      where: {
        id,
        status: NotificationStatus.failed,
      },
      data: {
        sentAt: new Date(),
      },
    });

    if (claim.count === 0) {
      throw new ConflictException('Notification retry is already in progress or has succeeded');
    }

    // Reload the order, items and tracking from the DB
    const order = await this.prisma.order.findUnique({
      where: { id: log.orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        addresses: true,
      },
    });

    if (!order) {
      await this.prisma.notificationLog.update({
        where: { id },
        data: {
          error: 'Order not found upon retry',
        },
      });
      throw new BadRequestException('Order not found for retry');
    }

    const recipient = order.email?.trim();
    if (!recipient) {
      await this.prisma.notificationLog.update({
        where: { id },
        data: {
          error: 'Order has no customer email upon retry',
        },
      });
      throw new BadRequestException('Order has no email address');
    }

    // Load template overrides if any
    let overrides: any = undefined;
    try {
      const dbTemplate = await this.prisma.emailTemplate.findUnique({
        where: { key: log.templateKey },
      });
      if (dbTemplate) {
        overrides = {
          subject: dbTemplate.subject,
          heading: dbTemplate.heading || undefined,
          intro: dbTemplate.intro || undefined,
          footer: dbTemplate.footer || undefined,
        };
      }
    } catch (e: any) {
      this.logger.warn(`Could not load template override for ${log.templateKey}: ${e.message}`);
    }

    try {
      const rendered = renderEmailTemplate(log.templateKey, order, overrides);

      await this.emailProvider.send({
        to: recipient,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        from: process.env.EMAIL_FROM,
      });

      const updated = await this.prisma.notificationLog.update({
        where: { id },
        data: {
          status: NotificationStatus.sent,
          sentAt: new Date(),
          recipient,
          error: null,
        },
      });

      await this.auditLogsService.createLog({
        id: `audit_${Date.now()}_retry_${id.slice(0, 6)}`,
        timestamp: new Date(),
        userId: user?.id || 'admin',
        userRole: user?.role || 'admin',
        actionType: 'notification.retry',
        entityType: 'notification_log',
        entityId: id,
        beforeValue: { status: log.status, error: log.error },
        afterValue: { status: NotificationStatus.sent, error: null },
        ipAddress: ipAddress || null,
      });

      return {
        success: true,
        status: updated.status,
        sentAt: updated.sentAt,
      };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      await this.prisma.notificationLog.update({
        where: { id },
        data: {
          status: NotificationStatus.failed,
          sentAt: new Date(),
          recipient,
          error: errorMsg,
        },
      });

      await this.auditLogsService.createLog({
        id: `audit_${Date.now()}_retry_fail_${id.slice(0, 6)}`,
        timestamp: new Date(),
        userId: user?.id || 'admin',
        userRole: user?.role || 'admin',
        actionType: 'notification.retry_failed',
        entityType: 'notification_log',
        entityId: id,
        beforeValue: { status: log.status, error: log.error },
        afterValue: { status: NotificationStatus.failed, error: errorMsg },
        ipAddress: ipAddress || null,
      });

      throw new BadRequestException(`Email retry failed: ${errorMsg}`);
    }
  }
}
