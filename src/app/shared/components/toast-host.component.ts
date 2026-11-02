import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../core/ui/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toast-host" role="region" aria-label="Notificações" aria-live="polite">
      @for (t of toastService.toasts(); track t.id) {
        <div
          class="toast"
          [class.toast-leave]="t.leaving"
          [style.--toast-color]="color(t.type)"
          [attr.role]="t.type === 'error' ? 'alert' : 'status'"
        >
          <svg class="w-5 h-5 flex-shrink-0 mt-0.5" [style.color]="color(t.type)" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="icon(t.type)" />
          </svg>
          <div class="min-w-0 flex-1">
            @if (t.title) {
              <p class="text-sm font-semibold leading-tight">{{ t.title }}</p>
            }
            <p class="text-sm leading-snug" [style.color]="t.title ? 'var(--cmm-muted)' : 'var(--cmm-ink)'">{{ t.message }}</p>
            @if (t.action) {
              <button type="button" class="btn btn-secondary btn-sm mt-2" (click)="runAction(t.id)">{{ t.action.label }}</button>
            }
          </div>
          <button type="button" class="btn btn-ghost btn-sm !min-h-0 !p-1 -mr-1" (click)="toastService.dismiss(t.id)" aria-label="Fechar aviso">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          @if (t.duration > 0 && !t.leaving) {
            <span class="toast-progress" [style.animation-duration.ms]="t.duration"></span>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast {
        animation: toast-in 620ms var(--ease-out-expo) both;
      }
      .toast-leave {
        animation: toast-out 320ms var(--ease-in-out-quart) forwards;
      }
      .toast-progress {
        animation: toast-bar linear forwards;
      }
      @keyframes toast-in {
        from { opacity: 0; transform: translateX(120%) scale(0.92); filter: blur(8px); }
        to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
      }
      @keyframes toast-out {
        to { opacity: 0; transform: translateX(60%) scale(0.95); filter: blur(6px); }
      }
      @keyframes toast-bar {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }
    `,
  ],
})
export class ToastHostComponent {
  toastService = inject(ToastService);

  color(type: ToastType): string {
    return type === 'success' ? 'var(--cmm-success)' : type === 'error' ? 'var(--cmm-danger)' : type === 'warning' ? 'var(--cmm-warning)' : 'var(--cmm-accent)';
  }

  icon(type: ToastType): string {
    switch (type) {
      case 'success': return 'M5 13l4 4L19 7';
      case 'error': return 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z';
      case 'warning': return 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z';
      default: return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  runAction(id: number): void {
    const t = this.toastService.toasts().find((x) => x.id === id);
    t?.action?.run();
    this.toastService.dismiss(id);
  }
}
