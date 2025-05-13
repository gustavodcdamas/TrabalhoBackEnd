import { Test, TestingModule } from '@nestjs/testing';
import { InstitucionalController } from './institucional.controller';
import { InstitucionalService } from './institucional.service';

describe('InstitucionalController', () => {
  let controller: InstitucionalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitucionalController],
      providers: [InstitucionalService],
    }).compile();

    controller = module.get<InstitucionalController>(InstitucionalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
