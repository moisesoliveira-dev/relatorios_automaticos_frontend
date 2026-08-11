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
      <div class="page-header">
        <div>
          <h1 class="page-title">Configurações</h1>
          <p class="page-subtitle">Configure variáveis de ambiente, SMTP e integrações do sistema</p>
        </div>
        <button
          type="button"
          (click)="saveEnvironmentSettings()"
          [disabled]="savingSettings()"
          class="btn btn-primary"
        >
          @if (savingSettings()) {
            <div
              class="animate-spin w-4 h-4 rounded-full border-2"
              style="border-color: transparent; border-top-color: currentColor;"
            ></div>
            Salvando...
          } @else {
            Salvar alterações
          }
        </button>
      </div>

      <div class="panel">
        @if (loadingSettings()) {
          <div class="flex items-center justify-center py-16">
            <div
              class="animate-spin w-6 h-6 rounded-full border-2"
              style="border-color: var(--cmm-border); border-top-color: var(--cmm-accent);"
            ></div>
          </div>
        } @else {
          <div class="panel-pad space-y-8">
            <section>
              <h3 class="text-sm font-semibold mb-1" style="color: var(--cmm-ink);">Configurações de Email</h3>
              <p class="text-xs mb-4" style="color: var(--cmm-muted);">
                Use <strong style="color: var(--cmm-ink);">smtp</strong> para envio local ou
                <strong style="color: var(--cmm-ink);">resend</strong> para plataformas cloud (Railway, Render, etc.).
              </p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (setting of getSettingsByCategory('email'); track setting.key) {
                  <div>
                    <label class="form-label">
                      {{ setting.description }}
                      @if (setting.isEncrypted) {
                        <span class="ml-1 font-normal" style="color: var(--cmm-muted);">(criptografado)</span>
                      }
                    </label>
                    <input
                      [type]="setting.isEncrypted ? 'password' : 'text'"
                      [(ngModel)]="setting.value"
                      class="form-input"
                      [placeholder]="setting.description"
                    />
                  </div>
                }
              </div>
            </section>

            <section style="border-top: 1px solid var(--cmm-border); padding-top: 2rem;">
              <h3 class="text-sm font-semibold mb-4" style="color: var(--cmm-ink);">Configurações Gerais</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (setting of getSettingsByCategory('general'); track setting.key) {
                  <div>
                    <label class="form-label">{{ setting.description }}</label>
                    <input
                      type="text"
                      [(ngModel)]="setting.value"
                      class="form-input"
                      [placeholder]="setting.description"
                    />
                  </div>
                }
              </div>
            </section>

            <section style="border-top: 1px solid var(--cmm-border); padding-top: 2rem;">
              <h3 class="text-sm font-semibold mb-4" style="color: var(--cmm-ink);">Configurações da API Pontta</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (setting of getSettingsByCategory('api'); track setting.key) {
                  <div>
                    <label class="form-label">
                      {{ setting.description }}
                      @if (setting.isEncrypted) {
                        <span class="ml-1 font-normal" style="color: var(--cmm-muted);">(criptografado)</span>
                      }
                    </label>
                    <input
                      [type]="setting.isEncrypted ? 'password' : 'text'"
                      [(ngModel)]="setting.value"
                      class="form-input"
                      [placeholder]="setting.description"
                    />
                  </div>
                }
              </div>
            </section>

            @if (getSettingsByCategory('jobs').length > 0) {
              <section style="border-top: 1px solid var(--cmm-border); padding-top: 2rem;">
                <h3 class="text-sm font-semibold mb-4" style="color: var(--cmm-ink);">Configurações de Jobs</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (setting of getSettingsByCategory('jobs'); track setting.key) {
                    <div>
                      <label class="form-label">{{ setting.description }}</label>
                      <input
                        type="text"
                        [(ngModel)]="setting.value"
                        class="form-input"
                        [placeholder]="setting.description"
                      />
                    </div>
                  }
                </div>
              </section>
            }

            @if (getSettingsByCategory('access').length > 0) {
              <section style="border-top: 1px solid var(--cmm-border); padding-top: 2rem;">
                <h3 class="text-sm font-semibold mb-1" style="color: var(--cmm-ink);">Controle de Abas por Perfil</h3>
                <p class="text-xs mb-4" style="color: var(--cmm-muted);">
                  Formato: lista separada por vírgula com os identificadores de abas
                  <code
                    class="px-1 rounded text-xs"
                    style="background: var(--cmm-surface); color: var(--cmm-ink);"
                  >dashboard,reports,jobs,gosac-pontta,usuarios,configuracoes</code>
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (setting of getSettingsByCategory('access'); track setting.key) {
                    <div>
                      <label class="form-label">{{ setting.description }}</label>
                      <input
                        type="text"
                        [(ngModel)]="setting.value"
                        class="form-input"
                        [placeholder]="setting.description"
                      />
                    </div>
                  }
                </div>
              </section>
            }

            @if (getSettingsByCategory('drive').length > 0) {
              <section style="border-top: 1px solid var(--cmm-border); padding-top: 2rem;">
                <h3 class="text-sm font-semibold mb-1" style="color: var(--cmm-ink);">Integração com Google Drive</h3>
                <p class="text-xs mb-4" style="color: var(--cmm-muted);">
                  No
                  <a
                    href="https://console.cloud.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline"
                    style="color: var(--cmm-accent);"
                  >Google Cloud Console</a>,
                  crie credenciais <strong style="color: var(--cmm-ink);">OAuth 2.0</strong> e preencha
                  <code class="px-1 rounded text-xs" style="background: var(--cmm-surface); color: var(--cmm-ink);">Client ID</code>,
                  <code class="px-1 rounded text-xs" style="background: var(--cmm-surface); color: var(--cmm-ink);">Client Secret</code> e
                  <code class="px-1 rounded text-xs" style="background: var(--cmm-surface); color: var(--cmm-ink);">Refresh Token</code>.
                  O <strong style="color: var(--cmm-ink);">ID da pasta raiz</strong> é o trecho final da URL da pasta no Google Drive.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (setting of getSettingsByCategory('drive'); track setting.key) {
                    <div>
                      <label class="form-label">
                        {{ setting.description }}
                        @if (setting.isEncrypted) {
                          <span class="ml-1 font-normal" style="color: var(--cmm-muted);">(criptografado)</span>
                        }
                      </label>
                      <input
                        [type]="setting.isEncrypted ? 'password' : 'text'"
                        [(ngModel)]="setting.value"
                        class="form-input"
                        [placeholder]="setting.description"
                      />
                    </div>
                  }
                </div>
              </section>
            }

            @if (settingsSuccessMessage()) {
              <div
                class="p-4 rounded-lg text-sm"
                style="background: color-mix(in srgb, var(--cmm-success) 12%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-success) 30%, transparent); color: var(--cmm-success);"
              >
                {{ settingsSuccessMessage() }}
              </div>
            }
            @if (settingsErrorMessage()) {
              <div
                class="p-4 rounded-lg text-sm"
                style="background: color-mix(in srgb, var(--cmm-danger) 12%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-danger) 30%, transparent); color: var(--cmm-danger);"
              >
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
