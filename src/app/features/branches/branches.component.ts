import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Branch, Clinic } from '../../core/models';

@Component({
  selector: 'app-branches',
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
          <h1 class="page-title">Sucursales</h1>
          <p class="page-subtitle">Gestiona las sedes de tu clínica</p>
        </div>
        <button (click)="openModal()" class="btn-primary">+ Nueva Sucursal</button>
      </div>

      <!-- Filters -->
      <div class="card p-4 flex flex-wrap gap-3 items-center">
        <input [(ngModel)]="search" (input)="loadBranches()" class="input w-48" placeholder="Buscar sucursal...">
        <select [(ngModel)]="selectedClinic" (change)="loadBranches()" class="input w-48">
          <option value="">Todas las clínicas</option>
          @for (c of clinics(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Clínica</th>
                <th>Ciudad</th>
                <th>Teléfono</th>
                <th>Principal</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (b of branches(); track b.id) {
                <tr>
                  <td class="font-medium">{{ b.name }}</td>
                  <td class="text-slate-500">{{ getClinicName(b.clinicId) }}</td>
                  <td class="text-slate-500">{{ b.city || '—' }}</td>
                  <td class="text-slate-500">{{ b.phone || '—' }}</td>
                  <td>
                    @if (b.isMain) {
                      <span class="badge-blue text-xs">Principal</span>
                    }
                  </td>
                  <td>
                    <span [class]="b.isActive ? 'badge-green' : 'badge-red'">
                      {{ b.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>
                    <div class="flex items-center gap-0.5">
                      <button (click)="openModal(b)" title="Editar sucursal"
                        class="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 dark:text-primary-400 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7">
                  <div class="empty-state py-10">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <p class="empty-state-title">Sin sucursales registradas</p>
                    <p class="empty-state-desc">Crea la primera sucursal de tu clínica</p>
                  </div>
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-center">
          <div class="modal animate-slide-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ editing() ? 'Editar Sucursal' : 'Nueva Sucursal' }}</h2>
              <button (click)="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body space-y-4">
              <div>
                <label class="label">Clínica *</label>
                <select [(ngModel)]="form.clinicId" class="input">
                  <option value="">Seleccionar clínica</option>
                  @for (c of clinics(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="label">Nombre *</label>
                <input [(ngModel)]="form.name" class="input" placeholder="Ej: Sede Centro">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">Ciudad</label>
                  <input [(ngModel)]="form.city" class="input" placeholder="Santa Cruz">
                </div>
                <div>
                  <label class="label">Teléfono</label>
                  <input [(ngModel)]="form.phone" class="input" placeholder="+591 3 333 4444">
                </div>
              </div>
              <div>
                <label class="label">Dirección</label>
                <input [(ngModel)]="form.address" class="input" placeholder="Av. Principal 123">
              </div>
              <div class="flex items-center gap-2 py-1">
                <input type="checkbox" [(ngModel)]="form.isMain" id="isMain" class="w-4 h-4 rounded accent-primary-600">
                <label for="isMain" class="text-sm text-slate-600 dark:text-slate-400">Marcar como sucursal principal</label>
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="closeModal()" class="btn-secondary">Cancelar</button>
              <button (click)="save()" class="btn-primary" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : editing() ? 'Actualizar' : 'Crear Sucursal' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class BranchesComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  tenants = signal<any[]>([]);
  clinicsForFilter = signal<any[]>([]);
  filterTenantId = signal<string>('');
  filterClinicId = signal<string>('');
  branchesForFilter = signal<any[]>([]);
  filterBranchId = signal<string>('');

  branches = signal<Branch[]>([]);
  clinics = signal<Clinic[]>([]);
  showModal = signal(false);
  editing = signal<Branch | null>(null);
  saving = signal(false);

  search = '';
  selectedClinic = '';

  form = this.emptyForm();

  ngOnInit() {
    if (this.isSuperAdmin()) this.loadTenants();
    this.loadClinics();
    this.loadBranches();
  }

  loadTenants() {
    this.api.get<any>('/tenants').subscribe({
      next: (res: any) => this.tenants.set(res?.data || res || []),
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
    this.loadBranches();
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
    this.loadBranches();
  }

  onBranchFilterChange(branchId: string) {
    this.filterBranchId.set(branchId);
    this.loadBranches();
  }

  clearFilters() {
    this.filterTenantId.set('');
    this.filterClinicId.set('');
    this.filterBranchId.set('');
    this.clinicsForFilter.set([]);
    this.branchesForFilter.set([]);
    this.loadBranches();
  }

  loadClinics() {
    this.api.get<Clinic[]>('/clinics').subscribe(c => this.clinics.set(c));
  }

  loadBranches() {
    const params: any = {};
    if (this.search) params.search = this.search;
    if (this.selectedClinic) params.clinicId = this.selectedClinic;
    if (this.filterTenantId()) params.tenantId = this.filterTenantId();
    if (this.filterClinicId()) params.clinicId = this.filterClinicId();
    this.api.get<Branch[]>('/branches', params).subscribe({
      next: (data: any) => this.branches.set(Array.isArray(data) ? data : data?.data || []),
      error: () => {},
    });
  }

  getClinicName(clinicId: string) {
    return this.clinics().find(c => c.id === clinicId)?.name || '—';
  }

  openModal(branch?: Branch) {
    if (branch) {
      this.editing.set(branch);
      this.form = { name: branch.name, clinicId: branch.clinicId, city: branch.city || '', phone: branch.phone || '', address: branch.address || '', isMain: branch.isMain };
    } else {
      this.editing.set(null);
      this.form = this.emptyForm();
    }
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (!this.form.clinicId || !this.form.name) return;
    this.saving.set(true);
    const { clinicId, ...branchData } = this.form;
    const req = this.editing()
      ? this.api.patch(`/branches/${this.editing()!.id}`, branchData)
      : this.api.post(`/branches/clinic/${clinicId}`, branchData);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadBranches(); },
      error: () => this.saving.set(false),
    });
  }

  private emptyForm() {
    return { clinicId: '', name: '', city: '', phone: '', address: '', isMain: false };
  }
}
