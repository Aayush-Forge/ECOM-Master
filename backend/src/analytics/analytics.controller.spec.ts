import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: jest.Mocked<AnalyticsService>;

  beforeEach(async () => {
    const mockService = {
      getOverview: jest.fn().mockResolvedValue({
        dateRange: { start: '2026-08-25T00:00:00.000Z', end: '2026-09-24T00:00:00.000Z' },
        kpi: {
          grossSales: { value: 1500, delta: 10 },
          netSales: { value: 1200, delta: 8 },
          ordersCount: { value: 5, delta: 0 },
          paidOrdersCount: { value: 4, delta: 0 },
          averageOrderValue: { value: 300, delta: 8 },
          itemsSold: { value: 6, delta: 12 },
          discountTotal: { value: 100, delta: 0 },
          shippingTotal: { value: 49 },
          refundTotal: { value: 0 },
        },
        timeSeries: [],
      }),
      getTopProducts: jest.fn().mockResolvedValue([]),
      getTopCategories: jest.fn().mockResolvedValue([]),
      getCouponAnalytics: jest.fn().mockResolvedValue([]),
      getOperationalSummary: jest.fn().mockResolvedValue({
        statusCounts: {},
        toFulfillCount: 0,
        lowStockProducts: [],
        recentOrders: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get(AnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getOverview delegates to analyticsService.getOverview', async () => {
    const result = await controller.getOverview('2026-09-01', '2026-09-24');
    expect(service.getOverview).toHaveBeenCalledWith('2026-09-01', '2026-09-24');
    expect(result.kpi.netSales.value).toBe(1200);
  });

  it('getTopProducts delegates to analyticsService.getTopProducts', async () => {
    await controller.getTopProducts('2026-09-01', '2026-09-24', 5);
    expect(service.getTopProducts).toHaveBeenCalledWith('2026-09-01', '2026-09-24', 5);
  });

  it('getTopCategories delegates to analyticsService.getTopCategories', async () => {
    await controller.getTopCategories('2026-09-01', '2026-09-24', 5);
    expect(service.getTopCategories).toHaveBeenCalledWith('2026-09-01', '2026-09-24', 5);
  });

  it('getCoupons delegates to analyticsService.getCouponAnalytics', async () => {
    await controller.getCoupons('2026-09-01', '2026-09-24');
    expect(service.getCouponAnalytics).toHaveBeenCalledWith('2026-09-01', '2026-09-24');
  });

  it('getOperational delegates to analyticsService.getOperationalSummary', async () => {
    await controller.getOperational();
    expect(service.getOperationalSummary).toHaveBeenCalled();
  });
});
