import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

/**
 * Toast global para errores inesperados (p. ej. errores 5xx del backend) que
 * ningún componente atrapa localmente. Los mensajes de negocio esperados
 * (400/403/409 con su propio manejo por pantalla) siguen mostrándose como
 * hasta ahora — este servicio es solo la red de contención para que un error
 * de servidor nunca quede completamente silencioso para el usuario.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly messages = signal<ToastMessage[]>([]);

  show(text: string, type: ToastType = 'error', durationMs = 6000) {
    const id = ++this.nextId;
    this.messages.update(list => [...list, { id, type, text }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number) {
    this.messages.update(list => list.filter(m => m.id !== id));
  }
}
