import { IsArray, IsIn, IsNumber } from 'class-validator';

export class ConstraintDto {
  @IsArray()
  coefficients!: number[];

  @IsNumber()
  value!: number;

  @IsIn(['<=', '>=', '='])
  type!: '<=' | '>=' | '=';
}
