export interface SimplexResult {
  tableaus: {
    table: number[][];
    pivotRow: number | null;
    pivotCol: number | null;
    pivotValue: number | null;
    ratios: (number | null)[];
  }[];
  pivots: {
    column: number;
    row: number;
    value: number;
  }[];
  optimal: {
    solution: number[];
    value: number;
  };
  status?: 'optimal' | 'unbounded' | 'infeasible';
}
