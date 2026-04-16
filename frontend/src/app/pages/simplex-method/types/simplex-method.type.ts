export interface SimplexResult {
  tableaus: number[][][];
  optimal: {
    solution: number[];
    value: number;
  };
}

export interface SimplexTableau {
  table: number[][];
  pivotRow: number | null;
  pivotCol: number | null;
  pivotValue: number | null;
  ratios: (number | null)[];
}


export interface SimplexRequest {
  objective: number[];
  type: 'max' | 'min';
  constraints: {
    coefficients: number[];
    value: number;
    type: '<=' | '>=' | '=';
  }[];
}

export interface ConstraintSimplex {
coefficients: number[];
  value: number;
  type: '<=' | '>=' | '=';
}



