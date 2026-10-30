import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuditLogsModule } from './audit/audit-logs.module';
import { UserModule } from './user/user.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { ClubbingModule } from './clubbing/clubbing.module';
import { OrdersModule } from './orders/orders.module';
import { ShippingSlabsModule } from './shipping-slabs/shipping-slabs.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    AuditLogsModule,
    UserModule,
    UsersModule,
    ProductsModule,
    ClubbingModule,
    OrdersModule,
    ShippingSlabsModule,
  ],
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