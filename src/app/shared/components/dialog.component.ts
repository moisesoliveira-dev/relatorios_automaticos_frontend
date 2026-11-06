import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, effect, inject, input, output, signal, untracked,
} from '@angular/core';
import { IconComponent } from './icon.component';
import { OverlayStackService } from '../services/overlay-stack.service';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let seq = 0;

/**
 * Janela central. Um único jeito de abrir formulários, confirmações com conteúdo e detalhes.
 *
 * ```html
 * <app-dialog [open]="aberto()" title="Adicionar pessoa" subtitle="…" size="md" (closed)="aberto.set(false)">
 *   …corpo…
 *   <ng-container dialog-footer>
 *     <button class="btn btn-secondary" (click)="aberto.set(false)">Cancelar</button>
 *     <button class="btn btn-primary">Salvar</button>
 *   </ng-container>
 * </app-dialog>
 * ```
 * Acessível por padrão: role=dialog, foco preso, Escape fecha, foco volta a quem abriu.
 */
@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shown()) {
      <div class="dlg-root" [class.dlg-leaving]="leaving()">
        <div class="dlg-backdrop" (click)="onBackdrop()" aria-hidden="true"></div>
        <div class="dlg-card" [attr.data-size]="size()" role="dialog" aria-modal="true" [attr.aria-labelledby]="id + '-t'">
          <header class="dlg-head">
            <div class="min-w-0 flex-1">
              <h2 class="dlg-title" [id]="id + '-t'">{{ title() }}</h2>
              @if (subtitle()) { <p class="dlg-sub">{{ subtitle() }}</p> }
            </div>
            @if (closable()) {
              <button type="button" class="icon-btn" (click)="close()" aria-label="Fechar"><app-icon name="fechar" /></button>
            }
          </header>
          <div class="dlg-body" [class.dlg-body-flush]="flush()"><ng-content /></div>
          <footer class="dlg-foot"><ng-content select="[dialog-footer]" /></footer>
        </div>
      </div>
    }
  `,
})
export class DialogComponent implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stack = inject(OverlayStackService);
  readonly id = `dlg-${++seq}`;

  open = input(false);
  title = input('');
  subtitle = input('');
  /** sm 22rem · md 30rem · lg 40rem · xl 56rem */
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  /** Clique no fundo e Escape fecham (desligue enquanto salva). */
  closable = input(true);
  /** Corpo sem espaçamento interno (tabelas e listas coladas na borda). */
  flush = input(false);
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
    if (!this.closable()) return;
    this.closed.emit();
  }

  onBackdrop(): void {
    this.close();
  }

  private show(): void {
    if (this.leaveTimer) clearTimeout(this.leaveTimer);
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.leaving.set(false);
    this.shown.set(true);
    this.stack.push(this);
    setTimeout(() => this.focusFirst(), 60);
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
    }, reduce ? 0 : 200);
  }

  private focusFirst(): void {
    const card = this.host.nativeElement.querySelector<HTMLElement>('.dlg-card');
    if (!card || card.contains(document.activeElement)) return;
    const first =
      card.querySelector<HTMLElement>('[autofocus], [data-autofocus]') ??
      card.querySelector<HTMLElement>('.dlg-body input:not([type="hidden"]):not([disabled]), .dlg-body select, .dlg-body textarea') ??
      card.querySelector<HTMLElement>('.dlg-foot .btn-primary, .dlg-foot .btn-accent') ??
      card.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
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
      const card = this.host.nativeElement.querySelector<HTMLElement>('.dlg-card');
      if (!card) return;
      const nodes = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!card.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
  }
}
