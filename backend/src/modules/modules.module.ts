import { Module } from '@nestjs/common';
import { GraphicalMethodModule } from './graphical-method/graphical-method.module';
import { SimplexMethodModule } from './simplex-method/simplex-method.module';

@Module({
  imports: [GraphicalMethodModule, SimplexMethodModule],
})
export class ModulesModule {}
