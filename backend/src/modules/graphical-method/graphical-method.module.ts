import { Module } from '@nestjs/common';
import { GraphicalMethodController } from './graphical-method.controller';
import { GraphicalMethodService } from './graphical-method.service';

@Module({
  controllers: [GraphicalMethodController],
  providers: [GraphicalMethodService],
})
export class GraphicalMethodModule {}
