import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ClaimsService } from '../../services/claims.service';
import { AuthService } from '../../services/auth.service';
import { Claim, User } from '../../models/interfaces';

@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './claims.component.html',
  styleUrl: './claims.component.scss'
})
export class ClaimsComponent implements OnInit {
  claims: Claim[] = [];
  user: User | null = null;
  isLoading = false;
  filterStatus = '';

  constructor(
    private claimsService: ClaimsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.user = user);
    this.loadClaims();
  }

  get isAdmin(): boolean {
    return this.user?.role === 'admin';
  }

  loadClaims(): void {
    this.isLoading = true;
    const params: { status?: string } = {};
    if (this.filterStatus) params.status = this.filterStatus;

    this.claimsService.getClaims(params).subscribe({
      next: (res) => {
        this.claims = res.claims;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  approveClaim(id: number): void {
    this.claimsService.approveClaim(id).subscribe({
      next: () => this.loadClaims(),
      error: () => {}
    });
  }

  rejectClaim(id: number): void {
    this.claimsService.rejectClaim(id).subscribe({
      next: () => this.loadClaims(),
      error: () => {}
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
