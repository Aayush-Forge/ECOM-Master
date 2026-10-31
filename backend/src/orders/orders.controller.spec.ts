import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuditLogsService } from '../audit/audit-logs.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/roles.constants';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: any;
  let reflector: Reflector;

  beforeEach(async () => {
    ordersService = {
      createOrder: jest.fn(),
      getOrder: jest.fn(),
      getOrderById: jest.fn(),
      updateStatus: jest.fn(),
      getAllOrders: jest.fn(),
      handleRefundWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        { provide: AuditLogsService, useValue: { createLog: jest.fn() } },
        Reflector,
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getOrderById with id', async () => {
    const mockOrder = { id: 'ord_123' };
    ordersService.getOrderById.mockResolvedValue(mockOrder);

    const result = await controller.getOrderById('ord_123');
    expect(ordersService.getOrderById).toHaveBeenCalledWith('ord_123');
    expect(result).toBe(mockOrder);
  });

  it('should call updateStatus with params and req.user.userId', async () => {
    const mockUpdated = { id: 'ord_123', status: OrderStatus.paid };
    ordersService.updateStatus.mockResolvedValue(mockUpdated);

    const req = { user: { userId: 'user_456' } };
    const body = { toStatus: OrderStatus.paid, note: 'Payment verified' };

    const result = await controller.updateStatus('ord_123', body as any, req);

    expect(ordersService.updateStatus).toHaveBeenCalledWith(
      'ord_123',
      OrderStatus.paid,
      'Payment verified',
      'user_456',
      undefined,
      undefined,
    );
    expect(result).toBe(mockUpdated);
  });

  it('should call getAllOrders with query params', async () => {
    const mockList = { data: [{ id: 'ord_1' }], meta: { total: 1 } };
    ordersService.getAllOrders.mockResolvedValue(mockList);

    const query = { status: 'paid', page: 1, per_page: 20, search: 'test' } as any;
    const result = await controller.getAllOrders(query);
    expect(ordersService.getAllOrders).toHaveBeenCalledWith('paid', 1, 20, 'test', undefined, undefined, undefined, undefined);
    expect(result).toBe(mockList);
  });

  describe('handleRefundWebhook', () => {
    it('should have @Public() metadata so that JWT guard allows webhook requests', () => {
      const isPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        controller.handleRefundWebhook,
      );
      expect(isPublic).toBe(true);
    });

    it('should delegate webhook payload and signature to OrdersService', async () => {
      const dto = {
        event: 'refund.processed',
        orderId: 'test-order-uuid',
      };
      const signature = 'test-sig-123';
      const expectedResult = {
        status: 'success',
        message: 'Order test-order-uuid updated to refunded status',
        orderId: 'test-order-uuid',
      };

      ordersService.handleRefundWebhook.mockResolvedValue(expectedResult);

      const result = await controller.handleRefundWebhook(dto as any, signature);

      expect(ordersService.handleRefundWebhook).toHaveBeenCalledWith(
        dto,
        signature,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
