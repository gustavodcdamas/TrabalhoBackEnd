import { Test, TestingModule } from '@nestjs/testing';
import { CriativosController } from './criativos.controller';
import { CriativosService } from './criativos.service';

describe('CriativosController', () => {
  let controller: CriativosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CriativosController],
      providers: [CriativosService],
    }).compile();

    controller = module.get<CriativosController>(CriativosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
