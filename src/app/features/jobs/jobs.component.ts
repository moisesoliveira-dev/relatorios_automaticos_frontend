import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ModalService } from '../../shared/services/modal.service';
import { ToastService } from '../../core/ui/toast.service';
import { DialogComponent } from '../../shared/components/dialog.component';
import { IconComponent } from '../../shared/components/icon.component';
import { PaginationComponent, pageRange } from '../../shared/components/pagination.component';

type JobTab = 'atividade' | 'pedidos';

interface CodeJobRunTime { hour: number; minute: number }

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

interface ProcessedOrder { id: number; salesOrderId: string; code: string; createdAt: string }
interface ProcessedOrdersResponse { items: ProcessedOrder[]; total: number; page: number; limit: number; totalPages: number }

/** Jobs que precisam de uma data de pedidos de venda ao rodar manualmente. */
const PEDE_DATA = new Set(['delivery-material-dates', 'auto-tasks']);

/**
 * Automações: escolha a rotina, veja o estado numa linha, ligue/desligue e rode agora.
 * Horários e a data de reprocessamento ficam em janelas; a tela mostra só o que está acontecendo.
 */
@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [FormsModule, DialogComponent, IconComponent, PaginationComponent],
  template: `
    <div class="space-y-5">
      <div class="page-header">
        <div>
          <h1 class="page-title">Automações</h1>
          <p class="page-subtitle">Rotinas que rodam sozinhas nos horários configurados. A tela se atualiza sozinha.</p>
        </div>
      </div>

      @if (loading() && jobs().length === 0) {
        <div class="panel"><div class="loading-block"><span class="spinner"></span></div></div>
      } @else if (jobs().length === 0) {
        <div class="panel"><div class="empty-state">Nenhuma automação disponível.</div></div>
      } @else {
        <div class="flex flex-wrap gap-2" role="tablist" aria-label="Automações">
          @for (job of jobs(); track job.id) {
            <button type="button" role="tab" class="job-chip" [class.job-chip-active]="selectedJobId() === job.id" [attr.aria-selected]="selectedJobId() === job.id" (click)="selectJob(job.id)">
              <span class="state" [class.state-on]="job.isActive && !job.isRunning" [class.state-busy]="job.isRunning" [class.state-off]="!job.isActive"></span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold truncate">{{ shortName(job) }}</span>
                <span class="block text-[11px] mt-0.5" style="color: var(--cmm-muted);">{{ statusLabel(job) }}</span>
              </span>
            </button>
          }
        </div>

        @if (selectedJob(); as job) {
          <div class="panel overflow-hidden">
            <div class="panel-pad space-y-4" style="border-bottom: 1px solid var(--cmm-border);">
              <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div class="min-w-0">
                  <h2 class="sec-title">{{ job.name }}</h2>
                  <p class="text-sm mt-1 max-w-2xl" style="color: var(--cmm-muted);">{{ friendlyDescription(job) }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-3 lg:justify-end">
                  <label class="switch-row gap-2" [title]="job.isActive ? 'Desligar' : 'Ligar'">
                    <span class="state" [class.state-on]="job.isActive" [class.state-off]="!job.isActive">{{ job.isActive ? 'Ligada' : 'Desligada' }}</span>
                    <button type="button" role="switch" class="switch" [class.switch-on]="job.isActive" [attr.aria-checked]="job.isActive" [disabled]="job.isRunning || alternando()" (click)="toggleJob(job)" aria-label="Ligar ou desligar a automação"><span class="switch-knob"></span></button>
                  </label>
                  <button type="button" class="btn btn-accent" [disabled]="job.isRunning" (click)="pedirRodar(job)">
                    @if (job.isRunning) { <span class="spinner"></span> Executando… } @else { <app-icon name="play" [size]="14" /> Rodar agora }
                  </button>
                </div>
              </div>

              <dl class="meta">
                <div><dt>Próxima</dt><dd>{{ job.isActive ? formatDate(job.nextRunAt) : '—' }}</dd></div>
                <div><dt>Última</dt><dd>{{ formatDate(job.lastRunAt) }}<span class="state ml-2" [class.state-on]="job.lastStatus === 'success'" [class.state-bad]="job.lastStatus === 'error'" [class.state-busy]="job.lastStatus === 'running'">{{ formatStatus(job.lastStatus) }}</span></dd></div>
                <div>
                  <dt>Horários (Manaus)</dt>
                  <dd class="inline-flex items-center gap-1.5">{{ formatTimesShort(job) }}
                    @if (job.scheduleEditable) {
                      <button type="button" class="icon-btn icon-btn-sm" (click)="abrirHorarios(job)" aria-label="Editar horários" title="Editar horários"><app-icon name="lapis" [size]="14" /></button>
                    }
                  </dd>
                </div>
              </dl>

              @if (job.lastSummary) {
                <p class="note" style="font-size: .8125rem;"><b>Último resultado:</b> {{ job.lastSummary }}</p>
              }
            </div>

            <div class="tabs px-5" role="tablist" aria-label="Seções da automação">
              <button type="button" role="tab" class="tab" [class.tab-on]="activeTab() === 'atividade'" [attr.aria-selected]="activeTab() === 'atividade'" (click)="activeTab.set('atividade')">
                Atividade @if (selectedJobLogs().length) { <span class="tab-count">{{ selectedJobLogs().length }}</span> }
              </button>
              @if (job.id === 'auto-tasks') {
                <button type="button" role="tab" class="tab" [class.tab-on]="activeTab() === 'pedidos'" [attr.aria-selected]="activeTab() === 'pedidos'" (click)="openPedidosTab()">
                  Pedidos processados <span class="tab-count">{{ processedTotal() }}</span>
                </button>
              }
            </div>

            <div class="panel-pad">
              @if (activeTab() === 'atividade') {
                <div class="space-y-3">
                  @if (loadingLogs()) {
                    <div class="loading-block"><span class="spinner"></span></div>
                  } @else if (selectedJobLogs().length === 0) {
                    <div class="empty-state py-8">Nenhuma atividade ainda. Ligue a automação ou use “Rodar agora”.</div>
                  } @else {
                    <div #logsContainer class="logs-box space-y-1.5 font-mono text-[11px]">
                      @for (log of selectedJobLogs(); track $index) {
                        <div class="log-row" [attr.data-level]="log.level">
                          <span class="log-time">{{ formatDate(log.timestamp) }}</span>
                          <span class="log-level">{{ logLevelLabel(log.level) }}</span>
                          <span class="log-msg">{{ log.message }}</span>
                          @if (log.data) { <pre class="log-data">{{ prettyData(log.data) }}</pre> }
                        </div>
                      }
                    </div>
                    <div class="flex justify-end">
                      <button type="button" class="btn btn-ghost btn-sm" (click)="clearLogs()">Limpar atividade</button>
                    </div>
                  }
                </div>
              }

              @if (activeTab() === 'pedidos' && job.id === 'auto-tasks') {
                <div class="space-y-3">
                  <div class="toolbar">
                    <div class="search-field toolbar-search">
                      <app-icon name="busca" [size]="16" />
                      <input type="search" class="form-input" placeholder="Filtrar por PV…" aria-label="Filtrar por pedido" [ngModel]="processedQuery()" (ngModelChange)="onProcessedQueryChange($event)" />
                    </div>
                    <label class="check-chip"><input type="checkbox" class="sr-only" [checked]="processedTodayOnly()" (change)="toggleProcessedTodayOnly($event)" /> Só hoje</label>
                  </div>
                  <p class="text-xs" style="color: var(--cmm-muted);">Pedidos que já receberam tarefas. Liberar um pedido permite que a próxima execução crie as tarefas dele de novo.</p>

                  @if (loadingProcessed()) {
                    <div class="loading-block"><span class="spinner"></span></div>
                  } @else if (processedOrders().length === 0) {
                    <div class="empty-state py-8">{{ processedQuery() || processedTodayOnly() ? 'Nenhum pedido com esses filtros.' : 'Ainda não há pedidos processados.' }}</div>
                  } @else {
                    <div class="table-shell">
                      <table>
                        <thead><tr><th>Pedido</th><th>Processado em</th><th style="text-align: right;"></th></tr></thead>
                        <tbody>
                          @for (order of processedOrders(); track order.id) {
                            <tr>
                              <td class="font-semibold">{{ order.code }}</td>
                              <td class="text-xs" style="color: var(--cmm-muted);">{{ formatDate(order.createdAt) }}</td>
                              <td class="text-right"><button type="button" class="btn btn-sm btn-secondary" (click)="removeProcessedOrder(order)">Liberar</button></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                      <app-pagination [page]="processedPage()" [totalPages]="processedTotalPages()" [label]="processedRangeLabel()" (pageChange)="goProcessedPage($event)" />
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }
    </div>

    <!-- Horários -->
    <app-dialog [open]="horariosAberto()" title="Horários diários" subtitle="Fuso de Manaus. A rotina roda todo dia nestes horários, se estiver ligada." size="sm" [closable]="!savingSchedule()" (closed)="horariosAberto.set(false)">
      <div class="space-y-2">
        @for (time of scheduleDraft(); track $index) {
          <div class="flex items-center gap-2">
            <label class="sr-only" [attr.for]="'time-' + $index">Horário {{ $index + 1 }}</label>
            <input [id]="'time-' + $index" type="time" class="form-input" [value]="toTimeInput(time)" [disabled]="savingSchedule()" (change)="onScheduleTimeChange($index, $event)" />
            <button type="button" class="icon-btn icon-danger" [disabled]="scheduleDraft().length <= 1 || savingSchedule()" (click)="removeScheduleTime($index)" aria-label="Remover horário"><app-icon name="lixeira" [size]="16" /></button>
          </div>
        }
        <button type="button" class="btn btn-secondary btn-sm" [disabled]="savingSchedule()" (click)="addScheduleTime()"><app-icon name="mais" [size]="14" /> Horário</button>
      </div>
      <ng-container dialog-footer>
        <button type="button" class="btn btn-secondary" (click)="horariosAberto.set(false)" [disabled]="savingSchedule()">Cancelar</button>
        <button type="button" class="btn btn-primary" [disabled]="savingSchedule() || !scheduleDirty()" (click)="saveSchedule()">{{ savingSchedule() ? 'Salvando…' : 'Salvar horários' }}</button>
      </ng-container>
    </app-dialog>

    <!-- Rodar agora (quando precisa de data) -->
    <app-dialog [open]="rodarAberto()" title="Rodar agora" [subtitle]="rodarTexto()" size="sm" (closed)="rodarAberto.set(false)">
      <label class="form-label" for="sales-order-date">Data dos pedidos de venda</label>
      <input id="sales-order-date" type="date" class="form-input" [ngModel]="salesOrderDate()" (ngModelChange)="salesOrderDate.set($event)" />
      <ng-container dialog-footer>
        <button type="button" class="btn btn-secondary" (click)="rodarAberto.set(false)">Cancelar</button>
        <button type="button" class="btn btn-accent" [disabled]="!salesOrderDate()" (click)="confirmarRodar()"><app-icon name="play" [size]="14" /> Rodar</button>
      </ng-container>
    </app-dialog>
  `,
  styles: [`
    .job-chip { display: inline-flex; align-items: center; gap: .6rem; min-height: 2.75rem; padding: .5rem .9rem; border-radius: .75rem; border: 1px solid var(--cmm-border); background: var(--cmm-panel); color: var(--cmm-ink); text-align: left; max-width: 100%; cursor: pointer; transition: border-color 160ms ease-out, background 160ms ease-out; }
    .job-chip:hover { border-color: color-mix(in srgb, var(--cmm-accent) 40%, var(--cmm-border)); }
    .job-chip-active { border-color: var(--cmm-accent); background: color-mix(in srgb, var(--cmm-accent) 10%, var(--cmm-panel)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--cmm-accent) 35%, transparent); }
    .meta { display: flex; flex-wrap: wrap; gap: .5rem 2rem; font-size: .8125rem; }
    .meta dt { font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; color: var(--cmm-muted); font-weight: 600; }
    .meta dd { margin-top: .15rem; font-weight: 500; font-variant-numeric: tabular-nums; }
    .logs-box { max-height: min(55vh, 28rem); overflow-y: auto; border: 1px solid var(--cmm-border); border-radius: .75rem; padding: .5rem; background: color-mix(in srgb, var(--cmm-surface) 70%, var(--cmm-panel)); }
    .log-row { border-left: 2px solid var(--cmm-border); border-radius: .25rem; padding: .4rem .55rem; }
    .log-row[data-level='success'] { border-left-color: var(--cmm-success); background: color-mix(in srgb, var(--cmm-success) 8%, transparent); }
    .log-row[data-level='warning'] { border-left-color: var(--cmm-warning); background: color-mix(in srgb, var(--cmm-warning) 8%, transparent); }
    .log-row[data-level='error'] { border-left-color: var(--cmm-danger); background: color-mix(in srgb, var(--cmm-danger) 8%, transparent); }
    .log-time { color: var(--cmm-muted); margin-right: .5rem; white-space: nowrap; }
    .log-level { font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin-right: .5rem; display: inline-block; min-width: 3.5rem; color: var(--cmm-muted); }
    .log-row[data-level='success'] .log-level { color: var(--cmm-success); }
    .log-row[data-level='warning'] .log-level { color: var(--cmm-warning); }
    .log-row[data-level='error'] .log-level { color: var(--cmm-danger); }
    .log-msg { color: var(--cmm-ink); word-break: break-word; }
    .log-data { margin: .25rem 0 0; color: var(--cmm-muted); white-space: pre-wrap; word-break: break-word; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
  `],
})
export class JobsComponent implements OnInit, OnDestroy {
  @ViewChild('logsContainer') private logsContainerRef?: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private modal = inject(ModalService);
  private toast = inject(ToastService);
  private apiUrl = environment.apiUrl;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private processedSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  jobs = signal<CodeJob[]>([]);
  selectedJobId = signal<string | null>(null);
  selectedJob = computed(() => this.jobs().find((j) => j.id === this.selectedJobId()) ?? null);
  activeTab = signal<JobTab>('atividade');
  selectedJobLogs = signal<CodeJobLogEntry[]>([]);
  loading = signal(false);
  loadingLogs = signal(false);
  alternando = signal(false);

