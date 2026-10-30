import { Module } from '@nestjs/common';
import { CompanyProfileController } from './company-profile.controller';
import { CompanyProfileService } from './company-profile.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AuditLogsModule } from '../audit/audit-logs.module';
import { R2Module } from '../r2/r2.module';

@Module({
  imports: [PrismaModule, RedisModule, AuditLogsModule, R2Module],
  controllers: [CompanyProfileController],
  providers: [CompanyProfileService],
  exports: [CompanyProfileService],
})
export class CompanyProfileModule {}
