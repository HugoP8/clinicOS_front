import {
  Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { Clinic } from '../../core/models';

@Component({
  selector: 'app-clinics',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toastMsg()) {
      <div class="fixed top-20 right-5 z-[9999] animate-scale-in toast" [class.toast-success]="toastMsg()!.type === 'success'" [class.toast-error]="toastMsg()!.type === 'error'">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          @if (toastMsg()!.type === 'success') {
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          } @else {
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          }
        </svg>
        <span>{{ toastMsg()!.text }}</span>
      </div>
    }
    <div class="space-y-5 animate-slide-up">
      <!-- SUPER_ADMIN filter bar (tenant only for clinics) -->
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
        <div><h1 class="page-title">Clínicas</h1><p class="page-subtitle">Gestiona tus centros de atención</p></div>
        @if (canCreate()) {
          <button class="btn-primary" (click)="openNew()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Nueva Clínica
          </button>
        }
      </div>

      <!-- Cards grid -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (_ of [1,2]; track $index) {
            <div class="card p-6 animate-pulse">
              <div class="flex gap-3 mb-4">
                <div class="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                <div class="flex-1 space-y-2 pt-1">
                  <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (clinic of clinics(); track clinic.id) {
            <div class="card overflow-hidden hover:shadow-card-hover transition-shadow">
              <!-- Color bar -->
              <div class="h-1.5 w-full" [style.background]="'linear-gradient(to right, ' + clinic.primaryColor + ', ' + (clinic.secondaryColor || '#10B981') + ')'"></div>

              <div class="p-5">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <!-- Logo o inicial con color primario -->
                    @if (logoUrl(clinic)) {
                      <img [src]="logoUrl(clinic)!" [alt]="clinic.name"
                        class="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700">
                    } @else {
                      <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                        [style.background-color]="clinic.primaryColor">
                        {{ clinic.name[0].toUpperCase() }}
                      </div>
                    }
                    <div>
                      <h3 class="font-semibold text-slate-900 dark:text-white leading-tight">{{ clinic.name }}</h3>
                      @if (clinic.legalName) {
                        <p class="text-xs text-slate-400 mt-0.5">{{ clinic.legalName }}</p>
                      }
                      @if (clinic.taxId) {
                        <p class="text-xs text-slate-400">RUC: {{ clinic.taxId }}</p>
                      }
                    </div>
                  </div>
                  <span class="badge-green">Activa</span>
                </div>

                <!-- Info -->
                <div class="space-y-1.5 text-sm text-slate-600 dark:text-slate-400 mb-4">
                  @if (clinic.address) {
                    <div class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                      <span class="truncate">{{ clinic.address }}, {{ clinic.city }}</span>
                    </div>
                  }
                  @if (clinic.phone) {
                    <div class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                      <span>{{ clinic.phone }}</span>
                    </div>
                  }
                  @if (clinic.email) {
                    <div class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      <span class="truncate">{{ clinic.email }}</span>
                    </div>
                  }
                </div>

                <!-- Colores -->
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xs text-slate-400">Colores:</span>
                  <div class="w-5 h-5 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" [style.background]="clinic.primaryColor" title="Color primario"></div>
                  <div class="w-5 h-5 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" [style.background]="clinic.secondaryColor || '#10B981'" title="Color secundario"></div>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div class="flex gap-3 text-xs text-slate-500">
                    <span>{{ clinic['_count']?.branches || 0 }} sedes</span>
                    <span>{{ clinic['_count']?.doctors || 0 }} médicos</span>
                  </div>
                  @if (canManage()) {
                    <button (click)="edit(clinic)" class="btn-ghost btn-sm">Editar</button>
                  }
                </div>
              </div>
            </div>
          } @empty {
            <div class="col-span-3 card p-12 text-center">
              <svg class="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0a2 2 0 002-2v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1a2 2 0 002 2z"/>
              </svg>
              <p class="text-slate-500">No hay clínicas registradas</p>
              @if (canCreate()) {
                <button class="btn-primary mt-4" (click)="openNew()">Crear primera clínica</button>
              }
            </div>
          }
        </div>
      }

    </div>

    <!-- Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-center">
          <div class="modal modal-xl animate-scale-in" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ editingId() ? 'Editar' : 'Nueva' }} Clínica</h2>
              <button type="button" (click)="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="save()" class="modal-body space-y-5">

              <!-- Tenant selector (solo SUPER_ADMIN al crear) -->
              @if (isSuperAdmin() && !editingId()) {
                <div>
                  <label class="label">Tenant (Empresa) *</label>
                  <select class="input" [value]="modalTenantId()" (change)="modalTenantId.set($any($event.target).value)">
                    <option value="">— Seleccionar tenant —</option>
                    @for (t of tenants(); track t.id) {
                      <option [value]="t.id">{{ t.name }}</option>
                    }
                  </select>
                  @if (!modalTenantId()) {
                    <p class="text-xs text-amber-500 mt-1">Selecciona el tenant al que pertenecerá esta clínica adicional.</p>
                  }
                </div>
              }

              <!-- Logo upload -->
              <div>
                <label class="label">Logo de la Clínica</label>
                <div class="flex items-center gap-4">
                  <!-- Preview -->
                  <div class="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0 bg-slate-50 dark:bg-slate-800">
                    @if (logoPreview()) {
                      <img [src]="logoPreview()!" class="w-full h-full object-cover" alt="Logo preview">
                    } @else {
                      <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    }
                  </div>
                  <div class="flex-1">
                    <label class="cursor-pointer">
                      <span class="btn-secondary inline-flex items-center gap-2 text-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        Seleccionar imagen
                      </span>
                      <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        (change)="onLogoChange($event)">
                    </label>
                    <p class="text-xs text-slate-400 mt-1.5">PNG, JPG, WebP o SVG. Máx 5MB. Se redimensionará a 400×400px.</p>
                    @if (logoFile()) {
                      <p class="text-xs text-emerald-600 mt-1">✓ {{ logoFile()!.name }}</p>
                    }
                  </div>
                </div>
              </div>

              <!-- Nombre y Legal -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="label">Nombre *</label>
                  <input formControlName="name" class="input" placeholder="Clínica Dental Lima">
                </div>
                <div>
                  <label class="label">Nombre Legal</label>
                  <input formControlName="legalName" class="input" placeholder="Clínica Dental Lima S.A.C.">
                </div>
              </div>

              <!-- RUC y Teléfono -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="label">RUC / NIT</label>
                  <input formControlName="taxId" class="input" placeholder="20123456789">
                </div>
                <div>
                  <label class="label">Teléfono</label>
                  <input formControlName="phone" class="input" placeholder="+591 2 234 5678">
                </div>
              </div>

              <!-- Email y Web -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="label">Email</label>
                  <input formControlName="email" type="email" class="input" placeholder="info@clinica.com">
                </div>
                <div>
                  <label class="label">Sitio Web</label>
                  <input formControlName="website" class="input" placeholder="https://clinica.com">
                </div>
              </div>

              <!-- Dirección -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="label">Dirección</label>
                  <input formControlName="address" class="input" placeholder="Av. Principal 123">
                </div>
                <div>
                  <label class="label">Ciudad</label>
                  <input formControlName="city" class="input" placeholder="La Paz">
                </div>
              </div>

              <!-- Prefijo cotizaciones -->
              <div>
                <label class="label">Prefijo de Cotizaciones</label>
                <div class="flex items-center gap-3">
                  <input formControlName="quotePrefix" class="input w-32 font-mono uppercase" placeholder="QT" maxlength="6"
                    style="text-transform:uppercase">
                  <div class="flex-1">
                    <p class="text-xs text-slate-500 dark:text-slate-400">Define las iniciales de tus cotizaciones.</p>
                    <p class="text-xs font-mono text-slate-400 mt-0.5">
                      Ejemplo: <span class="text-primary-600 font-semibold">{{ quotePrefixPreview() }}-2026-0001</span>
                    </p>
                  </div>
                </div>
              </div>

              <!-- Colores -->
              <div>
                <label class="label">Identidad Visual</label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <p class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Color Primario</p>
                    <div class="flex items-center gap-3">
                      <input formControlName="primaryColor" type="color"
                        class="w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer p-0.5"
                        (input)="primaryColorVal.set($any($event.target).value)">
                      <div>
                        <p class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ primaryColorVal() }}</p>
                        <p class="text-xs text-slate-400">Botones, acentos</p>
                      </div>
                    </div>
                    <!-- Presets -->
                    <div class="flex gap-1.5 mt-2">
                      @for (c of colorPresets; track c) {
                        <button type="button" class="w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform"
                          [style.background]="c"
                          [class.border-slate-400]="primaryColorVal() === c"
                          [class.border-transparent]="primaryColorVal() !== c"
                          (click)="setPrimaryColor(c)">
                        </button>
                      }
                    </div>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Color Secundario</p>
                    <div class="flex items-center gap-3">
                      <input formControlName="secondaryColor" type="color"
                        class="w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer p-0.5"
                        (input)="secondaryColorVal.set($any($event.target).value)">
                      <div>
                        <p class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ secondaryColorVal() }}</p>
                        <p class="text-xs text-slate-400">Badges, éxito</p>
                      </div>
                    </div>
                    <div class="flex gap-1.5 mt-2">
                      @for (c of secondaryPresets; track c) {
                        <button type="button" class="w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform"
                          [style.background]="c"
                          [class.border-slate-400]="secondaryColorVal() === c"
                          [class.border-transparent]="secondaryColorVal() !== c"
                          (click)="setSecondaryColor(c)">
                        </button>
                      }
                    </div>
                  </div>
                </div>
                <!-- Preview bar -->
                <div class="mt-2 h-2 rounded-full" [style.background]="colorPreviewGradient()"></div>
              </div>

            </form>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="button" class="btn-primary" [disabled]="saving()" (click)="save()">
                {{ saving() ? 'Guardando...' : editingId() ? 'Actualizar Clínica' : 'Crear Clínica' }}
              </button>
            </div>
          </div>
          </div>
        </div>
      }
  `,
})
export class ClinicsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private auth = inject(AuthService);
  private branchCtx = inject(BranchContextService);

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  // SUPER_ADMIN can create new clinics; ADMIN was born with one (creation blocked by backend)
  canCreate = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  // Both ADMIN and SUPER_ADMIN can edit (colors, logo, info)
  canManage = computed(() => ['ADMIN', 'SUPER_ADMIN', 'DOCTOR_ADMIN'].includes(this.auth.currentUser()?.role || ''));
  tenants = signal<any[]>([]);
  filterTenantId = signal<string>('');
  modalTenantId = signal<string>('');

  clinics = signal<Clinic[]>([]);
  loading = signal(true);
  saving = signal(false);
  showModal = signal(false);
  toastMsg = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  editingId = signal<string | null>(null);
  logoFile = signal<File | null>(null);
  logoPreview = signal<string | null>(null);

  // Signals para los colores — evitan el problema OnPush con form.get()?.value en template
  primaryColorVal = signal('#3B82F6');
  secondaryColorVal = signal('#10B981');

  colorPreviewGradient = computed(() =>
    `linear-gradient(to right, ${this.primaryColorVal()}, ${this.secondaryColorVal()})`
  );
  quotePrefixPreview = computed(() =>
    (this.form.get('quotePrefix')?.value || 'QT').toUpperCase()
  );

  setPrimaryColor(c: string) {
    this.form.get('primaryColor')?.setValue(c);
    this.primaryColorVal.set(c);
  }

  setSecondaryColor(c: string) {
    this.form.get('secondaryColor')?.setValue(c);
    this.secondaryColorVal.set(c);
  }

  colorPresets = [
    '#3B82F6', '#1D4ED8', '#0EA5E9', '#06B6D4',
    '#8B5CF6', '#A855F7', '#EC4899', '#EF4444',
    '#F59E0B', '#F97316', '#10B981', '#14B8A6',
    '#64748B', '#1E293B', '#7C3AED', '#DB2777',
  ];
  secondaryPresets = [
    '#10B981', '#14B8A6', '#06B6D4', '#84CC16',
    '#F59E0B', '#F97316', '#A855F7', '#EC4899',
    '#3B82F6', '#8B5CF6', '#EF4444', '#64748B',
    '#0F766E', '#1D4ED8', '#B45309', '#7C3AED',
  ];

  form = this.fb.group({
    name: ['', Validators.required],
    legalName: [''],
    taxId: [''],
    phone: [''],
    email: ['', Validators.email],
    address: [''],
    city: [''],
    website: [''],
    quotePrefix: [''],
    primaryColor: ['#3B82F6'],
    secondaryColor: ['#10B981'],
  });

  ngOnInit() {
    if (this.isSuperAdmin()) this.loadTenants();
    this.loadClinics();
  }

  loadTenants() {
    this.api.get<any>('/tenants').subscribe({
      next: (res: any) => this.tenants.set(res?.data || res || []),
      error: () => {},
    });
  }

  onTenantFilterChange(tenantId: string) {
    this.filterTenantId.set(tenantId);
    this.loadClinics();
  }

  clearFilters() {
    this.filterTenantId.set('');
    this.loadClinics();
  }

  loadClinics() {
    this.loading.set(true);
    const params: any = {};
    if (this.filterTenantId()) params.tenantId = this.filterTenantId();
    this.api.get<Clinic[]>('/clinics', params).subscribe({
      next: data => { this.clinics.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  logoUrl(clinic: Clinic): string | null {
    return this.api.getStaticUrl(clinic.logoUrl);
  }

  onLogoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.logoFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      this.logoPreview.set(e.target?.result as string);
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  openNew() {
    this.editingId.set(null);
    this.logoFile.set(null);
    this.logoPreview.set(null);
    this.modalTenantId.set(this.filterTenantId());
    this.form.reset({ primaryColor: '#3B82F6', secondaryColor: '#10B981', quotePrefix: '' });
    this.primaryColorVal.set('#3B82F6');
    this.secondaryColorVal.set('#10B981');
    this.showModal.set(true);
  }

  edit(clinic: Clinic) {
    this.editingId.set(clinic.id);
    this.logoFile.set(null);
    this.logoPreview.set(this.api.getStaticUrl(clinic.logoUrl));
    const pc = clinic.primaryColor || '#3B82F6';
    const sc = clinic.secondaryColor || '#10B981';
    this.form.patchValue({
      name: clinic.name,
      legalName: clinic.legalName || '',
      taxId: clinic.taxId || '',
      phone: clinic.phone || '',
      email: clinic.email || '',
      address: clinic.address || '',
      city: clinic.city || '',
      website: clinic.website || '',
      quotePrefix: (clinic as any).quotePrefix || '',
      primaryColor: pc,
      secondaryColor: sc,
    });
    this.primaryColorVal.set(pc);
    this.secondaryColorVal.set(sc);
    this.showModal.set(true);
  }

  save() {
    if (this.form.invalid) return;
    if (!this.editingId() && this.isSuperAdmin() && !this.modalTenantId()) {
      this.toastMsg.set({ type: 'error', text: 'Debes seleccionar un tenant antes de crear la clínica.' });
      setTimeout(() => this.toastMsg.set(null), 4000);
      return;
    }
    this.saving.set(true);

    const doSave = (logoUrl?: string) => {
      const raw = this.form.value as Record<string, any>;
      const body = {
        ...Object.fromEntries(Object.entries(raw).filter(([_, v]) => v !== '' && v !== null && v !== undefined)),
        ...(logoUrl ? { logoUrl } : {}),
      };
      const req = this.editingId()
        ? this.api.patch(`/clinics/${this.editingId()}`, body)
        : this.api.post(`/clinics?tenantId=${this.modalTenantId()}`, body);
      req.subscribe({
        next: (created: any) => {
          // Upload logo if there's a new file and we now have a clinic ID
          const clinicId = this.editingId() || created?.id;
          if (this.logoFile() && clinicId) {
            this.uploadLogo(clinicId).subscribe({
              next: () => { this.saving.set(false); this.closeModal(); this.loadClinics(); this.branchCtx.refresh(); },
              error: () => { this.saving.set(false); this.closeModal(); this.loadClinics(); this.branchCtx.refresh(); },
            });
          } else {
            this.saving.set(false);
            this.closeModal();
            this.loadClinics();
            this.branchCtx.refresh();
          }
        },
        error: (err: any) => {
          this.saving.set(false);
          const msg = err?.error?.message || 'Error al guardar la clínica';
          this.toastMsg.set({ type: 'error', text: msg });
          setTimeout(() => this.toastMsg.set(null), 5000);
          this.cdr.markForCheck();
        },
      });
    };

    doSave();
  }

  private uploadLogo(clinicId: string) {
    const fd = new FormData();
    fd.append('logo', this.logoFile()!);
    return this.api.upload<{ logoUrl: string }>(`/uploads/clinics/${clinicId}/logo`, fd);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingId.set(null);
    this.logoFile.set(null);
    this.logoPreview.set(null);
    this.modalTenantId.set('');
    this.form.reset({ primaryColor: '#3B82F6', secondaryColor: '#10B981', quotePrefix: '' });
    this.primaryColorVal.set('#3B82F6');
    this.secondaryColorVal.set('#10B981');
  }
}
