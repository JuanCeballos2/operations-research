import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SimplexTwoPhasesServices } from '../../services/simplex-two-phases.services';
import { ConstraintSimplex, SimplexResult, SimplexTableau } from '../../types/simplex-two-phases.type';

@Component({
  selector: 'app-simplex-two-phases-view',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './simplex-two-phases-view.html',
  styleUrl: './simplex-two-phases-view.css',
})
export class SimplexTwoPhasesView {

   constraintsStrings: string[] = [];
  constraints: (ConstraintSimplex & { raw: string })[] = [];
  objectiveString: string = '';
  tableHeaders: string[] = [];
  tableRows: any[] = [];
  tableaus: SimplexTableau[] = [];
  error: string | null = null;
  standardPhase1: string = '';
  phaseChangeIndex: number = -1;
  showData = false;
  solutionReady = false;
  solution: SimplexResult['optimal'] | null = null;

  pivotColumnIndex: number = -1;
  pivotRowIndex: number = -1;
  pivotValue: number = 0;

  showTable: boolean = false;

  type: 'max' | 'min' = 'max';
  originalType: 'max' | 'min' = 'max';

  loading: boolean = false;
  nonNegativeVars: string[] = [];

  showStandardForm: boolean = false;

  standardObjective: string = '';
  standardEquation: string = '';
  standardConstraints: string[] = [];

