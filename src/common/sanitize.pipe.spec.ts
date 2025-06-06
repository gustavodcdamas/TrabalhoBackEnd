import { Test } from '@nestjs/testing';
import { SanitizePipe } from './sanitize.pipe';
import { BadRequestException } from '@nestjs/common';

describe('SanitizePipe', () => {
  let pipe: SanitizePipe;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SanitizePipe],
    }).compile();

    pipe = module.get<SanitizePipe>(SanitizePipe);
  });

  it('should sanitize names correctly', () => {
    const input = { nome: 'João@123!' };
    const expected = { nome: 'João@' };
    expect(pipe.transform(input)).toEqual(expected);
  });

  it('should sanitize emails correctly', () => {
    const input = { email: 'joão@exemplo.com' };
    const expected = { email: 'joao@exemplo.com' };
    expect(pipe.transform(input)).toEqual(expected);
  });

  it('should throw for invalid emails', () => {
    const input = { email: 'invalid-email' };
    expect(() => pipe.transform(input)).toThrow(BadRequestException);
  });

  it('should sanitize objects', () => {
    const input = {
      nome: 'Serviço@123!',
      descricao: 'Descrição <script>alert("xss")</script> válida'
    };
    const expected = {
      nome: 'Serviço@',
      descricao: 'Descrição alert("xss") válida'
    };
    expect(pipe.transform(input)).toEqual(expected);
  });

  // Teste adicional para valores não-objeto
  it('should sanitize plain strings', () => {
    const input = 'Texto@123!';
    const expected = 'Texto@';
    expect(pipe.transform(input)).toBe(expected);
  });

    it('should sanitize as name when configured', () => {
    const customPipe = new SanitizePipe({ campo: 'name' });
    const input = { campo: 'João@123!' };
    expect(customPipe.transform(input)).toEqual({ campo: 'João@' });
    });
});