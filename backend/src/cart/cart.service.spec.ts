import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CartService } from './cart.service';
import { CartPricingService } from './cart-pricing.service';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../generated/prisma/client.js';
import { CartStatus } from '../generated/prisma/enums.js';

const d = (value: string) => new Prisma.Decimal(value);

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    cart: Record<string, jest.Mock>;
    cartItem: Record<string, jest.Mock>;
    product: Record<string, jest.Mock>;
    clubbingRule: Record<string, jest.Mock>;
  };
  let jwtService: { verifyAsync: jest.Mock };
  let pricingService: { calculate: jest.Mock };

  const activeCart = {
    id: 'cart-1',
    customerId: null,
    sessionToken: 'guest-token',
    status: CartStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const product = {
    id: 'prod-1',
    title: 'Widget',
    basePrice: d('50.00'),
    salePrice: null,
    stockQuantity: 10,
    categoryId: 'cat-1',
  };

  beforeEach(async () => {
    prisma = {
      cart: { findFirst: jest.fn(), create: jest.fn() },
      cartItem: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: { findUnique: jest.fn() },
      clubbingRule: { findMany: jest.fn().mockResolvedValue([]) },
    };
    jwtService = { verifyAsync: jest.fn() };
    pricingService = {
      calculate: jest.fn().mockReturnValue({
        items: [],
        subtotal: '0.00',
        discountTotal: '0.00',
        taxableAmount: '0.00',
        taxTotal: '0.00',
        grandTotal: '0.00',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: CartPricingService, useValue: pricingService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('addItem', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.cart.findFirst.mockResolvedValue(activeCart);
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(undefined, 'guest-token', {
          productId: 'missing',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when requested quantity exceeds stock', async () => {
      prisma.cart.findFirst.mockResolvedValue(activeCart);
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stockQuantity: 2,
      });
      prisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(undefined, 'guest-token', {
          productId: 'prod-1',
          quantity: 5,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
    });

    it('creates a new cart item using the current product price, ignoring any client-supplied price', async () => {
      prisma.cart.findFirst.mockResolvedValue(activeCart);
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cartItem.findUnique.mockResolvedValue(null);

      await service.addItem(undefined, 'guest-token', {
        productId: 'prod-1',
        quantity: 2,
        // @ts-expect-error simulating a malicious/irrelevant client field
        unitPriceSnapshot: '0.01',
      });

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 2,
          unitPriceSnapshot: product.basePrice,
        },
      });
    });

    it('increments quantity instead of duplicating when the product is already in the cart', async () => {
      prisma.cart.findFirst.mockResolvedValue(activeCart);
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'prod-1',
        quantity: 3,
        unitPriceSnapshot: d('50.00'),
      });

      await service.addItem(undefined, 'guest-token', {
        productId: 'prod-1',
        quantity: 2,
      });

      expect(prisma.cartItem.create).not.toHaveBeenCalled();
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 5, unitPriceSnapshot: product.basePrice },
      });
    });

    it('creates a new guest cart with a generated session token when none exists', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue(activeCart);
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cartItem.findUnique.mockResolvedValue(null);

      const result = await service.addItem(undefined, undefined, {
        productId: 'prod-1',
        quantity: 1,
      });

      expect(prisma.cart.create).toHaveBeenCalledWith({
        data: {
          customerId: undefined,
          sessionToken: expect.any(String),
          status: CartStatus.ACTIVE,
        },
      });
      expect(result.sessionToken).toBe(activeCart.sessionToken);
    });

    it('throws UnauthorizedException for an invalid bearer token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));

      await expect(
        service.addItem('Bearer bad-token', undefined, {
          productId: 'prod-1',
          quantity: 1,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateItem', () => {
    const item = {
      id: 'item-1',
      cartId: 'cart-1',
      productId: 'prod-1',
      quantity: 2,
      unitPriceSnapshot: d('50.00'),
      cart: activeCart,
    };

    it('throws NotFoundException when the cart item does not exist', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateItem(undefined, 'guest-token', 'missing', {
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the session token does not match the cart owner', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(item);

      await expect(
        service.updateItem(undefined, 'someone-elses-token', 'item-1', {
          quantity: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when the new quantity exceeds stock', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(item);
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stockQuantity: 3,
      });

      await expect(
        service.updateItem(undefined, 'guest-token', 'item-1', {
          quantity: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates the quantity using the current product price', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(item);
      prisma.product.findUnique.mockResolvedValue(product);

      await service.updateItem(undefined, 'guest-token', 'item-1', {
        quantity: 4,
      });

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 4, unitPriceSnapshot: product.basePrice },
      });
    });
  });

  describe('removeItem', () => {
    it('deletes the cart item after verifying ownership', async () => {
      const item = {
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'prod-1',
        quantity: 1,
        unitPriceSnapshot: d('50.00'),
        cart: activeCart,
      };
      prisma.cartItem.findUnique.mockResolvedValue(item);

      await service.removeItem(undefined, 'guest-token', 'item-1');

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });
  });

  describe('getCart', () => {
    it('queries clubbing rules filtered to active and currently within their date window', async () => {
      prisma.cart.findFirst.mockResolvedValue(activeCart);

      await service.getCart(undefined, 'guest-token');

      expect(prisma.clubbingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('returns an empty, unpersisted cart for a guest with no existing cart', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      const result = await service.getCart(undefined, undefined);

      expect(prisma.cart.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        cartId: null,
        sessionToken: null,
        items: [],
        subtotal: '0.00',
        discountTotal: '0.00',
        taxableAmount: '0.00',
        taxTotal: '0.00',
        grandTotal: '0.00',
      });
    });
  });
});
