import { Test, TestingModule } from '@nestjs/testing';
import { CriativosService } from './criativos.service';

describe('CriativosService', () => {
  let service: CriativosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CriativosService],
    }).compile();

    service = module.get<CriativosService>(CriativosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
