import { Test, TestingModule } from '@nestjs/testing';
import { InstitucionalService } from './institucional.service';

describe('InstitucionalService', () => {
  let service: InstitucionalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InstitucionalService],
    }).compile();

    service = module.get<InstitucionalService>(InstitucionalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
