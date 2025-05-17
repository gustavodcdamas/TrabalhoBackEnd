import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isEmail, normalizeEmail } from 'validator';

@Injectable()
export class SanitizePipe implements PipeTransform {
  private options: {
    isEmail?: boolean;
    isName?: boolean;
    isUsername?: boolean;
  };

  constructor(options: { isEmail?: boolean, isName?: boolean, isUsername?: boolean } = {}) {
    this.options = options;
  }

  transform(value: any) {
    if (typeof value === 'string') {
      let sanitized = value.trim();
      
      if (this.options.isEmail) {
        return this.sanitizeEmail(sanitized);
      } else if (this.options.isName) {
        return this.sanitizeName(sanitized);
      } else if (this.options.isUsername) {
        return this.sanitizeUsername(sanitized);
      }
      
      return sanitized;
    }
    return value;
  }

  private sanitizeEmail(email: string): string {
    // Padrão: letras, números, @, ., _ e -
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!isEmail(email)) {
      throw new BadRequestException('Email inválido');
    }

    // Remove caracteres inválidos (mantém apenas o padrão permitido)
    const sanitized = email.replace(/[^a-zA-Z0-9@._-]/g, '');
    
    if (!emailRegex.test(sanitized)) {
      throw new BadRequestException('Email contém caracteres inválidos');
    }

    const normalized = normalizeEmail(sanitized);
    if (normalized === false) {
      throw new BadRequestException('Falha ao normalizar o email');
    }
    
    return normalized;
  }

  private sanitizeName(name: string): string {
    // Padrão: letras, espaços, números e os sinais ^ e ´
    const nameRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s^´0-9]+$/;
    
    // Remove caracteres inválidos
    const sanitized = name.replace(/[^a-zA-ZÀ-ÿ\u00f1\u00d1\s^´0-9]/g, '');
    
    if (!nameRegex.test(sanitized)) {
      throw new BadRequestException('Nome contém caracteres inválidos');
    }

    return sanitized;
  }

  private sanitizeUsername(username: string): string {
    // Padrão: letras, números e underline
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    
    // Remove caracteres inválidos
    const sanitized = username.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (!usernameRegex.test(sanitized)) {
      throw new BadRequestException('Username contém caracteres inválidos');
    }

    return sanitized;
  }
}