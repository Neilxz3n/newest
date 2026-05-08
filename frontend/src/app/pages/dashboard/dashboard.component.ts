import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { User, DashboardStats } from '../../models/interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  user: User | null = null;
  stats: DashboardStats = {
    totalLost: 0,
    totalFound: 0,
    totalClaimed: 0,
    pendingClaims: 0,
    totalUsers: 0,
    recentActivities: [],
  };
  unreadCount = 0;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.user = user;
    });

    this.adminService.getDashboardStats().subscribe({
      next: (stats) => (this.stats = stats),
      error: () => {},
    });

    this.notificationService.getUnreadCount().subscribe({
      next: (res) => (this.unreadCount = res.count),
      error: () => {},
    });
  }

  get isAdmin(): boolean {
    return this.user?.role === 'admin';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
