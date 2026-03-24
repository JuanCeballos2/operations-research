import { Constraint, Point } from '../interfaces/graphical.method.interface';

export function getAxisIntersections(c: Constraint): Point[] {
  const [a, b] = c.coefficients;
  const points: Point[] = [];

  // Intersección con eje X (y = 0)
  if (a !== 0) {
    points.push({ x: c.value / a, y: 0 });
  }

  // Intersección con eje Y (x = 0)
  if (b !== 0) {
    points.push({ x: 0, y: c.value / b });
  }

  return points;
}

export function solveIntersection(
  c1: Constraint,
  c2: Constraint,
): Point | null {
  const [a1, b1] = c1.coefficients;
  const [a2, b2] = c2.coefficients;

  const det = a1 * b2 - a2 * b1;
  if (det === 0) return null;

  const x = (c1.value * b2 - c2.value * b1) / det;
  const y = (a1 * c2.value - a2 * c1.value) / det;

  return { x, y };
}
