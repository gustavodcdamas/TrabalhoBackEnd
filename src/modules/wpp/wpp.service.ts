import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SendMessageDto } from './dto/wpp.dto';
import { WhatsappConfig } from './interfaces/wpp-config.interface';

@Injectable()
export class WppService {
  private readonly logger = new Logger(WppService.name);
  private readonly config: WhatsappConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.config = {
      apiUrl: this.configService.get<string>('WHATSAPP_API_URL'),
      apiKey: this.configService.get<string>('WHATSAPP_API_KEY'),
      sessionName: this.configService.get<string>('WHATSAPP_SESSION_NAME'),
      defaultTimeout: this.configService.get<number>('WHATSAPP_TIMEOUT', 30000),
    };
  }

  async sendTextMessage(dto: SendMessageDto): Promise<boolean> {
    try {
      const url = `${this.config.apiUrl}/message/sendText/${this.config.sessionName}`;
      
      const payload = {
        number: dto.phoneNumberDest,
        textMessage: {
          text: `*Mensagem de ${dto.contactName}:*\n\n${dto.menssagemDest}`
        },
        options: {
          delay: 1200,
          presence: 'composing'
        }
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'apikey': this.config.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: this.config.defaultTimeout
        })
      );

      this.logger.log(`Mensagem enviada para ${dto.phoneNumberDest}`, response.data);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem: ${error.message}`, error.stack);
      throw new Error(`Falha no envio: ${this.extractErrorMessage(error)}`);
    }
  }

  private extractErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    return error.message;
  }

  async checkSessionStatus(): Promise<boolean> {
    try {
      const url = `${this.config.apiUrl}/session/status/${this.config.sessionName}`;
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'apikey': this.config.apiKey },
          timeout: this.config.defaultTimeout
        })
      );

      return response.data.status === 'CONNECTED';
    } catch (error) {
      this.logger.error('Erro ao verificar status da sessão', error.stack);
      return false;
    }
  }
}