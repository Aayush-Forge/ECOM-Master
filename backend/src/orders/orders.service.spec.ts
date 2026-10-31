import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus, PaymentWebhookStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ClubbingService } from '../clubbing/clubbing.service';
import { ShippingService } from '../shipping/shipping.service';
import { OrdersService } from './orders.service';
import { PricingService } from '../pricing/pricing.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: any;
  let eventEmitter: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.RAZORPAY_WEBHOOK_SECRET;

    prismaService = {
      product: {
        findMany: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
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
      $transaction: jest.fn((callback) => callback(prismaService)),
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ nextval: 1000 }]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        PricingService,
        { provide: PrismaService, useValue: prismaService },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: ClubbingService,
          useValue: {
            calculateCartDiscount: jest.fn().mockResolvedValue({ discountTotal: 0 }),
          },
        },
        {
          provide: ShippingService,
          useValue: {
            calculateShipping: jest.fn().mockResolvedValue({
              shippingTotal: 49,
              shippingTemplateName: 'Standard Delivery',
              shippingCarrier: 'Standard Delivery',
              shippingSnapshot: { templates: [], totalShippingCharge: 49 },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
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
      payments: [{ id: 'pay-db-id', status: PaymentStatus.CAPTURED }],
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
      expect(prismaService.order.update).not.toHaveBeenCalled();
    });

    it('should enforce HMAC signature verification when RAZORPAY_WEBHOOK_SECRET is set', async () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = 'test_secret_key';
      const dto = {
        event: 'refund.processed',
        orderId: testOrderId,
      };

      await expect(service.handleRefundWebhook(dto)).rejects.toThrow(
        UnauthorizedException,
      );

      await expect(
        service.handleRefundWebhook(dto, 'invalid_signature'),
      ).rejects.toThrow(UnauthorizedException);

      const validSignature = crypto
        .createHmac('sha256', 'test_secret_key')
        .update(JSON.stringify(dto))
        .digest('hex');

      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.order.update.mockResolvedValue({
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

      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue({
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
      expect(prismaService.order.update).not.toHaveBeenCalled();
    });

    it('should successfully update order status, payments, history, and webhook log via direct orderId', async () => {
      const dto = {
        id: 'evt_101',
        event: 'refund.processed',
        orderId: testOrderId,
      };

      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.refunded,
      });

      const result = await service.handleRefundWebhook(dto);

      expect(result.status).toBe('success');
      expect(result.orderId).toBe(testOrderId);
      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: testOrderId },
        data: { status: OrderStatus.refunded },
      });
      expect(prismaService.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId: testOrderId },
        data: { status: PaymentStatus.REFUNDED },
      });
      expect(prismaService.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: testOrderId,
          toStatus: OrderStatus.refunded,
          changedBySystem: 'webhook:refund.processed',
          note: expect.stringContaining('evt_101'),
        },
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

      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prismaService.payment.findFirst.mockResolvedValue({
        id: 'pay-db-id',
        orderId: testOrderId,
      });
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.refunded,
      });

      const result = await service.handleRefundWebhook(dto);

      expect(result.status).toBe('success');
      expect(result.orderId).toBe(testOrderId);
    });

    it('should throw BadRequestException if orderId cannot be resolved', async () => {
      const dto = {
        event: 'refund.processed',
      };

      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue(null);

      await expect(service.handleRefundWebhook(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if order does not exist', async () => {
      const dto = {
        event: 'refund.processed',
        orderId: 'non-existent-order',
      };

      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.handleRefundWebhook(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createOrder', () => {
    it('throws BadRequestException if items array is empty', async () => {
      await expect(
        service.createOrder({ items: [] } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateOrderNumber', () => {
    it('returns sequence based order number starting with SDO', async () => {
      const num = await service.generateOrderNumber();
      expect(num).toBe('SDO1000');
    });

    it('retries once if relation does not exist and creates sequence', async () => {
      prismaService.$queryRawUnsafe
        .mockRejectedValueOnce(new Error('relation order_number_seq does not exist'))
        .mockResolvedValueOnce([{ nextval: 1001 }]);
      prismaService.$executeRawUnsafe.mockResolvedValueOnce(1);

      const num = await service.generateOrderNumber();
      expect(num).toBe('SDO1001');
      expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('CREATE SEQUENCE IF NOT EXISTS order_number_seq'),
      );
    });

    it('throws InternalServerErrorException when sequence retry also fails', async () => {
      prismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB connection failed'));
      prismaService.$executeRawUnsafe.mockRejectedValue(new Error('Sequence creation failed'));

      await expect(service.generateOrderNumber()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
