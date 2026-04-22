import {
  Component, inject, signal, computed, OnInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, DownloadResult } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface ImportResult {
  created: number;
  skipped: number;
  duplicates: string[];
  errors: string[];
  total: number;
}

interface SheetResult {
  patients?: ImportResult;
  treatments?: ImportResult;
  inventory?: ImportResult;
}

type TabKey = 'patients' | 'treatments' | 'inventory' | 'doctors' | 'all';

@Component({
  selector: 'app-import',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="animate-slide-up p-6 max-w-4xl mx-auto space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Importar Datos</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Migra pacientes, tratamientos e inventario desde Excel
          </p>
        </div>
        @if (canAccess()) {
          <button (click)="downloadTemplate()" [disabled]="downloadingTemplate()"
            class="btn btn-primary flex items-center gap-2">
            @if (downloadingTemplate()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            }
            {{ downloadBtnLabel() }}
          </button>
        }
      </div>

      <!-- Loading -->
      @if (loadingPlan()) {
        <div class="flex items-center justify-center py-20">
          <svg class="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      }

      <!-- Plan bloqueado -->
      @if (!loadingPlan() && !canAccess()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden">
          <div class="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold">Función exclusiva del Plan Premium</h2>
                <p class="text-white/80 text-sm mt-0.5">Migra todos tus datos clínicos en minutos</p>
              </div>
            </div>
          </div>
          <div class="p-6 space-y-4">
            <p class="text-slate-600 dark:text-slate-300">
              La importación masiva de datos requiere el <strong>Plan Premium</strong>.
              Actualmente estás en el <strong>{{ currentPlanName() }}</strong>.
            </p>
            <ul class="space-y-2">
              @for (feature of premiumFeatures; track $index) {
                <li class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  {{ feature }}
                </li>
              }
            </ul>
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">¿Quieres mejorar tu plan?</p>
              <p class="text-sm text-amber-700 dark:text-amber-400 mt-1">Contacta al administrador del sistema:</p>
              <a href="https://wa.me/59175455488?text=Hola%20Ing.%20Hugo%2C%20quiero%20mejorar%20mi%20plan%20en%20ClinicOS"
                target="_blank" rel="noopener noreferrer"
                class="mt-3 inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.135.561 4.14 1.542 5.873L.057 23.885l6.184-1.622A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.028-1.382l-.36-.215-3.728.978.995-3.635-.235-.373A9.818 9.818 0 1112 21.818z"/>
                </svg>
                WhatsApp: Ing. Hugo Porcel Aliaga (+591 75455488)
              </a>
            </div>
          </div>
        </div>
      }

      <!-- Contenido principal -->
      @if (!loadingPlan() && canAccess()) {

        <!-- SUPER_ADMIN: selector de tenant -->
        @if (isSuperAdmin()) {
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0a2 2 0 002-2v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1a2 2 0 002 2z"/>
                </svg>
              </div>
              <div class="flex-1">
                <label class="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Seleccionar Cliente (Tenant)
                </label>
                <select [(ngModel)]="selectedTenantId" (ngModelChange)="onTenantChange($event)"
                  class="w-full text-sm bg-transparent border-0 outline-none text-slate-800 dark:text-slate-100 font-medium cursor-pointer">
                  <option value="">— Selecciona un cliente —</option>
                  @for (t of tenants(); track t.id) {
                    <option [value]="t.id">{{ t.name }} ({{ t.slug }})</option>
                  }
                </select>
              </div>
            </div>
            @if (!selectedTenantId) {
              <p class="text-xs text-amber-600 dark:text-amber-400 mt-2 ml-12">Selecciona un cliente para continuar</p>
            }
          </div>
        }

        <!-- Selector de sucursal -->
        @if (needsBranch()) {
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0a2 2 0 002-2v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1a2 2 0 002 2z"/>
                </svg>
              </div>
              <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Asignación de Sucursal</p>
            </div>

            <!-- Mode toggle (only for tabs that allow "all") -->
            @if (allowAllBranches() && branches().length > 1) {
              <div class="flex gap-2">
                <button (click)="selectedBranchMode = 'specific'"
                  [ngClass]="selectedBranchMode === 'specific'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-emerald-400'"
                  class="flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-all">
                  Sucursal específica
                </button>
                <button (click)="selectedBranchMode = 'all'"
                  [ngClass]="selectedBranchMode === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-emerald-400'"
                  class="flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-all">
                  Todas las sucursales
                </button>
              </div>
            }

            @if (selectedBranchMode === 'all' && allowAllBranches()) {
              <div class="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
                <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <p class="text-xs text-emerald-700 dark:text-emerald-300">
                  Los registros <strong>no se asignarán a ninguna sucursal específica</strong> — estarán disponibles en todas las sedes.
                </p>
              </div>
            } @else if (branches().length > 0) {
              <select [(ngModel)]="selectedBranchId"
                class="w-full input text-sm">
                <option value="">— Selecciona una sucursal —</option>
                @for (b of branches(); track b.id) {
                  <option [value]="b.id">{{ b.name }}{{ b.isMain ? ' (Principal)' : '' }}</option>
                }
              </select>
              @if (!selectedBranchId) {
                <p class="text-xs text-amber-600 dark:text-amber-400">
                  Selecciona una sucursal o cambia a "Todas las sucursales"
                </p>
              }
            } @else {
              <p class="text-xs text-slate-500 dark:text-slate-400 italic">Cargando sucursales...</p>
            }
          </div>
        }

        <!-- Info banner -->
        <div class="alert alert-info">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <p class="font-medium">¿Cómo funciona?</p>
            <ol class="text-sm mt-1 list-decimal list-inside space-y-0.5">
              <li>Descarga la plantilla Excel con el botón "Descargar Plantilla"</li>
              <li>Rellena los datos — el sistema valida antes de importar</li>
              <li>Si hay filas con errores, puedes importar las válidas y corregir las otras después</li>
              <li>Los registros duplicados se omiten automáticamente</li>
            </ol>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          @for (tab of tabs; track tab.key) {
            <button
              (click)="activeTab.set(tab.key); selectedBranchMode = 'specific'"
              [ngClass]="activeTab() === tab.key
                ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
              class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all">
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Upload card -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              [ngClass]="activeTabInfo().color">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="activeTabInfo().icon"/>
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-900 dark:text-white">{{ activeTabInfo().title }}</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ activeTabInfo().desc }}</p>
            </div>
          </div>

          <!-- Drop zone -->
          <label
            [ngClass]="dragOver()
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/10'
              : 'border-slate-300 dark:border-slate-600 hover:border-primary-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'"
            class="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors"
            (dragover)="onDragOver($event)" (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">
            <input type="file" accept=".xlsx,.xls" class="hidden" (change)="onFileChange($event)">
            @if (selectedFile()) {
              <div class="flex items-center gap-3 text-primary-600 dark:text-primary-400">
                <svg class="w-8 h-8 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <div>
                  <p class="font-medium text-sm">{{ selectedFile()!.name }}</p>
                  <p class="text-xs text-slate-500">{{ formatSize(selectedFile()!.size) }}</p>
                </div>
                <button type="button" (click)="clearFile($event)"
                  class="ml-2 text-slate-400 hover:text-red-500 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            } @else {
              <svg class="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              <div class="text-center">
                <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Arrastra tu archivo aquí o <span class="text-primary-600 dark:text-primary-400">busca</span>
                </p>
                <p class="text-xs text-slate-500 mt-0.5">Solo archivos .xlsx o .xls</p>
              </div>
            }
          </label>

          <!-- Upload btn -->
          <button (click)="upload()"
            [disabled]="!selectedFile() || uploading() || validating() || (isSuperAdmin() && !selectedTenantId)"
            class="btn btn-primary w-full flex items-center justify-center gap-2">
            @if (validating()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span>Validando archivo...</span>
            } @else if (uploading()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span>Importando...</span>
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              <span>{{ uploadBtnLabel() }}</span>
            }
          </button>
        </div>

        <!-- Results (after real import) -->
        @if (result()) {
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 animate-fade-in">
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">Resultado de la importación</h3>
            @for (entry of resultEntries(); track entry.key) {
              <div class="space-y-2">
                @if (resultEntries().length > 1) {
                  <p class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ sheetLabel(entry.key) }}</p>
                }
                <div class="grid grid-cols-3 gap-3">
                  <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                    <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ entry.val.created }}</p>
                    <p class="text-xs text-green-700 dark:text-green-300 mt-0.5">Importados</p>
                  </div>
                  <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                    <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">{{ entry.val.skipped }}</p>
                    <p class="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Duplicados</p>
                  </div>
                  <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                    <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ entry.val.errors.length }}</p>
                    <p class="text-xs text-red-700 dark:text-red-300 mt-0.5">Errores</p>
                  </div>
                </div>
                @if ((entry.val.duplicates?.length || 0) > 0) {
                  <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                    <p class="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1.5">Omitidos — ya existen en el sistema:</p>
                    <ul class="text-xs text-amber-600 dark:text-amber-400 space-y-0.5 max-h-28 overflow-y-auto">
                      @for (d of entry.val.duplicates; track $index) {
                        <li class="flex gap-1.5"><span class="shrink-0">↩</span><span>{{ d }}</span></li>
                      }
                    </ul>
                  </div>
                }
                @if (entry.val.errors.length > 0) {
                  <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                    <p class="text-xs font-semibold text-red-700 dark:text-red-300 mb-1.5">
                      No importados — corrige estos datos y agrégalos manualmente:
                    </p>
                    <ul class="text-xs text-red-600 dark:text-red-400 space-y-0.5 max-h-36 overflow-y-auto">
                      @for (err of entry.val.errors; track $index) {
                        <li class="flex gap-1.5"><span class="shrink-0 font-bold">✕</span><span>{{ err }}</span></li>
                      }
                    </ul>
                  </div>
                }
              </div>
            }
            @if ($any(result())?.note) {
              <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex gap-2">
                <svg class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-xs text-blue-700 dark:text-blue-300">{{ $any(result()).note }}</p>
              </div>
            }
            <button (click)="result.set(null); selectedFile.set(null)" class="btn btn-secondary text-sm w-full">
              Importar otro archivo
            </button>
          </div>
        }

      }

      <!-- Toast -->
      @if (toast()) {
        <div [ngClass]="toast()!.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
          class="fixed bottom-6 right-6 z-[200] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 max-w-sm animate-fade-in">
          @if (toast()!.type === 'success') {
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          } @else {
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          }
          <span class="text-sm">{{ toast()!.msg }}</span>
        </div>
      }

    </div>

    <!-- ── Modal: Revisión antes de importar ───────────────────────────────── -->
    @if (showPreviewModal()) {
      <div class="modal-overlay" (click)="cancelPreview()">
        <div class="modal-center" (click)="$event.stopPropagation()">
          <div class="modal max-w-xl">

            <!-- Header -->
            <div class="modal-header">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-base font-semibold text-slate-900 dark:text-white">Revisión del archivo antes de importar</h3>
                  <p class="text-sm text-slate-500 dark:text-slate-400">
                    El sistema analizó {{ (previewValid() + previewSkipped() + previewErrors().length) }} filas de datos
                  </p>
                </div>
              </div>
            </div>

            <!-- Body -->
            <div class="modal-body space-y-3">

              <!-- Resumen visual -->
              <div class="grid grid-cols-3 gap-2">
                <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
                  <div class="flex items-center justify-center gap-1 mb-1">
                    <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ previewValid() }}</p>
                  <p class="text-xs text-green-700 dark:text-green-300 mt-0.5 font-medium">Listos para importar</p>
                </div>
                <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
                  <div class="flex items-center justify-center gap-1 mb-1">
                    <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">{{ previewSkipped() }}</p>
                  <p class="text-xs text-amber-700 dark:text-amber-300 mt-0.5 font-medium">Duplicados (ya existen)</p>
                </div>
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
                  <div class="flex items-center justify-center gap-1 mb-1">
                    <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.96L13.75 4a2 2 0 00-3.5 0L3.25 16.04A2 2 0 005.07 19z"/>
                    </svg>
                  </div>
                  <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ previewErrors().length }}</p>
                  <p class="text-xs text-red-700 dark:text-red-300 mt-0.5 font-medium">Con errores</p>
                </div>
              </div>

              <!-- Sección Duplicados -->
              @if (previewDuplicates().length > 0) {
                <div class="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                  <div class="bg-amber-50 dark:bg-amber-900/20 px-3 py-2 flex items-center gap-2">
                    <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    <p class="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      Registros duplicados — ya existen en el sistema y se omitirán
                    </p>
                  </div>
                  <ul class="divide-y divide-amber-100 dark:divide-amber-900/30 max-h-28 overflow-y-auto">
                    @for (dup of previewDuplicates(); track $index) {
                      <li class="px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
                        <span class="shrink-0">↩</span><span>{{ dup }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }

              <!-- Sección Errores -->
              @if (previewErrors().length > 0) {
                <div class="rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
                  <div class="bg-red-50 dark:bg-red-900/20 px-3 py-2 flex items-center gap-2">
                    <svg class="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.96L13.75 4a2 2 0 00-3.5 0L3.25 16.04A2 2 0 005.07 19z"/>
                    </svg>
                    <p class="text-xs font-semibold text-red-800 dark:text-red-300">
                      Errores de validación — estas filas no se importarán
                    </p>
                  </div>
                  <ul class="divide-y divide-red-100 dark:divide-red-900/30 max-h-36 overflow-y-auto">
                    @for (err of previewErrors(); track $index) {
                      <li class="px-3 py-1.5 text-xs text-red-700 dark:text-red-400 flex gap-2">
                        <span class="shrink-0 font-bold">✕</span><span>{{ err }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }

              <!-- Decisión -->
              <div class="bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 rounded-xl p-3 space-y-2">
                <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">¿Qué deseas hacer?</p>
                <div class="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  @if (previewValid() > 0) {
                    <div class="flex gap-2 items-start">
                      <span class="w-5 h-5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]">A</span>
                      <p>
                        <strong class="text-slate-800 dark:text-slate-200">Importar los {{ previewValid() }} registros válidos ahora</strong>
                        y corregir los errores después directamente desde la aplicación.
                      </p>
                    </div>
                  }
                  <div class="flex gap-2 items-start">
                    <span class="w-5 h-5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]">B</span>
                    <p>
                      <strong class="text-slate-800 dark:text-slate-200">Cancelar y corregir el Excel</strong>
                      — revisa las filas indicadas, corrígelas y vuelve a subir el archivo.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            <!-- Footer -->
            <div class="modal-footer">
              <button (click)="cancelPreview()" class="btn btn-secondary">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Cancelar y revisar Excel
              </button>
              @if (previewValid() > 0) {
                <button (click)="confirmImport()" [disabled]="uploading()" class="btn btn-primary flex items-center gap-2">
                  @if (uploading()) {
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Importando...
                  } @else {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                    </svg>
                    Importar {{ previewValid() }} válido(s) y continuar
                  }
                </button>
              }
            </div>

          </div>
        </div>
      </div>
    }
  `,
})
export class ImportComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');

  loadingPlan = signal(true);
  currentSub = signal<any>(null);
  tenants = signal<any[]>([]);
  branches = signal<any[]>([]);
  selectedTenantId = '';
  selectedBranchId = '';
  readonly tabsNeedBranch: TabKey[] = ['patients', 'inventory', 'doctors', 'all'];
  needsBranch = computed(() => this.tabsNeedBranch.includes(this.activeTab()));
  // Tabs where "all branches" makes sense for patients/doctors
  readonly tabsAllowAllBranches: TabKey[] = ['patients', 'doctors', 'all'];
  allowAllBranches = computed(() => this.tabsAllowAllBranches.includes(this.activeTab()));
  selectedBranchMode: 'specific' | 'all' = 'specific';

  canAccess = computed(() => this.isSuperAdmin() || !!this.currentSub()?.plan?.hasDataImport);
  currentPlanName = computed(() => this.currentSub()?.plan?.name || 'Plan Básico');

  activeTab = signal<TabKey>('patients');
  selectedFile = signal<File | null>(null);
  validating = signal(false);
  uploading = signal(false);
  downloadingTemplate = signal(false);
  dragOver = signal(false);
  result = signal<SheetResult | ImportResult | null>(null);
  toast = signal<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Preview modal
  showPreviewModal = signal(false);
  previewResult = signal<SheetResult | ImportResult | null>(null);

  previewValid = computed(() => {
    const r = this.previewResult();
    if (!r) return 0;
    if ('created' in r) return (r as ImportResult).created;
    return Object.values(r as SheetResult).reduce((s, v) => s + (v?.created ?? 0), 0);
  });

  previewDuplicates = computed((): string[] => {
    const r = this.previewResult();
    if (!r) return [];
    if ('duplicates' in r) return (r as ImportResult).duplicates ?? [];
    return Object.values(r as SheetResult).flatMap(v => v?.duplicates ?? []);
  });

  previewErrors = computed((): string[] => {
    const r = this.previewResult();
    if (!r) return [];
    if ('errors' in r) return (r as ImportResult).errors;
    return Object.values(r as SheetResult).flatMap(v => v?.errors ?? []);
  });

  previewSkipped = computed(() => this.previewDuplicates().length);

  private readonly tabDownloadLabels: Record<string, string> = {
    patients: 'Plantilla Pacientes', doctors: 'Plantilla Doctores',
    treatments: 'Plantilla Tratamientos', inventory: 'Plantilla Inventario',
    all: 'Plantilla Completa',
  };
  downloadBtnLabel = computed(() =>
    this.downloadingTemplate() ? 'Descargando...' : `Descargar ${this.tabDownloadLabels[this.activeTab()] || 'Plantilla'}`
  );

  uploadBtnLabel = computed(() => {
    if (!this.selectedFile()) return 'Selecciona un archivo primero';
    if (this.isSuperAdmin() && !this.selectedTenantId) return 'Selecciona un cliente primero';
    return `Validar e Importar ${this.activeTabInfo().label}`;
  });

  premiumFeatures = [
    'Importación masiva de pacientes desde Excel',
    'Importación de tratamientos y precios',
    'Importación de inventario con stock inicial',
    'Detección automática de duplicados',
    'Reporte detallado de errores por fila',
  ];

  tabs = [
    { key: 'patients' as TabKey, label: 'Pacientes' },
    { key: 'doctors' as TabKey, label: 'Doctores' },
    { key: 'treatments' as TabKey, label: 'Tratamientos' },
    { key: 'inventory' as TabKey, label: 'Inventario' },
    { key: 'all' as TabKey, label: 'Todo' },
  ];

  private readonly tabMeta: Record<TabKey, { title: string; label: string; desc: string; icon: string; color: string }> = {
    doctors: {
      title: 'Importar Doctores', label: 'Doctores',
      desc: 'Sube la hoja "Doctores" con los datos del equipo médico',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      color: 'bg-rose-100 text-rose-600',
    },
    patients: {
      title: 'Importar Pacientes', label: 'Pacientes',
      desc: 'Sube la hoja "Pacientes" con los datos de tus pacientes',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      color: 'bg-blue-100 text-blue-600',
    },
    treatments: {
      title: 'Importar Tratamientos', label: 'Tratamientos',
      desc: 'Sube la hoja "Tratamientos" con los tratamientos y precios',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'bg-purple-100 text-purple-600',
    },
    inventory: {
      title: 'Importar Inventario', label: 'Inventario',
      desc: 'Sube la hoja "Inventario" con tus productos e insumos',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      color: 'bg-green-100 text-green-600',
    },
    all: {
      title: 'Importar Todo', label: 'Todo el archivo',
      desc: 'Importa pacientes, tratamientos e inventario en una sola operación',
      icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
      color: 'bg-primary-100 text-primary-600',
    },
  };

  activeTabInfo = computed(() => this.tabMeta[this.activeTab()]);

  resultEntries = computed(() => {
    const r = this.result();
    if (!r) return [];
    if ('created' in r) return [{ key: this.activeTab() as string, val: r as ImportResult }];
    return Object.entries(r as SheetResult).map(([key, val]) => ({ key, val: val as ImportResult }));
  });

  ngOnInit() {
    if (this.isSuperAdmin()) {
      this.api.get<any>('/tenants').subscribe({
        next: (res: any) => {
          this.tenants.set(res?.data || res || []);
          this.loadingPlan.set(false);
          this.cdr.markForCheck();
        },
        error: () => { this.loadingPlan.set(false); this.cdr.markForCheck(); },
      });
    } else {
      this.api.get<any>('/plans/my-plan').subscribe({
        next: (sub) => {
          this.currentSub.set(sub);
          this.loadingPlan.set(false);
          this.loadBranches();
          this.cdr.markForCheck();
        },
        error: () => { this.loadingPlan.set(false); this.cdr.markForCheck(); },
      });
    }
  }

  onTenantChange(tenantId: string) {
    this.selectedBranchId = '';
    this.branches.set([]);
    if (tenantId) this.loadBranches(tenantId);
  }

  loadBranches(tenantId?: string) {
    const params: any = {};
    if (tenantId) params.tenantId = tenantId;
    this.api.get<any>('/branches', params).subscribe({
      next: (res: any) => {
        const list: any[] = res?.data || res || [];
        this.branches.set(list);
        if (list.length === 1) this.selectedBranchId = list[0].id;
        else if (!this.selectedBranchId) {
          const main = list.find((b: any) => b.isMain);
          if (main) this.selectedBranchId = main.id;
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  sheetLabel(key: string): string {
    const map: Record<string, string> = { patients: 'Pacientes', doctors: 'Doctores', treatments: 'Tratamientos', inventory: 'Inventario' };
    return map[key] ?? key;
  }

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragOver.set(true); }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) { this.showToast('error', 'Solo se aceptan archivos .xlsx o .xls'); return; }
    this.selectedFile.set(file);
    this.result.set(null);
    this.previewResult.set(null);
  }

  clearFile(e?: Event) { e?.stopPropagation(); this.selectedFile.set(null); }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  private tenantParam(): string {
    const parts: string[] = [];
    if (this.isSuperAdmin() && this.selectedTenantId) parts.push(`tenantId=${this.selectedTenantId}`);
    if (this.needsBranch()) {
      if (this.allowAllBranches() && this.selectedBranchMode === 'all') {
        parts.push('branchId=all');
      } else if (this.selectedBranchId) {
        parts.push(`branchId=${this.selectedBranchId}`);
      }
    }
    return parts.length ? `?${parts.join('&')}` : '';
  }

  downloadTemplate() {
    this.downloadingTemplate.set(true);
    const sheet = this.activeTab();
    const base = this.tenantParam();
    const sep = base ? `${base}&sheet=${sheet}` : `?sheet=${sheet}`;
    this.api.downloadWithName(`/import/template${sep}`).subscribe({
      next: ({ blob, filename }: DownloadResult) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        this.downloadingTemplate.set(false);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.downloadingTemplate.set(false);
        this.showToast('error', err?.error?.message || 'Error al descargar la plantilla');
        this.cdr.markForCheck();
      },
    });
  }

  /** Step 1: dry-run validation */
  upload() {
    const file = this.selectedFile();
    if (!file) return;
    if (this.isSuperAdmin() && !this.selectedTenantId) { this.showToast('error', 'Selecciona un cliente primero'); return; }

    this.validating.set(true);
    this.result.set(null);
    this.previewResult.set(null);

    const fd = new FormData();
    fd.append('file', file);

    const base = this.tenantParam();
    const sep = base ? `${base}&dryRun=true` : `?dryRun=true`;

    this.api.upload<any>(`/import/${this.activeTab()}${sep}`, fd).subscribe({
      next: (res) => {
        this.validating.set(false);
        const errors: string[] = 'errors' in res
          ? (res as ImportResult).errors
          : Object.values(res as SheetResult).flatMap(v => v?.errors ?? []);
        const duplicates: string[] = 'duplicates' in res
          ? ((res as ImportResult).duplicates ?? [])
          : Object.values(res as SheetResult).flatMap(v => v?.duplicates ?? []);

        if (errors.length > 0 || duplicates.length > 0) {
          // Show confirmation modal
          this.previewResult.set(res);
          this.showPreviewModal.set(true);
        } else {
          // No errors: import directly without bothering user
          this.doImport();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.validating.set(false);
        this.showToast('error', err?.error?.message || 'Error al validar el archivo');
        this.cdr.markForCheck();
      },
    });
  }

  cancelPreview() {
    this.showPreviewModal.set(false);
    this.previewResult.set(null);
  }

  /** Step 2: confirmed by user — real import */
  confirmImport() {
    this.showPreviewModal.set(false);
    this.doImport();
  }

  private doImport() {
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);
    const fd = new FormData();
    fd.append('file', file);

    this.api.upload<any>(`/import/${this.activeTab()}${this.tenantParam()}`, fd).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.result.set(res);
        this.selectedFile.set(null); // clear file after import
        const total = 'created' in res
          ? (res as any).created
          : Object.values(res).reduce((s: number, r: any) => s + (r?.created ?? 0), 0);
        // Show note (e.g. temp password for doctors)
        const note = 'note' in res ? (res as any).note : null;
        this.showToast('success', note || `¡Importación completada! ${total} registro(s) creados`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uploading.set(false);
        this.showToast('error', err?.error?.message || 'Error al importar el archivo');
        this.cdr.markForCheck();
      },
    });
  }

  private showToast(type: 'success' | 'error', msg: string) {
    this.toast.set({ type, msg });
    setTimeout(() => { this.toast.set(null); this.cdr.markForCheck(); }, 4500);
  }
}
