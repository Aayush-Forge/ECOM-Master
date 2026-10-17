import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus, PaymentWebhookStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentsService } from './payments.service.js';
import { RazorpayService } from './razorpay.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RAZORPAY_CONFIG } from './razorpay.config.js';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let razorpayService: RazorpayService;
  let prismaService: any;
  let eventEmitter: any;

  beforeEach(async () => {
    eventEmitter = {
      emit: jest.fn(),
    };

    prismaService = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      paymentWebhookEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prismaService)),
    };

    const mockRazorpayService = {
      createOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: RazorpayService, useValue: mockRazorpayService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    razorpayService = module.get<RazorpayService>(RazorpayService);
  });

  it('should throw NotFoundException if order does not exist', async () => {
    prismaService.order.findUnique.mockResolvedValue(null);

    await expect(service.createSession('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException with exact message if status is not payment_pending', async () => {
    prismaService.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.paid,
      grandTotal: 260,
      currency: 'INR',
    });

    await expect(service.createSession('order-1')).rejects.toThrow(
      new BadRequestException(
        "Order is in status 'paid', expected 'payment_pending'",
      ),
    );
  });

  it('should return existing payment session idempotently if status is CREATED', async () => {
    prismaService.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-TEST-002',
      status: OrderStatus.payment_pending,
      grandTotal: 260,
      currency: 'INR',
    });

    prismaService.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      razorpayOrderId: 'order_rzp_existing_123',
      status: PaymentStatus.CREATED,
      amount: 260,
      currency: 'INR',
    });

    const result = await service.createSession('order-1');

    expect(result).toEqual({
      razorpayOrderId: 'order_rzp_existing_123',
      amount: 260,
      currency: 'INR',
      keyId: RAZORPAY_CONFIG.keyId,
    });
    expect(razorpayService.createOrder).not.toHaveBeenCalled();
    expect(prismaService.payment.create).not.toHaveBeenCalled();
  });

  it('should call RazorpayService, create payment row, and return session data', async () => {
    prismaService.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-TEST-002',
      status: OrderStatus.payment_pending,
      grandTotal: 260,
      currency: 'INR',
    });

    prismaService.payment.findFirst.mockResolvedValue(null);

    (razorpayService.createOrder as jest.Mock).mockResolvedValue({
      id: 'order_rzp_new_456',
      amount: 26000,
      currency: 'INR',
      receipt: 'ORD-TEST-002',
      status: 'created',
    });

    prismaService.payment.create.mockResolvedValue({
      id: 'pay-2',
      orderId: 'order-1',
      razorpayOrderId: 'order_rzp_new_456',
      status: PaymentStatus.CREATED,
      amount: 260,
      currency: 'INR',
    });

    const result = await service.createSession('order-1');

    expect(razorpayService.createOrder).toHaveBeenCalledWith(
      26000,
      'INR',
      'ORD-TEST-002',
    );
    expect(prismaService.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 'order-1',
        razorpayOrderId: 'order_rzp_new_456',
        status: PaymentStatus.CREATED,
        amount: 260,
        currency: 'INR',
      },
    });
    expect(result).toEqual({
      razorpayOrderId: 'order_rzp_new_456',
      amount: 260,
      currency: 'INR',
      keyId: RAZORPAY_CONFIG.keyId,
    });
  });

  describe('verifyPayment', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyPayment({
          orderId: 'non-existent-order',
          razorpayOrderId: 'rzp_order_1',
          razorpayPaymentId: 'rzp_pay_1',
          razorpaySignature: 'sig_1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if payment row does not exist', async () => {
      prismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.payment_pending,
      });
      prismaService.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyPayment({
          orderId: 'order-1',
          razorpayOrderId: 'rzp_order_1',
          razorpayPaymentId: 'rzp_pay_1',
          razorpaySignature: 'sig_1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should capture payment and transition order to paid', async () => {
      prismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.payment_pending,
      });
      prismaService.payment.findFirst.mockResolvedValue({
        id: 'payment-1',
        orderId: 'order-1',
        razorpayOrderId: 'rzp_order_1',
        status: PaymentStatus.CREATED,
      });

      const result = await service.verifyPayment({
        orderId: 'order-1',
        razorpayOrderId: 'rzp_order_1',
        razorpayPaymentId: 'rzp_pay_1',
        razorpaySignature: 'sig_1',
      });

      expect(result).toEqual({
        success: true,
        orderId: 'order-1',
        status: OrderStatus.paid,
      });
      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          razorpayPaymentId: 'rzp_pay_1',
          razorpaySignature: 'sig_1',
          status: PaymentStatus.CAPTURED,
        },
      });
      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: OrderStatus.paid,
          placedAt: expect.any(Date),
        },
      });
    });
  });

  describe('handleWebhook', () => {
    it('should return already_processed if webhook event was previously processed', async () => {
      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue({
        id: 'evt_row_1',
        razorpayEventId: 'evt_123',
        status: PaymentWebhookStatus.processed,
      });

      const result = await service.handleWebhook({
        id: 'evt_123',
        event: 'payment.captured',
      });

      expect(result).toEqual({
        received: true,
        status: 'already_processed',
        eventId: 'evt_123',
      });
      expect(prismaService.paymentWebhookEvent.create).not.toHaveBeenCalled();
    });

    it('should process payment.captured event idempotently and transition order to paid', async () => {
      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prismaService.paymentWebhookEvent.create.mockResolvedValue({
        id: 'evt_row_1',
        razorpayEventId: 'evt_cap_1',
        status: PaymentWebhookStatus.received,
      });

      prismaService.payment.findFirst.mockResolvedValue({
        id: 'pmt_1',
        orderId: 'order_1',
        razorpayOrderId: 'order_rzp_1',
        status: PaymentStatus.CREATED,
        order: {
          id: 'order_1',
          status: OrderStatus.payment_pending,
        },
      });

      const payload = {
        id: 'evt_cap_1',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_1',
              order_id: 'order_rzp_1',
              status: 'captured',
              method: 'upi',
            },
          },
        },
      };

      const result = await service.handleWebhook(payload);

      expect(result).toEqual({
        received: true,
        status: 'processed',
        eventId: 'evt_cap_1',
        eventType: 'payment.captured',
      });

      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'pmt_1' },
        data: {
          razorpayPaymentId: 'pay_rzp_1',
          status: PaymentStatus.CAPTURED,
          method: 'upi',
        },
      });

      expect(prismaService.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order_1', status: OrderStatus.payment_pending },
        data: {
          status: OrderStatus.paid,
          placedAt: expect.any(Date),
        },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('order.paid', {
        orderId: 'order_1',
      });

      expect(prismaService.paymentWebhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt_row_1' },
        data: {
          status: PaymentWebhookStatus.processed,
          processedAt: expect.any(Date),
          paymentId: 'pmt_1',
        },
      });
    });

    it('should process refund.processed webhook and transition order to refunded', async () => {
      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prismaService.paymentWebhookEvent.create.mockResolvedValue({
        id: 'evt_row_2',
        razorpayEventId: 'evt_ref_1',
        status: PaymentWebhookStatus.received,
      });

      prismaService.payment.findFirst.mockResolvedValue({
        id: 'pmt_1',
        orderId: 'order_1',
        razorpayPaymentId: 'pay_rzp_1',
        status: PaymentStatus.CAPTURED,
        order: {
          id: 'order_1',
          status: OrderStatus.paid,
        },
      });

      const payload = {
        id: 'evt_ref_1',
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_rzp_1',
              payment_id: 'pay_rzp_1',
              amount: 26000,
              status: 'processed',
            },
          },
          payment: {
            entity: {
              id: 'pay_rzp_1',
              order_id: 'order_rzp_1',
            },
          },
        },
      };

      const result = await service.handleWebhook(payload);

      expect(result).toEqual({
        received: true,
        status: 'processed',
        eventId: 'evt_ref_1',
        eventType: 'refund.processed',
      });

      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'pmt_1' },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order_1' },
        data: {
          status: OrderStatus.refunded,
        },
      });

      expect(prismaService.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order_1',
          fromStatus: OrderStatus.paid,
          toStatus: OrderStatus.refunded,
          changedBySystem: 'Razorpay Webhook Refund',
          note: expect.stringContaining('rfnd_rzp_1'),
        },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('order.refunded', {
        orderId: 'order_1',
        refundId: 'rfnd_rzp_1',
      });

      expect(prismaService.paymentWebhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt_row_2' },
        data: {
          status: PaymentWebhookStatus.processed,
          processedAt: expect.any(Date),
          paymentId: 'pmt_1',
        },
      });
    });

    it('should result in 1 history row and 1 order.paid emit when verify runs before webhook', async () => {
      const orderState: any = {
        id: 'order_1',
        status: OrderStatus.payment_pending,
        grandTotal: 260,
        currency: 'INR',
        placedAt: null,
      };
      const paymentState: any = {
        id: 'pmt_1',
        orderId: 'order_1',
        razorpayOrderId: 'order_rzp_1',
        status: PaymentStatus.CREATED,
        order: orderState,
      };

      prismaService.order.findUnique.mockImplementation(() => Promise.resolve(orderState));
      prismaService.payment.findFirst.mockImplementation(() => Promise.resolve(paymentState));
      prismaService.payment.update.mockImplementation(({ data }: any) => {
        Object.assign(paymentState, data);
        return Promise.resolve(paymentState);
      });
      prismaService.order.update.mockImplementation(({ data }: any) => {
        Object.assign(orderState, data);
        return Promise.resolve(orderState);
      });

      const verifyRes = await service.verifyPayment({
        orderId: 'order_1',
        razorpayOrderId: 'order_rzp_1',
        razorpayPaymentId: 'pay_rzp_1',
        razorpaySignature: 'sig_test',
      });
      expect(verifyRes.success).toBe(true);
      expect(prismaService.orderStatusHistory.create).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith('order.paid', { orderId: 'order_1' });

      eventEmitter.emit.mockClear();
      prismaService.orderStatusHistory.create.mockClear();

      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prismaService.paymentWebhookEvent.create.mockResolvedValue({
        id: 'evt_row_1',
        razorpayEventId: 'evt_cap_verify_then_webhook',
        status: PaymentWebhookStatus.received,
      });
      prismaService.order.updateMany.mockResolvedValue({ count: 0 });

      const webhookPayload = {
        id: 'evt_cap_verify_then_webhook',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_1',
              order_id: 'order_rzp_1',
              amount: 26000,
              currency: 'INR',
              method: 'upi',
            },
          },
        },
      };

      const webhookRes = await service.handleWebhook(webhookPayload);
      expect(webhookRes.status).toBe('processed');
      expect(prismaService.orderStatusHistory.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalledWith('order.paid', expect.anything());
    });

    it('should result in 1 history row and 1 order.paid emit when webhook runs before verify', async () => {
      const orderState: any = {
        id: 'order_2',
        status: OrderStatus.payment_pending,
        grandTotal: 260,
        currency: 'INR',
        placedAt: null,
      };
      const paymentState: any = {
        id: 'pmt_2',
        orderId: 'order_2',
        razorpayOrderId: 'order_rzp_2',
        status: PaymentStatus.CREATED,
        order: orderState,
      };

      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prismaService.paymentWebhookEvent.create.mockResolvedValue({
        id: 'evt_row_2',
        razorpayEventId: 'evt_cap_webhook_first',
        status: PaymentWebhookStatus.received,
      });
      prismaService.payment.findFirst.mockResolvedValue(paymentState);
      prismaService.order.updateMany.mockImplementation(() => {
        orderState.status = OrderStatus.paid;
        return Promise.resolve({ count: 1 });
      });
      prismaService.payment.update.mockImplementation(({ data }: any) => {
        Object.assign(paymentState, data);
        return Promise.resolve(paymentState);
      });

      const webhookPayload = {
        id: 'evt_cap_webhook_first',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_2',
              order_id: 'order_rzp_2',
              amount: 26000,
              currency: 'INR',
              method: 'card',
            },
          },
        },
      };

      const webhookRes = await service.handleWebhook(webhookPayload);
      expect(webhookRes.status).toBe('processed');
      expect(prismaService.orderStatusHistory.create).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith('order.paid', { orderId: 'order_2' });

      prismaService.orderStatusHistory.create.mockClear();
      eventEmitter.emit.mockClear();

      prismaService.order.findUnique.mockResolvedValue(orderState);
      prismaService.payment.findFirst.mockResolvedValue(paymentState);

      const verifyRes = await service.verifyPayment({
        orderId: 'order_2',
        razorpayOrderId: 'order_rzp_2',
        razorpayPaymentId: 'pay_rzp_2',
        razorpaySignature: 'sig_test',
      });

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.status).toBe(OrderStatus.paid);
      expect(prismaService.orderStatusHistory.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should be a no-op when a duplicate webhook event id is received', async () => {
      prismaService.paymentWebhookEvent.findUnique.mockResolvedValue({
        id: 'existing_evt_row',
        razorpayEventId: 'evt_duplicate_id',
        status: PaymentWebhookStatus.processed,
      });

      const payload = {
        id: 'evt_duplicate_id',
        event: 'payment.captured',
        payload: {},
      };

      const result = await service.handleWebhook(payload);

      expect(result).toEqual({
        received: true,
        status: 'already_processed',
        eventId: 'evt_duplicate_id',
      });
      expect(prismaService.payment.findFirst).not.toHaveBeenCalled();
      expect(prismaService.orderStatusHistory.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