  // horários
  horariosAberto = signal(false);
  scheduleDraft = signal<CodeJobRunTime[]>([]);
  scheduleDirty = signal(false);
  savingSchedule = signal(false);

  // rodar agora
  rodarAberto = signal(false);
  salesOrderDate = signal(this.getTodayManausDate());
  rodarTexto = computed(() => this.selectedJobId() === 'auto-tasks'
    ? 'Reprocessa um dia em que a rotina não rodou. Só cria tarefas nos pedidos ainda não processados.'
    : 'O agendamento automático usa o dia anterior; aqui você escolhe outro dia.');

  // pedidos processados
  processedOrders = signal<ProcessedOrder[]>([]);
  processedTotal = signal(0);
  processedPage = signal(1);
  processedLimit = signal(25);
  processedTotalPages = signal(1);
  processedQuery = signal('');
  processedTodayOnly = signal(true);
  loadingProcessed = signal(false);
  processedRangeLabel = computed(() => pageRange(this.processedPage(), this.processedLimit(), this.processedTotal(), 'pedidos'));

  ngOnInit() {
    this.loadJobs(true);
    this.refreshInterval = setInterval(() => {
      if (document.hidden) return;
      this.loadJobs(false);
      const selected = this.selectedJobId();
      if (selected && this.activeTab() === 'atividade') this.loadLogs(selected, false);
    }, 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.processedSearchTimeout) clearTimeout(this.processedSearchTimeout);
  }

