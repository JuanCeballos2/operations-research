import { DualProblem } from "./dual.problem.type";

export type DualMethodResult = {
  primal: any;

  dual: DualProblem;

  solution?: {
    solution: number[];
    value: number;
  };
}