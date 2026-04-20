import { DualProblem } from './dual-problem.interface';

export interface DualMethodResult {
  primal: any;

  dual: DualProblem;

  solution?: {
    solution: number[];
    value: number;
  };
}
