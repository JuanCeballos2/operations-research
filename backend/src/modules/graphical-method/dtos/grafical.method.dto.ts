import { Type } from 'class-transformer';
import { IsArray, IsIn, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConstraintDto } from './create-problem.dto';

export class CreateProblemDto {
  @ApiProperty({
    description: 'Coeficientes de la función objetivo (Z = 3x + 5y → [3,5])',
    example: [3, 5],
  })
  @IsArray()
  objective!: number[];

  @ApiProperty({
    description: 'Tipo de optimización',
    example: 'max',
  })
  @IsIn(['max', 'min'])
  type!: 'max' | 'min';

  @ApiProperty({
    description: 'Restricciones del problema',
    example: [
      { coefficients: [1, 1], value: 4, type: '<=' },
      { coefficients: [1, 0], value: 2, type: '<=' },
      { coefficients: [0, 1], value: 3, type: '<=' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConstraintDto)
  constraints!: ConstraintDto[];
}
