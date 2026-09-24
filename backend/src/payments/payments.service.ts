import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RazorpayService } from './razorpay.service.js';
import { RAZORPAY_CONFIG } from './razorpay.config.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
  ) {}

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

    if (RAZORPAY_CONFIG.keySecret) {
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = createHmac('sha256', RAZORPAY_CONFIG.keySecret)
        .update(body)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const receivedBuffer = Buffer.from(razorpaySignature, 'utf8');

      if (
        expectedBuffer.length !== receivedBuffer.length ||
        !timingSafeEqual(expectedBuffer, receivedBuffer)
      ) {
        throw new BadRequestException('Invalid payment signature');
      }
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

    return {
      success: true,
      orderId,
      status: OrderStatus.paid,
    };
  }
}
