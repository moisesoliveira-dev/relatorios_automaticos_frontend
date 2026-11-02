import { Injectable, NgZone, inject } from '@angular/core';
import { animate } from 'motion';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dá a todo diálogo "artesanal" do sistema (overlay `fixed inset-0` com fundo escuro) o comportamento
 * que um diálogo acessível precisa, sem editar cada tela:
 *  - role="dialog", aria-modal e nome acessível (pelo 1º título)
 *  - foco inicial dentro do diálogo, foco preso (Tab/Shift+Tab) e devolvido a quem abriu
 *  - Escape fecha (clica em "Cancelar/Fechar/Voltar" ou no fundo, como a tela já faria)
 *  - entrada animada (fundo desfoca, cartão sobe)
 * O diálogo central (ModalComponent) já faz tudo isso e é ignorado aqui.
 */
@Injectable({ providedIn: 'root' })
export class DialogEnhancerService {
  private readonly zone = inject(NgZone);
  private started = false;
  /** Pilha de diálogos abertos (o último é o do topo) e o foco anterior de cada um. */
  private stack: Array<{ overlay: HTMLElement; opener: HTMLElement | null }> = [];

  start(): void {
    if (this.started || typeof document === 'undefined') return;
    this.started = true;
    this.zone.runOutsideAngular(() => {
      new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach((n) => this.onAdded(n));
          m.removedNodes.forEach((n) => this.onRemoved(n));
        }
      }).observe(document.body, { childList: true, subtree: true });
      document.addEventListener('keydown', (e) => this.onKeydown(e), true);
    });
  }

  private isOverlay(el: Element): el is HTMLElement {
    if (!(el instanceof HTMLElement) || !el.classList.contains('fixed') || !el.classList.contains('inset-0')) return false;
    if (el.hasAttribute('role') || el.closest('app-modal, app-toast-host')) return false;
    const dark = '[style*="rgba(10, 16, 24"]';
    return el.matches(dark) || !!el.querySelector(`:scope > ${dark}`);
  }

  private onAdded(node: Node): void {
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    const overlays = [el, ...Array.from(el.querySelectorAll<HTMLElement>('.fixed.inset-0'))].filter((x) => this.isOverlay(x));
    overlays.forEach((overlay) => this.enhance(overlay));
  }

  private onRemoved(node: Node): void {
    if (node.nodeType !== 1) return;
    const idx = this.stack.findIndex((d) => d.overlay === node || (node as HTMLElement).contains?.(d.overlay));
    if (idx < 0) return;
    const [closed] = this.stack.splice(idx, 1);
    // devolve o foco para o botão que abriu o diálogo
    if (closed.opener?.isConnected) closed.opener.focus?.({ preventScroll: true });
  }

  private card(overlay: HTMLElement): HTMLElement | null {
    return (
      overlay.querySelector<HTMLElement>(':scope > .panel, :scope > [class*="max-w-"]') ??
      overlay.querySelector<HTMLElement>('.panel, [class*="max-w-"]')
    );
  }

  private enhance(overlay: HTMLElement): void {
    if (this.stack.some((d) => d.overlay === overlay)) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.stack.push({ overlay, opener });

    const card = this.card(overlay);
    const target = card ?? overlay;
    target.setAttribute('role', 'dialog');
    target.setAttribute('aria-modal', 'true');
    const heading = target.querySelector<HTMLElement>('h1, h2, h3, h4');
    if (heading) {
      if (!heading.id) heading.id = `dlg-${Math.random().toString(36).slice(2, 8)}`;
      target.setAttribute('aria-labelledby', heading.id);
    }

    // Foco inicial: campo marcado, primeiro campo de formulário ou primeiro botão
    setTimeout(() => {
      if (target.contains(document.activeElement)) return;
      const first =
        target.querySelector<HTMLElement>('[autofocus], [data-autofocus]') ??
        target.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), select, textarea') ??
        target.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus({ preventScroll: true });
    }, 80);

    if (document.documentElement.getAttribute('data-motion') !== 'off') {
      animate(overlay, { opacity: [0, 1] }, { duration: 0.3, ease: [0.16, 1, 0.3, 1] });
      if (card) {
        animate(
          card,
          { opacity: [0, 1], transform: ['translateY(44px) scale(0.92)', 'translateY(0px) scale(1)'], filter: ['blur(10px)', 'blur(0px)'] },
          { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
        ).finished.then(() => {
          card.style.transform = '';
          card.style.filter = '';
        });
      }
    }
  }

  private onKeydown(e: KeyboardEvent): void {
    const top = this.stack[this.stack.length - 1];
    if (!top || !top.overlay.isConnected) return;
    const card = this.card(top.overlay) ?? top.overlay;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      const close = Array.from(card.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        /^(cancelar|fechar|voltar|não|nao|close)/i.test((b.textContent ?? '').trim()),
      );
      if (close) close.click();
      else top.overlay.click(); // as telas fecham ao clicar no fundo
      return;
    }

    if (e.key === 'Tab') {
      const nodes = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!card.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}
