import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DualMethodResult } from '../types/dual-method.type';

@Injectable({
  providedIn: 'root',
})
export class DualMethodService {

  private apiUrl = 'http://localhost:3000/api/operations-research/dual-method';

  constructor(private http: HttpClient) {}

  solve(data: any): Observable<DualMethodResult> {
    return this.http.post<DualMethodResult>(this.apiUrl, data);
  }
}