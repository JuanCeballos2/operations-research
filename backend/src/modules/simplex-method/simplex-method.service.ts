import { Injectable } from '@nestjs/common';
import { CreateSimplexDto } from './dtos/simplex-method.dto';
import { SimplexResult } from './interfaces/simplex-method.interface';

@Injectable()
export class SimplexMethodService {
  // Aumentar la precisión y agregar tolerancia
  private readonly EPSILON = 1e-8;
  private readonly ROUNDING_DECIMALS = 8; // Aumentar decimales internamente

  solveSimplex(problem: CreateSimplexDto): SimplexResult {
    // Detectar si necesitamos Fase I (restricciones >= o =)
    const needsPhaseI = problem.constraints.some(
      (c) => c.type === '>=' || c.type === '=',
    );

    if (needsPhaseI) {
      return this.solveTwoPhase(problem);
    }

    return this.solveStandardSimplex(problem);
  }

  // =========================
  // MÉTODO DE LAS DOS FASES
  // =========================
  private solveTwoPhase(problem: CreateSimplexDto): SimplexResult {
    const phaseIProblem = this.buildPhaseIProblem(problem);
    const phaseIResult = this.solveStandardSimplex(phaseIProblem);

    // Verificar factibilidad
    if (phaseIResult.optimal.value > this.EPSILON) {
      return {
        tableaus: phaseIResult.tableaus,
        pivots: phaseIResult.pivots,
        optimal: { solution: [], value: 0 },
        status: 'infeasible',
      };
    }

    const finalPhaseITableau =
      phaseIResult.tableaus[phaseIResult.tableaus.length - 1].table;
    const phaseIITableau = this.buildPhaseIITableau(
      finalPhaseITableau,
      problem,
    );

    return this.solveFromTableau(phaseIITableau, problem);
  }

  // Construir problema de Fase I
  private buildPhaseIProblem(problem: CreateSimplexDto): CreateSimplexDto {
    const constraints = problem.constraints;
    const numOriginalVars = problem.objective.length;
    const numConstraints = constraints.length;

    const numArtificial = constraints.filter(
      (c) => c.type === '>=' || c.type === '=',
    ).length;

    const phaseIObjective: number[] = Array(
      numOriginalVars + numConstraints + numArtificial,
    ).fill(0) as number[];

    for (let i = 0; i < numArtificial; i++) {
      phaseIObjective[numOriginalVars + numConstraints + i] = 1;
    }

    return {
      objective: phaseIObjective,
      type: 'min',
      constraints: constraints.map((c) => ({ ...c })),
    };
  }

  // Construir tableau inicial de Fase II
  private buildPhaseIITableau(
    phaseITableau: number[][],
    originalProblem: CreateSimplexDto,
  ): number[][] {
    const numOriginalVars = originalProblem.objective.length;
    const numConstraints = originalProblem.constraints.length;

    const tableau: number[][] = [];

    for (let i = 0; i < phaseITableau.length; i++) {
      const newRow: number[] = [];
      for (let j = 0; j < numOriginalVars + numConstraints; j++) {
        newRow.push(this.roundInternal(phaseITableau[i][j]));
      }
      newRow.push(
        this.roundInternal(phaseITableau[i][phaseITableau[i].length - 1]),
      );
      tableau.push(newRow);
    }

    const lastRow = tableau[tableau.length - 1];
    for (let j = 0; j < numOriginalVars; j++) {
      lastRow[j] = this.roundInternal(
        originalProblem.type === 'max'
          ? -originalProblem.objective[j]
          : originalProblem.objective[j],
      );
    }

    for (let j = numOriginalVars; j < lastRow.length - 1; j++) {
      lastRow[j] = 0;
    }

    for (let i = 0; i < tableau.length - 1; i++) {
      let basicCol = -1;

      for (let j = 0; j < numOriginalVars + numConstraints; j++) {
        if (Math.abs(tableau[i][j] - 1) < this.EPSILON) {
          let isBasic = true;
          for (let k = 0; k < tableau.length - 1; k++) {
            if (k !== i && Math.abs(tableau[k][j]) > this.EPSILON) {
              isBasic = false;
              break;
            }
          }
          if (isBasic) {
            basicCol = j;
            break;
          }
        }
      }

      if (basicCol !== -1) {
        const factor = tableau[tableau.length - 1][basicCol];
        if (Math.abs(factor) > this.EPSILON) {
          for (let j = 0; j < tableau[0].length; j++) {
            tableau[tableau.length - 1][j] = this.roundInternal(
              tableau[tableau.length - 1][j] - factor * tableau[i][j],
            );
          }
        }
      }
    }

    return tableau;
  }

