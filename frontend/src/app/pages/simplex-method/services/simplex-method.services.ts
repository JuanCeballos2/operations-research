// simplex-method.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SimplexRequest, SimplexResult } from '../types/simplex-method.type';


@Injectable({
  providedIn: 'root'
})
export class SimplexMethodService {

  private baseUrl = 'http://localhost:3000/api/operations-research/simplex-method';

  constructor(private http: HttpClient) {}

  solve(request: SimplexRequest): Observable<SimplexResult> {
    return this.http.post<SimplexResult>(this.baseUrl, request);
  }
}