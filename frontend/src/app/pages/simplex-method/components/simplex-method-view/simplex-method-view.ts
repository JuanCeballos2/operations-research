import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConstraintSimplex } from '../../types/simplex-method.type';
import { SimplexMethodService } from '../../services/simplex-method.services';
import { Solution } from '../../../graphical-method/types/graphical-method.type';

@Component({
  selector: 'app-simplex-method-view',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './simplex-method-view.html',
  styleUrl: './simplex-method-view.css',
})
export class SimplexMethodView {
  constraintsStrings: string[] = [];
 constraints: (ConstraintSimplex & { raw: string })[] = [];
  objectiveString: string = '';
  tableHeaders: string[] = [];
  tableRows: any[] = [];
 tableaus!: number[][][];
 error: string | null = null;
 showData = false;
solutionReady = false;
solution: Solution | null = null;


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


  constructor(private router: Router, private simplexMethodService: SimplexMethodService) {}

  goHome() {
    this.router.navigate(['/']);
  }

  validateObjective(str?: string): boolean {
    if (!str) return false;
    const clean = str.replace(/\s+/g, '');
    const regex = /^([Zz]=)?([+-]?\d*\.?\d*x\d+)+$/;
    return regex.test(clean);
  }

  validateConstraint(str?: string): boolean {
    if (!str) return false;
    const clean = str.replace(/\s+/g, '');
    const regex = /^([+-]?\d*\.?\d*x\d+)+(<=|>=|=)[+-]?\d*\.?\d+$/;
    return regex.test(clean);
  }

  parseObjectiveString(): number[] {
    const clean = this.objectiveString.replace(/^[Zz]\s*=\s*/, '').replace(/\s+/g, '');

    const regex = /([+-]?\d*\.?\d*)x(\d+)/g;
    const coefficients: number[] = [];

    let match;

    while ((match = regex.exec(clean)) !== null) {
      let coef = match[1];
      const index = Number(match[2]) - 1;

      if (coef === '' || coef === '+') coef = '1';
      if (coef === '-') coef = '-1';

      coefficients[index] = Number(coef);
    }

    return coefficients.map((c) => c ?? 0);
  }

  parseConstraintString(str: string): ConstraintSimplex {
    let type: '<=' | '=' | '>=' = '<=';

    if (str.includes('<=')) type = '<=';
    else if (str.includes('>=')) type = '>=';
    else if (str.includes('=')) type = '=';

    const [left, right] = str.split(type);

    const clean = left.replace(/\s+/g, '');
    const regex = /([+-]?\d*\.?\d*)x(\d+)/g;

    const coefficients: number[] = [];

    let match;

    while ((match = regex.exec(clean)) !== null) {
      let coef = match[1];
      const index = Number(match[2]) - 1;

      if (coef === '' || coef === '+') coef = '1';
      if (coef === '-') coef = '-1';

      coefficients[index] = Number(coef);
    }

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
    raw: ''
  });
}

  removeConstraint(index: number) {
    this.constraintsStrings.splice(index, 1);
    this.constraints.splice(index, 1);
  }

  buildPayload() {
  const objective = this.parseObjectiveString();

  const constraints = this.constraints.map((c) =>
    this.parseConstraintString(c.raw)
  );

  const maxVars = Math.max(
    objective.length,
    ...constraints.map((c) => c.coefficients.length)
  );

  const normalize = (arr: number[]) =>
    Array.from({ length: maxVars }, (_, i) => arr[i] ?? 0);

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

  if (this.constraints.length === 0) {
    alert('Debes agregar al menos una restricción');
    this.loading = false;
    return;
  }

  for (let c of this.constraints) {
    if (!this.validateConstraint(c.raw)) {
      alert('Restricción inválida: ' + c.raw);
      this.loading = false;
      return;
    }
  }

  this.originalType = this.type;

  const payload = this.buildPayload();

  this.simplexMethodService.solve(payload).subscribe({
    next: (res: any) => {
      console.log('RESPUESTA BACKEND 👉', res);

      this.tableaus = res?.tableaus ?? [];

      this.solution = res;
      this.solutionReady = true;
      this.showData = true;

      this.generateStandardForm();

      this.showTable = true;
      this.loading = false;
    },
    error: (err) => {
      console.error(err);
      this.loading = false;
    }
  });
}

  generateStandardForm() {
    const payload = this.buildPayload();

    // 🔥 Filtrar restricciones tipo x ≥ 0
    const realConstraints = payload.constraints.filter((c) => {
      const nonZero = c.coefficients.filter((v) => v !== 0);

      return !(nonZero.length === 1 && c.value === 0 && c.type === '>=');
    });

    const n = payload.objective.length;
    const m = realConstraints.length;

    const objective = [...payload.objective];

    // 🟢 FUNCIÓN OBJETIVO
    let obj = `${this.originalType} z = `;

    objective.forEach((coef, i) => {
      obj += `${coef}x${i + 1}`;
      if (i < n - 1) obj += ' + ';
    });

    for (let i = 0; i < m; i++) {
      if (this.originalType === 'max') {
        obj += ` + 0h${i + 1}`;
      } else {
        obj += ` + 0s${i + 1}`;
      }
    }

    this.standardObjective = obj;

    // 🔥 ECUACIÓN
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

    // 🔥 RESTRICCIONES (SIN DOBLE SIGNO)
    this.standardConstraints = realConstraints.map((c, index) => {
      const terms: string[] = [];

      c.coefficients.forEach((coef, i) => {
        if (coef !== 0) {
          terms.push(`${coef}x${i + 1}`);
        }
      });

      if (c.type === '<=') {
        terms.push(`h${index + 1}`);
      } else if (c.type === '>=') {
        terms.push(`-s${index + 1}`);
      } else {
        terms.push(`h${index + 1}`);
      }

      return `${terms.join(' + ').replace('+ -', '- ')} = ${c.value}`;
    });

    // 🟢 NO NEGATIVIDAD
    this.nonNegativeVars = Array.from({ length: n }, (_, i) => `x${i + 1} ≥ 0`);

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

getHeaders(tableau: number[][]): string[] {
  const cols = tableau[0].length;

  return [
    ...Array.from({ length: cols - 1 }, (_, i) => `x${i + 1}`),
    'Solución'
  ];
}
}
