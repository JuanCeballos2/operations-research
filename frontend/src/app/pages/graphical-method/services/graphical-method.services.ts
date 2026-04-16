import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constraint, GraphicalMethodRequest, Solution } from '../types/graphical-method.type';

@Injectable({ providedIn: 'root' })
export class GraphicalMethodService {

  private baseUrl = 'http://localhost:3000/api/operations-research/graphical-method';

  constructor(private http: HttpClient) {}

  solve(request: GraphicalMethodRequest): Observable<Solution> {
    return this.http.post<Solution>(this.baseUrl, request);
  }
}