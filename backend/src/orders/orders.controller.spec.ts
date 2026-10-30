import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { IS_PUBLIC_KEY } from '../auth/roles.constants';

describe('OrdersController', () => {
  let controller: OrdersController;
  let reflector: Reflector;

  const mockOrdersService = {
    createOrder: jest.fn(),
    getOrder: jest.fn(),
    handleRefundWebhook: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
        Reflector,
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

      mockOrdersService.handleRefundWebhook.mockResolvedValue(expectedResult);

      const result = await controller.handleRefundWebhook(dto, signature);

      expect(mockOrdersService.handleRefundWebhook).toHaveBeenCalledWith(
        dto,
        signature,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createOrder and getOrder', () => {
    it('should delegate createOrder to OrdersService', async () => {
      const dto = { items: [{ productId: 'p1', quantity: 2 }] };
      mockOrdersService.createOrder.mockResolvedValue({ id: 'ord-1' });

      const res = await controller.createOrder(dto as any);
      expect(mockOrdersService.createOrder).toHaveBeenCalledWith(dto);
      expect(res).toEqual({ id: 'ord-1' });
    });

    it('should delegate getOrder to OrdersService', async () => {
      mockOrdersService.getOrder.mockResolvedValue({ id: 'ord-1' });

      const res = await controller.getOrder('ord-1');
      expect(mockOrdersService.getOrder).toHaveBeenCalledWith('ord-1');
      expect(res).toEqual({ id: 'ord-1' });
    });
  });
});
