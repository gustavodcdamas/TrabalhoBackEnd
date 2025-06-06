import { Test, TestingModule } from '@nestjs/testing';
import { ServicosService } from './servicos.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Servicos } from './entities/servicos.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UploadsService } from '../uploads/uploads.service';
import { LoggerService } from '../logger/logger.service';

describe('ServicosService', () => {
  let service: ServicosService;
  let mockRepository: any;
  let mockCacheManager: any;
  let mockUploadsService: any;
  let mockLoggerService: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      merge: jest.fn(),
    };

    mockCacheManager = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      clear: jest.fn(),
    };

    mockUploadsService = {
      processUploadedImage: jest.fn(),
      deleteFile: jest.fn(),
    };

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicosService,
        {
          provide: getRepositoryToken(Servicos),
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: UploadsService,
          useValue: mockUploadsService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<ServicosService>(ServicosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a service successfully', async () => {
      const dto = { titulo: 'Test', descricao: 'Test Desc' };
      const expectedResult = { id: '1', ...dto };
      
      mockRepository.create.mockReturnValue(dto);
      mockRepository.save.mockResolvedValue(expectedResult);

      const result = await service.create(dto);
      expect(result).toEqual(expectedResult);
      expect(mockCacheManager.del).toHaveBeenCalled();
    });
  });

  // Adicione mais testes para outros métodos
});