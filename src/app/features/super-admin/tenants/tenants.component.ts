import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Tenant, Plan, Subscription } from '../../../core/models';

@Component({
  selector: 'app-sa-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-slide-up">
      <div class="page-header">
        <div>
          <h1 class="page-title">Tenants</h1>
          <p class="page-subtitle">Panel de Super Administrador — Clientes SaaS</p>
        </div>
        <button (click)="openModal()" class="btn-primary">+ Nuevo Tenant</button>
      </div>

      <!-- Global Metrics -->
      @if (metrics()) {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- MRR -->
          <div class="card p-4 border-l-4 border-emerald-500">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wide">MRR</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-white">Bs. {{ metrics().mrr | number:'1.0-0' }}</p>
                <p class="text-xs text-slate-400 mt-0.5">ARR: Bs. {{ metrics().arr | number:'1.0-0' }}</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg class="w-4.5 h-4.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
          </div>
          <!-- Activos -->
          <div class="card p-4 border-l-4 border-blue-500">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wide">Tenants Activos</p>
                <p class="text-2xl font-bold text-emerald-600">{{ metrics().active }}</p>
                <p class="text-xs text-slate-400 mt-0.5">Total: {{ metrics().total }}</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg class="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
              </div>
            </div>
          </div>
          <!-- Demo + Nuevos -->
          <div class="card p-4 border-l-4 border-amber-400">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wide">En Demo</p>
                <p class="text-2xl font-bold text-amber-500">{{ metrics().trial }}</p>
                <p class="text-xs text-emerald-600 font-semibold mt-0.5">+{{ metrics().newThisMonth }} nuevos este mes</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg class="w-4.5 h-4.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
            </div>
          </div>
          <!-- Churn / Crecimiento -->
          <div class="card p-4 border-l-4 border-violet-400">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wide">Crecimiento</p>
                <p class="text-2xl font-bold" [class]="metrics().growthRate >= 0 ? 'text-emerald-600' : 'text-red-500'">
                  {{ metrics().growthRate >= 0 ? '+' : '' }}{{ metrics().growthRate | number:'1.1-1' }}%
                </p>
                <p class="text-xs text-slate-400 mt-0.5">Churn: {{ metrics().churnRate | number:'1.1-1' }}%</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <svg class="w-4.5 h-4.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Distribución de estado + barras de plan -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Donut estado de tenants -->
          <div class="card p-5">
            <p class="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Estado de Tenants</p>
            <div class="flex items-center gap-6">
              <div class="w-28 h-28 rounded-full shrink-0"
                   [style.background]="tenantStatusPie()"></div>
              <div class="space-y-2">
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span class="text-slate-600 dark:text-slate-400">Activos</span>
                  <span class="font-bold text-slate-900 dark:text-white ml-auto pl-4">{{ metrics().active }}</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 rounded-full bg-amber-400"></div>
                  <span class="text-slate-600 dark:text-slate-400">Demo / Trial</span>
                  <span class="font-bold text-slate-900 dark:text-white ml-auto pl-4">{{ metrics().trial }}</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 rounded-full bg-red-400"></div>
                  <span class="text-slate-600 dark:text-slate-400">Suspendidos</span>
                  <span class="font-bold text-slate-900 dark:text-white ml-auto pl-4">{{ metrics().suspended }}</span>
                </div>
                <div class="border-t border-slate-100 dark:border-slate-700 pt-1.5 mt-1.5">
                  <div class="flex items-center gap-2 text-xs font-bold">
                    <div class="w-3 h-3 rounded-full bg-slate-400"></div>
                    <span class="text-slate-700 dark:text-slate-300">Total</span>
                    <span class="text-slate-900 dark:text-white ml-auto pl-4">{{ metrics().total }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Barras de plan -->
          <div class="card p-5">
            <p class="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Distribución por Plan</p>
            <div class="space-y-3">
              @for (planStat of planDistribution(); track planStat.name) {
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-semibold text-slate-600 dark:text-slate-400">{{ planStat.name }}</span>
                    <span class="text-slate-500">{{ planStat.count }} tenant{{ planStat.count !== 1 ? 's' : '' }}</span>
                  </div>
                  <div class="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500"
                         [class]="planStat.color"
                         [style.width.%]="metrics().total > 0 ? (planStat.count / metrics().total * 100) : 0"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Filters -->
      <div class="card p-4 flex flex-wrap gap-3 items-center">
        <input [(ngModel)]="search" (input)="loadTenants()" class="input w-52" placeholder="Buscar tenant...">
        <select [(ngModel)]="selectedStatus" (change)="loadTenants()" class="input w-36">
          <option value="">Todos</option>
          <option value="ACTIVE">Activos</option>
          <option value="SUSPENDED">Suspendidos</option>
          <option value="TRIAL">Demo / Trial</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Email</th>
                <th>País</th>
                <th>Plan / Suscripción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (t of tenants(); track t.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      @if (t.logoUrl) {
                        <img [src]="t.logoUrl" class="w-7 h-7 rounded object-cover" alt="">
                      } @else {
                        <div class="w-7 h-7 rounded bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-600">
                          {{ t.name[0] }}
                        </div>
                      }
                      <div>
                        <p class="font-medium">{{ t.name }}</p>
                        <p class="text-xs text-slate-400">{{ t.slug }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="text-slate-500">{{ t.email }}</td>
                  <td class="text-slate-500">{{ t.country }}</td>
                  <td>
                    @if (getActiveSub(t)) {
                      @if (isDemoSub(getActiveSub(t)!)) {
                        <!-- Demo badge -->
                        <div class="space-y-1">
                          @let days = daysRemaining(getActiveSub(t)!);
                          <span [class]="days <= 1 ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 animate-pulse' :
                                        days <= 3 ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'">
                            DEMO — {{ days }}d restantes
                          </span>
                          <p class="text-xs text-slate-400">Vence {{ getActiveSub(t)!.currentPeriodEnd | date:'dd/MM/yyyy' }}</p>
                        </div>
                      } @else {
                        <!-- Plan de pago badge -->
                        <button (click)="openAssignPlan(t)" class="flex flex-col items-start gap-0.5 group">
                          <span class="badge-blue text-xs">{{ getActiveSub(t)!.plan?.name || 'Plan' }}</span>
                          <span class="text-xs text-slate-400 group-hover:text-primary-500 transition-colors">
                            {{ getActiveSub(t)!.billingCycle === 'ANNUAL' ? 'Anual' : 'Mensual' }} · vence {{ getActiveSub(t)!.currentPeriodEnd | date:'dd/MM/yy' }}
                          </span>
                        </button>
                      }
                    } @else {
                      <button (click)="openAssignPlan(t)" class="flex items-center gap-1.5 group">
                        <span class="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700 animate-pulse">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          Sin plan — Asignar
                        </span>
                      </button>
                    }
                  </td>
                  <td><span [class]="tenantStatusClass(t.status)">{{ t.status }}</span></td>
                  <td>
                    <div class="flex gap-2 flex-wrap">
                      @if (t.status === 'ACTIVE') {
                        <button (click)="suspend(t)" class="text-xs text-amber-600 hover:underline">Suspender</button>
                      } @else if (t.status === 'SUSPENDED') {
                        <button (click)="activate(t)" class="text-xs text-emerald-600 hover:underline">Activar</button>
                      }
                      @if (t.status === 'TRIAL' || (getActiveSub(t) && isDemoSub(getActiveSub(t)!))) {
                        <button (click)="openConvertDemo(t)" class="text-xs text-violet-600 hover:underline font-medium">
                          Convertir a Plan
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="text-center py-8 text-slate-400">No hay tenants registrados</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span class="text-sm text-slate-500">Total: {{ total() }}</span>
          <div class="flex gap-2">
            <button (click)="prevPage()" [disabled]="page() <= 1" class="btn-secondary text-xs px-3 py-1">Anterior</button>
            <span class="text-sm px-2 py-1 text-slate-600 dark:text-slate-400">{{ page() }} / {{ totalPages() }}</span>
            <button (click)="nextPage()" [disabled]="page() >= totalPages()" class="btn-secondary text-xs px-3 py-1">Siguiente</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Nuevo Tenant -->
    @if (showModal()) {
      <div class="fixed inset-0 z-[70] overflow-y-auto bg-black/50 backdrop-blur-sm" (click)="closeModal()">
        <div class="flex min-h-full items-start justify-center p-4 pt-8">
        <div class="card w-full max-w-4xl animate-fade-in" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-3">
              <!-- Toggle Plan de Pago / Cuenta Demo -->
              <div class="flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800">
                <button (click)="createMode.set('paid')"
                  [class]="createMode() === 'paid' ? 'px-4 py-1.5 text-sm font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg'">
                  Plan de Pago
                </button>
                <button (click)="createMode.set('demo')"
                  [class]="createMode() === 'demo' ? 'px-4 py-1.5 text-sm font-semibold rounded-lg bg-violet-600 text-white shadow-sm' : 'px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg'">
                  Demo
                </button>
              </div>
              @if (createMode() === 'demo') {
                <span class="text-xs text-violet-600 dark:text-violet-400 font-medium">Acceso Premium completo · Sin costo</span>
              }
            </div>
            <button (click)="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="p-6">
            <!-- Columnas lado a lado -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <!-- Columna izquierda: Datos de la Clínica -->
              <div class="space-y-3">
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Datos de la Clínica</p>

                <!-- Logo -->
                <div class="flex items-center gap-3">
                  <div class="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0 bg-slate-50 dark:bg-slate-800">
                    @if (logoPreview()) {
                      <img [src]="logoPreview()!" class="w-full h-full object-cover" alt="Logo">
                    } @else {
                      <svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    }
                  </div>
                  <label class="cursor-pointer flex-1">
                    <span class="btn-secondary inline-flex items-center gap-1.5 text-xs w-full justify-center">Subir logo</span>
                    <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp,image/svg+xml" (change)="onLogoChange($event)">
                  </label>
                </div>

                <div>
                  <label class="label">Nombre de Clínica *</label>
                  <input [(ngModel)]="form.name" (ngModelChange)="form.clinicName = form.name" class="input" placeholder="Ej: Clínica Dental San Juan">
                </div>
                <div>
                  <label class="label">Slug *</label>
                  <input [(ngModel)]="form.slug" class="input" placeholder="clinica-san-juan">
                  <p class="text-xs text-slate-400 mt-0.5">Identificador único — sin espacios ni acentos</p>
                </div>
                <div>
                  <label class="label">Email *</label>
                  <input [(ngModel)]="form.email" type="email" class="input" placeholder="admin@clinica.com">
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="label">Teléfono</label>
                    <input [(ngModel)]="form.phone" class="input" placeholder="+591 7...">
                  </div>
                  <div>
                    <label class="label">País</label>
                    <select [(ngModel)]="form.country" class="input">
                      <option value="BO">Bolivia</option>
                      <option value="PE">Perú</option>
                      <option value="MX">México</option>
                      <option value="CO">Colombia</option>
                      <option value="AR">Argentina</option>
                      <option value="CL">Chile</option>
                      <option value="EC">Ecuador</option>
                      <option value="PY">Paraguay</option>
                      <option value="UY">Uruguay</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Columna derecha: Administrador + Plan -->
              <div class="space-y-3">
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Administrador</p>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="label">Nombre *</label>
                    <input [(ngModel)]="form.adminFirstName" class="input" placeholder="Juan">
                  </div>
                  <div>
                    <label class="label">Apellido *</label>
                    <input [(ngModel)]="form.adminLastName" class="input" placeholder="Pérez">
                  </div>
                </div>
                <div>
                  <label class="label">Carnet de Identidad (CI)</label>
                  <input [(ngModel)]="form.adminCi" class="input" placeholder="Ej: 7487187">
                </div>
                <div>
                  <label class="label">Contraseña *</label>
                  <div class="flex gap-2">
                    <input [(ngModel)]="form.adminPassword" type="text" class="input flex-1 font-mono text-sm" placeholder="Autogenerada">
                    <button type="button" (click)="generatePassword()" class="btn-secondary text-xs px-3 whitespace-nowrap flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                      Generar
                    </button>
                  </div>
                  <p class="text-xs text-slate-400 mt-0.5">Incluida en el PDF de contrato. Se solicitará cambio al primer inicio.</p>
                </div>

                <div class="border-t border-slate-200 dark:border-slate-700 pt-3">
                  @if (createMode() === 'paid') {
                    <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Plan y Ciclo</p>
                    <!-- Ciclo -->
                    <div class="flex gap-2 mb-2">
                      <button type="button" (click)="form.billingCycle = 'MONTHLY'"
                        [ngClass]="form.billingCycle === 'MONTHLY' ? 'flex-1 py-2 text-sm font-semibold rounded-xl bg-primary-500 text-white border-2 border-primary-500' : 'flex-1 py-2 text-sm font-medium rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400'">
                        Mensual
                      </button>
                      <button type="button" (click)="form.billingCycle = 'ANNUAL'"
                        [ngClass]="form.billingCycle === 'ANNUAL' ? 'flex-1 py-2 text-sm font-semibold rounded-xl bg-emerald-500 text-white border-2 border-emerald-500' : 'flex-1 py-2 text-sm font-medium rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-400'">
                        Anual
                      </button>
                    </div>
                    <!-- Planes -->
                    <div class="space-y-1">
                      <label class="flex items-center justify-between px-3 py-2 rounded-xl border-2 cursor-pointer transition-all"
                        [ngClass]="form.planId === '' ? 'border-slate-400 bg-slate-50 dark:bg-slate-700/40' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'">
                        <div class="flex items-center gap-2">
                          <input type="radio" value="" [(ngModel)]="form.planId" class="accent-slate-500">
                          <span class="text-sm text-slate-600 dark:text-slate-300">Sin plan — Trial 30 días</span>
                        </div>
                        <span class="text-xs text-slate-400">Gratis</span>
                      </label>
                      @for (p of plans(); track p.id) {
                        <label class="flex items-center justify-between px-3 py-2 rounded-xl border-2 cursor-pointer transition-all"
                          [ngClass]="form.planId === p.id ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'">
                          <div class="flex items-center gap-2">
                            <input type="radio" [value]="p.id" [(ngModel)]="form.planId" class="accent-primary-500">
                            <span class="font-semibold text-sm">{{ p.name }}</span>
                          </div>
                          <span class="font-bold text-primary-600 text-sm">Bs. {{ form.billingCycle === 'ANNUAL' ? p.annualPrice : p.monthlyPrice }}/{{ form.billingCycle === 'ANNUAL' ? 'año' : 'mes' }}</span>
                        </label>
                      }
                    </div>
                  } @else {
                    <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Duración Demo</p>
                    <div class="flex gap-2">
                      @for (d of demoDurations; track d.value) {
                        <button (click)="form.demodays = d.value"
                          [class]="form.demodays === d.value
                            ? 'flex-1 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white border-2 border-violet-600'
                            : 'flex-1 py-2.5 rounded-xl text-sm font-medium border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-400 hover:text-violet-600'">
                          {{ d.label }}
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>

          </div>
          @if (createError()) {
            <div class="mx-6 mb-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {{ createError() }}
            </div>
          }
          <div class="flex justify-end gap-3 px-6 pb-6 pt-2">
            <button (click)="closeModal()" class="btn-secondary">Cancelar</button>
            <button (click)="createTenant()" class="btn-primary" [disabled]="saving()">
              {{ saving() ? 'Creando...' : (createMode() === 'demo' ? 'Crear Cuenta Demo' : 'Crear Tenant') }}
            </button>
          </div>
        </div>
        </div>
      </div>
    }

    <!-- Modal Exito — Tenant creado -->
    @if (createdTenant()) {
      <div class="fixed inset-0 z-[80] overflow-y-auto bg-black/60 backdrop-blur-sm" (click)="createdTenant.set(null)">
        <div class="flex min-h-full items-center justify-center p-4">
        <div class="card w-full max-w-md p-6 animate-fade-in" (click)="$event.stopPropagation()">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ createdTenant()!.isDemo ? 'Cuenta Demo creada' : 'Tenant creado' }}
              </h2>
              <p class="text-sm text-slate-500">Comparte estas credenciales con el administrador</p>
            </div>
          </div>

          <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-3 mb-4">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500 font-medium">Empresa</span>
              <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ createdTenant()!.name }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500 font-medium">Email Admin</span>
              <code class="text-xs bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 select-all">{{ createdTenant()!.email }}</code>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500 font-medium">Contraseña</span>
              <code class="text-xs bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 select-all">{{ createdTenant()!.tempPassword }}</code>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500 font-medium">Plan</span>
              @if (createdTenant()!.isDemo) {
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  DEMO — {{ createdTenant()!.demoDays }} días
                </span>
              } @else if (createdTenant()!.planName) {
                <span class="badge-blue text-xs">{{ createdTenant()!.planName }}</span>
              } @else {
                <span class="text-xs text-amber-600 font-medium">Trial 30 días (sin plan)</span>
              }
            </div>
          </div>

          <div class="flex justify-end gap-3 flex-wrap">
            <button (click)="printContract()" class="btn-secondary flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              Imprimir Contrato
            </button>
            @if (!createdTenant()!.planName && !createdTenant()!.isDemo) {
              <button (click)="openAssignPlanFromSuccess()" class="btn-primary">
                Asignar Plan ahora
              </button>
            }
            @if (createdTenant()!.isDemo) {
              <button (click)="openConvertDemoFromSuccess()" class="btn-secondary">
                Asignar Plan
              </button>
            }
            <button (click)="createdTenant.set(null)" class="btn-secondary">Listo</button>
          </div>
        </div>
        </div>
      </div>
    }

    <!-- Modal Asignar Plan -->
    @if (assignPlanModal()) {
      <div class="fixed inset-0 z-[70] overflow-y-auto bg-black/40 backdrop-blur-sm" (click)="assignPlanModal.set(null)">
        <div class="flex min-h-full items-center justify-center p-4">
        <div class="card w-full max-w-md p-6 animate-fade-in" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Asignar Plan
          </h2>
          <p class="text-sm text-slate-500 mb-4">{{ assignPlanModal()!.name }}</p>
          <div class="space-y-4">
            <!-- 1. Ciclo Plan primero -->
            <div>
              <label class="label">Ciclo Plan</label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" (click)="assignBillingCycle = 'MONTHLY'"
                  [ngClass]="assignBillingCycle === 'MONTHLY' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-primary-400'"
                  class="border-2 rounded-xl p-3 text-center transition-all font-semibold text-sm">
                  Mensual
                </button>
                <button type="button" (click)="assignBillingCycle = 'ANNUAL'"
                  [ngClass]="assignBillingCycle === 'ANNUAL' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-emerald-400'"
                  class="border-2 rounded-xl p-3 text-center transition-all font-semibold text-sm">
                  Anual <span class="text-xs opacity-80 font-normal block">Mayor ahorro</span>
                </button>
              </div>
            </div>
            <!-- 2. Planes con precio según ciclo -->
            <div>
              <label class="label">Plan</label>
              <div class="space-y-2">
                @for (p of plans(); track p.id) {
                  <label class="flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all"
                    [ngClass]="assignPlanId === p.id ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'">
                    <div class="flex items-center gap-2">
                      <input type="radio" [value]="p.id" [(ngModel)]="assignPlanId" class="accent-primary-500">
                      <span class="font-semibold text-sm text-slate-800 dark:text-slate-200">{{ p.name }}</span>
                    </div>
                    <span class="font-bold text-primary-600 text-sm">
                      Bs. {{ assignBillingCycle === 'ANNUAL' ? p.annualPrice : p.monthlyPrice }}/{{ assignBillingCycle === 'ANNUAL' ? 'año' : 'mes' }}
                    </span>
                  </label>
                }
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-5">
            <button (click)="assignPlanModal.set(null)" class="btn-secondary">Cancelar</button>
            <button (click)="doAssignPlan()" class="btn-primary" [disabled]="saving() || !assignPlanId">
              {{ saving() ? 'Asignando...' : 'Asignar Plan y Activar' }}
            </button>
          </div>
        </div>
        </div>
      </div>
    }

    <!-- Modal Convertir Demo a Plan -->
    @if (convertDemoModal()) {
      <div class="fixed inset-0 z-[70] overflow-y-auto bg-black/40 backdrop-blur-sm" (click)="convertDemoModal.set(null)">
        <div class="flex min-h-full items-center justify-center p-4">
        <div class="card w-full max-w-sm p-6 animate-fade-in" (click)="$event.stopPropagation()">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Convertir a Plan de Pago</h2>
              <p class="text-sm text-slate-500">{{ convertDemoModal()!.name }}</p>
            </div>
          </div>
          <div class="space-y-4">
            <!-- 1. Ciclo Plan primero -->
            <div>
              <label class="label">Ciclo Plan</label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" (click)="convertBillingCycle = 'MONTHLY'"
                  [ngClass]="convertBillingCycle === 'MONTHLY' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-primary-400'"
                  class="border-2 rounded-xl p-3 text-center transition-all font-semibold text-sm">
                  Mensual
                </button>
                <button type="button" (click)="convertBillingCycle = 'ANNUAL'"
                  [ngClass]="convertBillingCycle === 'ANNUAL' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-emerald-400'"
                  class="border-2 rounded-xl p-3 text-center transition-all font-semibold text-sm">
                  Anual <span class="text-xs opacity-80 font-normal block">Mayor ahorro</span>
                </button>
              </div>
            </div>
            <!-- 2. Planes con precio según ciclo -->
            <div>
              <label class="label">Plan a asignar</label>
              <div class="space-y-2">
                @for (p of plans(); track p.id) {
                  <label class="flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all"
                    [ngClass]="convertPlanId === p.id ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'">
                    <div class="flex items-center gap-2">
                      <input type="radio" [value]="p.id" [(ngModel)]="convertPlanId" class="accent-violet-500">
                      <span class="font-semibold text-sm text-slate-800 dark:text-slate-200">{{ p.name }}</span>
                    </div>
                    <span class="font-bold text-violet-600 text-sm">
                      Bs. {{ convertBillingCycle === 'ANNUAL' ? p.annualPrice : p.monthlyPrice }}/{{ convertBillingCycle === 'ANNUAL' ? 'año' : 'mes' }}
                    </span>
                  </label>
                }
              </div>
            </div>
          </div>
          <div class="mt-4 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
            <p class="text-xs text-violet-700 dark:text-violet-300">
              La cuenta demo quedará cancelada y se activará el plan seleccionado de inmediato.
            </p>
          </div>
          <div class="flex justify-end gap-3 mt-5">
            <button (click)="convertDemoModal.set(null)" class="btn-secondary">Cancelar</button>
            <button (click)="doConvertDemo()" class="btn-primary" [disabled]="saving()">
              {{ saving() ? 'Activando...' : 'Activar Plan' }}
            </button>
          </div>
        </div>
        </div>
      </div>
    }
  `,
})
export class TenantsComponent implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  tenants = signal<Tenant[]>([]);
  plans = signal<Plan[]>([]);
  metrics = signal<any>(null);

  tenantStatusPie = computed(() => {
    const m = this.metrics();
    if (!m || m.total === 0) return 'conic-gradient(#e2e8f0 0% 100%)';
    const activePct  = (m.active    / m.total) * 100;
    const trialPct   = (m.trial     / m.total) * 100;
    const suspPct    = (m.suspended / m.total) * 100;
    const c1 = activePct;
    const c2 = activePct + trialPct;
    const c3 = c2 + suspPct;
    return `conic-gradient(#10b981 0% ${c1.toFixed(1)}%, #f59e0b ${c1.toFixed(1)}% ${c2.toFixed(1)}%, #f87171 ${c2.toFixed(1)}% ${c3.toFixed(1)}%, #e2e8f0 ${c3.toFixed(1)}% 100%)`;
  });

  planDistribution = computed(() => {
    const tList = this.tenants();
    const planMap: Record<string, number> = {};
    tList.forEach(t => {
      const sub = t.subscriptions?.[0];
      const name = sub?.plan?.name || 'Sin plan';
      planMap[name] = (planMap[name] || 0) + 1;
    });
    const colors = ['bg-primary-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-400', 'bg-slate-400'];
    return Object.entries(planMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({ name, count, color: colors[i % colors.length] }));
  });
  assignPlanModal = signal<Tenant | null>(null);
  convertDemoModal = signal<Tenant | null>(null);
  createdTenant = signal<{ id: string; name: string; email: string; tempPassword: string; planName: string; isDemo?: boolean; demoDays?: number; adminFirstName?: string; adminLastName?: string; adminCi?: string; billingCycle?: string } | null>(null);
  total = signal(0);
  page = signal(1);
  totalPages = signal(1);
  showModal = signal(false);
  saving = signal(false);
  createError = signal('');
  logoFile = signal<File | null>(null);
  logoPreview = signal<string | null>(null);
  createMode = signal<'paid' | 'demo'>('paid');

  search = '';
  selectedStatus = '';
  assignPlanId = '';
  assignBillingCycle = 'MONTHLY';
  convertPlanId = '';
  convertBillingCycle = 'MONTHLY';

  demoDurations = [
    { value: 7, label: '7 días' },
    { value: 30, label: '1 mes' },
    { value: 90, label: '3 meses' },
  ];

  form = this.emptyForm();

  ngOnInit() {
    this.loadTenants();
    this.loadPlans();
    this.loadMetrics();
  }

  loadTenants() {
    const params: any = { page: this.page(), limit: 15 };
    if (this.search) params.search = this.search;
    if (this.selectedStatus) params.status = this.selectedStatus;
    this.api.getPaginated<Tenant>('/tenants', params).subscribe(r => {
      this.tenants.set(r.data);
      this.total.set(r.total);
      this.totalPages.set(r.totalPages);
    });
  }

  loadPlans() {
    this.api.get<Plan[]>('/plans').subscribe(p => this.plans.set(p));
  }

  loadMetrics() {
    this.api.get<any>('/tenants/metrics/global').subscribe(m => this.metrics.set(m));
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.loadTenants(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.loadTenants(); } }

  suspend(t: Tenant) {
    this.api.post(`/tenants/${t.id}/suspend`, { reason: 'Suspendido por el administrador' }).subscribe(() => {
      this.loadTenants();
      this.loadMetrics();
    });
  }

  activate(t: Tenant) {
    this.api.post(`/tenants/${t.id}/activate`, {}).subscribe(() => {
      this.loadTenants();
      this.loadMetrics();
    });
  }

  openAssignPlan(t: Tenant) {
    this.assignPlanId = t.subscriptions?.[0]?.planId || '';
    this.assignPlanModal.set(t);
  }

  doAssignPlan() {
    const t = this.assignPlanModal();
    if (!t || !this.assignPlanId) return;
    this.saving.set(true);
    this.api.post(`/tenants/${t.id}/assign-plan`, { planId: this.assignPlanId, billingCycle: this.assignBillingCycle }).subscribe({
      next: () => { this.saving.set(false); this.assignPlanModal.set(null); this.loadTenants(); },
      error: () => this.saving.set(false),
    });
  }

  openConvertDemo(t: Tenant) {
    if (this.plans().length > 0) this.convertPlanId = this.plans()[0].id;
    this.convertDemoModal.set(t);
  }

  doConvertDemo() {
    const t = this.convertDemoModal();
    if (!t || !this.convertPlanId) return;
    this.saving.set(true);
    this.api.post(`/tenants/${t.id}/demo-convert`, { planId: this.convertPlanId, billingCycle: this.convertBillingCycle }).subscribe({
      next: () => { this.saving.set(false); this.convertDemoModal.set(null); this.loadTenants(); this.loadMetrics(); },
      error: () => this.saving.set(false),
    });
  }

  onLogoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.logoFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => { this.logoPreview.set(e.target?.result as string); this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  openModal() {
    this.form = this.emptyForm();
    this.generatePassword();
    this.logoFile.set(null);
    this.logoPreview.set(null);
    this.createMode.set('paid');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); this.logoFile.set(null); this.logoPreview.set(null); this.createError.set(''); }

  createTenant() {
    this.createError.set('');
    if (!this.form.name || !this.form.email || !this.form.adminFirstName || !this.form.adminLastName || !this.form.adminPassword) {
      this.createError.set('Completa todos los campos obligatorios (*)');
      return;
    }
    this.saving.set(true);
    const isDemo = this.createMode() === 'demo';
    const selectedPlan = this.plans().find(p => p.id === this.form.planId);

    const endpoint = isDemo ? '/tenants/demo' : '/tenants';
    const payload = isDemo
      ? {
          name: this.form.name, slug: this.form.slug, email: this.form.email,
          phone: this.form.phone, country: this.form.country,
          adminFirstName: this.form.adminFirstName, adminLastName: this.form.adminLastName,
          adminPassword: this.form.adminPassword, adminCi: this.form.adminCi || undefined,
          clinicName: this.form.clinicName || this.form.name,
          demodays: this.form.demodays,
        }
      : {
          name: this.form.name, slug: this.form.slug, email: this.form.email,
          phone: this.form.phone || undefined, country: this.form.country,
          adminFirstName: this.form.adminFirstName, adminLastName: this.form.adminLastName,
          adminPassword: this.form.adminPassword, adminCi: this.form.adminCi || undefined,
          clinicName: this.form.clinicName || this.form.name,
          planId: this.form.planId || undefined,
          billingCycle: this.form.billingCycle,
        };

    this.api.post(endpoint, payload).subscribe({
      next: (created: any) => {
        const tenantId = created?.id || created?.tenant?.id;
        const uploadAndFinish = () => {
          this.saving.set(false);
          this.closeModal();
          this.loadTenants();
          this.loadMetrics();
          this.createdTenant.set({
            id: tenantId,
            name: this.form.name,
            email: this.form.email,
            tempPassword: this.form.adminPassword,
            planName: selectedPlan?.name || '',
            isDemo,
            demoDays: isDemo ? this.form.demodays : undefined,
            adminFirstName: this.form.adminFirstName,
            adminLastName: this.form.adminLastName,
            adminCi: this.form.adminCi,
            billingCycle: this.form.billingCycle,
          });
        };
        if (this.logoFile() && tenantId) {
          const fd = new FormData();
          fd.append('logo', this.logoFile()!);
          this.api.upload(`/uploads/tenants/${tenantId}/logo`, fd).subscribe({
            next: () => uploadAndFinish(),
            error: () => uploadAndFinish(),
          });
        } else {
          uploadAndFinish();
        }
      },
      error: (err: any) => {
        this.saving.set(false);
        this.createError.set(err?.error?.message || 'Error al crear el tenant. Verifica que el email y slug no estén en uso.');
        this.cdr.markForCheck();
      },
    });
  }

  openAssignPlanFromSuccess() {
    const ct = this.createdTenant();
    if (!ct) return;
    const tenant = this.tenants().find(t => t.id === ct.id);
    if (tenant) {
      this.createdTenant.set(null);
      this.openAssignPlan(tenant);
    }
  }

  openConvertDemoFromSuccess() {
    const ct = this.createdTenant();
    if (!ct) return;
    const tenant = this.tenants().find(t => t.id === ct.id);
    if (tenant) {
      this.createdTenant.set(null);
      this.openConvertDemo(tenant);
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  getActiveSub(t: Tenant): Subscription | null {
    return t.subscriptions?.[0] ?? null;
  }

  isDemoSub(sub: Subscription): boolean {
    return sub.status === 'TRIALING' || !!(sub.metadata?.isDemoAccount);
  }

  daysRemaining(sub: Subscription): number {
    const end = new Date(sub.currentPeriodEnd);
    const now = new Date();
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  tenantStatusClass(s: string) {
    const map: Record<string, string> = { ACTIVE: 'badge-green', SUSPENDED: 'badge-red', TRIAL: 'badge-yellow', CANCELLED: 'badge-gray' };
    return map[s] || 'badge-gray';
  }

  printContract() {
    const ct = this.createdTenant();
    if (!ct) return;
    const today = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });
    const adminName = `${ct.adminFirstName || ''} ${ct.adminLastName || ''}`.trim();
    const planLabel = ct.isDemo
      ? `Cuenta Demo — ${ct.demoDays} días`
      : `${ct.planName || 'Sin plan'} (${ct.billingCycle === 'ANNUAL' ? 'Anual' : 'Mensual'})`;
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Contrato de Suscripción — ClinicOS</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; font-size: 13px; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 20px; text-align: center; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 2px; }
  .subtitle { text-align: center; font-size: 12px; color: #555; margin-bottom: 30px; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; letter-spacing: 1px; }
  .row { display: flex; gap: 8px; margin-bottom: 6px; }
  .label { font-weight: bold; min-width: 160px; }
  .credential-box { background: #f5f5f5; border: 1px solid #ccc; padding: 12px 16px; border-radius: 4px; font-family: monospace; font-size: 12px; margin: 8px 0; }
  .credential-box .item { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .terms { font-size: 11px; line-height: 1.7; color: #333; text-align: justify; }
  .terms p { margin-bottom: 10px; }
  .sign-row { display: flex; justify-content: space-between; margin-top: 50px; gap: 40px; }
  .sign-box { flex: 1; text-align: center; border-top: 1px solid #555; padding-top: 8px; font-size: 11px; }
  .footer { text-align: center; font-size: 10px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { body { padding: 25px; } }
</style></head><body>
<h1>ClinicOS</h1>
<p class="subtitle">Sistema de Gestión para Clínicas — clinicos.app</p>
<div class="section">
  <div class="section-title">Contrato de Suscripción de Servicio SaaS</div>
  <div class="row"><span class="label">Fecha:</span> ${today}</div>
  <div class="row"><span class="label">N° de Contrato:</span> ${Date.now()}</div>
</div>
<div class="section">
  <div class="section-title">Datos del Cliente</div>
  <div class="row"><span class="label">Empresa / Clínica:</span> ${ct.name}</div>
  <div class="row"><span class="label">Administrador:</span> ${adminName || 'N/A'}</div>
  ${ct.adminCi ? `<div class="row"><span class="label">Carnet de Identidad:</span> ${ct.adminCi}</div>` : ''}
  <div class="row"><span class="label">Correo electrónico:</span> ${ct.email}</div>
</div>
<div class="section">
  <div class="section-title">Plan Contratado</div>
  <div class="row"><span class="label">Plan:</span> ${planLabel}</div>
  <div class="credential-box">
    <div class="item"><span>URL del Sistema:</span><span>https://clinicos.app</span></div>
    <div class="item"><span>Email de acceso:</span><span>${ct.email}</span></div>
    <div class="item"><span>Contraseña inicial:</span><span>${ct.tempPassword}</span></div>
  </div>
  <p style="font-size:11px;color:#c00;margin-top:4px;">⚠️ El usuario deberá cambiar su contraseña al primer inicio de sesión.</p>
</div>
<div class="section">
  <div class="section-title">Términos y Condiciones</div>
  <div class="terms">
    <p><strong>1. NATURALEZA DEL SERVICIO.</strong> ClinicOS es un servicio de software en la nube (SaaS) prestado bajo modalidad de suscripción. El presente contrato NO implica la venta, transferencia de propiedad ni licencia perpetua del software. El cliente adquiere el derecho de uso del sistema por el período acordado, sujeto al pago puntual de la suscripción.</p>
    <p><strong>2. ACCESO Y USO.</strong> El acceso al sistema estará disponible mientras la suscripción se encuentre activa y pagada. ClinicOS se reserva el derecho de suspender el acceso en caso de incumplimiento de pago o violación de los presentes términos.</p>
    <p><strong>3. CONFIDENCIALIDAD.</strong> Los datos clínicos y personales almacenados en el sistema son propiedad del cliente. ClinicOS garantiza la confidencialidad de los mismos y no los compartirá con terceros sin autorización expresa, salvo requerimiento legal.</p>
    <p><strong>4. SOPORTE.</strong> Se proveerá soporte técnico por los canales establecidos. Las actualizaciones del sistema se incluyen sin costo adicional durante la vigencia de la suscripción.</p>
    <p><strong>5. RENOVACIÓN Y CANCELACIÓN.</strong> La suscripción se renueva automáticamente al término del período contratado. El cliente podrá cancelar con 7 días de anticipación al vencimiento. No se realizan devoluciones por períodos parciales.</p>
    <p><strong>6. RESPONSABILIDAD.</strong> ClinicOS no se hace responsable por pérdida de datos ocasionada por fuerza mayor, mal uso del sistema o falta de copias de seguridad por parte del cliente.</p>
    <p>Al utilizar el sistema, el cliente acepta los presentes términos en su totalidad.</p>
  </div>
</div>
<div class="sign-row">
  <div class="sign-box">
    <p>${adminName || 'El Cliente'}</p>
    ${ct.adminCi ? `<p>C.I.: ${ct.adminCi}</p>` : ''}
    <p>El Cliente</p>
  </div>
  <div class="sign-box">
    <p>Ing. Hugo Porcel Aliaga</p>
    <p>C.I.: 7487187</p>
    <p>Fundador y CEO — ClinicOS</p>
  </div>
</div>
<div class="footer">
  ClinicOS · clinicos.app · Soporte: +591 75455488 · Cochabamba, Bolivia<br>
  Este documento fue generado automáticamente el ${today}
</div>
</body></html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  }

  generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
    let suffix = '';
    for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    this.form.adminPassword = 'CLINICOS@' + suffix;
    this.cdr.markForCheck();
  }

  private emptyForm() {
    return {
      name: '', slug: '', email: '', country: 'BO', phone: '',
      adminFirstName: '', adminLastName: '', adminCi: '', adminPassword: '',
      planId: '', clinicName: '', billingCycle: 'MONTHLY', demodays: 7,
    };
  }
}
