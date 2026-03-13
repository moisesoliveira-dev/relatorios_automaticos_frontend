import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ModalService } from '../../shared/services/modal.service';

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
      <div class="bg-white rounded-xl p-6 border border-slate-200 flex items-start justify-between">
        <div>
          <h1 class="text-xl font-semibold text-slate-800">Configurações</h1>
          <p class="text-sm text-slate-500 mt-1">Configure variáveis de ambiente, SMTP e integrações do sistema</p>
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

      <div class="bg-white rounded-xl border border-slate-200">
        @if (loadingSettings()) {
          <div class="flex items-center justify-center py-16">
            <div class="animate-spin w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full"></div>
          </div>
        } @else {
          <div class="p-6 space-y-8">

            <!-- Email -->
            <div>
              <h3 class="text-sm font-semibold text-slate-700 mb-1">Configurações de Email</h3>
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
                      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent text-sm"
                      [placeholder]="setting.description"
                    />
                  </div>
                }
              </div>
            </div>

            <!-- Geral -->
            <div>
              <h3 class="text-sm font-semibold text-slate-700 mb-4">Configurações Gerais</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (setting of getSettingsByCategory('general'); track setting.key) {
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">{{ setting.description }}</label>
                    <input
                      type="text"
                      [(ngModel)]="setting.value"
                      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent text-sm"
                      [placeholder]="setting.description"
                    />
                  </div>
                }
              </div>
            </div>

            <!-- API Pontta -->
            <div>
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
                      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent text-sm"
                      [placeholder]="setting.description"
                    />
                  </div>
                }
              </div>
            </div>

            <!-- Jobs -->
            @if (getSettingsByCategory('jobs').length > 0) {
              <div>
                <h3 class="text-sm font-semibold text-slate-700 mb-4">Configurações de Jobs</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (setting of getSettingsByCategory('jobs'); track setting.key) {
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-1">{{ setting.description }}</label>
                      <input
                        type="text"
                        [(ngModel)]="setting.value"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent text-sm"
                        [placeholder]="setting.description"
                      />
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Google Drive -->
            @if (getSettingsByCategory('drive').length > 0) {
              <div>
                <h3 class="text-sm font-semibold text-slate-700 mb-1">Integração com Google Drive</h3>
                <p class="text-xs text-slate-500 mb-4">
                  No <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" class="underline hover:text-slate-700">Google Cloud Console</a>,
                  crie credenciais <strong>OAuth 2.0</strong> e preencha
                  <code class="bg-slate-100 px-1 rounded text-xs">Client ID</code>,
                  <code class="bg-slate-100 px-1 rounded text-xs">Client Secret</code> e
                  <code class="bg-slate-100 px-1 rounded text-xs">Refresh Token</code>.
                  O <strong>ID da pasta raiz</strong> é o trecho final da URL da pasta no Google Drive.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (setting of getSettingsByCategory('drive'); track setting.key) {
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
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent text-sm"
                        [placeholder]="setting.description"
                      />
                    </div>
                  }
                </div>
              </div>
            }

            @if (settingsSuccessMessage()) {
              <div class="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {{ settingsSuccessMessage() }}
              </div>
            }
            @if (settingsErrorMessage()) {
              <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {{ settingsErrorMessage() }}
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private modalService = inject(ModalService);
  private apiUrl = environment.apiUrl;

  environmentSettings = signal<EnvironmentSetting[]>([]);
  loadingSettings = signal(false);
  savingSettings = signal(false);
  settingsSuccessMessage = signal('');
  settingsErrorMessage = signal('');

  ngOnInit() {
    this.loadEnvironmentSettings();
  }

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

    const settings = this.environmentSettings().map(s => ({ key: s.key, value: s.value }));

    this.http.post(`${this.apiUrl}/settings/bulk`, { settings }).subscribe({
      next: () => {
        this.savingSettings.set(false);
        this.settingsSuccessMessage.set('Configurações salvas com sucesso!');
        this.modalService.success('Configurações salvas com sucesso!');
        setTimeout(() => this.settingsSuccessMessage.set(''), 3000);
      },
      error: (error) => {
        this.savingSettings.set(false);
        const message = error.error?.message ?? 'Erro ao salvar configurações';
        this.settingsErrorMessage.set(message);
        this.modalService.error(message);
        setTimeout(() => this.settingsErrorMessage.set(''), 5000);
      }
    });
  }
}
