import { Test, TestingModule } from '@nestjs/testing';
import { ClubbingController } from './clubbing.controller';
import { ClubbingService } from './clubbing.service';

describe('ClubbingController', () => {
  let controller: ClubbingController;

  beforeEach(async () => {
    const mockClubbingService = {
      createRule: jest.fn(),
      getAllRules: jest.fn(),
      getActiveRules: jest.fn(),
      deleteRule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClubbingController],
      providers: [
        { provide: ClubbingService, useValue: mockClubbingService },
      ],
    }).compile();

    controller = module.get<ClubbingController>(ClubbingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