  // =========================
  // SIMPLEX ESTÁNDAR (solo <=)
  // =========================
  private solveStandardSimplex(problem: CreateSimplexDto): SimplexResult {
    const tableau: number[][] = this.buildInitialTableau(problem);
    return this.solveFromTableau(tableau, problem);
  }

  private solveFromTableau(
    initialTableau: number[][],
    problem: CreateSimplexDto,
  ): SimplexResult {
    const tableaus: SimplexResult['tableaus'] = [];
    const pivots: SimplexResult['pivots'] = [];

    let tableau: number[][] = this.roundTableau(this.clone(initialTableau));
    let pivotCol = this.getPivotColumn(tableau, problem.type);
    let ratios = this.calculateRatios(tableau, pivotCol);
    let pivotRow = this.getPivotRowFromRatios(ratios);
    let hasPivot = pivotRow !== -1 && pivotCol !== -1;

    tableaus.push({
      table: this.clone(tableau),
      pivotRow: hasPivot ? pivotRow : null,
      pivotCol: hasPivot ? pivotCol : null,
      pivotValue: hasPivot
        ? this.roundInternal(tableau[pivotRow][pivotCol])
        : null,
      ratios: hasPivot ? ratios : ratios.map(() => null),
    });

    while (!this.isOptimal(tableau, problem.type)) {
      if (pivotCol !== -1 && pivotRow === -1) {
        const optimal = this.extractSolution(tableau, problem.objective.length);
        return {
          tableaus,
          pivots,
          optimal: {
            solution: optimal.solution,
            value: Math.abs(optimal.value),
          },
          status: 'unbounded',
        };
      }

      pivots.push({
        column: pivotCol,
        row: pivotRow,
        value: this.roundInternal(tableau[pivotRow][pivotCol]),
      });

      tableau = this.pivot(tableau, pivotRow, pivotCol);
      tableau = this.roundTableau(tableau);

      pivotCol = this.getPivotColumn(tableau, problem.type);
      ratios = this.calculateRatios(tableau, pivotCol);
      pivotRow = this.getPivotRowFromRatios(ratios);
      hasPivot = pivotRow !== -1 && pivotCol !== -1;

      tableaus.push({
        table: this.clone(tableau),
        pivotRow: hasPivot ? pivotRow : null,
        pivotCol: hasPivot ? pivotCol : null,
        pivotValue: hasPivot
          ? this.roundInternal(tableau[pivotRow][pivotCol])
          : null,
        ratios: hasPivot ? ratios : ratios.map(() => null),
      });
    }

    const optimal = this.extractSolution(tableau, problem.objective.length);

    // Redondear la solución final para valores muy cercanos a enteros
    const finalSolution = optimal.solution.map((v) =>
      this.roundToIntegerIfClose(v),
    );
    let optimalValue = optimal.value;

    if (problem.type === 'min') {
      optimalValue = Math.abs(optimalValue);
    }

    optimalValue = this.roundToIntegerIfClose(optimalValue);

    return {
      tableaus,
      pivots,
      optimal: {
        solution: finalSolution,
        value: optimalValue,
      },
      status: 'optimal',
    };
  }

