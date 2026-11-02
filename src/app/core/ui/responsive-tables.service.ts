import { Injectable } from '@angular/core';

/**
 * Tabelas viram cartões no celular (CSS em styles.css). Para isso cada célula precisa saber o
 * nome da sua coluna: este serviço copia o texto de cada <th> para `data-label` das células,
 * inclusive nas linhas que o Angular cria depois. Tabelas largas de propósito (classe min-w-*)
 * continuam com rolagem horizontal.
 */
@Injectable({ providedIn: 'root' })
export class ResponsiveTablesService {
  private started = false;
  private queued = new Set<HTMLTableElement>();
  private scheduled = false;

  start(): void {
    if (this.started || typeof document === 'undefined') return;
    this.started = true;
    this.scan(document.body);
    new MutationObserver((records) => {
      for (const r of records) {
        for (const n of Array.from(r.addedNodes)) if (n instanceof HTMLElement) this.collect(n);
        if (r.target instanceof HTMLElement) {
          const t = r.target.closest('table');
          if (t) this.queued.add(t);
        }
      }
      this.flush();
    }).observe(document.body, { childList: true, subtree: true });
  }

  private collect(el: HTMLElement): void {
    if (el instanceof HTMLTableElement) this.queued.add(el);
    el.querySelectorAll?.('table').forEach((t) => this.queued.add(t));
    const up = el.closest('table');
    if (up) this.queued.add(up);
  }

  private scan(root: HTMLElement): void {
    root.querySelectorAll('table').forEach((t) => this.queued.add(t));
    this.flush();
  }

  private flush(): void {
    if (this.scheduled || !this.queued.size) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      const tables = [...this.queued];
      this.queued.clear();
      for (const t of tables) this.label(t);
    });
  }

  private label(table: HTMLTableElement): void {
    const heads = Array.from(table.querySelectorAll('thead th')).map((th) => (th.textContent ?? '').trim());
    if (!heads.length) return;
    table.querySelectorAll('tbody tr').forEach((tr) => {
      let col = 0;
      Array.from(tr.children).forEach((td) => {
        if (!(td instanceof HTMLElement)) return;
        const span = Number((td as HTMLTableCellElement).colSpan) || 1;
        const text = span === 1 ? heads[col] : '';
        if (text) {
          if (td.dataset['label'] !== text) td.dataset['label'] = text;
        } else if (td.dataset['label']) {
          delete td.dataset['label'];
        }
        col += span;
      });
    });
  }
}
