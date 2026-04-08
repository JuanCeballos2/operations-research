import { Type } from 'class-transformer';
import { IsArray, IsIn, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConstraintDto } from './create-problem.dto';

export class CreateSimplexDto {
  @ApiProperty({
    description: 'Coeficientes de la función objetivo (Z = 3x + 5y → [3,5])',
    example: [3, 5],
  })
  @IsArray()
  objective!: number[];

  @ApiProperty({
    description: 'Tipo de optimización: maximizar o minimizar',
    example: 'max',
  })
  @IsIn(['max', 'min'])
  type!: 'max' | 'min';

  @ApiProperty({
    description:
      'Restricciones del problema en forma estándar (preferiblemente <= para simplex básico)',
    example: [
      { coefficients: [1, 2], value: 10, type: '<=' },
      { coefficients: [3, 1], value: 15, type: '<=' },
      { coefficients: [2, 2], value: 12, type: '<=' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConstraintDto)
  constraints!: ConstraintDto[];
}
