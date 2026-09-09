import { Test, TestingModule } from '@nestjs/testing';
import { ClubbingService } from './clubbing.service';

describe('ClubbingService', () => {
  let service: ClubbingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClubbingService],
    }).compile();

    service = module.get<ClubbingService>(ClubbingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
