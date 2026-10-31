import { Module } from '@nestjs/common';
import { ClubbingController } from './clubbing.controller';
import { ClubbingService } from './clubbing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit/audit-logs.module';
import { R2Module } from '../r2/r2.module';

@Module({
  imports: [PrismaModule, AuditLogsModule, R2Module],
  controllers: [ClubbingController],
  providers: [ClubbingService],
  exports: [ClubbingService],
})
export class ClubbingModule {}
