import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../services/modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (modalService.config(); as config) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
        <div
          class="absolute inset-0"
          style="background: rgba(10, 16, 24, 0.55);"
          (click)="config.onCancel?.()"
        ></div>

        <div
          class="relative w-full max-w-md p-6 animate-slideUp"
          style="background: var(--cmm-panel); border: 1px solid var(--cmm-border); border-radius: 0.875rem; box-shadow: 0 18px 40px rgba(15, 26, 39, 0.18);"
          role="dialog"
          aria-modal="true"
        >
          <div
            class="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full"
            [style.background]="iconBg(config.type)"
          >
            @switch (config.type) {
              @case ('success') {
                <svg class="w-6 h-6" [style.color]="'var(--cmm-success)'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              }
              @case ('error') {
                <svg class="w-6 h-6" [style.color]="'var(--cmm-danger)'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              }
              @case ('warning') {
                <svg class="w-6 h-6" [style.color]="'var(--cmm-warning)'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              }
              @case ('confirm') {
                <svg class="w-6 h-6" [style.color]="'var(--cmm-accent)'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              }
              @default {
                <svg class="w-6 h-6" [style.color]="'var(--cmm-accent)'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              }
            }
          </div>

          <h3 class="text-lg font-semibold text-center mb-2" style="color: var(--cmm-ink);">
            {{ config.title }}
          </h3>

          <p class="text-center text-sm mb-6" style="color: var(--cmm-muted);">
            {{ config.message }}
          </p>

          <div class="flex gap-3">
            @if (config.type === 'confirm') {
              <button type="button" (click)="config.onCancel?.()" class="btn btn-secondary flex-1">
                {{ config.cancelText || 'Cancelar' }}
              </button>
              <button type="button" (click)="config.onConfirm?.()" class="btn btn-primary flex-1">
                {{ config.confirmText || 'Confirmar' }}
              </button>
            } @else {
              <button
                type="button"
                (click)="config.onConfirm?.()"
                class="btn flex-1"
                [class.btn-primary]="config.type === 'alert' || config.type === 'success'"
                [class.btn-danger]="config.type === 'error'"
                [class.btn-secondary]="config.type === 'warning'"
              >
                {{ config.confirmText || 'OK' }}
              </button>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class ModalComponent {
  modalService = inject(ModalService);

  iconBg(type: string | undefined): string {
    switch (type) {
      case 'success':
        return 'color-mix(in srgb, var(--cmm-success) 16%, var(--cmm-panel))';
      case 'error':
        return 'color-mix(in srgb, var(--cmm-danger) 16%, var(--cmm-panel))';
      case 'warning':
        return 'color-mix(in srgb, var(--cmm-warning) 16%, var(--cmm-panel))';
      default:
        return 'var(--cmm-accent-soft)';
    }
  }
}
