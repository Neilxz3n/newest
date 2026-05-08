import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ItemsService } from '../../services/items.service';
import { AuthService } from '../../services/auth.service';
import { LostItem, Category } from '../../models/interfaces';

@Component({
  selector: 'app-lost-items',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './lost-items.component.html',
  styleUrl: './lost-items.component.scss',
})
export class LostItemsComponent implements OnInit {
  private itemsService = inject(ItemsService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  lostItems: LostItem[] = [];
  categories: Category[] = [];
  showReportForm = false;
  isLoading = false;
  reportForm: FormGroup;

  filterCategory = '';
  filterStatus = '';
  searchQuery = '';

  constructor() {
    this.reportForm = this.fb.group({
      item_name: ['', [Validators.required]],
      category_id: ['', [Validators.required]],
      description: ['', [Validators.required]],
      location: ['', [Validators.required]],
      date_lost: ['', [Validators.required]],
      contact_info: [''],
    });
  }

  ngOnInit(): void {
    this.loadItems();
    this.loadCategories();
  }

  loadItems(): void {
    this.isLoading = true;
    const params: Record<string, string | number> = {};
    if (this.filterCategory) params['category'] = Number(this.filterCategory);
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (this.searchQuery) params['search'] = this.searchQuery;

    this.itemsService.getLostItems(params).subscribe({
      next: (res) => {
        this.lostItems = res.items;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  loadCategories(): void {
    this.itemsService.getCategories().subscribe({
      next: (cats) => (this.categories = cats),
      error: () => {},
    });
  }

  applyFilters(): void {
    this.loadItems();
  }

  toggleReportForm(): void {
    this.showReportForm = !this.showReportForm;
  }

  submitReport(): void {
    if (this.reportForm.invalid) return;

    const formData = new FormData();
    Object.entries(this.reportForm.value).forEach(([key, value]) => {
      if (value) formData.append(key, value as string);
    });

    this.itemsService.createLostItem(formData).subscribe({
      next: () => {
        this.showReportForm = false;
        this.reportForm.reset();
        this.loadItems();
      },
      error: () => {},
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
