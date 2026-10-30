import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ClubbingModule } from '../clubbing/clubbing.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [PrismaModule, ClubbingModule, ShippingModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
