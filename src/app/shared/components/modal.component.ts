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
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          (click)="config.onCancel?.()"
        ></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slideUp">
          <!-- Icon -->
          <div class="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full"
               [ngClass]="{
                 'bg-blue-100': config.type === 'alert',
                 'bg-green-100': config.type === 'success',
                 'bg-red-100': config.type === 'error',
                 'bg-yellow-100': config.type === 'warning',
                 'bg-purple-100': config.type === 'confirm'
               }">
            @switch (config.type) {
              @case ('success') {
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              }
              @case ('error') {
                <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              }
              @case ('warning') {
                <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              }
              @case ('confirm') {
                <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              }
              @default {
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              }
            }
          </div>

          <!-- Title -->
          <h3 class="text-xl font-bold text-center text-gray-900 mb-2">
            {{ config.title }}
          </h3>

          <!-- Message -->
          <p class="text-center text-gray-600 mb-6">
            {{ config.message }}
          </p>

          <!-- Actions -->
          <div class="flex gap-3">
            @if (config.type === 'confirm') {
              <button
                (click)="config.onCancel?.()"
                class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {{ config.cancelText || 'Cancelar' }}
              </button>
              <button
                (click)="config.onConfirm?.()"
                class="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                {{ config.confirmText || 'Confirmar' }}
              </button>
            } @else {
              <button
                (click)="config.onConfirm?.()"
                class="w-full px-4 py-3 rounded-lg transition-colors font-medium"
                [ngClass]="{
                  'bg-blue-600 text-white hover:bg-blue-700': config.type === 'alert',
                  'bg-green-600 text-white hover:bg-green-700': config.type === 'success',
                  'bg-red-600 text-white hover:bg-red-700': config.type === 'error',
                  'bg-yellow-600 text-white hover:bg-yellow-700': config.type === 'warning'
                }"
              >
                {{ config.confirmText || 'OK' }}
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
    styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out;
    }

    .animate-slideUp {
      animation: slideUp 0.3s ease-out;
    }
  `]
})
export class ModalComponent {
    modalService = inject(ModalService);
}
