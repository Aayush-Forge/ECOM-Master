import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { CartStatus } from '@prisma/client';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: any;
  let pricingService: any;

  const rawToken = 'test-guest-token-12345';
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const activeCart = {
    id: 'cart-1',
    customerId: null,
    sessionToken: hashedToken,
    status: CartStatus.active,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const product = {
    id: 'b7c02b93-5494-4dc4-b770-f8607147b111',
    title: 'Test Herbal Tea',
    slug: 'test-herbal-tea',
    sku: 'TEA-001',
    basePrice: 50,
    salePrice: null,
    status: 'active',
    stockQuantity: 10,
  };

  beforeEach(async () => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cartItem: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
      },
    };

    pricingService = {
      calculatePricing: jest.fn().mockResolvedValue({
        items: [],
        subtotal: 0,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        grandTotal: 0,
        appliedCouponCode: null,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: pricingService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('createCart', () => {
    it('creates a new cart with a hashed token and returns raw token with totals', async () => {
      prisma.cart.create.mockResolvedValue({
        id: 'new-cart-1',
        sessionToken: 'some-hash',
        customerId: null,
        status: CartStatus.active,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createCart();

      expect(res.id).toBe('new-cart-1');
      expect(res.token).toBeDefined();
      expect(res.status).toBe(CartStatus.active);
      expect(res.grandTotal).toBe(0);
      expect(prisma.cart.create).toHaveBeenCalled();
    });
  });

  describe('getCart & validateAccess', () => {
    it('throws NotFoundException when cart is not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(service.getCart('missing-id', rawToken)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when session token is invalid', async () => {
      prisma.cart.findUnique.mockResolvedValue(activeCart);

      await expect(service.getCart('cart-1', 'wrong-token')).rejects.toThrow(NotFoundException);
    });

    it('returns cart with computed pricing when token matches', async () => {
      prisma.cart.findUnique.mockResolvedValue(activeCart);

      const res = await service.getCart('cart-1', rawToken);

      expect(res.id).toBe('cart-1');
      expect(pricingService.calculatePricing).toHaveBeenCalled();
    });

    it('authorizes logged-in user when user ID matches cart customerId', async () => {
      const userCart = {
        ...activeCart,
        customerId: 'user-123',
      };
      prisma.cart.findUnique.mockResolvedValue(userCart);

      const res = await service.getCart('cart-1', undefined, { userId: 'user-123' });

      expect(res.id).toBe('cart-1');
      expect(pricingService.calculatePricing).toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    it('throws BadRequestException when cart is already converted', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        ...activeCart,
        status: CartStatus.converted,
      });

      await expect(
        service.addItem('cart-1', { productId: product.id, quantity: 1 }, rawToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when product cannot be found', async () => {
      prisma.cart.findUnique.mockResolvedValue(activeCart);
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.addItem('cart-1', { productId: 'unknown-prod', quantity: 1 }, rawToken),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates new cartItem when item is not currently in cart', async () => {
      prisma.cart.findUnique.mockResolvedValue(activeCart);
      prisma.product.findFirst.mockResolvedValue(product);
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await service.addItem('cart-1', { productId: product.id, quantity: 2 }, rawToken);

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-1',
          productId: product.id,
          variationId: null,
          quantity: 2,
          unitPriceSnapshot: 0,
        },
      });
    });

    it('updates quantity when item already exists in cart', async () => {
      prisma.cart.findUnique.mockResolvedValue(activeCart);
      prisma.product.findFirst.mockResolvedValue(product);
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'item-existing-1',
        cartId: 'cart-1',
        productId: product.id,
        quantity: 3,
      });

      await service.addItem('cart-1', { productId: product.id, quantity: 2 }, rawToken);

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-existing-1' },
        data: { quantity: 5 },
      });
    });
  });

  describe('updateItem', () => {
    it('throws NotFoundException if item does not exist in cart', async () => {
      prisma.cart.findUnique.mockResolvedValue(activeCart);
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem('cart-1', 'missing-item', { quantity: 2 }, rawToken),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates quantity when new quantity is positive', async () => {
      prisma.cart.findUnique.mockResolvedValue(activeCart);
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-1', cartId: 'cart-1', quantity: 1 });

      await service.updateItem('cart-1', 'item-1', { quantity: 4 }, rawToken);

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 4 },
      });
    });

    it('deletes item when quantity is 0', async () => {
      prisma.cart.findUnique.mockResolvedValue(activeCart);
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-1', cartId: 'cart-1', quantity: 1 });

      await service.updateItem('cart-1', 'item-1', { quantity: 0 }, rawToken);

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });
  });

  describe('removeItem', () => {
    it('throws NotFoundException if item does not exist', async () => {
      prisma.cart.findUnique.mockResolvedValue(activeCart);
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.removeItem('cart-1', 'missing-item', rawToken),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes the item from cart', async () => {
      prisma.cart.findUnique.mockResolvedValue(activeCart);
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-1', cartId: 'cart-1' });

      await service.removeItem('cart-1', 'item-1', rawToken);

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });
  });
});
