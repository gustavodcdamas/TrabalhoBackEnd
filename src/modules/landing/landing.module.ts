import { forwardRef, Module } from '@nestjs/common';
import { LandingService } from './landing.service';
import { LandingController } from './landing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Landing } from './entities/landing.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { LoggerModule } from '../logger/logger.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Landing]),
    forwardRef(() => UploadsModule),
    LoggerModule,
  ],
  controllers: [LandingController],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
