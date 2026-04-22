import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  styles: [`
    /* ── Carousel ─────────────────────────────────── */
    .carousel-track { position:relative; width:100%; height:100%; }
    .carousel-slide {
      position:absolute; inset:0;
      transition: opacity 0.9s cubic-bezier(0.4,0,0.2,1), transform 0.9s cubic-bezier(0.4,0,0.2,1);
      opacity:0; transform:scale(1.04);
    }
    .carousel-slide.active { opacity:1; transform:scale(1); }

    /* ── Dots ──────────────────────────────────────── */
    .dot {
      width:8px; height:8px; border-radius:999px;
      background:rgba(255,255,255,0.3); cursor:pointer;
      transition:all 0.35s cubic-bezier(0.4,0,0.2,1); border:none;
    }
    .dot.active { background:#fff; width:28px; box-shadow:0 0 10px rgba(255,255,255,0.6); }

    /* ── Arrow buttons ─────────────────────────────── */
    .arrow-btn {
      width:38px; height:38px; border-radius:50%;
      background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.18);
      color:white; cursor:pointer; display:flex; align-items:center; justify-content:center;
      backdrop-filter:blur(6px);
      transition:background 0.2s ease, transform 0.15s ease;
    }
    .arrow-btn:hover { background:rgba(255,255,255,0.28); transform:scale(1.1); }

    /* ── Panel entrance ────────────────────────────── */
    .left-panel  { animation: panelInLeft  0.65s cubic-bezier(0.16,1,0.3,1) both; }
    .right-panel { animation: panelInRight 0.65s cubic-bezier(0.16,1,0.3,1) 0.08s both; }
    @keyframes panelInLeft  { from{opacity:0;transform:translateX(-24px);} to{opacity:1;transform:none;} }
    @keyframes panelInRight { from{opacity:0;transform:translateX(24px);}  to{opacity:1;transform:none;} }

    /* ── Left panel logo ───────────────────────────── */
    .logo-bar { animation: fadeDown 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
    @keyframes fadeDown { from{opacity:0;transform:translateY(-10px);} to{opacity:1;transform:none;} }

    /* ── Caption ───────────────────────────────────── */
    .demo-pill { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.5s both; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:none;} }

    /* ── Right panel brand animation ───────────────── */
    .brand-enter { animation: brandIn 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s both; }
    @keyframes brandIn {
      from { opacity:0; transform:translateY(-20px) scale(0.93); }
      to   { opacity:1; transform:none; }
    }

    /* ── Form animation ────────────────────────────── */
    .form-enter { animation: formIn 0.65s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
    @keyframes formIn {
      from { opacity:0; transform:translateY(22px); }
      to   { opacity:1; transform:none; }
    }

    /* ── Logo glow ring ────────────────────────────── */
    .logo-glow {
      position:absolute; inset:-30%;
      background:radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 65%);
      border-radius:50%; filter:blur(18px); pointer-events:none;
    }

    /* ── Tagline decorators ────────────────────────── */
    .tag-line { height:1px; width:32px; background:linear-gradient(to right, transparent, #cbd5e1); }
    .tag-line.r { background:linear-gradient(to left, transparent, #cbd5e1); }

  `],
  template: `
    <div class="min-h-screen flex overflow-hidden">

      <!-- ═══ LEFT PANEL — Image Carousel ═══════════════════════ -->
      <div class="left-panel hidden lg:flex lg:w-[54%] xl:w-[57%] relative bg-[#050d1a] overflow-hidden">

        <!-- Slides -->
        <div class="carousel-track h-full">
          @for (slide of slides; track $index) {
            <div class="carousel-slide" [class.active]="current() === $index">
              <img [src]="slide.src" [alt]="slide.alt"
                   class="w-full h-full object-contain select-none pointer-events-none"
                   draggable="false">
              <div class="absolute inset-0 pointer-events-none"
                   style="background:linear-gradient(to bottom,rgba(5,13,26,0.55) 0%,transparent 18%,transparent 75%,rgba(5,13,26,0.88) 100%);">
              </div>
            </div>
          }
        </div>

        <!-- Logo bar (top-left) -->
        <div class="logo-bar absolute top-5 left-6 z-20">
          <img src="/logo-clinicos.png" alt="ClinicOS" class="h-14 object-contain"
               style="filter:drop-shadow(0 2px 14px rgba(96,165,250,0.6));">
        </div>

        <!-- Arrows -->
        <button class="arrow-btn absolute left-4 top-1/2 -translate-y-1/2 z-20" (click)="prev()">
          <svg style="width:15px;height:15px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <button class="arrow-btn absolute right-4 top-1/2 -translate-y-1/2 z-20" (click)="next()">
          <svg style="width:15px;height:15px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        <!-- Caption -->
        <div class="demo-pill absolute bottom-14 left-0 right-0 px-6 flex items-center justify-between z-20">
          <p class="text-white/70 text-xs font-medium max-w-[60%]">{{ slides[current()].caption }}</p>
          <span class="text-white/30 text-xs font-mono">{{ current() + 1 }}/{{ slides.length }}</span>
        </div>

        <!-- Dots -->
        <div class="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2 z-20">
          @for (slide of slides; track $index) {
            <button class="dot" [class.active]="current() === $index" (click)="goTo($index)"></button>
          }
        </div>
      </div>

      <!-- ═══ RIGHT PANEL — Login form ════════════════════════════ -->
      <div class="right-panel flex-1 flex flex-col items-center justify-center
                  bg-white dark:bg-slate-900 relative overflow-hidden
                  px-6 sm:px-12 py-8 min-h-screen"
           style="background-image:
             radial-gradient(ellipse at 85% 8%,  rgba(37,99,235,0.065) 0%, transparent 48%),
             radial-gradient(ellipse at 12% 92%, rgba(99,102,241,0.065) 0%, transparent 48%),
             radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.03)  0%, transparent 65%);">

        <!-- Content wrapper — vertically centered, max width -->
        <div class="w-full max-w-[420px] relative z-10">

          <!-- Brand logo — always visible on ALL screens -->
          <div class="brand-enter flex flex-col items-center mb-9">
            <div class="relative flex items-center justify-center mb-4">
              <div class="logo-glow"></div>
              <img src="/logo-clinicos.png" alt="ClinicOS"
                   class="relative h-24 w-auto object-contain"
                   style="filter:drop-shadow(0 8px 24px rgba(37,99,235,0.35)) drop-shadow(0 2px 6px rgba(37,99,235,0.2));">
            </div>
            <div class="flex items-center gap-3">
              <span class="tag-line"></span>
              <p class="text-slate-400 dark:text-slate-500 text-[0.62rem] font-bold tracking-[0.2em] uppercase whitespace-nowrap select-none">
                Sistema de Gestión Clínica
              </p>
              <span class="tag-line r"></span>
            </div>
          </div>

          <!-- Form -->
          <div class="form-enter">
            <router-outlet />
          </div>

        </div>

        <!-- Footer — absolute so it doesn't affect centering -->
        <p class="absolute bottom-4 left-0 right-0 text-center text-slate-400 dark:text-slate-600 text-xs select-none">
          © 2026 ClinicOS &nbsp;·&nbsp; v1.0
        </p>
      </div>

    </div>
  `,
})
export class AuthLayoutComponent implements OnInit, OnDestroy {
  readonly slides = [
    { src: '/slide-1.png', alt: 'Tu clínica en control total', caption: 'Agenda, historial, WhatsApp automático y más — todo en un solo lugar' },
    { src: '/slide-2.png', alt: 'Planes disponibles', caption: 'Plan Básico desde 200 Bs/mes · Plan Premium desde 300 Bs/mes' },
    { src: '/slide-3.png', alt: 'Planes y funcionalidades', caption: 'Dashboard inteligente, reportes estratégicos y automatización comercial' },
  ];

  current = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    const root = document.documentElement;
    root.style.removeProperty('--clinic-primary');
    root.style.removeProperty('--clinic-secondary');
    root.style.removeProperty('--clinic-primary-bg');
    root.style.removeProperty('--clinic-primary-bg-dark');
    this.startTimer();
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private startTimer() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.current.update(i => (i + 1) % this.slides.length);
    }, 5500);
  }

  goTo(i: number) { this.current.set(i); this.startTimer(); }
  next() { this.current.update(i => (i + 1) % this.slides.length); this.startTimer(); }
  prev() { this.current.update(i => (i - 1 + this.slides.length) % this.slides.length); this.startTimer(); }
}