  loadJobs(withLoader: boolean) {
    if (withLoader) this.loading.set(true);
    this.http.get<CodeJob[]>(`${this.apiUrl}/jobs/code`).subscribe({
      next: (data) => {
        this.jobs.set(data || []);
        if (withLoader) this.loading.set(false);
        const selected = this.selectedJobId();
        if ((!selected || !data.some((j) => j.id === selected)) && data.length > 0) this.selectJob(data[0].id);
      },
      error: (err) => {
        if (withLoader) this.loading.set(false);
        this.toast.error(err?.error?.message || 'Não foi possível carregar as automações.');
      },
    });
  }

  selectJob(jobId: string) {
    const previous = this.selectedJobId();
    if (previous === jobId) return;
    this.selectedJobId.set(jobId);
    this.activeTab.set('atividade');
    this.loadLogs(jobId, true);
    if (jobId === 'auto-tasks') { this.processedPage.set(1); this.loadProcessedOrders(true); }
  }

  openPedidosTab() {
    this.activeTab.set('pedidos');
    this.loadProcessedOrders(true);
  }

  shortName(job: CodeJob): string {
    if (job.id === 'auto-tasks') return 'Tarefas automáticas';
    if (job.id === 'delivery-material-dates') return 'Datas de entrega';
    return job.name;
  }

