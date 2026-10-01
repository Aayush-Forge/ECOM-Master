import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/ecom_db?schema=public';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    await this.initializeSequences();
  }

  private async initializeSequences() {
    try {
      await this.$executeRawUnsafe(`
        CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1000 INCREMENT BY 1;
        CREATE SEQUENCE IF NOT EXISTS product_sku_seq START WITH 10001 INCREMENT BY 1;
      `);
    } catch (error) {
      console.error('Failed to initialize database sequences:', error);
    }
  }
}