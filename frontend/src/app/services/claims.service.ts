import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Claim } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class ClaimsService {
  private apiUrl = 'http://localhost:3000/api/claims';

  constructor(private http: HttpClient) {}

  createClaim(data: { lost_item_id?: number; found_item_id?: number; proof: string }): Observable<Claim> {
    return this.http.post<Claim>(this.apiUrl, data);
  }

  getClaims(params?: { status?: string; page?: number; limit?: number }): Observable<{ claims: Claim[]; total: number }> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    }
    return this.http.get<{ claims: Claim[]; total: number }>(this.apiUrl, { params: httpParams });
  }

  getClaimById(id: number): Observable<Claim> {
    return this.http.get<Claim>(`${this.apiUrl}/${id}`);
  }

  approveClaim(id: number, notes?: string): Observable<Claim> {
    return this.http.put<Claim>(`${this.apiUrl}/${id}/approve`, { admin_notes: notes });
  }

  rejectClaim(id: number, notes?: string): Observable<Claim> {
    return this.http.put<Claim>(`${this.apiUrl}/${id}/reject`, { admin_notes: notes });
  }
}
