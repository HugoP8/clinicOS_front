import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';

@Component({
  selector: 'app-commissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-slide-up">
      <div class="page-header">
        <div>
          <h1 class="page-title">Comisiones</h1>
          <p class="page-subtitle">Control de comisiones del equipo médico</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card p-4 flex flex-wrap gap-3 items-center">
        <div>
          <label class="label">Período</label>
          <input type="month" [(ngModel)]="selectedPeriod" (change)="loadSummary()" class="input w-40">
        </div>
        <div>
          <label class="label">Doctor</label>
          <select [(ngModel)]="selectedDoctorId" (change)="loadDoctorCommissions()" class="input w-48">
            <option value="">Todos</option>
            @for (d of doctors(); track d.doctorId) {
              <option [value]="d.doctorId">{{ d.doctorName }}</option>
            }
          </select>
        </div>
        <div>
          <label class="label">Estado</label>
          <select [(ngModel)]="statusFilter" (change)="loadDoctorCommissions()" class="input w-36">
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="PARTIAL">Parcial</option>
            <option value="PAID">Pagado</option>
          </select>
        </div>
      </div>

      <!-- Resumen por doctor -->
      @if (summary().length > 0) {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (doc of summary(); track doc.doctorId) {
            <div class="card p-4 cursor-pointer hover:border-primary-300 transition-colors"
                 [class.border-primary-400]="selectedDoctorId === doc.doctorId"
                 (click)="selectDoctor(doc.doctorId)">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0">
                  {{ doc.doctorName.charAt(0) }}
                </div>
                <div>
                  <p class="font-medium text-sm text-slate-900 dark:text-white">{{ doc.doctorName }}</p>
                  @if (doc.specialties?.length) {
                    <p class="text-xs text-slate-400 truncate">{{ doc.specialties[0] }}</p>
                  }
                  @if (doc.branchName) {
                    <p class="text-xs text-primary-500">{{ doc.branchName }}</p>
                  }
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                  <p class="text-amber-600 font-semibold">Pendiente</p>
                  <p class="text-lg font-bold text-amber-700">Bs. {{ doc.pending | number:'1.2-2' }}</p>
                </div>
                <div class="bg-green-50 dark:bg-green-900/20 rounded p-2">
                  <p class="text-green-600 font-semibold">Pagado</p>
                  <p class="text-lg font-bold text-green-700">Bs. {{ doc.paid | number:'1.2-2' }}</p>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Detalle de comisiones -->
      @if (selectedDoctorId) {
        <div class="card">
          <div class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 class="font-semibold text-slate-900 dark:text-white">Detalle de Comisiones</h3>
            @if (detailSummary()) {
              <div class="text-sm text-slate-600 dark:text-slate-400">
                Pendiente: <strong class="text-amber-600">Bs. {{ detailSummary()!.totalPending | number:'1.2-2' }}</strong>
                &nbsp;|&nbsp;
                Pagado: <strong class="text-green-600">Bs. {{ detailSummary()!.totalPaid | number:'1.2-2' }}</strong>
              </div>
            }
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Fecha Cita</th>
                  <th>Paciente</th>
                  <th>Base</th>
                  <th>Comisión</th>
                  <th>Estado</th>
                  <th>Pagado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @if (loadingDetail()) {
                  @for (_ of [1,2,3]; track $index) {
                    <tr><td colspan="7"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse"></div></td></tr>
                  }
                } @else {
                  @for (r of commissions(); track r.id) {
                    <tr>
                      <td class="text-sm">{{ r.appointment?.scheduledAt | date:'dd/MM/yyyy' }}</td>
                      <td class="text-sm">{{ r.appointment?.patient?.firstName }} {{ r.appointment?.patient?.lastName }}</td>
                      <td class="text-sm">Bs. {{ r.baseAmount | number:'1.2-2' }}</td>
                      <td>
                        <div class="flex items-center gap-1.5">
                          <span class="font-semibold text-primary-600">Bs. {{ r.commissionAmount | number:'1.2-2' }}</span>
                          @if (r.metadata?.customized) {
                            <span class="badge-gray text-[10px] px-1 py-0">Personalizado</span>
                          } @else {
                            <span class="text-xs text-slate-400">{{ r.commissionType === 'PERCENTAGE' ? (r.commissionRate + '%') : 'Fijo' }}</span>
                          }
                        </div>
                      </td>
                      <td>
                        <span [class]="r.status === 'PAID' ? 'badge-green' : r.status === 'PARTIAL' ? 'badge-amber' : 'badge-yellow'">
                          {{ r.status === 'PAID' ? 'Pagado' : r.status === 'PARTIAL' ? 'Parcial' : 'Pendiente' }}
                        </span>
                      </td>
                      <td class="text-sm">
                        @if (r.status === 'PARTIAL') {
                          <div class="text-amber-600 font-medium">Bs. {{ r.paidAmount | number:'1.2-2' }}</div>
                          <div class="text-xs text-slate-400">de Bs. {{ r.commissionAmount | number:'1.2-2' }}</div>
                        } @else if (r.status === 'PAID') {
                          <div class="text-green-600 font-medium">Bs. {{ (r.paidAmount ?? r.commissionAmount) | number:'1.2-2' }}</div>
                        } @else {
                          <span class="text-slate-400">—</span>
                        }
                      </td>
                      <td>
                        <div class="flex items-center gap-1">
                          @if ((r.status === 'PENDING' || r.status === 'PARTIAL') && isAdmin()) {
                            <button (click)="openPayModal(r)" class="btn-success text-xs px-2.5 py-1.5 flex items-center gap-1">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                              </svg>
                              {{ r.status === 'PARTIAL' ? 'Pagar resto' : 'Pagar' }}
                            </button>
                          }
                          @if (r.status !== 'PAID' && isAdmin()) {
                            <button (click)="openEditModal(r)" title="Editar monto"
                              class="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              </svg>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="7" class="text-center py-8 text-slate-400">Sin comisiones para este período</td></tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (summary().length === 0 && !loading()) {
        <div class="empty-state">
          <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <p>No hay comisiones para este período</p>
          <p class="text-xs mt-1">Las comisiones se generan automáticamente al completar citas con doctores que tienen comisión configurada</p>
        </div>
      }
    </div>

    @if (confirmPay()) {
      <div class="modal-overlay" (click)="closePayModal()">
        <div class="modal-center">
          <div class="modal max-w-md animate-slide-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title flex items-center gap-2">
                <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                Pagar Comisión
              </h2>
              <button (click)="closePayModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body space-y-4">
              <!-- Info de la comisión -->
              <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2 text-sm">
                @if (confirmPay()!.appointment?.patient) {
                  <div class="flex justify-between">
                    <span class="text-slate-500">Paciente</span>
                    <span class="font-medium">{{ confirmPay()!.appointment?.patient?.firstName }} {{ confirmPay()!.appointment?.patient?.lastName }}</span>
                  </div>
                }
                @if (confirmPay()!.appointment?.scheduledAt) {
                  <div class="flex justify-between">
                    <span class="text-slate-500">Fecha cita</span>
                    <span>{{ confirmPay()!.appointment?.scheduledAt | date:'dd/MM/yyyy' }}</span>
                  </div>
                }
                <div class="flex justify-between">
                  <span class="text-slate-500">Comisión total</span>
                  <span class="font-bold text-slate-700 dark:text-slate-200">Bs. {{ confirmPay()!.commissionAmount | number:'1.2-2' }}</span>
                </div>
                @if (confirmPay()!.status === 'PARTIAL') {
                  <div class="flex justify-between text-amber-600">
                    <span>Ya pagado</span>
                    <span class="font-semibold">Bs. {{ confirmPay()!.paidAmount | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-2 mt-1">
                    <span class="font-medium text-emerald-700 dark:text-emerald-400">Pendiente a pagar</span>
                    <span class="font-bold text-emerald-600 text-base">Bs. {{ remainingAmount() | number:'1.2-2' }}</span>
                  </div>
                } @else {
                  <div class="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-2 mt-1">
                    <span class="text-slate-500 font-medium">A pagar</span>
                    <span class="font-bold text-emerald-600 text-base">Bs. {{ remainingAmount() | number:'1.2-2' }}</span>
                  </div>
                }
              </div>

              <!-- Opciones de pago -->
              <div>
                <label class="label mb-2">¿Cuánto se pagará ahora?</label>
                <div class="grid grid-cols-3 gap-2">
                  <button type="button"
                    (click)="setPayMode('100')"
                    [ngClass]="payMode() === '100' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-emerald-400'"
                    class="border-2 rounded-xl p-3 text-center transition-all font-semibold">
                    Todo
                    <div class="text-xs mt-0.5 opacity-80">Bs. {{ remainingAmount() | number:'1.2-2' }}</div>
                  </button>
                  <button type="button"
                    (click)="setPayMode('50')"
                    [ngClass]="payMode() === '50' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-blue-400'"
                    class="border-2 rounded-xl p-3 text-center transition-all font-semibold">
                    50%
                    <div class="text-xs mt-0.5 opacity-80">Bs. {{ (remainingAmount() * 0.5) | number:'1.2-2' }}</div>
                  </button>
                  <button type="button"
                    (click)="setPayMode('manual')"
                    [ngClass]="payMode() === 'manual' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-amber-400'"
                    class="border-2 rounded-xl p-3 text-center transition-all font-semibold">
                    Parcial
                    <div class="text-xs mt-0.5 opacity-80">Otro monto</div>
                  </button>
                </div>
              </div>

              @if (payMode() === 'manual') {
                <div>
                  <label class="label">Monto a pagar ahora (Bs.)</label>
                  <input type="number" [(ngModel)]="customPayAmount" min="0.01" [max]="remainingAmount()"
                    step="0.01" class="input" placeholder="0.00"
                    (input)="cdr.markForCheck()">
                  <p class="text-xs text-slate-400 mt-1">Máximo pendiente: Bs. {{ remainingAmount() | number:'1.2-2' }}</p>
                </div>
              }

              <!-- Monto final resaltado -->
              <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span class="text-sm font-medium text-emerald-700 dark:text-emerald-400">Se registrará como pagado:</span>
                  @if (calcPaidAmount() < remainingAmount()) {
                    <p class="text-xs text-amber-600 mt-0.5">Quedará pendiente Bs. {{ remainingAmount() - calcPaidAmount() | number:'1.2-2' }}</p>
                  }
                </div>
                <span class="text-xl font-bold text-emerald-600">Bs. {{ calcPaidAmount() | number:'1.2-2' }}</span>
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="closePayModal()" class="btn-secondary">Cancelar</button>
              <button (click)="doMarkPaid()" [disabled]="!canConfirmPay()" class="btn-success">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                {{ calcPaidAmount() >= remainingAmount() ? 'Pago Completo' : 'Pago Parcial' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- MODAL: Editar monto de comisión -->
    @if (editingCommission()) {
      <div class="modal-overlay" (click)="closeEditModal()">
        <div class="modal-center">
          <div class="modal max-w-sm animate-slide-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Editar Comisión</h2>
              <button (click)="closeEditModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body space-y-4">
              <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-slate-500">Comisión original</span>
                  <span class="font-medium">Bs. {{ editingCommission()!.commissionAmount | number:'1.2-2' }}</span>
                </div>
                @if (editingCommission()!.commissionType === 'PERCENTAGE') {
                  <div class="flex justify-between mt-1">
                    <span class="text-slate-500">Tasa</span>
                    <span class="text-slate-400">{{ editingCommission()!.commissionRate }}% de Bs. {{ editingCommission()!.baseAmount | number:'1.2-2' }}</span>
                  </div>
                }
              </div>
              <div>
                <label class="label">Nuevo monto de comisión (Bs.) *</label>
                <input type="number" [(ngModel)]="editAmountValue" min="0" step="0.01" class="input" placeholder="0.00"
                  (input)="cdr.markForCheck()">
                <p class="text-xs text-slate-400 mt-1">El tipo se cambiará a "Fijo" y se marcará como "Personalizado"</p>
              </div>
              <div>
                <label class="label">Nota (opcional)</label>
                <input type="text" [(ngModel)]="editAmountNote" class="input" placeholder="Ej: Ajuste por acuerdo especial">
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="closeEditModal()" class="btn-secondary">Cancelar</button>
              <button (click)="doEditAmount()" [disabled]="!editAmountValue || editAmountValue < 0" class="btn-primary">
                Guardar cambio
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class CommissionsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private branchCtx = inject(BranchContextService);
  cdr = inject(ChangeDetectorRef);

  isAdmin = computed(() => ['ADMIN', 'SECRETARY', 'SUPER_ADMIN'].includes(this.auth.currentUser()?.role || ''));

  summary = signal<any[]>([]);
  doctors = signal<any[]>([]);
  commissions = signal<any[]>([]);
  detailSummary = signal<{ totalPending: number; totalPaid: number } | null>(null);
  loading = signal(false);
  loadingDetail = signal(false);
  confirmPay = signal<any | null>(null);
  editingCommission = signal<any | null>(null);
  payMode = signal<'100' | '50' | 'manual'>('100');
  customPayAmount = 0;
  editAmountValue = 0;
  editAmountNote = '';

  selectedPeriod = new Date().toISOString().slice(0, 7);
  selectedDoctorId = '';
  statusFilter = '';

  remainingAmount = computed(() => {
    const rec = this.confirmPay();
    if (!rec) return 0;
    const total = Number(rec.commissionAmount);
    const paid = Number(rec.paidAmount || 0);
    return Math.round((total - paid) * 100) / 100;
  });

  constructor() {
    effect(() => {
      this.branchCtx.activeBranchId(); // track branch changes
      this.loadSummary();
    });
  }

  ngOnInit() {}

  loadSummary() {
    this.loading.set(true);
    const branchId = this.branchCtx.activeBranchId();
    const branchParam = branchId ? `&branchId=${branchId}` : '';
    this.api.get<any>(`/doctors/commissions/summary?period=${this.selectedPeriod}${branchParam}`).subscribe({
      next: (res: any) => {
        const data = res?.doctors || res || [];
        this.summary.set(data);
        this.doctors.set(data);
        this.loading.set(false);
        // DOCTOR role: auto-select their own record
        if (!this.isAdmin() && data.length > 0 && !this.selectedDoctorId) {
          this.selectedDoctorId = data[0].doctorId;
        }
        if (this.selectedDoctorId) this.loadDoctorCommissions();
      },
      error: () => this.loading.set(false),
    });
  }

  selectDoctor(doctorId: string) {
    this.selectedDoctorId = doctorId;
    this.loadDoctorCommissions();
  }

  loadDoctorCommissions() {
    if (!this.selectedDoctorId) return;
    this.loadingDetail.set(true);
    const params: any = { period: this.selectedPeriod };
    if (this.statusFilter) params.status = this.statusFilter;
    const query = new URLSearchParams(params).toString();
    this.api.get<any>(`/doctors/${this.selectedDoctorId}/commissions?${query}`).subscribe({
      next: (res: any) => {
        this.commissions.set(res?.records || []);
        this.detailSummary.set(res?.summary || null);
        this.loadingDetail.set(false);
      },
      error: () => this.loadingDetail.set(false),
    });
  }

  openPayModal(record: any) {
    this.confirmPay.set(record);
    this.payMode.set('100');
    this.customPayAmount = 0;
  }

  closePayModal() {
    this.confirmPay.set(null);
  }

  setPayMode(mode: '100' | '50' | 'manual') {
    this.payMode.set(mode);
    if (mode !== 'manual') this.customPayAmount = 0;
  }

  calcPaidAmount(): number {
    const remaining = this.remainingAmount();
    if (this.payMode() === '100') return remaining;
    if (this.payMode() === '50') return Math.round(remaining * 0.5 * 100) / 100;
    return Math.round((this.customPayAmount || 0) * 100) / 100;
  }

  canConfirmPay(): boolean {
    if (this.payMode() !== 'manual') return true;
    return this.customPayAmount > 0 && this.customPayAmount <= this.remainingAmount();
  }

  doMarkPaid() {
    const record = this.confirmPay();
    if (!record) return;
    const paidAmount = this.calcPaidAmount();
    const totalPaid = Number(record.paidAmount || 0) + paidAmount;
    const isFullyPaid = totalPaid >= Number(record.commissionAmount) - 0.001;
    const newStatus = isFullyPaid ? 'PAID' : 'PARTIAL';
    this.confirmPay.set(null);
    this.api.patch(`/doctors/${this.selectedDoctorId}/commissions/${record.id}/mark-paid`, { paidAmount }).subscribe({
      next: (updated: any) => {
        this.commissions.update(list => list.map(r =>
          r.id === record.id ? { ...r, status: newStatus, paidAmount: totalPaid } : r
        ));
        this.loadSummary();
      },
      error: () => {},
    });
  }

  openEditModal(record: any) {
    this.editingCommission.set(record);
    this.editAmountValue = Number(record.commissionAmount);
    this.editAmountNote = '';
  }

  closeEditModal() {
    this.editingCommission.set(null);
  }

  doEditAmount() {
    const record = this.editingCommission();
    if (!record || this.editAmountValue < 0) return;
    const body: any = { commissionAmount: this.editAmountValue };
    if (this.editAmountNote) body.notes = this.editAmountNote;
    this.closeEditModal();
    this.api.patch(`/doctors/${this.selectedDoctorId}/commissions/${record.id}/update-amount`, body).subscribe({
      next: () => {
        this.commissions.update(list => list.map(r =>
          r.id === record.id
            ? { ...r, commissionAmount: this.editAmountValue, commissionType: 'FIXED', metadata: { ...r.metadata, customized: true } }
            : r
        ));
        this.loadSummary();
      },
      error: () => {},
    });
  }
}
