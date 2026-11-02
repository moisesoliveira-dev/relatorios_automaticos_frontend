import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { CounterDirective } from '../../core/motion/counter.directive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CounterDirective],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho: saudação + saúde geral do sistema numa frase -->
      <div class="page-header">
        <div>
          <p class="eyebrow">{{ hoje }}</p>
          <h1 class="page-title">Olá, <span class="text-gradient">{{ firstName() }}</span></h1>
          <p class="page-subtitle">{{ resumoSaude().texto }}</p>
        </div>
        <span class="health-pill" [class.health-ok]="resumoSaude().nivel === 'ok'" [class.health-warn]="resumoSaude().nivel === 'warn'" [class.health-bad]="resumoSaude().nivel === 'bad'">
          <span class="health-dot"></span>{{ resumoSaude().rotulo }}
        </span>
      </div>

      <!-- Faixa de saúde: cada serviço é um bloco com barra de latência -->
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
          <div class="panel panel-pad">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm" style="color: var(--cmm-muted);">{{ stat.label }}</p>
                <p class="stat-value font-display font-extrabold mt-1 tracking-tight" style="color: var(--cmm-ink);" [appCounter]="stat.value" aria-live="off">{{ stat.value }}</p>
              </div>
              <div class="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center flex-shrink-0" style="background: var(--cmm-accent-soft); color: var(--cmm-accent);">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="stat.svgPath"/></svg>
              </div>
            </div>
            <div class="mt-3 flex items-center gap-1.5 text-sm">
              <span class="badge" [class.badge-success]="stat.trend >= 0" [class.badge-danger]="stat.trend < 0">{{ stat.trend >= 0 ? '↑' : '↓' }} {{ stat.trend >= 0 ? stat.trend : -stat.trend }}%</span>
              <span style="color: var(--cmm-muted);">vs mês anterior</span>
            </div>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <!-- Linha do tempo de relatórios -->
        <div class="panel xl:col-span-2">
          <div class="panel-pad flex items-center justify-between" style="border-bottom: 1px solid var(--cmm-border);">
            <h2 class="text-base font-semibold" style="color: var(--cmm-ink);">Atividade recente</h2>
            <a routerLink="/reports" class="text-sm font-medium" style="color: var(--cmm-accent);">Ver relatórios →</a>
          </div>
          <div class="panel-pad">
            @if (dashboardService.loading()) {
              <div class="flex items-center justify-center py-8"><div class="animate-spin w-6 h-6 rounded-full" style="border: 2px solid var(--cmm-border); border-top-color: var(--cmm-accent);"></div></div>
            } @else if (dashboardService.recentReports().length === 0) {
              <div class="empty-state">
                <p>Nenhum relatório gerado ainda.</p>
                <a routerLink="/reports/ocorrencias" class="inline-block mt-2 text-sm font-medium" style="color: var(--cmm-accent);">Gerar primeiro relatório →</a>
              </div>
            } @else {
              <ol class="timeline">
                @for (report of dashboardService.recentReports(); track report.id) {
                  <li class="tl-item" [attr.data-status]="report.status">
                    <span class="tl-node" aria-hidden="true">{{ report.status === 'success' ? '✓' : report.status === 'failed' ? '!' : '…' }}</span>
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-sm truncate" style="color: var(--cmm-ink);">{{ report.name }}</p>
                      <p class="text-sm mt-0.5" style="color: var(--cmm-muted);">{{ report.date }} · {{ report.records }} registros</p>
                    </div>
                    <span class="badge flex-shrink-0" [class.badge-success]="report.status === 'success'" [class.badge-danger]="report.status === 'failed'" [class.badge-warning]="report.status === 'pending'">
                      {{ report.status === 'success' ? 'Concluído' : report.status === 'failed' ? 'Falhou' : 'Processando' }}
                    </span>
                  </li>
                }
              </ol>
            }
          </div>
        </div>

        <!-- Atalhos -->
        <div class="space-y-3">
          <h2 class="text-base font-semibold px-1" style="color: var(--cmm-ink);">Ir direto para</h2>
          @for (action of quickActions; track action.label) {
            <a [routerLink]="action.route" class="panel shortcut">
              <span class="shortcut-ico"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="action.icon"/></svg></span>
              <span class="min-w-0"><span class="block font-semibold text-sm">{{ action.label }}</span><span class="block text-sm" style="color: var(--cmm-muted);">{{ action.description }}</span></span>
              <span class="shortcut-arrow" aria-hidden="true">→</span>
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stat-value { font-size: clamp(2rem, 1.6rem + 1.2vw, 2.9rem); line-height: 1; font-variant-numeric: tabular-nums; }
    .eyebrow { font-size: .75rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--cmm-accent); margin-bottom: .35rem; }
    .health-pill { display: inline-flex; align-items: center; gap: .5rem; padding: .45rem 1rem; border-radius: 999px; font-size: .8125rem; font-weight: 700; border: 1px solid transparent; align-self: center; }
    .health-ok { color: var(--cmm-success); background: color-mix(in srgb, var(--cmm-success) 13%, var(--cmm-panel)); border-color: color-mix(in srgb, var(--cmm-success) 30%, transparent); }
    .health-warn { color: var(--cmm-warning); background: color-mix(in srgb, var(--cmm-warning) 13%, var(--cmm-panel)); border-color: color-mix(in srgb, var(--cmm-warning) 30%, transparent); }
    .health-bad { color: var(--cmm-danger); background: color-mix(in srgb, var(--cmm-danger) 13%, var(--cmm-panel)); border-color: color-mix(in srgb, var(--cmm-danger) 30%, transparent); }
    .health-dot { width: 8px; height: 8px; border-radius: 99px; background: currentColor; animation: pulse-dot 1.8s ease-in-out infinite; }
    .svc { padding: 1rem 1.1rem; border-top: 3px solid var(--cmm-success); }
    .svc[data-status='warning'] { border-top-color: var(--cmm-warning); }
    .svc[data-status='offline'], .svc[data-status='error'] { border-top-color: var(--cmm-danger); }
    .svc-dot { width: 9px; height: 9px; border-radius: 99px; background: var(--cmm-success); }
    .svc[data-status='warning'] .svc-dot { background: var(--cmm-warning); }
    .svc[data-status='offline'] .svc-dot, .svc[data-status='error'] .svc-dot { background: var(--cmm-danger); }
    .svc-lat { margin-top: .5rem; font-size: 1.5rem; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
    .svc-state { font-size: .75rem; color: var(--cmm-muted); }
    .timeline { position: relative; display: flex; flex-direction: column; gap: 1rem; }
    .timeline::before { content: ''; position: absolute; left: 1.05rem; top: .5rem; bottom: .5rem; width: 2px; background: var(--cmm-border); }
    .tl-item { position: relative; display: flex; align-items: center; gap: .9rem; }
    .tl-node { position: relative; z-index: 1; flex-shrink: 0; width: 2.1rem; height: 2.1rem; border-radius: 99px; display: grid; place-items: center; font-weight: 800; font-size: .8rem; background: color-mix(in srgb, var(--cmm-success) 16%, var(--cmm-panel)); color: var(--cmm-success); border: 2px solid var(--cmm-panel); box-shadow: 0 0 0 1px color-mix(in srgb, var(--cmm-success) 35%, transparent); }
    .tl-item[data-status='failed'] .tl-node { background: color-mix(in srgb, var(--cmm-danger) 16%, var(--cmm-panel)); color: var(--cmm-danger); box-shadow: 0 0 0 1px color-mix(in srgb, var(--cmm-danger) 35%, transparent); }
    .tl-item[data-status='pending'] .tl-node { background: color-mix(in srgb, var(--cmm-warning) 16%, var(--cmm-panel)); color: var(--cmm-warning); box-shadow: 0 0 0 1px color-mix(in srgb, var(--cmm-warning) 35%, transparent); }
    .shortcut { display: flex; align-items: center; gap: .9rem; padding: .9rem 1rem; color: var(--cmm-ink); transition: transform 350ms var(--ease-out-expo), border-color 200ms; }
    .shortcut:hover { transform: translateX(4px); border-color: color-mix(in srgb, var(--cmm-accent) 50%, var(--cmm-border)); }
    .shortcut-ico { flex-shrink: 0; width: 2.6rem; height: 2.6rem; border-radius: .8rem; display: grid; place-items: center; background: var(--cmm-accent-soft); color: var(--cmm-accent); }
    .shortcut-arrow { margin-left: auto; color: var(--cmm-muted); transition: transform 300ms var(--ease-out-expo), color 200ms; }
    .shortcut:hover .shortcut-arrow { transform: translateX(4px); color: var(--cmm-accent); }
  `]
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  dashboardService = inject(DashboardService);

  hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  /** Uma frase e um selo com a saúde geral, calculados dos serviços monitorados. */
  resumoSaude = computed(() => {
    const lista = this.dashboardService.systemStatus();
    if (!lista.length) return { nivel: 'ok', rotulo: 'Verificando…', texto: 'Resumo do sistema de relatórios' };
    const fora = lista.filter((x) => x.status !== 'online' && x.status !== 'warning').length;
    const lentos = lista.filter((x) => x.status === 'warning').length;
    if (fora) return { nivel: 'bad', rotulo: `${fora} serviço(s) fora do ar`, texto: 'Há serviços fora do ar — veja os blocos abaixo.' };
    if (lentos) return { nivel: 'warn', rotulo: `${lentos} serviço(s) lento(s)`, texto: 'Tudo funcionando, mas algo está mais lento que o normal.' };
    return { nivel: 'ok', rotulo: 'Tudo operando', texto: 'Todos os serviços estão respondendo normalmente.' };
  });

  /** Primeiro nome para a saudação (mais humano que o nome completo). */
  firstName = computed(() => (this.authService.user()?.name ?? '').trim().split(/\s+/)[0] || 'por aqui');

  quickActions = [
    { label: 'Novo Relatório', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', route: '/reports/ocorrencias', description: 'Gerar relatório' },
    { label: 'Enviar por Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', route: '/reports/ocorrencias', description: 'Enviar relatório' },
    { label: 'Ver Usuários', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', route: '/usuarios', description: 'Gerenciar usuários' },
    { label: 'Configurações', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', route: '/configuracoes', description: 'Ajustes do sistema' },
  ];

  // Computed signal para formatar os stats
  statsDisplay = computed(() => {
    const stats = this.dashboardService.stats();
    const svgPaths = [
      'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    ];
    if (!stats) {
      return [
        { label: 'Relatórios Gerados', value: '0', svgPath: svgPaths[0], trend: 0 },
        { label: 'Emails Enviados', value: '0', svgPath: svgPaths[1], trend: 0 },
        { label: 'Ocorrências', value: '0', svgPath: svgPaths[2], trend: 0 },
        { label: 'Usuários Ativos', value: '0', svgPath: svgPaths[3], trend: 0 },
      ];
    }

    return [
      { label: 'Relatórios Gerados', value: this.formatNumber(stats.reportsGenerated), svgPath: svgPaths[0], trend: stats.reportsGeneratedTrend },
      { label: 'Emails Enviados', value: this.formatNumber(stats.emailsSent), svgPath: svgPaths[1], trend: stats.emailsSentTrend },
      { label: 'Ocorrências', value: this.formatNumber(stats.occurrencesFetched), svgPath: svgPaths[2], trend: stats.occurrencesFetchedTrend },
      { label: 'Usuários Ativos', value: this.formatNumber(stats.activeUsers), svgPath: svgPaths[3], trend: stats.activeUsersTrend },
    ];
  });

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    await this.dashboardService.loadAll();
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
