import { Controller, Post, Body, Get } from '@nestjs/common';
import { WppService } from './wpp.service';
import { SendMessageDto } from './dto/wpp.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@Controller('wpp')
export class WppController {
  constructor(private readonly whatsappService: WppService) {}

  @Post('send-message')
  async sendMessage(@Body() dto: SendMessageDto) {
    const success = await this.whatsappService.sendTextMessage(dto);
    return { success, message: 'Mensagem enviada com sucesso' };
  }

  @Get('session-status')
  async checkStatus() {
    const isActive = await this.whatsappService.checkSessionStatus();
    return { connected: isActive };
  }
}