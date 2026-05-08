import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardStats, User, Announcement } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = 'http://localhost:3000/api/admin';

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`);
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  updateUserRole(userId: number, role: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  getActivityLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/activity-logs`);
  }

  getAnnouncements(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${this.apiUrl}/announcements`);
  }

  createAnnouncement(data: { title: string; content: string; priority: string }): Observable<Announcement> {
    return this.http.post<Announcement>(`${this.apiUrl}/announcements`, data);
  }

  deleteAnnouncement(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/announcements/${id}`);
  }
}
