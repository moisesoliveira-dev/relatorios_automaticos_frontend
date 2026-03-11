import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ModalService } from '../../shared/services/modal.service';

interface ScheduledJob {
  id: string;
  name: string;
  reportType: 'occurrences' | 'monthly' | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  isActive: boolean;
  format: 'excel' | 'csv';
  filters?: any;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

interface EnvironmentSetting {
  key: string;
  value: string;
  isEncrypted: boolean;
  description: string;
  category: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white rounded-xl p-6 border border-slate-200">
        <h1 class="text-xl font-semibold text-slate-800">Configurações</h1>
        <p class="text-sm text-slate-500 mt-1">Gerencie jobs agendados e configurações do sistema</p>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="flex border-b border-slate-200">
          <button
            (click)="activeTab.set('jobs')"
            class="flex-1 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
            [class.border-slate-700]="activeTab() === 'jobs'"
            [class.text-slate-800]="activeTab() === 'jobs'"
            [class.border-transparent]="activeTab() !== 'jobs'"
            [class.text-slate-500]="activeTab() !== 'jobs'"
          >
            Jobs Agendados
          </button>
          <button
            (click)="activeTab.set('environment')"
            class="flex-1 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
            [class.border-slate-700]="activeTab() === 'environment'"
            [class.text-slate-800]="activeTab() === 'environment'"
            [class.border-transparent]="activeTab() !== 'environment'"
            [class.text-slate-500]="activeTab() !== 'environment'"
          >
            Variáveis de Ambiente
          </button>
        </div>

