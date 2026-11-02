import { Component, ElementRef, HostListener, effect, inject, signal, untracked } from '@angular/core';
import { ModalConfig, ModalService } from '../services/modal.service';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    @if (view(); as config) {
      <div class="fixed inset-0 z-[150] flex items-center justify-center p-4" [class.dialog-leave]="leaving()">
        <div class="dialog-backdrop dialog-backdrop-anim" (click)="dismiss()"></div>

        <div
          class="dialog-card dialog-card-anim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-message"
          #card
        >
          <div class="dialog-icon flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-2xl" [style.background]="iconBg(config.type)">
            <svg class="w-7 h-7" [style.color]="iconColor(config.type)" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="iconPath(config.type)"></path>
            </svg>
          </div>

          <h3 id="dialog-title" class="dialog-stagger font-display text-xl font-bold text-center mb-2 tracking-tight" style="color: var(--cmm-ink);">
            {{ config.title }}
          </h3>

          <p id="dialog-message" class="dialog-stagger text-center text-sm mb-6 whitespace-pre-line" style="color: var(--cmm-muted);">
            {{ config.message }}
          </p>

          <div class="dialog-stagger flex gap-3">
            @if (config.type === 'confirm') {
              <button type="button" (click)="dismiss()" class="btn btn-secondary flex-1">
                {{ config.cancelText || 'Cancelar' }}
              </button>
              <button type="button" (click)="confirm()" class="btn btn-primary flex-1" data-autofocus>
                {{ config.confirmText || 'Confirmar' }}
              </button>
            } @else {
              <button
                type="button"
                (click)="confirm()"
                class="btn flex-1"
                data-autofocus
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
  `,
  styles: [
    `
      .dialog-backdrop-anim { animation: dlg-fade 320ms var(--ease-out-expo) both; }
      .dialog-card-anim { animation: dlg-pop 620ms var(--ease-out-expo) both; }
      .dialog-icon { animation: dlg-icon 900ms var(--ease-out-expo) 120ms both; }
      .dialog-stagger { animation: dlg-rise 640ms var(--ease-out-expo) both; }
      .dialog-stagger:nth-of-type(1) { animation-delay: 160ms; }
      h3.dialog-stagger { animation-delay: 190ms; }
      p.dialog-stagger { animation-delay: 240ms; }
      div.dialog-stagger { animation-delay: 300ms; }
      .dialog-leave .dialog-backdrop-anim { animation: dlg-fade-out 260ms var(--ease-in-out-quart) forwards; }
      .dialog-leave .dialog-card-anim { animation: dlg-out 260ms var(--ease-in-out-quart) forwards; }
      @keyframes dlg-fade { from { opacity: 0; backdrop-filter: blur(0); } to { opacity: 1; } }
      @keyframes dlg-fade-out { to { opacity: 0; } }
      @keyframes dlg-pop {
        from { opacity: 0; transform: translateY(40px) scale(0.9) rotateX(12deg); filter: blur(10px); }
        to { opacity: 1; transform: translateY(0) scale(1) rotateX(0); filter: blur(0); }
      }
      @keyframes dlg-out { to { opacity: 0; transform: translateY(18px) scale(0.96); filter: blur(6px); } }
      @keyframes dlg-icon { from { opacity: 0; transform: scale(0.3) rotate(-90deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
      @keyframes dlg-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    `,
  ],
})
export class ModalComponent {
  modalService = inject(ModalService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Cópia exibida: permanece na tela durante a animação de saída. */
  view = signal<ModalConfig | null>(null);
  leaving = signal(false);
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const cfg = this.modalService.config();
      untracked(() => {
        if (cfg) {
          this.previouslyFocused = document.activeElement as HTMLElement | null;
          this.leaving.set(false);
          this.view.set(cfg);
          // espera o DOM existir e foca o botão principal
          setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 60);
        } else if (this.view()) {
          this.leaving.set(true);
          setTimeout(() => {
            this.view.set(null);
            this.leaving.set(false);
            this.previouslyFocused?.focus?.(); // devolve o foco para quem abriu
          }, 260);
        }
      });
    });
  }

  confirm(): void {
    this.view()?.onConfirm?.();
  }

  /** Cancelar, Escape e clique fora: confirmações cancelam; avisos apenas fecham. */
  dismiss(): void {
    const cfg = this.view();
    if (!cfg) return;
    if (cfg.onCancel) cfg.onCancel();
    else cfg.onConfirm?.();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (!this.view() || this.leaving()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.dismiss();
      return;
    }
    if (e.key === 'Tab') {
      // foco preso dentro do diálogo
      const nodes = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  iconBg(type: string | undefined): string {
    const c = this.colorVar(type);
    return `color-mix(in srgb, ${c} 16%, var(--cmm-panel))`;
  }

  iconColor(type: string | undefined): string {
    return this.colorVar(type);
  }

  private colorVar(type: string | undefined): string {
    switch (type) {
      case 'success': return 'var(--cmm-success)';
      case 'error': return 'var(--cmm-danger)';
      case 'warning': return 'var(--cmm-warning)';
      default: return 'var(--cmm-accent)';
    }
  }

  iconPath(type: string | undefined): string {
    switch (type) {
      case 'success': return 'M5 13l4 4L19 7';
      case 'error': return 'M6 18L18 6M6 6l12 12';
      case 'warning': return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
      case 'confirm': return 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      default: return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }
}
