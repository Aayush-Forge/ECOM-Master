import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '../generated/prisma';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products were not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;

    // Snapshot title, SKU, and unit price into order items
    const orderItemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = Number(product.salePrice ?? product.basePrice);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      return {
        productId: product.id,
        titleSnapshot: product.title,
        skuSnapshot: product.sku,
        unitPriceSnapshot: unitPrice,
        quantity: item.quantity,
        lineTotal: lineTotal,
      };
    });

    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.order.create({
      data: {
        orderNumber,
        customerId: dto.customerId || null,
        status: OrderStatus.payment_pending,
        subtotal,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: 0,
        grandTotal: subtotal,
        items: { create: orderItemsData },
      },
      include: { items: true },
    });
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}