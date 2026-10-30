import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrderStatus,
  PaymentStatus,
  PaymentWebhookStatus,
} from '../generated/prisma';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    paymentWebhookEvent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.RAZORPAY_WEBHOOK_SECRET;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleRefundWebhook', () => {
    const testOrderId = 'order-uuid-123';
    const mockOrder = {
      id: testOrderId,
      orderNumber: 'ORD-1001',
      status: OrderStatus.paid,
      payments: [{ id: 'pay-db-id', status: PaymentStatus.captured }],
    };

    it('should ignore unhandled event types', async () => {
      const result = await service.handleRefundWebhook({
        event: 'payment.captured',
        orderId: testOrderId,
      });

      expect(result).toEqual({
        status: 'ignored',
        message: 'Unhandled event type: payment.captured',
      });
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('should enforce HMAC signature verification when RAZORPAY_WEBHOOK_SECRET is set', async () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = 'test_secret_key';
      const dto = {
        event: 'refund.processed',
        orderId: testOrderId,
      };

      // Missing signature throws UnauthorizedException
      await expect(service.handleRefundWebhook(dto)).rejects.toThrow(
        UnauthorizedException,
      );

      // Invalid signature throws UnauthorizedException
      await expect(
        service.handleRefundWebhook(dto, 'invalid_signature'),
      ).rejects.toThrow(UnauthorizedException);

      // Valid signature passes
      const validSignature = crypto
        .createHmac('sha256', 'test_secret_key')
        .update(JSON.stringify(dto))
        .digest('hex');

      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.refunded,
      });

      const res = await service.handleRefundWebhook(dto, validSignature);
      expect(res.status).toBe('success');
    });

    it('should handle idempotency and avoid duplicate processing for already processed events', async () => {
      const dto = {
        id: 'evt_refund_processed_999',
        event: 'refund.processed',
        orderId: testOrderId,
      };

      prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
        id: 'some-id',
        razorpayEventId: 'evt_refund_processed_999',
        status: PaymentWebhookStatus.processed,
      });

      const result = await service.handleRefundWebhook(dto);

      expect(result).toEqual({
        status: 'already_processed',
        message: 'Webhook event evt_refund_processed_999 was already processed',
        eventId: 'evt_refund_processed_999',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('should successfully update order status, payments, history, and webhook log via direct orderId', async () => {
      const dto = {
        id: 'evt_101',
        event: 'refund.processed',
        orderId: testOrderId,
      };

      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.refunded,
      });

      const result = await service.handleRefundWebhook(dto);

      expect(result.status).toBe('success');
      expect(result.orderId).toBe(testOrderId);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: testOrderId },
        data: { status: OrderStatus.refunded },
      });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId: testOrderId },
        data: { status: PaymentStatus.refunded },
      });
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: testOrderId,
          status: OrderStatus.refunded,
          changedBy: 'webhook:refund.processed',
          note: expect.stringContaining('evt_101'),
        },
      });
      expect(prisma.paymentWebhookEvent.upsert).toHaveBeenCalledWith({
        where: { razorpayEventId: 'evt_101' },
        update: expect.objectContaining({
          status: PaymentWebhookStatus.processed,
          paymentId: 'pay-db-id',
        }),
        create: expect.objectContaining({
          razorpayEventId: 'evt_101',
          eventType: 'refund.processed',
          status: PaymentWebhookStatus.processed,
          paymentId: 'pay-db-id',
        }),
      });
    });

    it('should resolve order via nested Razorpay webhook payload format', async () => {
      const dto = {
        entity: 'event',
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_007',
              payment_id: 'pay_rzp_123',
              amount: 50000,
              status: 'processed',
            },
          },
          payment: {
            entity: {
              id: 'pay_rzp_123',
              order_id: 'order_rzp_abc',
            },
          },
        },
      };

      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-db-id',
        orderId: testOrderId,
      });
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.refunded,
      });

      const result = await service.handleRefundWebhook(dto);

      expect(result.status).toBe('success');
      expect(result.orderId).toBe(testOrderId);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: testOrderId },
        data: { status: OrderStatus.refunded },
      });
    });

    it('should throw BadRequestException if orderId cannot be resolved', async () => {
      const dto = {
        event: 'refund.processed',
      };

      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);

      await expect(service.handleRefundWebhook(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if order does not exist', async () => {
      const dto = {
        event: 'refund.processed',
        orderId: 'non-existent-order',
      };

      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.handleRefundWebhook(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
