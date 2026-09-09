import { Test, TestingModule } from '@nestjs/testing';
import { ClubbingController } from './clubbing.controller';

describe('ClubbingController', () => {
  let controller: ClubbingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClubbingController],
    }).compile();

    controller = module.get<ClubbingController>(ClubbingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
