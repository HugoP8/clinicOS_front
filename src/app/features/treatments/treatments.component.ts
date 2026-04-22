import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Treatment, TreatmentCategory } from '../../core/models';

@Component({
  selector: 'app-treatments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-slide-up">
      <!-- SUPER_ADMIN filter bar -->
      @if (isSuperAdmin()) {
        <div class="card p-3 flex flex-wrap items-center gap-3">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Filtrar por:</span>
          <select class="input input-sm w-48" [value]="filterTenantId()" (change)="onTenantFilterChange($any($event.target).value)">
            <option value="">Todos los tenants</option>
            @for (t of tenants(); track t.id) {
              <option [value]="t.id">{{ t.name }}</option>
            }
          </select>
          @if (filterTenantId()) {
            <select class="input input-sm w-48" [value]="filterClinicId()" (change)="onClinicFilterChange($any($event.target).value)">
              <option value="">Todas las clínicas</option>
              @for (c of clinicsForFilter(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          }
          @if (filterClinicId()) {
            <select class="input input-sm w-48" [value]="filterBranchId()" (change)="onBranchFilterChange($any($event.target).value)">
              <option value="">Todas las sucursales</option>
              @for (b of branchesForFilter(); track b.id) {
                <option [value]="b.id">{{ b.name }}</option>
              }
            </select>
          }
          @if (filterTenantId() || filterClinicId() || filterBranchId()) {
            <button class="btn-ghost text-xs py-1 px-2" (click)="clearFilters()">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Limpiar
            </button>
          }
        </div>
      }

      <div class="page-header">
        <div>
          <h1 class="page-title">Tratamientos</h1>
          <p class="page-subtitle">Catálogo de servicios y procedimientos</p>
        </div>
        @if (isAdmin()) {
          <div class="flex gap-2">
            <button (click)="openCategoryModal()" class="btn-secondary">Categorías</button>
            <button (click)="openModal()" class="btn-primary">+ Nuevo Tratamiento</button>
          </div>
        }
      </div>

      <!-- Filters -->
      <div class="card p-4 flex flex-wrap gap-3 items-center">
        <input [(ngModel)]="search" (input)="loadTreatments()" class="input w-52" placeholder="Buscar tratamiento...">
        <select [(ngModel)]="selectedCategory" (change)="loadTreatments()" class="input w-48">
          <option value="">Todas las categorías</option>
          @for (c of categories(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
        <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input type="checkbox" [(ngModel)]="onlyActive" (change)="loadTreatments()" class="rounded">
          Solo activos
        </label>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Tratamiento</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Promoción</th>
                <th>Duración</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (t of treatments(); track t.id) {
                <tr>
                  <td>
                    <p class="font-medium">{{ t.name }}</p>
                    @if (t.description) {
                      <p class="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{{ t.description }}</p>
                    }
                  </td>
                  <td>
                    @if (t.category) {
                      <span class="inline-flex items-center gap-1.5">
                        @if (t.category.color) {
                          <span class="w-2 h-2 rounded-full" [style.background]="t.category.color"></span>
                        }
                        <span class="text-sm text-slate-600 dark:text-slate-400">{{ t.category.name }}</span>
                      </span>
                    } @else {
                      <span class="text-slate-400">—</span>
                    }
                  </td>
                  <td class="font-semibold">Bs. {{ t.price | number:'1.2-2' }}</td>
                  <td>
                    @if (t.isPromoted && t.promotionPrice) {
                      <span class="badge-yellow text-xs">Bs. {{ t.promotionPrice | number:'1.2-2' }}</span>
                    } @else {
                      <span class="text-slate-400">—</span>
                    }
                  </td>
                  <td class="text-slate-500">{{ t.durationMinutes }} min</td>
                  <td>
                    <span [class]="t.isActive ? 'badge-green' : 'badge-red'">
                      {{ t.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>
                    <div class="flex items-center gap-0.5">
                      @if (isAdmin()) {
                        <button (click)="openModal(t)" title="Editar"
                          class="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 dark:text-primary-400 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button (click)="toggleActive(t)" [title]="t.isActive ? 'Desactivar' : 'Activar'"
                          class="p-1.5 rounded-lg transition-colors"
                          [ngClass]="t.isActive ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-500'">
                          @if (t.isActive) {
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          } @else {
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          }
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7">
                  <div class="empty-state py-10">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    <p class="empty-state-title">Sin tratamientos registrados</p>
                    <p class="empty-state-desc">Crea el catálogo de servicios de tu clínica</p>
                  </div>
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Tratamiento -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-center">
        <div class="modal animate-slide-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">{{ editing() ? 'Editar Tratamiento' : 'Nuevo Tratamiento' }}</h2>
            <button (click)="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body space-y-4">
            <div>
              <label class="label">Nombre *</label>
              <input [(ngModel)]="form.name" class="input" placeholder="Ej: Limpieza Dental">
            </div>
            <div>
              <label class="label">Descripción</label>
              <textarea [(ngModel)]="form.description" class="input resize-none" rows="2" placeholder="Descripción breve del tratamiento..."></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Precio (Bs.) *</label>
                <input [(ngModel)]="form.price" type="number" step="0.01" class="input" placeholder="0.00">
              </div>
              <div>
                <label class="label">Duración (min) *</label>
                <input [(ngModel)]="form.durationMinutes" type="number" class="input" placeholder="30">
              </div>
            </div>
            <div>
              <label class="label">Categoría</label>
              <select [(ngModel)]="form.categoryId" class="input">
                <option value="">Sin categoría</option>
                @for (c of categories(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>
            @if (clinics().length > 1) {
              <div>
                <label class="label">Clínica *</label>
                <select [(ngModel)]="form.clinicId" class="input">
                  <option value="">Seleccionar clínica</option>
                  @for (c of clinics(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>
            } @else if (clinics().length === 1) {
              <input type="hidden" [(ngModel)]="form.clinicId" [value]="clinics()[0].id">
            }
            <div class="flex items-center gap-2">
              <input type="checkbox" [(ngModel)]="form.isPromoted" id="promo" class="rounded">
              <label for="promo" class="text-sm text-slate-600 dark:text-slate-400">¿Tiene precio promocional?</label>
            </div>
            @if (form.isPromoted) {
              <div>
                <label class="label">Precio Promocional (Bs.)</label>
                <input [(ngModel)]="form.promotionPrice" type="number" step="0.01" class="input" placeholder="0.00">
              </div>
            }
          </div>
          <div class="modal-footer">
            <button (click)="closeModal()" class="btn-secondary">Cancelar</button>
            <button (click)="save()" class="btn-primary" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
        </div>
      </div>
    }

    <!-- Modal Categorías -->
    @if (showCategoryModal()) {
      <div class="modal-overlay" (click)="showCategoryModal.set(false)">
        <div class="modal-center">
        <div class="modal animate-slide-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">Categorías de Tratamiento</h2>
            <button (click)="showCategoryModal.set(false)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body space-y-3">
            <div class="space-y-1 max-h-48 overflow-y-auto">
              @for (c of categories(); track c.id) {
                <div class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                  @if (c.color) {
                    <span class="w-3 h-3 rounded-full border border-slate-200 shrink-0" [style.background]="c.color"></span>
                  }
                  <span class="text-sm flex-1">{{ c.name }}</span>
                </div>
              } @empty {
                <p class="text-sm text-slate-400 text-center py-4">Sin categorías</p>
              }
            </div>
            <div class="border-t border-slate-200 dark:border-slate-700 pt-3">
              <p class="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Nueva categoría</p>
              <div class="flex gap-2">
                <input [(ngModel)]="newCategoryName" class="input flex-1" placeholder="Nombre de categoría">
                <input [(ngModel)]="newCategoryColor" type="color" class="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5">
                <button (click)="addCategory()" class="btn-primary px-4">+</button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button (click)="showCategoryModal.set(false)" class="btn-secondary">Cerrar</button>
          </div>
        </div>
        </div>
      </div>
    }
  `,
})
export class TreatmentsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  isAdmin = computed(() => ['ADMIN', 'SUPER_ADMIN'].includes(this.auth.currentUser()?.role || ''));
  tenants = signal<any[]>([]);
  clinicsForFilter = signal<any[]>([]);
  filterTenantId = signal<string>('');
  filterClinicId = signal<string>('');
  branchesForFilter = signal<any[]>([]);
  filterBranchId = signal<string>('');

  treatments = signal<Treatment[]>([]);
  categories = signal<TreatmentCategory[]>([]);
  clinics = signal<any[]>([]);
  showModal = signal(false);
  showCategoryModal = signal(false);
  editing = signal<Treatment | null>(null);
  saving = signal(false);

  search = '';
  selectedCategory = '';
  onlyActive = false;
  newCategoryName = '';
  newCategoryColor = '#6366f1';

  form = this.emptyForm();

  ngOnInit() {
    if (this.isSuperAdmin()) this.loadTenants();
    this.loadCategories();
    this.loadClinics();
    this.loadTreatments();
  }

  loadTenants() {
    this.api.get<any>('/tenants').subscribe({
      next: (res: any) => this.tenants.set(res?.data || res || []),
      error: () => {},
    });
  }

  loadClinics() {
    this.api.get<any[]>('/clinics').subscribe({
      next: (data: any) => this.clinics.set(Array.isArray(data) ? data : data?.data || []),
      error: () => {},
    });
  }

  onTenantFilterChange(tenantId: string) {
    this.filterTenantId.set(tenantId);
    this.filterClinicId.set('');
    this.clinicsForFilter.set([]);
    if (tenantId) {
      this.api.get<any[]>('/clinics', { tenantId }).subscribe({
        next: (data: any) => this.clinicsForFilter.set(Array.isArray(data) ? data : data?.data || []),
        error: () => {},
      });
    }
    this.loadTreatments();
  }

  onClinicFilterChange(clinicId: string) {
    this.filterClinicId.set(clinicId);
    this.filterBranchId.set('');
    this.branchesForFilter.set([]);
    if (clinicId) {
      this.api.get<any[]>('/branches', { clinicId }).subscribe({
        next: (data: any) => this.branchesForFilter.set(Array.isArray(data) ? data : data?.data || []),
        error: () => {},
      });
    }
    this.loadTreatments();
  }

  onBranchFilterChange(branchId: string) {
    this.filterBranchId.set(branchId);
    this.loadTreatments();
  }

  clearFilters() {
    this.filterTenantId.set('');
    this.filterClinicId.set('');
    this.filterBranchId.set('');
    this.clinicsForFilter.set([]);
    this.branchesForFilter.set([]);
    this.loadTreatments();
  }

  loadCategories() {
    this.api.get<TreatmentCategory[]>('/treatments/categories').subscribe(c => this.categories.set(c));
  }

  loadTreatments() {
    const params: any = { limit: 100 };
    if (this.search) params.search = this.search;
    if (this.selectedCategory) params.categoryId = this.selectedCategory;
    if (this.onlyActive) params.isActive = true;
    if (this.filterTenantId()) params.tenantId = this.filterTenantId();
    if (this.filterClinicId()) params.clinicId = this.filterClinicId();
    if (this.filterBranchId()) params.branchId = this.filterBranchId();
    this.api.getPaginated<Treatment>('/treatments', params).subscribe(r => this.treatments.set(r.data));
  }

  toggleActive(t: Treatment) {
    this.api.patch(`/treatments/${t.id}`, { isActive: !t.isActive }).subscribe(() => this.loadTreatments());
  }

  openCategoryModal() { this.showCategoryModal.set(true); }

  addCategory() {
    if (!this.newCategoryName) return;
    this.api.post('/treatments/categories', { name: this.newCategoryName, color: this.newCategoryColor }).subscribe(() => {
      this.newCategoryName = '';
      this.loadCategories();
    });
  }

  openModal(t?: Treatment) {
    if (t) {
      this.editing.set(t);
      this.form = {
        name: t.name, description: t.description || '', price: t.price,
        durationMinutes: t.durationMinutes, categoryId: t.categoryId || '',
        clinicId: (t as any).clinicId || '',
        isPromoted: t.isPromoted, promotionPrice: t.promotionPrice || 0,
      };
    } else {
      this.editing.set(null);
      this.form = this.emptyForm();
      if (this.clinics().length === 1) this.form.clinicId = this.clinics()[0].id;
    }
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (!this.form.name || !this.form.price) return;
    this.saving.set(true);
    const req = this.editing()
      ? this.api.patch(`/treatments/${this.editing()!.id}`, this.form)
      : this.api.post('/treatments', this.form);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadTreatments(); },
      error: () => this.saving.set(false),
    });
  }

  private emptyForm() {
    return { name: '', description: '', price: 0, durationMinutes: 30, categoryId: '', clinicId: '', isPromoted: false, promotionPrice: 0 };
  }
}
