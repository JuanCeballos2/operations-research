export interface SimplexResult {
  tableaus: number[][][]; // historial de tablas
  optimal: {
    solution: number[];
    value: number;
  };
}
