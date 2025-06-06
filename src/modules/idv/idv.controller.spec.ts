import { Test, TestingModule } from '@nestjs/testing';
import { IdvController } from './idv.controller';
import { IdvService } from './idv.service';

describe('IdvController', () => {
  let controller: IdvController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdvController],
      providers: [IdvService],
    }).compile();

    controller = module.get<IdvController>(IdvController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
