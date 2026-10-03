import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClubbingService } from '../clubbing/clubbing.service';
import { CreateOrderDto } from './dto/create-order.dto';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.payment_pending]: [OrderStatus.paid, OrderStatus.cancelled],
  [OrderStatus.paid]: [OrderStatus.processing, OrderStatus.cancelled],
  [OrderStatus.processing]: [OrderStatus.shipped, OrderStatus.cancelled],
  [OrderStatus.shipped]: [OrderStatus.delivered],
  [OrderStatus.delivered]: [],
  [OrderStatus.cancelled]: [],
  [OrderStatus.refunded]: [],
  [OrderStatus.cart]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly clubbingService: ClubbingService,
  ) {}

  async createOrder(dto: CreateOrderDto, customerId?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prismaService.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products were not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;

    const discountInputItems: { productId: string; quantity: number; price: number }[] = [];

    const orderItemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      let unitPrice = Number(product.salePrice ?? product.basePrice);
      let skuSnapshot = product.sku;
      let titleSnapshot = product.title;
      let variantId: string | null = null;
      let attributesSnapshot: any = null;

      const isVariable = product.productType === ProductType.variable;

      if (isVariable) {
        if (!item.variationId) {
          throw new BadRequestException(
            `Variation ID is required for variable product "${product.title}"`,
          );
        }

        const variations = Array.isArray(product.variations)
          ? (product.variations as any[])
          : [];
        const variant = variations.find((v: any) => String(v.id) === String(item.variationId));

        if (!variant || variant.isActive === false) {
          throw new BadRequestException(
            `Active variation "${item.variationId}" not found for product "${product.title}"`,
          );
        }

        // Unit price comes strictly from the variation's effective price, never the client
        const regPrice = Number(variant.regularPrice);
        const salePrice =
          variant.salePrice !== undefined && variant.salePrice !== null
            ? Number(variant.salePrice)
            : null;
        unitPrice = salePrice !== null && salePrice < regPrice ? salePrice : regPrice;

        skuSnapshot = String(variant.sku);
        variantId = String(variant.id);
        attributesSnapshot = variant.attributes || [];

        const attrLabels = (variant.attributes || [])
          .map((a: any) => a.option || a.value)
          .filter(Boolean)
          .join(', ');
        titleSnapshot = attrLabels ? `${product.title} - ${attrLabels}` : product.title;

        // Stock validation (check only, no decrement)
        if (
          variant.stockQuantity !== null &&
          variant.stockQuantity !== undefined &&
          item.quantity > variant.stockQuantity
        ) {
          throw new BadRequestException(
            `Insufficient stock for variation "${variant.sku || variant.id}"`,
          );
        }
      } else {
        // Simple product
        if (item.variationId) {
          throw new BadRequestException(
            `Variation ID cannot be specified for simple product "${product.title}"`,
          );
        }

        if (
          product.stockQuantity !== null &&
          product.stockQuantity !== undefined &&
          item.quantity > product.stockQuantity
        ) {
          throw new BadRequestException(
            `Insufficient stock for product "${product.title}"`,
          );
        }
      }

      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      discountInputItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: unitPrice,
      });

      return {
        productId: product.id,
        variantId,
        attributesSnapshot,
        titleSnapshot,
        skuSnapshot,
        unitPriceSnapshot: unitPrice,
        quantity: item.quantity,
        lineTotal,
      };
    });

    let discountTotal = 0;
    try {
      const discountRes = await this.clubbingService.calculateCartDiscount(discountInputItems);
      discountTotal = Number(discountRes.discountTotal || 0);
    } catch {
      discountTotal = 0;
    }

    const shippingTotal = subtotal >= 499 || subtotal === 0 ? 0 : 49;
    const grandTotal = Math.max(0, subtotal - discountTotal + shippingTotal);

    const orderNumber = await this.generateOrderNumber();
    const effectiveCustomerId = customerId || null;

    let orderEmail: string | null = null;
    if (!effectiveCustomerId) {
      if (!dto.email || !dto.email.trim()) {
        throw new BadRequestException('Email is required for guest checkout');
      }
      orderEmail = dto.email.trim().toLowerCase();
    } else {
      if (dto.email && dto.email.trim()) {
        orderEmail = dto.email.trim().toLowerCase();
      } else {
        const customer = this.prismaService.user
          ? await this.prismaService.user.findUnique({
              where: { id: effectiveCustomerId },
              select: { email: true },
            })
          : null;
        orderEmail = customer?.email?.toLowerCase() || null;
      }
    }

    const addressCreates: any[] = [];
    if (dto.shippingAddress) {
      addressCreates.push({
        type: 'shipping',
        fullName: dto.shippingAddress.fullName,
        phone: dto.shippingAddress.phone,
        addressLine1: dto.shippingAddress.addressLine1,
        addressLine2: dto.shippingAddress.addressLine2 || null,
        city: dto.shippingAddress.city,
        state: dto.shippingAddress.state,
        postalCode: dto.shippingAddress.postalCode,
        country: dto.shippingAddress.country || 'IN',
      });
    }

    if (dto.billingAddress) {
      addressCreates.push({
        type: 'billing',
        fullName: dto.billingAddress.fullName,
        phone: dto.billingAddress.phone,
        addressLine1: dto.billingAddress.addressLine1,
        addressLine2: dto.billingAddress.addressLine2 || null,
        city: dto.billingAddress.city,
        state: dto.billingAddress.state,
        postalCode: dto.billingAddress.postalCode,
        country: dto.billingAddress.country || 'IN',
      });
    }

    const order = await this.prismaService.$transaction(async (tx) => {
      if (dto.couponCode && dto.couponCode.trim()) {
        const trimmedCode = dto.couponCode.trim();
        const updated = await tx.$executeRaw`
          UPDATE "clubbing_rules"
          SET "usage_count" = "usage_count" + 1
          WHERE LOWER("name") = LOWER(${trimmedCode})
            AND ("usage_limit" IS NULL OR "usage_count" < "usage_limit")
            AND "is_active" = true
        `;
        if (updated === 0) {
          throw new BadRequestException('Coupon is invalid or usage limit reached');
        }
      }

      return tx.order.create({
        data: {
          orderNumber,
          customerId: effectiveCustomerId,
          email: orderEmail,
          status: OrderStatus.payment_pending,
          subtotal,
          discountTotal,
          taxTotal: 0,
          shippingTotal,
          grandTotal,
          couponCode: dto.couponCode || null,
          items: {
            create: orderItemsData,
          },
          addresses: addressCreates.length > 0 ? { create: addressCreates } : undefined,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          addresses: true,
        },
      });
    });

    this.eventEmitter.emit('order.created', { orderId: order.id });

    return order;
  }

  async getOrderById(id: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        addresses: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getAllOrders(status?: string, page = 1, perPage = 20, search?: string) {
    const skip = (page - 1) * perPage;
    const where: any = {};

    if (status && status !== 'all') {
      where.status = status as OrderStatus;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { customer: { firstName: { contains: term, mode: 'insensitive' } } },
        { customer: { lastName: { contains: term, mode: 'insensitive' } } },
        { customer: { email: { contains: term, mode: 'insensitive' } } },
        { addresses: { some: { fullName: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prismaService.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
          addresses: true,
          statusHistory: {
            orderBy: { changedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prismaService.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async updateStatus(
    orderId: string,
    toStatus: OrderStatus,
    note: string | undefined,
    userId: string,
  ) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (toStatus === OrderStatus.refunded) {
      throw new BadRequestException(
        'Status refunded cannot be set directly; this status is webhook-only',
      );
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${order.status}' to '${toStatus}'`,
      );
    }

    if (toStatus === OrderStatus.cancelled && (!note || !note.trim())) {
      throw new BadRequestException('Note is required for cancellation');
    }

    const fromStatus = order.status;

    const updatedOrder = await this.prismaService.$transaction(async (tx) => {
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus,
          toStatus,
          changedById: userId,
          note: note ?? null,
        },
      });

      if (toStatus === OrderStatus.cancelled && order.couponCode && order.couponCode.trim()) {
        await tx.$executeRaw`
          UPDATE "clubbing_rules"
          SET "usage_count" = GREATEST(0, "usage_count" - 1)
          WHERE LOWER("name") = LOWER(${order.couponCode.trim()})
        `;
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: toStatus },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          items: true,
          addresses: true,
          statusHistory: {
            orderBy: { changedAt: 'desc' },
          },
        },
      });
    });

    this.eventEmitter.emit('order.status_changed', {
      orderId,
      fromStatus,
      toStatus,
      changedById: userId,
    });

    const statusEventMap: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.paid]: 'order.paid',
      [OrderStatus.processing]: 'order.processing',
      [OrderStatus.shipped]: 'order.shipped',
      [OrderStatus.delivered]: 'order.delivered',
      [OrderStatus.cancelled]: 'order.cancelled',
      [OrderStatus.refunded]: 'order.refunded',
    };
    const specificEvent = statusEventMap[toStatus];
    if (specificEvent) {
      this.eventEmitter.emit(specificEvent, { orderId });
    }

    return updatedOrder;
  }

  async getMyOrders(customerId: string, page = 1, perPage = 10) {
    const skip = (page - 1) * perPage;
    const [data, total] = await Promise.all([
      this.prismaService.order.findMany({
        where: { customerId },
        include: {
          items: true,
          addresses: true,
          statusHistory: {
            orderBy: { changedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prismaService.order.count({ where: { customerId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getMyOrderById(customerId: string, id: string) {
    const order = await this.prismaService.order.findFirst({
      where: { id, customerId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                images: true,
              },
            },
          },
        },
        addresses: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getMyOrderByNumber(customerId: string, orderNumber: string) {
    const cleanNumber = orderNumber?.trim();
    if (!cleanNumber) {
      throw new NotFoundException('Order not found');
    }

    const order = await this.prismaService.order.findFirst({
      where: { orderNumber: cleanNumber, customerId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                images: true,
              },
            },
          },
        },
        addresses: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async trackOrder(orderNumber: string, phone: string, email?: string) {
    const cleanNumber = orderNumber?.trim();
    const cleanPhone = phone?.replace(/\D/g, '').slice(-10);

    if (!cleanNumber || !cleanPhone) {
      throw new BadRequestException('Order number and phone number are required');
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        cleanNumber,
      );

    const order = await this.prismaService.order.findFirst({
      where: isUuid
        ? { OR: [{ id: cleanNumber }, { orderNumber: cleanNumber }] }
        : { orderNumber: cleanNumber },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                images: true,
              },
            },
          },
        },
        addresses: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('No order found matching the provided details');
    }

    const matchesPhone =
      order.addresses.some((addr) => {
        const addrPhone = addr.phone?.replace(/\D/g, '').slice(-10);
        return addrPhone === cleanPhone;
      }) ||
      (order.customer?.phone &&
        order.customer.phone.replace(/\D/g, '').slice(-10) === cleanPhone);

    const matchesEmail =
      email &&
      order.customer?.email &&
      order.customer.email.toLowerCase() === email.trim().toLowerCase();

    if (!matchesPhone && !matchesEmail) {
      throw new NotFoundException('No order found matching the provided details');
    }

    return order;
  }

  async generateOrderNumber(): Promise<string> {
    try {
      const result = await this.prismaService.$queryRawUnsafe<{ nextval: string | number | bigint }[]>(
        `SELECT nextval('order_number_seq') AS nextval`
      );
      if (result?.[0]?.nextval != null) {
        return `SDO${result[0].nextval}`;
      }
    } catch {
      // Sequence may not exist yet or connection issue: ensure sequence exists and retry
      try {
        await this.prismaService.$executeRawUnsafe(
          `CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1000 INCREMENT BY 1;`
        );
        const result = await this.prismaService.$queryRawUnsafe<{ nextval: string | number | bigint }[]>(
          `SELECT nextval('order_number_seq') AS nextval`
        );
        if (result?.[0]?.nextval != null) {
          return `SDO${result[0].nextval}`;
        }
      } catch (retryError) {
        console.error('Failed to generate sequence-based order number:', retryError);
      }
    }

    // High-availability fallback preserving pattern SDOXXXX
    const count = await this.prismaService.order.count();
    const fallbackNumber = 1000 + count + Math.floor(Math.random() * 100);
    return `SDO${fallbackNumber}`;
  }
}

