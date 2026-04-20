export interface DualProblem {
  objective: number[];

  type: 'max' | 'min';

  constraints: {
    coefficients: number[];
    value: number;
    type: '<=' | '>=' | '=';
  }[];

  variableSigns: ('positive' | 'negative' | 'free')[];
}
