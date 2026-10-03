import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { CustomerOrdersController } from './customer-orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit/audit-logs.module';
import { ClubbingModule } from '../clubbing/clubbing.module';

import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PrismaModule, AuditLogsModule, ClubbingModule, PricingModule],
  controllers: [OrdersController, CustomerOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

