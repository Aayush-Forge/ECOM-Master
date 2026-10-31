import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingQueryDto } from './dto/accounting-query.dto';
import { OrderStatus } from '@prisma/client';

export interface FinancialMetric {
  value: number;
  label: string;
  previousValue?: number;
  percentageChange?: number;
}

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateRange(query: AccountingQueryDto): { fromDate?: Date; toDate?: Date } {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (query.startDate) {
      const from = new Date(query.startDate);
      const to = query.endDate ? new Date(query.endDate) : new Date();
      to.setHours(23, 59, 59, 999);
      return { fromDate: from, toDate: to };
    }

    switch (query.range) {
      case 'today':
        return { fromDate: todayStart, toDate: new Date() };
      case 'last_7_days': {
        const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { fromDate: from, toDate: now };
      }
      case 'last_30_days': {
        const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { fromDate: from, toDate: now };
      }
      case 'this_month': {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        return { fromDate: from, toDate: now };
      }
      case 'last_month': {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { fromDate: from, toDate: to };
      }
      case 'all_time':
      default:
        return {};
    }
  }

  async getCompanyState(): Promise<string> {
    try {
      const company = await this.prisma.companyProfile.findFirst();
      return (company?.state || 'Karnataka').toLowerCase();
    } catch {
      return 'karnataka';
    }
  }

  async getFinancialSummary(query: AccountingQueryDto) {
    const { fromDate, toDate } = this.parseDateRange(query);
    const companyState = await this.getCompanyState();

    const dateFilter: any = {};
    if (fromDate || toDate) {
      dateFilter.createdAt = {};
      if (fromDate) dateFilter.createdAt.gte = fromDate;
      if (toDate) dateFilter.createdAt.lte = toDate;
    }

    const orders = await this.prisma.order.findMany({
      where: {
        ...dateFilter,
      },
      include: {
        addresses: true,
        payments: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let grossOrderValue = 0;
    let paymentsCollected = 0;
    let refundsRecorded = 0;
    let totalTaxCollected = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let taxableAmount = 0;
    let totalShipping = 0;
    let totalDiscounts = 0;

    for (const order of orders) {
      const grandTotal = Number(order.grandTotal) || 0;
      const subtotal = Number(order.subtotal) || 0;
      const discount = Number(order.discountTotal) || 0;
      const shipping = Number(order.shippingTotal) || 0;
      const tax = Number(order.taxTotal) || 0;

      const isPaid = order.status === OrderStatus.paid || order.status === OrderStatus.delivered || order.status === OrderStatus.shipped || order.status === OrderStatus.processing;
      const isRefunded = order.status === OrderStatus.refunded;

      if (isPaid || isRefunded) {
        grossOrderValue += grandTotal;
        totalShipping += shipping;
        totalDiscounts += discount;
        taxableAmount += Math.max(0, subtotal - discount);
      }

      if (isPaid) {
        paymentsCollected += grandTotal;
        totalTaxCollected += tax;

        const shippingAddr = order.addresses.find((a) => a.type === 'shipping') || order.addresses[0];
        const orderState = (shippingAddr?.state || '').toLowerCase();
        const isIntraState = !orderState || orderState.includes(companyState) || companyState.includes(orderState);

        if (isIntraState) {
          cgst += tax / 2;
          sgst += tax / 2;
        } else {
          igst += tax;
        }
      }

      if (isRefunded) {
        refundsRecorded += grandTotal;
      }
    }

    const gatewayFeeRate = 0.02 * 1.18; // 2% platform fee + 18% GST on fee = 2.36%
    const estimatedGatewayFees = Math.round(paymentsCollected * gatewayFeeRate);
    const netProfit = Math.round(paymentsCollected - refundsRecorded - estimatedGatewayFees - totalTaxCollected);

    return {
      summary: {
        grossOrderValue: Math.round(grossOrderValue),
        paymentsCollected: Math.round(paymentsCollected),
        refundsRecorded: Math.round(refundsRecorded),
        totalTaxCollected: Math.round(totalTaxCollected),
        cgst: Math.round(cgst),
        sgst: Math.round(sgst),
        igst: Math.round(igst),
        taxableAmount: Math.round(taxableAmount),
        totalShipping: Math.round(totalShipping),
        totalDiscounts: Math.round(totalDiscounts),
        estimatedGatewayFees,
        netProfit: Math.max(0, netProfit),
        ordersCount: orders.length,
      },
      companyState,
      range: query.range || 'all_time',
    };
  }

  async getDailyBreakdown(query: AccountingQueryDto) {
    const { fromDate, toDate } = this.parseDateRange(query);
    const dateFilter: any = {};
    if (fromDate || toDate) {
      dateFilter.createdAt = {};
      if (fromDate) dateFilter.createdAt.gte = fromDate;
      if (toDate) dateFilter.createdAt.lte = toDate;
    }

    const orders = await this.prisma.order.findMany({
      where: dateFilter,
      select: {
        createdAt: true,
        grandTotal: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const dayMap = new Map<string, { date: string; sales: number; collections: number; ordersCount: number }>();

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().slice(0, 10);
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, { date: dateKey, sales: 0, collections: 0, ordersCount: 0 });
      }

      const item = dayMap.get(dateKey)!;
      const amt = Number(order.grandTotal) || 0;
      item.ordersCount += 1;
      item.sales += amt;

      const isPaid = order.status === OrderStatus.paid || order.status === OrderStatus.delivered || order.status === OrderStatus.shipped || order.status === OrderStatus.processing;
      if (isPaid) {
        item.collections += amt;
      }
    }

    return Array.from(dayMap.values());
  }

  async getLedgerOrders(query: AccountingQueryDto) {
    const { fromDate, toDate } = this.parseDateRange(query);
    const companyState = await this.getCompanyState();

    const where: any = {};
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    if (query.status && query.status !== 'all') {
      where.status = query.status as OrderStatus;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { orderNumber: { contains: s, mode: 'insensitive' } },
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        customer: true,
        addresses: true,
        payments: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return orders.map((o) => {
      const shippingAddr = o.addresses.find((a) => a.type === 'shipping') || o.addresses[0];
      const customerName = shippingAddr?.fullName || o.customer?.firstName ? `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim() : o.email?.split('@')[0] || 'Customer';
      const state = shippingAddr?.state || 'Karnataka';
      const orderState = state.toLowerCase();
      const isIntraState = !orderState || orderState.includes(companyState) || companyState.includes(orderState);
      const taxType = isIntraState ? 'intra' : 'inter';

      const payment = o.payments[0];
      const gateway = payment?.method || (o.status === OrderStatus.paid ? 'Razorpay' : 'Pending');
      const ref = payment?.razorpayPaymentId || '—';

      const isPaid = o.status === OrderStatus.paid || o.status === OrderStatus.delivered || o.status === OrderStatus.shipped;
      const isRefunded = o.status === OrderStatus.refunded;
      const statusLabel = isPaid ? 'Paid' : isRefunded ? 'Refunded' : 'Pending';

      const invoiceNumber = o.invoiceNumber || `INV-2026-${o.orderNumber.replace(/[^0-9]/g, '').slice(-5) || '10001'}`;

      return {
        id: o.orderNumber,
        dbId: o.id,
        invoice: invoiceNumber,
        date: o.placedAt ? o.placedAt.toISOString().slice(0, 10) : o.createdAt.toISOString().slice(0, 10),
        customer: customerName,
        email: o.email || '',
        state,
        type: taxType,
        subtotal: Number(o.subtotal) || 0,
        discount: Number(o.discountTotal) || 0,
        shipping: Number(o.shippingTotal) || 0,
        tax: Number(o.taxTotal) || 0,
        total: Number(o.grandTotal) || 0,
        status: statusLabel,
        gateway,
        ref,
        refund: isRefunded ? Number(o.grandTotal) || 0 : 0,
        items: o.items.map((i) => ({
          name: i.titleSnapshot,
          qty: i.quantity,
          price: Number(i.unitPriceSnapshot),
          hsn: '33074100',
          rate: 5,
        })),
      };
    });
  }

  async exportCsv(query: AccountingQueryDto): Promise<string> {
    const orders = await this.getLedgerOrders(query);

    const headers = [
      'Order ID',
      'Invoice No',
      'Date',
      'Customer',
      'Email',
      'State',
      'Tax Type',
      'Subtotal',
      'Discount',
      'Shipping',
      'GST Tax',
      'Grand Total',
      'Payment Status',
      'Payment Method',
      'Gateway Reference',
      'Refund Amount',
    ];

    const rows = orders.map((o) => [
      `"${o.id}"`,
      `"${o.invoice}"`,
      `"${o.date}"`,
      `"${o.customer.replace(/"/g, '""')}"`,
      `"${o.email}"`,
      `"${o.state}"`,
      `"${o.type.toUpperCase()}"`,
      o.subtotal.toFixed(2),
      o.discount.toFixed(2),
      o.shipping.toFixed(2),
      o.tax.toFixed(2),
      o.total.toFixed(2),
      `"${o.status}"`,
      `"${o.gateway}"`,
      `"${o.ref}"`,
      o.refund.toFixed(2),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}
