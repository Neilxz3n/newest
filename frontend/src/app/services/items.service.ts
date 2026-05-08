import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LostItem, FoundItem, Category, ItemMatch } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:3000/api/items';

  getLostItems(params?: {
    category?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<{ items: LostItem[]; total: number }> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.category) httpParams = httpParams.set('category', params.category.toString());
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    }
    return this.http.get<{ items: LostItem[]; total: number }>(`${this.apiUrl}/lost`, {
      params: httpParams,
    });
  }

  createLostItem(formData: FormData): Observable<LostItem> {
    return this.http.post<LostItem>(`${this.apiUrl}/lost`, formData);
  }

  getLostItemById(id: number): Observable<LostItem> {
    return this.http.get<LostItem>(`${this.apiUrl}/lost/${id}`);
  }

  getFoundItems(params?: {
    category?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<{ items: FoundItem[]; total: number }> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.category) httpParams = httpParams.set('category', params.category.toString());
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    }
    return this.http.get<{ items: FoundItem[]; total: number }>(`${this.apiUrl}/found`, {
      params: httpParams,
    });
  }

  createFoundItem(formData: FormData): Observable<FoundItem> {
    return this.http.post<FoundItem>(`${this.apiUrl}/found`, formData);
  }

  getFoundItemById(id: number): Observable<FoundItem> {
    return this.http.get<FoundItem>(`${this.apiUrl}/found/${id}`);
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  getMatches(): Observable<ItemMatch[]> {
    return this.http.get<ItemMatch[]>(`${this.apiUrl}/matches`);
  }
}
