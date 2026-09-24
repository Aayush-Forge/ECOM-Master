import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';

@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(ROLES.READ_ONLY)
  getOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getOverview(startDate, endDate);
  }

  @Get('top-products')
  @Roles(ROLES.READ_ONLY)
  getTopProducts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.analyticsService.getTopProducts(startDate, endDate, limit);
  }

  @Get('top-categories')
  @Roles(ROLES.READ_ONLY)
  getTopCategories(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.analyticsService.getTopCategories(startDate, endDate, limit);
  }

  @Get('coupons')
  @Roles(ROLES.READ_ONLY)
  getCoupons(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getCouponAnalytics(startDate, endDate);
  }

  @Get('operational')
  @Roles(ROLES.READ_ONLY)
  getOperational() {
    return this.analyticsService.getOperationalSummary();
  }
}
