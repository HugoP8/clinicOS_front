import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy, ChangeDetectorRef, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { filter, Subscription } from 'rxjs';

interface NavItem {
  label: string;
  icon: SafeHtml;
  route: string;
  roles?: string[];
  section?: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule],
  template: `
    <!-- Clinic brand accent bar (top of page) -->
    @if (clinicPrimaryColor()) {
      <div class="fixed top-0 left-0 right-0 h-[3px] z-[100]"
        [style.background]="'linear-gradient(90deg, ' + clinicPrimaryColor() + ', ' + (branchCtx.activeClinic()?.secondaryColor || clinicPrimaryColor()) + ')'"></div>
    }
    <div class="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900" [style.padding-top]="clinicPrimaryColor() ? '3px' : null">

      <!-- ── Mobile backdrop ──────────────────────────────────── -->
      @if (mobileOpen()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[65] lg:hidden"
          (click)="mobileOpen.set(false)"></div>
      }

      <!-- ── Sidebar ──────────────────────────────────────────── -->
      <aside
        class="fixed lg:relative inset-y-0 left-0 z-[70] lg:z-auto flex flex-col shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
        [ngClass]="{
          '-translate-x-full': !isDesktop() && !mobileOpen(),
          'translate-x-0': !isDesktop() && mobileOpen(),
          'w-64': isDesktop() && !collapsed(),
          'w-16': isDesktop() && collapsed(),
          'w-72': !isDesktop()
        }"
      >
        <!-- Logo -->
        <div class="flex items-center gap-3 px-3 h-16 border-b border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden"
          [style.border-bottom-color]="clinicPrimaryColor() ? clinicPrimaryColor() + '40' : null">
          <div class="flex items-center justify-center w-11 h-11 rounded-2xl shrink-0 shadow-lg overflow-hidden"
            [style.background-color]="clinicLogoUrl() ? 'white' : (clinicPrimaryColor() || null)"
            [class.bg-primary-600]="!clinicPrimaryColor() && !clinicLogoUrl()">
            @if (clinicLogoUrl()) {
              <img [src]="clinicLogoUrl()!" alt="logo" class="w-full h-full object-contain p-1">
            } @else {
              <img src="/logo-clinicos.png" alt="ClinicOS" class="w-full h-full object-contain p-1">
            }
          </div>
          @if (!collapsed() || !isDesktop()) {
            <div class="flex flex-col min-w-0 animate-fade-in">
              <span class="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {{ branchCtx.activeClinic()?.name || 'ClinicOS' }}
              </span>
              <span class="text-xs text-slate-500 dark:text-slate-400 truncate">
                {{ branchCtx.activeBranchName() || user()?.tenant?.name || 'Plataforma' }}
              </span>
            </div>
            <!-- Close button on mobile -->
            <button class="ml-auto lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              (click)="mobileOpen.set(false)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          }
        </div>

        <!-- Nav -->
        <nav class="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5 no-scrollbar">
          @for (item of visibleNavItems(); track item.route) {
            @if (item.section) {
              @if (!collapsed() || !isDesktop()) {
                <p class="nav-section mt-3 first:mt-0">{{ item.section }}</p>
              } @else {
                <div class="my-2 border-t border-slate-200 dark:border-slate-700"></div>
              }
            }
            <a
              [routerLink]="item.route"
              routerLinkActive="nav-item-active"
              [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
              class="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all duration-150 group relative hover:translate-x-0.5"
              [title]="item.label"
              (click)="!isDesktop() && mobileOpen.set(false)"
            >
              <span class="shrink-0 w-5 h-5 flex items-center justify-center opacity-70 group-[.nav-item-active]:opacity-100"
                [innerHTML]="item.icon"></span>
              @if (!collapsed() || !isDesktop()) {
                <span class="truncate text-[13px] animate-fade-in">{{ item.label }}</span>
              }
              @if (collapsed() && isDesktop()) {
                <span class="absolute left-full ml-2 px-2.5 py-1.5 text-xs font-medium bg-slate-900 dark:bg-slate-700 text-white rounded-lg
                  opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-700/50">
                  {{ item.label }}
                </span>
              }
            </a>
          }
        </nav>

        <!-- User area -->
        <div class="p-2 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <div class="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <div class="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2"
              [style.--tw-ring-color]="clinicPrimaryColor() ? clinicPrimaryColor() + '50' : '#BFDBFE'">
              @if (userAvatarUrl()) {
                <img [src]="userAvatarUrl()!" [alt]="initials()" class="w-full h-full object-cover">
              } @else {
                <div class="w-full h-full flex items-center justify-center"
                  [style.background]="'linear-gradient(135deg, ' + (clinicPrimaryColor() || '#3B82F6') + ', ' + (clinicPrimaryColor() || '#1D4ED8') + 'DD)'">
                  <span class="text-white text-xs font-bold">{{ initials() }}</span>
                </div>
              }
            </div>
            @if (!collapsed() || !isDesktop()) {
              <div class="flex-1 min-w-0 animate-fade-in">
                <p class="text-xs font-semibold text-slate-900 dark:text-white truncate">{{ fullName() }}</p>
                <p class="text-xs text-slate-400 dark:text-slate-500 truncate">{{ roleLabel() }}</p>
              </div>
              <button
                (click)="logout()"
                class="shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                title="Cerrar sesión">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            }
          </div>
        </div>
      </aside>

      <!-- ── Main ──────────────────────────────────────────────── -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- Topbar -->
        <header class="relative z-[60] h-14 sm:h-16 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 shrink-0 shadow-sm transition-colors duration-200">
          <!-- Menu toggle -->
          <button
            (click)="toggleMenu()"
            class="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
            title="Menú (B)">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <!-- Breadcrumb -->
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            <span class="hidden sm:block text-xs text-slate-400 dark:text-slate-500">ClinicOS</span>
            <span class="hidden sm:block text-xs text-slate-300 dark:text-slate-600">/</span>
            <span class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{{ currentPageTitle() }}</span>
          </div>

          <!-- Branch / Clinic selector (oculto para DOCTOR — no cambia sede) -->
          @if (!isSuperAdmin() && !isOnlyDoctor() && branchCtx.branches().length > 0) {
            <div [class]="branchSelectorContainerClass()"
              [title]="branchSelectorLocked() ? 'Este módulo no filtra por sede' : ''">
              <!-- Clínica (si hay más de una) -->
              @if (branchCtx.hasMultipleClinics() && !branchSelectorLocked()) {
                <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0a2 2 0 002-2v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1a2 2 0 002 2z"/>
                </svg>
                <select class="text-xs bg-transparent border-0 outline-none text-slate-700 dark:text-slate-200 font-medium max-w-[100px] cursor-pointer"
                  [value]="branchCtx.activeClinicId()"
                  (change)="onClinicChange($any($event.target).value)">
                  @for (c of branchCtx.clinics(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
                <span class="text-slate-300 dark:text-slate-600">·</span>
              }
              <!-- Sucursal — icono + selector o texto bloqueado -->
              <svg class="w-3.5 h-3.5 shrink-0 transition-colors"
                [class.text-primary-500]="!branchCtx.isAllBranches() && !branchSelectorLocked()"
                [class.text-slate-300]="branchSelectorLocked()"
                [class.text-slate-400]="branchCtx.isAllBranches() && !branchSelectorLocked()"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              @if (branchSelectorLocked()) {
                <span class="text-xs text-slate-400 dark:text-slate-500 font-medium">Todas las sedes</span>
              } @else {
                <select class="text-xs bg-transparent border-0 outline-none font-medium max-w-[140px] cursor-pointer transition-colors"
                  [ngClass]="branchCtx.isAllBranches() ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'"
                  [value]="branchCtx.activeBranchId()"
                  (change)="onBranchChange($any($event.target).value)">
                  <option value="">Todas las sedes</option>
                  @for (b of branchCtx.branches(); track b.id) {
                    <option [value]="b.id">{{ b.name }}</option>
                  }
                </select>
              }
            </div>
          }

          <!-- Plan chip -->
          @if (!isSuperAdmin() && currentSub()) {
            <button
              (click)="planModalOpen.set(true)"
              class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
              [ngClass]="planChipClass()"
              title="Ver planes disponibles"
            >
              <span class="w-1.5 h-1.5 rounded-full" [ngClass]="planDotClass()"></span>
              {{ currentSub()?.plan?.name || 'Plan' }}
            </button>
          }

          <!-- Right actions -->
          <div class="flex items-center gap-1">
            <!-- Dark mode -->
            <button
              (click)="toggleTheme()"
              class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
              [title]="isDark() ? 'Modo claro' : 'Modo oscuro'">
              @if (isDark()) {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
              }
            </button>

            <!-- Notifications -->
            <div class="relative">
              <button
                (click)="notifOpen.set(!notifOpen())"
                class="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                title="Notificaciones">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                @if (unreadCount() > 0) {
                  <span class="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 animate-bounce-in pulse-dot">
                    {{ unreadCount() > 9 ? '9+' : unreadCount() }}
                  </span>
                }
              </button>

              @if (notifOpen()) {
                <div class="absolute right-0 top-11 w-80 max-w-[calc(100vw-1rem)] card shadow-2xl z-50 animate-slide-down overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <span class="text-sm font-semibold text-slate-900 dark:text-white">Notificaciones</span>
                    @if (unreadCount() > 0) {
                      <button (click)="markAllRead()" class="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                        Marcar todas leídas
                      </button>
                    }
                  </div>
                  <div class="max-h-72 overflow-y-auto">
                    @if (notifications().length === 0) {
                      <div class="empty-state py-8">
                        <svg class="empty-state-icon w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"/>
                        </svg>
                        <p class="empty-state-title text-sm">Sin notificaciones</p>
                      </div>
                    }
                    @for (n of notifications(); track n.id) {
                      <div class="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                        [ngClass]="{'bg-blue-50/70 dark:bg-blue-900/10': !n.isRead}">
                        <!-- Dot: click to mark as read only (no modal) -->
                        <button
                          class="w-5 h-5 rounded-full mt-1.5 shrink-0 flex items-center justify-center transition-all hover:scale-125"
                          [title]="n.isRead ? 'Ya leído' : 'Marcar como leído'"
                          (click)="$event.stopPropagation(); markOneRead(n)">
                          <span class="w-2.5 h-2.5 rounded-full block transition-colors"
                            [class.bg-primary-500]="!n.isRead"
                            [class.bg-slate-300]="n.isRead"
                            [class.shadow-sm]="!n.isRead"></span>
                        </button>
                        <!-- Body: click to open detail modal -->
                        <div class="min-w-0 flex-1 cursor-pointer" (click)="openNotifDetail(n)">
                          <div class="flex items-start justify-between gap-2">
                            <p class="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{{ n.title }}</p>
                            <span class="text-[10px] text-slate-400 shrink-0">{{ notifTimeAgo(n.createdAt) }}</span>
                          </div>
                          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{{ n.message }}</p>
                          <p class="text-[10px] text-primary-500 mt-1 font-medium">Toca para ver detalle →</p>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- User menu -->
            <div class="relative pl-2 border-l border-slate-200 dark:border-slate-700 ml-1">
              <button
                (click)="userMenuOpen.set(!userMenuOpen())"
                class="flex items-center gap-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all px-2 py-1.5 group">
                <div class="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2"
                  [style.--tw-ring-color]="clinicPrimaryColor() ? clinicPrimaryColor() + '50' : '#BFDBFE'">
                  @if (userAvatarUrl()) {
                    <img [src]="userAvatarUrl()!" [alt]="initials()" class="w-full h-full object-cover">
                  } @else {
                    <div class="w-full h-full flex items-center justify-center"
                      [style.background]="'linear-gradient(135deg, ' + (clinicPrimaryColor() || '#3B82F6') + ', ' + (clinicPrimaryColor() || '#1D4ED8') + 'DD)'">
                      <span class="text-white text-xs font-bold">{{ initials() }}</span>
                    </div>
                  }
                </div>
                <div class="hidden md:block text-left min-w-0">
                  <p class="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[110px] leading-tight">{{ fullName() }}</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[110px]">{{ roleLabel() }}</p>
                </div>
                <svg class="hidden md:block w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0"
                  [class.rotate-180]="userMenuOpen()"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              @if (userMenuOpen()) {
                <div class="absolute right-0 top-12 w-56 card shadow-2xl z-50 animate-slide-down overflow-hidden">
                  <!-- User info header -->
                  <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ fullName() }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{{ user()?.email }}</p>
                    <span class="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                      {{ roleLabel() }}
                    </span>
                  </div>
                  <!-- Menu items -->
                  <div class="py-1">
                    <button
                      (click)="userMenuOpen.set(false); router.navigate(['/dashboard'])"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                      <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                      </svg>
                      Dashboard
                    </button>
                    <button
                      (click)="userMenuOpen.set(false); router.navigate(['/profile'])"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                      <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                      Mi Perfil
                    </button>
                    <div class="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                    <button
                      (click)="userMenuOpen.set(false); logout()"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-y-auto p-4 sm:p-6">
          <!-- No opacity/transform animation here: those create stacking contexts that trap
               fixed modals below the header. Use a plain wrapper. -->
          <div class="max-w-screen-2xl mx-auto">
            <router-outlet />
          </div>
        </main>
      </div>

      <!-- ── Subscription Expired Modal ──────────────────────── -->
      @if (showExpiredModal()) {
        <div class="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-modal-in" (click)="$event.stopPropagation()">
            <!-- Red header strip -->
            <div class="bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl p-5 text-white">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg font-bold">Suscripción Vencida</h2>
                  <p class="text-red-100 text-xs mt-0.5">Acceso al sistema suspendido</p>
                </div>
              </div>
            </div>
            <!-- Body -->
            <div class="p-5 space-y-4">
              <p class="text-sm text-slate-600 dark:text-slate-400">
                Tu plan <span class="font-semibold text-slate-900 dark:text-white">{{ currentSub()?.plan?.name || 'ClinicOS' }}</span> ha vencido
                @if (currentSub()?.currentPeriodEnd) {
                  el <span class="font-semibold text-red-600">{{ currentSub().currentPeriodEnd | date:'dd/MM/yyyy' }}</span>
                }.
              </p>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                Para restablecer el acceso completo, contacta al administrador de ClinicOS para renovar tu suscripción.
              </p>
              <a [href]="renewalWaLink()" target="_blank"
                class="flex items-center justify-center gap-2.5 w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                </svg>
                Renovar por WhatsApp — +591 75455488
              </a>
            </div>
            <!-- Footer -->
            <div class="px-5 pb-5 flex items-center justify-between">
              <button (click)="auth.logout()" class="text-xs text-slate-400 hover:text-red-500 transition-colors">
                Cerrar sesión
              </button>
              <button (click)="dismissExpiredModal()"
                class="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                Entendido, continuar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Plan upgrade modal -->
      @if (planModalOpen()) {
        <div class="fixed inset-0 z-[300] flex items-center justify-center p-4" (click)="planModalOpen.set(false)">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-modal-in"
            (click)="$event.stopPropagation()">
            <!-- Modal header -->
            <div class="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">Planes ClinicOS</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Plan actual: <span class="font-semibold text-primary-600 dark:text-primary-400">{{ currentSub()?.plan?.name || '—' }}</span></p>
              </div>
              <button (click)="planModalOpen.set(false)" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <!-- Plans grid -->
            <div class="overflow-y-auto p-5 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                @for (plan of availablePlans(); track plan.id) {
                  <div class="relative rounded-2xl border-2 p-4 transition-all"
                    [ngClass]="currentSub()?.planId === plan.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600'">
                    @if (currentSub()?.planId === plan.id) {
                      <span class="absolute top-3 right-3 text-[10px] font-bold bg-primary-500 text-white px-2 py-0.5 rounded-full">ACTUAL</span>
                    }
                    <h3 class="font-bold text-slate-900 dark:text-white">{{ plan.name }}</h3>
                    <div class="mt-1 flex items-baseline gap-1">
                      <span class="text-2xl font-bold text-slate-900 dark:text-white">Bs. {{ plan.monthlyPrice }}</span>
                      <span class="text-xs text-slate-500">/mes</span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">o Bs. {{ plan.annualPrice }}/año</p>
                    <!-- Callout basico -->
                    @if (plan.slug === 'basic') {
                      <div class="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-2.5 py-2">
                        <span class="text-amber-500 text-xs leading-none mt-px">🔒</span>
                        <p class="text-[10px] text-amber-700 dark:text-amber-300 leading-snug">Las funciones avanzadas son visibles pero estarán bloqueadas.</p>
                      </div>
                    }
                    <ul class="mt-3 space-y-1.5">
                      <li class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <svg class="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        {{ plan.maxUsers }} usuarios · hasta {{ plan.maxBranches - 1 }} sucursal{{ plan.maxBranches - 1 !== 1 ? 'es' : '' }} adicional{{ plan.maxBranches - 1 !== 1 ? 'es' : '' }}
                      </li>
                      @if (plan.hasWhatsappBasic) {
                        <li class="flex items-center gap-1.5 text-xs"
                          [class]="plan.hasWhatsappAdvanced ? 'text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-300'">
                          <svg class="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                          WhatsApp {{ plan.hasWhatsappAdvanced ? 'Avanzado — recordatorios, cumpleaños, cotizaciones, campañas' : 'Básico — recordatorios automáticos de citas' }}
                        </li>
                      }
                      @if (plan.hasQuotes) {
                        <li class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <svg class="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                          Automatización Comercial (cotizaciones → citas)
                        </li>
                      } @else {
                        <li class="flex items-center gap-1.5 text-xs text-slate-400">
                          <span class="text-[10px]">🔒</span>
                          Automatización Comercial
                        </li>
                      }
                      @if (plan.hasAdvancedDashboard) {
                        <li class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <svg class="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                          Dashboard Inteligente con KPIs
                        </li>
                      } @else {
                        <li class="flex items-center gap-1.5 text-xs text-slate-400">
                          <span class="text-[10px]">🔒</span>
                          Dashboard Inteligente con KPIs
                        </li>
                      }
                      @if (plan.hasStatisticalReports) {
                        <li class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <svg class="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                          Reportes Estratégicos de rentabilidad
                        </li>
                      } @else {
                        <li class="flex items-center gap-1.5 text-xs text-slate-400">
                          <span class="text-[10px]">🔒</span>
                          Reportes Estratégicos de rentabilidad
                        </li>
                      }
                      @if (plan.hasWhatsappAdvanced) {
                        <li class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <svg class="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                          Promociones Inteligentes — fechas Bolivia 🇧🇴
                        </li>
                      } @else {
                        <li class="flex items-center gap-1.5 text-xs text-slate-400">
                          <span class="text-[10px]">🔒</span>
                          Promociones Inteligentes — fechas Bolivia 🇧🇴
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
              <!-- CTA -->
              <div class="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 text-white">
                <p class="font-semibold text-sm">¿Quieres cambiar de plan?</p>
                <p class="text-xs text-white/80 mt-0.5">Contacta al administrador del sistema para actualizar tu suscripción</p>
                <div class="mt-3 flex flex-col sm:flex-row gap-2">
                  <a href="https://wa.me/59175455488?text=Hola%20Ing.%20Hugo%2C%20quiero%20mejorar%20mi%20plan%20en%20ClinicOS"
                    target="_blank"
                    class="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition-colors">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.135.561 4.14 1.542 5.873L.057 23.885l6.184-1.622A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.028-1.382l-.36-.215-3.728.978.995-3.635-.235-.373A9.818 9.818 0 1112 21.818z"/>
                    </svg>
                    WhatsApp +591 75455488
                  </a>
                  <div class="text-xs text-white/70 self-center">Ing. Hugo Porcel Aliaga</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Click outside to close notif / user menu -->
      @if (notifOpen() || userMenuOpen()) {
        <div class="fixed inset-0 z-[55]" (click)="notifOpen.set(false); userMenuOpen.set(false)"></div>
      }

      <!-- ── Notification Detail Modal ──────────────────────── -->
      @if (selectedNotif()) {
        <div class="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          (click)="selectedNotif.set(null)">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up"
            (click)="$event.stopPropagation()">
            <!-- Header -->
            <div class="flex items-start justify-between p-5 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div class="flex items-start gap-3">
                <!-- Icon by type -->
                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                  [ngClass]="notifTypeStyle(selectedNotif()!.type)">
                  {{ notifTypeIcon(selectedNotif()!.type) }}
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-900 dark:text-white leading-tight">{{ selectedNotif()!.title }}</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">{{ notifTimeAgo(selectedNotif()!.createdAt) }} · {{ notifTypeName(selectedNotif()!.type) }}</p>
                </div>
              </div>
              <button (click)="selectedNotif.set(null)"
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0 ml-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="p-5 space-y-4">
              <!-- Full message -->
              <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Mensaje</p>
                <p class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{{ selectedNotif()!.message }}</p>
              </div>

              <!-- Metadata details -->
              @if (selectedNotif()!.metadata) {
                <div class="grid grid-cols-2 gap-2">
                  @if (selectedNotif()!.metadata?.patientName) {
                    <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                      <p class="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Paciente</p>
                      <p class="text-xs font-semibold text-slate-800 dark:text-slate-100">{{ selectedNotif()!.metadata.patientName }}</p>
                    </div>
                  }
                  @if (selectedNotif()!.metadata?.doctorName) {
                    <div class="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3">
                      <p class="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-0.5">Doctor/a</p>
                      <p class="text-xs font-semibold text-slate-800 dark:text-slate-100">{{ selectedNotif()!.metadata.doctorName }}</p>
                    </div>
                  }
                  @if (selectedNotif()!.metadata?.scheduledAt || selectedNotif()!.metadata?.scheduledDate || selectedNotif()!.metadata?.scheduledTime) {
                    <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 col-span-2">
                      <p class="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Fecha y hora de la cita</p>
                      @if (selectedNotif()!.metadata?.scheduledAt) {
                        <p class="text-xs font-semibold text-slate-800 dark:text-slate-100">{{ notifFormatDate(selectedNotif()!.metadata.scheduledAt) }}</p>
                      } @else {
                        <div class="flex items-center gap-2 flex-wrap">
                          @if (selectedNotif()!.metadata?.scheduledDate) {
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 text-xs font-bold">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              {{ selectedNotif()!.metadata.scheduledDate }}
                            </span>
                          }
                          @if (selectedNotif()!.metadata?.scheduledTime) {
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 text-xs font-bold">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                              {{ selectedNotif()!.metadata.scheduledTime }}
                            </span>
                          }
                        </div>
                      }
                    </div>
                  }
                  @if (selectedNotif()!.metadata?.branchName) {
                    <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
                      <p class="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Sucursal</p>
                      <p class="text-xs font-semibold text-slate-800 dark:text-slate-100">{{ selectedNotif()!.metadata.branchName }}</p>
                    </div>
                  }
                  @if (selectedNotif()!.metadata?.productName) {
                    <div class="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3">
                      <p class="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">Producto</p>
                      <p class="text-xs font-semibold text-slate-800 dark:text-slate-100">{{ selectedNotif()!.metadata.productName }}</p>
                    </div>
                  }
                  @if (selectedNotif()!.metadata?.amount) {
                    <div class="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-3">
                      <p class="text-[10px] font-bold text-cyan-500 uppercase tracking-wider mb-0.5">Monto</p>
                      <p class="text-xs font-semibold text-slate-800 dark:text-slate-100">Bs. {{ selectedNotif()!.metadata.amount | number:'1.2-2' }}</p>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between p-4 pt-0 border-t border-slate-100 dark:border-slate-700 gap-2">
              @if (!selectedNotif()!.isRead) {
                <button (click)="markOneRead(selectedNotif()!); selectedNotif.set(null)"
                  class="btn-secondary text-xs flex-1 py-2">
                  ✓ Marcar como leído
                </button>
              }
              @if (selectedNotif()!.metadata?.appointmentId) {
                <button (click)="navigateFromNotif(selectedNotif()!)"
                  class="btn-primary text-xs flex-1 py-2">
                  Ver cita →
                </button>
              } @else if (selectedNotif()!.metadata?.patientId) {
                <button (click)="navigateFromNotif(selectedNotif()!)"
                  class="btn-primary text-xs flex-1 py-2">
                  Ver paciente →
                </button>
              } @else {
                <button (click)="selectedNotif.set(null)"
                  class="btn-primary text-xs flex-1 py-2">
                  Cerrar
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- ── Forced password change modal (mustChangePassword) ──── -->
      @if (showChangePasswordModal()) {
        <div class="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <!-- Header -->
            <div class="bg-gradient-to-r from-primary-500 to-violet-500 rounded-t-2xl p-5 text-white">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="font-bold text-lg">Cambio de contraseña requerido</h2>
                  <p class="text-white/80 text-sm">Por seguridad, debes cambiar tu contraseña antes de continuar</p>
                </div>
              </div>
            </div>
            <!-- Body -->
            <div class="p-5 space-y-4">
              @if (cpError()) {
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-red-700 dark:text-red-300 text-sm">
                  {{ cpError() }}
                </div>
              }
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contraseña actual</label>
                <input type="password" [(ngModel)]="cpForm.current" placeholder="Tu contraseña actual"
                  class="input w-full" [disabled]="cpSaving()">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nueva contraseña</label>
                <input type="password" [(ngModel)]="cpForm.newPass" placeholder="Mínimo 8 caracteres"
                  class="input w-full" [disabled]="cpSaving()">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirmar nueva contraseña</label>
                <input type="password" [(ngModel)]="cpForm.confirm" placeholder="Repetir nueva contraseña"
                  class="input w-full" [disabled]="cpSaving()">
              </div>
            </div>
            <!-- Footer -->
            <div class="px-5 pb-5 flex items-center justify-between gap-3">
              <button class="btn btn-ghost text-sm" (click)="logout()" [disabled]="cpSaving()">
                Cerrar sesión
              </button>
              <button class="btn btn-primary" (click)="doChangePassword()" [disabled]="cpSaving()">
                @if (cpSaving()) {
                  <svg class="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Guardando...
                } @else {
                  Cambiar contraseña
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  protected auth = inject(AuthService);
  private apiSvc = inject(ApiService);
  protected router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);
  readonly branchCtx = inject(BranchContextService);
  private routerSub!: Subscription;

  isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPER_ADMIN');
  isOnlyDoctor = computed(() => this.auth.currentUser()?.role === 'DOCTOR');
  currentSub = signal<any>(null);
  availablePlans = signal<any[]>([]);
  planModalOpen = signal(false);
  showExpiredModal = signal(false);

  isSubscriptionExpired = computed(() => {
    const sub = this.currentSub();
    if (!sub || this.isSuperAdmin()) return false;
    if (sub.status === 'EXPIRED') return true;
    if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) return true;
    return false;
  });

  planChipClass = computed(() => {
    const slug = this.currentSub()?.plan?.slug || '';
    if (slug.includes('premium')) return 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30';
    if (slug.includes('trial') || this.currentSub()?.status === 'TRIALING') return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
    return 'border-slate-300 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700';
  });

  planDotClass = computed(() => {
    const slug = this.currentSub()?.plan?.slug || '';
    if (slug.includes('premium')) return 'bg-purple-500';
    if (this.currentSub()?.status === 'TRIALING') return 'bg-blue-500';
    return 'bg-slate-400';
  });


  private readonly BRANCH_LOCKED_ROUTES = ['/treatments', '/whatsapp', '/users', '/clinics', '/branches', '/super-admin'];
  branchSelectorLocked = computed(() => {
    const url = this.currentUrl();
    return this.BRANCH_LOCKED_ROUTES.some(r => url === r || url.startsWith(r + '/'));
  });

  branchSelectorContainerClass = computed(() =>
    'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border max-w-xs transition-colors ' +
    (this.branchSelectorLocked()
      ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700 opacity-60'
      : 'bg-slate-100 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600')
  );

  collapsed = signal(false);
  mobileOpen = signal(false);
  isDesktop = signal(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  isDark = signal(document.documentElement.classList.contains('dark'));
  notifOpen = signal(false);
  userMenuOpen = signal(false);
  notifications = signal<any[]>([]);
  unreadCount = signal(0);
  selectedNotif = signal<any>(null);
  currentUrl = signal('');
  private notifInterval?: ReturnType<typeof setInterval>;

  user = this.auth.currentUser;

  clinicPrimaryColor = computed(() => this.branchCtx.activeClinic()?.primaryColor || '');
  clinicLogoUrl = computed(() => {
    const url = this.branchCtx.activeClinic()?.logoUrl;
    return url ? this.apiSvc.getStaticUrl(url) : null;
  });

  constructor() {
    // Apply clinic brand colors as CSS variables on :root
    effect(() => {
      const clinic = this.branchCtx.activeClinic();
      const root = document.documentElement;
      if (clinic?.primaryColor) {
        const hex = clinic.primaryColor;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        root.style.setProperty('--clinic-primary', hex);
        root.style.setProperty('--clinic-secondary', clinic.secondaryColor || hex);
        root.style.setProperty('--clinic-primary-bg', `rgba(${r},${g},${b},0.1)`);
        root.style.setProperty('--clinic-primary-bg-dark', `rgba(${r},${g},${b},0.2)`);
      } else {
        root.style.removeProperty('--clinic-primary');
        root.style.removeProperty('--clinic-secondary');
        root.style.removeProperty('--clinic-primary-bg');
        root.style.removeProperty('--clinic-primary-bg-dark');
      }
    });

    // Show expired subscription modal once per session
    effect(() => {
      if (this.isSubscriptionExpired()) {
        const dismissed = sessionStorage.getItem('expired-modal-seen');
        if (!dismissed) this.showExpiredModal.set(true);
      }
    });
  }

  @HostListener('window:resize')
  onResize() {
    const desktop = window.innerWidth >= 1024;
    this.isDesktop.set(desktop);
    if (desktop) this.mobileOpen.set(false);
  }

  fullName = computed(() => {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}` : '';
  });

  initials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    return `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();
  });

  userAvatarUrl = computed(() => this.apiSvc.getStaticUrl(this.user()?.avatarUrl));

  roleLabel = computed(() => {
    const roles: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Administrador',
      SECRETARY: 'Secretaria',
      DOCTOR_ADMIN: 'Médico Admin',
      DOCTOR: 'Médico',
      RECEPTIONIST: 'Recepcionista',
      NURSE: 'Enfermera',
      ACCOUNTANT: 'Contador',
    };
    return roles[this.user()?.role || ''] || this.user()?.role || '';
  });

  currentPageTitle = signal('Dashboard');

  private readonly navItems: NavItem[] = [
    { label: 'Dashboard',    icon: this.icon('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'), route: '/dashboard' },
    // Clinical
    { label: 'Agenda',       icon: this.icon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'), route: '/appointments', section: 'Clínica', roles: ['ADMIN', 'SECRETARY', 'SUPER_ADMIN', 'DOCTOR_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'] },
    { label: 'Pacientes',    icon: this.icon('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'), route: '/patients', roles: ['ADMIN', 'SECRETARY', 'SUPER_ADMIN', 'DOCTOR_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'] },
    { label: 'Doctores',     icon: this.icon('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'), route: '/doctors', roles: ['ADMIN', 'SECRETARY', 'SUPER_ADMIN', 'DOCTOR_ADMIN', 'RECEPTIONIST', 'NURSE'] },
    { label: 'Tratamientos', icon: this.icon('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'), route: '/treatments', roles: ['ADMIN', 'SECRETARY', 'SUPER_ADMIN', 'DOCTOR_ADMIN'] },
    { label: 'Cotizaciones', icon: this.icon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'), route: '/quotes', roles: ['ADMIN', 'SECRETARY', 'SUPER_ADMIN', 'DOCTOR_ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'] },
    // Operations
    { label: 'Inventario',        icon: this.icon('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'), route: '/inventory', section: 'Operaciones', roles: ['ADMIN', 'SECRETARY', 'SUPER_ADMIN', 'DOCTOR_ADMIN', 'NURSE'] },
    { label: 'WhatsApp',          icon: this.icon('M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'), route: '/whatsapp', roles: ['ADMIN', 'SECRETARY', 'SUPER_ADMIN', 'DOCTOR_ADMIN'] },
    { label: 'Comisiones',        icon: this.icon('M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'), route: '/commissions', roles: ['ADMIN', 'SECRETARY', 'ACCOUNTANT', 'SUPER_ADMIN', 'DOCTOR_ADMIN', 'DOCTOR'] },
    { label: 'Ctas. por Cobrar',  icon: this.icon('M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z'), route: '/accounts-receivable', roles: ['ADMIN', 'SECRETARY', 'ACCOUNTANT', 'SUPER_ADMIN', 'DOCTOR_ADMIN'] },
    { label: 'Importar Datos',    icon: this.icon('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'), route: '/import', roles: ['ADMIN', 'SECRETARY', 'SUPER_ADMIN', 'DOCTOR_ADMIN'] },
    // Admin
    { label: 'Bitácora',     icon: this.icon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'), route: '/audit', roles: ['ADMIN', 'SUPER_ADMIN', 'DOCTOR_ADMIN'], section: 'Configuración' },
    { label: 'Clínicas',     icon: this.icon('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'), route: '/clinics', roles: ['ADMIN', 'SUPER_ADMIN', 'DOCTOR_ADMIN'] },
    { label: 'Sucursales',   icon: this.icon('M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'), route: '/branches', roles: ['ADMIN', 'SUPER_ADMIN', 'DOCTOR_ADMIN'] },
    { label: 'Usuarios',     icon: this.icon('M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'), route: '/users', roles: ['ADMIN', 'SECRETARY', 'SUPER_ADMIN', 'DOCTOR_ADMIN'] },
    // Super admin
    { label: 'Tenants',      icon: this.icon('M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3'), route: '/super-admin/tenants', roles: ['SUPER_ADMIN'], section: 'Super Admin' },
    { label: 'Planes',       icon: this.icon('M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'), route: '/super-admin/plans', roles: ['SUPER_ADMIN'] },
    { label: 'Recargas',     icon: this.icon('M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'), route: '/super-admin/recharges', roles: ['SUPER_ADMIN'] },
  ];

  visibleNavItems = computed(() => {
    const role = this.user()?.role;
    return this.navItems.filter(item => !item.roles || !role || item.roles.includes(role));
  });

  ngOnInit() {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') this.collapsed.set(true);

    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updatePageTitle();
        this.mobileOpen.set(false);
      });
    this.updatePageTitle();
    this.loadNotifications();
    // Poll notifications every 60s
    this.notifInterval = setInterval(() => this.loadNotifications(), 60_000);
    this.branchCtx.load();
    this.loadPlanInfo();
    document.addEventListener('keydown', this.handleKeydown);
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    if (this.notifInterval) clearInterval(this.notifInterval);
    document.removeEventListener('keydown', this.handleKeydown);
  }

  toggleMenu() {
    if (this.isDesktop()) {
      this.collapsed.set(!this.collapsed());
      localStorage.setItem('sidebar-collapsed', String(this.collapsed()));
    } else {
      this.mobileOpen.set(!this.mobileOpen());
    }
  }

  private handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        if (this.isDesktop()) {
          this.collapsed.set(!this.collapsed());
          localStorage.setItem('sidebar-collapsed', String(this.collapsed()));
        }
      }
    }
  };

  private updatePageTitle() {
    const url = this.router.url.split('?')[0];
    this.currentUrl.set(url);
    const map: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/profile': 'Mi Perfil',
      '/appointments': 'Agenda',
      '/patients': 'Pacientes',
      '/doctors': 'Doctores',
      '/treatments': 'Tratamientos',
      '/quotes': 'Cotizaciones',
      '/inventory': 'Inventario',
      '/whatsapp': 'WhatsApp',
      '/audit': 'Bitácora',
      '/import': 'Importar Datos',
      '/clinics': 'Clínicas',
      '/branches': 'Sucursales',
      '/users': 'Usuarios',
      '/super-admin/tenants': 'Tenants',
      '/super-admin/plans': 'Planes',
      '/super-admin/recharges': 'Recargas',
    };
    this.currentPageTitle.set(map[url] || 'ClinicOS');
  }

  private loadNotifications() {
    this.apiSvc.get<{ data: any[]; unread: number }>('/notifications')
      .subscribe({
        next: (res: any) => {
          this.notifications.set(res?.data || []);
          this.unreadCount.set(res?.unread ?? 0);
          this.cdr.markForCheck();
        },
        error: () => {},
      });
  }

  notifTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  markAllRead() {
    this.apiSvc.patch('/notifications/read-all').subscribe({
      next: () => {
        this.unreadCount.set(0);
        this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
      },
      error: () => {},
    });
    this.notifOpen.set(false);
  }

  clickNotification(n: any) {
    this.openNotifDetail(n);
  }

  openNotifDetail(n: any) {
    this.notifOpen.set(false);
    this.selectedNotif.set(n);
    // Mark as read when opening detail
    if (!n.isRead) {
      this.apiSvc.patch(`/notifications/${n.id}/read`).subscribe({ error: () => {} });
      this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      this.unreadCount.update(c => Math.max(0, c - 1));
      // Update the selected notif to show as read too
      this.selectedNotif.update(s => s ? { ...s, isRead: true } : null);
    }
  }

  markOneRead(n: any) {
    if (n.isRead) return;
    this.apiSvc.patch(`/notifications/${n.id}/read`).subscribe({ error: () => {} });
    this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    this.unreadCount.update(c => Math.max(0, c - 1));
  }

  navigateFromNotif(n: any) {
    this.selectedNotif.set(null);
    const meta = n.metadata || {};
    if (meta.appointmentId) {
      const dateStr = meta.scheduledDate || (meta.scheduledAt ? meta.scheduledAt.split('T')[0] : null);
      const qp: any = { appointmentId: meta.appointmentId };
      if (dateStr) qp['date'] = dateStr;
      this.router.navigate(['/appointments'], { queryParams: qp });
      return;
    }
    if (meta.patientId) { this.router.navigate(['/patients']); return; }
    if (meta.quoteId) { this.router.navigate(['/quotes']); return; }
    if (meta.productId || n.type === 'INVENTORY_ALERT') { this.router.navigate(['/inventory']); return; }
    if (n.type?.startsWith('APPOINTMENT')) { this.router.navigate(['/appointments']); return; }
    if (n.type === 'PLAN_EXPIRY' || n.type === 'PAYMENT_DUE') { this.router.navigate(['/dashboard']); return; }
  }

  notifTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      NO_SHOW: '🚨', APPOINTMENT_REMINDER: '⏰', APPOINTMENT_CREATED: '📅',
      APPOINTMENT_CANCELLED: '❌', APPOINTMENT_COMPLETED: '✅', APPOINTMENT_RESCHEDULED: '🔄',
      PAYMENT_RECEIVED: '💰', PAYMENT_DUE: '💳', INVENTORY_ALERT: '📦',
      PLAN_EXPIRY: '⚠️', BIRTHDAY: '🎂', GENERAL: '🔔',
    };
    return icons[type] ?? '🔔';
  }

  notifTypeName(type: string): string {
    const names: Record<string, string> = {
      NO_SHOW: 'Paciente no se presentó', APPOINTMENT_REMINDER: 'Recordatorio de cita',
      APPOINTMENT_CREATED: 'Nueva cita', APPOINTMENT_CANCELLED: 'Cita cancelada',
      APPOINTMENT_COMPLETED: 'Cita completada', APPOINTMENT_RESCHEDULED: 'Cita reprogramada',
      PAYMENT_RECEIVED: 'Pago recibido', PAYMENT_DUE: 'Pago pendiente',
      INVENTORY_ALERT: 'Alerta de inventario', PLAN_EXPIRY: 'Vencimiento de plan',
      BIRTHDAY: 'Cumpleaños', GENERAL: 'General',
    };
    return names[type] ?? type;
  }

  notifTypeStyle(type: string): string {
    if (type === 'NO_SHOW' || type === 'APPOINTMENT_CANCELLED') return 'bg-red-100 dark:bg-red-900/30';
    if (type?.startsWith('APPOINTMENT')) return 'bg-blue-100 dark:bg-blue-900/30';
    if (type === 'PAYMENT_RECEIVED') return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (type === 'PAYMENT_DUE') return 'bg-amber-100 dark:bg-amber-900/30';
    if (type === 'INVENTORY_ALERT') return 'bg-rose-100 dark:bg-rose-900/30';
    if (type === 'PLAN_EXPIRY') return 'bg-orange-100 dark:bg-orange-900/30';
    if (type === 'BIRTHDAY') return 'bg-pink-100 dark:bg-pink-900/30';
    return 'bg-slate-100 dark:bg-slate-700';
  }

  notifFormatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('es-BO', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  }

  toggleTheme() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    this.isDark.set(html.classList.contains('dark'));
    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
  }

  onClinicChange(clinicId: string) {
    const clinic = this.branchCtx.clinics().find(c => c.id === clinicId);
    if (clinic) this.branchCtx.selectClinic(clinic);
  }

  onBranchChange(branchId: string) {
    if (!branchId) {
      this.branchCtx.selectAllBranches();
    } else {
      const branch = this.branchCtx.branches().find(b => b.id === branchId);
      if (branch) this.branchCtx.selectBranch(branch);
    }
  }

  logout() { this.auth.logout(); }

  dismissExpiredModal() {
    sessionStorage.setItem('expired-modal-seen', '1');
    this.showExpiredModal.set(false);
  }

  renewalWaLink = computed(() => {
    const planName = this.currentSub()?.plan?.name || 'mi plan';
    const msg = `Hola, necesito renovar mi suscripción de ClinicOS. Plan: ${planName}`;
    return `https://wa.me/59175455488?text=${encodeURIComponent(msg)}`;
  });

  private loadPlanInfo() {
    if (this.isSuperAdmin()) return;
    this.apiSvc.get<any>('/plans/my-plan').subscribe({
      next: (sub) => {
        this.currentSub.set(sub);
        // Sync planSlug into currentUser so isPremiumOrHigher computed works immediately
        if (sub?.plan?.slug) {
          this.auth.updateUser({ planSlug: sub.plan.slug, planName: sub.plan.name });
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.apiSvc.get<any[]>('/plans', { isActive: true }).subscribe({
      next: (plans: any) => { this.availablePlans.set(Array.isArray(plans) ? plans : []); this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  // ── Forced password change ─────────────────────────────────
  showChangePasswordModal = computed(() => !!this.auth.currentUser()?.mustChangePassword);
  cpForm = { current: '', newPass: '', confirm: '' };
  cpError = signal('');
  cpSaving = signal(false);

  doChangePassword() {
    this.cpError.set('');
    if (!this.cpForm.current) {
      this.cpError.set('Ingresa tu contraseña actual');
      return;
    }
    if (this.cpForm.newPass.length < 8) {
      this.cpError.set('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (this.cpForm.newPass !== this.cpForm.confirm) {
      this.cpError.set('Las contraseñas no coinciden');
      return;
    }
    this.cpSaving.set(true);
    this.apiSvc.post('/auth/change-password', {
      currentPassword: this.cpForm.current,
      newPassword: this.cpForm.newPass,
    }).subscribe({
      next: () => {
        this.auth.updateUser({ mustChangePassword: false });
        this.cpForm = { current: '', newPass: '', confirm: '' };
        this.cpSaving.set(false);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.cpError.set(err?.error?.message || err?.error?.data?.message || 'Error al cambiar contraseña');
        this.cpSaving.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private icon(d: string): SafeHtml {
    const svg = `<svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="${d}"/></svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
