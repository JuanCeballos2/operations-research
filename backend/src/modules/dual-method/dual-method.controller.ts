import { Body, Controller, Post } from '@nestjs/common';
import { DualMethodService } from './dual-method.service';
import { CreateDualMethodDto } from './dtos/create-dual-method.dto';

@Controller('dual-method')
export class DualMethodController {
  constructor(private readonly dualService: DualMethodService) {}

  @Post()
  solveDual(@Body() problem: CreateDualMethodDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dualService.solveDual(problem);
  }
}
