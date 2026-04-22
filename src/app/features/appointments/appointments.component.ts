import {
  Component, inject, signal, computed, OnInit, ChangeDetectionStrategy,
  ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit, effect,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { Appointment } from '../../core/models';
import { format, parseISO, addDays, subDays, isToday, startOfDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// Hours shown in board: 7am to 8pm
const BOARD_START_HOUR = 7;
const BOARD_END_HOUR = 20;
const SLOT_HEIGHT_PX = 60; // pixels per hour
const HEADER_HEIGHT_PX = 64;

interface DoctorColumn {
  id: string;
  name: string;
  specialty: string; // joined string
  color: string;
  appointments: Appointment[];
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Toast notification -->
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
    <div class="space-y-4 animate-slide-up">

      <!-- SUPER_ADMIN filter bar -->
      @if (isSuperAdmin()) {
        <div class="card p-3 flex flex-wrap items-center gap-3">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Filtrar:</span>
          <select class="input input-sm w-48" [value]="filterTenantId()" (change)="onTenantChange($any($event.target).value)">
            <option value="">Todos los tenants</option>
            @for (t of tenants(); track t.id) {
              <option [value]="t.id">{{ t.name }}</option>
            }
          </select>
          @if (filterTenantId()) {
            <select class="input input-sm w-48" [value]="filterClinicId()" (change)="onClinicChange($any($event.target).value)">
              <option value="">Todas las clínicas</option>
              @for (c of clinicsFilter(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          }
          @if (filterTenantId() || filterClinicId()) {
            <button class="btn-ghost text-xs py-1 px-2" (click)="clearSuperFilters()">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Limpiar
            </button>
          }
        </div>
      }

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Agenda</h1>
          <p class="page-subtitle">Vista de la clínica por doctor y horario</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <!-- View Toggle -->
          <div class="flex border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button (click)="view.set('board')"
              class="px-3 py-1.5 text-xs rounded-md transition-colors"
              [class.shadow-sm]="view()==='board'" [class.font-semibold]="view()==='board'"
              [class.text-slate-500]="view()!='board'"
              [ngClass]="view()==='board' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white' : ''">
              <svg class="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              Tablero
            </button>
            <button (click)="view.set('list')"
              class="px-3 py-1.5 text-xs rounded-md transition-colors"
              [class.shadow-sm]="view()==='list'" [class.font-semibold]="view()==='list'"
              [class.text-slate-500]="view()!='list'"
              [ngClass]="view()==='list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white' : ''">
              <svg class="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              Lista
            </button>
          </div>
          <button class="btn-secondary btn-sm flex items-center gap-1.5" (click)="openMonthModal()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Ver mes
          </button>
          @if (isReceptionist()) {
            <button class="btn-primary btn-sm" (click)="openNewModal()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Nueva Cita
            </button>
          }
        </div>
      </div>

      <!-- ═══ BOARD VIEW ═══ -->
      @if (view() === 'board') {
        <!-- Date navigation -->
        <div class="card p-3 flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-1">
            <button (click)="prevDay()" class="btn-ghost btn-icon btn-sm" title="Día anterior">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button (click)="goToday()" class="btn-sm px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              [class.btn-primary]="isSelectedToday()" [class.btn-secondary]="!isSelectedToday()">
              Hoy
            </button>
            <button (click)="nextDay()" class="btn-ghost btn-icon btn-sm" title="Día siguiente">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>

          <div class="flex items-center gap-2 flex-1">
            <input type="date" class="input w-auto text-sm" [value]="selectedDateStr()"
              (change)="onDateInput($any($event.target).value)">
            <h2 class="text-sm font-bold text-slate-800 dark:text-white capitalize">
              {{ formatDateLong(selectedDate()) }}
            </h2>
            @if (isSelectedToday()) {
              <span class="badge-green text-xs">Hoy</span>
            }
          </div>

          <!-- Status filter -->
          <select class="input input-sm w-40" [value]="boardStatusFilter()" (change)="boardStatusFilter.set($any($event.target).value)">
            <option value="">Todos los estados</option>
            <option value="SCHEDULED">Programadas</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="WAITING">En sala</option>
            <option value="IN_PROGRESS">En curso</option>
            <option value="COMPLETED">Completadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>

        <!-- Board loading -->
        @if (loading()) {
          <div class="card p-8 text-center">
            <div class="flex items-center justify-center gap-2 text-slate-400">
              <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span class="text-sm">Cargando agenda...</span>
            </div>
          </div>
        } @else if (doctorColumns().length === 0) {
          <div class="card p-12 text-center">
            <svg class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
            </svg>
            <p class="text-slate-500 font-medium">No hay doctores disponibles</p>
            <p class="text-sm text-slate-400 mt-1">Registra médicos para ver su agenda aquí</p>
          </div>
        } @else {
          <!-- Board container with horizontal scroll -->
          <div class="card overflow-hidden">
            <!-- Board header: doctor names -->
            <div class="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-20">
              <!-- Time column header -->
              <div class="w-16 shrink-0 border-r border-slate-200 dark:border-slate-700 p-2 flex items-end justify-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hora</span>
              </div>
              <!-- Horizontal scroll wrapper for doctor headers -->
              <div class="flex overflow-x-auto no-scrollbar flex-1" id="board-header">
                @for (doc of doctorColumns(); track doc.id) {
                  <div class="min-w-[180px] w-[180px] flex-shrink-0 px-3 py-2.5 border-r last:border-r-0 border-slate-200 dark:border-slate-700">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        [style.background-color]="doc.color">
                        {{ doc.name[0] }}
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs font-bold text-slate-800 dark:text-white truncate">{{ doc.name }}</p>
                        <p class="text-[10px] text-slate-400 truncate">{{ doc.specialty || '—' }}</p>
                      </div>
                    </div>
                    <div class="mt-1 flex items-center gap-1.5">
                      <span class="text-[10px] text-slate-400">{{ doc.appointments.length }} cita{{ doc.appointments.length !== 1 ? 's' : '' }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Board body: time slots + appointments -->
            <div class="flex overflow-hidden">
              <!-- Time labels (sticky left) -->
              <div class="w-16 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                @for (hour of boardHours; track hour) {
                  <div class="border-b border-slate-100 dark:border-slate-700/50 flex items-start justify-end pr-2 pt-1"
                    [style.height.px]="SLOT_HEIGHT_PX">
                    <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500">{{ hour }}:00</span>
                  </div>
                }
              </div>

              <!-- Doctor columns with horizontal scroll (synced with header) -->
              <div class="flex overflow-x-auto flex-1 scroll-board" (scroll)="syncScroll($event)">
                @for (doc of doctorColumns(); track doc.id) {
                  <div class="min-w-[180px] w-[180px] flex-shrink-0 relative border-r last:border-r-0 border-slate-200 dark:border-slate-700">
                    <!-- Hour grid lines -->
                    @for (hour of boardHours; track hour) {
                      <div class="border-b border-slate-100 dark:border-slate-700/50 absolute w-full"
                        [style.top.px]="(hour - BOARD_START_HOUR) * SLOT_HEIGHT_PX"
                        [style.height.px]="SLOT_HEIGHT_PX">
                      </div>
                    }
                    <!-- Total grid height spacer -->
                    <div [style.height.px]="(BOARD_END_HOUR - BOARD_START_HOUR) * SLOT_HEIGHT_PX"></div>

                    <!-- Appointment blocks -->
                    @for (apt of doc.appointments; track apt.id) {
                      <div class="absolute left-1 right-1 rounded-lg p-1.5 cursor-pointer transition-all hover:shadow-md hover:z-10 overflow-hidden group"
                        [style.top.px]="getAptTop(apt)"
                        [style.height.px]="getAptHeight(apt)"
                        [style.min-height.px]="28"
                        [ngClass]="aptBlockClass(apt.status)"
                        (click)="openDetail(apt)"
                        [title]="apt.patient?.firstName + ' ' + apt.patient?.lastName">
                        <p class="text-[11px] font-bold leading-tight truncate">{{ apt.patient?.firstName }} {{ apt.patient?.lastName }}</p>
                        @if (getAptHeight(apt) >= 44) {
                          <p class="text-[10px] leading-tight opacity-80 truncate">{{ formatTime(apt.scheduledAt) }} · {{ apt.durationMinutes }}min</p>
                        }
                        @if (getAptHeight(apt) >= 58) {
                          <div class="mt-0.5">
                            @for (t of (apt.treatments || []).slice(0,1); track t.id) {
                              <p class="text-[10px] opacity-70 truncate">{{ t.treatment?.name }}</p>
                            }
                          </div>
                        }
                        <!-- Indicador de pago (esquina inferior derecha) -->
                        @if (apt.paymentStatus && apt.paymentStatus !== 'PAID') {
                          <div class="absolute bottom-1 right-1"
                               [title]="apt.paymentStatus === 'PARTIAL' ? 'Pago parcial' : 'Pago pendiente'">
                            <div class="w-2 h-2 rounded-full"
                                 [class.bg-amber-500]="apt.paymentStatus === 'PARTIAL'"
                                 [class.bg-red-500]="apt.paymentStatus === 'PENDING'"></div>
                          </div>
                        }
                        @if (apt.paymentStatus === 'PAID') {
                          <div class="absolute bottom-1 right-1" title="Pagado">
                            <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                          </div>
                        }
                        <!-- Hover action: ver detalle -->
                        <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                          </svg>
                        </div>
                      </div>
                    }

                    <!-- Current time indicator (only for today) -->
                    @if (isSelectedToday() && currentTimeTop() !== null) {
                      <div class="absolute left-0 right-0 z-10 pointer-events-none"
                        [style.top.px]="currentTimeTop()!">
                        <div class="w-2 h-2 rounded-full bg-red-500 absolute -left-1 -top-1"></div>
                        <div class="border-t-2 border-red-500 border-dashed w-full"></div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Board legend -->
          <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 px-1">
            <span class="font-semibold">Estado:</span>
            @for (s of statusLegend; track s.key) {
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-3 rounded" [ngClass]="s.bg"></div>
                <span>{{ s.label }}</span>
              </div>
            }
            <span class="mx-2 text-slate-300">|</span>
            <span class="font-semibold">Pago:</span>
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span>Pagado</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-amber-500"></div>
              <span>Parcial</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Pendiente</span>
            </div>
            <span class="ml-auto text-slate-400 italic">Click en una cita para ver detalles</span>
          </div>
        }
      }

      <!-- ═══ LIST VIEW ═══ -->
      @if (view() === 'list') {
        <!-- Filters -->
        <div class="card p-4 flex flex-wrap gap-3 items-center">
          <input type="date" [(ngModel)]="listFilters.dateFrom" (change)="loadList()" class="input w-auto text-sm">
          <span class="text-slate-400 text-xs">al</span>
          <input type="date" [(ngModel)]="listFilters.dateTo" (change)="loadList()" class="input w-auto text-sm">
          <select [(ngModel)]="listFilters.status" (change)="loadList()" class="input w-auto text-sm">
            <option value="">Todos los estados</option>
            <option value="SCHEDULED">Programada</option>
            <option value="CONFIRMED">Confirmada</option>
            <option value="COMPLETED">Completada</option>
            <option value="CANCELLED">Cancelada</option>
            <option value="NO_SHOW">No se presentó</option>
          </select>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Doctor</th>
                  <th>Fecha y Hora</th>
                  <th>Tratamientos</th>
                  <th>Estado</th>
                  <th>Pago</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @if (loading()) {
                  @for (_ of [1,2,3,4,5]; track $index) {
                    <tr><td colspan="7"><div class="skeleton-text w-3/4 my-1"></div></td></tr>
                  }
                } @else {
                  @for (apt of listAppointments(); track apt.id) {
                    <tr>
                      <td>
                        <div class="font-medium text-slate-900 dark:text-white">{{ apt.patient?.firstName }} {{ apt.patient?.lastName }}</div>
                        <div class="text-xs text-slate-500">{{ apt.patient?.phone }}</div>
                      </td>
                      <td class="text-sm">{{ apt.doctor?.user?.firstName }} {{ apt.doctor?.user?.lastName }}</td>
                      <td>
                        <div class="font-medium flex items-center gap-1.5">
                          {{ formatDate(apt.scheduledAt) }}
                          @if (isPast(apt.scheduledAt) && !['COMPLETED','CANCELLED','NO_SHOW','RESCHEDULED'].includes(apt.status)) {
                            <span class="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-semibold">ya pasó</span>
                          }
                        </div>
                        <div class="text-xs text-slate-500">{{ formatTime(apt.scheduledAt) }} · {{ apt.durationMinutes }}min</div>
                      </td>
                      <td>
                        <div class="flex flex-wrap gap-1">
                          @for (t of (apt.treatments || []).slice(0,2); track t.id) {
                            <span class="badge-blue text-xs">{{ t.treatment?.name }}</span>
                          }
                          @if ((apt.treatments?.length || 0) > 2) {
                            <span class="badge-gray text-xs">+{{ (apt.treatments?.length || 0) - 2 }}</span>
                          }
                        </div>
                      </td>
                      <td><span [class]="statusClass(apt.status)">{{ statusLabel(apt.status) }}</span></td>
                      <td>
                        <div class="text-sm font-medium">Bs. {{ apt.paidAmount | number:'1.2-2' }}</div>
                        <div class="text-xs" [class]="apt.paymentStatus === 'PAID' ? 'text-emerald-500' : 'text-amber-500'">
                          {{ apt.paymentStatus === 'PAID' ? 'Pagado' : 'Pendiente' }}
                        </div>
                      </td>
                      <td>
                        <div class="flex items-center gap-1">
                          <button (click)="openDetail(apt)" class="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Ver detalle">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          </button>
                          @if (apt.status === 'SCHEDULED') {
                            <button (click)="updateStatus(apt.id, 'CONFIRMED')" class="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded" title="Confirmar asistencia">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                            </button>
                          }
                          @if (apt.status === 'CONFIRMED') {
                            <button (click)="updateStatus(apt.id, 'WAITING')" class="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded" title="Paciente llegó — pasar a sala de espera">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </button>
                          }
                          @if (apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED' || apt.status === 'WAITING') {
                            <button (click)="updateStatus(apt.id, 'CANCELLED')" class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Cancelar">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7">
                        <div class="empty-state py-12">
                          <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                          </svg>
                          <p class="empty-state-title">Sin citas en este período</p>
                          <p class="empty-state-desc">Cambia el rango de fechas o crea una nueva cita</p>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
          @if (listTotal() > listPageSize) {
            <div class="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm text-slate-500">
              <span>{{ listTotal() }} citas en total</span>
              <div class="flex gap-2">
                <button class="btn-secondary btn-sm" [disabled]="listPage() <= 1" (click)="listPage.update(p=>p-1); loadList()">Anterior</button>
                <button class="btn-secondary btn-sm" [disabled]="listPage() * listPageSize >= listTotal()" (click)="listPage.update(p=>p+1); loadList()">Siguiente</button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- ═══ DETAIL MODAL ═══ -->
    @if (detailApt()) {
      <div class="modal-overlay" (click)="detailApt.set(null)">
        <div class="modal-center">
          <div class="modal modal-xl animate-slide-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  [ngClass]="aptIconBg(detailApt()!.status)">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="modal-title">Detalle de Cita</h2>
                  <p class="text-xs text-slate-400">{{ formatDate(detailApt()!.scheduledAt) }} · {{ formatTime(detailApt()!.scheduledAt) }}</p>
                </div>
              </div>
              <button (click)="detailApt.set(null)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="modal-body space-y-4">
              <!-- Estado -->
              <div class="flex items-center justify-between">
                <span [class]="statusClass(detailApt()!.status) + ' text-sm px-3 py-1'">{{ statusLabel(detailApt()!.status) }}</span>
                <span class="text-sm text-slate-500">{{ detailApt()!.durationMinutes }} min</span>
              </div>

              <!-- Banner: registrada a destiempo -->
              @if (detailApt()!.createdAt && detailApt()!.scheduledAt && isCreatedLate(detailApt()!)) {
                <div class="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-3.5 py-2.5">
                  <svg class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  <div class="text-xs text-amber-700 dark:text-amber-300">
                    <p class="font-semibold mb-0.5">Cita registrada a destiempo</p>
                    <p>Esta cita fue programada para las <strong>{{ formatTime(detailApt()!.scheduledAt) }}</strong> del <strong>{{ formatDate(detailApt()!.scheduledAt) }}</strong>, pero fue registrada en el sistema el <strong>{{ formatDate(detailApt()!.createdAt!) }}</strong> a las <strong>{{ formatTime(detailApt()!.createdAt!) }}</strong>.</p>
                  </div>
                </div>
              }

              <!-- Paciente -->
              <div class="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Paciente</p>
                <p class="font-semibold text-slate-900 dark:text-white text-base">
                  {{ detailApt()!.patient?.firstName }} {{ detailApt()!.patient?.lastName }}
                </p>
                @if (detailApt()!.patient?.phone) {
                  <a [href]="'tel:' + detailApt()!.patient?.phone" class="flex items-center gap-1.5 text-sm text-slate-500 mt-1 hover:text-primary-600">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    {{ detailApt()!.patient?.phone }}
                  </a>
                }
                @if (detailApt()!.patient?.email) {
                  <a [href]="'mailto:' + detailApt()!.patient?.email" class="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5 hover:text-primary-600">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    {{ detailApt()!.patient?.email }}
                  </a>
                }
              </div>

              <!-- Doctor -->
              <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 shrink-0">
                  {{ (detailApt()!.doctor?.user?.firstName || '?')[0] }}{{ (detailApt()!.doctor?.user?.lastName || '')[0] }}
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">Doctor</p>
                  <p class="font-medium text-slate-900 dark:text-white">
                    Dr. {{ detailApt()!.doctor?.user?.firstName }} {{ detailApt()!.doctor?.user?.lastName }}
                  </p>
                  @if ((detailApt()!.doctor?.specialties?.length || 0) > 0) {
                    <p class="text-xs text-slate-400">{{ detailApt()!.doctor?.specialties?.join(', ') }}</p>
                  }
                </div>
              </div>

              <!-- Tratamientos -->
              @if ((detailApt()!.treatments?.length || 0) > 0) {
                <div>
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Tratamientos</p>
                  <div class="divide-y divide-slate-100 dark:divide-slate-700 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                    @for (t of detailApt()!.treatments || []; track t.id) {
                      <div class="px-3 py-2 bg-white dark:bg-slate-800/50">
                        <div class="flex items-start justify-between gap-2">
                          <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.treatment?.name || 'Tratamiento' }}</span>
                          <span class="text-sm font-bold text-slate-900 dark:text-white shrink-0">Bs. {{ t.totalPrice | number:'1.2-2' }}</span>
                        </div>
                        <div class="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                          <span>{{ t.quantity }} × Bs. {{ t.unitPrice | number:'1.2-2' }}</span>
                          @if ((t.discount || 0) > 0) {
                            <span class="text-emerald-500 font-medium">−{{ t.discount }}% descuento</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Notas -->
              @if (detailApt()!.notes) {
                <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                  <p class="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">Notas</p>
                  <p class="text-sm text-amber-800 dark:text-amber-200">{{ detailApt()!.notes }}</p>
                </div>
              }

              <!-- Pago -->
              <div class="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl space-y-2">
                @let apt2 = detailApt()!;
                @let subtotalTx = (apt2.treatments || []).reduce((s, t) => s + (+(t.unitPrice || 0)) * (+(t.quantity || 1)), 0);
                @let hasDiscountTx = subtotalTx > 0 && (apt2.totalAmount || 0) > 0 && subtotalTx > (apt2.totalAmount || 0) + 0.009;
                @let discountAmtTx = hasDiscountTx ? subtotalTx - (apt2.totalAmount || 0) : 0;
                @let saldoPendiente = (apt2.totalAmount || 0) > (apt2.paidAmount || 0) ? (apt2.totalAmount || 0) - (apt2.paidAmount || 0) : 0;

                <!-- Header -->
                <div class="flex items-center justify-between">
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">Resumen de Pago</p>
                  <div class="flex items-center gap-2">
                    <span [class]="apt2.paymentStatus === 'PAID' ? 'badge-green' : apt2.paymentStatus === 'PARTIAL' ? 'badge-yellow' : 'badge-red'">
                      {{ apt2.paymentStatus === 'PAID' ? 'Pagado' : apt2.paymentStatus === 'PARTIAL' ? 'Parcial' : 'Pendiente' }}
                    </span>
                    @if (isAccountant() && apt2.paymentStatus !== 'PAID' && apt2.status !== 'CANCELLED') {
                      <button (click)="showPayForm.set(!showPayForm())" class="btn-sm text-xs px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                        {{ showPayForm() ? 'Cancelar' : '+ Registrar pago' }}
                        @if (apt2.status === 'NO_SHOW') { <span class="opacity-75">(a destiempo)</span> }
                      </button>
                    }
                  </div>
                </div>

                <!-- Breakdown -->
                <div class="space-y-1 text-sm mt-1">
                  @if (hasDiscountTx) {
                    <div class="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span>Bs. {{ subtotalTx | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Descuento aplicado</span>
                      <span>− Bs. {{ discountAmtTx | number:'1.2-2' }}</span>
                    </div>
                  }
                  @if ((apt2.totalAmount || 0) > 0) {
                    <div class="flex justify-between font-semibold text-slate-700 dark:text-slate-200 border-t border-slate-200 dark:border-slate-600 pt-1.5">
                      <span>Total facturado</span>
                      <span>Bs. {{ apt2.totalAmount | number:'1.2-2' }}</span>
                    </div>
                  }
                  <div class="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Total pagado</span>
                    <span class="font-medium">Bs. {{ apt2.paidAmount | number:'1.2-2' }}</span>
                  </div>
                  @if (saldoPendiente > 0.009) {
                    <div class="flex items-center justify-between font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg px-2.5 py-2 mt-1">
                      <span class="flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Saldo pendiente
                      </span>
                      <span>Bs. {{ saldoPendiente | number:'1.2-2' }}</span>
                    </div>
                  }
                </div>

                <!-- Historial de pagos -->
                @if ((apt2.payments?.length || 0) > 0) {
                  <div class="pt-2 border-t border-slate-200 dark:border-slate-600">
                    <p class="text-xs text-slate-400 mb-1.5 font-medium">Historial de pagos</p>
                    <div class="space-y-1">
                      @for (p of apt2.payments || []; track p.id) {
                        <div class="flex items-center justify-between text-xs bg-white dark:bg-slate-800/60 rounded-lg px-2.5 py-1.5">
                          <span class="text-slate-500 dark:text-slate-400">
                            {{ p.method === 'CASH' ? 'Efectivo' : p.method === 'CARD' ? 'Tarjeta' : p.method === 'TRANSFER' ? 'Transferencia' : p.method === 'QR' ? 'QR' : 'Otro' }}
                            @if (p.reference) { <span class="text-slate-300 dark:text-slate-600 ml-1">· {{ p.reference }}</span> }
                          </span>
                          <span class="text-slate-400 text-[10px]">{{ p.paidAt | date:'dd/MM/yy HH:mm' }}</span>
                          <span class="font-semibold text-emerald-600 dark:text-emerald-400">Bs. {{ p.amount | number:'1.2-2' }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Registrar pago form -->
                @if (showPayForm()) {
                  <div class="pt-2 border-t border-slate-200 dark:border-slate-600 space-y-3">
                    @if ((apt2.totalAmount || 0) === 0) {
                      <div class="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2">
                        <svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p class="text-xs text-amber-700 dark:text-amber-300">Esta cita no tiene monto registrado. Ingresa el total a cobrar o deja en 0 si fue gratuita.</p>
                      </div>
                      <div>
                        <label class="label text-xs">Total de la cita (Bs.)</label>
                        <input type="number" [(ngModel)]="payForm.totalAmountOverride" class="input text-sm" placeholder="Monto total de la cita" min="0" step="0.01">
                      </div>
                    }
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="label text-xs">Monto a pagar (Bs.) *</label>
                        <input type="number" [(ngModel)]="payForm.amount" class="input text-sm" placeholder="0.00" min="0.01" step="0.01">
                      </div>
                      <div>
                        <label class="label text-xs">Método</label>
                        <select [(ngModel)]="payForm.method" class="input text-sm">
                          <option value="CASH">Efectivo</option>
                          <option value="CARD">Tarjeta</option>
                          <option value="TRANSFER">Transferencia</option>
                          <option value="QR">QR</option>
                          <option value="OTHER">Otro</option>
                        </select>
                      </div>
                    </div>
                    <input [(ngModel)]="payForm.observations" class="input text-sm" placeholder="Observaciones (opcional)">
                    <button (click)="savePayment()" [disabled]="savingPay() || !payForm.amount" class="btn-primary w-full btn-sm text-sm">
                      {{ savingPay() ? 'Guardando...' : 'Registrar pago' }}
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Historia clínica (si existe) -->
            @if (getClinicalData(detailApt()!)) {
              <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30 space-y-2">
                <p class="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Historia Clínica
                </p>
                @if (getClinicalData(detailApt()!)!.chiefComplaint) {
                  <div><span class="text-xs text-blue-400 font-semibold">Motivo:</span> <span class="text-sm text-blue-800 dark:text-blue-200">{{ getClinicalData(detailApt()!)!.chiefComplaint }}</span></div>
                }
                @if (getClinicalData(detailApt()!)!.diagnosis) {
                  <div><span class="text-xs text-blue-400 font-semibold">Dx:</span> <span class="text-sm text-blue-800 dark:text-blue-200">{{ getClinicalData(detailApt()!)!.diagnosis }}</span></div>
                }
                @if (getClinicalData(detailApt()!)!.clinicalNotes) {
                  <div><span class="text-xs text-blue-400 font-semibold">Procedimiento:</span> <span class="text-sm text-blue-800 dark:text-blue-200">{{ getClinicalData(detailApt()!)!.clinicalNotes }}</span></div>
                }
                @if (getClinicalData(detailApt()!)!.observations) {
                  <div><span class="text-xs text-blue-400 font-semibold">Observ.:</span> <span class="text-sm text-blue-800 dark:text-blue-200">{{ getClinicalData(detailApt()!)!.observations }}</span></div>
                }
                @if (getClinicalData(detailApt()!)!.nextVisitRecommendation) {
                  <div><span class="text-xs text-blue-400 font-semibold">Próxima visita:</span> <span class="text-sm text-blue-800 dark:text-blue-200">{{ getClinicalData(detailApt()!)!.nextVisitRecommendation }}</span></div>
                }
                @if (getClinicalData(detailApt()!)!.materialsUsed?.length) {
                  <div>
                    <span class="text-xs text-blue-400 font-semibold">Materiales:</span>
                    <span class="text-sm text-blue-800 dark:text-blue-200 ml-1">
                      {{ formatMaterialsList(getClinicalData(detailApt()!)!.materialsUsed) }}
                    </span>
                  </div>
                }
                @if (odontogramHasEntries(detailApt()!)) {
                  <div>
                    <span class="text-xs text-blue-400 font-semibold block mb-1.5">Odontograma registrado:</span>
                    <div class="flex flex-wrap gap-1">
                      @for (entry of getOdontogramEntries(detailApt()!); track entry.key) {
                        <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                          [class.bg-red-100]="entry.value === 'caries'"
                          [class.text-red-700]="entry.value === 'caries'"
                          [class.bg-blue-100]="entry.value === 'restored'"
                          [class.text-blue-700]="entry.value === 'restored'"
                          [class.bg-slate-200]="entry.value === 'extracted'"
                          [class.text-slate-700]="entry.value === 'extracted'"
                          [class.bg-amber-100]="entry.value === 'crown'"
                          [class.text-amber-700]="entry.value === 'crown'">
                          Pza {{ entry.key }} — {{ toothStateLabel[$any(entry.value)] }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Actions footer -->
            <div class="modal-footer flex-wrap gap-2">
              @if (detailApt()!.status === 'SCHEDULED') {
                <button (click)="updateStatusFromDetail('CONFIRMED')" class="btn-success btn-sm flex items-center gap-1.5">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  Confirmar asistencia
                </button>
              }
              @if (detailApt()!.status === 'CONFIRMED') {
                <button (click)="updateStatusFromDetail('WAITING')" class="btn-sm flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-amber-500 rounded-xl px-3 py-2 text-sm font-semibold transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Paciente llegó
                </button>
              }
              @if ((detailApt()!.status === 'CONFIRMED' || detailApt()!.status === 'WAITING') && isDoctor()) {
                <button (click)="startAttention()" class="btn-primary btn-sm flex items-center gap-1.5">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Iniciar Atención
                </button>
              }
              @if (detailApt()!.status === 'IN_PROGRESS' && isDoctor()) {
                <button (click)="openClinicalFinish()" class="btn-primary btn-sm flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Finalizar Consulta
                </button>
              }
              @if (['SCHEDULED', 'CONFIRMED'].includes(detailApt()!.status) && isReceptionist()) {
                <button (click)="openRescheduleModal()" class="btn-sm flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-amber-500 rounded-xl px-3 py-2 text-sm font-semibold transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  Reprogramar
                </button>
              }
              @if (['SCHEDULED', 'CONFIRMED', 'WAITING'].includes(detailApt()!.status)) {
                <button (click)="updateStatusFromDetail('CANCELLED')" class="btn-danger btn-sm flex items-center gap-1.5">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  Cancelar Cita
                </button>
              }
              @if (detailApt()!.status === 'NO_SHOW' && isReceptionist()) {
                <button (click)="confirmLateAttendance()" class="btn-sm flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-3 py-2 text-sm font-semibold transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Confirmar asistencia <span class="opacity-75 text-xs">(a destiempo)</span>
                </button>
              }
              <button (click)="printAppointmentPdf(detailApt()!)" class="btn-sm flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2 text-sm font-semibold transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                Imprimir PDF
              </button>
              <button (click)="detailApt.set(null); showPayForm.set(false)" class="btn-secondary ml-auto">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ═══ MODAL FINALIZAR CONSULTA (Flujo Clínico) ═══ -->
    @if (showClinicalModal()) {
      <div class="modal-overlay" (click)="closeClinicalModal()">
        <div class="modal-center">
          <div class="modal modal-xl animate-slide-up" (click)="$event.stopPropagation()">

            <!-- Header con gradiente + info paciente -->
            <div class="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl px-6 py-4 flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-white font-bold text-base leading-tight">Historia Clínica — Registro de Consulta</h2>
                  <p class="text-emerald-100 text-xs mt-0.5">
                    <span class="font-semibold">{{ detailApt()?.patient?.firstName }} {{ detailApt()?.patient?.lastName }}</span>
                    @if (detailApt()?.doctor?.user) {
                      <span class="opacity-70 mx-1.5">·</span>
                      <span class="opacity-80">Dr. {{ detailApt()!.doctor!.user!.firstName }} {{ detailApt()!.doctor!.user!.lastName }}</span>
                    }
                    @if (detailApt()?.scheduledAt) {
                      <span class="opacity-70 mx-1.5">·</span>
                      <span class="opacity-80">{{ detailApt()!.scheduledAt | date:'d MMM yyyy, HH:mm':'':'es' }}</span>
                    }
                  </p>
                </div>
              </div>
              <button (click)="closeClinicalModal()" class="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors mt-0.5">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="modal-body space-y-0 p-0">

              <!-- ── Sección 1: Anamnesis ── -->
              <div class="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                    <svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z"/></svg>
                  </div>
                  <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Anamnesis</h3>
                  <span class="text-xs text-slate-400 font-normal">— Motivo y síntomas del paciente</span>
                </div>
                <div class="grid grid-cols-1 gap-3">
                  <div>
                    <label class="label text-xs">Motivo de consulta <span class="text-slate-400 font-normal">(qué refiere el paciente)</span></label>
                    <textarea [(ngModel)]="clinicalForm.chiefComplaint" class="input resize-none text-sm" rows="2"
                              placeholder="Ej: El paciente refiere dolor en muela inferior derecha desde hace 3 días..."></textarea>
                  </div>
                  <div>
                    <label class="label text-xs">Diagnóstico *</label>
                    <input [(ngModel)]="clinicalForm.diagnosis" class="input text-sm font-medium"
                           placeholder="Ej: Caries clase II en pieza 46, Gingivitis leve generalizada...">
                  </div>
                </div>
              </div>

              <!-- ── Sección 2: Procedimiento ── -->
              <div class="px-6 pt-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <svg class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  </div>
                  <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Procedimiento</h3>
                  <span class="text-xs text-slate-400 font-normal">— Qué hizo el doctor</span>
                </div>
                <div class="space-y-3">
                  <div>
                    <label class="label text-xs">Procedimientos realizados</label>
                    <textarea [(ngModel)]="clinicalForm.clinicalNotes" class="input resize-none text-sm" rows="3"
                              placeholder="Detalla paso a paso los procedimientos realizados durante la consulta. Ej: Se realizó extracción de pieza 46 bajo anestesia local, se aplicó analgésico postoperatorio..."></textarea>
                  </div>
                  <div>
                    <label class="label text-xs">Observaciones y evolución del paciente</label>
                    <textarea [(ngModel)]="clinicalForm.observations" class="input resize-none text-sm" rows="2"
                              placeholder="Estado del paciente, tolerancia al tratamiento, signos vitales si aplica..."></textarea>
                  </div>
                </div>
              </div>

              <!-- ── Sección 3: Odontograma ── -->
              <div class="px-6 pt-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                      <svg class="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                    </div>
                    <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Odontograma</h3>
                    <span class="text-xs text-slate-400 font-normal">— click en pieza para cambiar estado</span>
                  </div>
                  <div class="flex items-center gap-2.5 flex-wrap">
                    @for (s of toothStates; track s) {
                      <div class="flex items-center gap-1">
                        <div class="w-3 h-3 rounded border" [ngClass]="toothStateColors[s]"></div>
                        <span class="text-[11px] text-slate-500 dark:text-slate-400">{{ toothStateLabel[s] }}</span>
                      </div>
                    }
                  </div>
                </div>
                <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <p class="text-[10px] text-slate-400 text-center mb-2 font-semibold uppercase tracking-widest">Superior</p>
                  <div class="flex justify-center gap-0.5 mb-4">
                    @for (t of upperTeeth; track t) {
                      <button type="button" (click)="cycleToothState(t)"
                              class="w-7 h-9 rounded-md text-xs font-bold border-2 transition-all hover:scale-110 hover:shadow-md flex flex-col items-center justify-center"
                              [ngClass]="toothClass(t)"
                              [title]="'Diente ' + t + ': ' + toothStateLabel[clinicalForm.odontogram[t] || 'healthy']">
                        <span class="text-[9px] leading-none">{{ t }}</span>
                      </button>
                    }
                  </div>
                  <div class="h-px bg-slate-200 dark:bg-slate-600 mx-6 mb-4"></div>
                  <p class="text-[10px] text-slate-400 text-center mb-2 font-semibold uppercase tracking-widest">Inferior</p>
                  <div class="flex justify-center gap-0.5">
                    @for (t of lowerTeeth; track t) {
                      <button type="button" (click)="cycleToothState(t)"
                              class="w-7 h-9 rounded-md text-xs font-bold border-2 transition-all hover:scale-110 hover:shadow-md flex flex-col items-center justify-center"
                              [ngClass]="toothClass(t)"
                              [title]="'Diente ' + t + ': ' + toothStateLabel[clinicalForm.odontogram[t] || 'healthy']">
                        <span class="text-[9px] leading-none">{{ t }}</span>
                      </button>
                    }
                  </div>
                  @if (odontogramMarkedCount() > 0) {
                    <p class="text-xs text-violet-600 dark:text-violet-400 mt-3 text-center font-medium">
                      {{ odontogramMarkedCount() }} pieza(s) marcada(s) como afectadas
                    </p>
                  }
                </div>
              </div>

              <!-- ── Sección 4: Plan y Seguimiento ── -->
              <div class="px-6 pt-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <svg class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Plan de Seguimiento</h3>
                </div>
                <div>
                  <label class="label text-xs">Recomendación próxima visita <span class="text-slate-400 font-normal">(opcional)</span></label>
                  <input [(ngModel)]="clinicalForm.nextVisitRecommendation" class="input text-sm"
                         placeholder="Ej: Control en 30 días, Continuar tratamiento ortopédico en 2 semanas...">
                </div>
              </div>

              <!-- ── Sección 5: Materiales ── -->
              <div class="px-6 pt-4 pb-5">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                      <svg class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                    </div>
                    <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Materiales utilizados</h3>
                    <span class="text-xs text-slate-400 font-normal">— descuenta inventario</span>
                  </div>
                  <button (click)="addMaterialRow()" type="button"
                          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Agregar
                  </button>
                </div>
                @if (clinicalForm.materials.length === 0) {
                  <div class="flex flex-col items-center justify-center py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-xs">
                    <svg class="w-8 h-8 mb-1.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                    Sin materiales — presiona "Agregar" si se utilizaron insumos
                  </div>
                }
                <div class="space-y-2">
                  @for (mat of clinicalForm.materials; track $index; let i = $index) {
                    <div class="flex gap-2 items-center p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div class="flex-1">
                        <select [(ngModel)]="mat.itemId" (change)="onMaterialSelect(i)" class="input input-sm text-sm border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <option value="">Seleccionar insumo...</option>
                          @for (inv of inventoryItems(); track inv.itemId) {
                            <option [value]="inv.itemId">{{ inv.name }} (stock: {{ inv.stock }})</option>
                          }
                        </select>
                      </div>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <span class="text-xs text-slate-400">Cant.:</span>
                        <input type="number" [(ngModel)]="mat.quantity" min="1" class="input input-sm w-16 text-sm text-center" placeholder="1">
                      </div>
                      <button (click)="removeMaterialRow(i)" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  }
                </div>
              </div>

              @if (clinicalError()) {
                <div class="mx-6 mb-4 alert alert-error text-sm">{{ clinicalError() }}</div>
              }
            </div>

            <div class="modal-footer border-t border-slate-100 dark:border-slate-700">
              <button (click)="closeClinicalModal()" class="btn-secondary" [disabled]="savingClinical()">Cancelar</button>
              <button (click)="submitClinicalFinish()" class="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 gap-2"
                      [disabled]="savingClinical() || !clinicalForm.diagnosis">
                @if (savingClinical()) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                }
                {{ savingClinical() ? 'Guardando...' : 'Guardar y Completar Consulta' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ═══ NEW APPOINTMENT MODAL ═══ -->
    @if (showNewModal()) {
      <div class="modal-overlay" (click)="closeNewModal()">
        <div class="modal-center">
          <div class="modal modal-xl animate-slide-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Nueva Cita</h2>
              <button (click)="closeNewModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body space-y-4">
              <!-- Buscar paciente -->
              <div>
                <label class="label">Paciente *</label>
                <input [(ngModel)]="newForm.patientSearch" (input)="searchPatients()" class="input" placeholder="Buscar por nombre o teléfono...">
                @if (patientResults().length) {
                  <div class="mt-1 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                    @for (p of patientResults(); track p.id) {
                      <button (click)="selectPatient(p)" class="w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-sm border-b last:border-0 border-slate-100 dark:border-slate-700 transition-colors">
                        <span class="font-medium">{{ p.firstName }} {{ p.lastName }}</span>
                        <span class="text-slate-400 ml-2">{{ p.phone }}</span>
                      </button>
                    }
                  </div>
                }
                @if (newForm.patientId) {
                  <p class="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    Paciente seleccionado
                  </p>
                }
                @if (lastVisitHint()) {
                  @let hint = lastVisitHint()!;
                  @let isNoShow = hint.status === 'NO_SHOW';
                  @let isCancelled = hint.status === 'CANCELLED' || hint.status === 'RESCHEDULED';
                  <div class="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg border transition-colors"
                    [ngClass]="isNoShow
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : isCancelled
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'">
                    <svg class="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      [ngClass]="isNoShow ? 'text-red-500' : isCancelled ? 'text-amber-500' : 'text-blue-500'">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs" [ngClass]="isNoShow ? 'text-red-700 dark:text-red-300' : isCancelled ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'">
                        Última cita el <strong>{{ hint.scheduledAt | date:'d MMM yyyy':'':'es' }}</strong>
                        con <strong>Dr. {{ hint.doctorName }}</strong>
                        @if (hint.branchName) { en <strong>{{ hint.branchName }}</strong> }
                        @if (!isNoShow && !isCancelled) { — doctor y sucursal precargados }
                      </p>
                      @if (isNoShow) {
                        <p class="text-xs text-red-600 dark:text-red-400 font-semibold mt-0.5">⚠ No asistió a su última cita</p>
                      } @else if (isCancelled) {
                        <p class="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Su última cita fue cancelada / reprogramada</p>
                      }
                    </div>
                  </div>
                }
                @if (noHistoryHint()) {
                  <div class="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600">
                    <svg class="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Paciente nuevo — sin historial de citas en el sistema</p>
                  </div>
                }
                @if (todayAptWarning() > 0) {
                  <div class="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 animate-fade-in">
                    <svg class="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <div>
                      <p class="text-xs font-semibold text-red-700 dark:text-red-300">
                        Este paciente ya tiene {{ todayAptWarning() }} cita{{ todayAptWarning() > 1 ? 's' : '' }} agendada{{ todayAptWarning() > 1 ? 's' : '' }} para hoy
                      </p>
                      <p class="text-xs text-red-500 dark:text-red-400 mt-0.5">Puedes continuar si así lo requiere el paciente.</p>
                    </div>
                  </div>
                }
              </div>

              <!-- Sucursal -->
              <div>
                <label class="label">Sucursal *</label>
                <select [(ngModel)]="newForm.branchId" (change)="onModalBranchChange($any($event.target).value)" class="input">
                  <option value="">Seleccionar sucursal</option>
                  @for (b of branchCtx.branches(); track b.id) {
                    <option [value]="b.id">{{ b.name }}</option>
                  }
                </select>
              </div>

              <!-- Doctor -->
              <div>
                <label class="label">Doctor *</label>
                <select [ngModel]="newForm.doctorId" (change)="onDoctorChange($any($event.target).value)" class="input">
                  <option value="">Seleccionar doctor</option>
                  @for (d of modalDoctors(); track d.id) {
                    <option [value]="d.id">Dr. {{ d.user?.firstName }} {{ d.user?.lastName }}{{ (d.specialties?.length) ? ' — ' + d.specialties[0] : '' }}</option>
                  }
                </select>
                @if (newForm.branchId && modalDoctors().length === 0) {
                  <p class="text-xs text-amber-500 mt-1">No hay doctores con horario en esta sucursal</p>
                }
              </div>

              <!-- Fecha y hora -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">Fecha *</label>
                  <input [ngModel]="newForm.date" (change)="onNewFormDateChange($any($event.target).value)" type="date" class="input">
                </div>
                <div>
                  <label class="label">Hora *</label>
                  <input [(ngModel)]="newForm.time" type="time" class="input" [class.border-red-400]="isTimeConflict()">
                </div>
              </div>

              <!-- Doctor Availability Panel -->
              @if (newForm.doctorId && newForm.date) {
                <div class="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div class="bg-slate-50 dark:bg-slate-800/60 px-3 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                    <span class="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      Agenda del doctor
                    </span>
                    @if (loadingAvailability()) {
                      <svg class="w-3.5 h-3.5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    }
                  </div>
                  <div class="p-3 space-y-2.5">
                    @if (doctorAvailability(); as avail) {
                      <!-- Horario de trabajo -->
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs text-slate-500 dark:text-slate-400">Horario {{ avail.dayName }}:</span>
                        @if (avail.schedule) {
                          <span class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-full px-2.5 py-0.5">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            {{ avail.schedule.startTime }} – {{ avail.schedule.endTime }}
                          </span>
                        } @else {
                          <span class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-full px-2.5 py-0.5">Sin horario definido</span>
                        }
                      </div>

                      <!-- Citas ocupadas -->
                      @if (avail.busySlots.length > 0) {
                        <div>
                          <p class="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Horas ocupadas:</p>
                          <div class="flex flex-wrap gap-1.5">
                            @for (slot of avail.busySlots; track slot.id) {
                              <button type="button" (click)="selectBusySlotTime(slot.end)"
                                class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-opacity"
                                [class]="slot.start <= newForm.time && newForm.time < slot.end
                                  ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 ring-2 ring-red-400'
                                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100'"
                                [title]="'Cita de ' + slot.patient + ' — click para agendar después'">
                                🔴 {{ slot.start }}–{{ slot.end }}
                                <span class="text-red-400 dark:text-red-500 font-normal">{{ slot.patient.split(' ')[0] }}</span>
                              </button>
                            }
                          </div>
                          <p class="text-xs text-slate-400 mt-1">Click en una cita para sugerir hora siguiente disponible</p>
                        </div>
                      } @else {
                        <div class="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                          Sin citas agendadas — día libre
                        </div>
                      }

                      <!-- Alerta de conflicto -->
                      @if (isTimeConflict()) {
                        <div class="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                          <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                          <span><strong>Conflicto de horario</strong> — el doctor ya tiene una cita en ese horario</span>
                        </div>
                      }
                    } @else if (!loadingAvailability()) {
                      <p class="text-xs text-slate-400">Selecciona doctor y fecha para ver disponibilidad</p>
                    }
                  </div>
                </div>
              }

              @if (newForm.date && newForm.time && isNewFormPast()) {
                <div class="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  La fecha/hora seleccionada ya pasó — la cita se creará como atrasada
                </div>
              }
              @if (newForm.time && isOutsideWorkingHours()) {
                <div class="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  La hora seleccionada está fuera del horario laboral del doctor ({{ doctorAvailability()?.schedule?.startTime }} – {{ doctorAvailability()?.schedule?.endTime }})
                </div>
              }

              <!-- Duración -->
              <div>
                <label class="label">Duración (minutos)</label>
                <select [(ngModel)]="newForm.duration" class="input">
                  <option [value]="15">15 min</option>
                  <option [value]="30">30 min</option>
                  <option [value]="45">45 min</option>
                  <option [value]="60">1 hora</option>
                  <option [value]="90">1h 30min</option>
                  <option [value]="120">2 horas</option>
                </select>
              </div>

              <!-- Tratamientos (opcional) -->
              <div class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div class="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Tratamientos (opcional)</span>
                  <span class="text-xs text-slate-400">Puedes agregar más durante la atención</span>
                </div>
                <div class="p-3 space-y-2">
                  @if (newModalTreatments().length === 0) {
                    <p class="text-xs text-slate-400 text-center py-1">Sin tratamientos — la cita se creará sin monto inicial</p>
                  } @else {
                    @for (t of newModalTreatments(); track t.id) {
                      <div class="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2">
                        <span class="text-sm font-medium">{{ t.name }}</span>
                        <div class="flex items-center gap-2">
                          <span class="text-sm text-emerald-600 font-semibold">Bs. {{ t.price | number:'1.2-2' }}</span>
                          <button (click)="removeNewModalTreatment(t.id)" class="text-red-400 hover:text-red-600">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      </div>
                    }
                    <div class="text-xs text-right text-slate-600 dark:text-slate-400 font-semibold pr-1">
                      Total: Bs. {{ newModalTotalAmount() | number:'1.2-2' }}
                    </div>
                  }
                  <div class="flex gap-2">
                    <input [(ngModel)]="newModalTreatmentSearch" (ngModelChange)="searchNewModalTreatments($event)"
                      class="input input-sm flex-1 text-sm" placeholder="Buscar tratamiento...">
                  </div>
                  @if (newModalTreatmentResults().length > 0) {
                    <div class="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                      @for (t of newModalTreatmentResults(); track t.id) {
                        <button type="button" (click)="addNewModalTreatment(t)"
                          class="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left border-b border-slate-100 dark:border-slate-700 last:border-0">
                          <span class="text-sm">{{ t.name }}</span>
                          <span class="text-xs text-emerald-600 font-semibold shrink-0">Bs. {{ t.price | number:'1.2-2' }}</span>
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Notas -->
              <div>
                <label class="label">Notas</label>
                <textarea [(ngModel)]="newForm.notes" class="input resize-none" rows="2" placeholder="Observaciones adicionales..."></textarea>
              </div>

              <!-- ── Preferencias de Notificación WhatsApp ── -->
              <div class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div class="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                  <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.104 1.523 5.824L0 24l6.341-1.499A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.371l-.36-.214-3.727.881.897-3.63-.234-.373A9.773 9.773 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/>
                  </svg>
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Preferencia de notificaciones WhatsApp</span>
                </div>
                <div class="p-3 space-y-2">
                  <!-- Opción 1: Completo (Premium) -->
                  @if (isPremiumOrHigher()) {
                    <label class="flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors"
                      [ngClass]="newForm.whatsappPreference === 'FULL' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'">
                      <input type="radio" name="whatsappPref" value="FULL" [(ngModel)]="newForm.whatsappPreference" class="mt-0.5 accent-emerald-500">
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">Completo — Confirmación + Recordatorios</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">✅ Confirmación al agendar · ✅ Recordatorio 24h · ✅ Recordatorio 1h</p>
                        <p class="text-xs text-slate-400 italic mt-1">Ideal para citas por teléfono, WhatsApp o reservas a distancia.</p>
                      </div>
                    </label>
                  } @else {
                    <div class="flex items-start gap-3 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed">
                      <span class="mt-0.5 w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0"></span>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          Completo — Confirmación + Recordatorios
                          <span class="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">🔒 Premium</span>
                        </p>
                        <p class="text-xs text-slate-400 mt-0.5">Confirmación inmediata + recordatorio 24h + 1h · Plan Premium/Platinum</p>
                      </div>
                    </div>
                  }
                  <!-- Opción 2: Solo Confirmación -->
                  <label class="flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors"
                    [ngClass]="newForm.whatsappPreference === 'CONFIRMATION_ONLY' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'">
                    <input type="radio" name="whatsappPref" value="CONFIRMATION_ONLY" [(ngModel)]="newForm.whatsappPreference" class="mt-0.5 accent-blue-500">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">Solo Confirmación al Agendar</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">✅ Confirmación inmediata · ❌ Sin recordatorios</p>
                      <p class="text-xs text-slate-400 italic mt-1">Para citas por llamada o mensajes donde ya saben el detalle.</p>
                    </div>
                  </label>
                  <!-- Opción 3: Solo Recordatorios (Premium) -->
                  @if (isPremiumOrHigher()) {
                    <label class="flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors"
                      [ngClass]="newForm.whatsappPreference === 'REMINDERS_ONLY' ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'">
                      <input type="radio" name="whatsappPref" value="REMINDERS_ONLY" [(ngModel)]="newForm.whatsappPreference" class="mt-0.5 accent-violet-500">
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">Solo Recordatorios (sin confirmación)</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">❌ Sin mensaje al agendar · ✅ Recordatorio 24h · ✅ Recordatorio 1h</p>
                        <p class="text-xs text-slate-400 italic mt-1">Ideal cuando el paciente está en persona y ya sabe su cita — solo recordarle después.</p>
                      </div>
                    </label>
                  } @else {
                    <div class="flex items-start gap-3 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed">
                      <span class="mt-0.5 w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0"></span>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          Solo Recordatorios (sin confirmación)
                          <span class="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">🔒 Premium</span>
                        </p>
                        <p class="text-xs text-slate-400 mt-0.5">Sin mensaje al agendar + recordatorio 24h + 1h · Plan Premium/Platinum</p>
                      </div>
                    </div>
                  }
                  <!-- Opción 4: Sin notificaciones (default) -->
                  <label class="flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors"
                    [ngClass]="newForm.whatsappPreference === 'NONE' ? 'bg-slate-100 dark:bg-slate-700/40 border-slate-300' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'">
                    <input type="radio" name="whatsappPref" value="NONE" [(ngModel)]="newForm.whatsappPreference" class="mt-0.5 accent-slate-500">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">Sin notificaciones <span class="text-xs font-normal text-slate-400">(por defecto)</span></p>
                      <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">❌ Ningún mensaje de WhatsApp</p>
                      <p class="text-xs text-slate-400 italic mt-1">Para reservas en persona inmediatas o pacientes sin WhatsApp.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="closeNewModal()" class="btn-secondary">Cancelar</button>
              <button (click)="isNewFormPast() ? showPastConfirm.set(true) : saveNew()" class="btn-primary"
                [disabled]="savingNew() || !newForm.patientId || !newForm.doctorId || !newForm.date || !newForm.time || !newForm.branchId">
                {{ savingNew() ? 'Guardando...' : 'Crear Cita' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ═══ CONFIRMACIÓN CITA CON FECHA ANTERIOR ═══ -->
    @if (showPastConfirm()) {
      <div class="modal-overlay" (click)="showPastConfirm.set(false)">
        <div class="modal-center">
          <div class="modal animate-slide-up" style="max-width:440px" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                </div>
                <h2 class="modal-title">Registrar cita a destiempo</h2>
              </div>
              <button (click)="showPastConfirm.set(false)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body space-y-3">
              <p class="text-sm text-slate-700 dark:text-slate-300">
                La fecha y hora seleccionadas ya pasaron. Esta cita quedará registrada como <span class="font-semibold text-amber-600">registrada a destiempo</span> en el sistema.
              </p>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                ¿Deseas continuar de todas formas?
              </p>
            </div>
            <div class="modal-footer">
              <button (click)="showPastConfirm.set(false)" class="btn-secondary">Cancelar</button>
              <button (click)="showPastConfirm.set(false); saveNew()" class="btn-primary bg-amber-500 hover:bg-amber-600 border-amber-500 hover:border-amber-600">
                Sí, registrar igual
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ═══ MODAL REPROGRAMAR CITA ═══ -->
    @if (showRescheduleModal()) {
      <div class="modal-overlay" (click)="closeRescheduleModal()">
        <div class="modal-center">
          <div class="modal animate-slide-up" style="max-width:560px" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2 class="modal-title">Reprogramar Cita</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">La cita original quedará marcada como Reprogramada</p>
              </div>
              <button (click)="closeRescheduleModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="modal-body space-y-4">

              <!-- Paciente / cita actual -->
              @if (detailApt()) {
                <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div class="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div class="text-xs">
                    <p class="font-semibold text-slate-700 dark:text-slate-200">
                      {{ detailApt()!.patient?.firstName }} {{ detailApt()!.patient?.lastName }}
                    </p>
                    <p class="text-slate-500 dark:text-slate-400">
                      Cita actual: {{ detailApt()!.scheduledAt | date:'EEEE d MMM yyyy, HH:mm':'':'es' }} · {{ detailApt()!.durationMinutes }} min
                    </p>
                  </div>
                </div>
              }

              <!-- Doctor selector -->
              <div>
                <label class="label">Doctor</label>
                <select [(ngModel)]="rescheduleForm.doctorId" (ngModelChange)="loadRescheduleSlots()" class="input">
                  @for (d of allDoctors(); track d.id) {
                    <option [value]="d.id">
                      Dr(a). {{ d.user?.firstName }} {{ d.user?.lastName }}{{ d.id === detailApt()?.doctorId ? ' (actual)' : '' }}
                    </option>
                  }
                </select>
                @if (rescheduleForm.doctorId !== detailApt()?.doctorId) {
                  <p class="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Cambio de doctor — los tratamientos se mantienen
                  </p>
                }
              </div>

              <!-- Fecha + Duración -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">Nueva Fecha *</label>
                  <input [(ngModel)]="rescheduleForm.date" type="date" class="input"
                    [min]="todayStr" (ngModelChange)="loadRescheduleSlots()">
                </div>
                <div>
                  <label class="label">Duración</label>
                  <select [(ngModel)]="rescheduleForm.duration" class="input" (ngModelChange)="loadRescheduleSlots()">
                    <option [value]="15">15 min</option>
                    <option [value]="30">30 min</option>
                    <option [value]="45">45 min</option>
                    <option [value]="60">1 hora</option>
                    <option [value]="90">1h 30min</option>
                    <option [value]="120">2 horas</option>
                  </select>
                </div>
              </div>

              <!-- Slots disponibles -->
              @if (rescheduleForm.date) {
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="label mb-0">Horarios disponibles</label>
                    @if (rescheduleWorkingHours()) {
                      <span class="text-xs text-slate-400 dark:text-slate-500">
                        Turno: {{ rescheduleWorkingHours()!.start }} — {{ rescheduleWorkingHours()!.end }}
                      </span>
                    }
                  </div>

                  @if (loadingSlots()) {
                    <div class="flex items-center justify-center gap-2 py-5 text-sm text-slate-500">
                      <svg class="w-5 h-5 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Cargando disponibilidad...
                    </div>
                  } @else if (rescheduleNoSchedule()) {
                    <div class="text-center py-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <svg class="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                      </svg>
                      El doctor no tiene turno configurado para este día de la semana
                    </div>
                  } @else if (rescheduleSlots().length === 0) {
                    <div class="text-center py-4 text-sm text-slate-500 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      No hay slots configurados para este día
                    </div>
                  } @else {
                    <!-- Leyenda -->
                    <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-200 dark:bg-green-900/50 inline-block"></span> Libre</span>
                      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-slate-200 dark:bg-slate-600 inline-block"></span> Ocupado</span>
                      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-primary-500 inline-block"></span> Seleccionado</span>
                    </div>
                    <div class="grid grid-cols-6 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      @for (slot of rescheduleSlots(); track slot.time) {
                        <button
                          type="button"
                          (click)="slot.available && selectRescheduleSlot(slot.time)"
                          [ngClass]="rescheduleForm.time === slot.time
                            ? 'bg-primary-600 text-white ring-2 ring-primary-400 dark:ring-primary-500'
                            : slot.available
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed line-through'"
                          class="text-xs font-medium py-1.5 rounded-lg transition-all">
                          {{ slot.time }}
                        </button>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Hora seleccionada -->
              @if (rescheduleForm.time) {
                <div class="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-3 flex items-center gap-2">
                  <svg class="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
                    {{ rescheduleForm.date | date:'EEEE d MMM yyyy':'':'es' }} · {{ rescheduleForm.time }} · {{ rescheduleForm.duration }} min
                  </span>
                </div>
              }

              <!-- Motivo -->
              <div>
                <label class="label">Motivo del cambio</label>
                <input [(ngModel)]="rescheduleForm.cancelReason" class="input"
                  placeholder="Ej: Paciente solicitó cambio de horario, emergencia, etc.">
              </div>

              <!-- Recordatorio WhatsApp -->
              @if (detailApt()?.patient?.whatsappConsent) {
                <label class="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="rescheduleForm.sendReminder"
                    class="mt-0.5 w-4 h-4 accent-green-600 shrink-0">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-green-800 dark:text-green-300">Enviar recordatorio por WhatsApp</p>
                    <p class="text-xs text-green-700 dark:text-green-400 mt-0.5">Se notificará al paciente 1 hora antes de la nueva cita</p>
                  </div>
                  <svg class="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.135.561 4.14 1.542 5.873L.057 23.885l6.184-1.622A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.028-1.382l-.36-.215-3.728.978.995-3.635-.235-.373A9.818 9.818 0 1112 21.818z"/>
                  </svg>
                </label>
              }

            </div>

            <div class="modal-footer">
              <button (click)="closeRescheduleModal()" class="btn-secondary">Cancelar</button>
              <button (click)="saveReschedule()" class="btn-primary"
                [disabled]="savingReschedule() || !rescheduleForm.date || !rescheduleForm.time">
                @if (savingReschedule()) {
                  <svg class="w-4 h-4 animate-spin mr-1.5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Reprogramando...
                } @else {
                  Confirmar Reprogramación
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ═══ MODAL VISTA MENSUAL ═══ -->
    @if (showMonthModal()) {
      <div class="modal-overlay" (click)="showMonthModal.set(false)">
        <div class="modal-center">
          <div class="modal modal-xl animate-slide-up" style="max-width:860px" (click)="$event.stopPropagation()">

            <!-- Header -->
            <div class="bg-gradient-to-r from-primary-600 to-blue-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-white font-bold text-base leading-tight">Agenda del Mes</h2>
                  <p class="text-blue-100 text-xs capitalize">{{ monthViewLabel() }}</p>
                </div>
              </div>
              <button (click)="showMonthModal.set(false)" class="text-white/70 hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Controls -->
            <div class="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/50">
              <!-- Month navigation -->
              <div class="flex items-center gap-1">
                <button (click)="prevMonth()" class="btn-ghost btn-icon btn-sm" title="Mes anterior">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <input type="month" class="input input-sm w-40 text-sm text-center font-semibold"
                  [value]="monthViewStr()"
                  (change)="onMonthInput($any($event.target).value)">
                <button (click)="nextMonth()" class="btn-ghost btn-icon btn-sm" title="Mes siguiente">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>

              <!-- Doctor filter -->
              <select class="input input-sm w-52 text-sm" [value]="monthDoctorFilter()" (change)="monthDoctorFilter.set($any($event.target).value)">
                <option value="">Todos los doctores</option>
                @for (doc of allDoctors(); track doc.id) {
                  <option [value]="doc.id">{{ doc.user?.firstName }} {{ doc.user?.lastName }}</option>
                }
              </select>

              <!-- Stats badge -->
              @if (!monthLoading()) {
                <span class="ml-auto text-xs text-slate-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 font-medium">
                  {{ monthGroupedDays().length }} día(s) · {{ monthFilteredTotal() }} cita(s)
                </span>
              }
            </div>

            <!-- Body -->
            <div class="modal-body" style="max-height:60vh;overflow-y:auto">
              @if (monthLoading()) {
                <div class="flex items-center justify-center gap-2 py-12 text-slate-400">
                  <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span class="text-sm">Cargando citas del mes...</span>
                </div>
              } @else if (monthGroupedDays().length === 0) {
                <div class="empty-state py-12">
                  <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <p class="empty-state-title">Sin citas este mes</p>
                  <p class="empty-state-desc">No hay citas registradas para el período seleccionado</p>
                </div>
              } @else {
                <div class="space-y-5">
                  @for (group of monthGroupedDays(); track group.day) {
                    <div>
                      <!-- Day header -->
                      <div class="flex items-center gap-3 mb-2">
                        <div class="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider capitalize bg-white dark:bg-slate-800 px-2 whitespace-nowrap">
                          {{ group.label }}
                        </span>
                        <div class="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                        <span class="text-xs text-slate-400 shrink-0">{{ group.appointments.length }} cita(s)</span>
                      </div>
                      <!-- Chips -->
                      <div class="flex flex-wrap gap-2">
                        @for (apt of group.appointments; track apt.id) {
                          <button
                            class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all hover:shadow-sm"
                            [ngClass]="monthChipClass(apt.status)"
                            [class.cursor-pointer]="apt.status === 'COMPLETED'"
                            [class.opacity-60]="apt.status === 'CANCELLED' || apt.status === 'NO_SHOW'"
                            (click)="apt.status === 'COMPLETED' ? openDetailFromMonth(apt) : null"
                            [title]="apt.status === 'COMPLETED' ? 'Ver detalle de la consulta' : statusLabel(apt.status)">
                            <!-- Time -->
                            <span class="font-bold shrink-0">{{ formatTime(apt.scheduledAt) }}</span>
                            <span class="opacity-40">·</span>
                            <!-- Patient -->
                            <span class="max-w-[120px] truncate">{{ apt.patient?.firstName }} {{ apt.patient?.lastName }}</span>
                            <span class="opacity-40">·</span>
                            <!-- Doctor -->
                            <span class="opacity-80 max-w-[100px] truncate">Dr. {{ apt.doctor?.user?.lastName || apt.doctor?.user?.firstName }}</span>
                            <!-- Status badge -->
                            <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold" [ngClass]="monthStatusPill(apt.status)">
                              {{ statusLabel(apt.status) }}
                            </span>
                            <!-- Click hint for completed -->
                            @if (apt.status === 'COMPLETED') {
                              <svg class="w-3 h-3 opacity-50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                              </svg>
                            }
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="modal-footer">
              <button (click)="showMonthModal.set(false)" class="btn-secondary ml-auto">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ═══ MODAL CONFIRMACIÓN ASISTENCIA A DESTIEMPO ═══ -->
    @if (showLateConfirmModal()) {
      <div class="modal-overlay" (click)="showLateConfirmModal.set(false)">
        <div class="modal-center">
          <div class="modal max-w-md animate-slide-up" (click)="$event.stopPropagation()">
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-2xl p-4 text-white flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h2 class="font-bold text-base">Confirmar asistencia a destiempo</h2>
              </div>
              <button (click)="showLateConfirmModal.set(false)" class="text-white/70 hover:text-white">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="p-5 space-y-3">
              <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                <p class="text-sm text-amber-800 dark:text-amber-200 font-semibold">⚠ Registro fuera de tiempo</p>
                <p class="text-xs text-amber-700 dark:text-amber-300 mt-1">Esta cita fue marcada automáticamente como <strong>No se presentó</strong>. Estás registrando la asistencia después del horario programado.</p>
              </div>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                Al confirmar, el estado cambiará a <strong class="text-emerald-600">COMPLETADA</strong> y quedará registrado en el historial que fue procesado a destiempo. Los KPIs e ingresos del período original se actualizarán.
              </p>
            </div>
            <div class="modal-footer">
              <button (click)="showLateConfirmModal.set(false)" class="btn-secondary">Cancelar</button>
              <button (click)="doLateAttendance()" class="btn-primary bg-blue-500 hover:bg-blue-600 border-blue-500 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Sí, confirmar asistencia
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AppointmentsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  protected branchCtx = inject(BranchContextService);

  // ── Constantes públicas para el template
  BOARD_START_HOUR = BOARD_START_HOUR;
  BOARD_END_HOUR = BOARD_END_HOUR;
  SLOT_HEIGHT_PX = SLOT_HEIGHT_PX;
  boardHours = Array.from({ length: BOARD_END_HOUR - BOARD_START_HOUR }, (_, i) => BOARD_START_HOUR + i);

  statusLegend = [
    { key: 'SCHEDULED',    label: 'Programada',    bg: 'bg-blue-400' },
    { key: 'CONFIRMED',    label: 'Confirmada',    bg: 'bg-emerald-400' },
    { key: 'WAITING',      label: 'En sala',       bg: 'bg-amber-400' },
    { key: 'IN_PROGRESS',  label: 'En curso',      bg: 'bg-violet-400' },
    { key: 'COMPLETED',    label: 'Completada',    bg: 'bg-slate-400' },
    { key: 'CANCELLED',    label: 'Cancelada',     bg: 'bg-red-400' },
    { key: 'RESCHEDULED',  label: 'Reprogramada',  bg: 'bg-orange-400' },
  ];

  // ── Role helpers
  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  isDoctor = computed(() => ['DOCTOR', 'ADMIN', 'SUPER_ADMIN'].includes(this.auth.currentUser()?.role || ''));
  isReceptionist = computed(() => ['RECEPTIONIST', 'ADMIN', 'SUPER_ADMIN'].includes(this.auth.currentUser()?.role || ''));
  isPremiumOrHigher = computed(() => {
    const role = this.auth.currentUser()?.role;
    if (role === 'SUPER_ADMIN') return true;
    const slug = (this.auth.currentUser() as any)?.planSlug;
    return slug === 'premium' || slug === 'platinum';
  });
  tenants = signal<any[]>([]);
  filterTenantId = signal('');
  filterClinicId = signal('');
  clinicsFilter = signal<any[]>([]);

  // ── View
  view = signal<'board' | 'list'>('board');
  loading = signal(false);

  // ── Board state
  selectedDate = signal<Date>(startOfDay(new Date()));
  selectedDateStr = computed(() => format(this.selectedDate(), 'yyyy-MM-dd'));
  boardAppointments = signal<Appointment[]>([]);
  boardStatusFilter = signal('');
  allDoctors = signal<any[]>([]);
  modalDoctors = signal<any[]>([]);
  currentTimeTop = signal<number | null>(null);
  detailApt = signal<Appointment | null>(null);

  // ── List state
  listAppointments = signal<Appointment[]>([]);
  listTotal = signal(0);
  listPage = signal(1);
  listPageSize = 20;
  listFilters = { dateFrom: '', dateTo: '', status: '' };

  // ── Clinical finish modal
  showClinicalModal = signal(false);
  savingClinical = signal(false);
  clinicalError = signal('');
  clinicalForm: {
    chiefComplaint: string;
    diagnosis: string;
    clinicalNotes: string;
    observations: string;
    nextVisitRecommendation: string;
    materials: { itemId: string; quantity: number; name: string }[];
    odontogram: Record<number, string>;
  } = this.emptyClinicalForm();
  inventoryItems = signal<{ itemId: string; name: string; stock: number }[]>([]);

  // ── Payment form (inline in detail modal)
  showPayForm = signal(false);
  savingPay = signal(false);
  payForm = { amount: 0, method: 'CASH', reference: '', observations: '', totalAmountOverride: 0 };
  isAccountant = computed(() => ['ACCOUNTANT', 'RECEPTIONIST', 'ADMIN', 'SUPER_ADMIN'].includes(this.auth.currentUser()?.role || ''));

  // ── New appointment modal
  showNewModal = signal(false);
  savingNew = signal(false);
  showPastConfirm = signal(false);
  patientResults = signal<any[]>([]);
  newForm = this.emptyNewForm();
  newModalTreatments = signal<any[]>([]);
  newModalTreatmentResults = signal<any[]>([]);
  newModalTreatmentSearch = '';
  newModalTotalAmount = computed(() => this.newModalTreatments().reduce((s, t) => s + Number(t.price || 0), 0));
  lastVisitHint = signal<{ doctorName: string; branchName: string; doctorId: string; branchId: string; scheduledAt?: string; status?: string } | null>(null);
  noHistoryHint = signal(false);
  todayAptWarning = signal(0);
  // Doctor availability
  doctorAvailability = signal<any>(null);
  loadingAvailability = signal(false);

  // ── Month view modal
  showMonthModal = signal(false);
  monthLoading = signal(false);
  monthViewDate = signal<Date>(startOfDay(new Date()));
  monthAppointments = signal<Appointment[]>([]);
  monthDoctorFilter = signal('');

  monthViewStr = computed(() => format(this.monthViewDate(), 'yyyy-MM'));
  monthViewLabel = computed(() => format(this.monthViewDate(), "MMMM 'de' yyyy", { locale: es }));

  monthGroupedDays = computed(() => {
    const apts = this.monthAppointments();
    const doctorFilter = this.monthDoctorFilter();
    const filtered = doctorFilter ? apts.filter(a => a.doctorId === doctorFilter) : apts;
    const groups: Record<string, Appointment[]> = {};
    for (const apt of filtered) {
      try {
        const day = format(parseISO(apt.scheduledAt as unknown as string), 'yyyy-MM-dd');
        if (!groups[day]) groups[day] = [];
        groups[day].push(apt);
      } catch { /* skip invalid dates */ }
    }
    return Object.keys(groups).sort().map(day => ({
      day,
      label: format(parseISO(day), "EEEE d 'de' MMMM", { locale: es }),
      appointments: groups[day].sort((a, b) =>
        new Date(a.scheduledAt as unknown as string).getTime() - new Date(b.scheduledAt as unknown as string).getTime()
      ),
    }));
  });

  monthFilteredTotal = computed(() => this.monthGroupedDays().reduce((s, g) => s + g.appointments.length, 0));

  // ── Reschedule modal
  showRescheduleModal = signal(false);
  showLateConfirmModal = signal(false);
  savingReschedule = signal(false);
  rescheduleSlots = signal<{ time: string; available: boolean }[]>([]);
  loadingSlots = signal(false);
  rescheduleWorkingHours = signal<{ start: string; end: string } | null>(null);
  rescheduleNoSchedule = signal(false);
  rescheduleForm = { date: '', time: '', duration: 30, doctorId: '', cancelReason: '', sendReminder: false };
  todayStr = format(new Date(), 'yyyy-MM-dd');

  // ── Toast notification
  toastMsg = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  private showToast(type: 'success' | 'error', text: string) {
    this.toastMsg.set({ type, text });
    setTimeout(() => this.toastMsg.set(null), 4000);
    this.cdr.markForCheck();
  }

  // ── Doctor columns (computed from board appointments + doctors)
  doctorColumns = computed<DoctorColumn[]>(() => {
    const currentUser = this.auth.currentUser();
    let doctors = this.allDoctors();
    const apts = this.boardAppointments();
    const statusF = this.boardStatusFilter();

    // DOCTOR role: show only their own column
    if (currentUser?.role === 'DOCTOR') {
      doctors = doctors.filter(doc => doc.userId === currentUser.id);
    }

    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

    return doctors.map((doc, idx) => {
      let docApts = apts.filter(a => a.doctorId === doc.id);
      if (statusF) docApts = docApts.filter(a => a.status === statusF);
      return {
        id: doc.id,
        name: `${doc.user?.firstName || ''} ${doc.user?.lastName || ''}`.trim(),
        specialty: (doc.specialties || []).join(', '),
        color: colors[idx % colors.length],
        appointments: docApts,
      };
    }).filter(d => d.name);
  });

  constructor() {
    // Reload board/list whenever active branch changes (including switching to "all branches")
    effect(() => {
      this.branchCtx.activeBranchId(); // track signal
      if (!this.isSuperAdmin()) {
        this.loadBoardData();
        if (this.view() === 'list') this.loadList();
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit() {
    if (this.isSuperAdmin()) {
      this.loadTenants();
      this.loadBoardData(); // SA: effect doesn't trigger, load manually
    }
    this.updateCurrentTime();
    setInterval(() => this.updateCurrentTime(), 60000);
    const today = format(new Date(), 'yyyy-MM-dd');
    this.listFilters.dateFrom = today;
  }

  // ── Time helpers
  updateCurrentTime() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = BOARD_START_HOUR * 60;
    const endMinutes = BOARD_END_HOUR * 60;
    if (minutes >= startMinutes && minutes <= endMinutes) {
      this.currentTimeTop.set((minutes - startMinutes) * (SLOT_HEIGHT_PX / 60));
    } else {
      this.currentTimeTop.set(null);
    }
    this.cdr.markForCheck();
  }

  getAptTop(apt: Appointment): number {
    const d = parseISO(apt.scheduledAt as unknown as string);
    const minutes = d.getHours() * 60 + d.getMinutes();
    const startMinutes = BOARD_START_HOUR * 60;
    return Math.max(0, (minutes - startMinutes) * (SLOT_HEIGHT_PX / 60));
  }

  getAptHeight(apt: Appointment): number {
    return Math.max(28, (apt.durationMinutes || 30) * (SLOT_HEIGHT_PX / 60));
  }

  // ── Load data
  loadBoardData() {
    this.loading.set(true);
    const date = this.selectedDate();
    const dateStr = format(date, 'yyyy-MM-dd');
    const params: any = { dateFrom: `${dateStr}T00:00:00`, dateTo: `${dateStr}T23:59:59`, limit: 200 };
    if (this.filterTenantId()) params.tenantId = this.filterTenantId();
    if (this.filterClinicId()) params.clinicId = this.filterClinicId();
    if (!this.isSuperAdmin()) {
      const branchId = this.branchCtx.activeBranchId();
      if (branchId) params.branchId = branchId;
    }

    const doctorParams: any = { limit: 100, isActive: true };
    if (this.filterTenantId()) doctorParams.tenantId = this.filterTenantId();
    if (this.filterClinicId()) doctorParams.clinicId = this.filterClinicId();
    if (!this.isSuperAdmin()) {
      const branchId = this.branchCtx.activeBranchId();
      if (branchId) doctorParams.branchId = branchId;
    }

    Promise.all([
      new Promise<void>(res => {
        this.api.getPaginated<Appointment>('/appointments', params).subscribe({
          next: r => { this.boardAppointments.set(r.data); res(); },
          error: () => res(),
        });
      }),
      new Promise<void>(res => {
        this.api.getPaginated<any>('/doctors', doctorParams).subscribe({
          next: r => { this.allDoctors.set(r.data || []); res(); },
          error: () => res(),
        });
      }),
    ]).then(() => {
      this.loading.set(false);
      this.cdr.markForCheck();
    });
  }

  loadList() {
    this.loading.set(true);
    const params: any = { page: this.listPage(), limit: this.listPageSize };
    if (this.listFilters.dateFrom) params.dateFrom = this.listFilters.dateFrom;
    if (this.listFilters.dateTo) params.dateTo = this.listFilters.dateTo + 'T23:59:59';
    if (this.listFilters.status) params.status = this.listFilters.status;
    if (this.filterTenantId()) params.tenantId = this.filterTenantId();
    if (this.filterClinicId()) params.clinicId = this.filterClinicId();
    if (!this.isSuperAdmin()) {
      const branchId = this.branchCtx.activeBranchId();
      if (branchId) params.branchId = branchId;
    }

    this.api.getPaginated<Appointment>('/appointments', params).subscribe({
      next: r => { this.listAppointments.set(r.data); this.listTotal.set(r.total); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => this.loading.set(false),
    });
  }

  // ── Date navigation
  isSelectedToday() { return isToday(this.selectedDate()); }

  prevDay() {
    this.selectedDate.update(d => subDays(d, 1));
    this.loadBoardData();
  }
  nextDay() {
    this.selectedDate.update(d => addDays(d, 1));
    this.loadBoardData();
  }
  goToday() {
    this.selectedDate.set(startOfDay(new Date()));
    this.loadBoardData();
  }
  onDateInput(val: string) {
    if (val) {
      this.selectedDate.set(startOfDay(parseISO(val)));
      this.loadBoardData();
    }
  }

  // ── Sync horizontal scroll between header and body
  syncScroll(event: Event) {
    const body = event.target as HTMLElement;
    const header = document.getElementById('board-header');
    if (header) header.scrollLeft = body.scrollLeft;
  }

  // ── Tenant / clinic filters
  loadTenants() {
    this.api.get<any>('/tenants').subscribe({ next: (r: any) => this.tenants.set(r?.data || r || []) });
  }
  onTenantChange(id: string) {
    this.filterTenantId.set(id);
    this.filterClinicId.set('');
    this.clinicsFilter.set([]);
    if (id) {
      this.api.get<any[]>('/clinics', { tenantId: id }).subscribe({
        next: (d: any) => this.clinicsFilter.set(Array.isArray(d) ? d : d?.data || []),
      });
    }
    this.loadBoardData();
  }
  onClinicChange(id: string) {
    this.filterClinicId.set(id);
    this.loadBoardData();
  }
  clearSuperFilters() {
    this.filterTenantId.set('');
    this.filterClinicId.set('');
    this.clinicsFilter.set([]);
    this.loadBoardData();
  }

  // ── Detail modal
  openDetail(apt: Appointment) {
    // Load full detail if needed
    this.api.get<Appointment>(`/appointments/${apt.id}`).subscribe({
      next: full => { this.detailApt.set(full); this.cdr.markForCheck(); },
      error: () => { this.detailApt.set(apt); this.cdr.markForCheck(); },
    });
  }

  updateStatusFromDetail(status: string) {
    const apt = this.detailApt();
    if (!apt) return;
    this.api.patch(`/appointments/${apt.id}/status`, { status }).subscribe(() => {
      this.detailApt.set({ ...apt, status: status as any });
      this.loadBoardData();
      if (this.view() === 'list') this.loadList();
      this.cdr.markForCheck();
    });
  }

  updateStatus(id: string, status: string) {
    this.api.patch(`/appointments/${id}/status`, { status }).subscribe(() => {
      if (this.view() === 'list') this.loadList();
      else this.loadBoardData();
    });
  }

  confirmLateAttendance() {
    this.showLateConfirmModal.set(true);
  }

  doLateAttendance() {
    const apt = this.detailApt();
    if (!apt) return;
    this.showLateConfirmModal.set(false);
    this.api.patch(`/appointments/${apt.id}/status`, { status: 'COMPLETED', lateRegistration: true }).subscribe({
      next: () => {
        this.detailApt.set({ ...apt, status: 'COMPLETED' as any });
        this.loadBoardData();
        if (this.view() === 'list') this.loadList();
        this.showToast('success', 'Asistencia confirmada a destiempo');
        this.cdr.markForCheck();
      },
      error: () => this.showToast('error', 'No se pudo actualizar el estado'),
    });
  }

  // ── New appointment modal
  openNewModal() {
    this.newForm = this.emptyNewForm();
    this.patientResults.set([]);
    this.doctorAvailability.set(null);
    this.newForm.date = this.selectedDateStr();
    this.newForm.branchId = this.branchCtx.activeBranchId() || '';
    if (this.newForm.branchId) {
      this.loadModalDoctors(this.newForm.branchId);
    } else {
      this.modalDoctors.set(this.allDoctors());
    }
    this.showNewModal.set(true);
  }
  closeNewModal() {
    this.showNewModal.set(false);
    this.doctorAvailability.set(null);
    this.lastVisitHint.set(null);
    this.noHistoryHint.set(false);
    this.todayAptWarning.set(0);
    this.newModalTreatments.set([]);
    this.newModalTreatmentResults.set([]);
    this.newModalTreatmentSearch = '';
  }

  searchNewModalTreatments(q: string) {
    if (!q || q.length < 2) { this.newModalTreatmentResults.set([]); return; }
    const clinicId = this.branchCtx.activeClinicId();
    if (!clinicId) return;
    this.api.get<any>(`/treatments`, { clinicId, search: q, isActive: true, limit: 8 }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const existing = this.newModalTreatments().map(t => t.id);
        this.newModalTreatmentResults.set(list.filter((t: any) => !existing.includes(t.id)));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  addNewModalTreatment(t: any) {
    this.newModalTreatments.update(list => [...list, t]);
    this.newModalTreatmentResults.set([]);
    this.newModalTreatmentSearch = '';
  }

  removeNewModalTreatment(id: string) {
    this.newModalTreatments.update(list => list.filter(t => t.id !== id));
  }

  onModalBranchChange(branchId: string) {
    this.newForm.branchId = branchId;
    this.newForm.doctorId = '';
    this.doctorAvailability.set(null);
    this.loadModalDoctors(branchId);
  }

  private loadModalDoctors(branchId: string) {
    if (!branchId) {
      this.modalDoctors.set(this.allDoctors());
      return;
    }
    const params: any = { limit: 100, isActive: true };
    if (!this.isSuperAdmin()) params.branchId = branchId;
    this.api.getPaginated<any>('/doctors', params).subscribe({
      next: r => { this.modalDoctors.set(r.data || []); this.cdr.markForCheck(); },
      error: () => this.modalDoctors.set(this.allDoctors()),
    });
  }

  isNewFormPast(): boolean {
    if (!this.newForm.date || !this.newForm.time) return false;
    try {
      return new Date(`${this.newForm.date}T${this.newForm.time}:00`) < new Date();
    } catch { return false; }
  }

  isTimeConflict(): boolean {
    const avail = this.doctorAvailability();
    const time = this.newForm.time;
    if (!avail || !time || !avail.busySlots?.length) return false;
    const duration = this.newForm.duration || 30;
    const [h, m] = time.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + duration;
    return avail.busySlots.some((slot: any) => {
      const [sh, sm] = slot.start.split(':').map(Number);
      const [eh, em] = slot.end.split(':').map(Number);
      const slotStart = sh * 60 + sm;
      const slotEnd = eh * 60 + em;
      return startMin < slotEnd && endMin > slotStart;
    });
  }

  isOutsideWorkingHours(): boolean {
    const avail = this.doctorAvailability();
    const time = this.newForm.time;
    if (!avail?.schedule || !time) return false;
    const [sh, sm] = avail.schedule.startTime.split(':').map(Number);
    const [eh, em] = avail.schedule.endTime.split(':').map(Number);
    const [h, m] = time.split(':').map(Number);
    const schedStart = sh * 60 + sm;
    const schedEnd = eh * 60 + em;
    const t = h * 60 + m;
    return t < schedStart || t + (this.newForm.duration || 30) > schedEnd;
  }

  searchPatients() {
    if (!this.newForm.patientSearch || this.newForm.patientSearch.length < 2) {
      this.patientResults.set([]); return;
    }
    this.api.getPaginated<any>('/patients', { search: this.newForm.patientSearch, limit: 5 }).subscribe(
      r => { this.patientResults.set(r.data); this.cdr.markForCheck(); }
    );
  }

  selectPatient(p: any) {
    this.newForm.patientId = p.id;
    this.newForm.patientSearch = `${p.firstName} ${p.lastName}`;
    this.patientResults.set([]);
    this.lastVisitHint.set(null);
    this.noHistoryHint.set(false);
    this.todayAptWarning.set(0);
    // Load last appointment info + today's count
    this.api.get<any>(`/appointments/patient/${p.id}/last`).subscribe({
      next: (res: { last: any; todayCount: number }) => {
        // Same-day warning
        if (res.todayCount > 0) this.todayAptWarning.set(res.todayCount);

        const last = res.last;
        if (!last) {
          this.noHistoryHint.set(true);
          this.cdr.markForCheck();
          return;
        }
        this.lastVisitHint.set({
          doctorId: last.doctorId,
          doctorName: last.doctorName ?? '',
          branchId: last.branchId ?? '',
          branchName: last.branchName ?? '',
          scheduledAt: last.scheduledAt,
          status: last.status,
        });
        // Pre-fill branch only from COMPLETED visits (don't pre-fill from NO_SHOW/CANCELLED)
        if (last.status === 'COMPLETED') {
          if (!this.newForm.branchId && last.branchId) {
            this.newForm.branchId = last.branchId;
            this.onModalBranchChange(last.branchId);
          }
          if (last.doctorId) {
            setTimeout(() => {
              this.newForm.doctorId = last.doctorId;
              this.loadDoctorAvailability();
              this.cdr.markForCheck();
            }, 300);
          }
        }
        this.cdr.markForCheck();
      },
      error: () => { this.cdr.markForCheck(); },
    });
  }

  onDoctorChange(doctorId: string) {
    this.newForm.doctorId = doctorId;
    this.loadDoctorAvailability();
  }

  onNewFormDateChange(date: string) {
    this.newForm.date = date;
    this.loadDoctorAvailability();
  }

  loadDoctorAvailability() {
    const { doctorId, date } = this.newForm;
    if (!doctorId || !date) { this.doctorAvailability.set(null); return; }
    this.loadingAvailability.set(true);
    this.api.get<any>('/appointments/doctor-availability', { doctorId, date }).subscribe({
      next: data => { this.doctorAvailability.set(data); this.loadingAvailability.set(false); this.cdr.markForCheck(); },
      error: () => { this.loadingAvailability.set(false); this.doctorAvailability.set(null); this.cdr.markForCheck(); },
    });
  }

  selectBusySlotTime(endTime: string) {
    this.newForm.time = endTime;
    this.cdr.detectChanges();
  }

  saveNew() {
    if (!this.newForm.patientId || !this.newForm.doctorId || !this.newForm.date || !this.newForm.time) return;
    if (!this.newForm.branchId) return;
    const clinicId = this.branchCtx.activeClinicId();
    if (!clinicId) return;
    this.savingNew.set(true);
    const scheduledAt = `${this.newForm.date}T${this.newForm.time}:00`;
    const body: any = {
      patientId: this.newForm.patientId,
      doctorId: this.newForm.doctorId,
      scheduledAt,
      branchId: this.newForm.branchId,
      clinicId,
      durationMinutes: this.newForm.duration,
      notes: this.newForm.notes || undefined,
      whatsappPreference: this.newForm.whatsappPreference,
      treatmentIds: this.newModalTreatments().length > 0 ? this.newModalTreatments().map(t => t.id) : undefined,
    };
    this.api.post('/appointments', body).subscribe({
      next: () => {
        this.savingNew.set(false);
        this.closeNewModal();
        this.loadBoardData();
        if (this.view() === 'list') this.loadList();
        this.showToast('success', 'Cita creada correctamente');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.savingNew.set(false);
        const msg = err?.error?.message || 'Error al crear la cita';
        this.showToast('error', msg);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Formatting
  formatDateLong(d: Date) {
    return format(d, "EEEE, d 'de' MMMM yyyy", { locale: es });
  }
  formatDate(iso: string) {
    try { return format(parseISO(iso), 'dd MMM yyyy', { locale: es }); } catch { return iso; }
  }
  formatTime(iso: string) {
    try { return format(parseISO(iso), 'HH:mm'); } catch { return ''; }
  }
  isPast(iso: string): boolean {
    try { return parseISO(iso) < new Date(); } catch { return false; }
  }
  isCreatedLate(apt: Appointment): boolean {
    if (!apt.createdAt || !apt.scheduledAt) return false;
    try { return parseISO(apt.createdAt) > parseISO(apt.scheduledAt); } catch { return false; }
  }

  // ── Status helpers
  statusLabel(s: string) {
    const map: Record<string, string> = {
      SCHEDULED: 'Programada', CONFIRMED: 'Confirmada', WAITING: 'En sala',
      IN_PROGRESS: 'En curso', COMPLETED: 'Completada', CANCELLED: 'Cancelada',
      NO_SHOW: 'No asistió', RESCHEDULED: 'Reprogramada',
    };
    return map[s] || s;
  }
  statusClass(s: string) {
    const map: Record<string, string> = {
      SCHEDULED: 'badge-blue', CONFIRMED: 'badge-green', WAITING: 'badge-yellow',
      COMPLETED: 'badge-green', CANCELLED: 'badge-red', NO_SHOW: 'badge-gray',
      IN_PROGRESS: 'badge-orange', RESCHEDULED: 'badge-orange',
    };
    return map[s] || 'badge-gray';
  }
  aptBlockClass(s: string) {
    const map: Record<string, string> = {
      SCHEDULED:   'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700',
      CONFIRMED:   'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-700',
      WAITING:     'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-700',
      COMPLETED:   'bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-700',
      CANCELLED:   'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 opacity-60',
      IN_PROGRESS: 'bg-orange-100 dark:bg-orange-900/40 text-orange-900 dark:text-orange-100 border border-orange-200 dark:border-orange-700',
      NO_SHOW:     'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 opacity-70',
      RESCHEDULED: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 opacity-60',
    };
    return map[s] || 'bg-slate-100 text-slate-600 border border-slate-200';
  }
  aptIconBg(s: string) {
    const map: Record<string, string> = {
      SCHEDULED:   'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
      CONFIRMED:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
      WAITING:     'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
      IN_PROGRESS: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
      COMPLETED:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
      CANCELLED:   'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    };
    return map[s] || 'bg-slate-100 text-slate-600';
  }

  // ── Clinical flow methods
  getClinicalData(apt: any): any {
    return (apt?.metadata as any)?.clinical || null;
  }

  startAttention() {
    const apt = this.detailApt();
    if (!apt) return;
    this.api.patch(`/appointments/${apt.id}/start-attention`, {}).subscribe({
      next: (updated: any) => {
        this.detailApt.set(updated);
        this.loadBoardData();
        if (this.view() === 'list') this.loadList();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.showToast('error', err?.error?.message || 'Error al iniciar la atención');
      },
    });
  }

  savePayment() {
    const apt = this.detailApt();
    if (!apt || !this.payForm.amount) return;
    this.savingPay.set(true);
    this.api.post(`/appointments/${apt.id}/payments`, {
      amount: Number(this.payForm.amount),
      method: this.payForm.method,
      reference: this.payForm.reference || undefined,
      observations: this.payForm.observations || undefined,
      totalAmountOverride: this.payForm.totalAmountOverride > 0 ? Number(this.payForm.totalAmountOverride) : undefined,
    }).subscribe({
      next: () => {
        this.savingPay.set(false);
        this.showPayForm.set(false);
        this.payForm = { amount: 0, method: 'CASH', reference: '', observations: '', totalAmountOverride: 0 };
        // Reload appointment detail
        this.api.get<Appointment>(`/appointments/${apt.id}`).subscribe(updated => {
          this.detailApt.set(updated);
          this.loadBoardData();
          if (this.view() === 'list') this.loadList();
          this.cdr.markForCheck();
        });
      },
      error: (err: any) => {
        this.savingPay.set(false);
        this.showToast('error', err?.error?.message || 'Error al registrar el pago');
      },
    });
  }

  openClinicalFinish() {
    this.clinicalForm = this.emptyClinicalForm();
    this.clinicalError.set('');
    this.showClinicalModal.set(true);
    this.loadInventoryForCurrentBranch();
  }

  closeClinicalModal() {
    if (this.savingClinical()) return;
    this.showClinicalModal.set(false);
  }

  loadInventoryForCurrentBranch() {
    const branchId = this.branchCtx.activeBranchId();
    const params: any = { limit: 200 };
    if (branchId) params.branchId = branchId;
    this.api.getPaginated<any>('/inventory', params).subscribe({
      next: (res) => {
        const items = (res.data || [])
          .filter((p: any) => p.totalStock > 0)
          .map((p: any) => ({
            itemId: p.items?.[0]?.id || '',
            name: p.name,
            stock: p.totalStock || 0,
          }))
          .filter((p: any) => p.itemId);
        this.inventoryItems.set(items);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  addMaterialRow() {
    this.clinicalForm.materials.push({ itemId: '', quantity: 1, name: '' });
  }

  removeMaterialRow(i: number) {
    this.clinicalForm.materials.splice(i, 1);
  }

  onMaterialSelect(i: number) {
    const row = this.clinicalForm.materials[i];
    const inv = this.inventoryItems().find(it => it.itemId === row.itemId);
    if (inv) row.name = inv.name;
  }

  submitClinicalFinish() {
    const apt = this.detailApt();
    if (!apt || !this.clinicalForm.diagnosis) return;

    const validMaterials = this.clinicalForm.materials.filter(m => m.itemId && m.quantity > 0);
    this.savingClinical.set(true);
    this.clinicalError.set('');

    const odontogramChanges = Object.entries(this.clinicalForm.odontogram)
      .map(([tooth, status]) => ({ toothNumber: parseInt(tooth), status }));

    const body: any = {
      chiefComplaint: this.clinicalForm.chiefComplaint || undefined,
      diagnosis: this.clinicalForm.diagnosis,
      clinicalNotes: this.clinicalForm.clinicalNotes || undefined,
      observations: this.clinicalForm.observations || undefined,
      nextVisitRecommendation: this.clinicalForm.nextVisitRecommendation || undefined,
      materialsUsed: validMaterials.length ? validMaterials : undefined,
      odontogramChanges: odontogramChanges.length ? odontogramChanges : undefined,
    };

    this.api.patch(`/appointments/${apt.id}/finish-attention`, body).subscribe({
      next: (updated: any) => {
        this.savingClinical.set(false);
        this.showClinicalModal.set(false);
        this.detailApt.set(updated);
        this.loadBoardData();
        if (this.view() === 'list') this.loadList();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.savingClinical.set(false);
        this.clinicalError.set(err?.error?.message || 'Error al finalizar la consulta');
        this.cdr.markForCheck();
      },
    });
  }

  private emptyClinicalForm() {
    return {
      chiefComplaint: '',
      diagnosis: '',
      clinicalNotes: '',
      observations: '',
      nextVisitRecommendation: '',
      materials: [] as { itemId: string; quantity: number; name: string }[],
      odontogram: {} as Record<number, string>,
    };
  }

  // Odontograma — dientes superiores (18→11, 21→28) e inferiores (48→41, 31→38)
  readonly upperTeeth = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  readonly lowerTeeth = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
  readonly toothStates = ['healthy','caries','restored','extracted','crown'];
  readonly toothStateColors: Record<string, string> = {
    healthy: 'bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-500 dark:text-slate-400',
    caries:  'bg-red-500 border-red-600 text-white',
    restored: 'bg-blue-500 border-blue-600 text-white',
    extracted: 'bg-slate-800 border-slate-900 text-slate-300',
    crown: 'bg-amber-400 border-amber-500 text-amber-900',
  };
  readonly toothStateLabel: Record<string, string> = {
    healthy: 'Sano', caries: 'Caries', restored: 'Restaurado', extracted: 'Extraído', crown: 'Corona',
  };

  cycleToothState(tooth: number) {
    const cur = this.clinicalForm.odontogram[tooth] || 'healthy';
    const idx = this.toothStates.indexOf(cur);
    const next = this.toothStates[(idx + 1) % this.toothStates.length];
    if (next === 'healthy') {
      delete this.clinicalForm.odontogram[tooth];
    } else {
      this.clinicalForm.odontogram[tooth] = next;
    }
    // Trigger change detection
    this.clinicalForm.odontogram = { ...this.clinicalForm.odontogram };
    this.cdr.markForCheck();
  }

  toothClass(tooth: number): string {
    const state = this.clinicalForm.odontogram[tooth] || 'healthy';
    return this.toothStateColors[state] || this.toothStateColors['healthy'];
  }

  odontogramMarkedCount(): number {
    return Object.keys(this.clinicalForm.odontogram).length;
  }

  formatMaterialsList(materials: any[]): string {
    if (!materials?.length) return '';
    return materials.map(m => m.name + ' x' + m.quantity).join(', ');
  }

  odontogramHasEntries(apt: any): boolean {
    const data = this.getClinicalData(apt);
    return !!(data?.odontogram && Object.keys(data.odontogram).length > 0);
  }

  getOdontogramEntries(apt: any): { key: string; value: string }[] {
    const data = this.getClinicalData(apt);
    if (!data?.odontogram) return [];
    return Object.entries(data.odontogram).map(([key, value]) => ({ key, value: value as string }));
  }

  private emptyNewForm() {
    return { patientId: '', patientSearch: '', doctorId: '', date: '', time: '09:00', duration: 30, notes: '', branchId: '', whatsappPreference: 'NONE' };
  }

  // ── Month view modal
  openMonthModal() {
    this.monthViewDate.set(startOfDay(new Date()));
    this.monthDoctorFilter.set('');
    this.showMonthModal.set(true);
    this.loadMonthAppointments();
  }

  prevMonth() {
    this.monthViewDate.update(d => subMonths(d, 1));
    this.loadMonthAppointments();
  }

  nextMonth() {
    this.monthViewDate.update(d => addMonths(d, 1));
    this.loadMonthAppointments();
  }

  onMonthInput(val: string) {
    if (!val) return;
    // val is 'yyyy-MM'
    const [y, m] = val.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    this.monthViewDate.set(d);
    this.loadMonthAppointments();
  }

  loadMonthAppointments() {
    const date = this.monthViewDate();
    const from = startOfMonth(date);
    const to = endOfMonth(date);
    const params: any = {
      dateFrom: `${format(from, 'yyyy-MM-dd')}T00:00:00`,
      dateTo: `${format(to, 'yyyy-MM-dd')}T23:59:59`,
      limit: 500,
    };
    if (this.filterTenantId()) params.tenantId = this.filterTenantId();
    if (this.filterClinicId()) params.clinicId = this.filterClinicId();
    if (!this.isSuperAdmin()) {
      const branchId = this.branchCtx.activeBranchId();
      if (branchId) params.branchId = branchId;
    }
    this.monthLoading.set(true);
    this.api.getPaginated<Appointment>('/appointments', params).subscribe({
      next: r => { this.monthAppointments.set(r.data); this.monthLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.monthLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  openDetailFromMonth(apt: Appointment) {
    this.showMonthModal.set(false);
    this.openDetail(apt);
  }

  monthChipClass(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED:   'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700 hover:bg-blue-100',
      CONFIRMED:   'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100',
      WAITING:     'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700 hover:bg-amber-100',
      IN_PROGRESS: 'bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700 hover:bg-orange-100',
      COMPLETED:   'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700 hover:bg-green-100 cursor-pointer',
      CANCELLED:   'bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 cursor-default',
      NO_SHOW:     'bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 cursor-default',
      RESCHEDULED: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 cursor-default',
    };
    return map[status] || 'bg-slate-50 text-slate-600 border-slate-200 cursor-default';
  }

  monthStatusPill(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED:   'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200',
      CONFIRMED:   'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200',
      WAITING:     'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200',
      IN_PROGRESS: 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200',
      COMPLETED:   'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200',
      CANCELLED:   'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400',
      NO_SHOW:     'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400',
      RESCHEDULED: 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200',
    };
    return map[status] || 'bg-slate-200 text-slate-500';
  }

  // ── Reschedule
  openRescheduleModal() {
    const apt = this.detailApt();
    if (!apt) return;
    const d = new Date(apt.scheduledAt);
    this.rescheduleForm = {
      date: d.toISOString().split('T')[0],
      time: '',
      duration: apt.durationMinutes,
      doctorId: apt.doctorId,
      cancelReason: '',
      sendReminder: false,
    };
    this.rescheduleSlots.set([]);
    this.rescheduleWorkingHours.set(null);
    this.rescheduleNoSchedule.set(false);
    this.showRescheduleModal.set(true);
    this.loadRescheduleSlots();
  }

  closeRescheduleModal() { this.showRescheduleModal.set(false); }

  loadRescheduleSlots() {
    const { doctorId, date, duration } = this.rescheduleForm;
    if (!doctorId || !date) return;
    this.loadingSlots.set(true);
    this.rescheduleForm.time = '';
    this.api.get<any>(`/appointments/available-slots?doctorId=${doctorId}&date=${date}&duration=${duration}`).subscribe({
      next: (res: any) => {
        this.rescheduleSlots.set(res.slots || []);
        this.rescheduleWorkingHours.set(res.workingHours || null);
        this.rescheduleNoSchedule.set(!!res.noSchedule);
        this.loadingSlots.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loadingSlots.set(false); this.cdr.markForCheck(); },
    });
  }

  selectRescheduleSlot(time: string) { this.rescheduleForm.time = time; }

  saveReschedule() {
    const apt = this.detailApt();
    if (!apt || !this.rescheduleForm.date || !this.rescheduleForm.time) return;
    this.savingReschedule.set(true);
    this.api.post(`/appointments/${apt.id}/reschedule`, {
      scheduledAt: `${this.rescheduleForm.date}T${this.rescheduleForm.time}:00`,
      durationMinutes: this.rescheduleForm.duration,
      doctorId: this.rescheduleForm.doctorId || undefined,
      cancelReason: this.rescheduleForm.cancelReason || undefined,
      sendReminder: this.rescheduleForm.sendReminder,
    }).subscribe({
      next: () => {
        this.savingReschedule.set(false);
        this.closeRescheduleModal();
        this.detailApt.set(null);
        this.showToast('success', 'Cita reprogramada exitosamente');
        this.loadBoardData();
        if (this.view() === 'list') this.loadList();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.savingReschedule.set(false);
        this.showToast('error', err?.error?.message || 'Error al reprogramar la cita');
        this.cdr.markForCheck();
      },
    });
  }

  printAppointmentPdf(apt: any) {
    const user = this.auth.currentUser();
    const clinic = this.branchCtx.activeClinic();
    const branch = this.branchCtx.activeBranch();
    const clinicName = clinic?.name || user?.tenant?.name || 'Clínica';
    const branchName = branch?.name || '';
    const clinicLogo = clinic?.logoUrl ? this.api.getStaticUrl(clinic.logoUrl) : null;

    const statusLabels: Record<string, string> = {
      SCHEDULED: 'Agendada', CONFIRMED: 'Confirmada', WAITING: 'En espera',
      IN_PROGRESS: 'En atención', COMPLETED: 'Completada',
      CANCELLED: 'Cancelada', NO_SHOW: 'No se presentó', RESCHEDULED: 'Reprogramada',
    };
    const payLabels: Record<string, string> = { PAID: 'Pagado', PARTIAL: 'Parcial', PENDING: 'Pendiente' };
    const methodLabels: Record<string, string> = {
      CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', QR: 'QR', OTHER: 'Otro',
    };

    const clinicalMeta = (apt.metadata as any)?.clinical || null;
    const dateStr = apt.scheduledAt
      ? new Date(apt.scheduledAt).toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const timeStr = apt.scheduledAt
      ? new Date(apt.scheduledAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
      : '';

    // Payment breakdown computations
    const txList: any[] = apt.treatments || [];
    const subtotal = txList.reduce((s: number, t: any) => s + (Number(t.unitPrice) || 0) * (Number(t.quantity) || 1), 0);
    const totalAmt = Number(apt.totalAmount) || 0;
    const paidAmt = Number(apt.paidAmount) || 0;
    const discountAmt = subtotal > totalAmt + 0.009 ? subtotal - totalAmt : 0;
    const saldo = totalAmt > paidAmt + 0.009 ? totalAmt - paidAmt : 0;

    const treatments = txList.map((t: any) => {
      const disc = Number(t.discount) || 0;
      return `<tr>
        <td style="padding:5px 8px">${t.treatment?.name || '—'}</td>
        <td style="padding:5px 8px;text-align:center">${t.quantity}</td>
        <td style="padding:5px 8px;text-align:right">Bs. ${Number(t.unitPrice || 0).toFixed(2)}</td>
        <td style="padding:5px 8px;text-align:center;color:#10b981">${disc > 0 ? disc + '%' : '—'}</td>
        <td style="padding:5px 8px;text-align:right;font-weight:600">Bs. ${Number(t.totalPrice || 0).toFixed(2)}</td>
      </tr>`;
    }).join('');

    const payments = (apt.payments || []).map((p: any) =>
      `<tr><td style="padding:5px 8px">${methodLabels[p.method] || p.method}</td><td style="padding:5px 8px">${p.reference || '—'}</td><td style="padding:5px 8px;text-align:right;font-weight:600;color:#16a34a">Bs. ${Number(p.amount || 0).toFixed(2)}</td></tr>`
    ).join('');

    const paymentSummaryRows = [
      subtotal > 0 && discountAmt > 0 ? `<tr><td style="text-align:right;padding:3px 8px;color:#64748b">Subtotal:</td><td style="padding:3px 8px;text-align:right">Bs. ${subtotal.toFixed(2)}</td></tr>` : '',
      discountAmt > 0 ? `<tr><td style="text-align:right;padding:3px 8px;color:#10b981">Descuento:</td><td style="padding:3px 8px;text-align:right;color:#10b981;font-weight:600">− Bs. ${discountAmt.toFixed(2)}</td></tr>` : '',
      totalAmt > 0 ? `<tr style="border-top:1px solid #e2e8f0"><td style="text-align:right;padding:5px 8px;font-weight:600">Total facturado:</td><td style="padding:5px 8px;text-align:right;font-weight:700">Bs. ${totalAmt.toFixed(2)}</td></tr>` : '',
      `<tr><td style="text-align:right;padding:3px 8px;color:#16a34a;font-weight:600">Total pagado:</td><td style="padding:3px 8px;text-align:right;color:#16a34a;font-weight:700">Bs. ${paidAmt.toFixed(2)}</td></tr>`,
      saldo > 0 ? `<tr style="background:#fef2f2"><td style="text-align:right;padding:5px 8px;color:#dc2626;font-weight:700">⚠ Saldo pendiente:</td><td style="padding:5px 8px;text-align:right;color:#dc2626;font-weight:800;font-size:14px">Bs. ${saldo.toFixed(2)}</td></tr>` : '',
    ].join('');

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Detalle de Cita — ${apt.patient?.firstName} ${apt.patient?.lastName}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; margin: 0; padding: 24px; }
  .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; }
  .logo { width: 56px; height: 56px; object-fit: contain; }
  .clinic-name { font-size: 18px; font-weight: bold; color: #1d4ed8; }
  .clinic-sub { font-size: 11px; color: #64748b; }
  h3 { font-size: 13px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: .05em; margin: 16px 0 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .row { display: flex; gap: 8px; margin-bottom: 3px; }
  .label { color: #64748b; min-width: 110px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 600; }
  td { border-bottom: 1px solid #f1f5f9; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="header">
  ${clinicLogo ? `<img src="${clinicLogo}" class="logo" alt="logo">` : ''}
  <div>
    <div class="clinic-name">${clinicName}</div>
    <div class="clinic-sub">${branchName}</div>
    <div class="clinic-sub">Comprobante de Cita Médica</div>
  </div>
  <div style="margin-left:auto;text-align:right">
    <div style="font-size:11px;color:#64748b">Fecha de impresión</div>
    <div style="font-weight:600">${new Date().toLocaleDateString('es-BO')}</div>
  </div>
</div>

<div class="grid">
  <div>
    <h3>Datos del Paciente</h3>
    <div class="row"><span class="label">Nombre:</span><strong>${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}</strong></div>
    <div class="row"><span class="label">Teléfono:</span>${apt.patient?.phone || '—'}</div>
    <div class="row"><span class="label">Email:</span>${apt.patient?.email || '—'}</div>
  </div>
  <div>
    <h3>Datos de la Cita</h3>
    <div class="row"><span class="label">Fecha:</span><strong>${dateStr}</strong></div>
    <div class="row"><span class="label">Hora:</span>${timeStr}</div>
    <div class="row"><span class="label">Duración:</span>${apt.durationMinutes || 30} min</div>
    <div class="row"><span class="label">Estado:</span><span class="badge badge-${apt.status === 'COMPLETED' ? 'green' : apt.status === 'CANCELLED' || apt.status === 'NO_SHOW' ? 'red' : 'blue'}">${statusLabels[apt.status] || apt.status}</span></div>
    <div class="row"><span class="label">Pago:</span><span class="badge badge-${apt.paymentStatus === 'PAID' ? 'green' : apt.paymentStatus === 'PARTIAL' ? 'gray' : 'red'}">${payLabels[apt.paymentStatus] || '—'}</span></div>
  </div>
</div>

${txList.length ? `<h3>Tratamientos</h3>
<table><thead><tr><th>Tratamiento</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio unit.</th><th style="text-align:center">Descuento</th><th style="text-align:right">Total</th></tr></thead><tbody>${treatments}</tbody></table>` : ''}

<h3>Resumen de Pago</h3>
<div style="display:flex;justify-content:flex-end;">
  <table style="width:auto;min-width:260px;border-collapse:collapse;font-size:12px;">
    <tbody>${paymentSummaryRows}</tbody>
  </table>
</div>

${payments ? `<h3>Historial de Pagos</h3>
<table><thead><tr><th>Método</th><th>Referencia</th><th style="text-align:right">Monto</th></tr></thead><tbody>${payments}</tbody></table>` : ''}

${clinicalMeta ? `<h3>Historia Clínica</h3>
${clinicalMeta.chiefComplaint ? `<div class="row"><span class="label">Motivo:</span>${clinicalMeta.chiefComplaint}</div>` : ''}
${clinicalMeta.diagnosis ? `<div class="row"><span class="label">Diagnóstico:</span>${clinicalMeta.diagnosis}</div>` : ''}
${clinicalMeta.clinicalNotes ? `<div class="row"><span class="label">Notas clínicas:</span>${clinicalMeta.clinicalNotes}</div>` : ''}
${clinicalMeta.observations ? `<div class="row"><span class="label">Observaciones:</span>${clinicalMeta.observations}</div>` : ''}
${clinicalMeta.nextVisitRecommendation ? `<div class="row"><span class="label">Próxima visita:</span>${clinicalMeta.nextVisitRecommendation}</div>` : ''}` : ''}

${apt.notes ? `<h3>Notas de la Cita</h3><p style="margin:4px 0">${apt.notes}</p>` : ''}

<div class="footer">${clinicName} · ${branchName} · Generado por ClinicOS · ${new Date().toLocaleString('es-BO')}</div>
</body></html>`;

    // Use Blob URL so the parent window is NEVER blocked
    const slug = clinicName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const printScript = `<script>try{history.replaceState(null,'','/clinicOS/detalle-cita-${slug}');}catch(e){}window.onload=function(){window.print();};<\/script>`;
    const printHtml = html.replace('</body>', printScript + '</body>');
    const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }
}
