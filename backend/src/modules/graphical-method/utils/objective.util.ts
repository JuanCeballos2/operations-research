import { Point } from '../interfaces/graphical.method.interface';

export function evaluate(point: Point, objective: number[]): number {
  return point.x * objective[0] + point.y * objective[1];
}

export function getOptimal(
  points: Point[],
  objective: number[],
  type: 'max' | 'min',
) {
  let bestPoint: Point | null = null;
  let bestValue = type === 'max' ? -Infinity : Infinity;

  points.forEach((p) => {
    const value = evaluate(p, objective);

    if (
      (type === 'max' && value > bestValue) ||
      (type === 'min' && value < bestValue)
    ) {
      bestValue = value;
      bestPoint = p;
    }
  });

  return { bestPoint, bestValue };
}
