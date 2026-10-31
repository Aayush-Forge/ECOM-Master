import { Module } from '@nestjs/common';
import { ShippingSlabsController } from './shipping-slabs.controller';
import { ShippingSlabsService } from './shipping-slabs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingSlabsController],
  providers: [ShippingSlabsService],
  exports: [ShippingSlabsService],
})
export class ShippingSlabsModule {}
