import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClubbingService } from '../clubbing/clubbing.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: any;
  let eventEmitter: any;

  beforeEach(async () => {
    prismaService = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaService },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: ClubbingService,
          useValue: {
            calculateCartDiscount: jest.fn().mockResolvedValue({ discountTotal: 0 }),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('throws BadRequestException if items array is empty', async () => {
      await expect(
        service.createOrder({ items: [] } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if products do not exist', async () => {
      prismaService.product = { findMany: jest.fn().mockResolvedValue([]) };
      await expect(
        service.createOrder({
          items: [{ productId: 'missing-p1', quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates order with snapshotted items', async () => {
      prismaService.product = {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            title: 'Sandalwood Incense',
            sku: 'INC-001',
            basePrice: 200,
            salePrice: 150,
          },
        ]),
      };
      prismaService.order.create = jest.fn().mockResolvedValue({
        id: 'ord-123',
        grandTotal: 300,
      });

      const result = await service.createOrder(
        { items: [{ productId: 'p1', quantity: 2 }] },
        'customer-1',
      );

      expect(prismaService.order.create).toHaveBeenCalled();
      expect(result.id).toBe('ord-123');
    });
  });

  describe('getOrderById', () => {
    it('should return order if found', async () => {
      const mockOrder = { id: 'ord_1', items: [], addresses: [], statusHistory: [] };
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOrderById('ord_1');
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if missing', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrderById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('ord_999', OrderStatus.paid, undefined, 'user_1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if toStatus is refunded', async () => {
      prismaService.order.findUnique.mockResolvedValue({ id: 'ord_1', status: OrderStatus.paid });

      await expect(
        service.updateStatus('ord_1', OrderStatus.refunded, undefined, 'user_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if transition is invalid', async () => {
      prismaService.order.findUnique.mockResolvedValue({ id: 'ord_1', status: OrderStatus.shipped });

      // shipped can only transition to delivered
      await expect(
        service.updateStatus('ord_1', OrderStatus.processing, undefined, 'user_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if transitioning to cancelled without a note', async () => {
      prismaService.order.findUnique.mockResolvedValue({ id: 'ord_1', status: OrderStatus.processing });

      await expect(
        service.updateStatus('ord_1', OrderStatus.cancelled, '', 'user_1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateStatus('ord_1', OrderStatus.cancelled, undefined, 'user_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should execute transaction and emit event on valid transition', async () => {
      const existingOrder = { id: 'ord_1', status: OrderStatus.payment_pending };
      prismaService.order.findUnique.mockResolvedValue(existingOrder);

      const updatedResult = { ...existingOrder, status: OrderStatus.paid };
      prismaService.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          order: { update: jest.fn().mockResolvedValue(updatedResult) },
          orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      const result = await service.updateStatus('ord_1', OrderStatus.paid, 'Payment verified', 'user_admin');

      expect(result.status).toBe(OrderStatus.paid);
      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith('order.status_changed', {
        orderId: 'ord_1',
        fromStatus: OrderStatus.payment_pending,
        toStatus: OrderStatus.paid,
        changedById: 'user_admin',
      });
    });
  });
});
