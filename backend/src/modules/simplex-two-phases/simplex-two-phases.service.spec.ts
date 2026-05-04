import { Test, TestingModule } from '@nestjs/testing';
import { SimplexTwoPhasesService } from './simplex-two-phases.service';

describe('SimplexTwoPhasesService', () => {
  let service: SimplexTwoPhasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimplexTwoPhasesService],
    }).compile();

    service = module.get<SimplexTwoPhasesService>(SimplexTwoPhasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
