import { Injectable } from '@nestjs/common';
import { CreateSimplexDto } from './dtos/simplex-method.dto';
import { SimplexResult } from './interfaces/simplex-method.interface';

@Injectable()
export class SimplexMethodService {
  private base: number[] = [];
  private nombresColumnas: string[] = [];

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
  // MÉTODO DE LAS DOS FASES (como Python)
  // =========================
  private solveTwoPhase(problem: CreateSimplexDto): SimplexResult {
    const tableaus: SimplexResult['tableaus'] = [];
    const pivots: SimplexResult['pivots'] = [];

    // Construir tableau inicial (como Python)
    const { tableau, totalVars, artCols, base, nombresColumnas } =
      this.buildInitialTableauWithBase(problem);

    this.base = base;
    this.nombresColumnas = nombresColumnas;

    let currentTableau = tableau;

    // ========== FASE I ==========
    // Construir función objetivo de Fase I (maximizar -sum(artificiales))
    const costosF1 = new Array(totalVars).fill(0);
    for (const j of artCols) {
      costosF1[j] = -1;
    }

    // Canonizar objetivo de Fase I
    currentTableau = this.canonizarObjetivo(
      currentTableau,
      costosF1,
      this.base,
    );

    // Ejecutar Simplex para Fase I
    const phaseIResult = this.ejecutarSimplex(
      currentTableau,
      [...Array(totalVars).keys()].filter((j) => !artCols.includes(j)),
      1,
      tableaus,
      pivots,
    );

    currentTableau = phaseIResult.tableau;
    this.base = phaseIResult.base;

    // Verificar factibilidad
    if (
      Math.abs(
        currentTableau[currentTableau.length - 1][currentTableau[0].length - 1],
      ) > 0.0001
    ) {
      return {
        tableaus,
        pivots,
        optimal: { solution: [], value: 0 },
        status: 'infeasible',
      };
    }

    // ========== PREPARAR FASE II ==========
    // Sacar artificiales de la base
    let i = 0;
    while (i < this.base.length) {
      if (artCols.includes(this.base[i])) {
        let reemplazo = -1;
        for (let j = 0; j < totalVars; j++) {
          if (artCols.includes(j)) continue;
          if (Math.abs(currentTableau[i][j]) > 0.0001) {
            reemplazo = j;
            break;
          }
        }

        if (reemplazo !== -1) {
          currentTableau = this.pivotear(currentTableau, i, reemplazo);
          this.base[i] = reemplazo;
          i++;
        } else {
          if (
            Math.abs(currentTableau[i][currentTableau[0].length - 1]) > 0.0001
          ) {
            throw new Error('El problema no tiene solución factible');
          }
          // Eliminar fila redundante
          currentTableau = currentTableau.filter((_, idx) => idx !== i);
          this.base.splice(i, 1);
        }
      } else {
        i++;
      }
    }

    // Eliminar columnas artificiales
    const keepCols = [...Array(totalVars).keys()].filter(
      (j) => !artCols.includes(j),
    );
    const newTableau: number[][] = [];
    for (let i = 0; i < currentTableau.length; i++) {
      const newRow: number[] = [];
      for (const j of keepCols) {
        newRow.push(currentTableau[i][j]);
      }
      newRow.push(currentTableau[i][currentTableau[0].length - 1]);
      newTableau.push(newRow);
    }
    currentTableau = newTableau;

    // Remapear base
    const remap: { [key: number]: number } = {};
    keepCols.forEach((old, newIdx) => {
      remap[old] = newIdx;
    });
    this.base = this.base.map((b) => remap[b]);

    const nuevosNombres: string[] = [];
    for (const j of keepCols) {
      nuevosNombres.push(this.nombresColumnas[j]);
    }
    this.nombresColumnas = nuevosNombres;

    // ========== FASE II ==========
    const cObj =
      problem.type === 'max'
        ? [...problem.objective]
        : problem.objective.map((v) => -v);

    const costosF2 = new Array(keepCols.length).fill(0);
    for (let j = 0; j < problem.objective.length; j++) {
      costosF2[j] = cObj[j];
    }

    // Canonizar objetivo de Fase II
    currentTableau = this.canonizarObjetivo(
      currentTableau,
      costosF2,
      this.base,
    );

    // Ejecutar Simplex para Fase II
    const phaseIIResult = this.ejecutarSimplex(
      currentTableau,
      [...Array(keepCols.length).keys()],
      2,
      tableaus,
      pivots,
    );

    // Extraer solución
    const solution = Array.from(
      { length: problem.objective.length },
      (): number => 0,
    );
    for (let j = 0; j < problem.objective.length; j++) {
      const idx = this.base.indexOf(j);
      if (idx !== -1) {
        solution[j] = this.round(
          phaseIIResult.tableau[idx][phaseIIResult.tableau[0].length - 1],
        );
      }
    }

    let z =
      phaseIIResult.tableau[phaseIIResult.tableau.length - 1][
        phaseIIResult.tableau[0].length - 1
      ];
    if (problem.type === 'min') {
      z = -z;
    }

    return {
      tableaus,
      pivots,
      optimal: {
        solution,
        value: this.round(Math.abs(z)),
      },
      status: 'optimal',
    };
  }

