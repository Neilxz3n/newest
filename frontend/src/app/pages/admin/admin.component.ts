import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { User, Announcement } from '../../models/interfaces';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  activeTab = 'users';
  users: User[] = [];
  announcements: Announcement[] = [];
  activityLogs: any[] = [];
  isLoading = false;

  announcementForm: FormGroup;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.announcementForm = this.fb.group({
      title: ['', [Validators.required]],
      content: ['', [Validators.required]],
      priority: ['normal', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadAnnouncements();
    this.loadActivityLogs();
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  loadUsers(): void {
    this.adminService.getUsers().subscribe({
      next: (users) => this.users = users,
      error: () => {}
    });
  }

  loadAnnouncements(): void {
    this.adminService.getAnnouncements().subscribe({
      next: (announcements) => this.announcements = announcements,
      error: () => {}
    });
  }

  loadActivityLogs(): void {
    this.adminService.getActivityLogs().subscribe({
      next: (logs) => this.activityLogs = logs,
      error: () => {}
    });
  }

  updateRole(userId: number, role: string): void {
    this.adminService.updateUserRole(userId, role).subscribe({
      next: () => this.loadUsers(),
      error: () => {}
    });
  }

  createAnnouncement(): void {
    if (this.announcementForm.invalid) return;

    this.adminService.createAnnouncement(this.announcementForm.value).subscribe({
      next: () => {
        this.announcementForm.reset({ priority: 'normal' });
        this.loadAnnouncements();
      },
      error: () => {}
    });
  }

  deleteAnnouncement(id: number): void {
    this.adminService.deleteAnnouncement(id).subscribe({
      next: () => this.loadAnnouncements(),
      error: () => {}
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
