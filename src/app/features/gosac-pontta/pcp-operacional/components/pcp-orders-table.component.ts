import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PcpOperacionalFacade } from '../facade/pcp-operacional.facade';
import { formatPcpDate, weekdayLabel } from '../utils/pcp-date.utils';

@Component({
  selector: 'app-pcp-orders-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-shell">
      <div class="flex items-center justify-between gap-3 px-4 py-3 border-b" style="border-color: var(--cmm-border);">
        <span class="text-sm font-semibold" style="color: var(--cmm-ink);">
          Pedidos de Venda
          <span class="font-normal" style="color: var(--cmm-muted);">({{ facade.salesOrders().length }})</span>
        </span>
        @if (facade.salesOrders().length > 0) {
          <select
            class="form-input py-1 text-xs w-auto"
            [ngModel]="facade.pageSize()"
            (ngModelChange)="facade.setPageSize(+$event)"
          >
            <option [ngValue]="5">5 / página</option>
            <option [ngValue]="10">10 / página</option>
            <option [ngValue]="20">20 / página</option>
          </select>
        }
      </div>

      @if (facade.loading()) {
        <div class="empty-state">
          <svg class="w-5 h-5 animate-spin mx-auto" style="color: var(--cmm-muted);" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p class="text-xs mt-2">Calculando agenda PCP...</p>
        </div>
      } @else if (facade.salesOrders().length === 0) {
        <div class="empty-state">
          <p>Nenhum pedido com data de entrega a partir de hoje.</p>
          <p class="text-xs mt-1">Use a pesquisa ou atualize a lista.</p>
        </div>
      } @else {
        <div class="divide-y" style="border-color: var(--cmm-border);">
          @for (order of facade.pagedSalesOrders(); track order.ponttaId) {
            <div
              class="px-4 py-4 space-y-3 cursor-pointer transition-colors"
              [style.background]="facade.focusedOrderId() === order.ponttaId ? 'color-mix(in srgb, var(--cmm-accent) 8%, var(--cmm-panel))' : 'transparent'"
              (click)="facade.playOrderAnimation(order)"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-mono text-xs font-semibold" style="color: var(--cmm-ink);">{{ order.code }}</p>
                  <p class="font-medium truncate" style="color: var(--cmm-ink);">{{ order.customerName }}</p>
                </div>
                <div class="text-right text-xs" style="color: var(--cmm-muted);">
                  <span>{{ facade.areaConfig().baseDateLabel }}</span>
                  <p class="font-medium" style="color: var(--cmm-ink);">{{ formatDate(order.approvalDate) }}</p>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                @for (area of facade.areaOrder(); track area) {
                  @if (order.areas[area]; as schedule) {
                    <div class="rounded-md px-2.5 py-1.5 text-xs" style="border: 1px solid var(--cmm-border); background: var(--cmm-surface);">
                      <span class="font-semibold" [style.color]="facade.areaMeta()[area].color">{{ facade.areaMeta()[area].short }}</span>
                      <span class="mx-1" style="color: var(--cmm-muted);">·</span>
                      <span class="font-semibold" style="color: var(--cmm-ink);">{{ formatDate(schedule.date) }}</span>
                      <span class="ml-1" style="color: var(--cmm-muted);">({{ weekday(schedule.date) }})</span>
                      @if (schedule.conflictAdjusted) {
                        <span class="badge badge-warning text-[10px] ml-1">Conflito</span>
                      }
                    </div>
                  }
                }
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                @for (area of facade.areaOrder(); track area) {
                  @if (order.areas[area]; as schedule) {
                    <div
                      class="rounded-lg px-3 py-2"
                      style="background: var(--cmm-surface); border: 1px solid var(--cmm-border);"
                      [style.border-left]="'3px solid ' + facade.areaMeta()[area].color"
                    >
                      <div class="flex items-center justify-between gap-1 mb-1">
                        <span class="text-xs font-semibold" style="color: var(--cmm-ink);">{{ facade.areaMeta()[area].label }}</span>
                        @if (schedule.conflictAdjusted) {
                          <span class="badge badge-warning text-[10px]">Conflito</span>
                        }
                      </div>
                      <p class="text-sm font-semibold" [style.color]="facade.areaMeta()[area].color">{{ formatDate(schedule.date) }}</p>
                      <p class="text-[10px] mt-0.5" style="color: var(--cmm-muted);">
                        {{ weekday(schedule.date) }} · {{ facade.areaMeta()[area].offset }}
                      </p>
                      <ul class="mt-2 space-y-0.5">
                        @for (env of schedule.environments; track env) {
                          <li class="text-xs" style="color: var(--cmm-muted);">{{ env }}</li>
                        }
                      </ul>
                    </div>
                  } @else {
                    <div class="rounded-lg px-3 py-2 opacity-50" style="background: var(--cmm-surface); border: 1px dashed var(--cmm-border);">
                      <span class="text-xs font-semibold" style="color: var(--cmm-muted);">{{ facade.areaMeta()[area].label }}</span>
                      <p class="text-xs mt-1" style="color: var(--cmm-muted);">Sem ambientes</p>
                    </div>
                  }
                }
              </div>

              @if (order.unclassified.length > 0) {
                <p class="text-xs" style="color: var(--cmm-muted);">
                  Não classificados: {{ order.unclassified.join(', ') }}
                </p>
              }

              <div class="flex justify-end">
                <button type="button" class="btn btn-ghost btn-sm" (click)="facade.playOrderAnimation(order); $event.stopPropagation()">
                  Animar no calendário
                </button>
              </div>
            </div>
          }
        </div>

        @if (facade.totalPages() > 1) {
          <div class="flex items-center justify-between gap-3 px-4 py-3 border-t" style="border-color: var(--cmm-border);">
            <span class="text-xs" style="color: var(--cmm-muted);">{{ facade.pageRangeLabel() }}</span>
            <div class="flex items-center gap-2">
              <button type="button" class="btn btn-secondary btn-sm" (click)="facade.prevPage()" [disabled]="facade.currentPage() === 0">
                Anterior
              </button>
              <span class="text-xs px-2" style="color: var(--cmm-muted);">
                {{ facade.currentPage() + 1 }} / {{ facade.totalPages() }}
              </span>
              <button type="button" class="btn btn-secondary btn-sm" (click)="facade.nextPage()" [disabled]="facade.currentPage() >= facade.totalPages() - 1">
                Próxima
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class PcpOrdersTableComponent {
  readonly facade = inject(PcpOperacionalFacade);
  readonly formatDate = formatPcpDate;
  readonly weekday = weekdayLabel;
}
