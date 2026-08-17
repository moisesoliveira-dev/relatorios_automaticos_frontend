import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  GosacService,
  PcpAreaKey,
  PcpCalendarDay,
  PcpScheduleResponse,
} from '../../../services/gosac.service';

const AREA_META: Record<PcpAreaKey, { label: string; offset: string }> = {
  molhada: { label: 'Áreas Molhadas', offset: '+20 úteis' },
  intima: { label: 'Áreas Íntimas', offset: '+25 úteis' },
  social: { label: 'Áreas Sociais', offset: '+30 úteis' },
};

const AREA_ORDER: PcpAreaKey[] = ['molhada', 'intima', 'social'];

@Component({
  selector: 'app-pcp-operacional',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">PCP Operacional</h1>
          <p class="page-subtitle">
            Datas de entrega por área a partir do deliveryDate do pedido (+20 / +25 / +30 dias úteis · Ter / Qui / Sex).
          </p>
        </div>
      </div>

      <div class="panel panel-pad space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label class="form-label">De</label>
            <input type="date" [(ngModel)]="fromDate" class="form-input" />
          </div>
          <div>
            <label class="form-label">Até</label>
            <input type="date" [(ngModel)]="toDate" class="form-input" />
          </div>
          <div class="sm:col-span-2">
            <label class="form-label">Pesquisar (opcional)</label>
            <div class="flex gap-2">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Cliente, código ou número do PV..."
                class="form-input flex-1 min-w-0"
                style="width: auto;"
                (keyup.enter)="loadSchedule()"
              />
              <button type="button" (click)="loadSchedule()" [disabled]="loading()" class="btn btn-primary">
                @if (loading()) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                }
                Atualizar
              </button>
            </div>
          </div>
        </div>
        @if (error()) {
          <p class="text-sm" style="color: var(--cmm-danger);">{{ error() }}</p>
        }
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div class="xl:col-span-3 space-y-4">
          <div class="table-shell">
            <div class="flex items-center justify-between gap-3 px-4 py-3 border-b" style="border-color: var(--cmm-border);">
              <span class="text-sm font-semibold" style="color: var(--cmm-ink);">
                Pedidos de Venda
                <span class="font-normal" style="color: var(--cmm-muted);">({{ salesOrders().length }})</span>
              </span>
              @if (salesOrders().length > 0) {
                <select
                  class="form-input py-1 text-xs w-auto"
                  [ngModel]="pageSize()"
                  (ngModelChange)="setPageSize(+$event)"
                >
                  <option [ngValue]="5">5 / página</option>
                  <option [ngValue]="10">10 / página</option>
                  <option [ngValue]="20">20 / página</option>
                </select>
              }
            </div>

            @if (loading()) {
              <div class="empty-state">
                <svg class="w-5 h-5 animate-spin mx-auto" style="color: var(--cmm-muted);" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <p class="text-xs mt-2">Calculando agenda PCP...</p>
              </div>
            } @else if (salesOrders().length === 0) {
              <div class="empty-state">
                <p>Nenhum pedido com deliveryDate no período.</p>
                <p class="text-xs mt-1">Ajuste as datas ou use a pesquisa.</p>
              </div>
            } @else {
              <div class="divide-y" style="border-color: var(--cmm-border);">
                @for (order of pagedSalesOrders(); track order.ponttaId) {
                  <div class="px-4 py-4 space-y-3">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="font-mono text-xs font-semibold" style="color: var(--cmm-ink);">{{ order.code }}</p>
                        <p class="font-medium truncate" style="color: var(--cmm-ink);">{{ order.customerName }}</p>
                      </div>
                      <div class="text-right text-xs" style="color: var(--cmm-muted);">
                        <span>Base (deliveryDate)</span>
                        <p class="font-medium" style="color: var(--cmm-ink);">{{ formatDate(order.deliveryDate) }}</p>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      @for (area of areaOrder; track area) {
                        @if (order.areas[area]; as schedule) {
                          <div class="rounded-lg px-3 py-2" style="background: var(--cmm-surface); border: 1px solid var(--cmm-border);">
                            <div class="flex items-center justify-between gap-1 mb-1">
                              <span class="text-xs font-semibold" style="color: var(--cmm-ink);">{{ areaMeta[area].label }}</span>
                              @if (schedule.conflictAdjusted) {
                                <span class="badge badge-warning text-[10px]">Conflito</span>
                              }
                            </div>
                            <p class="text-sm font-semibold" style="color: var(--cmm-accent);">{{ formatDate(schedule.date) }}</p>
                            <p class="text-[10px] mt-0.5" style="color: var(--cmm-muted);">{{ areaMeta[area].offset }}</p>
                            <ul class="mt-2 space-y-0.5">
                              @for (env of schedule.environments; track env) {
                                <li class="text-xs" style="color: var(--cmm-muted);">{{ env }}</li>
                              }
                            </ul>
                          </div>
                        } @else {
                          <div class="rounded-lg px-3 py-2 opacity-50" style="background: var(--cmm-surface); border: 1px dashed var(--cmm-border);">
                            <span class="text-xs font-semibold" style="color: var(--cmm-muted);">{{ areaMeta[area].label }}</span>
                            <p class="text-xs mt-1" style="color: var(--cmm-muted);">Sem ambientes</p>
                          </div>
                        }
                      }
                    </div>

                    @if (order.unclassified.length > 0) {
                      <p class="text-xs" style="color: var(--cmm-muted);">
                        Não classificados:
                        {{ order.unclassified.join(', ') }}
                      </p>
                    }
                  </div>
                }
              </div>

              @if (totalPages() > 1) {
                <div class="flex items-center justify-between gap-3 px-4 py-3 border-t" style="border-color: var(--cmm-border);">
                  <span class="text-xs" style="color: var(--cmm-muted);">
                    {{ pageRangeLabel() }}
                  </span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="prevPage()"
                      [disabled]="currentPage() === 0"
                    >
                      Anterior
                    </button>
                    <span class="text-xs px-2" style="color: var(--cmm-muted);">
                      {{ currentPage() + 1 }} / {{ totalPages() }}
                    </span>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="nextPage()"
                      [disabled]="currentPage() >= totalPages() - 1"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              }
            }
          </div>

          @if (withoutDelivery().length > 0) {
            <div class="panel panel-pad">
              <p class="text-sm font-semibold mb-2" style="color: var(--cmm-ink);">
                Sem deliveryDate
                <span class="font-normal" style="color: var(--cmm-muted);">({{ withoutDelivery().length }})</span>
              </p>
              <ul class="space-y-1">
                @for (order of withoutDelivery(); track order.ponttaId) {
                  <li class="text-xs flex gap-2" style="color: var(--cmm-muted);">
                    <span class="font-mono font-semibold">{{ order.code }}</span>
                    <span>{{ order.customerName }}</span>
                  </li>
                }
              </ul>
            </div>
          }
        </div>

        <div class="xl:col-span-2 space-y-4">
          <div class="panel panel-pad space-y-3">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-semibold" style="color: var(--cmm-ink);">Calendário de entregas</h2>
              <div class="flex items-center gap-1">
                <button type="button" class="btn btn-ghost btn-sm" (click)="shiftCalendarMonth(-1)" title="Mês anterior">‹</button>
                <span class="text-xs font-medium min-w-[7rem] text-center" style="color: var(--cmm-ink);">{{ calendarMonthLabel() }}</span>
                <button type="button" class="btn btn-ghost btn-sm" (click)="shiftCalendarMonth(1)" title="Próximo mês">›</button>
              </div>
            </div>

            <div class="grid grid-cols-7 gap-1 text-center">
              @for (dow of weekDays; track dow) {
                <div class="text-[10px] font-semibold py-1" style="color: var(--cmm-muted);">{{ dow }}</div>
              }
              @for (cell of calendarCells(); track cell.key) {
                <button
                  type="button"
                  class="min-h-[2.75rem] rounded-md text-xs p-1 transition-colors"
                  [disabled]="!cell.inMonth"
                  [class.opacity-30]="!cell.inMonth"
                  [style.background]="cell.hasDeliveries ? 'color-mix(in srgb, var(--cmm-accent) 16%, var(--cmm-panel))' : 'transparent'"
                  [style.border]="cell.selected ? '1px solid var(--cmm-accent)' : '1px solid transparent'"
                  [style.color]="cell.isDeliveryDay ? 'var(--cmm-ink)' : 'var(--cmm-muted)'"
                  (click)="selectDay(cell.date)"
                >
                  <span class="block font-medium">{{ cell.day }}</span>
                  @if (cell.count > 0) {
                    <span class="block text-[9px] font-semibold" style="color: var(--cmm-accent);">{{ cell.count }}</span>
                  }
                </button>
              }
            </div>
            <p class="text-[10px]" style="color: var(--cmm-muted);">Entregas apenas terça, quinta e sexta.</p>
          </div>

          <div class="panel panel-pad">
            <h2 class="text-sm font-semibold mb-3" style="color: var(--cmm-ink);">
              @if (selectedDate()) {
                Entregas em {{ formatDate(selectedDate()) }}
              } @else {
                Selecione um dia
              }
            </h2>

            @if (!selectedDayEntries().length) {
              <p class="text-xs" style="color: var(--cmm-muted);">Nenhuma entrega neste dia.</p>
            } @else {
              <ul class="space-y-3">
                @for (entry of selectedDayEntries(); track entry.salesOrderCode + entry.area) {
                  <li class="rounded-lg px-3 py-2" style="background: var(--cmm-surface); border: 1px solid var(--cmm-border);">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-mono text-xs font-semibold">{{ entry.salesOrderCode }}</span>
                      <span class="badge badge-neutral text-[10px]">{{ areaMeta[entry.area].label }}</span>
                    </div>
                    <p class="text-xs mt-0.5" style="color: var(--cmm-muted);">{{ entry.customerName }}</p>
                    <p class="text-xs mt-1" style="color: var(--cmm-ink);">{{ entry.environments.join(', ') }}</p>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PcpOperacionalComponent implements OnInit {
  readonly areaMeta = AREA_META;
  readonly areaOrder = AREA_ORDER;
  readonly weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  fromDate = '';
  toDate = '';
  searchQuery = '';

  loading = signal(false);
  error = signal<string | null>(null);
  schedule = signal<PcpScheduleResponse | null>(null);
  calendarCursor = signal(new Date());
  selectedDate = signal<string | null>(null);
  currentPage = signal(0);
  pageSize = signal(5);

  salesOrders = computed(() => this.schedule()?.salesOrders ?? []);
  withoutDelivery = computed(() => this.schedule()?.withoutDeliveryDate ?? []);

  totalPages = computed(() => {
    const total = this.salesOrders().length;
    const size = this.pageSize();
    return total === 0 ? 1 : Math.ceil(total / size);
  });

  pagedSalesOrders = computed(() => {
    const all = this.salesOrders();
    const size = this.pageSize();
    const page = Math.min(this.currentPage(), Math.max(0, this.totalPages() - 1));
    const start = page * size;
    return all.slice(start, start + size);
  });

  pageRangeLabel = computed(() => {
    const total = this.salesOrders().length;
    if (total === 0) return '0 de 0';
    const size = this.pageSize();
    const page = Math.min(this.currentPage(), Math.max(0, this.totalPages() - 1));
    const start = page * size + 1;
    const end = Math.min((page + 1) * size, total);
    return `${start}-${end} de ${total}`;
  });

  calendarByDate = computed(() => {
    const map = new Map<string, PcpCalendarDay>();
    for (const day of this.schedule()?.calendar ?? []) {
      map.set(day.date, day);
    }
    return map;
  });

  calendarMonthLabel = computed(() => {
    const d = this.calendarCursor();
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  });

  calendarCells = computed(() => {
    const cursor = this.calendarCursor();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const selected = this.selectedDate();
    const byDate = this.calendarByDate();
    const cells: Array<{
      key: string;
      day: number;
      date: string;
      inMonth: boolean;
      isDeliveryDay: boolean;
      hasDeliveries: boolean;
      count: number;
      selected: boolean;
    }> = [];

    const total = Math.ceil((startPad + daysInMonth) / 7) * 7;
    for (let i = 0; i < total; i += 1) {
      const dayNum = i - startPad + 1;
      const dateObj = new Date(year, month, dayNum);
      const date = this.toIsoDate(dateObj);
      const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
      const dow = dateObj.getDay();
      const isDeliveryDay = dow === 2 || dow === 4 || dow === 5;
      const entries = byDate.get(date)?.entries ?? [];
      cells.push({
        key: date + '-' + i,
        day: dateObj.getDate(),
        date,
        inMonth,
        isDeliveryDay,
        hasDeliveries: entries.length > 0,
        count: entries.length,
        selected: selected === date,
      });
    }
    return cells;
  });

  selectedDayEntries = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];
    return this.calendarByDate().get(date)?.entries ?? [];
  });

  constructor(private readonly gosacService: GosacService) {}

  ngOnInit(): void {
    const now = new Date();
    this.fromDate = this.toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    this.toDate = this.toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    this.calendarCursor.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.loadSchedule();
  }

  loadSchedule(): void {
    if (!this.fromDate || !this.toDate) {
      this.error.set('Informe o período (De / Até).');
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.gosacService.getPcpSchedule(this.fromDate, this.toDate, this.searchQuery).subscribe({
      next: (res) => {
        this.schedule.set(res);
        this.currentPage.set(0);
        this.loading.set(false);
        const firstWithDelivery = res.calendar[0]?.date;
        if (firstWithDelivery) {
          const [y, m] = firstWithDelivery.split('-').map(Number);
          this.calendarCursor.set(new Date(y, m - 1, 1));
          if (!this.selectedDate()) {
            this.selectedDate.set(firstWithDelivery);
          }
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || err?.message || 'Falha ao carregar agenda PCP.');
      },
    });
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  prevPage(): void {
    this.currentPage.update((p) => Math.max(0, p - 1));
  }

  nextPage(): void {
    this.currentPage.update((p) => Math.min(this.totalPages() - 1, p + 1));
  }

  shiftCalendarMonth(delta: number): void {
    const current = this.calendarCursor();
    this.calendarCursor.set(new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  selectDay(date: string): void {
    this.selectedDate.set(date);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const [y, m, d] = value.slice(0, 10).split('-');
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}`;
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
