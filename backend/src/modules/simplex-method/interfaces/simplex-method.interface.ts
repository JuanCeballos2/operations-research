export interface SimplexResult {
  tableaus: number[][][];
  pivots: { column: number; row: number; value: number }[];
  optimal: {
    solution: number[];
    value: number;
  };
}