import { Component, OnInit, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AccessService } from '../../core/services/access.service';
import { DashboardService } from '../../services/dashboard.service';
import { CounterDirective } from '../../core/motion/counter.directive';
import { IconComponent, IconName } from '../../shared/components/icon.component';

interface Atalho { label: string; description: string; icon: IconName; route: string; tab: string }

const ATALHOS: Atalho[] = [
  { label: 'Relatório de ocorrências', description: 'Gerar, baixar ou enviar por e-mail', icon: 'relatorio', route: '/reports/ocorrencias', tab: 'reports' },
  { label: 'Automações', description: 'Rotinas que rodam sozinhas', icon: 'relogio', route: '/jobs', tab: 'jobs' },
  { label: 'Vera (IA)', description: 'Atendimento automático no WhatsApp', icon: 'robo', route: '/ia', tab: 'ia' },
  { label: 'Usuários', description: 'Acessos e convites', icon: 'usuarios', route: '/usuarios', tab: 'usuarios' },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CounterDirective, IconComponent],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho: saudação + saúde geral do sistema numa frase -->
      <div class="page-header">
        <div>
          <p class="eyebrow">{{ hoje }}</p>
          <h1 class="page-title">Olá, <span class="text-gradient">{{ firstName() }}</span></h1>
          <p class="page-subtitle">{{ resumoSaude().texto }}</p>
        </div>
        <span class="state" [class.state-on]="resumoSaude().nivel === 'ok'" [class.state-warn]="resumoSaude().nivel === 'warn'" [class.state-bad]="resumoSaude().nivel === 'bad'">
          {{ resumoSaude().rotulo }}
        </span>
      </div>

      <!-- Serviços monitorados -->
      @if (dashboardService.systemStatus().length) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          @for (service of dashboardService.systemStatus(); track service.name) {
            <div class="panel svc" [attr.data-status]="service.status">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-semibold truncate">{{ service.name }}</span>
                <span class="svc-dot"></span>
              </div>
              <p class="svc-lat font-display">{{ service.latency }}</p>
              <p class="svc-state">{{ service.status === 'online' ? 'Operando' : service.status === 'warning' ? 'Lento' : 'Fora do ar' }}</p>
            </div>
          }
        </div>
      }

      <!-- Números do mês -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        @for (stat of statsDisplay(); track stat.label) {
          <div class="panel panel-pad stat">
            <span class="stat-ico"><app-icon [name]="stat.icon" [size]="20" /></span>
            <div class="min-w-0">
              <p class="stat-num" [appCounter]="stat.value" aria-live="off">{{ stat.value }}</p>
              <p class="stat-lbl">{{ stat.label }}<span class="trend" [class.trend-up]="stat.trend > 0" [class.trend-down]="stat.trend < 0">{{ trendLabel(stat.trend) }}</span></p>
            </div>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <!-- Linha do tempo de relatórios -->
        <div class="panel xl:col-span-2">
          <div class="list-head">
            <h2 class="list-head-title">Relatórios recentes</h2>
            <a routerLink="/reports/ocorrencias" class="text-sm font-medium" style="color: var(--cmm-accent);">Abrir relatórios</a>
          </div>
          <div class="panel-pad">
            @if (dashboardService.loading()) {
              <div class="loading-block"><span class="spinner"></span></div>
            } @else if (dashboardService.recentReports().length === 0) {
              <div class="empty-state">
                <p>Nenhum relatório gerado ainda.</p>
                <a routerLink="/reports/ocorrencias" class="inline-block mt-2 text-sm font-medium" style="color: var(--cmm-accent);">Gerar o primeiro</a>
              </div>
            } @else {
              <ol class="timeline">
                @for (report of dashboardService.recentReports(); track report.id) {
                  <li class="tl-item" [attr.data-status]="report.status">
                    <span class="tl-node" aria-hidden="true">
                      <app-icon [name]="report.status === 'success' ? 'check' : report.status === 'failed' ? 'alerta' : 'relogio'" [size]="14" [stroke]="2.4" />
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-sm truncate">{{ report.name }}</p>
                      <p class="text-sm mt-0.5" style="color: var(--cmm-muted);">{{ report.date }} · {{ report.records }} registros</p>
                    </div>
                    <span class="state flex-shrink-0" [class.state-on]="report.status === 'success'" [class.state-bad]="report.status === 'failed'" [class.state-busy]="report.status === 'pending'">
                      {{ report.status === 'success' ? 'Concluído' : report.status === 'failed' ? 'Falhou' : 'Processando' }}
                    </span>
                  </li>
                }
              </ol>
            }
          </div>
        </div>

        <!-- Atalhos (só o que a pessoa pode abrir) -->
        <div class="space-y-3">
          <h2 class="list-head-title px-1">Ir direto para</h2>
          @for (a of atalhos(); track a.route) {
            <a [routerLink]="a.route" class="panel shortcut">
              <span class="stat-ico"><app-icon [name]="a.icon" [size]="20" /></span>
              <span class="min-w-0"><span class="block font-semibold text-sm">{{ a.label }}</span><span class="block text-sm" style="color: var(--cmm-muted);">{{ a.description }}</span></span>
              <span class="shortcut-arrow" aria-hidden="true"><app-icon name="seta_dir" [size]="16" /></span>
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .eyebrow { font-size: .75rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--cmm-accent); margin-bottom: .35rem; }
    .svc { padding: 1rem 1.1rem; border-top: 3px solid var(--cmm-success); }
    .svc[data-status='warning'] { border-top-color: var(--cmm-warning); }
    .svc[data-status='offline'], .svc[data-status='error'] { border-top-color: var(--cmm-danger); }
    .svc-dot { width: 9px; height: 9px; border-radius: 99px; background: var(--cmm-success); }
    .svc[data-status='warning'] .svc-dot { background: var(--cmm-warning); }
    .svc[data-status='offline'] .svc-dot, .svc[data-status='error'] .svc-dot { background: var(--cmm-danger); }
    .svc-lat { margin-top: .5rem; font-size: 1.5rem; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
    .svc-state { font-size: .75rem; color: var(--cmm-muted); }
    .trend { margin-left: .4rem; font-size: .75rem; font-weight: 600; color: var(--cmm-muted); }
    .trend-up { color: var(--cmm-success); } .trend-down { color: var(--cmm-danger); }
    .timeline { position: relative; display: flex; flex-direction: column; gap: 1rem; }
    .timeline::before { content: ''; position: absolute; left: 1.05rem; top: .5rem; bottom: .5rem; width: 2px; background: var(--cmm-border); }
    .tl-item { position: relative; display: flex; align-items: center; gap: .9rem; }
    .tl-node { position: relative; z-index: 1; flex-shrink: 0; width: 2.1rem; height: 2.1rem; border-radius: 99px; display: grid; place-items: center; background: color-mix(in srgb, var(--cmm-success) 16%, var(--cmm-panel)); color: var(--cmm-success); border: 2px solid var(--cmm-panel); box-shadow: 0 0 0 1px color-mix(in srgb, var(--cmm-success) 35%, transparent); }
    .tl-item[data-status='failed'] .tl-node { background: color-mix(in srgb, var(--cmm-danger) 16%, var(--cmm-panel)); color: var(--cmm-danger); box-shadow: 0 0 0 1px color-mix(in srgb, var(--cmm-danger) 35%, transparent); }
    .tl-item[data-status='pending'] .tl-node { background: color-mix(in srgb, var(--cmm-warning) 16%, var(--cmm-panel)); color: var(--cmm-warning); box-shadow: 0 0 0 1px color-mix(in srgb, var(--cmm-warning) 35%, transparent); }
    .shortcut { display: flex; align-items: center; gap: .9rem; padding: .9rem 1rem; color: var(--cmm-ink); transition: transform 350ms var(--ease-out-expo), border-color 200ms; }
    .shortcut:hover { transform: translateX(4px); border-color: color-mix(in srgb, var(--cmm-accent) 50%, var(--cmm-border)); }
    .shortcut-arrow { margin-left: auto; color: var(--cmm-muted); transition: transform 300ms var(--ease-out-expo), color 200ms; }
    .shortcut:hover .shortcut-arrow { transform: translateX(4px); color: var(--cmm-accent); }
  `]
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  dashboardService = inject(DashboardService);
  private readonly access = inject(AccessService);

  hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  /** Uma frase e um estado com a saúde geral, calculados dos serviços monitorados. */
  resumoSaude = computed(() => {
    const lista = this.dashboardService.systemStatus();
    if (!lista.length) return { nivel: 'ok', rotulo: 'Verificando…', texto: 'Resumo do sistema de relatórios' };
    const fora = lista.filter((x) => x.status !== 'online' && x.status !== 'warning').length;
    const lentos = lista.filter((x) => x.status === 'warning').length;
    if (fora) return { nivel: 'bad', rotulo: fora === 1 ? '1 serviço fora do ar' : `${fora} serviços fora do ar`, texto: 'Há serviços fora do ar. Veja os blocos abaixo.' };
    if (lentos) return { nivel: 'warn', rotulo: lentos === 1 ? '1 serviço lento' : `${lentos} serviços lentos`, texto: 'Tudo funcionando, mas algo está mais lento que o normal.' };
    return { nivel: 'ok', rotulo: 'Tudo operando', texto: 'Todos os serviços estão respondendo normalmente.' };
  });

  firstName = computed(() => (this.authService.user()?.name ?? '').trim().split(/\s+/)[0] || 'por aqui');

  /** Atalhos filtrados pelas abas que a pessoa pode abrir. */
  atalhos = computed(() => {
    const tabs = this.access.tabs();
    if (this.authService.user()?.role === 'master' || !tabs) return ATALHOS;
    return ATALHOS.filter((a) => this.access.canAccess([a.tab]));
  });

  statsDisplay = computed(() => {
    const s = this.dashboardService.stats();
    const base: Array<{ label: string; icon: IconName; value: string; trend: number }> = [
      { label: 'Relatórios gerados', icon: 'relatorio', value: this.formatNumber(s?.reportsGenerated ?? 0), trend: s?.reportsGeneratedTrend ?? 0 },
      { label: 'E-mails enviados', icon: 'email', value: this.formatNumber(s?.emailsSent ?? 0), trend: s?.emailsSentTrend ?? 0 },
      { label: 'Ocorrências', icon: 'documento', value: this.formatNumber(s?.occurrencesFetched ?? 0), trend: s?.occurrencesFetchedTrend ?? 0 },
      { label: 'Usuários ativos', icon: 'usuarios', value: this.formatNumber(s?.activeUsers ?? 0), trend: s?.activeUsersTrend ?? 0 },
    ];
    return base;
  });

  ngOnInit() {
    void this.dashboardService.loadAll();
  }

  trendLabel(t: number): string {
    if (!t) return '';
    return `${t > 0 ? '+' : '−'}${Math.abs(t)}% no mês`;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
}
