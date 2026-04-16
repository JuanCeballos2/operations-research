import { Injectable } from '@nestjs/common';
import { CreateSimplexDto } from './dtos/simplex-method.dto';
import { SimplexResult } from './interfaces/simplex-method.interface';

@Injectable()
export class SimplexMethodService {
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

  // MÉTODO DE LAS DOS FASES
  private solveTwoPhase(problem: CreateSimplexDto): SimplexResult {
    // ========== FASE I ==========
    const phaseIProblem = this.buildPhaseIProblem(problem);
    const phaseIResult = this.solveStandardSimplex(phaseIProblem);

    // Verificar factibilidad
    if (phaseIResult.optimal.value > 0.01) {
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

    // Resolver Fase II
    return this.solveFromTableau(phaseIITableau, problem);
  }

  // Construir problema de Fase I
  private buildPhaseIProblem(problem: CreateSimplexDto): CreateSimplexDto {
    const constraints = problem.constraints;
    const numOriginalVars = problem.objective.length;
    const numConstraints = constraints.length;

    // Contar variables artificiales necesarias
    const numArtificial = constraints.filter(
      (c) => c.type === '>=' || c.type === '=',
    ).length;

    // Función objetivo de Fase I (minimizar suma de artificiales)
    const phaseIObjective: number[] = Array(
      numOriginalVars + numConstraints + numArtificial,
    ).fill(0) as number[];

    // Las variables artificiales tienen costo 1
    for (let i = 0; i < numArtificial; i++) {
      phaseIObjective[numOriginalVars + numConstraints + i] = 1;
    }

    return {
      objective: phaseIObjective,
      type: 'min',
      constraints: constraints.map((c) => ({ ...c })),
    };
  }

  // Construir tabla inicial de Fase II
  private buildPhaseIITableau(
    phaseITableau: number[][],
    originalProblem: CreateSimplexDto,
  ): number[][] {
    const numOriginalVars = originalProblem.objective.length;
    const numConstraints = originalProblem.constraints.length;

    // Crear nuevo tabla sin columnas artificiales
    const tableau: number[][] = [];

    for (let i = 0; i < phaseITableau.length; i++) {
      const newRow: number[] = [];
      // Copiar solo hasta antes de las columnas artificiales
      for (let j = 0; j < numOriginalVars + numConstraints; j++) {
        newRow.push(phaseITableau[i][j]);
      }
      // Copiar la última columna (RHS)
      newRow.push(phaseITableau[i][phaseITableau[i].length - 1]);
      tableau.push(newRow);
    }

    // Reemplazar última fila con función objetivo original
    const lastRow = tableau[tableau.length - 1];
    for (let j = 0; j < numOriginalVars; j++) {
      lastRow[j] =
        originalProblem.type === 'max'
          ? -originalProblem.objective[j]
          : originalProblem.objective[j];
    }

    // Las holguras tienen costo 0
    for (let j = numOriginalVars; j < lastRow.length - 1; j++) {
      lastRow[j] = 0;
    }

    // Hacer ceros en la fila Z para las variables básicas actuales
    for (let i = 0; i < tableau.length - 1; i++) {
      let basicCol = -1;

      // Encontrar si esta fila tiene una variable básica (un 1 y el resto 0 en las columnas de decisión/holgura)
      for (let j = 0; j < numOriginalVars + numConstraints; j++) {
        if (Math.abs(tableau[i][j] - 1) < 0.0001) {
          let isBasic = true;
          for (let k = 0; k < tableau.length - 1; k++) {
            if (k !== i && Math.abs(tableau[k][j]) > 0.0001) {
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
        if (Math.abs(factor) > 0.0001) {
          for (let j = 0; j < tableau[0].length; j++) {
            tableau[tableau.length - 1][j] -= factor * tableau[i][j];
          }
        }
      }
    }

    return tableau;
  }

  // SIMPLEX ESTÁNDAR (solo <=)
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

    // Guardar tabla inicial
    tableaus.push({
      table: this.clone(tableau),
      pivotRow: hasPivot ? pivotRow : null,
      pivotCol: hasPivot ? pivotCol : null,
      pivotValue: hasPivot ? this.round(tableau[pivotRow][pivotCol]) : null,
      ratios: hasPivot ? ratios : ratios.map(() => null),
    });

    while (!this.isOptimal(tableau, problem.type)) {
      // Caso no acotado
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

      // Guardar pivote
      pivots.push({
        column: pivotCol,
        row: pivotRow,
        value: this.round(tableau[pivotRow][pivotCol]),
      });

      // Realizar pivoteo
      tableau = this.pivot(tableau, pivotRow, pivotCol);
      tableau = this.roundTableau(tableau);

      // Recalcular siguiente pivote
      pivotCol = this.getPivotColumn(tableau, problem.type);
      ratios = this.calculateRatios(tableau, pivotCol);
      pivotRow = this.getPivotRowFromRatios(ratios);
      hasPivot = pivotRow !== -1 && pivotCol !== -1;

      // Guardar iteración
      tableaus.push({
        table: this.clone(tableau),
        pivotRow: hasPivot ? pivotRow : null,
        pivotCol: hasPivot ? pivotCol : null,
        pivotValue: hasPivot ? this.round(tableau[pivotRow][pivotCol]) : null,
        ratios: hasPivot ? ratios : ratios.map(() => null),
      });
    }

    // Extraer solución óptima
    const optimal = this.extractSolution(tableau, problem.objective.length);

    // Para problemas de minimización, el valor puede ser negativo, tomar valor absoluto
    let optimalValue = optimal.value;
    if (problem.type === 'min') {
      optimalValue = Math.abs(optimalValue);
    }

    return {
      tableaus,
      pivots,
      optimal: {
        solution: optimal.solution,
        value: optimalValue,
      },
      status: 'optimal',
    };
  }

  // TABLA INICIAL
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

  // PIVOTE COLUMNA
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

  // PIVOTE
  pivot(tableau: number[][], pivotRow: number, pivotCol: number): number[][] {
    const newTableau: number[][] = tableau.map((row) => [...row]);
    const pivot = newTableau[pivotRow][pivotCol];

    // Normalizar fila pivote
    for (let j = 0; j < newTableau[0].length; j++) {
      newTableau[pivotRow][j] /= pivot;
    }

    // Eliminar columna pivote en otras filas
    for (let i = 0; i < newTableau.length; i++) {
      if (i === pivotRow) continue;
      const factor = newTableau[i][pivotCol];
      for (let j = 0; j < newTableau[0].length; j++) {
        newTableau[i][j] -= factor * newTableau[pivotRow][j];
      }
    }

    return newTableau;
  }

  // OPTIMALIDAD DE Z

  isOptimal(tableau: number[][], type: string): boolean {
    const lastRow = tableau[tableau.length - 1];

    for (let i = 0; i < lastRow.length - 1; i++) {
      if (type === 'max' && lastRow[i] < -0.0001) return false;
      if (type === 'min' && lastRow[i] > 0.0001) return false;
    }

    return true;
  }

  // SOLUCIÓN
  extractSolution(tableau: number[][], vars: number) {
    const solution: number[] = Array<number>(vars).fill(0);

    for (let j = 0; j < vars; j++) {
      let basicRow = -1;
      let isBasic = true;

      for (let i = 0; i < tableau.length - 1; i++) {
        if (Math.abs(tableau[i][j] - 1) < 0.0001) {
          if (basicRow === -1) {
            basicRow = i;
          } else {
            isBasic = false;
            break;
          }
        } else if (Math.abs(tableau[i][j]) > 0.0001) {
          isBasic = false;
          break;
        }
      }

      if (basicRow !== -1 && isBasic) {
        solution[j] = this.round(tableau[basicRow][tableau[0].length - 1]);
      }
    }

    return {
      solution,
      value: this.round(tableau[tableau.length - 1][tableau[0].length - 1]),
    };
  }

  // RAZON
  calculateRatios(tableau: number[][], pivotCol: number): number[] {
    const ratios: number[] = [];

    for (let i = 0; i < tableau.length - 1; i++) {
      const pivot = tableau[i][pivotCol];
      const rhs = tableau[i][tableau[0].length - 1];

      if (pivot > 0.0001) {
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

  // HELPERS
  round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  roundTableau(tableau: number[][]): number[][] {
    return tableau.map((row) => row.map((v) => this.round(v)));
  }

  clone(tableau: number[][]): number[][] {
    return tableau.map((row) => [...row]);
  }
}
