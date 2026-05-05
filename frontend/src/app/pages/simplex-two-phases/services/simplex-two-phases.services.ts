import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SimplexRequest, SimplexResult } from '../types/simplex-two-phases.type';

@Injectable({
  providedIn: 'root',
})
export class SimplexTwoPhasesServices {

  private baseUrl = 'http://localhost:3000/api/operations-research/simplex-two-phases';

  
  constructor(private http: HttpClient) {}

  solve(request: SimplexRequest): Observable<SimplexResult> {
    return this.http.post<SimplexResult>(this.baseUrl, request);
  }
}
