import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { DashboardOverview } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Super Admin banner -->
      @if (isSuperAdmin()) {
        <div class="alert alert-info">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <p class="font-bold">Modo Super Admin</p>
            <p class="text-xs mt-0.5 opacity-80">Este dashboard es para tenants. Tus métricas globales están en
              <a routerLink="/super-admin/tenants" class="underline font-semibold hover:opacity-80">Panel Super Admin →</a>
            </p>
          </div>
        </div>
      }

      <!-- ─── Briefing Banner (dismissible, se muestra a diario) ─── -->
      @if (showBriefingBanner() && overview()) {
        <div class="card overflow-hidden border-l-4"
             [class.border-amber-400]="hasInventoryAlerts()"
             [class.border-primary-400]="!hasInventoryAlerts()">
          <!-- Header del banner -->
          <div class="flex items-center justify-between px-4 py-3 bg-gradient-to-r cursor-pointer"
               [ngClass]="hasInventoryAlerts()
                 ? 'from-amber-50 to-amber-50/50 dark:from-amber-900/20'
                 : 'from-primary-50 to-violet-50/50 dark:from-primary-900/20'"
               (click)="briefingExpanded.set(!briefingExpanded())">
            <div class="flex items-center gap-2">
              @if (hasInventoryAlerts()) {
                <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span class="text-xs font-bold text-amber-700 dark:text-amber-400">
                  ¡Atención! {{ overview()!.inventoryAlerts!.length }} producto(s) con stock bajo
                </span>
              } @else {
                <svg class="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <span class="text-xs font-bold text-primary-700 dark:text-primary-400">
                  Resumen del día — {{ overview()!.medical.totalAppointments }} cita(s) · Bs. {{ overview()!.financial.totalRevenue | number:'1.0-0' }} ingresos
                </span>
              }
            </div>
            <div class="flex items-center gap-2">
              @if (!hasInventoryAlerts()) {
                <button (click)="$event.stopPropagation(); dismissBriefingToday()"
                        class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  No mostrar hoy
                </button>
              }
              <svg class="w-4 h-4 text-slate-400 transition-transform"
                   [class.rotate-180]="briefingExpanded()"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>

          <!-- Cuerpo expandible -->
          @if (briefingExpanded()) {
            <div class="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-700/50">
              <!-- KPIs rápidos -->
              <div class="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <div class="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xl font-bold text-emerald-700 dark:text-emerald-300">{{ overview()!.medical.completedAppointments }}</p>
                  <p class="text-xs text-emerald-600">Citas completadas</p>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                <div class="w-9 h-9 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xl font-bold text-primary-700 dark:text-primary-300">Bs. {{ overview()!.financial.totalRevenue | number:'1.0-0' }}</p>
                  <p class="text-xs text-primary-600">Ingresos del período</p>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div class="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xl font-bold text-slate-700 dark:text-slate-200">{{ overview()!.medical.newPatients }}</p>
                  <p class="text-xs text-slate-500">Nuevos pacientes</p>
                </div>
              </div>
              <!-- Alertas de inventario (si las hay) -->
              @if (hasInventoryAlerts()) {
                <div class="sm:col-span-3 space-y-1.5">
                  <p class="text-xs font-bold text-amber-600 uppercase tracking-wide">Productos en stock bajo:</p>
                  <div class="flex flex-wrap gap-2">
                    @for (a of overview()!.inventoryAlerts!; track a.id) {
                      <a routerLink="/inventory"
                         class="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                        <span class="font-semibold text-amber-700 dark:text-amber-300">{{ a.name }}</span>
                        <span class="text-amber-500">{{ a.totalStock }}/{{ a.minimumStock }}</span>
                      </a>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Header with period selector -->
      <div class="page-header">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="page-title">
              Bienvenido, <span class="text-gradient-primary">{{ auth.currentUser()?.firstName }}</span>
            </h1>
            @if (planLabel() && !isSuperAdmin()) {
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border"
                [ngClass]="{
                  'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700': isPlatinum(),
                  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700': !isPlatinum() && isPremiumOrHigher(),
                  'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600': !isPremiumOrHigher()
                }">
                @if (isPlatinum()) {
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                } @else if (isPremiumOrHigher()) {
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                }
                Plan {{ planLabel() }}
              </span>
            }
          </div>
          <p class="page-subtitle">{{ today() }} — Resumen de tu clínica</p>
        </div>
        <div class="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
          @for (p of periods; track p.value) {
            <button
              (click)="selectedPeriod.set(p.value); loadData()"
              class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
              [class.bg-primary-600]="selectedPeriod() === p.value"
              [class.text-white]="selectedPeriod() === p.value"
              [class.shadow-sm]="selectedPeriod() === p.value"
              [ngClass]="selectedPeriod() !== p.value ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700' : ''">
              {{ p.label }}
            </button>
          }
        </div>
      </div>

      <!-- KPI Cards skeleton -->
      @if (loading()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          @for (_ of [1,2,3,4]; track $index) {
            <div class="card p-5 animate-pulse space-y-3">
              <div class="flex items-center justify-between">
                <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
                <div class="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              </div>
              <div class="h-8 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
              <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
            </div>
          }
        </div>
      } @else if (overview()) {
        <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <!-- Revenue -->
          <div class="card p-5 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 border-b-[3px] border-b-emerald-500 relative overflow-hidden">
            <div class="absolute -bottom-4 -right-4 w-20 h-20 bg-emerald-400/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Ingresos</span>
              <div class="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-400/40">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
            <p class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Bs. {{ overview()!.financial.totalRevenue | number:'1.0-0' }}
            </p>
            <div class="flex items-center gap-1.5 mt-2">
              <span [class]="overview()!.financial.revenueGrowth >= 0 ? 'kpi-delta-up' : 'kpi-delta-down'">
                {{ overview()!.financial.revenueGrowth >= 0 ? '↑' : '↓' }}
                {{ overview()!.financial.revenueGrowth | number:'1.1-1' }}%
              </span>
              <span class="text-xs text-slate-400">vs anterior</span>
            </div>
          </div>

          <!-- Appointments -->
          <div class="card p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Citas</span>
              <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>
            <p class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {{ overview()!.medical.totalAppointments }}
            </p>
            <div class="flex items-center gap-1.5 mt-2">
              <span class="kpi-delta-up">{{ overview()!.medical.completionRate }}%</span>
              <span class="text-xs text-slate-400">completadas</span>
            </div>
          </div>

          <!-- New Patients -->
          <div class="card p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nuevos Pac.</span>
              <div class="w-10 h-10 bg-gradient-to-br from-violet-400 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
            </div>
            <p class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {{ overview()!.medical.newPatients }}
            </p>
            <div class="flex items-center gap-1.5 mt-2">
              <span class="text-xs text-slate-500 dark:text-slate-400">Retención:</span>
              <span class="text-xs font-bold text-violet-600 dark:text-violet-400">{{ overview()!.medical.retentionRate | number:'1.0-1' }}%</span>
            </div>
          </div>

          <!-- Avg Ticket -->
          <div class="card p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ticket Prom.</span>
              <div class="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>
            <p class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Bs. {{ overview()!.financial.avgTicket | number:'1.0-0' }}
            </p>
            <div class="flex items-center gap-1.5 mt-2">
              <span class="text-xs text-slate-500 dark:text-slate-400">{{ overview()!.medical.activeDoctors }} médicos activos</span>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <!-- Appointment status breakdown -->
          <div class="card p-5">
            <h3 class="section-heading">Estado de Citas</h3>

            <!-- Donut chart -->
            <div class="flex items-center gap-4 mb-5">
              <div class="relative shrink-0 w-24 h-24 rounded-full flex items-center justify-center"
                [style.background]="appointmentPieStyle()">
                <div class="w-16 h-16 rounded-full bg-white dark:bg-slate-800 flex flex-col items-center justify-center shadow-inner">
                  <p class="text-sm font-bold text-slate-900 dark:text-white leading-none">{{ overview()!.medical.completionRate }}%</p>
                  <p class="text-[9px] text-slate-400 mt-0.5 leading-none">completado</p>
                </div>
              </div>
              <div class="flex-1 space-y-1.5">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span class="text-xs text-slate-600 dark:text-slate-400 flex-1">Completadas</span>
                  <span class="text-xs font-bold text-slate-900 dark:text-white">{{ overview()!.medical.completedAppointments }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0"></span>
                  <span class="text-xs text-slate-600 dark:text-slate-400 flex-1">Pendientes</span>
                  <span class="text-xs font-bold text-slate-900 dark:text-white">
                    {{ overview()!.medical.totalAppointments - overview()!.medical.completedAppointments - overview()!.medical.cancelledAppointments - (overview()!.medical.noShowAppointments ?? 0) | number }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                  <span class="text-xs text-slate-600 dark:text-slate-400 flex-1">No asistió</span>
                  <span class="text-xs font-bold text-slate-900 dark:text-white">{{ overview()!.medical.noShowAppointments ?? 0 }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0"></span>
                  <span class="text-xs text-slate-600 dark:text-slate-400 flex-1">Canceladas</span>
                  <span class="text-xs font-bold text-slate-900 dark:text-white">{{ overview()!.medical.cancelledAppointments }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              @for (item of appointmentStatusItems(); track item.label) {
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="font-medium text-slate-600 dark:text-slate-400">{{ item.label }}</span>
                    <span class="font-bold text-slate-900 dark:text-white">{{ item.pct | number:'1.0-0' }}%</span>
                  </div>
                  <div class="progress">
                    <div class="progress-bar" [style.width.%]="item.pct" [class]="item.color"></div>
                  </div>
                </div>
              }
            </div>

            <!-- Quick links -->
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <a routerLink="/appointments" class="flex items-center justify-between text-xs font-semibold text-primary-600 dark:text-primary-400 hover:opacity-80 transition-opacity group">
                <span>Ver agenda completa</span>
                <svg class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          </div>

          <!-- Period summary + top doctor -->
          <div class="card p-5 lg:col-span-2">
            <h3 class="section-heading">Resumen del Período</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div class="relative overflow-hidden rounded-xl p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                <div class="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-400/20 rounded-full blur-md"></div>
                <p class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Completado</p>
                <p class="text-2xl font-black text-emerald-700 dark:text-emerald-300">{{ overview()!.medical.completionRate }}%</p>
                <p class="text-[10px] text-emerald-500 mt-0.5">{{ overview()!.medical.completedAppointments }} citas</p>
              </div>
              <div class="relative overflow-hidden rounded-xl p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                <div class="absolute -bottom-2 -right-2 w-10 h-10 bg-red-400/20 rounded-full blur-md"></div>
                <p class="text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest mb-1">Cancelación</p>
                <p class="text-2xl font-black text-red-600 dark:text-red-300">{{ overview()!.medical.cancellationRate }}%</p>
                <p class="text-[10px] text-red-400 mt-0.5">{{ overview()!.medical.cancelledAppointments }} citas</p>
              </div>
              <div class="relative overflow-hidden rounded-xl p-3.5 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                <div class="absolute -bottom-2 -right-2 w-10 h-10 bg-cyan-400/20 rounded-full blur-md"></div>
                <p class="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">No-Show</p>
                <p class="text-2xl font-black text-cyan-700 dark:text-cyan-300">{{ overview()!.medical.noShowRate | number:'1.0-1' }}%</p>
                <p class="text-[10px] text-cyan-500 mt-0.5">{{ overview()!.medical.noShowAppointments ?? 0 }} ausentes</p>
              </div>
              <div class="relative overflow-hidden rounded-xl p-3.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                <div class="absolute -bottom-2 -right-2 w-10 h-10 bg-violet-400/20 rounded-full blur-md"></div>
                <p class="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-1">Doctores</p>
                <p class="text-2xl font-black text-violet-700 dark:text-violet-300">{{ overview()!.medical.activeDoctors }}</p>
                <p class="text-[10px] text-violet-500 mt-0.5">activos</p>
              </div>
            </div>

            @if (overview()!.topDoctor) {
              <div class="bg-gradient-to-r from-primary-50 to-violet-50 dark:from-primary-900/20 dark:to-violet-900/20 rounded-xl p-4 flex items-center gap-4 border border-primary-100 dark:border-primary-800/30">
                <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md shrink-0">
                  #1
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-0.5">Doctor más rentable</p>
                  <p class="text-base font-bold text-slate-900 dark:text-white truncate">{{ overview()!.topDoctor?.name }}</p>
                  <p class="text-sm text-primary-600 dark:text-primary-300 font-semibold">Bs. {{ overview()!.topDoctor?.revenue | number:'1.2-2' }}</p>
                </div>
                <a routerLink="/doctors" class="shrink-0 btn-sm btn-secondary hidden sm:flex">Ver →</a>
              </div>
            }

            <!-- Actividad del día -->
            @if (overview()!.today) {
              <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Actividad de Hoy</p>
                <div class="grid grid-cols-2 gap-2">
                  <div class="flex items-center gap-2 p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                    <div class="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
                    <div>
                      <p class="text-base font-bold text-violet-700 dark:text-violet-300">{{ overview()!.today!.inProgress }}</p>
                      <p class="text-xs text-violet-600 dark:text-violet-400">En atención</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div class="w-2 h-2 rounded-full bg-blue-400"></div>
                    <div>
                      <p class="text-base font-bold text-blue-700 dark:text-blue-300">{{ overview()!.today!.confirmed }}</p>
                      <p class="text-xs text-blue-600 dark:text-blue-400">En sala</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <div>
                      <p class="text-base font-bold text-emerald-700 dark:text-emerald-300">{{ overview()!.today!.completed }}</p>
                      <p class="text-xs text-emerald-600 dark:text-emerald-400">Completadas</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div class="w-2 h-2 rounded-full bg-slate-400"></div>
                    <div>
                      <p class="text-base font-bold text-slate-700 dark:text-slate-300">{{ overview()!.today!.total }}</p>
                      <p class="text-xs text-slate-500">Total hoy</p>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Accesos Rápidos -->
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Accesos Rápidos</p>
              <div class="grid grid-cols-2 gap-2">
                <a routerLink="/appointments" class="flex items-center gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors group border border-primary-100 dark:border-primary-800/30">
                  <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <span class="text-xs font-semibold text-primary-700 dark:text-primary-300">Nueva Cita</span>
                </a>
                <a routerLink="/patients" class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                  <svg class="w-4 h-4 text-slate-500 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                  </svg>
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nuevo Paciente</span>
                </a>
                <a routerLink="/accounts-receivable" class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                  <svg class="w-4 h-4 text-slate-500 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Registrar Pago</span>
                </a>
                <a routerLink="/commissions" class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                  <svg class="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
                  </svg>
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Comisiones</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Inventory Low Stock Alerts -->
        @if (overview()!.inventoryAlerts?.length) {
          <div class="card p-5 border-l-4 border-amber-400">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <h3 class="section-heading mb-0 text-amber-700 dark:text-amber-400">Stock Bajo — Requiere atención</h3>
              <a routerLink="/inventory" class="ml-auto text-xs text-amber-600 hover:underline font-semibold">Ver inventario →</a>
            </div>
            <div class="space-y-2">
              @for (alert of overview()!.inventoryAlerts; track alert.id) {
                <div class="flex items-center justify-between py-1.5 px-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
                  <span class="text-sm text-slate-700 dark:text-slate-300 truncate mr-3">{{ alert.name }}</span>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-xs text-slate-500">Mín: {{ alert.minimumStock }}</span>
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                      [class.bg-red-100]="alert.totalStock === 0"
                      [class.text-red-700]="alert.totalStock === 0"
                      [class.bg-amber-100]="alert.totalStock > 0"
                      [class.text-amber-700]="alert.totalStock > 0">
                      {{ alert.totalStock === 0 ? 'Agotado' : 'Stock: ' + alert.totalStock }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Revenue by Branch -->
        @if (branchRevenue().length > 0) {
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="section-heading mb-0">Ingresos por Sucursal</h3>
              @if (isPremiumOrHigher()) {
                <button (click)="exportExcel()" class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Exportar Excel
                </button>
              }
            </div>
            <div class="space-y-3">
              @for (branch of branchRevenue(); track branch.branchId) {
                <div>
                  <div class="flex justify-between text-xs mb-1.5">
                    <span class="font-medium text-slate-700 dark:text-slate-300">{{ branch.branchName }}</span>
                    <div class="flex gap-2 items-center">
                      <span class="text-slate-400">{{ branch.count }} citas</span>
                      <span class="font-bold text-slate-900 dark:text-white">Bs. {{ branch.revenue | number:'1.0-0' }}</span>
                      <span class="text-emerald-600 font-semibold">{{ branch.percentage }}%</span>
                    </div>
                  </div>
                  <div class="progress">
                    <div class="progress-bar bg-primary-500" [style.width.%]="branch.percentage"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- ═══ SECCIONES PREMIUM ═══ -->
        @if (isPremiumOrHigher()) {

          <!-- Análisis Financiero Avanzado -->
          <div class="card p-5 border-t-[3px] border-t-violet-500 relative overflow-hidden">
            <div class="absolute -top-8 -right-8 w-36 h-36 bg-violet-400/10 dark:bg-violet-400/5 rounded-full blur-3xl pointer-events-none"></div>
            <div class="flex items-center justify-between mb-4 flex-wrap gap-2 relative">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/30">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                </div>
                <h3 class="section-heading mb-0">Análisis Financiero Avanzado</h3>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                  <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  PREMIUM
                </span>
              </div>
              <div class="flex gap-2">
                <button (click)="exportExcel()" class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Excel
                </button>
                <button (click)="printReport()" class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                  Imprimir
                </button>
              </div>
            </div>
            @if (overview()) {
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <!-- Ingresos cobrados -->
                <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/30">
                  <p class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Ingresos cobrados
                  </p>
                  <p class="text-2xl font-bold text-emerald-700 dark:text-emerald-300">Bs. {{ overview()!.financial.totalRevenue | number:'1.0-0' }}</p>
                  <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    @if (overview()!.financial.revenueGrowth >= 0) {
                      <span class="kpi-delta-up">+{{ overview()!.financial.revenueGrowth | number:'1.0-1' }}%</span>
                    } @else {
                      <span class="kpi-delta-down">{{ overview()!.financial.revenueGrowth | number:'1.0-1' }}%</span>
                    }
                    vs período anterior
                  </p>
                </div>
                <!-- Ticket promedio -->
                <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                  <p class="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    Ticket promedio
                  </p>
                  <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">Bs. {{ overview()!.financial.avgTicket | number:'1.0-0' }}</p>
                  <p class="text-xs text-blue-500 mt-1">Por cita completada</p>
                </div>
                <!-- Comparativa -->
                <div class="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 border border-violet-100 dark:border-violet-800/30">
                  <p class="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    Período anterior
                  </p>
                  <p class="text-2xl font-bold text-violet-700 dark:text-violet-300">Bs. {{ overview()!.financial.prevRevenue | number:'1.0-0' }}</p>
                  <p class="text-xs text-violet-500 mt-1">Para comparación</p>
                </div>
              </div>

              <!-- Barra de progreso comparativa -->
              <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">Ingresos actuales vs período anterior</p>
                  @if (overview()!.financial.prevRevenue > 0) {
                    <span class="text-xs font-bold" [class.text-emerald-600]="overview()!.financial.revenueGrowth >= 0" [class.text-red-500]="overview()!.financial.revenueGrowth < 0">
                      {{ overview()!.financial.revenueGrowth >= 0 ? '+' : '' }}{{ overview()!.financial.revenueGrowth | number:'1.0-1' }}%
                    </span>
                  }
                </div>
                <div class="space-y-2">
                  <div>
                    <div class="flex justify-between text-xs mb-1 text-slate-500">
                      <span>Actual</span>
                      <span class="font-semibold text-slate-700 dark:text-slate-300">Bs. {{ overview()!.financial.totalRevenue | number:'1.0-0' }}</span>
                    </div>
                    <div class="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div class="h-full bg-emerald-500 rounded-full transition-all"
                        [style.width.%]="revenueActualPct()"></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between text-xs mb-1 text-slate-500">
                      <span>Anterior</span>
                      <span class="font-semibold text-slate-700 dark:text-slate-300">Bs. {{ overview()!.financial.prevRevenue | number:'1.0-0' }}</span>
                    </div>
                    <div class="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div class="h-full bg-slate-400 rounded-full transition-all"
                        [style.width.%]="revenuePrevPct()"></div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Rendimiento por Doctor (solo si hay topDoctor) -->
          @if (overview()?.topDoctor) {
            <div class="card p-5 border-t-[3px] border-t-emerald-500 relative overflow-hidden">
              <div class="absolute -bottom-6 -right-6 w-28 h-28 bg-emerald-400/10 dark:bg-emerald-400/5 rounded-full blur-2xl pointer-events-none"></div>
              <div class="flex items-center justify-between mb-4 relative">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/30">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  </div>
                  <h3 class="section-heading mb-0">Rendimiento Médico</h3>
                </div>
                <a routerLink="/doctors" class="text-xs text-primary-600 dark:text-primary-400 hover:underline font-semibold">Ver doctores →</a>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="sm:col-span-2 bg-gradient-to-r from-primary-50 to-violet-50 dark:from-primary-900/20 dark:to-violet-900/20 rounded-xl p-4 border border-primary-100 dark:border-primary-800/30 flex items-center gap-4">
                  <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold shadow-md shrink-0 text-base">#1</div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-0.5">Doctor más rentable del período</p>
                    <p class="text-lg font-bold text-slate-900 dark:text-white truncate">{{ overview()!.topDoctor?.name }}</p>
                    <p class="text-sm text-primary-700 dark:text-primary-300 font-semibold">Bs. {{ overview()!.topDoctor?.revenue | number:'1.2-2' }} en el período</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-1 gap-3">
                  <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                    <p class="text-xs text-slate-500 mb-1">Tasa de completado</p>
                    <p class="text-xl font-bold text-emerald-600">{{ overview()!.medical.completionRate }}%</p>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                    <p class="text-xs text-slate-500 mb-1">Retención pacientes</p>
                    <p class="text-xl font-bold text-violet-600">{{ overview()!.medical.retentionRate | number:'1.0-1' }}%</p>
                  </div>
                </div>
              </div>
              <!-- Métricas rápidas adicionales -->
              <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="text-center py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p class="text-xl font-bold text-slate-800 dark:text-white">{{ overview()!.medical.totalAppointments }}</p>
                  <p class="text-xs text-slate-500 mt-0.5">Total citas</p>
                </div>
                <div class="text-center py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                  <p class="text-xl font-bold text-emerald-700">{{ overview()!.medical.completedAppointments }}</p>
                  <p class="text-xs text-emerald-600 mt-0.5">Completadas</p>
                </div>
                <div class="text-center py-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30">
                  <p class="text-xl font-bold text-red-600">{{ overview()!.medical.cancelledAppointments }}</p>
                  <p class="text-xs text-red-500 mt-0.5">Canceladas</p>
                </div>
                <div class="text-center py-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800/30">
                  <p class="text-xl font-bold text-violet-700">{{ overview()!.medical.newPatients }}</p>
                  <p class="text-xs text-violet-600 mt-0.5">Nuevos pacientes</p>
                </div>
              </div>
            </div>
          }

          <!-- ══ Análisis Comercial ══ -->
          @if (commercialData()) {
            <div class="card p-5 border-t-[3px] border-t-cyan-500 relative overflow-hidden">
              <!-- Glow decoration -->
              <div class="absolute -top-10 -right-10 w-40 h-40 bg-cyan-400/10 dark:bg-cyan-400/5 rounded-full blur-3xl pointer-events-none"></div>
              <div class="absolute -bottom-8 -left-6 w-32 h-32 bg-blue-400/10 dark:bg-blue-400/5 rounded-full blur-2xl pointer-events-none"></div>

              <div class="flex items-center justify-between mb-5 flex-wrap gap-2 relative">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-cyan-500/30">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                  </div>
                  <h3 class="section-heading mb-0">Análisis Comercial</h3>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700">
                    <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    PREMIUM
                  </span>
                </div>
                <span class="text-[10px] text-slate-400 dark:text-slate-500">Mes actual</span>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">

                <!-- Top Tratamientos -->
                <div>
                  <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[.12em] mb-3 flex items-center gap-1.5">
                    <span class="inline-block w-4 h-[2px] bg-cyan-500 rounded-full"></span>
                    Top Tratamientos
                  </p>
                  @for (t of commercialData().byTreatment?.slice(0, 6) ?? []; track t.name; let i = $index) {
                    <div class="mb-3.5">
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate flex-1 mr-2">
                          {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.' }}
                          {{ t.name }}
                        </span>
                        <div class="text-right shrink-0 flex items-center gap-1.5">
                          <span class="text-xs font-bold" [style.color]="commercialColor(i)">
                            Bs. {{ t.revenue | number:'1.0-0' }}
                          </span>
                          <span class="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{{ t.count }}×</span>
                        </div>
                      </div>
                      <div class="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-700 ease-out"
                          [style.width.%]="treatPct(commercialData(), t.revenue)"
                          [style.background]="'linear-gradient(90deg,' + commercialColor(i) + ',' + commercialColor(i) + '88)'">
                        </div>
                      </div>
                    </div>
                  }
                  @if (!commercialData().byTreatment?.length) {
                    <p class="text-xs text-slate-400 italic mt-4">Sin tratamientos en el período</p>
                  }
                </div>

                <!-- Métodos de Pago -->
                <div>
                  <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[.12em] mb-3 flex items-center gap-1.5">
                    <span class="inline-block w-4 h-[2px] bg-emerald-500 rounded-full"></span>
                    Métodos de Pago
                  </p>

                  @for (m of commercialData().byMethod ?? []; track m.method; let i = $index) {
                    <div class="flex items-center gap-3 mb-2.5">
                      <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm"
                        [style.background]="methodColor(i)">
                        {{ m.method?.charAt(0) ?? '?' }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center mb-0.5">
                          <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ m.method }}</span>
                          <span class="text-xs font-bold" [style.color]="methodColor(i)">
                            Bs. {{ m.amount | number:'1.0-0' }}
                          </span>
                        </div>
                        <div class="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all duration-700 ease-out"
                            [style.width.%]="m.percentage"
                            [style.background]="methodColor(i)">
                          </div>
                        </div>
                      </div>
                      <span class="text-[10px] font-bold text-slate-400 w-8 text-right shrink-0">{{ m.percentage }}%</span>
                    </div>
                  }

                  @if (commercialData().byMethod?.length) {
                    <div class="mt-3 p-3 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/10 rounded-xl border border-cyan-100 dark:border-cyan-800/30">
                      <p class="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-0.5">Total Cobrado este Mes</p>
                      <p class="text-xl font-black text-cyan-700 dark:text-cyan-300">
                        Bs. {{ commercialData().summary?.totalRevenue | number:'1.0-0' }}
                      </p>
                      <div class="flex items-center gap-3 mt-1.5">
                        <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {{ commercialData().summary?.collectionRate }}% cobrado
                        </span>
                        <span class="text-[10px] text-slate-400">·</span>
                        <span class="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          {{ commercialData().summary?.completionRate }}% completado
                        </span>
                      </div>
                    </div>
                  }
                  @if (!commercialData().byMethod?.length) {
                    <p class="text-xs text-slate-400 italic mt-4">Sin pagos registrados en el período</p>
                  }
                </div>

              </div>
            </div>
          }

          <!-- Reportes y Exportación -->
          <div class="card p-5 border-t-[3px] border-t-amber-400 relative overflow-hidden">
            <div class="absolute -top-6 -left-6 w-28 h-28 bg-amber-400/10 dark:bg-amber-400/5 rounded-full blur-2xl pointer-events-none"></div>
            <div class="flex items-center justify-between mb-4 relative">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-400/30">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <h3 class="section-heading mb-0">Reportes y Exportación</h3>
              </div>
              <button (click)="openReportModal()" class="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Seleccionar Período
              </button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button (click)="exportExcel()"
                class="group flex flex-col items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/30 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/40 transition-colors">
                  <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <span class="text-xs font-semibold text-emerald-700 dark:text-emerald-300 text-center">Exportar Excel</span>
                <span class="text-[10px] text-emerald-500 dark:text-emerald-400">Datos del período</span>
              </button>
              <button (click)="printReport()"
                class="group flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                  <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                </div>
                <span class="text-xs font-semibold text-blue-700 dark:text-blue-300 text-center">Imprimir Reporte PDF</span>
                <span class="text-[10px] text-blue-500 dark:text-blue-400">Con logo de la clínica</span>
              </button>
              <button (click)="openReportModal()"
                class="group flex flex-col items-center gap-2 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800/30 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                <div class="w-10 h-10 bg-violet-100 dark:bg-violet-900/40 rounded-xl flex items-center justify-center group-hover:bg-violet-200 dark:group-hover:bg-violet-800/40 transition-colors">
                  <svg class="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </div>
                <span class="text-xs font-semibold text-violet-700 dark:text-violet-300 text-center">Reporte por Rango</span>
                <span class="text-[10px] text-violet-500 dark:text-violet-400">Elegir fechas</span>
              </button>
            </div>

            <!-- Minireporte de Comisiones y Cuentas por Cobrar -->
            @if (overview()) {
              <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                  <div>
                    <p class="text-xs font-bold text-amber-700 dark:text-amber-400">Comisiones del período</p>
                    <p class="text-sm font-semibold text-amber-600 dark:text-amber-300 mt-0.5">Ver detalle completo en Comisiones</p>
                  </div>
                  <a routerLink="/commissions" class="btn-secondary text-xs px-2.5 py-1">Ver →</a>
                </div>
                <div class="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/30">
                  <div>
                    <p class="text-xs font-bold text-rose-700 dark:text-rose-400">Cuentas por cobrar</p>
                    <p class="text-sm font-semibold text-rose-600 dark:text-rose-300 mt-0.5">Saldos pendientes de pacientes</p>
                  </div>
                  <a routerLink="/accounts-receivable" class="btn-secondary text-xs px-2.5 py-1">Ver →</a>
                </div>
              </div>
            }
          </div>

        } @else if (!isSuperAdmin()) {
          <!-- Banner de Upgrade para plan BASIC -->
          <div class="card p-5 border border-amber-200 dark:border-amber-800/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-amber-800 dark:text-amber-300">Desbloquea el plan PREMIUM</p>
                <p class="text-xs text-amber-700 dark:text-amber-400 mt-0.5 mb-3">
                  Accede a análisis financiero avanzado, reportes imprimibles, exportación CSV, rendimiento por doctor, múltiples sucursales y mucho más.
                </p>
                <div class="flex flex-wrap gap-2">
                  @for (feat of premiumFeatures; track feat) {
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 font-medium">
                      <svg class="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                      {{ feat }}
                    </span>
                  }
                </div>
              </div>
            </div>
          </div>
        }

      }
    </div>

    <!-- Modal Reporte por Rango de Fechas -->
    @if (reportModal()) {
      <div class="modal-overlay" (click)="reportModal.set(false)">
        <div class="modal-center">
          <div class="modal max-w-sm animate-slide-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Seleccionar Período del Reporte</h2>
              <button (click)="reportModal.set(false)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body space-y-4">
              <div>
                <label class="label">Desde</label>
                <input type="date" [(ngModel)]="reportDateFrom" class="input">
              </div>
              <div>
                <label class="label">Hasta</label>
                <input type="date" [(ngModel)]="reportDateTo" class="input">
              </div>
              <div class="flex gap-2 flex-wrap">
                <button (click)="setReportPreset('month')" class="btn-secondary text-xs px-3 py-1.5">Este mes</button>
                <button (click)="setReportPreset('lastMonth')" class="btn-secondary text-xs px-3 py-1.5">Mes anterior</button>
                <button (click)="setReportPreset('quarter')" class="btn-secondary text-xs px-3 py-1.5">Trimestre</button>
                <button (click)="setReportPreset('year')" class="btn-secondary text-xs px-3 py-1.5">Este año</button>
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="reportModal.set(false)" class="btn-secondary">Cancelar</button>
              <button (click)="printReportRange()" class="btn-secondary flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                Imprimir
              </button>
              <button (click)="exportExcelRange()" class="btn-primary flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Exportar Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    }

  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private branchCtx = inject(BranchContextService);

  loading = signal(true);
  overview = signal<DashboardOverview | null>(null);
  branchRevenue = signal<{ branchId: string; branchName: string; revenue: number; count: number; percentage: number }[]>([]);
  selectedPeriod = signal<string>('month');
  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  showBriefingBanner = signal(false);
  briefingExpanded = signal(true);
  hasInventoryAlerts = computed(() => (this.overview()?.inventoryAlerts?.length ?? 0) > 0);
  planSlug = computed(() => this.auth.currentUser()?.planSlug ?? null);
  isPremiumOrHigher = this.auth.isPremiumOrHigher;
  reportModal = signal(false);
  reportDateFrom = new Date(new Date().setDate(1)).toISOString().slice(0, 10);
  reportDateTo = new Date().toISOString().slice(0, 10);
  isPlatinum = this.auth.isPlatinum;
  commercialData = signal<any>(null);

  planLabel = computed(() => {
    const s = this.planSlug();
    if (s === 'platinum') return 'PLATINUM';
    if (s === 'premium') return 'PREMIUM';
    if (s === 'basic') return 'BASIC';
    return s ? s.toUpperCase() : null;
  });

  periods = [
    { label: 'Hoy', value: 'today' },
    { label: 'Semana', value: 'week' },
    { label: 'Mes', value: 'month' },
    { label: 'Año', value: 'year' },
  ];

  today() {
    return new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  constructor() {
    effect(() => {
      this.branchCtx.activeBranchId(); // track branch changes
      this.loadData();
    });
  }

  ngOnInit() {}
  ngOnDestroy() {}

  private checkBriefingVisibility(data: DashboardOverview) {
    const hasCritical = (data.inventoryAlerts?.length ?? 0) > 0;
    if (hasCritical) {
      // Siempre mostrar si hay alertas críticas
      this.showBriefingBanner.set(true);
      this.briefingExpanded.set(true);
      return;
    }
    // Mostrar solo si el usuario no eligió "No mostrar hoy"
    const today = new Date().toISOString().slice(0, 10);
    const dismissed = localStorage.getItem('briefing-dismissed');
    this.showBriefingBanner.set(dismissed !== today);
    this.briefingExpanded.set(dismissed !== today);
  }

  dismissBriefingToday() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('briefing-dismissed', today);
    this.showBriefingBanner.set(false);
  }

  loadData() {
    this.loading.set(true);
    const branchId = this.branchCtx.activeBranchId() || undefined;
    const params: any = { period: this.selectedPeriod() };
    if (branchId) params.branchId = branchId;
    this.api.get<DashboardOverview>('/dashboard/overview', params)
      .subscribe({
        next: data => {
          this.overview.set(data);
          this.loading.set(false);
          this.checkBriefingVisibility(data);
        },
        error: () => this.loading.set(false),
      });
    this.api.get<any[]>('/dashboard/by-branch', { period: this.selectedPeriod() }).subscribe({
      next: (data: any) => this.branchRevenue.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
    if (this.isPremiumOrHigher()) {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const to = now.toISOString().slice(0, 10);
      this.api.get<any>('/dashboard/report', { dateFrom: from, dateTo: to }).subscribe({
        next: (data: any) => this.commercialData.set(data),
        error: () => {},
      });
    }
  }

  exportCsv() { this.openReportModal(); }

  openReportModal() { this.reportModal.set(true); }

  setReportPreset(preset: string) {
    const now = new Date();
    let from: Date, to: Date;
    if (preset === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1); to = now;
    } else if (preset === 'lastMonth') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === 'quarter') {
      from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); to = now;
    } else {
      from = new Date(now.getFullYear(), 0, 1); to = now;
    }
    this.reportDateFrom = from.toISOString().slice(0, 10);
    this.reportDateTo = to.toISOString().slice(0, 10);
  }

  exportExcelRange() {
    this.reportModal.set(false);
    this.exportExcel(this.reportDateFrom, this.reportDateTo);
  }

  printReportRange() {
    this.reportModal.set(false);
    this.printReport(this.reportDateFrom, this.reportDateTo);
  }

  exportExcel(dateFrom?: string, dateTo?: string) {
    const user = this.auth.currentUser();
    const tenantName = (user as any)?.tenant?.name ?? 'Clínica';
    const from = dateFrom ?? new Date(new Date().setDate(1)).toISOString().slice(0, 10);
    const to = dateTo ?? new Date().toISOString().slice(0, 10);
    const periodoLabel = `${from.split('-').reverse().join('/')} al ${to.split('-').reverse().join('/')}`;
    const generado = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    this.api.get<any>('/dashboard/report', { dateFrom: from, dateTo: to }).subscribe({
      next: (r: any) => {
        if (!r) return;

        const methodLabels: Record<string, string> = {
          CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', QR: 'QR', OTHER: 'Otro',
        };
        const statusLabels: Record<string, string> = {
          SCHEDULED: 'Programada', CONFIRMED: 'Confirmada', WAITING: 'En sala',
          IN_PROGRESS: 'En curso', COMPLETED: 'Completada', CANCELLED: 'Cancelada',
          NO_SHOW: 'No se presentó', RESCHEDULED: 'Reprogramada',
        };
        const payLabels: Record<string, string> = { PAID: 'Pagado', PARTIAL: 'Parcial', PENDING: 'Pendiente' };

        // Compute accounts receivable from appointments
        const cxcList = (r.appointments ?? [])
          .filter((a: any) => a.estadoPago !== 'PAID' && Number(a.total || 0) > 0 && a.estado !== 'Cancelada' && a.estado !== 'CANCELLED')
          .map((a: any) => ({
            paciente: a.paciente, telefono: a.telefono || '—', fecha: a.fecha,
            doctor: a.doctor, total: Number(a.total || 0),
            pagado: Number(a.pagado || 0), pendiente: Number(a.total || 0) - Number(a.pagado || 0),
          }))
          .filter((a: any) => a.pendiente > 0.009)
          .sort((a: any, b: any) => b.pendiente - a.pendiente);
        const totalCxC = cxcList.reduce((s: number, a: any) => s + a.pendiente, 0);

        // ── HTML Excel helpers — ALL colors via inline style (no CSS class backgrounds in Excel)
        const C = 11; // total columns
        const IS = {
          hdr: 'font-weight:bold;color:#1E40AF;background-color:#DBEAFE;border-bottom:2px solid #93C5FD;text-align:center;font-size:9.5pt;padding:5px 8px;',
          even: 'background-color:#F1F5F9;',
          tot: 'font-weight:bold;color:#1E3A8A;background-color:#DBEAFE;border-top:2px solid #3B82F6;padding:5px 8px;',
          kl: 'font-weight:bold;color:#334155;background-color:#F1F5F9;border:1px solid #E2E8F0;padding:4px 10px;',
          kv:  'font-size:13pt;font-weight:bold;color:#1E40AF;background-color:#EFF6FF;text-align:right;border:1px solid #BFDBFE;padding:4px 10px;',
          kvg: 'font-size:13pt;font-weight:bold;color:#15803D;background-color:#F0FDF4;text-align:right;border:1px solid #BBF7D0;padding:4px 10px;',
          kvr: 'font-size:13pt;font-weight:bold;color:#DC2626;background-color:#FEF2F2;text-align:right;border:1px solid #FECACA;padding:4px 10px;',
          kva: 'font-size:13pt;font-weight:bold;color:#D97706;background-color:#FFFBEB;text-align:right;border:1px solid #FDE68A;padding:4px 10px;',
          num: 'text-align:right;padding:4px 8px;',
          numTot: 'font-weight:bold;text-align:right;color:#1E3A8A;background-color:#DBEAFE;border-top:2px solid #3B82F6;padding:5px 8px;',
          numEven: 'text-align:right;background-color:#F1F5F9;padding:4px 8px;',
        };
        const td = (v: string | number, sty = '', span = 1) =>
          `<td${span > 1 ? ` colspan="${span}"` : ''}${sty ? ` style="${sty}"` : ''}>${v ?? ''}</td>`;
        const num = (v: number, even = false) =>
          `<td style="${even ? IS.numEven : IS.num}" x:num="${v}">${Number(v || 0).toFixed(2)}</td>`;
        const int = (v: number, even = false) =>
          `<td style="${even ? IS.numEven : IS.num}mso-number-format:'\\#\\,\\#\\#0';" x:num="${v}">${Math.round(Number(v || 0))}</td>`;
        const pct = (v: number) => `<td style="${IS.num}">${v}%</td>`;
        const blank = (n = 1) => `<td></td>`.repeat(n);
        const blankRow = () => `<tr>${blank(C)}</tr>`;
        const secRow = (title: string) =>
          `<tr><td colspan="${C}" style="font-size:12pt;font-weight:bold;color:#FFFFFF;background-color:#1565C0;border-left:6px solid #42A5F5;padding:7px 14px;letter-spacing:.02em;">${title}</td></tr>`;
        const hdrRow = (...labels: string[]) =>
          `<tr>${labels.map(l => `<td style="${IS.hdr}">${l}</td>`).join('')}${blank(C - labels.length)}</tr>`;
        const eRow = (i: number, ...cells: string[]) =>
          `<tr style="${i % 2 ? IS.even : ''}">${cells.join('')}${blank(C - cells.length)}</tr>`;
        const totRow = (...cells: string[]) =>
          `<tr style="${IS.tot}">${cells.join('')}${blank(C - cells.length)}</tr>`;

        const xls = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:x="urn:schemas-microsoft-com:office:excel"
xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<style>
  *{font-family:Calibri,'Segoe UI',Arial;font-size:10pt;color:#1E293B;}
  table{border-collapse:collapse;width:100%;}
  td{padding:4px 8px;border:1px solid transparent;vertical-align:middle;white-space:nowrap;}
  .t1{font-size:18pt;font-weight:bold;color:#0F172A;border:none;padding-bottom:2px;}
  .t2{font-size:10pt;color:#64748B;font-style:italic;border:none;}
  .good{color:#16A34A;font-weight:bold;}
  .warn{color:#DC2626;font-weight:bold;}
  .medal{text-align:center;}
</style>
</head><body>
<table>
  <tr><td colspan="${C}" class="t1">${tenantName} &nbsp;·&nbsp; Reporte Clínico Completo</td></tr>
  <tr><td colspan="${C}" class="t2">Período: ${periodoLabel} &nbsp;·&nbsp; ${generado} &nbsp;·&nbsp; ClinicOS</td></tr>
  ${blankRow()}

  <!-- 1. KPIs PRINCIPALES -->
  ${secRow('1. RESUMEN EJECUTIVO — INDICADORES CLAVE')}
  <tr>
    ${td('Ingresos Cobrados (Bs.)', IS.kl, 2)}<td style="${IS.kv}" x:num="${r.summary.totalRevenue}">${Number(r.summary.totalRevenue||0).toFixed(2)}</td>
    ${td('', '', 1)}
    ${td('Total de Citas', IS.kl, 2)}<td style="${IS.kvg}" x:num="${r.summary.total}">${r.summary.total}</td>
    ${td('', '', 1)}
    ${td('Tasa de Completado', IS.kl, 2)}<td style="${IS.kv}">${r.summary.completionRate}%</td>
  </tr>
  <tr>
    ${td('Pendiente por Cobrar (Bs.)', IS.kl, 2)}<td style="${IS.kvr}" x:num="${r.summary.pendingRevenue}">${Number(r.summary.pendingRevenue||0).toFixed(2)}</td>
    ${td('', '', 1)}
    ${td('Citas Completadas', IS.kl, 2)}<td style="${IS.kvg}" x:num="${r.summary.completed}">${r.summary.completed}</td>
    ${td('', '', 1)}
    ${td('No Se Presentaron', IS.kl, 2)}<td style="${IS.kvr}" x:num="${r.summary.noShow}">${r.summary.noShow}</td>
  </tr>
  <tr>
    ${td('Ticket Promedio (Bs.)', IS.kl, 2)}<td style="${IS.kv}" x:num="${r.summary.avgTicket}">${Number(r.summary.avgTicket||0).toFixed(2)}</td>
    ${td('', '', 1)}
    ${td('Canceladas', IS.kl, 2)}<td style="${IS.kvr}" x:num="${r.summary.cancelled}">${r.summary.cancelled}</td>
    ${td('', '', 1)}
    ${td('Tasa de Cobro', IS.kl, 2)}<td style="${IS.kv}">${r.summary.collectionRate}%</td>
  </tr>
  <tr>
    ${td('Total Cuentas por Cobrar (Bs.)', IS.kl, 2)}<td style="${IS.kva}" x:num="${totalCxC}">${totalCxC.toFixed(2)}</td>
    ${td('', '', 1)}
    ${td('Doctores Activos', IS.kl, 2)}<td style="${IS.kv}" x:num="${(r.byDoctor??[]).length}">${(r.byDoctor??[]).length}</td>
    ${td('', '', 1)}
    ${td('Citas Pendientes/En curso', IS.kl, 2)}<td style="${IS.kv}" x:num="${r.summary.pending}">${r.summary.pending}</td>
  </tr>
  ${blankRow()}

  <!-- 2. RENDIMIENTO POR DOCTOR -->
  ${(r.byDoctor??[]).length ? `
  ${secRow('2. RENDIMIENTO POR DOCTOR')}
  ${hdrRow('Rk.', 'Doctor', 'Citas', 'Ingresos (Bs.)', 'Ticket Prom. (Bs.)', '% Participación', 'Citas/día prom.')}
  ${(r.byDoctor??[]).map((d: any, i: number) => eRow(i,
    td(i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1), 'text-align:center;'),
    td(d.name, i%2?IS.even:''),
    int(d.count, !!( i%2)),
    num(d.revenue, !!(i%2)),
    num(d.count > 0 ? d.revenue / d.count : 0, !!(i%2)),
    pct(d.percentage),
    td(Number(((d.count||0) / Math.max(1, (r.dailyRevenue??[]).filter((x:any)=>Number(x.revenue)>0).length))).toFixed(2), i%2?IS.even:'')
  )).join('')}
  ${totRow(td('TOTAL', IS.tot, 2), td(String(r.summary.completed), IS.numTot), td(Number(r.summary.totalRevenue||0).toFixed(2), IS.numTot), td('', IS.tot), td('100%', IS.numTot))}
  ${blankRow()}` : ''}

  <!-- 3. TOP TRATAMIENTOS -->
  ${(r.byTreatment??[]).length ? `
  ${secRow('3. TRATAMIENTOS MÁS REALIZADOS')}
  ${hdrRow('Rk.', 'Tratamiento', 'Cantidad', 'Ingresos (Bs.)', '% Participación')}
  ${(r.byTreatment??[]).slice(0,20).map((t: any, i: number) => eRow(i,
    td(i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1), 'medal'),
    td(t.name),
    int(t.count),
    num(t.revenue),
    pct(t.percentage ?? 0)
  )).join('')}
  ${blankRow()}` : ''}

  <!-- 4. MÉTODOS DE PAGO -->
  ${(r.byMethod??[]).length ? `
  ${secRow('4. MÉTODOS DE PAGO')}
  ${hdrRow('Método', 'Total Cobrado (Bs.)', '% Participación')}
  ${(r.byMethod??[]).map((m: any, i: number) => eRow(i,
    td(methodLabels[m.method] ?? m.method),
    num(m.amount),
    pct(m.percentage)
  )).join('')}
  ${totRow(td('TOTAL', IS.tot), td(Number(r.summary.totalRevenue||0).toFixed(2), IS.numTot), td('100%', IS.numTot))}
  ${blankRow()}` : ''}

  <!-- 5. INGRESOS POR SUCURSAL -->
  ${(r.byBranch??[]).length > 1 ? `
  ${secRow('5. INGRESOS POR SUCURSAL')}
  ${hdrRow('Sucursal', 'Citas', 'Ingresos (Bs.)')}
  ${(r.byBranch??[]).map((b: any, i: number) => eRow(i, td(b.name), int(b.count), num(b.revenue))).join('')}
  ${blankRow()}` : ''}

  <!-- 6. INGRESOS DIARIOS -->
  ${(r.dailyRevenue??[]).length ? `
  ${secRow('6. INGRESOS DIARIOS')}
  ${hdrRow('Fecha', 'Ingresos (Bs.)', 'Acumulado (Bs.)')}
  ${(() => {
    let acc = 0;
    return (r.dailyRevenue??[]).map((d: any, i: number) => {
      acc += Number(d.revenue||0);
      return eRow(i, td(d.date), num(Number(d.revenue||0)), num(acc));
    }).join('');
  })()}
  ${blankRow()}` : ''}

  <!-- 7. CUENTAS POR COBRAR -->
  ${cxcList.length ? `
  ${secRow(`7. CUENTAS POR COBRAR (${cxcList.length} PACIENTES — Bs. ${totalCxC.toFixed(2)})`)}
  ${hdrRow('Paciente', 'Teléfono', 'Fecha Cita', 'Doctor', 'Total (Bs.)', 'Pagado (Bs.)', 'Saldo (Bs.)')}
  ${cxcList.slice(0,60).map((a: any, i: number) => eRow(i,
    td(a.paciente, i%2?IS.even:''),
    td(a.telefono, i%2?IS.even:''),
    td(a.fecha, i%2?IS.even:''),
    td(a.doctor, i%2?IS.even:''),
    num(a.total, !!(i%2)),
    num(a.pagado, !!(i%2)),
    `<td style="${IS.num}font-weight:bold;color:#DC2626;${i%2?'background-color:#F1F5F9;':''}" x:num="${a.pendiente}">${a.pendiente.toFixed(2)}</td>`
  )).join('')}
  ${totRow(td('TOTAL CxC', IS.tot, 4), td('', IS.tot), td('', IS.tot), `<td style="${IS.numTot}color:#DC2626;" x:num="${totalCxC}">${totalCxC.toFixed(2)}</td>`)}
  ${blankRow()}` : ''}

  <!-- 8. DETALLE COMPLETO DE CITAS -->
  ${(r.appointments??[]).length ? `
  ${secRow(`8. DETALLE COMPLETO DE CITAS (${(r.appointments??[]).length} registros)`)}
  ${hdrRow('Fecha', 'Hora', 'Paciente', 'Teléfono', 'Doctor', 'Sucursal', 'Estado', 'Tratamientos', 'Total (Bs.)', 'Pagado (Bs.)', 'Pago')}
  ${(r.appointments??[]).map((a: any, i: number) => eRow(i,
    td(a.fecha), td(a.hora), td(a.paciente), td(a.telefono||'—'),
    td(a.doctor), td(a.sucursal), td(statusLabels[a.estado]??a.estado),
    td(a.tratamientos||'—'), num(Number(a.total||0)), num(Number(a.pagado||0)),
    td((payLabels[a.estadoPago] ?? a.estadoPago) || '—')
  )).join('')}
  ${blankRow()}` : ''}

  <!-- 9. NO SE PRESENTARON -->
  ${(r.noShowList??[]).length ? `
  ${secRow(`9. SEGUIMIENTO — NO SE PRESENTARON (${(r.noShowList??[]).length} pacientes)`)}
  ${hdrRow('Fecha', 'Hora', 'Paciente', 'Teléfono', 'Doctor')}
  ${(r.noShowList??[]).map((n: any, i: number) => eRow(i,
    td(n.fecha), td(n.hora), td(n.paciente), td(n.telefono||'—'), td(n.doctor)
  )).join('')}` : ''}

</table></body></html>`;

        const xlsBlob = new Blob(['\uFEFF' + xls], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const xlsUrl = URL.createObjectURL(xlsBlob);
        const a = document.createElement('a');
        a.href = xlsUrl;
        a.download = `reporte-clinico-${from}-al-${to}.xls`;
        a.click();
        URL.revokeObjectURL(xlsUrl);
      },
      error: () => alert('Error al generar el reporte. Intenta de nuevo.'),
    });
  }

  appointmentStatusItems() {
    const o = this.overview();
    if (!o) return [];
    const total = o.medical.totalAppointments || 1;
    const noShow = o.medical.noShowAppointments ?? 0;
    const pending = Math.max(0, total - o.medical.completedAppointments - o.medical.cancelledAppointments - noShow);
    return [
      { label: 'Completadas',    value: o.medical.completedAppointments, color: 'bg-emerald-500', pct: (o.medical.completedAppointments / total) * 100 },
      { label: 'Pendientes',     value: pending,                          color: 'bg-blue-400',    pct: (pending / total) * 100 },
      { label: 'No se presentó', value: noShow,                           color: 'bg-amber-400',   pct: (noShow / total) * 100 },
      { label: 'Canceladas',     value: o.medical.cancelledAppointments,  color: 'bg-red-400',     pct: (o.medical.cancelledAppointments / total) * 100 },
    ];
  }

  appointmentPieStyle = computed(() => {
    const o = this.overview();
    if (!o || o.medical.totalAppointments === 0) return 'conic-gradient(#e2e8f0 0% 100%)';
    const total = o.medical.totalAppointments;
    const noShow = o.medical.noShowAppointments ?? 0;
    const compPct  = (o.medical.completedAppointments / total) * 100;
    const canPct   = (o.medical.cancelledAppointments / total) * 100;
    const nsPct    = (noShow / total) * 100;
    const pendPct  = Math.max(0, 100 - compPct - canPct - nsPct);
    const c1 = compPct;
    const c2 = compPct + pendPct;
    const c3 = c2 + nsPct;
    // emerald=completadas, blue=pendientes, amber=no-show, red=canceladas
    return `conic-gradient(#10b981 0% ${c1.toFixed(1)}%, #60a5fa ${c1.toFixed(1)}% ${c2.toFixed(1)}%, #fbbf24 ${c2.toFixed(1)}% ${c3.toFixed(1)}%, #f87171 ${c3.toFixed(1)}% 100%)`;
  });

  revenueActualPct() {
    const o = this.overview();
    if (!o) return 0;
    const max = Math.max(o.financial.totalRevenue, o.financial.prevRevenue, 1);
    return Math.min((o.financial.totalRevenue / max) * 100, 100);
  }

  revenuePrevPct() {
    const o = this.overview();
    if (!o) return 0;
    const max = Math.max(o.financial.totalRevenue, o.financial.prevRevenue, 1);
    return Math.min((o.financial.prevRevenue / max) * 100, 100);
  }

  treatPct(data: any, revenue: number): number {
    const max = (data?.byTreatment ?? []).reduce((m: number, t: any) => Math.max(m, Number(t.revenue) || 0), 1);
    return Math.min(100, Math.round((Number(revenue) / max) * 100));
  }

  commercialColor(i: number): string {
    return ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][i % 6];
  }

  methodColor(i: number): string {
    return ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'][i % 5];
  }

  printReport(dateFrom?: string, dateTo?: string) {
    const user = this.auth.currentUser();
    const tenantName = (user as any)?.tenant?.name ?? 'Clínica';
    const clinic = this.branchCtx.activeClinic();
    const clinicAddress = clinic?.address || (user as any)?.tenant?.address || '';
    const from = dateFrom ?? new Date(new Date().setDate(1)).toISOString().slice(0, 10);
    const to = dateTo ?? new Date().toISOString().slice(0, 10);
    const periodoLabel = `${from.split('-').reverse().join('/')} al ${to.split('-').reverse().join('/')}`;
    const generado = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const plan = this.planLabel() ?? '';
    // Prefer active clinic logo, fallback to tenant logo
    const logoPath = clinic?.logoUrl || (user as any)?.tenant?.logoUrl || null;
    const clinicLogoUrl = logoPath ? this.api.getStaticUrl(logoPath) : null;

    this.api.get<any>('/dashboard/report', { dateFrom: from, dateTo: to }).subscribe({
      next: (r: any) => {
        if (!r) return;

        // ── Helpers
        const bs   = (n: number) => `Bs.&nbsp;${Number(n||0).toLocaleString('es-BO',{minimumFractionDigits:2})}`;
        const bsRaw = (n: number) => `Bs. ${Number(n||0).toFixed(2)}`;

        // ── Styles as JS constants
        const TS = 'width:100%;border-collapse:collapse;font-size:11px;';
        const TH = 'background:#f1f5f9;padding:7px 10px;font-size:9.5px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e2e8f0;text-align:left;';
        const TD = 'padding:7px 10px;border-bottom:1px solid #f1f5f9;color:#1e293b;';
        const TDR = TD + 'text-align:right;font-weight:600;';

        const SEC = (n: string, title: string) =>
          `<div style="display:flex;align-items:center;gap:10px;margin:22px 0 10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;">
             <div style="width:4px;height:20px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:2px;flex-shrink:0;"></div>
             <span style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.1em;background:#f1f5f9;padding:2px 8px;border-radius:20px;">${n}</span>
             <span style="font-size:14px;font-weight:800;color:#0f172a;">${title}</span>
           </div>`;

        const KPI = (label: string, value: string, sub: string, color: string, icon: string) =>
          `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;border-top:3px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,.04);">
             <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
               <span style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${color};">${label}</span>
               <span style="font-size:16px;line-height:1;">${icon}</span>
             </div>
             <p style="margin:0;font-size:19px;font-weight:900;color:#0f172a;line-height:1;">${value}</p>
             ${sub ? `<p style="margin:4px 0 0;font-size:9px;color:#94a3b8;">${sub}</p>` : ''}
           </div>`;

        const BAR = (p: number, color: string, h = 6) =>
          `<div style="background:#f1f5f9;border-radius:4px;height:${h}px;overflow:hidden;margin-top:3px;">
             <div style="width:${Math.min(100,Math.max(0,p))}%;height:100%;background:${color};border-radius:4px;transition:width .3s;"></div>
           </div>`;

        // ── Status colors & labels
        const ST_COLOR: Record<string,string> = {
          SCHEDULED:'#60a5fa', CONFIRMED:'#34d399', WAITING:'#fbbf24',
          IN_PROGRESS:'#a78bfa', COMPLETED:'#10b981', CANCELLED:'#f87171',
          NO_SHOW:'#f59e0b', RESCHEDULED:'#fb923c',
        };
        const ST_LABEL: Record<string,string> = {
          SCHEDULED:'Programada', CONFIRMED:'Confirmada', WAITING:'En sala',
          IN_PROGRESS:'En curso', COMPLETED:'Completada', CANCELLED:'Cancelada',
          NO_SHOW:'No se presentó', RESCHEDULED:'Reprogramada',
        };
        const DR_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316'];
        const MEDALS = ['🥇','🥈','🥉'];

        // ── SVG Donut builder (works universally — no conic-gradient needed)
        const buildDonutSVG = (segments: {color:string,count:number}[], total: number, cx=50,cy=50,r2=36,sw=15,size=100): string => {
          const circ = 2 * Math.PI * r2;
          let cum = 0;
          const paths = segments.map(seg => {
            const frac = total > 0 ? seg.count / total : 0;
            const dashLen = frac * circ;
            const dashOffset = -(cum * circ);
            cum += frac;
            return dashLen < 0.5 ? '' :
              `<circle cx="${cx}" cy="${cy}" r="${r2}" fill="none" stroke="${seg.color}" stroke-width="${sw}"
                stroke-dasharray="${dashLen.toFixed(3)} ${(circ).toFixed(3)}"
                stroke-dashoffset="${dashOffset.toFixed(3)}"
                transform="rotate(-90 ${cx} ${cy})"/>`;
          });
          return `<svg viewBox="0 0 ${size} ${size}" style="width:140px;height:140px;display:block;margin:0 auto;overflow:visible;">
            <circle cx="${cx}" cy="${cy}" r="${r2}" fill="none" stroke="#f1f5f9" stroke-width="${sw}"/>
            ${paths.join('')}
            <circle cx="${cx}" cy="${cy}" r="${r2-sw/2-1}" fill="white"/>
            <text x="${cx}" y="${cy-3}" text-anchor="middle" font-size="13" font-weight="900" fill="#0f172a" font-family="Arial">${total}</text>
            <text x="${cx}" y="${cy+9}" text-anchor="middle" font-size="6" fill="#94a3b8" letter-spacing=".06em" font-family="Arial">CITAS</text>
          </svg>`;
        };

        const buildPayDonutSVG = (segs: {color:string,amount:number}[], total: number): string =>
          buildDonutSVG(segs.map(s=>({color:s.color,count:s.amount})), total||1, 50,50,34,13,100);

        // ── Status donut (SVG)
        const stSegs = Object.entries(r.statusCounts ?? {}).filter(([_,c]:any) => c > 0)
          .map(([st,c]:any) => ({ color: ST_COLOR[st]??'#94a3b8', count: Number(c) }));
        const statusDonutSVG = buildDonutSVG(stSegs, r.summary.total);

        const donutLegend = Object.entries(r.statusCounts ?? {}).filter(([_,c]:any) => c > 0)
          .map(([st,c]:any) => {
            const p2 = r.summary.total > 0 ? Math.round((c/r.summary.total)*100) : 0;
            const bw = Math.round(p2 * 1.3);
            return `<div style="display:flex;align-items:center;gap:7px;margin-bottom:7px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${ST_COLOR[st]??'#94a3b8'};flex-shrink:0;display:inline-block;"></span>
              <span style="font-size:11px;color:#475569;flex:1;">${ST_LABEL[st]??st}</span>
              <div style="width:${Math.max(bw,2)}px;height:6px;background:${ST_COLOR[st]??'#94a3b8'};border-radius:3px;margin:0 6px;"></div>
              <span style="font-size:11px;font-weight:700;color:#1e293b;min-width:16px;text-align:right;">${c}</span>
              <span style="font-size:10px;color:#94a3b8;min-width:32px;text-align:right;">${p2}%</span>
            </div>`;
          }).join('');

        // ── Business Health Score (0-100)
        const compScore = Math.min(100, Math.max(0, ((r.summary.completionRate - 50) / 40) * 100));
        const collScore = Math.min(100, Math.max(0, ((r.summary.collectionRate - 50) / 40) * 100));
        const noShowScore = Math.min(100, Math.max(0, (1 - (r.summary.noShowRate / 25)) * 100));
        const healthScore = Math.round(compScore * 0.4 + collScore * 0.4 + noShowScore * 0.2);
        const healthColor = healthScore >= 75 ? '#10b981' : healthScore >= 50 ? '#f59e0b' : '#ef4444';
        const healthLabel = healthScore >= 75 ? 'SALUDABLE' : healthScore >= 50 ? 'MEJORABLE' : 'CRÍTICO';

        // ── Auto Risk Alerts (lenguaje amigable)
        const cxcListTmp = (r.appointments??[]).filter((a:any)=>a.estadoPago!=='PAID'&&Number(a.total||0)>0&&a.estado!=='CANCELLED').map((a:any)=>({pendiente:Number(a.total||0)-Number(a.pagado||0)})).filter((a:any)=>a.pendiente>0.009);
        const tmpCxC = cxcListTmp.reduce((s:number,a:any)=>s+a.pendiente,0);
        const pendingPatients = cxcListTmp.length;
        const alerts: string[] = [];
        if (r.summary.noShowRate > 15) alerts.push(`🔴 <strong>Muchos pacientes no llegaron a su cita (${r.summary.noShowRate}% de ausencia)</strong> — De cada 100 citas agendadas, ${Math.round(r.summary.noShowRate)} pacientes no se presentaron. Esto representa una pérdida estimada de ${bsRaw(r.summary.noShow * r.summary.avgTicket)}. Solución: activar confirmación automática por WhatsApp 24h y 1h antes de la cita.`);
        else if (r.summary.noShowRate > 10) alerts.push(`🟡 <strong>Algunos pacientes no asistieron a su cita (${r.summary.noShowRate}%)</strong> — Es un nivel moderado. Se recomienda enviar recordatorios automáticos para reducirlo por debajo del 10%.`);
        else if (r.summary.noShowRate > 0) alerts.push(`✅ <strong>Muy pocos pacientes ausentes (${r.summary.noShowRate}%)</strong> — Excelente. Los recordatorios están funcionando bien.`);
        if (r.summary.collectionRate < 70) alerts.push(`🔴 <strong>Hay dinero pendiente de cobro importante (${r.summary.collectionRate}% cobrado)</strong> — Solo se cobró el ${r.summary.collectionRate}% de los servicios atendidos. Quedan ${pendingPatients} paciente(s) con saldo sin pagar. Acción urgente: contactarlos antes del cierre de mes.`);
        else if (r.summary.collectionRate < 85) alerts.push(`🟡 <strong>Se puede mejorar el cobro de servicios (${r.summary.collectionRate}%)</strong> — La meta recomendada es 90%+. Ofrecer pago en cuotas a quienes tengan saldo pendiente puede ayudar.`);
        if (r.summary.completionRate < 60) alerts.push(`🔴 <strong>Menos de la mitad de las citas se completaron (${r.summary.completionRate}%)</strong> — Solo ${r.summary.completed} de ${r.summary.total} citas llegaron a término. Revisar el proceso de confirmación y reagendamiento.`);
        if (tmpCxC > r.summary.totalRevenue * 0.3 && tmpCxC > 100) alerts.push(`🔴 <strong>El dinero pendiente de cobro es muy alto (${bsRaw(tmpCxC)})</strong> — Representa más del 30% de lo cobrado en el período. Se recomienda iniciar gestión activa de cobro con los ${pendingPatients} pacientes afectados.`);
        if (r.summary.completionRate >= 85) alerts.push(`✅ <strong>Excelente porcentaje de citas completadas (${r.summary.completionRate}%)</strong> — Supera el promedio de clínicas similares (75%). ¡Sigan así!`);
        if (r.summary.collectionRate >= 90) alerts.push(`✅ <strong>Cobro de servicios en nivel óptimo (${r.summary.collectionRate}%)</strong> — Solo el ${100-r.summary.collectionRate}% queda pendiente. Muy buena gestión de pagos.`);

        // ── Revenue trend SVG (bars + cumulative line)
        let revChartHtml = '';
        if ((r.dailyRevenue??[]).length > 1) {
          const maxR = r.dailyRevenue.reduce((m:number,d:any)=>Math.max(m,Number(d.revenue)||0), 1);
          const n = r.dailyRevenue.length;
          const bw = Math.max(5, Math.floor(530/n)-2);
          const gap = 2;
          const cH = 80;
          const totalW = n*(bw+gap);
          let cumAcc = 0;
          const cumRevs = r.dailyRevenue.map((d:any) => { cumAcc += Number(d.revenue)||0; return cumAcc; });
          const maxCum = cumAcc || 1;
          // Bars
          const rects = r.dailyRevenue.map((d:any,i:number) => {
            const h = Number(d.revenue)>0?Math.max(3,Math.round((Number(d.revenue)/maxR)*cH)):2;
            return `<rect x="${i*(bw+gap)}" y="${cH-h}" width="${bw}" height="${h}" fill="${Number(d.revenue)>0?'#3b82f6':'#e2e8f0'}" rx="1.5" opacity=".9"/>`;
          }).join('');
          // Cumulative line
          const pts = r.dailyRevenue.map((d:any,i:number) => `${i*(bw+gap)+bw/2},${cH - Math.round((cumRevs[i]/maxCum)*cH)}`).join(' ');
          const lineEl = `<polyline points="${pts}" fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="2 1" opacity=".7"/>`;
          const dotEls = r.dailyRevenue.map((_:any,i:number) => `<circle cx="${i*(bw+gap)+bw/2}" cy="${cH-Math.round((cumRevs[i]/maxCum)*cH)}" r="2" fill="#10b981" opacity=".7"/>`).join('');
          // Axis labels
          const step = Math.max(1, Math.ceil(n/10));
          const xLbls = r.dailyRevenue.filter((_:any,i:number)=>i%step===0).map((d:any,idx:number)=>{
            const x=(idx*step)*(bw+gap)+bw/2;
            return `<text x="${x}" y="${cH+15}" font-size="7" fill="#94a3b8" text-anchor="middle">${(d.date??'').slice(5)}</text>`;
          }).join('');
          // Top 3 bar labels
          const top3 = [...r.dailyRevenue].map((d:any,i:number)=>({...d,_i:i})).sort((a:any,b:any)=>Number(b.revenue)-Number(a.revenue)).slice(0,3);
          const topLbls = top3.filter((d:any)=>Number(d.revenue)>0).map((d:any)=>{
            const h=Math.max(3,Math.round((Number(d.revenue)/maxR)*cH));
            return `<text x="${d._i*(bw+gap)+bw/2}" y="${cH-h-4}" font-size="7" fill="#1d4ed8" text-anchor="middle" font-weight="700">${Math.round(Number(d.revenue))}</text>`;
          }).join('');
          revChartHtml = `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;" class="no-break">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <div>
                <p style="margin:0;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Ingresos Diarios (Bs.)</p>
                <p style="margin:2px 0 0;font-size:9px;color:#94a3b8;">Barras azules = diario&nbsp;&nbsp;·&nbsp;&nbsp;Línea verde = acumulado</p>
              </div>
              <div style="text-align:right;">
                <p style="margin:0;font-size:10px;font-weight:700;color:#3b82f6;">Pico: ${bsRaw(maxR)}</p>
                <p style="margin:2px 0 0;font-size:10px;font-weight:700;color:#10b981;">Acumulado: ${bsRaw(cumAcc)}</p>
              </div>
            </div>
            <svg viewBox="0 0 ${totalW} ${cH+20}" style="width:100%;height:110px;display:block;overflow:visible;" preserveAspectRatio="none">
              ${rects}${lineEl}${dotEls}${xLbls}${topLbls}
            </svg>
          </div>`;
        }

        // ── Doctor performance visual
        const doctorVisual = (r.byDoctor??[]).length > 0 ? `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;" class="no-break">
            <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Ranking de Ingresos por Doctor</p>
            ${(r.byDoctor??[]).slice(0,7).map((d:any,i:number)=>`
              <div style="margin-bottom:11px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                  <span style="font-size:11px;color:#1e293b;font-weight:${i<3?'700':'400'};">
                    ${MEDALS[i]??'&nbsp;&nbsp;'} ${d.name}
                  </span>
                  <div style="text-align:right;">
                    <span style="font-size:11px;font-weight:700;color:${DR_COLORS[i%8]};">${bs(d.revenue)}</span>
                    <span style="font-size:9.5px;color:#94a3b8;margin-left:8px;">${d.count} citas</span>
                  </div>
                </div>
                ${BAR(d.percentage, DR_COLORS[i%8], 9)}
                <span style="font-size:8.5px;color:#94a3b8;">${d.percentage}% del total · Ticket prom. ${bsRaw(d.count>0?d.revenue/d.count:0)}</span>
              </div>`).join('')}
          </div>` : '';

        // ── Treatments visual ranking
        const maxTreatRev = (r.byTreatment??[]).reduce((m:number,t:any)=>Math.max(m,Number(t.revenue)||0), 1);
        const treatVisual = (r.byTreatment??[]).length > 0 ? `
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:16px;" class="no-break">
            <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.05em;">Top Tratamientos</p>
            ${(r.byTreatment??[]).slice(0,8).map((t:any,i:number)=>`
              <div style="margin-bottom:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-size:11px;color:#1e293b;font-weight:${i<3?'700':'400'};">
                    ${MEDALS[i]??'&nbsp;&nbsp;'} ${t.name}
                  </span>
                  <div>
                    <span style="font-size:10px;font-weight:700;color:#7c3aed;">${bs(t.revenue)}</span>
                    <span style="margin-left:6px;font-size:9.5px;color:#94a3b8;">${t.count}×</span>
                  </div>
                </div>
                ${BAR((Number(t.revenue)/maxTreatRev)*100, '#8b5cf6', 7)}
              </div>`).join('')}
          </div>` : '';

        // ── Payment methods SVG donut (no conic-gradient)
        const methodColors = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444'];
        const totalPaid = (r.byMethod??[]).reduce((s:number,m:any)=>s+Number(m.amount||0), 0)||1;
        const paySegs = (r.byMethod??[]).map((m:any,i:number)=>({color:methodColors[i%5],amount:Number(m.amount||0)}));
        const methodDonutSVG = buildPayDonutSVG(paySegs, totalPaid);

        const methodVisual = (r.byMethod??[]).length > 0 ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;" class="no-break">
            <div style="display:grid;grid-template-columns:130px 1fr;gap:16px;align-items:center;">
              <div style="text-align:center;">
                ${methodDonutSVG}
                <p style="margin:4px 0 0;font-size:9px;font-weight:700;color:#16a34a;">${bs(totalPaid)}</p>
                <p style="margin:2px 0 0;font-size:8px;color:#94a3b8;">cobrado</p>
              </div>
              <div>
                ${(r.byMethod??[]).map((m:any,i:number)=>`
                  <div style="margin-bottom:9px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                      <div style="display:flex;align-items:center;gap:6px;">
                        <span style="width:9px;height:9px;border-radius:2px;background:${methodColors[i%5]};flex-shrink:0;display:inline-block;"></span>
                        <span style="font-size:11px;color:#1e293b;">${m.method}</span>
                      </div>
                      <div style="text-align:right;">
                        <span style="font-size:11px;font-weight:700;color:${methodColors[i%5]};">${bs(m.amount)}</span>
                        <span style="font-size:9.5px;color:#94a3b8;margin-left:6px;">${m.percentage}%</span>
                      </div>
                    </div>
                    ${BAR(m.percentage,methodColors[i%5],5)}
                  </div>`).join('')}
              </div>
            </div>
          </div>` : '';

        // ── Accounts Receivable (CxC) computed from appointments
        const cxcList = (r.appointments??[])
          .filter((a:any) => a.estadoPago !== 'PAID' && Number(a.total||0) > 0 && a.estado !== 'Cancelada' && a.estado !== 'CANCELLED')
          .map((a:any) => ({ ...a, pendiente: Number(a.total||0)-Number(a.pagado||0) }))
          .filter((a:any) => a.pendiente > 0.009)
          .sort((a:any,b:any) => b.pendiente-a.pendiente);
        const totalCxC = cxcList.reduce((s:number,a:any)=>s+a.pendiente, 0);
        const collRate = r.summary.totalRevenue + totalCxC > 0
          ? Math.round((r.summary.totalRevenue / (r.summary.totalRevenue + totalCxC)) * 100) : 100;

        const cxcSection = cxcList.length > 0 ? `
          ${SEC('CxC', 'Cuentas por Cobrar')}
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px;" class="no-break">
            ${KPI('Total pendiente', bsRaw(totalCxC), `${cxcList.length} pacientes con saldo`, '#f59e0b', '💳')}
            ${KPI('Ya cobrado', bsRaw(r.summary.totalRevenue), `${collRate}% de cobranza`, '#10b981', '✅')}
            ${KPI('Por facturar total', bsRaw(r.summary.totalRevenue + totalCxC), 'cobrado + pendiente', '#3b82f6', '📋')}
          </div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;margin-bottom:10px;" class="no-break">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
              <span style="font-size:10px;font-weight:700;color:#92400e;">Tasa de Cobranza</span>
              <span style="font-size:10px;font-weight:800;color:#92400e;">${collRate}%</span>
            </div>
            ${BAR(collRate, collRate >= 80 ? '#10b981' : collRate >= 60 ? '#f59e0b' : '#ef4444', 10)}
            <p style="margin:4px 0 0;font-size:9px;color:#92400e;">${collRate >= 80 ? 'Excelente' : collRate >= 60 ? 'Mejorable — considera seguimiento activo' : 'Crítico — se recomienda gestión de cobranza urgente'}</p>
          </div>
          <table style="${TS}" class="no-break">
            <thead><tr>
              <th style="${TH}">Paciente</th><th style="${TH}">Teléfono</th><th style="${TH}">Fecha cita</th><th style="${TH}">Doctor</th>
              <th style="${TH}text-align:right;">Total</th><th style="${TH}text-align:right;">Pagado</th><th style="${TH}text-align:right;">Saldo</th>
            </tr></thead>
            <tbody>
              ${cxcList.slice(0,20).map((a:any,i:number)=>`
                <tr style="${i%2?'background:#fffbeb;':''}">
                  <td style="${TD}font-weight:600;">${a.paciente}</td>
                  <td style="${TD}">${a.telefono||'—'}</td>
                  <td style="${TD}">${a.fecha}</td>
                  <td style="${TD}">${a.doctor}</td>
                  <td style="${TDR}">${bsRaw(Number(a.total||0))}</td>
                  <td style="${TDR}color:#16a34a;">${bsRaw(Number(a.pagado||0))}</td>
                  <td style="${TDR}color:#dc2626;font-size:12px;">${bsRaw(a.pendiente)}</td>
                </tr>`).join('')}
              <tr style="background:#fef3c7;font-weight:700;border-top:2px solid #f59e0b;">
                <td style="${TD}font-weight:800;" colspan="4">TOTAL CUENTAS POR COBRAR</td>
                <td style="${TDR}"></td><td style="${TDR}"></td>
                <td style="${TDR}color:#d97706;font-size:13px;">${bsRaw(totalCxC)}</td>
              </tr>
            </tbody>
          </table>` : '';

        // ── No-show follow-up
        const noShowSection = (r.noShowList??[]).length > 0 ? `
          <table style="${TS}" class="no-break">
            <thead><tr>
              <th style="${TH}">Fecha</th><th style="${TH}">Hora</th><th style="${TH}">Paciente</th><th style="${TH}">Teléfono</th><th style="${TH}">Doctor</th>
            </tr></thead>
            <tbody>
              ${(r.noShowList??[]).map((n:any,i:number)=>`
                <tr style="${i%2?'background:#fff8f0;':''}">
                  <td style="${TD}">${n.fecha}</td><td style="${TD}">${n.hora}</td>
                  <td style="${TD}font-weight:600;">${n.paciente}</td>
                  <td style="${TD}">${n.telefono||'—'}</td>
                  <td style="${TD}">${n.doctor}</td>
                </tr>`).join('')}
            </tbody>
          </table>` : '';

        // ── Branch table
        const branchSection = (r.byBranch??[]).length > 1 ? `
          <table style="${TS}" class="no-break">
            <thead><tr>
              <th style="${TH}">Sucursal</th><th style="${TH}text-align:right;">Citas</th><th style="${TH}text-align:right;">Ingresos</th><th style="${TH}">Participación</th>
            </tr></thead>
            <tbody>
              ${(r.byBranch??[]).map((b:any,i:number)=>`
                <tr style="${i%2?'background:#f8fafc;':''}">
                  <td style="${TD}font-weight:600;">${b.name}</td>
                  <td style="${TDR}">${b.count}</td>
                  <td style="${TDR}">${bs(b.revenue)}</td>
                  <td style="${TD}padding-left:14px;">${BAR(b.percentage??0,'#3b82f6',7)}<span style="font-size:9px;color:#64748b;">${b.percentage??0}%</span></td>
                </tr>`).join('')}
            </tbody>
          </table>` : '';

        const html = `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><title>${tenantName} — Reporte Clínico${clinicAddress ? ' · ' + clinicAddress : ''}</title>
<style>
  *{box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b;margin:0;padding:24px 32px;background:#fff;}
  @page{size:auto;margin:12mm 10mm 15mm;}
  @media print{body{padding:0 12px;}.no-break{page-break-inside:avoid;}.page-break{page-break-before:always;}}
</style>
</head><body>

<!-- ═══ COVER ═══ -->
<div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 45%,#0369a1 100%);border-radius:16px;padding:22px 28px;margin-bottom:18px;color:white;position:relative;overflow:hidden;">
  <div style="position:absolute;top:-20px;right:-20px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.05);"></div>
  <div style="position:absolute;bottom:-30px;right:80px;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.04);"></div>
  <div style="display:flex;align-items:center;justify-content:space-between;position:relative;">
    <div style="display:flex;align-items:center;gap:16px;">
      ${clinicLogoUrl ? `<img src="${clinicLogoUrl}" style="width:52px;height:52px;object-fit:contain;border-radius:10px;background:white;padding:3px;" onerror="this.style.display='none'">` : '<div style="width:52px;height:52px;border-radius:10px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:24px;">🏥</div>'}
      <div>
        <h1 style="margin:0;font-size:20px;font-weight:900;color:white;letter-spacing:-.02em;">${tenantName}</h1>
        <p style="margin:3px 0 0;font-size:10px;color:rgba(255,255,255,.7);">ClinicOS · Plan <strong style="color:rgba(255,255,255,.95);">${plan}</strong></p>
      </div>
    </div>
    <div style="text-align:right;">
      <!-- Health Score badge -->
      <div style="display:inline-block;background:${healthColor};border-radius:10px;padding:6px 14px;margin-bottom:8px;">
        <p style="margin:0;font-size:10px;font-weight:800;color:white;letter-spacing:.05em;">ÍNDICE SALUD: ${healthScore}/100</p>
        <p style="margin:1px 0 0;font-size:8px;color:rgba(255,255,255,.85);text-align:center;">${healthLabel}</p>
      </div>
      <p style="margin:0;font-size:13px;font-weight:800;color:white;letter-spacing:.02em;">REPORTE CLÍNICO COMPLETO</p>
      <p style="margin:3px 0 0;font-size:10px;color:rgba(255,255,255,.8);">Período: <strong>${periodoLabel}</strong></p>
      <p style="margin:2px 0 0;font-size:8.5px;color:rgba(255,255,255,.55);">${generado}</p>
    </div>
  </div>
</div>

<!-- ═══ 0. ALERTAS & RECOMENDACIONES ═══ -->
${alerts.length > 0 ? `
${SEC('⚡', 'Alertas y Recomendaciones Accionables')}
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:4px;" class="no-break">
  ${alerts.map(a=>`<p style="margin:0 0 7px;font-size:11px;color:#1e293b;line-height:1.5;">${a}</p>`).join('')}
  <p style="margin:7px 0 0;font-size:9px;color:#92400e;border-top:1px solid #fde68a;padding-top:5px;">
    💡 <em>Prioriza las acciones marcadas en 🔴 esta semana. Las 🟡 pueden planificarse para el mes próximo.</em>
  </p>
</div>` : ''}

<!-- ═══ 1. EXECUTIVE KPIs ═══ -->
${SEC('1', 'Resumen Ejecutivo — KPIs Críticos')}
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;" class="no-break">
  ${KPI('Ingresos Cobrados', bs(r.summary.totalRevenue), `Ticket prom: ${bsRaw(r.summary.avgTicket)}`, '#10b981', '💰')}
  ${KPI('Pendiente Cobrar', bs(r.summary.pendingRevenue ?? 0), `Cobranza: ${r.summary.collectionRate}%`, '#f59e0b', '⏳')}
  ${KPI('Citas Completadas', `${r.summary.completed} / ${r.summary.total}`, `${r.summary.completionRate}% tasa — meta 85%`, r.summary.completionRate>=85?'#10b981':r.summary.completionRate>=65?'#f59e0b':'#ef4444', '📅')}
  ${KPI('No Se Presentaron', `${r.summary.noShow} (${r.summary.noShowRate}%)`, r.summary.noShowRate>15?'⚠️ Supera umbral 15%':r.summary.noShowRate>10?'Monitorear':'Dentro del rango', r.summary.noShowRate>15?'#ef4444':r.summary.noShowRate>10?'#f59e0b':'#10b981', '❌')}
</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:10px;" class="no-break">
  ${KPI('Tasa de Cobro', `${r.summary.collectionRate}%`, r.summary.collectionRate>=90?'✅ Óptimo':r.summary.collectionRate>=70?'Mejorable':'⚠️ Crítico', r.summary.collectionRate>=90?'#059669':r.summary.collectionRate>=70?'#f59e0b':'#ef4444', '📊')}
  ${KPI('Canceladas', `${r.summary.cancelled} (${r.summary.cancellationRate}%)`, 'Contactar para reagendar', '#ef4444', '🚫')}
  ${KPI('Doctores Activos', String((r.byDoctor??[]).length), `${(r.byDoctor??[]).length} médico(s) este período`, '#8b5cf6', '👨‍⚕️')}
  ${KPI('Índice de Salud', `${healthScore}/100`, healthLabel, healthColor, '🏥')}
</div>

<!-- ═══ 2. REVENUE TREND ═══ -->
${revChartHtml ? `${SEC('2', 'Tendencia de Ingresos — Análisis Diario')}${revChartHtml}
<p style="font-size:9.5px;color:#64748b;margin:6px 0 0;padding:6px 10px;background:#f8fafc;border-radius:6px;">
  📈 <strong>Interpretación:</strong> Barras azules = ingresos del día · Línea verde = ingresos acumulados del período.
  ${r.dailyRevenue && r.dailyRevenue.length > 3 ? `Mayor concentración en días ${r.dailyRevenue.map((d:any,i:number)=>({i,r:Number(d.revenue||0)})).sort((a:any,b:any)=>b.r-a.r).slice(0,2).map((d:any)=>d.date??`#${d.i+1}`).join(' y ')}.` : ''}
</p>` : ''}

<!-- ═══ 3. DISTRIBUCIÓN DE CITAS (SVG Donut) ═══ -->
${SEC('3', 'Análisis Operacional — Distribución de Citas por Estado')}
<div style="display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:start;background:#f8fafc;border-radius:12px;padding:16px;" class="no-break">
  <div style="text-align:center;">
    ${statusDonutSVG}
    <p style="margin:6px 0 0;font-size:9px;color:#64748b;font-weight:600;">Total del período</p>
    <p style="margin:2px 0 0;font-size:8px;color:#94a3b8;">Completado: <strong style="color:#10b981;">${r.summary.completionRate}%</strong></p>
  </div>
  <div>
    <div style="margin-bottom:10px;">${donutLegend}</div>
    <table style="${TS}">
      <thead><tr>
        <th style="${TH}">Estado</th>
        <th style="${TH}text-align:right;">N°</th>
        <th style="${TH}text-align:center;">%</th>
        <th style="${TH}">Barra visual</th>
        <th style="${TH}">Benchmark</th>
      </tr></thead>
      <tbody>
        ${Object.entries(r.statusCounts??{}).filter(([_,c]:any)=>c>0).map(([st,c]:any,i:number)=>{
          const p=r.summary.total>0?Math.round((c/r.summary.total)*100):0;
          const bench: Record<string,string> = {COMPLETED:'Meta ≥85%',CANCELLED:'Ideal <10%',NO_SHOW:'Ideal <10%',SCHEDULED:'Normal',CONFIRMED:'Normal',IN_PROGRESS:'Normal',WAITING:'Normal',RESCHEDULED:'Aceptable'};
          return `<tr style="${i%2?'background:#fff;':''}">
            <td style="${TD}font-size:11px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ST_COLOR[st]??'#94a3b8'};margin-right:6px;vertical-align:middle;"></span>${ST_LABEL[st]??st}</td>
            <td style="${TDR}font-size:11px;">${c}</td>
            <td style="${TD}text-align:center;font-weight:700;color:${ST_COLOR[st]??'#94a3b8'};font-size:11px;">${p}%</td>
            <td style="${TD}padding-left:8px;min-width:80px;">${BAR(p,ST_COLOR[st]??'#94a3b8',7)}</td>
            <td style="${TD}font-size:9px;color:#94a3b8;">${bench[st]??''}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <p style="font-size:9px;color:#64748b;margin:8px 0 0;font-style:italic;">
      ℹ️ Recomendación: completado actual ${r.summary.completionRate}% ${r.summary.completionRate>=85?'✅ supera la meta':'— aumentar seguimiento de confirmaciones'}.
    </p>
  </div>
</div>

<!-- ═══ 4. DOCTOR PERFORMANCE ═══ -->
${(r.byDoctor??[]).length ? `
${SEC('4', 'Rendimiento por Doctor')}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;" class="no-break">
  ${doctorVisual}
  <div>
    <table style="${TS}margin-bottom:10px;">
      <thead><tr><th style="${TH}">#</th><th style="${TH}">Doctor</th><th style="${TH}text-align:right;">Citas</th><th style="${TH}text-align:right;">Ingresos</th><th style="${TH}text-align:right;">Ticket</th></tr></thead>
      <tbody>
        ${(r.byDoctor??[]).map((d:any,i:number)=>`
          <tr style="${i%2?'background:#f8fafc;':''}">
            <td style="${TD}font-weight:700;color:${DR_COLORS[i%8]};">${MEDALS[i]??i+1}</td>
            <td style="${TD}font-size:11px;">${d.name}</td>
            <td style="${TDR}font-size:11px;">${d.count}</td>
            <td style="${TDR}color:${DR_COLORS[i%8]};font-size:11px;">${bs(d.revenue)}</td>
            <td style="${TDR}font-size:10px;color:#64748b;">${bsRaw(d.count>0?d.revenue/d.count:0)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="background:#eff6ff;border-radius:8px;padding:8px 12px;font-size:10px;color:#1e40af;">
      💡 <strong>Acciones:</strong> El doctor con menor ticket puede beneficiarse de capacitación en upselling de tratamientos.
      ${(r.byDoctor??[]).length > 1 ? `Brecha de ingresos entre #1 y #${(r.byDoctor??[]).length}: ${bsRaw((r.byDoctor[0]?.revenue??0)-(r.byDoctor[(r.byDoctor??[]).length-1]?.revenue??0))}.` : ''}
    </div>
  </div>
</div>` : ''}

<!-- ═══ 5. ANÁLISIS COMERCIAL ═══ -->
<div class="page-break"></div>
${(r.byTreatment??[]).length || (r.byMethod??[]).length ? `
${SEC('5', 'Análisis Comercial — Tratamientos y Métodos de Pago')}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;" class="no-break">
  ${treatVisual}
  ${methodVisual}
</div>
${(r.byTreatment??[]).length ? `<p style="font-size:9.5px;color:#64748b;margin:8px 0 0;padding:7px 12px;background:#faf5ff;border-radius:6px;border-left:3px solid #8b5cf6;">
  💡 <strong>Dato clave:</strong> ${(()=>{const treats=r.byTreatment??[];const top=treats[0];if(!top)return'Sin datos de tratamientos aún.';const totalTRev=treats.reduce((s:number,t:any)=>s+Number(t.revenue||0),0)||1;const pct=Math.round((Number(top.revenue||0)/totalTRev)*100);return`El servicio más solicitado fue <strong>${top.name}</strong> (${top.count} veces, ${bsRaw(top.revenue||0)}, representa el ${pct}% de los ingresos por tratamientos). Considera incluirlo en tus campañas de WhatsApp y cotizaciones para potenciar las ventas.`;})()}
</p>` : ''}` : ''}

<!-- ═══ 6. SUCURSALES ═══ -->
${(r.byBranch??[]).length > 1 ? `
${SEC('6', 'Rendimiento por Sucursal')}
${branchSection}` : ''}

<!-- ═══ 7. CUENTAS POR COBRAR ═══ -->
${cxcList.length > 0 ? `
${SEC('7', `Cuentas por Cobrar — ${cxcList.length} Pacientes · ${bsRaw(totalCxC)} Pendiente`)}
${cxcSection}` : ''}

<!-- ═══ 8. NO-SHOW FOLLOW-UP ═══ -->
${(r.noShowList??[]).length > 0 ? `
<div class="page-break"></div>
${SEC('8', `Seguimiento No-Show — ${(r.noShowList??[]).length} Pacientes a Reagendar`)}
<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:10px;color:#9a3412;">
  🎯 <strong>Acción inmediata:</strong> Contactar a estos ${(r.noShowList??[]).length} pacientes hoy.
  Reagendar ${Math.round((r.noShowList??[]).length * 0.6)} de ellos generaría ~${bsRaw(Math.round((r.noShowList??[]).length * 0.6) * r.summary.avgTicket)} en ingresos recuperados.
</div>
${noShowSection}` : ''}

<!-- ═══ FOOTER ═══ -->
<div style="margin-top:28px;padding:10px 16px;border-top:2px solid #e2e8f0;background:linear-gradient(135deg,#f8fafc,#eff6ff);border-radius:8px;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:9px;color:#64748b;">
      <strong style="color:#1e293b;">${tenantName}</strong>${clinicAddress ? ` · ${clinicAddress}` : ''} · ClinicOS · Plan ${plan}
    </div>
    <div style="font-size:9px;color:#94a3b8;">Generado · ${generado}</div>
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:9px;font-weight:700;color:${healthColor};background:white;border:1px solid ${healthColor};border-radius:6px;padding:1px 6px;">Índice: ${healthScore}/100 ${healthLabel}</span>
      <span style="font-size:9px;color:#64748b;font-weight:700;">CONFIDENCIAL</span>
    </div>
  </div>
</div>

</body></html>`;

        const reportSlug = tenantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const printScript = `<script>try{history.replaceState(null,'','/clinicOS/reporte-${reportSlug}');}catch(e){}window.onload=function(){window.print();};<\/script>`;
        const printHtml = html.replace('</body>', printScript + '</body>');
        const pdfBlob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
      },
      error: () => alert('Error al generar el PDF. Intenta de nuevo.'),
    });
  }

  premiumFeatures = [
    'Análisis financiero avanzado',
    'Exportación CSV y PDF',
    'Ingresos por sucursal',
    'Rendimiento por doctor',
    'Reportes imprimibles',
    'Dashboard avanzado',
  ];
}
