import { Component, inject } from '@angular/core';
import { PcpOperacionalFacade } from '../facade/pcp-operacional.facade';
import { formatPcpDate } from '../utils/pcp-date.utils';

@Component({
  selector: 'app-pcp-day-detail',
  standalone: true,
  template: `
    <div class="panel panel-pad">
      <h2 class="text-sm font-semibold mb-3" style="color: var(--cmm-ink);">
        @if (facade.selectedDate()) {
          Entregas em {{ formatDate(facade.selectedDate()) }}
        } @else {
          Selecione um dia
        }
      </h2>

      @if (!facade.selectedDayEntries().length) {
        <p class="text-xs" style="color: var(--cmm-muted);">Nenhuma entrega neste dia.</p>
      } @else {
        <ul class="space-y-3">
          @for (entry of facade.selectedDayEntries(); track entry.salesOrderCode + entry.area) {
            <li
              class="rounded-lg px-3 py-2"
              style="background: var(--cmm-surface); border: 1px solid var(--cmm-border);"
              [style.border-left]="'3px solid ' + facade.areaMeta()[entry.area].color"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-xs font-semibold">{{ entry.salesOrderCode }}</span>
                <span class="text-[10px] font-semibold" [style.color]="facade.areaMeta()[entry.area].color">
                  {{ facade.areaMeta()[entry.area].label }}
                </span>
              </div>
              <p class="text-xs mt-0.5" style="color: var(--cmm-muted);">{{ entry.customerName }}</p>
              <p class="text-xs mt-1" style="color: var(--cmm-ink);">{{ entry.environments.join(', ') }}</p>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class PcpDayDetailComponent {
  readonly facade = inject(PcpOperacionalFacade);
  readonly formatDate = formatPcpDate;
}
