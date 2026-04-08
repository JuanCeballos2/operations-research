import { Body, Controller, Post } from '@nestjs/common';
import { CreateSimplexDto } from './dtos/simplex-method.dto';
import { SimplexMethodService } from './simplex-method.service';

@Controller('simplex-method')
export class SimplexMethodController {
  constructor(private readonly simplexService: SimplexMethodService) {}

  @Post()
  solveSimplex(@Body() problem: CreateSimplexDto) {
    return this.simplexService.solveSimplex(problem);
  }
}
