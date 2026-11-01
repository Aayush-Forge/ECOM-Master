import { Module } from '@nestjs/common';
import { SiteStatusController } from './site-status.controller';
import { SiteStatusService } from './site-status.service';
import { BlockDuringMaintenanceGuard } from './guards/block-during-maintenance.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit/audit-logs.module';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [SiteStatusController],
  providers: [SiteStatusService, BlockDuringMaintenanceGuard],
  exports: [SiteStatusService, BlockDuringMaintenanceGuard],
})
export class SiteStatusModule {}
