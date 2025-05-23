import { Test, TestingModule } from '@nestjs/testing';
import { LimpezaService } from './limpeza.service';

describe('LimpezaService', () => {
  let service: LimpezaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LimpezaService],
    }).compile();

    service = module.get<LimpezaService>(LimpezaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
