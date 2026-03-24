import { Injectable } from '@nestjs/common';
import { CreateProblemDto } from './dtos/grafical.method.dto';
import { Solution } from './interfaces/graphical.method.interface';
import {
  getAxisIntersections,
  solveIntersection,
} from './utils/intersections.utils';
import { isFeasible } from './utils/feasibility.util';
import { getOptimal } from './utils/objective.util';
import { Point } from './interfaces/graphical.method.interface';

@Injectable()
export class GraphicalMethodService {
  solveGraphical(problem: CreateProblemDto): Solution {
    const rawPoints: Point[] = [];

    problem.constraints.forEach((c) => {
      rawPoints.push(...getAxisIntersections(c));
    });

    for (let i = 0; i < problem.constraints.length; i++) {
      for (let j = i + 1; j < problem.constraints.length; j++) {
        const point = solveIntersection(
          problem.constraints[i],
          problem.constraints[j],
        );
        if (point) rawPoints.push(point);
      }
    }

    rawPoints.push({ x: 0, y: 0 });

    const cleanPoints = rawPoints.filter(
      (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y),
    );

    const uniquePoints = cleanPoints.filter(
      (p, index, self) =>
        index ===
        self.findIndex(
          (q) => Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6,
        ),
    );
    const feasiblePoints: Point[] = [];
    const infeasiblePoints: Point[] = [];

    uniquePoints.forEach((p) => {
      if (isFeasible(p, problem.constraints)) {
        feasiblePoints.push(p);
      } else {
        infeasiblePoints.push(p);
      }
    });

    const optimal = getOptimal(feasiblePoints, problem.objective, problem.type);

    return {
      allPoints: uniquePoints,
      feasiblePoints,
      infeasiblePoints,
      optimal,
    };
  }
}
