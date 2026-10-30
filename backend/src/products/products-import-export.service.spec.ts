import { Test, TestingModule } from '@nestjs/testing';
import { ProductsImportExportService } from './products-import-export.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus } from '@prisma/client';

describe('ProductsImportExportService', () => {
  let service: ProductsImportExportService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findMany: jest.fn().mockResolvedValue([{ id: 'cat-1', name: 'General', slug: 'general' }]),
        create: jest.fn(),
      },
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ nextval: 9999 }]),
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsImportExportService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsImportExportService>(ProductsImportExportService);
  });

  describe('variation ID matching and generation', () => {
    it('(a) re-import keeps existing variation id when SKU matches', async () => {
      const existingProduct = {
        id: 'prod-uuid-1',
        sku: 'PARENT-01',
        title: 'Parent Product',
        status: ProductStatus.active,
        variations: [
          {
            id: 'var-uuid-existing-1',
            sku: 'VAR-SKU-01',
            regularPrice: 100,
            salePrice: 80,
            stockQuantity: 10,
            isActive: true,
          },
        ],
      };

      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      let updatedData: any = null;
      mockPrismaService.product.update.mockImplementation(({ data }: any) => {
        updatedData = data;
        return Promise.resolve({ ...existingProduct, ...data });
      });

      const csv = [
        'Type,SKU,Title,Category,Regular Price,Sale Price,Stock,Status,Parent SKU,Attributes',
        'variable,PARENT-01,Parent Product,General,100,80,10,active,,',
        'variation,VAR-SKU-01,,General,100,80,10,active,PARENT-01,Size:Large',
      ].join('\n');

      const result = await service.importProductsFromCsv(csv, true);
      expect(result.updatedParents).toBe(1);
      expect(updatedData).toBeDefined();
      expect(updatedData.variations).toHaveLength(1);
      expect(updatedData.variations[0].sku).toBe('VAR-SKU-01');
      expect(updatedData.variations[0].id).toBe('var-uuid-existing-1');
    });

    it('(b) a new variation SKU gets a new id (different from existing)', async () => {
      const existingProduct = {
        id: 'prod-uuid-1',
        sku: 'PARENT-01',
        title: 'Parent Product',
        status: ProductStatus.active,
        variations: [
          {
            id: 'var-uuid-existing-1',
            sku: 'VAR-SKU-OLD',
            regularPrice: 100,
            stockQuantity: 10,
            isActive: true,
          },
        ],
      };

      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      let updatedData: any = null;
      mockPrismaService.product.update.mockImplementation(({ data }: any) => {
        updatedData = data;
        return Promise.resolve({ ...existingProduct, ...data });
      });

      const csv = [
        'Type,SKU,Title,Category,Regular Price,Sale Price,Stock,Status,Parent SKU,Attributes',
        'variable,PARENT-01,Parent Product,General,100,80,10,active,,',
        'variation,VAR-SKU-NEW,,General,120,90,15,active,PARENT-01,Size:XL',
      ].join('\n');

      const result = await service.importProductsFromCsv(csv, true);
      expect(result.updatedParents).toBe(1);
      expect(updatedData.variations).toHaveLength(1);
      expect(updatedData.variations[0].sku).toBe('VAR-SKU-NEW');
      expect(updatedData.variations[0].id).toBeDefined();
      expect(updatedData.variations[0].id).not.toBe('var-uuid-existing-1');
      expect(typeof updatedData.variations[0].id).toBe('string');
    });
  });

  describe('status mapping', () => {
    it('(c) status mapping: active/draft/archived, blank keeps, invalid skips the row with an error', async () => {
      // 1. Explicit active, draft, archived
      const updateCalls: any[] = [];
      mockPrismaService.product.update.mockImplementation(({ data }: any) => {
        updateCalls.push(data);
        return Promise.resolve(data);
      });

      mockPrismaService.product.findUnique.mockImplementation(({ where }: any) => {
        return Promise.resolve({
          id: `prod-${where.sku}`,
          sku: where.sku,
          title: `Title ${where.sku}`,
          status: ProductStatus.archived, // existing DB status is archived
        });
      });

      const validStatusesCsv = [
        'Type,SKU,Title,Category,Regular Price,Sale Price,Stock,Status',
        'simple,SKU-ACT,Active Item,General,100,,10,active',
        'simple,SKU-DRF,Draft Item,General,100,,10,draft',
        'simple,SKU-ARC,Archived Item,General,100,,10,archived',
        'simple,SKU-BLANK,Blank Status Item,General,100,,10,   ',
      ].join('\n');

      await service.importProductsFromCsv(validStatusesCsv, true);
      expect(updateCalls).toHaveLength(4);
      expect(updateCalls[0].status).toBe(ProductStatus.active);
      expect(updateCalls[1].status).toBe(ProductStatus.draft);
      expect(updateCalls[2].status).toBe(ProductStatus.archived);
      expect(updateCalls[3].status).toBe(ProductStatus.archived); // blank keeps existing DB status

      // 2. Invalid status skips the row with an error
      const invalidStatusCsv = [
        'Type,SKU,Title,Category,Regular Price,Sale Price,Stock,Status',
        'simple,SKU-INV,Invalid Status Item,General,100,,10,unknown_status',
      ].join('\n');

      const resultInvalid = await service.importProductsFromCsv(invalidStatusCsv, true);
      expect(resultInvalid.errors).toHaveLength(1);
      expect(resultInvalid.errors[0]).toEqual({
        row: 2,
        sku: 'SKU-INV',
        message: 'Invalid status',
      });
      expect(resultInvalid.createdParents).toBe(0);
      expect(resultInvalid.updatedParents).toBe(0);
    });
  });
});
