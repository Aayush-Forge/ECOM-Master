jest.mock('sanitize-html', () => jest.fn((str) => str));

import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const mockPrismaService = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transformProductResponse', () => {
    const mockProduct = {
      id: 'prod-1',
      title: 'Variable Dhoop',
      sku: 'VAR-1',
      productType: 'variable',
      version: 3,
      attributes: [{ name: 'Size', options: ['Small', 'Large'] }],
      variations: [
        { id: 'v1', sku: 'VAR-1-01', regularPrice: 100, salePrice: 80, stockQuantity: 10, isActive: true },
        { id: 'v2', sku: 'VAR-1-02', regularPrice: 150, stockQuantity: 5, isActive: false },
      ],
    };

    it('strips raw variations and version on public responses', () => {
      const publicRes = service.transformProductResponse(mockProduct, false);
      expect(publicRes.variations).toBeUndefined();
      expect(publicRes.version).toBeUndefined();
      expect(publicRes.type).toBe('variable');
      expect(publicRes.variationsData).toHaveLength(1);
      expect(publicRes.variationsData[0].sku).toBe('VAR-1-01');
      expect(publicRes.variationsData[0].isActive).toBeUndefined();
    });

    it('preserves raw variations and version on admin responses', () => {
      const adminRes = service.transformProductResponse(mockProduct, true);
      expect(adminRes.variations).toBeDefined();
      expect(adminRes.version).toBe(3);
      expect(adminRes.variationsData).toHaveLength(2);
      expect(adminRes.variationsData[1].isActive).toBe(false);
    });
  });

  describe('generateSku & getNextSuggestedSku', () => {
    it('generates parent SKU using SMEXXXXX pattern and variant SKU using SMEXXXXX-XX', async () => {
      (service as any).prismaService.$queryRawUnsafe = jest
        .fn()
        .mockResolvedValueOnce([{ nextval: 10001 }]);

      const normalSku = await service.generateSku();
      expect(normalSku).toBe('SME10001');

      const variantSku1 = await service.generateSku('SME10001', 1);
      expect(variantSku1).toBe('SME10001-01');

      const variantSku12 = await service.generateSku('SME10001', 12);
      expect(variantSku12).toBe('SME10001-12');
    });

    it('returns next suggested SKU matching SMEXXXXX pattern', async () => {
      (service as any).prismaService.$queryRawUnsafe = jest
        .fn()
        .mockResolvedValueOnce([{ last_value: 10005, is_called: true }]);

      const suggested = await service.getNextSuggestedSku();
      expect(suggested.sku).toBe('SME10006');
    });
  });
});
