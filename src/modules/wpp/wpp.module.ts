import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { WppService } from './wpp.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('HTTP_TIMEOUT', 5000),
        maxRedirects: configService.get<number>('HTTP_MAX_REDIRECTS', 5),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [WppService],
  exports: [WppService],
})
export class WppModule {
  constructor() {
    console.log('📦 WPP Module inicializado');
  }
}