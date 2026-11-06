import { Component, inject } from '@angular/core';
import { PcpOperacionalFacade } from '../facade/pcp-operacional.facade';
import { formatPcpDate, weekdayLabel } from '../utils/pcp-date.utils';
import { PaginationComponent } from '../../../../shared/components/pagination.component';

/** Lista de pedidos com as datas por área. Clicar num pedido mostra as datas dele no calendário. */
@Component({
  selector: 'app-pcp-orders-table',
  standalone: true,
  imports: [PaginationComponent],
  template: `
    <div class="table-shell">
      <div class="list-head">
        <span class="list-head-title">Pedidos de venda <small>· {{ facade.salesOrders().length }}</small></span>
        @if (facade.enriching()) { <span class="text-xs inline-flex items-center gap-2" style="color: var(--cmm-muted);"><span class="spinner spinner-sm"></span> Carregando ambientes…</span> }
      </div>

      @if (facade.loading()) {
        <div class="loading-block"><span class="spinner"></span> Calculando agenda…</div>
      } @else if (facade.salesOrders().length === 0) {
        <div class="empty-state">Nenhum pedido com entrega a partir de hoje.</div>
      } @else {
        <div class="divide-y">
          @for (order of facade.pagedSalesOrders(); track order.ponttaId) {
            <div class="order" [class.order-on]="facade.focusedOrderId() === order.ponttaId" role="button" tabindex="0" (click)="facade.playOrderAnimation(order)" (keyup.enter)="facade.playOrderAnimation(order)" [attr.aria-label]="'Mostrar ' + order.code + ' no calendário'">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-mono text-xs font-semibold">{{ order.code }}</p>
                  <p class="font-medium truncate">{{ order.customerName }}</p>
                </div>
                <div class="text-right text-xs" style="color: var(--cmm-muted);">
                  <span>Aprovação</span>
                  <p class="font-medium" style="color: var(--cmm-ink);">{{ formatDate(order.approvalDate) }}</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                @for (area of facade.areaOrder(); track area) {
                  @if (order.areas[area]; as schedule) {
                    <div class="area" [style.border-left-color]="facade.areaMeta()[area].color">
                      <div class="flex items-center justify-between gap-1">
                        <span class="text-xs font-semibold">{{ facade.areaMeta()[area].label }}</span>
                        @if (schedule.conflictAdjusted) { <span class="state state-warn text-[10px]">ajustada</span> }
                      </div>
                      <p class="text-sm font-semibold" [style.color]="facade.areaMeta()[area].color">{{ formatDate(schedule.date) }} <span class="text-[10px] font-normal" style="color: var(--cmm-muted);">{{ weekday(schedule.date) }}</span></p>
                      <p class="text-xs mt-1" style="color: var(--cmm-muted);">{{ schedule.environments.join(', ') }}</p>
                    </div>
                  } @else {
                    <div class="area area-empty"><span class="text-xs font-semibold" style="color: var(--cmm-muted);">{{ facade.areaMeta()[area].label }}</span><p class="text-xs" style="color: var(--cmm-muted);">Sem ambientes</p></div>
                  }
                }
              </div>

              @if (order.unclassified.length > 0) {
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-xs" style="color: var(--cmm-muted);">Sem área:</span>
                  @for (env of order.unclassified; track env) {
                    <button type="button" class="unc" title="Clique para escolher a área" (click)="facade.openClassifyModal(env, order); $event.stopPropagation()">{{ env }}</button>
                  }
                </div>
              }
            </div>
          }
        </div>
        <app-pagination [page]="facade.currentPage() + 1" [totalPages]="facade.totalPages()" [label]="facade.pageRangeLabel()" (pageChange)="facade.currentPage.set($event - 1)" />
      }
    </div>
  `,
  styles: [`
    .order { display: flex; flex-direction: column; gap: .75rem; padding: 1rem; cursor: pointer; transition: background-color 180ms; }
    .order:hover { background: color-mix(in srgb, var(--cmm-accent) 4%, transparent); }
    .order-on { background: color-mix(in srgb, var(--cmm-accent) 8%, var(--cmm-panel)); box-shadow: inset 3px 0 0 var(--cmm-accent); }
    .area { padding: .5rem .75rem; border-radius: .65rem; background: var(--cmm-surface); border: 1px solid var(--cmm-border); border-left-width: 3px; }
    .area-empty { opacity: .55; border-style: dashed; }
    .unc { padding: .15rem .55rem; border-radius: .5rem; font-size: .75rem; font-weight: 500; background: color-mix(in srgb, var(--cmm-warning) 12%, var(--cmm-panel)); border: 1px dashed color-mix(in srgb, var(--cmm-warning) 45%, var(--cmm-border)); color: var(--cmm-ink); cursor: pointer; }
    .unc:hover { background: color-mix(in srgb, var(--cmm-warning) 22%, var(--cmm-panel)); }
  `],
})
export class PcpOrdersTableComponent {
  readonly facade = inject(PcpOperacionalFacade);
  readonly formatDate = formatPcpDate;
  readonly weekday = weekdayLabel;
}
