import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type JobTab = 'controle' | 'horarios' | 'pedidos' | 'atividade';

interface CodeJobRunTime {
  hour: number;
  minute: number;
}

interface CodeJob {
  id: string;
  name: string;
  description: string;
  scheduleLabel: string;
  runTimesManaus?: CodeJobRunTime[];
  scheduleEditable?: boolean;
  isActive: boolean;
  isRunning: boolean;
  lastStatus: 'idle' | 'running' | 'success' | 'error';
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastSummary: string | null;
}

interface CodeJobLogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: unknown;
}

interface ProcessedOrder {
  id: number;
  salesOrderId: string;
  code: string;
  createdAt: string;
}

interface ProcessedOrdersResponse {
  items: ProcessedOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  todayOnly?: boolean;
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <div class="page-header">
        <div>
          <h1 class="page-title">Automações</h1>
          <p class="page-subtitle">Ligue, agende e acompanhe as rotinas do sistema.</p>
        </div>
        <button type="button" (click)="refreshNow()" class="btn btn-secondary" [disabled]="loading()">
          Atualizar
        </button>
      </div>

      @if (loading() && jobs().length === 0) {
        <div class="panel panel-pad flex items-center justify-center py-16">
          <div class="animate-spin w-6 h-6 rounded-full border-2" style="border-color: var(--cmm-border); border-top-color: var(--cmm-accent);"></div>
        </div>
      } @else if (jobs().length === 0) {
        <div class="panel panel-pad empty-state">Nenhuma automação disponível.</div>
      } @else {
        <!-- Seletor de automação -->
        <div class="flex flex-wrap gap-2" role="tablist" aria-label="Automações">
          @for (job of jobs(); track job.id) {
            <button
              type="button"
              role="tab"
              class="job-chip"
              [class.job-chip-active]="selectedJobId() === job.id"
              [attr.aria-selected]="selectedJobId() === job.id"
              (click)="selectJob(job.id)"
            >
              <span class="job-chip-dot" [style.background]="statusDot(job)"></span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold truncate" style="color: inherit;">{{ shortName(job) }}</span>
                <span class="block text-[11px] mt-0.5" style="color: var(--cmm-muted);">{{ statusLabel(job) }}</span>
              </span>
            </button>
          }
        </div>

        @if (selectedJob(); as job) {
          <div class="panel overflow-hidden">
            <!-- Cabeçalho do job -->
            <div class="panel-pad" style="border-bottom: 1px solid var(--cmm-border);">
              <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div class="min-w-0">
                  <h2 class="text-base font-semibold" style="color: var(--cmm-ink);">{{ job.name }}</h2>
                  <p class="text-sm mt-1 max-w-2xl" style="color: var(--cmm-muted);">{{ friendlyDescription(job) }}</p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <span class="badge" [class.badge-success]="job.isActive" [class.badge-neutral]="!job.isActive">
                      {{ job.isActive ? 'Ligado' : 'Desligado' }}
                    </span>
                    @if (job.isRunning) {
                      <span class="badge badge-accent">Executando agora</span>
                    } @else {
                      <span class="badge" [class.badge-success]="job.lastStatus === 'success'" [class.badge-danger]="job.lastStatus === 'error'" [class.badge-neutral]="job.lastStatus === 'idle' || job.lastStatus === 'running'">
                        Última: {{ formatStatus(job.lastStatus) }}
                      </span>
                    }
                  </div>
                </div>

                <div class="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    class="btn"
                    [class.btn-primary]="!job.isActive"
                    [class.btn-secondary]="job.isActive"
                    [disabled]="job.isRunning"
                    (click)="toggleJob(job)"
                  >
                    {{ job.isActive ? 'Desligar' : 'Ligar' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-accent"
                    [disabled]="job.isRunning || (job.id === 'delivery-material-dates' && !salesOrderDate())"
                    (click)="runNow(job, job.id === 'delivery-material-dates' ? salesOrderDate() : undefined)"
                  >
                    {{ job.isRunning ? 'Executando…' : 'Rodar agora' }}
                  </button>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div class="meta-box">
                  <p class="meta-label">Próxima execução</p>
                  <p class="meta-value">{{ job.isActive ? formatDate(job.nextRunAt) : 'Desligado — sem próxima' }}</p>
                </div>
                <div class="meta-box">
                  <p class="meta-label">Última execução</p>
                  <p class="meta-value">{{ formatDate(job.lastRunAt) }}</p>
                </div>
                <div class="meta-box">
                  <p class="meta-label">Horários (Manaus)</p>
                  <p class="meta-value">{{ formatTimesShort(job) }}</p>
                </div>
              </div>
            </div>

            <!-- Abas -->
            <div class="job-tabs" role="tablist" aria-label="Seções da automação">
              <button type="button" class="job-tab" [class.job-tab-active]="activeTab() === 'controle'" (click)="activeTab.set('controle')">Controle</button>
              @if (job.scheduleEditable) {
                <button type="button" class="job-tab" [class.job-tab-active]="activeTab() === 'horarios'" (click)="activeTab.set('horarios')">
                  Horários
                  @if (scheduleDirty()) {
                    <span class="tab-dot" title="Alterações não salvas"></span>
                  }
                </button>
              }
              @if (job.id === 'auto-tasks') {
                <button type="button" class="job-tab" [class.job-tab-active]="activeTab() === 'pedidos'" (click)="openPedidosTab()">
                  Pedidos processados
                  <span class="tab-count">{{ processedTotal() }}</span>
                </button>
              }
              <button type="button" class="job-tab" [class.job-tab-active]="activeTab() === 'atividade'" (click)="activeTab.set('atividade')">
                Atividade
                @if (selectedJobLogs().length) {
                  <span class="tab-count">{{ selectedJobLogs().length }}</span>
                }
              </button>
            </div>

            <div class="panel-pad">
              <!-- CONTROLE -->
              @if (activeTab() === 'controle') {
                <div class="space-y-5 max-w-2xl">
                  <section>
                    <h3 class="section-title">Como usar</h3>
                    <ol class="help-list">
                      <li><strong>Ligar</strong> para a rotina rodar sozinha nos horários configurados.</li>
                      <li><strong>Rodar agora</strong> para executar uma vez imediatamente (não altera o agendamento).</li>
                      <li>Veja o resultado em <strong>Atividade</strong>@if (job.id === 'auto-tasks') { e os PVs em <strong>Pedidos processados</strong>}.</li>
                    </ol>
                  </section>

                  @if (job.id === 'delivery-material-dates') {
                    <section>
                      <label class="form-label" for="sales-order-date">Data dos pedidos de venda</label>
                      <p class="help-text mb-2">Usada só no “Rodar agora”. O agendamento automático usa o dia anterior.</p>
                      <input
                        id="sales-order-date"
                        type="date"
                        class="form-input"
                        style="max-width: 12rem;"
                        [value]="salesOrderDate()"
                        [disabled]="job.isRunning"
                        (input)="onSalesOrderDateChange($event)"
                      />
                    </section>
                  }

                  @if (job.lastSummary) {
                    <section>
                      <h3 class="section-title">Último resultado</h3>
                      <p class="text-sm rounded-lg px-3 py-2.5" style="background: var(--cmm-surface); color: var(--cmm-ink);">{{ job.lastSummary }}</p>
                    </section>
                  }
                </div>
              }

              <!-- HORÁRIOS -->
              @if (activeTab() === 'horarios' && job.scheduleEditable) {
                <div class="space-y-4 max-w-xl">
                  <div>
                    <h3 class="section-title">Horários diários</h3>
                    <p class="help-text">Fuso de Manaus (UTC−4). A rotina roda todo dia nestes horários, se estiver ligada.</p>
                  </div>

                  <div class="space-y-2">
                    @for (time of scheduleDraft(); track $index) {
                      <div class="flex items-center gap-2">
                        <label class="sr-only" [attr.for]="'time-' + $index">Horário {{ $index + 1 }}</label>
                        <input
                          [id]="'time-' + $index"
                          type="time"
                          class="form-input"
                          style="max-width: 9rem;"
                          [value]="toTimeInput(time)"
                          [disabled]="job.isRunning || savingSchedule()"
                          (change)="onScheduleTimeChange($index, $event)"
                        />
                        <button
                          type="button"
                          class="btn btn-sm btn-ghost"
                          [disabled]="job.isRunning || scheduleDraft().length <= 1 || savingSchedule()"
                          (click)="removeScheduleTime($index)"
                        >
                          Remover
                        </button>
                      </div>
                    }
                  </div>

                  <div class="flex flex-wrap items-center gap-2 pt-1">
                    <button type="button" class="btn btn-secondary" [disabled]="job.isRunning || savingSchedule()" (click)="addScheduleTime()">
                      Adicionar horário
                    </button>
                    <button
                      type="button"
                      class="btn btn-primary"
                      [disabled]="job.isRunning || savingSchedule() || !scheduleDirty()"
                      (click)="saveSchedule(job)"
                    >
                      {{ savingSchedule() ? 'Salvando…' : 'Salvar horários' }}
                    </button>
                    @if (scheduleDirty()) {
                      <span class="text-xs" style="color: var(--cmm-warning);">Alterações ainda não salvas</span>
                    }
                  </div>
                </div>
              }

              <!-- PEDIDOS -->
              @if (activeTab() === 'pedidos' && job.id === 'auto-tasks') {
                <div class="space-y-4">
                  <div class="flex flex-col gap-3">
                    <div>
                      <h3 class="section-title">Pedidos já processados</h3>
                      <p class="help-text">Registro no banco dos relatórios (<code>auto_task_processed_orders</code>). Só pedidos de venda de hoje em diante. Remover libera o PV para reprocessar.</p>
                    </div>

                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div class="flex flex-wrap items-center gap-2">
                        <input
                          type="search"
                          class="form-input"
                          style="min-width: 12rem;"
                          placeholder="Filtrar por PV-…"
                          [ngModel]="processedQuery()"
                          (ngModelChange)="onProcessedQueryChange($event)"
                        />
                        <label class="filter-chip" [class.filter-chip-active]="processedTodayOnly()">
                          <input
                            type="checkbox"
                            class="sr-only"
                            [checked]="processedTodayOnly()"
                            (change)="toggleProcessedTodayOnly($event)"
                          />
                          Somente hoje (Manaus)
                        </label>
                      </div>

                      <div class="flex items-center gap-2 text-xs" style="color: var(--cmm-muted);">
                        <label for="processed-page-size">Por página</label>
                        <select
                          id="processed-page-size"
                          class="form-input"
                          style="min-height: 2rem; width: auto; font-size: 0.75rem; padding: 0.25rem 0.5rem;"
                          [ngModel]="processedLimit()"
                          (ngModelChange)="onProcessedLimitChange($event)"
                        >
                          <option [ngValue]="10">10</option>
                          <option [ngValue]="25">25</option>
                          <option [ngValue]="50">50</option>
                          <option [ngValue]="100">100</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  @if (loadingProcessed()) {
                    <div class="flex justify-center py-10">
                      <div class="animate-spin w-5 h-5 rounded-full border-2" style="border-color: var(--cmm-border); border-top-color: var(--cmm-accent);"></div>
                    </div>
                  } @else if (processedOrders().length === 0) {
                    <div class="empty-state py-10">
                      @if (processedQuery() || processedTodayOnly()) {
                        Nenhum PV encontrado com os filtros atuais.
                      } @else {
                        Ainda não há pedidos processados no banco.
                      }
                    </div>
                  } @else {
                    <div class="overflow-x-auto -mx-1">
                      <table class="w-full text-sm">
                        <thead>
                          <tr style="border-bottom: 1px solid var(--cmm-border); color: var(--cmm-muted);">
                            <th class="text-left font-medium px-2 py-2">Pedido</th>
                            <th class="text-left font-medium px-2 py-2 hidden md:table-cell">Processado em</th>
                            <th class="text-right font-medium px-2 py-2">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (order of processedOrders(); track order.id) {
                            <tr style="border-bottom: 1px solid var(--cmm-border);">
                              <td class="px-2 py-2.5">
                                <p class="font-semibold" style="color: var(--cmm-ink);">{{ order.code }}</p>
                                <p class="text-[11px] font-mono md:hidden mt-0.5" style="color: var(--cmm-muted);">{{ formatDate(order.createdAt) }}</p>
                              </td>
                              <td class="px-2 py-2.5 text-xs hidden md:table-cell" style="color: var(--cmm-muted);">{{ formatDate(order.createdAt) }}</td>
                              <td class="px-2 py-2.5 text-right">
                                <button type="button" class="btn btn-sm btn-secondary" (click)="removeProcessedOrder(order)">
                                  Liberar p/ reprocessar
                                </button>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 text-xs" style="color: var(--cmm-muted);">
                      <span>{{ processedRangeLabel() }}</span>
                      <div class="flex items-center gap-2">
                        <button type="button" class="btn btn-sm btn-ghost" [disabled]="processedPage() <= 1" (click)="changeProcessedPage(-1)">Anterior</button>
                        <span>Página {{ processedPage() }} de {{ processedTotalPages() }}</span>
                        <button type="button" class="btn btn-sm btn-ghost" [disabled]="processedPage() >= processedTotalPages()" (click)="changeProcessedPage(1)">Próxima</button>
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- ATIVIDADE -->
              @if (activeTab() === 'atividade') {
                <div class="space-y-3">
                  <div class="flex items-center justify-between gap-2">
                    <div>
                      <h3 class="section-title">Atividade recente</h3>
                      <p class="help-text">Registro do que a automação fez nas últimas execuções.</p>
                    </div>
                    <div class="flex gap-2">
                      @if (selectedJobLogs().length > 0) {
                        <button type="button" class="btn btn-sm btn-ghost" (click)="clearLogs()">Limpar</button>
                      }
                      <button type="button" class="btn btn-sm btn-secondary" (click)="scrollLogsToBottom()">Ir ao fim</button>
                    </div>
                  </div>

                  @if (loadingLogs()) {
                    <div class="flex justify-center py-10">
                      <div class="animate-spin w-5 h-5 rounded-full border-2" style="border-color: var(--cmm-border); border-top-color: var(--cmm-accent);"></div>
                    </div>
                  } @else if (selectedJobLogs().length === 0) {
                    <div class="empty-state py-10">Nenhuma atividade ainda. Ligue a automação ou use “Rodar agora”.</div>
                  } @else {
                    <div #logsContainer class="logs-box space-y-1.5 font-mono text-[11px]">
                      @for (log of selectedJobLogs(); track $index) {
                        <div class="log-row" [style.border-left-color]="logBorderColor(log.level)" [style.background]="logBackground(log.level)">
                          <span class="log-time">{{ formatDate(log.timestamp) }}</span>
                          <span class="log-level" [style.color]="logLevelColor(log.level)">{{ logLevelLabel(log.level) }}</span>
                          <span class="log-msg">{{ log.message }}</span>
                          @if (log.data) {
                            <pre class="log-data">{{ prettyData(log.data) }}</pre>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }

      @if (successMessage()) {
        <div class="toast toast-ok">{{ successMessage() }}</div>
      }
      @if (errorMessage()) {
        <div class="toast toast-err">{{ errorMessage() }}</div>
      }
    </div>
  `,
  styles: [`
    .job-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.625rem;
      min-height: 2.75rem;
      padding: 0.5rem 0.875rem;
      border-radius: 0.75rem;
      border: 1px solid var(--cmm-border);
      background: var(--cmm-panel);
      color: var(--cmm-ink);
      text-align: left;
      max-width: 100%;
      transition: border-color 160ms ease-out, background 160ms ease-out;
    }
    .job-chip:hover {
      border-color: color-mix(in srgb, var(--cmm-accent) 40%, var(--cmm-border));
    }
    .job-chip-active {
      border-color: var(--cmm-accent);
      background: color-mix(in srgb, var(--cmm-accent) 10%, var(--cmm-panel));
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--cmm-accent) 35%, transparent);
    }
    .job-chip-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 999px;
      flex-shrink: 0;
    }
    .meta-box {
      border: 1px solid var(--cmm-border);
      border-radius: 0.5rem;
      padding: 0.625rem 0.75rem;
      background: color-mix(in srgb, var(--cmm-surface) 65%, var(--cmm-panel));
    }
    .meta-label {
      font-size: 0.7rem;
      color: var(--cmm-muted);
      margin: 0 0 0.2rem;
    }
    .meta-value {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--cmm-ink);
      margin: 0;
    }
    .job-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      padding: 0.5rem 1rem 0;
      border-bottom: 1px solid var(--cmm-border);
      background: color-mix(in srgb, var(--cmm-surface) 55%, var(--cmm-panel));
    }
    .job-tab {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.625rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--cmm-muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 160ms ease-out, border-color 160ms ease-out;
    }
    .job-tab:hover { color: var(--cmm-ink); }
    .job-tab-active {
      color: var(--cmm-accent);
      border-bottom-color: var(--cmm-accent);
    }
    .tab-count {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.1rem 0.35rem;
      border-radius: 999px;
      background: var(--cmm-surface);
      color: var(--cmm-muted);
    }
    .tab-dot {
      width: 0.4rem;
      height: 0.4rem;
      border-radius: 999px;
      background: var(--cmm-warning);
    }
    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--cmm-ink);
      margin: 0 0 0.25rem;
    }
    .help-text {
      font-size: 0.75rem;
      color: var(--cmm-muted);
      margin: 0;
      max-width: 42rem;
    }
    .help-list {
      margin: 0.5rem 0 0;
      padding-left: 1.1rem;
      font-size: 0.8125rem;
      color: var(--cmm-muted);
      display: grid;
      gap: 0.35rem;
    }
    .help-list strong { color: var(--cmm-ink); font-weight: 600; }
    .logs-box {
      max-height: min(55vh, 28rem);
      overflow-y: auto;
      border: 1px solid var(--cmm-border);
      border-radius: 0.5rem;
      padding: 0.5rem;
      background: color-mix(in srgb, var(--cmm-surface) 70%, var(--cmm-panel));
    }
    .log-row {
      border-left: 2px solid var(--cmm-border);
      border-radius: 0.25rem;
      padding: 0.4rem 0.55rem;
    }
    .log-time { color: var(--cmm-muted); margin-right: 0.5rem; white-space: nowrap; }
    .log-level { font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-right: 0.5rem; display: inline-block; min-width: 4.5rem; }
    .log-msg { color: var(--cmm-ink); word-break: break-word; }
    .log-data { margin: 0.25rem 0 0 0; color: var(--cmm-muted); white-space: pre-wrap; word-break: break-word; }
    .toast {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 50;
      padding: 0.875rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      box-shadow: 0 12px 28px rgba(15, 26, 39, 0.16);
      max-width: 22rem;
    }
    .toast-ok {
      color: var(--cmm-success);
      background: color-mix(in srgb, var(--cmm-success) 12%, var(--cmm-panel));
      border: 1px solid color-mix(in srgb, var(--cmm-success) 30%, transparent);
    }
    .toast-err {
      color: var(--cmm-danger);
      background: color-mix(in srgb, var(--cmm-danger) 12%, var(--cmm-panel));
      border: 1px solid color-mix(in srgb, var(--cmm-danger) 30%, transparent);
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
    .filter-chip {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: 0.25rem 0.625rem;
      border-radius: 999px;
      border: 1px solid var(--cmm-border);
      background: var(--cmm-panel);
      color: var(--cmm-muted);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      transition: border-color 160ms ease-out, background 160ms ease-out, color 160ms ease-out;
    }
    .filter-chip:hover {
      border-color: color-mix(in srgb, var(--cmm-accent) 35%, var(--cmm-border));
      color: var(--cmm-ink);
    }
    .filter-chip-active {
      border-color: var(--cmm-accent);
      background: color-mix(in srgb, var(--cmm-accent) 12%, var(--cmm-panel));
      color: var(--cmm-accent);
    }
  `],
})
export class JobsComponent implements OnInit, OnDestroy {
  @ViewChild('logsContainer') private logsContainerRef!: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private processedSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  jobs = signal<CodeJob[]>([]);
  salesOrderDate = signal(this.getTodayManausDate());
  selectedJobId = signal<string | null>(null);
  activeTab = signal<JobTab>('controle');
  selectedJobLogs = signal<CodeJobLogEntry[]>([]);
  scheduleDraft = signal<CodeJobRunTime[]>([]);
  scheduleDirty = signal(false);
  savingSchedule = signal(false);
  loading = signal(false);
  loadingLogs = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  processedOrders = signal<ProcessedOrder[]>([]);
  processedTotal = signal(0);
  processedPage = signal(1);
  processedLimit = signal(25);
  processedTotalPages = signal(1);
  processedQuery = signal('');
  processedTodayOnly = signal(true);
  loadingProcessed = signal(false);

  ngOnInit() {
    this.loadJobs(true);
    this.refreshInterval = setInterval(() => {
      this.loadJobs(false);
      const selected = this.selectedJobId();
      if (selected && this.activeTab() === 'atividade') {
        this.loadLogs(selected, false);
      }
    }, 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.processedSearchTimeout) {
      clearTimeout(this.processedSearchTimeout);
    }
  }

  refreshNow() {
    this.loadJobs(false);
    const selected = this.selectedJobId();
    if (selected) {
      this.loadLogs(selected, true);
    }
    if (selected === 'auto-tasks') {
      this.loadProcessedOrders(false);
    }
  }

  loadJobs(withLoader: boolean) {
    if (withLoader) this.loading.set(true);

    this.http.get<CodeJob[]>(`${this.apiUrl}/jobs/code`).subscribe({
      next: (data) => {
        this.jobs.set(data || []);
        if (withLoader) this.loading.set(false);

        const selected = this.selectedJobId();
        const selectedStillExists = !!selected && data.some((j) => j.id === selected);
        if (!selectedStillExists && data.length > 0) {
          this.selectJob(data[0].id);
        } else if (selected && !this.scheduleDirty()) {
          const job = data.find((j) => j.id === selected);
          if (job?.runTimesManaus) {
            this.scheduleDraft.set(job.runTimesManaus.map((t) => ({ ...t })));
          }
        }
      },
      error: (err) => {
        if (withLoader) this.loading.set(false);
        this.flashError(err?.error?.message || 'Erro ao carregar automações');
      },
    });
  }

  selectJob(jobId: string) {
    const previous = this.selectedJobId();
    this.selectedJobId.set(jobId);
    this.scheduleDirty.set(false);
    this.activeTab.set('controle');

    const job = this.jobs().find((j) => j.id === jobId);
    this.scheduleDraft.set((job?.runTimesManaus || []).map((t) => ({ ...t })));
    this.loadLogs(jobId, true);

    if (jobId === 'auto-tasks') {
      this.processedPage.set(1);
      this.loadProcessedOrders(previous !== 'auto-tasks');
    }
  }

  openPedidosTab() {
    this.activeTab.set('pedidos');
    this.loadProcessedOrders(true);
  }

  selectedJob(): CodeJob | null {
    const id = this.selectedJobId();
    if (!id) return null;
    return this.jobs().find((job) => job.id === id) || null;
  }

  shortName(job: CodeJob): string {
    if (job.id === 'auto-tasks') return 'Tarefas automáticas';
    if (job.id === 'delivery-material-dates') return 'Datas de entrega';
    return job.name;
  }

  friendlyDescription(job: CodeJob): string {
    if (job.id === 'auto-tasks') {
      return 'Cria no Pontta as tarefas de cada ambiente do pedido (checagem, revisão, projeto, envio e aprovação) e atualiza o rodízio.';
    }
    if (job.id === 'delivery-material-dates') {
      return 'Calcula as datas de entrega de material a partir da aprovação do projeto executivo, gera o PDF e salva no Drive.';
    }
    return job.description;
  }

  statusLabel(job: CodeJob): string {
    if (job.isRunning) return 'Executando…';
    if (job.isActive) return 'Ligado';
    return 'Desligado';
  }

  statusDot(job: CodeJob): string {
    if (job.isRunning) return 'var(--cmm-accent)';
    if (job.isActive) return 'var(--cmm-success)';
    return 'var(--cmm-muted)';
  }

  formatTimesShort(job: CodeJob): string {
    const times = job.runTimesManaus || [];
    if (!times.length) return '—';
    return times
      .map((t) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`)
      .join(' · ');
  }

  loadLogs(jobId: string, withLoader: boolean) {
    if (withLoader) this.loadingLogs.set(true);

    this.http.get<CodeJobLogEntry[]>(`${this.apiUrl}/jobs/code/${jobId}/logs?limit=200`).subscribe({
      next: (logs) => {
        const wasAtBottom = this.isLogsScrolledToBottom();
        this.selectedJobLogs.set(logs || []);
        if (withLoader) this.loadingLogs.set(false);
        if (wasAtBottom) setTimeout(() => this.scrollLogsToBottom(), 0);
      },
      error: () => {
        if (withLoader) this.loadingLogs.set(false);
        this.selectedJobLogs.set([]);
      },
    });
  }

  toTimeInput(time: CodeJobRunTime): string {
    return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  }

  onScheduleTimeChange(index: number, event: Event) {
    const input = event.target as HTMLInputElement | null;
    const [hourStr, minuteStr] = (input?.value || '').split(':');
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return;

    this.scheduleDraft.set(this.scheduleDraft().map((t, i) => (i === index ? { hour, minute } : t)));
    this.scheduleDirty.set(true);
  }

  addScheduleTime() {
    this.scheduleDraft.set([...this.scheduleDraft(), { hour: 12, minute: 0 }]);
    this.scheduleDirty.set(true);
  }

  removeScheduleTime(index: number) {
    if (this.scheduleDraft().length <= 1) return;
    this.scheduleDraft.set(this.scheduleDraft().filter((_, i) => i !== index));
    this.scheduleDirty.set(true);
  }

  saveSchedule(job: CodeJob) {
    this.savingSchedule.set(true);
    this.http.put<CodeJob>(`${this.apiUrl}/jobs/code/${job.id}/schedule`, {
      runTimesManaus: this.scheduleDraft(),
    }).subscribe({
      next: () => {
        this.savingSchedule.set(false);
        this.scheduleDirty.set(false);
        this.flashOk('Horários salvos.');
        this.loadJobs(false);
      },
      error: (err) => {
        this.savingSchedule.set(false);
        this.flashError(err?.error?.message || 'Erro ao salvar horários');
      },
    });
  }

  loadProcessedOrders(withLoader: boolean) {
    if (withLoader) this.loadingProcessed.set(true);
    const q = encodeURIComponent(this.processedQuery().trim());
    const page = this.processedPage();
    const limit = this.processedLimit();
    const today = this.processedTodayOnly() ? '1' : '0';
    this.http.get<ProcessedOrdersResponse>(
      `${this.apiUrl}/jobs/code/auto-tasks/processed-orders?q=${q}&page=${page}&limit=${limit}&today=${today}`,
    ).subscribe({
      next: (res) => {
        this.processedOrders.set(res.items || []);
        this.processedTotal.set(res.total || 0);
        this.processedPage.set(res.page || page);
        this.processedLimit.set(res.limit || limit);
        this.processedTotalPages.set(res.totalPages || 1);
        if (withLoader) this.loadingProcessed.set(false);
      },
      error: (err) => {
        if (withLoader) this.loadingProcessed.set(false);
        this.flashError(err?.error?.message || 'Erro ao carregar pedidos processados');
      },
    });
  }

  onProcessedQueryChange(value: string) {
    this.processedQuery.set(value);
    if (this.processedSearchTimeout) clearTimeout(this.processedSearchTimeout);
    this.processedSearchTimeout = setTimeout(() => {
      this.processedPage.set(1);
      this.loadProcessedOrders(true);
    }, 350);
  }

  toggleProcessedTodayOnly(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.processedTodayOnly.set(!!input?.checked);
    this.processedPage.set(1);
    this.loadProcessedOrders(true);
  }

  onProcessedLimitChange(value: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    this.processedLimit.set(parsed);
    this.processedPage.set(1);
    this.loadProcessedOrders(true);
  }

  processedRangeLabel(): string {
    const total = this.processedTotal();
    if (total === 0) return '0 pedidos';
    const page = this.processedPage();
    const limit = this.processedLimit();
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    const scope = this.processedTodayOnly() ? ' (hoje)' : '';
    return `Mostrando ${start}–${end} de ${total} pedido(s)${scope}`;
  }

  changeProcessedPage(delta: number) {
    const next = this.processedPage() + delta;
    if (next < 1) return;
    this.processedPage.set(next);
    this.loadProcessedOrders(true);
  }

  removeProcessedOrder(order: ProcessedOrder) {
    if (!confirm(`Liberar ${order.code} para reprocessar?\n\nNa próxima execução, as tarefas desse pedido poderão ser criadas de novo.`)) {
      return;
    }
    this.http.delete(`${this.apiUrl}/jobs/code/auto-tasks/processed-orders/${encodeURIComponent(order.code)}`).subscribe({
      next: () => {
        this.flashOk(`${order.code} liberado para reprocessar.`);
        this.loadProcessedOrders(true);
      },
      error: (err) => this.flashError(err?.error?.message || 'Erro ao liberar pedido'),
    });
  }

  toggleJob(job: CodeJob) {
    const action = job.isActive ? 'stop' : 'start';
    this.http.post<CodeJob>(`${this.apiUrl}/jobs/code/${job.id}/${action}`, {}).subscribe({
      next: () => {
        this.flashOk(job.isActive ? 'Automação desligada.' : 'Automação ligada.');
        this.loadJobs(false);
        this.loadLogs(job.id, false);
      },
      error: (err) => this.flashError(err?.error?.message || 'Erro ao alterar estado'),
    });
  }

  runNow(job: CodeJob, salesOrderDate?: string) {
    if (job.id === 'delivery-material-dates' && !salesOrderDate) {
      this.flashError('Escolha a data dos pedidos de venda.');
      return;
    }

    this.activeTab.set('atividade');
    const payload = salesOrderDate ? { salesOrderDate } : {};
    this.http.post<CodeJob>(`${this.apiUrl}/jobs/code/${job.id}/run`, payload).subscribe({
      next: () => {
        this.flashOk('Execução iniciada. Acompanhe em Atividade.');
        this.loadJobs(false);
        this.loadLogs(job.id, false);
        if (job.id === 'auto-tasks') {
          setTimeout(() => this.loadProcessedOrders(false), 1500);
        }
      },
      error: (err) => this.flashError(err?.error?.message || 'Erro ao executar'),
    });
  }

  clearLogs() {
    const jobId = this.selectedJobId();
    if (!jobId) return;
    this.http.delete(`${this.apiUrl}/jobs/code/${jobId}/logs`).subscribe({
      next: () => {
        this.selectedJobLogs.set([]);
        this.flashOk('Atividade limpa.');
      },
      error: () => this.flashError('Erro ao limpar atividade.'),
    });
  }

  scrollLogsToBottom() {
    const el = this.logsContainerRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private isLogsScrolledToBottom(): boolean {
    const el = this.logsContainerRef?.nativeElement;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }

  onSalesOrderDateChange(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.salesOrderDate.set(input?.value || '');
  }

  formatStatus(status: CodeJob['lastStatus']): string {
    if (status === 'running') return 'Em andamento';
    if (status === 'success') return 'Sucesso';
    if (status === 'error') return 'Erro';
    return 'Sem execução';
  }

  logLevelLabel(level: CodeJobLogEntry['level']): string {
    if (level === 'success') return 'ok';
    if (level === 'warning') return 'aviso';
    if (level === 'error') return 'erro';
    return 'info';
  }

  logBorderColor(level: CodeJobLogEntry['level']): string {
    if (level === 'success') return 'var(--cmm-success)';
    if (level === 'warning') return 'var(--cmm-warning)';
    if (level === 'error') return 'var(--cmm-danger)';
    return 'var(--cmm-border)';
  }

  logBackground(level: CodeJobLogEntry['level']): string {
    if (level === 'success') return 'color-mix(in srgb, var(--cmm-success) 10%, var(--cmm-panel))';
    if (level === 'warning') return 'color-mix(in srgb, var(--cmm-warning) 10%, var(--cmm-panel))';
    if (level === 'error') return 'color-mix(in srgb, var(--cmm-danger) 10%, var(--cmm-panel))';
    return 'transparent';
  }

  logLevelColor(level: CodeJobLogEntry['level']): string {
    if (level === 'success') return 'var(--cmm-success)';
    if (level === 'warning') return 'var(--cmm-warning)';
    if (level === 'error') return 'var(--cmm-danger)';
    return 'var(--cmm-muted)';
  }

  prettyData(data: unknown): string {
    try {
      if (typeof data === 'string') return data;
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private flashOk(message: string) {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  private flashError(message: string) {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  private getTodayManausDate(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Manaus',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}
