import { Module, Global } from '@nestjs/common';
import { Logger } from './logger.service';
import { LoggerService } from '../../common/logger/logger.service';

@Global()
@Module({
  providers: [Logger, LoggerService],
  exports: [Logger],
})
export class LoggerModule {}