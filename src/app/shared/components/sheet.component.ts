import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, effect, inject, input, output, signal, untracked,
} from '@angular/core';
import { IconComponent } from './icon.component';
import { OverlayStackService } from '../services/overlay-stack.service';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let seq = 0;

/**
 * Painel lateral (abre pela direita, sem sair da tela). Para detalhes de um item, edição longa e
 * tudo o que precisa de contexto da lista atrás.
 *
 * ```html
 * <app-sheet [open]="!!item()" title="…" subtitle="…" width="34rem" (closed)="item.set(null)">
 *   …corpo…
 *   <ng-container sheet-footer>…</ng-container>
 * </app-sheet>
 * ```
 * Um cabeçalho próprio pode ser projetado com `[sheet-head]` (substitui título e subtítulo).
 */
@Component({
  selector: 'app-sheet',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shown()) {
      <div class="sheet-root" [class.sheet-leaving]="leaving()">
        <div class="sheet-backdrop" (click)="close()" aria-hidden="true"></div>
        <aside class="sheet" [style.--sheet-w]="width()" role="dialog" aria-modal="true" [attr.aria-labelledby]="id + '-t'">
          <header class="sheet-head">
            <ng-content select="[sheet-head]" />
            @if (title()) {
              <div class="min-w-0 flex-1">
                <h2 class="sheet-title" [id]="id + '-t'">{{ title() }}</h2>
                @if (subtitle()) { <p class="sheet-sub">{{ subtitle() }}</p> }
              </div>
            }
            <button type="button" class="icon-btn" (click)="close()" aria-label="Fechar"><app-icon name="fechar" /></button>
          </header>
          <div class="sheet-body"><ng-content /></div>
          <footer class="sheet-foot"><ng-content select="[sheet-footer]" /></footer>
        </aside>
      </div>
    }
  `,
})
export class SheetComponent implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stack = inject(OverlayStackService);
  readonly id = `sheet-${++seq}`;

  open = input(false);
  title = input('');
  subtitle = input('');
  width = input('32rem');
  closed = output<void>();

  shown = signal(false);
  leaving = signal(false);
  private opener: HTMLElement | null = null;
  private leaveTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => (open ? this.show() : this.hide()));
    });
  }

  ngOnDestroy(): void {
    if (this.leaveTimer) clearTimeout(this.leaveTimer);
    this.stack.pop(this);
  }

  close(): void {
    this.closed.emit();
  }

  private show(): void {
    if (this.leaveTimer) clearTimeout(this.leaveTimer);
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.leaving.set(false);
    this.shown.set(true);
    this.stack.push(this);
    setTimeout(() => {
      const el = this.host.nativeElement.querySelector<HTMLElement>('.sheet');
      if (!el || el.contains(document.activeElement)) return;
      const first =
        el.querySelector<HTMLElement>('[autofocus], [data-autofocus]') ??
        el.querySelector<HTMLElement>('.sheet-body ' + FOCUSABLE.split(', ').join(', .sheet-body ')) ??
        el.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus({ preventScroll: true });
    }, 80);
  }

  private hide(): void {
    if (!this.shown()) return;
    this.stack.pop(this);
    const reduce = document.documentElement.getAttribute('data-motion') === 'off';
    this.leaving.set(true);
    this.leaveTimer = setTimeout(() => {
      this.shown.set(false);
      this.leaving.set(false);
      if (this.opener?.isConnected) this.opener.focus({ preventScroll: true });
    }, reduce ? 0 : 240);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (!this.shown() || this.leaving() || !this.stack.isTop(this)) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    }
    if (e.key === 'Tab') {
      const el = this.host.nativeElement.querySelector<HTMLElement>('.sheet');
      if (!el) return;
      const nodes = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!el.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
  }
}
