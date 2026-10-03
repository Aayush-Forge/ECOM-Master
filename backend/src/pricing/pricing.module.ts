import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ClubbingModule } from '../clubbing/clubbing.module';

@Module({
  imports: [PrismaModule, ClubbingModule],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
