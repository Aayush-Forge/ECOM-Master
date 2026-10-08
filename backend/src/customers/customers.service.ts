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
  total_count: number | string | bigint;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prismaService: PrismaService) {}

  private escapeLike(str: string): string {
    return str.replace(/([%_\\])/g, '\\$1');
  }

  async getCustomers(search?: string, page = 1, perPage = 20) {
    const rawSearch = (search || '').trim().slice(0, 100);
    const escapedTerm = rawSearch ? this.escapeLike(rawSearch) : '';
    const digitsOnly = rawSearch.replace(/\D/g, '');

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

    const rows = await this.prismaService.$queryRaw<CustomerSqlRow[]>`
      WITH valid_orders AS (
        SELECT 
          o.id AS order_id,
          o.order_number,
          o.email AS order_email,
          COALESCE(o.placed_at, o.created_at) AS order_time,
          oa.phone AS raw_phone,
          oa.full_name AS address_full_name,
          RIGHT(REGEXP_REPLACE(oa.phone, '[^0-9]', '', 'g'), 10) AS phone_key
        FROM orders o
        JOIN order_addresses oa ON oa.order_id = o.id AND oa.type = 'shipping'
        WHERE o.status NOT IN ('cart', 'payment_pending')
          AND REGEXP_REPLACE(oa.phone, '[^0-9]', '', 'g') <> ''
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
          COUNT(*) OVER() AS total_count
        FROM customer_latest cl
        JOIN matching_keys mk ON mk.phone_key = cl.phone_key
      )
      SELECT 
        phone_key,
        latest_name,
        latest_phone,
        latest_email,
        total_count
      FROM counted
      ORDER BY latest_order_time DESC
      LIMIT ${perPage}
      OFFSET ${offset};
    `;

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const data = rows.map((r) => ({
      phoneKey: r.phone_key,
      name: r.latest_name,
      phone: r.latest_phone,
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
          COALESCE(o.placed_at, o.created_at) AS order_time,
          oa.phone AS raw_phone,
          oa.full_name AS address_full_name,
          RIGHT(REGEXP_REPLACE(oa.phone, '[^0-9]', '', 'g'), 10) AS phone_key
        FROM orders o
        JOIN order_addresses oa ON oa.order_id = o.id AND oa.type = 'shipping'
        WHERE o.status NOT IN ('cart', 'payment_pending')
          AND REGEXP_REPLACE(oa.phone, '[^0-9]', '', 'g') <> ''
      )
      SELECT DISTINCT ON (phone_key)
        phone_key,
        address_full_name AS latest_name,
        raw_phone AS latest_phone,
        order_email AS latest_email,
        1 AS total_count
      FROM valid_orders
      WHERE phone_key = ${phoneKey}
      ORDER BY phone_key, order_time DESC;
    `;

    if (!latestRows || latestRows.length === 0) {
      throw new NotFoundException(`Customer with phone key ${phoneKey} not found`);
    }

    const customerSummary = {
      phoneKey: latestRows[0].phone_key,
      name: latestRows[0].latest_name,
      phone: latestRows[0].latest_phone,
      email: latestRows[0].latest_email || null,
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
