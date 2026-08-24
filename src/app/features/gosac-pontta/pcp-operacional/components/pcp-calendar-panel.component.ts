import { Component, inject } from '@angular/core';
import { PCP_WEEK_DAYS } from '../models/pcp.constants';
import { PcpOperacionalFacade } from '../facade/pcp-operacional.facade';
import { formatPcpDate } from '../utils/pcp-date.utils';

@Component({
  selector: 'app-pcp-calendar-panel',
  standalone: true,
  styles: [
    `
      @keyframes pcp-pulse {
        0% { transform: scale(1); box-shadow: 0 0 0 0 color-mix(in srgb, var(--pcp-pulse-color) 45%, transparent); }
        40% { transform: scale(1.12); box-shadow: 0 0 0 8px color-mix(in srgb, var(--pcp-pulse-color) 0%, transparent); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
      }
      @keyframes pcp-fade-up {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .pcp-cell-pulse { animation: pcp-pulse 0.85s ease-out; }
      .pcp-step-card { animation: pcp-fade-up 0.35s ease-out; }
      .pcp-area-dot { width: 6px; height: 6px; border-radius: 999px; display: inline-block; }
    `,
  ],
  template: `
    <div class="panel panel-pad space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold" style="color: var(--cmm-ink);">Calendário de entregas</h2>
        <div class="flex items-center gap-1">
          <button type="button" class="btn btn-ghost btn-sm" (click)="facade.shiftCalendarMonth(-1)" [disabled]="facade.animating()">‹</button>
          <span class="text-xs font-medium min-w-[7rem] text-center" style="color: var(--cmm-ink);">{{ facade.calendarMonthLabel() }}</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="facade.shiftCalendarMonth(1)" [disabled]="facade.animating()">›</button>
        </div>
      </div>

      @if (facade.animStep(); as step) {
        <div
          class="pcp-step-card rounded-lg px-3 py-2"
          style="background: var(--cmm-surface); border: 1px solid var(--cmm-border);"
          [style.border-left]="'3px solid ' + facade.areaMeta[step.area].color"
        >
          <p class="text-[10px] uppercase tracking-wide" style="color: var(--cmm-muted);">Colocando no mês</p>
          <p class="text-sm font-semibold mt-0.5" [style.color]="facade.areaMeta[step.area].color">
            {{ facade.areaMeta[step.area].label }} → {{ formatDate(step.date) }}
          </p>
          <p class="text-xs mt-0.5" style="color: var(--cmm-muted);">{{ step.orderCode }} · {{ step.customerName }}</p>
        </div>
      }

      <div class="grid grid-cols-7 gap-1 text-center">
        @for (dow of weekDays; track dow) {
          <div class="text-[10px] font-semibold py-1" style="color: var(--cmm-muted);">{{ dow }}</div>
        }
        @for (cell of facade.calendarCells(); track cell.key) {
          <button
            type="button"
            class="min-h-[3rem] rounded-md text-xs p-1 transition-colors relative"
            [class.pcp-cell-pulse]="facade.pulseDate() === cell.date"
            [disabled]="!cell.inMonth"
            [class.opacity-30]="!cell.inMonth"
            [style.--pcp-pulse-color]="facade.pulseColor()"
            [style.background]="facade.cellBackground(cell)"
            [style.border]="facade.cellBorder(cell)"
            [style.color]="cell.isDeliveryDay ? 'var(--cmm-ink)' : 'var(--cmm-muted)'"
            (click)="facade.selectDay(cell.date)"
          >
            <span class="block font-medium">{{ cell.day }}</span>
            @if (cell.areas.length > 0) {
              <span class="flex items-center justify-center gap-0.5 mt-0.5">
                @for (area of cell.areas; track area) {
                  <span class="pcp-area-dot" [style.background]="facade.areaMeta[area].color"></span>
                }
              </span>
            }
          </button>
        }
      </div>

      <div class="flex flex-wrap gap-3 text-[10px]" style="color: var(--cmm-muted);">
        @for (area of facade.areaOrder; track area) {
          <span class="inline-flex items-center gap-1">
            <span class="pcp-area-dot" [style.background]="facade.areaMeta[area].color"></span>
            {{ facade.areaMeta[area].short }}
          </span>
        }
        <span>Entregas: Ter / Qui / Sex</span>
      </div>
    </div>
  `,
})
export class PcpCalendarPanelComponent {
  readonly facade = inject(PcpOperacionalFacade);
  readonly weekDays = PCP_WEEK_DAYS;
  readonly formatDate = formatPcpDate;
}
