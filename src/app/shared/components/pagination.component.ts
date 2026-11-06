import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/** Um único paginador para todas as listas. Páginas começam em 1. */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1 || label()) {
      <div class="pager">
        <span class="pager-info">{{ label() }}</span>
        @if (totalPages() > 1) {
          <div class="pager-nav">
            <button type="button" class="icon-btn icon-btn-sm" [disabled]="page() <= 1 || disabled()" (click)="go(page() - 1)" aria-label="Página anterior"><app-icon name="seta_esq" [size]="16" /></button>
            <span class="pager-pos">{{ page() }} / {{ totalPages() }}</span>
            <button type="button" class="icon-btn icon-btn-sm" [disabled]="page() >= totalPages() || disabled()" (click)="go(page() + 1)" aria-label="Próxima página"><app-icon name="seta_dir" [size]="16" /></button>
          </div>
        }
      </div>
    }
  `,
})
export class PaginationComponent {
  page = input(1);
  totalPages = input(1);
  /** Texto à esquerda, ex.: "1–25 de 230". Se vazio e houver só uma página, nada aparece. */
  label = input('');
  disabled = input(false);
  pageChange = output<number>();

  go(p: number): void {
    const max = Math.max(1, this.totalPages());
    const next = Math.min(max, Math.max(1, p));
    if (next !== this.page()) this.pageChange.emit(next);
  }

  /** Monta "início–fim de total" a partir de página/tamanho/total. */
  static range(page: number, size: number, total: number, unit = ''): string {
    if (!total) return unit ? `0 ${unit}` : '';
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return `${start}–${end} de ${total}${unit ? ' ' + unit : ''}`;
  }
}

export const pageRange = PaginationComponent.range;
export const pageCount = (total: number, size: number): number => (total <= 0 ? 1 : Math.ceil(total / Math.max(1, size)));
