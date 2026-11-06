import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/ui/toast.service';
import { ModalService } from '../../shared/services/modal.service';
import { IconComponent } from '../../shared/components/icon.component';

interface EnvironmentSetting {
  key: string;
  value: string;
  isEncrypted: boolean;
  description: string;
  category: string;
}

interface Secao { key: string; titulo: string; texto: string }

/** Ordem e nomes das seções (o que o servidor não conhece fica no fim, com o nome da categoria). */
const SECOES: Secao[] = [
  { key: 'email', titulo: 'E-mail', texto: 'Por onde os relatórios saem. "smtp" para servidor próprio, "resend" para nuvem.' },
  { key: 'general', titulo: 'Geral', texto: '' },
  { key: 'api', titulo: 'Pontta', texto: 'Acesso à API do Pontta.' },
  { key: 'jobs', titulo: 'Automações', texto: '' },
  { key: 'drive', titulo: 'Google Drive', texto: 'Credenciais OAuth 2.0 do Google Cloud. O ID da pasta raiz é o trecho final da URL da pasta no Drive.' },
  { key: 'access', titulo: 'Acesso por perfil', texto: 'Abas liberadas para cada perfil, separadas por vírgula (ex.: dashboard,reports,jobs).' },
];

/**
 * Configurações: uma lista plana, uma linha por ajuste, seções recolhíveis e uma barra de salvar
 * que só aparece quando algo mudou. Segredos ficam ocultos até a pessoa pedir para ver.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Configurações</h1>
          <p class="page-subtitle">Integrações e parâmetros do sistema. As mudanças só valem depois de salvar.</p>
        </div>
      </div>

      @if (loading()) {
        <div class="panel"><div class="loading-block"><span class="spinner"></span> Carregando…</div></div>
      } @else if (!settings().length) {
        <div class="panel"><div class="empty-state">Nenhuma configuração disponível.</div></div>
      } @else {
        <div class="panel pb-2" [class.mb-24]="alteracoes() > 0">
          @for (s of secoes(); track s.key; let first = $first) {
            <button type="button" class="cfg-h cfg-h-btn" [class.cfg-h-first]="first" [attr.aria-expanded]="aberta(s.key)" (click)="alternar(s.key)">
              <span>{{ s.titulo }} <span class="font-normal normal-case tracking-normal">· {{ s.itens.length }}</span></span>
              <span class="cfg-chev" [class.cfg-chev-open]="aberta(s.key)"><app-icon name="baixo" [size]="16" /></span>
            </button>
            @if (aberta(s.key)) {
              @if (s.texto) { <p class="text-xs px-6 pb-2" style="color: var(--cmm-muted);">{{ s.texto }}</p> }
              @for (f of s.itens; track f.key) {
                <div class="cfg-row">
                  <div class="min-w-0">
                    <label class="font-semibold text-sm" [attr.for]="'cfg-' + f.key">{{ f.description }}</label>
                    <p class="text-xs mt-0.5 font-mono" style="color: var(--cmm-muted);">{{ f.key }}</p>
                  </div>
                  <div class="cfg-ctl">
                    @if (mudou(f.key)) {
                      <button type="button" class="cfg-reset" (click)="desfazer(f.key)" [attr.aria-label]="'Desfazer alteração de ' + f.description">↺ desfazer</button>
                    }
                    @if (f.isEncrypted) {
                      <div class="relative w-full" style="max-width: 22rem;">
                        <input class="form-input pr-11" [type]="visivel(f.key) ? 'text' : 'password'" [id]="'cfg-' + f.key" autocomplete="new-password" [ngModel]="valor(f.key)" (ngModelChange)="setValor(f.key, $event)" />
                        <button type="button" class="icon-btn icon-btn-sm absolute right-1.5 top-1/2 -translate-y-1/2" (click)="alternarVisivel(f.key)" [attr.aria-label]="visivel(f.key) ? 'Ocultar valor' : 'Mostrar valor'">
                          <app-icon [name]="visivel(f.key) ? 'cadeado' : 'olho'" [size]="16" />
                        </button>
                      </div>
                    } @else {
                      <input class="form-input" type="text" [id]="'cfg-' + f.key" [ngModel]="valor(f.key)" (ngModelChange)="setValor(f.key, $event)" />
                    }
                  </div>
                </div>
              }
            }
          }
        </div>
      }
    </div>

    @if (alteracoes() > 0) {
      <div class="savebar" role="region" aria-label="Alterações não salvas">
        <span><b>{{ alteracoes() }}</b> {{ alteracoes() === 1 ? 'alteração' : 'alterações' }} sem salvar</span>
        <div class="flex gap-2">
          <button type="button" class="btn btn-ghost btn-sm" (click)="descartar()" [disabled]="saving()">Descartar</button>
          <button type="button" class="btn btn-accent btn-sm" (click)="salvar()" [disabled]="saving()">{{ saving() ? 'Salvando…' : 'Salvar alterações' }}</button>
        </div>
      </div>
    }
  `,
})
export class SettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private modal = inject(ModalService);
  private apiUrl = environment.apiUrl;

  settings = signal<EnvironmentSetting[]>([]);
  draft = signal<Record<string, string>>({});
  loading = signal(false);
  saving = signal(false);
  private abertas = signal<Set<string>>(new Set(['email', 'general']));
  private visiveis = signal<Set<string>>(new Set());

  alteracoes = computed(() => Object.keys(this.draft()).length);

  secoes = computed(() => {
    const lista = this.settings();
    const conhecidas = SECOES.map((s) => ({ ...s, itens: lista.filter((x) => x.category === s.key) })).filter((s) => s.itens.length);
    const extras = [...new Set(lista.map((x) => x.category))].filter((c) => !SECOES.some((s) => s.key === c));
    return [...conhecidas, ...extras.map((c) => ({ key: c, titulo: c, texto: '', itens: lista.filter((x) => x.category === c) }))];
  });

  ngOnInit() {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.http.get<EnvironmentSetting[]>(`${this.apiUrl}/settings`).subscribe({
      next: (data) => { this.settings.set(data); this.draft.set({}); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Não foi possível carregar as configurações.'); },
    });
  }

  aberta(k: string): boolean { return this.abertas().has(k); }
  alternar(k: string): void {
    this.abertas.update((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }
  visivel(k: string): boolean { return this.visiveis().has(k); }
  alternarVisivel(k: string): void {
    this.visiveis.update((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }

  valor(k: string): string {
    const d = this.draft();
    return k in d ? d[k] : (this.settings().find((s) => s.key === k)?.value ?? '');
  }
  mudou(k: string): boolean { return k in this.draft(); }
  setValor(k: string, v: string): void {
    const original = this.settings().find((s) => s.key === k)?.value ?? '';
    this.draft.update((d) => { const n = { ...d }; if (v === original) delete n[k]; else n[k] = v; return n; });
  }
  desfazer(k: string): void { this.draft.update((d) => { const n = { ...d }; delete n[k]; return n; }); }

  async descartar(): Promise<void> {
    if (!(await this.modal.confirm('Descartar alterações?', 'Os valores voltam ao que está salvo.', 'Descartar'))) return;
    this.draft.set({});
  }

  salvar(): void {
    const d = this.draft();
    const settings = Object.entries(d).map(([key, value]) => ({ key, value }));
    if (!settings.length) return;
    this.saving.set(true);
    this.http.post(`${this.apiUrl}/settings/bulk`, { settings }).subscribe({
      next: () => {
        this.settings.update((list) => list.map((s) => (s.key in d ? { ...s, value: d[s.key] } : s)));
        this.draft.set({});
        this.saving.set(false);
        this.toast.success('Configurações salvas.');
      },
      error: (error) => {
        this.saving.set(false);
        void this.modal.error(error.error?.message ?? 'Não foi possível salvar as configurações.', 'Não salvo');
      },
    });
  }
}
