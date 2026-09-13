import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController', () => {
  let controller: CartController;
  const cartService = {
    getCart: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: cartService }],
    }).compile();

    controller = module.get<CartController>(CartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes headers and body through to CartService.addItem', () => {
    void controller.addItem(
      { productId: 'prod-1', quantity: 1 },
      'Bearer token',
      'session-token',
    );

    expect(cartService.addItem).toHaveBeenCalledWith(
      'Bearer token',
      'session-token',
      { productId: 'prod-1', quantity: 1 },
    );
  });
});