  friendlyDescription(job: CodeJob): string {
    if (job.id === 'auto-tasks') return 'Cria no Pontta as tarefas de cada ambiente do pedido (checagem, revisão, projeto, envio e aprovação) e atualiza o rodízio.';
    if (job.id === 'delivery-material-dates') return 'Calcula as datas de entrega de material a partir da aprovação do projeto executivo, gera o PDF e salva no Drive.';
    return job.description;
  }

  statusLabel(job: CodeJob): string {
    if (job.isRunning) return 'Executando…';
    return job.isActive ? `Ligada · próxima ${this.formatTime(job.nextRunAt)}` : 'Desligada';
  }

  formatTimesShort(job: CodeJob): string {
    const times = job.runTimesManaus || [];
    return times.length ? times.map((t) => this.toTimeInput(t)).join(' · ') : '—';
  }

  // ───── atividade
  loadLogs(jobId: string, withLoader: boolean) {
    if (withLoader) this.loadingLogs.set(true);
    this.http.get<CodeJobLogEntry[]>(`${this.apiUrl}/jobs/code/${jobId}/logs?limit=200`).subscribe({
      next: (logs) => {
        const wasAtBottom = this.isLogsScrolledToBottom();
        this.selectedJobLogs.set(logs || []);
        if (withLoader) this.loadingLogs.set(false);
        if (wasAtBottom || withLoader) setTimeout(() => this.scrollLogsToBottom(), 0);
      },
      error: () => { if (withLoader) this.loadingLogs.set(false); this.selectedJobLogs.set([]); },
    });
  }

