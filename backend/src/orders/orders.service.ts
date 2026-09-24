import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus } from '@prisma/client';
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
      const unitPrice = Number(product.salePrice ?? product.basePrice);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      discountInputItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: unitPrice,
      });

      return {
        productId: product.id,
        titleSnapshot: product.title,
        skuSnapshot: product.sku,
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

    const shippingTotal = dto.shippingTotal !== undefined ? Number(dto.shippingTotal) : (subtotal >= 499 || subtotal === 0 ? 0 : 49);
    const grandTotal = Math.max(0, subtotal - discountTotal + shippingTotal);

    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveCustomerId = customerId || dto.customerId || null;

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

    return this.prismaService.order.create({
      data: {
        orderNumber,
        customerId: effectiveCustomerId,
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
}

