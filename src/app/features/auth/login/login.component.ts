import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  styles: [`
    .hdr  { animation: riseUp 0.48s cubic-bezier(0.16,1,0.3,1) 0.18s both; }
    .f1   { animation: riseUp 0.48s cubic-bezier(0.16,1,0.3,1) 0.28s both; }
    .f2   { animation: riseUp 0.48s cubic-bezier(0.16,1,0.3,1) 0.36s both; }
    .sbmt { animation: riseUp 0.48s cubic-bezier(0.16,1,0.3,1) 0.44s both; }
    .btns { animation: riseUp 0.48s cubic-bezier(0.16,1,0.3,1) 0.52s both; }
    .mnl  { animation: riseUp 0.48s cubic-bezier(0.16,1,0.3,1) 0.60s both; }

    @keyframes riseUp {
      from { opacity:0; transform:translateY(18px); }
      to   { opacity:1; transform:none; }
    }

    .li {
      display:block; width:100%;
      padding: 0.78rem 1rem 0.78rem 2.85rem;
      border-radius: 0.875rem;
      border: 1.5px solid #e2e8f0;
      background: #f8fafc;
      font-size: 0.9375rem; color: #0f172a;
      outline: none;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
    }
    .li:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 4px rgba(37,99,235,0.13); }
    .li.err   { border-color:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,0.11); }
    .li::placeholder { color:#94a3b8; }

    .btn-login {
      display:flex; align-items:center; justify-content:center; gap:0.5rem;
      width:100%; padding:0.9rem 1rem; border-radius:0.875rem;
      background: linear-gradient(135deg, #1e40af 0%, #2563eb 55%, #3b82f6 100%);
      background-size:200% 100%;
      color:#fff; font-size:0.9375rem; font-weight:700;
      border:none; cursor:pointer; letter-spacing:0.01em;
      box-shadow:0 4px 18px rgba(37,99,235,0.42);
      transition: background-position 0.4s ease, box-shadow 0.25s ease, transform 0.12s ease;
    }
    .btn-login:hover:not(:disabled) { background-position:right center; box-shadow:0 6px 26px rgba(37,99,235,0.55); transform:translateY(-1px); }
    .btn-login:active:not(:disabled) { transform:translateY(0); }
    .btn-login:disabled { opacity:0.58; cursor:not-allowed; transform:none; }

    /* ── Demo / Cuenta buttons ──────────────────────── */
    .btn-account {
      display:flex; align-items:center; gap:0.625rem;
      width:100%; padding:0.8rem 1rem; border-radius:0.875rem;
      background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%);
      color:#fff; font-size:0.875rem; font-weight:700;
      border:none; cursor:pointer;
      box-shadow:0 4px 14px rgba(109,40,217,0.35);
      transition: box-shadow 0.25s ease, transform 0.12s ease;
      position:relative; overflow:hidden;
    }
    .btn-account::before {
      content:''; position:absolute; inset:0;
      background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
      transform:translateX(-100%); transition:transform 0.6s ease;
    }
    .btn-account:hover::before { transform:translateX(100%); }
    .btn-account:hover { box-shadow:0 6px 20px rgba(109,40,217,0.5); transform:translateY(-1px); }
    .btn-account:active { transform:translateY(0); }

    .btn-demo {
      display:flex; align-items:center; gap:0.625rem;
      width:100%; padding:0.8rem 1rem; border-radius:0.875rem;
      background: linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%);
      color:#fff; font-size:0.875rem; font-weight:700;
      border:none; cursor:pointer;
      box-shadow:0 4px 14px rgba(22,163,74,0.35);
      transition: box-shadow 0.25s ease, transform 0.12s ease;
      position:relative; overflow:hidden;
    }
    .btn-demo::before {
      content:''; position:absolute; inset:0;
      background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
      transform:translateX(-100%); transition:transform 0.6s ease;
    }
    .btn-demo:hover::before { transform:translateX(100%); }
    .btn-demo:hover { box-shadow:0 6px 20px rgba(22,163,74,0.5); transform:translateY(-1px); }
    .btn-demo:active { transform:translateY(0); }

    .tb { display:flex; align-items:center; gap:0.3rem; font-size:0.68rem; color:#94a3b8; font-weight:500; }

    /* ── Expiry warning modal ────────────────────────── */
    .expiry-modal-bg {
      position:fixed; inset:0; background:rgba(0,0,0,0.5);
      backdrop-filter:blur(4px); z-index:9999;
      display:flex; align-items:center; justify-content:center; padding:1rem;
      animation: fadeIn 0.2s ease both;
    }
    .expiry-modal {
      background:#fff; border-radius:1.25rem; padding:2rem;
      max-width:26rem; width:100%; box-shadow:0 25px 60px rgba(0,0,0,0.2);
      animation: scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    @keyframes fadeIn  { from{opacity:0;} to{opacity:1;} }
    @keyframes scaleIn { from{opacity:0;transform:scale(0.9);} to{opacity:1;transform:scale(1);} }
  `],
  template: `
    <!-- ── Expiry warning modal ──────────────────────────────── -->
    @if (showExpiryWarning()) {
      <div class="expiry-modal-bg" (click)="dismissWarning()">
        <div class="expiry-modal" (click)="$event.stopPropagation()">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <svg style="width:22px;height:22px" class="text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-base">Tu plan vence mañana</h3>
              <p class="text-xs text-slate-500">Renueva ahora para no perder acceso</p>
            </div>
          </div>
          <p class="text-sm text-slate-600 mb-5 leading-relaxed">
            Tu suscripción de ClinicOS vence <strong>mañana</strong>. Si no renuevas, el acceso al sistema será suspendido.
            Contáctanos para renovar tu plan y continuar sin interrupciones.
          </p>
          <div class="flex flex-col gap-2">
            <button (click)="openRenewalWA()" class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-colors">
              <svg style="width:18px;height:18px" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.115 1.528 5.843L.057 23.428a.5.5 0 00.623.612l5.684-1.49A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.88 0-3.645-.514-5.157-1.41l-.37-.22-3.377.885.9-3.288-.24-.38A9.944 9.944 0 012 12C2 6.478 6.478 2 12 2s10 4.478 10 10-4.478 10-10 10z"/>
              </svg>
              Renovar mi plan ahora · WhatsApp
            </button>
            <button (click)="dismissWarning()" class="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              Continuar sin renovar por ahora
            </button>
          </div>
        </div>
      </div>
    }

    <div>
      <!-- Header -->
      <div class="hdr mb-7 text-center">
        <h2 class="text-[1.7rem] font-black text-slate-900 dark:text-white leading-tight tracking-tight mb-1.5">
          Bienvenido de vuelta
        </h2>
        <p class="text-slate-400 dark:text-slate-500 text-sm">Ingresa tus credenciales para continuar</p>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4" novalidate>

        <!-- Email o Celular -->
        <div class="f1">
          <label class="block text-[0.7rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
            Correo electrónico o celular
          </label>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg style="width:17px;height:17px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </span>
            <input type="text" formControlName="email" class="li" [class.err]="emailInvalid()"
              placeholder="correo@clinica.com o 75455488" autocomplete="username" autocapitalize="none">
          </div>
          @if (emailInvalid()) {
            <p class="mt-1.5 text-xs text-red-500 flex items-center gap-1 animate-slide-down">
              <svg style="width:13px;height:13px;min-width:13px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Ingresa tu correo electrónico o número de celular
            </p>
          }
        </div>

        <!-- Password -->
        <div class="f2">
          <label class="block text-[0.7rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
            Contraseña
          </label>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg style="width:17px;height:17px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </span>
            <input [type]="showPwd() ? 'text' : 'password'" formControlName="password"
              class="li" [class.err]="passwordInvalid()"
              style="padding-right:2.75rem" placeholder="••••••••"
              autocomplete="current-password" autocorrect="off" autocapitalize="none" spellcheck="false">
            <button type="button" (click)="showPwd.set(!showPwd())"
              class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded">
              <svg style="width:17px;height:17px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                @if (showPwd()) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                }
              </svg>
            </button>
          </div>
          @if (passwordInvalid()) {
            <p class="mt-1.5 text-xs text-red-500 flex items-center gap-1 animate-slide-down">
              <svg style="width:13px;height:13px;min-width:13px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Mínimo 6 caracteres
            </p>
          }
        </div>

        @if (error()) {
          <div class="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 animate-slide-down">
            <svg style="width:17px;height:17px;min-width:17px" class="text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="flex-1">
              <span class="text-red-700 dark:text-red-300 text-sm font-medium">{{ error() }}</span>
              @if (showContactWA()) {
                <button (click)="openRenewalWA()" class="mt-2 flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700 transition-colors">
                  <svg style="width:14px;height:14px" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.115 1.528 5.843L.057 23.428a.5.5 0 00.623.612l5.684-1.49A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.88 0-3.645-.514-5.157-1.41l-.37-.22-3.377.885.9-3.288-.24-.38A9.944 9.944 0 012 12C2 6.478 6.478 2 12 2s10 4.478 10 10-4.478 10-10 10z"/></svg>
                  Contactar administrador por WhatsApp
                </button>
              }
            </div>
          </div>
        }

        <div class="sbmt pt-1">
          <button type="submit" class="btn-login" [disabled]="loading() || form.invalid">
            @if (loading()) {
              <svg class="animate-spin" style="width:18px;height:18px" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Verificando...
            } @else {
              <svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
              </svg>
              Iniciar sesión
            }
          </button>
        </div>
      </form>

      <!-- ── Botones de conversión ──────────────────────────── -->
      <div class="btns mt-5">
        <div class="flex items-center gap-3 mb-3">
          <div class="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
          <span class="text-[0.7rem] text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap">
            ¿Aún no tienes cuenta?
          </span>
          <div class="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
        </div>

        <div class="grid grid-cols-1 gap-2.5">
          <!-- Solicita tu cuenta -->
          <button (click)="openAccount()" class="btn-account">
            <svg style="width:20px;height:20px;min-width:20px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <div class="text-left min-w-0">
              <div class="text-sm font-black leading-tight">✨ Solicita tu cuenta</div>
              <div class="text-xs font-normal opacity-85 mt-0.5">Elige tu plan · Básico o Premium</div>
            </div>
            <svg style="width:14px;height:14px;min-width:14px;margin-left:auto;opacity:0.7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
            </svg>
          </button>

          <!-- Demo gratuita -->
          <button (click)="openDemo()" class="btn-demo">
            <svg style="width:20px;height:20px;min-width:20px" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.115 1.528 5.843L.057 23.428a.5.5 0 00.623.612l5.684-1.49A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.88 0-3.645-.514-5.157-1.41l-.37-.22-3.377.885.9-3.288-.24-.38A9.944 9.944 0 012 12C2 6.478 6.478 2 12 2s10 4.478 10 10-4.478 10-10 10z"/>
            </svg>
            <div class="text-left min-w-0">
              <div class="text-sm font-black leading-tight">🎁 Demo gratuita — 7 días</div>
              <div class="text-xs font-normal opacity-85 mt-0.5">Sin tarjeta · Sin compromiso</div>
            </div>
            <svg style="width:14px;height:14px;min-width:14px;margin-left:auto;opacity:0.7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <!-- Trust strip -->
        <div class="flex items-center justify-center gap-4 mt-3 flex-wrap">
          <span class="tb">
            <svg style="width:11px;height:11px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            Datos seguros
          </span>
          <span class="w-px h-3 bg-slate-200 dark:bg-slate-700"></span>
          <span class="tb">
            <svg style="width:11px;height:11px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Respuesta en minutos
          </span>
          <span class="w-px h-3 bg-slate-200 dark:bg-slate-700"></span>
          <span class="tb">🇧🇴 100% Boliviano</span>
        </div>
      </div>

      <!-- ── Manual link ─────────────────────────────────────── -->
      <div class="mnl mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <a href="/manual.html" target="_blank"
           class="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl
                  border border-blue-200 dark:border-blue-800
                  text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10
                  hover:bg-blue-100 dark:hover:bg-blue-900/30
                  hover:border-blue-300 dark:hover:border-blue-700
                  transition-all duration-200 text-sm font-semibold group">
          <svg style="width:15px;height:15px" class="text-blue-500 group-hover:scale-110 transition-transform"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
          Manual de Usuario del Sistema
          <svg style="width:12px;height:12px;opacity:0.6" class="group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </a>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email:    ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading          = signal(false);
  error            = signal('');
  showPwd          = signal(false);
  showExpiryWarning = signal(false);
  showContactWA    = signal(false);

  emailInvalid    = () => !!(this.form.get('email')?.invalid    && this.form.get('email')?.touched);
  passwordInvalid = () => !!(this.form.get('password')?.invalid && this.form.get('password')?.touched);

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    this.showContactWA.set(false);

    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        // Check if subscription expires tomorrow
        if (res?.data?.subscriptionExpiresIn === 1) {
          this.showExpiryWarning.set(true);
        }
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || err?.error?.error;
        const errorText = Array.isArray(msg) ? msg.join(', ') : msg || 'Credenciales incorrectas. Verifica e intenta de nuevo.';
        this.error.set(errorText);
        // Show WA contact if subscription expired
        if (errorText.toLowerCase().includes('suscripción') || errorText.toLowerCase().includes('vencido') || errorText.toLowerCase().includes('suspendido')) {
          this.showContactWA.set(true);
        }
      },
    });
  }

  dismissWarning() { this.showExpiryWarning.set(false); }

  openRenewalWA() {
    const msg = encodeURIComponent('¡Hola! Necesito renovar mi suscripción de ClinicOS 🏥. ¿Podrían ayudarme?');
    window.open(`https://wa.me/59175455488?text=${msg}`, '_blank');
    this.showExpiryWarning.set(false);
  }

  openAccount() {
    const msg = encodeURIComponent(
      '¡Hola! Me interesa crear una cuenta en ClinicOS 🏥\n\n¿Podrían darme información sobre los planes disponibles (Básico y Premium)? Gracias.'
    );
    window.open(`https://wa.me/59175455488?text=${msg}`, '_blank');
  }

  openDemo() {
    const msg = encodeURIComponent(
      '¡Hola! Me interesa solicitar una Demo Gratuita de 7 días de ClinicOS 🏥\n\n¿Cómo puedo comenzar? Gracias.'
    );
    window.open(`https://wa.me/59175455488?text=${msg}`, '_blank');
  }
}
