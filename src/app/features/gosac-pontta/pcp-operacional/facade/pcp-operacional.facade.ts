import { Injectable, computed, inject, signal } from '@angular/core';
import { PcpApiService } from '../data/pcp-api.service';
import {
  DEFAULT_PCP_AREA_CONFIG,
  PcpAnimStep,
  PcpAreaConfig,
  PcpAreaKey,
  PcpCalendarCell,
  PcpCalendarDay,
  PcpClassifyModalTarget,
  PcpSalesOrderSchedule,
  PcpScheduleResponse,
  areaOrderFromConfig,
  buildAreaMeta,
} from '../models/pcp.models';
import { toIsoDate } from '../utils/pcp-date.utils';

/**
 * Facade: única porta de entrada para a feature PCP Operacional.
 * Componentes consomem apenas signals/métodos expostos aqui — nunca HttpClient direto.
 */
@Injectable()
export class PcpOperacionalFacade {
  private readonly api = inject(PcpApiService);

  readonly areaConfig = signal<PcpAreaConfig>(DEFAULT_PCP_AREA_CONFIG);
  readonly areaMeta = computed(() => buildAreaMeta(this.areaConfig()));
  readonly areaOrder = computed(() => areaOrderFromConfig(this.areaConfig()));
  readonly configSaving = signal(false);
  readonly configError = signal<string | null>(null);
  readonly configPanelOpen = signal(false);
  readonly classifyModalOpen = signal(false);
  readonly classifyTarget = signal<PcpClassifyModalTarget | null>(null);
  readonly classifySaving = signal(false);
  readonly classifyError = signal<string | null>(null);

  searchQuery = '';

  readonly loading = signal(false);
  readonly enriching = signal(false);
  readonly error = signal<string | null>(null);
  readonly schedule = signal<PcpScheduleResponse | null>(null);
  readonly calendarCursor = signal(new Date());
  readonly selectedDate = signal<string | null>(null);
  readonly currentPage = signal(0);
  readonly pageSize = signal(5);

  readonly focusedOrderId = signal<string | null>(null);
  readonly animating = signal(false);
  readonly animStep = signal<PcpAnimStep | null>(null);
  readonly pulseDate = signal<string | null>(null);
  readonly pulseColor = signal('var(--cmm-accent)');
  readonly revealedDates = signal<Set<string>>(new Set());

  private animTimers: ReturnType<typeof setTimeout>[] = [];

  readonly salesOrders = computed(() => this.schedule()?.salesOrders ?? []);

  readonly scheduleSubtitle = computed(() => {
    const offsets = this.areaConfig().areas.map((a) => `+${a.businessDays}`).join(' / ');
    return `Base: prazo calculado da tarefa Aprovação do Projeto Executivo. Datas por área: ${offsets} dias úteis · Ter / Qui / Sex.`;
  });

  readonly totalPages = computed(() => {
    const total = this.salesOrders().length;
    const size = this.pageSize();
    return total === 0 ? 1 : Math.ceil(total / size);
  });

  readonly pagedSalesOrders = computed(() => {
    const all = this.salesOrders();
    const size = this.pageSize();
    const page = Math.min(this.currentPage(), Math.max(0, this.totalPages() - 1));
    return all.slice(page * size, page * size + size);
  });

  readonly pageRangeLabel = computed(() => {
    const total = this.salesOrders().length;
    if (total === 0) return '0 de 0';
    const size = this.pageSize();
    const page = Math.min(this.currentPage(), Math.max(0, this.totalPages() - 1));
    return `${page * size + 1}-${Math.min((page + 1) * size, total)} de ${total}`;
  });

  readonly calendarByDate = computed(() => {
    const map = new Map<string, PcpCalendarDay>();
    for (const day of this.schedule()?.calendar ?? []) {
      map.set(day.date, day);
    }
    return map;
  });

  readonly calendarMonthLabel = computed(() =>
    this.calendarCursor().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  );

