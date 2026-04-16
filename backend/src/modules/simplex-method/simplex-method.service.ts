import { Injectable } from '@nestjs/common';
import { CreateSimplexDto } from './dtos/simplex-method.dto';
import { SimplexResult } from './interfaces/simplex-method.interface';

@Injectable()
export class SimplexMethodService {

  solveSimplex(problem: CreateSimplexDto): SimplexResult {

  const tableaus: any[] = [];
  const pivots: any[] = [];

  let tableau = this.buildInitialTableau(problem);
  tableau = this.roundTableau(tableau);

  // 🔥 PRIMER PIVOTE
  let pivotCol = this.getPivotColumn(tableau, problem.type);
  let ratios = this.calculateRatios(tableau, pivotCol);
  let pivotRow = this.getPivotRowFromRatios(ratios);

  let hasPivot = pivotRow !== -1 && pivotCol !== -1;

  tableaus.push({
    table: this.clone(tableau),
    pivotRow: hasPivot ? pivotRow : null,
    pivotCol: hasPivot ? pivotCol : null,
    pivotValue: hasPivot
      ? this.round(tableau[pivotRow][pivotCol])
      : null,
    ratios: hasPivot ? ratios : ratios.map(() => null),
  });

  while (!this.isOptimal(tableau, problem.type)) {

    if (pivotRow === -1) {
      throw new Error('Solución no acotada');
    }

    const pivotValue = tableau[pivotRow][pivotCol];

    pivots.push({
      column: pivotCol,
      row: pivotRow,
      value: this.round(pivotValue),
    });

    // 🔥 HACER PIVOT
    tableau = this.pivot(tableau, pivotRow, pivotCol);
    tableau = this.roundTableau(tableau);

    // 🔥 RECALCULAR
    pivotCol = this.getPivotColumn(tableau, problem.type);
    ratios = this.calculateRatios(tableau, pivotCol);
    pivotRow = this.getPivotRowFromRatios(ratios);

    // ✅ AQUÍ ESTÁ LA CLAVE
    hasPivot = pivotRow !== -1 && pivotCol !== -1;

    tableaus.push({
      table: this.clone(tableau),
      pivotRow: hasPivot ? pivotRow : null,
      pivotCol: hasPivot ? pivotCol : null,
      pivotValue: hasPivot
        ? this.round(tableau[pivotRow][pivotCol])
        : null,
      ratios: hasPivot ? ratios : ratios.map(() => null),
    });
  }

  const optimal = this.extractSolution(tableau, problem.objective.length);

  return {
    tableaus,
    pivots,
    optimal,
  };
}

  // =========================
  // TABLA INICIAL
  // =========================
 buildInitialTableau(problem: CreateSimplexDto): number[][] {

  const { objective, constraints } = problem;

  const rows = constraints.length;
  const cols = objective.length + rows + 1;

  const tableau = Array.from({ length: rows + 1 }, () =>
    Array(cols).fill(0),
  );

  constraints.forEach((c, i) => {

    // coeficientes SIEMPRE iguales (NO invertir)
    c.coefficients.forEach((coef, j) => {
      tableau[i][j] = coef;
    });

    // slack / exceso
    if (c.type === '<=') {
      tableau[i][objective.length + i] = 1;
    }

    if (c.type === '>=') {
      tableau[i][objective.length + i] = -1;
    }

    // RHS igual
    tableau[i][cols - 1] = c.value;
  });

  // FUNCIÓN OBJETIVO
  objective.forEach((coef, j) => {
    tableau[rows][j] = problem.type === 'max'
      ? -coef   // MAX normal
      : coef;   // MIN como en tu cuaderno
  });

  return tableau;
}

  // =========================
  // PIVOTE COLUMNA
  // =========================
  getPivotColumn(tableau: number[][], type: string): number {

  const lastRow = tableau[tableau.length - 1];

  let index = -1;

  if (type === 'max') {
    let min = 0;

    for (let i = 0; i < lastRow.length - 1; i++) {
      if (lastRow[i] < min) {
        min = lastRow[i];
        index = i;
      }
    }
  } else {
    let max = 0;

    for (let i = 0; i < lastRow.length - 1; i++) {
      if (lastRow[i] > max) {
        max = lastRow[i];
        index = i;
      }
    }
  }

  return index;
}

  // =========================
  // PIVOT OPERACIÓN
  // =========================
  pivot(
    tableau: number[][],
    pivotRow: number,
    pivotCol: number,
  ): number[][] {

    const newTableau = tableau.map((row) => [...row]);

    const pivot = newTableau[pivotRow][pivotCol];

    // normalizar fila pivote
    for (let j = 0; j < newTableau[0].length; j++) {
      newTableau[pivotRow][j] /= pivot;
    }

    // eliminar columna pivote
    for (let i = 0; i < newTableau.length; i++) {

      if (i === pivotRow) continue;

      const factor = newTableau[i][pivotCol];

      for (let j = 0; j < newTableau[0].length; j++) {
        newTableau[i][j] -= factor * newTableau[pivotRow][j];
      }
    }

    return newTableau;
  }

  // =========================
  // OPTIMALIDAD
  // =========================
  isOptimal(tableau: number[][], type: string): boolean {

  const lastRow = tableau[tableau.length - 1];

  for (let i = 0; i < lastRow.length - 1; i++) {

    if (type === 'max' && lastRow[i] < 0) return false;
    if (type === 'min' && lastRow[i] > 0) return false;
  }

  return true;
}

  // =========================
  // SOLUCIÓN
  // =========================
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
        solution[j] = this.round(
          tableau[pivotRow][tableau[0].length - 1],
        );
      }
    }

    return {
      solution,
      value: this.round(
        tableau[tableau.length - 1][tableau[0].length - 1],
      ),
    };
  }

  calculateRatios(tableau: number[][], pivotCol: number): number[] {

  const ratios: number[] = [];

  for (let i = 0; i < tableau.length - 1; i++) {

    const pivot = tableau[i][pivotCol];
    const rhs = tableau[i][tableau[0].length - 1];

    if (pivot > 0) {
      ratios.push(this.round(rhs / pivot));
    } else {
      ratios.push(Infinity);
    }
  }

  return ratios;
}
getPivotRowFromRatios(ratios: number[]): number {

  let min = Infinity;
  let index = -1;

  ratios.forEach((ratio, i) => {
    if (ratio >= 0 && ratio < min) {
      min = ratio;
      index = i;
    }
  });

  return index;
}

  // =========================
  // HELPERS
  // =========================
  round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  roundTableau(tableau: number[][]): number[][] {
    return tableau.map((row) =>
      row.map((v) => this.round(v)),
    );
  }

  clone(tableau: number[][]): number[][] {
    return JSON.parse(JSON.stringify(tableau));
  }
}