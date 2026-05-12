import { Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface OdontogramTooth {
  number: number;      // FDI: 11-18, 21-28, 31-38, 41-48
  condition?: string;  // sano | cariado | tratado | extraccion | corona | protesis | en_tratamiento | ausente
  surface?: string;    // M | D | V | L | O | C
  notes?: string;
}

export interface OdontogramSelection {
  toothNumber: number;
  surface?: string;
}

// Classify FDI tooth number into pricing group
export function classifyTooth(num: number): 'anterior' | 'premolar' | 'molar' {
  const n = num % 10;
  if (n >= 1 && n <= 3) return 'anterior';
  if (n === 4 || n === 5) return 'premolar';
  return 'molar'; // 6, 7, 8
}

const CONDITION_COLORS: Record<string, string> = {
  sano: '#ffffff',
  cariado: '#ef4444',
  tratado: '#3b82f6',
  extraccion: '#1e293b',
  corona: '#f59e0b',
  protesis: '#eab308',
  en_tratamiento: '#f97316',
  ausente: '#94a3b8',
  endodoncia: '#8b5cf6',
  implante: '#10b981',
};

@Component({
  selector: 'app-odontogram',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="odontogram-wrapper select-none">
      <!-- Mode indicator -->
      @if (mode === 'select') {
        <p class="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Haz clic en los dientes para seleccionarlos
        </p>
      }

      <!-- Upper arcade (1x, 2x) -->
      <div class="arcade-row upper">
        <!-- Quadrant 1: 18-11 -->
        <div class="quadrant">
          @for (n of [18,17,16,15,14,13,12,11]; track n) {
            <div class="tooth-wrap" [class.selected]="isSelected(n)" (click)="toggleTooth(n)">
              <div class="tooth-svg" [title]="'Diente ' + n + (getCondition(n) ? ' — ' + getCondition(n) : '')"
                [style.background]="getToothColor(n)"
                [class.tooth-selected-ring]="isSelected(n)"
                [class.tooth-molar]="isMolar(n)"
                [class.tooth-anterior]="isAnterior(n)">
                @if (getCondition(n) === 'extraccion') {
                  <span class="text-white font-black text-[8px]">✕</span>
                } @else if (getCondition(n) === 'corona') {
                  <span class="text-white font-black text-[8px]">♛</span>
                }
              </div>
              <div class="tooth-num" [class.text-blue-500]="isSelected(n)">{{ n }}</div>
            </div>
          }
        </div>
        <div class="arch-divider">|</div>
        <!-- Quadrant 2: 21-28 -->
        <div class="quadrant">
          @for (n of [21,22,23,24,25,26,27,28]; track n) {
            <div class="tooth-wrap" [class.selected]="isSelected(n)" (click)="toggleTooth(n)">
              <div class="tooth-svg" [title]="'Diente ' + n + (getCondition(n) ? ' — ' + getCondition(n) : '')"
                [style.background]="getToothColor(n)"
                [class.tooth-selected-ring]="isSelected(n)"
                [class.tooth-molar]="isMolar(n)"
                [class.tooth-anterior]="isAnterior(n)">
                @if (getCondition(n) === 'extraccion') { <span class="text-white font-black text-[8px]">✕</span> }
                @else if (getCondition(n) === 'corona') { <span class="text-white font-black text-[8px]">♛</span> }
              </div>
              <div class="tooth-num" [class.text-blue-500]="isSelected(n)">{{ n }}</div>
            </div>
          }
        </div>
      </div>

      <div class="arch-separator">
        <span class="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">Superior</span>
        <div class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
        <span class="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">Inferior</span>
      </div>

      <!-- Lower arcade (4x, 3x) -->
      <div class="arcade-row lower">
        <!-- Quadrant 4: 48-41 -->
        <div class="quadrant">
          @for (n of [48,47,46,45,44,43,42,41]; track n) {
            <div class="tooth-wrap" [class.selected]="isSelected(n)" (click)="toggleTooth(n)">
              <div class="tooth-num mb-0.5" [class.text-blue-500]="isSelected(n)">{{ n }}</div>
              <div class="tooth-svg" [title]="'Diente ' + n"
                [style.background]="getToothColor(n)"
                [class.tooth-selected-ring]="isSelected(n)"
                [class.tooth-molar]="isMolar(n)"
                [class.tooth-anterior]="isAnterior(n)">
                @if (getCondition(n) === 'extraccion') { <span class="text-white font-black text-[8px]">✕</span> }
                @else if (getCondition(n) === 'corona') { <span class="text-white font-black text-[8px]">♛</span> }
              </div>
            </div>
          }
        </div>
        <div class="arch-divider">|</div>
        <!-- Quadrant 3: 31-38 -->
        <div class="quadrant">
          @for (n of [31,32,33,34,35,36,37,38]; track n) {
            <div class="tooth-wrap" [class.selected]="isSelected(n)" (click)="toggleTooth(n)">
              <div class="tooth-num mb-0.5" [class.text-blue-500]="isSelected(n)">{{ n }}</div>
              <div class="tooth-svg" [title]="'Diente ' + n"
                [style.background]="getToothColor(n)"
                [class.tooth-selected-ring]="isSelected(n)"
                [class.tooth-molar]="isMolar(n)"
                [class.tooth-anterior]="isAnterior(n)">
                @if (getCondition(n) === 'extraccion') { <span class="text-white font-black text-[8px]">✕</span> }
                @else if (getCondition(n) === 'corona') { <span class="text-white font-black text-[8px]">♛</span> }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Surface selector (when a tooth is selected in 'select' mode) -->
      @if (mode === 'select' && selectedTeeth().length > 0 && showSurfaceSelector) {
        <div class="mt-3 flex items-center gap-2 flex-wrap">
          <span class="text-xs text-slate-500">Cara:</span>
          @for (s of surfaces; track s.value) {
            <button (click)="selectSurface(s.value)"
              class="px-2 py-1 rounded-md text-xs border transition-colors"
              [class.bg-blue-500]="activeSurface === s.value"
              [class.text-white]="activeSurface === s.value"
              [class.border-blue-500]="activeSurface === s.value"
              [class.border-slate-300]="activeSurface !== s.value"
              [class.text-slate-600]="activeSurface !== s.value">
              {{ s.label }}
            </button>
          }
        </div>
      }

      <!-- Legend -->
      @if (showLegend) {
        <div class="mt-3 flex flex-wrap gap-2">
          @for (item of legendItems; track item.label) {
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded-sm border border-slate-300" [style.background]="item.color"></div>
              <span class="text-[10px] text-slate-500">{{ item.label }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .odontogram-wrapper { font-family: system-ui, sans-serif; }
    .arcade-row { display: flex; align-items: center; gap: 4px; }
    .quadrant { display: flex; gap: 2px; }
    .arch-divider { color: #94a3b8; font-size: 12px; font-weight: 700; padding: 0 2px; }
    .arch-separator { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
    .tooth-wrap { display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 2px; border-radius: 4px; transition: background 0.1s; }
    .tooth-wrap:hover { background: rgba(59,130,246,0.08); }
    .tooth-wrap.selected { background: rgba(59,130,246,0.12); }
    .tooth-svg {
      width: 22px; height: 22px; border-radius: 4px;
      border: 1.5px solid #cbd5e1;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .tooth-svg.tooth-molar { width: 26px; }
    .tooth-svg.tooth-anterior { border-radius: 50% 50% 4px 4px; }
    .tooth-svg.tooth-selected-ring { border-color: #3b82f6; border-width: 2.5px; box-shadow: 0 0 0 2px rgba(59,130,246,0.25); }
    .tooth-num { font-size: 9px; color: #94a3b8; font-weight: 600; line-height: 1; }
  `],
})
export class OdontogramComponent implements OnChanges {
  @Input() mode: 'view' | 'select' | 'edit' = 'view';
  @Input() teeth: OdontogramTooth[] = [];
  @Input() selectedTeeth = signal<number[]>([]);
  @Input() showSurfaceSelector = false;
  @Input() showLegend = true;
  @Output() selectionChange = new EventEmitter<OdontogramSelection[]>();

  activeSurface = '';

  surfaces = [
    { value: '', label: 'General' },
    { value: 'M', label: 'Mesial' },
    { value: 'D', label: 'Distal' },
    { value: 'V', label: 'Vestibular' },
    { value: 'L', label: 'Lingual' },
    { value: 'O', label: 'Oclusal' },
  ];

  legendItems = [
    { color: '#ffffff', label: 'Sano' },
    { color: '#ef4444', label: 'Cariado' },
    { color: '#3b82f6', label: 'Tratado' },
    { color: '#f59e0b', label: 'Corona' },
    { color: '#1e293b', label: 'Extracción' },
    { color: '#f97316', label: 'En tratamiento' },
    { color: '#8b5cf6', label: 'Endodoncia' },
    { color: '#10b981', label: 'Implante' },
    { color: '#94a3b8', label: 'Ausente' },
  ];

  ngOnChanges(_: SimpleChanges) {}

  getCondition(n: number): string {
    return this.teeth.find(t => t.number === n)?.condition ?? '';
  }

  getToothColor(n: number): string {
    const cond = this.getCondition(n);
    return CONDITION_COLORS[cond] ?? '#ffffff';
  }

  isSelected(n: number): boolean {
    return this.selectedTeeth().includes(n);
  }

  isMolar(n: number): boolean {
    const p = n % 10;
    return p >= 6;
  }

  isAnterior(n: number): boolean {
    const p = n % 10;
    return p >= 1 && p <= 3;
  }

  toggleTooth(n: number) {
    if (this.mode !== 'select') return;
    const current = this.selectedTeeth();
    const idx = current.indexOf(n);
    const updated = idx === -1 ? [...current, n] : current.filter(x => x !== n);
    this.selectedTeeth.set(updated);
    this.emitSelection();
  }

  selectSurface(surface: string) {
    this.activeSurface = surface;
    this.emitSelection();
  }

  private emitSelection() {
    const selections: OdontogramSelection[] = this.selectedTeeth().map(n => ({
      toothNumber: n,
      surface: this.activeSurface || undefined,
    }));
    this.selectionChange.emit(selections);
  }

  classify(n: number) {
    return classifyTooth(n);
  }
}
