import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

interface RechargePackage {
  id: string;
  name: string;
  type: string;
  quantity: number;
  price: number;
  bonusQuantity: number;
  isActive: boolean;
}

interface RechargeHistory {
  id: string;
  type: string;
  quantity: number;
  price: number;
  status: string;
  createdAt: string;
  tenant?: { name: string };
  package?: { name: string };
}

@Component({
  selector: 'app-sa-recharges',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-slide-up">
      <div class="page-header">
        <div>
          <h1 class="page-title">Recargas</h1>
          <p class="page-subtitle">Paquetes de créditos adicionales para tenants</p>
        </div>
        <button (click)="openModal()" class="btn-primary">+ Nuevo Paquete</button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="card p-4">
          <p class="text-xs text-slate-500 mb-1">Total Recargas</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ totalHistory() }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-slate-500 mb-1">Ingresos por Recargas</p>
          <p class="text-2xl font-bold text-emerald-600">Bs. {{ totalRevenue() | number:'1.0-0' }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-slate-500 mb-1">Paquetes Activos</p>
          <p class="text-2xl font-bold text-primary-600">{{ packages().filter(p => p.isActive).length }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-slate-500 mb-1">Este Mes</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ currentMonthCount() }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Packages -->
        <div class="card">
          <div class="p-5 border-b border-slate-200 dark:border-slate-700">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Paquetes Disponibles</h3>
          </div>
          <div class="divide-y divide-slate-100 dark:divide-slate-700">
            @for (pkg of packages(); track pkg.id) {
              <div class="p-4 flex items-center justify-between">
                <div>
                  <p class="font-medium text-sm">{{ pkg.name }}</p>
                  <div class="flex gap-2 mt-0.5">
                    <span class="text-xs text-slate-400">{{ typeLabel(pkg.type) }}</span>
                    <span class="text-xs text-slate-400">{{ pkg.quantity }} unidades</span>
                    @if (pkg.bonusQuantity) {
                      <span class="text-xs text-emerald-500">+{{ pkg.bonusQuantity }} bonus</span>
                    }
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-bold text-slate-900 dark:text-white">Bs. {{ pkg.price }}</span>
                  <span [class]="pkg.isActive ? 'badge-green' : 'badge-red'">{{ pkg.isActive ? 'Activo' : 'Inactivo' }}</span>
                  <button (click)="openModal(pkg)" class="text-xs text-primary-600 hover:underline">Editar</button>
                </div>
              </div>
            } @empty {
              <div class="p-8 text-center text-slate-400">No hay paquetes configurados</div>
            }
          </div>
        </div>

        <!-- History -->
        <div class="card">
          <div class="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Historial de Compras</h3>
            <select [(ngModel)]="historyFilter" (change)="loadHistory()" class="input w-32 text-xs py-1.5">
              <option value="">Todos</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="STORAGE">Storage</option>
              <option value="USERS">Usuarios</option>
            </select>
          </div>
          <div class="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
            @for (h of history(); track h.id) {
              <div class="p-3 flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium">{{ h.tenant?.name || 'Desconocido' }}</p>
                  <p class="text-xs text-slate-400">{{ h.package?.name || typeLabel(h.type) }} — {{ h.quantity }} uds</p>
                  <p class="text-xs text-slate-400">{{ h.createdAt | date:'dd/MM/yy HH:mm' }}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold text-sm">Bs. {{ h.price }}</p>
                  <span [class]="historyStatusClass(h.status)">{{ h.status }}</span>
                </div>
              </div>
            } @empty {
              <div class="p-8 text-center text-slate-400">Sin historial</div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Paquete -->
    @if (showModal()) {
      <div class="fixed inset-0 z-[70] overflow-y-auto bg-black/40 backdrop-blur-sm" (click)="closeModal()">
        <div class="flex min-h-full items-center justify-center p-4">
        <div class="card w-full max-w-md p-6 animate-fade-in" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-5">
            {{ editing() ? 'Editar Paquete' : 'Nuevo Paquete' }}
          </h2>
          <div class="space-y-4">
            <div>
              <label class="label">Nombre *</label>
              <input [(ngModel)]="form.name" class="input" placeholder="Pack 1000 WhatsApp">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Tipo *</label>
                <select [(ngModel)]="form.type" class="input">
                  <option value="WHATSAPP">WhatsApp Mensajes</option>
                  <option value="STORAGE">Almacenamiento (GB)</option>
                  <option value="USERS">Usuarios Extra</option>
                </select>
              </div>
              <div>
                <label class="label">Cantidad *</label>
                <input [(ngModel)]="form.quantity" type="number" class="input" placeholder="1000">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Precio (Bs.) *</label>
                <input [(ngModel)]="form.price" type="number" step="0.01" class="input" placeholder="29.90">
              </div>
              <div>
                <label class="label">Bonus (opcional)</label>
                <input [(ngModel)]="form.bonusQuantity" type="number" class="input" placeholder="0">
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" [(ngModel)]="form.isActive" id="pkgActive" class="rounded">
              <label for="pkgActive" class="text-sm text-slate-600 dark:text-slate-400">Paquete activo</label>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button (click)="closeModal()" class="btn-secondary">Cancelar</button>
            <button (click)="save()" class="btn-primary" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
        </div>
      </div>
    }
  `,
})
export class RechargesComponent implements OnInit {
  private api = inject(ApiService);

  packages = signal<RechargePackage[]>([]);
  history = signal<RechargeHistory[]>([]);
  showModal = signal(false);
  editing = signal<RechargePackage | null>(null);
  saving = signal(false);

  historyFilter = '';

  form = this.emptyForm();

  ngOnInit() {
    this.loadPackages();
    this.loadHistory();
  }

  loadPackages() {
    this.api.get<RechargePackage[]>('/recharges/packages').subscribe(p => this.packages.set(p));
  }

  loadHistory() {
    const params: any = { limit: 50 };
    if (this.historyFilter) params.type = this.historyFilter;
    this.api.getPaginated<RechargeHistory>('/recharges/history', params).subscribe(r => this.history.set(r.data));
  }

  totalHistory() { return this.history().length; }
  totalRevenue() { return this.history().reduce((sum, h) => sum + h.price, 0); }
  currentMonthCount() {
    const now = new Date();
    return this.history().filter(h => {
      const d = new Date(h.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }

  typeLabel(type: string) {
    const map: Record<string, string> = { WHATSAPP: 'WhatsApp', STORAGE: 'Storage', USERS: 'Usuarios' };
    return map[type] || type;
  }

  historyStatusClass(s: string) {
    return s === 'COMPLETED' ? 'badge-green text-xs' : s === 'FAILED' ? 'badge-red text-xs' : 'badge-yellow text-xs';
  }

  openModal(pkg?: RechargePackage) {
    if (pkg) {
      this.editing.set(pkg);
      this.form = { ...pkg };
    } else {
      this.editing.set(null);
      this.form = this.emptyForm();
    }
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (!this.form.name || !this.form.quantity || !this.form.price) return;
    this.saving.set(true);
    const req = this.editing()
      ? this.api.patch(`/recharges/packages/${this.editing()!.id}`, this.form)
      : this.api.post('/recharges/packages', this.form);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadPackages(); },
      error: () => this.saving.set(false),
    });
  }

  private emptyForm() {
    return { name: '', type: 'WHATSAPP', quantity: 0, price: 0, bonusQuantity: 0, isActive: true };
  }
}
