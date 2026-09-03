import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditLogsModule } from './audit/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { R2Module } from './r2/r2.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [AuthModule, PrismaModule, AuditLogsModule, UsersModule, RedisModule, R2Module],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards: ALL endpoints require JWT auth + role check by default.
    // Endpoints must explicitly opt out via @Public() decorator.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
