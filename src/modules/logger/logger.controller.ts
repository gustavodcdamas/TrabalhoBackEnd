import { Controller, Get, Query } from '@nestjs/common';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { LoggerService } from './logger.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@Controller('api/logs')
export class LogsController {
  private readonly logsDir = join(process.cwd(), 'logs');

  @Get()
  getLogs(@Query('date') date?: string) {
    try {
      const logFile = date 
        ? `application-${date}.log`
        : this.getMostRecentLogFile();
      
      const logPath = join(this.logsDir, logFile);
      const logs = readFileSync(logPath, 'utf-8');
      
      return logs.split('\n')
        .filter(line => line)
        .map(line => JSON.parse(line));
    } catch (error) {
      return { error: 'Erro ao ler logs' };
    }
  }

  private getMostRecentLogFile(): string {
    const files = readdirSync(this.logsDir)
      .filter(file => file.startsWith('application-') && file.endsWith('.log'))
      .sort()
      .reverse();
    
    return files[0] || '';
  }
}