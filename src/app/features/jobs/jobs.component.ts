import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface CodeJob {
  id: string;
  name: string;
  description: string;
  scheduleLabel: string;
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

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Jobs do Sistema</h1>
          <p class="page-subtitle">Jobs definidos em código, com controle de execução e logs em tempo real.</p>
        </div>
        <button type="button" (click)="refreshNow()" class="btn btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Atualizar
        </button>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 panel">
          @if (loading()) {
            <div class="flex items-center justify-center py-16">
              <div
                class="animate-spin w-6 h-6 rounded-full border-2"
                style="border-color: var(--cmm-border); border-top-color: var(--cmm-accent);"
              ></div>
            </div>
          } @else if (jobs().length === 0) {
            <div class="empty-state">
              <svg class="w-10 h-10 mx-auto mb-3" style="color: var(--cmm-border);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="font-medium" style="color: var(--cmm-ink);">Nenhum job de código disponível</p>
            </div>
          } @else {
            <div style="border-color: var(--cmm-border);" class="divide-y">
              @for (job of jobs(); track job.id) {
                <div
                  class="job-row p-5 cursor-pointer transition-colors"
                  [class.job-row-selected]="selectedJobId() === job.id"
                  (click)="selectJob(job.id)"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 class="text-sm font-semibold truncate" style="color: var(--cmm-ink);">{{ job.name }}</h3>
                        <span
                          class="badge"
                          [class.badge-success]="job.isActive"
                          [class.badge-neutral]="!job.isActive"
                        >{{ job.isActive ? 'Ativo' : 'Parado' }}</span>
                        <span
                          class="badge"
                          [class.badge-accent]="job.isRunning"
                          [class.badge-neutral]="!job.isRunning"
                        >{{ job.isRunning ? 'Executando' : 'Idle' }}</span>
                      </div>

                      <p class="text-xs" style="color: var(--cmm-muted);">{{ job.description }}</p>
                      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style="color: var(--cmm-muted);">
                        <span>Agenda: {{ job.scheduleLabel }}</span>
                        <span>Próx: {{ formatDate(job.nextRunAt) }}</span>
                        <span>Último: {{ formatDate(job.lastRunAt) }}</span>
                        <span>Status: {{ formatStatus(job.lastStatus) }}</span>
                      </div>
                      @if (job.lastSummary) {
                        <p class="mt-2 text-xs" style="color: var(--cmm-ink);">Resumo: {{ job.lastSummary }}</p>
                      }
                    </div>

                    <div class="flex flex-col gap-2 flex-shrink-0" (click)="$event.stopPropagation()">
                      @if (job.id === 'delivery-material-dates') {
                        <div class="flex items-center gap-2">
                          <label class="text-[11px] whitespace-nowrap" style="color: var(--cmm-muted);">Data PV</label>
                          <input
                            type="date"
                            class="form-input"
                            style="min-height: 2rem; width: auto; font-size: 0.75rem; padding: 0.25rem 0.5rem;"
                            [value]="salesOrderDate()"
                            [disabled]="job.isRunning"
                            (input)="onSalesOrderDateChange($event)"
                          />
                        </div>
                      }

                      <div class="flex gap-2 justify-end">
                        <button
                          type="button"
                          (click)="toggleJob(job)"
                          class="btn btn-sm"
                          [class.btn-secondary]="job.isActive"
                          [class.btn-accent]="!job.isActive"
                          [disabled]="job.isRunning"
                        >
                          {{ job.isActive ? 'Parar' : 'Iniciar' }}
                        </button>

                        <button
                          type="button"
                          (click)="runNow(job, job.id === 'delivery-material-dates' ? salesOrderDate() : undefined)"
                          class="btn btn-sm btn-secondary"
                          [disabled]="job.isRunning || (job.id === 'delivery-material-dates' && !salesOrderDate())"
                        >
                          Executar agora
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="panel flex flex-col min-h-[20rem] max-h-[min(70vh,40rem)]">
          <div
            class="px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0 rounded-t-[0.75rem]"
            style="border-bottom: 1px solid var(--cmm-border); background: color-mix(in srgb, var(--cmm-surface) 70%, var(--cmm-panel));"
          >
            <div class="min-w-0">
              <h3 class="text-sm font-semibold" style="color: var(--cmm-ink);">Logs do Job</h3>
              @if (selectedJob()) {
                <p class="text-xs mt-0.5 truncate" style="color: var(--cmm-muted);">{{ selectedJob()!.name }}</p>
              }
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              @if (selectedJobLogs().length > 0) {
                <span class="text-[11px]" style="color: var(--cmm-muted);">{{ selectedJobLogs().length }} entr{{ selectedJobLogs().length === 1 ? 'ada' : 'adas' }}</span>
                <button
                  type="button"
                  (click)="clearLogs()"
                  class="btn btn-sm btn-danger"
                  title="Limpar todos os logs deste job"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  Limpar
                </button>
              }
              <button
                type="button"
                (click)="scrollLogsToBottom()"
                class="btn btn-sm btn-secondary"
                title="Ir para o final"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
                Final
              </button>
            </div>
          </div>

          @if (!selectedJob()) {
            <div class="empty-state flex-1 flex items-center justify-center">
              Selecione um job para visualizar os logs.
            </div>
          } @else if (loadingLogs()) {
            <div class="flex-1 flex items-center justify-center">
              <div
                class="animate-spin w-5 h-5 rounded-full border-2"
                style="border-color: var(--cmm-border); border-top-color: var(--cmm-accent);"
              ></div>
            </div>
          } @else if (selectedJobLogs().length === 0) {
            <div class="empty-state flex-1 flex items-center justify-center">
              <div>
                <svg class="w-8 h-8 mx-auto mb-2" style="color: var(--cmm-border);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Nenhum log disponível.
              </div>
            </div>
          } @else {
            <div #logsContainer class="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 font-mono text-[11px] min-h-0">
              @for (log of selectedJobLogs(); track $index) {
                <div class="job-log-card rounded px-2.5 py-1.5 border-l-2"
                  [class.job-log-info]="log.level === 'info'"
                  [class.job-log-success]="log.level === 'success'"
                  [class.job-log-warning]="log.level === 'warning'"
                  [class.job-log-error]="log.level === 'error'"
                  [style.border-left-color]="logBorderColor(log.level)"
                  [style.background]="logBackground(log.level)"
                >
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <span class="job-log-time text-[10px] whitespace-nowrap flex-shrink-0" style="color: var(--cmm-muted);">{{ formatDate(log.timestamp) }}</span>
                    <span
                      class="job-log-level font-bold uppercase tracking-wider text-[10px] flex-shrink-0 w-14"
                      [style.color]="logLevelColor(log.level)"
                    >{{ log.level }}</span>
                    <span class="job-log-message break-words min-w-0" style="color: var(--cmm-ink);">{{ log.message }}</span>
                  </div>
                  @if (log.data) {
                    <pre class="job-log-data mt-1 ml-[122px] text-[10px] whitespace-pre-wrap break-words" style="color: var(--cmm-muted);">{{ prettyData(log.data) }}</pre>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

      @if (successMessage()) {
        <div
          class="fixed bottom-4 right-4 p-4 rounded-lg flex items-center gap-3 z-50"
          style="background: color-mix(in srgb, var(--cmm-success) 12%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-success) 30%, transparent); box-shadow: 0 12px 28px rgba(15, 26, 39, 0.16);"
        >
          <svg class="w-5 h-5 flex-shrink-0" style="color: var(--cmm-success);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-sm" style="color: var(--cmm-success);">{{ successMessage() }}</span>
        </div>
      }

      @if (errorMessage()) {
        <div
          class="fixed bottom-4 right-4 p-4 rounded-lg flex items-center gap-3 z-50"
          style="background: color-mix(in srgb, var(--cmm-danger) 12%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-danger) 30%, transparent); box-shadow: 0 12px 28px rgba(15, 26, 39, 0.16);"
        >
          <svg class="w-5 h-5 flex-shrink-0" style="color: var(--cmm-danger);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-sm" style="color: var(--cmm-danger);">{{ errorMessage() }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .job-row:hover {
      background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));
    }
    .job-row-selected,
    .job-row-selected:hover {
      background: color-mix(in srgb, var(--cmm-accent) 8%, var(--cmm-panel));
    }
  `]
})
export class JobsComponent implements OnInit, OnDestroy {
  @ViewChild('logsContainer') private logsContainerRef!: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  jobs = signal<CodeJob[]>([]);
  salesOrderDate = signal(this.getTodayManausDate());
  selectedJobId = signal<string | null>(null);
  selectedJobLogs = signal<CodeJobLogEntry[]>([]);
  loading = signal(false);
  loadingLogs = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  ngOnInit() {
    this.loadJobs(true);
    this.refreshInterval = setInterval(() => {
      this.loadJobs(false);
      const selected = this.selectedJobId();
      if (selected) {
        this.loadLogs(selected, false);
      }
    }, 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  refreshNow() {
    this.loadJobs(false);
    const selected = this.selectedJobId();
    if (selected) {
      this.loadLogs(selected, true);
    }
  }

  loadJobs(withLoader: boolean) {
    if (withLoader) {
      this.loading.set(true);
    }

    this.http.get<CodeJob[]>(`${this.apiUrl}/jobs/code`).subscribe({
      next: (data) => {
        this.jobs.set(data || []);
        if (withLoader) {
          this.loading.set(false);
        }

        const selected = this.selectedJobId();
        const selectedStillExists = !!selected && data.some((j) => j.id === selected);
        if (!selectedStillExists && data.length > 0) {
          this.selectJob(data[0].id);
        }
      },
      error: (err) => {
        if (withLoader) {
          this.loading.set(false);
        }
        this.errorMessage.set(err?.error?.message || 'Erro ao carregar jobs de código');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  selectJob(jobId: string) {
    this.selectedJobId.set(jobId);
    this.loadLogs(jobId, true);
  }

  selectedJob(): CodeJob | null {
    const id = this.selectedJobId();
    if (!id) return null;
    return this.jobs().find((job) => job.id === id) || null;
  }

  loadLogs(jobId: string, withLoader: boolean) {
    if (withLoader) {
      this.loadingLogs.set(true);
    }

    this.http.get<CodeJobLogEntry[]>(`${this.apiUrl}/jobs/code/${jobId}/logs?limit=200`).subscribe({
      next: (logs) => {
        const wasAtBottom = this.isLogsScrolledToBottom();
        this.selectedJobLogs.set(logs || []);
        if (withLoader) {
          this.loadingLogs.set(false);
        }
        if (wasAtBottom) {
          setTimeout(() => this.scrollLogsToBottom(), 0);
        }
      },
      error: () => {
        if (withLoader) {
          this.loadingLogs.set(false);
        }
        this.selectedJobLogs.set([]);
      },
    });
  }

  toggleJob(job: CodeJob) {
    const action = job.isActive ? 'stop' : 'start';
    this.http.post<CodeJob>(`${this.apiUrl}/jobs/code/${job.id}/${action}`, {}).subscribe({
      next: () => {
        this.successMessage.set(job.isActive ? 'Job parado com sucesso.' : 'Job iniciado com sucesso.');
        this.loadJobs(false);
        this.loadLogs(job.id, false);
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Erro ao alterar estado do job');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  runNow(job: CodeJob, salesOrderDate?: string) {
    if (job.id === 'delivery-material-dates' && !salesOrderDate) {
      this.errorMessage.set('Selecione a data dos pedidos de venda para executar este job.');
      setTimeout(() => this.errorMessage.set(''), 5000);
      return;
    }

    const payload = salesOrderDate ? { salesOrderDate } : {};

    this.http.post<CodeJob>(`${this.apiUrl}/jobs/code/${job.id}/run`, payload).subscribe({
      next: () => {
        this.successMessage.set('Execução manual iniciada.');
        this.loadJobs(false);
        this.loadLogs(job.id, false);
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Erro ao executar job manualmente');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  clearLogs() {
    const jobId = this.selectedJobId();
    if (!jobId) return;

    this.http.delete(`${this.apiUrl}/jobs/code/${jobId}/logs`).subscribe({
      next: () => {
        this.selectedJobLogs.set([]);
        this.successMessage.set('Logs limpos com sucesso.');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.errorMessage.set('Erro ao limpar logs.');
        setTimeout(() => this.errorMessage.set(''), 4000);
      },
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
    if (status === 'running') return 'Executando';
    if (status === 'success') return 'Sucesso';
    if (status === 'error') return 'Erro';
    return 'Idle';
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
    return 'color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel))';
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
      second: '2-digit',
    });
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
