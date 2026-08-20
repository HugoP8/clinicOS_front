import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-global-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (msg of toast.messages(); track msg.id) {
        <div class="animate-toast-in" [ngClass]="'toast-' + msg.type" (click)="toast.dismiss(msg.id)" role="alert">
          <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            @if (msg.type === 'success') {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            } @else {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
            }
          </svg>
          <span>{{ msg.text }}</span>
        </div>
      }
    </div>
  `,
})
export class GlobalToastComponent {
  toast = inject(ToastService);
}