  // =========================
  // TABLA INICIAL
  // =========================
  buildInitialTableau(problem: CreateSimplexDto): number[][] {
    const { objective, constraints } = problem;

    const rows = constraints.length;
    const cols = objective.length + rows + 1;

    const tableau: number[][] = Array.from({ length: rows + 1 }, () =>
      Array<number>(cols).fill(0),
    );

    constraints.forEach((c, i) => {
      c.coefficients.forEach((coef, j) => {
        tableau[i][j] = coef;
      });

      if (c.type === '<=') {
        tableau[i][objective.length + i] = 1;
      } else if (c.type === '>=') {
        tableau[i][objective.length + i] = -1;
      } else if (c.type === '=') {
        // Para igualdad, no agregar holgura
      }

      tableau[i][cols - 1] = c.value;
    });

    objective.forEach((coef, j) => {
      tableau[rows][j] = problem.type === 'max' ? -coef : coef;
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
        if (lastRow[i] < min - this.EPSILON) {
          min = lastRow[i];
          index = i;
        }
      }
    } else {
      let max = 0;
      for (let i = 0; i < lastRow.length - 1; i++) {
        if (lastRow[i] > max + this.EPSILON) {
          max = lastRow[i];
          index = i;
        }
      }
    }

    return index;
  }

  // =========================
  // PIVOT
  // =========================
  pivot(tableau: number[][], pivotRow: number, pivotCol: number): number[][] {
    const newTableau: number[][] = tableau.map((row) => [...row]);
    const pivot = newTableau[pivotRow][pivotCol];

    // Normalizar fila pivote
    for (let j = 0; j < newTableau[0].length; j++) {
      newTableau[pivotRow][j] = this.roundInternal(
        newTableau[pivotRow][j] / pivot,
      );
    }

    // Eliminar columna pivote en otras filas
    for (let i = 0; i < newTableau.length; i++) {
      if (i === pivotRow) continue;
      const factor = newTableau[i][pivotCol];
      if (Math.abs(factor) < this.EPSILON) continue;
      for (let j = 0; j < newTableau[0].length; j++) {
        newTableau[i][j] = this.roundInternal(
          newTableau[i][j] - factor * newTableau[pivotRow][j],
        );
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
      if (type === 'max' && lastRow[i] < -this.EPSILON) return false;
      if (type === 'min' && lastRow[i] > this.EPSILON) return false;
    }

    return true;
  }

  // =========================
  // SOLUCIÓN
  // =========================
  extractSolution(tableau: number[][], vars: number) {
    const solution: number[] = Array<number>(vars).fill(0);

    for (let j = 0; j < vars; j++) {
      let basicRow = -1;
      let isBasic = true;

      for (let i = 0; i < tableau.length - 1; i++) {
        if (Math.abs(tableau[i][j] - 1) < this.EPSILON) {
          if (basicRow === -1) {
            basicRow = i;
          } else {
            isBasic = false;
            break;
          }
        } else if (Math.abs(tableau[i][j]) > this.EPSILON) {
          isBasic = false;
          break;
        }
      }

      if (basicRow !== -1 && isBasic) {
        solution[j] = this.roundInternal(
          tableau[basicRow][tableau[0].length - 1],
        );
      }
    }

    return {
      solution,
      value: this.roundInternal(
        tableau[tableau.length - 1][tableau[0].length - 1],
      ),
    };
  }

  // =========================
  // RATIOS
  // =========================
  calculateRatios(tableau: number[][], pivotCol: number): number[] {
    const ratios: number[] = [];

    for (let i = 0; i < tableau.length - 1; i++) {
      const pivot = tableau[i][pivotCol];
      const rhs = tableau[i][tableau[0].length - 1];

      if (pivot > this.EPSILON) {
        ratios.push(this.roundInternal(rhs / pivot));
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
      if (ratio >= 0 && ratio < min - this.EPSILON) {
        min = ratio;
        index = i;
      }
    });

    return index;
  }

  // =========================
  // HELPERS MEJORADOS
  // =========================

  // Redondeo interno con alta precisión
  private roundInternal(value: number): number {
    return parseFloat(value.toFixed(this.ROUNDING_DECIMALS));
  }

  // Redondeo final para valores muy cercanos a enteros
  private roundToIntegerIfClose(value: number): number {
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 0.01) {
      return rounded;
    }
    // Si no es cercano a entero, redondear a 2 decimales
    return Math.round(value * 100) / 100;
  }

  // Redondeo del tableau completo
  roundTableau(tableau: number[][]): number[][] {
    return tableau.map((row) => row.map((v) => this.roundInternal(v)));
  }

  clone(tableau: number[][]): number[][] {
    return tableau.map((row) => [...row]);
  }
}
