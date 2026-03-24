export interface Constraint {
  coefficients: number[];
  value: number;
  type: '<=' | '>=' | '=';
}

export interface Point {
  x: number;
  y: number;
}

export interface Solution {
  allPoints: Point[];
  feasiblePoints: Point[];
  infeasiblePoints: Point[];
  optimal: {
    bestPoint: Point | null;
    bestValue: number;
  };
}
