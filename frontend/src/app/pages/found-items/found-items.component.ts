import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ItemsService } from '../../services/items.service';
import { AuthService } from '../../services/auth.service';
import { FoundItem, Category } from '../../models/interfaces';

@Component({
  selector: 'app-found-items',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './found-items.component.html',
  styleUrl: './found-items.component.scss'
})
export class FoundItemsComponent implements OnInit {
  foundItems: FoundItem[] = [];
  categories: Category[] = [];
  showReportForm = false;
  isLoading = false;
  reportForm: FormGroup;

  filterCategory = '';
  filterStatus = '';
  searchQuery = '';

  constructor(
    private itemsService: ItemsService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.reportForm = this.fb.group({
      item_name: ['', [Validators.required]],
      category_id: ['', [Validators.required]],
      description: ['', [Validators.required]],
      location: ['', [Validators.required]],
      pickup_location: ['', [Validators.required]],
      date_found: ['', [Validators.required]],
      verification_notes: ['']
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

    this.itemsService.getFoundItems(params).subscribe({
      next: (res) => {
        this.foundItems = res.items;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  loadCategories(): void {
    this.itemsService.getCategories().subscribe({
      next: (cats) => this.categories = cats,
      error: () => {}
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

    this.itemsService.createFoundItem(formData).subscribe({
      next: () => {
        this.showReportForm = false;
        this.reportForm.reset();
        this.loadItems();
      },
      error: () => {}
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
