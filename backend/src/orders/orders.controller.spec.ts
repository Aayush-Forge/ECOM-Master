import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuditLogsService } from '../audit/audit-logs.service';
import { Reflector } from '@nestjs/core';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: any;

  beforeEach(async () => {
    ordersService = {
      getOrderById: jest.fn(),
      updateStatus: jest.fn(),
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

    const result = await controller.updateStatus('ord_123', body, req);

    expect(ordersService.updateStatus).toHaveBeenCalledWith(
      'ord_123',
      OrderStatus.paid,
      'Payment verified',
      'user_456',
    );
    expect(result).toBe(mockUpdated);
  });
});
