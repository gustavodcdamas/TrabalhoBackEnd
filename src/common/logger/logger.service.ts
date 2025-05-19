import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService extends Logger {
  // Custom logging methods for different log levels
  log(message: string) {
    super.log(message);
    // Additional logging logic
  }
  error(message: string, trace: string) {
    super.error(message, trace);
    // Additional error logging logic
  }
  warn(message: string) {
    super.warn(message);
    // Additional warning logging logic
  }
}