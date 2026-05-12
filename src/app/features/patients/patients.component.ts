import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { Patient } from '../../core/models';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 animate-slide-up">
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
          <h1 class="page-title">{{ isOnlyDoctor() ? 'Mis Pacientes' : 'Pacientes' }}</h1>
          <p class="page-subtitle">
            @if (isOnlyDoctor()) {
              {{ total() }} pacientes que has atendido
            } @else {
              {{ total() }} pacientes registrados
            }
          </p>
        </div>
        @if (canCreatePatient() && !isOnlyDoctor()) {
          <button class="btn-primary" (click)="showModal.set(true)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Nuevo Paciente
          </button>
        }
      </div>

      <!-- Search -->
      <div class="card p-4">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" [(ngModel)]="searchTerm" (input)="onSearch()" placeholder="Buscar por nombre, teléfono o documento..."
            class="input pl-10 w-full max-w-md">
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Contacto</th>
              <th>Documento</th>
              <th class="hidden lg:table-cell">Sucursal</th>
              <th>Última Visita</th>
              <th>Citas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              @for (_ of [1,2,3,4,5]; track $index) {
                <tr><td colspan="6"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse"></div></td></tr>
              }
            } @else {
              @for (patient of patients(); track patient.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-violet-700 dark:text-violet-300 text-xs font-bold">
                        {{ patient.firstName[0] }}{{ patient.lastName[0] }}
                      </div>
                      <div>
                        <div class="font-medium text-slate-900 dark:text-white">{{ patient.firstName }} {{ patient.lastName }}</div>
                        @if (patient.birthDate) {
                          <div class="text-xs text-slate-500">{{ calcAge(patient.birthDate) }} años</div>
                        }
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="text-sm">{{ patient.phone }}</div>
                    @if (patient.email) {
                      <div class="text-xs text-slate-500">{{ patient.email }}</div>
                    }
                  </td>
                  <td>
                    @if (patient.documentNumber) {
                      <span class="badge-gray">{{ patient.documentType }} {{ patient.documentNumber }}</span>
                    } @else {
                      <span class="text-slate-400 text-xs">—</span>
                    }
                  </td>
                  <td class="hidden lg:table-cell">
                    @if (patient.branch) {
                      <span class="inline-flex items-center gap-1 text-xs text-slate-500">
                        <svg class="w-3 h-3 text-primary-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        {{ patient.branch.name }}
                        @if (patient.branch.isMain) { <span class="text-[10px] text-primary-500">(Principal)</span> }
                      </span>
                    } @else {
                      <span class="text-slate-400 text-xs">—</span>
                    }
                  </td>
                  <td>
                    @if (patient.lastVisitAt) {
                      <span class="text-sm">{{ patient.lastVisitAt | date:'dd/MM/yyyy' }}</span>
                    } @else {
                      <span class="text-slate-400 text-xs">Sin visitas</span>
                    }
                  </td>
                  <td>
                    <span class="badge-blue">{{ patient['_count']?.appointments || 0 }}</span>
                  </td>
                  <td>
                    <div class="flex items-center gap-0.5">
                      <button (click)="openDetail(patient)" title="Ver detalle"
                        class="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 dark:text-primary-400 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </button>
                      @if (canCreatePatient()) {
                        <button (click)="edit(patient)" title="Editar"
                          class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button (click)="deletePatient(patient)" title="Eliminar paciente"
                          class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      }
                      <button (click)="exportPdf(patient)" title="Exportar PDF"
                        class="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7">
                  <div class="empty-state py-12">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <p class="empty-state-title">Sin pacientes registrados</p>
                    <p class="empty-state-desc">Agrega el primer paciente para comenzar</p>
                  </div>
                </td></tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (total() > 0) {
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          <div class="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>Mostrando {{ showingFrom() }}–{{ showingTo() }} de {{ total() }} pacientes</span>
            <div class="flex items-center gap-1.5">
              <span class="text-xs">Por página:</span>
              <select class="input input-sm w-16 text-xs py-1" [value]="pageSize()" (change)="changePageSize(+$any($event.target).value)">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          @if (totalPages() > 1) {
            <div class="flex items-center gap-1">
              <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1"
                class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-500 dark:text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              @for (pg of pageNumbers(); track pg) {
                @if (pg === '...') {
                  <span class="px-1.5 text-slate-400 text-sm select-none">…</span>
                } @else {
                  <button (click)="goToPage($any(pg))"
                    class="min-w-[32px] h-8 px-2 rounded-lg text-sm border transition-colors"
                    [ngClass]="pageButtonClass($any(pg))">
                    {{ pg }}
                  </button>
                }
              }
              <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()"
                class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-500 dark:text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          }
        </div>
      }

      <!-- Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-center">
          <div class="modal modal-xl animate-slide-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ editingId() ? 'Editar' : 'Nuevo' }} Paciente</h2>
              <button (click)="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form [formGroup]="form" (ngSubmit)="save()" class="modal-body space-y-4">

              <!-- Datos personales -->
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Datos Personales</p>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">Nombre *</label>
                  <input formControlName="firstName" class="input" placeholder="Juan"
                    [class.border-red-400]="form.get('firstName')?.invalid && form.get('firstName')?.touched">
                  @if (form.get('firstName')?.invalid && form.get('firstName')?.touched) {
                    <p class="text-xs text-red-500 mt-1">El nombre es obligatorio</p>
                  }
                </div>
                <div><label class="label">Apellido</label><input formControlName="lastName" class="input" placeholder="Pérez"></div>
              </div>

              <!-- Documento + nacimiento + sexo -->
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="label">Tipo Documento</label>
                  <select formControlName="documentType" class="input">
                    <option value="">Seleccionar</option>
                    <option value="CI">C.I. (Carnet de Identidad)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="CE">Carnet Extranjería</option>
                  </select>
                </div>
                <div><label class="label">N° Documento</label><input formControlName="documentNumber" class="input" placeholder="12345678"></div>
                <div>
                  <label class="label">Sexo</label>
                  <select formControlName="gender" class="input">
                    <option value="">Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="label">Fecha Nacimiento</label>
                  <input formControlName="birthDate" type="date" class="input">
                  @if (form.get('birthDate')?.value) {
                    <p class="text-xs text-slate-400 mt-1">{{ calcAge(form.get('birthDate')!.value!) }} años</p>
                  }
                </div>
                <div>
                  <label class="label">Grupo Sanguíneo</label>
                  <select formControlName="bloodType" class="input">
                    <option value="">—</option>
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                    <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                  </select>
                </div>
                <div><label class="label">Email</label><input formControlName="email" type="email" class="input" placeholder="correo@ejemplo.com"></div>
              </div>

              <!-- Contacto -->
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-1">Contacto</p>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">Teléfono fijo</label>
                  <input formControlName="phone" class="input" placeholder="2-123456">
                </div>
                <div>
                  <label class="label">WhatsApp <span class="text-slate-400 font-normal">(código de país)</span></label>
                  <div class="flex gap-1">
                    <input [(ngModel)]="waCode" [ngModelOptions]="{standalone: true}" class="input w-[80px] shrink-0 text-center text-sm" placeholder="+591" title="Código de país (ej: +591, +1, +54)">
                    <input formControlName="whatsapp" class="input flex-1" placeholder="70012345">
                  </div>
                  <p class="text-[10px] text-slate-400 mt-0.5">Por defecto Bolivia (+591). Cambia el código si el número es de otro país.</p>
                </div>
              </div>

              <div><label class="label">Alergias</label><input formControlName="allergies" class="input" placeholder="Penicilina, látex, etc."></div>

              <!-- Responsable Económico -->
              <div class="pt-2 border-t border-slate-200 dark:border-slate-700">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Responsable Económico</p>
                  <label class="flex items-center gap-1.5 text-xs text-primary-600 cursor-pointer">
                    <input type="checkbox" class="rounded" (change)="copyPatientAsResponsible($event)">
                    Usar datos del paciente
                  </label>
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <div><label class="label">Nombre</label><input formControlName="economicResponsibleName" class="input" placeholder="Juan Pérez"></div>
                  <div><label class="label">Teléfono</label><input formControlName="economicResponsiblePhone" class="input" placeholder="+591 700..."></div>
                  <div>
                    <label class="label">Relación</label>
                    <select formControlName="economicResponsibleRelation" class="input">
                      <option value="">— ninguno —</option>
                      <option value="padre/madre">Padre/Madre</option>
                      <option value="familiar">Familiar</option>
                      <option value="conyugue">Cónyuge</option>
                      <option value="empresa">Empresa</option>
                      <option value="seguro">Seguro Médico</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Consentimiento WhatsApp -->
              <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input type="checkbox" formControlName="whatsappConsent" class="rounded">
                Acepta recibir mensajes por WhatsApp
              </label>
              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn-primary flex-1" [disabled]="saving()">
                  {{ saving() ? 'Guardando...' : 'Guardar Paciente' }}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      }

      <!-- Confirm save without contact -->

      @if (confirmSaveNoContact()) {
        <div class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up" (click)="$event.stopPropagation()">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900 dark:text-white">Sin datos de contacto</p>
                <p class="text-xs text-slate-400 mt-0.5">¿Confirmar registro sin contacto?</p>
              </div>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300 mb-5">
              El paciente no tiene <strong>celular</strong>, <strong>WhatsApp</strong> ni <strong>email</strong>. Sin datos de contacto no se podrán enviar recordatorios ni confirmaciones de cita.
            </p>
            <div class="flex gap-3">
              <button (click)="confirmSaveNoContact.set(false)" class="btn-secondary flex-1">Volver a editar</button>
              <button (click)="save(true)" [disabled]="saving()"
                class="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50">
                Sí, guardar igual
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Detalle Paciente -->
      @if (detailPatient()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] overflow-y-auto" (click)="closeDetail()">
          <div class="flex min-h-full items-start justify-center p-4">
          <div class="card w-full max-w-3xl animate-fade-in mt-4" (click)="$event.stopPropagation()">
            <div class="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                  {{ detailPatient()!.firstName }} {{ detailPatient()!.lastName }}
                </h2>
                <p class="text-xs text-slate-500">{{ detailPatient()!.phone }}</p>
              </div>
              <div class="flex gap-2">
                <button (click)="exportPdf(detailPatient()!)" class="btn-secondary text-xs">⬇ PDF Historia</button>
                <button (click)="closeDetail()" class="text-slate-400 hover:text-slate-600 ml-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <!-- Tabs -->
            <div class="flex border-b border-slate-200 dark:border-slate-700 px-5">
              @for (tab of ['Información','Archivos','Odontograma','Historial','Planes','Cotizaciones']; track tab) {
                <button (click)="detailTab.set(tab)"
                  class="py-3 px-4 text-sm font-medium border-b-2 transition-colors"
                  [class]="detailTab() === tab ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700'">
                  {{ tab }}
                </button>
              }
            </div>

            <div class="p-5">
              <!-- Tab: Información -->
              @if (detailTab() === 'Información') {
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div><span class="text-slate-500">Email:</span> <span class="ml-1">{{ detailPatient()!.email || '—' }}</span></div>
                  <div><span class="text-slate-500">Documento:</span> <span class="ml-1">{{ detailPatient()!.documentType }} {{ detailPatient()!.documentNumber || '—' }}</span></div>
                  <div><span class="text-slate-500">Sexo:</span> <span class="ml-1">{{ detailPatient()!.gender || '—' }}</span></div>
                  <div><span class="text-slate-500">Grupo sanguíneo:</span> <span class="ml-1">{{ detailPatient()!.bloodType || '—' }}</span></div>
                  @if (detailPatient()!.allergies) {
                    <div class="col-span-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <span class="text-red-600 font-medium">⚠ Alergias:</span> {{ detailPatient()!.allergies }}
                    </div>
                  }
                  @if (detailPatient()!['economicResponsibleName']) {
                    <div class="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Responsable Económico</p>
                      <p>{{ detailPatient()!['economicResponsibleName'] }} ({{ detailPatient()!['economicResponsibleRelation'] }})</p>
                      <p class="text-slate-500">{{ detailPatient()!['economicResponsiblePhone'] }}</p>
                    </div>
                  }
                </div>
              }

              <!-- Tab: Archivos -->
              @if (detailTab() === 'Archivos') {
                <div class="space-y-4">
                  <div class="flex justify-between items-center">
                    <p class="text-sm text-slate-600 dark:text-slate-400">{{ files().length }} archivo(s) clínico(s)</p>
                    <label class="btn-primary cursor-pointer text-sm">
                      <input type="file" class="hidden" accept="image/*,.pdf,application/pdf" (change)="selectFileToUpload($event)">
                      <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                      Subir Archivo
                    </label>
                  </div>
                  <p class="text-xs text-slate-400 -mt-2">Puedes subir radiografías, fotos clínicas, informes y resultados de laboratorio.</p>

                  @if (files().length === 0) {
                    <div class="empty-state py-10">
                      <svg class="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      <p class="text-sm text-slate-500">Sin archivos clínicos. Sube radiografías o imágenes.</p>
                    </div>
                  } @else {
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      @for (f of files(); track f.id) {
                        <div class="border border-slate-200 dark:border-slate-700 rounded-xl p-3 group relative hover:shadow-md transition-shadow bg-white dark:bg-slate-800/60">
                          @if (f.fileType === 'image' || f.fileType === 'xray') {
                            <div class="relative">
                              <img [src]="getFileUrl(f.fileUrl)" [alt]="f.name"
                                class="w-full h-28 object-cover rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                (click)="viewFile(f)">
                              @if (f.fileType === 'xray') {
                                <span class="absolute top-1.5 left-1.5 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold tracking-wide shadow">RX</span>
                              }
                            </div>
                          } @else {
                            <div class="w-full h-28 bg-slate-100 dark:bg-slate-700/60 rounded-lg mb-2 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" (click)="viewFile(f)">
                              <svg class="w-9 h-9 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                              </svg>
                              <span class="text-xs text-slate-500 uppercase font-semibold tracking-wide">PDF</span>
                            </div>
                          }
                          <p class="text-xs font-semibold truncate text-slate-800 dark:text-slate-200" [title]="f.name">{{ f.name }}</p>
                          @if (f.description) {
                            <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 italic" [title]="f.description">{{ f.description }}</p>
                          }
                          <p class="text-[11px] text-slate-400 mt-1">{{ f.createdAt | date:'dd MMM yyyy':'':'es' }}</p>
                          <button (click)="deleteFile(f.id)"
                            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-white dark:bg-slate-700 rounded-full shadow text-red-500 hover:text-red-700 transition-opacity"
                            title="Eliminar">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Modal: Subir archivo con descripción -->
                @if (pendingFile()) {
                  <div class="modal-overlay" (click)="cancelPendingFile()">
                    <div class="modal-center">
                      <div class="modal max-w-sm" (click)="$event.stopPropagation()">
                        <div class="modal-header">
                          <h3 class="text-base font-semibold text-slate-900 dark:text-white">Subir archivo clínico</h3>
                          <button (click)="cancelPendingFile()" class="modal-close-btn">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                        <div class="modal-body space-y-4">
                          <!-- Preview -->
                          @if (pendingFilePreview()) {
                            <img [src]="pendingFilePreview()!" alt="Preview" class="w-full h-40 object-contain rounded-lg bg-slate-100 dark:bg-slate-800">
                          } @else {
                            <div class="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center gap-2">
                              <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                              <span class="text-sm text-slate-500">{{ pendingFile()!.name }}</span>
                            </div>
                          }

                          <div class="form-group">
                            <label class="label">Tipo de archivo</label>
                            <select class="input" [(ngModel)]="pendingFileType">
                              <option value="image">Foto clínica / imagen</option>
                              <option value="xray">Radiografía (RX)</option>
                              <option value="document">Documento / Informe / PDF</option>
                            </select>
                          </div>

                          <div class="form-group">
                            <label class="label">Descripción <span class="text-slate-400 font-normal">(opcional)</span></label>
                            <input type="text" class="input" [(ngModel)]="pendingFileDescription"
                              placeholder="Ej: Rx panorámica, Informe de laboratorio...">
                          </div>
                        </div>
                        <div class="modal-footer">
                          <button (click)="cancelPendingFile()" class="btn-secondary">Cancelar</button>
                          <button (click)="confirmUploadFile()" [disabled]="uploadingFile()" class="btn-primary disabled:opacity-50">
                            @if (uploadingFile()) { Subiendo... } @else { Subir archivo }
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              }

              <!-- Tab: Odontograma -->
              @if (detailTab() === 'Odontograma') {
                <div class="space-y-4">
                  <div class="flex gap-3 flex-wrap text-xs">
                    @for (cond of odontogramConditions; track cond.value) {
                      <span class="flex items-center gap-1">
                        <span class="w-3 h-3 rounded-full inline-block" [style.background]="cond.color"></span>
                        {{ cond.label }}
                      </span>
                    }
                  </div>
                  <!-- Arcada superior -->
                  <div>
                    <p class="text-xs text-slate-500 mb-2">Arcada Superior</p>
                    <div class="flex gap-1 justify-center flex-wrap">
                      @for (n of upperTeeth; track n) {
                        <button (click)="selectTooth(n)"
                          class="w-9 h-9 rounded text-xs font-bold border-2 transition-all shadow-none"
                          [style.background]="getToothColor(n) || undefined"
                          [style.color]="getToothColor(n) ? '#fff' : undefined"
                          [ngClass]="selectedTooth() === n ? 'border-primary-500 scale-110' : (getToothColor(n) ? 'border-transparent' : 'border-slate-300 dark:border-slate-600 hover:border-primary-400')">
                          {{ n }}
                        </button>
                      }
                    </div>
                  </div>
                  <!-- Arcada inferior -->
                  <div>
                    <p class="text-xs text-slate-500 mb-2">Arcada Inferior</p>
                    <div class="flex gap-1 justify-center flex-wrap">
                      @for (n of lowerTeeth; track n) {
                        <button (click)="selectTooth(n)"
                          class="w-9 h-9 rounded text-xs font-bold border-2 transition-all shadow-none"
                          [style.background]="getToothColor(n) || undefined"
                          [style.color]="getToothColor(n) ? '#fff' : undefined"
                          [ngClass]="selectedTooth() === n ? 'border-primary-500 scale-110' : (getToothColor(n) ? 'border-transparent' : 'border-slate-300 dark:border-slate-600 hover:border-primary-400')">
                          {{ n }}
                        </button>
                      }
                    </div>
                  </div>
                  <!-- Panel de registro -->
                  @if (selectedTooth()) {
                    <div class="card p-4 border border-primary-200 dark:border-primary-800">
                      <p class="text-sm font-semibold mb-3">Diente {{ selectedTooth() }}</p>
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="label">Condición</label>
                          <select [(ngModel)]="odontoForm.condition" class="input">
                            @for (c of odontogramConditions; track c.value) {
                              <option [value]="c.value">{{ c.label }}</option>
                            }
                          </select>
                        </div>
                        <div>
                          <label class="label">Cara/Superficie</label>
                          <select [(ngModel)]="odontoForm.surface" class="input">
                            <option value="">Completo</option>
                            <option value="M">Mesial</option>
                            <option value="D">Distal</option>
                            <option value="V">Vestibular</option>
                            <option value="L">Lingual</option>
                            <option value="O">Oclusal</option>
                          </select>
                        </div>
                      </div>
                      <div class="mt-3">
                        <label class="label">Notas</label>
                        <input [(ngModel)]="odontoForm.notes" class="input" placeholder="Observaciones...">
                      </div>
                      <div class="flex gap-2 mt-3">
                        <button (click)="saveOdontogramEntry()" class="btn-primary text-sm" [disabled]="savingOdonto()">
                          {{ savingOdonto() ? 'Guardando...' : 'Registrar' }}
                        </button>
                        <button (click)="selectedTooth.set(null)" class="btn-secondary text-sm">Cancelar</button>
                      </div>
                    </div>
                  }
                  @if (odontogram().length > 0) {
                    <div class="mt-4">
                      <p class="text-xs font-semibold text-slate-500 uppercase mb-2">Registros</p>
                      <div class="space-y-1">
                        @for (r of odontogram(); track r.id) {
                          <div class="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                            <span>Diente <strong>{{ r.toothNumber }}</strong> {{ r.surface ? '('+r.surface+')' : '' }}: <span [style.color]="getConditionColor(r.condition)">{{ r.condition }}</span></span>
                            <div class="flex items-center gap-2">
                              <span class="text-slate-400">{{ r.createdAt | date:'dd/MM/yy' }}</span>
                              <button (click)="deleteOdontogramEntry(r.id)" class="text-red-400 hover:text-red-600">✕</button>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Tab: Historial -->
              @if (detailTab() === 'Historial') {
                @if (loadingHistory()) {
                  <div class="space-y-2">@for (_ of [1,2,3]; track $index) { <div class="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> }</div>
                } @else if (history().length === 0) {
                  <div class="empty-state py-8"><p>Sin historial de consultas</p></div>
                } @else {
                  <div class="space-y-2">
                    @for (apt of history(); track apt.id) {
                      <div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <!-- Header clickable -->
                        <button class="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group" (click)="expandedAptHistoryId.set(expandedAptHistoryId() === apt.id ? null : apt.id)">
                          <div class="flex justify-between items-center">
                            <div>
                              <p class="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-primary-600 transition-colors">
                                {{ apt.scheduledAt | date:'dd/MM/yyyy HH:mm' }}
                              </p>
                              <p class="text-xs text-slate-500">Dr. {{ apt.doctor?.user?.firstName }} {{ apt.doctor?.user?.lastName }}</p>
                            </div>
                            <div class="flex items-center gap-2">
                              <span class="badge-green text-xs">Bs. {{ apt.paidAmount }}</span>
                              <svg class="w-4 h-4 text-slate-400 transition-transform" [class.rotate-180]="expandedAptHistoryId() === apt.id" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                            </div>
                          </div>
                        </button>
                        <!-- Expanded detail -->
                        @if (expandedAptHistoryId() === apt.id) {
                          <div class="px-3 pb-3 border-t border-slate-100 dark:border-slate-700 pt-2 space-y-1.5">
                            @if (apt.treatments?.length) {
                              <div><span class="text-[10px] font-bold text-slate-400 uppercase">Tratamientos</span><p class="text-xs text-slate-700 dark:text-slate-200 mt-0.5">{{ treatmentNames(apt.treatments) }}</p></div>
                            }
                            @if (apt.metadata?.clinical?.diagnosis) {
                              <div><span class="text-[10px] font-bold text-indigo-500 uppercase">Diagnóstico</span><p class="text-xs text-slate-700 dark:text-slate-200 mt-0.5 font-medium">{{ apt.metadata.clinical.diagnosis }}</p></div>
                            }
                            @if (apt.metadata?.clinical?.clinicalNotes) {
                              <div><span class="text-[10px] font-bold text-slate-400 uppercase">Notas</span><p class="text-xs text-slate-500 mt-0.5 leading-relaxed">{{ apt.metadata.clinical.clinicalNotes }}</p></div>
                            }
                            @if (apt.metadata?.clinical?.observations) {
                              <div><span class="text-[10px] font-bold text-slate-400 uppercase">Observaciones</span><p class="text-xs text-slate-500 mt-0.5">{{ apt.metadata.clinical.observations }}</p></div>
                            }
                            @if (apt.metadata?.clinical?.nextVisit) {
                              <div><span class="text-[10px] font-bold text-emerald-500 uppercase">Próxima cita</span><p class="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">{{ apt.metadata.clinical.nextVisit }}</p></div>
                            }
                            @if (apt.notes && !apt.metadata?.clinical) {
                              <p class="text-xs text-slate-400 italic">{{ apt.notes }}</p>
                            }
                            @if (apt.paidAmount < apt.totalAmount && apt.totalAmount > 0) {
                              <p class="text-xs text-orange-600 font-semibold">⚠ Saldo pendiente: Bs. {{ apt.totalAmount - apt.paidAmount | number:'1.2-2' }}</p>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              }

              <!-- Tab: Planes de Tratamiento -->
              @if (detailTab() === 'Planes') {
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <p class="text-sm text-slate-600 dark:text-slate-400">Planes de tratamiento del paciente</p>
                    @if (canCreatePatient()) {
                      <button (click)="showNewPlanForm.set(!showNewPlanForm())" class="btn-primary text-xs py-1 px-3">
                        + Nuevo Plan
                      </button>
                    }
                  </div>

                  <!-- Formulario nuevo plan -->
                  @if (showNewPlanForm()) {
                    <div class="card p-4 border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/10 space-y-3">
                      <p class="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">Nuevo Plan de Tratamiento</p>
                      <div>
                        <label class="label">Tratamiento</label>
                        <select [(ngModel)]="newPlanForm.treatmentId" (change)="onPlanTreatmentChange()" class="input">
                          <option value="">Seleccionar tratamiento...</option>
                          @for (t of availableTreatments(); track t.id) {
                            <option [value]="t.id">{{ t.name }} — Bs. {{ t.price }}</option>
                          }
                        </select>
                      </div>
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="label">Costo total (Bs.)</label>
                          <input type="number" [(ngModel)]="newPlanForm.totalCost" min="0" step="0.01" class="input">
                        </div>
                        <div>
                          <label class="label">Descuento (%)</label>
                          <input type="number" [(ngModel)]="newPlanForm.discount" min="0" max="100" class="input">
                        </div>
                      </div>
                      @if (newPlanForm.totalCost && newPlanForm.discount > 0) {
                        <p class="text-xs text-emerald-600">Total final: Bs. {{ (newPlanForm.totalCost * (1 - newPlanForm.discount/100)) | number:'1.2-2' }}</p>
                      }
                      <div>
                        <label class="label">Notas <span class="text-slate-400 font-normal">(opcional)</span></label>
                        <input [(ngModel)]="newPlanForm.notes" class="input" placeholder="Ej: Ortodoncia completa 18 meses...">
                      </div>
                      <div class="flex gap-2">
                        <button (click)="savePlan()" [disabled]="savingPlan() || !newPlanForm.treatmentId || !newPlanForm.totalCost" class="btn-primary text-sm disabled:opacity-50">
                          {{ savingPlan() ? 'Guardando...' : 'Crear Plan' }}
                        </button>
                        <button (click)="showNewPlanForm.set(false)" class="btn-secondary text-sm">Cancelar</button>
                      </div>
                    </div>
                  }

                  <!-- Lista de planes -->
                  @if (loadingPlans()) {
                    <div class="space-y-2">@for (_ of [1,2]; track $index) { <div class="h-14 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> }</div>
                  } @else if (treatmentPlans().length === 0) {
                    <div class="empty-state py-8">
                      <svg class="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      <p class="text-sm text-slate-500">Sin planes de tratamiento</p>
                    </div>
                  } @else {
                    <div class="space-y-3">
                      @for (plan of treatmentPlans(); track plan.id) {
                        <div class="card p-4 border"
                          [ngClass]="plan.status === 'IN_PROGRESS' ? 'border-violet-200 dark:border-violet-800' : 'border-slate-200 dark:border-slate-700 opacity-70'">
                          <div class="flex items-start justify-between gap-2 mb-2">
                            <div class="flex-1">
                              <div class="flex items-center gap-2">
                                <p class="text-sm font-semibold text-slate-800 dark:text-white">{{ plan.treatment?.name }}</p>
                                <span class="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                  [ngClass]="plan.status === 'IN_PROGRESS' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-slate-100 text-slate-500'">
                                  {{ plan.status === 'IN_PROGRESS' ? 'En proceso' : plan.status === 'COMPLETED' ? 'Completado' : 'Cancelado' }}
                                </span>
                              </div>
                              @if (plan.notes) { <p class="text-xs text-slate-500 mt-0.5">{{ plan.notes }}</p> }
                            </div>
                            @if (plan.status === 'IN_PROGRESS') {
                              <div class="flex gap-1.5 shrink-0">
                                <button (click)="openPatientPlanPay(plan)" class="btn-primary text-xs py-1 px-2">Pagar</button>
                                <button (click)="completePatientPlan(plan)" class="btn-secondary text-xs py-1 px-2" title="Marcar como terminado">✓ Terminar</button>
                              </div>
                            }
                          </div>
                          <!-- Montos -->
                          <div class="grid grid-cols-3 gap-2 text-xs mb-2">
                            <div><span class="text-slate-400">Total: </span><span class="font-semibold">Bs. {{ plan.finalCost | number:'1.2-2' }}</span></div>
                            <div><span class="text-emerald-500">Pagado: </span><span class="font-semibold text-emerald-600">Bs. {{ plan.paidAmount | number:'1.2-2' }}</span></div>
                            <div><span class="text-red-400">Pendiente: </span><span class="font-semibold text-red-600">Bs. {{ plan.pendingAmount | number:'1.2-2' }}</span></div>
                          </div>
                          <!-- Barra progreso -->
                          <div class="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all"
                              [ngClass]="plan.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-violet-500'"
                              [style.width.%]="plan.paymentPct"></div>
                          </div>
                          <!-- Historial de pagos del plan -->
                          @if (plan.payments?.length > 0) {
                            <div class="mt-3 space-y-1 border-t border-slate-100 dark:border-slate-700 pt-2">
                              <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Pagos registrados</p>
                              @for (pay of plan.payments; track pay.id) {
                                <div class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                  <span>{{ pay.paidAt | date:'dd/MM/yyyy' }} — {{ pay.method === 'CASH' ? '💵' : pay.method === 'CARD' ? '💳' : pay.method === 'TRANSFER' ? '🏦' : '📱' }}</span>
                                  @if (pay.notes) { <span class="text-slate-400 truncate max-w-[100px]">{{ pay.notes }}</span> }
                                  <span class="font-semibold text-emerald-600">+Bs. {{ pay.amount | number:'1.2-2' }}</span>
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Modal pago plan (desde paciente) -->
                @if (patientPlanPayModal()) {
                  <div class="modal-overlay" (click)="patientPlanPayModal.set(null)">
                    <div class="modal-center">
                      <div class="modal max-w-sm" (click)="$event.stopPropagation()">
                        <div class="modal-header">
                          <h3 class="text-base font-semibold text-slate-900 dark:text-white">Registrar Pago — {{ patientPlanPayModal()!.treatment?.name }}</h3>
                          <button (click)="patientPlanPayModal.set(null)" class="modal-close-btn"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                        </div>
                        <div class="modal-body space-y-3">
                          <div class="grid grid-cols-2 gap-2 text-xs text-center">
                            <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-2"><p class="text-red-400">Pendiente</p><p class="font-bold text-red-700 dark:text-red-300 text-sm">Bs. {{ patientPlanPayModal()!.pendingAmount | number:'1.2-2' }}</p></div>
                            <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2"><p class="text-emerald-500">Pagado</p><p class="font-bold text-emerald-700 dark:text-emerald-300 text-sm">Bs. {{ patientPlanPayModal()!.paidAmount | number:'1.2-2' }}</p></div>
                          </div>
                          <div><label class="label">Monto (Bs.)</label><input type="number" [(ngModel)]="patientPlanPayForm.amount" [max]="patientPlanPayModal()!.pendingAmount" min="1" step="0.01" class="input"></div>
                          <div><label class="label">Método</label>
                            <div class="grid grid-cols-4 gap-1">
                              @for (m of [['CASH','💵'],['CARD','💳'],['TRANSFER','🏦'],['QR','📱']]; track m[0]) {
                                <button (click)="patientPlanPayForm.method = m[0]" class="py-1.5 rounded-lg text-xs border transition-colors"
                                  [ngClass]="patientPlanPayForm.method === m[0] ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'">
                                  {{ m[1] }}
                                </button>
                              }
                            </div>
                          </div>
                          <div><label class="label">Notas</label><input type="text" [(ngModel)]="patientPlanPayForm.notes" class="input" placeholder="Cuota 1..."></div>
                        </div>
                        <div class="modal-footer">
                          <button (click)="patientPlanPayModal.set(null)" class="btn-secondary">Cancelar</button>
                          <button (click)="submitPatientPlanPayment()" [disabled]="savingPlanPay() || !patientPlanPayForm.amount" class="btn-primary disabled:opacity-50">
                            {{ savingPlanPay() ? 'Guardando...' : 'Confirmar' }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              }
              <!-- Tab: Cotizaciones -->
              @if (detailTab() === 'Cotizaciones') {
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <p class="text-sm text-slate-600 dark:text-slate-400">Cotizaciones emitidas para este paciente</p>
                    @if (canCreatePatient()) {
                      <a [routerLink]="['/quotes']" [queryParams]="{patientId: detailPatient()?.id}"
                        class="btn-primary text-xs py-1 px-3">+ Nueva Cotización</a>
                    }
                  </div>
                  @if (loadingPatientQuotes()) {
                    <div class="space-y-2">@for (_ of [1,2,3]; track $index){ <div class="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div> }</div>
                  } @else if (patientQuotes().length === 0) {
                    <div class="empty-state py-8">
                      <svg class="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      <p class="text-sm text-slate-500">Sin cotizaciones</p>
                    </div>
                  } @else {
                    @for (q of patientQuotes(); track q.id) {
                      <div class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <p class="text-sm font-semibold text-slate-800 dark:text-white">{{ q.quoteNumber }}</p>
                            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold"
                              [ngClass]="{
                                'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300': q.status === 'DRAFT',
                                'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400': q.status === 'SENT',
                                'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400': q.status === 'ACCEPTED' || q.status === 'CONVERTED',
                                'bg-red-100 dark:bg-red-900/30 text-red-600': q.status === 'REJECTED' || q.status === 'EXPIRED'
                              }">{{ q.status === 'DRAFT' ? 'Borrador' : q.status === 'SENT' ? 'Enviada' : q.status === 'ACCEPTED' ? 'Aceptada' : q.status === 'CONVERTED' ? 'Convertida' : q.status === 'REJECTED' ? 'Rechazada' : 'Expirada' }}</span>
                          </div>
                          <p class="text-xs text-slate-500 mt-0.5">{{ q.issueDate | date:'dd/MM/yyyy' }} · Bs. {{ q.total | number:'1.0-0' }}</p>
                        </div>
                        <a [routerLink]="['/quotes']" [queryParams]="{id: q.id}" class="text-xs text-primary-600 hover:underline">Ver →</a>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          </div>
          </div>
        </div>
      }

      <!-- Modal: Confirmar completar plan con deuda pendiente -->
      @if (confirmCompletePlanData()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4" (click)="confirmCompletePlanData.set(null)">
          <div class="card w-full max-w-sm animate-fade-in p-6" (click)="$event.stopPropagation()">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">¿Marcar como terminado?</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-2">
              El tratamiento <strong>{{ confirmCompletePlanData()!.treatment?.name }}</strong> tiene un saldo pendiente de
              <strong class="text-red-600">Bs. {{ confirmCompletePlanData()!.pendingAmount | number:'1.2-2' }}</strong>.
            </p>
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
              <p class="text-xs text-amber-700 dark:text-amber-300">
                Al completar con deuda pendiente, el saldo pasará automáticamente a <strong>Cuentas por Cobrar</strong> del paciente para su seguimiento y cobro posterior.
              </p>
            </div>
            <div class="flex gap-3">
              <button (click)="confirmCompletePlanData.set(null)" class="btn-secondary flex-1">Cancelar</button>
              <button (click)="doCompletePatientPlan(confirmCompletePlanData()!)" class="btn-primary flex-1 bg-amber-500 hover:bg-amber-600 border-amber-500">
                Sí, marcar terminado
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Visor de archivo (imagen o PDF) -->
      @if (viewingFile()) {
        <div class="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-4" (click)="viewingFile.set(null)">
          <div class="max-w-4xl w-full" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-white font-semibold">{{ viewingFile()!.name }}</p>
                @if (viewingFile()!.description) {
                  <p class="text-slate-400 text-sm">{{ viewingFile()!.description }}</p>
                }
              </div>
              <div class="flex items-center gap-2">
                <a [href]="getFileUrl(viewingFile()!.fileUrl)" target="_blank" rel="noopener"
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
                  (click)="$event.stopPropagation()">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Descargar
                </a>
                <button (click)="viewingFile.set(null)" class="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            @if (viewingFile()!.fileType === 'image' || viewingFile()!.fileType === 'xray') {
              <img [src]="getFileUrl(viewingFile()!.fileUrl)" [alt]="viewingFile()!.name"
                class="max-w-full max-h-[80vh] object-contain rounded-lg mx-auto block">
            } @else {
              <iframe [src]="getSafeUrl(viewingFile()!.fileUrl)" class="w-full h-[80vh] rounded-lg bg-white"></iframe>
            }
          </div>
        </div>
      }

      <!-- Modal confirmación eliminar paciente -->
      @if (confirmDeletePatientId()) {
        <div class="modal-overlay" (click)="confirmDeletePatientId.set(null)">
          <div class="modal-center" (click)="$event.stopPropagation()">
            <div class="modal max-w-sm animate-slide-up">
              <div class="modal-body text-center py-6">
                <div class="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-4">
                  <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </div>
                <h3 class="text-base font-bold text-slate-800 dark:text-white mb-2">¿Eliminar paciente?</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">El paciente quedará desactivado. Su historial de citas y pagos se conserva en el sistema.</p>
                <div class="flex gap-3 justify-center">
                  <button (click)="confirmDeletePatientId.set(null)" class="btn-secondary px-5">Cancelar</button>
                  <button (click)="confirmDeletePatient()" [disabled]="deletingPatient()"
                    class="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                    {{ deletingPatient() ? 'Eliminando...' : 'Sí, eliminar' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PatientsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);
  readonly branchCtx = inject(BranchContextService);

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  isOnlyDoctor = computed(() => this.auth.currentUser()?.role === 'DOCTOR');
  canCreatePatient = computed(() => ['SUPER_ADMIN', 'ADMIN', 'SECRETARY', 'DOCTOR', 'RECEPTIONIST', 'NURSE'].includes(this.auth.currentUser()?.role || ''));
  myDoctorProfileId = signal<string | null>(null);
  tenants = signal<any[]>([]);
  clinicsForFilter = signal<any[]>([]);
  filterTenantId = signal<string>('');
  filterClinicId = signal<string>('');
  branchesForFilter = signal<any[]>([]);
  filterBranchId = signal<string>('');

  patients = signal<Patient[]>([]);
  loading = signal(true);
  saving = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  total = signal(0);
  currentPage = signal(1);
  pageSize = signal(25);
  totalPages = signal(0);
  searchTerm = '';
  clinicId = signal(''); // Should come from auth/store

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1) as (number | string)[];
    const pages: (number | string)[] = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
  });

  showingFrom = computed(() => Math.min((this.currentPage() - 1) * this.pageSize() + 1, this.total()));
  showingTo = computed(() => Math.min(this.currentPage() * this.pageSize(), this.total()));

  // Detail modal
  detailPatient = signal<any | null>(null);
  detailTab = signal('Información');
  files = signal<any[]>([]);
  odontogram = signal<any[]>([]);
  history = signal<any[]>([]);
  loadingHistory = signal(false);
  expandedAptHistoryId = signal<string | null>(null);

  // Cotizaciones tab
  patientQuotes = signal<any[]>([]);
  loadingPatientQuotes = signal(false);

  // ── Planes de tratamiento ──────────────────────────────────
  treatmentPlans = signal<any[]>([]);
  loadingPlans = signal(false);
  showNewPlanForm = signal(false);
  savingPlan = signal(false);
  availableTreatments = signal<any[]>([]);
  newPlanForm = { treatmentId: '', totalCost: 0, discount: 0, notes: '' };
  patientPlanPayModal = signal<any | null>(null);
  patientPlanPayForm = { amount: 0, method: 'CASH', notes: '' };
  savingPlanPay = signal(false);
  confirmCompletePlanData = signal<any | null>(null);
  savingOdonto = signal(false);
  selectedTooth = signal<number | null>(null);
  viewingFile = signal<any | null>(null);

  // File upload with description modal
  pendingFile = signal<File | null>(null);
  pendingFilePreview = signal<string | null>(null);
  pendingFileType = 'image';
  pendingFileDescription = '';
  uploadingFile = signal(false);

  odontoForm = { condition: 'caries', surface: '', notes: '' };

  phoneCode = '+591';
  waCode = '+591';
  confirmSaveNoContact = signal(false);

  readonly countryCodes = [
    { flag: '🇧🇴', code: '+591' },
    { flag: '🇦🇷', code: '+54' },
    { flag: '🇨🇱', code: '+56' },
    { flag: '🇵🇪', code: '+51' },
    { flag: '🇧🇷', code: '+55' },
    { flag: '🇺🇸', code: '+1' },
  ];

  upperTeeth = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  lowerTeeth = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

  treatmentNames(treatments: any[]): string {
    return treatments.slice(0, 2).map((t: any) => t.treatment?.name).filter(Boolean).join(', ');
  }

  odontogramConditions = [
    { value: 'sano', label: 'Sano', color: '#22c55e' },
    { value: 'caries', label: 'Caries', color: '#ef4444' },
    { value: 'empaste', label: 'Empaste', color: '#3b82f6' },
    { value: 'corona', label: 'Corona', color: '#f59e0b' },
    { value: 'extraccion', label: 'Extracción', color: '#6b7280' },
    { value: 'ausente', label: 'Ausente', color: '#1e293b' },
    { value: 'endodoncia', label: 'Endodoncia', color: '#8b5cf6' },
    { value: 'implante', label: 'Implante', color: '#06b6d4' },
    { value: 'protesis', label: 'Prótesis', color: '#ec4899' },
  ];

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: [''],
    phone: [''],
    whatsapp: [''],
    email: ['', Validators.email],
    documentType: [''],
    documentNumber: [''],
    birthDate: [''],
    gender: [''],
    bloodType: [''],
    allergies: [''],
    economicResponsibleName: [''],
    economicResponsiblePhone: [''],
    economicResponsibleRelation: [''],
    whatsappConsent: [false],
  });

  constructor() {
    effect(() => {
      this.branchCtx.activeBranchId(); // track branch changes
      this.loadPatients();
    });
  }

  ngOnInit() {
    if (this.isSuperAdmin()) this.loadTenants();
    if (this.isOnlyDoctor()) {
      this.api.get<any>('/doctors/me').subscribe({
        next: profile => { this.myDoctorProfileId.set(profile.id); this.loadPatients(); },
        error: () => {},
      });
    }
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
    this.currentPage.set(1);
    if (tenantId) {
      this.api.get<any[]>('/clinics', { tenantId }).subscribe({
        next: (data: any) => this.clinicsForFilter.set(Array.isArray(data) ? data : data?.data || []),
        error: () => {},
      });
    }
    this.loadPatients();
  }

  onClinicFilterChange(clinicId: string) {
    this.filterClinicId.set(clinicId);
    this.filterBranchId.set('');
    this.branchesForFilter.set([]);
    this.currentPage.set(1);
    if (clinicId) {
      this.api.get<any[]>('/branches', { clinicId }).subscribe({
        next: (data: any) => this.branchesForFilter.set(Array.isArray(data) ? data : data?.data || []),
        error: () => {},
      });
    }
    this.loadPatients();
  }

  onBranchFilterChange(branchId: string) {
    this.filterBranchId.set(branchId);
    this.currentPage.set(1);
    this.loadPatients();
  }

  clearFilters() {
    this.filterTenantId.set('');
    this.filterClinicId.set('');
    this.filterBranchId.set('');
    this.clinicsForFilter.set([]);
    this.branchesForFilter.set([]);
    this.currentPage.set(1);
    this.loadPatients();
  }

  loadPatients(search?: string) {
    // DOCTOR: wait until doctorProfileId is loaded
    if (this.isOnlyDoctor() && !this.myDoctorProfileId()) return;
    this.loading.set(true);
    const params: any = { page: this.currentPage(), limit: this.pageSize() };
    if (search) params.search = search;
    if (this.isOnlyDoctor() && this.myDoctorProfileId()) {
      params.doctorId = this.myDoctorProfileId();
    }

    // SUPER_ADMIN: use /patients with optional tenant/clinic params
    if (this.isSuperAdmin()) {
      if (this.filterTenantId()) params.tenantId = this.filterTenantId();
      if (this.filterClinicId()) params.clinicId = this.filterClinicId();
      if (this.filterBranchId()) params.branchId = this.filterBranchId();
      this.api.getPaginated<Patient>('/patients', params).subscribe({
        next: res => { this.patients.set(res.data); this.total.set(res.total); this.totalPages.set(res.totalPages || 1); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
      return;
    }

    // ADMIN: usa la clínica/sucursal activa del contexto
    const cId = this.branchCtx.activeClinicId();
    if (!cId) {
      // Si el contexto aún no cargó, esperar y reintentar
      this.api.get<any>('/clinics').subscribe({
        next: (clinics: any) => {
          const id = Array.isArray(clinics) ? clinics[0]?.id : clinics?.data?.[0]?.id;
          if (!id) { this.loading.set(false); return; }
          this.clinicId.set(id);
          const bId = this.branchCtx.activeBranchId();
          if (bId) params.branchId = bId;
          this.api.getPaginated<Patient>(`/clinics/${id}/patients`, params).subscribe({
            next: res => { this.patients.set(res.data); this.total.set(res.total); this.totalPages.set(res.totalPages || 1); this.loading.set(false); },
            error: () => this.loading.set(false),
          });
        },
        error: () => this.loading.set(false),
      });
      return;
    }
    this.clinicId.set(cId);
    const bId = this.branchCtx.activeBranchId();
    if (bId) params.branchId = bId;
    this.api.getPaginated<Patient>(`/clinics/${cId}/patients`, params).subscribe({
      next: res => { this.patients.set(res.data); this.total.set(res.total); this.totalPages.set(res.totalPages || 1); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch() {
    clearTimeout((this as any)._searchTimeout);
    (this as any)._searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadPatients(this.searchTerm);
    }, 400);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadPatients(this.searchTerm || undefined);
  }

  changePageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadPatients(this.searchTerm || undefined);
  }

  pageButtonClass(pg: number): string {
    return this.currentPage() === pg
      ? 'border-primary-500 bg-primary-500 text-white font-semibold'
      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300';
  }

  edit(patient: Patient) {
    this.editingId.set(patient.id);
    const p = patient as any;
    const phoneParts = this.parsePhone(p.phone || '');
    const waParts = this.parsePhone(p.whatsapp || '');
    this.phoneCode = phoneParts.code;
    this.waCode = waParts.code;
    this.form.patchValue({
      ...p,
      phone: phoneParts.number,
      whatsapp: waParts.number,
      birthDate: p.birthDate ? p.birthDate.slice(0, 10) : '',
    });
    this.showModal.set(true);
  }

  private parsePhone(full: string): { code: string; number: string } {
    const codes = ['+591', '+54', '+56', '+51', '+55', '+1'];
    for (const c of codes) {
      if (full.startsWith(c)) return { code: c, number: full.slice(c.length).trim() };
    }
    return { code: '+591', number: full };
  }

  save(skipContactCheck = false) {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    // Warn if no contact info at all (only for new patients, not edits)
    if (!skipContactCheck && !this.editingId()) {
      const v = this.form.value;
      const hasContact = !!(v.phone || v.whatsapp || v.email);
      if (!hasContact) { this.confirmSaveNoContact.set(true); return; }
    }
    this.confirmSaveNoContact.set(false);
    this.saving.set(true);
    const cId = this.clinicId() || this.branchCtx.activeClinicId() || '';
    if (!cId) {
      // clinicId not loaded yet — fetch first clinic then retry
      this.api.get<any>('/clinics').subscribe({
        next: (clinics: any) => {
          const id = Array.isArray(clinics) ? clinics[0]?.id : clinics?.data?.[0]?.id;
          if (!id) { this.saving.set(false); return; }
          this.clinicId.set(id);
          this.save(skipContactCheck);
        },
        error: () => this.saving.set(false),
      });
      return;
    }
    const bId = this.branchCtx.activeBranchId();
    const val: any = { ...this.form.value };

    // Combine country code + number
    const rawPhone = (val.phone || '').trim();
    const rawWa = (val.whatsapp || '').trim();
    val.phone = rawPhone ? (rawPhone.startsWith('+') ? rawPhone : `${this.phoneCode}${rawPhone}`) : undefined;
    val.whatsapp = rawWa ? (rawWa.startsWith('+') ? rawWa : `${this.waCode}${rawWa}`) : undefined;
    if (!val.phone) delete val.phone;
    if (!val.whatsapp) delete val.whatsapp;
    if (!val.email) delete val.email;

    // Clean empty optional string fields
    if (!val.lastName) delete val.lastName;
    if (!val.birthDate) delete val.birthDate;
    if (!val.documentNumber) delete val.documentNumber;
    if (!val.address) delete val.address;
    if (!val.allergies) delete val.allergies;
    if (!val.notes) delete val.notes;

    const body = { ...val, ...(bId && !this.editingId() ? { branchId: bId } : {}) };
    const req = this.editingId()
      ? this.api.patch(`/clinics/${cId}/patients/${this.editingId()}`, val)
      : this.api.post(`/clinics/${cId}/patients`, body);
    req.subscribe({ next: () => { this.saving.set(false); this.closeModal(); this.loadPatients(); }, error: () => this.saving.set(false) });
  }

  closeModal() {
    this.showModal.set(false);
    this.editingId.set(null);
    this.form.reset({ whatsappConsent: false });
    this.phoneCode = '+591';
    this.waCode = '+591';
    this.confirmSaveNoContact.set(false);
  }

  confirmDeletePatientId = signal<string | null>(null);
  deletingPatient = signal(false);

  deletePatient(patient: any) {
    this.confirmDeletePatientId.set(patient.id);
  }

  confirmDeletePatient() {
    const id = this.confirmDeletePatientId();
    if (!id) return;
    const cId = this.clinicId() || this.branchCtx.activeClinicId();
    if (!cId) return;
    this.deletingPatient.set(true);
    this.api.delete(`/clinics/${cId}/patients/${id}`).subscribe({
      next: () => { this.deletingPatient.set(false); this.confirmDeletePatientId.set(null); this.loadPatients(); },
      error: () => { this.deletingPatient.set(false); },
    });
  }

  calcAge(birthDate: string): number {
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  exportPdf(patient: any) {
    const cId = this.clinicId() || patient.clinicId;
    if (!cId) return;
    const token = localStorage.getItem('clinicos_access_token');
    const url = `${this.api.base}/clinics/${cId}/patients/${patient.id}/export-pdf`;
    // Abrir con fetch para incluir auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `historia-${patient.lastName}-${patient.firstName}.pdf`;
        a.click();
      });
  }

  openDetail(patient: any) {
    this.detailPatient.set(patient);
    this.detailTab.set('Información');
    this.files.set([]);
    this.odontogram.set([]);
    this.history.set([]);
    this.treatmentPlans.set([]);
    this.patientQuotes.set([]);
    this.showNewPlanForm.set(false);
    this.selectedTooth.set(null);
    this.loadDetailData(patient);
    this.loadTreatmentPlans(patient);
    this.loadPatientQuotes(patient);
  }

  loadPatientQuotes(patient: any) {
    this.loadingPatientQuotes.set(true);
    const cId = this.clinicId() || patient.clinicId;
    this.api.get<any>('/quotes', { patientId: patient.id, clinicId: cId, limit: 20 }).subscribe({
      next: (res: any) => {
        this.patientQuotes.set(Array.isArray(res) ? res : (res?.data || []));
        this.loadingPatientQuotes.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.loadingPatientQuotes.set(false),
    });
  }

  loadDetailData(patient: any) {
    const cId = this.clinicId() || patient.clinicId;
    // Files
    this.api.get<any[]>(`/clinics/${cId}/patients/${patient.id}/files`).subscribe({
      next: (data: any) => this.files.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
    // Odontogram
    this.api.get<any[]>(`/clinics/${cId}/patients/${patient.id}/odontogram`).subscribe({
      next: (data: any) => this.odontogram.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
    // History
    this.loadingHistory.set(true);
    this.api.get<any[]>(`/clinics/${cId}/patients/${patient.id}/history`).subscribe({
      next: (data: any) => { this.history.set(Array.isArray(data) ? data : []); this.loadingHistory.set(false); },
      error: () => this.loadingHistory.set(false),
    });
  }

  closeDetail() {
    this.detailPatient.set(null);
    this.selectedTooth.set(null);
  }

  selectTooth(n: number) {
    this.selectedTooth.set(n);
    this.odontoForm = { condition: 'caries', surface: '', notes: '' };
  }

  getToothColor(n: number): string {
    const records = this.odontogram().filter(r => r.toothNumber === n);
    if (records.length === 0) return '';
    const last = records[records.length - 1];
    return this.getConditionColor(last.condition); // solid — equal to legend
  }

  getConditionColor(condition: string): string {
    return this.odontogramConditions.find(c => c.value === condition)?.color || '#94a3b8';
  }

  saveOdontogramEntry() {
    const p = this.detailPatient();
    const tooth = this.selectedTooth();
    if (!p || !tooth) return;
    const cId = this.clinicId() || p.clinicId;
    this.savingOdonto.set(true);
    this.api.post(`/clinics/${cId}/patients/${p.id}/odontogram`, {
      toothNumber: tooth,
      condition: this.odontoForm.condition,
      surface: this.odontoForm.surface || undefined,
      notes: this.odontoForm.notes || undefined,
    }).subscribe({
      next: () => {
        this.savingOdonto.set(false);
        this.selectedTooth.set(null);
        this.api.get<any[]>(`/clinics/${cId}/patients/${p.id}/odontogram`).subscribe({
          next: (data: any) => this.odontogram.set(Array.isArray(data) ? data : []),
        });
      },
      error: () => this.savingOdonto.set(false),
    });
  }

  deleteOdontogramEntry(entryId: string) {
    const p = this.detailPatient();
    if (!p) return;
    const cId = this.clinicId() || p.clinicId;
    this.api.delete(`/clinics/${cId}/patients/${p.id}/odontogram/${entryId}`).subscribe({
      next: () => this.odontogram.update(list => list.filter(r => r.id !== entryId)),
      error: () => {},
    });
  }

  // ── File upload with description modal ──────────────────────
  selectFileToUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    // Auto-detect type from filename / mimetype
    const nameLower = file.name.toLowerCase();
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      this.pendingFileType = 'document';
    } else if (nameLower.includes('rx') || nameLower.includes('radio') || nameLower.includes('rayox')) {
      this.pendingFileType = 'xray';
    } else if (file.type.startsWith('image/')) {
      this.pendingFileType = 'image';
    } else {
      this.pendingFileType = 'document';
    }
    this.pendingFileDescription = '';
    this.pendingFile.set(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.pendingFilePreview.set(e.target?.result as string);
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    } else {
      this.pendingFilePreview.set(null);
    }
  }

  cancelPendingFile() {
    this.pendingFile.set(null);
    this.pendingFilePreview.set(null);
  }

  confirmUploadFile() {
    const p = this.detailPatient();
    const file = this.pendingFile();
    if (!p || !file) return;

    this.uploadingFile.set(true);
    const cId = this.clinicId() || p.clinicId;
    const formData = new FormData();
    formData.append('file', file);

    this.api.post('/uploads/single', formData).subscribe({
      next: (res: any) => {
        const fileUrl = res?.data?.fileUrl || res?.data?.url || res?.fileUrl || res?.url || '';
        this.api.post(`/clinics/${cId}/patients/${p.id}/files`, {
          name: file.name,
          fileUrl,
          fileType: this.pendingFileType,
          description: this.pendingFileDescription.trim() || undefined,
          mimeType: file.type,
          sizeBytes: file.size,
        }).subscribe({
          next: (newFile: any) => {
            const f = newFile?.data || newFile;
            this.files.update(list => [f, ...list]);
            this.uploadingFile.set(false);
            this.pendingFile.set(null);
            this.pendingFilePreview.set(null);
            this.cdr.markForCheck();
          },
          error: () => { this.uploadingFile.set(false); this.cdr.markForCheck(); },
        });
      },
      error: () => { this.uploadingFile.set(false); this.cdr.markForCheck(); },
    });
  }

  deleteFile(fileId: string) {
    if (!confirm('¿Eliminar este archivo?')) return;
    const p = this.detailPatient();
    if (!p) return;
    const cId = this.clinicId() || p.clinicId;
    this.api.delete(`/clinics/${cId}/patients/${p.id}/files/${fileId}`).subscribe({
      next: () => { this.files.update(list => list.filter(f => f.id !== fileId)); this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  viewFile(f: any) { this.viewingFile.set(f); }

  getFileUrl(relativePath: string): string {
    return this.api.getStaticUrl(relativePath) || relativePath;
  }

  getSafeUrl(relativePath: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.getFileUrl(relativePath));
  }

  copyPatientAsResponsible(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      const fn = this.form.get('firstName')?.value || '';
      const ln = this.form.get('lastName')?.value || '';
      const wa = this.form.get('whatsapp')?.value || '';
      this.form.patchValue({
        economicResponsibleName: `${fn} ${ln}`.trim(),
        economicResponsiblePhone: wa,
        economicResponsibleRelation: 'mismo paciente',
      });
    }
  }

  // ── Planes de tratamiento ───────────────────────────────────
  loadTreatmentPlans(patient: any) {
    const cId = this.clinicId() || patient.clinicId;
    if (!cId) return;
    this.loadingPlans.set(true);
    this.api.get<any[]>(`/clinics/${cId}/patients/${patient.id}/treatment-plans`).subscribe({
      next: (data: any) => {
        this.treatmentPlans.set(Array.isArray(data) ? data : (data?.data || []));
        this.loadingPlans.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.loadingPlans.set(false),
    });
    // Load available treatments for new plan form
    this.api.get<any>(`/treatments`, { clinicId: cId }).subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.data || []);
        this.availableTreatments.set(list);
      },
      error: () => {},
    });
  }

  onPlanTreatmentChange() {
    const t = this.availableTreatments().find(x => x.id === this.newPlanForm.treatmentId);
    if (t && !this.newPlanForm.totalCost) this.newPlanForm.totalCost = Number(t.price || 0);
  }

  savePlan() {
    const p = this.detailPatient();
    if (!p || !this.newPlanForm.treatmentId || !this.newPlanForm.totalCost) return;
    const cId = this.clinicId() || p.clinicId;
    this.savingPlan.set(true);
    this.api.post(`/clinics/${cId}/patients/${p.id}/treatment-plans`, {
      treatmentId: this.newPlanForm.treatmentId,
      totalCost: this.newPlanForm.totalCost,
      discount: this.newPlanForm.discount || 0,
      notes: this.newPlanForm.notes || undefined,
    }).subscribe({
      next: (plan: any) => {
        const newPlan = plan?.data ?? plan;
        this.treatmentPlans.update(list => [newPlan, ...list]);
        this.newPlanForm = { treatmentId: '', totalCost: 0, discount: 0, notes: '' };
        this.showNewPlanForm.set(false);
        this.savingPlan.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.savingPlan.set(false),
    });
  }

  openPatientPlanPay(plan: any) {
    this.patientPlanPayForm = { amount: +plan.pendingAmount.toFixed(2), method: 'CASH', notes: '' };
    this.patientPlanPayModal.set(plan);
  }

  submitPatientPlanPayment() {
    const plan = this.patientPlanPayModal();
    const p = this.detailPatient();
    if (!plan || !p || !this.patientPlanPayForm.amount) return;
    const cId = this.clinicId() || p.clinicId;
    this.savingPlanPay.set(true);
    this.api.post(`/clinics/${cId}/patients/${p.id}/treatment-plans/${plan.id}/payments`, {
      amount: this.patientPlanPayForm.amount,
      method: this.patientPlanPayForm.method,
      notes: this.patientPlanPayForm.notes || undefined,
    }).subscribe({
      next: (updated: any) => {
        const updatedPlan = updated?.data ?? updated;
        this.treatmentPlans.update(list => list.map(x => x.id === plan.id ? updatedPlan : x));
        this.patientPlanPayModal.set(null);
        this.savingPlanPay.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.savingPlanPay.set(false),
    });
  }

  completePatientPlan(plan: any) {
    if (plan.pendingAmount > 0.01) {
      this.confirmCompletePlanData.set(plan);
      return;
    }
    this.doCompletePatientPlan(plan);
  }

  doCompletePatientPlan(plan: any) {
    const p = this.detailPatient();
    if (!p) return;
    const cId = this.clinicId() || p.clinicId;
    this.confirmCompletePlanData.set(null);
    this.api.patch(`/clinics/${cId}/patients/${p.id}/treatment-plans/${plan.id}`, { status: 'COMPLETED' }).subscribe({
      next: (updated: any) => {
        const updatedPlan = updated?.data ?? updated;
        this.treatmentPlans.update(list => list.map(x => x.id === plan.id ? updatedPlan : x));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }
}
