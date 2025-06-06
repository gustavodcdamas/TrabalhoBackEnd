// servicos.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ServicosController } from './servicos.controller';
import { ServicosService } from './servicos.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Servicos } from './entities/servicos.entity';

describe('ServicosController', () => {
  let controller: ServicosController;
  let service: ServicosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicosController],
      providers: [
        {
          provide: ServicosService,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
            findAll: jest.fn().mockResolvedValue([]),
            // Mock outros métodos conforme necessário
          },
        },
      ],
    }).compile();

    controller = module.get<ServicosController>(ServicosController);
    service = module.get<ServicosService>(ServicosService);
  });

  describe('GET /servicos', () => {
    it('should return an array of services', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  // Adicione mais testes para outros endpoints
});