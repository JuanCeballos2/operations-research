import { Module } from '@nestjs/common';
import { DualMethodController } from './dual-method.controller';
import { DualMethodService } from './dual-method.service';

@Module({
  controllers: [DualMethodController],
  providers: [DualMethodService],
})
export class DualMethodModule {}