  // =========================
  // CONSTRUIR TABLEAU INICIAL CON BASE (como Python)
  // =========================
  private buildInitialTableauWithBase(problem: CreateSimplexDto): {
    tableau: number[][];
    m: number;
    n: number;
    totalVars: number;
    artCols: number[];
    base: number[];
    nombresColumnas: string[];
  } {
    const { objective, constraints } = problem;
    const m = constraints.length;
    const n = objective.length;

    // Normalizar restricciones (RHS negativo)
    const restriccionesNorm: { coeff: number[]; rhs: number; type: string }[] =
      [];

    constraints.forEach((c) => {
      let coeff = [...c.coefficients];
      let rhs = c.value;
      let type = c.type;

      if (rhs < 0) {
        coeff = coeff.map((v) => -v);
        rhs = -rhs;
        if (type === '<=') type = '>=';
        else if (type === '>=') type = '<=';
      }
      restriccionesNorm.push({ coeff, rhs, type });
    });

    const slack = restriccionesNorm.filter((r) => r.type === '<=').length;

    const surplus = restriccionesNorm.filter((r) => r.type === '>=').length;

    const artificial = restriccionesNorm.filter(
      (r) => r.type === '>=' || r.type === '=',
    ).length;

    const totalVars = n + slack + surplus + artificial;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tableau: number[][] = Array.from({ length: m + 1 }, () =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      new Array(totalVars + 1).fill(0),
    );

    const artCols: number[] = [];
    const base: number[] = [];
    const nombresColumnas: string[] = [...Array(n).keys()].map(
      (i) => `x${i + 1}`,
    );

    let col = n;
    let holguraIdx = 1;
    let excesoIdx = 1;
    let artificialIdx = 1;

    for (let i = 0; i < restriccionesNorm.length; i++) {
      const { coeff, rhs, type } = restriccionesNorm[i];

      // Coeficientes de variables originales
      for (let j = 0; j < n; j++) {
        tableau[i][j] = coeff[j];
      }
      tableau[i][totalVars] = rhs;

      if (type === '<=') {
        tableau[i][col] = 1;
        base.push(col);
        nombresColumnas.push(`h${holguraIdx++}`);
        col++;
      } else if (type === '>=') {
        tableau[i][col] = -1;
        nombresColumnas.push(`s${excesoIdx++}`);
        col++;
        tableau[i][col] = 1;
        artCols.push(col);
        base.push(col);
        nombresColumnas.push(`a${artificialIdx++}`);
        col++;
      } else {
        // '='
        tableau[i][col] = 1;
        artCols.push(col);
        base.push(col);
        nombresColumnas.push(`a${artificialIdx++}`);
        col++;
      }
    }

    return { tableau, m, n, totalVars, artCols, base, nombresColumnas };
  }

