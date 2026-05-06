import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { DoctorProfile } from '../../core/models';

@Component({
  selector: 'app-doctors',
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
          <h1 class="page-title">Doctores</h1>
          <p class="page-subtitle">Gestiona el personal médico</p>
        </div>
        @if (isAdmin()) {
          <button (click)="openModal()" class="btn-primary">+ Nuevo Doctor</button>
        }
      </div>

      <!-- Search -->
      <div class="card p-4 flex gap-3 items-center">
        <input [(ngModel)]="search" (input)="loadDoctors()" class="input w-64" placeholder="Buscar doctor...">
        <select [(ngModel)]="selectedSpecialty" (change)="loadDoctors()" class="input w-48">
          <option value="">Todas las especialidades</option>
          @for (s of specialties; track s) {
            <option [value]="s">{{ s }}</option>
          }
        </select>
      </div>

      <!-- Grid de cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        @for (d of doctors(); track d.id) {
          <div class="card p-5 hover:shadow-lg transition-shadow">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {{ initials(d) }}
                </div>
                <div>
                  <p class="font-semibold text-slate-900 dark:text-white">{{ d.user?.firstName }} {{ d.user?.lastName }}</p>
                  @if (d.user?.email || d.user?.phone) {
                    <p class="text-xs text-slate-500">{{ d.user?.email || d.user?.phone }}</p>
                  } @else {
                    <p class="text-xs text-slate-400 italic">Sin acceso al sistema</p>
                  }
                </div>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span [class]="d.isActive ? 'badge-green' : 'badge-red'">
                  {{ d.isActive ? 'Activo' : 'Inactivo' }}
                </span>
                @if (!d.user?.email && !d.user?.phone) {
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">Sin acceso</span>
                }
              </div>
            </div>

            @if (d.specialties.length) {
              <div class="flex flex-wrap gap-1 mb-3">
                @for (s of d.specialties.slice(0, 3); track s) {
                  <span class="badge-blue text-xs">{{ s }}</span>
                }
              </div>
            }

            <div class="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
              @if (d.licenseNumber) {
                <span>CMP: {{ d.licenseNumber }}</span>
              }
              @if (d.consultationFee) {
                <span>Consulta: Bs. {{ d.consultationFee }}</span>
              }
              <span>Comisión: {{ d.commissionValue }}{{ d.commissionType === 'PERCENTAGE' ? '%' : ' Bs.' }}</span>
              @if (getBranches(d).length) {
                <span class="col-span-2 flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {{ getBranches(d).join(' · ') }}
                </span>
              }
            </div>

            <div class="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              @if (isAdmin()) {
                <button (click)="openModal(d)" class="text-xs text-primary-600 hover:underline flex-1 text-left">Editar</button>
              }
              <button (click)="viewSchedule(d)" class="text-xs text-slate-500 hover:underline">Horarios</button>
            </div>
          </div>
        } @empty {
          <div class="col-span-3 card p-12 text-center text-slate-400">
            No hay doctores registrados
          </div>
        }
      </div>

      <!-- Ranking -->
      @if (ranking().length) {
        <div class="card p-6">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Ranking por Ingresos</h3>
          <div class="space-y-3">
            @for (r of ranking(); track r.doctorId; let i = $index) {
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-slate-400 w-5">{{ i + 1 }}</span>
                <div class="flex-1">
                  <div class="flex justify-between mb-1">
                    <span class="text-sm font-medium">{{ r.name }}</span>
                    <span class="text-sm font-semibold text-slate-900 dark:text-white">Bs. {{ r.revenue | number:'1.0-0' }}</span>
                  </div>
                  <div class="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full bg-primary-500 rounded-full" [style.width.%]="(r.revenue / ranking()[0].revenue) * 100"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Modal Doctor -->
    @if (showModal()) {
      <div class="fixed inset-0 z-[70] overflow-y-auto bg-black/40 backdrop-blur-sm" (click)="closeModal()">
        <div class="flex min-h-full items-start justify-center p-4">
        <div class="card w-full max-w-lg p-6 animate-fade-in mt-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-5">
            {{ editing() ? 'Editar Perfil Médico' : 'Nuevo Doctor' }}
          </h2>
          <div class="space-y-4">

            <!-- Usuario selector (solo al crear) -->
            @if (!editing()) {
              <div>
                <label class="label">Seleccionar usuario doctor *</label>
                @if (loadingUsers()) {
                  <div class="input flex items-center gap-2 text-slate-400 text-sm">
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Cargando usuarios...
                  </div>
                } @else if (availableDoctorUsers().length > 0) {
                  <select [(ngModel)]="form.userId" class="input">
                    <option value="">— Seleccionar usuario —</option>
                    @for (u of availableDoctorUsers(); track u.id) {
                      <option [value]="u.id">
                        {{ u.firstName }} {{ u.lastName }}{{ u.email ? ' (' + u.email + ')' : u.phone ? ' (' + u.phone + ')' : ' — sin acceso' }}
                      </option>
                    }
                  </select>
                  <p class="text-xs text-slate-400 mt-1">Solo usuarios con rol DOCTOR sin perfil médico asignado</p>
                } @else {
                  <div class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                    No hay usuarios DOCTOR disponibles.
                  </div>
                }

                <!-- Botones para crear nuevo doctor -->
                <div class="mt-2 flex gap-2 flex-wrap">
                  <button type="button" (click)="toggleCreateUser(false)"
                    class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    {{ (showCreateUser() && !ghostDoctor()) ? 'Cancelar' : 'Crear doctor con acceso' }}
                  </button>
                  <span class="text-xs text-slate-300 dark:text-slate-600">|</span>
                  <button type="button" (click)="toggleCreateUser(true)"
                    class="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    {{ (showCreateUser() && ghostDoctor()) ? 'Cancelar' : 'Doctor sin acceso al sistema' }}
                  </button>
                </div>

                @if (showCreateUser()) {
                  <div class="mt-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                    @if (ghostDoctor()) {
                      <div class="flex items-center gap-2 mb-1">
                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Doctor sin acceso al sistema</p>
                      </div>
                      <p class="text-xs text-slate-400">Aparece en la agenda pero no puede iniciar sesión.</p>
                    } @else {
                      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nuevo usuario doctor</p>
                    }
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="label">Nombre *</label>
                        <input [(ngModel)]="newUser.firstName" class="input" placeholder="María">
                      </div>
                      <div>
                        <label class="label">Apellido *</label>
                        <input [(ngModel)]="newUser.lastName" class="input" placeholder="García">
                      </div>
                    </div>
                    @if (!ghostDoctor()) {
                      <div>
                        <label class="label">Celular *</label>
                        <div class="flex gap-1">
                          <span class="input w-[68px] shrink-0 flex items-center justify-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-700/50 cursor-default select-none">🇧🇴 +591</span>
                          <input [(ngModel)]="newUser.phone" class="input flex-1" placeholder="70012345">
                        </div>
                      </div>
                      <div>
                        <label class="label">Email <span class="text-slate-400 font-normal">(opcional)</span></label>
                        <input [(ngModel)]="newUser.email" type="email" class="input" placeholder="dr.garcia@clinica.com">
                      </div>
                      <div class="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                        Se generará una contraseña automáticamente y se mostrará al crear
                      </div>
                    }
                    <button type="button" (click)="createDoctorUser()" class="btn-primary w-full text-sm" [disabled]="creatingUser()">
                      {{ creatingUser() ? 'Creando...' : (ghostDoctor() ? 'Agregar doctor sin acceso' : 'Crear usuario y continuar') }}
                    </button>
                  </div>
                }
              </div>
            }

            <div>
              <label class="label">Número de Matrícula / Registro</label>
              <input [(ngModel)]="form.licenseNumber" class="input" placeholder="RM-123456">
            </div>
            <div>
              <label class="label">Especialidades (separadas por coma)</label>
              <input [(ngModel)]="form.specialtiesStr" class="input" placeholder="Odontología General, Ortodoncia">
            </div>
            <div>
              <label class="label">Biografía</label>
              <textarea [(ngModel)]="form.bio" class="input resize-none" rows="2" placeholder="Breve descripción profesional..."></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Precio de consulta (Bs.)</label>
                <input [(ngModel)]="form.consultationFee" type="number" class="input" placeholder="0.00">
              </div>
              <div>
                <label class="label">Tipo de comisión</label>
                <select [(ngModel)]="form.commissionType" class="input">
                  <option value="PERCENTAGE">Porcentaje (%)</option>
                  <option value="FIXED">Monto Fijo (Bs.)</option>
                </select>
              </div>
            </div>
            <div>
              <label class="label">Valor de comisión</label>
              <input [(ngModel)]="form.commissionValue" type="number" class="input" placeholder="0">
            </div>

            @if (!editing() && branchesForFilter().length > 0) {
              <div>
                <label class="label">Sede / Sucursal <span class="text-slate-400 font-normal">(opcional)</span></label>
                <select [(ngModel)]="form.branchId" class="input">
                  <option value="">Todas las sedes</option>
                  @for (b of branchesForFilter(); track b.id) {
                    <option [value]="b.id">{{ b.name }}</option>
                  }
                </select>
                <p class="text-xs text-slate-400 mt-1">
                  @if (form.branchId) {
                    El doctor aparecerá disponible en esta sede con horario Lun–Sáb 08:00–18:00 (puedes editarlo después en la pestaña Horarios)
                  } @else {
                    Sin sede asignada — el doctor aparecerá disponible en todas las sedes
                  }
                </p>
              </div>
            }

            @if (editing()) {
              @if (getBranches(editing()!).length > 0) {
                <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                  <p class="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Sedes asignadas</p>
                  <div class="flex flex-wrap gap-1.5">
                    @for (name of getBranches(editing()!); track name) {
                      <span class="text-xs bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">{{ name }}</span>
                    }
                  </div>
                  <p class="text-xs text-slate-400 mt-1.5">Para cambiar las sedes o el horario, usa la pestaña <strong>Horarios</strong> en la tabla.</p>
                </div>
              } @else {
                <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p class="text-xs text-slate-500">Este doctor no tiene sede asignada — aparece disponible en todas las sedes.</p>
                  <p class="text-xs text-slate-400 mt-1">Para asignar una sede y horario, usa la pestaña <strong>Horarios</strong> en la tabla.</p>
                </div>
              }
            }
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

    <!-- Modal Credenciales (reemplaza alert nativo) -->
    @if (credentials()) {
      <div class="fixed inset-0 z-[80] overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="card w-full max-w-sm p-6 animate-fade-in text-center">
          <div class="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-1">Usuario creado</h3>
          <p class="text-sm text-slate-500 mb-4">Guarda estas credenciales antes de cerrar</p>
          <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-left space-y-2 mb-5">
            <div>
              <p class="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Celular (para iniciar sesión)</p>
              <p class="text-sm font-mono font-semibold text-slate-900 dark:text-white select-all">{{ credentials()!.phone }}</p>
            </div>
            @if (credentials()!.email) {
              <div>
                <p class="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Email (alternativo)</p>
                <p class="text-sm font-mono font-semibold text-slate-900 dark:text-white select-all">{{ credentials()!.email }}</p>
              </div>
            }
            <div>
              <p class="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Contraseña</p>
              <p class="text-sm font-mono font-semibold text-slate-900 dark:text-white select-all">{{ credentials()!.password }}</p>
            </div>
          </div>
          <button (click)="credentials.set(null)" class="btn-primary w-full">Entendido, ya guardé</button>
        </div>
      </div>
    }

    <!-- Modal Horarios (editable) -->
    @if (showScheduleModal()) {
      <div class="fixed inset-0 z-[70] overflow-y-auto bg-black/40 backdrop-blur-sm" (click)="showScheduleModal.set(false)">
        <div class="flex min-h-full items-start justify-center p-4">
        <div class="card w-full max-w-2xl p-6 animate-fade-in mt-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Horarios — {{ scheduleDoctor()?.user?.firstName }} {{ scheduleDoctor()?.user?.lastName }}
          </h2>
          <p class="text-xs text-slate-400 mb-5">Activa los días y configura el horario de atención</p>

          <div class="space-y-1">
            @for (row of scheduleRows(); track row.dayOfWeek; let i = $index) {
              <div class="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0"
                   [ngClass]="{'opacity-40': !row.active}">
                <!-- Toggle + Day name -->
                <label class="flex items-center gap-2 w-20 shrink-0 cursor-pointer select-none">
                  <input type="checkbox" [checked]="row.active"
                    (change)="updateScheduleRow(i, 'active', $any($event.target).checked)"
                    class="w-4 h-4 rounded accent-primary-500 cursor-pointer">
                  <span class="text-sm font-medium w-8">{{ dayName(row.dayOfWeek) }}</span>
                </label>

                @if (row.active) {
                  <div class="flex flex-wrap items-center gap-2 flex-1">
                    <div class="flex items-center gap-1">
                      <span class="text-xs text-slate-400 whitespace-nowrap">Inicio</span>
                      <input type="time" [ngModel]="row.startTime"
                        (ngModelChange)="updateScheduleRow(i, 'startTime', $event)"
                        class="input input-sm w-28">
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="text-xs text-slate-400 whitespace-nowrap">Fin</span>
                      <input type="time" [ngModel]="row.endTime"
                        (ngModelChange)="updateScheduleRow(i, 'endTime', $event)"
                        class="input input-sm w-28">
                    </div>
                    <select [ngModel]="row.slotMinutes + ''"
                      (ngModelChange)="updateScheduleRow(i, 'slotMinutes', +$event)"
                      class="input input-sm w-24">
                      <option value="15">15 min</option>
                      <option value="20">20 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                    </select>
                    @if (branchCtx.branches().length > 0) {
                      <select [ngModel]="row.branchId"
                        (ngModelChange)="updateScheduleRow(i, 'branchId', $event)"
                        class="input input-sm flex-1 min-w-[120px]">
                        <option value="">Sin sucursal</option>
                        @for (b of branchCtx.branches(); track b.id) {
                          <option [value]="b.id">{{ b.name }}</option>
                        }
                      </select>
                    }
                  </div>
                } @else {
                  <span class="text-xs text-slate-400 italic">Día no laboral</span>
                }
              </div>
            }
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button (click)="showScheduleModal.set(false)" class="btn-secondary">Cancelar</button>
            <button (click)="saveSchedule()" class="btn-primary" [disabled]="savingSchedule()">
              {{ savingSchedule() ? 'Guardando...' : 'Guardar horarios' }}
            </button>
          </div>
        </div>
        </div>
      </div>
    }
  `,
})
export class DoctorsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  protected branchCtx = inject(BranchContextService);

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  isAdmin = computed(() => ['ADMIN', 'SECRETARY', 'DOCTOR_ADMIN', 'SUPER_ADMIN'].includes(this.auth.currentUser()?.role ?? ''));
  tenants = signal<any[]>([]);
  clinicsForFilter = signal<any[]>([]);
  filterTenantId = signal<string>('');
  filterClinicId = signal<string>('');
  branchesForFilter = signal<any[]>([]);
  filterBranchId = signal<string>('');

  doctors = signal<DoctorProfile[]>([]);
  ranking = signal<any[]>([]);
  showModal = signal(false);
  showScheduleModal = signal(false);
  scheduleDoctor = signal<DoctorProfile | null>(null);
  scheduleRows = signal<{ dayOfWeek: number; active: boolean; startTime: string; endTime: string; slotMinutes: number; branchId: string }[]>([]);
  savingSchedule = signal(false);
  editing = signal<DoctorProfile | null>(null);
  saving = signal(false);
  availableDoctorUsers = signal<any[]>([]);
  loadingUsers = signal(false);
  showCreateUser = signal(false);
  ghostDoctor = signal(false);
  creatingUser = signal(false);
  newUser = { firstName: '', lastName: '', phone: '', email: '' };
  credentials = signal<{ phone: string; email: string; password: string } | null>(null);

  search = '';
  selectedSpecialty = '';

  specialties = ['Odontología General', 'Ortodoncia', 'Endodoncia', 'Periodoncia', 'Cirugía Oral', 'Implantología', 'Pediatría Dental'];

  form = this.emptyForm();

  constructor() {
    // Reload whenever branch changes (including switching to "all branches" = empty string)
    effect(() => {
      this.branchCtx.activeBranchId(); // track signal
      if (!this.isSuperAdmin()) this.loadDoctors();
    });
  }

  ngOnInit() {
    if (this.isSuperAdmin()) this.loadTenants();
    if (this.isSuperAdmin()) this.loadDoctors(); // non-SA loaded by effect
    this.loadRanking();
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
    this.loadDoctors();
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
    this.loadDoctors();
  }

  onBranchFilterChange(branchId: string) {
    this.filterBranchId.set(branchId);
    this.loadDoctors();
  }

  clearFilters() {
    this.filterTenantId.set('');
    this.filterClinicId.set('');
    this.filterBranchId.set('');
    this.clinicsForFilter.set([]);
    this.branchesForFilter.set([]);
    this.loadDoctors();
  }

  loadDoctors() {
    const params: any = { limit: 50 };
    if (this.search) params.search = this.search;
    if (this.selectedSpecialty) params.specialty = this.selectedSpecialty;
    if (this.isSuperAdmin()) {
      if (this.filterTenantId()) params.tenantId = this.filterTenantId();
      if (this.filterClinicId()) params.clinicId = this.filterClinicId();
      if (this.filterBranchId()) params.branchId = this.filterBranchId();
    } else {
      const branchId = this.branchCtx.activeBranchId();
      if (branchId) params.branchId = branchId;
    }
    this.api.getPaginated<DoctorProfile>('/doctors', params).subscribe(r => this.doctors.set(r.data));
  }

  loadRanking() {
    this.api.get<any[]>('/doctors/ranking').subscribe(r => this.ranking.set(r));
  }

  initials(d: DoctorProfile) {
    const u = d.user;
    if (!u) return 'DR';
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }

  getBranches(d: any): string[] {
    const schedules = d.schedules as { branchId?: string }[] | undefined;
    if (!schedules) return [];
    const branchIds = [...new Set(schedules.map(s => s.branchId).filter((id): id is string => !!id))];
    const branches = this.branchCtx.branches();
    return branchIds.map(id => branches.find(br => br.id === id)?.name || id);
  }

  viewSchedule(d: DoctorProfile) {
    this.api.get<DoctorProfile>(`/doctors/${d.id}`).subscribe(doc => {
      this.scheduleDoctor.set(doc);
      // Build editable rows: Mon(1)–Sat(6) + Sun(0)
      const dayOrder = [1, 2, 3, 4, 5, 6, 0];
      const existingMap = new Map((doc.schedules as any[] || []).map((s: any) => [s.dayOfWeek, s]));
      const defaultBranch = this.branchCtx.activeBranchId() || this.branchCtx.branches()[0]?.id || '';
      this.scheduleRows.set(dayOrder.map(day => {
        const s = existingMap.get(day);
        return {
          dayOfWeek: day,
          active: !!s,
          startTime: s?.startTime || '08:00',
          endTime: s?.endTime || '18:00',
          slotMinutes: s?.slotMinutes || 30,
          branchId: s?.branchId || defaultBranch,
        };
      }));
      this.showScheduleModal.set(true);
    });
  }

  updateScheduleRow(index: number, field: string, value: any) {
    this.scheduleRows.update(rows => rows.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  saveSchedule() {
    const doctorId = this.scheduleDoctor()?.id;
    if (!doctorId) return;
    this.savingSchedule.set(true);
    const schedules = this.scheduleRows()
      .filter(r => r.active)
      .map(r => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        slotMinutes: r.slotMinutes,
        ...(r.branchId ? { branchId: r.branchId } : {}),
      }));
    this.api.post(`/doctors/${doctorId}/schedule`, { schedules }).subscribe({
      next: () => {
        this.savingSchedule.set(false);
        this.showScheduleModal.set(false);
        this.loadDoctors();
      },
      error: () => this.savingSchedule.set(false),
    });
  }

  dayName(day: number) {
    return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][day];
  }

  openModal(d?: DoctorProfile) {
    if (d) {
      this.editing.set(d);
      this.form = {
        userId: d.userId,
        clinicId: d.clinicId || this.branchCtx.activeClinicId() || '',
        licenseNumber: d.licenseNumber || '',
        specialtiesStr: d.specialties.join(', '),
        bio: d.bio || '',
        consultationFee: d.consultationFee || 0,
        commissionType: d.commissionType,
        commissionValue: d.commissionValue,
        branchId: '',
      };
    } else {
      this.editing.set(null);
      this.form = this.emptyForm();
      this.form.clinicId = this.branchCtx.activeClinicId() || '';
      this.showCreateUser.set(false);
      this.ghostDoctor.set(false);
      this.newUser = { firstName: '', lastName: '', phone: '', email: '' };
      this.loadAvailableUsers();
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.showCreateUser.set(false);
    this.ghostDoctor.set(false);
  }

  toggleCreateUser(ghost: boolean) {
    const isOpen = this.showCreateUser() && this.ghostDoctor() === ghost;
    this.showCreateUser.set(!isOpen);
    this.ghostDoctor.set(ghost);
    this.newUser = { firstName: '', lastName: '', phone: '', email: '' };
  }

  loadAvailableUsers() {
    this.loadingUsers.set(true);
    this.api.getPaginated<any>('/users', { role: 'DOCTOR', limit: 100 }).subscribe({
      next: r => {
        const existingIds = new Set(this.doctors().map(d => d.userId));
        this.availableDoctorUsers.set(r.data.filter((u: any) => !existingIds.has(u.id)));
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false),
    });
  }

  createDoctorUser() {
    if (!this.newUser.firstName || !this.newUser.lastName) return;
    if (!this.ghostDoctor() && !this.newUser.phone) return;
    this.creatingUser.set(true);
    const password = this.generatePassword();
    const body: any = {
      firstName: this.newUser.firstName,
      lastName: this.newUser.lastName,
      role: 'DOCTOR',
      password,
    };
    if (this.ghostDoctor()) {
      body.status = 'INACTIVE';
    } else {
      body.phone = this.newUser.phone;
      if (this.newUser.email) body.email = this.newUser.email;
    }
    this.api.post<any>('/users', body).subscribe({
      next: (u: any) => {
        this.creatingUser.set(false);
        this.showCreateUser.set(false);
        this.form.userId = u.id;
        this.availableDoctorUsers.update(list => [...list, u]);
        if (!this.ghostDoctor()) {
          this.credentials.set({ phone: u.phone, email: u.email || '', password });
        }
      },
      error: () => this.creatingUser.set(false),
    });
  }

  private generatePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  save() {
    this.saving.set(true);
    const body: any = {
      ...this.form,
      specialties: this.form.specialtiesStr.split(',').map(s => s.trim()).filter(Boolean),
    };
    delete body.specialtiesStr;
    const selectedBranchId = this.form.branchId;
    delete body.branchId; // branchId is not a field on DoctorProfile
    const isCreating = !this.editing();

    const req = this.editing()
      ? this.api.patch(`/doctors/${this.editing()!.id}`, body)
      : this.api.post<any>('/doctors', body);

    req.subscribe({
      next: (doctor: any) => {
        // Auto-create Mon-Sat default schedule for the selected branch
        if (isCreating && selectedBranchId && doctor?.id) {
          const defaultSchedules = [1, 2, 3, 4, 5, 6].map(day => ({
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '18:00',
            slotMinutes: 30,
            branchId: selectedBranchId,
          }));
          this.api.post(`/doctors/${doctor.id}/schedule`, { schedules: defaultSchedules }).subscribe({
            next: () => {}, error: () => {},
          });
        }
        this.saving.set(false);
        this.closeModal();
        this.loadDoctors();
        this.loadRanking();
      },
      error: () => this.saving.set(false),
    });
  }

  private emptyForm() {
    return { userId: '', clinicId: '', licenseNumber: '', specialtiesStr: '', bio: '', consultationFee: 0, commissionType: 'PERCENTAGE', commissionValue: 0, branchId: '' };
  }
}
