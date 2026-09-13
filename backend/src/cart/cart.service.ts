import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { PrismaService } from '../prisma.service';
import { CartPricingService } from './cart-pricing.service';
import { Cart } from '../generated/prisma/client.js';
import { CartStatus } from '../generated/prisma/enums.js';

interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class CartService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly pricingService: CartPricingService,
  ) {}

  async getCart(authHeader?: string, sessionToken?: string) {
    const user = await this.resolveUser(authHeader);
    const cart = await this.findActiveCart(user, sessionToken);

    if (!cart) {
      if (user) {
        // Authenticated identity is stable, so it's safe to lazily create
        // their cart the first time it's requested.
        const created = await this.createCart(user);
        return this.buildCartResponse(created);
      }
      // A guest with no session token (or an unrecognized one) has no cart
      // to persist yet — return an empty, unpersisted cart shape instead of
      // writing a throwaway row for every anonymous page view.
      return this.emptyCartResponse();
    }

    return this.buildCartResponse(cart);
  }

  async addItem(
    authHeader: string | undefined,
    sessionToken: string | undefined,
    dto: CreateCartDto,
  ) {
    const user = await this.resolveUser(authHeader);
    let cart = await this.findActiveCart(user, sessionToken);
    if (!cart) {
      cart = await this.createCart(user);
    }

    const product = await this.prismaService.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existingItem = await this.prismaService.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: cart.id, productId: dto.productId },
      },
    });

    const requestedTotalQuantity = (existingItem?.quantity ?? 0) + dto.quantity;

    if (product.stockQuantity < requestedTotalQuantity) {
      throw new BadRequestException(
        `Insufficient stock for "${product.title}". Available: ${product.stockQuantity}, requested: ${requestedTotalQuantity}`,
      );
    }

    const unitPrice = product.salePrice ?? product.basePrice;

    if (existingItem) {
      await this.prismaService.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: requestedTotalQuantity,
          unitPriceSnapshot: unitPrice,
        },
      });
    } else {
      await this.prismaService.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
          unitPriceSnapshot: unitPrice,
        },
      });
    }

    return this.buildCartResponse(cart, cart.sessionToken ?? undefined);
  }

  async updateItem(
    authHeader: string | undefined,
    sessionToken: string | undefined,
    itemId: string,
    dto: UpdateCartDto,
  ) {
    const user = await this.resolveUser(authHeader);
    const item = await this.findOwnedCartItem(user, sessionToken, itemId);

    const product = await this.prismaService.product.findUnique({
      where: { id: item.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock for "${product.title}". Available: ${product.stockQuantity}, requested: ${dto.quantity}`,
      );
    }

    const unitPrice = product.salePrice ?? product.basePrice;

    await this.prismaService.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity, unitPriceSnapshot: unitPrice },
    });

    return this.buildCartResponse(item.cart);
  }

  async removeItem(
    authHeader: string | undefined,
    sessionToken: string | undefined,
    itemId: string,
  ) {
    const user = await this.resolveUser(authHeader);
    const item = await this.findOwnedCartItem(user, sessionToken, itemId);

    await this.prismaService.cartItem.delete({ where: { id: item.id } });

    return this.buildCartResponse(item.cart);
  }

  private async resolveUser(
    authHeader?: string,
  ): Promise<JwtPayload | undefined> {
    if (!authHeader) {
      return undefined;
    }
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return undefined;
    }
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async findActiveCart(
    user: JwtPayload | undefined,
    sessionToken: string | undefined,
  ): Promise<Cart | null> {
    if (user) {
      return this.prismaService.cart.findFirst({
        where: { customerId: user.sub, status: CartStatus.ACTIVE },
      });
    }
    if (sessionToken) {
      return this.prismaService.cart.findFirst({
        where: { sessionToken, status: CartStatus.ACTIVE },
      });
    }
    return null;
  }

  private async createCart(user: JwtPayload | undefined): Promise<Cart> {
    return this.prismaService.cart.create({
      data: {
        customerId: user?.sub,
        sessionToken: user ? null : randomUUID(),
        status: CartStatus.ACTIVE,
      },
    });
  }

  private async findOwnedCartItem(
    user: JwtPayload | undefined,
    sessionToken: string | undefined,
    itemId: string,
  ) {
    const item = await this.prismaService.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    this.assertOwnership(item.cart, user, sessionToken);
    return item;
  }

  private assertOwnership(
    cart: Cart,
    user: JwtPayload | undefined,
    sessionToken: string | undefined,
  ): void {
    if (cart.customerId) {
      if (!user || cart.customerId !== user.sub) {
        throw new ForbiddenException('You do not have access to this cart');
      }
      return;
    }
    if (!sessionToken || cart.sessionToken !== sessionToken) {
      throw new ForbiddenException('You do not have access to this cart');
    }
  }

  private emptyCartResponse() {
    return {
      cartId: null,
      sessionToken: null,
      items: [],
      subtotal: '0.00',
      discountTotal: '0.00',
      taxableAmount: '0.00',
      taxTotal: '0.00',
      grandTotal: '0.00',
    };
  }

  private async buildCartResponse(cart: Cart, newSessionToken?: string) {
    const items = await this.prismaService.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: true },
    });

    const now = new Date();
    const rules = await this.prismaService.clubbingRule.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      include: { products: { select: { productId: true } } },
    });

    const calculation = this.pricingService.calculate(
      items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          categoryId: item.product.categoryId,
          basePrice: item.product.basePrice,
          salePrice: item.product.salePrice,
        },
      })),
      rules.map((rule) => ({
        name: rule.name,
        type: rule.type,
        requiredQuantity: rule.requiredQuantity,
        fixedPrice: rule.fixedPrice,
        percentageOff: rule.percentageOff,
        applicableCategoryId: rule.applicableCategoryId,
        productIds: rule.products.map((p) => p.productId),
      })),
    );

    return {
      cartId: cart.id,
      sessionToken: newSessionToken ?? cart.sessionToken,
      ...calculation,
    };
  }
}
