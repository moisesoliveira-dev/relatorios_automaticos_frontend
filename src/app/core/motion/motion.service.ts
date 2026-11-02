import { Injectable, NgZone, inject } from '@angular/core';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { animate, stagger } from 'motion';

/**
 * Motor de movimento global. Em vez de decorar cada tela, observa o DOM e dá vida a tudo o que
 * aparece: painéis, cabeçalhos, linhas de tabela, botões. Também cuida dos efeitos "de ambiente"
 * (aurora com parallax, barra de progresso de rolagem, spotlight, botões magnéticos, ripple).
 *
 * Segurança: o estado inicial "invisível" é aplicado só quando o movimento está ligado e é sempre
 * desfeito (mesmo se a animação falhar), então nenhum conteúdo fica escondido por acidente.
 */

const REVEAL_SELECTOR = [
  '.page-header',
  '.panel',
  '.table-shell',
  '.table-shell tbody tr',
  '.empty-state',
  '[data-reveal]',
  '.reveal-item',
].join(',');

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

@Injectable({ providedIn: 'root' })
export class MotionService {
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private started = false;
  private queue = new Set<HTMLElement>();
  private flushScheduled = false;
  private readonly done = new WeakSet<HTMLElement>();
  /** Até este instante, o que aparece faz parte da própria troca de página (a cortina já anima). */
  private navSettleUntil = 0;
  private appReady = false;

  /** Movimento ligado? (preferência do sistema ou interruptor do app) */
  get enabled(): boolean {
    return typeof document !== 'undefined' && document.documentElement.getAttribute('data-motion') !== 'off';
  }

  setEnabled(on: boolean): void {
    document.documentElement.setAttribute('data-motion', on ? 'on' : 'off');
    try {
      localStorage.setItem('motion_mode', on ? 'on' : 'off');
    } catch {
      /* sem storage: vale só nesta sessão */
    }
  }

  start(): void {
    if (this.started || typeof document === 'undefined') return;
    this.started = true;

    // Tudo fora da zona do Angular: movimento nunca deve disparar detecção de mudanças.
    this.zone.runOutsideAngular(() => {
      this.observeDom();
      this.bindScrollEffects();
      this.bindPointerEffects();
      this.router.events.subscribe((e) => {
        if (e instanceof NavigationStart) this.navSettleUntil = performance.now() + 450;
        if (e instanceof NavigationEnd) {
          this.navSettleUntil = performance.now() + 450;
          window.scrollTo({ top: 0 });
        }
      });
      setTimeout(() => (this.appReady = true), 900);
    });
  }

  // ───────────── revelação em cascata de tudo que entra na tela ─────────────

  private observeDom(): void {
    const scan = (root: ParentNode) => {
      root.querySelectorAll?.(REVEAL_SELECTOR).forEach((el) => this.enqueue(el as HTMLElement));
    };
    scan(document);

    new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const el = n as HTMLElement;
          if (el.matches?.(REVEAL_SELECTOR)) this.enqueue(el);
          scan(el);
        });
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  private enqueue(el: HTMLElement): void {
    if (this.done.has(el) || !this.enabled) return;
    // Durante a troca de página o conteúdo já nasce "dentro" da cortina: marca como feito e não reanima.
    if (this.appReady && performance.now() < this.navSettleUntil) {
      this.done.add(el);
      return;
    }
    // Elemento dentro de outro que já vai animar? Só o de fora anima (evita animação dupla).
    for (const pending of this.queue) if (pending !== el && pending.contains(el) && !el.matches('tbody tr')) return;

    this.done.add(el);
    el.style.opacity = '0'; // some imediatamente, antes de pintar
    this.queue.add(el);

    if (!this.flushScheduled) {
      this.flushScheduled = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  private flush(): void {
    this.flushScheduled = false;
    const items = [...this.queue].filter((el) => el.isConnected);
    this.queue.clear();
    if (!items.length) return;

    // Linhas de tabela entram mais rápido e menos distantes que painéis.
    const rows = items.filter((el) => el.matches('tbody tr'));
    const blocks = items.filter((el) => !el.matches('tbody tr'));

    if (blocks.length) {
      // Máscara que desce (classe CSS), com atraso escalonado. Sem desfoque nem deslocamento grande.
      blocks.forEach((el, i) => {
        el.style.opacity = '';
        el.style.animationDelay = `${i * 70}ms`;
        el.classList.add('reveal-mask');
        setTimeout(() => {
          el.classList.remove('reveal-mask');
          el.style.animationDelay = '';
        }, 650 + i * 70 + 80);
      });
    }
    if (rows.length) {
      const run = animate(
        rows,
        { opacity: [0, 1], transform: ['translateX(-10px)', 'translateX(0px)'] },
        { duration: 0.35, delay: stagger(0.025, { startDelay: 0.05 }), ease: EASE_OUT_EXPO },
      );
      this.release(rows, run);
    }
  }

  /** Garante que o conteúdo volta ao normal, mesmo se a animação for interrompida. */
  private release(els: HTMLElement[], run: { finished: Promise<unknown> }): void {
    const clear = () =>
      els.forEach((el) => {
        el.style.opacity = '';
        el.style.transform = '';
        el.style.filter = '';
      });
    run.finished.then(clear, clear);
    setTimeout(clear, 2500);
  }

  // ───────────── rolagem: barra de progresso e parallax da aurora ─────────────

  private bindScrollEffects(): void {
    let ticking = false;
    const root = document.documentElement;
    const update = () => {
      ticking = false;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      root.style.setProperty('--scroll-progress', String(Math.min(1, window.scrollY / max)));
      root.style.setProperty('--scroll-y', String(window.scrollY));
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    update();
  }

  // ───────────── ponteiro: spotlight dos painéis e ripple do clique ─────────────

  private bindPointerEffects(): void {
    let raf = 0;
    let lastEvent: PointerEvent | null = null;

    const handleMove = () => {
      raf = 0;
      const e = lastEvent;
      if (!e) return;
      const target = e.target as HTMLElement | null;

      // Spotlight: o painel sob o mouse recebe a posição relativa
      const panel = target?.closest?.('.panel') as HTMLElement | null;
      if (panel) {
        const r = panel.getBoundingClientRect();
        panel.style.setProperty('--mx', `${e.clientX - r.left}px`);
        panel.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
    };

    document.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        lastEvent = e;
        if (!raf) raf = requestAnimationFrame(handleMove);
      },
      { passive: true },
    );

    // Ripple: onda a partir do ponto do clique
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.enabled) return;
        const btn = (e.target as HTMLElement | null)?.closest?.('.btn') as HTMLElement | null;
        if (!btn || btn.matches(':disabled') || btn.classList.contains('btn-static')) return;
        const r = btn.getBoundingClientRect();
        const size = Math.max(r.width, r.height);
        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - r.left - size / 2}px`;
        ripple.style.top = `${e.clientY - r.top - size / 2}px`;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 750);
      },
      { passive: true },
    );
  }

  // ───────────── troca de tema em círculo expansivo ─────────────

  /** Executa `change` (que alterna o tema) com um círculo que cresce a partir do ponto clicado. */
  async themeTransition(origin: { x: number; y: number }, change: () => void): Promise<void> {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!this.enabled || !doc.startViewTransition) {
      change();
      return;
    }
    const root = document.documentElement;
    root.classList.add('theme-vt');
    const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
    const transition = doc.startViewTransition(change);
    try {
      await transition.ready;
      root.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
      );
      await (transition as unknown as { finished: Promise<void> }).finished;
    } finally {
      root.classList.remove('theme-vt');
    }
  }
}
