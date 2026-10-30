import { BadRequestException } from '@nestjs/common';
import { ShippingRateType } from '@prisma/client';
import { ShippingService } from './shipping.service';

describe('ShippingService', () => {
  let service: ShippingService;
  let mockPrisma: any;

  const defaultOrderValueTemplate = {
    id: 'tmpl-default-val',
    name: 'Standard Delivery',
    carrierName: 'Standard Delivery',
    rateType: ShippingRateType.order_value,
    slabs: [
      { upTo: 499, charge: 49 },
      { upTo: null, charge: 0 },
    ],
    freeShippingThreshold: 499,
    isDefault: true,
    isEnabled: true,
  };

  const weightBasedTemplate = {
    id: 'tmpl-weight',
    name: 'Heavy Fragile Logistics',
    carrierName: 'SafeExpress',
    rateType: ShippingRateType.weight,
    slabs: [
      { upTo: 1.0, charge: 50 },
      { upTo: 3.0, charge: 100 },
      { upTo: 5.0, charge: 180 },
    ],
    freeShippingThreshold: 2000,
    isDefault: false,
    isEnabled: true,
  };

  beforeEach(() => {
    mockPrisma = {
      shippingTemplate: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    service = new ShippingService(mockPrisma);
  });

  describe('getDefaultTemplate', () => {
    it('returns default active template if found', async () => {
      mockPrisma.shippingTemplate.findFirst.mockResolvedValueOnce(defaultOrderValueTemplate);
      const res = await service.getDefaultTemplate();
      expect(res.id).toBe('tmpl-default-val');
    });

    it('falls back to hardcoded default rule if DB has no templates', async () => {
      mockPrisma.shippingTemplate.findFirst.mockResolvedValue(null);
      const res = await service.getDefaultTemplate();
      expect(res.name).toBe('Standard Delivery');
      expect(res.rateType).toBe(ShippingRateType.order_value);
    });
  });

  describe('calculateShipping - Order Value Slabs', () => {
    beforeEach(() => {
      mockPrisma.shippingTemplate.findFirst.mockResolvedValue(defaultOrderValueTemplate);
      mockPrisma.shippingTemplate.findMany.mockResolvedValue([defaultOrderValueTemplate]);
    });

    it('calculates ₹49 when subtotal is below ₹499', async () => {
      const items = [
        { productId: 'p1', quantity: 1, price: 300, weight: 0.2 },
      ];
      const result = await service.calculateShipping(items, 300);
      expect(result.shippingTotal).toBe(49);
      expect(result.shippingCarrier).toBe('Standard Delivery');
      expect(result.shippingSnapshot.templates[0].charge).toBe(49);
      expect(result.shippingSnapshot.templates[0].isFreeShipping).toBe(false);
    });

    it('returns ₹0 free shipping when cart reaches ₹499', async () => {
      const items = [
        { productId: 'p1', quantity: 2, price: 250, weight: 0.2 },
      ];
      const result = await service.calculateShipping(items, 500);
      expect(result.shippingTotal).toBe(0);
      expect(result.shippingSnapshot.templates[0].isFreeShipping).toBe(true);
    });

    it('returns ₹0 when cart subtotal is 0 or items empty', async () => {
      const result = await service.calculateShipping([], 0);
      expect(result.shippingTotal).toBe(0);
    });
  });

  describe('calculateShipping - Weight Based Slabs', () => {
    beforeEach(() => {
      mockPrisma.shippingTemplate.findFirst.mockResolvedValue(defaultOrderValueTemplate);
      mockPrisma.shippingTemplate.findMany.mockResolvedValue([weightBasedTemplate]);
    });

    it('calculates rate matching the first weight slab (<= 1.0 kg)', async () => {
      const items = [
        { productId: 'pw1', shippingTemplateId: 'tmpl-weight', quantity: 2, price: 200, weight: 0.4 }, // 0.8 kg
      ];
      const result = await service.calculateShipping(items, 400);
      expect(result.shippingTotal).toBe(50);
      expect(result.shippingCarrier).toBe('SafeExpress');
    });

    it('calculates rate matching the second weight slab (<= 3.0 kg)', async () => {
      const items = [
        { productId: 'pw1', shippingTemplateId: 'tmpl-weight', quantity: 5, price: 200, weight: 0.4 }, // 2.0 kg
      ];
      const result = await service.calculateShipping(items, 1000);
      expect(result.shippingTotal).toBe(100);
    });

    it('blocks checkout with BadRequestException when total weight exceeds last slab', async () => {
      const items = [
        { productId: 'pw1', shippingTemplateId: 'tmpl-weight', quantity: 15, price: 100, weight: 0.5 }, // 7.5 kg (> 5.0 kg)
      ];

      await expect(
        service.calculateShipping(items, 1500, { throwOnError: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns weightError instead of throwing when throwOnError is false', async () => {
      const items = [
        { productId: 'pw1', shippingTemplateId: 'tmpl-weight', quantity: 15, price: 100, weight: 0.5 }, // 7.5 kg
      ];

      const res = await service.calculateShipping(items, 1500, { throwOnError: false });
      expect(res.weightError).toContain('exceeds the maximum shipping weight limit');
    });

    it('applies free shipping when cart reaches free shipping threshold even with weight template', async () => {
      const items = [
        { productId: 'pw1', shippingTemplateId: 'tmpl-weight', quantity: 2, price: 1200, weight: 1.0 }, // 2.0 kg, total ₹2400 >= ₹2000
      ];
      const result = await service.calculateShipping(items, 2400);
      expect(result.shippingTotal).toBe(0);
      expect(result.shippingSnapshot.templates[0].isFreeShipping).toBe(true);
    });
  });

  describe('calculateShipping - Multiple Templates Combined', () => {
    beforeEach(() => {
      mockPrisma.shippingTemplate.findFirst.mockResolvedValue(defaultOrderValueTemplate);
      mockPrisma.shippingTemplate.findMany.mockResolvedValue([
        defaultOrderValueTemplate,
        weightBasedTemplate,
      ]);
    });

    it('adds charges together when products use different templates and subtotal is below free shipping thresholds', async () => {
      const items = [
        // Product 1 uses default template (₹49 below ₹499)
        { productId: 'p1', shippingTemplateId: 'tmpl-default-val', quantity: 1, price: 100, weight: 0.1 },
        // Product 2 uses weight template (<= 1.0kg -> ₹50, free above ₹2000)
        { productId: 'p2', shippingTemplateId: 'tmpl-weight', quantity: 1, price: 200, weight: 0.5 },
      ];
      // Cart subtotal = 300 (< 499 and < 2000)
      const result = await service.calculateShipping(items, 300);
      // Expected: 49 + 50 = 99
      expect(result.shippingTotal).toBe(99);
      expect(result.shippingSnapshot.templates.length).toBe(2);
    });

    it('frees the default template (subtotal >= 499) while charging the weight template (subtotal < 2000)', async () => {
      const items = [
        { productId: 'p1', shippingTemplateId: 'tmpl-default-val', quantity: 1, price: 500, weight: 0.1 },
        { productId: 'p2', shippingTemplateId: 'tmpl-weight', quantity: 1, price: 200, weight: 0.5 },
      ];
      // Cart subtotal = 700 (>= 499, but < 2000)
      const result = await service.calculateShipping(items, 700);
      // Expected: 0 (default) + 50 (weight) = 50
      expect(result.shippingTotal).toBe(50);
    });

    it('frees both templates when whole cart subtotal reaches the highest threshold (>= 2000)', async () => {
      const items = [
        { productId: 'p1', shippingTemplateId: 'tmpl-default-val', quantity: 2, price: 800, weight: 0.1 },
        { productId: 'p2', shippingTemplateId: 'tmpl-weight', quantity: 1, price: 600, weight: 0.5 },
      ];
      // Cart subtotal = 2200 (>= 499 and >= 2000)
      const result = await service.calculateShipping(items, 2200);
      expect(result.shippingTotal).toBe(0);
      expect(result.shippingSnapshot.templates.every((t) => t.isFreeShipping)).toBe(true);
    });
  });

  describe('Slab Validation Rules', () => {
    it('rejects weight templates with open-ended slabs (upTo: null)', async () => {
      await expect(
        service.create({
          name: 'Invalid Weight',
          carrierName: 'Carrier',
          rateType: ShippingRateType.weight,
          slabs: [
            { upTo: 1.0, charge: 50 },
            { upTo: null, charge: 100 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects order value templates where open-ended slab is not the last slab', async () => {
      await expect(
        service.create({
          name: 'Invalid Value Slabs',
          carrierName: 'Carrier',
          rateType: ShippingRateType.order_value,
          slabs: [
            { upTo: null, charge: 50 },
            { upTo: 500, charge: 100 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-increasing slabs', async () => {
      await expect(
        service.create({
          name: 'Decreasing Slabs',
          carrierName: 'Carrier',
          rateType: ShippingRateType.weight,
          slabs: [
            { upTo: 5.0, charge: 50 },
            { upTo: 2.0, charge: 100 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
