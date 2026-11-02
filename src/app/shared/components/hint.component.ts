import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';

/**
 * Botãozinho "!" que explica o que é preciso naquele ponto. Abre ao passar o mouse, focar ou tocar;
 * fecha com Esc ou ao sair. O balão é `fixed` para não ser cortado por painéis com rolagem.
 */
@Component({
  selector: 'app-hint',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="hint-btn" [class.hint-warn]="tom() === 'aviso'" [attr.aria-label]="rotulo()" [attr.aria-expanded]="aberto()"
      (click)="alternar($event)" (mouseenter)="abrir()" (mouseleave)="fechar()" (focus)="abrir()" (blur)="fechar()">!</button>
    @if (aberto()) {
      <span class="hint-pop" role="tooltip" [style.top.px]="y()" [style.left.px]="x()"><ng-content />{{ texto() }}</span>
    }
  `,
  styles: [`
    :host { display: inline-flex; vertical-align: middle; }
    .hint-btn { width: 1.1rem; height: 1.1rem; padding: 0; border-radius: 99px; border: 1.5px solid color-mix(in srgb, var(--cmm-muted) 70%, transparent); background: transparent; color: var(--cmm-muted); font: 800 .68rem/1 var(--font-display, inherit); cursor: help; display: inline-grid; place-items: center; transition: background-color 160ms, color 160ms, border-color 160ms; }
    .hint-btn:hover, .hint-btn:focus-visible { background: var(--cmm-accent); border-color: var(--cmm-accent); color: #fff; outline: none; }
    .hint-warn { border-color: var(--cmm-warning); color: var(--cmm-warning); }
    .hint-pop { position: fixed; z-index: 400; width: max-content; max-width: min(18rem, calc(100vw - 1.5rem)); padding: .6rem .8rem; border-radius: .8rem; background: var(--cmm-ink); color: var(--cmm-panel); font-size: .78rem; font-weight: 500; line-height: 1.45; text-align: left; text-transform: none; letter-spacing: normal; box-shadow: 0 14px 34px -12px rgba(0,0,0,.5); pointer-events: none; animation: hint-in 160ms var(--ease-out-expo) both; white-space: pre-line; }
    @keyframes hint-in { from { opacity: 0; transform: translateY(4px); } }
  `],
})
export class HintComponent {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  texto = input.required<string>();
  rotulo = input('O que é preciso aqui');
  tom = input<'info' | 'aviso'>('info');
  aberto = signal(false);
  x = signal(0);
  y = signal(0);

  abrir(): void {
    const r = this.el.nativeElement.getBoundingClientRect();
    const largura = Math.min(288, window.innerWidth - 24);
    const alvoX = Math.max(12, Math.min(r.left + r.width / 2 - largura / 2, window.innerWidth - largura - 12));
    const alvoY = r.bottom + 8;
    this.x.set(alvoX);
    this.y.set(alvoY);
    this.aberto.set(true);
    // Dentro de painéis com `transform`, "fixed" é relativo ao painel: mede onde o balão caiu e corrige.
    requestAnimationFrame(() => {
      const pop = this.el.nativeElement.querySelector('.hint-pop') as HTMLElement | null;
      if (!pop) return;
      const p = pop.getBoundingClientRect();
      if (Math.abs(p.left - alvoX) > 1 || Math.abs(p.top - alvoY) > 1) {
        this.x.update((v) => v + (alvoX - p.left));
        this.y.update((v) => v + (alvoY - p.top));
      }
    });
  }
  fechar(): void { this.aberto.set(false); }
  alternar(ev: Event): void { ev.stopPropagation(); this.aberto() ? this.fechar() : this.abrir(); }
  @HostListener('document:keydown.escape') esc(): void { this.fechar(); }
  @HostListener('document:click') fora(): void { this.fechar(); }
}
