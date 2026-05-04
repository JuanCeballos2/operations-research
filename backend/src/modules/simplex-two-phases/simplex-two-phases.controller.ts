import { Body, Controller, Post } from '@nestjs/common';
import { SimplexTwoPhasesService } from './simplex-two-phases.service';
import { CreateSimplexDto } from './dtos/simplex-method.dto';

@Controller('simplex-two-phases')
export class SimplexTwoPhasesController {
  constructor(private readonly simplexService: SimplexTwoPhasesService) {}

  @Post()
  solveSimplex(@Body() problem: CreateSimplexDto) {
    return this.simplexService.solveSimplex(problem);
  }
}
