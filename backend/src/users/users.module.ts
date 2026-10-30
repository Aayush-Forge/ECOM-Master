import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit/audit-logs.module';

@Module({
  imports: [AuthModule, AuditLogsModule],
  controllers: [AdminUsersController, UsersController],
})
export class UsersModule {}

