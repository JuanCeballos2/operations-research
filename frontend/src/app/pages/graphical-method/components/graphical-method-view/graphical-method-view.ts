import { ChangeDetectorRef, Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Constraint, Solution } from '../../types/graphical-method.type';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-graphical-method-view',
  standalone: true,
  templateUrl: './graphical-method-view.html',
  styleUrls: ['./graphical-method-view.css'],
  imports: [CommonModule, FormsModule],
})
export class GraphicalMethodView {
  @ViewChild('graphCanvas') graphCanvas!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;

  objectiveString: string = '';
  type: 'max' | 'min' = 'max';

  constraintsStrings: string[] = [];
  constraints: Constraint[] = [];


  solution: Solution | null = null;
  loading = false;
  error: string | null = null;
  showData = false;
  solutionReady = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  // Navega a la página principal
  goHome() {
    this.router.navigate(['/']);
  }

  // Alterna la visualización de los datos importantes, asegurando que el cambio se detecte correctamente
  toggleData() {
    this.ngZone.run(() => {
      this.showData = !this.showData;
    });
  }
// VALIDADIONES DE LA FUNCIÓN OBJETIVO
  validateObjective(str?: string): boolean {
    if (!str) return false;

    const clean = str.replace(/\s+/g, '');

    const regex = /^([Zz]=)?([+-]?\d*\.?\d*)x([+-]\d*\.?\d*y)?$/;

    return regex.test(clean);
  }
// VALIDADACIONES DE LAS RESTRICCIONES
  validateConstraint(str?: string): boolean {
    if (!str) return false;

    const clean = str.replace(/\s+/g, '');

    const regex = /^([+-]?\d*\.?\d*x)?([+-]?\d*\.?\d*y)?(<=|>=|=)([+-]?\d*\.?\d+)$/;

    return regex.test(clean);
  }

  onNonNegativityChange() {
    if (this.solution) {
      this.drawGraph();
    }
  }
// Dado la función objetivo en formato string, extrae los coeficientes de x e y para enviarlos al backend
  parseObjectiveString(): number[] {
    const clean = this.objectiveString.replace(/^[Zz]\s*=\s*/, '').replace(/\s+/g, '');
    const xMatch = clean.match(/([+-]?\d*\.?\d*)x/);
    const yMatch = clean.match(/([+-]?\d*\.?\d*)y/);
    const x = xMatch ? Number(xMatch[1] || 1) : 0;
    const y = yMatch ? Number(yMatch[1] || 1) : 0;
    return [x, y];
  }
  //

  parseConstraintString(str: string): Constraint {
    let type: '<=' | '=' | '>=' = '<=';

    if (str.includes('<=')) type = '<=';
    else if (str.includes('>=')) type = '>=';
    else if (str.includes('=')) type = '=';

    const sides = str.split(type);
    const left = sides[0].replace(/\s+/g, '');

    // LAS RESTRICCIONES SIEMPRE TIENEN 2 VARIABLES, ASÍ QUE BUSCAMOS X SI EXISTE, ASUMIMOS COEFICIENTE 0 SI NO EXISTE
    let x = 0;
    const xMatch = left.match(/([+-]?\d*\.?\d*)x/);
    if (xMatch) {
      const val = xMatch[1];
      if (val === '' || val === '+') x = 1;
      else if (val === '-') x = -1;
      else x = Number(val);
    }

    // LAS RESTRICCIONES SIEMPRE TIENEN 2 VARIABLES, ASÍ QUE BUSCAMOS Y SI NO EXISTE, ASUMIMOS COEFICIENTE 0
    let y = 0;
    const yMatch = left.match(/([+-]?\d*\.?\d*)y/);
    if (yMatch) {
      const val = yMatch[1];
      if (val === '' || val === '+') y = 1;
      else if (val === '-') y = -1;
      else y = Number(val);
    }

    const value = Number(sides[1].trim());

    return {
      coefficients: [x, y],
      value,
      type,
    };
  }
// Agrega una nueva restricción
  addConstraint() {
    this.constraintsStrings.push('');
    this.constraints.push({ coefficients: [0, 0], value: 0, type: '<=' });
  }
// Elimina una restricción
  removeConstraint(index: number) {
    this.constraintsStrings.splice(index, 1);
    this.constraints.splice(index, 1);
  }
// Envía los datos al backend para resolver el problema gráfico, maneja la respuesta y dibuja la gráfica
solve() {
  this.error = null;
  this.solution = null;
  this.solutionReady = false; 
  this.showData = false;     
  this.loading = true;

  // Validaciones
  if (!this.objectiveString) {
    this.error = 'Ingrese función objetivo';
    this.loading = false;
    return;
  }
  if (!this.validateObjective(this.objectiveString)) {
    this.error = 'Función objetivo incorrecta';
    this.loading = false;
    return;
  }
  for (const str of this.constraintsStrings) {
    if (!this.validateConstraint(str)) {
      this.error = `Restricción incorrecta: ${str}`;
      this.loading = false;
      return;
    }
  }

  this.constraints = this.constraintsStrings.map((s) => this.parseConstraintString(s));

  const request = {
  objective: this.parseObjectiveString(),
  type: this.type,
  constraints: this.constraints,
};


  this.http
    .post<any>('http://localhost:3000/api/operations-research/graphical-method', request)
    .subscribe({
      next: (res) => {
        const data = res?.data || res;

        this.solution = {
          allPoints: data.allPoints || [],
          feasiblePoints: data.feasiblePoints || [],
          infeasiblePoints: data.infeasiblePoints || [],
          optimal: data.optimal || { bestPoint: null, bestValue: null },
          vertices: data.vertices || [],
        };

        // Forzar para que el botón de "Datos importantes" se muestre inmediatamente después de obtener la solución
        Promise.resolve().then(() => {
          this.solutionReady = true;  
          this.cdr.detectChanges();

          // Luego dibuja la gráfica
          this.drawGraph();
        });

        this.loading = false;
      },
      error: () => {
        this.ngZone.run(() => {
          this.error = 'Error al resolver el método gráfico';
          this.loading = false;
        });
      },
    });
}
// Dado una restricción, calcula dos puntos para dibujar la línea correspondiente
  getLinePoints(constraint: Constraint) {
    const [a, b] = constraint.coefficients;
    const c = constraint.value;

    const points: { x: number; y: number }[] = [];

    if (a !== 0) {
      const x = c / a;
      if (isFinite(x)) {
        points.push({ x, y: 0 });
      }
    }
    if (b !== 0) {
      const y = c / b;
      if (isFinite(y)) {
        points.push({ x: 0, y });
      }
    }

    return points;
  }
// Dibuja la gráfica usando Chart.js, incluyendo restricciones, región factible y puntos óptimos
  async drawGraph() {
    if (!this.solution) return;

    const ctx = this.graphCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) this.chart.destroy();
    if (typeof window !== 'undefined') {
      const zoomPlugin = await import('chartjs-plugin-zoom');
      Chart.register(zoomPlugin.default);
    }

