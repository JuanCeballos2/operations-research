import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, ValidateNested } from 'class-validator';

import { Type } from 'class-transformer';

export class ConstraintDualDto {
  @ApiProperty({
    example: [3, 1],
  })
  @IsArray()
  coefficients!: number[];

  @ApiProperty({
    example: 3,
  })
  @IsNumber()
  value!: number;

  @ApiProperty({
    example: '>=',
    enum: ['<=', '>=', '='],
  })
  @IsIn(['<=', '>=', '='])
  type!: '<=' | '>=' | '=';
}

export class CreateDualMethodDto {
  @ApiProperty({
    example: [2, 1],
  })
  @IsArray()
  objective!: number[];

  @ApiProperty({
    example: 'min',
    enum: ['max', 'min'],
  })
  @IsIn(['max', 'min'])
  type!: 'max' | 'min';

  @ApiProperty({
    type: [ConstraintDualDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConstraintDualDto)
  constraints!: ConstraintDualDto[];

  @ApiProperty({
    example: ['positive', 'positive'],
  })
  @IsArray()
  variableSigns!: ('positive' | 'negative' | 'free')[];
}
