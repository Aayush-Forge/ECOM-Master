import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditLogsModule } from './audit/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { R2Module } from './r2/r2.module';
import { RedisModule } from './redis/redis.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CategoriesModule } from './categories/categories.module';
import { ClubbingModule } from './clubbing/clubbing.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { UserModule } from './user/user.module';
import { UsersModule } from './users/users.module';
import { AddressesModule } from './addresses/addresses.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PricingModule } from './pricing/pricing.module';
import { CartModule } from './cart/cart.module';
import { CustomersModule } from './customers/customers.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ShippingModule } from './shipping/shipping.module';
import { ShippingSlabsModule } from './shipping-slabs/shipping-slabs.module';
import { CompanyProfileModule } from './company-profile/company-profile.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    SentryModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    EventEmitterModule.forRoot(),
    AuthModule,
    PrismaModule,
    AuditLogsModule,
    UserModule,
    UsersModule,
    AddressesModule,
    RedisModule,
    R2Module,
    CategoriesModule,
    ProductsModule,
    ClubbingModule,
    OrdersModule,
    CustomersModule,
    PaymentsModule,
    NotificationsModule,
    AnalyticsModule,
    PricingModule,
    CartModule,
    ReviewsModule,
    ShippingModule,
    ShippingSlabsModule,
    CompanyProfileModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    // Global guards: ALL endpoints require JWT auth + role check by default.
    // Endpoints must explicitly opt out via @Public() decorator.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