  // =========================
  // CANONIZAR OBJETIVO (como Python)
  // =========================
  private canonizarObjetivo(
    tableau: number[][],
    costos: number[],
    base: number[],
  ): number[][] {
    const newTableau = this.clone(tableau);
    const lastRow = newTableau.length - 1;

    // Inicializar fila objetivo
    for (let j = 0; j < newTableau[0].length; j++) {
      newTableau[lastRow][j] = 0;
    }

    // Poner coeficientes negativos
    for (let j = 0; j < costos.length; j++) {
      newTableau[lastRow][j] = -costos[j];
    }

    // Hacer ceros en variables básicas
    for (let i = 0; i < base.length; i++) {
      const varBase = base[i];
      const cb = costos[varBase];
      if (Math.abs(cb) > 0.0001) {
        for (let j = 0; j < newTableau[0].length; j++) {
          newTableau[lastRow][j] += cb * newTableau[i][j];
        }
      }
    }

    return newTableau;
  }

  // =========================
  // EJECUTAR SIMPLEX (como Python)
  // =========================
  private ejecutarSimplex(
    tableauInicial: number[][],
    columnasPermitidas: number[],
    fase: number,
    tableausAccum: SimplexResult['tableaus'],
    pivotsAccum: SimplexResult['pivots'],
  ): { tableau: number[][]; base: number[] } {
    let tableau = this.clone(tableauInicial);
    const m = tableau.length - 1;
    const tol = 1e-9;

    while (true) {
      // Buscar coeficientes negativos en fila Z
      const negativas: number[] = [];
      for (const j of columnasPermitidas) {
        if (tableau[m][j] < -tol) {
          negativas.push(j);
        }
      }

      if (negativas.length === 0) {
        // Óptimo encontrado
        tableausAccum.push({
          table: this.clone(tableau),
          pivotRow: null,
          pivotCol: null,
          pivotValue: null,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          ratios: new Array(m).fill(null),
        });
        break;
      }

      // Encontrar columna pivote (la más negativa)
      let colPivote = -1;
      let filasValidas: number[] = [];
      let razones: number[] = [];

      for (const j of negativas.sort((a, b) => tableau[m][a] - tableau[m][b])) {
        const filasTmp: number[] = [];
        const razonesTmp: number[] = [];

        for (let i = 0; i < m; i++) {
          if (tableau[i][j] > tol) {
            filasTmp.push(i);
            razonesTmp.push(tableau[i][tableau[0].length - 1] / tableau[i][j]);
          }
        }

        if (filasTmp.length > 0) {
          colPivote = j;
          filasValidas = filasTmp;
          razones = razonesTmp;
          break;
        }
      }

      if (colPivote === -1) {
        throw new Error('El problema es no acotado');
      }

      // Encontrar fila pivote (mínima razón)
      let minRazon = Infinity;
      let filaPivote = -1;
      for (let idx = 0; idx < razones.length; idx++) {
        if (razones[idx] >= 0 && razones[idx] < minRazon) {
          minRazon = razones[idx];
          filaPivote = filasValidas[idx];
        }
      }

      const pivotValue = tableau[filaPivote][colPivote];

      // Guardar iteración
      tableausAccum.push({
        table: this.clone(tableau),
        pivotRow: filaPivote,
        pivotCol: colPivote,
        pivotValue: this.round(pivotValue),
        ratios: razones.map((r) => (r !== undefined ? this.round(r) : null)),
      });

      pivotsAccum.push({
        column: colPivote,
        row: filaPivote,
        value: this.round(pivotValue),
      });

      // Realizar pivoteo
      tableau = this.pivotear(tableau, filaPivote, colPivote);
      this.base[filaPivote] = colPivote;
    }

    return { tableau, base: this.base };
  }

  // =========================
  // PIVOTEAR (como Python)
  // =========================
  private pivotear(
    tableau: number[][],
    filaPivote: number,
    colPivote: number,
  ): number[][] {
    const newTableau = this.clone(tableau);
    const piv = newTableau[filaPivote][colPivote];

    // Normalizar fila pivote
    for (let j = 0; j < newTableau[0].length; j++) {
      newTableau[filaPivote][j] /= piv;
    }

    // Eliminar columna pivote en otras filas
    for (let i = 0; i < newTableau.length; i++) {
      if (i === filaPivote) continue;
      const factor = newTableau[i][colPivote];
      for (let j = 0; j < newTableau[0].length; j++) {
        newTableau[i][j] -= factor * newTableau[filaPivote][j];
      }
    }

    return newTableau;
  }

