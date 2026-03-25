export interface Constraint {
  coefficients: [number, number]; // 👈 siempre 2 variables (x, y)
  value: number;
  type: '<=' | '>=' | '=';
}

export interface Point {
  x: number;
  y: number;
}

export interface OptimalSolution {
  bestPoint: Point | null;
  bestValue: number;
}

export interface Solution {
  allPoints: Point[];
  feasiblePoints: Point[];
  infeasiblePoints: Point[];

  // 🔥 NUEVO (IMPORTANTE)
  vertices: Point[]; // solo los vértices reales

  optimal: OptimalSolution;
}