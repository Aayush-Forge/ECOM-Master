import { Test, TestingModule } from '@nestjs/testing';
import { ClubbingService } from './clubbing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClubbingService', () => {
  let service: ClubbingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubbingService,
        {
          provide: PrismaService,
          useValue: {
            clubbingRule: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ClubbingService>(ClubbingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
