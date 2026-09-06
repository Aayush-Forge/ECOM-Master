import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { SampleMutationsFixtureController } from './fixtures/sample-mutations.controller';

@Module({
  controllers: [AuditLogsController, SampleMutationsFixtureController],
  providers: [AuditLogsService, AuditLogInterceptor, Reflector],
  exports: [AuditLogsService, AuditLogInterceptor],
})
export class AuditLogsModule {}
