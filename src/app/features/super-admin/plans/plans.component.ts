import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Plan } from '../../../core/models';

@Component({
  selector: 'app-sa-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-slide-up">
      <div class="page-header">
        <div>
          <h1 class="page-title">Planes de Suscripción</h1>
          <p class="page-subtitle">Configura y gestiona los planes disponibles para los clientes</p>
        </div>
        <button (click)="openModal()" class="btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nuevo Plan
        </button>
      </div>

      <!-- Plan cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        @for (p of plans(); track p.id) {
          <div class="card p-6 relative transition-all duration-200"
            [class.ring-2]="p.isFeatured"
            [class.ring-violet-500]="p.isFeatured"
            [class.opacity-60]="!p.isActive">

            @if (p.isFeatured) {
              <div class="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span class="bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  RECOMENDADO
                </span>
              </div>
            }
            @if (!p.isActive) {
              <div class="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span class="bg-slate-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                  INACTIVO
                </span>
              </div>
            }

            <!-- Header -->
            <div class="flex items-start justify-between mb-5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                  [class]="planIconBg(p)">
                  <svg class="w-5 h-5" [class]="planIconColor(p)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ p.name }}</h3>
                  <p class="text-xs text-slate-400">slug: {{ p.slug }}</p>
                </div>
              </div>
              <span [class]="p.isActive ? 'badge-green' : 'badge-gray'">
                {{ p.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </div>

            <!-- Precio -->
            <div class="mb-5 p-4 rounded-xl" [class]="planPriceBg(p)">
              <div class="flex items-end gap-2">
                <span class="text-3xl font-black" [class]="planPriceColor(p)">
                  Bs. {{ p.monthlyPrice }}
                </span>
                <span class="text-slate-500 text-sm mb-0.5">/mes</span>
              </div>
              <p class="text-sm text-slate-500 mt-1">
                Anual: <strong class="text-slate-700 dark:text-slate-300">Bs. {{ p.annualPrice }}/año</strong>
                <span class="text-emerald-600 text-xs ml-2">({{ annualSaving(p) }}% ahorro)</span>
              </p>
              @if (p.description) {
                <p class="text-xs text-slate-500 mt-2 italic">{{ p.description }}</p>
              }
            </div>

            <!-- Limites -->
            <div class="space-y-2.5 mb-5">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">Limites por suscripcion</p>
              <div class="grid grid-cols-2 gap-2">
                <div class="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2.5 text-center">
                  <p class="text-lg font-bold text-slate-900 dark:text-white">1</p>
                  <p class="text-xs text-slate-500">Clinica</p>
                </div>
                <div class="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2.5 text-center">
                  <p class="text-lg font-bold text-slate-900 dark:text-white">
                    {{ p.maxBranches >= 999 ? 'inf' : p.maxBranches }}
                  </p>
                  <p class="text-xs text-slate-500">Sucursal{{ p.maxBranches !== 1 ? 'es' : '' }}</p>
                </div>
                <div class="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2.5 text-center">
                  <p class="text-lg font-bold text-slate-900 dark:text-white">
                    {{ p.maxUsers >= 999 ? 'inf' : p.maxUsers }}
                  </p>
                  <p class="text-xs text-slate-500">Usuario{{ p.maxUsers !== 1 ? 's' : '' }}</p>
                </div>
                <div class="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2.5 text-center">
                  <p class="text-lg font-bold text-slate-900 dark:text-white">
                    {{ p.maxWhatsappMessages >= 9999 ? 'inf' : (p.maxWhatsappMessages | number) }}
                  </p>
                  <p class="text-xs text-slate-500">Msgs WA</p>
                </div>
              </div>
              <div class="flex justify-between text-sm text-slate-500 pt-1">
                <span>Almacenamiento</span>
                <span class="font-medium text-slate-700 dark:text-slate-300">{{ p.storageGb }} GB</span>
              </div>
            </div>

            <!-- Callout plan basico: funciones visibles pero bloqueadas -->
            @if (p.slug === 'basic') {
              <div class="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5">
                <span class="text-amber-500 text-base leading-none mt-0.5">🔒</span>
                <p class="text-xs text-amber-700 dark:text-amber-300 leading-snug">
                  Tendrás acceso visual a todas las funcionalidades del sistema, pero las avanzadas estarán bloqueadas para que conozcas su potencial.
                </p>
              </div>
            }

            <!-- Features generales -->
            <div class="space-y-1.5 mb-4">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">Funciones incluidas</p>
              @for (f of getFeatures(p); track f.label) {
                <div class="flex items-center gap-2 text-sm"
                  [class]="f.included ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'">
                  @if (f.included) {
                    <svg class="w-4 h-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  } @else {
                    <span class="w-4 h-4 shrink-0 flex items-center justify-center text-xs">🔒</span>
                  }
                  {{ f.label }}
                </div>
              }
            </div>

            <!-- WhatsApp features -->
            <div class="border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-5">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.864L.053 23.8l6.07-1.592A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.878 0-3.63-.483-5.143-1.332l-.369-.213-3.814 1.001.995-3.698-.24-.385A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide">WhatsApp</p>
              </div>
              @for (f of getWhatsappFeatures(p); track f.label) {
                <div class="flex items-start gap-2 text-xs py-0.5"
                  [class]="f.included ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'">
                  @if (f.included) {
                    <svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  } @else {
                    <span class="w-3.5 shrink-0 flex items-center justify-center" style="font-size:10px">🔒</span>
                  }
                  {{ f.label }}
                </div>
              }
            </div>

            <button (click)="openModal(p)" class="btn-outline w-full text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Editar Plan
            </button>
          </div>
        } @empty {
          <div class="col-span-2 card p-12 text-center text-slate-400">
            <p class="text-lg font-semibold mb-1">No hay planes configurados</p>
            <p class="text-sm">Crea el plan Basico y Premium para comenzar</p>
          </div>
        }
      </div>
    </div>

    <!-- MODAL EDITAR/CREAR PLAN -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-center">
          <div class="modal modal-lg animate-slide-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ editing() ? 'Editar Plan' : 'Nuevo Plan' }}</h2>
              <button (click)="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="label">Nombre *</label>
                  <input [(ngModel)]="form.name" class="input" placeholder="Plan Basico">
                </div>
                <div>
                  <label class="label">Slug *</label>
                  <input [(ngModel)]="form.slug" class="input" placeholder="basic" [disabled]="!!editing()">
                </div>
                <div class="col-span-2">
                  <label class="label">Descripcion</label>
                  <input [(ngModel)]="form.description" class="input" placeholder="Descripcion breve del plan...">
                </div>
                <div>
                  <label class="label">Precio Mensual (Bs.) *</label>
                  <input [(ngModel)]="form.monthlyPrice" type="number" class="input" min="0">
                </div>
                <div>
                  <label class="label">Precio Anual (Bs.) *</label>
                  <input [(ngModel)]="form.annualPrice" type="number" class="input" min="0">
                </div>

                <div class="col-span-2 divider"></div>
                <p class="col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Limites</p>

                <div>
                  <label class="label">Max. Usuarios</label>
                  <div class="flex items-center gap-2">
                    <input [(ngModel)]="form.maxUsers" type="number" class="input" min="1">
                    <span class="text-xs text-slate-400 whitespace-nowrap">999 = ilimitado</span>
                  </div>
                </div>
                <div>
                  <label class="label">Max. Sucursales</label>
                  <div class="flex items-center gap-2">
                    <input [(ngModel)]="form.maxBranches" type="number" class="input" min="1">
                    <span class="text-xs text-slate-400 whitespace-nowrap">999 = ilimitado</span>
                  </div>
                </div>
                <div>
                  <label class="label">Max. Mensajes WhatsApp/mes</label>
                  <input [(ngModel)]="form.maxWhatsappMessages" type="number" class="input" min="0">
                </div>
                <div>
                  <label class="label">Almacenamiento (GB)</label>
                  <input [(ngModel)]="form.storageGb" type="number" class="input" min="1">
                </div>
                <div>
                  <label class="label">Orden de visualizacion</label>
                  <input [(ngModel)]="form.sortOrder" type="number" class="input" min="1">
                </div>
              </div>

              <div class="mt-5 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Funciones del sistema</p>
                <div class="grid grid-cols-2 gap-2.5">
                  @for (feat of systemFeatures; track feat.key) {
                    <label class="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input type="checkbox" [(ngModel)]="form[feat.key]" class="rounded border-slate-300 text-primary-600 focus:ring-primary-500">
                      {{ feat.label }}
                    </label>
                  }
                </div>
              </div>

              <div class="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-3">WhatsApp</p>
                <div class="space-y-2.5">
                  @for (feat of whatsappFeatures; track feat.key) {
                    <label class="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" [(ngModel)]="form[feat.key]" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5">
                      <div>
                        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ feat.label }}</span>
                        <p class="text-xs text-slate-400 dark:text-slate-500">{{ feat.sublabel }}</p>
                      </div>
                    </label>
                  }
                </div>
              </div>

              <div class="flex items-center gap-5 mt-4">
                <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.isActive" class="rounded">
                  Plan activo
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.isFeatured" class="rounded">
                  Destacado / Recomendado
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="closeModal()" class="btn-secondary">Cancelar</button>
              <button (click)="save()" class="btn-primary" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : (editing() ? 'Guardar cambios' : 'Crear Plan') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class PlansComponent implements OnInit {
  private api = inject(ApiService);

  plans = signal<Plan[]>([]);
  showModal = signal(false);
  editing = signal<Plan | null>(null);
  saving = signal(false);

  systemFeatures = [
    { key: 'hasQuotes', label: 'Cotizaciones PDF' },
    { key: 'hasAdvancedDashboard', label: 'Dashboard Avanzado' },
    { key: 'hasExternalPortal', label: 'Portal Externo' },
    { key: 'hasPredictiveAnalytics', label: 'Analytics Predictivo (IA)' },
    { key: 'hasInventoryTransfer', label: 'Traslado de Inventario' },
    { key: 'hasApiAccess', label: 'Acceso API' },
    { key: 'hasDataImport', label: 'Importacion de Datos' },
    { key: 'hasStatisticalReports', label: 'Informes Estadisticos' },
  ];

  whatsappFeatures = [
    {
      key: 'hasWhatsappBasic',
      label: 'WhatsApp Basico',
      sublabel: 'Recordatorios 24h y 1h antes de la cita',
    },
    {
      key: 'hasWhatsappAdvanced',
      label: 'WhatsApp Avanzado',
      sublabel: 'Cumpleanos, cotizaciones, seguimiento inactivos, campanas, promociones Bolivia',
    },
  ];

  form: any = this.emptyForm();

  ngOnInit() { this.loadPlans(); }

  loadPlans() {
    this.api.get<Plan[]>('/plans').subscribe(p => this.plans.set(Array.isArray(p) ? p : []));
  }

  openModal(p?: Plan) {
    this.editing.set(p || null);
    this.form = p ? { ...p } : this.emptyForm();
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (!this.form.name || !this.form.slug) return;
    this.saving.set(true);
    const req = this.editing()
      ? this.api.patch(`/plans/${this.editing()!.id}`, this.form)
      : this.api.post('/plans', this.form);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadPlans(); },
      error: () => this.saving.set(false),
    });
  }

  annualSaving(p: Plan): number {
    if (!p.monthlyPrice || !p.annualPrice) return 0;
    const monthly12 = Number(p.monthlyPrice) * 12;
    const annual = Number(p.annualPrice);
    return Math.round((1 - annual / monthly12) * 100);
  }

  planIconBg(p: Plan): string {
    if (p.slug === 'premium') return 'bg-violet-100 dark:bg-violet-900/40';
    return 'bg-blue-100 dark:bg-blue-900/40';
  }

  planIconColor(p: Plan): string {
    if (p.slug === 'premium') return 'text-violet-600 dark:text-violet-400';
    return 'text-blue-600 dark:text-blue-400';
  }

  planPriceBg(p: Plan): string {
    if (p.slug === 'premium') return 'bg-violet-50 dark:bg-violet-900/20';
    return 'bg-blue-50 dark:bg-blue-900/20';
  }

  planPriceColor(p: Plan): string {
    if (p.slug === 'premium') return 'text-violet-700 dark:text-violet-300';
    return 'text-blue-700 dark:text-blue-300';
  }

  getFeatures(p: Plan) {
    return [
      { label: 'Gestion de citas y pacientes', included: true },
      { label: 'Inventario de productos', included: true },
      { label: 'Cotizaciones PDF', included: p.hasQuotes },
      { label: 'Automatizacion Comercial (cotizacion → cita con 1 clic)', included: p.hasQuotes },
      { label: 'Dashboard Inteligente (KPIs clinicos y comerciales)', included: p.hasAdvancedDashboard },
      { label: 'Reportes Estrategicos de rentabilidad', included: p.hasStatisticalReports },
      { label: 'Modulo de Promociones Inteligentes Bolivia', included: p.hasWhatsappAdvanced },
      { label: 'Traslado de inventario entre sucursales', included: p.hasInventoryTransfer },
      { label: 'Importacion de datos', included: p.hasDataImport },
      { label: 'Acceso API', included: p.hasApiAccess ?? false },
    ];
  }

  getWhatsappFeatures(p: Plan) {
    const hasBasic = p.hasWhatsappBasic;
    const hasAdv = p.hasWhatsappAdvanced;
    return [
      { label: 'Recordatorio 24h antes de cita', included: hasBasic },
      { label: 'Recordatorio 1h antes de cita', included: hasBasic },
      { label: 'Confirmacion automatica de citas', included: hasBasic },
      { label: 'Felicitaciones de cumpleanos personalizadas', included: hasAdv },
      { label: 'Envio de cotizaciones por WhatsApp', included: hasAdv },
      { label: 'Seguimiento pacientes inactivos (+6 meses)', included: hasAdv },
      { label: 'Campanas de fidelizacion personalizadas', included: hasAdv },
      { label: 'Reactivacion estrategica de pacientes', included: hasAdv },
      { label: 'Promociones por fechas especiales Bolivia', included: hasAdv },
    ];
  }

  private emptyForm() {
    return {
      name: '', slug: '', description: '',
      monthlyPrice: 200, annualPrice: 1800,
      maxUsers: 10, maxBranches: 2, maxClinics: 1,
      maxWhatsappMessages: 500, storageGb: 5,
      hasExternalPortal: false, hasAdvancedDashboard: false,
      hasPredictiveAnalytics: false, hasInventoryTransfer: false,
      hasQuotes: false, hasApiAccess: false,
      hasWhatsappBasic: true, hasWhatsappAdvanced: false,
      hasDataImport: false, hasStatisticalReports: false,
      isActive: true, isFeatured: false, sortOrder: 1,
    };
  }
}
