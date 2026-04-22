import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Branch, Clinic } from '../models';

@Injectable({ providedIn: 'root' })
export class BranchContextService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private readonly CLINIC_KEY = 'clinicos_active_clinicId';
  private readonly BRANCH_KEY = 'clinicos_active_branchId';
  private readonly ALL_BRANCHES_VALUE = '__ALL__';

  clinics = signal<Clinic[]>([]);
  branches = signal<Branch[]>([]);
  activeClinic = signal<Clinic | null>(null);
  /**
   * null = "Todas las sucursales" (sin filtro por sucursal)
   * Branch = sucursal específica seleccionada
   */
  activeBranch = signal<Branch | null>(null);

  activeClinicId = computed(() => this.activeClinic()?.id || '');
  /** '' cuando "Todas las sucursales" está seleccionado */
  activeBranchId = computed(() => this.activeBranch()?.id || '');
  activeBranchName = computed(() => this.activeBranch()?.name || 'Todas las sedes');
  isAllBranches = computed(() => !this.activeBranch());
  hasMultipleBranches = computed(() => this.branches().length > 1);
  hasMultipleClinics = computed(() => this.clinics().length > 1);

  /** Carga clínicas y sucursales. Llamar una vez al iniciar el layout. */
  load() {
    const role = this.auth.currentUser()?.role;
    if (role === 'SUPER_ADMIN') return;

    this.api.get<Clinic[]>('/clinics').subscribe({
      next: (clinics: any) => {
        const list: Clinic[] = Array.isArray(clinics) ? clinics : clinics?.data || [];
        this.clinics.set(list);

        const savedClinicId = localStorage.getItem(this.CLINIC_KEY);
        const clinic = list.find(c => c.id === savedClinicId) || list[0] || null;
        this.activeClinic.set(clinic);

        if (clinic) this.loadBranches(clinic.id);
      },
      error: () => {},
    });
  }

  loadBranches(clinicId: string) {
    this.api.get<Branch[]>('/branches', { clinicId }).subscribe({
      next: (data: any) => {
        const list: Branch[] = Array.isArray(data) ? data : data?.data || [];
        this.branches.set(list);

        const savedBranchId = localStorage.getItem(this.BRANCH_KEY);
        if (savedBranchId === this.ALL_BRANCHES_VALUE) {
          // Usuario tenía "Todas las sucursales" guardado
          this.activeBranch.set(null);
        } else if (savedBranchId) {
          const branch = list.find(b => b.id === savedBranchId) || null;
          this.activeBranch.set(branch);
        } else {
          // Primera vez: por defecto "Todas las sucursales"
          this.activeBranch.set(null);
        }
      },
      error: () => {},
    });
  }

  selectClinic(clinic: Clinic) {
    this.activeClinic.set(clinic);
    localStorage.setItem(this.CLINIC_KEY, clinic.id);
    this.activeBranch.set(null);
    localStorage.setItem(this.BRANCH_KEY, this.ALL_BRANCHES_VALUE);
    this.loadBranches(clinic.id);
  }

  selectBranch(branch: Branch) {
    this.activeBranch.set(branch);
    localStorage.setItem(this.BRANCH_KEY, branch.id);
  }

  selectAllBranches() {
    this.activeBranch.set(null);
    localStorage.setItem(this.BRANCH_KEY, this.ALL_BRANCHES_VALUE);
  }

  /** Re-carga clínicas y sucursales (útil tras editar datos de clínica). */
  refresh() {
    this.load();
  }

  clear() {
    this.clinics.set([]);
    this.branches.set([]);
    this.activeClinic.set(null);
    this.activeBranch.set(null);
    localStorage.removeItem(this.CLINIC_KEY);
    localStorage.removeItem(this.BRANCH_KEY);
  }
}
