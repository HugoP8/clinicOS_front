import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';

interface AuditEntry {
  id: string;
  action: string;
  module: string;
  entityId?: string;
  entityType?: string;
  metadata?: { description?: string; [key: string]: any };
  ipAddress?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    role: string;
  };
}

const ACTION_CONFIG: Record<string, { label: string; class: string; icon: string }> = {
  CREATE: { label: 'Crear', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: '＋' },
  UPDATE: { label: 'Editar', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: '✎' },
  DELETE: { label: 'Eliminar', class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: '✕' },
  LOGIN:  { label: 'Ingreso', class: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', icon: '→' },
  LOGOUT: { label: 'Salida', class: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', icon: '←' },
  EXPORT: { label: 'Exportar', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: '↓' },
  IMPORT: { label: 'Importar', class: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300', icon: '↑' },
};

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-slide-up">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Bitácora de Actividad</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Registro completo de acciones realizadas en el sistema</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-slate-500 dark:text-slate-400">Total: <strong class="text-slate-700 dark:text-slate-200">{{ total() }}</strong> registros</span>
          <button class="btn btn-secondary btn-sm" (click)="load()" [disabled]="loading()">
            <svg class="w-4 h-4" [class.animate-spin]="loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        @for (stat of actionStats(); track stat.action) {
          <div class="card p-3 flex items-center gap-3">
            <span class="text-xl font-bold w-8 h-8 rounded-lg flex items-center justify-center text-sm" [class]="getActionCfg(stat.action).class">
              {{ getActionCfg(stat.action).icon }}
            </span>
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ getActionCfg(stat.action).label }}</p>
              <p class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ stat.count }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Filters -->
      <div class="card p-4">
        <div class="flex flex-wrap items-center gap-3">
          <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm3 4a1 1 0 011-1h10a1 1 0 010 2H7a1 1 0 01-1-1zm4 4a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1z"/>
          </svg>
          <select class="input input-sm w-44" [(ngModel)]="filterModule" (ngModelChange)="onFilterChange()">
            <option value="">Todos los módulos</option>
            @for (m of modules(); track m.module) {
              <option [value]="m.module">{{ m.module }} ({{ m.count }})</option>
            }
          </select>
          <select class="input input-sm w-36" [(ngModel)]="filterAction" (ngModelChange)="onFilterChange()">
            <option value="">Todas las acciones</option>
            <option value="CREATE">Crear</option>
            <option value="UPDATE">Editar</option>
            <option value="DELETE">Eliminar</option>
            <option value="LOGIN">Ingreso</option>
            <option value="LOGOUT">Salida</option>
            <option value="EXPORT">Exportar</option>
          </select>
          <input class="input input-sm w-36" type="date" [(ngModel)]="filterDateFrom" (ngModelChange)="onFilterChange()" placeholder="Desde">
          <input class="input input-sm w-36" type="date" [(ngModel)]="filterDateTo" (ngModelChange)="onFilterChange()" placeholder="Hasta">
          <input class="input input-sm flex-1 min-w-40" type="text" [(ngModel)]="filterSearch" (ngModelChange)="onFilterChange()" placeholder="Buscar descripción...">
          @if (hasFilters()) {
            <button class="btn btn-ghost btn-sm text-red-500" (click)="clearFilters()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Limpiar
            </button>
          }
        </div>
      </div>

      <!-- Table -->
      <div class="card overflow-hidden">
        @if (loading()) {
          <div class="divide-y divide-slate-100 dark:divide-slate-700/50">
            @for (i of [1,2,3,4,5,6,7,8]; track i) {
              <div class="px-4 py-3 flex items-center gap-3">
                <div class="skeleton w-8 h-8 rounded-full flex-shrink-0"></div>
                <div class="flex-1 space-y-1.5">
                  <div class="skeleton h-3.5 w-48 rounded"></div>
                  <div class="skeleton h-3 w-72 rounded"></div>
                </div>
                <div class="skeleton h-5 w-16 rounded-full"></div>
                <div class="skeleton h-3 w-24 rounded"></div>
              </div>
            }
          </div>
        } @else if (entries().length === 0) {
          <div class="empty-state py-16">
            <svg class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-slate-500 dark:text-slate-400 font-medium">Sin registros de actividad</p>
            <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">Los registros aparecerán conforme se realicen operaciones</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Usuario</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Acción</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Módulo</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Descripción</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fecha y hora</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
                @for (entry of entries(); track entry.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2.5">
                        @if (entry.user?.avatarUrl) {
                          <img [src]="entry.user!.avatarUrl" class="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" [alt]="entry.user!.firstName">
                        } @else {
                          <div class="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {{ entry.user ? (entry.user.firstName[0] + entry.user.lastName[0]) : '?' }}
                          </div>
                        }
                        <div>
                          <p class="font-medium text-slate-700 dark:text-slate-200 text-xs leading-tight">
                            {{ entry.user ? (entry.user.firstName + ' ' + entry.user.lastName) : 'Sistema' }}
                          </p>
                          <p class="text-slate-400 dark:text-slate-500 text-xs">{{ entry.user?.role | lowercase }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" [class]="getActionCfg(entry.action).class">
                        {{ getActionCfg(entry.action).label }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <span class="text-slate-600 dark:text-slate-300 font-medium text-xs">{{ entry.module }}</span>
                      @if (entry.entityType && entry.entityType !== entry.module) {
                        <span class="text-slate-400 dark:text-slate-500 text-xs"> · {{ entry.entityType }}</span>
                      }
                    </td>
                    <td class="px-4 py-3 max-w-xs">
                      <p class="text-slate-600 dark:text-slate-300 text-xs truncate" [title]="entry.metadata?.description || ''">
                        {{ entry.metadata?.description || '—' }}
                      </p>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <p class="text-slate-600 dark:text-slate-300 text-xs">{{ formatDate(entry.createdAt) }}</p>
                      <p class="text-slate-400 dark:text-slate-500 text-xs">{{ formatTime(entry.createdAt) }}</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Mostrando {{ (currentPage() - 1) * pageSize + 1 }}–{{ [currentPage() * pageSize, total()].sort((a,b)=>a-b)[0] }} de {{ total() }}
              </p>
              <div class="flex items-center gap-1">
                <button class="btn btn-ghost btn-sm px-2" [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                @for (p of pageNumbers(); track p) {
                  <button class="btn btn-sm px-3 min-w-[2rem]"
                    [class]="p === currentPage() ? 'btn-primary' : 'btn-ghost'"
                    (click)="goToPage(p)">{{ p }}</button>
                }
                <button class="btn btn-ghost btn-sm px-2" [disabled]="currentPage() === totalPages()" (click)="goToPage(currentPage() + 1)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class AuditComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  readonly branchCtx = inject(BranchContextService);

  loading = signal(false);
  entries = signal<AuditEntry[]>([]);
  total = signal(0);
  modules = signal<{ module: string; count: number }[]>([]);
  actionStats = signal<{ action: string; count: number }[]>([]);
  currentPage = signal(1);
  pageSize = 50;

  filterModule = '';
  filterAction = '';
  filterDateFrom = '';
  filterDateTo = '';
  filterSearch = '';

  totalPages = computed(() => Math.ceil(this.total() / this.pageSize));
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  hasFilters = computed(() =>
    !!(this.filterModule || this.filterAction || this.filterDateFrom || this.filterDateTo || this.filterSearch)
  );

  constructor() {
    effect(() => {
      this.branchCtx.activeBranchId();
      this.currentPage.set(1);
      this.loadModules();
      this.loadStats();
      this.load();
    });
  }

  ngOnInit() {}

  load() {
    this.loading.set(true);
    const params: any = { page: this.currentPage(), limit: this.pageSize };
    if (this.filterModule) params.module = this.filterModule;
    if (this.filterAction) params.action = this.filterAction;
    if (this.filterDateFrom) params.dateFrom = this.filterDateFrom;
    if (this.filterDateTo) params.dateTo = this.filterDateTo;
    if (this.filterSearch) params.search = this.filterSearch;
    const branchId = this.branchCtx.activeBranchId();
    if (branchId) params.branchId = branchId;

    this.api.get<any>('/audit', params).subscribe({
      next: (res) => {
        this.entries.set(res.data || []);
        this.total.set(res.total || 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadModules() {
    const branchId = this.branchCtx.activeBranchId();
    const params = branchId ? { branchId } : {};
    this.api.get<any[]>('/audit/modules', params).subscribe({
      next: (res) => this.modules.set(res || []),
    });
  }

  loadStats() {
    const branchId = this.branchCtx.activeBranchId();
    const params = branchId ? { branchId } : {};
    this.api.get<any>('/audit/stats', params).subscribe({
      next: (res) => this.actionStats.set(res?.byAction || []),
    });
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.load();
  }

  clearFilters() {
    this.filterModule = '';
    this.filterAction = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterSearch = '';
    this.onFilterChange();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.currentPage.set(p);
    this.load();
  }

  getActionCfg(action: string) {
    return ACTION_CONFIG[action] || { label: action, class: 'bg-slate-100 text-slate-600', icon: '•' };
  }

  formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  }
}
