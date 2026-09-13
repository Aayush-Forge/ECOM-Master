import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartPricingService } from './cart-pricing.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CartController],
  providers: [CartService, CartPricingService, PrismaService],
})
export class CartModule {}
