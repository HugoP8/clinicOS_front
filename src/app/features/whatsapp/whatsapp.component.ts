import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { WhatsappSession } from '../../core/models';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ── Toast ───────────────────────────────────────────────── -->
    @if (toast()) {
      <div class="fixed top-20 right-5 z-[9999] max-w-sm w-full animate-slide-up pointer-events-auto"
        [ngClass]="{
          'border-l-4 border-emerald-500': toast()!.type === 'success',
          'border-l-4 border-red-500': toast()!.type === 'error',
          'border-l-4 border-blue-500': toast()!.type === 'info'
        }">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 flex items-start gap-3">
          <div class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            [ngClass]="{
              'bg-emerald-100 dark:bg-emerald-900/30': toast()!.type === 'success',
              'bg-red-100 dark:bg-red-900/30': toast()!.type === 'error',
              'bg-blue-100 dark:bg-blue-900/30': toast()!.type === 'info'
            }">
            @if (toast()!.type === 'success') {
              <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            } @else if (toast()!.type === 'error') {
              <svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            } @else {
              <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            }
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ toast()!.title }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ toast()!.text }}</p>
          </div>
          <button (click)="toast.set(null)" class="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    }

    <div class="space-y-5 animate-slide-up">

      <!-- SUPER_ADMIN filter bar -->
      @if (isSuperAdmin()) {
        <div class="card p-3 flex flex-wrap items-center gap-3">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tenant:</span>
          <select class="input input-sm w-52" [value]="filterTenantId()" (change)="onTenantFilterChange($any($event.target).value)">
            <option value="">Todos los tenants</option>
            @for (t of tenants(); track t.id) {
              <option [value]="t.id">{{ t.name }}</option>
            }
          </select>
          @if (!filterTenantId()) {
            <span class="text-xs text-amber-500 italic">Selecciona un tenant para gestionar su sesión</span>
          }
        </div>
      }

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">WhatsApp</h1>
          <p class="page-subtitle">Mensajería automática y campañas</p>
        </div>
        <!-- Connection status pill -->
        @if (session()) {
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300"
            [ngClass]="{
              'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400': session()!.status === 'CONNECTED',
              'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400': session()!.status === 'QR_PENDING' || session()!.status === 'RECONNECTING' || isInitializing(),
              'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400': session()!.status === 'DISCONNECTED',
              'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400': session()!.status === 'BANNED'
            }">
            <span class="w-2 h-2 rounded-full shrink-0"
              [ngClass]="{
                'bg-emerald-500 animate-pulse': session()!.status === 'CONNECTED',
                'bg-amber-500 animate-pulse': session()!.status === 'QR_PENDING' || session()!.status === 'RECONNECTING' || isInitializing(),
                'bg-slate-400': session()!.status === 'DISCONNECTED',
                'bg-red-500': session()!.status === 'BANNED'
              }">
            </span>
            {{ statusLabel() }}
          </div>
        }
      </div>

      <!-- Top 3-col grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- ── Session Card ───────────────────────────────────── -->
        <div class="card p-6 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Conexión</h3>
            <div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
            </div>
          </div>

          @if (session()) {
            <!-- Status -->
            <div class="flex items-center gap-3">
              <div class="relative shrink-0">
                <div class="w-12 h-12 rounded-full flex items-center justify-center"
                  [ngClass]="{
                    'bg-emerald-100 dark:bg-emerald-900/30': session()!.status === 'CONNECTED',
                    'bg-amber-100 dark:bg-amber-900/30': session()!.status === 'QR_PENDING' || isInitializing(),
                    'bg-blue-100 dark:bg-blue-900/30': session()!.status === 'RECONNECTING',
                    'bg-slate-100 dark:bg-slate-700': session()!.status === 'DISCONNECTED',
                    'bg-red-100 dark:bg-red-900/30': session()!.status === 'BANNED'
                  }">
                  <div class="w-4 h-4 rounded-full"
                    [ngClass]="{
                      'bg-emerald-500': session()!.status === 'CONNECTED',
                      'bg-amber-500': session()!.status === 'QR_PENDING' || isInitializing(),
                      'bg-blue-500': session()!.status === 'RECONNECTING',
                      'bg-slate-400': session()!.status === 'DISCONNECTED',
                      'bg-red-500': session()!.status === 'BANNED'
                    }">
                  </div>
                </div>
                @if (session()!.status === 'CONNECTED') {
                  <span class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                }
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ statusLabel() }}</p>
                @if (session()!.status === 'CONNECTED' && session()!.phoneNumber) {
                  <p class="text-xs text-slate-500 dark:text-slate-400">+{{ session()!.phoneNumber }}</p>
                } @else if (session()!.status === 'CONNECTED') {
                  <p class="text-xs text-emerald-600 dark:text-emerald-400">Listo para enviar</p>
                }
              </div>
            </div>

            <!-- Initializing -->
            @if (isInitializing()) {
              <div class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3.5">
                <div class="flex items-center gap-2.5">
                  <svg class="w-4 h-4 text-blue-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <div>
                    <p class="text-xs font-semibold text-blue-700 dark:text-blue-300">{{ initMessage() }}</p>
                    <p class="text-xs text-blue-400 mt-0.5">El QR puede tardar 30-60 seg.</p>
                  </div>
                </div>
              </div>
            }

            <!-- Error -->
            @if (errorMessage()) {
              <div class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-xs text-red-600 dark:text-red-400">
                {{ errorMessage() }}
              </div>
            }

            <!-- QR Code -->
            @if (session()!.status === 'QR_PENDING' && session()!.qrCode) {
              <div class="text-center">
                <p class="text-xs text-slate-500 mb-2">Escanea con tu celular</p>
                <div class="relative inline-block">
                  <img [src]="session()!.qrCode" alt="QR Code" class="w-44 h-44 mx-auto rounded-2xl border-4 border-white dark:border-slate-700 shadow-xl">
                </div>
                <p class="text-xs text-amber-500 mt-2 flex items-center justify-center gap-1">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Actualizando en {{ countdown() }}s
                </p>
              </div>
            }

            <!-- QR pending, no QR yet -->
            @if (session()!.status === 'QR_PENDING' && !session()!.qrCode) {
              <div class="flex flex-col items-center py-6 gap-2">
                <svg class="w-8 h-8 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p class="text-xs text-slate-500">Generando código QR...</p>
              </div>
            }

            <!-- Reconnecting -->
            @if (session()!.status === 'RECONNECTING') {
              <div class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3.5">
                <p class="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Restaurando sesión guardada</p>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-500 rounded-full animate-pulse" style="width:65%"></div>
                  </div>
                  <span class="text-xs text-blue-400 tabular-nums">{{ countdown() }}s</span>
                </div>
                <p class="text-xs text-blue-400 mt-1.5">No necesitas escanear un QR.</p>
              </div>
            }

            <!-- Connected info -->
            @if (session()!.status === 'CONNECTED') {
              <div class="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-2">
                <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Activo y listo para enviar</p>
              </div>
            }

            <!-- Buttons -->
            <div class="flex flex-col gap-2 mt-auto">
              @if ((session()!.status === 'DISCONNECTED' || session()!.status === 'BANNED') && !isInitializing()) {
                <button (click)="connect()" class="btn-primary w-full flex items-center justify-center gap-2" [disabled]="connecting()">
                  @if (connecting()) {
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  } @else {
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a8.69 8.69 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    </svg>
                  }
                  {{ connecting() ? 'Iniciando...' : 'Conectar WhatsApp' }}
                </button>
              }
              @if (isInitializing()) {
                <button disabled class="btn-secondary w-full opacity-60 cursor-not-allowed flex items-center justify-center gap-2">
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Iniciando sesión...
                </button>
              }
              @if (session()!.status === 'RECONNECTING' && !isInitializing()) {
                <button disabled class="btn-secondary w-full opacity-50 cursor-not-allowed flex items-center justify-center gap-2">
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Reconectando...
                </button>
                <button (click)="connect()" [disabled]="connecting()"
                  class="text-xs py-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-center disabled:opacity-40">
                  {{ connecting() ? 'Iniciando...' : '↻ Conectar manualmente' }}
                </button>
              }
              @if (session()!.status === 'CONNECTED') {
                <button (click)="disconnect()" class="btn-danger w-full">Desconectar</button>
              }
              @if (session()!.status === 'QR_PENDING') {
                <button (click)="connect()" class="btn-secondary w-full text-xs">Regenerar QR</button>
              }
            </div>
          } @else {
            <div class="space-y-3 animate-pulse">
              <div class="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl"></div>
              <div class="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl"></div>
              <div class="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl"></div>
            </div>
          }
        </div>

        <!-- ── Stats Card ─────────────────────────────────────── -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Estadísticas</h3>
            @if ((stats()?.failed ?? 0) > 0) {
              <button class="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors"
                [disabled]="retrying()" (click)="retryFailed()">
                @if (retrying()) {
                  <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                } @else {
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                }
                Reintentar fallidos
              </button>
            }
          </div>
          @if (stats()) {
            <div class="grid grid-cols-3 gap-3">
              @for (item of statsItems(); track item.label) {
                <div class="flex flex-col items-center gap-2 p-3 rounded-xl"
                  [ngClass]="{
                    'bg-blue-50 dark:bg-blue-900/20': item.color === 'blue',
                    'bg-red-50 dark:bg-red-900/20': item.color === 'red',
                    'bg-amber-50 dark:bg-amber-900/20': item.color === 'amber'
                  }">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center"
                    [ngClass]="{
                      'bg-blue-100 dark:bg-blue-800': item.color === 'blue',
                      'bg-red-100 dark:bg-red-800': item.color === 'red',
                      'bg-amber-100 dark:bg-amber-800': item.color === 'amber'
                    }">
                    <svg class="w-4 h-4" [ngClass]="{
                      'text-blue-600 dark:text-blue-300': item.color === 'blue',
                      'text-red-600 dark:text-red-300': item.color === 'red',
                      'text-amber-600 dark:text-amber-300': item.color === 'amber'
                    }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      @if (item.color === 'blue') {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      } @else if (item.color === 'red') {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      } @else {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      }
                    </svg>
                  </div>
                  <span class="text-2xl font-bold"
                    [ngClass]="{
                      'text-blue-700 dark:text-blue-300': item.color === 'blue',
                      'text-red-700 dark:text-red-300': item.color === 'red',
                      'text-amber-700 dark:text-amber-300': item.color === 'amber'
                    }">{{ item.value }}</span>
                  <span class="text-xs text-center leading-tight"
                    [ngClass]="{
                      'text-blue-600 dark:text-blue-400': item.color === 'blue',
                      'text-red-600 dark:text-red-400': item.color === 'red',
                      'text-amber-600 dark:text-amber-400': item.color === 'amber'
                    }">{{ item.label }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="grid grid-cols-3 gap-3">
              @for (i of [1,2,3]; track i) {
                <div class="h-24 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse"></div>
              }
            </div>
          }
        </div>

        <!-- ── Quick Send ────────────────────────────────────── -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Envío Rápido</h3>
            <div class="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
              <svg class="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </div>
          </div>
          @if (session()?.status !== 'CONNECTED') {
            <div class="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div class="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400">Conecta WhatsApp primero</p>
            </div>
          } @else {
            <div class="space-y-3">
              <div class="relative">
                <label class="label">Buscar paciente</label>
                <div class="relative">
                  <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input [(ngModel)]="patientSearch" (input)="searchPatients()" class="input pl-9" placeholder="Nombre...">
                </div>
                @if (patientResults().length > 0) {
                  <div class="absolute z-20 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto">
                    @for (p of patientResults(); track p.id) {
                      <button (click)="selectPatient(p)" class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors">
                        <span class="font-medium text-slate-900 dark:text-white">{{ p.firstName }} {{ p.lastName }}</span>
                        <span class="text-slate-400 text-xs ml-2">{{ p.phone }}</span>
                      </button>
                    }
                  </div>
                }
              </div>
              <div>
                <label class="label">Teléfono</label>
                <div class="flex gap-2">
                  <select [(ngModel)]="quickSend.countryCode" class="input w-28 shrink-0">
                    @for (c of countryCodes; track c.code) {
                      <option [value]="c.code">{{ c.flag }} {{ c.code }}</option>
                    }
                  </select>
                  <input [(ngModel)]="quickSend.phone" class="input flex-1" placeholder="7XX XXX XXX">
                </div>
              </div>
              <div>
                <label class="label">Mensaje</label>
                <textarea [(ngModel)]="quickSend.message" class="input resize-none" rows="3" placeholder="Escribe tu mensaje..."></textarea>
              </div>
              <button (click)="sendQuick()" class="btn-primary w-full flex items-center justify-center gap-2"
                [disabled]="sending() || !quickSend.phone || !quickSend.message">
                @if (sending()) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                }
                {{ sending() ? 'Enviando...' : 'Enviar' }}
              </button>
            </div>
          }
        </div>
      </div>

      <!-- ── Automatizaciones ─────────────────────────────────── -->
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Automatizaciones</h3>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full shrink-0"
              [ngClass]="session()?.status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'">
            </span>
            <span class="text-xs font-medium"
              [ngClass]="session()?.status === 'CONNECTED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'">
              {{ session()?.status === 'CONNECTED' ? 'Activas' : 'Inactivas' }}
            </span>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (auto of automations; track auto.key) {
            <div class="rounded-xl p-4 border transition-all duration-200"
              [ngClass]="session()?.status === 'CONNECTED' ? auto.activeCls : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 opacity-55'">
              <div class="flex items-start justify-between mb-2.5">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  [ngClass]="session()?.status === 'CONNECTED' ? auto.iconBg : 'bg-slate-200 dark:bg-slate-600'">
                  <span class="text-base">{{ auto.icon }}</span>
                </div>
                <span class="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                  [ngClass]="auto.plan === 'Básico' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' : 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300'">
                  {{ auto.plan }}
                </span>
              </div>
              <p class="text-xs font-bold uppercase tracking-wide mb-1"
                [ngClass]="session()?.status === 'CONNECTED' ? auto.titleCls : 'text-slate-400'">
                {{ auto.title }}
              </p>
              <p class="text-xs font-medium text-slate-600 dark:text-slate-400">{{ auto.schedule }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-500 mt-1 leading-relaxed">{{ auto.description }}</p>
              @if (auto.key === 'promotions') {
                <button (click)="openPromoModal()"
                  class="mt-3 w-full text-xs font-semibold py-1.5 rounded-lg border transition-all
                    border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300
                    hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                  ＋ Crear / Gestionar
                </button>
              }
            </div>
          }
        </div>
        <div class="mt-3 flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
          <svg class="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <p class="text-xs text-slate-500 leading-relaxed">
            <span class="font-semibold text-slate-600 dark:text-slate-400">Anti-duplicados activo</span> — Los recordatorios no se reenvían. Solo pacientes con número WhatsApp y consentimiento activado.
          </p>
        </div>
      </div>

      <!-- ── Campaña WhatsApp ─────────────────────────────────── -->
      <div class="card p-6 space-y-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              Campaña WhatsApp
              <span class="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded-md font-semibold">Premium</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Envía un mensaje personalizado a múltiples pacientes</p>
          </div>
          @if (session()?.status !== 'CONNECTED') {
            <span class="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-lg">
              Conecta primero
            </span>
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <!-- Left: message + image -->
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="label mb-0">Mensaje</label>
                <span class="text-xs text-slate-400">{{ campaignMsg.length }}/1000</span>
              </div>
              <textarea [(ngModel)]="campaignMsg" rows="4" maxlength="1000"
                [placeholder]="campaignMsgPlaceholder"
                class="input w-full resize-none text-sm">
              </textarea>
              <p class="text-xs text-slate-400 mt-1.5">Variables: <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">{{ '{nombre}' }}</code> <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">{{ '{apellido}' }}</code> <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">{{ '{nombre_completo}' }}</code></p>
            </div>

            <!-- Imagen -->
            <div>
              <label class="label">Imagen adjunta <span class="font-normal text-slate-400">(opcional, máx 5 MB)</span></label>
              @if (campaignImage()) {
                <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <img [src]="campaignImage()!.previewUrl" alt="Preview" class="w-14 h-14 object-cover rounded-lg shrink-0 border border-slate-200 dark:border-slate-600">
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Imagen seleccionada</p>
                    <p class="text-xs text-slate-400 mt-0.5">Se enviará con el mensaje</p>
                  </div>
                  <button type="button" (click)="campaignImage.set(null)"
                    class="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              } @else {
                <label class="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-all duration-200 group">
                  <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center transition-colors shrink-0">
                    <svg class="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary-600 transition-colors">Agregar imagen</p>
                    <p class="text-xs text-slate-400">JPG, PNG, GIF, WEBP — máx 5 MB</p>
                  </div>
                  <input type="file" accept="image/*" class="hidden" (change)="onCampaignImageSelect($event)">
                </label>
              }
            </div>
          </div>

          <!-- Right: recipients -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="label mb-0">Destinatarios</label>
              <div class="flex items-center gap-2">
                @if (campaignSelected().length > 0) {
                  <span class="text-xs font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                    {{ campaignSelected().length }} seleccionados
                  </span>
                }
                <button (click)="campaignSelectAll()" class="text-xs text-primary-600 dark:text-primary-400 hover:underline transition-colors">
                  {{ campaignAllSelected() ? 'Deseleccionar todos' : 'Seleccionar todos' }}
                </button>
              </div>
            </div>
            <div class="relative">
              <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" [(ngModel)]="campaignSearch" (ngModelChange)="onCampaignSearch($event)"
                placeholder="Buscar paciente..." class="input pl-9 text-sm w-full">
            </div>
            <div class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div class="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                @if (loadingContacts()) {
                  <div class="flex items-center justify-center py-6">
                    <svg class="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                } @else if (campaignContacts().length === 0) {
                  <div class="py-8 text-center text-xs text-slate-400">
                    @if (campaignSearch) { No se encontraron pacientes }
                    @else { No hay pacientes con consentimiento WhatsApp }
                  </div>
                } @else {
                  @for (p of campaignContacts(); track p.id) {
                    <label class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      [ngClass]="isSelected(p.id) ? 'bg-primary-50/60 dark:bg-primary-900/10' : ''">
                      <input type="checkbox" [checked]="isSelected(p.id)" (change)="toggleContact(p.id)"
                        class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 shrink-0">
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-slate-900 dark:text-white truncate">{{ p.firstName }} {{ p.lastName }}</p>
                        <p class="text-xs text-slate-500 truncate">{{ p.whatsapp }}</p>
                      </div>
                    </label>
                  }
                }
              </div>
              @if (campaignContactsTotal() > campaignContacts().length) {
                <div class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 text-center">
                  Mostrando {{ campaignContacts().length }} de {{ campaignContactsTotal() }}
                </div>
              }
            </div>

            <!-- Send button -->
            <button (click)="sendCampaign()"
              [disabled]="campaignSelected().length === 0 || !campaignMsg.trim() || sendingCampaign() || session()?.status !== 'CONNECTED'"
              class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              [ngClass]="campaignSelected().length > 0 && campaignMsg.trim() && session()?.status === 'CONNECTED' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-[0.98]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'">
              @if (sendingCampaign()) {
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Enviando campaña...
              } @else {
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a8.69 8.69 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                </svg>
                Enviar a {{ campaignSelected().length || '...' }} paciente(s)
              }
            </button>
          </div>
        </div>
      </div>

      <!-- ── Fechas Especiales Bolivia ─────────────────────────── -->
      <div class="card p-6 space-y-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              🇧🇴 Fechas Especiales Bolivia
              <span class="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded-md font-semibold">Premium</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mensajes automáticos de felicitación o promoción en fechas clave. Se envían a las 8:00 AM del día configurado.</p>
          </div>
          <button (click)="openPromoModal()" class="btn-primary text-xs px-3 py-2 flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Nueva Fecha
          </button>
        </div>

        <!-- Lista de promociones -->
        @if (promotions().length === 0) {
          <div class="flex flex-col items-center justify-center py-10 gap-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <span class="text-4xl">📅</span>
            <p class="text-sm font-medium text-slate-500">No hay fechas especiales configuradas</p>
            <p class="text-xs text-slate-400">Crea la primera para comenzar a fidelizar tus pacientes</p>
            <button (click)="openPromoModal()" class="btn-outline text-xs mt-1">+ Crear primera fecha</button>
          </div>
        } @else {
          <div class="space-y-3">
            @for (promo of promotions(); track promo.id) {
              <div class="group flex items-start gap-4 p-4 rounded-xl border transition-all"
                [ngClass]="promo.isActive
                  ? (promo.isPromotion ? 'border-violet-200 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-900/10' : 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10')
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 opacity-60'">

                <!-- Icono fecha -->
                <div class="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-white font-bold text-xs leading-tight"
                  [ngClass]="promo.isPromotion ? 'bg-violet-500' : 'bg-emerald-500'">
                  <span class="text-lg leading-none">{{ promoMonthIcon(promo.month) }}</span>
                  <span class="text-[10px] mt-0.5 opacity-90">{{ monthNames[promo.month - 1] }}</span>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-sm text-slate-900 dark:text-white">{{ promo.name }}</span>
                    @if (promo.isPromotion) {
                      <span class="text-[10px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded-full">PROMOCIÓN</span>
                    } @else {
                      <span class="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">FELICITACIÓN</span>
                    }
                    @if (promo.genderFilter !== 'ALL') {
                      <span class="text-[10px] font-bold bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 px-1.5 py-0.5 rounded-full">
                        {{ promo.genderFilter === 'FEMALE' ? '♀ Solo mujeres' : '♂ Solo hombres' }}
                      </span>
                    }
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    📅 {{ promo.dayOfMonth }} de {{ monthNames[promo.month - 1] }}
                    @if (promo.sendDaysBefore > 0) { <span class="ml-1 text-amber-600 dark:text-amber-400">· Envío {{ promo.sendDaysBefore }} día{{ promo.sendDaysBefore > 1 ? 's' : '' }} antes</span> }
                  </p>
                  <p class="text-xs text-slate-400 dark:text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-mono">{{ promo.message }}</p>
                  @if (promo.sentCount > 0) {
                    <p class="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Enviada {{ promo.sentCount }} vez{{ promo.sentCount !== 1 ? 'ces' : '' }}
                      @if (promo.lastSentAt) { · Última vez: {{ promo.lastSentAt | date:'d MMM yyyy' }} }
                    </p>
                  }
                </div>

                <!-- Acciones -->
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button (click)="togglePromo(promo)"
                    class="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                    [ngClass]="promo.isActive
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'">
                    {{ promo.isActive ? 'Pausar' : 'Activar' }}
                  </button>
                  <button (click)="openPromoModal(promo)"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button (click)="deletePromo(promo)"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Nota sobre variables -->
        <div class="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
          <svg class="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-xs text-slate-500 leading-relaxed">
            <span class="font-semibold text-slate-600 dark:text-slate-400">Variables disponibles en el mensaje:</span>
            <code class="mx-1 bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">{{ '{nombre}' }}</code>
            <code class="mx-1 bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">{{ '{apellido}' }}</code>
            <code class="mx-1 bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">{{ '{clinica}' }}</code>
            · Solo pacientes con WhatsApp activo y consentimiento habilitado recibirán el mensaje.
          </p>
        </div>
      </div>

      <!-- MODAL: Crear / Editar Promoción -->
      @if (showPromoModal()) {
        <div class="modal-overlay" (click)="closePromoModal()">
          <div class="modal-center">
            <div class="modal modal-lg animate-slide-up" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <div>
                  <h2 class="modal-title">{{ editingPromo() ? 'Editar' : 'Nueva' }} Fecha Especial</h2>
                  <p class="text-xs text-slate-400 mt-0.5">Configura el mensaje automático para esta fecha</p>
                </div>
                <button (click)="closePromoModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="modal-body space-y-4">

                <!-- Nombre y tipo -->
                <div class="grid grid-cols-2 gap-4">
                  <div class="col-span-2">
                    <label class="label">Nombre de la fecha *</label>
                    <input [(ngModel)]="promoForm.name" class="input" placeholder="Ej: Día de la Madre, Año Nuevo...">
                  </div>
                </div>

                <!-- Fecha -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="label">Día *</label>
                    <select [(ngModel)]="promoForm.dayOfMonth" class="input">
                      @for (d of days; track d) {
                        <option [value]="d">{{ d }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="label">Mes *</label>
                    <select [(ngModel)]="promoForm.month" class="input">
                      @for (m of monthNames; track $index) {
                        <option [value]="$index + 1">{{ m }}</option>
                      }
                    </select>
                  </div>
                </div>

                <!-- Envío anticipado -->
                <div>
                  <label class="label">¿Cuándo enviar?</label>
                  <select [(ngModel)]="promoForm.sendDaysBefore" class="input">
                    <option [value]="0">El mismo día (a las 8:00 AM)</option>
                    <option [value]="1">1 día antes</option>
                    <option [value]="2">2 días antes</option>
                    <option [value]="3">3 días antes</option>
                  </select>
                </div>

                <!-- Filtro por género -->
                <div>
                  <label class="label">Destinatarios</label>
                  <div class="flex gap-3">
                    @for (opt of genderOptions; track opt.value) {
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="genderFilter" [value]="opt.value" [(ngModel)]="promoForm.genderFilter" class="text-primary-600">
                        <span class="text-sm text-slate-700 dark:text-slate-300">{{ opt.label }}</span>
                      </label>
                    }
                  </div>
                </div>

                <!-- Mensaje -->
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="label mb-0">Mensaje *</label>
                    <div class="flex gap-1">
                      @for (v of promoVars; track v) {
                        <button (click)="insertPromoVar(v)"
                          class="text-[11px] bg-slate-100 dark:bg-slate-700 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-slate-600 dark:text-slate-400 hover:text-primary-700 px-1.5 py-0.5 rounded font-mono transition-colors">
                          {{ v }}
                        </button>
                      }
                    </div>
                  </div>
                  <textarea #promoTextarea [(ngModel)]="promoForm.message" rows="6" class="input resize-none font-mono text-xs"
                    [placeholder]="promoMsgPlaceholder"></textarea>
                  <p class="text-xs text-slate-400 mt-1">{{ promoForm.message?.length || 0 }} caracteres · Usa los botones de arriba para insertar variables</p>
                </div>

                <!-- Preview del mensaje -->
                @if (promoForm.message) {
                  <div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                    <p class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">Vista previa (con datos de ejemplo)</p>
                    <p class="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{{ promoPreview() }}</p>
                  </div>
                }

                <!-- Imagen adjunta -->
                <div>
                  <label class="label">Imagen adjunta <span class="font-normal text-slate-400">(opcional — se envía con el mensaje)</span></label>
                  @if (promoForm.imagePreview) {
                    <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <img [src]="promoForm.imagePreview" alt="Preview" class="w-14 h-14 object-cover rounded-lg shrink-0 border border-slate-200 dark:border-slate-600">
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Imagen lista</p>
                        <p class="text-xs text-slate-400 mt-0.5">Se enviará automáticamente con cada mensaje</p>
                      </div>
                      <button type="button" (click)="removePromoImage()"
                        class="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  } @else {
                    <label class="flex items-center gap-3 p-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 transition-all group">
                      <div class="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center transition-colors shrink-0">
                        <svg class="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>
                      <div>
                        <p class="text-xs font-medium text-slate-700 dark:text-slate-300">Subir imagen</p>
                        <p class="text-xs text-slate-400">JPG, PNG · Máx 5 MB</p>
                      </div>
                      <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" (change)="onPromoImageChange($event)">
                    </label>
                  }
                </div>

                <!-- Nota interna -->
                <div>
                  <label class="label">Nota interna (opcional)</label>
                  <input [(ngModel)]="promoForm.description" class="input" placeholder="Ej: Solo para pacientes mujeres con cita en los últimos 6 meses">
                </div>

                <!-- Toggles -->
                <div class="flex flex-wrap gap-5 pt-1">
                  <label class="flex items-center gap-2.5 cursor-pointer">
                    <div class="relative">
                      <input type="checkbox" [(ngModel)]="promoForm.isPromotion" class="sr-only peer">
                      <div class="w-9 h-5 rounded-full transition-colors peer-checked:bg-violet-500 bg-slate-200 dark:bg-slate-600"></div>
                      <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4"></div>
                    </div>
                    <span class="text-sm text-slate-700 dark:text-slate-300">
                      Es una <strong>Promoción</strong> (con oferta o descuento)
                    </span>
                  </label>
                  <label class="flex items-center gap-2.5 cursor-pointer">
                    <div class="relative">
                      <input type="checkbox" [(ngModel)]="promoForm.isActive" class="sr-only peer">
                      <div class="w-9 h-5 rounded-full transition-colors peer-checked:bg-emerald-500 bg-slate-200 dark:bg-slate-600"></div>
                      <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4"></div>
                    </div>
                    <span class="text-sm text-slate-700 dark:text-slate-300">Activa (se enviará automáticamente)</span>
                  </label>
                </div>
              </div>
              <div class="modal-footer">
                <button (click)="closePromoModal()" class="btn-secondary">Cancelar</button>
                <button (click)="savePromo()" class="btn-primary" [disabled]="savingPromo()">
                  @if (savingPromo()) { Guardando... } @else { {{ editingPromo() ? 'Guardar cambios' : 'Crear Fecha Especial' }} }
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ── Historial de Mensajes ─────────────────────────────── -->
      <div class="card overflow-hidden">
        <div class="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Historial de Mensajes</h3>
            <p class="text-xs text-slate-400 mt-0.5">Últimos {{ messages().length }} mensajes</p>
          </div>
          <button (click)="loadMessages()"
            class="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-2.5 py-1.5 rounded-lg transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>
        <div class="divide-y divide-slate-100 dark:divide-slate-700/50">
          @if (groupedMessages().length === 0) {
            <div class="flex flex-col items-center justify-center py-12 gap-3">
              <div class="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <p class="text-sm text-slate-400">Sin mensajes aún</p>
            </div>
          } @else {
            @for (item of groupedMessages(); track $index) {
              @if (item.isCampaignBatch) {
                <!-- Campaign batch row -->
                <div class="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <div class="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="text-sm font-semibold text-slate-900 dark:text-white">Campaña WhatsApp</p>
                      <span class="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-medium">
                        {{ item.messages.length }} destinatarios
                      </span>
                      @if (item.failedCount > 0) {
                        <span class="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                          {{ item.failedCount }} fallidos
                        </span>
                      }
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5 truncate">{{ item.messages[0]?.message | slice:0:60 }}{{ (item.messages[0]?.message?.length || 0) > 60 ? '...' : '' }}</p>
                  </div>
                  <div class="flex items-center gap-3 shrink-0">
                    <p class="text-xs text-slate-400">{{ item.createdAt | date:'dd/MM HH:mm' }}</p>
                    <button (click)="selectedCampaignBatch.set(item.messages)"
                      class="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-2.5 py-1.5 rounded-lg transition-colors font-medium opacity-0 group-hover:opacity-100">
                      Ver detalles
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </div>
                </div>
              } @else {
                <!-- Regular message row -->
                <div class="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
                    [ngClass]="msgTypeIconBg(item.type)">
                    {{ msgTypeIcon(item.type) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ item.recipientPhone }}</p>
                      <span class="text-xs px-1.5 py-0.5 rounded-md font-medium"
                        [ngClass]="msgTypeBadgeCls(item.type)">{{ msgType(item.type) }}</span>
                    </div>
                    <p class="text-xs text-slate-500 truncate mt-0.5">{{ item.message }}</p>
                    @if (item.errorMessage && item.status === 'FAILED') {
                      <p class="text-xs text-red-400 mt-0.5">⚠ {{ friendlyErrorDisplay(item.errorMessage) }}</p>
                    }
                  </div>
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                      [ngClass]="msgStatusCls(item.status)">{{ msgStatus(item.status).label }}</span>
                    <p class="text-xs text-slate-400">{{ item.createdAt | date:'dd/MM HH:mm' }}</p>
                  </div>
                </div>
              }
            }
          }
        </div>
      </div>

    </div>

    <!-- ── Campaign Details Modal ───────────────────────────── -->
    @if (selectedCampaignBatch()) {
      <div class="modal-overlay" (click)="selectedCampaignBatch.set(null)">
        <div class="modal-center">
          <div class="modal modal-lg animate-slide-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="modal-title">Detalle de Campaña</h2>
                  <p class="text-xs text-slate-400">{{ selectedCampaignBatch()!.length }} destinatarios</p>
                </div>
              </div>
              <button (click)="selectedCampaignBatch.set(null)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body min-h-0">
              <!-- Summary chips -->
              <div class="flex gap-2 mb-4">
                <span class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full font-medium">
                  {{ campaignBatchSentCount() }} enviados
                </span>
                @if (campaignBatchFailedCount() > 0) {
                  <span class="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-full font-medium">
                    {{ campaignBatchFailedCount() }} fallidos
                  </span>
                }
              </div>
              <div class="divide-y divide-slate-100 dark:divide-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                @for (msg of selectedCampaignBatch()!; track msg.id) {
                  <div class="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <div class="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 w-28 shrink-0">{{ msg.recipientPhone }}</div>
                    <p class="text-xs text-slate-600 dark:text-slate-400 flex-1 min-w-0 truncate">{{ msg.message }}</p>
                    <div class="shrink-0">
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full" [ngClass]="msgStatusCls(msg.status)">
                        {{ msgStatus(msg.status).label }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="selectedCampaignBatch.set(null)" class="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class WhatsappComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  tenants = signal<any[]>([]);
  filterTenantId = signal<string>('');

  session = signal<WhatsappSession | null>(null);
  stats = signal<any>(null);
  messages = signal<any[]>([]);
  connecting = signal(false);
  sending = signal(false);
  retrying = signal(false);
  countdown = signal(15);

  isInitializing = signal(false);
  initMessage = signal('Iniciando navegador y sesión...');
  errorMessage = signal('');

  // Toast
  toast = signal<{ type: 'success' | 'error' | 'info'; title: string; text: string } | null>(null);
  private toastTimer: any;

  // Campaign batch detail modal
  selectedCampaignBatch = signal<any[] | null>(null);
  campaignBatchSentCount = computed(() =>
    (this.selectedCampaignBatch() || []).filter(m => m.status === 'SENT' || m.status === 'DELIVERED' || m.status === 'READ').length
  );
  campaignBatchFailedCount = computed(() =>
    (this.selectedCampaignBatch() || []).filter(m => m.status === 'FAILED').length
  );

  // Grouped messages: groups consecutive campaign messages into batches
  groupedMessages = computed(() => {
    const msgs = this.messages();
    const result: any[] = [];
    let i = 0;
    while (i < msgs.length) {
      const msg = msgs[i];
      if (msg.referenceType === 'campaign') {
        const batch: any[] = [msg];
        const batchTime = new Date(msg.createdAt).getTime();
        let j = i + 1;
        while (j < msgs.length && msgs[j].referenceType === 'campaign') {
          const diff = Math.abs(batchTime - new Date(msgs[j].createdAt).getTime());
          if (diff < 15 * 60 * 1000) { batch.push(msgs[j]); j++; } else break;
        }
        result.push({
          isCampaignBatch: true,
          messages: batch,
          createdAt: msg.createdAt,
          failedCount: batch.filter(m => m.status === 'FAILED').length,
        });
        i = j;
      } else {
        result.push({ isCampaignBatch: false, ...msg });
        i++;
      }
    }
    return result;
  });

  quickSend = { phone: '', countryCode: '+591', message: '' };
  patientSearch = '';
  patientResults = signal<any[]>([]);
  private patientSearchTimer: any;

  countryCodes = [
    { flag: '🇧🇴', code: '+591' },
    { flag: '🇵🇪', code: '+51' },
    { flag: '🇦🇷', code: '+54' },
    { flag: '🇧🇷', code: '+55' },
    { flag: '🇨🇱', code: '+56' },
    { flag: '🇪🇸', code: '+34' },
    { flag: '🇲🇽', code: '+52' },
    { flag: '🇺🇸', code: '+1' },
  ];

  automations = [
    {
      key: 'reminder24',
      icon: '⏰',
      title: 'Recordatorio 24h',
      schedule: 'Cron horario',
      description: 'Aviso automático 24h antes de la cita.',
      plan: 'Básico',
      activeCls: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30',
      iconBg: 'bg-blue-100 dark:bg-blue-800/40',
      titleCls: 'text-blue-700 dark:text-blue-300',
    },
    {
      key: 'reminder1h',
      icon: '🔔',
      title: 'Recordatorio 1h',
      schedule: 'Cron horario',
      description: 'Último aviso 1h antes. Sin duplicados.',
      plan: 'Básico',
      activeCls: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-800/30',
      iconBg: 'bg-cyan-100 dark:bg-cyan-800/40',
      titleCls: 'text-cyan-700 dark:text-cyan-300',
    },
    {
      key: 'birthday',
      icon: '🎂',
      title: 'Cumpleaños',
      schedule: 'Diario a las 9:00',
      description: 'Felicitación personalizada con nombre de clínica.',
      plan: 'Premium',
      activeCls: 'bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-800/30',
      iconBg: 'bg-pink-100 dark:bg-pink-800/40',
      titleCls: 'text-pink-700 dark:text-pink-300',
    },
    {
      key: 'followup',
      icon: '📋',
      title: 'Seguimientos',
      schedule: 'Diario 10am · Lunes 8am',
      description: 'Cotizaciones pendientes (+3 días) · Reactivación inactivos (+6 meses).',
      plan: 'Premium',
      activeCls: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30',
      iconBg: 'bg-amber-100 dark:bg-amber-800/40',
      titleCls: 'text-amber-700 dark:text-amber-300',
    },
    {
      key: 'campaigns',
      icon: '📣',
      title: 'Campañas',
      schedule: 'Manual o programado',
      description: 'Campañas de fidelización personalizadas a múltiples pacientes.',
      plan: 'Premium',
      activeCls: 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800/30',
      iconBg: 'bg-violet-100 dark:bg-violet-800/40',
      titleCls: 'text-violet-700 dark:text-violet-300',
    },
    {
      key: 'promotions',
      icon: '🇧🇴',
      title: 'Promociones Bolivia',
      schedule: 'Automático por fechas clave',
      description: 'Día de la Madre, Año Nuevo, Fiestas Patrias y más.',
      plan: 'Premium',
      activeCls: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30',
      iconBg: 'bg-emerald-100 dark:bg-emerald-800/40',
      titleCls: 'text-emerald-700 dark:text-emerald-300',
    },
  ];

  // ── Promociones Bolivia ──────────────────────────────────────────────────
  promotions = signal<any[]>([]);
  showPromoModal = signal(false);
  editingPromo = signal<any>(null);
  savingPromo = signal(false);

  promoForm: any = this.emptyPromoForm();

  readonly campaignMsgPlaceholder = 'Hola {nombre}, te invitamos a nuestra promoción...';
  readonly promoMsgPlaceholder = 'Ej: ¡Feliz Año Nuevo, {nombre}! {clinica} te desea lo mejor en este 2026...';
  readonly monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  readonly days = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly genderOptions = [
    { value: 'ALL',    label: '👥 Todos los pacientes' },
    { value: 'FEMALE', label: '♀ Solo mujeres' },
    { value: 'MALE',   label: '♂ Solo hombres' },
  ];
  readonly promoVars = ['{nombre}', '{apellido}', '{clinica}'];

  promoMonthIcon(month: number): string {
    const icons = ['🎆','💝','🌸','🌼','🌷','☀️','⛱️','🇧🇴','🍂','🎃','🦃','🎄'];
    return icons[month - 1] ?? '📅';
  }

  promoPreview = () => {
    const msg = this.promoForm.message || '';
    return msg
      .replace(/\{nombre\}/gi, 'María')
      .replace(/\{apellido\}/gi, 'Pérez')
      .replace(/\{clinica\}/gi, 'SmileDent');
  };

  insertPromoVar(v: string) {
    const ta = document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="Ej: ¡Feliz"]');
    if (ta) {
      const start = ta.selectionStart ?? this.promoForm.message.length;
      const before = this.promoForm.message.substring(0, start);
      const after  = this.promoForm.message.substring(ta.selectionEnd ?? start);
      this.promoForm.message = before + v + after;
    } else {
      this.promoForm.message = (this.promoForm.message || '') + v;
    }
  }

  emptyPromoForm() {
    return {
      name: '', description: '',
      dayOfMonth: 1, month: 1,
      message: '',
      genderFilter: 'ALL',
      isActive: true, isPromotion: false,
      sendDaysBefore: 0,
      imageBase64: null as string | null,
      imageMimetype: null as string | null,
      imagePreview: null as string | null,
    };
  }

  onPromoImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.showToastMsg('La imagen debe ser menor a 5 MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      this.promoForm.imageBase64 = base64;
      this.promoForm.imageMimetype = file.type;
      this.promoForm.imagePreview = result;
    };
    reader.readAsDataURL(file);
  }

  removePromoImage() {
    this.promoForm.imageBase64 = null;
    this.promoForm.imageMimetype = null;
    this.promoForm.imagePreview = null;
  }

  private showToastMsg(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    this.toast.set({ type, text: msg, title: type === 'error' ? 'Error' : type === 'success' ? 'Listo' : 'Info' });
    setTimeout(() => this.toast.set(null), 4000);
  }

  loadPromotions() {
    this.api.get<any[]>('/whatsapp/promotions').subscribe({
      next: p => this.promotions.set(Array.isArray(p) ? p : []),
      error: () => {},
    });
  }

  openPromoModal(promo?: any) {
    this.editingPromo.set(promo || null);
    if (promo) {
      this.promoForm = {
        ...promo,
        imagePreview: promo.imageBase64 ? `data:${promo.imageMimetype};base64,${promo.imageBase64}` : null,
      };
    } else {
      this.promoForm = this.emptyPromoForm();
    }
    this.showPromoModal.set(true);
  }

  closePromoModal() {
    this.showPromoModal.set(false);
    this.editingPromo.set(null);
  }

  savePromo() {
    if (!this.promoForm.name || !this.promoForm.message) return;
    this.savingPromo.set(true);
    const req = this.editingPromo()
      ? this.api.patch(`/whatsapp/promotions/${this.editingPromo()!.id}`, this.promoForm)
      : this.api.post('/whatsapp/promotions', this.promoForm);
    req.subscribe({
      next: () => { this.savingPromo.set(false); this.closePromoModal(); this.loadPromotions(); },
      error: () => this.savingPromo.set(false),
    });
  }

  togglePromo(promo: any) {
    this.api.post(`/whatsapp/promotions/${promo.id}/toggle`, {}).subscribe({
      next: () => this.loadPromotions(),
      error: () => {},
    });
  }

  deletePromo(promo: any) {
    if (!confirm(`¿Eliminar la fecha "${promo.name}"? Esta acción no se puede deshacer.`)) return;
    this.api.delete(`/whatsapp/promotions/${promo.id}`).subscribe({
      next: () => this.loadPromotions(),
      error: () => {},
    });
  }

  // Campaign
  campaignMsg = '';
  campaignSearch = '';
  campaignContacts = signal<any[]>([]);
  campaignContactsTotal = signal(0);
  campaignSelectedIds = signal<Set<string>>(new Set());
  loadingContacts = signal(false);
  sendingCampaign = signal(false);
  campaignImage = signal<{ base64: string; mimetype: string; previewUrl: string } | null>(null);
  campaignSelected = computed(() => [...this.campaignSelectedIds()]);
  campaignAllSelected = computed(() =>
    this.campaignContacts().length > 0 &&
    this.campaignContacts().every(p => this.campaignSelectedIds().has(p.id))
  );
  private campaignSearchTimer: any;

  private pollInterval: any;
  private fastPollInterval: any;
  private reconnectPollInterval: any;

  ngOnInit() {
    if (this.isSuperAdmin()) this.loadTenants();
    this.loadSession();
    this.loadStats();
    this.loadMessages();
    this.loadCampaignContacts();
    this.loadPromotions();
  }

  ngOnDestroy() {
    clearInterval(this.pollInterval);
    clearInterval(this.fastPollInterval);
    clearInterval(this.reconnectPollInterval);
    clearTimeout(this.patientSearchTimer);
    clearTimeout(this.campaignSearchTimer);
    clearTimeout(this.toastTimer);
  }

  showToast(type: 'success' | 'error' | 'info', title: string, text: string, duration = 4500) {
    clearTimeout(this.toastTimer);
    this.toast.set({ type, title, text });
    this.toastTimer = setTimeout(() => { this.toast.set(null); this.cdr.markForCheck(); }, duration);
    this.cdr.markForCheck();
  }

  loadTenants() {
    this.api.get<any>('/tenants').subscribe({
      next: (res: any) => this.tenants.set(res?.data || res || []),
      error: () => {},
    });
  }

  onTenantFilterChange(tenantId: string) {
    this.filterTenantId.set(tenantId);
    this.isInitializing.set(false);
    this.errorMessage.set('');
    this.loadCampaignContacts();
    clearInterval(this.fastPollInterval);
    clearInterval(this.pollInterval);
    this.loadSession();
    this.loadStats();
    this.loadMessages();
  }

  loadSession() {
    const params: any = {};
    if (this.filterTenantId()) params.tenantId = this.filterTenantId();
    this.api.get<WhatsappSession>('/whatsapp/session', params).subscribe({
      next: (s) => {
        this.session.set(s);
        if (s?.status === 'QR_PENDING') {
          this.isInitializing.set(false);
          clearInterval(this.reconnectPollInterval);
          this.startQrPolling();
        } else if (s?.status === 'RECONNECTING') {
          this.isInitializing.set(false);
          this.startReconnectPolling();
        } else if (s?.status === 'CONNECTED') {
          this.isInitializing.set(false);
          clearInterval(this.fastPollInterval);
          clearInterval(this.pollInterval);
          clearInterval(this.reconnectPollInterval);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 401) { this.stopPolling(); return; }
        this.cdr.markForCheck();
      },
    });
  }

  private stopPolling() {
    clearInterval(this.fastPollInterval);
    clearInterval(this.pollInterval);
    clearInterval(this.reconnectPollInterval);
    this.pollInterval = null;
    this.reconnectPollInterval = null;
  }

  connect() {
    this.connecting.set(true);
    this.isInitializing.set(true);
    this.initMessage.set('Iniciando navegador, puede tardar 30-60 segundos...');
    this.errorMessage.set('');

    const tenantSuffix = this.isSuperAdmin() && this.filterTenantId()
      ? `?tenantId=${this.filterTenantId()}` : '';

    this.api.post(`/whatsapp/session/connect${tenantSuffix}`, {}).subscribe({
      next: (res: any) => {
        this.connecting.set(false);
        this.initMessage.set(res?.message || 'Conectando...');
        if (res?.status === 'RECONNECTING') {
          this.isInitializing.set(false);
          this.startReconnectPolling();
        } else {
          this.startFastPolling();
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.connecting.set(false);
        const errBody = err?.error;
        if (err?.status === 503 || errBody?.status === 'INITIALIZING') {
          this.initMessage.set(errBody?.message || 'Sesión ya iniciándose, esperando QR...');
          this.startFastPolling();
        } else if (err?.status === 409) {
          this.isInitializing.set(false);
          this.loadSession();
        } else {
          this.isInitializing.set(false);
          this.errorMessage.set(errBody?.message || `Error al conectar (${err?.status || 'sin conexión'})`);
        }
        this.cdr.markForCheck();
      },
    });
  }

  disconnect() {
    const tenantSuffix = this.isSuperAdmin() && this.filterTenantId()
      ? `?tenantId=${this.filterTenantId()}` : '';
    this.api.post(`/whatsapp/session/disconnect${tenantSuffix}`, {}).subscribe(() => {
      clearInterval(this.fastPollInterval);
      clearInterval(this.pollInterval);
      clearInterval(this.reconnectPollInterval);
      this.reconnectPollInterval = null;
      this.isInitializing.set(false);
      this.loadSession();
    });
  }

  searchPatients() {
    clearTimeout(this.patientSearchTimer);
    if (!this.patientSearch.trim() || this.patientSearch.length < 2) {
      this.patientResults.set([]);
      return;
    }
    this.patientSearchTimer = setTimeout(() => {
      this.api.get<any>('/patients', { search: this.patientSearch, limit: 5 }).subscribe({
        next: (res: any) => this.patientResults.set(res?.data || res || []),
        error: () => this.patientResults.set([]),
      });
    }, 300);
  }

  selectPatient(p: any) {
    let phone = (p.whatsapp || p.phone || '').replace(/\D/g, '');
    if (phone.startsWith('591')) phone = phone.slice(3);
    this.quickSend.phone = phone;
    this.patientSearch = `${p.firstName} ${p.lastName}`;
    this.patientResults.set([]);
    this.cdr.markForCheck();
  }

  sendQuick() {
    if (!this.quickSend.phone || !this.quickSend.message) return;
    this.sending.set(true);
    const fullPhone = this.quickSend.countryCode.replace('+', '') + this.quickSend.phone.replace(/\D/g, '');
    this.api.post('/whatsapp/send', { phone: fullPhone, message: this.quickSend.message }).subscribe({
      next: () => {
        this.sending.set(false);
        this.quickSend.phone = '';
        this.quickSend.message = '';
        this.patientSearch = '';
        this.loadMessages();
        this.showToast('success', 'Mensaje enviado', 'El mensaje fue enviado correctamente');
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.sending.set(false);
        this.showToast('error', 'Error al enviar', err?.error?.message || 'No se pudo enviar el mensaje');
        this.cdr.markForCheck();
      },
    });
  }

  loadStats() {
    const params: any = {};
    if (this.filterTenantId()) params.tenantId = this.filterTenantId();
    this.api.get<any>('/whatsapp/stats', params).subscribe(s => this.stats.set(s));
  }

  loadMessages() {
    const params: any = { limit: 50 };
    if (this.filterTenantId()) params.tenantId = this.filterTenantId();
    this.api.getPaginated<any>('/whatsapp/messages', params).subscribe(res => {
      this.messages.set(res.data);
      this.cdr.markForCheck();
    });
  }

  private startFastPolling() {
    clearInterval(this.fastPollInterval);
    clearInterval(this.pollInterval);
    clearInterval(this.reconnectPollInterval);
    this.fastPollInterval = setInterval(() => this.pollAndCheck(), 4000);
  }

  private startReconnectPolling() {
    if (this.reconnectPollInterval) return;
    clearInterval(this.fastPollInterval);
    clearInterval(this.pollInterval);
    let cd = 15;
    this.countdown.set(cd);
    this.reconnectPollInterval = setInterval(() => {
      cd--;
      this.countdown.set(cd);
      this.cdr.markForCheck();
      if (cd <= 0) { cd = 15; this.pollAndCheck(); }
    }, 1000);
  }

  private startQrPolling() {
    clearInterval(this.fastPollInterval);
    clearInterval(this.pollInterval);
    let cd = 15;
    this.countdown.set(cd);
    this.pollInterval = setInterval(() => {
      cd--;
      this.countdown.set(cd);
      this.cdr.markForCheck();
      if (cd <= 0) { cd = 15; this.pollAndCheck(); }
    }, 1000);
  }

  private pollAndCheck() {
    const params: any = {};
    if (this.filterTenantId()) params.tenantId = this.filterTenantId();
    this.api.get<WhatsappSession>('/whatsapp/session', params).subscribe({
      next: (s) => {
        this.session.set(s);
        if (s?.status === 'QR_PENDING') {
          this.isInitializing.set(false);
          clearInterval(this.fastPollInterval);
          clearInterval(this.reconnectPollInterval);
          this.reconnectPollInterval = null;
          if (!this.pollInterval) this.startQrPolling();
        } else if (s?.status === 'RECONNECTING') {
          this.isInitializing.set(false);
          clearInterval(this.fastPollInterval);
          if (!this.reconnectPollInterval) this.startReconnectPolling();
        } else if (s?.status === 'CONNECTED') {
          this.isInitializing.set(false);
          this.errorMessage.set('');
          clearInterval(this.fastPollInterval);
          clearInterval(this.pollInterval);
          clearInterval(this.reconnectPollInterval);
          this.pollInterval = null;
          this.reconnectPollInterval = null;
          this.loadMessages();
          this.loadStats();
        } else if (s?.status === 'DISCONNECTED') {
          if (this.isInitializing()) {
            this.isInitializing.set(false);
            this.errorMessage.set('La sesión se desconectó. Intenta de nuevo.');
          } else if (this.reconnectPollInterval) {
            this.errorMessage.set('No se pudo reconectar automáticamente. Conecta manualmente.');
          }
          clearInterval(this.fastPollInterval);
          clearInterval(this.pollInterval);
          clearInterval(this.reconnectPollInterval);
          this.pollInterval = null;
          this.reconnectPollInterval = null;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 401) { this.stopPolling(); return; }
        this.cdr.markForCheck();
      },
    });
  }

  retryFailed() {
    if (this.retrying()) return;
    this.retrying.set(true);
    const params = this.isSuperAdmin() && this.filterTenantId() ? `?tenantId=${this.filterTenantId()}` : '';
    this.api.post<any>(`/whatsapp/retry-failed${params}`, {}).subscribe({
      next: (res) => {
        this.retrying.set(false);
        this.loadStats();
        this.loadMessages();
        const retried = res?.retried ?? 0;
        this.showToast('info', 'Reintento completado', `${retried} mensajes reenviados`);
        this.cdr.markForCheck();
      },
      error: () => { this.retrying.set(false); this.cdr.markForCheck(); },
    });
  }

  // ── Campaign ──────────────────────────────────────────────────

  loadCampaignContacts(search = '') {
    this.loadingContacts.set(true);
    const tid = this.isSuperAdmin() && this.filterTenantId() ? `&tenantId=${this.filterTenantId()}` : '';
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    this.api.get<any>(`/whatsapp/campaign/contacts?limit=100${q}${tid}`).subscribe({
      next: (res: any) => {
        this.campaignContacts.set(res?.data || []);
        this.campaignContactsTotal.set(res?.total || 0);
        this.loadingContacts.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loadingContacts.set(false); this.cdr.markForCheck(); },
    });
  }

  onCampaignSearch(value: string) {
    clearTimeout(this.campaignSearchTimer);
    this.campaignSearchTimer = setTimeout(() => this.loadCampaignContacts(value), 350);
  }

  isSelected(id: string): boolean { return this.campaignSelectedIds().has(id); }

  toggleContact(id: string) {
    const s = new Set(this.campaignSelectedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.campaignSelectedIds.set(s);
  }

  campaignSelectAll() {
    if (this.campaignAllSelected()) {
      this.campaignSelectedIds.set(new Set());
    } else {
      this.campaignSelectedIds.set(new Set(this.campaignContacts().map(p => p.id)));
    }
  }

  onCampaignImageSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('error', 'Formato inválido', 'Solo se permiten imágenes (JPG, PNG, GIF, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('error', 'Imagen muy grande', 'El archivo no puede superar 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const commaIdx = dataUrl.indexOf(',');
      const base64 = dataUrl.substring(commaIdx + 1);
      this.campaignImage.set({ base64, mimetype: file.type, previewUrl: dataUrl });
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  sendCampaign() {
    if (!this.campaignMsg.trim() || this.campaignSelectedIds().size === 0) return;
    this.sendingCampaign.set(true);
    const tid = this.isSuperAdmin() && this.filterTenantId() ? `?tenantId=${this.filterTenantId()}` : '';
    const img = this.campaignImage();
    const body: any = {
      patientIds: [...this.campaignSelectedIds()],
      message: this.campaignMsg.trim(),
    };
    if (img) {
      body.imageBase64 = img.base64;
      body.imageMimetype = img.mimetype;
    }
    this.api.post<any>(`/whatsapp/campaign/send${tid}`, body).subscribe({
      next: (res: any) => {
        this.sendingCampaign.set(false);
        this.campaignSelectedIds.set(new Set());
        this.campaignMsg = '';
        this.campaignImage.set(null);
        this.loadMessages();
        this.loadStats();
        const queued = res?.queued ?? 0;
        const skipped = res?.skipped ?? 0;
        this.showToast('success', '¡Campaña enviada!',
          `${queued} mensaje${queued !== 1 ? 's' : ''} en cola` + (skipped > 0 ? ` · ${skipped} omitidos` : ''));
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.sendingCampaign.set(false);
        this.showToast('error', 'Error al enviar campaña', err?.error?.message || 'Error desconocido');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  statsItems() {
    const s = this.stats();
    if (!s) return [];
    return [
      { label: 'Enviados', value: (s.sent ?? 0) + (s.delivered ?? 0), color: 'blue' },
      { label: 'Fallidos', value: s.failed ?? 0, color: 'red' },
      { label: 'En cola', value: s.queued ?? 0, color: 'amber' },
    ];
  }

  statusLabel() {
    if (this.isInitializing()) return 'Iniciando...';
    const map: Record<string, string> = {
      DISCONNECTED: 'Desconectado',
      QR_PENDING: 'Esperando QR',
      CONNECTED: 'Conectado',
      RECONNECTING: 'Reconectando',
      BANNED: 'Bloqueado',
    };
    return map[this.session()?.status || ''] || 'Desconectado';
  }

  statusDotClass() {
    if (this.isInitializing()) return 'bg-blue-500 animate-pulse';
    const map: Record<string, string> = {
      CONNECTED: 'bg-emerald-500 animate-pulse',
      QR_PENDING: 'bg-amber-500 animate-pulse',
      DISCONNECTED: 'bg-slate-400',
      RECONNECTING: 'bg-blue-500 animate-pulse',
      BANNED: 'bg-red-500',
    };
    return map[this.session()?.status || ''] || 'bg-slate-400';
  }

  msgType(type: string): string {
    const map: Record<string, string> = {
      APPOINTMENT_REMINDER: 'Recordatorio',
      APPOINTMENT_CONFIRMATION: 'Confirmación',
      APPOINTMENT_CANCELLATION: 'Cancelación',
      BIRTHDAY: 'Cumpleaños',
      QUOTE_FOLLOWUP: 'Cotización',
      REACTIVATION: 'Reactivación',
      CUSTOM: 'Manual',
    };
    return map[type] || type;
  }

  msgTypeIcon(type: string): string {
    const map: Record<string, string> = {
      APPOINTMENT_REMINDER: '⏰',
      APPOINTMENT_CONFIRMATION: '✅',
      APPOINTMENT_CANCELLATION: '❌',
      BIRTHDAY: '🎂',
      QUOTE_FOLLOWUP: '📄',
      REACTIVATION: '🔄',
      CUSTOM: '✉️',
    };
    return map[type] || '💬';
  }

  msgTypeIconBg(type: string): string {
    const map: Record<string, string> = {
      APPOINTMENT_REMINDER: 'bg-blue-100 dark:bg-blue-900/30',
      APPOINTMENT_CONFIRMATION: 'bg-emerald-100 dark:bg-emerald-900/30',
      APPOINTMENT_CANCELLATION: 'bg-red-100 dark:bg-red-900/30',
      BIRTHDAY: 'bg-pink-100 dark:bg-pink-900/30',
      QUOTE_FOLLOWUP: 'bg-amber-100 dark:bg-amber-900/30',
      REACTIVATION: 'bg-violet-100 dark:bg-violet-900/30',
      CUSTOM: 'bg-slate-100 dark:bg-slate-700',
    };
    return map[type] || 'bg-slate-100 dark:bg-slate-700';
  }

  msgTypeBadgeCls(type: string): string {
    const map: Record<string, string> = {
      APPOINTMENT_REMINDER: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      APPOINTMENT_CONFIRMATION: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      APPOINTMENT_CANCELLATION: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      BIRTHDAY: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
      QUOTE_FOLLOWUP: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      REACTIVATION: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
      CUSTOM: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    };
    return map[type] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
  }

  msgStatusCls(status: string): string {
    const map: Record<string, string> = {
      QUEUED:    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      SENT:      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      DELIVERED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      READ:      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      FAILED:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      RECEIVED:  'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    };
    return map[status] || 'bg-slate-100 dark:bg-slate-700 text-slate-500';
  }

  friendlyErrorDisplay(errMsg: string): string {
    if (!errMsg) return '';
    const e = errMsg.toLowerCase();
    if (e.includes('no lid for user') || e.includes('not registered on whatsapp')) return 'Número no registrado en WhatsApp';
    if (e.includes('detached frame') || e.includes('detached')) return 'Conexión interrumpida durante el envío';
    if (e.includes('target closed') || e.includes('session closed')) return 'Sesión cerrada durante el envío';
    if (e.includes('protocol error') || e.includes('connection closed')) return 'Error de conexión con WhatsApp';
    if (e.includes('evaluation failed') || e.includes('evaluate')) return 'WhatsApp no respondió';
    if (e.includes('already running') || e.includes('singletonlock')) return 'Conflicto de sesión — reintentando';
    if (e.includes('econnrefused') || e.includes('enotfound')) return 'Sin conexión a internet';
    if (e.includes('whatsapp no conectado')) return 'WhatsApp desconectado';
    if (e.includes('cita ya ocurrió')) return 'Cita ya pasó — recordatorio cancelado';
    return errMsg.split('\n')[0].substring(0, 80);
  }

  msgStatus(status: string): { label: string; cls: string } {
    const map: Record<string, { label: string; cls: string }> = {
      QUEUED:    { label: 'En cola',  cls: 'text-amber-500' },
      SENT:      { label: 'Enviado',  cls: 'text-blue-500' },
      DELIVERED: { label: 'Enviado',  cls: 'text-blue-500' },
      READ:      { label: 'Leído',    cls: 'text-emerald-600' },
      FAILED:    { label: 'Fallido',  cls: 'text-red-500' },
      CUSTOM:    { label: 'Manual',   cls: 'text-slate-500' },
      RECEIVED:  { label: 'Recibido', cls: 'text-violet-500' },
    };
    return map[status] || { label: status, cls: 'text-slate-400' };
  }
}
