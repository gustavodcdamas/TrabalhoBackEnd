import { Module, Global, Logger } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LogsController } from './logger.controller';

@Global()
@Module({
  providers: [Logger, LoggerService],
  exports: [Logger],
  controllers: [LogsController],
})
export class LoggerModule {}