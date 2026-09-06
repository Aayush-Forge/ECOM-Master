import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
<<<<<<< HEAD
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [AuthModule, UserModule, ProductsModule],
=======
import { AuditLogsModule } from './audit/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [AuthModule, PrismaModule, AuditLogsModule, UsersModule],
>>>>>>> origin/feature/customer-account-staff-admin-portal
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