  async clearLogs() {
    const jobId = this.selectedJobId();
    if (!jobId || !(await this.modal.confirm('Limpar a atividade?', 'O registro das últimas execuções será apagado.', 'Limpar'))) return;
    this.http.delete(`${this.apiUrl}/jobs/code/${jobId}/logs`).subscribe({
      next: () => { this.selectedJobLogs.set([]); this.toast.success('Atividade limpa.'); },
      error: () => this.toast.error('Não foi possível limpar a atividade.'),
    });
  }

  private scrollLogsToBottom() {
    const el = this.logsContainerRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private isLogsScrolledToBottom(): boolean {
    const el = this.logsContainerRef?.nativeElement;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }

  // ───── ligar/desligar e rodar
  toggleJob(job: CodeJob) {
    const action = job.isActive ? 'stop' : 'start';
    this.alternando.set(true);
    this.http.post<CodeJob>(`${this.apiUrl}/jobs/code/${job.id}/${action}`, {}).subscribe({
      next: () => { this.alternando.set(false); this.toast.success(job.isActive ? 'Automação desligada.' : 'Automação ligada.'); this.loadJobs(false); this.loadLogs(job.id, false); },
      error: (err) => { this.alternando.set(false); this.toast.error(err?.error?.message || 'Não foi possível alterar.'); },
    });
  }

  async pedirRodar(job: CodeJob) {
    if (PEDE_DATA.has(job.id)) { this.rodarAberto.set(true); return; }
    if (!(await this.modal.confirm('Rodar agora?', 'Executa uma vez imediatamente, sem mudar o agendamento.', 'Rodar'))) return;
    this.runNow(job);
  }

  confirmarRodar() {
    const job = this.selectedJob();
    if (!job || !this.salesOrderDate()) return;
    this.rodarAberto.set(false);
    this.runNow(job, this.salesOrderDate());
  }

  private runNow(job: CodeJob, salesOrderDate?: string) {
    this.activeTab.set('atividade');
    this.http.post<CodeJob>(`${this.apiUrl}/jobs/code/${job.id}/run`, salesOrderDate ? { salesOrderDate } : {}).subscribe({
      next: () => {
        this.toast.success(job.id === 'auto-tasks' ? `Execução iniciada para ${salesOrderDate}.` : 'Execução iniciada. Acompanhe em Atividade.');
        this.loadJobs(false);
        this.loadLogs(job.id, false);
        if (job.id === 'auto-tasks') setTimeout(() => this.loadProcessedOrders(false), 1500);
      },
      error: (err) => this.toast.error(err?.error?.message || 'Não foi possível executar.'),
    });
  }

  // ───── horários
  abrirHorarios(job: CodeJob) {
    this.scheduleDraft.set((job.runTimesManaus || []).map((t) => ({ ...t })));
    this.scheduleDirty.set(false);
    this.horariosAberto.set(true);
  }

  toTimeInput(time: CodeJobRunTime): string {
    return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  }

  onScheduleTimeChange(index: number, event: Event) {
    const [h, m] = ((event.target as HTMLInputElement | null)?.value || '').split(':').map(Number);
    if (!Number.isInteger(h) || !Number.isInteger(m)) return;
    this.scheduleDraft.update((d) => d.map((t, i) => (i === index ? { hour: h, minute: m } : t)));
    this.scheduleDirty.set(true);
  }

  addScheduleTime() { this.scheduleDraft.update((d) => [...d, { hour: 12, minute: 0 }]); this.scheduleDirty.set(true); }
  removeScheduleTime(index: number) {
    if (this.scheduleDraft().length <= 1) return;
    this.scheduleDraft.update((d) => d.filter((_, i) => i !== index));
    this.scheduleDirty.set(true);
  }

  saveSchedule() {
    const job = this.selectedJob();
    if (!job) return;
    this.savingSchedule.set(true);
    this.http.put<CodeJob>(`${this.apiUrl}/jobs/code/${job.id}/schedule`, { runTimesManaus: this.scheduleDraft() }).subscribe({
      next: () => { this.savingSchedule.set(false); this.horariosAberto.set(false); this.toast.success('Horários salvos.'); this.loadJobs(false); },
      error: (err) => { this.savingSchedule.set(false); this.toast.error(err?.error?.message || 'Não foi possível salvar os horários.'); },
    });
  }

  // ───── pedidos processados
  loadProcessedOrders(withLoader: boolean) {
    if (withLoader) this.loadingProcessed.set(true);
    const q = encodeURIComponent(this.processedQuery().trim());
    const page = this.processedPage();
    const limit = this.processedLimit();
    const today = this.processedTodayOnly() ? '1' : '0';
    this.http.get<ProcessedOrdersResponse>(`${this.apiUrl}/jobs/code/auto-tasks/processed-orders?q=${q}&page=${page}&limit=${limit}&today=${today}`).subscribe({
      next: (res) => {
        this.processedOrders.set(res.items || []);
        this.processedTotal.set(res.total || 0);
        this.processedPage.set(res.page || page);
        this.processedLimit.set(res.limit || limit);
        this.processedTotalPages.set(res.totalPages || 1);
        if (withLoader) this.loadingProcessed.set(false);
      },
      error: (err) => { if (withLoader) this.loadingProcessed.set(false); this.toast.error(err?.error?.message || 'Não foi possível carregar os pedidos.'); },
    });
  }

  onProcessedQueryChange(value: string) {
    this.processedQuery.set(value);
    if (this.processedSearchTimeout) clearTimeout(this.processedSearchTimeout);
    this.processedSearchTimeout = setTimeout(() => { this.processedPage.set(1); this.loadProcessedOrders(true); }, 350);
  }

  toggleProcessedTodayOnly(event: Event) {
    this.processedTodayOnly.set(!!(event.target as HTMLInputElement | null)?.checked);
    this.processedPage.set(1);
    this.loadProcessedOrders(true);
  }

  goProcessedPage(p: number) { this.processedPage.set(p); this.loadProcessedOrders(true); }

  async removeProcessedOrder(order: ProcessedOrder) {
    if (!(await this.modal.confirm(`Liberar ${order.code}?`, 'Na próxima execução, as tarefas desse pedido poderão ser criadas de novo.', 'Liberar'))) return;
    this.http.delete(`${this.apiUrl}/jobs/code/auto-tasks/processed-orders/${encodeURIComponent(order.code)}`).subscribe({
      next: () => { this.toast.success(`${order.code} liberado para reprocessar.`); this.loadProcessedOrders(true); },
      error: (err) => this.toast.error(err?.error?.message || 'Não foi possível liberar o pedido.'),
    });
  }

  // ───── formatação
  formatStatus(status: CodeJob['lastStatus']): string {
    return status === 'running' ? 'em andamento' : status === 'success' ? 'sucesso' : status === 'error' ? 'erro' : 'sem execução';
  }
  logLevelLabel(level: CodeJobLogEntry['level']): string {
    return level === 'success' ? 'ok' : level === 'warning' ? 'aviso' : level === 'error' ? 'erro' : 'info';
  }
  prettyData(data: unknown): string {
    try { return typeof data === 'string' ? data : JSON.stringify(data, null, 2); } catch { return String(data); }
  }
  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  private formatTime(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  private getTodayManausDate(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
}
