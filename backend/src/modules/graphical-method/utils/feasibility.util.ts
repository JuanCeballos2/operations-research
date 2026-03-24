import { Constraint, Point } from '../interfaces/graphical.method.interface';

export function isFeasible(point: Point, constraints: Constraint[]): boolean {
  return constraints.every((c) => {
    const [a, b] = c.coefficients;
    const result = a * point.x + b * point.y;

    if (c.type === '<=') return result <= c.value;
    if (c.type === '>=') return result >= c.value;
    return result === c.value;
  });
}
