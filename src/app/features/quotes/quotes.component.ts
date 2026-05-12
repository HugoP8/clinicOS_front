import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { Quote, Patient, Treatment } from '../../core/models';
import { OdontogramComponent, classifyTooth } from '../../shared/components/odontogram/odontogram.component';

@Component({
  selector: 'app-quotes',
  standalone: true,
  imports: [CommonModule, FormsModule, OdontogramComponent],
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
          <h1 class="page-title">Cotizaciones</h1>
          <p class="page-subtitle">Gestiona presupuestos y propuestas</p>
        </div>
        @if (canEdit()) {
          <button (click)="openModal()" class="btn-primary">+ Nueva Cotización</button>
        }
      </div>

      <!-- Filters -->
      <div class="card p-4 flex flex-wrap gap-3 items-center">
        <input [(ngModel)]="search" (input)="loadQuotes()" class="input w-52" placeholder="Buscar cotización...">
        <select [(ngModel)]="selectedStatus" (change)="loadQuotes()" class="input w-40">
          <option value="">Todos los estados</option>
          <option value="DRAFT">Borrador</option>
          <option value="SENT">Enviada</option>
          <option value="ACCEPTED">Aceptada</option>
          <option value="REJECTED">Rechazada</option>
          <option value="EXPIRED">Vencida</option>
        </select>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Paciente</th>
                <th>Fecha</th>
                <th>Vence</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (q of quotes(); track q.id) {
                <tr>
                  <td class="font-mono text-sm font-medium">{{ q.quoteNumber }}</td>
                  <td>{{ q.patient?.firstName }} {{ q.patient?.lastName }}</td>
                  <td class="text-slate-500 text-xs">{{ q.issueDate | date:'dd/MM/yyyy' }}</td>
                  <td class="text-slate-500 text-xs" [class.text-red-500]="isExpired(q.expiryDate)">
                    {{ q.expiryDate | date:'dd/MM/yyyy' }}
                  </td>
                  <td class="font-semibold">Bs. {{ q.total | number:'1.2-2' }}</td>
                  <td><span [class]="quoteStatusClass(q.status)">{{ quoteStatusLabel(q.status) }}</span></td>
                  <td>
                    <div class="flex items-center gap-0.5">
                      <button (click)="openDetail(q)" title="Ver detalle"
                        class="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 dark:text-primary-400 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </button>
                      <button (click)="downloadPdf(q)" title="Descargar PDF"
                        class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      </button>
                      <button (click)="openInstallment(q)" title="Ver cuotas"
                        class="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 dark:text-amber-400 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                      </button>
                      @if (canEdit()) {
                        <button (click)="sendWhatsapp(q)" title="Enviar por WhatsApp"
                          class="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                        </button>
                      }
                      @if (canEdit() && q.status === 'DRAFT') {
                        <button (click)="changeStatus(q, 'SENT')" title="Marcar como enviada"
                          class="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                        </button>
                      }
                      @if (canEdit() && q.status === 'ACCEPTED') {
                        <button (click)="openConvertModal(q)" title="Agendar cita"
                          class="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-600 dark:text-violet-400 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7">
                  <div class="empty-state py-10">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <p class="empty-state-title">Sin cotizaciones</p>
                    <p class="empty-state-desc">Crea la primera cotización para un paciente</p>
                  </div>
                </td></tr>
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

    <!-- Modal Nueva Cotización -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-center">
        <div class="modal modal-lg animate-slide-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">Nueva Cotización</h2>
            <button (click)="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body space-y-4">
            <!-- Paciente -->
            <div>
              <label class="label">Buscar Paciente *</label>
              <input [(ngModel)]="patientSearch" (input)="searchPatients()" class="input" placeholder="Nombre o teléfono...">
              @if (patientResults().length) {
                <div class="mt-1 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  @for (p of patientResults(); track p.id) {
                    <button (click)="selectPatient(p)" class="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm border-b last:border-0 border-slate-100 dark:border-slate-700">
                      {{ p.firstName }} {{ p.lastName }} — {{ p.phone }}
                    </button>
                  }
                </div>
              }
              @if (form.patientId) {
                <p class="text-xs text-emerald-600 mt-1">✓ Paciente seleccionado</p>
              }
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Fecha Vencimiento *</label>
                <input [(ngModel)]="form.expiryDate" type="date" class="input">
              </div>
              <div>
                <label class="label">Descuento</label>
                <div class="flex gap-2 items-center">
                  <!-- Toggle % / Bs. -->
                  <div class="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 text-xs font-bold shrink-0">
                    <button type="button" (click)="form.discountType = 'pct'; form.discount = 0"
                      class="px-2 py-1.5 transition-colors"
                      [class.bg-primary-600]="form.discountType === 'pct'"
                      [class.text-white]="form.discountType === 'pct'"
                      [class.text-slate-500]="form.discountType !== 'pct'">%</button>
                    <button type="button" (click)="form.discountType = 'monto'; form.discount = 0"
                      class="px-2 py-1.5 transition-colors"
                      [class.bg-primary-600]="form.discountType === 'monto'"
                      [class.text-white]="form.discountType === 'monto'"
                      [class.text-slate-500]="form.discountType !== 'monto'">Bs.</button>
                  </div>
                  <input [(ngModel)]="form.discount" type="number" min="0" [attr.max]="form.discountType === 'pct' ? 100 : null" class="input flex-1" (input)="recalculate()" [placeholder]="form.discountType === 'pct' ? '0-100' : 'Monto en Bs.'">
                </div>
              </div>
            </div>

            <!-- Items -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="label mb-0">Tratamientos *</label>
                <div class="flex items-center gap-2">
                  <button (click)="showOdontogram.set(!showOdontogram())"
                    class="text-xs font-semibold flex items-center gap-1 transition-colors"
                    [class.text-blue-600]="showOdontogram()"
                    [class.text-slate-500]="!showOdontogram()">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-width="2" d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
                    Por pieza dental
                  </button>
                  <span class="text-slate-300 dark:text-slate-600">|</span>
                  <button (click)="addItem()" class="text-xs text-primary-600 hover:underline">+ Agregar</button>
                </div>
              </div>

              <!-- Odontogram panel for tooth-by-tooth pricing -->
              @if (showOdontogram()) {
                <div class="mb-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/40 space-y-3">
                  <p class="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Seleccionar piezas dentales</p>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="label">Tratamiento</label>
                      <select [(ngModel)]="pendingToothTreatmentId" class="input text-sm">
                        <option value="">Seleccionar tratamiento...</option>
                        @for (t of treatments(); track t.id) {
                          <option [value]="t.id">{{ t.name }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label class="label">Cara (opcional)</label>
                      <select [(ngModel)]="pendingToothSurface" class="input text-sm">
                        <option value="">General</option>
                        <option value="M">Mesial</option>
                        <option value="D">Distal</option>
                        <option value="V">Vestibular</option>
                        <option value="L">Lingual</option>
                        <option value="O">Oclusal</option>
                      </select>
                    </div>
                  </div>
                  <app-odontogram
                    mode="select"
                    [selectedTeeth]="odontogramSelectedTeeth"
                    [showLegend]="false"
                    [showSurfaceSelector]="false">
                  </app-odontogram>
                  @if (odontogramSelectedTeeth().length > 0) {
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-blue-600 font-semibold">{{ odontogramSelectedTeeth().length }} piezas seleccionadas: {{ odontogramSelectedTeeth().join(', ') }}</span>
                      <button (click)="addTeethItems()"
                        [disabled]="!pendingToothTreatmentId()"
                        class="btn-primary text-xs py-1.5 px-3 disabled:opacity-50">
                        Agregar {{ odontogramSelectedTeeth().length }} líneas
                      </button>
                    </div>
                  }
                </div>
              }

              <div class="space-y-2">
                @for (item of formItems(); track $index; let i = $index) {
                  <div class="flex gap-2 items-center">
                    @if (item.toothNumber) {
                      <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center justify-center shrink-0">{{ item.toothNumber }}</div>
                    }
                    <select [(ngModel)]="item.treatmentId" (change)="onTreatmentSelect(i)" class="input flex-1">
                      <option value="">Seleccionar tratamiento</option>
                      @for (t of treatments(); track t.id) {
                        <option [value]="t.id">{{ t.name }}</option>
                      }
                    </select>
                    <input [(ngModel)]="item.quantity" type="number" min="1" class="input w-16" (input)="recalculate()">
                    <input [(ngModel)]="item.unitPrice" type="number" step="0.01" class="input w-24" placeholder="Precio" (input)="recalculate()">
                    <button (click)="removeItem(i)" class="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  </div>
                }
              </div>
            </div>

            <div>
              <label class="label">Notas</label>
              <textarea [(ngModel)]="form.notes" class="input resize-none" rows="2" placeholder="Observaciones adicionales..."></textarea>
            </div>

            <!-- Totales -->
            <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-1 text-sm">
              <div class="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>Bs. {{ subtotal() | number:'1.2-2' }}</span>
              </div>
              @if (form.discount) {
                <div class="flex justify-between text-red-500">
                  <span>Descuento {{ form.discountType === 'pct' ? '(' + form.discount + '%)' : 'Bs. ' + form.discount }}</span>
                  <span>-Bs. {{ discountAmount() | number:'1.2-2' }}</span>
                </div>
              }
              <div class="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Total</span>
                <span>Bs. {{ total_() | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button (click)="closeModal()" class="btn-secondary">Cancelar</button>
            <button (click)="save()" class="btn-primary" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : 'Crear Cotización' }}
            </button>
          </div>
        </div>
        </div>
      </div>
    }

    <!-- Modal Detalle -->
    @if (detailQuote()) {
      <div class="modal-overlay" (click)="detailQuote.set(null)">
        <div class="modal-center">
        <div class="modal modal-lg animate-slide-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="flex items-center gap-3">
              <div>
                <h2 class="modal-title">{{ detailQuote()!.quoteNumber }}</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Emitida: {{ detailQuote()!.issueDate | date:'dd/MM/yyyy' }}
                  · Vence: {{ detailQuote()!.expiryDate | date:'dd/MM/yyyy' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span [class]="quoteStatusClass(detailQuote()!.status)">{{ quoteStatusLabel(detailQuote()!.status) }}</span>
              <button (click)="detailQuote.set(null)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <div class="modal-body">
            <!-- Paciente info -->
            <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-4">
              <div class="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ detailQuote()!.patient?.firstName }} {{ detailQuote()!.patient?.lastName }}</p>
                <p class="text-xs text-slate-500">{{ detailQuote()!.patient?.phone }}</p>
              </div>
              <button (click)="downloadPdf(detailQuote()!)" class="ml-auto flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-700">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                PDF
              </button>
            </div>

            <!-- Items table -->
            <div class="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th class="text-left px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tratamiento / Descripción</th>
                    <th class="text-center px-3 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-16">Cant.</th>
                    <th class="text-right px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">P. Unit.</th>
                    <th class="text-right px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of detailQuote()!.items || []; track item.id) {
                    <tr class="border-t border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td class="px-4 py-3">
                        <p class="font-medium text-slate-900 dark:text-white">{{ item.description }}</p>
                        @if (item.discount) {
                          <p class="text-xs text-red-500 mt-0.5">Desc. {{ item.discount }}%</p>
                        }
                      </td>
                      <td class="text-center px-3 py-3 text-slate-600 dark:text-slate-400">{{ item.quantity }}</td>
                      <td class="text-right px-4 py-3 text-slate-600 dark:text-slate-400">Bs. {{ item.unitPrice | number:'1.2-2' }}</td>
                      <td class="text-right px-4 py-3 font-semibold text-slate-900 dark:text-white">Bs. {{ item.totalPrice | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Totales -->
            <div class="flex justify-end">
              <div class="space-y-1.5 min-w-48">
                <div class="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>Bs. {{ detailQuote()!.subtotal | number:'1.2-2' }}</span>
                </div>
                @if (detailQuote()!.discount) {
                  <div class="flex justify-between text-sm text-red-500">
                    <span>Descuento</span>
                    <span>-Bs. {{ detailQuote()!.discount | number:'1.2-2' }}</span>
                  </div>
                }
                @if (detailQuote()!.tax) {
                  <div class="flex justify-between text-sm text-slate-500">
                    <span>IVA</span>
                    <span>Bs. {{ detailQuote()!.tax | number:'1.2-2' }}</span>
                  </div>
                }
                <div class="flex justify-between font-bold text-base text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Total</span>
                  <span class="text-primary-600 dark:text-primary-400">Bs. {{ detailQuote()!.total | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            @if (detailQuote()!.notes) {
              <p class="mt-4 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
                <span class="font-semibold">Notas:</span> {{ detailQuote()!.notes }}
              </p>
            }
          </div>
          <div class="modal-footer">
            @if (canEdit()) {
              @if (detailQuote()!.status === 'SENT') {
                <button (click)="changeStatus(detailQuote()!, 'REJECTED')" class="btn-danger">Rechazar</button>
                <button (click)="changeStatus(detailQuote()!, 'ACCEPTED')" class="btn-primary">Aceptar</button>
              } @else if (detailQuote()!.status === 'ACCEPTED') {
                <button (click)="openConvertModal(detailQuote()!)" class="btn-primary flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  Agendar Cita
                </button>
              } @else {
                <span></span>
              }
            } @else {
              <span></span>
            }
            <button (click)="detailQuote.set(null)" class="btn-secondary">Cerrar</button>
          </div>
        </div>
        </div>
      </div>
    }

    <!-- Modal Convertir a Cita -->
    @if (showConvertModal()) {
      <div class="modal-overlay" (click)="showConvertModal.set(null)">
        <div class="modal-center">
        <div class="modal animate-slide-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">Agendar Cita desde Cotización</h2>
            <button (click)="showConvertModal.set(null)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body space-y-4">
            <!-- Quote summary -->
            <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-100 dark:border-indigo-800">
              <p class="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{{ showConvertModal()!.quoteNumber }}</p>
              <p class="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                {{ showConvertModal()!.patient?.firstName }} {{ showConvertModal()!.patient?.lastName }}
                · Total: <span class="font-bold">Bs. {{ showConvertModal()!.total | number:'1.2-2' }}</span>
              </p>
            </div>

            @if (!branchCtx.activeBranchId()) {
              <div>
                <label class="label">Sucursal *</label>
                <select [(ngModel)]="convertForm.branchId" class="input">
                  <option value="">Seleccionar sucursal</option>
                  @for (b of branchCtx.branches(); track b.id) {
                    <option [value]="b.id">{{ b.name }}</option>
                  }
                </select>
              </div>
            }

            <div>
              <label class="label">Doctor *</label>
              <select [(ngModel)]="convertForm.doctorId" class="input">
                <option value="">Seleccionar doctor</option>
                @for (d of availableDoctors(); track d.id) {
                  <option [value]="d.id">Dr(a). {{ d.user?.firstName }} {{ d.user?.lastName }}</option>
                }
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Fecha y Hora *</label>
                <input [(ngModel)]="convertForm.scheduledAt" type="datetime-local" class="input">
              </div>
              <div>
                <label class="label">Duración (min)</label>
                <select [(ngModel)]="convertForm.durationMinutes" class="input">
                  <option [value]="15">15 min</option>
                  <option [value]="30">30 min</option>
                  <option [value]="45">45 min</option>
                  <option [value]="60">1 hora</option>
                  <option [value]="90">1.5 horas</option>
                  <option [value]="120">2 horas</option>
                </select>
              </div>
            </div>

            <div>
              <label class="label">Notas adicionales</label>
              <textarea [(ngModel)]="convertForm.notes" class="input resize-none" rows="2" placeholder="Indicaciones especiales..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button (click)="showConvertModal.set(null)" class="btn-secondary">Cancelar</button>
            <button (click)="doConvertToAppointment()" class="btn-primary" [disabled]="convertingToAppt() || !convertForm.doctorId || !convertForm.scheduledAt || (!branchCtx.activeBranchId() && !convertForm.branchId)">
              {{ convertingToAppt() ? 'Agendando...' : 'Crear Cita' }}
            </button>
          </div>
        </div>
        </div>
      </div>
    }

    <!-- Modal Plan de Cuotas -->
    @if (showInstallmentModal()) {
      <div class="modal-overlay" (click)="showInstallmentModal.set(null)">
        <div class="modal-center">
        <div class="modal animate-slide-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">Plan de Cuotas</h2>
            <button (click)="showInstallmentModal.set(null)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body space-y-4">
            <p class="text-sm text-slate-500">Cotización: <span class="font-semibold text-slate-900 dark:text-white">{{ showInstallmentModal()!.quoteNumber }}</span></p>
            <p class="text-sm text-slate-500">Total: <span class="font-bold text-primary-600">Bs. {{ showInstallmentModal()!.total | number:'1.2-2' }}</span></p>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Meses</label>
                <select [(ngModel)]="installmentMonths" (change)="loadInstallmentPlan(showInstallmentModal()!)" class="input">
                  <option [value]="1">1 mes</option>
                  <option [value]="2">2 meses</option>
                  <option [value]="3">3 meses</option>
                  <option [value]="6">6 meses</option>
                  <option [value]="12">12 meses</option>
                  <option [value]="18">18 meses</option>
                  <option [value]="24">24 meses</option>
                </select>
              </div>
              <div>
                <label class="label">Cuota Inicial (Bs.)</label>
                <input [(ngModel)]="installmentDownPayment" type="number" min="0" class="input" (change)="loadInstallmentPlan(showInstallmentModal()!)">
              </div>
            </div>

            @if (installmentPlan()) {
              <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-slate-500">Cuota inicial</span>
                  <span class="font-semibold">Bs. {{ installmentPlan().downPayment | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-500">Saldo a financiar</span>
                  <span>Bs. {{ installmentPlan().remaining | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-sm font-semibold text-primary-600 border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span>Cuota mensual ({{ installmentPlan().months }} meses)</span>
                  <span>Bs. {{ installmentPlan().monthlyAmount | number:'1.2-2' }}</span>
                </div>
              </div>

              <div class="space-y-1 max-h-48 overflow-y-auto">
                @for (inst of installmentPlan().installments; track inst.number) {
                  <div class="flex justify-between text-xs py-1 px-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <span class="text-slate-500">Cuota {{ inst.number }} — {{ inst.dueDate }}</span>
                    <span class="font-medium">Bs. {{ inst.amount | number:'1.2-2' }}</span>
                  </div>
                }
              </div>
            }
          </div>
          <div class="modal-footer">
            <button (click)="showInstallmentModal.set(null)" class="btn-secondary">Cerrar</button>
          </div>
        </div>
        </div>
      </div>
    }

    @if (toast()) {
      <div class="fixed bottom-5 right-5 z-[70] animate-slide-up max-w-sm"
           [class.toast-success]="toast()!.type === 'success'"
           [class.toast-error]="toast()!.type === 'error'">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            [attr.d]="toast()!.type === 'success' ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'"/>
        </svg>
        <span>{{ toast()!.message }}</span>
      </div>
    }

    @if (convertSuccess()) {
      <div class="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
           (click)="convertSuccess.set(false)">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-slide-up"
             (click)="$event.stopPropagation()">
          <div class="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">¡Cita creada!</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">{{ convertedQuoteInfo() }}</p>
          <button (click)="convertSuccess.set(false)" class="btn-primary w-full">Entendido</button>
        </div>
      </div>
    }
  `,
})
export class QuotesComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  protected branchCtx = inject(BranchContextService);

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  canEdit = computed(() => ['ADMIN', 'RECEPTIONIST'].includes(this.auth.currentUser()?.role || ''));
  tenants = signal<any[]>([]);
  clinicsForFilter = signal<any[]>([]);
  branchesForFilter = signal<any[]>([]);
  filterTenantId = signal<string>('');
  filterClinicId = signal<string>('');
  filterBranchId = signal<string>('');

  quotes = signal<Quote[]>([]);
  treatments = signal<Treatment[]>([]);
  patientResults = signal<Patient[]>([]);
  detailQuote = signal<Quote | null>(null);
  total = signal(0);
  page = signal(1);
  totalPages = signal(1);
  showModal = signal(false);
  saving = signal(false);
  sendingWa = signal(false);
  showInstallmentModal = signal<Quote | null>(null);
  installmentPlan = signal<any | null>(null);
  showConvertModal = signal<Quote | null>(null);
  convertingToAppt = signal(false);
  availableDoctors = signal<any[]>([]);
  toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  convertSuccess = signal(false);
  convertedQuoteInfo = signal<string | null>(null);

  installmentMonths = 3;
  installmentDownPayment = 0;
  convertForm = { doctorId: '', scheduledAt: '', durationMinutes: 30, notes: '', branchId: '' };

  search = '';
  selectedStatus = '';
  patientSearch = '';

  form = this.emptyForm();
  formItems = signal<{ treatmentId: string; description: string; quantity: number; unitPrice: number; toothNumber?: number; toothSurface?: string }[]>([]);
  showOdontogram = signal(false);
  odontogramSelectedTeeth = signal<number[]>([]);
  pendingToothTreatmentId = signal('');
  pendingToothSurface = signal('');

  constructor() {
    effect(() => {
      this.branchCtx.activeBranchId(); // track
      if (!this.isSuperAdmin()) {
        this.page.set(1);
        this.loadQuotes();
      }
    });
  }

  ngOnInit() {
    if (this.isSuperAdmin()) this.loadTenants();
    this.loadQuotes();
    this.loadTreatments();
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
    this.page.set(1);
    this.loadQuotes();
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
    this.page.set(1);
    this.loadQuotes();
  }

  onBranchFilterChange(branchId: string) {
    this.filterBranchId.set(branchId);
    this.page.set(1);
    this.loadQuotes();
  }

  clearFilters() {
    this.filterTenantId.set('');
    this.filterClinicId.set('');
    this.filterBranchId.set('');
    this.clinicsForFilter.set([]);
    this.branchesForFilter.set([]);
    this.page.set(1);
    this.loadQuotes();
  }

  loadQuotes() {
    const params: any = { page: this.page(), limit: 15 };
    if (this.search) params.search = this.search;
    if (this.selectedStatus) params.status = this.selectedStatus;
    if (this.filterTenantId()) params.tenantId = this.filterTenantId();
    // Quotes are clinic-level, not branch-level — filter by clinicId
    const activeClinicId = !this.isSuperAdmin() ? this.branchCtx.activeClinicId() : null;
    const effectiveClinic = this.filterClinicId() || activeClinicId;
    if (effectiveClinic) params.clinicId = effectiveClinic;
    this.api.getPaginated<Quote>('/quotes', params).subscribe(r => {
      this.quotes.set(r.data);
      this.total.set(r.total);
      this.totalPages.set(r.totalPages);
    });
  }

  loadTreatments() {
    this.api.getPaginated<Treatment>('/treatments', { limit: 200, isActive: true }).subscribe(r => this.treatments.set(r.data));
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.loadQuotes(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.loadQuotes(); } }

  searchPatients() {
    if (!this.patientSearch || this.patientSearch.length < 2) { this.patientResults.set([]); return; }
    this.api.getPaginated<Patient>('/patients', { search: this.patientSearch, limit: 5 }).subscribe(r => this.patientResults.set(r.data));
  }

  selectPatient(p: Patient) {
    this.form.patientId = p.id;
    this.patientSearch = `${p.firstName} ${p.lastName}`;
    this.patientResults.set([]);
  }

  addItem() {
    this.formItems.update(items => [...items, { treatmentId: '', description: '', quantity: 1, unitPrice: 0 }]);
  }

  removeItem(i: number) {
    this.formItems.update(items => items.filter((_, idx) => idx !== i));
  }

  onTreatmentSelect(i: number) {
    const item = this.formItems()[i];
    const treatment = this.treatments().find(t => t.id === item.treatmentId);
    if (treatment) {
      const price = this.getPriceForTooth(treatment, item.toothNumber);
      this.formItems.update(items => {
        const updated = [...items];
        updated[i] = {
          ...updated[i],
          description: item.toothNumber
            ? `${treatment.name} — diente ${item.toothNumber}${item.toothSurface ? ' (' + item.toothSurface + ')' : ''}`
            : treatment.name,
          unitPrice: price,
        };
        return updated;
      });
    }
  }

  /** Get price based on tooth classification (anterior/premolar/molar) */
  private getPriceForTooth(treatment: any, toothNumber?: number): number {
    if (!toothNumber || !(treatment as any).toothSpecificPricing) {
      return (treatment as any).promotionPrice || treatment.price;
    }
    const type = classifyTooth(toothNumber);
    if (type === 'anterior' && (treatment as any).precioAnterior) return (treatment as any).precioAnterior;
    if (type === 'premolar' && (treatment as any).precioPremolar) return (treatment as any).precioPremolar;
    if (type === 'molar' && (treatment as any).precioMolar) return (treatment as any).precioMolar;
    return (treatment as any).promotionPrice || treatment.price;
  }

  /** Add items from odontogram selection — one line per selected tooth */
  addTeethItems() {
    const teeth = this.odontogramSelectedTeeth();
    const treatmentId = this.pendingToothTreatmentId();
    const surface = this.pendingToothSurface();
    if (!teeth.length || !treatmentId) return;
    const treatment = this.treatments().find(t => t.id === treatmentId);
    if (!treatment) return;
    const newItems = teeth.map(n => ({
      treatmentId,
      description: `${treatment.name} — diente ${n}${surface ? ' (' + surface + ')' : ''}`,
      quantity: 1,
      unitPrice: this.getPriceForTooth(treatment, n),
      toothNumber: n,
      toothSurface: surface || undefined,
    }));
    this.formItems.update(items => [...items, ...newItems]);
    this.odontogramSelectedTeeth.set([]);
    this.pendingToothTreatmentId.set('');
    this.pendingToothSurface.set('');
    this.showOdontogram.set(false);
  }

  subtotal() { return this.formItems().reduce((sum, i) => sum + i.quantity * i.unitPrice, 0); }
  total_() {
    const sub = this.subtotal();
    const d = this.form.discount || 0;
    return this.form.discountType === 'monto' ? Math.max(0, sub - d) : sub * (1 - d / 100);
  }
  discountAmount() {
    const sub = this.subtotal();
    const d = this.form.discount || 0;
    return this.form.discountType === 'monto' ? Math.min(d, sub) : sub * d / 100;
  }
  recalculate() {} // signals auto-update

  isExpired(date: string) { return new Date(date) < new Date(); }

  openDetail(q: Quote) {
    this.api.get<Quote>(`/quotes/${q.id}`).subscribe(detail => this.detailQuote.set(detail));
  }

  downloadPdf(q: Quote) {
    this.api.download(`/quotes/${q.id}/pdf`).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${q.quoteNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  changeStatus(q: Quote, status: string) {
    this.api.patch(`/quotes/${q.id}/status`, { status }).subscribe(() => {
      this.detailQuote.set(null);
      this.loadQuotes();
    });
  }

  sendWhatsapp(q: Quote) {
    if (this.sendingWa()) return;
    const patient = q.patient as any;
    if (!patient?.whatsappConsent) {
      this.toast.set({ type: 'error', message: 'El paciente no ha dado consentimiento para recibir mensajes de WhatsApp' });
      setTimeout(() => this.toast.set(null), 4000);
      return;
    }
    if (!patient?.whatsapp && !patient?.phone) {
      this.toast.set({ type: 'error', message: 'El paciente no tiene número de WhatsApp/teléfono registrado' });
      setTimeout(() => this.toast.set(null), 4000);
      return;
    }
    this.sendingWa.set(true);
    this.api.post(`/quotes/${q.id}/send-whatsapp`, {}).subscribe({
      next: () => { this.sendingWa.set(false); this.loadQuotes(); },
      error: (err: any) => {
        this.sendingWa.set(false);
        this.toast.set({ type: 'error', message: err?.error?.message || 'Error al enviar por WhatsApp' });
        setTimeout(() => this.toast.set(null), 4000);
      },
    });
  }

  openConvertModal(q: Quote) {
    this.showConvertModal.set(q);
    this.detailQuote.set(null);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
    // Pre-populate duration from quote items if treatments have duration
    const quoteDuration = (q.items as any[])?.reduce((sum: number, i: any) => sum + (i.treatment?.durationMinutes || 0), 0) || 30;
    this.convertForm = {
      doctorId: '',
      scheduledAt: tomorrow.toISOString().slice(0, 16),
      durationMinutes: Math.min(Math.max(quoteDuration, 15), 120),
      notes: '',
      branchId: this.branchCtx.activeBranchId() || '',
    };
    this.api.getPaginated<any>('/doctors', { limit: 100 }).subscribe({
      next: (r) => this.availableDoctors.set(r.data),
      error: () => {},
    });
  }

  doConvertToAppointment() {
    const q = this.showConvertModal();
    if (!q || !this.convertForm.doctorId || !this.convertForm.scheduledAt) return;
    this.convertingToAppt.set(true);
    const branchId = this.convertForm.branchId || this.branchCtx.activeBranchId();
    if (!branchId) { this.toast.set({ type: 'error', message: 'Debes seleccionar una sucursal para crear la cita' }); setTimeout(() => this.toast.set(null), 4000); this.convertingToAppt.set(false); return; }
    const body: any = {
      doctorId: this.convertForm.doctorId,
      scheduledAt: new Date(this.convertForm.scheduledAt).toISOString(),
      durationMinutes: this.convertForm.durationMinutes,
      branchId,
    };
    if (this.convertForm.notes) body.notes = this.convertForm.notes;
    this.api.post(`/quotes/${q.id}/convert-to-appointment`, body).subscribe({
      next: (res: any) => {
        this.convertingToAppt.set(false);
        this.showConvertModal.set(null);
        this.loadQuotes();
        this.convertSuccess.set(true);
        this.convertedQuoteInfo.set('Cita creada exitosamente · Cotización: ' + (res.quoteNumber || '') + ' · Bs. ' + Number(res.total || 0).toFixed(2));
      },
      error: (err: any) => {
        this.convertingToAppt.set(false);
        this.toast.set({ type: 'error', message: err?.error?.message || 'Error al crear la cita' });
        setTimeout(() => this.toast.set(null), 4000);
      },
    });
  }

  openInstallment(q: Quote) {
    this.showInstallmentModal.set(q);
    this.installmentMonths = 3;
    this.installmentDownPayment = 0;
    this.loadInstallmentPlan(q);
  }

  loadInstallmentPlan(q: Quote) {
    this.api.get<any>(`/quotes/${q.id}/installment-plan?months=${this.installmentMonths}&downPayment=${this.installmentDownPayment}`).subscribe({
      next: (plan) => this.installmentPlan.set(plan),
      error: () => {},
    });
  }

  openModal() {
    this.form = this.emptyForm();
    this.formItems.set([{ treatmentId: '', description: '', quantity: 1, unitPrice: 0 }]);
    this.patientSearch = '';
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    const clinicId = this.branchCtx.activeClinicId();
    if (!this.form.patientId || !this.formItems().length || !clinicId) return;
    this.saving.set(true);
    const validItems = this.formItems().filter(i => i.description && i.unitPrice > 0);
    if (!validItems.length) { this.saving.set(false); return; }
    // Backend stores discount as %; convert Bs. to equivalent %
    const discPct = this.form.discountType === 'monto'
      ? (this.subtotal() > 0 ? Math.min(100, (this.form.discount / this.subtotal()) * 100) : 0)
      : (this.form.discount || 0);
    const body = {
      clinicId,
      patientId: this.form.patientId,
      expiryDate: this.form.expiryDate,
      discount: discPct,
      tax: 0,
      notes: this.form.notes || undefined,
      items: validItems.map(i => ({
        treatmentId: i.treatmentId || undefined,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: 0,
        toothNumber: i.toothNumber || undefined,
        toothSurface: i.toothSurface || undefined,
      })),
    };
    this.api.post('/quotes', body).subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadQuotes(); },
      error: () => this.saving.set(false),
    });
  }

  quoteStatusLabel(s: string) {
    const map: Record<string, string> = { DRAFT: 'Borrador', SENT: 'Enviada', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', EXPIRED: 'Vencida', CONVERTED: 'Convertida' };
    return map[s] || s;
  }

  quoteStatusClass(s: string) {
    const map: Record<string, string> = { DRAFT: 'badge-gray', SENT: 'badge-blue', ACCEPTED: 'badge-green', REJECTED: 'badge-red', EXPIRED: 'badge-yellow', CONVERTED: 'badge-indigo' };
    return map[s] || 'badge-gray';
  }

  private emptyForm() {
    const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
    return { patientId: '', expiryDate: expiry.toISOString().split('T')[0], discount: 0, discountType: 'pct' as 'pct' | 'monto', notes: '' };
  }
}
