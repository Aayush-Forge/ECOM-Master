import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RazorpayService } from './razorpay.service.js';
import { RAZORPAY_CONFIG } from './razorpay.config.js';

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
}
