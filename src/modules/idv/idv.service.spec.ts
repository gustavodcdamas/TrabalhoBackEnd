import { Test, TestingModule } from '@nestjs/testing';
import { IdvService } from './idv.service';

describe('IdvService', () => {
  let service: IdvService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdvService],
    }).compile();

    service = module.get<IdvService>(IdvService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
