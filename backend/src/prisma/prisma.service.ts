import 'dotenv/config';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:aayush1018@localhost:5432/ecom_db?schema=public';
    const pool = new Pool({
      connectionString,
      max: parseInt(process.env.DB_POOL_MAX || '25', 10),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECT_TIMEOUT_MS || '5000', 10),
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to PostgreSQL (ecom_db) successfully.');
      await this.initializeSequences();
    } catch (err: any) {
      this.logger.warn(`Prisma onModuleInit failed: ${err.message}`);
    }
  }

  private async initializeSequences() {
    try {
      await this.$executeRawUnsafe(`
        CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1000 INCREMENT BY 1;
        CREATE SEQUENCE IF NOT EXISTS product_sku_seq START WITH 10001 INCREMENT BY 1;
      `);
    } catch (error) {
      this.logger.error('Failed to initialize database sequences:', error);
    }
  }
}