  readonly calendarCells = computed((): PcpCalendarCell[] => {
    const cursor = this.calendarCursor();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const selected = this.selectedDate();
    const byDate = this.calendarByDate();
    const revealed = this.revealedDates();
    const cells: PcpCalendarCell[] = [];
    const total = Math.ceil((startPad + daysInMonth) / 7) * 7;

    for (let i = 0; i < total; i += 1) {
      const dayNum = i - startPad + 1;
      const dateObj = new Date(year, month, dayNum);
      const date = toIsoDate(dateObj);
      const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
      const dow = dateObj.getDay();
      const isDeliveryDay = dow === 2 || dow === 4 || dow === 5;
      const entries = byDate.get(date)?.entries ?? [];
      const areas = [...new Set(entries.map((e) => e.area))];
      cells.push({
        key: `${date}-${i}`,
        day: dateObj.getDate(),
        date,
        inMonth,
        isDeliveryDay,
        hasDeliveries: entries.length > 0,
        count: entries.length,
        selected: selected === date,
        areas,
        revealed: revealed.has(date),
      });
    }
    return cells;
  });

  readonly selectedDayEntries = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];
    return this.calendarByDate().get(date)?.entries ?? [];
  });

  init(): void {
    const now = new Date();
    this.calendarCursor.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.loadConfig();
    this.loadSchedule();
  }

  destroy(): void {
    this.clearAnimTimers();
  }

  loadConfig(): void {
    this.api.getConfig().subscribe({
      next: (config) => this.areaConfig.set(config),
      error: (err) => console.warn('[PCP] Falha ao carregar config', err),
    });
  }

  toggleConfigPanel(): void {
    this.configPanelOpen.update((open) => !open);
    this.configError.set(null);
  }

  saveAreaConfig(config: PcpAreaConfig): void {
    this.configSaving.set(true);
    this.configError.set(null);
    this.api.updateConfig(config).subscribe({
      next: (saved) => {
        this.areaConfig.set(saved);
        this.configSaving.set(false);
        this.configPanelOpen.set(false);
        this.loadSchedule();
      },
      error: (err) => {
        this.configSaving.set(false);
        this.configError.set(err?.error?.message || err?.message || 'Falha ao salvar configuração.');
      },
    });
  }

  openClassifyModal(environmentName: string, order: PcpSalesOrderSchedule): void {
    this.classifyError.set(null);
    this.classifyTarget.set({
      environmentName,
      orderCode: order.code,
      customerName: order.customerName,
    });
    this.classifyModalOpen.set(true);
  }

  closeClassifyModal(): void {
    if (this.classifySaving()) return;
    this.classifyModalOpen.set(false);
    this.classifyTarget.set(null);
    this.classifyError.set(null);
  }

  saveEnvironmentClassification(area: PcpAreaKey): void {
    const target = this.classifyTarget();
    if (!target) return;

    this.classifySaving.set(true);
    this.classifyError.set(null);
    this.api.saveEnvironmentOverride({ name: target.environmentName, area }).subscribe({
      next: () => {
        this.classifySaving.set(false);
        this.classifyModalOpen.set(false);
        this.classifyTarget.set(null);
        this.loadSchedule();
      },
      error: (err) => {
        this.classifySaving.set(false);
        this.classifyError.set(err?.error?.message || err?.message || 'Falha ao salvar classificação.');
      },
    });
  }

  loadSchedule(): void {
    this.loading.set(true);
    this.enriching.set(false);
    this.error.set(null);
    this.clearAnimTimers();
    this.animating.set(false);
    this.animStep.set(null);
    this.pulseDate.set(null);
    this.revealedDates.set(new Set());

    this.api.getSchedule(this.searchQuery, true).subscribe({
      next: (res) => {
        this.schedule.set(res);
        if (res.areaConfig) this.areaConfig.set(res.areaConfig);
        this.currentPage.set(0);
        this.loading.set(false);
        const firstWithDelivery = res.calendar[0]?.date;
        if (firstWithDelivery) {
          const [y, m] = firstWithDelivery.split('-').map(Number);
          this.calendarCursor.set(new Date(y, m - 1, 1));
          this.selectedDate.set(firstWithDelivery);
        }
        const firstOrder = res.salesOrders[0];
        if (firstOrder) {
          this.queueTimeout(() => this.playOrderAnimation(firstOrder), 400);
        }

        this.enriching.set(true);
        this.api.getSchedule(this.searchQuery, false).subscribe({
          next: (full) => {
            const focusedId = this.focusedOrderId();
            this.schedule.set(full);
            if (full.areaConfig) this.areaConfig.set(full.areaConfig);
            this.enriching.set(false);
            if (focusedId) {
              const still = full.salesOrders.find((o) => o.ponttaId === focusedId);
              if (still) this.focusedOrderId.set(still.ponttaId);
            }
          },
          error: (err) => {
            this.enriching.set(false);
            console.warn('[PCP] Falha ao enriquecer ambientes', err);
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.enriching.set(false);
        this.error.set(err?.error?.message || err?.message || 'Falha ao carregar agenda PCP.');
      },
    });
  }

  playOrderAnimation(order: PcpSalesOrderSchedule): void {
    this.clearAnimTimers();
    this.focusedOrderId.set(order.ponttaId);
    this.animating.set(true);
    this.revealedDates.set(new Set());
    this.animStep.set(null);
    this.pulseDate.set(null);

    const meta = this.areaMeta();
    const steps: PcpAnimStep[] = [];
    for (const area of this.areaOrder()) {
      const schedule = order.areas[area];
      if (!schedule) continue;
      steps.push({
        orderCode: order.code,
        customerName: order.customerName,
        area,
        date: schedule.date,
        environments: schedule.environments,
      });
    }

    if (!steps.length) {
      this.animating.set(false);
      return;
    }

    let delay = 0;
    steps.forEach((step, index) => {
      this.queueTimeout(() => {
        this.goToMonthOf(step.date);
        this.selectedDate.set(step.date);
        this.animStep.set(step);
        this.pulseColor.set(meta[step.area].color);
        this.pulseDate.set(null);
        this.queueTimeout(() => this.pulseDate.set(step.date), 20);

        this.revealedDates.update((prev) => {
          const next = new Set(prev);
          next.add(step.date);
          return next;
        });

        if (index === steps.length - 1) {
          this.queueTimeout(() => {
            this.animating.set(false);
            this.animStep.set(null);
            this.pulseDate.set(null);
          }, 1100);
        }
      }, delay);
      delay += 1400;
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
    if (this.animating()) return;
    const current = this.calendarCursor();
    this.calendarCursor.set(new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  selectDay(date: string): void {
    if (this.animating()) return;
    this.selectedDate.set(date);
  }

  cellBackground(cell: { hasDeliveries: boolean; revealed: boolean; date: string }): string {
    if (this.pulseDate() === cell.date) {
      return `color-mix(in srgb, ${this.pulseColor()} 28%, var(--cmm-panel))`;
    }
    if (cell.revealed || cell.hasDeliveries) {
      return 'color-mix(in srgb, var(--cmm-accent) 12%, var(--cmm-panel))';
    }
    return 'transparent';
  }

  cellBorder(cell: { selected: boolean; date: string }): string {
    if (this.pulseDate() === cell.date) {
      return `2px solid ${this.pulseColor()}`;
    }
    if (cell.selected) {
      return '1px solid var(--cmm-accent)';
    }
    return '1px solid transparent';
  }

  private goToMonthOf(isoDate: string): void {
    const [y, m] = isoDate.split('-').map(Number);
    if (!y || !m) return;
    this.calendarCursor.set(new Date(y, m - 1, 1));
  }

  private queueTimeout(fn: () => void, ms: number): void {
    this.animTimers.push(setTimeout(fn, ms));
  }

  private clearAnimTimers(): void {
    for (const id of this.animTimers) clearTimeout(id);
    this.animTimers = [];
  }
}
