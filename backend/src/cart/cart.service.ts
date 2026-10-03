import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { CartStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  async createCart(customerId?: string | null) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const cart = await this.prisma.cart.create({
      data: {
        sessionToken: tokenHash,
        status: CartStatus.active,
        customerId: customerId || null,
      },
    });

    return {
      id: cart.id,
      token: rawToken,
      customerId: cart.customerId,
      status: cart.status,
      items: [],
      subtotal: 0,
      discountTotal: 0,
      shippingTotal: 0,
      taxTotal: 0,
      grandTotal: 0,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  async getCart(cartId: string, cartToken?: string, user?: { userId: string }) {
    const cart = await this.validateAccess(cartId, cartToken, user);
    return this.buildCartResponse(cart);
  }

  async addItem(
    cartId: string,
    dto: AddCartItemDto,
    cartToken?: string,
    user?: { userId: string },
  ) {
    const cart = await this.validateAccess(cartId, cartToken, user);

    if (cart.status === CartStatus.converted) {
      throw new BadRequestException('Converted cart cannot be modified');
    }

    const variationId = dto.variationId || null;

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        variationId,
      },
    });

    if (existingItem) {
      const mergedQty = Math.min(99, existingItem.quantity + dto.quantity);
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: mergedQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          variationId,
          quantity: dto.quantity,
          unitPriceSnapshot: 0,
        },
      });
    }

    const updatedCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    return this.buildCartResponse(updatedCart || cart);
  }

  async updateItem(
    cartId: string,
    itemId: string,
    dto: UpdateCartItemDto,
    cartToken?: string,
    user?: { userId: string },
  ) {
    const cart = await this.validateAccess(cartId, cartToken, user);

    if (cart.status === CartStatus.converted) {
      throw new BadRequestException('Converted cart cannot be modified');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({
        where: { id: itemId },
      });
    } else {
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: dto.quantity },
      });
    }

    const updatedCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    return this.buildCartResponse(updatedCart || cart);
  }

  async removeItem(
    cartId: string,
    itemId: string,
    cartToken?: string,
    user?: { userId: string },
  ) {
    const cart = await this.validateAccess(cartId, cartToken, user);

    if (cart.status === CartStatus.converted) {
      throw new BadRequestException('Converted cart cannot be modified');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    const updatedCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    return this.buildCartResponse(updatedCart || cart);
  }

  private async validateAccess(
    cartId: string,
    cartToken?: string,
    user?: { userId: string },
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    let isAuthorized = false;

    if (user?.userId && cart.customerId && user.userId === cart.customerId) {
      isAuthorized = true;
    }

    if (!isAuthorized && cartToken && typeof cartToken === 'string') {
      const hashedProvided = crypto
        .createHash('sha256')
        .update(cartToken)
        .digest('hex');

      const expectedBuf = Buffer.from(cart.sessionToken, 'utf8');
      const providedBuf = Buffer.from(hashedProvided, 'utf8');

      if (
        expectedBuf.length === providedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, providedBuf)
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new NotFoundException('Cart not found');
    }

    if (isAuthorized && user?.userId && !cart.customerId) {
      await this.prisma.cart
        .update({
          where: { id: cart.id },
          data: { customerId: user.userId },
        })
        .catch(() => {});
      cart.customerId = user.userId;
    }

    return cart;
  }

  private async buildCartResponse(cart: any) {
    const cartItems = Array.isArray(cart.items) ? cart.items : [];

    const pricingItemsInput = cartItems.map((ci: any) => ({
      productId: ci.productId,
      variationId: ci.variationId || null,
      quantity: ci.quantity,
    }));

    const pricingResult = await this.pricingService.calculatePricing(
      pricingItemsInput,
      { throwOnError: false },
    );

    const computedMap = new Map<string, any>();
    pricingResult.items.forEach((item, index) => {
      const key = `${item.productId}_${item.variationId || ''}_${index}`;
      computedMap.set(key, item);
    });

    const responseItems = cartItems.map((ci: any, index: number) => {
      const key = `${ci.productId}_${ci.variationId || ''}_${index}`;
      const comp = computedMap.get(key);

      return {
        id: ci.id,
        productId: ci.productId,
        variationId: ci.variationId || null,
        quantity: ci.quantity,
        title: comp?.titleSnapshot || 'Product',
        sku: comp?.skuSnapshot || '',
        image: comp?.image || null,
        unitPrice: comp?.unitPrice ?? 0,
        lineTotal: comp?.lineTotal ?? 0,
        attributes: comp?.attributesSnapshot || null,
        stockAvailable: comp?.stockAvailable ?? null,
        issues: comp?.issues || [],
      };
    });

    return {
      id: cart.id,
      customerId: cart.customerId,
      status: cart.status,
      items: responseItems,
      subtotal: pricingResult.subtotal,
      discountTotal: pricingResult.discountTotal,
      shippingTotal: pricingResult.shippingTotal,
      taxTotal: pricingResult.taxTotal,
      grandTotal: pricingResult.grandTotal,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
