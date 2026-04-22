import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { User, UserRole } from '../../core/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
    <!-- ══════════════════════════════════════════
         VISTA SUPER ADMIN — Lista de Administradores
    ══════════════════════════════════════════ -->
    @if (isSuperAdmin()) {
      <div class="space-y-6 animate-slide-up">
        <div class="page-header">
          <div>
            <h1 class="page-title">Administradores</h1>
            <p class="page-subtitle">Gestiona los administradores y sus permisos</p>
          </div>
          <a routerLink="/super-admin/tenants" class="btn-primary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Nuevo Tenant
          </a>
        </div>

        <!-- Filters -->
        <div class="card p-4 flex flex-wrap gap-3 items-center">
          <input [(ngModel)]="search" (input)="loadUsers()" class="input w-52" placeholder="Buscar administrador...">
          <select [(ngModel)]="selectedStatus" (change)="loadUsers()" class="input w-36">
            <option value="">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
        </div>

        <!-- Table -->
        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Administrador</th>
                  <th>Email</th>
                  <th>Tenant / Empresa</th>
                  <th>Clínicas adicionales</th>
                  <th>Último acceso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr>
                    <td>
                      <div class="flex items-center gap-3">
                        @if (avatarUrl(u)) {
                          <img [src]="avatarUrl(u)!" [alt]="u.firstName"
                            class="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700">
                        } @else {
                          <div class="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
                            {{ initials(u) }}
                          </div>
                        }
                        <span class="font-medium">{{ u.firstName }} {{ u.lastName }}</span>
                      </div>
                    </td>
                    <td class="text-slate-500">{{ u.email }}</td>
                    <td>
                      @if (u.tenant?.name) {
                        <div>
                          <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ u.tenant!.name }}</p>
                          <p class="text-xs text-slate-400">{{ u.tenant!.slug }}</p>
                        </div>
                      } @else {
                        <span class="text-slate-400 text-xs">—</span>
                      }
                    </td>
                    <td>
                      <span class="badge-blue">+{{ u.tenant?.extraClinics ?? 0 }}</span>
                    </td>
                    <td class="text-slate-500 text-xs">
                      {{ u.lastLoginAt ? (u.lastLoginAt | date:'dd/MM/yy HH:mm') : 'Nunca' }}
                    </td>
                    <td>
                      <span [class]="u.status === 'ACTIVE' ? 'badge-green' : 'badge-red'">
                        {{ u.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="flex items-center gap-0.5">
                        <button (click)="openManage(u)" title="Gestionar tenant"
                          class="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 dark:text-primary-400 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </button>
                        <button (click)="toggleStatus(u)" [title]="u.status === 'ACTIVE' ? 'Desactivar' : 'Activar'"
                          class="p-1.5 rounded-lg transition-colors"
                          [ngClass]="u.status === 'ACTIVE' ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-500'">
                          @if (u.status === 'ACTIVE') {
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                          } @else {
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="7">
                    <div class="empty-state py-10">
                      <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0a2 2 0 002-2v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1a2 2 0 002 2z"/></svg>
                      <p class="empty-state-title">Sin administradores</p>
                      <p class="empty-state-desc">Crea un nuevo Tenant para comenzar</p>
                    </div>
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
          <div class="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span class="text-sm text-slate-500">Total: {{ total() }} administradores</span>
            <div class="flex gap-2">
              <button (click)="prevPage()" [disabled]="page() <= 1" class="btn-secondary text-xs px-3 py-1">Anterior</button>
              <span class="text-sm text-slate-600 dark:text-slate-400 px-2 py-1">{{ page() }} / {{ totalPages() }}</span>
              <button (click)="nextPage()" [disabled]="page() >= totalPages()" class="btn-secondary text-xs px-3 py-1">Siguiente</button>
            </div>
          </div>
        </div>
      </div>

    } @else {
      <!-- ══════════════════════════════════════════
           VISTA ADMIN — Gestión del equipo
      ══════════════════════════════════════════ -->
      <div class="space-y-6 animate-slide-up">
        <div class="page-header">
          <div>
            <h1 class="page-title">Usuarios</h1>
            <p class="page-subtitle">Gestiona el equipo de trabajo</p>
          </div>
          <button (click)="openModal()" class="btn-primary">+ Nuevo Usuario</button>
        </div>

        <!-- Filters -->
        <div class="card p-4 flex flex-wrap gap-3 items-center">
          <input [(ngModel)]="search" (input)="loadUsers()" class="input w-52" placeholder="Buscar usuario...">
          <select [(ngModel)]="selectedRole" (change)="loadUsers()" class="input w-40">
            <option value="">Todos los roles</option>
            @for (r of staffRoles; track r.value) {
              <option [value]="r.value">{{ r.label }}</option>
            }
          </select>
          <select [(ngModel)]="selectedStatus" (change)="loadUsers()" class="input w-36">
            <option value="">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
        </div>

        <!-- Table -->
        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Sucursal(es)</th>
                  <th>Último acceso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr>
                    <td>
                      <div class="flex items-center gap-3">
                        @if (avatarUrl(u)) {
                          <img [src]="avatarUrl(u)!" [alt]="u.firstName"
                            class="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700">
                        } @else {
                          <div class="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
                            {{ initials(u) }}
                          </div>
                        }
                        <span class="font-medium">{{ u.firstName }} {{ u.lastName }}</span>
                      </div>
                    </td>
                    <td class="text-slate-500">{{ u.email }}</td>
                    <td><span [class]="roleClass(u.role)">{{ roleLabel(u.role) }}</span></td>
                    <td>
                      @if (userBranchLabel(u) === 'Todas') {
                        <span class="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/></svg>
                          Todas las sedes
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          {{ userBranchLabel(u) }}
                        </span>
                      }
                    </td>
                    <td class="text-slate-500 text-xs">{{ u.lastLoginAt ? (u.lastLoginAt | date:'dd/MM/yy HH:mm') : 'Nunca' }}</td>
                    <td>
                      <span [class]="u.status === 'ACTIVE' ? 'badge-green' : 'badge-red'">
                        {{ u.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="flex items-center gap-0.5">
                        <button (click)="openModal(u)" title="Editar usuario"
                          class="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 dark:text-primary-400 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button (click)="resetPassword(u)" title="Resetear contraseña"
                          class="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 dark:text-amber-400 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                        </button>
                        <button (click)="toggleStatus(u)" [title]="u.status === 'ACTIVE' ? 'Desactivar' : 'Activar'"
                          class="p-1.5 rounded-lg transition-colors"
                          [ngClass]="u.status === 'ACTIVE' ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-500'">
                          @if (u.status === 'ACTIVE') {
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                          } @else {
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="7">
                    <div class="empty-state py-8">
                      <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      <p class="empty-state-title">Sin usuarios registrados</p>
                      <p class="empty-state-desc">Agrega el primer miembro del equipo</p>
                    </div>
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
          <div class="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span class="text-sm text-slate-500">Total: {{ total() }} usuarios</span>
            <div class="flex gap-2">
              <button (click)="prevPage()" [disabled]="page() <= 1" class="btn-secondary text-xs px-3 py-1">Anterior</button>
              <span class="text-sm text-slate-600 dark:text-slate-400 px-2 py-1">{{ page() }} / {{ totalPages() }}</span>
              <button (click)="nextPage()" [disabled]="page() >= totalPages()" class="btn-secondary text-xs px-3 py-1">Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ══════════════════════════════════════════
         MODAL: Gestionar Admin (SUPER_ADMIN)
    ══════════════════════════════════════════ -->
    @if (manageModal()) {
      <div class="modal-overlay" (click)="manageModal.set(null)">
        <div class="modal-center">
          <div class="modal modal-lg animate-scale-in" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2 class="modal-title">{{ manageModal()!.firstName }} {{ manageModal()!.lastName }}</h2>
                <p class="text-xs text-slate-400 mt-0.5">{{ manageModal()!.tenant?.name || 'Sin tenant' }} · {{ manageModal()!.email }}</p>
              </div>
              <button (click)="manageModal.set(null)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body space-y-6">

              <!-- Usuarios del tenant -->
              <div>
                <h3 class="section-heading">Usuarios creados por este administrador</h3>
                @if (loadingTenantUsers()) {
                  <div class="space-y-2">
                    @for (_ of [1,2,3]; track $index) {
                      <div class="skeleton h-12 rounded-xl"></div>
                    }
                  </div>
                } @else if (tenantUsers().length === 0) {
                  <div class="empty-state py-6">
                    <svg class="empty-state-icon w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <p class="empty-state-title">Sin usuarios adicionales</p>
                    <p class="empty-state-desc">Este administrador aún no ha creado usuarios en su tenant</p>
                  </div>
                } @else {
                  <div class="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    @for (u of tenantUsers(); track u.id) {
                      <div class="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                        <div class="flex items-center gap-3">
                          <div class="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                            {{ initials(u) }}
                          </div>
                          <div>
                            <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ u.firstName }} {{ u.lastName }}</p>
                            <p class="text-xs text-slate-400">{{ u.email }}</p>
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          <span [class]="roleClass(u.role)">{{ roleLabel(u.role) }}</span>
                          <span [class]="u.status === 'ACTIVE' ? 'badge-green' : 'badge-red'">
                            {{ u.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                  <p class="text-xs text-slate-400 mt-2">{{ tenantUsers().length }} usuario(s) registrado(s) en este tenant</p>
                }
              </div>

              <!-- Gestión de clínicas adicionales -->
              <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
                <h3 class="section-heading">Clínicas adicionales</h3>
                <div class="card-flat p-4 space-y-4">
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Clínicas extras concedidas</p>
                      <p class="text-xs text-slate-400 mt-0.5">Se suman al límite del plan contratado. El plan base incluye 1 clínica.</p>
                    </div>
                    <span class="badge-blue text-base font-bold px-3 py-1">+{{ manageModal()!.tenant?.extraClinics ?? 0 }}</span>
                  </div>
                  <div class="flex items-end gap-3">
                    <div class="flex-1">
                      <label class="label">Nueva cantidad de clínicas adicionales</label>
                      <input type="number" [(ngModel)]="extraClinicsValue" min="0" max="50" class="input" placeholder="0">
                      <p class="field-hint">Introduce 0 para quitar el permiso extra</p>
                    </div>
                    <button (click)="grantClinics()" class="btn-primary shrink-0" [disabled]="savingClinics()">
                      {{ savingClinics() ? 'Guardando...' : 'Aplicar' }}
                    </button>
                  </div>
                </div>
              </div>

            </div>
            <div class="modal-footer">
              <button (click)="manageModal.set(null)" class="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ══════════════════════════════════════════
         MODAL: Crear / Editar Usuario (ADMIN)
    ══════════════════════════════════════════ -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-center">
          <div class="modal animate-scale-in" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ editing() ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
              <button (click)="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body space-y-4">
              <!-- Avatar -->
              <div>
                <label class="label">Foto de perfil</label>
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0 bg-slate-50 dark:bg-slate-800">
                    @if (avatarPreview()) {
                      <img [src]="avatarPreview()!" class="w-full h-full object-cover" alt="Avatar preview">
                    } @else {
                      <svg class="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    }
                  </div>
                  <div>
                    <label class="cursor-pointer">
                      <span class="btn-secondary inline-flex items-center gap-1.5 text-xs">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        Subir foto
                      </span>
                      <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp" (change)="onAvatarChange($event)">
                    </label>
                    <p class="text-xs text-slate-400 mt-1">JPG, PNG o WebP. 200×200px.</p>
                    @if (avatarFile()) {
                      <p class="text-xs text-emerald-600 mt-0.5">✓ {{ avatarFile()!.name }}</p>
                    }
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">Nombre *</label>
                  <input [(ngModel)]="form.firstName" class="input" placeholder="Juan">
                </div>
                <div>
                  <label class="label">Apellido *</label>
                  <input [(ngModel)]="form.lastName" class="input" placeholder="Pérez">
                </div>
              </div>
              <div>
                <label class="label">Email *</label>
                <input [(ngModel)]="form.email" type="email" class="input" placeholder="usuario@clinica.com">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">Rol *</label>
                  <select [(ngModel)]="form.role" class="input">
                    @for (r of staffRoles; track r.value) {
                      <option [value]="r.value">{{ r.label }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="label">Teléfono</label>
                  <input [(ngModel)]="form.phone" class="input" placeholder="+591 7 777 7777">
                </div>
              </div>
              @if (!editing()) {
                <div>
                  <label class="label">Contraseña</label>
                  <div class="flex gap-2">
                    <input [(ngModel)]="form.password" [type]="showPass ? 'text' : 'password'" class="input flex-1 font-mono" placeholder="Se genera automáticamente">
                    <button type="button" (click)="showPass = !showPass" class="btn-secondary px-2.5">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        @if (showPass) {
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/>
                        } @else {
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        }
                      </svg>
                    </button>
                    <button type="button" (click)="regeneratePassword()" class="btn-secondary px-2.5" title="Generar nueva contraseña">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    </button>
                  </div>
                  <p class="text-xs text-slate-400 mt-1">Contraseña generada automáticamente. Se mostrará al crear el usuario.</p>
                </div>
              }

              <!-- Branch assignment -->
              @if (branches().length > 0) {
                <div class="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <label class="label">Acceso a Sucursales</label>
                  <div class="space-y-2">
                    <label class="flex items-center gap-2.5 cursor-pointer">
                      <input type="radio" [(ngModel)]="form.branchAccessType" value="all" class="text-primary-600">
                      <div>
                        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Todas las sucursales</span>
                        <p class="text-xs text-slate-400">El usuario puede ver y operar en cualquier sucursal</p>
                      </div>
                    </label>
                    <label class="flex items-center gap-2.5 cursor-pointer">
                      <input type="radio" [(ngModel)]="form.branchAccessType" value="specific" class="text-primary-600">
                      <div>
                        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Sucursales específicas</span>
                        <p class="text-xs text-slate-400">Limitar al usuario a una o varias sucursales</p>
                      </div>
                    </label>
                  </div>
                  @if (form.branchAccessType === 'specific') {
                    <div class="mt-3 space-y-1.5 pl-2">
                      @for (branch of branches(); track branch.id) {
                        <label class="flex items-center gap-2.5 cursor-pointer py-1">
                          <input type="checkbox" [checked]="form.branchIds.includes(branch.id)"
                            (change)="toggleBranch(branch.id)"
                            class="rounded text-primary-600">
                          <span class="text-sm text-slate-700 dark:text-slate-300">{{ branch.name }}</span>
                          @if (branch.isMain) {
                            <span class="badge-blue text-xs">Principal</span>
                          }
                        </label>
                      }
                    </div>
                  }
                </div>
              }
            </div>
            <div class="modal-footer">
              <button (click)="closeModal()" class="btn-secondary">Cancelar</button>
              <button (click)="save()" class="btn-primary" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : editing() ? 'Actualizar' : 'Crear Usuario' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ══════════════════════════════════════════
         MODAL: Credenciales del usuario creado
    ══════════════════════════════════════════ -->
    @if (credentialsModal()) {
      <div class="modal-overlay" (click)="credentialsModal.set(null)">
        <div class="modal-center">
          <div class="modal animate-scale-in" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2 class="modal-title">Credenciales de acceso</h2>
                <p class="text-xs text-slate-400 mt-0.5">Guarda o imprime estas credenciales antes de cerrar</p>
              </div>
              <button (click)="credentialsModal.set(null)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body space-y-4">
              <div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div class="flex items-center gap-2 mb-3">
                  <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span class="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Usuario creado exitosamente</span>
                </div>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between items-center">
                    <span class="text-slate-500">Nombre:</span>
                    <span class="font-medium text-slate-800 dark:text-slate-200">{{ credentialsModal()!.name }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-500">Email:</span>
                    <span class="font-mono text-slate-800 dark:text-slate-200">{{ credentialsModal()!.email }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-500">Contraseña:</span>
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{{ credentialsModal()!.password }}</span>
                      <button (click)="copyText(credentialsModal()!.password)" class="text-primary-600 hover:text-primary-700 text-xs">Copiar</button>
                    </div>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-500">Rol:</span>
                    <span [class]="roleClass(credentialsModal()!.role)">{{ roleLabel(credentialsModal()!.role) }}</span>
                  </div>
                </div>
              </div>
              <div class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                El usuario deberá cambiar su contraseña en el primer inicio de sesión.
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="printCredentials()" class="btn-secondary flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                Imprimir / PDF
              </button>
              <button (click)="credentialsModal.set(null)" class="btn-primary">Entendido</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ══════════════════════════════════════════
         MODAL: Confirmar reset de contraseña
    ══════════════════════════════════════════ -->
    @if (resetConfirm()) {
      <div class="modal-overlay" (click)="resetConfirm.set(null)">
        <div class="modal-center">
          <div class="modal animate-scale-in" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Resetear Contraseña</h2>
              <button (click)="resetConfirm.set(null)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body space-y-4">
              <div class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <div class="flex items-center gap-2 mb-2">
                  <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <span class="text-sm font-semibold text-amber-700 dark:text-amber-400">Esta acción no se puede deshacer</span>
                </div>
                <p class="text-sm text-amber-700 dark:text-amber-400">Se generará una nueva contraseña para <strong>{{ resetConfirm()!.user.firstName }} {{ resetConfirm()!.user.lastName }}</strong>.</p>
              </div>
              <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <span class="text-sm text-slate-500">Nueva contraseña:</span>
                <span class="font-mono text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">{{ resetConfirm()!.newPass }}</span>
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="resetConfirm.set(null)" class="btn-secondary">Cancelar</button>
              <button (click)="doResetPassword()" class="btn-warning" [disabled]="savingReset()">
                {{ savingReset() ? 'Reseteando...' : 'Confirmar reset' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class UsersComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private branchCtx = inject(BranchContextService);

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  branches = computed(() => this.branchCtx.branches());

  users = signal<User[]>([]);
  total = signal(0);
  page = signal(1);
  totalPages = signal(1);

  // Admin view: create/edit modal
  showModal = signal(false);
  editing = signal<User | null>(null);
  saving = signal(false);
  avatarFile = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  credentialsModal = signal<{ name: string; email: string; password: string; role: string } | null>(null);
  showPass = false;
  toastMsg = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  resetConfirm = signal<{ user: User; newPass: string } | null>(null);
  savingReset = signal(false);

  // Super admin view: manage modal
  manageModal = signal<User | null>(null);
  tenantUsers = signal<User[]>([]);
  loadingTenantUsers = signal(false);
  extraClinicsValue = 0;
  savingClinics = signal(false);

  search = '';
  selectedRole = '';
  selectedStatus = '';

  readonly allRoles = [
    { value: 'ADMIN',        label: 'Administrador' },
    { value: 'DOCTOR',       label: 'Doctor' },
    { value: 'RECEPTIONIST', label: 'Recepcionista' },
    { value: 'NURSE',        label: 'Enfermero/a' },
    { value: 'ACCOUNTANT',   label: 'Contador' },
  ];

  /** Roles que el ADMIN puede asignar (excluye ADMIN y SUPER_ADMIN) */
  get staffRoles() {
    return this.allRoles.filter(r => r.value !== 'ADMIN');
  }

  form = this.emptyForm();

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    const params: any = { page: this.page(), limit: 15 };
    if (this.search) params.search = this.search;
    if (!this.isSuperAdmin() && this.selectedRole) params.role = this.selectedRole;
    if (this.selectedStatus) params.status = this.selectedStatus;
    this.api.getPaginated<User>('/users', params).subscribe(r => {
      this.users.set(r.data);
      this.total.set(r.total);
      this.totalPages.set(r.totalPages);
      this.cdr.markForCheck();
    });
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.loadUsers(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.loadUsers(); } }

  avatarUrl(u: User): string | null {
    return this.api.getStaticUrl(u.avatarUrl);
  }

  toggleStatus(u: User) {
    const status = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.api.patch(`/users/${u.id}`, { status }).subscribe(() => this.loadUsers());
  }

  // ── SUPER_ADMIN: gestionar admin ─────────────────────────
  openManage(user: User) {
    this.manageModal.set(user);
    this.extraClinicsValue = user.tenant?.extraClinics ?? 0;
    this.tenantUsers.set([]);
    if (user.tenant?.id) {
      this.loadingTenantUsers.set(true);
      this.api.getPaginated<User>('/users', { tenantId: user.tenant.id, limit: 100 }).subscribe({
        next: r => {
          // Excluir al propio admin de la lista
          this.tenantUsers.set(r.data.filter(u => u.id !== user.id));
          this.loadingTenantUsers.set(false);
          this.cdr.markForCheck();
        },
        error: () => { this.loadingTenantUsers.set(false); this.cdr.markForCheck(); },
      });
    }
    this.cdr.markForCheck();
  }

  grantClinics() {
    const user = this.manageModal();
    if (!user?.tenant?.id) return;
    this.savingClinics.set(true);
    this.api.patch(`/tenants/${user.tenant.id}/extra-clinics`, { extra: +this.extraClinicsValue }).subscribe({
      next: () => {
        this.savingClinics.set(false);
        // Actualizar en la lista local
        const updated = { ...user, tenant: { ...user.tenant!, extraClinics: +this.extraClinicsValue } };
        this.users.update(list => list.map(u => u.id === user.id ? updated : u));
        this.manageModal.set(updated);
        this.cdr.markForCheck();
      },
      error: () => { this.savingClinics.set(false); this.cdr.markForCheck(); },
    });
  }

  // ── ADMIN: crear/editar usuario ───────────────────────────
  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.avatarFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarPreview.set(e.target?.result as string);
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  openModal(user?: User) {
    if (user) {
      this.editing.set(user);
      this.avatarFile.set(null);
      this.avatarPreview.set(this.api.getStaticUrl(user.avatarUrl));
      const branchIds: string[] = (user as any).branches?.map((b: any) => b.branchId || b.id) || [];
      this.form = {
        firstName: user.firstName, lastName: user.lastName, email: user.email,
        role: user.role, phone: user.phone || '', password: '',
        branchAccessType: branchIds.length === 0 ? 'all' : 'specific',
        branchIds,
      };
    } else {
      this.editing.set(null);
      this.avatarFile.set(null);
      this.avatarPreview.set(null);
      this.form = this.emptyForm();
      this.form.password = this.generatePassword();
    }
    this.showPass = false;
    this.showModal.set(true);
  }

  regeneratePassword() {
    this.form = { ...this.form, password: this.generatePassword() };
    this.showPass = true;
  }

  private generatePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  resetPassword(u: User) {
    const newPass = this.generatePassword();
    this.resetConfirm.set({ user: u, newPass });
  }

  doResetPassword() {
    const rc = this.resetConfirm();
    if (!rc) return;
    this.savingReset.set(true);
    this.api.post(`/users/${rc.user.id}/reset-password`, { newPassword: rc.newPass }).subscribe({
      next: () => {
        this.savingReset.set(false);
        this.resetConfirm.set(null);
        this.credentialsModal.set({
          name: `${rc.user.firstName} ${rc.user.lastName}`,
          email: rc.user.email,
          password: rc.newPass,
          role: rc.user.role,
        });
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingReset.set(false);
        this.resetConfirm.set(null);
        this.toastMsg.set({ type: 'error', text: 'Error al resetear contraseña' });
        setTimeout(() => this.toastMsg.set(null), 4000);
        this.cdr.markForCheck();
      },
    });
  }

  printCredentials() {
    const c = this.credentialsModal();
    if (!c) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Credenciales</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:400px;margin:0 auto}
      h2{color:#1e293b;border-bottom:2px solid #3b82f6;padding-bottom:8px}
      .row{display:flex;justify-content:space-between;margin:12px 0;font-size:14px}
      .label{color:#64748b}.value{font-weight:600;font-family:monospace}
      .pass{background:#f1f5f9;padding:6px 12px;border-radius:6px;font-size:16px;letter-spacing:1px}
      .footer{margin-top:24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}</style>
    </head><body>
      <h2>Credenciales de Acceso — ClinicOS</h2>
      <div class="row"><span class="label">Nombre:</span><span class="value">${c.name}</span></div>
      <div class="row"><span class="label">Email:</span><span class="value">${c.email}</span></div>
      <div class="row"><span class="label">Contraseña:</span><span class="pass">${c.password}</span></div>
      <div class="row"><span class="label">Rol:</span><span class="value">${c.role}</span></div>
      <div class="footer">Por seguridad, cambia tu contraseña en el primer inicio de sesión.</div>
    </body></html>`);
    w.document.close();
    w.print();
  }

  closeModal() {
    this.showModal.set(false);
    this.avatarFile.set(null);
    this.avatarPreview.set(null);
  }

  toggleBranch(branchId: string) {
    const ids = this.form.branchIds;
    const idx = ids.indexOf(branchId);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(branchId);
    this.form = { ...this.form, branchIds: [...ids] }; // trigger change detection
    this.cdr.markForCheck();
  }

  save() {
    if (!this.form.firstName || !this.form.lastName || !this.form.email) return;
    this.saving.set(true);
    const { branchAccessType, branchIds, ...rest } = this.form as any;
    const body: any = { ...rest };
    if (!body.password) delete body.password;
    if (branchAccessType === 'specific' && branchIds?.length) {
      body.branchIds = branchIds;
    }

    const req = this.editing()
      ? this.api.patch(`/users/${this.editing()!.id}`, body)
      : this.api.post('/users', body);

    const capturedPass = !this.editing() ? this.form.password : '';
    const capturedForm = { ...this.form };

    req.subscribe({
      next: (created: any) => {
        const userId = this.editing()?.id || created?.id;
        const finalize = () => {
          this.saving.set(false);
          this.closeModal();
          this.loadUsers();
          // Show credentials modal after new user creation
          if (capturedPass) {
            this.credentialsModal.set({
              name: `${capturedForm.firstName} ${capturedForm.lastName}`,
              email: capturedForm.email,
              password: capturedPass,
              role: capturedForm.role,
            });
          }
          this.cdr.markForCheck();
        };
        if (this.avatarFile() && userId) {
          const fd = new FormData();
          fd.append('avatar', this.avatarFile()!);
          this.api.upload<{ avatarUrl: string }>(`/uploads/users/${userId}/avatar`, fd).subscribe({
            next: finalize, error: finalize,
          });
        } else {
          finalize();
        }
      },
      error: () => this.saving.set(false),
    });
  }

  initials(u: User) { return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase(); }

  roleLabel(role: string) {
    return this.allRoles.find(r => r.value === role)?.label || role;
  }

  roleClass(role: string) {
    const map: Record<string, string> = {
      ADMIN: 'badge-blue', DOCTOR: 'badge-green', RECEPTIONIST: 'badge-yellow',
      NURSE: 'badge-blue', ACCOUNTANT: 'badge-gray',
    };
    return map[role] || 'badge-gray';
  }

  userBranchLabel(u: any): string {
    const assigned = (u.branches as any[]) || [];
    if (assigned.length === 0) return 'Todas';
    if (assigned.length === 1) return assigned[0].branch?.name || assigned[0].branchId;
    return `${assigned.length} sedes`;
  }

  private emptyForm() {
    return { firstName: '', lastName: '', email: '', role: 'RECEPTIONIST' as UserRole, phone: '', password: '', branchAccessType: 'all' as 'all' | 'specific', branchIds: [] as string[] };
  }
}
