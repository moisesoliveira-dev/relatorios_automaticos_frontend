import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
  leaving: boolean;
  action?: { label: string; run: () => void };
}

/** Avisos não bloqueantes. Substituem os modais de "salvo com sucesso" que interrompiam o trabalho. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly list = signal<Toast[]>([]);
  readonly toasts = this.list.asReadonly();

  show(message: string, opts: { type?: ToastType; title?: string; duration?: number; action?: Toast['action'] } = {}): number {
    const type = opts.type ?? 'info';
    // Erros ficam mais tempo na tela; ações exigem decisão, então não somem sozinhas rápido.
    const duration = opts.duration ?? (opts.action ? 12000 : type === 'error' ? 8000 : type === 'warning' ? 6500 : 4200);
    const toast: Toast = { id: ++this.seq, type, message, title: opts.title, duration, leaving: false, action: opts.action };
    this.list.update((l) => [...l.slice(-4), toast]); // no máximo 5 empilhados
    if (duration > 0) setTimeout(() => this.dismiss(toast.id), duration);
    return toast.id;
  }

  success(message: string, title?: string) {
    return this.show(message, { type: 'success', title });
  }
  error(message: string, title?: string) {
    return this.show(message, { type: 'error', title });
  }
  warning(message: string, title?: string) {
    return this.show(message, { type: 'warning', title });
  }
  info(message: string, title?: string) {
    return this.show(message, { type: 'info', title });
  }

  dismiss(id: number): void {
    const t = this.list().find((x) => x.id === id);
    if (!t || t.leaving) return;
    this.list.update((l) => l.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => this.list.update((l) => l.filter((x) => x.id !== id)), 320);
  }
}
