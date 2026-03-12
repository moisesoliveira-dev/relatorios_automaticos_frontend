import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ModalService } from '../../shared/services/modal.service';

interface ScheduledJob {
    id: string;
    name: string;
    reportType: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    isActive: boolean;
    format: 'excel' | 'csv' | 'pdf';
    filters?: any;
    lastRun?: string;
    nextRun?: string;
    createdAt: string;
}

interface JobTypeOption {
    value: string;
    label: string;
    category: 'report' | 'gosac';
}

@Component({
    selector: 'app-jobs',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="bg-white rounded-xl p-6 border border-slate-200 flex items-start justify-between">
        <div>
          <h1 class="text-xl font-semibold text-slate-800">Jobs Agendados</h1>
          <p class="text-sm text-slate-500 mt-1">Automatize tarefas recorrentes de relatórios e integrações</p>
        </div>
        <button
          (click)="openJobModal()"
          class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Novo Job
        </button>
      </div>

      <!-- Filter Pills -->
      <div class="flex gap-2">
        <button
          (click)="activeFilter.set('all')"
          class="px-3 py-1.5 text-sm rounded-full border transition-colors"
          [class.bg-slate-800]="activeFilter() === 'all'"
          [class.text-white]="activeFilter() === 'all'"
          [class.border-slate-800]="activeFilter() === 'all'"
          [class.text-slate-600]="activeFilter() !== 'all'"
          [class.border-slate-300]="activeFilter() !== 'all'"
          [class.hover:border-slate-500]="activeFilter() !== 'all'"
        >
          Todos ({{ jobs().length }})
        </button>
        <button
          (click)="activeFilter.set('report')"
          class="px-3 py-1.5 text-sm rounded-full border transition-colors"
          [class.bg-blue-700]="activeFilter() === 'report'"
          [class.text-white]="activeFilter() === 'report'"
          [class.border-blue-700]="activeFilter() === 'report'"
          [class.text-slate-600]="activeFilter() !== 'report'"
          [class.border-slate-300]="activeFilter() !== 'report'"
          [class.hover:border-slate-500]="activeFilter() !== 'report'"
        >
          Relatórios ({{ countByCategory('report') }})
        </button>
        <button
          (click)="activeFilter.set('gosac')"
          class="px-3 py-1.5 text-sm rounded-full border transition-colors"
          [class.bg-violet-700]="activeFilter() === 'gosac'"
          [class.text-white]="activeFilter() === 'gosac'"
          [class.border-violet-700]="activeFilter() === 'gosac'"
          [class.text-slate-600]="activeFilter() !== 'gosac'"
          [class.border-slate-300]="activeFilter() !== 'gosac'"
          [class.hover:border-slate-500]="activeFilter() !== 'gosac'"
        >
          Gosac / Pontta ({{ countByCategory('gosac') }})
        </button>
      </div>

      <!-- Jobs List -->
      <div class="bg-white rounded-xl border border-slate-200">
        @if (loading()) {
          <div class="flex items-center justify-center py-16">
            <div class="animate-spin w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full"></div>
          </div>
        } @else if (filteredJobs().length === 0) {
          <div class="text-center py-16 text-slate-500">
            <svg class="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="font-medium">Nenhum job encontrado</p>
            <p class="text-sm mt-1">Crie um job para automatizar tarefas recorrentes.</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-100">
            @for (job of filteredJobs(); track job.id) {
              <div class="p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <!-- Category Badge -->
                <div
                  class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  [class.bg-blue-50]="getJobCategory(job.reportType) === 'report'"
                  [class.bg-violet-50]="getJobCategory(job.reportType) === 'gosac'"
                >
                  @if (getJobCategory(job.reportType) === 'report') {
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  } @else {
                    <svg class="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                    </svg>
                  }
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-medium text-slate-800 text-sm truncate">{{ job.name }}</span>
                    <span
                      class="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      [class.bg-blue-100]="getJobCategory(job.reportType) === 'report'"
                      [class.text-blue-700]="getJobCategory(job.reportType) === 'report'"
                      [class.bg-violet-100]="getJobCategory(job.reportType) === 'gosac'"
                      [class.text-violet-700]="getJobCategory(job.reportType) === 'gosac'"
                    >{{ getReportTypeLabel(job.reportType) }}</span>
                  </div>
                  <div class="flex items-center gap-3 text-xs text-slate-500">
                    <span>{{ getFrequencyLabel(job) }}</span>
                    <span>·</span>
                    <span class="uppercase">{{ job.format }}</span>
                    @if (job.nextRun) {
                      <span>·</span>
                      <span>Próx: {{ formatDate(job.nextRun) }}</span>
                    }
                    @if (job.lastRun) {
                      <span>·</span>
                      <span>Último: {{ formatDate(job.lastRun) }}</span>
                    }
                  </div>
                </div>

                <!-- Toggle + Actions -->
                <div class="flex items-center gap-3 flex-shrink-0">
                  <button
                    (click)="toggleJob(job)"
                    class="w-11 h-6 rounded-full transition-colors relative"
                    [class.bg-green-500]="job.isActive"
                    [class.bg-slate-300]="!job.isActive"
                    [title]="job.isActive ? 'Desativar' : 'Ativar'"
                  >
                    <span
                      class="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
                      [class.left-1]="!job.isActive"
                      [class.left-6]="job.isActive"
                    ></span>
                  </button>
                  <button
                    (click)="editJob(job)"
                    class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    title="Editar"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button
                    (click)="deleteJob(job)"
                    class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Excluir"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Modal de Job -->
    @if (showJobModal) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-slate-200 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-800">
              {{ editingJob ? 'Editar Job' : 'Novo Job Agendado' }}
            </h3>
            <button (click)="cancelJobModal()" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <!-- Nome -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Nome do Job</label>
              <input
                type="text"
                [(ngModel)]="jobForm.name"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent text-sm"
                placeholder="Ex: Relatório Diário de Ocorrências"
              />
            </div>

            <!-- Tipo -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Funcionalidade</label>
              <select
                [(ngModel)]="jobForm.reportType"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 text-sm"
              >
                <optgroup label="Relatórios">
                  @for (opt of reportTypeOptions; track opt.value) {
                    @if (opt.category === 'report') {
                      <option [value]="opt.value">{{ opt.label }}</option>
                    }
                  }
                </optgroup>
                <optgroup label="Gosac / Pontta">
                  @for (opt of reportTypeOptions; track opt.value) {
                    @if (opt.category === 'gosac') {
                      <option [value]="opt.value">{{ opt.label }}</option>
                    }
                  }
                </optgroup>
              </select>
            </div>

            <!-- Frequência -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Frequência</label>
              <select
                [(ngModel)]="jobForm.frequency"
                (ngModelChange)="onFrequencyChange()"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 text-sm"
              >
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>

            <!-- Horário -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Horário</label>
              <input
                type="time"
                [(ngModel)]="jobForm.time"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 text-sm"
              />
            </div>

            @if (jobForm.frequency === 'weekly') {
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Dia da Semana</label>
                <select
                  [(ngModel)]="jobForm.dayOfWeek"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 text-sm"
                >
                  <option [ngValue]="0">Domingo</option>
                  <option [ngValue]="1">Segunda-feira</option>
                  <option [ngValue]="2">Terça-feira</option>
                  <option [ngValue]="3">Quarta-feira</option>
                  <option [ngValue]="4">Quinta-feira</option>
                  <option [ngValue]="5">Sexta-feira</option>
                  <option [ngValue]="6">Sábado</option>
                </select>
              </div>
            }

            @if (jobForm.frequency === 'monthly') {
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Dia do Mês</label>
                <input
                  type="number"
                  [(ngModel)]="jobForm.dayOfMonth"
                  min="1"
                  max="31"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 text-sm"
                />
              </div>
            }

            <!-- Formato -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Formato de saída</label>
              <select
                [(ngModel)]="jobForm.format"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 text-sm"
              >
                @for (opt of getFormatOptions(); track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
          </div>

          <div class="p-6 border-t border-slate-200 flex justify-end gap-3">
            <button
              (click)="cancelJobModal()"
              class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              (click)="saveJob()"
              [disabled]="savingJob()"
              class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              @if (savingJob()) {
                <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Salvando...
              } @else {
                Salvar
              }
            </button>
          </div>
        </div>
      </div>
    }

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
export class JobsComponent implements OnInit {
    private http = inject(HttpClient);
    private modalService = inject(ModalService);
    private apiUrl = environment.apiUrl;

    jobs = signal<ScheduledJob[]>([]);
    loading = signal(false);
    activeFilter = signal<'all' | 'report' | 'gosac'>('all');
    showJobModal = false;
    editingJob: ScheduledJob | null = null;
    savingJob = signal(false);
    successMessage = signal('');
    errorMessage = signal('');

    reportTypeOptions: JobTypeOption[] = [
        { value: 'occurrences', label: 'Ocorrências', category: 'report' },
        { value: 'monthly', label: 'Mensal', category: 'report' },
        { value: 'custom', label: 'Customizado', category: 'report' },
        { value: 'gosac-grupos', label: 'Groups — Sincronização', category: 'gosac' },
        { value: 'gosac-pagamento-montador', label: 'Pagamento de Montador', category: 'gosac' },
    ];

    jobForm: any = {
        name: '',
        reportType: 'occurrences',
        frequency: 'daily',
        time: '09:00',
        dayOfWeek: 1,
        dayOfMonth: 1,
        format: 'excel',
        sendToFixedEmails: true
    };

    ngOnInit() {
        this.loadJobs();
    }

    loadJobs() {
        this.loading.set(true);
        this.http.get<ScheduledJob[]>(`${this.apiUrl}/jobs`).subscribe({
            next: (data) => { this.jobs.set(data); this.loading.set(false); },
            error: () => { this.loading.set(false); }
        });
    }

    filteredJobs(): ScheduledJob[] {
        const filter = this.activeFilter();
        if (filter === 'all') return this.jobs();
        return this.jobs().filter(j => this.getJobCategory(j.reportType) === filter);
    }

    countByCategory(category: 'report' | 'gosac'): number {
        return this.jobs().filter(j => this.getJobCategory(j.reportType) === category).length;
    }

    getJobCategory(reportType: string): 'report' | 'gosac' {
        return reportType.startsWith('gosac-') ? 'gosac' : 'report';
    }

    getReportTypeLabel(type: string): string {
        return this.reportTypeOptions.find(o => o.value === type)?.label ?? type;
    }

    getFrequencyLabel(job: ScheduledJob): string {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        if (job.frequency === 'daily') return `Diário às ${job.time}`;
        if (job.frequency === 'weekly') return `${days[job.dayOfWeek ?? 0]} às ${job.time}`;
        return `Dia ${job.dayOfMonth} às ${job.time}`;
    }

    getFormatOptions(): { value: string; label: string }[] {
        const type = this.jobForm.reportType as string;
        if (type.startsWith('gosac-')) {
            return [{ value: 'pdf', label: 'PDF' }, { value: 'excel', label: 'Excel (.xlsx)' }, { value: 'csv', label: 'CSV' }];
        }
        return [{ value: 'excel', label: 'Excel (.xlsx)' }, { value: 'csv', label: 'CSV' }];
    }

    openJobModal() {
        this.editingJob = null;
        this.jobForm = { name: '', reportType: 'occurrences', frequency: 'daily', time: '09:00', dayOfWeek: 1, dayOfMonth: 1, format: 'excel', sendToFixedEmails: true };
        this.showJobModal = true;
    }

    editJob(job: ScheduledJob) {
        this.editingJob = job;
        this.jobForm = {
            name: job.name,
            reportType: job.reportType,
            frequency: job.frequency,
            time: job.time,
            dayOfWeek: job.dayOfWeek ?? 1,
            dayOfMonth: job.dayOfMonth ?? 1,
            format: job.format,
            sendToFixedEmails: (job as any).sendToFixedEmails ?? true
        };
        this.showJobModal = true;
    }

    cancelJobModal() {
        this.showJobModal = false;
        this.editingJob = null;
    }

    onFrequencyChange() {
        if (this.jobForm.frequency === 'daily') {
            delete this.jobForm.dayOfWeek;
            delete this.jobForm.dayOfMonth;
        }
    }

    saveJob() {
        this.savingJob.set(true);
        const payload = { ...this.jobForm };
        if (payload.frequency === 'daily') { delete payload.dayOfWeek; delete payload.dayOfMonth; }
        else if (payload.frequency === 'weekly') { delete payload.dayOfMonth; }
        else if (payload.frequency === 'monthly') { delete payload.dayOfWeek; }

        const req = this.editingJob
            ? this.http.put(`${this.apiUrl}/jobs/${this.editingJob.id}`, payload)
            : this.http.post(`${this.apiUrl}/jobs`, payload);

        req.subscribe({
            next: () => {
                this.successMessage.set(this.editingJob ? 'Job atualizado!' : 'Job criado!');
                this.savingJob.set(false);
                this.cancelJobModal();
                this.loadJobs();
                setTimeout(() => this.successMessage.set(''), 3000);
            },
            error: (err) => {
                this.errorMessage.set(err.error?.message ?? 'Erro ao salvar job');
                this.savingJob.set(false);
                setTimeout(() => this.errorMessage.set(''), 5000);
            }
        });
    }

    toggleJob(job: ScheduledJob) {
        this.http.put(`${this.apiUrl}/jobs/${job.id}/toggle`, {}).subscribe({
            next: () => {
                this.successMessage.set(`Job ${job.isActive ? 'desativado' : 'ativado'}!`);
                this.loadJobs();
                setTimeout(() => this.successMessage.set(''), 3000);
            },
            error: () => {
                this.errorMessage.set('Erro ao alterar status');
                setTimeout(() => this.errorMessage.set(''), 3000);
            }
        });
    }

    async deleteJob(job: ScheduledJob) {
        const confirmed = await this.modalService.confirm(
            'Excluir Job',
            `Deseja excluir "${job.name}"?`,
            'Sim, excluir',
            'Cancelar'
        );
        if (!confirmed) return;
        this.http.delete(`${this.apiUrl}/jobs/${job.id}`).subscribe({
            next: () => { this.loadJobs(); this.modalService.success('Job excluído!'); },
            error: () => { this.modalService.error('Erro ao excluir job'); }
        });
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}
