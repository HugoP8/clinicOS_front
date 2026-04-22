import { Component, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-6 animate-fade-in">

      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Mi Perfil</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona tu información personal y seguridad</p>
      </div>

      <!-- ── Tarjeta de perfil ─────────────────────────────── -->
      <div class="card p-6">
        <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-5">Información personal</h2>

        <div class="flex flex-col sm:flex-row items-start gap-6">
          <!-- Avatar -->
          <div class="flex flex-col items-center gap-3 shrink-0">
            <div class="relative group">
              <div class="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary-100 dark:ring-primary-900/40 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                @if (avatarPreview() || avatarUrl()) {
                  <img [src]="avatarPreview() || avatarUrl()!" alt="Avatar" class="w-full h-full object-cover">
                } @else {
                  <span class="text-white text-3xl font-bold">{{ initials() }}</span>
                }
              </div>
              <!-- Overlay hover -->
              <label class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp" (change)="onAvatarChange($event)">
              </label>
            </div>
            @if (avatarFile()) {
              <div class="flex gap-2">
                <button (click)="saveAvatar()" [disabled]="savingAvatar()"
                  class="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                  @if (savingAvatar()) { Guardando... } @else { Guardar foto }
                </button>
                <button (click)="cancelAvatar()" class="btn-secondary text-xs px-3 py-1.5">
                  Cancelar
                </button>
              </div>
            } @else {
              <p class="text-xs text-slate-400 text-center">Haz clic en la foto<br>para cambiarla</p>
            }
            @if (avatarSuccess()) {
              <p class="text-xs text-green-600 dark:text-green-400 font-medium">Foto actualizada</p>
            }
          </div>

          <!-- Datos del usuario -->
          <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Nombre</p>
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ user()?.firstName }} {{ user()?.lastName }}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Correo electrónico</p>
              <p class="text-sm text-slate-700 dark:text-slate-300">{{ user()?.email }}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Rol</p>
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                {{ roleLabel() }}
              </span>
            </div>
            @if (user()?.tenant?.name) {
              <div>
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Clínica</p>
                <p class="text-sm text-slate-700 dark:text-slate-300">{{ user()?.tenant?.name }}</p>
              </div>
            }
            @if (planLabel()) {
              <div>
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Plan</p>
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  {{ planLabel() }}
                </span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- ── Cambiar contraseña ────────────────────────────── -->
      <div class="card p-6">
        <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Cambiar contraseña</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">Se cerrarán todas las sesiones activas en otros dispositivos.</p>

        @if (pwSuccess()) {
          <div class="alert alert-success mb-4">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Contraseña actualizada correctamente.
          </div>
        }

        @if (pwError()) {
          <div class="alert alert-error mb-4">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {{ pwError() }}
          </div>
        }

        <form (ngSubmit)="changePassword()" class="space-y-4 max-w-sm">
          <div class="form-group">
            <label class="label">Contraseña actual</label>
            <div class="relative">
              <input [type]="showCurrent() ? 'text' : 'password'" [(ngModel)]="pw.current" name="current"
                class="input pr-10" placeholder="••••••••" autocomplete="current-password">
              <button type="button" (click)="showCurrent.set(!showCurrent())"
                class="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600">
                @if (showCurrent()) {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                }
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="label">Nueva contraseña</label>
            <div class="relative">
              <input [type]="showNew() ? 'text' : 'password'" [(ngModel)]="pw.newPass" name="newPass"
                class="input pr-10" placeholder="Mínimo 8 caracteres" autocomplete="new-password">
              <button type="button" (click)="showNew.set(!showNew())"
                class="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600">
                @if (showNew()) {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                }
              </button>
            </div>
            <!-- Indicador de fortaleza -->
            @if (pw.newPass.length > 0) {
              <div class="mt-2 space-y-1">
                <div class="flex gap-1">
                  @for (i of [1,2,3,4]; track i) {
                    <div class="h-1 flex-1 rounded-full transition-colors"
                      [class]="i <= passwordStrength() ? strengthColor() : 'bg-slate-200 dark:bg-slate-700'"></div>
                  }
                </div>
                <p class="text-[11px]" [class]="strengthTextColor()">{{ strengthLabel() }}</p>
              </div>
            }
          </div>

          <div class="form-group">
            <label class="label">Confirmar contraseña</label>
            <input [type]="showNew() ? 'text' : 'password'" [(ngModel)]="pw.confirm" name="confirm"
              class="input" placeholder="Repetir contraseña" autocomplete="new-password">
            @if (pw.confirm && pw.confirm !== pw.newPass) {
              <p class="field-error">Las contraseñas no coinciden</p>
            }
          </div>

          <button type="submit" [disabled]="savingPw() || !canSubmitPw()"
            class="btn-primary w-full disabled:opacity-50">
            @if (savingPw()) { Guardando... } @else { Actualizar contraseña }
          </button>
        </form>
      </div>

    </div>
  `,
})
export class ProfileComponent {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  user = this.auth.currentUser;

  avatarFile = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  savingAvatar = signal(false);
  avatarSuccess = signal(false);

  pw = { current: '', newPass: '', confirm: '' };
  showCurrent = signal(false);
  showNew = signal(false);
  savingPw = signal(false);
  pwError = signal('');
  pwSuccess = signal(false);

  avatarUrl = computed(() => this.api.getStaticUrl(this.user()?.avatarUrl));

  initials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    return `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();
  });

  roleLabel = computed(() => {
    const roles: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin', ADMIN: 'Administrador', DOCTOR: 'Médico',
      RECEPTIONIST: 'Recepcionista', NURSE: 'Enfermera', ACCOUNTANT: 'Contador',
    };
    return roles[this.user()?.role || ''] || this.user()?.role || '';
  });

  planLabel = computed(() => {
    const slugs: Record<string, string> = {
      basic: 'Basic', premium: 'Premium', platinum: 'Platinum',
    };
    const slug = this.user()?.planSlug;
    return slug ? (slugs[slug] || slug) : null;
  });

  // ── Fortaleza de contraseña ────────────────────────────────
  passwordStrength = computed(() => {
    const p = this.pw.newPass;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p) && /[^a-zA-Z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  });

  strengthLabel = computed(() => ['Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'][this.passwordStrength()] || '');
  strengthColor = computed(() => ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500', 'bg-emerald-500'][this.passwordStrength()] || 'bg-slate-200');
  strengthTextColor = computed(() => ['text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600', 'text-emerald-600'][this.passwordStrength()] || '');

  canSubmitPw = computed(() =>
    this.pw.current.length > 0 &&
    this.pw.newPass.length >= 8 &&
    this.pw.newPass === this.pw.confirm
  );

  // ── Avatar ─────────────────────────────────────────────────
  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.avatarFile.set(file);
    this.avatarSuccess.set(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarPreview.set(e.target?.result as string);
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  cancelAvatar() {
    this.avatarFile.set(null);
    this.avatarPreview.set(null);
  }

  saveAvatar() {
    const file = this.avatarFile();
    const userId = this.user()?.id;
    if (!file || !userId) return;
    this.savingAvatar.set(true);
    const fd = new FormData();
    fd.append('avatar', file);
    this.api.upload<{ avatarUrl: string }>(`/uploads/users/${userId}/avatar`, fd).subscribe({
      next: (res: any) => {
        const url = res?.data?.avatarUrl || res?.avatarUrl;
        if (url) this.auth.updateUser({ avatarUrl: url });
        this.avatarFile.set(null);
        this.avatarPreview.set(null);
        this.savingAvatar.set(false);
        this.avatarSuccess.set(true);
        this.cdr.markForCheck();
        setTimeout(() => { this.avatarSuccess.set(false); this.cdr.markForCheck(); }, 3000);
      },
      error: () => {
        this.savingAvatar.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Cambiar contraseña ─────────────────────────────────────
  changePassword() {
    if (!this.canSubmitPw()) return;
    this.pwError.set('');
    this.pwSuccess.set(false);
    this.savingPw.set(true);

    this.api.post('/auth/change-password', {
      currentPassword: this.pw.current,
      newPassword: this.pw.newPass,
    }).subscribe({
      next: () => {
        this.pw = { current: '', newPass: '', confirm: '' };
        this.savingPw.set(false);
        this.pwSuccess.set(true);
        this.auth.updateUser({ mustChangePassword: false });
        this.cdr.markForCheck();
        setTimeout(() => { this.pwSuccess.set(false); this.cdr.markForCheck(); }, 5000);
      },
      error: (err: any) => {
        this.pwError.set(
          err?.error?.data?.message || err?.error?.message || 'Error al cambiar contraseña'
        );
        this.savingPw.set(false);
        this.cdr.markForCheck();
      },
    });
  }
}
