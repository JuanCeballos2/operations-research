import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DualMethodService } from '../../services/dual-method';
import { DualMethodResult } from '../../types/dual-method.type';
import { ConstraintSimplex } from '../../../simplex-method/types/simplex-method.type';

@Component({
  selector: 'app-dual-method-view',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './dual-method-view.html',
  styleUrl: './dual-method-view.css',
})
export class DualMethodView {
  objectiveString: string = '';
  type: 'max' | 'min' = 'max';

  constraintsStrings: string[] = [];
  solution: DualMethodResult | null = null;

  loading = false;
  error: string | null = null;
  Math = Math;

  constructor(
    private router: Router,
    private dualMethodService: DualMethodService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  goHome() {
    this.router.navigate(['/']);
  }

  validateObjective(str?: string): boolean {
    if (!str) return false;

    const clean = str.replace(/\s+/g, '');
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
    this.constraintsStrings.push('');
  }

  removeConstraint(index: number) {
    this.constraintsStrings.splice(index, 1);
  }

  solve() {
    if (this.loading) return;

    this.loading = true;
    this.error = null;
    this.solution = null;

    try {
      const objective = this.parseObjectiveString();

      if (!objective.length || objective.every((v) => v === 0)) {
        this.error = 'La función objetivo no es válida';
        this.loading = false;
        return;
      }

      const constraints = this.constraintsStrings.map((c) => this.parseConstraintString(c));

      if (!constraints.length) {
        this.error = 'Debe agregar al menos una restricción';
        this.loading = false;
        return;
      }

      const payload = {
        objective,
        type: this.type,
        constraints,
        variableSigns: new Array(objective.length).fill('positive'),
      };

      this.dualMethodService.solve(payload).subscribe({
        next: (res: any) => {
          const data = res?.data || res;
          Promise.resolve().then(() => {
            this.solution = data;
            this.loading = false;
            this.cdr.detectChanges();
          });
        },

        error: (err: any) => {
          Promise.resolve().then(() => {
            this.error = err.message || 'Error al resolver el problema';
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
      });
    } catch (e: any) {
      this.error = e.message || 'Datos inválidos';
      this.loading = false;
    }
  }

  trackByIndex(index: number): number {
    return index;
  }
}
