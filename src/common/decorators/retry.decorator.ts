import { Logger } from '@nestjs/common';

export function Retry(maxRetries: number, delayMs: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logger = new Logger(`${target.constructor.name}`);

    descriptor.value = async function (...args: any[]) {
      let lastError: Error | undefined;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          logger.warn(`Tentativa ${i + 1}/${maxRetries} falhou. ${lastError.message}`);
          
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
      
      logger.error(`Todas as ${maxRetries} tentativas falharam`);
      throw lastError ?? new Error('Unknown error after retries');
    };

    return descriptor;
  };
}