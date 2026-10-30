import { Module } from '@nestjs/common';
import { ClubbingController } from './clubbing.controller';
import { ClubbingService } from './clubbing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit/audit-logs.module';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [ClubbingController],
  providers: [ClubbingService],
  exports: [ClubbingService],
})
export class ClubbingModule {}
