import { Module } from '@nestjs/common';
import { GraphicalMethodModule } from './graphical-method/graphical-method.module';

@Module({
  imports: [GraphicalMethodModule],
})
export class ModulesModule {}