    const bounds = this.getDynamicBounds();

    let polygon = [...(this.solution.vertices || [])];

    if (polygon.length >= 3) {
      const center = {
        x: polygon.reduce((s, p) => s + p.x, 0) / polygon.length,
        y: polygon.reduce((s, p) => s + p.y, 0) / polygon.length,
      };

      polygon.sort((a, b) => {
        const A = Math.atan2(a.y - center.y, a.x - center.x);
        const B = Math.atan2(b.y - center.y, b.x - center.x);
        return A - B;
      });
    }

    const polygonPlugin = {
      id: 'polygonFill',
      beforeDraw: (chart: any) => {
        if (polygon.length < 3) return;

        const { ctx, scales } = chart;

        ctx.save();
        ctx.beginPath();

        polygon.forEach((p: any, i: number) => {
          const x = scales.x.getPixelForValue(p.x);
          const y = scales.y.getPixelForValue(p.y);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 180, 0, 0.4)';
        ctx.fill();

        ctx.restore();
      },
    };

    const lines = this.constraints.map((c, i) => {
      const [a, b] = c.coefficients;
      const cVal = c.value;

      let points = [];

      if (Math.abs(b) > 1e-6) {
        points = [
          { x: bounds.minX, y: (cVal - a * bounds.minX) / b },
          { x: bounds.maxX, y: (cVal - a * bounds.maxX) / b },
        ];
      } else {
        const x = cVal / a;
        points = [
          { x: x, y: bounds.minY },
          { x: x, y: bounds.maxY },
        ];
      }

      return {
        label: `R${i + 1}: ${a}x + ${b}y ${c.type} ${cVal}`,
        data: points,
        type: 'line' as const,
        borderColor: this.getColor(i),
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
        tension: 0,
        order: 2,
      };
    });

    const datasets: any[] = [];

    if (polygon.length >= 3) {
      datasets.push({
        label: 'Región factible',
        data: [...polygon, polygon[0]],
        type: 'line' as const,
        fill: false,
        borderColor: 'green',
        borderWidth: 2,
        pointRadius: 0,
        order: 1,
      });
    }

    datasets.push(...lines);

    datasets.push(
      {
        label: 'Factibles',
        data: this.solution.feasiblePoints,
        showLine: false,
        backgroundColor: 'blue',
        pointRadius: 5,
      },
      {
        label: 'No factibles',
        data: this.solution.infeasiblePoints,
        showLine: false,
        backgroundColor: 'orange',
        pointRadius: 5,
      },
      {
        label: 'Óptimo',
        data: this.solution.optimal.bestPoint ? [this.solution.optimal.bestPoint] : [],
        showLine: false,
        backgroundColor: 'red',
        pointRadius: 8,
      },
    );

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          legend: { position: 'top' },

          zoom: {
            pan: {
              enabled: true,
              mode: 'xy',
            },
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              mode: 'xy',
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: bounds.minX,
            max: bounds.maxX,
            grid: {
              color: (ctx: any) => (ctx.tick.value === 0 ? 'black' : 'rgba(0,0,0,0.1)'),
              lineWidth: (ctx: any) => (ctx.tick.value === 0 ? 2 : 1),
            },
          },
          y: {
            min: bounds.minY,
            max: bounds.maxY,
            grid: {
              color: (ctx: any) => (ctx.tick.value === 0 ? 'black' : 'rgba(0,0,0,0.1)'),
              lineWidth: (ctx: any) => (ctx.tick.value === 0 ? 2 : 1),
            },
          },
        },
      },
      plugins: [polygonPlugin],
    });
  }
  getColor(i: number) {
    const colors = ['red', 'blue', 'orange', 'purple', 'brown'];
    return colors[i % colors.length];
  }

  // Calcula límites dinámicos para la gráfica basados en los puntos obtenidos, con un padding del 20%

  getDynamicBounds() {
    if (!this.solution) {
      return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    }

    const all = [
      ...this.solution.allPoints,
      ...this.solution.feasiblePoints,
      ...this.solution.infeasiblePoints,
    ];

    if (all.length === 0) {
      return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    }

    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);

    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);

    const paddingX = (maxX - minX) * 0.2 || 5;
    const paddingY = (maxY - minY) * 0.2 || 5;

    return {
      minX: Math.floor(minX - paddingX),
      maxX: Math.ceil(maxX + paddingX),
      minY: Math.floor(minY - paddingY),
      maxY: Math.ceil(maxY + paddingY),
    };
  }
}
