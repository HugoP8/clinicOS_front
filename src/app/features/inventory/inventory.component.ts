import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { InventoryProduct, Clinic, Branch } from '../../core/models';

@Component({
  selector: 'app-inventory',
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
          <h1 class="page-title">Inventario</h1>
          <p class="page-subtitle">Control de productos y stock</p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button (click)="openCategoriesModal()" class="btn-ghost text-sm">Categorías</button>
          <button (click)="openMovementsModal()" class="btn-ghost text-sm flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
            Historial
          </button>
          @if (isAdmin()) {
            @if (isPremiumOrHigher() && branches().length >= 2) {
              <button (click)="openTransferModal()" class="btn-ghost text-sm flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                </svg>
                Transferir
              </button>
            }
            <button (click)="openStockModal()" class="btn-secondary">+ Ingreso Stock</button>
            <button (click)="openModal()" class="btn-primary">+ Nuevo Producto</button>
          }
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        @for (stat of statsCards(); track stat.label) {
          <div class="card p-4">
            <p class="text-xs text-slate-500 mb-1">{{ stat.label }}</p>
            <p class="text-2xl font-bold" [class]="stat.color">{{ stat.value }}</p>
          </div>
        }
      </div>

      <!-- Banner: Próximos a vencer -->
      @if (expiryAlerts().length > 0) {
        <div class="rounded-2xl border overflow-hidden"
          [ngClass]="expiryAlerts().some(a => daysUntil(a.expiryDate) <= 7)
            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
            : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'">
          <button class="w-full flex items-center justify-between p-4 text-left"
            (click)="showExpiryPanel.set(!showExpiryPanel())">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                [ngClass]="expiryAlerts().some(a => daysUntil(a.expiryDate) <= 7) ? 'bg-red-100 dark:bg-red-900/40' : 'bg-amber-100 dark:bg-amber-900/40'">
                <svg class="w-5 h-5" [ngClass]="expiryAlerts().some(a => daysUntil(a.expiryDate) <= 7) ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold"
                  [ngClass]="expiryAlerts().some(a => daysUntil(a.expiryDate) <= 7) ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'">
                  {{ expiryAlerts().length }} producto{{ expiryAlerts().length > 1 ? 's' : '' }} próximo{{ expiryAlerts().length > 1 ? 's' : '' }} a vencer
                </p>
                <p class="text-xs mt-0.5"
                  [ngClass]="expiryAlerts().some(a => daysUntil(a.expiryDate) <= 7) ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'">
                  @if (expiryAlerts().some(a => daysUntil(a.expiryDate) <= 7)) {
                    ¡Atención! Algunos vencen en menos de 7 días
                  } @else {
                    Vencen en los próximos 30 días — revisa y da de baja si es necesario
                  }
                </p>
              </div>
            </div>
            <svg class="w-5 h-5 text-slate-400 transition-transform"
              [ngClass]="showExpiryPanel() ? 'rotate-180' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          @if (showExpiryPanel()) {
            <div class="border-t border-current/10 p-4 space-y-2">
              @for (alert of expiryAlerts(); track alert.id) {
                @let days = daysUntil(alert.expiryDate);
                <div class="flex items-center gap-3 p-2.5 rounded-xl border text-sm"
                  [ngClass]="expiryUrgencyClass(days)">
                  <span class="w-2 h-2 rounded-full shrink-0" [ngClass]="expiryDotClass(days)"></span>
                  <div class="flex-1 min-w-0">
                    <span class="font-medium">{{ alert.product?.name }}</span>
                    <span class="text-xs ml-1.5 opacity-75">· {{ alert.branch?.name }}</span>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="font-semibold text-xs">{{ alert.expiryDate | date:'d MMM yyyy':'':'es' }}</p>
                    <p class="text-xs opacity-75">
                      {{ days <= 0 ? 'VENCIDO' : days === 1 ? 'mañana' : days + ' días' }}
                    </p>
                  </div>
                  <div class="shrink-0 text-xs">
                    Cant: <strong>{{ alert.quantity }}</strong> {{ alert.product?.unit }}
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Filters -->
      <div class="card p-4 flex flex-wrap gap-3 items-center">
        <input [(ngModel)]="search" (input)="loadProducts()" class="input w-52" placeholder="Buscar producto...">
        <select [(ngModel)]="filterCategory" (change)="loadProducts()" class="input w-40">
          <option value="">Todas las categorías</option>
          @for (cat of categories(); track cat.id) {
            <option [value]="cat.id">{{ cat.name }}</option>
          }
        </select>
        <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input type="checkbox" [(ngModel)]="onlyLowStock" (change)="loadProducts()" class="rounded">
          Stock bajo
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input type="checkbox" [(ngModel)]="onlyExpiring" (change)="loadProducts()" class="rounded">
          Por vencer
        </label>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Unidad</th>
                <th>Stock Total</th>
                <th>Stock Mínimo</th>
                <th>Alertas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (p of products(); track p.id) {
                <tr>
                  <td>
                    <p class="font-medium">{{ p.name }}</p>
                    @if (p.category) {
                      <p class="text-xs text-slate-400">{{ p.category.name }}</p>
                    }
                  </td>
                  <td class="text-slate-500 font-mono text-xs">{{ p.sku || '—' }}</td>
                  <td class="text-slate-500">{{ p.unit }}</td>
                  <td>
                    <span class="font-semibold" [class]="stockClass(p)">{{ p.totalStock ?? 0 }}</span>
                  </td>
                  <td class="text-slate-500">{{ p.minimumStock }}</td>
                  <td>
                    <div class="flex gap-1">
                      @if (p.isLowStock) {
                        <span class="badge-red text-xs">Stock bajo</span>
                      }
                      @if (p.isExpiringSoon) {
                        <span class="badge-yellow text-xs">Por vencer</span>
                      }
                    </div>
                  </td>
                  <td>
                    <span [class]="p.isActive ? 'badge-green' : 'badge-red'">
                      {{ p.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>
                    @if (isAdmin()) {
                      <div class="flex items-center gap-0.5">
                        <button (click)="openModal(p)" title="Editar producto"
                          class="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 dark:text-primary-400 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button (click)="selectProductForStock(p)" title="Agregar stock"
                          class="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        </button>
                      </div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8">
                  <div class="empty-state py-10">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    <p class="empty-state-title">Sin productos en el inventario</p>
                    <p class="empty-state-desc">Agrega el primer producto para gestionar el stock</p>
                  </div>
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Producto -->
    @if (showModal()) {
      <div class="fixed inset-0 z-[70] overflow-y-auto bg-black/40 backdrop-blur-sm" (click)="closeModal()">
        <div class="flex min-h-full items-center justify-center p-4">
        <div class="card w-full max-w-lg p-6 animate-fade-in" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-5">
            {{ editing() ? 'Editar Producto' : 'Nuevo Producto' }}
          </h2>
          <div class="space-y-4">
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
            }
            <div>
              <label class="label">Nombre *</label>
              <input [(ngModel)]="form.name" class="input" placeholder="Ej: Anestesia Lidocaína">
            </div>
            <div>
              <label class="label">Categoría</label>
              <select [(ngModel)]="form.categoryId" class="input">
                <option value="">Sin categoría</option>
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="label">Descripción</label>
              <textarea [(ngModel)]="form.description" class="input resize-none" rows="2"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">SKU</label>
                <input [(ngModel)]="form.sku" class="input" placeholder="PROD-001">
              </div>
              <div>
                <label class="label">Unidad *</label>
                <select [(ngModel)]="form.unit" class="input">
                  <option value="UNIDAD">Unidad</option>
                  <option value="CAJA">Caja</option>
                  <option value="AMPOLLA">Ampolla</option>
                  <option value="FRASCO">Frasco</option>
                  <option value="BLISTER">Blíster</option>
                  <option value="ML">ML</option>
                  <option value="GR">GR</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Stock Mínimo</label>
                <input [(ngModel)]="form.minimumStock" type="number" class="input" placeholder="5">
              </div>
              <div class="flex flex-col justify-end pb-2 gap-1">
                <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input type="checkbox" [(ngModel)]="form.hasExpiry" class="rounded">
                  Tiene fecha de vencimiento
                </label>
                @if (form.hasExpiry) {
                  <p class="text-xs text-blue-600 dark:text-blue-400 pl-5">
                    La fecha se registra en cada ingreso de stock
                  </p>
                }
              </div>
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

    <!-- Modal Categorías -->
    @if (showCategoriesModal()) {
      <div class="modal-overlay" (click)="showCategoriesModal.set(false)">
        <div class="modal-center">
        <div class="modal animate-slide-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">Categorías de Inventario</h2>
            <button (click)="showCategoriesModal.set(false)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body space-y-4">
            <!-- New category form -->
            <div class="flex gap-2">
              <input [(ngModel)]="newCategoryName" class="input flex-1" placeholder="Nueva categoría..." (keydown.enter)="saveCategory()">
              <button (click)="saveCategory()" class="btn-primary px-4" [disabled]="!newCategoryName.trim()">Agregar</button>
            </div>

            <!-- Category list -->
            <div class="space-y-1 max-h-64 overflow-y-auto">
              @for (cat of categories(); track cat.id) {
                <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  @if (editingCategoryId() === cat.id) {
                    <input [(ngModel)]="editingCategoryName" class="input input-sm flex-1 mr-2" (keydown.enter)="updateCategory(cat.id)">
                    <div class="flex gap-1">
                      <button (click)="updateCategory(cat.id)" class="text-xs text-emerald-600 hover:underline">Guardar</button>
                      <button (click)="editingCategoryId.set(null)" class="text-xs text-slate-400 hover:underline">Cancelar</button>
                    </div>
                  } @else {
                    <span class="text-sm font-medium text-slate-900 dark:text-white">{{ cat.name }}</span>
                    <button (click)="startEditCategory(cat)" class="text-xs text-primary-600 hover:underline">Editar</button>
                  }
                </div>
              } @empty {
                <p class="text-sm text-slate-400 text-center py-4">No hay categorías aún</p>
              }
            </div>
          </div>
          <div class="modal-footer">
            <button (click)="showCategoriesModal.set(false)" class="btn-secondary">Cerrar</button>
          </div>
        </div>
        </div>
      </div>
    }

    <!-- Modal Historial de Movimientos -->
    @if (showMovementsModal()) {
      <div class="modal-overlay" (click)="showMovementsModal.set(false)">
        <div class="modal-center">
        <div class="modal animate-slide-up max-w-3xl" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">Historial de Movimientos</h2>
              <p class="text-xs text-slate-500 mt-0.5">Últimos 100 movimientos de inventario</p>
            </div>
            <button (click)="showMovementsModal.set(false)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <!-- Filtro por producto -->
          <div class="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex gap-3 items-center">
            <select class="input input-sm w-56" [(ngModel)]="movFilterProduct" (change)="loadMovements()">
              <option value="">Todos los productos</option>
              @for (p of products(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
            <select class="input input-sm w-40" [(ngModel)]="movFilterType" (change)="filterMovements()">
              <option value="">Todos los tipos</option>
              <option value="ENTRY">Ingreso</option>
              <option value="EXIT">Consumo</option>
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="TRANSFER_IN">Transferencia In</option>
              <option value="TRANSFER_OUT">Transferencia Out</option>
            </select>
            <span class="text-xs text-slate-400 ml-auto">{{ filteredMovements().length }} registros</span>
          </div>
          <div class="modal-body p-0">
            <div class="overflow-x-auto max-h-[60vh]">
              <table class="table text-sm">
                <thead class="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of filteredMovements(); track m.id) {
                    <tr>
                      <td class="whitespace-nowrap text-xs text-slate-500">{{ m.createdAt | date:'dd/MM/yy HH:mm' }}</td>
                      <td>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                          [class.bg-emerald-100]="m.type === 'ENTRY'"
                          [class.text-emerald-700]="m.type === 'ENTRY'"
                          [class.bg-red-100]="m.type === 'EXIT'"
                          [class.text-red-700]="m.type === 'EXIT'"
                          [class.bg-amber-100]="m.type === 'ADJUSTMENT'"
                          [class.text-amber-700]="m.type === 'ADJUSTMENT'"
                          [class.bg-blue-100]="m.type === 'TRANSFER_IN' || m.type === 'TRANSFER_OUT'"
                          [class.text-blue-700]="m.type === 'TRANSFER_IN' || m.type === 'TRANSFER_OUT'">
                          {{ movTypeLabel(m.type) }}
                        </span>
                      </td>
                      <td class="font-medium">{{ m.item?.product?.name || '—' }}</td>
                      <td>
                        <span [class.text-emerald-600]="m.quantity > 0" [class.text-red-600]="m.quantity < 0" class="font-semibold">
                          {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }} {{ m.item?.product?.unit || '' }}
                        </span>
                      </td>
                      <td class="text-xs text-slate-500 max-w-[180px] truncate" [title]="m.reason || ''">{{ m.reason || '—' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="text-center py-8 text-slate-400">
                        @if (loadingMovements()) {
                          <span>Cargando...</span>
                        } @else {
                          <span>No hay movimientos registrados</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button (click)="showMovementsModal.set(false)" class="btn-secondary">Cerrar</button>
          </div>
        </div>
        </div>
      </div>
    }

    <!-- Modal Ingreso Stock -->
    @if (showStockModal()) {
      <div class="fixed inset-0 z-[70] overflow-y-auto bg-black/40 backdrop-blur-sm" (click)="closeStockModal()">
        <div class="flex min-h-full items-center justify-center p-4">
        <div class="card w-full max-w-md p-6 animate-fade-in" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-5">Ingreso de Stock</h2>
          <div class="space-y-4">
            @if (branches().length > 1) {
              <div>
                <label class="label">Sucursal *</label>
                <select [(ngModel)]="stockForm.branchId" class="input">
                  <option value="">Seleccionar sucursal</option>
                  @for (b of branches(); track b.id) {
                    <option [value]="b.id">{{ b.name }}</option>
                  }
                </select>
              </div>
            }
            <div>
              <label class="label">Producto *</label>
              <select [(ngModel)]="stockForm.productId" class="input"
                (change)="onStockProductChange($any($event.target).value)">
                <option value="">Seleccionar producto</option>
                @for (p of products(); track p.id) {
                  <option [value]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Cantidad *</label>
                <input [(ngModel)]="stockForm.quantity" type="number" class="input" placeholder="0">
              </div>
              <div>
                <label class="label">Costo Unitario</label>
                <input [(ngModel)]="stockForm.costPrice" type="number" step="0.01" class="input" placeholder="0.00">
              </div>
            </div>
            <div>
              <label class="label">Lote</label>
              <input [(ngModel)]="stockForm.batch" class="input" placeholder="LOTE-001">
            </div>
            @if (stockProductHasExpiry()) {
              <div>
                <label class="label">Fecha de vencimiento</label>
                <input [(ngModel)]="stockForm.expiryDate" type="date" class="input">
              </div>
            }
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button (click)="closeStockModal()" class="btn-secondary">Cancelar</button>
            <button (click)="addStock()" class="btn-primary" [disabled]="savingStock()">
              {{ savingStock() ? 'Guardando...' : 'Registrar Ingreso' }}
            </button>
          </div>
        </div>
        </div>
      </div>
    }

    <!-- Modal Transferencia entre sucursales -->
    @if (showTransferModal()) {
      <div class="fixed inset-0 z-[70] overflow-y-auto bg-black/40 backdrop-blur-sm" (click)="closeTransferModal()">
        <div class="flex min-h-full items-center justify-center p-4">
        <div class="card w-full max-w-md p-6 animate-fade-in" (click)="$event.stopPropagation()">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Transferir Stock</h2>
              <p class="text-xs text-slate-400">Mueve stock entre sucursales con trazabilidad completa</p>
            </div>
          </div>
          <div class="space-y-4">
            <div>
              <label class="label">Producto *</label>
              <select [(ngModel)]="transferForm.productId" class="input">
                <option value="">Seleccionar producto</option>
                @for (p of products(); track p.id) {
                  <option [value]="p.id">{{ p.name }} (Stock: {{ p.totalStock ?? 0 }} {{ p.unit }})</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Sucursal Origen *</label>
                <select [(ngModel)]="transferForm.fromBranchId" class="input">
                  <option value="">Seleccionar</option>
                  @for (b of branches(); track b.id) {
                    <option [value]="b.id">{{ b.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="label">Sucursal Destino *</label>
                <select [(ngModel)]="transferForm.toBranchId" class="input">
                  <option value="">Seleccionar</option>
                  @for (b of branches(); track b.id) {
                    <option [value]="b.id" [disabled]="b.id === transferForm.fromBranchId">{{ b.name }}</option>
                  }
                </select>
              </div>
            </div>
            @if (transferForm.fromBranchId && transferForm.fromBranchId === transferForm.toBranchId) {
              <p class="text-xs text-red-500">La sucursal origen y destino no pueden ser la misma.</p>
            }
            <div>
              <label class="label">Cantidad *</label>
              <input [(ngModel)]="transferForm.quantity" type="number" min="1" class="input" placeholder="1">
            </div>
            <div>
              <label class="label">Notas <span class="font-normal text-slate-400">(opcional)</span></label>
              <input [(ngModel)]="transferForm.notes" class="input" placeholder="Motivo de la transferencia...">
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button (click)="closeTransferModal()" class="btn-secondary">Cancelar</button>
            <button (click)="doTransfer()" class="btn-primary"
              [disabled]="savingTransfer() || !transferForm.productId || !transferForm.fromBranchId || !transferForm.toBranchId || !transferForm.quantity || transferForm.fromBranchId === transferForm.toBranchId">
              @if (savingTransfer()) {
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Transfiriendo...
              } @else {
                Confirmar Transferencia
              }
            </button>
          </div>
        </div>
        </div>
      </div>
    }

    <!-- Toast -->
    @if (toastMsg()) {
      <div class="fixed top-20 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium animate-fade-in"
        [ngClass]="toastMsg()!.type === 'success'
          ? 'bg-emerald-600 text-white'
          : 'bg-red-600 text-white'">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          @if (toastMsg()!.type === 'success') {
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          } @else {
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          }
        </svg>
        {{ toastMsg()!.text }}
      </div>
    }
  `,
})
export class InventoryComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private branchCtx = inject(BranchContextService);
  private cdr = inject(ChangeDetectorRef);

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  isAdmin = computed(() => ['ADMIN', 'SECRETARY', 'SUPER_ADMIN'].includes(this.auth.currentUser()?.role || ''));
  isPremiumOrHigher = computed(() => {
    const role = this.auth.currentUser()?.role;
    if (role === 'SUPER_ADMIN') return true;
    const slug = (this.auth.currentUser() as any)?.planSlug;
    return slug === 'premium' || slug === 'platinum';
  });
  tenants = signal<any[]>([]);
  clinicsForFilter = signal<any[]>([]);
  branchesForFilter = signal<any[]>([]);
  filterTenantId = signal<string>('');
  filterClinicId = signal<string>('');
  filterBranchId = signal<string>('');

  products = signal<InventoryProduct[]>([]);
  clinics = signal<Clinic[]>([]);
  branches = signal<Branch[]>([]);
  categories = signal<{ id: string; name: string }[]>([]);
  showModal = signal(false);
  showStockModal = signal(false);
  showCategoriesModal = signal(false);
  showMovementsModal = signal(false);
  movements = signal<any[]>([]);
  loadingMovements = signal(false);
  editing = signal<InventoryProduct | null>(null);
  editingCategoryId = signal<string | null>(null);
  saving = signal(false);
  savingStock = signal(false);
  showTransferModal = signal(false);
  savingTransfer = signal(false);
  toastMsg = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  search = '';
  filterCategory = '';
  movFilterProduct = '';
  movFilterType = '';
  onlyLowStock = false;
  onlyExpiring = false;
  newCategoryName = '';
  editingCategoryName = '';

  // ── Expiry alerts
  expiryAlerts = signal<any[]>([]);
  showExpiryPanel = signal(false);

  filteredMovements(): any[] {
    let list = this.movements();
    if (this.movFilterType) list = list.filter((m: any) => m.type === this.movFilterType);
    return list;
  }

  form = this.emptyForm();
  stockForm = this.emptyStockForm();
  stockProductHasExpiry = signal(false);
  transferForm = { productId: '', fromBranchId: '', toBranchId: '', quantity: 1, notes: '' };

  constructor() {
    effect(() => {
      this.branchCtx.activeBranchId(); // track branch changes
      if (!this.isSuperAdmin()) {
        this.loadProducts();
      }
    });
  }

  ngOnInit() {
    if (this.isSuperAdmin()) this.loadTenants();
    this.loadClinicsAndBranches();
    this.loadCategories();
    this.loadProducts();
    this.loadExpiryAlerts();
  }

  loadClinicsAndBranches() {
    if (!this.isSuperAdmin()) {
      // Use BranchContextService data
      const clinicId = this.branchCtx.activeClinicId();
      const branchId = this.branchCtx.activeBranchId();
      if (clinicId) this.form.clinicId = clinicId;
      if (branchId) this.stockForm.branchId = branchId;
      this.clinics.set(this.branchCtx.clinics());
      this.branches.set(this.branchCtx.branches());
      return;
    }
    this.api.get<any>('/clinics').subscribe({
      next: (res: any) => {
        const list: Clinic[] = Array.isArray(res) ? res : res?.data || [];
        this.clinics.set(list);
        if (list.length === 1) this.form.clinicId = list[0].id;
      },
      error: () => {},
    });
    this.api.get<any>('/branches').subscribe({
      next: (res: any) => {
        const list: Branch[] = Array.isArray(res) ? res : res?.data || [];
        this.branches.set(list);
        if (list.length === 1) this.stockForm.branchId = list[0].id;
      },
      error: () => {},
    });
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
    this.filterBranchId.set('');
    this.clinicsForFilter.set([]);
    this.branchesForFilter.set([]);
    if (tenantId) {
      this.api.get<any[]>('/clinics', { tenantId }).subscribe({
        next: (data: any) => this.clinicsForFilter.set(Array.isArray(data) ? data : data?.data || []),
        error: () => {},
      });
    }
    this.loadProducts();
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
    this.loadProducts();
  }

  onBranchFilterChange(branchId: string) {
    this.filterBranchId.set(branchId);
    this.loadProducts();
  }

  clearFilters() {
    this.filterTenantId.set('');
    this.filterClinicId.set('');
    this.filterBranchId.set('');
    this.clinicsForFilter.set([]);
    this.branchesForFilter.set([]);
    this.loadProducts();
  }

  loadProducts() {
    const params: any = { limit: 100 };
    if (this.search) params.search = this.search;
    if (this.onlyLowStock) params.lowStock = true;
    if (this.onlyExpiring) params.expiringSoon = true;
    if (this.filterCategory) params.categoryId = this.filterCategory;
    if (this.isSuperAdmin()) {
      if (this.filterTenantId()) params.tenantId = this.filterTenantId();
      if (this.filterClinicId()) params.clinicId = this.filterClinicId();
      if (this.filterBranchId()) params.branchId = this.filterBranchId();
    } else {
      const branchId = this.branchCtx.activeBranchId();
      if (branchId) params.branchId = branchId;
    }
    this.api.getPaginated<InventoryProduct>('/inventory', params).subscribe(r => this.products.set(r.data));
  }

  loadExpiryAlerts() {
    this.api.get<any>('/inventory/alerts/expiry').subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : res?.data || [];
        this.expiryAlerts.set(list);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  daysUntil(dateStr: string): number {
    const now = new Date();
    const exp = new Date(dateStr);
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  expiryUrgencyClass(days: number): string {
    if (days <= 7) return 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    if (days <= 14) return 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300';
    return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300';
  }

  expiryDotClass(days: number): string {
    if (days <= 7) return 'bg-red-500';
    if (days <= 14) return 'bg-orange-500';
    return 'bg-amber-500';
  }

  loadCategories() {
    this.api.get<any>('/inventory/categories').subscribe({
      next: (res: any) => this.categories.set(Array.isArray(res) ? res : res?.data || []),
      error: () => {},
    });
  }

  openMovementsModal() {
    this.movFilterProduct = '';
    this.movFilterType = '';
    this.showMovementsModal.set(true);
    this.loadMovements();
  }

  loadMovements() {
    this.loadingMovements.set(true);
    const branchId = this.isSuperAdmin()
      ? this.filterBranchId() || this.branches()[0]?.id
      : this.branchCtx.activeBranchId();
    if (!branchId) { this.loadingMovements.set(false); return; }
    const params: any = { branchId };
    if (this.movFilterProduct) params.productId = this.movFilterProduct;
    this.api.get<any[]>('/inventory/movements', params).subscribe({
      next: (data: any) => {
        this.movements.set(Array.isArray(data) ? data : []);
        this.loadingMovements.set(false);
      },
      error: () => this.loadingMovements.set(false),
    });
  }

  filterMovements() { /* computed handles it */ }

  movTypeLabel(type: string): string {
    const map: Record<string, string> = {
      ENTRY: 'Ingreso', EXIT: 'Consumo', ADJUSTMENT: 'Ajuste',
      TRANSFER_IN: 'Transf. In', TRANSFER_OUT: 'Transf. Out',
    };
    return map[type] || type;
  }

  openCategoriesModal() {
    this.newCategoryName = '';
    this.editingCategoryId.set(null);
    this.showCategoriesModal.set(true);
  }

  saveCategory() {
    const name = this.newCategoryName.trim();
    if (!name) return;
    this.api.post('/inventory/categories', { name }).subscribe({
      next: () => { this.newCategoryName = ''; this.loadCategories(); },
      error: () => {},
    });
  }

  startEditCategory(cat: { id: string; name: string }) {
    this.editingCategoryId.set(cat.id);
    this.editingCategoryName = cat.name;
  }

  updateCategory(id: string) {
    const name = this.editingCategoryName.trim();
    if (!name) return;
    this.api.patch(`/inventory/categories/${id}`, { name }).subscribe({
      next: () => { this.editingCategoryId.set(null); this.loadCategories(); },
      error: () => {},
    });
  }

  statsCards() {
    const all = this.products();
    return [
      { label: 'Total Productos', value: all.length, color: 'text-slate-900 dark:text-white' },
      { label: 'Stock Bajo', value: all.filter(p => p.isLowStock).length, color: 'text-red-600' },
      { label: 'Por Vencer', value: all.filter(p => p.isExpiringSoon).length, color: 'text-amber-600' },
      { label: 'Inactivos', value: all.filter(p => !p.isActive).length, color: 'text-slate-400' },
    ];
  }

  stockClass(p: InventoryProduct) {
    if (p.isLowStock) return 'text-red-600';
    return 'text-slate-900 dark:text-white';
  }

  selectProductForStock(p: InventoryProduct) {
    this.stockForm = this.emptyStockForm();
    this.stockForm.productId = p.id;
    if (this.branches().length === 1) this.stockForm.branchId = this.branches()[0].id;
    this.showStockModal.set(true);
  }

  openStockModal() {
    this.stockForm = this.emptyStockForm();
    this.stockProductHasExpiry.set(false);
    if (this.branches().length === 1) this.stockForm.branchId = this.branches()[0].id;
    this.showStockModal.set(true);
  }

  onStockProductChange(productId: string) {
    const p = this.products().find((x: any) => x.id === productId);
    this.stockProductHasExpiry.set(!!(p as any)?.hasExpiry);
    if (!(p as any)?.hasExpiry) this.stockForm.expiryDate = '';
  }

  closeStockModal() { this.showStockModal.set(false); }

  addStock() {
    if (!this.stockForm.productId || !this.stockForm.quantity || !this.stockForm.branchId) return;
    this.savingStock.set(true);
    const payload = {
      productId: this.stockForm.productId,
      branchId: this.stockForm.branchId,
      quantity: this.stockForm.quantity,
      costPrice: this.stockForm.costPrice || undefined,
      batch: this.stockForm.batch || undefined,
      expiryDate: this.stockForm.expiryDate || undefined,
    };
    this.api.post('/inventory/stock/add', payload).subscribe({
      next: () => { this.savingStock.set(false); this.closeStockModal(); this.loadProducts(); },
      error: () => this.savingStock.set(false),
    });
  }

  openModal(p?: InventoryProduct) {
    if (p) {
      this.editing.set(p);
      this.form = { clinicId: (p as any).clinicId || this.clinics()[0]?.id || '', name: p.name, description: p.description || '', sku: p.sku || '', unit: p.unit, minimumStock: p.minimumStock, hasExpiry: p.hasExpiry, categoryId: (p as any).categoryId || '' };
    } else {
      this.editing.set(null);
      this.form = this.emptyForm();
      if (this.clinics().length === 1) this.form.clinicId = this.clinics()[0].id;
    }
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (!this.form.name || !this.form.clinicId) return;
    this.saving.set(true);
    const req = this.editing()
      ? this.api.patch(`/inventory/${this.editing()!.id}`, this.form)
      : this.api.post('/inventory', this.form);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadProducts(); },
      error: () => this.saving.set(false),
    });
  }

  private emptyForm() {
    return { clinicId: '', name: '', description: '', sku: '', unit: 'UNIDAD', minimumStock: 5, hasExpiry: false, categoryId: '' };
  }

  private emptyStockForm() {
    return { productId: '', branchId: '', quantity: 0, costPrice: 0, batch: '', expiryDate: '' };
  }

  openTransferModal() {
    this.transferForm = { productId: '', fromBranchId: '', toBranchId: '', quantity: 1, notes: '' };
    if (this.branches().length === 1) this.transferForm.fromBranchId = this.branches()[0].id;
    this.showTransferModal.set(true);
  }

  closeTransferModal() { this.showTransferModal.set(false); }

  doTransfer() {
    if (!this.transferForm.productId || !this.transferForm.fromBranchId || !this.transferForm.toBranchId || !this.transferForm.quantity) return;
    if (this.transferForm.fromBranchId === this.transferForm.toBranchId) return;
    this.savingTransfer.set(true);
    this.api.post('/inventory/transfer', {
      productId: this.transferForm.productId,
      fromBranchId: this.transferForm.fromBranchId,
      toBranchId: this.transferForm.toBranchId,
      quantity: Number(this.transferForm.quantity),
      notes: this.transferForm.notes || undefined,
    }).subscribe({
      next: () => {
        this.savingTransfer.set(false);
        this.closeTransferModal();
        this.loadProducts();
        this.showToast('success', 'Transferencia realizada correctamente');
      },
      error: (err: any) => {
        this.savingTransfer.set(false);
        const msg = err?.error?.message || 'Error al realizar la transferencia';
        this.showToast('error', Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  private showToast(type: 'success' | 'error', text: string) {
    this.toastMsg.set({ type, text });
    setTimeout(() => { this.toastMsg.set(null); this.cdr.markForCheck(); }, 4000);
    this.cdr.markForCheck();
  }
}
