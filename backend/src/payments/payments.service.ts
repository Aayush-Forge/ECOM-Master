import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, PaymentStatus, PaymentWebhookStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RazorpayService } from './razorpay.service.js';
import { RAZORPAY_CONFIG } from './razorpay.config.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'production') {
      if (!RAZORPAY_CONFIG.keySecret || !process.env.RAZORPAY_WEBHOOK_SECRET) {
        throw new Error('Production environment requires RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET');
      }
    }
  }

  async createSession(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.payment_pending) {
      throw new BadRequestException(
        `Order is in status '${order.status}', expected 'payment_pending'`,
      );
    }

    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: PaymentStatus.CREATED,
      },
    });

    if (existingPayment) {
      return {
        razorpayOrderId: existingPayment.razorpayOrderId,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        keyId: RAZORPAY_CONFIG.keyId,
      };
    }

    const amountInPaise = Math.round(Number(order.grandTotal) * 100);
    const receipt = order.orderNumber || order.id;

    if ((!RAZORPAY_CONFIG.keyId || !RAZORPAY_CONFIG.keySecret) && process.env.NODE_ENV !== 'test') {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Payment gateway not configured in production');
      }
      const mockRzpOrderId = `order_mock_${Date.now()}`;
      const payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: mockRzpOrderId,
          status: PaymentStatus.CREATED,
          amount: order.grandTotal,
          currency: order.currency,
        },
      });

      return {
        razorpayOrderId: payment.razorpayOrderId,
        amount: payment.amount,
        currency: payment.currency,
        keyId: 'rzp_test_mock',
        isMock: true,
      };
    }

    const razorpayOrder = await this.razorpayService.createOrder(
      amountInPaise,
      order.currency,
      receipt,
    );

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayOrderId: razorpayOrder.id,
        status: PaymentStatus.CREATED,
        amount: order.grandTotal,
        currency: order.currency,
      },
    });

    return {
      razorpayOrderId: payment.razorpayOrderId,
      amount: payment.amount,
      currency: payment.currency,
      keyId: RAZORPAY_CONFIG.keyId,
    };
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = dto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        razorpayOrderId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found for this order');
    }

    if (payment.status === PaymentStatus.CAPTURED && order.status === OrderStatus.paid) {
      return {
        success: true,
        orderId,
        status: OrderStatus.paid,
      };
    }

    if (order.status !== OrderStatus.payment_pending) {
      throw new BadRequestException(
        `Order is in status '${order.status}', expected 'payment_pending'`,
      );
    }

    if (process.env.NODE_ENV === 'production' && !RAZORPAY_CONFIG.keySecret) {
      throw new ServiceUnavailableException('Payment gateway credentials missing in production');
    }

    if (RAZORPAY_CONFIG.keySecret) {
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = createHmac('sha256', RAZORPAY_CONFIG.keySecret)
        .update(body)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const receivedBuffer = Buffer.from(razorpaySignature || '', 'utf8');

      if (
        expectedBuffer.length !== receivedBuffer.length ||
        !timingSafeEqual(expectedBuffer, receivedBuffer)
      ) {
        throw new BadRequestException('Invalid payment signature');
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Signature verification required in production');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: PaymentStatus.CAPTURED,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.paid,
          placedAt: new Date(),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: OrderStatus.paid,
          changedBySystem: 'Razorpay Verification',
          note: `Payment captured successfully (${razorpayPaymentId})`,
        },
      });
    });

    this.eventEmitter.emit('order.status_changed', {
      orderId,
      fromStatus: order.status,
      toStatus: OrderStatus.paid,
      changedBySystem: 'Razorpay Verification',
    });
    this.eventEmitter.emit('order.paid', { orderId });

    return {
      success: true,
      orderId,
      status: OrderStatus.paid,
    };
  }

  async handleWebhook(payload: any, signature?: string, rawBody?: string) {
    const effectiveRawBody =
      rawBody || (process.env.NODE_ENV === 'test' ? JSON.stringify(payload || {}) : '');
    if (!effectiveRawBody) {
      throw new BadRequestException('Raw request body is required for webhook signature verification');
    }

    if (process.env.NODE_ENV === 'production' && !RAZORPAY_CONFIG.webhookSecret) {
      throw new ServiceUnavailableException('Webhook secret not configured in production');
    }

    if (RAZORPAY_CONFIG.webhookSecret && !this.verifyWebhookSignature(effectiveRawBody, signature || '')) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const eventType = payload?.event;
    if (!eventType) {
      throw new BadRequestException('Missing webhook event type');
    }

    const razorpayEventId = payload?.id || payload?.event_id;
    if (!razorpayEventId) {
      throw new BadRequestException('Webhook payload missing event id');
    }

    const existingEvent = await this.prisma.paymentWebhookEvent.findUnique({
      where: { razorpayEventId },
    });

    if (existingEvent && existingEvent.status === PaymentWebhookStatus.processed) {
      return {
        received: true,
        status: 'already_processed',
        eventId: razorpayEventId,
      };
    }

    const webhookRecord =
      existingEvent ||
      (await this.prisma.paymentWebhookEvent.create({
        data: {
          razorpayEventId,
          eventType,
          payload: payload as any,
          status: PaymentWebhookStatus.received,
        },
      }));

    try {
      switch (eventType) {
        case 'payment.captured':
        case 'order.paid': {
          await this.handlePaymentCapturedWebhook(payload, webhookRecord.id);
          break;
        }
        case 'refund.processed':
        case 'payment.refunded': {
          await this.handleRefundProcessedWebhook(payload, webhookRecord.id);
          break;
        }
        case 'payment.failed': {
          await this.handlePaymentFailedWebhook(payload, webhookRecord.id);
          break;
        }
        default: {
          await this.prisma.paymentWebhookEvent.update({
            where: { id: webhookRecord.id },
            data: {
              status: PaymentWebhookStatus.processed,
              processedAt: new Date(),
            },
          });
          break;
        }
      }

      return {
        received: true,
        status: 'processed',
        eventId: razorpayEventId,
        eventType,
      };
    } catch (error: any) {
      await this.prisma.paymentWebhookEvent
        .update({
          where: { id: webhookRecord.id },
          data: {
            status: PaymentWebhookStatus.failed,
          },
        })
        .catch(() => {});
      throw error;
    }
  }

  private verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = RAZORPAY_CONFIG.webhookSecret;
    if (!secret) return true;
    if (!signature) return false;

    try {
      const expectedSignature = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }
      return timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch {
      return false;
    }
  }

  private async handlePaymentCapturedWebhook(payload: any, webhookRecordId: string) {
    const paymentEntity = payload?.payload?.payment?.entity;
    const orderEntity = payload?.payload?.order?.entity;

    const razorpayPaymentId = paymentEntity?.id;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

    if (!razorpayOrderId && !razorpayPaymentId) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: { status: PaymentWebhookStatus.processed, processedAt: new Date() },
      });
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
          ...(razorpayPaymentId ? [{ razorpayPaymentId }] : []),
        ],
      },
      include: { order: true },
    });

    if (!payment) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: { status: PaymentWebhookStatus.processed, processedAt: new Date() },
      });
      return;
    }

    if (payment.order?.status !== OrderStatus.payment_pending) {
      this.logger.warn(
        `payment.captured received for order ${payment.orderId} with status '${payment.order?.status}', ignoring transition.`,
      );
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: {
          status: PaymentWebhookStatus.processed,
          processedAt: new Date(),
          paymentId: payment.id,
        },
      });
      return;
    }

    if (paymentEntity?.amount !== undefined) {
      const expectedAmountPaise = Math.round(Number(payment.order.grandTotal) * 100);
      const receivedAmountPaise = Number(paymentEntity.amount);
      if (receivedAmountPaise !== expectedAmountPaise) {
        this.logger.error(
          `Payment amount mismatch for order ${payment.orderId}: expected ${expectedAmountPaise} paise, received ${receivedAmountPaise} paise`,
        );
        throw new BadRequestException('Payment amount mismatch');
      }
    }

    if (paymentEntity?.currency && payment.order.currency) {
      if (paymentEntity.currency.toUpperCase() !== payment.order.currency.toUpperCase()) {
        this.logger.error(
          `Payment currency mismatch for order ${payment.orderId}: expected ${payment.order.currency}, received ${paymentEntity.currency}`,
        );
        throw new BadRequestException('Payment currency mismatch');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: razorpayPaymentId || payment.razorpayPaymentId,
          status: PaymentStatus.CAPTURED,
          method: paymentEntity?.method || payment.method,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.paid,
          placedAt: payment.order?.placedAt || new Date(),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: payment.order?.status,
          toStatus: OrderStatus.paid,
          changedBySystem: 'Razorpay Webhook',
          note: `Payment captured via webhook (${razorpayPaymentId || 'verified'})`,
        },
      });

      await tx.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: {
          status: PaymentWebhookStatus.processed,
          processedAt: new Date(),
          paymentId: payment.id,
        },
      });
    });

    this.eventEmitter.emit('order.status_changed', {
      orderId: payment.orderId,
      fromStatus: payment.order?.status,
      toStatus: OrderStatus.paid,
      changedBySystem: 'Razorpay Webhook',
    });
    this.eventEmitter.emit('order.paid', { orderId: payment.orderId });
  }

  private async handleRefundProcessedWebhook(payload: any, webhookRecordId: string) {
    const refundEntity = payload?.payload?.refund?.entity;
    const paymentEntity = payload?.payload?.payment?.entity;

    const razorpayRefundId = refundEntity?.id;
    const razorpayPaymentId = refundEntity?.payment_id || paymentEntity?.id;
    const razorpayOrderId = paymentEntity?.order_id;

    if (!razorpayPaymentId && !razorpayOrderId) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: { status: PaymentWebhookStatus.processed, processedAt: new Date() },
      });
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          ...(razorpayPaymentId ? [{ razorpayPaymentId }] : []),
          ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
        ],
      },
      include: { order: true },
    });

    if (!payment) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: { status: PaymentWebhookStatus.processed, processedAt: new Date() },
      });
      return;
    }

    if (payment.status === PaymentStatus.REFUNDED && payment.order?.status === OrderStatus.refunded) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: {
          status: PaymentWebhookStatus.processed,
          processedAt: new Date(),
          paymentId: payment.id,
        },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.refunded,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: payment.order?.status,
          toStatus: OrderStatus.refunded,
          changedBySystem: 'Razorpay Webhook Refund',
          note: `Refund processed via Razorpay Webhook (${razorpayRefundId || 'completed'})`,
        },
      });

      await tx.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: {
          status: PaymentWebhookStatus.processed,
          processedAt: new Date(),
          paymentId: payment.id,
        },
      });
    });

    this.eventEmitter.emit('order.status_changed', {
      orderId: payment.orderId,
      fromStatus: payment.order?.status,
      toStatus: OrderStatus.refunded,
      changedBySystem: 'Razorpay Webhook Refund',
    });
    this.eventEmitter.emit('order.refunded', {
      orderId: payment.orderId,
      refundId: razorpayRefundId,
    });
  }

  private async handlePaymentFailedWebhook(payload: any, webhookRecordId: string) {
    const paymentEntity = payload?.payload?.payment?.entity;
    const razorpayPaymentId = paymentEntity?.id;
    const razorpayOrderId = paymentEntity?.order_id;

    if (!razorpayOrderId && !razorpayPaymentId) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: { status: PaymentWebhookStatus.processed, processedAt: new Date() },
      });
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
          ...(razorpayPaymentId ? [{ razorpayPaymentId }] : []),
        ],
      },
      include: { order: true },
    });

    if (!payment) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: { status: PaymentWebhookStatus.processed, processedAt: new Date() },
      });
      return;
    }

    // If order is already cancelled, don't re-cancel or release coupon again (idempotent)
    if (payment.order?.status === OrderStatus.cancelled) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: {
          status: PaymentWebhookStatus.processed,
          processedAt: new Date(),
          paymentId: payment.id,
        },
      });
      return;
    }

    if (
      payment &&
      payment.status !== PaymentStatus.CAPTURED &&
      payment.status !== PaymentStatus.REFUNDED
    ) {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            razorpayPaymentId: razorpayPaymentId || payment.razorpayPaymentId,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.cancelled,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            fromStatus: payment.order?.status,
            toStatus: OrderStatus.cancelled,
            changedBySystem: 'Razorpay Webhook',
            note: `Payment attempt failed via webhook (${razorpayPaymentId || 'failed'})`,
          },
        });

        if (payment.order?.couponCode && payment.order.couponCode.trim()) {
          await tx.$executeRaw`
            UPDATE "clubbing_rules"
            SET "usage_count" = GREATEST(0, "usage_count" - 1)
            WHERE LOWER("name") = LOWER(${payment.order.couponCode.trim()})
          `;
        }

        await tx.paymentWebhookEvent.update({
          where: { id: webhookRecordId },
          data: {
            status: PaymentWebhookStatus.processed,
            processedAt: new Date(),
            paymentId: payment.id,
          },
        });
      });

      this.eventEmitter.emit('payment.failed', { orderId: payment.orderId });
      this.eventEmitter.emit('order.status_changed', {
        orderId: payment.orderId,
        fromStatus: payment.order?.status,
        toStatus: OrderStatus.cancelled,
        changedBySystem: 'Razorpay Webhook',
      });
      this.eventEmitter.emit('order.cancelled', { orderId: payment.orderId });
    } else {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: webhookRecordId },
        data: {
          status: PaymentWebhookStatus.processed,
          processedAt: new Date(),
          paymentId: payment?.id,
        },
      });
    }
  }

  async getAllPayments(status?: string, page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const where: any = {};

    if (status && status !== 'all') {
      const normalizedStatus = status.toUpperCase();
      if (Object.values(PaymentStatus).includes(normalizedStatus as PaymentStatus)) {
        where.status = normalizedStatus as PaymentStatus;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
              addresses: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.payment.count({ where }),
    ]);

    const sanitizedData = data.map(({ razorpaySignature, ...rest }) => rest);

    return {
      data: sanitizedData,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getPaymentByOrderId(orderId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            addresses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new NotFoundException(`No payment record found for order "${orderId}"`);
    }

    const { razorpaySignature, ...safePayment } = payment;
    return safePayment;
  }
}
