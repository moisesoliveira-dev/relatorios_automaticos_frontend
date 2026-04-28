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
      <div class="bg-white rounded-xl p-6 border border-slate-200 flex items-start justify-between">
        <div>
          <h1 class="text-xl font-semibold text-slate-800">Jobs do Sistema</h1>
          <p class="text-sm text-slate-500 mt-1">Jobs definidos em código, com controle de execução e logs em tempo real.</p>
        </div>
        <button
          (click)="refreshNow()"
          class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Atualizar
        </button>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 bg-white rounded-xl border border-slate-200">
          @if (loading()) {
            <div class="flex items-center justify-center py-16">
              <div class="animate-spin w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full"></div>
            </div>
          } @else if (jobs().length === 0) {
            <div class="text-center py-16 text-slate-500">
              <svg class="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="font-medium">Nenhum job de código disponível</p>
            </div>
          } @else {
            <div class="divide-y divide-slate-100">
              @for (job of jobs(); track job.id) {
                <div
                  class="p-5 hover:bg-slate-50 transition-colors cursor-pointer"
                  [class.bg-blue-50/40]="selectedJobId() === job.id"
                  (click)="selectJob(job.id)"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <h3 class="text-sm font-semibold text-slate-800 truncate">{{ job.name }}</h3>
                        <span class="text-[11px] px-2 py-0.5 rounded-full border"
                          [class.bg-emerald-50]="job.isActive"
                          [class.text-emerald-700]="job.isActive"
                          [class.border-emerald-200]="job.isActive"
                          [class.bg-slate-100]="!job.isActive"
                          [class.text-slate-600]="!job.isActive"
                          [class.border-slate-200]="!job.isActive"
                        >{{ job.isActive ? 'Ativo' : 'Parado' }}</span>

                        <span class="text-[11px] px-2 py-0.5 rounded-full border"
                          [class.bg-blue-50]="job.isRunning"
                          [class.text-blue-700]="job.isRunning"
                          [class.border-blue-200]="job.isRunning"
                          [class.bg-slate-100]="!job.isRunning"
                          [class.text-slate-600]="!job.isRunning"
                          [class.border-slate-200]="!job.isRunning"
                        >{{ job.isRunning ? 'Executando' : 'Idle' }}</span>
                      </div>

                      <p class="text-xs text-slate-500">{{ job.description }}</p>
                      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>Agenda: {{ job.scheduleLabel }}</span>
                        <span>Próx: {{ formatDate(job.nextRunAt) }}</span>
                        <span>Último: {{ formatDate(job.lastRunAt) }}</span>
                        <span>Status: {{ formatStatus(job.lastStatus) }}</span>
                      </div>
                      @if (job.lastSummary) {
                        <p class="mt-2 text-xs text-slate-600">Resumo: {{ job.lastSummary }}</p>
                      }
                    </div>

                    <div class="flex flex-col gap-2 flex-shrink-0" (click)="$event.stopPropagation()">
                      @if (job.id === 'delivery-material-dates') {
                        <div class="flex items-center gap-2">
                          <label class="text-[11px] text-slate-500 whitespace-nowrap">Data PV</label>
                          <input
                            type="date"
                            class="h-8 rounded-lg border border-slate-300 px-2 text-xs text-slate-700 bg-white"
                            [value]="salesOrderDate()"
                            [disabled]="job.isRunning"
                            (input)="onSalesOrderDateChange($event)"
                          />
                        </div>
                      }

                      <div class="flex gap-2 justify-end">
                        <button
                          (click)="toggleJob(job)"
                          class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                          [class.bg-amber-50]="job.isActive"
                          [class.text-amber-700]="job.isActive"
                          [class.border-amber-200]="job.isActive"
                          [class.hover:bg-amber-100]="job.isActive"
                          [class.bg-emerald-50]="!job.isActive"
                          [class.text-emerald-700]="!job.isActive"
                          [class.border-emerald-200]="!job.isActive"
                          [class.hover:bg-emerald-100]="!job.isActive"
                          [disabled]="job.isRunning"
                        >
                          {{ job.isActive ? 'Parar' : 'Iniciar' }}
                        </button>

                        <button
                          (click)="runNow(job, job.id === 'delivery-material-dates' ? salesOrderDate() : undefined)"
                          class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
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

        <div class="bg-white rounded-xl border border-slate-200 flex flex-col" style="height: 600px;">
          <div class="px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl flex items-center justify-between gap-2 flex-shrink-0">
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-slate-800">Logs do Job</h3>
              @if (selectedJob()) {
                <p class="text-xs text-slate-500 mt-0.5 truncate">{{ selectedJob()!.name }}</p>
              }
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              @if (selectedJobLogs().length > 0) {
                <span class="text-[11px] text-slate-400">{{ selectedJobLogs().length }} entr{{ selectedJobLogs().length === 1 ? 'ada' : 'adas' }}</span>
                <button
                  (click)="clearLogs()"
                  class="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  title="Limpar todos os logs deste job"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  Limpar
                </button>
              }
              <button
                (click)="scrollLogsToBottom()"
                class="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 transition-colors"
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
            <div class="flex-1 flex items-center justify-center text-slate-400 text-sm p-6 text-center">
              Selecione um job para visualizar os logs.
            </div>
          } @else if (loadingLogs()) {
            <div class="flex-1 flex items-center justify-center">
              <div class="animate-spin w-5 h-5 border-2 border-slate-200 border-t-slate-600 rounded-full"></div>
            </div>
          } @else if (selectedJobLogs().length === 0) {
            <div class="flex-1 flex items-center justify-center text-slate-400 text-sm p-6 text-center">
              <div>
                <svg class="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Nenhum log disponível.
              </div>
            </div>
          } @else {
            <div #logsContainer class="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 font-mono text-[11px]">
              @for (log of selectedJobLogs(); track $index) {
                <div class="job-log-card rounded px-2.5 py-1.5"
                  [class.job-log-info]="log.level === 'info'"
                  [class.job-log-success]="log.level === 'success'"
                  [class.job-log-warning]="log.level === 'warning'"
                  [class.job-log-error]="log.level === 'error'"
                  [class.border-l-2]="true"
                  [class.border-l-slate-300]="log.level === 'info'"
                  [class.bg-slate-50]="log.level === 'info'"
                  [class.border-l-emerald-400]="log.level === 'success'"
                  [class.bg-emerald-50]="log.level === 'success'"
                  [class.border-l-amber-400]="log.level === 'warning'"
                  [class.bg-amber-50]="log.level === 'warning'"
                  [class.border-l-red-400]="log.level === 'error'"
                  [class.bg-red-50]="log.level === 'error'"
                >
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <span class="job-log-time text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">{{ formatDate(log.timestamp) }}</span>
                    <span class="job-log-level font-bold uppercase tracking-wider text-[10px] flex-shrink-0 w-14"
                      [class.text-slate-500]="log.level === 'info'"
                      [class.text-emerald-700]="log.level === 'success'"
                      [class.text-amber-700]="log.level === 'warning'"
                      [class.text-red-700]="log.level === 'error'"
                    >{{ log.level }}</span>
                    <span class="job-log-message text-slate-700 break-words min-w-0">{{ log.message }}</span>
                  </div>
                  @if (log.data) {
                    <pre class="job-log-data mt-1 ml-[122px] text-[10px] text-slate-500 whitespace-pre-wrap break-words">{{ prettyData(log.data) }}</pre>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

    <!-- Toast success -->
    @if (successMessage()) {
      <div class="fixed bottom-4 right-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 shadow-lg z-50">
        <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="text-green-700 text-sm">{{ successMessage() }}</span>
      </div>
    }

    <!-- Toast error -->
    @if (errorMessage()) {
      <div class="fixed bottom-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 shadow-lg z-50">
        <svg class="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="text-red-700 text-sm">{{ errorMessage() }}</span>
      </div>
    }
  `
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
          // aguarda render antes de scrollar
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