  constructor(
    private router: Router,
    private simplexTwoPhasesService: SimplexTwoPhasesServices,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  goHome() {
    this.router.navigate(['/']);
  }

  validateObjective(str?: string): boolean {
    if (!str) return false;

    const clean = str.replace(/\s+/g, '');

    // acepta x, y, x1, x2, negativos, etc.
    const regex = /^([Zz]=)?([+-]?(\d*\.?\d*)?x\d*|[+-]?(\d*\.?\d*)?y)+$/;

    return regex.test(clean);
  }

  validateConstraint(str?: string): boolean {
    if (!str) return false;

    const clean = str.replace(/\s+/g, '');

    const regex = /^(.+)(<=|>=|=)(.+)$/;

    return regex.test(clean);
  }

  parseObjectiveString(): number[] {
    const clean = this.objectiveString.replace(/^[Zz]\s*=\s*/, '').replace(/\s+/g, '');

    const terms = clean.match(/[+-]?[^+-]+/g) || [];

    const coefficients: number[] = [];

    terms.forEach((term) => {
      let coef = 1;

      // detectar variable
      const match = term.match(/([+-]?[\d\.]*)(x|y)(\d*)/);

      if (!match) return;

      let value = match[1];
      const variable = match[2];
      const index = match[3] ? Number(match[3]) - 1 : variable === 'x' ? 0 : 1;

      if (value === '' || value === '+') coef = 1;
      else if (value === '-') coef = -1;
      else coef = Number(value);

      coefficients[index] = (coefficients[index] || 0) + coef;
    });

    return coefficients.map((c) => c ?? 0);
  }
  parseConstraintString(str: string): ConstraintSimplex {
    let type: '<=' | '=' | '>=' = '<=';

    if (str.includes('<=')) type = '<=';
    else if (str.includes('>=')) type = '>=';
    else if (str.includes('=')) type = '=';

    const [left, right] = str.split(type);

    const clean = left.replace(/\s+/g, '');
    const terms = clean.match(/[+-]?[^+-]+/g) || [];

    const coefficients: number[] = [];

    terms.forEach((term) => {
      let coef = 1;

      const match = term.match(/([+-]?[\d\.]*)(x|y)(\d*)/);

      if (!match) return;

      let value = match[1];
      const variable = match[2];
      const index = match[3] ? Number(match[3]) - 1 : variable === 'x' ? 0 : 1;

      if (value === '' || value === '+') coef = 1;
      else if (value === '-') coef = -1;
      else coef = Number(value);

      coefficients[index] = (coefficients[index] || 0) + coef;
    });

    return {
      coefficients: coefficients.map((c) => c ?? 0),
      value: Number(right.trim()),
      type,
    };
  }

  addConstraint() {
    this.constraints.push({
      coefficients: [],
      value: 0,
      type: '<=',
      raw: '',
    });
  }

  removeConstraint(index: number) {
    this.constraintsStrings.splice(index, 1);
    this.constraints.splice(index, 1);
  }

  buildPayload() {
    const objective = this.parseObjectiveString();

    const constraints = this.constraints.map((c) => this.parseConstraintString(c.raw));

    const maxVars = Math.max(objective.length, ...constraints.map((c) => c.coefficients.length));

    const normalize = (arr: number[]) => Array.from({ length: maxVars }, (_, i) => arr[i] ?? 0);

    return {
      objective: normalize(objective),
      type: this.type,
      constraints: constraints.map((c) => ({
        ...c,
        coefficients: normalize(c.coefficients),
      })),
    };
  }

 solve() {
  console.log('CLICK FUNCIONA');

  this.error = null;
  this.solution = null;
  this.solutionReady = false;
  this.showData = false;
  this.loading = true;

  if (!this.validateObjective(this.objectiveString)) {
    alert('Función objetivo inválida');
    this.loading = false;
    return;
  }

  const validConstraints = this.constraints.filter(
    c => c.raw && c.raw.trim() !== ''
  );

  if (validConstraints.length === 0) {
    alert('Debes agregar al menos una restricción');
    this.loading = false;
    return;
  }

  for (let c of validConstraints) {
    if (!this.validateConstraint(c.raw)) {
      alert('Restricción inválida: ' + c.raw);
      this.loading = false;
      return;
    }
  }

  this.constraints = validConstraints;
  this.originalType = this.type;

  const payload = this.buildPayload();

  this.simplexTwoPhasesService.solve(payload).subscribe({
    next: (res: any) => {
      const data = res?.data || res;

      this.ngZone.run(() => {
        this.tableaus = data?.tableaus ?? [];
        this.solution = data?.optimal ?? null;

        this.phaseChangeIndex = this.detectPhaseChangeIndex();

        Promise.resolve().then(() => {
          this.solutionReady = true;
          this.showData = true;

          this.generateStandardForm();

          this.showTable = true;
          this.loading = false;

          this.cdr.detectChanges();
        });
      });
    },
    error: (err) => {
      console.error(err);
      this.loading = false;
    },
  });
}

 generateStandardForm() {
  const payload = this.buildPayload();

  const realConstraints = payload.constraints.filter((c) => {
    const nonZero = c.coefficients.filter((v) => v !== 0);
    return !(nonZero.length === 1 && c.value === 0 && c.type === '>=');
  });

  const n = payload.objective.length;
  const m = realConstraints.length;

  const objective = [...payload.objective];
  let obj = `${this.originalType} z = `;

  objective.forEach((coef, i) => {
    obj += `${coef}x${i + 1}`;
    if (i < n - 1) obj += ' + ';
  });

  for (let i = 0; i < m; i++) {
    obj += this.originalType === 'max'
      ? ` + 0h${i + 1}`
      : ` + 0s${i + 1}`;
  }

  this.standardObjective = obj;


  let eq = '';

  if (this.originalType === 'min') {
    eq = `-z`;
    objective.forEach((coef, i) => {
      eq += ` + ${coef}x${i + 1}`;
    });
    for (let i = 0; i < m; i++) {
      eq += ` + 0s${i + 1}`;
    }
  } else {
    eq = `z`;
    objective.forEach((coef, i) => {
      eq += ` - ${coef}x${i + 1}`;
    });
    for (let i = 0; i < m; i++) {
      eq += ` - 0h${i + 1}`;
    }
  }

  eq += ` = 0`;
  this.standardEquation = eq;

  let artificialCount = 0;

  this.standardConstraints = realConstraints.map((c, index) => {
    const terms: string[] = [];

    // variables originales
    c.coefficients.forEach((coef, i) => {
      if (coef !== 0) {
        terms.push(`${coef}x${i + 1}`);
      }
    });

    if (c.type === '<=') {
      terms.push(`h${index + 1}`);
    } 
    else if (c.type === '>=') {
      artificialCount++;
      terms.push(`-s${index + 1}`);
      terms.push(`a${artificialCount}`);
    } 
    else if (c.type === '=') {
      artificialCount++;
      terms.push(`a${artificialCount}`);
    }

    return `${terms.join(' + ').replace('+ -', '- ')} = ${c.value}`;
  });

  let phase1 = '';

  if (artificialCount > 0) {
    phase1 = 'min w = ';

    for (let i = 0; i < artificialCount; i++) {
      phase1 += `a${i + 1}`;
      if (i < artificialCount - 1) phase1 += ' + ';
    }
  }

  this.standardPhase1 = phase1;

  const nonNegatives: string[] = [];

  // originales
  for (let i = 0; i < n; i++) {
    nonNegatives.push(`x${i + 1} ≥ 0`);
  }

  // holgura / exceso / artificiales
  realConstraints.forEach((c, index) => {
    if (c.type === '<=') {
      nonNegatives.push(`h${index + 1} ≥ 0`);
    } else if (c.type === '>=') {
      nonNegatives.push(`s${index + 1} ≥ 0`);
    }
  });

  for (let i = 0; i < artificialCount; i++) {
    nonNegatives.push(`a${i + 1} ≥ 0`);
  }

  this.nonNegativeVars = nonNegatives;

  this.showStandardForm = true;
}

  findPivot() {
    const lastRow = this.tableRows[this.tableRows.length - 1];

    let pivotCol = -1;
    let extremeValue = this.originalType === 'max' ? -Infinity : Infinity;

    this.tableHeaders.forEach((h, index) => {
      if (h === 'Base' || h === 'Solución' || h === 'Razón') return;

      const key = this.getKey(index);
      const value = lastRow[key];

      if (this.originalType === 'max') {
        if (value > extremeValue) {
          extremeValue = value;
          pivotCol = index;
        }
      } else {
        if (value < extremeValue) {
          extremeValue = value;
          pivotCol = index;
        }
      }
    });

    this.pivotColumnIndex = pivotCol;
    let minRatio = Infinity;
    let pivotRow = -1;

    for (let i = 0; i < this.tableRows.length - 1; i++) {
      const row = this.tableRows[i];

      const key = this.getKey(pivotCol);
      const val = row[key];

      if (val > 0) {
        const ratio = row.solution / val;
        row.ratio = ratio.toFixed(2);

        if (ratio < minRatio) {
          minRatio = ratio;
          pivotRow = i;
        }
      } else {
        row.ratio = '-';
      }
    }

    this.pivotRowIndex = pivotRow;

    const pivotKey = this.getKey(pivotCol);
    this.pivotValue = this.tableRows[pivotRow][pivotKey];
  }

  getKey(index: number): string {
    return this.tableHeaders[index];
  }

  getKeyFromHeader(header: string): string {
    if (header.startsWith('x')) return `x${Number(header[1]) - 1}`;
    if (header.startsWith('s') || header.startsWith('h')) return `s${Number(header[1]) - 1}`;
    return '';
  }

getHeaders(tableau?: number[][]): string[] {
  if (!tableau?.length) return [];

  const headers: string[] = [];

  // 🔹 1. Variables de decisión (x)
  const numDecisionVars = this.parseObjectiveString().length;

  for (let i = 0; i < numDecisionVars; i++) {
    headers.push(`x${i + 1}`);
  }

  // 🔹 2. Variables según tipo de restricción
  let artificialIndex = 1;

  this.constraints.forEach((c, i) => {
    if (!c.raw) return;

    const type = this.parseConstraintString(c.raw).type;

    if (type === '<=') {
      // Holgura
      headers.push(`h${i + 1}`);
    } 
    else if (type === '>=') {
      // Exceso + artificial
      headers.push(`s${i + 1}`);
      headers.push(`a${artificialIndex++}`);
    } 
    else if (type === '=') {
      // Solo artificial
      headers.push(`a${artificialIndex++}`);
    }
  });

  // 🔹 3. Solución
  headers.push('Solución');

  return headers;
}
detectPhaseChangeIndex(): number {
  if (!this.tableaus || this.tableaus.length === 0) return -1;

  for (let i = 0; i < this.tableaus.length; i++) {
    const tableau = this.tableaus[i].table;

    const lastRow = tableau[tableau.length - 1];

    const wValue = lastRow[lastRow.length - 1]; // 🔥 valor de W

    // 👉 cuando W ≈ 0 → termina fase 1
    if (Math.abs(wValue) < 1e-6) {
      return i + 1;
    }
  }

  return -1;
}

formatNumber(value: number | null | undefined): string {
  if (value == null) return '0';

  if (Math.abs(value) < 1e-9) return '0';

  // Si es entero
  if (Number.isInteger(value)) return value.toString();

  // Convertir a fracción
  const tolerance = 1.0E-6;
  let numerator = 1;
  let denominator = 1;
  let bestNumerator = 1;
  let bestDenominator = 1;
  let minError = Math.abs(value - numerator / denominator);

  for (denominator = 1; denominator <= 100; denominator++) {
    numerator = Math.round(value * denominator);
    const error = Math.abs(value - numerator / denominator);

    if (error < minError) {
      minError = error;
      bestNumerator = numerator;
      bestDenominator = denominator;
    }

    if (error < tolerance) break;
  }

  return `${bestNumerator}/${bestDenominator}`;
}
}
