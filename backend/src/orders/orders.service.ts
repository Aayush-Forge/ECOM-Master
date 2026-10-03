import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClubbingService } from '../clubbing/clubbing.service';
import { CreateOrderDto } from './dto/create-order.dto';

import * as crypto from 'crypto';
import { CartStatus } from '@prisma/client';
import { PricingService } from '../pricing/pricing.service';

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
    private readonly pricingService: PricingService,
  ) {}

  async createOrder(dto: CreateOrderDto, customerId?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const pricing = await this.pricingService.calculatePricing(
      dto.items.map((item) => ({
        productId: item.productId,
        variationId: item.variationId || null,
        quantity: item.quantity,
      })),
      { throwOnError: true },
    );

    const orderItemsData = pricing.items.map((item) => ({
      productId: item.productId,
      variantId: item.variationId,
      attributesSnapshot: item.attributesSnapshot,
      titleSnapshot: item.titleSnapshot,
      skuSnapshot: item.skuSnapshot,
      unitPriceSnapshot: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    }));

    const subtotal = pricing.subtotal;
    const discountTotal = pricing.discountTotal;
    const shippingTotal = pricing.shippingTotal;
    const grandTotal = pricing.grandTotal;

    let validCartToConvert: string | null = null;
    if (dto.cartId && dto.cartToken) {
      try {
        const cart = await this.prismaService.cart.findUnique({
          where: { id: dto.cartId },
        });
        if (cart && cart.status === CartStatus.active) {
          const hashedProvided = crypto
            .createHash('sha256')
            .update(dto.cartToken)
            .digest('hex');
          const expectedBuf = Buffer.from(cart.sessionToken, 'utf8');
          const providedBuf = Buffer.from(hashedProvided, 'utf8');
          if (
            expectedBuf.length === providedBuf.length &&
            crypto.timingSafeEqual(expectedBuf, providedBuf)
          ) {
            validCartToConvert = cart.id;
          }
        }
      } catch {
        // An invalid or missing cart token must never block guest checkout (ignore it)
      }
    }

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
      if (validCartToConvert) {
        await tx.cart.update({
          where: { id: validCartToConvert },
          data: { status: CartStatus.converted },
        });
      }

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
          include: {
            changedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
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
            include: {
              changedByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
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
    const fetchNextVal = async () => {
      const result = await this.prismaService.$queryRawUnsafe<{ nextval: string | number | bigint }[]>(
        `SELECT nextval('order_number_seq') AS nextval`,
      );
      if (result?.[0]?.nextval != null) {
        return `SDO${result[0].nextval}`;
      }
      throw new Error('Empty sequence value returned');
    };

    try {
      return await fetchNextVal();
    } catch {
      // Retry once after ensuring sequence exists
      try {
        await this.prismaService.$executeRawUnsafe(
          `CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1000 INCREMENT BY 1;`,
        );
        return await fetchNextVal();
      } catch (retryError: any) {
        throw new InternalServerErrorException(
          `Failed to generate sequence-based order number: ${retryError?.message || 'Sequence error'}`,
        );
      }
    }
  }
}

