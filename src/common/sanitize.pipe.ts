import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isEmail, normalizeEmail } from 'validator';

@Injectable()
export class SanitizePipe implements PipeTransform {
  private readonly allowedSpecialChars = "@.'´^`~";
  private readonly allowedPatterns = {
    default: new RegExp(`[^a-zA-Z0-9${this.escapeRegExp(this.allowedSpecialChars)}\\sÀ-ÿ]`, 'g'),
    email: /[^a-zA-Z0-9@._-]/g,
    name: new RegExp(`[^a-zA-Z\\s${this.escapeRegExp(this.allowedSpecialChars)}À-ÿ]`, 'g'),
    username: /[^a-zA-Z0-9_-]/g,
    text: new RegExp(`[^a-zA-Z0-9${this.escapeRegExp(this.allowedSpecialChars)}\\sÀ-ÿ.,;:!?()\\[\\]{}\\/\\\\]`, 'g'),
    html: /<[^>]*>?/gm,
    url: /[^a-zA-Z0-9-._~:\/?#[\]@!$&'()*+,;=]/g,
    address: new RegExp(`[^a-zA-Z0-9${this.escapeRegExp(this.allowedSpecialChars)}\\sÀ-ÿ.,#-]`, 'g')
  };

  private readonly excludedFields = ['senha', 'password', 'confirmarsenha', 'confirmpassword', 'newpassword', 'oldpassword', 'currentpassword', 'resetpassword'];

  constructor(private fieldConfig: Record<string, string> = {}) {}

  transform(value: any) {
    if (value && typeof value === 'object') {
      return this.sanitizeObject(value);
    }
    return this.sanitizeValue(value);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private sanitizeObject(obj: Record<string, any>): any {
    console.log('Dados recebidos para sanitização:', obj);
    const result = { ...obj };
    for (const key in result) {
      if (result.hasOwnProperty(key)) {
        if (this.excludedFields.includes(key.toLowerCase())) {
          continue;
        }
        const sanitizerType = this.fieldConfig[key] || this.detectSanitizerType(key, result[key]);
        result[key] = this.sanitizeValue(result[key], sanitizerType);
      }
    }
    return result;
  }

  private detectSanitizerType(key: string, value: any): string | undefined {
    if (typeof value !== 'string') return undefined;
    
    const keyLower = key.toLowerCase();
    if (/email/i.test(keyLower)) return 'email';
    if (/name|nome|firstName|lastName|titulo|title|servi[çc]o|creative|landing|institucional|identidade/i.test(keyLower)) return 'name';
    if (/username|login|userName/i.test(keyLower)) return 'username';
    if (/descricao|description|bio|texto|content/i.test(keyLower)) return 'text';
    if (/html|conteudo|body/i.test(keyLower)) return 'html';
    if (/url|link|website|icon|image|imagem/i.test(keyLower)) return 'url';
    if (/endere[çc]o|address|rua|avenida|logradouro/i.test(keyLower)) return 'address';
    
    return 'default';
  }

  private sanitizeValue(value: any, type?: string): any {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'string') return value;
    
    const trimmed = value.trim();
    if (!trimmed) return trimmed;

    switch (type) {
      case 'email':
        return this.sanitizeEmail(trimmed);
      case 'name':
        return this.sanitizeName(trimmed);
      case 'username':
        return this.sanitizeUsername(trimmed);
      case 'text':
        return this.sanitizeText(trimmed);
      case 'html':
        return this.sanitizeHtml(trimmed);
      case 'url':
        return this.sanitizeUrl(trimmed);
      case 'address':
        return this.sanitizeAddress(trimmed);
      default:
        return this.sanitizeDefault(trimmed);
    }
  }

  private sanitizeEmail(email: string): string {
    if (!isEmail(email)) {
      throw new BadRequestException('Email inválido');
    }
    const normalized = normalizeEmail(email);
    return normalized || email.replace(this.allowedPatterns.email, '');
  }

  private sanitizeName(name: string): string {
    return name.replace(this.allowedPatterns.name, '');
  }

  private sanitizeUsername(username: string): string {
    return username.replace(this.allowedPatterns.username, '');
  }

  private sanitizeText(text: string): string {
    return text.replace(this.allowedPatterns.text, '');
  }

  private sanitizeHtml(html: string): string {
    // Opcional: usar uma lib como sanitize-html para mais segurança
    return html.replace(this.allowedPatterns.html, '');
  }

  private sanitizeUrl(url: string): string {
    return url.replace(/\s/g, '').replace(this.allowedPatterns.url, '');
  }

  private sanitizeAddress(address: string): string {
    return address.replace(this.allowedPatterns.address, '');
  }

  private sanitizeDefault(value: string): string {
    return value.replace(this.allowedPatterns.default, '');
  }
}

export class CustomSanitizePipe extends SanitizePipe {
  constructor() {
    super({
      titulo: 'name',
      descricao: 'text',
      icon: 'url'
    });
  }
}