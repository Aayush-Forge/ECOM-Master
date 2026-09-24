import { Test, TestingModule } from '@nestjs/testing';
import { ClubbingService } from './clubbing.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ClubbingRuleType } from '@prisma/client';

describe('ClubbingService', () => {
  let service: ClubbingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      clubbingRule: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      clubbingRuleProduct: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubbingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClubbingService>(ClubbingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRule', () => {
    it('creates a clubbing rule with nested products', async () => {
      const dto = {
        name: 'Buy 2 Shoes Save 500',
        type: ClubbingRuleType.fixed_price_bundle,
        requiredQuantity: 2,
        fixedPrice: 1500,
        applicableProductIds: ['prod-1', 'prod-2'],
      };

      prisma.clubbingRule.create.mockResolvedValue({ id: 'rule-1', ...dto });

      const result = await service.createRule(dto);
      expect(result.id).toBe('rule-1');
      expect(prisma.clubbingRule.create).toHaveBeenCalled();
    });
  });

  describe('deleteRule', () => {
    it('throws NotFoundException if rule does not exist', async () => {
      prisma.clubbingRule.findUnique.mockResolvedValue(null);

      await expect(service.deleteRule('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes joined products and rule', async () => {
      prisma.clubbingRule.findUnique.mockResolvedValue({ id: 'rule-1' });
      prisma.clubbingRuleProduct.deleteMany.mockResolvedValue({ count: 2 });
      prisma.clubbingRule.delete.mockResolvedValue({ id: 'rule-1' });

      const result = await service.deleteRule('rule-1');
      expect(result).toEqual({ id: 'rule-1' });
      expect(prisma.clubbingRuleProduct.deleteMany).toHaveBeenCalledWith({
        where: { ruleId: 'rule-1' },
      });
      expect(prisma.clubbingRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
    });
  });

  describe('calculateCartDiscount', () => {
    it('calculates fixed price bundle discount correctly', async () => {
      prisma.clubbingRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Buy 2 for 800',
          type: ClubbingRuleType.fixed_price_bundle,
          requiredQuantity: 2,
          fixedPrice: 800,
          isActive: true,
          products: [{ productId: 'p1' }, { productId: 'p2' }],
        },
      ]);

      const cartItems = [
        { productId: 'p1', quantity: 1, price: 500 },
        { productId: 'p2', quantity: 1, price: 500 },
      ];

      const res = await service.calculateCartDiscount(cartItems);
      // original = 1000, fixedPrice = 800 => discount = 200
      expect(res.discountTotal).toBe(200);
    });

    it('calculates percentage off bundle discount correctly', async () => {
      prisma.clubbingRule.findMany.mockResolvedValue([
        {
          id: 'rule-2',
          name: 'Buy 3 get 20% off',
          type: ClubbingRuleType.percentage_off_bundle,
          requiredQuantity: 3,
          percentageOff: 20,
          isActive: true,
          products: [{ productId: 'p1' }],
        },
      ]);

      const cartItems = [{ productId: 'p1', quantity: 3, price: 100 }];

      const res = await service.calculateCartDiscount(cartItems);
      // original = 300, 20% = 60
      expect(res.discountTotal).toBe(60);
    });
  });
});
