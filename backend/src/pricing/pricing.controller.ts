import { Body, Controller, Post } from '@nestjs/common';
import { PricingService, PricingItemInput } from './pricing.service';
import { Public } from '../auth/decorators/public.decorator';

export class CalculatePricingDto {
  items: PricingItemInput[];
  couponCode?: string;
}

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Public()
  @Post('calculate')
  async calculate(@Body() dto: CalculatePricingDto) {
    return this.pricingService.calculatePricing(dto.items || [], {
      throwOnError: false,
      couponCode: dto.couponCode,
    });
  }
}
