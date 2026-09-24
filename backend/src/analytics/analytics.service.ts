import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SUCCESSFUL_STATUSES: OrderStatus[] = [
  OrderStatus.paid,
  OrderStatus.processing,
  OrderStatus.shipped,
  OrderStatus.delivered,
];

export interface DateRange {
  start: Date;
  end: Date;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateRange(startDate?: string, endDate?: string): DateRange {
    const end = endDate ? new Date(endDate) : new Date();
    // Default to 30 days prior if startDate not supplied
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    return { start, end };
  }

  private calculateDelta(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    const delta = ((current - previous) / previous) * 100;
    return Math.round(delta * 10) / 10;
  }

  async getOverview(startDate?: string, endDate?: string) {
    const { start, end } = this.parseDateRange(startDate, endDate);
    const durationMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - durationMs);
    const prevEnd = new Date(start.getTime());

    // Current period orders
    const currentOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { not: OrderStatus.cart },
      },
      include: {
        items: true,
      },
    });

    // Previous period orders
    const prevOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: prevStart, lte: prevEnd },
        status: { not: OrderStatus.cart },
      },
      include: {
        items: true,
      },
    });

    // Calculate current metrics
    const currentPaid = currentOrders.filter((o) =>
      SUCCESSFUL_STATUSES.includes(o.status),
    );
    const grossSales = currentOrders.reduce(
      (sum, o) => sum + Number(o.grandTotal),
      0,
    );
    const netSales = currentPaid.reduce(
      (sum, o) => sum + Math.max(0, Number(o.subtotal) - Number(o.discountTotal)),
      0,
    );
    const ordersCount = currentOrders.length;
    const paidOrdersCount = currentPaid.length;
    const aov = paidOrdersCount > 0 ? Math.round(netSales / paidOrdersCount) : 0;
    const itemsSold = currentPaid.reduce(
      (sum, o) =>
        sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0),
      0,
    );
    const discountTotal = currentOrders.reduce(
      (sum, o) => sum + Number(o.discountTotal),
      0,
    );
    const shippingTotal = currentOrders.reduce(
      (sum, o) => sum + Number(o.shippingTotal),
      0,
    );
    const refundTotal = currentOrders
      .filter((o) => o.status === OrderStatus.refunded)
      .reduce((sum, o) => sum + Number(o.grandTotal), 0);

    // Calculate previous metrics
    const prevPaid = prevOrders.filter((o) =>
      SUCCESSFUL_STATUSES.includes(o.status),
    );
    const prevGrossSales = prevOrders.reduce(
      (sum, o) => sum + Number(o.grandTotal),
      0,
    );
    const prevNetSales = prevPaid.reduce(
      (sum, o) => sum + Math.max(0, Number(o.subtotal) - Number(o.discountTotal)),
      0,
    );
    const prevOrdersCount = prevOrders.length;
    const prevPaidOrdersCount = prevPaid.length;
    const prevAov =
      prevPaidOrdersCount > 0 ? Math.round(prevNetSales / prevPaidOrdersCount) : 0;
    const prevItemsSold = prevPaid.reduce(
      (sum, o) =>
        sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0),
      0,
    );
    const prevDiscountTotal = prevOrders.reduce(
      (sum, o) => sum + Number(o.discountTotal),
      0,
    );

    // Generate time-series buckets
    const timeSeries = this.generateTimeSeries(start, end, currentOrders);

    return {
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      kpi: {
        grossSales: {
          value: Math.round(grossSales),
          delta: this.calculateDelta(grossSales, prevGrossSales),
        },
        netSales: {
          value: Math.round(netSales),
          delta: this.calculateDelta(netSales, prevNetSales),
        },
        ordersCount: {
          value: ordersCount,
          delta: this.calculateDelta(ordersCount, prevOrdersCount),
        },
        paidOrdersCount: {
          value: paidOrdersCount,
          delta: this.calculateDelta(paidOrdersCount, prevPaidOrdersCount),
        },
        averageOrderValue: {
          value: aov,
          delta: this.calculateDelta(aov, prevAov),
        },
        itemsSold: {
          value: itemsSold,
          delta: this.calculateDelta(itemsSold, prevItemsSold),
        },
        discountTotal: {
          value: Math.round(discountTotal),
          delta: this.calculateDelta(discountTotal, prevDiscountTotal),
        },
        shippingTotal: {
          value: Math.round(shippingTotal),
        },
        refundTotal: {
          value: Math.round(refundTotal),
        },
      },
      timeSeries,
    };
  }

  private generateTimeSeries(start: Date, end: Date, orders: any[]) {
    const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const isHourly = durationDays <= 2;
    const isMonthly = durationDays > 90;

    const buckets = new Map<
      string,
      { date: string; netSales: number; grossSales: number; ordersCount: number; itemsSold: number }
    >();

    // Pre-populate empty intervals
    const cursor = new Date(start);
    while (cursor <= end) {
      let key: string;
      if (isHourly) {
        key = cursor.toISOString().slice(0, 13) + ':00';
        cursor.setHours(cursor.getHours() + 1);
      } else if (isMonthly) {
        key = cursor.toISOString().slice(0, 7);
        cursor.setMonth(cursor.getMonth() + 1);
      } else {
        key = cursor.toISOString().slice(0, 10);
        cursor.setDate(cursor.getDate() + 1);
      }

      if (!buckets.has(key)) {
        buckets.set(key, {
          date: key,
          netSales: 0,
          grossSales: 0,
          ordersCount: 0,
          itemsSold: 0,
        });
      }
    }

    // Populate actual order data into buckets
    for (const order of orders) {
      const oDate = new Date(order.createdAt);
      let key: string;
      if (isHourly) {
        key = oDate.toISOString().slice(0, 13) + ':00';
      } else if (isMonthly) {
        key = oDate.toISOString().slice(0, 7);
      } else {
        key = oDate.toISOString().slice(0, 10);
      }

      const bucket = buckets.get(key);
      if (bucket) {
        bucket.grossSales += Number(order.grandTotal);
        bucket.ordersCount += 1;
        if (SUCCESSFUL_STATUSES.includes(order.status)) {
          bucket.netSales += Math.max(
            0,
            Number(order.subtotal) - Number(order.discountTotal),
          );
          bucket.itemsSold += (order.items || []).reduce(
            (sum: number, it: any) => sum + (it.quantity || 1),
            0,
          );
        }
      }
    }

    return Array.from(buckets.values()).map((b) => ({
      ...b,
      netSales: Math.round(b.netSales),
      grossSales: Math.round(b.grossSales),
    }));
  }

  async getTopProducts(startDate?: string, endDate?: string, limit = 5) {
    const { start, end } = this.parseDateRange(startDate, endDate);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 5), 20);

    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: { in: SUCCESSFUL_STATUSES },
        },
      },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const productMap = new Map<
      string,
      {
        id: string;
        title: string;
        sku: string;
        categoryName: string;
        image: string | null;
        unitsSold: number;
        revenue: number;
        stockQuantity: number;
      }
    >();

    for (const item of items) {
      const pid = item.productId;
      const existing = productMap.get(pid);
      const units = item.quantity;
      const rev = Number(item.lineTotal);

      if (existing) {
        existing.unitsSold += units;
        existing.revenue += rev;
      } else {
        const prod = item.product;
        const img = prod?.images?.[0] || null;
        productMap.set(pid, {
          id: pid,
          title: item.titleSnapshot || prod?.title || 'Unknown Product',
          sku: item.skuSnapshot || prod?.sku || 'SKU-NONE',
          categoryName: prod?.category?.name || 'Uncategorized',
          image: img,
          unitsSold: units,
          revenue: rev,
          stockQuantity: prod?.stockQuantity ?? 0,
        });
      }
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
      .slice(0, safeLimit)
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue),
      }));
  }

  async getTopCategories(startDate?: string, endDate?: string, limit = 5) {
    const { start, end } = this.parseDateRange(startDate, endDate);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 5), 20);

    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: { in: SUCCESSFUL_STATUSES },
        },
      },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    let totalRevenue = 0;
    const catMap = new Map<
      string,
      { id: string; name: string; unitsSold: number; revenue: number }
    >();

    for (const item of items) {
      const cat = item.product?.category;
      const catId = cat?.id || 'uncategorized';
      const catName = cat?.name || 'Uncategorized';
      const units = item.quantity;
      const rev = Number(item.lineTotal);
      totalRevenue += rev;

      const existing = catMap.get(catId);
      if (existing) {
        existing.unitsSold += units;
        existing.revenue += rev;
      } else {
        catMap.set(catId, {
          id: catId,
          name: catName,
          unitsSold: units,
          revenue: rev,
        });
      }
    }

    return Array.from(catMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, safeLimit)
      .map((c) => ({
        ...c,
        revenue: Math.round(c.revenue),
        revenueShare:
          totalRevenue > 0
            ? Math.round((c.revenue / totalRevenue) * 1000) / 10
            : 0,
      }));
  }

  async getCouponAnalytics(startDate?: string, endDate?: string) {
    const { start, end } = this.parseDateRange(startDate, endDate);

    const discountedOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        discountTotal: { gt: 0 },
        status: { in: SUCCESSFUL_STATUSES },
      },
      select: {
        id: true,
        couponCode: true,
        discountTotal: true,
        grandTotal: true,
      },
    });

    const couponMap = new Map<
      string,
      { code: string; ordersCount: number; discountTotal: number; revenue: number }
    >();

    for (const order of discountedOrders) {
      const code = order.couponCode?.trim() || 'Auto Volume Bundle';
      const existing = couponMap.get(code);
      const disc = Number(order.discountTotal);
      const rev = Number(order.grandTotal);

      if (existing) {
        existing.ordersCount += 1;
        existing.discountTotal += disc;
        existing.revenue += rev;
      } else {
        couponMap.set(code, {
          code,
          ordersCount: 1,
          discountTotal: disc,
          revenue: rev,
        });
      }
    }

    return Array.from(couponMap.values())
      .sort((a, b) => b.discountTotal - a.discountTotal)
      .map((c) => ({
        ...c,
        discountTotal: Math.round(c.discountTotal),
        revenue: Math.round(c.revenue),
      }));
  }

  async getOperationalSummary() {
    const [ordersByStatus, lowStockProducts, recentOrders] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.product.findMany({
        where: {
          status: 'active',
          stockQuantity: { lte: 5 },
        },
        select: {
          id: true,
          title: true,
          sku: true,
          stockQuantity: true,
          basePrice: true,
          salePrice: true,
          images: true,
        },
        orderBy: { stockQuantity: 'asc' },
        take: 8,
      }),
      this.prisma.order.findMany({
        where: { status: { not: OrderStatus.cart } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: {
            select: { firstName: true, lastName: true, email: true },
          },
          addresses: {
            where: { type: 'shipping' },
            take: 1,
            select: { fullName: true },
          },
          items: true,
        },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      payment_pending: 0,
      paid: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
    };

    for (const group of ordersByStatus) {
      statusCounts[group.status] = group._count.id;
    }

    const toFulfillCount =
      (statusCounts.paid || 0) + (statusCounts.processing || 0);

    return {
      statusCounts,
      toFulfillCount,
      lowStockProducts: lowStockProducts.map((p) => ({
        id: p.id,
        title: p.title,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        price: Number(p.salePrice ?? p.basePrice),
        image: p.images?.[0] || null,
      })),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName:
          `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim() ||
          o.addresses?.[0]?.fullName ||
          'Guest Devotee',
        grandTotal: Number(o.grandTotal),
        itemsCount: o.items.length,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }
}
