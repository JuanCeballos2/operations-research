import { Injectable } from '@nestjs/common';
import { CreateProblemDto } from './dtos/grafical.method.dto';
import { Solution, Point } from './interfaces/graphical.method.interface';

@Injectable()
export class GraphicalMethodService {
  solveGraphical(problem: CreateProblemDto): Solution {
  let rawPoints: Point[] = [];

  // 🔹 1. Intersecciones con ejes
  problem.constraints.forEach((c) => {
    rawPoints.push(...this.getAxisIntersections(c));
  });

  // 🔹 2. Intersecciones entre restricciones
  for (let i = 0; i < problem.constraints.length; i++) {
    for (let j = i + 1; j < problem.constraints.length; j++) {
      const p = this.solveIntersection(
        problem.constraints[i],
        problem.constraints[j],
      );
      if (p) rawPoints.push(p);
    }
  }

  // 🔹 3. Origen
  rawPoints.push({ x: 0, y: 0 });

  // 🔥 4. AGREGAR PUNTOS EN TODO EL PLANO (CLAVE)
  const LIMIT = 20;

  rawPoints.push(
    { x: LIMIT, y: 0 },
    { x: -LIMIT, y: 0 },
    { x: 0, y: LIMIT },
    { x: 0, y: -LIMIT },
    { x: LIMIT, y: LIMIT },
    { x: -LIMIT, y: -LIMIT },
    { x: LIMIT, y: -LIMIT },
    { x: -LIMIT, y: LIMIT }
  );

  // 🔹 5. Limpiar y eliminar duplicados
  const cleanPoints = this.removeDuplicates(
    rawPoints.filter((p) => p && isFinite(p.x) && isFinite(p.y)),
  );

  const feasiblePoints: Point[] = [];
  const infeasiblePoints: Point[] = [];

  // 🔥 6. CLASIFICAR BIEN LOS PUNTOS
  cleanPoints.forEach((p) => {
    const isValid =
      (problem.nonNegativity ? (p.x >= 0 && p.y >= 0) : true) &&
      this.isFeasible(p, problem.constraints);

    if (isValid) {
      feasiblePoints.push(p);
    } else {
      infeasiblePoints.push(p);
    }
  });

  // 🔥 7. REGIÓN FACTIBLE REAL
  const vertices =
    feasiblePoints.length >= 3
      ? this.getConvexHull(feasiblePoints)
      : [];

  // 🔹 8. Óptimo
  const optimal = this.getOptimal(vertices, problem.objective, problem.type);

  return {
    allPoints: cleanPoints,
    feasiblePoints,
    infeasiblePoints,
    vertices,
    optimal,
  };
}

  // ===============================
  // 🔥 ELIMINAR DUPLICADOS (CLAVE)
  // ===============================
  removeDuplicates(points: Point[]): Point[] {
    const EPS = 1e-6;

    return points.filter(
      (p, i, arr) =>
        i ===
        arr.findIndex(
          (q) => Math.abs(p.x - q.x) < EPS && Math.abs(p.y - q.y) < EPS,
        ),
    );
  }

  // ===============================
  // 🔹 VALIDACIÓN
  // ===============================
  isFeasible(point: Point, constraints: any[]): boolean {
    const EPS = 1e-6;

    return constraints.every((c) => {
      const [a, b] = c.coefficients;
      const val = a * point.x + b * point.y;

      switch (c.type) {
        case '<=':
          return val <= c.value + EPS;
        case '>=':
          return val >= c.value - EPS;
        case '=':
          return Math.abs(val - c.value) <= EPS;
        default:
          return false;
      }
    });
  }

  // ===============================
  // 🔹 INTERSECCIONES CON EJES
  // ===============================
  getAxisIntersections(c: any): Point[] {
    const [a, b] = c.coefficients;
    const value = c.value;

    const points: Point[] = [];

    if (a !== 0) points.push({ x: value / a, y: 0 });
    if (b !== 0) points.push({ x: 0, y: value / b });

    return points;
  }

  // ===============================
  // 🔹 INTERSECCIÓN ENTRE RECTAS
  // ===============================
  solveIntersection(c1: any, c2: any): Point | null {
    const [a1, b1] = c1.coefficients;
    const [a2, b2] = c2.coefficients;

    const c1Val = c1.value;
    const c2Val = c2.value;

    const det = a1 * b2 - a2 * b1;

    if (Math.abs(det) < 1e-6) return null;

    const x = (c1Val * b2 - c2Val * b1) / det;
    const y = (a1 * c2Val - a2 * c1Val) / det;

    return { x, y };
  }

  // ===============================
  // 🔥 CONVEX HULL CORRECTO
  // ===============================
  getConvexHull(points: Point[]): Point[] {
    if (points.length <= 3) return points;

    const cross = (o: Point, a: Point, b: Point) =>
      (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

    const lower: Point[] = [];
    for (let p of sorted) {
      while (
        lower.length >= 2 &&
        cross(lower[lower.length - 2], lower[lower.length - 1], p) < 0
      ) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper: Point[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (
        upper.length >= 2 &&
        cross(upper[upper.length - 2], upper[upper.length - 1], p) < 0
      ) {
        upper.pop();
      }
      upper.push(p);
    }

    upper.pop();
    lower.pop();

    return lower.concat(upper);
  }

  // ===============================
  // 🔥 FUNCIÓN OBJETIVO
  // ===============================
  getOptimal(points: Point[], objective: number[], type: string) {
    if (points.length === 0) {
      return { bestPoint: null, bestValue: 0 };
    }

    let best = points[0];
    let bestValue = this.evaluate(best, objective);

    for (let p of points) {
      const value = this.evaluate(p, objective);

      if (
        (type === 'max' && value > bestValue) ||
        (type === 'min' && value < bestValue)
      ) {
        best = p;
        bestValue = value;
      }
    }

    return {
      bestPoint: best,
      bestValue,
    };
  }

  evaluate(p: Point, obj: number[]) {
    return obj[0] * p.x + obj[1] * p.y;
  }
}
