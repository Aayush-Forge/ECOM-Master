import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CustomerSqlRow {
  phone_key: string;
  latest_name: string;
  latest_phone: string;
  latest_email: string | null;
  total_orders: number | string | bigint;
  total_spent: number | string | Prisma.Decimal;
  total_count: number | string | bigint;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prismaService: PrismaService) {}

  private escapeLike(str: string): string {
    return str.replace(/([%_\\])/g, '\\$1');
  }

  async getCustomers(
    search?: string,
    page = 1,
    perPage = 20,
    sortBy?: string,
    sortOrder?: string,
  ) {
    const rawSearch = (search || '').trim().slice(0, 100);
    const escapedTerm = rawSearch ? this.escapeLike(rawSearch) : '';
    const allDigits = rawSearch.replace(/\D/g, '');
    const digitsOnly = allDigits.length > 10 ? allDigits.slice(-10) : allDigits;

    const hasTerm = escapedTerm.length > 0;
    const hasDigits = digitsOnly.length > 0;

    const termParam = hasTerm ? `%${escapedTerm}%` : '';
    const digitsParam = hasDigits ? `%${digitsOnly}%` : '';

    let filterClause: Prisma.Sql;
    if (!hasTerm) {
      filterClause = Prisma.sql`TRUE`;
    } else if (hasDigits) {
      filterClause = Prisma.sql`(
        phone_key ILIKE ${digitsParam}
        OR address_full_name ILIKE ${termParam}
        OR order_email ILIKE ${termParam}
        OR order_number ILIKE ${termParam}
      )`;
    } else {
      filterClause = Prisma.sql`(
        address_full_name ILIKE ${termParam}
        OR order_email ILIKE ${termParam}
        OR order_number ILIKE ${termParam}
      )`;
    }

    const offset = (page - 1) * perPage;

    const direction = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    let sortColumn = 'latest_order_time';
    if (sortBy === 'totalSpent' || sortBy === 'total_spent') {
      sortColumn = 'total_spent';
    } else if (sortBy === 'totalOrders' || sortBy === 'total_orders') {
      sortColumn = 'total_orders';
    } else if (sortBy === 'name' || sortBy === 'latest_name') {
      sortColumn = 'latest_name';
    } else if (sortBy === 'latest_order_time' || sortBy === 'date' || sortBy === 'createdAt') {
      sortColumn = 'latest_order_time';
    }

    const orderSql = Prisma.raw(`ORDER BY ${sortColumn} ${direction}`);

    const rows = await this.prismaService.$queryRaw<CustomerSqlRow[]>`
      WITH valid_orders AS (
        SELECT 
          o.id AS order_id,
          o.order_number,
          o.email AS order_email,
          o.grand_total,
          COALESCE(o.placed_at, o.created_at) AS order_time,
          oa.phone AS raw_phone,
          oa.full_name AS address_full_name,
          RIGHT(REGEXP_REPLACE(oa.phone, '[^0-9]', '', 'g'), 10) AS phone_key
        FROM orders o
        JOIN order_addresses oa ON oa.order_id = o.id AND oa.type = 'shipping'
        WHERE o.status NOT IN ('cart', 'payment_pending')
          AND REGEXP_REPLACE(oa.phone, '[^0-9]', '', 'g') <> ''
      ),
      customer_stats AS (
        SELECT 
          phone_key,
          COUNT(DISTINCT order_id) AS total_orders,
          COALESCE(SUM(grand_total), 0) AS total_spent
        FROM valid_orders
        GROUP BY phone_key
      ),
      customer_latest AS (
        SELECT DISTINCT ON (phone_key)
          phone_key,
          address_full_name AS latest_name,
          raw_phone AS latest_phone,
          order_email AS latest_email,
          order_time AS latest_order_time
        FROM valid_orders
        ORDER BY phone_key, order_time DESC
      ),
      matching_keys AS (
        SELECT DISTINCT phone_key
        FROM valid_orders
        WHERE ${filterClause}
      ),
      counted AS (
        SELECT 
          cl.phone_key,
          cl.latest_name,
          cl.latest_phone,
          cl.latest_email,
          cl.latest_order_time,
          cs.total_orders,
          cs.total_spent,
          COUNT(*) OVER() AS total_count
        FROM customer_latest cl
        JOIN customer_stats cs ON cs.phone_key = cl.phone_key
        JOIN matching_keys mk ON mk.phone_key = cl.phone_key
      )
      SELECT 
        phone_key,
        latest_name,
        latest_phone,
        latest_email,
        total_orders,
        total_spent,
        total_count
      FROM counted
      ${orderSql}
      LIMIT ${perPage}
      OFFSET ${offset};
    `;

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const data = rows.map((r) => ({
      phoneKey: r.phone_key,
      name: r.latest_name,
      phone: r.latest_phone,
      email: r.latest_email || null,
      totalOrders: Number(r.total_orders || 0),
      totalSpent: Number(r.total_spent || 0),
    }));

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

  async getCustomerByPhoneKey(phoneKey: string, page = 1, perPage = 20) {
    if (!/^\d+$/.test(phoneKey)) {
      throw new BadRequestException('Phone key must contain digits only');
    }

    const latestRows = await this.prismaService.$queryRaw<CustomerSqlRow[]>`
      WITH valid_orders AS (
        SELECT 
          o.id AS order_id,
          o.order_number,
          o.email AS order_email,
          o.grand_total,
          COALESCE(o.placed_at, o.created_at) AS order_time,
          oa.phone AS raw_phone,
          oa.full_name AS address_full_name,
          RIGHT(REGEXP_REPLACE(oa.phone, '[^0-9]', '', 'g'), 10) AS phone_key
        FROM orders o
        JOIN order_addresses oa ON oa.order_id = o.id AND oa.type = 'shipping'
        WHERE o.status NOT IN ('cart', 'payment_pending')
          AND REGEXP_REPLACE(oa.phone, '[^0-9]', '', 'g') <> ''
      ),
      customer_stats AS (
        SELECT 
          phone_key,
          COUNT(DISTINCT order_id) AS total_orders,
          COALESCE(SUM(grand_total), 0) AS total_spent
        FROM valid_orders
        WHERE phone_key = ${phoneKey}
        GROUP BY phone_key
      ),
      customer_latest AS (
        SELECT DISTINCT ON (phone_key)
          phone_key,
          address_full_name AS latest_name,
          raw_phone AS latest_phone,
          order_email AS latest_email,
          order_time AS latest_order_time
        FROM valid_orders
        WHERE phone_key = ${phoneKey}
        ORDER BY phone_key, order_time DESC
      )
      SELECT 
        cl.phone_key,
        cl.latest_name,
        cl.latest_phone,
        cl.latest_email,
        COALESCE(cs.total_orders, 0) AS total_orders,
        COALESCE(cs.total_spent, 0) AS total_spent,
        1 AS total_count
      FROM customer_latest cl
      LEFT JOIN customer_stats cs ON cs.phone_key = cl.phone_key;
    `;

    if (!latestRows || latestRows.length === 0) {
      throw new NotFoundException(`Customer with phone key ${phoneKey} not found`);
    }

    const customerSummary = {
      phoneKey: latestRows[0].phone_key,
      name: latestRows[0].latest_name,
      phone: latestRows[0].latest_phone,
      email: latestRows[0].latest_email || null,
      totalOrders: Number(latestRows[0].total_orders || 0),
      totalSpent: Number(latestRows[0].total_spent || 0),
    };

    const matchingOrderIds = await this.prismaService.$queryRaw<{ order_id: string }[]>`
      SELECT DISTINCT o.id AS order_id
      FROM orders o
      JOIN order_addresses oa ON oa.order_id = o.id AND oa.type = 'shipping'
      WHERE o.status NOT IN ('cart', 'payment_pending')
        AND RIGHT(REGEXP_REPLACE(oa.phone, '[^0-9]', '', 'g'), 10) = ${phoneKey};
    `;

    const orderIds = matchingOrderIds.map((m) => m.order_id);
    const total = orderIds.length;
    const skip = (page - 1) * perPage;

    const orders = await this.prismaService.order.findMany({
      where: {
        id: { in: orderIds },
      },
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
    });

    return {
      customer: customerSummary,
      data: orders,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }
}
