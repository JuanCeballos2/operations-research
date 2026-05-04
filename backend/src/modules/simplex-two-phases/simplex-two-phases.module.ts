import { Module } from '@nestjs/common';
import { SimplexTwoPhasesService } from './simplex-two-phases.service';
import { SimplexTwoPhasesController } from './simplex-two-phases.controller';

@Module({
  providers: [SimplexTwoPhasesService],
  controllers: [SimplexTwoPhasesController]
})
export class SimplexTwoPhasesModule {}
