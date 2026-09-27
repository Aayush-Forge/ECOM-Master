import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { Order, Payment } from '../generated/prisma/client.js';
import {
  OrderStatus,
  PaymentStatus,
  WebhookEventStatus,
} from '../generated/prisma/enums.js';

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  method?: string;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // 1. Initiate: create a Razorpay order + local Payment row for an Order
  // ---------------------------------------------------------------------

  async initiatePayment(userId: string, orderId: string) {
    const order = await this.findOwnedOrder(userId, orderId);

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    const { keyId, keySecret } = this.getCheckoutCredentials();

    const amountPaise = Math.round(Number(order.grandTotal) * 100);
    if (!amountPaise || amountPaise < 100) {
      throw new BadRequestException('Invalid order amount');
    }

    const rzpOrder = await this.createRazorpayOrder(keyId, keySecret, {
      amount: amountPaise,
      currency: order.currency,
      receipt: order.orderNumber,
      notes: { orderId: order.id },
    });

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayOrderId: rzpOrder.id,
        status: PaymentStatus.CREATED,
        amount: order.grandTotal,
        currency: order.currency,
      },
    });

    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      await this.transitionOrderStatus(
        order.id,
        OrderStatus.PAYMENT_PENDING,
        'system',
        'Payment initiated',
      );
    }

    return {
      keyId,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      orderId: order.id,
    };
  }

  // ---------------------------------------------------------------------
  // 2. Client callback path — browser posts the Razorpay Checkout result
  // ---------------------------------------------------------------------

  async verifyClientCallback(userId: string, dto: VerifyPaymentDto) {
    const order = await this.findOwnedOrder(userId, dto.orderId);
    const { keySecret } = this.getCheckoutCredentials();

    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: dto.razorpay_order_id },
    });
    if (!payment || payment.orderId !== order.id) {
      throw new BadRequestException('Unknown payment for this order');
    }

    const expectedSignature = createHmac('sha256', keySecret)
      .update(`${dto.razorpay_order_id}|${dto.razorpay_payment_id}`)
      .digest('hex');
    if (!this.safeEquals(expectedSignature, dto.razorpay_signature)) {
      throw new BadRequestException('Payment signature verification failed');
    }

    await this.confirmPaymentCaptured(
      payment,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
      'client_callback',
    );

    return { success: true, orderId: order.id };
  }

  // ---------------------------------------------------------------------
  // 3. Server webhook path — Razorpay calls this directly, no user session
  // ---------------------------------------------------------------------

  async handleWebhook(
    rawBody: Buffer,
    signatureHeader: string | undefined,
    eventIdHeader: string | undefined,
  ) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'Razorpay webhook secret not configured',
      );
    }
    if (!signatureHeader) {
      throw new BadRequestException('Missing webhook signature');
    }

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    if (!this.safeEquals(expectedSignature, signatureHeader)) {
      throw new BadRequestException('Webhook signature verification failed');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventType: string = payload.event;
    // Prefer Razorpay's dedicated event-id header; fall back to a payload
    // hash so an event we can't otherwise identify still gets a stable key
    // instead of bypassing the idempotency check entirely.
    const razorpayEventId =
      eventIdHeader ??
      payload.id ??
      createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const event = await this.claimWebhookEvent(
      razorpayEventId,
      eventType,
      payload,
    );
    if (!event) {
      // Already fully processed on a prior delivery — ack without redoing work.
      return;
    }

    try {
      await this.processWebhookEvent(eventType, payload);
      await this.prisma.paymentWebhookEvent.update({
        where: { id: event.id },
        data: { status: WebhookEventStatus.PROCESSED, processedAt: new Date() },
      });
    } catch (e) {
      await this.prisma.paymentWebhookEvent
        .update({
          where: { id: event.id },
          data: { status: WebhookEventStatus.FAILED },
        })
        .catch(() => undefined);
      throw e;
    }
  }

  /**
   * Inserts (or reuses) the payment_webhook_events row for this delivery.
   * Returns null when the event was already PROCESSED — the caller should
   * ack and stop. Handles the race where two retried deliveries arrive
   * concurrently by falling back to a re-fetch on unique-constraint conflict.
   */
  private async claimWebhookEvent(
    razorpayEventId: string,
    eventType: string,
    payload: unknown,
  ) {
    let event = await this.prisma.paymentWebhookEvent.findUnique({
      where: { razorpayEventId },
    });

    if (!event) {
      try {
        event = await this.prisma.paymentWebhookEvent.create({
          data: {
            razorpayEventId,
            eventType,
            payload: payload as object,
            status: WebhookEventStatus.RECEIVED,
          },
        });
      } catch (e) {
        if (this.isUniqueConstraintError(e)) {
          event = await this.prisma.paymentWebhookEvent.findUniqueOrThrow({
            where: { razorpayEventId },
          });
        } else {
          throw e;
        }
      }
    }

    if (event.status === WebhookEventStatus.PROCESSED) {
      return null;
    }
    return event;
  }

  private async processWebhookEvent(eventType: string, payload: any) {
    const entity: RazorpayPaymentEntity | undefined =
      payload?.payload?.payment?.entity;
    if (!entity) return;

    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: entity.order_id },
    });
    if (!payment) return;

    switch (eventType) {
      case 'payment.captured':
        await this.confirmPaymentCaptured(
          payment,
          entity.id,
          undefined,
          'webhook',
          entity.method,
        );
        break;
      case 'payment.failed':
        await this.markPaymentFailed(payment);
        break;
      case 'refund.processed':
        await this.markPaymentRefunded(payment);
        break;
      default:
      // Unhandled event types are stored (for audit) but don't mutate state.
    }
  }

  // ---------------------------------------------------------------------
  // Shared, idempotent state transitions — both verification paths and the
  // webhook funnel through these so a race between them can't double-apply.
  // ---------------------------------------------------------------------

  private async confirmPaymentCaptured(
    payment: Payment,
    razorpayPaymentId: string,
    razorpaySignature: string | undefined,
    source: 'client_callback' | 'webhook',
    method?: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: PaymentStatus.CAPTURED } },
        data: {
          status: PaymentStatus.CAPTURED,
          razorpayPaymentId,
          ...(razorpaySignature ? { razorpaySignature } : {}),
          ...(method ? { method } : {}),
        },
      });
      if (result.count === 0) {
        // Already captured by the other verification path — no-op.
        return;
      }

      const order = await tx.order.findUniqueOrThrow({
        where: { id: payment.orderId },
      });
      if (order.status !== OrderStatus.PAID) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: OrderStatus.PAID,
            changedBy: 'system',
            note: `Payment captured via ${source}`,
          },
        });
      }
    });
  }

  private async markPaymentFailed(payment: Payment) {
    await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: [PaymentStatus.CREATED, PaymentStatus.AUTHORIZED] },
      },
      data: { status: PaymentStatus.FAILED },
    });
  }

  private async markPaymentRefunded(payment: Payment) {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.CAPTURED },
        data: { status: PaymentStatus.REFUNDED },
      });
      if (result.count === 0) return;

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.REFUNDED },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: OrderStatus.REFUNDED,
          changedBy: 'system',
          note: 'Refund processed via webhook',
        },
      });
    });
  }

  private async transitionOrderStatus(
    orderId: string,
    status: OrderStatus,
    changedBy: string,
    note: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status } }),
      this.prisma.orderStatusHistory.create({
        data: { orderId, status, changedBy, note },
      }),
    ]);
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  private async findOwnedOrder(userId: string, orderId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.customerId && order.customerId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }

  private getCheckoutCredentials() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException('Razorpay keys not configured');
    }
    return { keyId, keySecret };
  }

  private async createRazorpayOrder(
    keyId: string,
    keySecret: string,
    body: { amount: number; currency: string; receipt: string; notes: Record<string, string> },
  ) {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new BadRequestException(
        data?.error?.description ?? 'Could not create Razorpay order',
      );
    }
    return data as { id: string; amount: number; currency: string };
  }

  private safeEquals(expectedHex: string, actualHex: string): boolean {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = Buffer.from(actualHex, 'hex');
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  }

  private isUniqueConstraintError(e: unknown): boolean {
    return (
      typeof e === 'object' &&
      e !== null &&
      (e as { code?: string }).code === 'P2002'
    );
  }
}
