import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ClubbingController } from './clubbing.controller';
import { ClubbingService } from './clubbing.service';
import { AuditLogsService } from '../audit/audit-logs.service';
import { R2Service } from '../r2/r2.service';

describe('ClubbingController', () => {
  let controller: ClubbingController;

  beforeEach(async () => {
    const mockClubbingService = {
      createRule: jest.fn(),
      getAllRules: jest.fn(),
      getActiveRules: jest.fn(),
      deleteRule: jest.fn(),
    };

    const mockAuditLogsService = {
      createLog: jest.fn(),
    };

    const mockR2Service = {
      uploadFile: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClubbingController],
      providers: [
        { provide: ClubbingService, useValue: mockClubbingService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: R2Service, useValue: mockR2Service },
        Reflector,
      ],
    }).compile();

    controller = module.get<ClubbingController>(ClubbingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
