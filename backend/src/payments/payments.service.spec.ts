import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentsService } from './payments.service.js';
import { RazorpayService } from './razorpay.service.js';
import { RAZORPAY_CONFIG } from './razorpay.config.js';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let razorpayService: RazorpayService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
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
});
