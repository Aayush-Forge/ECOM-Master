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
    void controller.addItem('cart-id', { productId: 'prod-1', quantity: 1 }, 'session-token', { user: { userId: 'u1' } });

    expect(cartService.addItem).toHaveBeenCalledWith('cart-id', { productId: 'prod-1', quantity: 1 }, 'session-token', { userId: 'u1' });
  });
});