        <!-- Jobs Tab -->
        @if (activeTab() === 'jobs') {
          <div>
            <div class="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-slate-800">Jobs Agendados</h2>
                <p class="text-sm text-slate-500 mt-1">
                  Envio automático de relatórios por email
                </p>
              </div>
              <button 
                (click)="openJobModal()"
                class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <span>+</span>
                Novo Job
              </button>
            </div>

            <div class="p-6">
              @if (loading()) {
                <div class="flex items-center justify-center py-12">
                  <div class="animate-spin w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full"></div>
                </div>
              } @else if (jobs().length === 0) {
                <div class="text-center py-12 text-slate-500">
                  <p>Nenhum job agendado.</p>
                  <p class="text-sm mt-1">Crie jobs para enviar relatórios automaticamente.</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  @for (job of jobs(); track job.id) {
                    <div class="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                      <div class="flex items-start justify-between mb-3">
                        <div>
                          <h3 class="font-semibold text-slate-800">{{ job.name }}</h3>
                          <p class="text-sm text-slate-500">{{ getReportTypeLabel(job.reportType) }}</p>
                        </div>
                        <button 
                          (click)="toggleJob(job)"
                          class="w-12 h-6 rounded-full transition-colors relative"
                          [class.bg-green-500]="job.isActive"
                          [class.bg-slate-300]="!job.isActive"
                        >
                          <span 
                            class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                            [class.left-1]="!job.isActive"
                            [class.left-7]="job.isActive"
                          ></span>
                        </button>
                      </div>

                      <div class="space-y-2 text-sm">
                        <div class="flex items-center gap-1.5 text-slate-500 text-xs">
                          <span class="font-medium text-slate-600">Freq.:</span>
                          <span>{{ getFrequencyLabel(job) }}</span>
                        </div>
                        <div class="flex items-center gap-1.5 text-slate-500 text-xs">
                          <span class="font-medium text-slate-600">Formato:</span>
                          <span>{{ job.format.toUpperCase() }}</span>
                        </div>
                        @if (job.nextRun) {
                          <div class="flex items-center gap-1.5 text-slate-500 text-xs">
                            <span class="font-medium text-slate-600">Próx.:</span>
                            <span>{{ formatDate(job.nextRun) }}</span>
                          </div>
                        }
                      </div>

                      <div class="flex gap-2 mt-4">
                        <button
                          (click)="editJob(job)"
                          class="flex-1 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          (click)="deleteJob(job)"
                          class="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Excluir"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

      <!-- Environment Tab -->
      @if (activeTab() === 'environment') {
        <div>
          <div class="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">Variáveis de Ambiente</h2>
              <p class="text-sm text-slate-500 mt-1">
                Configure SMTP, URLs e outras variáveis do sistema
              </p>
            </div>
            <button
              (click)="saveEnvironmentSettings()"
              [disabled]="savingSettings()"
              class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              @if (savingSettings()) {
                <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Salvando...
              } @else {
                Salvar alterações
              }
            </button>
          </div>

          <div class="p-6">
            @if (loadingSettings()) {
              <div class="flex items-center justify-center py-12">
                <div class="animate-spin w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full"></div>
              </div>
            } @else {
              <!-- Configurações de Email -->
              <div class="mb-8">
                <h3 class="text-sm font-semibold text-slate-700 mb-4">Configurações de Email</h3>
                <p class="text-xs text-slate-500 mb-4">Use <strong>smtp</strong> para envio local ou <strong>resend</strong> para plataformas cloud (Railway, Render, etc.).</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (setting of getSettingsByCategory('email'); track setting.key) {
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-1">
                        {{ setting.description }}
                        @if (setting.isEncrypted) {
                          <span class="text-xs text-slate-400 ml-1">(criptografado)</span>
                        }
                      </label>
                      <input
                        [type]="setting.isEncrypted ? 'password' : 'text'"
                        [(ngModel)]="setting.value"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                        [placeholder]="setting.description"
                      />
                    </div>
                  }
                </div>
              </div>

              <!-- Configurações Gerais -->
              <div class="mb-8">
                <h3 class="text-sm font-semibold text-slate-700 mb-4">Configurações Gerais</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (setting of getSettingsByCategory('general'); track setting.key) {
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-1">
                        {{ setting.description }}
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="setting.value"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                        [placeholder]="setting.description"
                      />
                    </div>
                  }
                </div>
              </div>

              <!-- Configurações da API Pontta -->
              <div class="mb-8">
                <h3 class="text-sm font-semibold text-slate-700 mb-4">Configurações da API Pontta</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (setting of getSettingsByCategory('api'); track setting.key) {
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-1">
                        {{ setting.description }}
                        @if (setting.isEncrypted) {
                          <span class="text-xs text-slate-400 ml-1">(criptografado)</span>
                        }
                      </label>
                      <input
                        [type]="setting.isEncrypted ? 'password' : 'text'"
                        [(ngModel)]="setting.value"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                        [placeholder]="setting.description"
                      />
                    </div>
                  }
                </div>
              </div>

              <!-- Configurações de Jobs -->
              <div>
                <h3 class="text-sm font-semibold text-slate-700 mb-4">Configurações de Jobs</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (setting of getSettingsByCategory('jobs'); track setting.key) {
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-1">
                        {{ setting.description }}
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="setting.value"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                        [placeholder]="setting.description"
                      />
                    </div>
                  }
                </div>
              </div>

              @if (settingsSuccessMessage()) {
                <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  {{ settingsSuccessMessage() }}
                </div>
              }

              @if (settingsErrorMessage()) {
                <div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {{ settingsErrorMessage() }}
                </div>
              }
            }
          </div>
        </div>
      }
    </div>

      <!-- Modal de Job -->
      @if (showJobModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div class="p-6 border-b border-slate-200">
              <h3 class="text-lg font-semibold text-slate-800">
                {{ editingJob ? 'Editar Job' : 'Novo Job Agendado' }}
              </h3>
            </div>

            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nome do Job</label>
                <input
                  type="text"
                  [(ngModel)]="jobForm.name"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  placeholder="Ex: Relatório Diário de Ocorrências"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Tipo de Relatório</label>
                <select
                  [(ngModel)]="jobForm.reportType"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                >
                  <option value="occurrences">Ocorrências</option>
                  <option value="monthly">Mensal</option>
                  <option value="custom">Customizado</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Frequência</label>
                <select
                  [(ngModel)]="jobForm.frequency"
                  (ngModelChange)="onFrequencyChange()"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                  (ngModelChange)="onFrequencyChange()"
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Horário</label>
                <input
                  type="time"
                  [(ngModel)]="jobForm.time"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                />
              </div>

              @if (jobForm.frequency === 'weekly') {
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Dia da Semana</label>
                  <select
                    [(ngModel)]="jobForm.dayOfWeek"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
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
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              }

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Formato</label>
                <select
                  [(ngModel)]="jobForm.format"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            </div>

            <div class="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                (click)="cancelJobModal()"
                class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                (click)="saveJob()"
                [disabled]="savingJob()"
                class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {{ savingJob() ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (successMessage()) {
        <div class="fixed bottom-4 right-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 shadow-lg z-50">
          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-green-700">{{ successMessage() }}</span>
        </div>
      }

      @if (errorMessage()) {
        <div class="fixed bottom-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 shadow-lg z-50">
          <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-red-700">{{ errorMessage() }}</span>
        </div>
      }
    </div>
  `
})
export class SettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private modalService = inject(ModalService);
  private apiUrl = environment.apiUrl;

  // Tab Control
  activeTab = signal<'jobs' | 'environment'>('jobs');

  // Jobs
  jobs = signal<ScheduledJob[]>([]);
  loading = signal(false);
  showJobModal = false;
  editingJob: ScheduledJob | null = null;
  savingJob = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Environment Settings
  environmentSettings = signal<EnvironmentSetting[]>([]);
  loadingSettings = signal(false);
  savingSettings = signal(false);
  settingsSuccessMessage = signal('');
  settingsErrorMessage = signal('');

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
    this.loadEnvironmentSettings();
  }

  loadJobs() {
    this.loading.set(true);
    this.http.get<ScheduledJob[]>(`${this.apiUrl}/jobs`).subscribe({
      next: (data) => {
        this.jobs.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  openJobModal() {
    this.editingJob = null;
    this.jobForm = {
      name: '',
      reportType: 'occurrences',
      frequency: 'daily',
      time: '09:00',
      dayOfWeek: 1,
      dayOfMonth: 1,
      format: 'excel',
      sendToFixedEmails: true
    };
    this.showJobModal = true;
  }

  editJob(job: ScheduledJob) {
    this.editingJob = job;
    this.jobForm = {
      name: job.name,
      reportType: job.reportType,
      frequency: job.frequency,
      time: job.time,
      dayOfWeek: job.dayOfWeek || 1,
      dayOfMonth: job.dayOfMonth || 1,
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

    if (payload.frequency === 'daily') {
      delete payload.dayOfWeek;
      delete payload.dayOfMonth;
    } else if (payload.frequency === 'weekly') {
      delete payload.dayOfMonth;
    } else if (payload.frequency === 'monthly') {
      delete payload.dayOfWeek;
    }

    const request = this.editingJob
      ? this.http.put(`${this.apiUrl}/jobs/${this.editingJob.id}`, payload)
      : this.http.post(`${this.apiUrl}/jobs`, payload);

    request.subscribe({
      next: () => {
        this.successMessage.set(this.editingJob ? 'Job atualizado!' : 'Job criado!');
        this.savingJob.set(false);
        this.cancelJobModal();
        this.loadJobs();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error) => {
        const errorMsg = error.error?.message || 'Erro ao salvar job';
        this.errorMessage.set(errorMsg);
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
      next: () => {
        this.loadJobs();
        this.modalService.success('Job excluído com sucesso!');
      },
      error: () => {
        this.modalService.error('Erro ao excluir job');
      }
    });
  }

  getReportTypeLabel(type: string): string {
    const labels: any = {
      occurrences: 'Ocorrências',
      monthly: 'Mensal',
      custom: 'Customizado'
    };
    return labels[type] || type;
  }

  getFrequencyLabel(job: ScheduledJob): string {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    if (job.frequency === 'daily') {
      return `Diário às ${job.time}`;
    } else if (job.frequency === 'weekly') {
      return `${days[job.dayOfWeek || 0]} às ${job.time}`;
    } else {
      return `Dia ${job.dayOfMonth} às ${job.time}`;
    }
  }

  // Environment Settings Methods
  loadEnvironmentSettings() {
    this.loadingSettings.set(true);
    this.http.get<EnvironmentSetting[]>(`${this.apiUrl}/settings`).subscribe({
      next: (data) => {
        this.environmentSettings.set(data);
        this.loadingSettings.set(false);
      },
      error: () => {
        this.loadingSettings.set(false);
        this.settingsErrorMessage.set('Erro ao carregar configurações');
        setTimeout(() => this.settingsErrorMessage.set(''), 5000);
      }
    });
  }

  getSettingsByCategory(category: string): EnvironmentSetting[] {
    return this.environmentSettings().filter(s => s.category === category);
  }

  saveEnvironmentSettings() {
    this.savingSettings.set(true);
    this.settingsErrorMessage.set('');
    this.settingsSuccessMessage.set('');

    const settings = this.environmentSettings().map(s => ({
      key: s.key,
      value: s.value
    }));

    this.http.post(`${this.apiUrl}/settings/bulk`, { settings }).subscribe({
      next: () => {
        this.savingSettings.set(false);
        this.settingsSuccessMessage.set('Configurações salvas com sucesso!');
        this.modalService.success('Configurações salvas com sucesso!');
        setTimeout(() => this.settingsSuccessMessage.set(''), 3000);
      },
      error: (error) => {
        this.savingSettings.set(false);
        const message = error.error?.message || 'Erro ao salvar configurações';
        this.settingsErrorMessage.set(message);
        this.modalService.error(message);
        setTimeout(() => this.settingsErrorMessage.set(''), 5000);
      }
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
