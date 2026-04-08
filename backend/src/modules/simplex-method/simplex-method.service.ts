import { Injectable } from '@nestjs/common';
import { CreateSimplexDto } from './dtos/simplex-method.dto';
import { SimplexResult } from './interfaces/simplex-method.interface';

@Injectable()
export class SimplexMethodService {
  solveSimplex(problem: CreateSimplexDto): SimplexResult {
    const tableaus: number[][][] = [];

    // 1. Construir tabla inicial
    let tableau = this.buildInitialTableau(problem);
    tableaus.push(JSON.parse(JSON.stringify(tableau)) as number[][]);

    while (!this.isOptimal(tableau)) {
      const pivotCol = this.getPivotColumn(tableau);
      const pivotRow = this.getPivotRow(tableau, pivotCol);

      if (pivotRow === -1) {
        throw new Error('Solución no acotada');
      }

      tableau = this.pivot(tableau, pivotRow, pivotCol);
      tableaus.push(JSON.parse(JSON.stringify(tableau)) as number[][]);
    }

    const optimal = this.extractSolution(tableau, problem.objective.length);

    return {
      tableaus,
      optimal,
    };
  }

  buildInitialTableau(problem: CreateSimplexDto): number[][] {
    const { objective, constraints } = problem;

    const rows = constraints.length;
    const cols = objective.length + rows + 1;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const tableau = Array.from({ length: rows + 1 }, () => Array(cols).fill(0));

    // restricciones
    constraints.forEach((c, i) => {
      c.coefficients.forEach((coef, j) => {
        tableau[i][j] = coef;
      });

      tableau[i][objective.length + i] = 1; // holgura
      tableau[i][cols - 1] = c.value;
    });

    // función objetivo
    objective.forEach((coef, j) => {
      tableau[rows][j] = -coef;
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return tableau;
  }

  getPivotColumn(tableau: number[][]): number {
    const lastRow = tableau[tableau.length - 1];

    let min = 0;
    let index = -1;

    lastRow.forEach((val, i) => {
      if (val < min) {
        min = val;
        index = i;
      }
    });

    return index;
  }

  getPivotRow(tableau: number[][], pivotCol: number): number {
    let minRatio = Infinity;
    let index = -1;

    for (let i = 0; i < tableau.length - 1; i++) {
      const row = tableau[i];
      const ratio = row[row.length - 1] / row[pivotCol];

      if (row[pivotCol] > 0 && ratio < minRatio) {
        minRatio = ratio;
        index = i;
      }
    }

    return index;
  }

  pivot(tableau: number[][], pivotRow: number, pivotCol: number): number[][] {
    const newTableau = tableau.map((row) => [...row]);
    const pivot = newTableau[pivotRow][pivotCol];

    // normalizar fila
    for (let j = 0; j < newTableau[0].length; j++) {
      newTableau[pivotRow][j] /= pivot;
    }

    // hacer ceros en columna
    for (let i = 0; i < newTableau.length; i++) {
      if (i === pivotRow) continue;

      const factor = newTableau[i][pivotCol];

      for (let j = 0; j < newTableau[0].length; j++) {
        newTableau[i][j] -= factor * newTableau[pivotRow][j];
      }
    }

    return newTableau;
  }

  isOptimal(tableau: number[][]): boolean {
    const lastRow = tableau[tableau.length - 1];
    return lastRow.every((v) => v >= 0);
  }

  extractSolution(tableau: number[][], vars: number) {
    const solution = Array(vars).fill(0);

    for (let j = 0; j < vars; j++) {
      let pivotRow = -1;

      for (let i = 0; i < tableau.length - 1; i++) {
        if (tableau[i][j] === 1) {
          pivotRow = i;
        } else if (tableau[i][j] !== 0) {
          pivotRow = -1;
          break;
        }
      }

      if (pivotRow !== -1) {
        solution[j] = tableau[pivotRow][tableau[0].length - 1];
      }
    }

    return {
      solution,
      value: tableau[tableau.length - 1][tableau[0].length - 1],
    };
  }
}
