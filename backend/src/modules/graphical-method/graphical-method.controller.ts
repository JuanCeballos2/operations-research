import { Body, Controller, Post } from '@nestjs/common';
import { GraphicalMethodService } from './graphical-method.service';
import { CreateProblemDto } from './dtos/grafical.method.dto';

@Controller('graphical-method')
export class GraphicalMethodController {
  constructor(private readonly service: GraphicalMethodService) {}

  @Post()
  solve(@Body() problem: CreateProblemDto) {
    return this.service.solveGraphical(problem);
  }
}
