import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit/audit-logs.module';
import { ProductsImportExportService } from './products-import-export.service';

@Module({
  imports: [AuthModule, PrismaModule, AuditLogsModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsImportExportService],
  exports: [ProductsService, ProductsImportExportService],
})
export class ProductsModule {}
