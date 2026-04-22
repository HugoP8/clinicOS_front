import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';

interface PaymentModal {
  appointmentId: string;
  patientName: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  pending: number;
  treatments: string;
}

@Component({
  selector: 'app-accounts-receivable',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-slide-up">
      <div class="page-header">
        <div>
          <h1 class="page-title">Cuentas por Cobrar</h1>
          <p class="page-subtitle">Pacientes con saldos pendientes de pago</p>
        </div>
        <button (click)="load()" class="btn-secondary">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Actualizar
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="card p-5 border-l-4 border-red-500">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Deuda Total Pendiente</p>
          <p class="text-3xl font-bold text-red-600">Bs. {{ (stats()?.totalOutstanding || 0) | number:'1.2-2' }}</p>
        </div>
        <div class="card p-5 border-l-4 border-amber-400">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pacientes con Saldo</p>
          <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ stats()?.count || 0 }}</p>
          <p class="text-xs text-slate-400 mt-0.5">cuentas abiertas</p>
        </div>
        <div class="card p-5 border-l-4 border-blue-400">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Deuda Promedio</p>
          <p class="text-3xl font-bold text-blue-600">
            Bs. {{ stats()?.count ? ((stats()!.totalOutstanding / stats()!.count) | number:'1.2-2') : '0.00' }}
          </p>
          <p class="text-xs text-slate-400 mt-0.5">por paciente</p>
        </div>
      </div>

      <!-- Búsqueda + Filtros -->
      <div class="card p-4 flex flex-wrap gap-3 items-center">
        <div class="relative flex-1 min-w-48">
          <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" [(ngModel)]="search" placeholder="Buscar por nombre o teléfono..." class="input pl-9">
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div> Alta (&gt;Bs.500)
          <div class="w-2.5 h-2.5 rounded-full bg-amber-400 ml-2"></div> Media
          <div class="w-2.5 h-2.5 rounded-full bg-slate-300 ml-2"></div> Baja
        </div>
      </div>

      <!-- Tabla principal -->
      <div class="card overflow-hidden">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Teléfono</th>
                <th class="text-right">Deuda Total</th>
                <th class="text-center">Citas</th>
                <th>Desde</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                @for (_ of [1,2,3,4]; track $index) {
                  <tr><td colspan="6"><div class="h-5 bg-slate-100 dark:bg-slate-700 rounded animate-pulse my-1"></div></td></tr>
                }
              } @else {
                @for (p of filteredPatients(); track p.patient.id) {
                  <!-- Fila del paciente -->
                  <tr (click)="toggleExpand(p.patient.id)"
                      class="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      [ngClass]="expandedId() === p.patient.id ? 'bg-slate-50 dark:bg-slate-800/30' : ''">
                    <td>
                      <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                             [class]="p.totalDebt > 500 ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : p.totalDebt > 200 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-700'">
                          {{ p.patient.firstName[0] }}{{ p.patient.lastName[0] }}
                        </div>
                        <div>
                          <p class="font-semibold text-sm text-slate-900 dark:text-white">{{ p.patient.firstName }} {{ p.patient.lastName }}</p>
                          @if (p.appointments.length > 1) {
                            <p class="text-xs text-slate-400">{{ p.appointments.length }} citas pendientes</p>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="text-sm text-slate-500">{{ p.patient.phone }}</td>
                    <td class="text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <div class="w-2 h-2 rounded-full flex-shrink-0"
                             [class]="p.totalDebt > 500 ? 'bg-red-500' : p.totalDebt > 200 ? 'bg-amber-400' : 'bg-slate-300'"></div>
                        <span class="font-bold text-red-600 text-sm">Bs. {{ p.totalDebt | number:'1.2-2' }}</span>
                      </div>
                    </td>
                    <td class="text-center">
                      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 text-xs font-bold">
                        {{ p.appointments.length }}
                      </span>
                    </td>
                    <td class="text-sm text-slate-400">{{ p.oldestDebtDate | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <div class="flex items-center justify-center gap-1.5" (click)="$event.stopPropagation()">
                        <!-- WhatsApp recordatorio -->
                        <button (click)="sendReminder(p)"
                                title="Enviar recordatorio WhatsApp"
                                class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M11.5 2C6.26 2 2 6.26 2 11.5S6.26 21 11.5 21c1.716 0 3.315-.47 4.694-1.284l4.713 1.284-1.284-4.713C20.53 14.815 21 13.216 21 11.5 21 6.26 16.74 2 11.5 2z"/>
                          </svg>
                        </button>
                        <!-- Expandir / Contraer -->
                        <button class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          <svg class="w-4 h-4 transition-transform" [class.rotate-180]="expandedId() === p.patient.id"
                               fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <!-- Fila expandida con detalle de citas -->
                  @if (expandedId() === p.patient.id) {
                    <tr>
                      <td colspan="6" class="p-0">
                        <div class="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-800/30 border-t border-b border-slate-200 dark:border-slate-700">
                          <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                            <h4 class="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                              Detalle de citas — {{ p.patient.firstName }} {{ p.patient.lastName }}
                            </h4>
                            <span class="text-xs text-red-600 font-semibold">Total pendiente: Bs. {{ p.totalDebt | number:'1.2-2' }}</span>
                          </div>
                          <div class="divide-y divide-slate-100 dark:divide-slate-700/50">
                            @for (apt of p.appointments; track apt.id) {
                              <div class="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-white/80 dark:hover:bg-slate-700/20 transition-colors">
                                <!-- Info cita -->
                                <div class="flex-1">
                                  <div class="flex items-center gap-2 mb-1">
                                    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                      {{ apt.scheduledAt | date:'EEEE dd/MM/yyyy' : '' : 'es' }}
                                    </span>
                                  </div>
                                  @if (apt.treatments.length > 0) {
                                    <p class="text-xs text-slate-500 pl-5">{{ apt.treatments.join(' · ') }}</p>
                                  }
                                </div>
                                <!-- Montos -->
                                <div class="flex items-center gap-4 text-xs shrink-0">
                                  <div class="text-right">
                                    <p class="text-slate-400">Total cita</p>
                                    <p class="font-semibold text-slate-700 dark:text-slate-300">Bs. {{ apt.totalAmount | number:'1.2-2' }}</p>
                                  </div>
                                  <div class="text-right">
                                    <p class="text-slate-400">Pagado</p>
                                    <p class="font-semibold text-emerald-600">Bs. {{ apt.paidAmount | number:'1.2-2' }}</p>
                                  </div>
                                  <div class="text-right">
                                    <p class="text-slate-400">Pendiente</p>
                                    <p class="font-bold text-red-600 text-sm">Bs. {{ apt.pending | number:'1.2-2' }}</p>
                                  </div>
                                  <!-- Progress bar -->
                                  <div class="w-16 hidden sm:block">
                                    <div class="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div class="h-full bg-emerald-500 rounded-full transition-all"
                                           [style.width.%]="apt.totalAmount > 0 ? (apt.paidAmount / apt.totalAmount * 100) : 0"></div>
                                    </div>
                                    <p class="text-xs text-center text-slate-400 mt-0.5">
                                      {{ apt.totalAmount > 0 ? (apt.paidAmount / apt.totalAmount * 100 | number:'1.0-0') : 0 }}%
                                    </p>
                                  </div>
                                  <!-- Botón pago -->
                                  @if (isAdmin()) {
                                    <button (click)="openPayModal(p.patient, apt)"
                                            class="btn-primary text-xs px-3 py-1.5 shrink-0 flex items-center gap-1.5">
                                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                      </svg>
                                      Registrar Pago
                                    </button>
                                  }
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center py-16 text-slate-400">
                      @if (!loading()) {
                        <div>
                          <svg class="w-12 h-12 mx-auto mb-3 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          <p class="font-semibold text-slate-600 dark:text-slate-300">¡Todo al día!</p>
                          <p class="text-xs mt-1">No hay cuentas pendientes de cobro</p>
                        </div>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════
         SECCIÓN PREMIUM — Análisis de Pagos por Paciente
    ═════════════════════════════════════════════════════ -->
    @if (isPremiumOrHigher()) {
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Análisis de Pagos por Paciente</h2>
            <p class="text-xs text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Función Premium — Historial completo + Score crediticio
            </p>
          </div>
        </div>

        <!-- Buscador de pacientes -->
        <div class="card p-4">
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="relative flex-1">
              <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" [(ngModel)]="historySearch"
                     placeholder="Buscar paciente para ver su historial..."
                     class="input pl-9" (input)="onHistorySearch()">
            </div>
            @if (historyPatientId()) {
              <button (click)="clearHistory()" class="btn-secondary text-sm shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                Limpiar
              </button>
            }
          </div>
          <!-- Resultados de búsqueda de pacientes -->
          @if (historySearchResults().length > 0 && !historyPatientId()) {
            <div class="mt-3 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              @for (p of historySearchResults(); track p.patient.id) {
                <button (click)="loadHistory(p.patient.id, p.patient.firstName + ' ' + p.patient.lastName)"
                        class="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                       [class]="p.totalDebt > 500 ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-violet-100 text-violet-600 dark:bg-violet-900/30'">
                    {{ p.patient.firstName[0] }}{{ p.patient.lastName[0] }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ p.patient.firstName }} {{ p.patient.lastName }}</p>
                    <p class="text-xs text-slate-400">{{ p.patient.phone }}</p>
                  </div>
                  @if (p.totalDebt > 0) {
                    <span class="text-xs font-bold text-red-600 shrink-0">Bs. {{ p.totalDebt | number:'1.2-2' }} pendiente</span>
                  } @else {
                    <span class="text-xs font-semibold text-emerald-600 shrink-0">Al día</span>
                  }
                </button>
              }
            </div>
          }
        </div>

        <!-- Historial del paciente seleccionado -->
        @if (historyLoading()) {
          <div class="card p-8 flex items-center justify-center gap-3 text-slate-400">
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span class="text-sm">Cargando historial...</span>
          </div>
        } @else if (historyData()) {
          @let analysis = historyData()!.analysis;
          @let timeline = historyData()!.timeline;

          <!-- Score + KPIs -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Score crediticio -->
            <div class="card p-5 md:col-span-1 flex flex-col items-center justify-center gap-2">
              <p class="text-xs font-bold text-slate-500 uppercase tracking-wide">Score Crediticio</p>
              <div class="relative w-24 h-24">
                <svg class="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" stroke-width="2.5"/>
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    [attr.stroke]="analysis.scoreColor === 'emerald' ? '#10b981' : analysis.scoreColor === 'blue' ? '#3b82f6' : analysis.scoreColor === 'amber' ? '#f59e0b' : '#ef4444'"
                    stroke-width="2.5"
                    [attr.stroke-dasharray]="analysis.score + ', 100'"
                    stroke-linecap="round"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-2xl font-black"
                    [class]="analysis.scoreColor === 'emerald' ? 'text-emerald-600' : analysis.scoreColor === 'blue' ? 'text-blue-600' : analysis.scoreColor === 'amber' ? 'text-amber-600' : 'text-red-600'">
                    {{ analysis.score }}
                  </span>
                  <span class="text-[10px] text-slate-400">/100</span>
                </div>
              </div>
              <span class="text-sm font-bold px-3 py-1 rounded-full"
                [class]="analysis.scoreColor === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : analysis.scoreColor === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : analysis.scoreColor === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'">
                {{ analysis.scoreLabel }}
              </span>
            </div>
            <!-- KPIs -->
            <div class="card p-5 md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p class="text-xs text-slate-500 mb-1">Tasa de Cobro</p>
                <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ analysis.collectionRate }}%</p>
                <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1.5">
                  <div class="h-1 bg-emerald-500 rounded-full" [style.width.%]="analysis.collectionRate"></div>
                </div>
              </div>
              <div>
                <p class="text-xs text-slate-500 mb-1">Pagos Completos</p>
                <p class="text-2xl font-bold text-emerald-600">{{ analysis.paidFull }}</p>
                <p class="text-xs text-slate-400">de {{ analysis.totalAppointments }} citas</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 mb-1">Total Facturado</p>
                <p class="text-lg font-bold text-slate-900 dark:text-white">Bs. {{ analysis.totalInvoiced | number:'1.0-0' }}</p>
                <p class="text-xs text-emerald-600">Cobrado: Bs. {{ analysis.totalCollected | number:'1.0-0' }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 mb-1">Deuda Acumulada</p>
                <p class="text-lg font-bold text-red-600">Bs. {{ analysis.totalPending | number:'1.0-0' }}</p>
                <p class="text-xs text-slate-400">sin cobrar</p>
              </div>
            </div>
          </div>

          <!-- Recomendación IA -->
          <div class="card p-4 border-l-4"
            [class]="analysis.scoreColor === 'emerald' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : analysis.scoreColor === 'blue' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : analysis.scoreColor === 'amber' ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10' : 'border-red-500 bg-red-50 dark:bg-red-900/10'">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 mt-0.5 shrink-0"
                [class]="analysis.scoreColor === 'emerald' ? 'text-emerald-600' : analysis.scoreColor === 'blue' ? 'text-blue-600' : analysis.scoreColor === 'amber' ? 'text-amber-600' : 'text-red-600'"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              <div>
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-0.5">Análisis IA — Recomendación</p>
                <p class="text-sm text-slate-700 dark:text-slate-300 font-medium">{{ analysis.recommendation }}</p>
              </div>
            </div>
          </div>

          <!-- Línea de tiempo de pagos -->
          <div class="card overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 class="font-bold text-sm text-slate-900 dark:text-white">Línea de Tiempo — Historial Completo</h3>
              <span class="text-xs text-slate-400">{{ timeline.length }} citas registradas</span>
            </div>
            <div class="p-5">
              <div class="relative">
                <!-- Línea vertical -->
                <div class="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                <div class="space-y-6">
                  @for (item of timeline; track item.id) {
                    <div class="relative flex gap-4">
                      <!-- Dot -->
                      <div class="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2"
                           [class]="item.isPaid ? 'bg-emerald-100 border-emerald-400 dark:bg-emerald-900/30' : item.isPartial ? 'bg-amber-100 border-amber-400 dark:bg-amber-900/30' : item.totalAmount === 0 ? 'bg-slate-100 border-slate-300 dark:bg-slate-700' : 'bg-red-100 border-red-400 dark:bg-red-900/30'">
                        @if (item.isPaid) {
                          <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                        } @else if (item.isPartial) {
                          <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        } @else {
                          <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        }
                      </div>
                      <!-- Contenido -->
                      <div class="flex-1 min-w-0 pb-1">
                        <div class="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {{ item.scheduledAt | date:'dd/MM/yyyy' : '' }}
                              <span class="ml-2 text-xs font-normal text-slate-400">{{ item.scheduledAt | date:'HH:mm' }}</span>
                            </p>
                            @if (item.treatments.length > 0) {
                              <p class="text-xs text-slate-500 mt-0.5">{{ item.treatments.join(' · ') }}</p>
                            }
                          </div>
                          <div class="text-right">
                            <p class="text-sm font-bold"
                               [class]="item.isPaid ? 'text-emerald-600' : item.isPartial ? 'text-amber-600' : 'text-red-600'">
                              {{ item.isPaid ? 'Pagado' : item.isPartial ? 'Parcial' : item.totalAmount === 0 ? 'Sin cargo' : 'Sin pago' }}
                            </p>
                            @if (item.totalAmount > 0) {
                              <p class="text-xs text-slate-400">
                                Bs. {{ item.paidAmount | number:'1.2-2' }} / Bs. {{ item.totalAmount | number:'1.2-2' }}
                              </p>
                            }
                          </div>
                        </div>
                        <!-- Barra de progreso -->
                        @if (item.totalAmount > 0) {
                          <div class="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all"
                                 [class]="item.isPaid ? 'bg-emerald-500' : item.isPartial ? 'bg-amber-400' : 'bg-red-400'"
                                 [style.width.%]="item.paymentPct"></div>
                          </div>
                        }
                        <!-- Registros de pago individuales -->
                        @if (item.payments.length > 0) {
                          <div class="mt-2 flex flex-wrap gap-1.5">
                            @for (pay of item.payments; track pay.id) {
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                {{ pay.method === 'CASH' ? '💵' : pay.method === 'CARD' ? '💳' : pay.method === 'TRANSFER' ? '🏦' : '📱' }}
                                Bs. {{ pay.amount | number:'1.2-2' }} · {{ pay.paidAt | date:'dd/MM' }}
                              </span>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

        } @else if (!historyPatientId()) {
          <div class="card p-10 text-center text-slate-400">
            <svg class="w-12 h-12 mx-auto mb-3 text-violet-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <p class="font-semibold text-slate-500 dark:text-slate-400">Busca un paciente para ver su historial de pagos y análisis crediticio</p>
            <p class="text-xs mt-1">Puedes buscar entre todos los pacientes del sistema</p>
          </div>
        }
      </div>
    } @else {
      <!-- Banner upgrade para no-Premium -->
      <div class="card p-6 border-2 border-violet-200 dark:border-violet-800/50 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-md">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-black text-slate-900 dark:text-white text-base">Análisis de Pagos con IA</h3>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white">PREMIUM</span>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Desbloquea el historial completo de pagos de cada paciente con un <strong>score crediticio inteligente</strong> para tomar mejores decisiones de crédito.
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              @for (feat of premiumFeatures; track feat.label) {
                <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span class="text-base">{{ feat.icon }}</span>
                  <span class="text-xs">{{ feat.label }}</span>
                </div>
              }
            </div>
            <a href="https://wa.me/59175455488?text=Hola%20Ing.%20Hugo%2C%20quiero%20actualizar%20a%20Plan%20Premium%20para%20usar%20el%20An%C3%A1lisis%20de%20Pagos%20con%20IA"
               target="_blank"
               class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.115 1.528 5.843L.057 23.428a.5.5 0 00.623.612l5.684-1.49A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.88 0-3.645-.514-5.157-1.41l-.37-.22-3.377.885.9-3.288-.24-.38A9.944 9.944 0 012 12C2 6.478 6.478 2 12 2s10 4.478 10 10-4.478 10-10 10z"/>
              </svg>
              Hazte Premium — WhatsApp +591 75455488
            </a>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════════════════════════
         MODAL — Registrar Pago
    ══════════════════════════════════════════════════════ -->
    @if (payModal()) {
      <div class="modal-overlay" (click)="closePayModal()">
        <div class="modal-center">
          <div class="modal w-full max-w-md" (click)="$event.stopPropagation()">

            <!-- Header -->
            <div class="bg-gradient-to-r from-primary-600 to-primary-700 rounded-t-2xl px-6 py-4 text-white">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="font-bold text-lg">Registrar Pago</h2>
                  <p class="text-primary-200 text-xs mt-0.5">{{ payModal()!.patientName }}</p>
                </div>
                <button (click)="closePayModal()" class="text-primary-200 hover:text-white transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="p-6 space-y-5">
              <!-- Resumen cita -->
              <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-slate-500">Cita</span>
                  <span class="font-medium">{{ payModal()!.date | date:'dd/MM/yyyy' }}</span>
                </div>
                @if (payModal()!.treatments) {
                  <div class="flex justify-between">
                    <span class="text-slate-500">Tratamiento</span>
                    <span class="font-medium text-right max-w-40 truncate">{{ payModal()!.treatments }}</span>
                  </div>
                }
                <div class="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 space-y-1">
                  <div class="flex justify-between">
                    <span class="text-slate-500">Total cita</span>
                    <span>Bs. {{ payModal()!.totalAmount | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Ya pagado</span>
                    <span class="text-emerald-600">Bs. {{ payModal()!.paidAmount | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between font-bold">
                    <span class="text-red-600">Saldo pendiente</span>
                    <span class="text-red-600">Bs. {{ payModal()!.pending | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>

              <!-- Botones rápidos de monto -->
              <div>
                <label class="label">Monto a pagar</label>
                <div class="flex gap-2 mb-2 flex-wrap">
                  <button (click)="setPayAmount(payModal()!.pending)"
                          class="text-xs px-3 py-1.5 rounded-lg border border-primary-300 text-primary-600 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:border-primary-700 font-semibold">
                    Total (Bs. {{ payModal()!.pending | number:'1.2-2' }})
                  </button>
                  @if (payModal()!.pending > 50) {
                    <button (click)="setPayAmount(+(payModal()!.pending / 2).toFixed(2))"
                            class="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                      50% (Bs. {{ payModal()!.pending / 2 | number:'1.2-2' }})
                    </button>
                  }
                </div>
                <input type="number" [(ngModel)]="payForm.amount" [max]="payModal()!.pending" min="1"
                       class="input" placeholder="0.00" step="0.50">
              </div>

              <!-- Método de pago -->
              <div>
                <label class="label">Método de pago</label>
                <div class="grid grid-cols-2 gap-2">
                  @for (m of payMethods; track m.value) {
                    <button (click)="payForm.method = m.value"
                            class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium"
                            [ngClass]="payForm.method === m.value
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'">
                      <span class="text-lg">{{ m.icon }}</span>
                      {{ m.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Referencia (opcional) -->
              @if (payForm.method !== 'CASH') {
                <div>
                  <label class="label">Referencia / N° de transacción <span class="text-slate-400">(opcional)</span></label>
                  <input [(ngModel)]="payForm.reference" class="input" placeholder="Ej: TXN-123456">
                </div>
              }

              <!-- Mensaje de éxito/error -->
              @if (paySuccess()) {
                <div class="alert alert-success text-sm">
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  Pago registrado correctamente
                </div>
              }
              @if (payError()) {
                <div class="alert alert-error text-sm">{{ payError() }}</div>
              }
            </div>

            <!-- Footer -->
            <div class="px-6 pb-6 flex gap-3">
              <button (click)="closePayModal()" class="btn-secondary flex-1" [disabled]="paying()">Cancelar</button>
              <button (click)="submitPayment()"
                      class="btn-primary flex-1"
                      [disabled]="paying() || !payForm.amount || !payForm.method">
                @if (paying()) {
                  <svg class="w-4 h-4 animate-spin mr-1.5 inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                }
                {{ paying() ? 'Registrando...' : 'Confirmar Pago' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AccountsReceivableComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private branchCtx = inject(BranchContextService);
  private cdr = inject(ChangeDetectorRef);

  isAdmin = computed(() => ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(this.auth.currentUser()?.role || ''));
  isPremiumOrHigher = computed(() => {
    if (this.auth.currentUser()?.role === 'SUPER_ADMIN') return true;
    return this.auth.isPremiumOrHigher();
  });

  patients = signal<any[]>([]);
  stats = signal<any>(null);
  loading = signal(false);
  expandedId = signal<string | null>(null);
  search = '';

  // Premium — historial de pagos
  historySearch = '';
  historyPatientId = signal<string | null>(null);
  historyData = signal<any>(null);
  historyLoading = signal(false);

  historySearchResults = computed(() => {
    const s = this.historySearch.toLowerCase().trim();
    if (!s || s.length < 2) return [];
    // Search across all loaded patients + any from the full list
    return this.patients().filter(p =>
      `${p.patient.firstName} ${p.patient.lastName}`.toLowerCase().includes(s) ||
      p.patient.phone?.includes(s)
    ).slice(0, 8);
  });

  premiumFeatures = [
    { icon: '📊', label: 'Score crediticio 0-100' },
    { icon: '⏱️', label: 'Línea de tiempo' },
    { icon: '🤖', label: 'Recomendación IA' },
    { icon: '💰', label: 'Tasa de cobro' },
  ];

  // Payment modal
  payModal = signal<PaymentModal | null>(null);
  payForm = { amount: 0, method: 'CASH', reference: '' };
  paying = signal(false);
  paySuccess = signal(false);
  payError = signal('');

  payMethods = [
    { value: 'CASH', label: 'Efectivo', icon: '💵' },
    { value: 'CARD', label: 'Tarjeta', icon: '💳' },
    { value: 'TRANSFER', label: 'Transferencia', icon: '🏦' },
    { value: 'QR', label: 'QR / Tigo', icon: '📱' },
  ];

  filteredPatients = computed(() => {
    const s = this.search.toLowerCase();
    if (!s) return this.patients();
    return this.patients().filter(p =>
      `${p.patient.firstName} ${p.patient.lastName}`.toLowerCase().includes(s) ||
      p.patient.phone?.includes(s)
    );
  });

  constructor() {
    effect(() => {
      this.branchCtx.activeBranchId(); // track
      this.load();
    });
  }

  ngOnInit() {}

  load() {
    this.loading.set(true);
    const params: any = {};
    if (this.auth.currentUser()?.role !== 'SUPER_ADMIN') {
      const branchId = this.branchCtx.activeBranchId();
      if (branchId) params.branchId = branchId;
    }
    this.api.get<any>('/appointments/accounts-receivable', params).subscribe({
      next: (res: any) => {
        this.patients.set(res?.patients || []);
        this.stats.set({ totalOutstanding: res?.totalOutstanding || 0, count: res?.count || 0 });
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  toggleExpand(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  openPayModal(patient: any, apt: any) {
    this.payForm = { amount: apt.pending, method: 'CASH', reference: '' };
    this.paySuccess.set(false);
    this.payError.set('');
    this.payModal.set({
      appointmentId: apt.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      date: apt.scheduledAt,
      totalAmount: apt.totalAmount,
      paidAmount: apt.paidAmount,
      pending: apt.pending,
      treatments: apt.treatments?.join(', ') || '',
    });
  }

  closePayModal() {
    if (this.paying()) return;
    this.payModal.set(null);
    if (this.paySuccess()) this.load(); // reload if payment was made
  }

  setPayAmount(amount: number) {
    this.payForm.amount = amount;
  }

  submitPayment() {
    const modal = this.payModal();
    if (!modal || !this.payForm.amount || !this.payForm.method) return;
    if (this.payForm.amount <= 0 || this.payForm.amount > modal.pending) {
      this.payError.set('El monto debe ser mayor a 0 y no superar el saldo pendiente');
      return;
    }

    this.paying.set(true);
    this.payError.set('');

    const body: any = {
      amount: this.payForm.amount,
      method: this.payForm.method,
    };
    if (this.payForm.reference) body.reference = this.payForm.reference;

    this.api.post(`/appointments/${modal.appointmentId}/payments`, body).subscribe({
      next: () => {
        this.paying.set(false);
        this.paySuccess.set(true);
        this.cdr.markForCheck();
        // Auto-close and reload after 1.5s
        setTimeout(() => {
          this.payModal.set(null);
          this.load();
        }, 1500);
      },
      error: (err: any) => {
        this.paying.set(false);
        this.payError.set(err?.error?.message || 'Error al registrar el pago');
        this.cdr.markForCheck();
      },
    });
  }

  onHistorySearch() {
    if (!this.historySearch.trim()) this.historyPatientId.set(null);
    this.cdr.markForCheck();
  }

  loadHistory(patientId: string, patientName: string) {
    this.historyPatientId.set(patientId);
    this.historySearch = patientName;
    this.historyLoading.set(true);
    this.historyData.set(null);
    this.api.get<any>(`/appointments/payment-history/${patientId}`).subscribe({
      next: (res: any) => {
        this.historyData.set(res);
        this.historyLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.historyLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  clearHistory() {
    this.historyPatientId.set(null);
    this.historyData.set(null);
    this.historySearch = '';
    this.cdr.markForCheck();
  }

  sendReminder(p: any) {
    const phone = (p.patient.whatsapp || p.patient.phone || '').replace(/\D/g, '');
    if (!phone) return;
    const msg = encodeURIComponent(
      `Estimado/a ${p.patient.firstName}, le recordamos que tiene un saldo pendiente de Bs. ${Number(p.totalDebt).toFixed(2)}. Por favor contáctenos para regularizar su cuenta. Gracias.`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }
}
