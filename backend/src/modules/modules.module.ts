import { Module } from '@nestjs/common';
import { GraphicalMethodModule } from './graphical-method/graphical-method.module';
import { SimplexMethodModule } from './simplex-method/simplex-method.module';
import { DualMethodModule } from './dual-method/dual-method.module';

@Module({
  imports: [GraphicalMethodModule, SimplexMethodModule, DualMethodModule],
})
export class ModulesModule {}
