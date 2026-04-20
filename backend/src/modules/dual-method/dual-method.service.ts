import { Injectable } from '@nestjs/common';
import { CreateDualMethodDto } from './dtos/create-dual-method.dto';
import { DualMethodResult } from './interfaces/dual-method.interface';
import { DualProblem } from './interfaces/dual-problem.interface';

@Injectable()
export class DualMethodService {
  solveDual(problem: CreateDualMethodDto): DualMethodResult {
    const primalType = problem.type;

    const A = problem.constraints.map((c) => [...(c.coefficients || [])]);

    const b = problem.constraints.map((c) => c.value || 0);

    const c = [...problem.objective];

    const primalConstraintSigns = problem.constraints.map(
      (c) => c.type || '<=',
    );

    const primalVariableSigns =
      problem.variableSigns ||
      new Array(problem.objective.length).fill('positive');

    const m = A.length;
    const n = c.length;

    // Tipo dual
    const dualType: 'max' | 'min' = primalType === 'max' ? 'min' : 'max';

    // Objetivo dual
    const dualObjective = [...b];

    // Signos variables duales
    const dualVariableSigns: ('positive' | 'negative' | 'free')[] = [];

    for (let i = 0; i < m; i++) {
      if (primalType === 'max') {
        if (primalConstraintSigns[i] === '<=')
          dualVariableSigns.push('positive');
        else if (primalConstraintSigns[i] === '>=')
          dualVariableSigns.push('negative');
        else dualVariableSigns.push('free');
      } else {
        if (primalConstraintSigns[i] === '>=')
          dualVariableSigns.push('positive');
        else if (primalConstraintSigns[i] === '<=')
          dualVariableSigns.push('negative');
        else dualVariableSigns.push('free');
      }
    }

    // Restricciones duales
    const dualConstraints: DualProblem['constraints'] = [];

    for (let j = 0; j < n; j++) {
      const coefficients: number[] = [];

      for (let i = 0; i < m; i++) {
        coefficients.push(A[i][j] ?? 0);
      }

      let dualSign: '<=' | '>=' | '=';

      if (primalType === 'max') {
        if (primalVariableSigns[j] === 'positive') dualSign = '>=';
        else if (primalVariableSigns[j] === 'negative') dualSign = '<=';
        else dualSign = '=';
      } else {
        if (primalVariableSigns[j] === 'positive') dualSign = '<=';
        else if (primalVariableSigns[j] === 'negative') dualSign = '>=';
        else dualSign = '=';
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      dualConstraints.push({
        coefficients,
        value: c[j],
        type: dualSign,
      });
    }
    // Construir dual
    const dual: DualProblem = {
      objective: dualObjective,

      type: dualType,

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      constraints: dualConstraints,

      variableSigns: dualVariableSigns,
    };

    // Retorno final
    return {
      primal: problem,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      dual,
    };
  }
}
