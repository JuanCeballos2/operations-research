export interface Constraint {
  coefficients: [number, number];
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
  vertices: Point[];

  optimal: OptimalSolution;
}
