jest.mock('sanitize-html', () => jest.fn((str) => str));

import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsImportExportService } from './products-import-export.service';
import { R2Service } from '../r2/r2.service';

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const mockProductsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockR2Service = {
      getPublicUrl: jest.fn(),
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    const mockProductsImportExportService = {
      exportProductsToCsv: jest.fn(),
      importProductsFromCsv: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: mockProductsService },
        { provide: ProductsImportExportService, useValue: mockProductsImportExportService },
        { provide: R2Service, useValue: mockR2Service },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
