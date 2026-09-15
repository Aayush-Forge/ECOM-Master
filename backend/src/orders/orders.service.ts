import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
  ) {}

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
        items: true,
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
}