  // =========================
  // SIMPLEX ESTÁNDAR (solo <=)
  // =========================
  private solveStandardSimplex(problem: CreateSimplexDto): SimplexResult {
    const tableaus: SimplexResult['tableaus'] = [];
    const pivots: SimplexResult['pivots'] = [];

    let tableau: number[][] = this.buildInitialTableau(problem);
    tableau = this.roundTableau(tableau);

    let pivotCol = this.getPivotColumn(tableau);
    let ratios = this.calculateRatios(tableau, pivotCol);
    let pivotRow = this.getPivotRowFromRatios(ratios);
    let hasPivot = pivotRow !== -1 && pivotCol !== -1;

    tableaus.push({
      table: this.clone(tableau),
      pivotRow: hasPivot ? pivotRow : null,
      pivotCol: hasPivot ? pivotCol : null,
      pivotValue: hasPivot ? this.round(tableau[pivotRow][pivotCol]) : null,
      ratios: hasPivot ? ratios : ratios.map(() => null),
    });

    while (!this.isOptimal(tableau)) {
      if (pivotCol !== -1 && pivotRow === -1) {
        const optimal = this.extractSolution(tableau, problem.objective.length);
        return {
          tableaus,
          pivots,
          optimal: {
            solution: optimal.solution,
            value: optimal.value,
          },
          status: 'unbounded',
        };
      }

      pivots.push({
        column: pivotCol,
        row: pivotRow,
        value: this.round(tableau[pivotRow][pivotCol]),
      });

      tableau = this.pivot(tableau, pivotRow, pivotCol);
      tableau = this.roundTableau(tableau);

      pivotCol = this.getPivotColumn(tableau);
      ratios = this.calculateRatios(tableau, pivotCol);
      pivotRow = this.getPivotRowFromRatios(ratios);
      hasPivot = pivotRow !== -1 && pivotCol !== -1;

      tableaus.push({
        table: this.clone(tableau),
        pivotRow: hasPivot ? pivotRow : null,
        pivotCol: hasPivot ? pivotCol : null,
        pivotValue: hasPivot ? this.round(tableau[pivotRow][pivotCol]) : null,
        ratios: hasPivot ? ratios : ratios.map(() => null),
      });
    }

    const optimal = this.extractSolution(tableau, problem.objective.length);

    let optimalValue = optimal.value;
    if (problem.type === 'min') {
      optimalValue = -optimalValue;
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
      }

      tableau[i][cols - 1] = c.value;
    });

    objective.forEach((coef, j) => {
      tableau[rows][j] = problem.type === 'max' ? -coef : coef;
    });

    return tableau;
  }

  getPivotColumn(tableau: number[][]): number {
    const lastRow = tableau[tableau.length - 1];
    let min = 0;
    let index = -1;

    for (let i = 0; i < lastRow.length - 1; i++) {
      if (lastRow[i] < min) {
        min = lastRow[i];
        index = i;
      }
    }

    return index;
  }

  pivot(tableau: number[][], pivotRow: number, pivotCol: number): number[][] {
    const newTableau = this.clone(tableau);
    const piv = newTableau[pivotRow][pivotCol];

    for (let j = 0; j < newTableau[0].length; j++) {
      newTableau[pivotRow][j] /= piv;
    }

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

    for (let i = 0; i < lastRow.length - 1; i++) {
      if (lastRow[i] < -0.0001) return false;
    }

    return true;
  }

  extractSolution(tableau: number[][], vars: number) {
    const solution = Array<number>(vars).fill(0);

    for (let j = 0; j < vars; j++) {
      if (this.base.includes(j)) {
        const row = this.base.indexOf(j);
        solution[j] = this.round(tableau[row][tableau[0].length - 1]);
      }
    }

    return {
      solution,
      value: this.round(tableau[tableau.length - 1][tableau[0].length - 1]),
    };
  }

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

  round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  roundTableau(tableau: number[][]): number[][] {
    return tableau.map((row) => row.map((v) => this.round(v)));
  }

  clone(tableau: number[][]): number[][] {
    return tableau.map((row): number[] => [...row]);
  }
}
