import { Module } from '@nestjs/common';
import { SimplexMethodController } from './simplex-method.controller';
import { SimplexMethodService } from './simplex-method.service';

@Module({
  controllers: [SimplexMethodController],
  providers: [SimplexMethodService],
})
export class SimplexMethodModule {}
